#!/usr/bin/env bash

# === WARNING ===
# This script has been replaced by generate_job_data.py, which automatically queries xivapi and scrapes
# the CN job guide to generate job data boilerplate. Only use this script if you are unable to run
# the Python script for whatever reason.

# Helper script to download icons from xivapi and give them proper names.
# Assumes this is being from the repository root (invoked as ./scripts/download_xivapi_icons.sh).
# This only needs to be run once per job, so just modify the function calls at the bottom to suit your needs
# (associative arrays in bash are annoying so we just explicitly do a bunch of function calls, and I'm
# too lazy to rewrite this to parse a text file).
# Does not re-retrieve assets that were already downloaded (delete the file first if you want to update them).

JOB="Phantom"  # change me when you do a different job

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

get_buff_icon "Drain Touch" "229987"

get_skill_icon "Occult Fire III" "064511"
get_skill_icon "Occult Blizzard III" "064512"
get_skill_icon "Occult Thunder III" "064513"
get_skill_icon "Occult Flare" "064515"
get_skill_icon "Hellfire" "064519"
get_skill_icon "Judgment Bolt" "064520"
get_skill_icon "Thunderstorm" "064522"
get_skill_icon "Megaflare" "064523"
get_skill_icon "Wisdom on the Winds" "064600"
get_skill_icon "Drain Touch" "064529"
get_skill_icon "Deep Freeze" "064530"
get_skill_icon "Hell Wind" "064531"
get_skill_icon "Chaos Drive" "064532"
get_skill_icon "Doomsday" "064533"
