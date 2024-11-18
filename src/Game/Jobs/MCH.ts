import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";

export class MCHState extends GameState {
    constructor (config: GameConfig) {
        super(config)

        this.registerRecurringEvents();
    }
}