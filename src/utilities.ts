import { LevelSync } from "./Game/Common";
import { TraitKey, TRAITS } from "./Game/Data";

export function hasUnlockedTrait(traitKey: TraitKey, level: LevelSync): boolean {
	const trait = traitKey in TRAITS ? TRAITS[traitKey] : TRAITS["NEVER"];
	return level >= trait.level;
}

/**
 * Ensure that the values in the provided record match at _least_ the requested data shape.
 *
 * @example
 * ```ts
 * interface Data { example: number }
 * const data = ensureRecord<Data>()({KEY: {example: 1}})
 * ```
 */
export const ensureRecord =
	<TData>() =>
	<TInput extends Record<string, TData>>(
		values: TInput,
	): {
		[K in keyof TInput]: TInput[K] & TData;
	} =>
		values;
