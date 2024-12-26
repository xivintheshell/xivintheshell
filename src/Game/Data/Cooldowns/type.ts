// Properties beyond name are all optional at this time to allow for gradual migration
// Mainly provided here as examples of what we could do with the data

export interface Cooldown {
	name: string;
	maximum?: number;
	charges?: number;
}
