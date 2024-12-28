import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Action } from "../type";

export const SAM = ensureRecord<Action>()({
	ENPI: { name: "Enpi", label: { zh: "燕飞" } },
	HAKAZE: { name: "Hakaze", label: { zh: "刃风" } },
	GYOFU: { name: "Gyofu", label: { zh: "晓风" } },
	YUKIKAZE: { name: "Yukikaze", label: { zh: "雪风" } },
	JINPU: { name: "Jinpu", label: { zh: "阵风" } },
	GEKKO: { name: "Gekko", label: { zh: "月光" } },
	SHIFU: { name: "Shifu", label: { zh: "士风" } },
	KASHA: { name: "Kasha", label: { zh: "花车" } },
	FUGA: { name: "Fuga", label: { zh: "风雅" } },
	FUKO: { name: "Fuko", label: { zh: "风光" } },
	MANGETSU: { name: "Mangetsu", label: { zh: "满月" } },
	OKA: { name: "Oka", label: { zh: "樱花" } },
	MEIKYO_SHISUI: { name: "Meikyo Shisui", label: { zh: "明镜止水" } },
	IKISHOTEN: { name: "Ikishoten", label: { zh: "意气冲天" } },
	HISSATSU_SHINTEN: { name: "Hissatsu: Shinten", label: { zh: "必杀剑·震天" } },
	HISSATSU_KYUTEN: { name: "Hissatsu: Kyuten", label: { zh: "必杀剑·九天" } },
	HISSATSU_GYOTEN: { name: "Hissatsu: Gyoten", label: { zh: "必杀剑·晓天" } },
	HISSATSU_YATEN: { name: "Hissatsu: Yaten", label: { zh: "必杀剑·夜天" } },
	HISSATSU_SENEI: { name: "Hissatsu: Senei", label: { zh: "必杀剑·闪影" } },
	HISSATSU_GUREN: { name: "Hissatsu: Guren", label: { zh: "必杀剑·红莲" } },
	HAGAKURE: { name: "Hagakure", label: { zh: "叶隐" } },
	IAIJUTSU: { name: "Iaijutsu", label: { zh: "居合术" } },
	TSUBAME_GAESHI: { name: "Tsubame-gaeshi", label: { zh: "燕回返" } },
	SHOHA: { name: "Shoha", label: { zh: "照破" } },
	THIRD_EYE: { name: "Third Eye", label: { zh: "心眼" } },
	TENGENTSU: { name: "Tengentsu", label: { zh: "天眼通" } },
	OGI_NAMIKIRI: { name: "Ogi Namikiri", label: { zh: "奥义斩浪" } },
	KAESHI_NAMIKIRI: { name: "Kaeshi: Namikiri", label: { zh: "回返斩浪" } },
	ZANSHIN: { name: "Zanshin", label: { zh: "残心" } },
	MEDITATE: { name: "Meditate", label: { zh: "默想" } },

	HIGANBANA: { name: "Higanbana", label: { zh: "彼岸花" } },
	TENKA_GOKEN: { name: "Tenka Goken", label: { zh: "天下五剑" } },
	KAESHI_GOKEN: { name: "Kaeshi: Goken", label: { zh: "回返五剑" } },
	TENDO_GOKEN: { name: "Tendo Goken", label: { zh: "天道五剑" } },
	TENDO_KAESHI_GOKEN: { name: "Tendo Kaeshi Goken", label: { zh: "天道回返五剑" } },
	MIDARE_SETSUGEKKA: { name: "Midare Setsugekka", label: { zh: "纷乱雪月花" } },
	KAESHI_SETSUGEKKA: { name: "Kaeshi: Setsugekka", label: { zh: "回返雪月花" } },
	TENDO_SETSUGEKKA: { name: "Tendo Setsugekka", label: { zh: "天道雪月花" } },
	TENDO_KAESHI_SETSUGEKKA: {
		name: "Tendo Kaeshi Setsugekka",
		label: { zh: "天道回返雪月花" },
	},

	THIRD_EYE_POP: { name: "Pop Third Eye", label: { zh: "心眼触发" } },
	TENGENTSU_POP: { name: "Pop Tengentsu", label: { zh: "天眼通触发" } },
});

export type SAMActions = typeof SAM;
export type SAMActionKey = keyof SAMActions;
