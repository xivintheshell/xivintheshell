# Reads a modified version of an fflogs cast timeline.
# For your desired log, select "Grid View" and "Include All Begin Casts" before exporting as csv.
# Then in excel/google sheets, add 4 new columns:
# - Track: the track number for an event
# - Color: the color of the event
# - Override Description: the description for the event (this script will use the name of the Ability
#   if this is left unspecified
# - Hide Text: if "y", then hide the text on the timeline
# - No Adjust: if non-empty and the row is a "Begin Cast" event, then do not add 0.3s to this event's
#   duration. Events on the untargetable track never receive a 0.3s adjustment.
# For untargetability events, add an extra row with the timestamp at which the boss disappears,
# a track of -1, and the duration of the downtime in the Ability column.
#
# This script will add any cast that has a value in the "Track" column to the timeline.
# "Begin Cast" events are applied with their duration + 0.3s (to account for an FFLogs limitation),
# and "Cast" events are given a 0s duration. The duration "x.xx sec" at the end of ability names is automatically removed.

from collections import defaultdict
import csv
import json
import sys


# https://github.com/miyehn/ffxiv-blm-rotation/blob/ac26a23c6f620a9c549ccf814e86b65ca7b210bf/src/Components/ColorTheme.tsx#L11
COLOR_MAP = {
    "red": "#f64141",
	"orange": "#e89b5f",
	"yellow": "#ffd535",
	"green": "#50c53d",
	"cyan": "#53e5e5",
	"blue": "#217ff5",
	"purple": "#9755ef",
	"pink": "#ee79ee",
	"grey": "#6f6f6f"
}


def parse_csv(src, dst):
    # https://github.com/miyehn/ffxiv-blm-rotation/blob/ac26a23c6f620a9c549ccf814e86b65ca7b210bf/src/Controller/Timeline.ts#L560
    # combined marker file has the form
    # { "fileType": "MarkerTracksCombined", "tracks": <individual track object> }
    # each individual track has this schema:
    # {
    #   "fileType": "MarkerTrackIndividual",
    #   "track": number (int),
    #   "markers": [
    #     {
    #       "time": number (float),
    #       "markerType": "Info" | "Untargetable" | "Buff",
    #       "duration": number (float),
    #       "description": string,
    #       "color": string (#hex),
    #       "showText": boolean,
    #     },
    #     ...
    #   ]
    # }
    tracks = defaultdict(list)  # map track id to track object
    with open(src) as infile:
        i = 0
        for row in csv.DictReader(infile):
            i += 1
            track_str = row["Track"]
            if not track_str:
                continue
            try:
                track_id = int(track_str)
            except ValueError as e:
                print("bad row:", row)
                raise e
            # TODO add validation to ensure fields are filled
            color_str = row["Color"]
            ability = row["Ability"]
            cast_duration = 0
            if ability.endswith("sec"):
                # splice off "x.xx sec" string for casts
                toks = ability.split()
                ability = " ".join(toks[:-2])
                cast_duration = float(toks[-2])
                if (cast_duration > 0 and track_id != -1) and not ("No Adjust" in row and row["No Adjust"]):
                    # For some reason, logs usually report casts as 0.3s too short.
                    # Add 0.3s to compensate (except for manually-added untargetable durations.)
                    cast_duration += 0.3
            description = row["Override Description"] or ability
            hide = row["Hide Text"] == "y"
            # parse timestamp into seconds
            ts_str = row["Time"]
            ts_toks = ts_str.split(":")
            ts_sec = int(ts_toks[0]) * 60 + float(ts_toks[1])
            is_begin = row["Type"] == "Begin Cast"
            if not is_begin:
                # already parsed duration for "Begin" events
                cast_duration = 0
            if track_id == -1:
                color_hex_str = "#6f6f6f"
                cast_duration = float(row["Ability"].split()[0])
            else:
                if not color_str:
                    raise ValueError(f"missing color in row {i + 1}")
                color_hex_str = COLOR_MAP[color_str]
            tracks[track_id].append(
                {
                    "time": ts_sec,
                    "markerType": "Info" if track_id != -1 else "Untargetable",
                    "duration": cast_duration,
                    "description": description,
                    "color": color_hex_str,
                    "showText": not hide,
                }
            )

    with open(dst, "w") as outfile:
        json.dump({
            "fileType": "MarkerTracksCombined",
            "tracks": [
                {
                    "fileType": "MarkerTrackIndividual",
                    "track": i,
                    "markers": track,
                }
                for i, track in sorted(tracks.items())
            ]
        }, outfile)
    print(f"wrote {dst}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} INPUT_CSV OUTPUT_JSON")
        sys.exit(1)
    parse_csv(sys.argv[1], sys.argv[2])
