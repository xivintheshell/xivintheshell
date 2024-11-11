#!/usr/bin/env bash

# Helper script to download icons from xivapi and give them proper names.
# Assumes this is being from the repository root (invoked as ./scripts/download_xivapi_icons.sh).
# This only needs to be run once per job, so just modify the function calls at the bottom to suit your needs
# (associative arrays in bash are annoying so we just explicitly do a bunch of function calls, and I'm
# too lazy to rewrite this to parse a text file).
# Does not re-retrieve assets that were already downloaded (delete the file first if you want to update them).

# TODO: extend to auto-generate src/Game/Constants/JOB.ts as well.

JOB="RDM"  # change me when you do a different job

SKILL_DIR="src/Components/Asset/Skills/$JOB"
BUFF_DIR="src/Components/Asset/Buffs/$JOB"
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
        curl -s "https://xivapi.com/i/$ICONSET/$2_hr1.png" > "$DST"
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
        curl -s "https://xivapi.com/i/$ICONSET/$2_hr1.png" > "$DST"
    else
        echo "Skipping existing $DST"
    fi
}

get_buff_icon "Verfire Ready" "013402"
get_buff_icon "Verstone Ready" "013403"
get_buff_icon "Acceleration" "013405"
get_buff_icon "Dualcast" "013406"
get_buff_icon "Magick Barrier" "013408"
get_buff_icon "Embolden" "013410"
get_buff_icon "Thorned Flourish" "013411"
get_buff_icon "Grand Impact Ready" "013412"
get_buff_icon "Prefulgence Ready" "013413"

get_buff_icon "Magicked Swordplay" "018665"
get_buff_icon "Magicked Swordplay" "018666" 2
get_buff_icon "Magicked Swordplay" "018667" 3

get_buff_icon Manafication "017491"
get_buff_icon Manafication "017492" 2
get_buff_icon Manafication "017493" 3
get_buff_icon Manafication "017494" 4
get_buff_icon Manafication "017495" 5
get_buff_icon Manafication "017496" 6

get_skill_icon Riposte "003201"
get_skill_icon Jolt "003202"
get_skill_icon Verthunder "003203"
get_skill_icon "Corps-a-corps" "003204"
get_skill_icon Veraero "003205"
get_skill_icon Scatter "003207"
get_skill_icon Verfire "003208"
get_skill_icon Verstone "003209"
get_skill_icon Zwerchhau "003210"
get_skill_icon Displacement "003211"
get_skill_icon Fleche "003212"
get_skill_icon Redoublement "003213"
get_skill_icon Acceleration "003214"
get_skill_icon Moulinet "003215"
get_skill_icon Vercure "003216"
get_skill_icon "Contre Sixte" "003217"
get_skill_icon Embolden "003218"
get_skill_icon Manafication "003219"
get_skill_icon "Jolt II" "003220"
get_skill_icon Verraise "003221"
get_skill_icon Impact "003222"
get_skill_icon Verflare "003223"
get_skill_icon Verholy "003224"
get_skill_icon "Enchanted Riposte" "003225"
get_skill_icon "Enchanted Zwerchhau" "003226"
get_skill_icon "Enchanted Redoublement" "003227"
get_skill_icon "Enchanted Moulinet" "003228"
get_skill_icon "Verthunder II" "003229"
get_skill_icon "Veraero II" "003230"
get_skill_icon Engagement "003231"
get_skill_icon "Enchanted Reprise" "003232"
get_skill_icon Reprise "003233"
get_skill_icon Scorch "003234"
get_skill_icon "Verthunder III" "003235"
get_skill_icon "Veraero III" "003236"
get_skill_icon "Magick Barrier" "003237"
get_skill_icon Resolution "003238"
get_skill_icon "Enchanted Moulinet Deux" "003239"
get_skill_icon "Enchanted Moulinet Trois" "003240"
get_skill_icon "Jolt III" "003241"
get_skill_icon "Vice of Thorns" "003242"
get_skill_icon "Grand Impact" "003243"
get_skill_icon "Prefulgence" "003244"
