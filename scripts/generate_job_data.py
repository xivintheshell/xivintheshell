#!/usr/bin/env python3
"""
Script to automatically generate a significant amount of boilerplate for a new job.
This script must be run from repository root.

Requires installing the beautifulsoup and requests libraries (`pip install bs4 requests`).
Probably requires at least Python 3.11 (I tested with 3.13).

By default, this script will print out the contents of `src/Game/Data/Jobs/$JOB.ts` and
`src/Game/Jobs.$JOB.ts` boilerplate declarations.
When run with the `--write` flag, it will destructively overwrite those two files.
Make sure any previously-made changes were saved to version control before running this script.

Running this script performs the following actions:
- Scrapes the job guide's HTML for relevant action names and unlock levels
- Scrapes the Chinese job guide's HTML for translations of these actions to Chinese
- Downloads image assets from XIVAPI to the appropriate sub-folder in `public/assets/`
- Retrieves action IDs from XIVAPI
- Retrieves Japanese translations of skills from XIVAPI
    - (this can eventually be extended to work for buffs/debuffs too but I'm lazy)
- Read the application delay spreadsheet for application delay values
- Attempts to parse base potency and falloff amount from tooltips

Note that Japanese translations are obtained from XIVAPI while Chinese ones are scraped because
XIVAPI only reports data available in the international client, which contains English, French,
German, and Japanese data.

This can eventually be extended to retrieve even more information automatically, but this is
unnecessary for the time being.

See the "YOUR CHANGES HERE" for further instructions on precise setup.
"""
import argparse
from collections import defaultdict
from collections.abc import MutableMapping
import csv
from dataclasses import dataclass
import functools
import json
import os
import re
import textwrap

from bs4 import BeautifulSoup
import requests


@dataclass
class Info:
    en: str
    zh: str | None
    max_stacks: int = 1
    max_charges: int = 1
    timeout: int | None = None


I = Info

# === BEGIN: YOUR CHANGES HERE ===
# Modify the variables in this section according to the skills and statuses you wish to generate.

JOB: str = "VPR"
# A path to a locally-saved HTML file of the English-language job guide.
# For example, hitting ctrl/cmd-S on this link:
# https://na.finalfantasyxiv.com/jobguide/monk/
EN_JOB_GUIDE_HTML: str = "~/Downloads/en_vpr.html"
# A path to a locally-saved HTML file of the Chinese-language job guide.
# For example, hitting ctrl/cmd-S on this link:
# https://actff1.web.sdo.com/project/20190917jobguid/index.html#/continfo/monk/pve
ZH_JOB_GUIDE_HTML: str = "~/Downloads/zh_vpr.html"
# Both job guides are assumed to have the same order of actions, which may
# not always be the case when a patch occurs.

# A path to the single-sheet CSV containing this job's application delays
# Download from here: https://docs.google.com/spreadsheets/d/1Emevsz5_oJdmkXy23hZQUXimirZQaoo5BejSzL3hZ9I/edit?usp=drive_web&ouid=110454175060690521527
APPLICATION_DELAY_CSV_PATH: str = "scripts/application delay DT - MELEE.csv"

# Action names are scraped from the job guide files. If there are any actions that should not be
# included due to being out-leveled, list their proper English names here.
EXCLUDE_ACTIONS: list[str] = []

# Name of the last PVE action in the job guide. This makes it so we don't have to write more complicated
# CSS selectors to tell BS4 when to stop parsing :).
LAST_PVE_ACTION: str = "Fourth Legacy"

# A list of cooldowns resources to generate.
# Abilities can be omitted, as this script will automatically produce a cooldown object for them.
# Any abilities that share a cooldown (or are upgrades of an earlier ability) should be entered as
# values in the dict entry. Leave the list empty if no other abilities use the cooldown.
COOLDOWNS: dict[str, list[str]] = {
}

# A list of English gauge element names.
# Their translations must manually be added.
GAUGES: list[Info] = [
    I("Rattling Coil", "飞蛇之魂", max_stacks=3),
    I("Serpent Offerings", "灵力", max_stacks=100),
    I("Anguine Tribute", "祖灵力", max_stacks=5),
]

# A list of buff/debuffs.
# Their Chinese translations must manually be added.
STATUSES: list[Info] = [
    I("Hunter's Instinct", "猛袭", timeout=40),
    I("Swiftscaled", "疾速", timeout=40),
    I("Honed Steel", "咬噬锐牙", timeout=60),
    I("Honed Reavers", "穿裂锐牙", timeout=60),
    I("Flankstung Venom", "侧击锐牙", timeout=60),
    I("Hindstung Venom", "背击锐牙", timeout=60),
    I("Flanksbane Venom", "侧裂锐牙", timeout=60),
    I("Hindsbane Venom", "背裂锐牙", timeout=60),
    I("Grimskin's Venom", "乱裂锐牙", timeout=60),
    I("Grimhunter's Venom", "乱击锐牙", timeout=60),
    I("Hunter's Venom", "飞蛇之魂", timeout=30),
    I("Swiftskin's Venom", "乱击双锐牙", timeout=30),
    I("Poised for Twinfang", "连尾锐尾", timeout=60),
    I("Poised for Twinblood", "乱尾锐尾", timeout=60),
    I("Fellhunter's Venom", "连闪双锐牙", timeout=30),
    I("Fellskin's Venom", "乱闪双锐牙", timeout=30),
    I("Ready to Reawaken", "祖灵降临预备", timeout=30),
    I("Reawakened", "祖灵降临", timeout=30),
]

# A list of tracker abilities that don't necessarily correspond to any real in-game buffs.
# Their translations must manually be added.
TRACKERS: list[Info] = [
    # manually copied from NoHome's branch since these are complicated
]

# Traits are automatically scraped.
# We need to specify the first and last trait of interest so I don't need to write more complex scraping code
# to filter PVP actions.
FIRST_TRAIT = "Melee Mastery"
LAST_TRAIT = "Serpent's Legacy"

# === END: YOUR CHANGES HERE ===

STATE_FILE_PATH = f"src/Game/Jobs/{JOB}.ts"
DATA_FILE_PATH = f"src/Game/Data/Jobs/{JOB}.ts"

status_names = {i.en for i in STATUSES}

# Cache all action and status info queries to XIVAPI so we don't have to re-issue them.
# A second level of caching explicitly checks the presence of an image file when we perform query.
cache_action_csv_path = f"scripts/{JOB}_actions_xivapi_cache.csv"
cache_status_csv_path = f"scripts/{JOB}_status_xivapi_cache.csv"
# unstructured map of english action/status name -> list of fields of interest
cached_xivapi_action_calls = {}
cached_xivapi_status_calls = {}
if os.path.exists(cache_action_csv_path):
    with open(cache_action_csv_path) as f:
        for row in csv.reader(f):
            cached_xivapi_action_calls[row[0]] = row[1:]
if os.path.exists(cache_status_csv_path):
    with open(cache_status_csv_path) as f:
        for row in csv.reader(f):
            cached_xivapi_status_calls[row[0]] = row[1:]

cache_action_csv_writer = csv.writer(open(cache_action_csv_path, "a"))
cache_status_csv_writer = csv.writer(open(cache_status_csv_path, "a"))


@functools.cache
def proper_case_to_allcaps_name(name: str) -> str:
    return (
        name.replace("-", "_")
        .replace(" ", "_")
        .replace("'", "")
        .replace(":", "")
        .upper()
    )


with open(os.path.expanduser(EN_JOB_GUIDE_HTML)) as f:
    en_soup = BeautifulSoup(f, "html.parser")
with open(os.path.expanduser(ZH_JOB_GUIDE_HTML)) as f:
    zh_soup = BeautifulSoup(f, "html.parser")

# === Parsing action declarations ===
# The EN job guide has a tbody with class "job__tbody", with each action declared in a tr.
# The name is then found in a child div with class "skill__wrapper", which then contains a
# <p><strong> with the actual name of the skill.
# The CN job guide has a div with class "job_tbody", which eventually has a child <p> with
# class "skill_txt", containing a <strong> with the Chinese name. The zh job guide also has text
# indicating if a skill is learned from job quest ("通过特职任务获得"), so we need to filter those lines as well.
zh_learned_by_quest = {"通过职业任务获得", "通过特职任务获得"}
en_skill_names = [
    t.contents[0] for t in en_soup.select("div.skill__wrapper > p > strong")
]
en_tooltips = [
    "\n".join(filter(lambda s: isinstance(s, str), t.contents))
    for t in en_soup.select("tbody.job__tbody > tr > td.content")
]

level_columns = [
    t.contents[0].replace("Lv. ", "")
    for t in en_soup.select("div.jobclass__wrapper > p")
]
trait_names_and_levels = list(
    zip(
        en_skill_names,
        level_columns,
    )
)[en_skill_names.index(FIRST_TRAIT) : en_skill_names.index(LAST_TRAIT) + 1]
zh_skill_names = [
    t.contents[0]
    for t in zh_soup.select("p.skill_txt > strong")
    if t.contents[0] not in zh_learned_by_quest
]
last_idx = en_skill_names.index(LAST_PVE_ACTION)
en_skill_names = en_skill_names[: last_idx + 1]
en_tooltips = en_tooltips[: last_idx + 1]
zh_skill_names = zh_skill_names[: last_idx + 1]
for exclude_action in EXCLUDE_ACTIONS:
    idx = en_skill_names.index(exclude_action)
    if idx > 0:
        del en_skill_names[idx]
        del en_tooltips[idx]
        del zh_skill_names[idx]

# Job guide language is very consistent, so we use regexes to parse out basic potency, falloff, and
# prerequisite buff information.
skill_count = last_idx + 1
potencies = [None] * skill_count
heal_potencies = [None] * skill_count
falloffs = [None] * skill_count
required_statuses = [None] * skill_count
# tooltip includes "This action cannot be assigned to a hotbar"
hotbar_assignable = [None] * skill_count
# tooltip includes "X changes to Y when requirement"; X is stored for skill at index Y
replace_group = [None] * skill_count

base_potency_re = re.compile(r"with a potency of ([\d,]+)\.")
heal_potency_re = re.compile(r"Cure Potency: ([\d,]+)")
# works for line and proximity splash cleaves
aoe_falloff_re = re.compile(
    r"with a potency of ([\d,]+) for the first enemy, and ([\d]+)% less"
)
# "all enemies in a straight line before you"
# "all nearby enemies"
# "to target and all enemies nearby it"
aoe_no_falloff_re = re.compile(r"with a potency of ([\d,]+) to (target and )?all")
# "Can only be executed while under the effect of $EFFECT."
requirement_re = re.compile(
    r"Can only be executed while under the effect of ([ '\w]+)\."
)
hotbar_assignable_re = re.compile(r"This action cannot be assigned to a hotbar")
# A skill name is one or more words starting with a capital letter, before lowercase "changes""
replace_group_re = re.compile(r"(?P<target_skill>([A-Z][a-z': ]+)+) changes to [A-Z]")
for i, tooltip in enumerate(en_tooltips):
    base_potency_match = base_potency_re.search(tooltip)
    aoe_falloff_match = aoe_falloff_re.search(tooltip)
    aoe_no_falloff_match = aoe_no_falloff_re.search(tooltip)
    heal_potency_match = heal_potency_re.search(tooltip)
    requirement_match = requirement_re.search(tooltip)
    hotbar_assignable_match = hotbar_assignable_re.search(tooltip)
    replace_group_match = replace_group_re.search(tooltip)
    if base_potency_match:
        potencies[i] = base_potency_match.group(1).replace(",", "")
    elif aoe_falloff_match:
        potencies[i] = aoe_falloff_match.group(1).replace(",", "")
        falloffs[i] = "0." + aoe_falloff_match.group(2)
    elif aoe_no_falloff_match:
        potencies[i] = aoe_no_falloff_match.group(1).replace(",", "")
        falloffs[i] = "0"
    if heal_potency_match:
        heal_potencies[i] = heal_potency_match.group(1).replace(",", "")
    if requirement_match:
        maybe_requirement_name = requirement_match.group(1)
        if maybe_requirement_name in status_names:
            required_statuses[i] = maybe_requirement_name
    if hotbar_assignable_match:
        hotbar_assignable[i] = False
    if replace_group_match:
        replace_group[i] = replace_group_match.group("target_skill")

XIVAPI_BASE = "https://v2.xivapi.com/api/"
os.makedirs(f"public/assets/Skills/{JOB}", exist_ok=True)
os.makedirs(f"public/assets/Buffs/{JOB}", exist_ok=True)

skill_api_infos = []


@dataclass
class SkillAPIInfo:
    name: str
    action_id: int
    icon_path: str
    unlock_level: int
    category: str
    cooldown: float
    max_charges: str
    ja_name: str


for name in en_skill_names:
    if name in cached_xivapi_action_calls:
        print("using cached xivapi query for " + name)
        action_id, icon_path, unlock_level, category, cooldown, stacks, ja_name = (
            cached_xivapi_action_calls[name]
        )
    else:
        print("querying xivapi for " + name)
        r = requests.get(
            XIVAPI_BASE + "search?sheets=Action",
            params={
                # + means the constraint is mandatory
                # this helps restrict a bunch of random skill images that aren't actually the pve skill we want
                # use ~ (LIKE) for name since there may be some casing errors
                "query": f'+Name~"{name}" +IsPvP=false +ClassJobCategory.{JOB}=true',
                "fields": "Name,Name@lang(ja),Icon,ClassJobCategory,ActionCategory.Name,ClassJobLevel,Recast100ms,MaxCharges",
            },
        )
        r.raise_for_status()
        blob = json.loads(r.text)["results"][0]
        action_id = blob["row_id"]
        unlock_level = blob["fields"]["ClassJobLevel"]
        category = blob["fields"]["ActionCategory"]["fields"]["Name"]
        icon_path = blob["fields"]["Icon"]["path_hr1"]
        ja_name = blob["fields"]["Name@lang(ja)"]
        cooldown = blob["fields"]["Recast100ms"] * 10 // 100
        stacks = blob["fields"]["MaxCharges"]
    info = [
        name,
        action_id,
        icon_path,
        unlock_level,
        category,
        cooldown,
        stacks,
        ja_name,
    ]
    skill_api_infos.append(SkillAPIInfo(*info))
    cache_action_csv_writer.writerow(info)
    local_img_path = f"public/assets/Skills/{JOB}/{name.replace(':', '')}.png"
    if os.path.exists(local_img_path):
        print("skipping already-downloaded icon for " + name)
    else:
        with open(local_img_path, "wb") as f:
            print("downloading image for " + name)
            img_r = requests.get(
                XIVAPI_BASE + "asset/" + icon_path,
                params={"format": "png"},
            )
            img_r.raise_for_status()
            f.write(img_r.content)


# Used in Data folder
ACTIONS_DATA_DECL_BLOCK = textwrap.indent(
    ",\n".join(
        (
            proper_case_to_allcaps_name(s.name) + ": {\n"
            "\tid: " + str(s.action_id) + ",\n"
            '\tname: "' + s.name + '",\n'
            "\tlabel: {\n"
            f'\t\tzh: "{zh_skill_names[i]}",\n'
            f'\t\tja: "{s.ja_name}",\n'
            "\t},\n"
            "}"
        )
        for i, s in enumerate(skill_api_infos)
    ),
    "\t",
)


def normalize_application_delay_name(s: str) -> str:
    return s.replace("-", "").replace("'", "").replace(" ", "").lower()


class ApplicationDelayDict(MutableMapping):
    data = {}

    def __init__(self, *args, **kwargs):
        # Make sure any initial arguments get normalized
        self.data = dict(*args, **kwargs)

    def __getitem__(self, key):
        return self.data[normalize_application_delay_name(key)]

    def __setitem__(self, key, val):
        self.data[normalize_application_delay_name(key)] = val

    def __delitem__(self, key):
        del self.data[key]

    def __len__(self):
        return len(self.data)

    def __iter__(self):
        return iter(self.data)


normalized_application_delay_map = ApplicationDelayDict()


with open(APPLICATION_DELAY_CSV_PATH) as f:
    reader = csv.reader(f)
    for row in reader:
        # Multiple jobs will have entries within the same row
        # Treat any non-numeric value as a possible skill name, and if it's followed by a numer or
        # "instant" then treat that as its application delay
        for i in range(len(row) - 1):
            maybe_skill_name, maybe_delay = row[i], row[i + 1]
            if maybe_delay == "instant":
                normalized_application_delay_map[maybe_skill_name] = 0
            elif maybe_delay.replace(".", "").isdigit():
                normalized_application_delay_map[maybe_skill_name] = maybe_delay


shared_cd_mapping = {}
for src_ability, dst_list in COOLDOWNS.items():
    for dst_ability in dst_list:
        shared_cd_mapping[dst_ability] = src_ability


def normalize_cd_label(name: str) -> str:
    name = shared_cd_mapping.get(name, name).replace("'", "")
    return "".join(map(lambda x: x[0].upper() + x[1:], re.split(r"[ \-]", name)))


replace_group_mapping = defaultdict(list)
for maybe_replaces, info in zip(replace_group, skill_api_infos):
    if maybe_replaces:
        replace_group_mapping[maybe_replaces].append(info.name)


def generate_action_makefn(arg: tuple[int, SkillAPIInfo]):
    i, s = arg
    name = s.name
    allcaps_name = proper_case_to_allcaps_name(name)
    sb = []
    is_ability = s.category == "Ability"
    # If there's an equivalent status name, then make a resource ability.
    constructor = (
        "ResourceAbility" if name in status_names and is_ability else s.category
    )
    if is_ability:
        cd_name = shared_cd_mapping.get(name, name).replace("'", "")
        sb.append(
            f'make{JOB}{constructor}("{allcaps_name}", {s.unlock_level}, "cd_{proper_case_to_allcaps_name(cd_name)}", {{'
        )
    else:
        sb.append(f'make{JOB}{constructor}("{allcaps_name}", {s.unlock_level}, {{')
    if constructor == "ResourceAbility":
        sb.append(f'\trscType: "{allcaps_name}",')
    if hotbar_assignable[i] is not None:
        sb.append(f"\tstartOnHotbar: {str(hotbar_assignable[i]).lower()},")
    if replace_group[i]:
        sb.append(f"\treplaceIf: {proper_case_to_allcaps_name(replace_group[i])}_REPLACEMENTS,")
    elif name in replace_group_mapping:
        sb.append(f"\treplaceIf: {proper_case_to_allcaps_name(name)}_REPLACEMENTS,")
    application_delay = normalized_application_delay_map.get(name, None)
    sb.append(
        f"\tapplicationDelay: {application_delay or '0'},"
        + (" // TODO" if application_delay is None else "")
    )
    if is_ability:
        # GCD CD management can be weird, so deal with that manually.
        sb.append(f"\tcooldown: {s.cooldown},")
    if int(s.max_charges) > 0:
        sb.append(f"\tmaxCharges: {s.max_charges},")
    if potencies[i] is not None:
        sb.append(f"\tpotency: {potencies[i]},")
    if falloffs[i] is not None:
        sb.append(f"\tfalloff: {falloffs[i]},")
    if heal_potencies[i] is not None:
        sb.append(f"\thealingPotency: {heal_potencies[i]},")
    confirm_lines = []
    if required_statuses[i] is not None:
        allcaps_required_status = proper_case_to_allcaps_name(required_statuses[i])
        # Assume that the skill is highlighted when the relevant status is present.
        sb.append(
            f'\thighlightIf: (state) => state.hasResourceAvailable("{allcaps_required_status}"),'
        )
        sb.append(
            f'\tvalidateAttempt: (state) => state.hasResourceAvailable("{allcaps_required_status}"),'
        )
        confirm_lines.append(f'state.tryConsumeResource("{allcaps_required_status}")')
    if not is_ability and name in status_names:
        confirm_lines.append(f'state.gainStatus("{allcaps_name}")')
    if len(confirm_lines) > 0:
        sb.append(f"\tonConfirm: (state) => {confirm_lines[0]},")
    elif len(confirm_lines) > 1:
        sb.append(
            f'\tonConfirm: (state) => {{{[s + ";" for s in confirm_lines].join("\n\t\t")}\n\t}},'
        )
    sb.append("});")
    return "\n".join(sb)


# Used in GameState file
ACTIONS_DECL_BLOCK = "\n\n".join(
    map(generate_action_makefn, enumerate(skill_api_infos))
)

# Create a cooldown for every ability that doesn't share a CD with another ability.
COOLDOWNS_DECL_BLOCK = textwrap.indent(
    "\n".join(
        f'cd_{proper_case_to_allcaps_name(name)}: {{ name: "cd_{normalize_cd_label(name)}" }},'
        # Combine ability keys with explicit cooldown keys
        for name in {
            **{
                info.name: None
                for info in skill_api_infos
                if info.category == "Ability"
            },
            **COOLDOWNS,
        }
        if name not in shared_cd_mapping
    ),
    "\t",
)

# TODO update this loop to use ja translations and other data
for info in STATUSES:
    name = info.en
    if name in cached_xivapi_status_calls:
        print("using cached xivapi query for " + name)
        icon_id, icon_path, ja_name = cached_xivapi_status_calls[name]
        icon_id = int(icon_id)
    else:
        print("querying xivapi for " + name)
        r = requests.get(
            XIVAPI_BASE + "search?sheets=Status",
            params={
                # + means the constraint is mandatory
                # this helps restrict a bunch of random skill images that aren't actually the pve skill we want
                # use ~ (LIKE) for name since there may be some casing errors
                "query": f'+Name~"{name}" +ClassJobCategory.{JOB}=true',
                "fields": "Name,Name@lang(ja),Icon,ClassJobCategory,ClassJobLevel",
            },
        )
        r.raise_for_status()
        body = json.loads(r.text)
        if len(body["results"]) == 0:
            raise ValueError(f"xivapi returned no data for {name}, check the buff name and try again")
        blob = body["results"][0]
        icon_id = blob["fields"]["Icon"]["id"]
        icon_path = blob["fields"]["Icon"]["path_hr1"]
        ja_name = blob["fields"]["Name@lang(ja)"]
    cache_status_csv_writer.writerow([name, icon_id, icon_path, ja_name])
    for i in range(info.max_stacks):
        local_img_path = f"public/assets/Buffs/{JOB}/{name.replace(':', '')}"
        if i + 1 > 1:
            local_img_path += str(i + 1)
        local_img_path += ".png"
        iconset = icon_id // 1000 * 1000
        icon_path = f"ui/icon/{iconset}/{icon_id + i}_hr1.tex"
        if os.path.exists(local_img_path):
            print("skipping already-downloaded icon for " + name)
        else:
            with open(local_img_path, "wb") as f:
                print("downloading image for " + name)
                img_r = requests.get(
                    XIVAPI_BASE + "asset/" + icon_path,
                    params={"format": "png"},
                )
                img_r.raise_for_status()
                f.write(img_r.content)


def data_decl_from_info(info: Info) -> str:
    fields = {}
    if info.max_stacks > 1:
        fields["maximumStacks"] = info.max_stacks
    if info.max_charges > 1:
        fields["maximumCharges"] = info.max_charges
    if info.zh is not None:
        fields["label"] = f'{{ zh: "{info.zh}" }}'
    return (
        f'{proper_case_to_allcaps_name(info.en)}: {{ name: "{info.en}"'
        + (f', {", ".join(f'{k}: {v}' for k, v in fields.items())}' if fields else "")
        + " },"
    )


GAUGES_DECL_BLOCK = textwrap.indent("\n".join(map(data_decl_from_info, GAUGES)), "\t")
STATUSES_DECL_BLOCK = textwrap.indent(
    "\n".join(map(data_decl_from_info, STATUSES)), "\t"
)
TRACKERS_DECL_BLOCK = textwrap.indent(
    "\n".join(map(data_decl_from_info, TRACKERS)), "\t"
)

# Traits are scraped from the EN job guide page. We don't care about translations.
TRAITS_DECL_BLOCK = textwrap.indent(
    "\n".join(
        (
            f'{proper_case_to_allcaps_name(name)}: {{ name: "{name}", level: {level} }},'
            for name, level in trait_names_and_levels
        ),
    ),
    "\t",
)


# Used in GameState file
def state_decl_from_info(info: Info) -> str:
    return (
        f'make{JOB}Resource("{proper_case_to_allcaps_name(info.en)}", {info.max_stacks}'
        + (f", {{ timeout: {info.timeout} }}" if info.timeout is not None else "")
        + ");"
    )


resource_decl_lines = []
resource_decl_lines.append("// Gauge resources")
resource_decl_lines.extend(map(state_decl_from_info, GAUGES))
resource_decl_lines.append("\n// Statuses")
resource_decl_lines.extend(map(state_decl_from_info, STATUSES))
resource_decl_lines.append("\n// Trackers")
resource_decl_lines.extend(map(state_decl_from_info, TRACKERS))

RESOURCE_DECL_BLOCK = "\n".join(resource_decl_lines)

replace_group_lines = []
for skill, replaced_by_list in replace_group_mapping.items():
    replace_group_lines.append(f"const {proper_case_to_allcaps_name(skill)}_REPLACEMENTS: ConditionalSkillReplace<{JOB}State>[] = [")
    for replaced_by in [skill] + replaced_by_list:
        replace_group_lines.append("\t{")
        replace_group_lines.append(f'\t\tnewSkill: "{proper_case_to_allcaps_name(replaced_by)}",')
        replace_group_lines.append("\t\tcondition: (state) => false, // TODO")
        replace_group_lines.append("\t},")
    replace_group_lines.append("];")

REPLACE_GROUP_DECL_BLOCK = "\n".join(replace_group_lines)


STATE_FILE_CONTENT = f"""
// Skill and state declarations for {JOB}.

// AUTO-GENERATED FROM generate_job_data.py, MAY OR MAY NOT COMPILE

// TODO: write some stuff about what you want to test

import {{ {JOB}StatusPropsGenerator }} from "../../Components/Jobs/{JOB}";
import {{ StatusPropsGenerator }} from "../../Components/StatusDisplay";
import {{ ActionNode }} from "../../Controller/Record";
import {{ controller }} from "../../Controller/Controller";
import {{ BuffType }} from "../Common";
import {{ ActionKey, TraitKey }} from "../Data";
import {{ {JOB}ActionKey, {JOB}CooldownKey, {JOB}ResourceKey }} from "../Data/Jobs/{JOB}";
import {{ GameConfig }} from "../GameConfig";
import {{ GameState }} from "../GameState";
import {{ Modifiers, makeComboModifier, makePositionalModifier }} from "../Potency";
import {{ getResourceInfo, makeResource, ResourceInfo, CoolDown }} from "../Resources";
import {{
	Ability,
	combineEffects,
	ConditionalSkillReplace,
	EffectFn,
	getBasePotency,
	makeAbility,
	makeResourceAbility,
	MakeResourceAbilityParams,
	makeSpell,
	makeWeaponskill,
    MakeAbilityParams,
    MakeGCDParams,
	MOVEMENT_SKILL_ANIMATION_LOCK,
	PotencyModifierFn,
	Skill,
	SkillAutoReplace,
	StatePredicate,
	Spell,
	Weaponskill,
}} from "../Skills";

const make{JOB}Resource = (
	rsc: {JOB}ResourceKey,
	maxValue: number,
	params?: {{ timeout?: number; default?: number, warnOnOvercap?: boolean, warnOnTimeout?: boolean }},
) => {{
	makeResource("{JOB}", rsc, maxValue, params ?? {'{}'});
}};

{RESOURCE_DECL_BLOCK}

export class {JOB}State extends GameState {{
	constructor(config: GameConfig) {{
		super(config);

		this.registerRecurringEvents();
	}}

	override get statusPropsGenerator(): StatusPropsGenerator<{JOB}State> {{
		return new {JOB}StatusPropsGenerator(this);
	}}
}}

const make{JOB}Weaponskill = (
	name:{JOB}ActionKey,
	unlockLevel: number,
	params: Partial<MakeGCDParams<{JOB}State>>,
): Weaponskill<{JOB}State> => {{
	return makeWeaponskill("{JOB}", name, unlockLevel, {{
		...params
	}});
}}

const make{JOB}Spell = (
	name: {JOB}ActionKey,
	unlockLevel: number,
	params: Partial<MakeGCDParams<{JOB}State>>,
): Spell<{JOB}State> => {{
	return makeSpell("{JOB}", name, unlockLevel, {{
		...params,
	}});
}};

const make{JOB}Ability = (
	name: {JOB}ActionKey,
	unlockLevel: number,
	cdName: {JOB}CooldownKey,
	params: Partial<MakeAbilityParams<{JOB}State>>,
): Ability<{JOB}State> => {{
	return makeAbility("{JOB}", name, unlockLevel, cdName, {{
		...params,
	}});
}};

const make{JOB}ResourceAbility = (
	name: {JOB}ActionKey,
	unlockLevel: number,
	cdName: {JOB}CooldownKey,
	params: MakeResourceAbilityParams<{JOB}State>,
): Ability<{JOB}State> => {{
	return makeResourceAbility("{JOB}", name, unlockLevel, cdName, params);
}};

{REPLACE_GROUP_DECL_BLOCK}

{ACTIONS_DECL_BLOCK}
"""


DATA_FILE_CONTENT = f"""
import {{ ensureRecord }} from "../../../utilities";
import {{ ActionData, CooldownData, ResourceData, TraitData }} from "../types";

export const {JOB}_ACTIONS = ensureRecord<ActionData>()({{
{ACTIONS_DATA_DECL_BLOCK}
}});

export const {JOB}_COOLDOWNS = ensureRecord<CooldownData>()({{
{COOLDOWNS_DECL_BLOCK}
}});

export const {JOB}_GAUGES = ensureRecord<ResourceData>()({{
{GAUGES_DECL_BLOCK}
}});

export const {JOB}_STATUSES = ensureRecord<ResourceData>()({{
{STATUSES_DECL_BLOCK}
}});

export const {JOB}_TRACKERS = ensureRecord<ResourceData>()({{
{TRACKERS_DECL_BLOCK}
}});

export const {JOB}_TRAITS = ensureRecord<TraitData>()({{
{TRAITS_DECL_BLOCK}
}});

export type {JOB}Actions = typeof {JOB}_ACTIONS;
export type {JOB}ActionKey = keyof {JOB}Actions;

export type {JOB}Cooldowns = typeof {JOB}_COOLDOWNS;
export type {JOB}CooldownKey = keyof {JOB}Cooldowns;

export type {JOB}Gauges = typeof {JOB}_GAUGES;
export type {JOB}GaugeKey = keyof {JOB}Gauges;

export type {JOB}Statuses = typeof {JOB}_STATUSES;
export type {JOB}StatusKey = keyof {JOB}Statuses;

export type {JOB}Trackers = typeof {JOB}_TRACKERS;
export type {JOB}TrackerKey = keyof {JOB}Trackers;

export const {JOB}_RESOURCES = {{
	...{JOB}_GAUGES,
	...{JOB}_STATUSES,
	...{JOB}_TRACKERS,
}};
export type {JOB}Resources = typeof {JOB}_RESOURCES;
export type {JOB}ResourceKey = keyof {JOB}Resources;

export type {JOB}Traits = typeof {JOB}_TRAITS;
export type {JOB}TraitKey = keyof {JOB}Traits;
"""


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", "-w", action="store_true")
    args = ap.parse_args()
    if args.write:
        print(f"Writing data file {DATA_FILE_PATH}...")
        with open(DATA_FILE_PATH, "w") as f:
            f.write(DATA_FILE_CONTENT)
        print("Writing job state file...")
        with open(STATE_FILE_PATH, "w") as f:
            f.write(STATE_FILE_CONTENT)
        print("Done.")
    else:
        print(DATA_FILE_CONTENT)
        print()
        print(STATE_FILE_CONTENT)
