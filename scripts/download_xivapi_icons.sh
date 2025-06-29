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

JOB="NIN"  # change me when you do a different job

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

get_buff_icon "Hide" "210607"
get_buff_icon "Shade Shift" "210605"
get_buff_icon "Trick Attack" "214857"
get_buff_icon "Kassatsu" "212902"
get_buff_icon "Dokumori" "212920"
get_buff_icon "Tenri Jindo Ready" "212922"
get_buff_icon "Ten Chi Jin" "212911"
get_buff_icon "Meisui" "212914"
get_buff_icon "Shadow Walker" "212919"
get_buff_icon "Bunshin" "219681"
get_buff_icon "Bunshin" "219682" 2
get_buff_icon "Bunshin" "219683" 3
get_buff_icon "Bunshin" "219684" 4
get_buff_icon "Bunshin" "219685" 5
get_buff_icon "Phantom Kamaitachi Ready" "212917"
get_buff_icon "Raiju Ready" "217597"
get_buff_icon "Raiju Ready" "217598" 2
get_buff_icon "Raiju Ready" "217599" 3
get_buff_icon "Kunai's Bane" "212923"
get_buff_icon "Higi" "212921"
get_buff_icon "Doton" "212904"
get_buff_icon "Mudra" "212901"

get_skill_icon "Spinning Edge" "000601"
get_skill_icon "Shade Shift" "000607"
get_skill_icon "Gust Slash" "000602"
get_skill_icon "Hide" "000609"
get_skill_icon "Throwing Dagger" "000614"
get_skill_icon "Trick Attack" "000618"
get_skill_icon "Aeolian Edge" "000605"
get_skill_icon "Ten" "002901"
get_skill_icon "Ninjutsu" "002904"
get_skill_icon "Chi" "002902"
get_skill_icon "Death Blossom" "000615"
get_skill_icon "Shukuchi" "002905"
get_skill_icon "Jin" "002903"
get_skill_icon "Kassatsu" "002906"
get_skill_icon "Hakke Mujinsatsu" "002923"
get_skill_icon "Armor Crush" "002915"
get_skill_icon "Dream Within a Dream" "002918"
get_skill_icon "Hellfrog Medium" "002920"
get_skill_icon "Dokumori" "000619"
get_skill_icon "Bhavacakra" ""002921
get_skill_icon "Ten Chi Jin" "002922"
get_skill_icon "Meisui" "002924"
get_skill_icon "Bunshin" "002927"
get_skill_icon "Phantom Kamaitachi" "002929"
get_skill_icon "Forked Raiju" "002931"
get_skill_icon "Fleeting Raiju" "002932"
get_skill_icon "Kunai's Bane" "000620"
get_skill_icon "Deathfrog Medium" "002934"
get_skill_icon "Zesho Meppo" "002933"
get_skill_icon "Tenri Jindo" "002935"
get_skill_icon "Fuma Shuriken" "002907"
get_skill_icon "Katon" "002908"
get_skill_icon "Raiton" "002912"
get_skill_icon "Hyoton" "002909"
get_skill_icon "Huton" "002910"
get_skill_icon "Doton" "002911"
get_skill_icon "Suiton" "002913"
get_skill_icon "Goka Mekkyaku" "002925"
get_skill_icon "Hyosho Ranryu" "002926"
get_skill_icon "Rabbit Medium" "002914"
