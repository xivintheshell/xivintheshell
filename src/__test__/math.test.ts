
import {
	damageData,
	rotationTestSetup,
	rotationTestTeardown,
	makeTestWithConfigFn,
	applySkill,
	compareDamageTables,
} from "./utils";
import { XIVMath } from "../Game/XIVMath";

// Tests for the effect of crit buffs.
// References for damage ratios are taken from simulations run with Ama's combat sim in patch 7.2.
// https://colab.research.google.com/github/zqsz-xiv/xivintheshell-ama-sim-notebook/blob/main/in_the_shell_with_ama_sim.ipynb

// === HAMMERS ===
// No crit buffs:
// - Average DPS: 53646.99
// - Average damage: 305090.50
// With Battle Litany: does 1.0601x more
// - Average DPS: 56871.28
// - Average damage: 323427.00
// With Battle Litany + Devilment: 1.2305x
// - Average DPS: 66012.74
// - Average damage: 375348.50
// With Battle Litany + Devilment + Technical Finish: 1.2729
// - Average DPS: 68297.91
// - Average damage: 388342.00
// 
/// === PAINT FILLER ===
// No crit buffs:
// - Average DPS: 37170.35
// - Average damage: 189791.83
// With Battle Litany: 1.0522x
// - Average DPS: 39111.45
// - Average damage: 199703.11
// With Battle Litany + Devilment: 1.2103s
// - Average DPS: 44988.71
// - Average damage: 229712.42
// With Battle Litany + Devilment + Technical Finish: 1.2521
// - Average DPS: 46541.90
// Average damage: 237642.98

const commonStats = [100, 3214, 1990, 2033]; // level, crit, dh, det

// just Battle Litany
it("calculates hammer with litany", () => {
	const baseDamage = XIVMath.calculateDamage(...commonStats, 1, 1, 1);
	const withCritBuffs = XIVMath.calculateDamage(...commonStats, 1, 1.1, 1);
	console.error(baseDamage);
	console.error(withCritBuffs)
	expect(withCritBuffs / baseDamage).toBeCloseTo(1.06, 2);
});

it("calculates paint with litany", () => {
	const baseDamage = XIVMath.calculateDamage(...commonStats, 1, 0, 0);
	const withCritBuffs = XIVMath.calculateDamage(...commonStats, 1, 0.1, 0);
	expect(withCritBuffs / baseDamage).toBeCloseTo(1.05, 2);
});

// Battle Litany + Devilment
it("calculates hammer with litany + devilment", () => {
	const baseDamage = XIVMath.calculateDamage(...commonStats, 1, 1, 1);
	const withCritBuffs = XIVMath.calculateDamage(...commonStats, 1, 1.3, 1.2);
	console.error(baseDamage);
	console.error(withCritBuffs)
	expect(withCritBuffs / baseDamage).toBeCloseTo(1.23, 2);
});

it("calculates paint with litany + devilment", () => {
	const baseDamage = XIVMath.calculateDamage(...commonStats, 1, 0, 0);
	const withCritBuffs = XIVMath.calculateDamage(...commonStats, 1, 0.3, 0.2);
	expect(withCritBuffs / baseDamage).toBeCloseTo(1.21, 2);
});

// Battle Litany + Devilment + Technical Finish
it("calculates hammer with litany + devilment + tech", () => {
	const baseDamage = XIVMath.calculateDamage(...commonStats, 1.05, 1, 1);
	const withCritBuffs = XIVMath.calculateDamage(...commonStats, 1.05, 1.3, 1.2);
	console.error(baseDamage);
	console.error(withCritBuffs)
	expect(withCritBuffs / baseDamage).toBeCloseTo(1.27, 2);
});

it("calculates paint with litany + devilment + tech", () => {
	const baseDamage = XIVMath.calculateDamage(...commonStats, 1.05, 0, 0);
	const withCritBuffs = XIVMath.calculateDamage(...commonStats, 1.05, 0.3, 0.2);
	expect(withCritBuffs / baseDamage).toBeCloseTo(1.25, 2);
});
