// making another file just so I don't keep clustering Controller.ts
import {controller as ctl} from "./Controller";
import {ActionNode, ActionType} from "./Record";
import {BuffType, ResourceType, SkillName} from "../Game/Common";
import {
	DamageStatisticsData,
	DamageStatsMainTableEntry,
	DamageStatsThunderTableEntry,
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
	SkillName.HighBlizzard2,
	SkillName.FlareStar,
]);

const pictoDamageSkills = new Set<SkillName>([
	SkillName.FireInRed,
	SkillName.Fire2InRed,
	SkillName.AeroInGreen,
	SkillName.Aero2InGreen,
	SkillName.WaterInBlue,
	SkillName.Water2InBlue,
	SkillName.BlizzardInCyan,
	SkillName.Blizzard2InCyan,
	SkillName.StoneInYellow,
	SkillName.Stone2InYellow,
	SkillName.ThunderInMagenta,
	SkillName.Thunder2InMagenta,
	SkillName.HolyInWhite,
	SkillName.CometInBlack,
	SkillName.RainbowDrip,
	SkillName.StarPrism,

	SkillName.PomMuse,
	SkillName.WingedMuse,
	SkillName.ClawedMuse,
	SkillName.FangedMuse,
	SkillName.MogOfTheAges,
	SkillName.RetributionOfTheMadeen,

	SkillName.HammerStamp,
	SkillName.HammerBrush,
	SkillName.PolishingHammer,
]);

const pictoMotifs = new Set<SkillName>([
	SkillName.HammerMotif,
	SkillName.PomMotif,
	SkillName.WingMotif,
	SkillName.ClawMotif,
	SkillName.MawMotif,
	SkillName.StarrySkyMotif,
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
	SkillName.BetweenTheLines,
	SkillName.AetherialManipulation,
	SkillName.Triplecast,
	SkillName.UmbralSoul,
	SkillName.Amplifier,
	SkillName.Retrace,

	SkillName.StrikingMuse,
	SkillName.StarryMuse,
	SkillName.TemperaCoat,
	SkillName.TemperaCoatPop,
	SkillName.TemperaGrassa,
	SkillName.TemperaGrassaPop,
	SkillName.Smudge,
	SkillName.SubtractivePalette,

	SkillName.Addle,
	SkillName.Swiftcast,
	SkillName.LucidDreaming,
	SkillName.Surecast,
	SkillName.Tincture,
	SkillName.Sprint
]);

// source of truth
const excludedFromStats = new Set<SkillName | "DoT">([]);

type ExpandedNode = {
	displayedModifiers: PotencyModifierType[],
	basePotency: number,
	calculationModifiers: PotencyModifier[],
};

export const bossIsUntargetable = (displayTime: number) => {
	return ctl.getUntargetableMask() &&
		ctl.timeline.duringUntargetable(displayTime)
}

export const getTargetableDurationBetween = (startDisplayTime: number, endDisplayTime: number) => {
	return ctl.getUntargetableMask() ?
		ctl.timeline.getTargetableDurationBetween(startDisplayTime, endDisplayTime) : endDisplayTime - startDisplayTime;
}

function expandThunderNode(node: ActionNode, lastNode?: ActionNode) {
	console.assert(node.getPotencies().length > 0);
	console.assert(node.skillName === SkillName.HighThunder);
	let mainPotency = node.getPotencies()[0];
	let entry: DamageStatsThunderTableEntry = {
		castTime: node.tmp_startLockTime ? node.tmp_startLockTime - ctl.gameConfig.countdown : 0,
		applicationTime: mainPotency.hasResolved() ? (mainPotency.applicationTime as number) : 0,
		displayedModifiers: [],
		gap: 0,
		override: 0,
		mainPotencyHit: true,
		baseMainPotency: 0,
		baseDotPotency: 0,
		calculationModifiers: [],
		totalNumTicks: 0,
		numHitTicks: 0,
		potencyWithoutPot: 0,
		potPotency: 0,
		partyBuffPotency: 0
	};

	if (lastNode) {
		let lastP = lastNode.getPotencies()[0];
		let thisP = node.getPotencies()[0];
		console.assert(lastP.hasResolved() && thisP.hasResolved());
		let lastDotDropDisplayTime = lastP.applicationTime as number + 30;
		let thisDotApplicationDisplayTime = thisP.applicationTime as number;
		if (thisDotApplicationDisplayTime - lastDotDropDisplayTime > 0) {
			entry.gap = getTargetableDurationBetween(lastDotDropDisplayTime, thisDotApplicationDisplayTime);
		} else if (thisDotApplicationDisplayTime - lastDotDropDisplayTime < 0) {
			entry.override = lastDotDropDisplayTime - thisDotApplicationDisplayTime;
		}
	} else {
		// first Thunder of this fight
		console.assert(!lastNode)
		let thisP = node.getPotencies()[0];
		let thisDotApplicationDisplayTime = thisP.applicationTime as number;
		entry.gap = getTargetableDurationBetween(0, Math.max(0, thisDotApplicationDisplayTime));
	}

	entry.baseMainPotency = mainPotency.base;
	entry.calculationModifiers = mainPotency.modifiers;
	entry.mainPotencyHit = mainPotency.hasHitBoss(bossIsUntargetable);

	for (let i = 0; i < mainPotency.modifiers.length; i++) {
		if (mainPotency.modifiers[i].source === PotencyModifierType.ENO) {
			entry.displayedModifiers.push(PotencyModifierType.ENO)
		}
	}

	for (let i = 0; i < node.getPotencies().length; i++) {
		if (i > 0) {
			let p = node.getPotencies()[i];
			if (p.hasResolved()) {
				entry.totalNumTicks += 1;
				entry.baseDotPotency = p.base;
				if (p.hasHitBoss(bossIsUntargetable)) {
					entry.numHitTicks += 1;
				}
			}
		}
	}

	let potencyWithoutPot = node.getPotency({
		tincturePotencyMultiplier: 1,
		includePartyBuffs: false,
		untargetable: bossIsUntargetable,
	}).applied;
	
	let potencyWithPot = node.getPotency({
		tincturePotencyMultiplier: ctl.getTincturePotencyMultiplier(),
		includePartyBuffs: false,
		untargetable: bossIsUntargetable
	}).applied;

	let potencyWithPartyBuffs = node.getPotency({
		tincturePotencyMultiplier: ctl.getTincturePotencyMultiplier(),
		includePartyBuffs: true,
		untargetable: bossIsUntargetable
	}).applied;

	entry.potencyWithoutPot = potencyWithoutPot;
	entry.potPotency = potencyWithPot - potencyWithoutPot;
	entry.partyBuffPotency = potencyWithPartyBuffs - potencyWithPot;

	return entry;
}

function expandNode(node: ActionNode) : ExpandedNode {
	let res: ExpandedNode = {
		basePotency: 0,
		displayedModifiers: [],
		calculationModifiers: []
	}
	if (node.type === ActionType.Skill && node.skillName) {
		if (pictoDamageSkills.has(node.skillName)) {
			console.assert(node.getPotencies().length > 0);
			// use the one that's not enochian or pot (then must be one of af123, ui123)
			let mainPotency = node.getPotencies()[0];
			res.basePotency = mainPotency.base;
			for (let i = 0; i < mainPotency.modifiers.length; i++) {
				let tag = mainPotency.modifiers[i].source;
				if (tag !== PotencyModifierType.ENO && tag !== PotencyModifierType.POT) {
					res.displayedModifiers.push(tag);
					res.calculationModifiers.push(mainPotency.modifiers[i]);
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
		} else if (abilities.has(node.skillName) || pictoMotifs.has(node.skillName)) {
		} else if (node.skillName === SkillName.HighThunder) {
			console.assert(node.skillName === SkillName.HighThunder)
			res.basePotency = node.getPotencies()[0].base;
		} else {
			res.basePotency = node.getPotencies()[0].base;
		}
		return res;
	} else {
		console.assert(false);
		return res;
	}
}

function tagsAreEqual(a: PotencyModifierType[], b: PotencyModifierType[]) {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}

function expandAndMatch(table: DamageStatsMainTableEntry[], node: ActionNode) {

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

export function getSkillOrDotInclude(skillNameOrDoT: SkillName | "DoT") {
	return !excludedFromStats.has(skillNameOrDoT);
}

export function allSkillsAreIncluded() {
	return excludedFromStats.size === 0;
}

export function updateSkillOrDoTInclude(props: {
	skillNameOrDoT: SkillName | "DoT",
	include: boolean
}) {
	if (props.include && excludedFromStats.has(props.skillNameOrDoT)) {
		excludedFromStats.delete(props.skillNameOrDoT);
		// it doesn't make sense to include DoT but not base potency of Thunder
		if (props.skillNameOrDoT === "DoT") {
			excludedFromStats.delete(SkillName.HighThunder);
		} else if (props.skillNameOrDoT === SkillName.HighThunder) {
			excludedFromStats.delete("DoT");
		}
	} else {
		excludedFromStats.add(props.skillNameOrDoT);
		if (props.skillNameOrDoT === SkillName.HighThunder) {
			excludedFromStats.add("DoT");
		}
	}
	ctl.displayCurrentState();
	ctl.updateStats();
}

export function calculateSelectedStats(props: {
	tinctureBuffPercentage: number,
	lastDamageApplicationTime: number
}): SelectedStatisticsData {
	let selected = {
		totalDuration: 0,
		targetableDuration: 0,
		potency: {applied: 0, pending: 0},
		gcdSkills: {applied: 0, pending: 0}
	};

	let firstSelected = ctl.record.getFirstSelection();
	let lastSelected = ctl.record.getLastSelection();
	if (firstSelected && lastSelected) {
		if (firstSelected.tmp_startLockTime!==undefined && lastSelected.tmp_endLockTime!==undefined) {
			selected.totalDuration = lastSelected.tmp_endLockTime - firstSelected.tmp_startLockTime;
			let countdown = ctl.gameConfig.countdown;
			selected.targetableDuration = getTargetableDurationBetween(firstSelected.tmp_startLockTime - countdown, lastSelected.tmp_endLockTime - countdown);
		}
	}

	ctl.record.iterateSelected(node=>{
		if (node.type === ActionType.Skill && node.skillName) {
			const checked = getSkillOrDotInclude(node.skillName);
			// gcd count
			let skillInfo = ctl.game.skillsList.get(node.skillName);
			if (skillInfo.info.cdName === ResourceType.cd_GCD && checked) {
				if (node.hitBoss(bossIsUntargetable)) selected.gcdSkills.applied++;
				else if (!node.resolved()) selected.gcdSkills.pending++;
			}
			// potency
			let p = node.getPotency({
				tincturePotencyMultiplier: ctl.getTincturePotencyMultiplier(),
				untargetable: bossIsUntargetable,
				includePartyBuffs: true,
				excludeDoT: node.skillName===SkillName.HighThunder && !getSkillOrDotInclude("DoT")
			});
			if (checked) {
				selected.potency.applied += p.applied;
				selected.potency.pending += p.snapshottedButPending;
			}
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
	let mainTableSummary = {
		totalPotencyWithoutPot: 0,
		totalPotPotency: 0,
		totalPartyBuffPotency: 0,
	};

	let thunderTable: DamageStatsThunderTableEntry[] = [];
	let thunderTableSummary = {
		cumulativeGap: 0,
		cumulativeOverride: 0,
		timeSinceLastDoTDropped: 0,
		totalTicks: 0,
		maxTicks: ctl.getMaxTicks(ctl.game.time),
		dotCoverageTimeFraction: ctl.getDotCoverageTimeFraction(ctl.game.getDisplayTime()),
		theoreticalMaxTicks: 0,
		totalPotencyWithoutPot: 0,
		totalPotPotency: 0,
		totalPartyBuffPotency: 0,
	};

	let skillPotencies: Map<SkillName, number> = new Map();

	let lastThunder : ActionNode | undefined = undefined; // for tracking DoT gap / override
	ctl.record.iterateAll(node=>{
		if (node.type === ActionType.Skill && node.skillName) {

			const checked = getSkillOrDotInclude(node.skillName);

			// gcd count
			let skillInfo = ctl.game.skillsList.get(node.skillName);
			if (skillInfo.info.cdName === ResourceType.cd_GCD && checked) {
				if (node.hitBoss(bossIsUntargetable)) {
					gcdSkills.applied++;
				} else if (!node.resolved()) {
					gcdSkills.pending++;
				}
			}

			// potency
			let p = node.getPotency({
				tincturePotencyMultiplier: ctl.getTincturePotencyMultiplier(),
				untargetable: bossIsUntargetable,
				includePartyBuffs: true,
				excludeDoT: node.skillName===SkillName.HighThunder && !getSkillOrDotInclude("DoT")
			});
			if (checked) {
				totalPotency.applied += p.applied;
				totalPotency.pending += p.snapshottedButPending;
			}

			// main table
			if (node.resolved()) {
				let q = expandAndMatch(mainTable, node);
				if (q.mainTableIndex < 0) { // create an entry if doesn't have one already
					mainTable.push({
						skillName: node.skillName,
						displayedModifiers: q.expandedNode.displayedModifiers,
						basePotency: q.expandedNode.basePotency,
						calculationModifiers: q.expandedNode.calculationModifiers,
						usageCount: 0,
						hitCount: 0,
						totalPotencyWithoutPot: 0,
						showPotency: node.getPotencies().length > 0,
						potPotency: 0,
						potCount: 0,
						partyBuffPotency: 0,
					});
					q.mainTableIndex = mainTable.length - 1;
				}
				let potencyWithoutPot = node.getPotency({
					tincturePotencyMultiplier: 1,
					untargetable: bossIsUntargetable,
					includePartyBuffs: false,
					excludeDoT: node.skillName===SkillName.HighThunder && !getSkillOrDotInclude("DoT")
				}).applied;
				
				let potencyWithPot = node.getPotency({
					tincturePotencyMultiplier: ctl.getTincturePotencyMultiplier(),
					untargetable: bossIsUntargetable,
					includePartyBuffs: false,
					excludeDoT: node.skillName===SkillName.HighThunder && !getSkillOrDotInclude("DoT")
				}).applied;

				let potencyWithPartyBuffs = node.getPotency({
					tincturePotencyMultiplier: ctl.getTincturePotencyMultiplier(),
					untargetable: bossIsUntargetable,
					includePartyBuffs: true,
					excludeDoT: node.skillName===SkillName.HighThunder && !getSkillOrDotInclude("DoT")
				}).applied;

				const hit = node.hitBoss(bossIsUntargetable);
				mainTable[q.mainTableIndex].usageCount += 1;
				if (hit) {
					mainTable[q.mainTableIndex].hitCount += 1;
				}
				mainTable[q.mainTableIndex].totalPotencyWithoutPot += potencyWithoutPot;
				mainTable[q.mainTableIndex].potPotency += (potencyWithPot - potencyWithoutPot);
				mainTable[q.mainTableIndex].partyBuffPotency += (potencyWithPartyBuffs - potencyWithPot);

				if (hit && node.hasBuff(BuffType.Tincture)) {
					mainTable[q.mainTableIndex].potCount += 1;
				}

				// also get contrib of each skill
				let skillPotency = skillPotencies.get(node.skillName) ?? 0;
				skillPotency += potencyWithPartyBuffs;
				skillPotencies.set(node.skillName, skillPotency);

				// and main table total (only if checked)
				if (checked) {
					mainTableSummary.totalPotencyWithoutPot += potencyWithoutPot;
					mainTableSummary.totalPotPotency += (potencyWithPot - potencyWithoutPot);
					mainTableSummary.totalPartyBuffPotency += (potencyWithPartyBuffs - potencyWithPot);
				}

				// Thunder table
				if (node.skillName === SkillName.HighThunder) {
					let thunderTableEntry = expandThunderNode(node, lastThunder);
					thunderTable.push(thunderTableEntry);
					lastThunder = node;
					thunderTableSummary.cumulativeGap += thunderTableEntry.gap;
					thunderTableSummary.cumulativeOverride += thunderTableEntry.override;
					thunderTableSummary.totalTicks += thunderTableEntry.numHitTicks;
					thunderTableSummary.totalPotencyWithoutPot += thunderTableEntry.potencyWithoutPot;
					thunderTableSummary.totalPotPotency += thunderTableEntry.potPotency;
					thunderTableSummary.totalPartyBuffPotency += thunderTableEntry.partyBuffPotency;
				}
			}
		}
	});

	if (lastThunder) {
		// last Thunder so far
		let mainP = (lastThunder as ActionNode).getPotencies()[0];
		console.assert(mainP.hasResolved());
		let lastDotDropTime = (mainP.applicationTime as number) + 30;
		let gap = getTargetableDurationBetween(lastDotDropTime, ctl.game.getDisplayTime());

		let timeSinceLastDoTDropped = ctl.game.getDisplayTime() - lastDotDropTime;
		if (timeSinceLastDoTDropped > 0) {
			thunderTableSummary.cumulativeGap += gap;
			thunderTableSummary.timeSinceLastDoTDropped = timeSinceLastDoTDropped;
		}
	} else {
		// no Thunder was used so far
		let gap = getTargetableDurationBetween(0, Math.max(0, ctl.game.getDisplayTime()));
		thunderTableSummary.cumulativeGap = gap;
		thunderTableSummary.timeSinceLastDoTDropped = gap;
	}

	mainTable.sort((a, b)=>{
		if (a.showPotency !== b.showPotency) {
			let na = a.showPotency ? 1 : 0;
			let nb = b.showPotency ? 1 : 0;
			return nb - na;
		} else if (a.skillName !== b.skillName) {
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
		mainTableSummary: mainTableSummary,
		thunderTable: thunderTable,
		thunderTableSummary: thunderTableSummary,
		historical: !ctl.displayingUpToDateGameState,
	};
}