export enum SAMResourceType {
	MeikyoShisui = "Meikyo Shisui", // [0, 3]
	Fugetsu = "Fugetsu", // [0, 1]
	Fuka = "Fuka", // [0, 1]
	ZanshinReady = "Zanshin Ready", // [0, 1]
	Tendo = "Tendo", // [0, 1]
	OgiReady = "Ogi Namikiri Ready", // [0, 1]
	TsubameGaeshiReady = "Tsubame-gaeshi Ready", // [0, 1]
	ThirdEye = "Third Eye", // [0, 1]
	Tengentsu = "Tengentsu", // [0, 1]
	TengentsusForesight = "Tengentsu's Foresight", // [0, 1]
	Meditate = "Meditate", // [0, 5]
	EnhancedEnpi = "Enhanced Enpi", // [0, 1]
	HiganbanaDoT = "HiganbanaDoT", // [0, 1]

	Kenki = "Kenki", // [0, 100]
	Setsu = "Setsu", // [0, 1]
	Getsu = "Getsu", // [0, 1]
	KaSen = "Ka", // [0, 1]
	Meditation = "Meditation", // [0, 3]

	// samurai combo resources (behind the scenes)
	SAMTwoReady = "SAMTwoReady", // [0, 1] for jinpu/shifu
	SAMTwoAoeReady = "SAMTwoAoeReady", // [0, 1] for mangetsu/oka
	GekkoReady = "GekkoReady", // [0, 1]
	KashaReady = "KashaReady", // [0, 1]
	KaeshiOgiReady = "KaeshiOgiReady", // [0 , 1]

	// samurai kaeshi resources (behind the scenes)
	// 0 - nothing, 1 - kaeshi goken, 2 - tendo kaeshi goken, 3 - kaeshi midare, 4 - tendo kaeshi midare
	KaeshiTracker = "KaeshiTracker", // [0, 4]
}

export enum SAMCooldownType {
	cd_Yaten = "cd_Yaten", // [0, 10],
	cd_Gyoten = "cd_Gyoten", // [0, 10],
	cd_SeneiGuren = "cd_Senei", // [0,60],
	cd_Shinten = "cd_Shinten", // [0,1]
	cd_Kyuten = "cd_Kyuten", // [0,1]
	cd_Meditate = "cd_Meditate", // [0, 1]
	cd_Ikishoten = "cd_Ikishoten", // [0, 120]
	cd_Zanshin = "cd_Zanshin", // [0, 1]
	cd_Hagakure = "cd_Hagakure", // [0, 1]
	cd_Shoha = "cd_Shoha",
	cd_MeikyoShisui = "cd_MeikyoShisui",
	cd_ThirdEye = "cd_ThirdEye",
	cd_ThirdEyePop = "cd_ThirdEyePop", // [0, 1,], not real
}
