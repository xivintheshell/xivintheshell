import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Resource } from "../type";

export const DNC_GAUGES = ensureRecord<Resource>()({
	ESPRIT_GAUGE: { name: "EspritGauge", label: { zh: "伶俐量值" } },
	FEATHER_GAUGE: { name: "Feathers", label: { zh: "幻扇" } },
	STANDARD_DANCE: { name: "Standard Dance", label: { zh: "标准舞步" } },
	TECHNICAL_DANCE: { name: "Technical Dance", label: { zh: "技巧舞步" } },
});
export type DNCGauges = typeof DNC_GAUGES;
export type DNCGaugeKey = keyof DNCGauges;

export const DNC_STATUSES = ensureRecord<Resource>()({
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
export type DNCStatuses = typeof DNC_STATUSES;
export type DNCStatusKey = keyof DNCStatuses;

export const DNC_TRACKERS = ensureRecord<Resource>()({
	CASCADE_COMBO: { name: "CascadeCombo", label: { zh: "瀑泻连击" } },
	WINDMILL_COMBO: { name: "WindmillCombo", label: { zh: "风车连击" } },
	STANDARD_BONUS: { name: "StandardBonus", label: { zh: "小舞连击" } },
	TECHNICAL_BONUS: { name: "TechnicalBonus", label: { zh: "大舞连击" } },
});
export type DNCTrackers = typeof DNC_TRACKERS;
export type DNCTrackerKey = keyof DNCTrackers;

export const DNC = {
	...DNC_GAUGES,
	...DNC_STATUSES,
	...DNC_TRACKERS,
};
export type DNCResources = typeof DNC;
export type DNCResourceKey = keyof DNCResources;
