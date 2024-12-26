import { LocalizedContent } from "../../../Components/Localization";

// Properties beyond name are all optional at this time to allow for gradual migration
// Mainly provided here as examples of what we could do with the data

export interface Action {
	name: string;
	id?: number; // Intended for use with exporting to Amarantine
	label?: Omit<LocalizedContent, "en">; // Can eventually move localization directly onto the definition
}
