import { LevelSync } from "../Game/Common";
import { TraitKey, TRAITS } from "../Game/Data/Traits";

export function hasUnlockedTrait(traitKey: TraitKey, level: LevelSync): boolean {
	let trait = traitKey in TRAITS ? TRAITS[traitKey] : TRAITS["NEVER"];
	return level >= trait.level;
}
