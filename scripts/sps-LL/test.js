// see this full SPS chart and excel formula:
// https://docs.google.com/spreadsheets/d/18IN-ygAXd2zCR1A3umV3efYcy8xz6O3f/edit?usp=sharing&ouid=104672178485330237849&rtpof=true&sd=true
// also see these notes by 小絮 (in Chinese):
// https://drive.google.com/file/d/1QjFaoiyg7Pz-N3dMcZJ6CbRygi9orDmH/view?usp=sharing


let levelParam0 = 420;
let levelParam1 = 2780;

// GCD formula, 2 decimals
// from: https://bbs.nga.cn/read.php?tid=29774994&rand=903
function computeGCD(spellSpeed, baseTime, LL) {
	let subtractLL = LL ? 15 : 0;
	return Math.floor(Math.floor(Math.floor((100-subtractLL)*100/100)*Math.floor((2000-Math.floor(130*(spellSpeed-levelParam0)/levelParam1+1000))*(1000*baseTime)/10000)/100)*100/100)/100;
}

// cast time formula, 3 decimals
function computeCastTime(spellSpeed, baseTime, LL) {
	let subtractLL = LL ? 15 : 0;
	return Math.floor(Math.floor(Math.floor((100-subtractLL)*100/100)*Math.floor((2000-Math.floor(130*(spellSpeed-levelParam0)/levelParam1+1000))*(1000*baseTime)/1000)/100)*100/100)/1000;
}

// old formula, from EW implementation
function adjustedCastTime(spellSpeed, baseRecastTime, LL) {
	let ceil = Math.ceil((levelParam0 - spellSpeed) * 130 / levelParam1);
	let pts = Math.floor(baseRecastTime * (1000 + ceil));
	let llFactor = LL ? 0.85 : 1;
	return Math.floor(llFactor * pts / 10) / 100;
}

let baseRecastTimes = [1.5, 2.0, 2.5, 2.8, 3.0, 3.5, 4.0];
let LL = false;

let allTestsPassed = true;
baseRecastTimes.forEach(baseCastTime => {
	for (let sps = 400; sps < 3000; sps++) {
		let s1 = computeGCD(sps, baseCastTime, LL);
		/*
		// the old formula is the same as new when there's no LL, but LL makes it fail.
		let s2 = adjustedCastTime(sps, baseCastTime, LL);
		if (s1 !== s2) {
			console.log(`${sps} (${baseCastTime}): ${s1} != ${s2}`);
			allTestsPassed = false;
		}
		 */
		let s3 = computeCastTime(sps, baseCastTime, LL);
		let diff = s3 - s1;
		if (diff < 0 || diff >= 0.01) {
			console.log("!");
			allTestsPassed = false;
		}
	}
});
if (allTestsPassed) {
	console.log("all tests passed.");
}
