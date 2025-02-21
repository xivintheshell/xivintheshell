import { BuffType } from "../Game/Common";
import { updateTimelineView } from "./Timeline";

// grabbed most of them from xivanalysis
export const buffIcons = new Map();
buffIcons.set(BuffType.LeyLines, require("./Asset/Buffs/BLM/Ley Lines.png"));
buffIcons.set(BuffType.Tincture, require("./Asset/Buffs/General/Tincture.png"));
buffIcons.set(BuffType.ArcaneCircle, require("./Asset/Buffs/RPR/Arcane Circle.png"));
buffIcons.set(BuffType.ArmysPaeon, require("./Asset/Buffs/BRD/Army's Paeon.png"));
buffIcons.set(BuffType.BattleLitany, require("./Asset/PartyBuffs/battle_litany.png"));
buffIcons.set(BuffType.BattleVoice, require("./Asset/Buffs/BRD/Battle Voice.png"));
buffIcons.set(BuffType.Brotherhood, require("./Asset/PartyBuffs/brotherhood.png"));
buffIcons.set(BuffType.Card_TheBalance, require("./Asset/PartyBuffs/the_balance.png"));
buffIcons.set(BuffType.Card_TheSpear, require("./Asset/PartyBuffs/the_spear.png"));
buffIcons.set(BuffType.ChainStratagem, require("./Asset/PartyBuffs/chain_stratagem.png"));
buffIcons.set(BuffType.Devilment, require("./Asset/Buffs/DNC/Devilment.png"));
buffIcons.set(BuffType.Divination, require("./Asset/PartyBuffs/divination.png"));
buffIcons.set(BuffType.Dokumori, require("./Asset/PartyBuffs/dokumori.png"));
buffIcons.set(BuffType.Embolden, require("./Asset/PartyBuffs/Embolden.png")); // Everyone else sees the sword icon embolden
buffIcons.set(BuffType.MagesBallad, require("./Asset/Buffs/BRD/Mage's Ballad.png"));
buffIcons.set(BuffType.RadiantFinale1, require("./Asset/Buffs/BRD/Radiant Finale.png"));
buffIcons.set(BuffType.RadiantFinale2, require("./Asset/Buffs/BRD/Radiant Finale.png"));
buffIcons.set(BuffType.RadiantFinale3, require("./Asset/Buffs/BRD/Radiant Finale.png"));
buffIcons.set(BuffType.SearingLight, require("./Asset/PartyBuffs/searing_light.png"));
buffIcons.set(BuffType.StandardFinish, require("./Asset/Buffs/DNC/Standard Finish.png"));
buffIcons.set(BuffType.StarryMuse, require("./Asset/Buffs/PCT/Starry Muse.png"));
buffIcons.set(BuffType.TechnicalFinish, require("./Asset/Buffs/DNC/Technical Finish.png"));
buffIcons.set(BuffType.WanderersMinuet, require("./Asset/Buffs/BRD/Wanderer's Minuet.png"));

buffIcons.set(BuffType.Manafication, require("./Asset/PartyBuffs/manafication.png"));
buffIcons.set(BuffType.Acceleration, require("./Asset/Buffs/RDM/Acceleration.png"));

buffIcons.set(BuffType.Fuka, require("./Asset/Buffs/SAM/Fuka.png"));
buffIcons.set(BuffType.Fugetsu, require("./Asset/Buffs/SAM/Fugetsu.png"));
buffIcons.set(BuffType.EnhancedEnpi, require("./Asset/Buffs/SAM/Enhanced Enpi.png"));

buffIcons.set(BuffType.DeathsDesign, require("./Asset/Buffs/RPR/Death's Design.png"));
buffIcons.set(BuffType.ArcaneCircle, require("./Asset/Buffs/RPR/Arcane Circle.png"));

buffIcons.set(BuffType.RagingStrikes, require("./Asset/Buffs/BRD/Raging Strikes.png"));
buffIcons.set(BuffType.Barrage, require("./Asset/Buffs/BRD/Barrage.png"));

buffIcons.set(BuffType.NoMercy, require("./Asset/Buffs/GNB/No Mercy.png"));

buffIcons.set(
	BuffType.EnhancedPiercingTalon,
	require("./Asset/Buffs/DRG/Enhanced Piercing Talon.png"),
);
buffIcons.set(BuffType.PowerSurge, require("./Asset/Buffs/DRG/Power Surge.png"));
buffIcons.set(BuffType.LanceCharge, require("./Asset/Buffs/DRG/Lance Charge.png"));
buffIcons.set(BuffType.LifeOfTheDragon, require("./Asset/Buffs/DRG/Life of the Dragon.png"));
buffIcons.set(BuffType.LifeSurge, require("./Asset/Buffs/DRG/Life Surge.png"));

buffIcons.set(BuffType.DivineMight, require("./Asset/Buffs/PLD/Divine Might.png"));
buffIcons.set(BuffType.Requiescat, require("./Asset/Buffs/PLD/Requiescat Zero.png"));
buffIcons.set(BuffType.FightOrFlight, require("./Asset/Buffs/PLD/Fight or Flight.png"));

export const buffIconImages: Map<BuffType, HTMLImageElement> = new Map();
buffIcons.forEach((path, skillName) => {
	let imgObj = new Image();
	imgObj.src = path;
	imgObj.onload = function () {
		updateTimelineView();
	};
	buffIconImages.set(skillName, imgObj);
});
