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
import { WARState } from "./WAR";
import { PLDState } from "./PLD";

export function getGameState(config: GameConfig): GameState {
	switch (config.job) {
		// Tanks
		case "WAR":
			return new WARState(config);
		case "GNB":
			return new GNBState(config);
		case "PLD":
			return new PLDState(config);
		// Healers
		// Melee
		case "DRG":
			return new DRGState(config);
		case "SAM":
			return new SAMState(config);
		case "RPR":
			return new RPRState(config);
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
	}
	return new GameState(config);
}
