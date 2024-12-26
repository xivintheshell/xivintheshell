import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Resource } from "../type";

// There are not currently any role-specific gauge-like resources to track

export const ROLE_STATUSES = ensureRecord<Resource>()({
	ADDLE: { name: "Addle" }, // [0, 1]
	SWIFTCAST: { name: "Swiftcast" }, // [0, 1]
	LUCID_DREAMING: { name: "Lucid Dreaming" }, // [0, 1] also just for timing display
	SURECAST: { name: "Surecast" }, // [0, 1]
	ARMS_LENGTH: { name: "Arms Length" },

	FEINT: { name: "Feint" }, // [0, 1]
	TRUE_NORTH: { name: "True North" }, // [0, 1]
	BLOODBATH: { name: "Bloodbath" }, // [0, 1]

	RAMPART: { name: "Rampart" }, // [0, 1]
	REPRISAL: { name: "Reprisal" }, // [0, 1]
});
export type RoleStatuses = typeof ROLE_STATUSES;
export type RoleStatusKey = keyof RoleStatuses;

export const ROLE_TRACKERS = ensureRecord<Resource>()({
	REAR_POSITIONAL: { name: "Rear Positional", mayBeToggled: true }, // [0, 1]
	FLANK_POSITIONAL: { name: "Flank Positional", mayBeToggled: true }, // [0, 1]
});
export type RoleTrackers = typeof ROLE_TRACKERS;
export type RoleTrackerKey = keyof RoleTrackers;

export const ROLE = {
	...ROLE_STATUSES,
	...ROLE_TRACKERS,
};
export type RoleResources = typeof ROLE;
export type RoleResourceKey = keyof RoleResources;
