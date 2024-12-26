import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Action } from "../type";

export const ROLE = ensureRecord<Action>()({
	ARMS_LENGTH: { name: "Arm's Length" }, // Tanks, Melee, Phys Ranged

	SECOND_WIND: { name: "Second Wind" }, // Melee & Phys Ranged

	HEAD_GRAZE: { name: "Head Graze" }, // Phys Ranged. Not bothering with Leg/Foot Graze at this point

	ESUNA: { name: "Esuna" },
	RESCUE: { name: "Rescue" },

	ADDLE: { name: "Addle" },
	SWIFTCAST: { name: "Swiftcast" },
	LUCID_DREAMING: { name: "Lucid Dreaming" },
	SURECAST: { name: "Surecast" },

	FEINT: { name: "Feint" },
	BLOODBATH: { name: "Bloodbath" },
	TRUE_NORTH: { name: "True North" },
	LEG_SWEEP: { name: "Leg Sweep" },

	RAMPART: { name: "Rampart" },
	REPRISAL: { name: "Reprisal" },
	LOW_BLOW: { name: "Low Blow" },
	INTERJECT: { name: "Interject" },
	PROVOKE: { name: "Provoke" },
	SHIRK: { name: "Shirk" },
});

export type RoleActions = typeof ROLE;
export type RoleActionKey = keyof RoleActions;
