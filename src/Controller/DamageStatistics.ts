// making another file just so I don't keep clustering Controller.ts

import { controller as ctl } from "./Controller";
import { ActionNode, ActionType } from "./Record";
import { BuffType } from "../Game/Common";
import {
	DamageStatisticsData,
	DamageStatisticsMode,
	DamageStatsDoTTableEntry,
	DamageStatsMainTableEntry,
	SelectedStatisticsData,
	DamageStatsDoTTableSummary,
} from "../Components/DamageStatistics";
import { PotencyModifier, PotencyModifierType } from "../Game/Potency";
import { ActionKey, ResourceKey } from "../Game/Data";
import { LIMIT_BREAK_ACTIONS } from "../Game/Data/Shared/LimitBreak";

// TODO autogenerate everything here

const AFUISkills = new Set<ActionKey>([
	"BLIZZARD",
	"FIRE",
	"BLIZZARD_II",
	"FIRE_II",
	"BLIZZARD_III",
	"FIRE_III",
	"FREEZE",
	"FLARE",
	"BLIZZARD_IV",
	"FIRE_IV",
	"DESPAIR",
	"HIGH_FIRE_II",
	"HIGH_BLIZZARD_II",
	"FLARE_STAR",
]);

const enoSkills = new Set<ActionKey>(["FOUL", "XENOGLOSSY", "PARADOX"]);

// source of truth
const excludedFromStats = new Set<ActionKey | "DoT">([]);

type ExpandedNode = {
	displayedModifiers: PotencyModifierType[];
	// base potency on a single target
	basePotency: number;
	calculationModifiers: PotencyModifier[];
	falloff: number;
	targetCount: number;
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
	return node.info.type === ActionType.Skill && ctl.game.dotSkills.includes(node.info.skillName);
}

function expandDoTNode(node: ActionNode, dotName: ResourceKey, lastNode?: ActionNode) {
	console.assert(isDoTNode(node), `${node.getNameForMessage()} is not registered as a dot skill`);
	const mainPotency = node.getInitialPotency();
	const entry: DamageStatsDoTTableEntry = {
		castTime: node.tmp_startLockTime ? node.tmp_startLockTime - ctl.gameConfig.countdown : 0,
		applicationTime: node.applicationTime ? node.applicationTime - ctl.gameConfig.countdown : 0,
		displayedModifiers: [],
		gap: 0,
		override: 0,
		mainPotencyHit: true,
		baseMainPotency: 0,
		baseDotPotency: 0,
		initialHitCalculationModifiers: [],
		tickCalculationModifiers: [],
		totalNumTicks: 0,
		numHitTicks: 0,
		potencyWithoutPot: 0,
		potPotency: 0,
		partyBuffPotency: 0,
		targetCount: node.targetCount,
		mainHitFalloff: mainPotency?.falloff ?? 0,
	};

	entry.gap = node.getOverTimeGap(dotName, "damage");
	entry.override = node.getOverTimeOverrideAmount(dotName, "damage");
	entry.baseMainPotency = mainPotency?.base ?? 0;
	entry.initialHitCalculationModifiers = mainPotency?.modifiers ?? [];
	entry.mainPotencyHit = node.hitBoss(bossIsUntargetable);

	// No DoT effects currently in the game have their tick potencies enhanced by combo or positional bonuses
	// applied on the DoT skill.
	entry.tickCalculationModifiers = entry.initialHitCalculationModifiers.filter(
		(mod) =>
			mod.source !== PotencyModifierType.COMBO &&
			mod.source !== PotencyModifierType.POSITIONAL,
	);

	// Hard-code NO_CDH for MCH's Wildfire, since it's not registered as a DoT
	if (dotName === "WILDFIRE") {
		entry.displayedModifiers.push(PotencyModifierType.NO_CDH);
	}

	for (let i = 0; i < entry.initialHitCalculationModifiers.length; i++) {
		const source = entry.initialHitCalculationModifiers[i].source;
		// DoTs should show if they are cast under BLM's Enochian, SAM's Fugetsu, or GNB's No Mercy
		if (
			[
				PotencyModifierType.ENO,
				PotencyModifierType.FUGETSU,
				PotencyModifierType.NO_MERCY,
				PotencyModifierType.POWER_SURGE,
				PotencyModifierType.LANCE_CHARGE,
				PotencyModifierType.LIFE_OF_THE_DRAGON,
				PotencyModifierType.BATTLE_LITANY,
				PotencyModifierType.FIGHT_OR_FLIGHT,
				PotencyModifierType.MOON_FLUTE,
				PotencyModifierType.WHISTLE,
				PotencyModifierType.BRISTLE,
				PotencyModifierType.TINGLEA,
				PotencyModifierType.TINGLEB,
				// Don't add cards, since we assume the AST is not carding themselves
				PotencyModifierType.DIVINATION,
				PotencyModifierType.CHAIN_STRAT,
			].includes(source)
		) {
			entry.displayedModifiers.push(source);
		}
	}

	node.getDotPotencies(dotName).forEach((p, i) => {
		if (p.hasResolved()) {
			entry.totalNumTicks++;
			entry.baseDotPotency = p.base;
			if (p.hasHitBoss(bossIsUntargetable)) {
				entry.numHitTicks++;
			}
		}
	});

	const potencyWithoutPot = node.getPotency({
		tincturePotencyMultiplier: 1,
		includePartyBuffs: false,
		untargetable: bossIsUntargetable,
		includeSplash: true,
	}).applied;

	const potencyWithPot = node.getPotency({
		tincturePotencyMultiplier: ctl.getTincturePotencyMultiplier(),
		includePartyBuffs: false,
		untargetable: bossIsUntargetable,
		includeSplash: true,
	}).applied;

	const potencyWithPartyBuffs = node.getPotency({
		tincturePotencyMultiplier: ctl.getTincturePotencyMultiplier(),
		includePartyBuffs: true,
		untargetable: bossIsUntargetable,
		includeSplash: true,
	}).applied;

	entry.potencyWithoutPot = potencyWithoutPot;
	entry.potPotency = potencyWithPot - potencyWithoutPot;
	entry.partyBuffPotency = potencyWithPartyBuffs - potencyWithPot;

	return entry;
}

function expandNode(node: ActionNode): ExpandedNode {
	const res: ExpandedNode = {
		basePotency: 0,
		displayedModifiers: [],
		calculationModifiers: [],
		falloff: 1,
		targetCount: 1,
	};
	if (node.info.type === ActionType.Skill) {
		const skillName = node.info.skillName;
		const mainPotency = node.getInitialPotency();
		if (!mainPotency) {
			// do nothing if the used ability does no damage
		} else {
			res.targetCount = node.targetCount;
			res.falloff = mainPotency.falloff ?? 1;
			if (AFUISkills.has(skillName)) {
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
			} else if (enoSkills.has(skillName)) {
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
				node.info.targetCount = mainPotency.targetCount;
			} else {
				// for non-BLM jobs, display all non-pot modifiers on all damaging skills
				res.basePotency = mainPotency.base;
				for (const modifier of mainPotency.modifiers) {
					const tag = modifier.source;
					if (tag !== PotencyModifierType.POT) {
						res.displayedModifiers.push(tag);
						res.calculationModifiers.push(modifier);
					}
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
	const expanded = expandNode(node);
	const res = {
		mainTableIndex: -1,
		expandedNode: expanded,
	};

	for (let i = 0; i < table.length; i++) {
		if (
			node.info.type === ActionType.Skill &&
			node.info.skillName === table[i].skillName &&
			tagsAreEqual(expanded.displayedModifiers, table[i].displayedModifiers) &&
			node.targetCount === table[i].targetCount
		) {
			res.mainTableIndex = i;
			return res;
		}
	}

	return res;
}

export function getSkillOrDotInclude(skillNameOrDoT: ActionKey | "DoT") {
	return !excludedFromStats.has(skillNameOrDoT);
}

export function allSkillsAreIncluded() {
	return excludedFromStats.size === 0;
}

export function updateSkillOrDoTInclude(props: {
	skillNameOrDoT: ActionKey | "DoT";
	include: boolean;
}) {
	if (props.include && excludedFromStats.has(props.skillNameOrDoT)) {
		excludedFromStats.delete(props.skillNameOrDoT);
		// it doesn't make sense to include DoT but not base potency of Thunder/Higanbana
		// TODO - for jobs with more than one DoT, this functions as an all-or-nothing toggle. Figure out how to have the toggles only affect that skill
		if (props.skillNameOrDoT === "DoT") {
			ctl.game.dotSkills.forEach((skill) => excludedFromStats.delete(skill));
		} else if (ctl.game.dotSkills.includes(props.skillNameOrDoT)) {
			excludedFromStats.delete("DoT");
		}
	} else {
		excludedFromStats.add(props.skillNameOrDoT);
		if (props.skillNameOrDoT !== "DoT" && ctl.game.dotSkills.includes(props.skillNameOrDoT)) {
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
	const selected = {
		totalDuration: 0,
		targetableDuration: 0,
		potency: { applied: 0, pending: 0 },
		gcdSkills: { applied: 0, pending: 0 },
	};

	const firstSelected = ctl.record.getFirstSelection();
	const lastSelected = ctl.record.getLastSelection();
	if (firstSelected && lastSelected) {
		if (
			firstSelected.tmp_startLockTime !== undefined &&
			lastSelected.tmp_endLockTime !== undefined
		) {
			selected.totalDuration = lastSelected.tmp_endLockTime - firstSelected.tmp_startLockTime;
			const countdown = ctl.gameConfig.countdown;
			selected.targetableDuration = getTargetableDurationBetween(
				firstSelected.tmp_startLockTime - countdown,
				lastSelected.tmp_endLockTime - countdown,
			);
		}
	}

	ctl.record.iterateSelected((node) => {
		if (node.info.type === ActionType.Skill && !(node.info.skillName in LIMIT_BREAK_ACTIONS)) {
			const checked = getSkillOrDotInclude(node.info.skillName);
			// gcd count
			const skillInfo = ctl.game.skillsList.get(node.info.skillName);
			if (skillInfo.cdName === "cd_GCD" && checked) {
				if (node.hitBoss(bossIsUntargetable)) selected.gcdSkills.applied++;
				else if (!node.resolved()) selected.gcdSkills.pending++;
			}
			// potency
			const p = node.getPotency({
				tincturePotencyMultiplier: ctl.getTincturePotencyMultiplier(),
				untargetable: bossIsUntargetable,
				includePartyBuffs: true,
				excludeDoT: isDoTNode(node) && !getSkillOrDotInclude("DoT"),
				includeSplash: true,
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
	tableRows: DamageStatsDoTTableEntry[];
	summary: DamageStatsDoTTableSummary;
	lastDoT?: ActionNode; // for tracking DoT gap / override
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

	const totalPotency = { applied: 0, pending: 0 };
	const gcdSkills = { applied: 0, pending: 0 };

	// has a list of entries, initially empty
	// take each skill node, find its corresponding entry and add itself to it
	// - depending on the specific skill, rules for dividing / finding entries could be different (some need AF123, some just eno)
	// - if there's no existing entry, create one.
	// sort the entries according to some rule, then return.

	const mainTable: DamageStatsMainTableEntry[] = [];
	const mainTableSummary = {
		totalPotencyWithoutPot: 0,
		totalPotPotency: 0,
		totalPartyBuffPotency: 0,
	};

	const dotTables: Map<ResourceKey, DamageStatsDoTTrackingData> = new Map();

	const skillPotencies: Map<ActionKey, number> = new Map();

	const processNodeFn = (node: ActionNode) => {
		if (node.info.type === ActionType.Skill) {
			const skillName = node.info.skillName;
			const checked = getSkillOrDotInclude(skillName);
			const isLimitBreak = skillName in LIMIT_BREAK_ACTIONS;

			// gcd count
			const skillInfo = ctl.game.skillsList.get(skillName);
			if (skillInfo.cdName === "cd_GCD" && checked) {
				if (node.hitBoss(bossIsUntargetable)) {
					gcdSkills.applied++;
				} else if (!node.resolved()) {
					gcdSkills.pending++;
				}
			}

			// potency
			const p = node.getPotency({
				tincturePotencyMultiplier: ctl.getTincturePotencyMultiplier(),
				untargetable: bossIsUntargetable,
				includePartyBuffs: true,
				includeSplash: true,
				excludeDoT: isDoTNode(node) && !getSkillOrDotInclude("DoT"),
			});
			if (checked && !isLimitBreak) {
				totalPotency.applied += p.applied;
				totalPotency.pending += p.snapshottedButPending;
			}

			// main table
			if (node.resolved()) {
				const q = expandAndMatch(mainTable, node);
				if (q.mainTableIndex < 0) {
					// create an entry if doesn't have one already
					mainTable.push({
						skillName,
						displayedModifiers: q.expandedNode.displayedModifiers,
						basePotency: isLimitBreak ? 0 : q.expandedNode.basePotency,
						calculationModifiers: q.expandedNode.calculationModifiers,
						usageCount: 0,
						hitCount: 0,
						totalPotencyWithoutPot: 0,
						showPotency: node.anyPotencies(),
						potPotency: 0,
						potCount: 0,
						partyBuffPotency: 0,
						falloff: q.expandedNode.falloff,
						targetCount: q.expandedNode.targetCount,
					});
					q.mainTableIndex = mainTable.length - 1;
				}

				const hit = node.hitBoss(bossIsUntargetable);
				mainTable[q.mainTableIndex].usageCount += 1;
				if (hit) {
					mainTable[q.mainTableIndex].hitCount += 1;
				}

				// Stop processing potency statistics for limit breaks beyond this point
				if (isLimitBreak) {
					return;
				}

				const potencyWithoutPot = node.getPotency({
					tincturePotencyMultiplier: 1,
					untargetable: bossIsUntargetable,
					includePartyBuffs: false,
					excludeDoT: isDoTNode(node) && !getSkillOrDotInclude("DoT"),
					includeSplash: true,
				}).applied;

				const potencyWithPot = node.getPotency({
					tincturePotencyMultiplier: ctl.getTincturePotencyMultiplier(),
					untargetable: bossIsUntargetable,
					includePartyBuffs: false,
					excludeDoT: isDoTNode(node) && !getSkillOrDotInclude("DoT"),
					includeSplash: true,
				}).applied;

				const potencyWithPartyBuffs = node.getPotency({
					tincturePotencyMultiplier: ctl.getTincturePotencyMultiplier(),
					untargetable: bossIsUntargetable,
					includePartyBuffs: true,
					excludeDoT: isDoTNode(node) && !getSkillOrDotInclude("DoT"),
					includeSplash: true,
				}).applied;

				mainTable[q.mainTableIndex].totalPotencyWithoutPot += potencyWithoutPot;
				mainTable[q.mainTableIndex].potPotency += potencyWithPot - potencyWithoutPot;
				mainTable[q.mainTableIndex].partyBuffPotency +=
					potencyWithPartyBuffs - potencyWithPot;

				if (hit && node.hasBuff(BuffType.Tincture)) {
					mainTable[q.mainTableIndex].potCount += 1;
				}

				// also get contrib of each skill
				let skillPotency = skillPotencies.get(skillName) ?? 0;
				skillPotency += potencyWithPartyBuffs;
				skillPotencies.set(skillName, skillPotency);

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
					let dotTrackingData = dotTables.get(rscType);
					const excludeStandardTicks = ctl.game.excludedDoTs.includes(rscType);
					if (!dotTrackingData) {
						dotTrackingData = {
							tableRows: [],
							summary: {
								cumulativeGap: 0,
								cumulativeOverride: 0,
								timeSinceLastDoTDropped: 0,
								totalTicks: 0,
								maxTicks: ctl.getMaxTicks(
									ctl.game.time,
									rscType,
									excludeStandardTicks,
								),
								dotCoverageTimeFraction: ctl.getDotCoverageTimeFraction(
									ctl.game.getDisplayTime(),
									rscType,
								),
								totalPotencyWithoutPot: 0,
								totalPotPotency: 0,
								totalPartyBuffPotency: 0,
							},
							lastDoT: undefined,
						};
						dotTables.set(rscType, dotTrackingData);
					}

					const dotTableEntry = expandDoTNode(node, rscType, dotTrackingData.lastDoT);
					dotTrackingData.tableRows.push(dotTableEntry);
					dotTrackingData.lastDoT = node;
					dotTrackingData.summary.cumulativeGap += dotTableEntry.gap;
					dotTrackingData.summary.cumulativeOverride += dotTableEntry.override;
					dotTrackingData.summary.totalTicks += dotTableEntry.numHitTicks;
					dotTrackingData.summary.totalPotencyWithoutPot +=
						dotTableEntry.potencyWithoutPot;
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

			const applicationTime = dotTrackingData.lastDoT.applicationTime;
			console.assert(
				applicationTime !== undefined,
				`DoT node for ${dotName} was not resolved`,
			);

			const lastDotDropTime =
				(applicationTime as number) + ctl.game.getStatusDuration(dotName);
			const gap = getTargetableDurationBetween(lastDotDropTime, ctl.game.getDisplayTime());

			const timeSinceLastDoTDropped = ctl.game.getDisplayTime() - lastDotDropTime;
			if (timeSinceLastDoTDropped > 0) {
				dotTrackingData.summary.cumulativeGap += gap;
				dotTrackingData.summary.timeSinceLastDoTDropped = timeSinceLastDoTDropped;
			}
		} else {
			// no Thunder was used so far
			const gap = getTargetableDurationBetween(0, Math.max(0, ctl.game.getDisplayTime()));
			dotTrackingData.summary.cumulativeGap = gap;
			dotTrackingData.summary.timeSinceLastDoTDropped = gap;
		}
	});

	mainTable.sort((a, b) => {
		if (a.showPotency !== b.showPotency) {
			const na = a.showPotency ? 1 : 0;
			const nb = b.showPotency ? 1 : 0;
			return nb - na;
		} else if (a.skillName !== b.skillName) {
			const pa = skillPotencies.get(a.skillName) ?? 0;
			const pb = skillPotencies.get(b.skillName) ?? 0;
			if (pa === pb) {
				// Attempt to order skills by base potency. If two skills share the same potency,
				// then sort them lexicographically.
				return a.skillName.localeCompare(b.skillName);
			}
			return pb - pa;
		} else if (a.targetCount !== b.targetCount) {
			return b.targetCount - a.targetCount;
		} else if (a.displayedModifiers.length !== b.displayedModifiers.length) {
			return b.displayedModifiers.length - a.displayedModifiers.length;
		} else {
			for (let i = 0; i < a.displayedModifiers.length; i++) {
				const diff = a.displayedModifiers[i] - b.displayedModifiers[i];
				if (diff !== 0) return diff;
			}
			return 0;
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
		mode: mode,
	};
}
