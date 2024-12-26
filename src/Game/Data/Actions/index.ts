import { AST } from "./Jobs/AST";
import { BLM } from "./Jobs/BLM";
import { BRD } from "./Jobs/BRD";
import { DNC } from "./Jobs/DNC";
import { DRG } from "./Jobs/DRG";
import { DRK } from "./Jobs/DRK";
import { GNB } from "./Jobs/GNB";
import { MCH } from "./Jobs/MCH";
import { MNK } from "./Jobs/MNK";
import { NIN } from "./Jobs/NIN";
import { PCT } from "./Jobs/PCT";
import { PLD } from "./Jobs/PLD";
import { RDM } from "./Jobs/RDM";
import { RPR } from "./Jobs/RPR";
import { SAM } from "./Jobs/SAM";
import { SCH } from "./Jobs/SCH";
import { SGE } from "./Jobs/SGE";
import { SMN } from "./Jobs/SMN";
import { VPR } from "./Jobs/VPR";
import { WAR } from "./Jobs/WAR";
import { WHM } from "./Jobs/WHM";
import { COMMON } from "./Shared/Common";
import { LIMIT_BREAK } from "./Shared/LimitBreak";
import { ROLE } from "./Shared/Role";

export const ACTIONS = {
	...COMMON,
	...ROLE,
	...LIMIT_BREAK,

	// Tanks
	...PLD,
	...WAR,
	...DRK,
	...GNB,

	// Healers
	...WHM,
	...SCH,
	...AST,
	...SGE,

	// Melee
	...MNK,
	...DRG,
	...NIN,
	...SAM,
	...RPR,
	...VPR,

	// Ranged
	...BRD,
	...MCH,
	...DNC,

	// Casters
	...BLM,
	...SMN,
	...RDM,
	...PCT,
};

export type Actions = typeof ACTIONS;
export type ActionKey = keyof Actions;
