import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Cooldown } from "../type";

export const LIMIT_BREAK = ensureRecord<Cooldown>()({
	cd_TANK_LB1: { name: "cd_TankLB1" },
	cd_TANK_LB2: { name: "cd_TankLB2" },
	cd_TANK_LB3: { name: "cd_TankLB3" },

	cd_HEALER_LB1: { name: "cd_HealerLB1" },
	cd_HEALER_LB2: { name: "cd_HealerLB2" },
	cd_HEALER_LB3: { name: "cd_HealerLB3" },

	cd_MELEE_LB1: { name: "cd_MeleeLB1" },
	cd_MELEE_LB2: { name: "cd_MeleeLB2" },
	cd_MELEE_LB3: { name: "cd_MeleeLB3" },

	cd_RANGED_LB1: { name: "cd_RangedLB1" },
	cd_RANGED_LB2: { name: "cd_RangedLB2" },
	cd_RANGED_LB3: { name: "cd_RangedLB3" },

	cd_CASTER_LB1: { name: "cd_CasterLB1" },
	cd_CASTER_LB2: { name: "cd_CasterLB2" },
	cd_CASTER_LB3: { name: "cd_CasterLB3" },
});

export type LimitBreakCooldowns = typeof LIMIT_BREAK;
export type LimitBreakCooldownKey = keyof LimitBreakCooldowns;
