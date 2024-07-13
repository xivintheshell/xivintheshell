
// from: https://bbs.nga.cn/read.php?tid=29774994&rand=903
function computeSps(spellSpeed, baseRecastTime, LL) {
	let subtractLL = LL ? 15 : 0;
	return Math.floor(Math.floor(Math.floor((100-subtractLL)*100/100)*Math.floor((2000-Math.floor(130*(spellSpeed-400)/1900+1000))*(baseRecastTime*1000)/1000)/1000)*100/100)/100;
}

// modified from EW implementation
function adjustedCastTime(spellSpeed, baseRecastTime, LL) {
	let ceil = Math.ceil((400.0 - spellSpeed) * 130 / 1900.0);
	let pts = Math.floor(baseRecastTime * (1000 + ceil));
	let llFactor = LL ? 0.85 : 1;
	return Math.floor(llFactor * pts / 10) / 100;
}

let baseRecastTimes = [1.5, 2.0, 2.5, 2.8, 3.0, 3.5, 4.0];
let LL = true;

let allTestsPassed = true;
baseRecastTimes.forEach(baseRecastTime => {
	for (let sps = 400; sps < 3000; sps++) {
		let s1 = computeSps(sps, baseRecastTime, LL);
		let s2 = adjustedCastTime(sps, baseRecastTime, LL);
		if (s1 !== s2) {
			console.log(`${sps} (${baseRecastTime}): ${s1} != ${s2}`);
			allTestsPassed = false;
		}
	}
});
if (allTestsPassed) {
	console.log("all tests passed.");
}
