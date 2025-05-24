import { XIVMath } from "../Game/XIVMath";

// Tests for the effect of crit buffs.
// References for damage ratios are taken from simulations run with Ama's combat sim in patch 7.2.
// https://colab.research.google.com/github/zqsz-xiv/xivintheshell-ama-sim-notebook/blob/main/in_the_shell_with_ama_sim.ipynb

// NOTE 5/23: Some sim values for stacking crit buffs on top of each other seem to be slightly off
// between Ama's combat sim and our internal math. It's unclear if this is due to rounding issues,
// configuration problems, formula errors, or the effect of additive constants like weapon damage
// and base stats. The corresponding tests are marked to fail.

// === HAMMERS ===
// No buffs:
// - Average DPS: 53646.99
// - Average damage: 305090.50
// With Battle Litany: does 1.0601x more
// - Average DPS: 56871.28
// - Average damage: 323427.00
// With Devilment: 1.1702x
// - Average DPS: 62787.89
// - Average damage: 357012.00
// With Battle Litany + Devilment: 1.2305x
// - Average DPS: 66012.74
// - Average damage: 375348.50
// With Battle Litany + Wanderer's Minuet: 1.0721x
// - Average DPS: 57525.58
// - Average damage: 327090.50
// With Battle Litany + Chain Stratagem: 1.1017x
// - Average DPS: 59113.69
// - Average damage: 336120.50
// With Battle Litany + Devilment + Technical Finish: 1.2729x
// - Average DPS: 68297.91
// - Average damage: 388342.00
// With Technical Finish: 1.0500x
// - Average DPS: 56339.07
// - Average damage: 320344.00
// With Army's Paeon + Technical Finish: 1.05786x
// - Average DPS: 56761.16
// - Average damage: 322744.00
//
/// === PAINT FILLER ===
// No buffs:
// - Average DPS: 37170.35
// - Average damage: 189791.83
// With Battle Litany: 1.0522x
// - Average DPS: 39111.45
// - Average damage: 199703.11
// With Devilment: 1.1557x
// - Average DPS: 42957.54
// - Average damage: 219341.22
// With Battle Litany + Chain Stratagem: 1.0883x
// - Average DPS: 40451.86
// - Average damage: 206547.22
// With Battle Litany + Devilment: 1.2103x
// - Average DPS: 44988.71
// - Average damage: 229712.42
// With Battle Litany + Devilment + Technical Finish: 1.2521x
// - Average DPS: 46541.90
// - Average damage: 237642.98
// With Technical Finish: 1.0500x
// - Average DPS: 39028.60
// - Average damage: 199280.09
// With Army's Paeon + Technical Finish: 1.0573x
// - Average DPS: 39300.27
// - Average damage: 200667.22

const commonStats: [number, number, number, number] = [100, 3214, 1990, 2033]; // level, crit, dh, det

const hammerBaseDamage = XIVMath.calculateDamage(...commonStats, 1, 1, 1);
const paintBaseDamage = XIVMath.calculateDamage(...commonStats, 1, 0, 0);

// just Battle Litany
it("calculates hammer with litany", () => {
	const withBuffs = XIVMath.calculateDamage(...commonStats, 1, 1.1, 1);
	expect(withBuffs / hammerBaseDamage).toBeCloseTo(1.06, 2);
});

it("calculates paint with litany", () => {
	const withBuffs = XIVMath.calculateDamage(...commonStats, 1, 0.1, 0);
	expect(withBuffs / paintBaseDamage).toBeCloseTo(1.05, 2);
});

// just Devilment
it.fails("calculates hammer with devilment", () => {
	const withBuffs = XIVMath.calculateDamage(...commonStats, 1, 1.2, 1.2);
	expect(withBuffs / hammerBaseDamage).toBeCloseTo(1.17, 2);
});

it("calculates paint with devilment", () => {
	const withBuffs = XIVMath.calculateDamage(...commonStats, 1, 0.2, 0.2);
	expect(withBuffs / paintBaseDamage).toBeCloseTo(1.156, 2);
});

// Battle Litany + Wanderer's Minuet
it("calculates hammer with litany + wm", () => {
	const withBuffs = XIVMath.calculateDamage(...commonStats, 1, 1.12, 1);
	expect(withBuffs / hammerBaseDamage).toBeCloseTo(1.072, 2);
});

// Battle Litany + Chain Stratagem
it.fails("calculates hammer with litany + chain", () => {
	const withBuffs = XIVMath.calculateDamage(...commonStats, 1, 1.2, 1);
	expect(withBuffs / hammerBaseDamage).toBeCloseTo(1.102, 2);
});

it.fails("calculates paint with litany + chain", () => {
	const withBuffs = XIVMath.calculateDamage(...commonStats, 1, 0.2, 0);
	expect(withBuffs / paintBaseDamage).toBeCloseTo(1.088, 2);
});

// Battle Litany + Devilment
it.fails("calculates hammer with litany + devilment", () => {
	const withBuffs = XIVMath.calculateDamage(...commonStats, 1, 1.3, 1.2);
	expect(withBuffs / hammerBaseDamage).toBeCloseTo(1.23, 2);
});

it("calculates paint with litany + devilment", () => {
	const withBuffs = XIVMath.calculateDamage(...commonStats, 1, 0.3, 0.2);
	expect(withBuffs / paintBaseDamage).toBeCloseTo(1.21, 2);
});

// Battle Litany + Devilment + Technical Finish
it.fails("calculates hammer with litany + devilment + tech", () => {
	const withBuffs = XIVMath.calculateDamage(...commonStats, 1.05, 1.3, 1.2);
	expect(withBuffs / hammerBaseDamage).toBeCloseTo(1.27, 2);
});

it.fails("calculates paint with litany + devilment + tech", () => {
	const withBuffs = XIVMath.calculateDamage(...commonStats, 1.05, 0.3, 0.2);
	expect(withBuffs / paintBaseDamage).toBeCloseTo(1.25, 2);
});

// just Technical Finish
it("calculates hammer with tech", () => {
	const withBuffs = XIVMath.calculateDamage(...commonStats, 1.05, 1, 1);
	expect(withBuffs / hammerBaseDamage).toBeCloseTo(1.05, 2);
});

it("calculates paint with tech", () => {
	const withBuffs = XIVMath.calculateDamage(...commonStats, 1.05, 0, 0);
	expect(withBuffs / paintBaseDamage).toBeCloseTo(1.05, 2);
});

// Army's Paeon + Technical Finish
it("calculates hammer with AP + tech", () => {
	const withBuffs = XIVMath.calculateDamage(...commonStats, 1.05, 1, 1.03);
	expect(withBuffs / hammerBaseDamage).toBeCloseTo(1.058, 2);
});

it("calculates paint with AP + tech", () => {
	const withBuffs = XIVMath.calculateDamage(...commonStats, 1.05, 0, 0.03);
	expect(withBuffs / paintBaseDamage).toBeCloseTo(1.057, 2);
});
