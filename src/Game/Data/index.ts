import {
	AST_ACTIONS,
	AST_COOLDOWNS,
	AST_GAUGES,
	AST_STATUSES,
	AST_TRACKERS,
	AST_RESOURCES,
	AST_TRAITS,
} from "./Jobs/AST";
import {
	BLM_ACTIONS,
	BLM_COOLDOWNS,
	BLM_GAUGES,
	BLM_STATUSES,
	BLM_TRACKERS,
	BLM_RESOURCES,
	BLM_TRAITS,
} from "./Jobs/BLM";
import {
	BRD_ACTIONS,
	BRD_COOLDOWNS,
	BRD_GAUGES,
	BRD_STATUSES,
	BRD_TRACKERS,
	BRD_RESOURCES,
	BRD_TRAITS,
} from "./Jobs/BRD";
import {
	DNC_ACTIONS,
	DNC_COOLDOWNS,
	DNC_GAUGES,
	DNC_STATUSES,
	DNC_TRACKERS,
	DNC_RESOURCES,
	DNC_TRAITS,
} from "./Jobs/DNC";
import {
	DRG_ACTIONS,
	DRG_COOLDOWNS,
	DRG_GAUGES,
	DRG_STATUSES,
	DRG_TRACKERS,
	DRG_RESOURCES,
	DRG_TRAITS,
} from "./Jobs/DRG";
import {
	DRK_ACTIONS,
	DRK_COOLDOWNS,
	DRK_GAUGES,
	DRK_STATUSES,
	DRK_TRACKERS,
	DRK_RESOURCES,
	DRK_TRAITS,
} from "./Jobs/DRK";
import {
	GNB_ACTIONS,
	GNB_COOLDOWNS,
	GNB_GAUGES,
	GNB_STATUSES,
	GNB_TRACKERS,
	GNB_RESOURCES,
	GNB_TRAITS,
} from "./Jobs/GNB";
import {
	MCH_ACTIONS,
	MCH_COOLDOWNS,
	MCH_GAUGES,
	MCH_STATUSES,
	MCH_TRACKERS,
	MCH_RESOURCES,
	MCH_TRAITS,
} from "./Jobs/MCH";
import {
	MNK_ACTIONS,
	MNK_COOLDOWNS,
	MNK_GAUGES,
	MNK_STATUSES,
	MNK_TRACKERS,
	MNK_RESOURCES,
	MNK_TRAITS,
} from "./Jobs/MNK";
import {
	NIN_ACTIONS,
	NIN_COOLDOWNS,
	NIN_GAUGES,
	NIN_STATUSES,
	NIN_TRACKERS,
	NIN_RESOURCES,
	NIN_TRAITS,
} from "./Jobs/NIN";
import {
	PCT_ACTIONS,
	PCT_COOLDOWNS,
	PCT_GAUGES,
	PCT_STATUSES,
	PCT_TRACKERS,
	PCT_RESOURCES,
	PCT_TRAITS,
} from "./Jobs/PCT";
import {
	PLD_ACTIONS,
	PLD_COOLDOWNS,
	PLD_GAUGES,
	PLD_STATUSES,
	PLD_TRACKERS,
	PLD_RESOURCES,
	PLD_TRAITS,
} from "./Jobs/PLD";
import {
	RDM_ACTIONS,
	RDM_COOLDOWNS,
	RDM_GAUGES,
	RDM_STATUSES,
	RDM_TRACKERS,
	RDM_RESOURCES,
	RDM_TRAITS,
} from "./Jobs/RDM";
import {
	RPR_ACTIONS,
	RPR_COOLDOWNS,
	RPR_GAUGES,
	RPR_STATUSES,
	RPR_TRACKERS,
	RPR_RESOURCES,
	RPR_TRAITS,
} from "./Jobs/RPR";
import {
	SAM_ACTIONS,
	SAM_COOLDOWNS,
	SAM_GAUGES,
	SAM_STATUSES,
	SAM_TRACKERS,
	SAM_RESOURCES,
	SAM_TRAITS,
} from "./Jobs/SAM";
import {
	SCH_ACTIONS,
	SCH_COOLDOWNS,
	SCH_GAUGES,
	SCH_STATUSES,
	SCH_TRACKERS,
	SCH_RESOURCES,
	SCH_TRAITS,
} from "./Jobs/SCH";
import {
	SGE_ACTIONS,
	SGE_COOLDOWNS,
	SGE_GAUGES,
	SGE_STATUSES,
	SGE_TRACKERS,
	SGE_RESOURCES,
	SGE_TRAITS,
} from "./Jobs/SGE";
import {
	SMN_ACTIONS,
	SMN_COOLDOWNS,
	SMN_GAUGES,
	SMN_STATUSES,
	SMN_TRACKERS,
	SMN_RESOURCES,
	SMN_TRAITS,
} from "./Jobs/SMN";
import {
	VPR_ACTIONS,
	VPR_COOLDOWNS,
	VPR_GAUGES,
	VPR_STATUSES,
	VPR_TRACKERS,
	VPR_RESOURCES,
	VPR_TRAITS,
} from "./Jobs/VPR";
import {
	WAR_ACTIONS,
	WAR_COOLDOWNS,
	WAR_GAUGES,
	WAR_STATUSES,
	WAR_TRACKERS,
	WAR_RESOURCES,
	WAR_TRAITS,
} from "./Jobs/WAR";
import {
	WHM_ACTIONS,
	WHM_COOLDOWNS,
	WHM_GAUGES,
	WHM_STATUSES,
	WHM_TRACKERS,
	WHM_RESOURCES,
	WHM_TRAITS,
} from "./Jobs/WHM";
import {
	BLU_ACTIONS,
	BLU_COOLDOWNS,
	BLU_GAUGES,
	BLU_STATUSES,
	BLU_TRACKERS,
	BLU_RESOURCES,
	BLU_TRAITS,
} from "./Jobs/BLU";
import {
	COMMON_ACTIONS,
	COMMON_COOLDOWNS,
	COMMON_GAUGES,
	COMMON_STATUSES,
	COMMON_TRACKERS,
	COMMON_RESOURCES,
	COMMON_TRAITS,
} from "./Shared/Common";
import {
	LIMIT_BREAK_ACTIONS,
	LIMIT_BREAK_COOLDOWNS,
	LIMIT_BREAK_RESOURCES,
} from "./Shared/LimitBreak";
import {
	ROLE_ACTIONS,
	ROLE_COOLDOWNS,
	ROLE_STATUSES,
	ROLE_TRACKERS,
	ROLE_RESOURCES,
	ROLE_TRAITS,
} from "./Shared/Role";
import { PHANTOM_ACTIONS, PHANTOM_COOLDOWNS, PHANTOM_RESOURCES } from "./Shared/Phantom";

export const ACTIONS = {
	...COMMON_ACTIONS,
	...ROLE_ACTIONS,
	...LIMIT_BREAK_ACTIONS,

	// Tanks
	...PLD_ACTIONS,
	...WAR_ACTIONS,
	...DRK_ACTIONS,
	...GNB_ACTIONS,

	// Healers
	...WHM_ACTIONS,
	...SCH_ACTIONS,
	...AST_ACTIONS,
	...SGE_ACTIONS,

	// Melee
	...MNK_ACTIONS,
	...DRG_ACTIONS,
	...NIN_ACTIONS,
	...SAM_ACTIONS,
	...RPR_ACTIONS,
	...VPR_ACTIONS,

	// Ranged
	...BRD_ACTIONS,
	...MCH_ACTIONS,
	...DNC_ACTIONS,

	// Casters
	...BLM_ACTIONS,
	...SMN_ACTIONS,
	...RDM_ACTIONS,
	...PCT_ACTIONS,
	// Limited
	...BLU_ACTIONS,

	// Phantom
	...PHANTOM_ACTIONS,
};

export const COOLDOWNS = {
	...COMMON_COOLDOWNS,
	...ROLE_COOLDOWNS,
	...LIMIT_BREAK_COOLDOWNS,

	// Tanks
	...PLD_COOLDOWNS,
	...WAR_COOLDOWNS,
	...DRK_COOLDOWNS,
	...GNB_COOLDOWNS,

	// Healers
	...WHM_COOLDOWNS,
	...SCH_COOLDOWNS,
	...AST_COOLDOWNS,
	...SGE_COOLDOWNS,

	// Melee
	...MNK_COOLDOWNS,
	...DRG_COOLDOWNS,
	...NIN_COOLDOWNS,
	...SAM_COOLDOWNS,
	...RPR_COOLDOWNS,
	...VPR_COOLDOWNS,

	// Ranged
	...BRD_COOLDOWNS,
	...MCH_COOLDOWNS,
	...DNC_COOLDOWNS,

	// Casters
	...BLM_COOLDOWNS,
	...SMN_COOLDOWNS,
	...RDM_COOLDOWNS,
	...PCT_COOLDOWNS,
	// Limited
	...BLU_COOLDOWNS,

	// Phantom
	...PHANTOM_COOLDOWNS,
};

export const GAUGES = {
	...COMMON_GAUGES,

	// Tanks
	...PLD_GAUGES,
	...WAR_GAUGES,
	...DRK_GAUGES,
	...GNB_GAUGES,

	// Healers
	...WHM_GAUGES,
	...SCH_GAUGES,
	...AST_GAUGES,
	...SGE_GAUGES,

	// Melee
	...MNK_GAUGES,
	...DRG_GAUGES,
	...NIN_GAUGES,
	...SAM_GAUGES,
	...RPR_GAUGES,
	...VPR_GAUGES,

	// Ranged
	...BRD_GAUGES,
	...MCH_GAUGES,
	...DNC_GAUGES,

	// Casters
	...BLM_GAUGES,
	...SMN_GAUGES,
	...RDM_GAUGES,
	...PCT_GAUGES,
	// Limited
	...BLU_GAUGES,
};

export const STATUSES = {
	...COMMON_STATUSES,
	...ROLE_STATUSES,
	...LIMIT_BREAK_RESOURCES,

	// Tanks
	...PLD_STATUSES,
	...WAR_STATUSES,
	...DRK_STATUSES,
	...GNB_STATUSES,

	// Healers
	...WHM_STATUSES,
	...SCH_STATUSES,
	...AST_STATUSES,
	...SGE_STATUSES,

	// Melee
	...MNK_STATUSES,
	...DRG_STATUSES,
	...NIN_STATUSES,
	...SAM_STATUSES,
	...RPR_STATUSES,
	...VPR_STATUSES,

	// Ranged
	...BRD_STATUSES,
	...MCH_STATUSES,
	...DNC_STATUSES,

	// Casters
	...BLM_STATUSES,
	...SMN_STATUSES,
	...RDM_STATUSES,
	...PCT_STATUSES,
	// Limited
	...BLU_STATUSES,
};

export const TRACKERS = {
	...COMMON_TRACKERS,
	...ROLE_TRACKERS,

	// Tanks
	...PLD_TRACKERS,
	...WAR_TRACKERS,
	...DRK_TRACKERS,
	...GNB_TRACKERS,

	// Healers
	...WHM_TRACKERS,
	...SCH_TRACKERS,
	...AST_TRACKERS,
	...SGE_TRACKERS,

	// Melee
	...MNK_TRACKERS,
	...DRG_TRACKERS,
	...NIN_TRACKERS,
	...SAM_TRACKERS,
	...RPR_TRACKERS,
	...VPR_TRACKERS,

	// Ranged
	...BRD_TRACKERS,
	...MCH_TRACKERS,
	...DNC_TRACKERS,

	// Casters
	...BLM_TRACKERS,
	...SMN_TRACKERS,
	...RDM_TRACKERS,
	...PCT_TRACKERS,
	// Limited
	...BLU_TRACKERS,
};

export const RESOURCES = {
	...COMMON_RESOURCES,
	...ROLE_RESOURCES,
	...LIMIT_BREAK_RESOURCES,

	// Tanks
	...PLD_RESOURCES,
	...WAR_RESOURCES,
	...DRK_RESOURCES,
	...GNB_RESOURCES,

	// Healers
	...WHM_RESOURCES,
	...SCH_RESOURCES,
	...AST_RESOURCES,
	...SGE_RESOURCES,

	// Melee
	...MNK_RESOURCES,
	...DRG_RESOURCES,
	...NIN_RESOURCES,
	...SAM_RESOURCES,
	...RPR_RESOURCES,
	...VPR_RESOURCES,

	// Ranged
	...BRD_RESOURCES,
	...MCH_RESOURCES,
	...DNC_RESOURCES,

	// Casters
	...BLM_RESOURCES,
	...SMN_RESOURCES,
	...RDM_RESOURCES,
	...PCT_RESOURCES,
	// Limited
	...BLU_RESOURCES,

	// Phantom
	...PHANTOM_RESOURCES,
};

export const TRAITS = {
	...COMMON_TRAITS,
	...ROLE_TRAITS,

	// Tanks
	...PLD_TRAITS,
	...WAR_TRAITS,
	...DRK_TRAITS,
	...GNB_TRAITS,

	// Healers
	...WHM_TRAITS,
	...SCH_TRAITS,
	...AST_TRAITS,
	...SGE_TRAITS,

	// Melee
	...MNK_TRAITS,
	...DRG_TRAITS,
	...NIN_TRAITS,
	...SAM_TRAITS,
	...RPR_TRAITS,
	...VPR_TRAITS,

	// Ranged
	...BRD_TRAITS,
	...MCH_TRAITS,
	...DNC_TRAITS,

	// Casters
	...BLM_TRAITS,
	...SMN_TRAITS,
	...RDM_TRAITS,
	...PCT_TRAITS,
	// Limited
	...BLU_TRAITS,
};

export type Actions = typeof ACTIONS;
export type ActionKey = keyof Actions;

export type Cooldowns = typeof COOLDOWNS;
export type CooldownKey = keyof Cooldowns;

export type Gauges = typeof GAUGES;
export type GaugeKey = keyof Gauges;

export type Statuses = typeof STATUSES;
export type StatusKey = keyof Statuses;

export type Trackers = typeof TRACKERS;
export type TrackerKey = keyof Trackers;

export type Resources = typeof RESOURCES;
export type ResourceKey = keyof Resources;

export type ResourceCategory = "cooldown" | "gauge" | "status" | "tracker";

export function getResourceCategory(key: ResourceKey | CooldownKey): ResourceCategory {
	if (key in COOLDOWNS) {
		return "cooldown";
	}
	if (key in GAUGES) {
		return "gauge";
	}
	if (key in STATUSES) {
		return "status";
	}
	if (key in TRACKERS) {
		return "tracker";
	}
	console.error(`Unknown resource category for ${key}, defaulting to status`);
	return "status";
}

export type Traits = typeof TRAITS;
export type TraitKey = keyof Traits;
