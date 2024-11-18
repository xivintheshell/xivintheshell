import { MCHState } from "../../Game/Jobs/MCH";
import { BuffProps, ResourceDisplayProps, StatusPropsGenerator } from "../StatusDisplay";

export class MCHStatusPropsGenerator extends StatusPropsGenerator<MCHState> {
    override getEnemyBuffViewProps(): BuffProps[] {
        return []
    }

    override getSelfBuffViewProps(): BuffProps[] {
        return []
    }

    override getResourceViewProps(): ResourceDisplayProps[] {
        return[]
    }
}