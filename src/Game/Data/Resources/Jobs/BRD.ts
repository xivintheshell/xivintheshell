import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Resource } from "../type";

export const BRD_GAUGES = ensureRecord<Resource>()({
	SONG_TIMER: { name: "SongTimer" },
	SOUL_VOICE: { name: "Soul Voice" },
	PITCH_PERFECT: { name: "Pitch Perfect" }, // Yes it's all technically Repertoire, easier to represent this way
	REPERTOIRE: { name: "Repertoire" }, // Army's Paeon repertoire stacks
	WANDERERS_CODA: { name: "Wanderer's Coda" },
	MAGES_CODA: { name: "Mage's Coda" },
	ARMYS_CODA: { name: "Army's Coda" },
});
export type BRDGauges = typeof BRD_GAUGES;
export type BRDGaugeKey = keyof BRDGauges;

export const BRD_STATUSES = ensureRecord<Resource>()({
	HAWKS_EYE: { name: "Hawk's Eye" },
	RAGING_STRIKES: { name: "Raging Strikes" },
	BARRAGE: { name: "Barrage" },
	ARMYS_MUSE: { name: "Army's Muse" },
	ARMYS_ETHOS: { name: "Army's Ethos" },
	BLAST_ARROW_READY: { name: "Blast Arrow Ready" },
	RESONANT_ARROW_READY: { name: "Resonant Arrow Ready" },
	RADIANT_ENCORE_READY: { name: "Radiant Encore Ready" },
	CAUSTIC_BITE: { name: "Caustic Bite" },
	STORMBITE: { name: "Stormbite" },
	MAGES_BALLAD: { name: "Mage's Ballad" },
	ARMYS_PAEON: { name: "Army's Paeon" },
	WANDERERS_MINUET: { name: "Wanderer's Minuet" },
	BATTLE_VOICE: { name: "Battle Voice" },
	WARDENS_PAEAN: { name: "Warden's Paean" },
	TROUBADOUR: { name: "Troubadour" },
	NATURES_MINNE: { name: "Nature's Minne" },
	RADIANT_FINALE: { name: "Radiant Finale" },
});
export type BRDStatuses = typeof BRD_STATUSES;
export type BRDStatusKey = keyof BRDStatuses;

export const BRD_TRACKERS = ensureRecord<Resource>()({
	RADIANT_CODA: { name: "Radiant Coda" },
	MUSE_REPERTOIRE: { name: "Muse Repertoire" },
	ETHOS_REPERTOIRE: { name: "Ethos Repertoire" },
});
export type BRDTrackers = typeof BRD_TRACKERS;
export type BRDTrackerKey = keyof BRDTrackers;

export const BRD = {
	...BRD_GAUGES,
	...BRD_STATUSES,
	...BRD_TRACKERS,
};
export type BRDResources = typeof BRD;
export type BRDResourceKey = keyof BRDResources;
