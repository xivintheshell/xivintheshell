import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Action } from "../type";

export const MCH = ensureRecord<Action>()({
	HEATED_SPLIT_SHOT: { name: "Heated Split Shot", label: { zh: "热分裂弹" } },
	HEATED_SLUG_SHOT: { name: "Heated Slug Shot", label: { zh: "热独头弹" } },
	HEATED_CLEAN_SHOT: { name: "Heated Clean Shot", label: { zh: "热狙击弹" } },
	DRILL: { name: "Drill", label: { zh: "钻头" } },
	HOT_SHOT: { name: "Hot Shot", label: { zh: "热弹" } },
	AIR_ANCHOR: { name: "Air Anchor", label: { zh: "空气锚" } },
	CHAIN_SAW: { name: "Chain Saw", label: { zh: "回转飞锯" } },
	EXCAVATOR: { name: "Excavator", label: { zh: "掘地飞轮" } },
	GAUSS_ROUND: { name: "Gauss Round", label: { zh: "虹吸弹" } },
	DOUBLE_CHECK: { name: "Double Check", label: { zh: "双将" } },
	RICOCHET: { name: "Ricochet", label: { zh: "弹射" } },
	CHECKMATE: { name: "Checkmate", label: { zh: "将死" } },
	BLAZING_SHOT: { name: "Blazing Shot", label: { zh: "烈焰弹" } },
	WILDFIRE: { name: "Wildfire", label: { zh: "野火" } },
	DETONATOR: { name: "Detonator", label: { zh: "引爆装置" } },
	HYPERCHARGE: { name: "Hypercharge", label: { zh: "超荷" } },
	ROOK_AUTOTURRET: { name: "Rook Autoturret", label: { zh: "车式浮空炮塔" } },
	ROOK_OVERDRIVE: { name: "Rook Overdrive", label: { zh: "超档车式炮塔" } },
	AUTOMATON_QUEEN: { name: "Automaton Queen", label: { zh: "后式自走人偶" } },
	QUEEN_OVERDRIVE: { name: "Queen Overdrive", label: { zh: "超档后式人偶" } },
	BARREL_STABILIZER: { name: "Barrel Stabilizer", label: { zh: "枪管加热" } },
	REASSEMBLE: { name: "Reassemble", label: { zh: "整备" } },
	FULL_METAL_FIELD: { name: "Full Metal Field", label: { zh: "全金属爆发" } },

	SPREAD_SHOT: { name: "Spread Shot", label: { zh: "散射" } },
	SCATTERGUN: { name: "Scattergun", label: { zh: "霰弹枪" } },
	AUTO_CROSSBOW: { name: "Auto Crossbow", label: { zh: "自动弩" } },
	BIOBLASTER: { name: "Bioblaster", label: { zh: "毒菌冲击" } },
	FLAMETHROWER: { name: "Flamethrower", label: { zh: "火焰喷射器" } },

	DISMANTLE: { name: "Dismantle", label: { zh: "武装解除" } },
	TACTICIAN: { name: "Tactician", label: { zh: "策动" } },

	VOLLEY_FIRE: { name: "Volley Fire", label: { zh: "齐射" } },
	ARM_PUNCH: { name: "Arm Punch", label: { zh: "铁臂拳" } },
	ROOK_OVERLOAD: { name: "Rook Overload", label: { zh: "超负荷车式炮塔" } },
	PILE_BUNKER: { name: "Pile Bunker", label: { zh: "打桩枪" } },
	CROWNED_COLLIDER: { name: "Crowned Collider", label: { zh: "王室对撞机" } },
});

export type MCHActions = typeof MCH;
export type MCHActionKey = keyof MCHActions;
