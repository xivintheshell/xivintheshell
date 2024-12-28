import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Cooldown } from "../type";

export const MCH = ensureRecord<Cooldown>()({
	cd_REASSEMBLE: { name: "cd_Reassemble" },
	cd_DRILL: { name: "cd_Drill" },
	cd_CHECKMATE: { name: "cd_Checkmate" },
	cd_DOUBLE_CHECK: { name: "cd_DoubleCheck" },
	cd_AIR_ANCHOR: { name: "cd_AirAnchor" },
	cd_CHAINSAW: { name: "cd_Chainsaw" },
	cd_BARREL_STABILIZER: { name: "cd_BarrelStabilizer" },
	cd_WILDFIRE: { name: "cd_Wildfire" },
	cd_QUEEN: { name: "cd_Queen", label: { zh: "CD：后式自走人偶" } },
	cd_OVERDRIVE: { name: "cd_Overdrive", label: { zh: "CD：超档车式炮塔/超档后式人偶" } },
	cd_DISMANTLE: { name: "cd_Dismantle" },
	cd_TACTICIAN: { name: "cd_Tactician" },
	cd_HYPERCHARGE: { name: "cd_Hypercharge" },
	cd_DETONATOR: { name: "cd_Detonator" },
	cd_FLAMETHROWER: { name: "cd_Flamethrower" },
});

export type MCHCooldowns = typeof MCH;
export type MCHCooldownKey = keyof MCHCooldowns;
