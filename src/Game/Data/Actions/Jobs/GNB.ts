import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Action } from "../type";

export const GNB = ensureRecord<Action>()({
	LIGHTNING_SHOCK: { name: "Lightning Shock" },
	KEEN_EDGE: { name: "Keen Edge" },
	BRUTAL_SHELL: { name: "Brutal Shell" },
	SOLID_BARREL: { name: "Solid Barrel" },
	DEMON_SLICE: { name: "Demon Slice" },
	DEMON_SLAUGHTER: { name: "Demon Slaughter" },

	BURST_STRIKE: { name: "Burst Strike" },
	FATED_CIRCLE: { name: "Fated Circle" },

	BLOODFEST: { name: "Bloodfest" },
	NO_MERCY: { name: "No Mercy" },
	SONIC_BREAK: { name: "Sonic Break" },

	GNASHING_FANG: { name: "Gnashing Fang" },
	SAVAGE_CLAW: { name: "Savage Claw" },
	WICKED_TALON: { name: "Wicked Talon" },

	DOUBLE_DOWN: { name: "Double Down" },

	REIGN_OF_BEASTS: { name: "Reign of Beasts" },
	NOBLE_BLOOD: { name: "Noble Blood" },
	LION_HEART: { name: "Lion Heart" },

	CONTINUATION: { name: "Continuation" },
	HYPERVELOCITY: { name: "Hypervelocity" },
	FATED_BRAND: { name: "Fated Brand" },
	JUGULAR_RIP: { name: "Jugular Rip" },
	ABDOMEN_TEAR: { name: "Abdomen Tear" },
	EYE_GOUGE: { name: "Eye Gouge" },

	DANGER_ZONE: { name: "Danger Zone" },
	BLASTING_ZONE: { name: "Blasting Zone" },
	BOW_SHOCK: { name: "Bow Shock" },
	TRAJECTORY: { name: "Trajectory" },

	HEART_OF_STONE: { name: "Heart of Stone" },
	HEART_OF_CORUNDUM: { name: "Heart of Corundum" },
	SUPERBOLIDE: { name: "Superbolide" },
	CAMOUFLAGE: { name: "Camouflage" },
	NEBULA: { name: "Nebula" },
	GREAT_NEBULA: { name: "Great Nebula" },
	HEART_OF_LIGHT: { name: "Heart of Light" },
	AURORA: { name: "Aurora" },
	ROYAL_GUARD: { name: "Royal Guard" },
	RELEASE_ROYAL_GUARD: { name: "Release Royal Guard" },
});

export type GNBActions = typeof GNB;
export type GNBActionKey = keyof GNBActions;
