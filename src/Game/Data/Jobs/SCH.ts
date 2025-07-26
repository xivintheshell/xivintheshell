import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const SCH_ACTIONS = ensureRecord<ActionData>()({
	PHYSICK: {
		id: 190,
		name: "Physick",
		label: {
			zh: "医术",
			ja: "フィジク",
		},
	},
	SUMMON_EOS: {
		id: 17215,
		name: "Summon Eos",
		label: {
			zh: "朝日召唤",
			ja: "サモン・エオス",
		},
	},
	RESURRECTION: {
		id: 173,
		name: "Resurrection",
		label: {
			zh: "复生",
			ja: "リザレク",
		},
	},
	WHISPERING_DAWN: {
		id: 803,
		name: "Whispering Dawn",
		label: {
			zh: "仙光的低语",
			ja: "光の囁き",
		},
	},
	BIO_II: {
		id: 17865,
		name: "Bio II",
		label: {
			zh: "猛毒菌",
			ja: "バイオラ",
		},
	},
	ADLOQUIUM: {
		id: 185,
		name: "Adloquium",
		label: {
			zh: "鼓舞激励之策",
			ja: "鼓舞激励の策",
		},
	},
	SUCCOR: {
		id: 186,
		name: "Succor",
		label: {
			zh: "士气高扬之策",
			ja: "士気高揚の策",
		},
	},
	RUIN_II: {
		id: 17870,
		name: "Ruin II",
		label: {
			zh: "毁坏",
			ja: "ルインラ",
		},
	},
	FEY_ILLUMINATION: {
		id: 805,
		name: "Fey Illumination",
		label: {
			zh: "异想的幻光",
			ja: "フェイイルミネーション",
		},
	},
	AETHERFLOW: {
		id: 166,
		name: "Aetherflow",
		label: {
			zh: "以太超流",
			ja: "エーテルフロー",
		},
	},
	ENERGY_DRAIN: {
		id: 167,
		name: "Energy Drain",
		label: {
			zh: "能量吸收",
			ja: "エナジードレイン",
		},
	},
	LUSTRATE: {
		id: 189,
		name: "Lustrate",
		label: {
			zh: "生命活性法",
			ja: "生命活性法",
		},
	},
	ART_OF_WAR: {
		id: 16539,
		name: "Art of War",
		label: {
			zh: "破阵法",
			ja: "破陣法",
		},
	},
	SACRED_SOIL: {
		id: 188,
		name: "Sacred Soil",
		label: {
			zh: "野战治疗阵",
			ja: "野戦治療の陣",
		},
	},
	INDOMITABILITY: {
		id: 3583,
		name: "Indomitability",
		label: {
			zh: "不屈不挠之策",
			ja: "不撓不屈の策",
		},
	},
	DEPLOYMENT_TACTICS: {
		id: 3585,
		name: "Deployment Tactics",
		label: {
			zh: "展开战术",
			ja: "展開戦術",
		},
	},
	EMERGENCY_TACTICS: {
		id: 3586,
		name: "Emergency Tactics",
		label: {
			zh: "应急战术",
			ja: "応急戦術",
		},
	},
	DISSIPATION: {
		id: 3587,
		name: "Dissipation",
		label: {
			zh: "转化",
			ja: "転化",
		},
	},
	EXCOGITATION: {
		id: 7434,
		name: "Excogitation",
		label: {
			zh: "深谋远虑之策",
			ja: "深謀遠慮の策",
		},
	},
	BROIL_II: {
		id: 7435,
		name: "Broil II",
		label: {
			zh: "魔炎法",
			ja: "魔炎法",
		},
	},
	CHAIN_STRATAGEM: {
		id: 7436,
		name: "Chain Stratagem",
		label: {
			zh: "连环计",
			ja: "連環計",
		},
	},
	AETHERPACT: {
		id: 7437,
		name: "Aetherpact",
		label: {
			zh: "以太契约",
			ja: "エーテルパクト",
		},
	},
	DISSOLVE_UNION: {
		id: 7869,
		name: "Dissolve Union",
		label: {
			zh: "融光解除",
			ja: "フェイユニオン解除",
		},
	},
	BIOLYSIS: {
		id: 16540,
		name: "Biolysis",
		label: {
			zh: "蛊毒法",
			ja: "蠱毒法",
		},
	},
	BROIL_III: {
		id: 16541,
		name: "Broil III",
		label: {
			zh: "死炎法",
			ja: "死炎法",
		},
	},
	RECITATION: {
		id: 16542,
		name: "Recitation",
		label: {
			zh: "秘策",
			ja: "秘策",
		},
	},
	FEY_BLESSING: {
		id: 16543,
		name: "Fey Blessing",
		label: {
			zh: "异想的祥光",
			ja: "フェイブレッシング",
		},
	},
	SUMMON_SERAPH: {
		id: 16545,
		name: "Summon Seraph",
		label: {
			zh: "炽天召唤",
			ja: "サモン・セラフィム",
		},
	},
	CONSOLATION: {
		id: 16546,
		name: "Consolation",
		label: {
			zh: "慰藉",
			ja: "コンソレイション",
		},
	},
	BROIL_IV: {
		id: 25865,
		name: "Broil IV",
		label: {
			zh: "极炎法",
			ja: "極炎法",
		},
	},
	ART_OF_WAR_II: {
		id: 25866,
		name: "Art of War II",
		label: {
			zh: "裂阵法",
			ja: "裂陣法",
		},
	},
	PROTRACTION: {
		id: 25867,
		name: "Protraction",
		label: {
			zh: "生命回生法",
			ja: "生命回生法",
		},
	},
	EXPEDIENT: {
		id: 25868,
		name: "Expedient",
		label: {
			zh: "疾风怒涛之计",
			ja: "疾風怒濤の計",
		},
	},
	BANEFUL_IMPACTION: {
		id: 37012,
		name: "Baneful Impaction",
		label: {
			zh: "埋伏之毒",
			ja: "埋伏の毒",
		},
	},
	CONCITATION: {
		id: 37013,
		name: "Concitation",
		label: {
			zh: "意气轩昂之策",
			ja: "意気軒昂の策",
		},
	},
	SERAPHISM: {
		id: 37014,
		name: "Seraphism",
		label: {
			zh: "炽天附体",
			ja: "セラフィズム",
		},
	},
	MANIFESTATION: {
		id: 37015,
		name: "Manifestation",
		label: {
			zh: "显灵之章",
			ja: "マニフェステーション",
		},
	},
	ACCESSION: {
		id: 37016,
		name: "Accession",
		label: {
			zh: "降临之章",
			ja: "アクセッション",
		},
	},
	// Pet action
	ANGELS_WHISPER: {
		name: "Angel's Whisper",
		label: {
			zh: "天使的低语",
		},
	},
});

export const SCH_COOLDOWNS = ensureRecord<CooldownData>()({
	cd_WHISPERING_DAWN: { name: "cd_WhisperingDawn" },
	cd_FEY_ILLUMINATION: { name: "cd_FeyIllumination" },
	cd_AETHERFLOW: { name: "cd_Aetherflow" },
	cd_ENERGY_DRAIN: { name: "cd_EnergyDrain" },
	cd_LUSTRATE: { name: "cd_Lustrate" },
	cd_SACRED_SOIL: { name: "cd_SacredSoil" },
	cd_INDOMITABILITY: { name: "cd_Indomitability" },
	cd_DEPLOYMENT_TACTICS: { name: "cd_DeploymentTactics" },
	cd_EMERGENCY_TACTICS: { name: "cd_EmergencyTactics" },
	cd_DISSIPATION: { name: "cd_Dissipation" },
	cd_EXCOGITATION: { name: "cd_Excogitation" },
	cd_CHAIN_STRATAGEM: { name: "cd_ChainStratagem" },
	cd_AETHERPACT: { name: "cd_Aetherpact" },
	cd_DISSOLVE_UNION: { name: "cd_DissolveUnion" },
	cd_RECITATION: { name: "cd_Recitation" },
	cd_FEY_BLESSING: { name: "cd_FeyBlessing" },
	cd_SUMMON_SERAPH: { name: "cd_SummonSeraph" },
	cd_CONSOLATION: { name: "cd_Consolation" },
	cd_CONSOLATION_INTERNAL: { name: "cd_ConsolationInternal" },
	cd_PROTRACTION: { name: "cd_Protraction" },
	cd_EXPEDIENT: { name: "cd_Expedient" },
	cd_BANEFUL_IMPACTION: { name: "cd_BanefulImpaction" },
	cd_SERAPHISM: { name: "cd_Seraphism" },
});

export const SCH_GAUGES = ensureRecord<ResourceData>()({
	AETHERFLOW: { name: "Aetherflow", maximumCharges: 3, label: { zh: "以太超流" } },
	FAERIE_GAUGE: { name: "Faerie Gauge", maximumStacks: 100, label: { zh: "异想以太" } },
});

export const SCH_STATUSES = ensureRecord<ResourceData>()({
	BIO_II: { name: "Bio II", label: { zh: "猛毒菌" } },
	CATALYZE: { name: "Catalyze", label: { zh: "激励" } },
	GALVANIZE: { name: "Galvanize", label: { zh: "鼓舞" } },
	WHISPERING_DAWN: { name: "Whispering Dawn", label: { zh: "仙光的低语" } },
	ANGELS_WHISPER: { name: "Angel's Whisper", label: { zh: "天使的低语" } },
	FEY_ILLUMINATION: { name: "Fey Illumination", label: { zh: "异想的幻光" } },
	SERAPHIC_ILLUMINATION: { name: "Seraphic Illumination", label: { zh: "炽天的幻光" } },
	SACRED_SOIL_MIT: {
		name: "Sacred Soil (Mitigation)",
		label: { zh: "野战治疗阵[减伤]" },
		mayNotBeCanceled: true,
	},
	SACRED_SOIL_ZONE: {
		name: "Sacred Soil",
		label: { zh: "野战治疗阵" },
		mayBeToggled: true,
	},
	EMERGENCY_TACTICS: { name: "Emergency Tactics", label: { zh: "应急战术" } },
	DISSIPATION: { name: "Dissipation", label: { zh: "转化" }, mayNotBeCanceled: true },
	EXCOGITATION: { name: "Excogitation", label: { zh: "深谋远虑之策" } },
	CHAIN_STRATAGEM: { name: "Chain Stratagem", label: { zh: "连环计" } },
	IMPACT_IMMINENT: { name: "Impact Imminent", label: { zh: "埋伏之毒预备" } },
	BIOLYSIS: { name: "Biolysis", label: { zh: "蛊毒法" } },
	RECITATION: { name: "Recitation", label: { zh: "秘策" } },
	FEY_UNION: { name: "Fey Union", label: { zh: "异想的融光" } },
	SERAPHIC_VEIL: { name: "Seraphic Veil", label: { zh: "炽天的幕帘" } },
	PROTRACTION: { name: "Protraction", label: { zh: "生命回生法" } },
	EXPEDIENCE: { name: "Expedience", label: { zh: "疾风之计" } },
	DESPERATE_MEASURES: { name: "Desperate Measures", label: { zh: "怒涛之计" } },
	BANEFUL_IMPACTION: { name: "Baneful Impaction", label: { zh: "埋伏之毒" } },
	SERAPHISM: { name: "Seraphism", label: { zh: "炽天附体" }, mayNotBeCanceled: true },
	SERAPHISM_REGEN: { name: "Seraphism (Regen)", label: { zh: "炽天附体[回]" } },
});

export const SCH_TRACKERS = ensureRecord<ResourceData>()({
	SERAPH_SUMMON_TIMER: { name: "Seraph Summon Timer", label: { zh: "炽天的召唤时间" } },
});

export const SCH_TRAITS = ensureRecord<TraitData>()({
	CORRUPTION_MASTERY_II: { name: "Corruption Mastery II", level: 72 },
	BROIL_MASTERY_III: { name: "Broil Mastery III", level: 72 },
	ENHANCED_SACRED_SOIL: { name: "Enhanced Sacred Soil", level: 78 },
	BROIL_MASTERY_IV: { name: "Broil Mastery IV", level: 82 },
	ART_OF_WAR_MASTERY: { name: "Art of War Mastery", level: 82 },
	ENHANCED_DEPLOYMENT_TACTICS: { name: "Enhanced Deployment Tactics", level: 88 },
	ENHANCED_CHAIN_STRATAGEM: { name: "Enhanced Chain Stratagem", level: 92 },
	TACTICIANS_MASTERY: { name: "Tactician's Mastery", level: 94 },
	SUCCOR_MASTERY: { name: "Succor Mastery", level: 96 },
	ENHANCED_RECITATION: { name: "Enhanced Recitation", level: 98 },
});

export type SCHActions = typeof SCH_ACTIONS;
export type SCHActionKey = keyof SCHActions;

export type SCHCooldowns = typeof SCH_COOLDOWNS;
export type SCHCooldownKey = keyof SCHCooldowns;

export type SCHGauges = typeof SCH_GAUGES;
export type SCHGaugeKey = keyof SCHGauges;

export type SCHStatuses = typeof SCH_STATUSES;
export type SCHStatusKey = keyof SCHStatuses;

export type SCHTrackers = typeof SCH_TRACKERS;
export type SCHTrackerKey = keyof SCHTrackers;

export const SCH_RESOURCES = {
	...SCH_GAUGES,
	...SCH_STATUSES,
	...SCH_TRACKERS,
};
export type SCHResources = typeof SCH_RESOURCES;
export type SCHResourceKey = keyof SCHResources;

export type SCHTraits = typeof SCH_TRAITS;
export type SCHTraitKey = keyof SCHTraits;
