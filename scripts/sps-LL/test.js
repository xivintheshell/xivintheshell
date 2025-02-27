// see this full SPS chart and excel formula:
// https://docs.google.com/spreadsheets/d/18IN-ygAXd2zCR1A3umV3efYcy8xz6O3f/edit?usp=sharing&ouid=104672178485330237849&rtpof=true&sd=true
// also see these notes by 小絮 (in Chinese):
// https://drive.google.com/file/d/1QjFaoiyg7Pz-N3dMcZJ6CbRygi9orDmH/view?usp=sharing


let levelParam0 = 420;
let levelParam1 = 2780;

// GCD formula, 2 decimals, outdated (can be off by 0.01s under LL)
// from: https://bbs.nga.cn/read.php?tid=29774994&rand=903
function computeGCD(spellSpeed, baseTime, speedModifier) {
	return Math.floor(Math.floor(Math.floor((100-speedModifier)*100/100)*Math.floor((2000-Math.floor(130*(spellSpeed-levelParam0)/levelParam1+1000))*(1000*baseTime)/10000)/100)*100/100)/100;
}

// cast time formula, 3 decimals
function computeCastTime(spellSpeed, baseTime, speedModifier) {
	let subtractLL = LL ? 15 : 0;
	return Math.floor(Math.floor(Math.floor((100-subtractLL)*100/100)*Math.floor((2000-Math.floor(130*(spellSpeed-levelParam0)/levelParam1+1000))*(1000*baseTime)/1000)/100)*100/100)/1000;
}

// old formula, from EW implementation but turns out is more accurate..
function allaganGcd(spellSpeed, baseTime, speedModifier) {
	let ceil = Math.ceil((levelParam0 - spellSpeed) * 130 / levelParam1);
	let pts = Math.floor(baseTime * (1000 + ceil));
	return Math.floor((100 - speedModifier) * pts / 1000) / 100;
}

let baseRecastTimes = [1.5, 2.0, 2.5, 2.8, 3.0, 3.5, 4.0];
let LL = false;

let allTestsPassed = true;
baseRecastTimes.forEach(baseCastTime => {
	for (let sps = 400; sps < 3000; sps++) {
		let s1 = computeGCD(sps, baseCastTime, LL ? 15 : 0);
		let s2 = allaganGcd(sps, baseCastTime, LL ? 15 : 0);
		let diff = s2 - s1;
		if (Math.abs(diff) >= 0.001) {
			console.log(`sps: ${sps}, baseCastTime: ${baseCastTime}, old: ${s1}, allagan: ${s2}`);
			allTestsPassed = false;
		}
	}
});
if (allTestsPassed) {
	console.log("all tests passed.");
}
