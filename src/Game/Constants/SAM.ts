export enum SAMSkillName {
    Enpi = "Enpi",
    Hakaze = "Hakaze",
    Gyofu = "Gyofu",
    Yukikaze = "Yukikaze",
    Jinpu = "Jinpu",
    Gekko = "Gekko",
    Shifu = "Shifu",
    Kasha = "Kasha",
    Fuga = "Fuga",
    Fuko = "Fuko",
    Mangetsu = "Mangetsu",
    Oka = "Oka",
    MeikyoShisui = "Meikyo Shisui",
    Ikishoten = "Ikishoten",
    Shinten = "Hissatsu: Shinten",
    Kyuten = "Hissatsu: Kyuten",
    Gyoten = "Hissatsu: Gyoten",
    Yaten = "Hissatsu: Yaten",
    Senei = "Hissatsu: Senei",
    Guren = "Hissatsu: Guren",
    Hagakure = "Hagakure",
    Iaijutsu = "Iaijutsu",
    TsubameGaeshi = "Tsubame-gaeshi",
    Shoha = "Shoha",
    Tengetsu = "Tengetsu",
    OgiNamikiri = "Ogi Namikiri",
    KaeshiNamikiri = "Kaeshi: Namikiri",
    Zanshin = "Zanshin",
    Meditate = "Meditate",

    Higanbana = "Higanbana",
    TenkaGoken = "Tenka Goken",
    KaeshiGoken = "Kaeshi: Goken",
    TendoGoken = "Tendo Goken",
    TendoKaeshiGoken = "Tendo Kaeshi Goken",
    MidareSetsugekka = "Midare Setsugekka",
    KaeshiSetsugekka = "Kaeshi: Setsugekka",
    TendoSetsugekka = "Tendo Setsugekka",
    TendoKaeshiSetsugekka = "Tendo Kaeshi Setsugekka",

    ThirdEyePop = "Pop Third Eye",
    TengetsuPop = "Pop Tengetsu's Foresight",
}

export enum SAMResourceType {
    MeikyoShisui = "Meikyo Shisui", // [0, 3]
    Fugetsu = "Fugetsu", // [0, 1]
    Fuka = "Fuka", // [0, 1]
    ZanshinReady = "Zanshin Ready", // [0, 1]
    Tendo = "Tendo", // [0, 1]  
    OgiReady = "Ogi Namikiri Ready", // [0, 1]
    TsubameGaeshiReady = "Tsubame-gaeshi Ready", // [0, 1]
    Tengetsu = "Tengetsu", // [0, 1]
    TengetsusForesight = "Tengetsu's Foresight", // [0, 1]
    ThirdEye = "Third Eye", // [0, 1]
    Meditate = "Meditate", // [0, 5]
    EnhancedEnpi = "Enhanced Enpi", // [0, 1]
    HiganbanaDoT = "HiganbanaDoT", // [0, 1]
    
    KenkiGauge = "Kenki", // [0, 100]
    Setsu = "Setsu", // [0, 1]
    Getsu = "Getsu", // [0, 1]
    KaSen = "Ka", // [0, 1]
    Meditation = "Meditation", // [0, 3]
    Positional = "Positional", // [0, 1]

    // samurai combo resources (behind the scenes)
    TwoReady = "TwoReady", // [0, 1] for jinpu/shifu
    TwoAoeReady = "TwoAoeReady", // [0, 1] for mangetsu/oka
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

    cd_Ikishoten = "cd_Ikishoten", // [0, 120]
    cd_Zanshin = "cd_Zanshin", // [0, 1]
    cd_Hagakure = "cd_Hagakure", // [0, 1]
    cd_Shoha = "cd_Shoha",
    cd_MeikyoShisui = "cd_MeikyoShisui",
    cd_Tengetsu = "cd_Tengetsu",
    cd_ThirdEyePop = "cd_ThirdEyePop", // [0, 1,], not real
}