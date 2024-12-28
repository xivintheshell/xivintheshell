import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Action } from "../type";

export const ROLE = ensureRecord<Action>()({
	ARMS_LENGTH: { name: "Arm's Length", label: { zh: "亲疏自行" } }, // Tanks, Melee, Phys Ranged

	SECOND_WIND: { name: "Second Wind", label: { zh: "内丹" } }, // Melee & Phys Ranged

	HEAD_GRAZE: { name: "Head Graze", label: { zh: "伤头" } }, // Phys Ranged. Not bothering with Leg/Foot Graze at this point

	ESUNA: { name: "Esuna", label: { zh: "" } },
	RESCUE: { name: "Rescue", label: { zh: "" } },

	ADDLE: { name: "Addle", label: { zh: "病毒", ja: "アドル" } },
	SWIFTCAST: { name: "Swiftcast", label: { zh: "即刻咏唱", ja: "迅速魔" } },
	LUCID_DREAMING: {
		name: "Lucid Dreaming",
		label: { zh: "醒梦", ja: "ルーシッドドリーム" },
	},
	SURECAST: { name: "Surecast", label: { zh: "沉稳咏唱", ja: "堅実魔" } },

	FEINT: { name: "Feint", label: { zh: "牵制" } },
	BLOODBATH: { name: "Bloodbath", label: { zh: "浴血" } },
	TRUE_NORTH: { name: "True North", label: { zh: "真北" } },
	LEG_SWEEP: { name: "Leg Sweep", label: { zh: "扫腿" } },

	RAMPART: { name: "Rampart", label: { zh: "铁壁" } },
	REPRISAL: { name: "Reprisal", label: { zh: "雪仇" } },
	LOW_BLOW: { name: "Low Blow", label: { zh: "下踢" } },
	INTERJECT: { name: "Interject", label: { zh: "插言" } },
	PROVOKE: { name: "Provoke", label: { zh: "挑衅" } },
	SHIRK: { name: "Shirk", label: { zh: "退避" } },
});

export type RoleActions = typeof ROLE;
export type RoleActionKey = keyof RoleActions;
