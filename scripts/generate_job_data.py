"""
Script to automatically generate a significant amount of boilerplate for a new job.
This script must be run from repository root.

Requires installing the beautifulsoup and requests libraries (`pip install bs4 requests`).
Probably requires at least Python 3.10 (I tested with 3.13).

This will destructively overwrite `src/Game/Data/Jobs/$JOB.ts` and `src/Game/Jobs.$JOB.ts`, generating
boilerplate for basic skill declaration information and data.
Make sure any previously-made changes were saved before running this script.

Running this script performs the following actions:
- Scrapes the job guide's HTML for relevant action names and unlock levels
- Scrapes the Chinese job guide's HTML for translations of these actions to Chinese
- Downloads image assets from XIVAPI to the appropriate sub-folder in `public/assets/`
- Retrieves action IDs from XIVAPI
- Retreives Japanese translations of skills and statuses from XIVAPI

Note that Japanese translations are obtained from XIVAPI while Chinese ones are scraped because
XIVAPI only reports data available in the international client, which contains English, French,
German, and Japanese data.

This can eventually be extended to retrieve even more information automatically, but this is
unnecessary for the time being.

See the "YOUR CHANGES HERE" for further instructions on precise setup.
"""
import csv
from dataclasses import dataclass
import json
import os
import textwrap
from typing import List

from bs4 import BeautifulSoup
import requests


@dataclass
class Info:
    en: str
    zh: str | None
    max_stacks: int = 1
    timeout: int | None = None

I = Info

# === BEGIN: YOUR CHANGES HERE ===
# Modify the variables in this section according to the skills and statuses you wish to generate.

JOB: str = "MNK"
# A path to a locally-saved HTML file of the English-language job guide.
# For example, hitting ctrl/cmd-S on this link:
# https://na.finalfantasyxiv.com/jobguide/monk/
EN_JOB_GUIDE_HTML: str = "~/Downloads/en_mnk.html"
# A path to a locally-saved HTML file of the Chinese-language job guide.
# For example, hitting ctrl/cmd-S on this link:
# https://actff1.web.sdo.com/project/20190917jobguid/index.html#/continfo/monk/pve
ZH_JOB_GUIDE_HTML: str = "~/Downloads/zh_mnk.html"
# Both job guides are assumed to have the same order of actions, which may
# not always be the case between patches.

# Action names are scraped from the job guide files. If there are any actions that should not be
# included due to being out-leveled, list their proper English names here.
EXCLUDE_ACTIONS: List[str] = [
    "Steeled Meditation",
    "Steel Peak",
    "Inspirited Meditation",
]

# Name of the last PVE action in the job guide. This makes it so we don't have to write more complicated
# CSS selectors to tell BS4 when to stop parsing :).
LAST_PVE_ACTION: str = "Fire's Reply"

# A list of cooldowns resources to generate.
COOLDOWNS: List[str] = [
    "Forbidden Chakra",
    "Thunderclap",
    "Mantra",
    "Perfect Balance",
    "Riddle of Earth",
    "Earth's Reply",
    "Riddle of Fire",
    "Brotherhood",
    "Riddle of Wind",
    "Wind's Reply",
    "Fire's Reply",
]

# A list of English gauge element names.
# Their translations must manually be added.
GAUGES: List[Info | str] = [
    I("Chakra", "斗气", max_stacks=5),
    I("Beast Chakra 1", "脉轮1"),
    I("Beast Chakra 2", "脉轮2"),
    I("Beast Chakra 3", "脉轮3"),
    I("Nadi 1", "太阴斗气/太阳斗气1"),
    I("Nadi 2", "太阴斗气/太阳斗气1"),
    I("Opo-opo's Fury", "魔猿功力"),
    I("Raptor's Fury", "盗龙功力", max_stacks=2),
    I("Coeurl's Fury", "猛豹功力", max_stacks=3),
]

# A list of buff/debuffs.
# Their Chinese translations must manually be added.
STATUSES: List[Info | str] = [
    I("Mantra", "真言", timeout=15),
    I("Opo-opo Form", "魔猿身形", timeout=30),
    I("Raptor Form", "盗龙身形", timeout=30),
    I("Coeurl Form", "猛豹身形", timeout=30),
    I("Perfect Balance", "震脚", max_stacks=3, timeout=20),
    I("Formless Fist", "无相身形", timeout=30),
    I("Riddle of Earth", "金刚极意", timeout=10),
    I("Earth's Resolve", "金刚决意", timeout=15),
    I("Earth's Rumination", "金刚周天预备", timeout=30),
    I("Riddle of Fire", "红莲极意", timeout=20),
    I("Fire's Reply", "乾坤斗气弹预备", timeout=20),
    I("Brotherhood", "义结金兰", timeout=20),
    I("Meditative Brotherhood", "义结金兰：斗气", timeout=20),
    I("Riddle of Wind", "疾风极意", timeout=15),
    I("Wind's Reply", "绝空拳预备", timeout=15),
    I("Six-Sided Star", "六合星导脚", timeout=5),
]

# A list of tracker abilities that don't necessarily correspond to any real in-game buffs.
# Their translations must manually be added.
TRACKERS: List[Info | str] = [
]

# Traits are automatically scraped.
# === END: YOUR CHANGES HERE ===

STATE_FILE_PATH = f"src/Game/Jobs/{JOB}.ts"
DATA_FILE_PATH = f"src/Game/Data/Jobs/{JOB}.ts"

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

def proper_case_to_allcaps_name(s: str | Info) -> str:
    if isinstance(s, Info):
        name = s.en
    else:
        name = s
    return name.replace(" ", "_").replace("'", "").replace(":", "").upper()


with open(os.path.expanduser(EN_JOB_GUIDE_HTML)) as f:
	en_soup = BeautifulSoup(f, "html.parser")
with open(os.path.expanduser(ZH_JOB_GUIDE_HTML)) as f:
	zh_soup = BeautifulSoup(f, "html.parser")

# Parsing action declarations
# The EN job guide has a tbody with class "job__tbody", with each action declared in a tr.
# The name is then found in a child div with class "skill__wrapper", which then contains a
# <p><strong> with the actual name of the skill. The unlock level is in div with class
# "jobclass__wrapper", which contains a <p> with "Lv. #".
# The CN job guide has a div with class "job_tbody", which eventually has a child <p> with
# class "skill_txt", containing a <strong> with the Chinese name. The zh job guide also has text
# indicating if a skill is learned from job quest ("通过特职任务获得"), so we need to filter those lines as well.
zh_learned_by_quest = {"通过职业任务获得", "通过特职任务获得"}
en_skill_names = [t.contents[0] for t in en_soup.select("div.skill__wrapper > p > strong")]
zh_skill_names = [t.contents[0] for t in zh_soup.select("p.skill_txt > strong") if t.contents[0] not in zh_learned_by_quest]
last_idx = en_skill_names.index(LAST_PVE_ACTION)
en_skill_names = en_skill_names[:last_idx + 1]
zh_skill_names = zh_skill_names[:last_idx + 1]
for exclude_action in EXCLUDE_ACTIONS:
	idx = en_skill_names.index(exclude_action)
	if idx > 0:
		del en_skill_names[idx]
		del zh_skill_names[idx]

XIVAPI_BASE = "https://v2.xivapi.com/api/"
os.makedirs(f"public/assets/Skills/{JOB}", exist_ok=True)
skill_api_infos = []

for name in en_skill_names:
	if name in cached_xivapi_action_calls:
		print("using cached xivapi query for " + name)
		action_id, icon_path, ja_name = cached_xivapi_action_calls[name]
	else:
		print("querying xivapi for " + name)
		r = requests.get(
			XIVAPI_BASE + "search?sheets=Action",
			params={
				# + means the constraint is mandatory
				# this helps restrict a bunch of random skill images that aren't actually the pve skill we want
				# use ~ (LIKE) for name since there may be some casing errors
				"query": f'+Name~"{name}" +IsPvP=false +ClassJobCategory.{JOB}=true',
				"fields": "Name,Name@lang(ja),Icon,ClassJobCategory"
			}
		)
		r.raise_for_status()
		blob = json.loads(r.text)["results"][0]
		action_id = blob["row_id"]
		icon_path = blob["fields"]["Icon"]["path_hr1"]
		ja_name = blob["fields"]["Name@lang(ja)"]
	info = [name, action_id, icon_path, ja_name]
	skill_api_infos.append(info)
	cache_action_csv_writer.writerow(info)
	local_img_path = f"public/assets/Skills/{JOB}/{name.replace(':', '')}.png"
	if os.path.exists(local_img_path):
		print("skipping already-downloaded icon for " + name)
	else:
		with open(local_img_path, "wb") as f:
			print("downloading image for " + name)
			img_r = requests.get(
				XIVAPI_BASE + "asset/" + icon_path,
				params={
					"format": "png"
				},
			)
			img_r.raise_for_status()
			f.write(img_r.content)


ACTIONS_DATA_DECL_BLOCK = textwrap.indent(",\n".join(
	(
		proper_case_to_allcaps_name(name) + ": {\n"
		"\tid: " + str(action_id) + ",\n"
		'\tname: "' + name + '",\n'
		"\tlabel: {\n"
		"\t\tzh: " + zh_skill_names[i] + ",\n"
		"\t\tja: " + ja_name + ",\n"
		"\t},\n"
		"}"
	)
	for i, (name, action_id, icon_path, ja_name) in enumerate(skill_api_infos)
), "\t")

COOLDOWNS_DECL_BLOCK = ""
GAUGES_DECL_BLOCK = ""
STATUSES_DECL_BLOCK = ""
TRACKERS_DECL_BLOCK = ""
TRAITS_DECL_BLOCK = ""

RESOURCE_DECL_BLOCK = ""
ACTIONS_DECL_BLOCK = ""


STATE_FILE_CONTENT = f"""
// Skill and state declarations for {JOB}.

// AUTO-GENERATED FROM generate_job_data.py, MAY OR MAY NOT COMPILE

// TODO: write some stuff about what you want to test

import {{ {JOB}StatusPropsGenerator }} from "../../Components/Jobs/$JOB";
import {{ StatusPropsGenerator }} from "../../Components/StatusDisplay";
import {{ ActionNode }} from "../../Controller/Record";
import {{ controller }} from "../../Controller/Controller";
import {{ BuffType, WarningType }} from "../Common";
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
	MOVEMENT_SKILL_ANIMATION_LOCK,
	NO_EFFECT,
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
	params?: {{ timeout?: number; default?: number }},
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
    print(f"Writing data file {DATA_FILE_PATH}...")
    with open(DATA_FILE_PATH, "w") as f:
    	# f.write
        print(DATA_FILE_CONTENT)
    print("Writing job state file...")
    # with open(STATE_FILE_PATH, "w") as f:
    #     f.write(STATE_FILE_CONTENT.format(
    #         JOB=JOB,
    #         RESOURCE_DECL_BLOCK=RESOURCE_DECL_BLOCK,
    #         ACTIONS_DECL_BLOCK=ACTIONS_DECL_BLOCK,
    #     ))
    print("Done.")
