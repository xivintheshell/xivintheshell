export interface ImageExportConfig {
	/** The number of seconds after which the image will wrap. If 0, never wrap. */
	wrapThresholdSeconds: number;
	/** Whether to include the time ruler and timeline markers. */
	includeTime: boolean;
}
