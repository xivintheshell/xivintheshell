import {
	Actions,
	Resources,
	Cooldowns,
	ActionKey,
	ACTIONS,
	ResourceKey,
	RESOURCES,
	CooldownKey,
	COOLDOWNS,
} from ".";
import { ShellJob, Job, JOBS } from "./Jobs";
import { ActionData, ResourceData, CooldownData } from "./types";

type DataTypes = Actions | Resources | Cooldowns;

export class Data {
	static getJob(key: ShellJob): Job {
		return JOBS[key];
	}

	static getAction(key: ActionKey): ActionData {
		return ACTIONS[key];
	}
	static findAction(name: string): Actions | undefined {
		return this.findByName<Actions>(ACTIONS, name);
	}
	static findActionKey(name: string): ActionKey | undefined {
		return this.findKeyByName<Actions>(ACTIONS, name);
	}

	static getResource(key: ResourceKey): ResourceData {
		return RESOURCES[key];
	}
	static findResource(name: string): Resources | undefined {
		return this.findByName<Resources>(RESOURCES, name);
	}
	static findResourceKey(name: string): ResourceKey | undefined {
		return this.findKeyByName<Resources>(RESOURCES, name);
	}

	static getCooldown(key: CooldownKey): CooldownData {
		return COOLDOWNS[key];
	}
	static findCooldown(name: string): Cooldowns | undefined {
		return this.findByName<Cooldowns>(COOLDOWNS, name);
	}
	static findCooldownKey(name: string): CooldownKey | undefined {
		return this.findKeyByName<Cooldowns>(COOLDOWNS, name);
	}

	private static findByName<T extends DataTypes>(data: DataTypes, name: string): T | undefined {
		return Object.values(data).find((datum) => datum.name === name);
	}

	private static findKeyByName<T extends DataTypes>(data: T, name: string): keyof T | undefined {
		const entry = Object.entries(data).find(([_key, datum]) => datum.name === name);
		if (!entry) {
			return;
		}
		return entry[0] as keyof T;
	}
}
