// TODO support gamepad and MMO mouse inputs
import React from "react";
import { getCachedValue, removeCachedValue, setCachedValue } from "./Common";

const KEYBIND_CACHE_KEY = "customKeybinds";

// For simplicity, each unique hotbar row is internally keyed with a 1-indexed row number and slot
// number, like "1_1" representing hotbar 1, slot 1.
// A single bar can reach up to 15 slots (compared to the max of 12 in game), and we support up to
// 6 bars.
// SCH has the most displayed skills (I think) with 37 at time of writing, going most of the way
// through 3 rows.
// Note that FFXIV starts hotbar 1 at the _bottom_ by default, while we start populating skills
// from the top downwards. TODO: add a new switch to reverse hotbar orders to match game

interface BindEntry {
	key: string;
	shiftKey?: boolean;
	ctrlKey?: boolean;
	metaKey?: boolean;
	altKey?: boolean;
}

const cachedBinds = getCachedValue(KEYBIND_CACHE_KEY);

const MAX_HOTBAR_SLOTS = 15;
const MAX_NUM_HOTBARS = 6;
const DEFAULT_BINDS = new Map<string, BindEntry>();
for (let i = 1; i <= 10; i++) {
	DEFAULT_BINDS.set(`1_${i}`, { key: (i % 10).toFixed(0) });
	DEFAULT_BINDS.set(`2_${i}`, { key: (i % 10).toFixed(0), ctrlKey: true });
}
DEFAULT_BINDS.set(`1_11`, { key: "-" });
DEFAULT_BINDS.set(`1_12`, { key: "=" });
DEFAULT_BINDS.set(`2_11`, { key: "-", ctrlKey: true });
DEFAULT_BINDS.set(`2_12`, { key: "=", ctrlKey: true });

const activeBinds =
	cachedBinds === null
		? new Map(DEFAULT_BINDS)
		: new Map<string, BindEntry>(JSON.parse(cachedBinds));

// each hotbar slot has a row, with the current keybind (click + input to set) and a reset button
// right-clicking unbinds a slot

// keybind display setting: disabled/top left/top right
// assume modifiers alone (alt/shift/ctrl/meta) are never treated as terminal when attempting to bind
const RESERVED_KEYS = new Set([
	"Delete",
	"Backspace",
	"Home",
	"End",
	"Enter",
	"Tab",
	"Escape",
	"Insert",
	"ArrowUp",
	"ArrowRight",
	"ArrowLeft",
	"ArrowDown",
	"Paste",
	"Copy",
	"Cut",
]);

// Returns true if the proposed keybind is valid.
// TODO return or propagate error message
function validateBind(bind: BindEntry): boolean {
	if (RESERVED_KEYS.has(bind.key)) {
		return false;
	}
	// Reject any letter combined with the ctrl key, since it may overlap an application shortcut
	// (like ctrl-z for undo) or native browser function.
	// TODO: consider preventing meta + letter on macos instead?
	if (bind.key.match(/[a-z]/i) && (bind.ctrlKey || bind.metaKey)) {
		return false;
	}
	return true;
}

export function updateBind(hotbar: number, slot: number, e: React.KeyboardEvent) {
	// TODO proper error propagation
	if (hotbar < 1 || hotbar > MAX_NUM_HOTBARS) {
		console.error("invalid hotbar number");
		return;
	}
	if (slot < 1 || slot > MAX_HOTBAR_SLOTS) {
		console.error("invalid hotbar slot number");
		return;
	}
	const bind: BindEntry = {
		key: e.key,
		ctrlKey: e.ctrlKey,
		metaKey: e.metaKey,
		shiftKey: e.shiftKey,
	};
	if (validateBind(bind)) {
		activeBinds.set(`${hotbar}_${slot}`, bind);
		setCachedValue(KEYBIND_CACHE_KEY, JSON.stringify(Array.from(activeBinds)));
	}
}

export function resetAllBinds() {
	removeCachedValue(KEYBIND_CACHE_KEY);
}

// Return the hotbar number and slot that a keyboard event should trigger, if any.
export function getBindByPress(evt: React.KeyboardEvent): string | undefined {
	// TODO use reverse lookup dict? probably not a meaningful optimization since it's like n=60 anyway
	// though we do need a way to prevent duplicate binds (right now it just matches the first)
	for (const [slot, entry] of activeBinds.entries()) {
		if (
			entry.key === evt.key &&
			!!entry.ctrlKey === evt.ctrlKey &&
			!!entry.metaKey === evt.metaKey &&
			!!entry.shiftKey === evt.shiftKey &&
			!!entry.altKey === evt.altKey
		) {
			return slot;
		}
	}
	return undefined;
}

export function getDisplayBindBySlot(hotbar: number, slot: number): string | undefined {
	const entry = activeBinds.get(`${hotbar}_${slot}`);
	if (entry) {
		// TODO check modifier order in-game
		let result = entry.key;
		if (entry.shiftKey) result = "\u21E7" + result; // up arrow
		if (entry.altKey) result = "A-" + result; // TODO superscript?
		if (entry.ctrlKey) result = "C-" + result; // TODO superscript?
		if (entry.metaKey) result = "S-" + result; // TODO superscript?
		return result;
	}
	return undefined;
}
