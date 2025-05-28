#! /usr/bin/env python

import pyperclip

output = ""

with open("in_data.txt", mode="r", encoding="utf-8") as f:
    [ts, translation] = f.read().split("---")
    ts_lines = ts.strip().split('\n')
    translation_lines = translation.strip().split('\n')

    if len(ts_lines) != len(translation_lines):
        print("WARNING: lines count don't match")
        exit()

    for i in range(0, len(ts_lines)):
        ts = ts_lines[i].strip()
        translation = translation_lines[i].strip()

        insert_pos = ts.index('}')
        output += "\n" + ts[:insert_pos]
        output += ", label: { zh: \"" + translation + "\" } "
        output += ts[insert_pos:]

print(output)
pyperclip.copy(output)
