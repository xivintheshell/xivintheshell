# This script is the inverse of csv2track.py: it takes a MarkerTracksCombined file and converts it
# to a CSV file. This is useful for aiding translation efforts.
# See csv2track.py for column information.

import csv
import json
import sys

COLOR_REVERSE_MAP = {
    "#f64141": "red",
	"#e89b5f": "orange",
	"#ffd535": "yellow",
	"#50c53d": "green",
	"#53e5e5": "cyan",
	"#217ff5": "blue",
	"#9755ef": "purple",
	"#ee79ee": "pink",
	"#6f6f6f": "grey",
}


def parse_track(input_json_path, output_csv_path):
    rows = []
    header = ["Track", "Color", "Override Description", "Hide Text", "No Adjust", "Time", "Type", "Ability"]
    with open(input_json_path) as f:
        obj = json.load(f)
    assert obj["fileType"] == "MarkerTracksCombined"
    for track in obj["tracks"]:
        track_num = int(track["track"])
        assert track["fileType"] == "MarkerTrackIndividual", f"track {track_num} had bad fileType {track['fileType']}"
        for marker in track["markers"]:
            t = marker["time"]
            ms = int(round((t - int(t)) * 1000))
            s = int(t) % 60
            m = int(t) // 60
            rows.append(
                [
                    track_num,
                    COLOR_REVERSE_MAP[marker["color"]],
                    marker["description"],
                    "" if marker["showText"] else "y",
                    "x",  # Always set "No Adjust" for convenience.
                    f"{m:02d}:{s:02d}.{ms:03d}",
                    "Cast" if marker["duration"] == 0 else "Begin Cast",
                    f"{marker['duration']} sec",
                ]
            )
    rows.sort(key=lambda x: x[header.index("Track")])
    rows.sort(key=lambda x: x[header.index("Time")])
    with open(output_csv_path, "w") as outfile:
        w = csv.writer(outfile)
        w.writerow(header)
        for r in rows:
            w.writerow(r)
    print("wrote " + output_csv_path)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} INPUT_JSON OUTPUT_CSV")
        sys.exit(1)
    parse_track(sys.argv[1], sys.argv[2])
