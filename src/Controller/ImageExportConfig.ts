export interface ImageExportConfig {
	/** The number of seconds after which the image will wrap. If 0, never wrap. */
	wrapThresholdSeconds: number;
	/** Whether to include lucid and MP ticks. */
	includeMPAndLucidTicks: boolean;
	/** Whether to include damage application indicators. */
	includeDamageApplication: boolean;
	/** Whether to include the time ruler and timeline markers. */
	includeTime: boolean;
	/** Whether to include buff (pot/LL) indicators. */
	includeBuffIndicators: boolean;
}
