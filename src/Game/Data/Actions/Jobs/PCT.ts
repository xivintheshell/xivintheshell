import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Action } from "../type";

export const PCT = ensureRecord<Action>()({
	FIRE_IN_RED: { name: "Fire in Red" },
	AERO_IN_GREEN: { name: "Aero in Green" },
	WATER_IN_BLUE: { name: "Water in Blue" },
	FIRE_II_IN_RED: { name: "Fire II in Red" },
	AERO_II_IN_GREEN: { name: "Aero II in Green" },
	WATER_II_IN_BLUE: { name: "Water II in Blue" },
	BLIZZARD_IN_CYAN: { name: "Blizzard in Cyan" },
	THUNDER_IN_MAGENTA: { name: "Thunder in Magenta" },
	STONE_IN_YELLOW: { name: "Stone in Yellow" },
	BLIZZARD_II_IN_CYAN: { name: "Blizzard II in Cyan" },
	STONE_II_IN_YELLOW: { name: "Stone II in Yellow" },
	THUNDER_II_IN_MAGENTA: { name: "Thunder II in Magenta" },
	HOLY_IN_WHITE: { name: "Holy in White" },
	COMET_IN_BLACK: { name: "Comet in Black" },
	RAINBOW_DRIP: { name: "Rainbow Drip" },
	STAR_PRISM: { name: "Star Prism" },

	TEMPERA_COAT: { name: "Tempera Coat" },
	TEMPERA_GRASSA: { name: "Tempera Grassa" },
	TEMPERA_COAT_POP: { name: "Pop Tempera Coat" },
	TEMPERA_GRASSA_POP: { name: "Pop Tempera Grassa" },
	SMUDGE: { name: "Smudge" },
	SUBTRACTIVE_PALETTE: { name: "Subtractive Palette" },

	CREATURE_MOTIF: { name: "Creature Motif" },
	POM_MOTIF: { name: "Pom Motif" },
	WING_MOTIF: { name: "Wing Motif" },
	CLAW_MOTIF: { name: "Claw Motif" },
	MAW_MOTIF: { name: "Maw Motif" },
	LIVING_MUSE: { name: "Living Muse" },
	POM_MUSE: { name: "Pom Muse" },
	WINGED_MUSE: { name: "Winged Muse" },
	CLAWED_MUSE: { name: "Clawed Muse" },
	FANGED_MUSE: { name: "Fanged Muse" },
	MOG_OF_THE_AGES: { name: "Mog of the Ages" },
	RETRIBUTION_OF_THE_MADEEN: { name: "Retribution of the Madeen" },

	WEAPON_MOTIF: { name: "Weapon Motif" },
	STEEL_MUSE: { name: "Steel Muse" },
	HAMMER_MOTIF: { name: "Hammer Motif" },
	STRIKING_MUSE: { name: "Striking Muse" },
	HAMMER_STAMP: { name: "Hammer Stamp" },
	HAMMER_BRUSH: { name: "Hammer Brush" },
	POLISHING_HAMMER: { name: "Polishing Hammer" },

	LANDSCAPE_MOTIF: { name: "Landscape Motif" },
	SCENIC_MUSE: { name: "Scenic Muse" },
	STARRY_SKY_MOTIF: { name: "Starry Sky Motif" },
	STARRY_MUSE: { name: "Starry Muse" },
});

export type PCTActions = typeof PCT;
export type PCTActionKey = keyof PCTActions;
