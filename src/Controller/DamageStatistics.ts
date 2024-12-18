// making another file just so I don't keep clustering Controller.ts
import { controller as ctl } from "./Controller";
import { ActionNode, ActionType } from "./Record";
import { BuffType, LIMIT_BREAKS, ResourceType, SkillName } from "../Game/Common";
import {
	DamageStatisticsData,
	DamageStatisticsMode,
	DamageStatsDoTTableEntry,
	DamageStatsMainTableEntry,
	SelectedStatisticsData,
	DamageStatsDoTTableSummary
} from "../Components/DamageStatistics";
import { PotencyModifier, PotencyModifierType } from "../Game/Potency";

// TODO autogenerate everything here

const AFUISkills = new Set<SkillName>([
	SkillName.Blizzard,
	SkillName.Fire,
	SkillName.Blizzard2,
	SkillName.Fire2,
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

const enoSkills = new Set<SkillName>([SkillName.Foul, SkillName.Xenoglossy, SkillName.Paradox]);

export const DOT_SKILLS: SkillName[] = [
	// BLM
	SkillName.Thunder3,
	SkillName.HighThunder,
	// SAM
	SkillName.Higanbana,
	// MCH
	SkillName.Bioblaster,
	// BRD
	SkillName.CausticBite, SkillName.Stormbite,
];

// source of truth
const excludedFromStats = new Set<SkillName | "DoT">([]);

type ExpandedNode = {
	displayedModifiers: PotencyModifierType[];
	basePotency: number;
	calculationModifiers: PotencyModifier[];
};

export const bossIsUntargetable = (displayTime: number) => {
	return ctl.getUntargetableMask() && ctl.timeline.duringUntargetable(displayTime);
};

export const getTargetableDurationBetween = (startDisplayTime: number, endDisplayTime: number) => {
	return ctl.getUntargetableMask()
		? ctl.timeline.getTargetableDurationBetween(startDisplayTime, endDisplayTime)
		: endDisplayTime - startDisplayTime;
};

function isDoTNode(node: ActionNode) {
	if (node.skillName === undefined) { return false }
	return controller.game.dotSkills.includes(node.skillName)
}

function expandDoTNode(node: ActionNode, dotName: ResourceType, lastNode?: ActionNode) {
	console.assert(node.getDotPotencies(dotName).length > 0);
	console.assert(isDoTNode(node));
	let mainPotency = node.getInitialPotency();
	let entry: DamageStatsDoTTableEntry = {
		castTime: node.tmp_startLockTime ? node.tmp_startLockTime - ctl.gameConfig.countdown : 0,
		applicationTime: node.applicationTime ?? 0,
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
		partyBuffPotency: 0,
	};

	entry.gap = node.getDotTimeGap(dotName)
	entry.override = node.getDotOverrideAmount(dotName);
	entry.baseMainPotency = mainPotency?.base ?? 0;
	entry.calculationModifiers = mainPotency?.modifiers ?? [];
	entry.mainPotencyHit = node.hitBoss(bossIsUntargetable);

	for (let i = 0; i < entry.calculationModifiers.length; i++) {
		const source = entry.calculationModifiers[i].source;
		if (source === PotencyModifierType.ENO || source === PotencyModifierType.FUGETSU) {
			entry.displayedModifiers.push(source);
		}
	}

	for (let i = 0; i < node.getDotPotencies(dotName).length; i++) {
		let p = node.getDotPotencies(dotName)[i];
		if (p.hasResolved()) {
			entry.totalNumTicks += 1;
			entry.baseDotPotency = p.base;
			if (p.hasHitBoss(bossIsUntargetable)) {
				entry.numHitTicks += 1;
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
		untargetable: bossIsUntargetable,
	}).applied;

	let potencyWithPartyBuffs = node.getPotency({
		tincturePotencyMultiplier: ctl.getTincturePotencyMultiplier(),
		includePartyBuffs: true,
		untargetable: bossIsUntargetable,
	}).applied;

	entry.potencyWithoutPot = potencyWithoutPot;
	entry.potPotency = potencyWithPot - potencyWithoutPot;
	entry.partyBuffPotency = potencyWithPartyBuffs - potencyWithPot;

	return entry;
}

function expandNode(node: ActionNode): ExpandedNode {
	let res: ExpandedNode = {
		basePotency: 0,
		displayedModifiers: [],
		calculationModifiers: [],
	};
	if (node.type === ActionType.Skill && node.skillName) {
		const mainPotency = node.getInitialPotency()
		if (!mainPotency) {
			// do nothing if the used ability does no damage
		} else if (AFUISkills.has(node.skillName)) {
			// for AF/UI skills, display the first modifier that's not enochian or pot
			// (must be one of af123, ui123)
			res.basePotency = mainPotency.base;
			res.calculationModifiers = mainPotency.modifiers;
			for (const modifier of mainPotency.modifiers) {
				const tag = modifier.source;
				if (tag !== PotencyModifierType.ENO && tag !== PotencyModifierType.POT) {
					res.displayedModifiers.push(tag);
					break;
				}
			}
		} else if (enoSkills.has(node.skillName)) {
			// for foul/xeno/para, display enochian modifier if it has one. Otherwise empty.
			for (const modifier of mainPotency.modifiers) {
				const tag = modifier.source;
				if (tag === PotencyModifierType.ENO) {
					res.basePotency = mainPotency.base;
					res.displayedModifiers = [tag];
					res.calculationModifiers = mainPotency.modifiers;
					break;
				}
			}
		} else if (isDoTNode(node)) {
			// dot modifiers are handled separately
			res.basePotency = mainPotency.base;
		} else {
			// for non-BLM jobs, display all non-pot modifiers on all damaging skills
			res.basePotency = mainPotency.base;
			for (const modifier of mainPotency.modifiers) {
				const tag = modifier.source;
				if (tag !== PotencyModifierType.POT && tag !== PotencyModifierType.NO_CDH) {
					res.displayedModifiers.push(tag);
					res.calculationModifiers.push(modifier);
				}
			}
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
		expandedNode: expanded,
	};

	for (let i = 0; i < table.length; i++) {
		if (
			node.skillName === table[i].skillName &&
			tagsAreEqual(expanded.displayedModifiers, table[i].displayedModifiers)
		) {
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
	skillNameOrDoT: SkillName | "DoT";
	include: boolean;
}) {
	if (props.include && excludedFromStats.has(props.skillNameOrDoT)) {
		excludedFromStats.delete(props.skillNameOrDoT);
		// it doesn't make sense to include DoT but not base potency of Thunder/Higanbana
		if (props.skillNameOrDoT === "DoT") {
			DOT_SKILLS.forEach((skill) => excludedFromStats.delete(skill));
		} else if (
			props.skillNameOrDoT === SkillName.Thunder3 ||
			props.skillNameOrDoT === SkillName.HighThunder
		) {
			excludedFromStats.delete("DoT");
		}
	} else {
		excludedFromStats.add(props.skillNameOrDoT);
		if (props.skillNameOrDoT !== "DoT" && DOT_SKILLS.includes(props.skillNameOrDoT)) {
			excludedFromStats.add("DoT");
		}
	}
	ctl.displayCurrentState();
	ctl.updateStats();
}

export function calculateSelectedStats(props: {
	tinctureBuffPercentage: number;
	lastDamageApplicationTime: number;
}): SelectedStatisticsData {
	let selected = {
		totalDuration: 0,
		targetableDuration: 0,
		potency: { applied: 0, pending: 0 },
		gcdSkills: { applied: 0, pending: 0 },
	};

	let firstSelected = ctl.record.getFirstSelection();
	let lastSelected = ctl.record.getLastSelection();
	if (firstSelected && lastSelected) {
		if (
			firstSelected.tmp_startLockTime !== undefined &&
			lastSelected.tmp_endLockTime !== undefined
		) {
			selected.totalDuration = lastSelected.tmp_endLockTime - firstSelected.tmp_startLockTime;
			let countdown = ctl.gameConfig.countdown;
			selected.targetableDuration = getTargetableDurationBetween(
				firstSelected.tmp_startLockTime - countdown,
				lastSelected.tmp_endLockTime - countdown,
			);
		}
	}

	ctl.record.iterateSelected((node) => {
		if (
			node.type === ActionType.Skill &&
			node.skillName &&
			!LIMIT_BREAKS.includes(node.skillName)
		) {
			const checked = getSkillOrDotInclude(node.skillName);
			// gcd count
			let skillInfo = ctl.game.skillsList.get(node.skillName);
			if (skillInfo.cdName === ResourceType.cd_GCD && checked) {
				if (node.hitBoss(bossIsUntargetable)) selected.gcdSkills.applied++;
				else if (!node.resolved()) selected.gcdSkills.pending++;
			}
			// potency
			let p = node.getPotency({
				tincturePotencyMultiplier: ctl.getTincturePotencyMultiplier(),
				untargetable: bossIsUntargetable,
				includePartyBuffs: true,
				excludeDoT: isDoTNode(node) && !getSkillOrDotInclude("DoT"),
			});
			if (checked) {
				selected.potency.applied += p.applied;
				selected.potency.pending += p.snapshottedButPending;
			}
		}
	});

	return selected;
}

export interface DamageStatsDoTTrackingData {
	tableRows: DamageStatsDoTTableEntry[],
	summary: DamageStatsDoTTableSummary,
	lastDoT?: ActionNode // for tracking DoT gap / override
}

export function calculateDamageStats(props: {
	tinctureBuffPercentage: number;
	lastDamageApplicationTime: number;
}): DamageStatisticsData {
	let mode = DamageStatisticsMode.Normal;
	if (!ctl.displayingUpToDateGameState) mode = DamageStatisticsMode.Historical;
	if (ctl.record.getFirstSelection()) {
		mode = DamageStatisticsMode.Selected;
	}
	// if mode is selected,
	// for main table: only iterate selected
	// for dot table: as if prev and after don't exist?

	let totalPotency = { applied: 0, pending: 0 };
	let gcdSkills = { applied: 0, pending: 0 };

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

	const dotTables: Map<ResourceType, DamageStatsDoTTrackingData> = new Map();

	let skillPotencies: Map<SkillName, number> = new Map();

	const processNodeFn = (node: ActionNode) => {
		if (node.type === ActionType.Skill && node.skillName) {
			const checked = getSkillOrDotInclude(node.skillName);

			// gcd count
			let skillInfo = ctl.game.skillsList.get(node.skillName);
			if (skillInfo.cdName === ResourceType.cd_GCD && checked) {
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
				excludeDoT: isDoTNode(node) && !getSkillOrDotInclude("DoT"),
			});
			if (checked && !LIMIT_BREAKS.includes(node.skillName)) {
				totalPotency.applied += p.applied;
				totalPotency.pending += p.snapshottedButPending;
			}

			// main table
			if (node.resolved()) {
				let q = expandAndMatch(mainTable, node);
				if (q.mainTableIndex < 0) {
					// create an entry if doesn't have one already
					mainTable.push({
						skillName: node.skillName,
						displayedModifiers: q.expandedNode.displayedModifiers,
						basePotency: LIMIT_BREAKS.includes(node.skillName)
							? 0
							: q.expandedNode.basePotency,
						calculationModifiers: q.expandedNode.calculationModifiers,
						usageCount: 0,
						hitCount: 0,
						totalPotencyWithoutPot: 0,
						showPotency: node.anyPotencies(),
						potPotency: 0,
						potCount: 0,
						partyBuffPotency: 0,
					});
					q.mainTableIndex = mainTable.length - 1;
				}

				const hit = node.hitBoss(bossIsUntargetable);
				mainTable[q.mainTableIndex].usageCount += 1;
				if (hit) {
					mainTable[q.mainTableIndex].hitCount += 1;
				}

				// Stop processing potency statistics for limit breaks beyond this point
				if (LIMIT_BREAKS.includes(node.skillName)) {
					return;
				}

				let potencyWithoutPot = node.getPotency({
					tincturePotencyMultiplier: 1,
					untargetable: bossIsUntargetable,
					includePartyBuffs: false,
					excludeDoT: isDoTNode(node) && !getSkillOrDotInclude("DoT"),
				}).applied;

				let potencyWithPot = node.getPotency({
					tincturePotencyMultiplier: ctl.getTincturePotencyMultiplier(),
					untargetable: bossIsUntargetable,
					includePartyBuffs: false,
					excludeDoT: isDoTNode(node) && !getSkillOrDotInclude("DoT"),
				}).applied;

				let potencyWithPartyBuffs = node.getPotency({
					tincturePotencyMultiplier: ctl.getTincturePotencyMultiplier(),
					untargetable: bossIsUntargetable,
					includePartyBuffs: true,
					excludeDoT: isDoTNode(node) && !getSkillOrDotInclude("DoT"),
				}).applied;

				mainTable[q.mainTableIndex].totalPotencyWithoutPot += potencyWithoutPot;
				mainTable[q.mainTableIndex].potPotency += potencyWithPot - potencyWithoutPot;
				mainTable[q.mainTableIndex].partyBuffPotency +=
					potencyWithPartyBuffs - potencyWithPot;

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
					mainTableSummary.totalPotPotency += potencyWithPot - potencyWithoutPot;
					mainTableSummary.totalPartyBuffPotency +=
						potencyWithPartyBuffs - potencyWithPot;
				}

				// DoT table
				// If the on-hit potency has not been resolved (as is the case if we just
				// cast higanbana and the ability has not yet hit), don't add an entry yet
				node.getAllDotPotencies().forEach((potenciesArr, rscType) => {
					if (potenciesArr.length === 0) { return }

					let dotTrackingData = dotTables.get(rscType)
					if (!dotTrackingData) {
						dotTrackingData = {
							tableRows: [],
							summary: {
								cumulativeGap: 0,
								cumulativeOverride: 0,
								timeSinceLastDoTDropped: 0,
								totalTicks: 0,
								maxTicks: ctl.getMaxTicks(ctl.game.time),
								dotCoverageTimeFraction: ctl.getDotCoverageTimeFraction(ctl.game.getDisplayTime(), rscType),
								theoreticalMaxTicks: 0,
								totalPotencyWithoutPot: 0,
								totalPotPotency: 0,
								totalPartyBuffPotency: 0,
							},
							lastDoT: undefined,
						}
						dotTables.set(rscType, dotTrackingData)
					}

					let dotTableEntry = expandDoTNode(node, rscType, dotTrackingData.lastDoT);
					dotTrackingData.tableRows.push(dotTableEntry);
					dotTrackingData.lastDoT = node;
					dotTrackingData.summary.cumulativeGap += dotTableEntry.gap;
					dotTrackingData.summary.cumulativeOverride += dotTableEntry.override;
					dotTrackingData.summary.totalTicks += dotTableEntry.numHitTicks;
					dotTrackingData.summary.totalPotencyWithoutPot += dotTableEntry.potencyWithoutPot;
					dotTrackingData.summary.totalPotPotency += dotTableEntry.potPotency;
					dotTrackingData.summary.totalPartyBuffPotency += dotTableEntry.partyBuffPotency;
				});
			}
		}
	};
	if (mode === DamageStatisticsMode.Selected) {
		ctl.record.iterateSelected(processNodeFn);
	} else {
		ctl.record.iterateAll(processNodeFn);
	}

	dotTables.forEach((dotTrackingData, dotName) => {
		if (dotTrackingData.lastDoT) {
			// last dot so far
			
			const applicationTime = dotTrackingData.lastDoT.applicationTime
			console.assert(applicationTime, `DoT node at index ${dotTrackingData.lastDoT.getNodeIndex()} was not resolved`);

			let lastDotDropTime = (applicationTime as number) + ctl.game.getStatusDuration(dotName)
			let gap = getTargetableDurationBetween(lastDotDropTime, ctl.game.getDisplayTime());
	
			let timeSinceLastDoTDropped = ctl.game.getDisplayTime() - lastDotDropTime;
			if (timeSinceLastDoTDropped > 0) {
				dotTrackingData.summary.cumulativeGap += gap;
				dotTrackingData.summary.timeSinceLastDoTDropped = timeSinceLastDoTDropped;
			}
		} else {
			// no Thunder was used so far
			let gap = getTargetableDurationBetween(0, Math.max(0, ctl.game.getDisplayTime()));
			dotTrackingData.summary.cumulativeGap = gap;
			dotTrackingData.summary.timeSinceLastDoTDropped = gap;
		}
	})

	mainTable.sort((a, b) => {
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
		dotTables,
		mode: mode
	};
}
