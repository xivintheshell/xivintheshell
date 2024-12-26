import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Cooldown } from "../type";

export const AST = ensureRecord<Cooldown>()({});

export type ASTCooldowns = typeof AST;
export type ASTCooldownKey = keyof ASTCooldowns;
