import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Action } from "../type";

export const BRD = ensureRecord<Action>()({
	HEAVY_SHOT: { name: "Heavy Shot" },
	QUICK_NOCK: { name: "Quick Nock" },
	BLOODLETTER: { name: "Bloodletter" },
	BARRAGE: { name: "Barrage" },
	RAGING_STRIKES: { name: "Raging Strikes" },
	REPELLING_SHOT: { name: "Repelling Shot" },
	WIDE_VOLLEY: { name: "Wide Volley" },
	MAGES_BALLAD: { name: "Mage's Ballad" },
	ARMYS_PAEON: { name: "Army's Paeon" },
	RAIN_OF_DEATH: { name: "Rain Of Death" },
	BATTLE_VOICE: { name: "Battle Voice" },
	EMYPREAL_ARROW: { name: "Empyreal Arrow" },
	WANDERERS_MINUET: { name: "Wanderer's Minuet" },
	IRON_JAWS: { name: "Iron Jaws" },
	WARDENS_PAEAN: { name: "Warden's Paean" },
	SIDEWINDER: { name: "Sidewinder" },
	PITCH_PERFECT: { name: "Pitch Perfect" },
	TROUBADOUR: { name: "Troubadour" },
	CAUSTIC_BITE: { name: "Caustic Bite" },
	STORMBITE: { name: "Stormbite" },
	NATURES_MINNE: { name: "Nature's Minne" },
	REFULGENT_ARROW: { name: "Refulgent Arrow" },
	SHADOWBITE: { name: "Shadowbite" },
	BURST_SHOT: { name: "Burst Shot" },
	APEX_ARROW: { name: "Apex Arow" },
	LADONSBITE: { name: "Ladonsbite" },
	BLAST_ARROW: { name: "Blast Arrow" },
	RADIANT_FINALE: { name: "Radiant Finale" },
	HEARTBREAK_SHOT: { name: "Heartbreak Shot" },
	RESONANT_ARROW: { name: "Resonant Arrow" },
	RADIANT_ENCORE: { name: "Radiant Encore" },
});

export type BRDActions = typeof BRD;
export type BRDActionKey = keyof BRDActions;
