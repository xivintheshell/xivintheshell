#! /usr/bin/env python3

import sys
import csv

from datetime import datetime

if len(sys.argv)<2:
    print('give a cast log .csv file as input')
    quit()

###########

TIME=0
TYPE=1
ABILITY=2
SOURCE_TARGET=3

SKILL_NAME=0
CAST_TIME=1


# input
content = []

with open(sys.argv[1], 'r') as logs:
    reader = csv.reader(logs, delimiter=',', quotechar='|', quoting=csv.QUOTE_NONE)
    for row in reader:
        content.append(row)

# take away header
content = content[1:]


###############

resultDict = {}

def parseAction(action):
    action = action.split('+')[0] # ignore everything after

    skillName = action.strip()
    castTime = -1

    if action[-3:]=='sec': # has cast time
        tmp = action.split(' ')
        castTime = float( tmp[len(tmp)-2] )
        tmp = tmp[:-2]
        skillName = ' '.join(tmp).strip()

    return [skillName, castTime]


def parseLine(line):
    timeStr = line[TIME][1:-1]
    parsedTime = datetime.strptime(timeStr, '%M:%S.%f')
    return [
        parsedTime,
        line[TYPE][1:-1],
        parseAction(line[ABILITY][1:-1])
        ]



lastLine = parseLine(content[0])
for i in range(1, len(content)):
    thisLine = parseLine(content[i])

    elapsed = (thisLine[TIME] - lastLine[TIME]).total_seconds()


    # found a cast
    if lastLine[TYPE]=='Begin Cast' and thisLine[TYPE]=='Cast' and thisLine[ABILITY][CAST_TIME] >= 0:

        skillName = thisLine[ABILITY][SKILL_NAME]
        castTime = thisLine[ABILITY][CAST_TIME]
        window = castTime - elapsed

        if skillName in resultDict:
            [storedCastTime, avgWindow, numSamples] = resultDict[skillName]
            avgWindow = (avgWindow * numSamples + window) / (numSamples + 1)
            numSamples = numSamples + 1
            resultDict[skillName] = [castTime, avgWindow, numSamples]
        else:
            resultDict[skillName] = [castTime, window, 1]

    lastLine = thisLine


resultStr = ''

for k in resultDict:
    resultStr += k + ','
    l = resultDict[k]
    resultStr += str(l[0]) + ',' + str(l[1]) + ',' + str(l[2]) + '\n'

print('spellName,castTime,avgSlidecastWindow,numCasts')
print(resultStr)
