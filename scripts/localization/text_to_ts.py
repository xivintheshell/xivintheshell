#! /usr/bin/env python

import pyperclip

output = ""

with open("in_data.txt", mode="r", encoding="utf-8") as f:
    [ts, translation] = f.read().split("---")
    ts_lines = ts.strip().split('\n')
    translation_lines = translation.strip().split('\n')

    print(len(ts_lines))
    print(len(translation_lines))

#     if len(ts_lines) != len(translation_lines):
#         print("WARNING: lines count don't match")
#         exit()

    j = 0
    for i in range(0, len(ts_lines)):

        ts = ts_lines[i].strip()
        if len(ts) >= 2 and ts[0:2] == "//":
            output += "\n" + ts

        elif len(ts) == 0:
            output += "\n"
            j += 1

        else:
            translation = translation_lines[j].strip()
            insert_pos = ts.index('}')
            output += "\n" + ts[:insert_pos]
            output += ", label: { zh: \"" + translation + "\" } "
            output += ts[insert_pos:]
            j += 1

print(output)
pyperclip.copy(output)
