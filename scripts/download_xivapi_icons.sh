#!/usr/bin/env bash

# Helper script to download icons from xivapi and give them proper names.
# Assumes this is being from the repository root (invoked as ./scripts/download_xivapi_icons.sh).
# This only needs to be run once per job, so just modify the function calls at the bottom to suit your needs
# (associative arrays in bash are annoying so we just explicitly do a bunch of function calls, and I'm
# too lazy to rewrite this to parse a text file).
# Does not re-retrieve assets that were already downloaded (delete the file first if you want to update them).

JOB="DRK"  # change me when you do a different job

SKILL_DIR="public/assets/Skills/$JOB"
BUFF_DIR="public/assets/Buffs/$JOB"
mkdir -p "$SKILL_DIR"
mkdir -p "$BUFF_DIR"

get_skill_icon() {
    # 1: skill name (as shown in game)
    # 2: icon ID (see examples in https://xivapi.com/docs/Icons?set=icons002000)
    # the iconset is the first 3 characters of the icon ID, zero-padded
    ICONSET="${2::3}000"
    DST="$SKILL_DIR/$1.png"
    if [[ ! -f "$DST" ]]; then
        echo "Downloading $DST"
        curl -s "https://v2.xivapi.com/api/asset?path=ui/icon/$ICONSET/$2_hr1.tex&format=png" > "$DST"
    else
        echo "Skipping existing $DST"
    fi
}

get_buff_icon() {
    # 1: buff name (as shown in game)
    # 2: icon ID (see examples in https://xivapi.com/docs/Icons?set=icons012000)
    # 3 (optional): # of stacks (see examples in https://xivapi.com/docs/Icons?set=icons018000)
    # the iconset is the first 3 characters of the icon ID, zero-padded
    ICONSET="${2::3}000"
    if [[ "$#" -eq 3 ]]; then
        DST="$BUFF_DIR/${1}${3}.png"
    else
        DST="$BUFF_DIR/$1.png"
    fi
    if [[ ! -f "$DST" ]]; then
        echo "Downloading $DST"
        curl -s "https://v2.xivapi.com/api/asset?path=ui/icon/$ICONSET/$2_hr1.tex&format=png" > "$DST"
    else
        echo "Skipping existing $DST"
    fi
}

get_buff_icon "Salted Earth" "23104"
get_buff_icon "Grit" "213108"
get_buff_icon "Shadow Wall" "213113"
get_buff_icon "Dark Mind" "213114"
get_buff_icon "Living Dead" "213115"
get_buff_icon "Walking Dead" "213116"
get_buff_icon "Undead Rebirth" "213124"
get_buff_icon "Dark Missionary" "213122"
get_buff_icon "Delirium" "217147"
get_buff_icon "Delirium" "217148" 2
get_buff_icon "Delirium" "217149" 3
get_buff_icon "Blood Weapon" "217926"
get_buff_icon "Blood Weapon" "217927" 2
get_buff_icon "Blood Weapon" "217928" 3
get_buff_icon "Blood Weapon" "217929" 4
get_buff_icon "Blood Weapon" "217930" 5
get_buff_icon "Blackest Night" "213118"
get_buff_icon "Scorn" "213126"
get_buff_icon "Oblation" "213123"
get_buff_icon "Shadowed Vigil" "213125"
get_buff_icon "Vigilant" "213127"

get_skill_icon "Hard Slash" "003051"
get_skill_icon "Syphon Strike" "003054"
get_skill_icon "Unleash" "003063"
get_skill_icon "Grit" "003070"
get_skill_icon "Release Grit" "003092"
get_skill_icon "Unmend" "003062"
get_skill_icon "Souleater" "003055"
get_skill_icon "Flood of Darkness" "003082"
get_skill_icon "Blood Weapon" "003071"
get_skill_icon "Shadow Wall" "003075"
get_skill_icon "Stalwart Soul" "003084"
get_skill_icon "Edge of Darkness" "003083"
get_skill_icon "Dark Mind" "003076"
get_skill_icon "Living Dead" "003077"
get_skill_icon "Salted Earth" "003066"
get_skill_icon "Shadowstride" "003093"
get_skill_icon "Abyssal Drain" "003064"
get_skill_icon "Carve and Spit" "003058"
get_skill_icon "Bloodspiller" "003080"
get_skill_icon "Quietus" "003079"
get_skill_icon "Dark Missionary" "003087"
get_skill_icon "Delirium" "003078"
get_skill_icon "The Blackest Night" "003081"
get_skill_icon "Flood of Shadow" "003085"
get_skill_icon "Edge of Shadow" "003086"
get_skill_icon "Living Shadow" "003088"
get_skill_icon "Oblation" "003089"
get_skill_icon "Salt and Darkness" "003090"
get_skill_icon "Shadowbringer" "003091"
get_skill_icon "Shadowed Vigil" "003094"
get_skill_icon "Scarlet Delirium" "003095"
get_skill_icon "Comeuppance" "003096"
get_skill_icon "Torcleaver" "003097"
get_skill_icon "Impalement" "003098"
get_skill_icon "Disesteem" "003099"
