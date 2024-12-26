import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Action } from "../type";

export const SAM = ensureRecord<Action>()({
	ENPI: { name: "Enpi" },
	HAKAZE: { name: "Hakaze" },
	GYOFU: { name: "Gyofu" },
	YUKIKAZE: { name: "Yukikaze" },
	JINPU: { name: "Jinpu" },
	GEKKO: { name: "Gekko" },
	SHIFU: { name: "Shifu" },
	KASHA: { name: "Kasha" },
	FUGA: { name: "Fuga" },
	FUKO: { name: "Fuko" },
	MANGETSU: { name: "Mangetsu" },
	OKA: { name: "Oka" },
	MEIKYO_SHISUI: { name: "Meikyo Shisui" },
	IKISHOTEN: { name: "Ikishoten" },
	HISSATSU_SHINTEN: { name: "Hissatsu: Shinten" },
	HISSATSU_KYUTEN: { name: "Hissatsu: Kyuten" },
	HISSATSU_GYOTEN: { name: "Hissatsu: Gyoten" },
	HISSATSU_YATEN: { name: "Hissatsu: Yaten" },
	HISSATSU_SENEI: { name: "Hissatsu: Senei" },
	HISSATSU_GUREN: { name: "Hissatsu: Guren" },
	HAGAKURE: { name: "Hagakure" },
	IAIJUTSU: { name: "Iaijutsu" },
	TSUBAME_GAESHI: { name: "Tsubame-gaeshi" },
	SHOHA: { name: "Shoha" },
	THIRD_EYE: { name: "Third Eye" },
	TENGENTSU: { name: "Tengentsu" },
	OGI_NAMIKIRI: { name: "Ogi Namikiri" },
	KAESHI_NAMIKIRI: { name: "Kaeshi: Namikiri" },
	ZANSHIN: { name: "Zanshin" },
	MEDITATE: { name: "Meditate" },

	HIGANBANA: { name: "Higanbana" },
	TENKA_GOKEN: { name: "Tenka Goken" },
	KAESHI_GOKEN: { name: "Kaeshi: Goken" },
	TENDO_GOKEN: { name: "Tendo Goken" },
	TENDO_KAESHI_GOKEN: { name: "Tendo Kaeshi Goken" },
	MIDARE_SETSUGEKKA: { name: "Midare Setsugekka" },
	KAESHI_SETSUGEKKA: { name: "Kaeshi: Setsugekka" },
	TENDO_SETSUGEKKA: { name: "Tendo Setsugekka" },
	TENDO_KAESHI_SETSUGEKKA: { name: "Tendo Kaeshi Setsugekka" },

	THIRD_EYE_POP: { name: "Pop Third Eye" },
	TENGENTSU_POP: { name: "Pop Tengentsu" },
});

export type SAMActions = typeof SAM;
export type SAMActionKey = keyof SAMActions;
