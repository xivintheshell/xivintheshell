// TODO support gamepad and MMO mouse inputs
import { getCachedValue, setCachedValue } from "./Common";
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

export type SystemCommand = "deleteLastTimelineAction";

export type KeybindAction =
	| { kind: "system"; command: SystemCommand }
	| { kind: "hotbar"; hotbar: number; slot: number };

export const DELETE_LAST_TIMELINE_ACTION = {
	kind: "system",
	command: "deleteLastTimelineAction",
} as const satisfies KeybindAction;

// Earlier saves used this string for the system command.
const LEGACY_DELETE_LAST_TIMELINE_NODE = "deleteLastTimelineNode";

export function hotbarSlotId(hotbar: number, slot: number) {
	return `${hotbar}_${slot}`;
}

export function hotbarKeybindAction(hotbar: number, slot: number): KeybindAction {
	return { kind: "hotbar", hotbar, slot };
}

export function sameKeybindAction(a: KeybindAction, b: KeybindAction): boolean {
	if (a.kind === "system" && b.kind === "system") return a.command === b.command;
	if (a.kind === "hotbar" && b.kind === "hotbar")
		return a.hotbar === b.hotbar && a.slot === b.slot;
	return false;
}

function actionStorageKey(action: KeybindAction): string {
	if (action.kind === "system") return action.command;
	return hotbarSlotId(action.hotbar, action.slot);
}

function parseStoredAction(raw: string): KeybindAction | undefined {
	if (raw === LEGACY_DELETE_LAST_TIMELINE_NODE || raw === DELETE_LAST_TIMELINE_ACTION.command) {
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
	DEFAULT_BINDS.set(actionStorageKey(hotbarKeybindAction(1, i)), { key: (i % 10).toFixed(0) });
	DEFAULT_BINDS.set(actionStorageKey(hotbarKeybindAction(2, i)), {
		key: (i % 10).toFixed(0),
		ctrlKey: true,
	});
}
DEFAULT_BINDS.set(actionStorageKey(hotbarKeybindAction(1, 11)), { key: "-" });
DEFAULT_BINDS.set(actionStorageKey(hotbarKeybindAction(1, 12)), { key: "=" });
DEFAULT_BINDS.set(actionStorageKey(hotbarKeybindAction(2, 11)), { key: "-", ctrlKey: true });
DEFAULT_BINDS.set(actionStorageKey(hotbarKeybindAction(2, 12)), { key: "=", ctrlKey: true });
DEFAULT_BINDS.set(actionStorageKey(DELETE_LAST_TIMELINE_ACTION), { key: "u" });

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
export function validateBind(bind: BindEntry): string | undefined {
	// TODO localize error messages
	if (bind.key === "" || isModifierKey(bind.key)) {
		return "A binding needs one non-modifier key.";
	}
	if (RESERVED_KEYS.has(bind.key)) {
		return `"${bind.key}" cannot be used as a keybind.`;
	}
	// Reject any letter combined with ctrl or meta, since it may overlap an application shortcut
	// (like ctrl-z for undo) or a native browser function.
	if (bind.key.match(/[a-zA-Z]/i) && (bind.ctrlKey || bind.metaKey)) {
		return "Letters combined with Ctrl or the Meta key overlap application and browser shortcuts.";
	}
	return undefined;
}

function cloneBind(bind: BindEntry): BindEntry {
	return { ...bind };
}

function cloneDefaultBinds(): Map<string, BindEntry> {
	return new Map(Array.from(DEFAULT_BINDS, ([id, bind]) => [id, cloneBind(bind)]));
}

type SerializedBinds = { version: 1; binds: [string, BindEntry][] };

function persistBinds(binds: Map<string, BindEntry>) {
	const payload: SerializedBinds = { version: 1, binds: Array.from(binds) };
	setCachedValue(KEYBIND_CACHE_KEY, JSON.stringify(payload));
}

function mapStoredBinds(entries: [string, BindEntry][]): {
	binds: Map<string, BindEntry>;
	changed: boolean;
} {
	const binds = new Map<string, BindEntry>();
	let changed = false;
	for (const [raw, bind] of entries) {
		const action = parseStoredAction(raw);
		if (action === undefined) {
			changed = true;
			continue;
		}
		const stored = actionStorageKey(action);
		if (stored !== raw) changed = true;
		binds.set(stored, cloneBind(bind));
	}
	return { binds, changed };
}

// Old saves are a raw array of [actionKey, bind] pairs and have no system bind.
// Versioned saves omit a cleared system bind on purpose, so a missing command stays unbound.
function loadBinds(): { binds: Map<string, BindEntry>; rewrite: boolean } {
	const cached = getCachedValue(KEYBIND_CACHE_KEY);
	if (cached === null) {
		return { binds: cloneDefaultBinds(), rewrite: true };
	}
	const parsed = JSON.parse(cached) as SerializedBinds | [string, BindEntry][];
	if (Array.isArray(parsed)) {
		const loaded = mapStoredBinds(parsed);
		const systemKey = actionStorageKey(DELETE_LAST_TIMELINE_ACTION);
		const system = DEFAULT_BINDS.get(systemKey);
		if (system && !loaded.binds.has(systemKey)) {
			loaded.binds.set(systemKey, cloneBind(system));
		}
		return { binds: loaded.binds, rewrite: true };
	}
	if (parsed?.version === 1 && Array.isArray(parsed.binds)) {
		const loaded = mapStoredBinds(parsed.binds);
		return { binds: loaded.binds, rewrite: loaded.changed };
	}
	return { binds: cloneDefaultBinds(), rewrite: true };
}

const loadedBinds = loadBinds();
const activeBinds = loadedBinds.binds;
if (loadedBinds.rewrite) persistBinds(activeBinds);

// Shifted digit-row and numpad keys report the symbol in `key` ("!"). Keep the number instead.
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

export function bindEntryFromPress(press: KeyPress): BindEntry {
	return {
		key: keyName(press),
		shiftKey: press.shiftKey,
		ctrlKey: press.ctrlKey,
		altKey: press.altKey,
		metaKey: press.metaKey,
	};
}

function normalizeBind(bind: BindEntry): BindEntry {
	return {
		key: bind.key,
		...(bind.shiftKey ? { shiftKey: true } : {}),
		...(bind.ctrlKey ? { ctrlKey: true } : {}),
		...(bind.metaKey ? { metaKey: true } : {}),
		...(bind.altKey ? { altKey: true } : {}),
	};
}

export function getBind(actionKey: KeybindAction): BindEntry | undefined {
	const entry = activeBinds.get(actionStorageKey(actionKey));
	return entry === undefined ? undefined : cloneBind(entry);
}

export function getDefaultBind(actionKey: KeybindAction): BindEntry | undefined {
	const entry = DEFAULT_BINDS.get(actionStorageKey(actionKey));
	return entry === undefined ? undefined : cloneBind(entry);
}

// Another action already using this combo, if any.
export function findBindConflict(
	actionKey: KeybindAction,
	bind: BindEntry,
): KeybindAction | undefined {
	const self = actionStorageKey(actionKey);
	for (const [stored, entry] of activeBinds) {
		if (stored === self || !bindsMatch(entry, bind)) continue;
		const conflict = parseStoredAction(stored);
		if (conflict !== undefined) return conflict;
	}
	return undefined;
}

export function assignBind(actionKey: KeybindAction, bind: BindEntry) {
	activeBinds.set(actionStorageKey(actionKey), normalizeBind(bind));
	persistBinds(activeBinds);
}

// Give `actionKey` the new bind. The action that already had it receives `actionKey`'s previous bind.
export function swapBindAssignment(
	actionKey: KeybindAction,
	bind: BindEntry,
	otherKey: KeybindAction,
) {
	const previous = activeBinds.get(actionStorageKey(actionKey));
	activeBinds.set(actionStorageKey(actionKey), normalizeBind(bind));
	const otherStored = actionStorageKey(otherKey);
	if (previous === undefined) activeBinds.delete(otherStored);
	else activeBinds.set(otherStored, cloneBind(previous));
	persistBinds(activeBinds);
}

export function clearBind(actionKey: KeybindAction) {
	activeBinds.delete(actionStorageKey(actionKey));
	persistBinds(activeBinds);
}

export function resetBind(actionKey: KeybindAction) {
	const stored = actionStorageKey(actionKey);
	const fallback = DEFAULT_BINDS.get(stored);
	if (fallback === undefined) activeBinds.delete(stored);
	else activeBinds.set(stored, cloneBind(fallback));
	persistBinds(activeBinds);
}

export function clearHotbarBinds() {
	for (const stored of [...activeBinds.keys()]) {
		const action = parseStoredAction(stored);
		if (action?.kind === "hotbar") activeBinds.delete(stored);
	}
	persistBinds(activeBinds);
}

export function resetAllBinds() {
	activeBinds.clear();
	for (const [id, bind] of DEFAULT_BINDS) activeBinds.set(id, cloneBind(bind));
	persistBinds(activeBinds);
}

// Display text for a saved bind or for modifiers held during capture. `key` may be empty.
export function formatBind(entry: KeyPress): string {
	// TODO check modifier order in-game
	let result = entry.key.toUpperCase();
	if (entry.shiftKey) result = "\u21E7" + result;
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
	const entry = activeBinds.get(actionStorageKey(actionKey));
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
