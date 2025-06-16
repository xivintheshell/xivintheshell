import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";
import { BLMState } from "./BLM";
import { BRDState } from "./BRD";
import { DNCState } from "./DNC";
import { DRGState } from "./DRG";
import { GNBState } from "./GNB";
import { MCHState } from "./MCH";
import { PCTState } from "./PCT";
import { RDMState } from "./RDM";
import { RPRState } from "./RPR";
import { SAMState } from "./SAM";
import { SMNState } from "./SMN";
import { SGEState } from "./SGE";
import { WARState } from "./WAR";
import { PLDState } from "./PLD";
import { DRKState } from "./DRK";
import { ASTState } from "./AST";
import { SCHState } from "./SCH";
import { WHMState } from "./WHM";
import { NINState } from "./NIN";
import { MNKState } from "./MNK";
import { VPRState } from "./VPR";
import { BLUState } from "./BLU";

export function getGameState(config: GameConfig): GameState {
	switch (config.job) {
		// Tanks
		case "PLD":
			return new PLDState(config);
		case "WAR":
			return new WARState(config);
		case "DRK":
			return new DRKState(config);
		case "GNB":
			return new GNBState(config);

		// Healers
		case "WHM":
			return new WHMState(config);
		case "SCH":
			return new SCHState(config);
		case "AST":
			return new ASTState(config);
		case "SGE":
			return new SGEState(config);

		// Melee
		case "MNK":
			return new MNKState(config);
		case "DRG":
			return new DRGState(config);
		case "NIN":
			return new NINState(config);
		case "SAM":
			return new SAMState(config);
		case "RPR":
			return new RPRState(config);
		case "VPR":
			return new VPRState(config);

		// Ranged
		case "BRD":
			return new BRDState(config);
		case "MCH":
			return new MCHState(config);
		case "DNC":
			return new DNCState(config);

		// Casters
		case "BLM":
			return new BLMState(config);
		case "SMN":
			return new SMNState(config);
		case "RDM":
			return new RDMState(config);
		case "PCT":
			return new PCTState(config);

		// Limited
		case "BLU":
			return new BLUState(config);
	}
	return new GameState(config);
}
