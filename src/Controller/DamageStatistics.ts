// making another file just so I don't keep clustering Controller.ts
import {controller as ctl} from "./Controller";
import {ActionNode, ActionType} from "./Record";
import {ResourceType, SkillName} from "../Game/Common";
import {
	DamageStatisticsData,
	DamageStatsMainTableEntry,
	DamageStatsT3TableEntry,
	SelectedStatisticsData
} from "../Components/DamageStatistics";
import {PotencyModifier, PotencyModifierType} from "../Game/Potency";

const AFUISkills = new Set<SkillName>([
	SkillName.Blizzard,
	SkillName.Fire,
	SkillName.Fire3,
	SkillName.Blizzard3,
	SkillName.Freeze,
	SkillName.Flare,
	SkillName.Blizzard4,
	SkillName.Fire4,
	SkillName.Despair,
	SkillName.HighFire2,
	SkillName.HighBlizzard2
]);

const enoSkills = new Set<SkillName>([
	SkillName.Foul,
	SkillName.Xenoglossy,
	SkillName.Paradox
]);

const abilities = new Set<SkillName>([
	SkillName.Transpose,
	SkillName.Manaward,
	SkillName.Manafont,
	SkillName.LeyLines,
	SkillName.Sharpcast,
	SkillName.BetweenTheLines,
	SkillName.AetherialManipulation,
	SkillName.Triplecast,
	SkillName.UmbralSoul,
	SkillName.Amplifier,
	SkillName.Addle,
	SkillName.Swiftcast,
	SkillName.LucidDreaming,
	SkillName.Surecast,
	SkillName.Tincture,
	SkillName.Sprint
]);

type ExpandedNode = {
	displayedModifiers: PotencyModifierType[],
	basePotency: number,
	calculationModifiers: PotencyModifier[],
};

function expandT3Node(node: ActionNode) {
	console.assert(node.getPotencies().length > 0);
	console.assert(node.skillName === SkillName.Thunder3);
	let entry: DamageStatsT3TableEntry = {
		time: (node.tmp_startLockTime ?? ctl.gameConfig.countdown) - ctl.gameConfig.countdown,
		displayedModifiers: [],
		baseMainPotency: 0,
		baseDotPotency: 0,
		calculationModifiers: [],
		numTicks: 0,
		potencyWithoutPot: 0,
		potPotency: 0
	};

	let mainPotency = node.getPotencies()[0];
	entry.baseMainPotency = mainPotency.base;
	entry.calculationModifiers = mainPotency.modifiers;

	for (let i = 0; i < mainPotency.modifiers.length; i++) {
		if (mainPotency.modifiers[i].source === PotencyModifierType.ENO) {
			entry.displayedModifiers.push(PotencyModifierType.ENO)
		}
	}

	for (let i = 0; i < node.getPotencies().length; i++) {
		if (i > 0) {
			let p = node.getPotencies()[i];
			if (p.hasResolved()) {
				entry.baseDotPotency = p.base;
				entry.numTicks += 1;
			}
		}
	}

	let potencyWithoutPot = node.getPotency({tincturePotencyMultiplier: 1}).applied;
	let potencyWithPot = node.getPotency({tincturePotencyMultiplier: ctl.getTincturePotencyMultiplier()}).applied;
	entry.potencyWithoutPot = potencyWithPot;
	entry.potPotency = potencyWithPot - potencyWithoutPot;

	return entry;
}

function expandNode(node: ActionNode) : ExpandedNode {
	let res: ExpandedNode = {
		basePotency: 0,
		displayedModifiers: [],
		calculationModifiers: []
	}
	if (node.type === ActionType.Skill && node.skillName) {
		if (AFUISkills.has(node.skillName)) {
			console.assert(node.getPotencies().length > 0);
			// use the one that's not enochian or pot (then must be one of af123, ui123)
			let mainPotency = node.getPotencies()[0];
			res.basePotency = mainPotency.base;
			for (let i = 0; i < mainPotency.modifiers.length; i++) {
				let tag = mainPotency.modifiers[i].source;
				if (tag !== PotencyModifierType.ENO && tag !== PotencyModifierType.POT) {
					res.displayedModifiers = [tag];
					res.calculationModifiers = mainPotency.modifiers;
					break;
				}
			}
		} else if (enoSkills.has(node.skillName)) {
			console.assert(node.getPotencies().length > 0);
			// use enochian if it has one. Otherwise empty.
			let mainPotency = node.getPotencies()[0];
			for (let i = 0; i < mainPotency.modifiers.length; i++) {
				let tag = mainPotency.modifiers[i].source;
				if (tag === PotencyModifierType.ENO) {
					res.basePotency = mainPotency.base;
					res.displayedModifiers = [tag];
					res.calculationModifiers = mainPotency.modifiers;
					break;
				}
			}
		} else if (abilities.has(node.skillName)) {
		} else {
			console.assert(node.skillName === SkillName.Thunder3)
			res.basePotency = node.getPotencies()[0].base;
		}
		return res;
	} else {
		console.assert(false);
		return res;
	}
}

function expandAndMatch(table: DamageStatsMainTableEntry[], node: ActionNode) {

	let tagsAreEqual = function(a: PotencyModifierType[], b: PotencyModifierType[]) {
		if (a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) {
			if (a[i] !== b[i]) return false;
		}
		return true;
	}

	let expanded = expandNode(node);
	let res = {
		mainTableIndex: -1,
		expandedNode: expanded
	};

	for (let i = 0; i < table.length; i++) {
		if (node.skillName === table[i].skillName && tagsAreEqual(expanded.displayedModifiers, table[i].displayedModifiers)) {
			res.mainTableIndex = i;
			return res;
		}
	}

	return res;
}

export function calculateSelectedStats(props: {
	tinctureBuffPercentage: number,
	lastDamageApplicationTime: number
}): SelectedStatisticsData {
	let selected = {
		duration: 0,
		potency: {applied: 0, pending: 0},
		gcdSkills: {applied: 0, pending: 0}
	};

	let firstSelected = ctl.record.getFirstSelection();
	let lastSelected = ctl.record.getLastSelection();
	if (firstSelected && lastSelected) {
		if (firstSelected.tmp_startLockTime!==undefined && lastSelected.tmp_endLockTime!==undefined) {
			selected.duration = lastSelected.tmp_endLockTime - firstSelected.tmp_startLockTime;
		}
	}

	ctl.record.iterateSelected(node=>{
		if (node.type === ActionType.Skill && node.skillName) {
			// gcd count
			let skillInfo = ctl.game.skillsList.get(node.skillName);
			if (skillInfo.info.cdName === ResourceType.cd_GCD) {
				if (node.resolved()) selected.gcdSkills.applied++;
				else selected.gcdSkills.pending++;
			}
			// potency
			let p = node.getPotency({tincturePotencyMultiplier: ctl.getTincturePotencyMultiplier()});
			selected.potency.applied += p.applied;
			selected.potency.pending += p.snapshottedButPending;
		}
	});

	return selected;
}

export function calculateDamageStats(props: {
	tinctureBuffPercentage: number,
	lastDamageApplicationTime: number
}): DamageStatisticsData {
	let totalPotency = {applied: 0, pending: 0};
	let gcdSkills = {applied: 0, pending: 0};

	// has a list of entries, initially empty
	// take each skill node, find its corresponding entry and add itself to it
	// - depending on the specific skill, rules for dividing / finding entries could be different (some need AF123, some just eno)
	// - if there's no existing entry, create one.
	// sort the entries according to some rule, then return.

	let mainTable: DamageStatsMainTableEntry[] = [];
	let mainTableTotalPotency = {
		withoutPot: 0,
		potPotency: 0
	};

	let t3Table: DamageStatsT3TableEntry[] = [];

	let skillPotencies: Map<SkillName, number> = new Map();

	ctl.record.iterateAll(node=>{
		if (node.type === ActionType.Skill && node.skillName) {
			// gcd count
			let skillInfo = ctl.game.skillsList.get(node.skillName);
			if (skillInfo.info.cdName === ResourceType.cd_GCD) {
				if (node.resolved()) gcdSkills.applied++;
				else gcdSkills.pending++;
			}

			// potency
			let p = node.getPotency({tincturePotencyMultiplier: ctl.getTincturePotencyMultiplier()});
			totalPotency.applied += p.applied;
			totalPotency.pending += p.snapshottedButPending;

			// main table
			if (node.resolved()) {
				let q = expandAndMatch(mainTable, node);
				if (q.mainTableIndex < 0) { // create an entry if doesn't have one already
					mainTable.push({
						skillName: node.skillName,
						displayedModifiers: q.expandedNode.displayedModifiers,
						basePotency: q.expandedNode.basePotency,
						calculationModifiers: q.expandedNode.calculationModifiers,
						count: 0,
						totalPotencyWithoutPot: 0,
						potPotency: 0,
						potCount: 0
					});
					q.mainTableIndex = mainTable.length - 1;
				}
				let potencyWithoutPot = node.getPotency({tincturePotencyMultiplier: 1}).applied;
				let potencyWithPot = node.getPotency({tincturePotencyMultiplier: ctl.getTincturePotencyMultiplier()}).applied;
				mainTable[q.mainTableIndex].count += 1;
				mainTable[q.mainTableIndex].totalPotencyWithoutPot += potencyWithoutPot;
				mainTable[q.mainTableIndex].potPotency += (potencyWithPot - potencyWithoutPot);
				if (node.hasBuff(ResourceType.Tincture)) {
					mainTable[q.mainTableIndex].potCount += 1;
				}

				// also get contrib of each skill
				let skillPotency = skillPotencies.get(node.skillName) ?? 0;
				skillPotency += potencyWithPot;
				skillPotencies.set(node.skillName, skillPotency);

				// and main table total
				mainTableTotalPotency.withoutPot += potencyWithoutPot;
				mainTableTotalPotency.potPotency += (potencyWithPot - potencyWithoutPot);

				// t3 table
				if (node.skillName === SkillName.Thunder3) {
					t3Table.push(expandT3Node(node));
				}
			}
		}
	});

	mainTable.sort((a, b)=>{
		if (a.skillName !== b.skillName) {
			let pa = skillPotencies.get(a.skillName) ?? 0;
			let pb = skillPotencies.get(b.skillName) ?? 0;
			return pb - pa;
		} else {
			if (a.displayedModifiers.length !== b.displayedModifiers.length) {
				return b.displayedModifiers.length - a.displayedModifiers.length;
			} else {
				for (let i = 0; i < a.displayedModifiers.length; i++) {
					let diff = a.displayedModifiers[i] - b.displayedModifiers[i];
					if (diff !== 0) return diff;
				}
				return 0;
			}
		}
	});

	return {
		time: ctl.game.time,
		tinctureBuffPercentage: props.tinctureBuffPercentage,
		totalPotency: totalPotency,
		lastDamageApplicationTime: props.lastDamageApplicationTime,
		countdown: ctl.gameConfig.countdown,
		gcdSkills: gcdSkills,
		mainTable: mainTable,
		mainTableTotalPotency: mainTableTotalPotency,
		t3Table: t3Table,
		historical: !ctl.displayingUpToDateGameState,
		statsCsv: ctl.getStatsCsv()
	};
}