import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";

export class BRDState extends GameState {
    constructor (config: GameConfig) {
        super(config)

        this.registerRecurringEvents();
    }
}