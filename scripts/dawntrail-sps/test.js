let fs = require("fs");

const fileName = process.argv[2];
const baseCastTime = parseFloat(process.argv[3]);

if (typeof(fileName) !== "string"
	|| typeof(baseCastTime) !== "number" || isNaN(baseCastTime)
) {
	console.log("usage: node test.js <fileName> <castTimeRowNum>");
	process.exit(0);
}

// console.log("filename: " + fileName);
// console.log("baseCastTime: " + baseCastTime);

///////////////////////////////////////////////////////////////////////////

function adjustedCastTime(spellSpeed, inCastTime) {
	let ceil = Math.ceil((420.0 - spellSpeed) * 130 / 2780.0);
	let pts = Math.floor(inCastTime * (1000.0 + ceil));
	return Math.floor(pts / 10) / 100;
}

function runTests(castTimes) {
	let allPassed = true;
	castTimes.forEach(([spellSpeed, castTime]) => {
		let adjusted = adjustedCastTime(spellSpeed, baseCastTime);
		let diff = adjusted - castTime;
		if (diff !== 0) {
			console.log("test failed: [ sps, refCastTime, computedCastTime, diff ]");
			console.log([spellSpeed, castTime, adjusted, diff]);
			allPassed = false;
		}
	});
	if (allPassed) {
		console.log("base cast time " + baseCastTime + ":\nall tests passed");
	}
}

fs.readFile(fileName, { encoding: "utf8" }, (err, data) => {

	// number[][]
	let numbers = data.split('\n').map(row => {
		return row.trim().split(',').map(num => parseFloat(num.trim()));
	});

	let colNum = 0;
	for (let i = 2; i < numbers[0].length; i++) {
		if (numbers[0][i] === baseCastTime) {
			colNum = i;
		}
	}

	if (colNum <= 0) {
		console.log("base cast time not found");
		return;
	}

	// [spellSpeed, castTime][]
	let castTimes = numbers.map(row => [row[0], row[colNum]]);

	let testCastTimes = [castTimes[0]];
	for (let i = 1; i < castTimes.length; i++) {
		let [spellSpeed, castTime] = castTimes[i];
		testCastTimes.push([spellSpeed-1, castTimes[i-1][1]]);
		testCastTimes.push([spellSpeed, castTime]);
	}

	runTests(testCastTimes);
});