import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Action } from "../type";

export const AST = ensureRecord<Action>()({});

export type ASTActions = typeof AST;
export type ASTActionKey = keyof ASTActions;
