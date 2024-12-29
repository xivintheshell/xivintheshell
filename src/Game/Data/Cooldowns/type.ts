// Properties beyond name are all optional at this time to allow for gradual migration
// Mainly provided here as examples of what we could do with the data

import { LocalizedContent } from "../../../Components/Localization";

export interface Cooldown {
	name: string;
	label?: Omit<LocalizedContent, "en">; // Defines the locale-specific text that will be displayed. English is inferred from the name property
	maximum?: number;
	charges?: number;
}
