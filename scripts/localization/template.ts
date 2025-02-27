// npx ts-node template.ts

//import fs from "node:fs"
import {BRD_RESOURCES, BRD_ACTIONS, BRD_COOLDOWNS, BRDCooldownKey} from "../../src/Game/Data/Jobs/BRD";

Object.values(BRD_ACTIONS).forEach(action => {
	console.log(action.name);
});

console.log("----");

Object.values(BRD_RESOURCES).forEach(rsc => {
	console.log(rsc.name);
});

console.log("----");

let actionKeys = Object.keys(BRD_ACTIONS);
Object.keys(BRD_COOLDOWNS).forEach(cdKey => {
	if (!(cdKey.startsWith("cd_") && actionKeys.includes(cdKey.slice(3)))) {
		console.log(BRD_COOLDOWNS[cdKey as BRDCooldownKey].name);
	}
});