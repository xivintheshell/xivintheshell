// TODO support gamepad and MMO mouse inputs
import { getCachedValue, setCachedValue } from "./Common";
import { LocalizedContent } from "../Components/Localization";
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

export interface BindEntry {
	key: string;
	shiftKey?: boolean;
	ctrlKey?: boolean;
	metaKey?: boolean;
	altKey?: boolean;
}

// A key event, or the modifiers currently held while a bind is being captured.
export type KeyPress = {
	key: string;
	// Physical key, used so Shift+1 is stored as "1" rather than "!".
	code?: string;
	shiftKey?: boolean;
	ctrlKey?: boolean;
	metaKey?: boolean;
	altKey?: boolean;
};

export const MAX_HOTBAR_SLOTS = 15;
export const MAX_NUM_HOTBARS = 6;

// The only action we have a configurable keybind for is currently `u` to delete the last timeline action.
// We'll add more members to this type in the future if that changes.
export type SystemCommand = "deleteLastTimelineAction";

export type KeybindAction =
	| { kind: "system"; command: SystemCommand }
	| { kind: "hotbar"; hotbar: number; slot: number };

export const DELETE_LAST_TIMELINE_ACTION = {
	kind: "system",
	command: "deleteLastTimelineAction",
} as const satisfies KeybindAction;

export function hotbarSlotId(hotbar: number, slot: number) {
	return `${hotbar}_${slot}`;
}

// Produce a KeybindAction object for the corresponding hotbar/slot pair.
export function hotbarKeybindAction(hotbar: number, slot: number): KeybindAction {
	return { kind: "hotbar", hotbar, slot };
}

export function keybindActionEq(a: KeybindAction, b: KeybindAction): boolean {
	if (a.kind === "system" && b.kind === "system") return a.command === b.command;
	if (a.kind === "hotbar" && b.kind === "hotbar")
		return a.hotbar === b.hotbar && a.slot === b.slot;
	return false;
}

function actionMapKey(action: KeybindAction): string {
	if (action.kind === "system") return action.command;
	return hotbarSlotId(action.hotbar, action.slot);
}

function hbMapKey(hotbar: number, slot: number): string {
	return actionMapKey(hotbarKeybindAction(hotbar, slot));
}

function parseStoredAction(raw: string): KeybindAction | undefined {
	if (raw === DELETE_LAST_TIMELINE_ACTION.command) {
		return DELETE_LAST_TIMELINE_ACTION;
	}
	const parts = raw.split("_");
	if (parts.length !== 2) return undefined;
	const hotbar = Number(parts[0]);
	const slot = Number(parts[1]);
	if (!Number.isInteger(hotbar) || !Number.isInteger(slot)) return undefined;
	return { kind: "hotbar", hotbar, slot };
}

const DEFAULT_BINDS = new Map<string, BindEntry>();
for (let i = 1; i <= 10; i++) {
	DEFAULT_BINDS.set(hbMapKey(1, i), { key: (i % 10).toFixed(0) });
	DEFAULT_BINDS.set(hbMapKey(2, i), {
		key: (i % 10).toFixed(0),
		ctrlKey: true,
	});
}
DEFAULT_BINDS.set(hbMapKey(1, 11), { key: "-" });
DEFAULT_BINDS.set(hbMapKey(1, 12), { key: "=" });
DEFAULT_BINDS.set(hbMapKey(2, 11), { key: "-", ctrlKey: true });
DEFAULT_BINDS.set(hbMapKey(2, 12), { key: "=", ctrlKey: true });
DEFAULT_BINDS.set(actionMapKey(DELETE_LAST_TIMELINE_ACTION), { key: "u" });

const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "Meta"]);

export function isModifierKey(key: string): boolean {
	return MODIFIER_KEYS.has(key);
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

// Returns a user-facing reason when the bind is not allowed.
export function validateBind(bind: BindEntry): LocalizedContent | undefined {
	if (bind.key === "" || isModifierKey(bind.key)) {
		return {
			en: "A binding needs one non-modifier key.",
			zh: "绑定需要一个非修饰键。",
		};
	}
	if (RESERVED_KEYS.has(bind.key)) {
		return {
			en: `"${bind.key}" is reserved and cannot be used as a keybind.`,
			zh: `“${bind.key}”是保留键，不能用作按键绑定。`,
		};
	}
	// Reject any letter combined with ctrl or meta, since it may overlap an application shortcut
	// (like ctrl-z for undo) or a native browser function.
	if (bind.key.match(/[a-zA-Z]/i) && (bind.ctrlKey || bind.metaKey)) {
		return {
			en: "Letters combined with the Ctrl/Cmd/Alt keys overlap application and browser shortcuts and cannot be bound.",
			zh: "字母与 Ctrl/Cmd/Alt 键的组合会与应用程序和浏览器快捷键冲突，无法绑定。",
		};
	}
	return undefined;
}

type SerializedBinds = [string, BindEntry][];

function persistBinds(binds: Map<string, BindEntry>) {
	const payload: SerializedBinds = Array.from(binds);
	setCachedValue(KEYBIND_CACHE_KEY, JSON.stringify(payload));
}

function loadBinds(): Map<string, BindEntry> {
	const cached = getCachedValue(KEYBIND_CACHE_KEY);
	if (cached === null) {
		return new Map(DEFAULT_BINDS);
	}
	const parsed = JSON.parse(cached) as SerializedBinds;
	if (!Array.isArray(parsed)) {
		return new Map(DEFAULT_BINDS);
	}
	const binds = new Map<string, BindEntry>();
	for (const [raw, bind] of parsed) {
		const action = parseStoredAction(raw);
		if (action === undefined) continue;
		binds.set(actionMapKey(action), bind);
	}
	return binds;
}

// In-memory mapping of actions -> corresponding key triggers.
// While the reverse mapping (key -> action) would be used more frequently, maintaining it
// is a pain, and not really worth the perf improvement since there's only ~90 keybinds possible.
const activeBinds = loadBinds();

// Extracts a number from keycode to avoid stuff like shift-1 becoming !.
function keyName(press: KeyPress): string {
	if (!press.shiftKey || press.code === undefined) return press.key;
	const digit = /^(?:Digit|Numpad)(\d)$/.exec(press.code);
	return digit?.[1] ?? press.key;
}

function bindsMatch(entry: BindEntry, press: KeyPress): boolean {
	return (
		entry.key === keyName(press) &&
		!!entry.ctrlKey === !!press.ctrlKey &&
		!!entry.metaKey === !!press.metaKey &&
		!!entry.shiftKey === !!press.shiftKey &&
		!!entry.altKey === !!press.altKey
	);
}

// Omit unset modifier flags so the stored blob stays sparse.
export function bindEntryFromPress(press: KeyPress): BindEntry {
	return {
		key: keyName(press),
		...(press.shiftKey ? { shiftKey: true } : {}),
		...(press.ctrlKey ? { ctrlKey: true } : {}),
		...(press.metaKey ? { metaKey: true } : {}),
		...(press.altKey ? { altKey: true } : {}),
	};
}

export function getBind(actionKey: KeybindAction): BindEntry | undefined {
	return activeBinds.get(actionMapKey(actionKey));
}

export function getDefaultBind(actionKey: KeybindAction): BindEntry | undefined {
	return DEFAULT_BINDS.get(actionMapKey(actionKey));
}

export function findBindConflict(
	actionKey: KeybindAction,
	bind: BindEntry,
): KeybindAction | undefined {
	const self = actionMapKey(actionKey);
	for (const [stored, entry] of activeBinds) {
		if (stored === self || !bindsMatch(entry, bind)) continue;
		const conflict = parseStoredAction(stored);
		if (conflict !== undefined) return conflict;
	}
	return undefined;
}

export function assignBind(actionKey: KeybindAction, bind: BindEntry) {
	activeBinds.set(actionMapKey(actionKey), bind);
	persistBinds(activeBinds);
}

// Give `actionKey` the new bind. The action that already had it receives `actionKey`'s previous bind.
export function swapBindAssignment(
	actionKey: KeybindAction,
	bind: BindEntry,
	otherKey: KeybindAction,
) {
	const oldBind = activeBinds.get(actionMapKey(actionKey));
	activeBinds.set(actionMapKey(actionKey), bind);
	const actionToSwap = actionMapKey(otherKey);
	if (oldBind === undefined) {
		activeBinds.delete(actionToSwap);
	} else {
		activeBinds.set(actionToSwap, oldBind);
	}
	persistBinds(activeBinds);
}

export function clearBind(actionKey: KeybindAction) {
	activeBinds.delete(actionMapKey(actionKey));
	persistBinds(activeBinds);
}

export function resetBind(actionKey: KeybindAction) {
	const stored = actionMapKey(actionKey);
	const fallback = DEFAULT_BINDS.get(stored);
	if (fallback === undefined) {
		activeBinds.delete(stored);
	} else {
		activeBinds.set(stored, fallback);
	}
	persistBinds(activeBinds);
}

export function clearHotbarBinds() {
	// probably a more efficient way to do this (like re-constructing all non-hotbar binds so
	// we can skip this iteration)
	// but it's short enough to not really matter
	for (const stored of [...activeBinds.keys()]) {
		const action = parseStoredAction(stored);
		if (action?.kind === "hotbar") {
			activeBinds.delete(stored);
		}
	}
	persistBinds(activeBinds);
}

export function resetAllBinds() {
	activeBinds.clear();
	for (const [id, bind] of DEFAULT_BINDS) {
		activeBinds.set(id, bind);
	}
	persistBinds(activeBinds);
}

// Display text for a saved bind or for modifiers held during capture. `key` may be empty.
export function formatBind(entry: KeyPress): string {
	// TODO check modifier order in-game
	let result = entry.key.toUpperCase();
	if (entry.shiftKey) result = "\u21E7" + result; // unicode up arrow
	if (entry.altKey) result = "A-" + result;
	if (entry.ctrlKey) result = "C-" + result;
	if (entry.metaKey) result = "S-" + result;
	return result;
}

// Return the action key that a keyboard event should trigger, if any.
export function getBindByPress(evt: KeyPress): KeybindAction | undefined {
	for (const [stored, entry] of activeBinds) {
		if (bindsMatch(entry, evt)) return parseStoredAction(stored);
	}
	return undefined;
}

export function getDisplayBind(actionKey: KeybindAction): string | undefined {
	const entry = activeBinds.get(actionMapKey(actionKey));
	return entry === undefined ? undefined : formatBind(entry);
}

export function getDisplayBindBySlot(hotbar: number, slot: number): string | undefined {
	return getDisplayBind(hotbarKeybindAction(hotbar, slot));
}

// We serialize hotbars as pseudo-sparse arrays to save on our localStorage footprint.
// To ensure serialization runs both ways, any runs of unbound slots are stored as an integer
// rather than an ActionKey.
// Some napkin math: we currently support 6 hotbars of 15 slots each, which amounts to 90 slots.
// The "NEVER" key is 5 characters long, so storing a full set of unbound hotbars for each job
// is ~450 bytes (before any metadata overhead), which is... not nothing? This might be premature
// optimization, but I was feeling fancy.
type SerializedHotbar = (number | ActionKey)[];

// Returns a 2d array of ActionKeys for the given job, padded to the hotbar/slot maxima.
// Unassigned slots are labeled NEVER. Any rows or slots past the maxima are dropped.
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
