import { LocalizedContent } from "../../Components/Localization";

// Properties beyond name are all optional at this time to allow for gradual migration
// Mainly provided here as examples of what we could do with the data

export interface ActionData {
	name: string;
	id?: number; // In-game Action ID. Intended for use with exporting to Tischel
	label?: Omit<LocalizedContent, "en">; // Defines the locale-specific text that will be displayed. English is inferred from the name property
	discordEmote?: string; // A canonical discord emote (without surrounding : characters) for this skill.
}

export interface CooldownData {
	name: string;
	label?: Omit<LocalizedContent, "en">; // Defines the locale-specific text that will be displayed. English is inferred from the name property
	maximum?: number;
	charges?: number;
}

export interface ResourceData {
	name: string;
	label?: Omit<LocalizedContent, "en">; // Defines the locale-specific text that will be displayed. English is inferred from the name property

	// Set to indicate the maximum number of stacks for a resource. Defaults to 1 if not set.
	// Note that for status effects, this also controls the stacked icon registration
	maximumStacks?: number;

	mayBeToggled?: boolean; // set to true to allow the resource to be toggled via the UI
	mayNotBeCanceled?: boolean; // set to true to prevent the resource from being clicked off
	// Set to true if this is internally tracked through DebuffState instead of ResourceState.
	// All DoT debuffs will use DebuffState, regardless of this flag.
	specialDebuff?: true;
}

export interface TraitData {
	name: string;
	level: number;
}
