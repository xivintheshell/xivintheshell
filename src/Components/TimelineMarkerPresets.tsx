import { Language, getCurrentLanguage, LocalizedContent } from "./Localization";

export type FightKind = "savage" | "extreme" | "ultimate" | "dungeon" | "fieldop";

export function displayFightKind(k: FightKind) {
	const lang = getCurrentLanguage();
	if (lang === "en") {
		if (k === "fieldop") {
			return "Field Operations";
		} else if (k === "dungeon") {
			return "Dungeons";
		} else if (k === "ultimate") {
			return "Ultimates";
		} else {
			return k[0].toUpperCase() + k.substring(1);
		}
	} else if (lang === "zh") {
		if (k === "savage") {
			return "零式";
		} else if (k === "extreme") {
			return "极神";
		} else if (k === "ultimate") {
			return "绝本";
		} else {
			return "四人本";
		}
	}
	return k;
}

// This metadata is NOT encoded with the track JSON files, but instead maintained statically here.
// It is used to generate the table of marker presets, but since we don't want to bloat the bundle
// size by importing each JSON file at compile time, we instead just manually update the metadata
// list when a new track is added.
// Phased fight files (but not their component phases) are loaded dynamically since they're smaller
// and we need to know the offsets of individual files.
export type MarkerTrackMeta = {
	name: LocalizedContent;
	fightKind: FightKind;
	supportedLanguages: Language[];
	// The authors field may be omitted or left empty if part of a trackset, in which case
	// the author of the trackset will be used instead.
	authors?: string[];
	phased: boolean;
};

function mm(
	name: string | LocalizedContent,
	fightKind: FightKind,
	supportedLanguages: Language | Language[],
	authors?: string | string[],
	phased?: boolean,
): MarkerTrackMeta {
	return {
		name:
			typeof name === "string"
				? {
						en: name,
						zh: name,
					}
				: name,
		fightKind,
		supportedLanguages:
			typeof supportedLanguages === "string" ? [supportedLanguages] : supportedLanguages,
		authors: typeof authors === "string" ? [authors] : authors,
		phased: phased ?? false,
	};
}

// When adding a new fight, add  its metadata to this map, and add its label to the appropriate track category list.
export const TRACK_META_MAP: Map<string, MarkerTrackMeta> = new Map([
	["m5s", mm("M5S", "savage", "en", "shanzhe")],
	["m6s", mm("M6S", "savage", "en", "shanzhe")],
	["m7s", mm("M7S", "savage", "en", "shanzhe")],
	["m8s_full", mm("M8S", "savage", "en", "shanzhe", true)],
	["final_verse_q40", mm("The Final Verse Q40", "dungeon", "en", "shanzhe")],
	["dsr_p2", mm("DSR P2", "ultimate", "en", "Caro")],
	["dsr_p6", mm("DSR P6", "ultimate", "en", "Tischel")],
	["dsr_p7", mm("DSR P7", "ultimate", "en", "Tischel")],
	["TOP_2023_04_02", mm("TOP", "ultimate", "en", "Santa")],
	["m2s", mm("M2S", "savage", "en", "shanzhe")],
	["m3s", mm("M3S", "savage", "en", "shanzhe")],
	["m4s", mm("M4S", "savage", "en", "shanzhe")],
	["m1s_zh", mm("M1S", "savage", "zh", "kiyozero")],
	["m2s_zh", mm("M2S", "savage", "zh", "kiyozero")],
	["m3s_zh", mm("M3S", "savage", "zh", "kiyozero")],
	["m4s_zh", mm("M4S", "savage", "zh", "kiyozero")],
	["fru_en_full", mm({ en: "FRU", zh: "绝伊甸" }, "ultimate", "en", ["Yara", "shanzhe"], true)],
	["fru_zh", mm({ en: "FRU", zh: "绝伊甸" }, "ultimate", "zh", ["小盐", "czmm"])],
	["queen_eternal", mm({ en: "Queen Eternal", zh: "永恒女王" }, "extreme", "zh", "小盐")],
	["p1s_aetherial_shackles_first", mm("P1S Aetherial Shackles first", "savage", "en")],
	["p1s_shackles_of_time_first", mm("P1S Shackles of Time first", "savage", "en")],
	["p2s", mm("P2S", "savage", "en")],
	["p5s_zh", mm("P5S", "savage", "zh", "不打冰3攻略组")],
	["p6s_zh", mm("P6S", "savage", "zh", "不打冰3攻略组")],
	["p7s_zh", mm("P7S", "savage", "zh", "不打冰3攻略组")],
	[
		"p8s_p1_snake_zh",
		mm({ en: "P8S P1 snake first", zh: "P8S门神蛇轴" }, "savage", "zh", "不打冰3攻略组"),
	],
	[
		"p8s_p1_beast_zh",
		mm({ en: "P8S P1 dog first", zh: "P8S门神车轴" }, "savage", "zh", "不打冰3攻略组"),
	],
	["p8s_p2_zh", mm({ en: "P8S P2", zh: "P8S本体" }, "savage", "zh", "不打冰3攻略组")],
	["p9s", mm("P9S", "savage", "en", "Lilian")],
	["p10s", mm("P10S", "savage", "en", "Tischel")],
	["p11s", mm("P11S", "savage", "en", "Lilian")],
	["p12s_p1", mm("P12S P1", "savage", "en", "Yara")],
	["p12s_p2", mm("P12S P2", "savage", "en", "Yara")],
	["p9s_zh", mm("P9S", "savage", "zh", "不打冰3攻略组")],
	["p10s_zh", mm("P10S", "savage", "zh", "不打冰3攻略组")],
	["p11s_zh", mm("P11S（错误较多）", "savage", "zh", "不打冰3攻略组")],
	["p12s_p1_zh", mm("P12S门神", "savage", "zh", "不打冰3攻略组")],
	["p12s_p2_zh", mm("P12S本体", "savage", "zh", "不打冰3攻略组")],
]);

export const RECENT_CONTENT_TRACKS = [
	"final_verse_q40",
	"m5s",
	"m6s",
	"m7s",
	"m8s_full",
	"fru_en_full",
	"fru_zh",
];

export const LEGACY_ULTIMATE_TRACKS = ["dsr_p2", "dsr_p6", "dsr_p7", "TOP_2023_04_02"];

export const ARCHIVE_TRACKS = new Map([
	[
		"7.0-7.3",
		[
			"m2s",
			"m3s",
			"m4s",
			"m1s_zh",
			"m2s_zh",
			"m3s_zh",
			"m4s_zh",
			"fru_en_full",
			"fru_zh",
			"queen_eternal",
			"m5s",
			"m6s",
			"m7s",
			"m8s_full",
			"final_verse_q40",
		],
	],
	[
		"6.X",
		[
			"p1s_aetherial_shackles_first",
			"p1s_shackles_of_time_first",
			"p2s",
			"dsr_p2",
			"dsr_p6",
			"dsr_p7",
			"p5s_zh",
			"p6s_zh",
			"p7s_zh",
			"p8s_p1_snake_zh",
			"p8s_p1_beast_zh",
			"p8s_p2_zh",
			"p9s",
			"p9s_zh",
			"TOP_2023_04_02",
			"p9s",
			"p10s",
			"p11s",
			"p12s_p1",
			"p12s_p2",
			"p9s_zh",
			"p10s_zh",
			"p11s_zh",
			"p12s_p1_zh",
			"p12s_p2_zh",
		],
	],
]);
