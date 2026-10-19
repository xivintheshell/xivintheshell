// TODO support gamepad and MMO mouse inputs
import React from "react";
import { getCachedValue, removeCachedValue, setCachedValue } from "./Common";
import { ActionKey } from "../Game/Data";
import { ShellJob } from "../Game/Data/Jobs";

const KEYBIND_CACHE_KEY = "customKeybinds";
const HOTBAR_CACHE_PREFIX = "customHotbars-";

// For simplicity, each unique hotbar row is internally keyed with a 1-indexed row number and slot
// number, like "1_1" representing hotbar 1, slot 1.
// A single bar can reach up to 15 slots (compared to the max of 12 in game), and we support up to
// 6 bars.
// SCH has the most displayed skills (I think) with 37 at time of writing, going most of the way
// through 3 rows.
// Note that FFXIV starts hotbar 1 at the _bottom_ by default, while we start populating skills
// from the top downwards. This can be flipped by a configuration setting.

interface BindEntry {
	key: string;
	shiftKey?: boolean;
	ctrlKey?: boolean;
	metaKey?: boolean;
	altKey?: boolean;
}

const cachedBinds = getCachedValue(KEYBIND_CACHE_KEY);

export const MAX_HOTBAR_SLOTS = 15;
export const MAX_NUM_HOTBARS = 6;

export function hotbarSlotId(hotbar: number, slot: number) {
	return `${hotbar}_${slot}`;
}

const DEFAULT_BINDS = new Map<string, BindEntry>();
for (let i = 1; i <= 10; i++) {
	DEFAULT_BINDS.set(hotbarSlotId(1, i), { key: (i % 10).toFixed(0) });
	DEFAULT_BINDS.set(hotbarSlotId(2, i), { key: (i % 10).toFixed(0), ctrlKey: true });
}
DEFAULT_BINDS.set(hotbarSlotId(1, 11), { key: "-" });
DEFAULT_BINDS.set(hotbarSlotId(1, 12), { key: "=" });
DEFAULT_BINDS.set(hotbarSlotId(2, 11), { key: "-", ctrlKey: true });
DEFAULT_BINDS.set(hotbarSlotId(2, 12), { key: "=", ctrlKey: true });

const activeBinds =
	cachedBinds === null
		? new Map(DEFAULT_BINDS)
		: new Map<string, BindEntry>(JSON.parse(cachedBinds));
// If there were no cached binds stored, write back the default binds to ensure we don't get
// weird states where some binds are default but not others.
if (cachedBinds === null) {
	setCachedValue(KEYBIND_CACHE_KEY, JSON.stringify(Array.from(DEFAULT_BINDS)));
}

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
		activeBinds.set(hotbarSlotId(hotbar, slot), bind);
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
	const entry = activeBinds.get(hotbarSlotId(hotbar, slot));
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

// We serialize hotbars as pseudo-sparse arrays to save on our localStorage footprint.
// To ensure serialization runs both ways, any runs of unbound slots are stored as an integer
// rather than an ActionKey.
// Some napkin math: we currently support 6 hotbars of 15 slots each, which amounts to 90 slots.
// The "NEVER" key is 5 characters long, so storing a full set of unbound hotbars for each job
// is ~450 bytes (before any metadata overhead), which is... not nothing? This might be premature
// optimization, but I was feeling fancy.
type SerializedHotbar = (number | ActionKey)[];

// Returns a 2d array of ActionKeys for the job, sized to the hotbar maximum.
// Unassigned slots are NEVER. Rows or slots past the maximum are dropped.
// If no hotbar is saved, returns undefined; the caller should handle populating the default.
export function loadHotbarForJob(job: ShellJob): ActionKey[][] | undefined {
	const savedHotbars = getCachedValue(HOTBAR_CACHE_PREFIX + job);
	if (savedHotbars === null) {
		return undefined;
	}
	const parsedHotbars = JSON.parse(savedHotbars) as SerializedHotbar[];
	const result: ActionKey[][] = [];
	for (const row of parsedHotbars) {
		if (result.length >= MAX_NUM_HOTBARS) break;
		const newBar: ActionKey[] = [];
		for (const keyOrRun of row) {
			if (newBar.length >= MAX_HOTBAR_SLOTS) break;
			if (typeof keyOrRun === "number") {
				const count = Math.min(keyOrRun, MAX_HOTBAR_SLOTS - newBar.length);
				for (let i = 0; i < count; i++) newBar.push("NEVER");
			} else {
				newBar.push(keyOrRun);
			}
		}
		while (newBar.length < MAX_HOTBAR_SLOTS) newBar.push("NEVER");
		result.push(newBar);
	}
	while (result.length < MAX_NUM_HOTBARS) {
		result.push(Array.from({ length: MAX_HOTBAR_SLOTS }, () => "NEVER" as ActionKey));
	}
	return result;
}

export function saveHotbarForJob(job: ShellJob, hotbar: ActionKey[][]) {
	const hotbarsToStore: SerializedHotbar[] = [];
	for (const bar of hotbar) {
		const barToStore: SerializedHotbar = [];
		let emptyRun = 0;
		for (const key of bar) {
			if (key !== "NEVER") {
				// push any previous run of empty actions
				if (emptyRun > 0) {
					barToStore.push(emptyRun);
					emptyRun = 0;
				}
				barToStore.push(key);
			} else {
				emptyRun++;
			}
		}
		if (emptyRun > 0) {
			barToStore.push(emptyRun);
		}
		hotbarsToStore.push(barToStore);
	}
	setCachedValue(HOTBAR_CACHE_PREFIX + job, JSON.stringify(hotbarsToStore));
}

let activeHotbarLayout: ActionKey[][] | undefined;

export function getActiveHotbarLayout(): ActionKey[][] | undefined {
	return activeHotbarLayout;
}

export function setActiveHotbarLayout(layout: ActionKey[][] | undefined) {
	activeHotbarLayout = layout;
}
