import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Trait } from "../type";

export const COMMON = ensureRecord<Trait>()({
	NEVER: { name: "Never", level: 1 },
});
