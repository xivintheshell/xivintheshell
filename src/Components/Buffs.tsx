import { BuffType } from "../Game/Common";
import { updateTimelineView } from "./Timeline";

// grabbed most of them from xivanalysis
export const buffIcons = new Map();
buffIcons.set(BuffType.LeyLines, "Buffs/BLM/Ley Lines.png");
buffIcons.set(BuffType.Tincture, "Buffs/General/Tincture.png");
buffIcons.set(BuffType.ArcaneCircle, "Buffs/RPR/Arcane Circle.png");
buffIcons.set(BuffType.ArmysPaeon, "Buffs/BRD/Army's Paeon.png");
buffIcons.set(BuffType.BattleLitany, "PartyBuffs/battle_litany.png");
buffIcons.set(BuffType.BattleVoice, "Buffs/BRD/Battle Voice.png");
buffIcons.set(BuffType.Brotherhood, "PartyBuffs/brotherhood.png");
buffIcons.set(BuffType.Card_TheBalance, "PartyBuffs/the_balance.png");
buffIcons.set(BuffType.Card_TheSpear, "PartyBuffs/the_spear.png");
buffIcons.set(BuffType.ChainStratagem, "PartyBuffs/chain_stratagem.png");
buffIcons.set(BuffType.Devilment, "Buffs/DNC/Devilment.png");
buffIcons.set(BuffType.Divination, "PartyBuffs/divination.png");
buffIcons.set(BuffType.Dokumori, "PartyBuffs/dokumori.png");
buffIcons.set(BuffType.Embolden, "PartyBuffs/Embolden.png"); // Everyone else sees the sword icon embolden
buffIcons.set(BuffType.MagesBallad, "Buffs/BRD/Mage's Ballad.png");
buffIcons.set(BuffType.RadiantFinale1, "Buffs/BRD/Radiant Finale.png");
buffIcons.set(BuffType.RadiantFinale2, "Buffs/BRD/Radiant Finale.png");
buffIcons.set(BuffType.RadiantFinale3, "Buffs/BRD/Radiant Finale.png");
buffIcons.set(BuffType.SearingLight, "PartyBuffs/searing_light.png");
buffIcons.set(BuffType.StandardFinish, "Buffs/DNC/Standard Finish.png");
buffIcons.set(BuffType.StarryMuse, "Buffs/PCT/Starry Muse.png");
buffIcons.set(BuffType.TechnicalFinish, "Buffs/DNC/Technical Finish.png");
buffIcons.set(BuffType.WanderersMinuet, "Buffs/BRD/Wanderer's Minuet.png");

buffIcons.set(BuffType.Manafication, "PartyBuffs/manafication.png");
buffIcons.set(BuffType.Acceleration, "Buffs/RDM/Acceleration.png");

buffIcons.set(BuffType.Fuka, "Buffs/SAM/Fuka.png");
buffIcons.set(BuffType.Fugetsu, "Buffs/SAM/Fugetsu.png");
buffIcons.set(BuffType.EnhancedEnpi, "Buffs/SAM/Enhanced Enpi.png");

buffIcons.set(BuffType.DeathsDesign, "Buffs/RPR/Death's Design.png");
buffIcons.set(BuffType.ArcaneCircle, "Buffs/RPR/Arcane Circle.png");

buffIcons.set(BuffType.RagingStrikes, "Buffs/BRD/Raging Strikes.png");
buffIcons.set(BuffType.Barrage, "Buffs/BRD/Barrage.png");

buffIcons.set(BuffType.NoMercy, "Buffs/GNB/No Mercy.png");

buffIcons.set(BuffType.EnhancedPiercingTalon, "Buffs/DRG/Enhanced Piercing Talon.png");
buffIcons.set(BuffType.PowerSurge, "Buffs/DRG/Power Surge.png");
buffIcons.set(BuffType.LanceCharge, "Buffs/DRG/Lance Charge.png");
buffIcons.set(BuffType.LifeOfTheDragon, "Buffs/DRG/Life of the Dragon.png");
buffIcons.set(BuffType.LifeSurge, "Buffs/DRG/Life Surge.png");

buffIcons.set(BuffType.DivineMight, "Buffs/PLD/Divine Might.png");
buffIcons.set(BuffType.Requiescat, "Buffs/PLD/Requiescat Zero.png");
buffIcons.set(BuffType.FightOrFlight, "Buffs/PLD/Fight or Flight.png");

buffIcons.set(BuffType.Zoe, "Buffs/SGE/Zoe.png");
buffIcons.set(BuffType.Autophysis, "Buffs/SGE/Autophysis.png");
buffIcons.set(BuffType.Krasis, "Buffs/SGE/Krasis.png");
buffIcons.set(BuffType.Philosophia, "Buffs/SGE/Philosophia.png");
buffIcons.set(BuffType.Soteria, "Buffs/SGE/Soteria.png");

buffIcons.set(BuffType.TrickAttack, "Buffs/NIN/Trick Attack.png");
buffIcons.set(BuffType.KunaisBane, "Buffs/NIN/Kunai's Bane.png");
buffIcons.set(BuffType.Bunshin, "Buffs/NIN/Bunshin.png");

buffIcons.set(BuffType.RiddleOfFire, "Buffs/MNK/Riddle of Fire.png");

buffIcons.set(BuffType.NeutralSect, "Buffs/AST/Neutral Sect.png");
buffIcons.set(BuffType.Synastry, "Buffs/AST/Synastry.png");
buffIcons.set(BuffType.TheArrow, "Buffs/AST/The Arrow.png");

buffIcons.set(BuffType.Confession, "Buffs/WHM/Confession.png");
buffIcons.set(BuffType.Asylum, "Buffs/WHM/Asylum.png");
buffIcons.set(BuffType.Temperance, "Buffs/WHM/Temperance.png");

buffIcons.set(BuffType.HuntersInstinct, "Buffs/VPR/Hunter's Instinct.png");
buffIcons.set(BuffType.Swiftscaled, "Buffs/VPR/Swiftscaled.png");

buffIcons.set(BuffType.FeyIllumination, "Buffs/SCH/Fey Illumination.png");
buffIcons.set(BuffType.Dissipation, "Buffs/SCH/Dissipation.png");
buffIcons.set(BuffType.Protraction, "Buffs/SCH/Protraction.png");
buffIcons.set(BuffType.Recitation, "Buffs/SCH/Recitation.png");

export const buffIconImages: Map<BuffType, HTMLImageElement> = new Map();
buffIcons.forEach((path, skillName) => {
	const imgObj = new Image();
	imgObj.src = "assets/" + path;
	imgObj.onload = function () {
		updateTimelineView();
	};
	buffIconImages.set(skillName, imgObj);
});
