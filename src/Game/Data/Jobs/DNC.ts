import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const DNC_ACTIONS = ensureRecord<ActionData>()({
	STANDARD_FINISH: { id: 16003, name: "Standard Finish", label: { zh: "标准舞步结束" } },
	SINGLE_STANDARD_FINISH: {
		id: 16191,
		name: "Single Standard Finish",
		label: { zh: "单色标准舞步结束" },
	},
	DOUBLE_STANDARD_FINISH: {
		id: 16192,
		name: "Double Standard Finish",
		label: { zh: "双色标准舞步结束" },
	},
	FINISHING_MOVE: { id: 36984, name: "Finishing Move", label: { zh: "结束动作" } },
	LAST_DANCE: { id: 36983, name: "Last Dance", label: { zh: "落幕舞" } },
	TECHNICAL_FINISH: { id: 16004, name: "Technical Finish", label: { zh: "技巧舞步结束" } },
	SINGLE_TECHNICAL_FINISH: {
		id: 16193,
		name: "Single Technical Finish",
		label: { zh: "单色技巧舞步结束" },
	},
	DOUBLE_TECHNICAL_FINISH: {
		id: 16194,
		name: "Double Technical Finish",
		label: { zh: "双色技巧舞步结束" },
	},
	TRIPLE_TECHNICAL_FINISH: {
		id: 16195,
		name: "Triple Technical Finish",
		label: { zh: "三色技巧舞步结束" },
	},
	QUADRUPLE_TECHNICAL_FINISH: {
		id: 16196,
		name: "Quadruple Technical Finish",
		label: { zh: "四色技巧舞步结束" },
	},
	TILLANA: { id: 25790, name: "Tillana", label: { zh: "提拉纳" } },
	CASCADE: { id: 15989, name: "Cascade", label: { zh: "瀑泻" } },
	FOUNTAIN: { id: 15990, name: "Fountain", label: { zh: "喷泉" } },
	REVERSE_CASCADE: { id: 15991, name: "Reverse Cascade", label: { zh: "逆瀑泻" } },
	FOUNTAINFALL: { id: 15992, name: "Fountainfall", label: { zh: "坠喷泉" } },
	WINDMILL: { id: 15993, name: "Windmill", label: { zh: "风车" } },
	BLADESHOWER: { id: 15994, name: "Bladeshower", label: { zh: "落刃雨" } },
	RISING_WINDMILL: { id: 15995, name: "Rising Windmill", label: { zh: "升风车" } },
	BLOODSHOWER: { id: 15996, name: "Bloodshower", label: { zh: "落血雨" } },
	STANDARD_STEP: { id: 15997, name: "Standard Step", label: { zh: "标准舞步" } },
	TECHNICAL_STEP: { id: 15998, name: "Technical Step", label: { zh: "技巧舞步" } },
	EMBOITE: { id: 15999, name: "Emboite", label: { zh: "蔷薇曲舞步" } },
	ENTRECHAT: { id: 16000, name: "Entrechat", label: { zh: "小鸟交叠跳" } },
	JETE: { id: 16001, name: "Jete", label: { zh: "绿叶小踢腿" } },
	PIROUETTE: { id: 16002, name: "Pirouette", label: { zh: "金冠趾尖转" } },
	SABER_DANCE: { id: 16005, name: "Saber Dance", label: { zh: "剑舞" } },
	DANCE_OF_THE_DAWN: { id: 36985, name: "Dance of the Dawn", label: { zh: "拂晓舞" } },
	CLOSED_POSITION: { id: 16006, name: "Closed Position", label: { zh: "闭式舞姿" } },
	FAN_DANCE: { id: 16007, name: "Fan Dance", label: { zh: "扇舞·序" } },
	FAN_DANCE_II: { id: 16008, name: "Fan Dance II", label: { zh: "扇舞·破" } },
	FAN_DANCE_III: { id: 16009, name: "Fan Dance III", label: { zh: "扇舞·急" } },
	FAN_DANCE_IV: { id: 25791, name: "Fan Dance IV", label: { zh: "扇舞·终" } },
	EN_AVANT: { id: 16010, name: "En Avant", label: { zh: "前冲步" } },
	DEVILMENT: { id: 16011, name: "Devilment", label: { zh: "进攻之探戈" } },
	STARFALL_DANCE: { id: 25792, name: "Starfall Dance", label: { zh: "流星舞" } },
	SHIELD_SAMBA: { id: 16012, name: "Shield Samba", label: { zh: "防守之桑巴" } },
	FLOURISH: { id: 16013, name: "Flourish", label: { zh: "百花争艳" } },
	IMPROVISATION: { id: 16014, name: "Improvisation", label: { zh: "即兴表演" } },
	IMPROVISED_FINISH: { id: 25789, name: "Improvised Finish", label: { zh: "即兴表演结束" } },
	CURING_WALTZ: { id: 16015, name: "Curing Waltz", label: { zh: "治疗之华尔兹" } },
	ENDING: { id: 18073, name: "Ending", label: { zh: "解除闭式舞姿" } },
});

export const DNC_COOLDOWNS = ensureRecord<CooldownData>()({
	cd_STANDARD_STEP: { name: "cd_StandardStep" },
	cd_TECHNICAL_STEP: { name: "cd_TechnicalStep" },
	cd_CLOSED_POSITION: { name: "cd_ClosedPosition" },
	cd_FAN_DANCE: { name: "cd_FanDance" },
	cd_FAN_DANCE_II: { name: "cd_FanDanceII", label: { zh: "CD：扇舞·破" } },
	cd_FAN_DANCE_III: { name: "cd_FanDanceIII", label: { zh: "CD：扇舞·急" } },
	cd_FAN_DANCE_IV: { name: "cd_FanDanceIV", label: { zh: "CD：扇舞·终" } },
	cd_EN_AVANT: { name: "cd_EnAvant" },
	cd_DEVILMENT: { name: "cd_Devilment" },
	cd_SHIELD_SAMBA: { name: "cd_ShieldSamba" },
	cd_FLOURISH: { name: "cd_Flourish" },
	cd_IMPROVISATION: { name: "cd_Improvisation" },
	cd_IMPROVISED_FINISH: { name: "cd_ImprovisedFinish" },
	cd_CURING_WALTZ: { name: "cd_CuringWaltz" },
	cd_ENDING: { name: "cd_Ending" },
});
export const DNC_GAUGES = ensureRecord<ResourceData>()({
	ESPRIT_GAUGE: { name: "EspritGauge", label: { zh: "伶俐量值" } },
	FEATHER_GAUGE: { name: "Feathers", label: { zh: "幻扇" } },
	STANDARD_DANCE: { name: "Standard Dance", label: { zh: "标准舞步" } },
	TECHNICAL_DANCE: { name: "Technical Dance", label: { zh: "技巧舞步" } },
});

export const DNC_STATUSES = ensureRecord<ResourceData>()({
	// Self Buffs
	SILKEN_SYMMETRY: { name: "Silken Symmetry", label: { zh: "对称投掷" } },
	SILKEN_FLOW: { name: "Silken Flow", label: { zh: "非对称投掷" } },
	FLOURISHING_SYMMETRY: { name: "Flourishing Symmetry", label: { zh: "对称投掷·百花争艳" } },
	FLOURISHING_FLOW: { name: "Flourishing Flow", label: { zh: "非对称投掷·百花争艳" } },
	THREEFOLD_FAN_DANCE: { name: "Threefold Fan Dance", label: { zh: "扇舞·急预备" } },
	FOURFOLD_FAN_DANCE: { name: "Fourfold Fan Dance", label: { zh: "扇舞·终预备" } },
	FINISHING_MOVE_READY: { name: "Finishing Move Ready", label: { zh: "结束动作预备" } },
	FLOURISHING_STARFALL: { name: "Flourishing Starfall", label: { zh: "流星舞预备" } },
	STANDARD_STEP: { name: "Standard Step", label: { zh: "标准舞步" }, mayNotBeCanceled: true },
	TECHNICAL_STEP: { name: "Technical Step", label: { zh: "技巧舞步" }, mayNotBeCanceled: true },
	LAST_DANCE_READY: { name: "Last Dance Ready", label: { zh: "落幕舞预备" } },
	DANCE_OF_THE_DAWN_READY: { name: "Dance of the Dawn Ready", label: { zh: "拂晓舞预备" } },
	FLOURISHING_FINISH: { name: "Flourishing Finish", label: { zh: "提拉纳预备" } },
	SHIELD_SAMBA: { name: "Shield Samba", label: { zh: "防守之桑巴" } },
	IMPROVISATION: { name: "Improvisation", label: { zh: "即兴表演" }, mayNotBeCanceled: true },
	RISING_RHYTHM: { name: "Rising Rhythm", label: { zh: "舞动的热情" }, maximumStacks: 4 },
	IMPROVISATION_REGEN: { name: "Improvisation Regen", label: { zh: "享受即兴表演" } },
	IMPROVISED_FINISH: { name: "Improvised Finish", label: { zh: "即兴表演结束" } },
	DEVILMENT: { name: "Devilment", label: { zh: "进攻之探戈" } },
	TECHNICAL_FINISH: { name: "Technical Finish", label: { zh: "技巧舞步结束" } },
	ESPRIT: { name: "Esprit", label: { zh: "伶俐" }, mayNotBeCanceled: true },
	STANDARD_FINISH: { name: "Standard Finish", label: { zh: "标准舞步结束" } },
	CLOSED_POSITION: { name: "Closed Position", label: { zh: "闭式舞姿" }, mayNotBeCanceled: true },

	// Partner buffs
	DANCE_PARTNER: { name: "Dance Partner", label: { zh: "舞伴" } },
	STANDARD_FINISH_PARTNER: { name: "Standard Finish Partner", label: { zh: "舞伴小舞buff" } },
	ESPRIT_PARTNER: { name: "Esprit Partner", label: { zh: "舞伴伶俐buff" } },
	ESPRIT_TECHNICAL: { name: "Esprit Technical", label: { zh: "大舞伶俐buff" } },
});

export const DNC_TRACKERS = ensureRecord<ResourceData>()({
	CASCADE_COMBO: { name: "CascadeCombo", label: { zh: "瀑泻连击" } },
	WINDMILL_COMBO: { name: "WindmillCombo", label: { zh: "风车连击" } },
	STANDARD_BONUS: { name: "StandardBonus", label: { zh: "小舞连击" } },
	TECHNICAL_BONUS: { name: "TechnicalBonus", label: { zh: "大舞连击" } },
});

export const DNC_TRAITS = ensureRecord<TraitData>()({
	ESPRIT: { name: "Esprit", level: 76 },
	ENHANCED_EN_AVANT_II: { name: "Enhanced En Avant II", level: 78 },
	ENHANCED_TECHNICAL_FINISH: { name: "Enhanced Technical Finish", level: 82 },
	ENHANCED_ESPRIT: { name: "Enhanced Esprit", level: 84 },
	ENHANCED_FLOURISH: { name: "Enhanced Flourish", level: 86 },
	ENHANCED_SHIELD_SAMBA: { name: "Enhanced Shield Samba", level: 88 },
	ENHANCED_DEVILMENT: { name: "Enhanced Devilment", level: 90 },
	ENHANCED_STANDARD_FINISH: { name: "Enhanced Standard Finish", level: 92 },
	DYNAMIC_DANCER: { name: "Dynamic Dancer", level: 94 },
	ENHANCED_FLOURISH_II: { name: "Enhanced Flourish II", level: 96 },
	ENHANCED_TECHNICAL_FINISH_II: { name: "Enhanced Technical Finish II", level: 100 },
});

export type DNCActions = typeof DNC_ACTIONS;
export type DNCActionKey = keyof DNCActions;

export type DNCCooldowns = typeof DNC_COOLDOWNS;
export type DNCCooldownKey = keyof DNCCooldowns;

export type DNCGauges = typeof DNC_GAUGES;
export type DNCGaugeKey = keyof DNCGauges;

export type DNCStatuses = typeof DNC_STATUSES;
export type DNCStatusKey = keyof DNCStatuses;

export type DNCTrackers = typeof DNC_TRACKERS;
export type DNCTrackerKey = keyof DNCTrackers;

export const DNC_RESOURCES = {
	...DNC_GAUGES,
	...DNC_STATUSES,
	...DNC_TRACKERS,
};
export type DNCResources = typeof DNC_RESOURCES;
export type DNCResourceKey = keyof DNCResources;

export type DNCTraits = typeof DNC_TRAITS;
export type DNCTraitKey = keyof DNCTraits;
