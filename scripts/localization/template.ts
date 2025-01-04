
// npx ts-node template.ts

import fs from "node:fs"
import {DNCResourceType, DNCSkillName} from "../../src/Game/Constants/DNC";

fs.readFile("skills.txt", "utf8", (err, data) => {
	let zh = data.split('\n').map(line => line.trim()).filter(l => l.length > 0);
	let en = Object.keys(DNCSkillName);
	if (zh.length === en.length) {
		console.log(en.map((_, i) => `[SkillName.${en[i]}, "${zh[i]}"],`).join('\n'));
	} else {
		console.log("keys and values lengths don't match :0");
	}
});

fs.readFile("resources.txt", "utf8", (err, data) => {
	let zh = data.split('\n').map(line => line.trim()).filter(l => l.length > 0);
	let en = Object.keys(DNCResourceType);
	if (zh.length === en.length) {
		console.log(en.map((_, i) => `[ResourceType.${en[i]}, "${zh[i]}"],`).join('\n'));
	} else {
		console.log("keys and values lengths don't match :0");
	}
});
