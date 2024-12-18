import { BuffType } from "../Game/Common";
import { updateTimelineView } from "./Timeline";

// grabbed most of them from xivanalysis
export const buffIcons = new Map();
buffIcons.set(BuffType.LeyLines, require("./Asset/Buffs/BLM/Ley Lines.png"));
buffIcons.set(BuffType.Tincture, require("./Asset/Buffs/Role/Tincture.png"));
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

export const buffIconImages: Map<BuffType, HTMLImageElement> = new Map();
buffIcons.forEach((path, skillName) => {
	let imgObj = new Image();
	imgObj.src = path;
	imgObj.onload = function () {
		updateTimelineView();
	};
	buffIconImages.set(skillName, imgObj);
});
