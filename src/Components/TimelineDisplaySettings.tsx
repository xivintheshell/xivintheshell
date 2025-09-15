import React from "react";
import { controller } from "../Controller/Controller";
import { localize, LocalizedContent } from "./Localization";
import { Checkbox, RadioSet } from "./Common";
import type { ClipboardMode } from "../Controller/Clipboard";

export function TimelineDisplaySettings() {
	const header = (c: LocalizedContent) => <div style={{ marginBottom: 5 }}>
		<b>{localize(c)}</b>
	</div>;
	return <div>
		{header({ en: "Display settings", zh: "显示设置" })}
		<Checkbox
			uniqueName={"showDamageMarks"}
			label={localize({ en: "show damage marks", zh: "显示伤害结算标记" })}
			onChange={(val) => {
				controller.setTimelineOptions({ drawDamageMarks: val });
			}}
		/>
		<Checkbox
			uniqueName={"showHealingMarks"}
			label={localize({ en: "show healing marks" })}
			onChange={(val) => {
				controller.setTimelineOptions({ drawHealingMarks: val });
			}}
		/>
		<Checkbox
			uniqueName={"showMPAndLucidTickMarks"}
			label={localize({ en: "show MP and lucid ticks", zh: "显示跳蓝和跳醒梦" })}
			onChange={(val) => {
				controller.setTimelineOptions({ drawMPTickMarks: val });
			}}
		/>
		<Checkbox
			uniqueName={"showBuffIndicators"}
			label={localize({ en: "show buff indicators", zh: "显示buff标记" })}
			onChange={(val) => {
				controller.setTimelineOptions({ drawBuffIndicators: val });
			}}
		/>
		<br />
		{header({ en: "Clipboard copy mode", zh: "剪贴板复制模式" })}
		<RadioSet
			uniqueName={"clipboardMode"}
			onChange={(val) => (controller.clipboardMode = val as ClipboardMode)}
			// TODO localization, help tooltips and explanations
			options={[
				// eslint-disable-next-line react/jsx-key
				["plain", <span>plain text</span>],
				// eslint-disable-next-line react/jsx-key
				["tsv", <span>tab-separated lines</span>],
				// eslint-disable-next-line react/jsx-key
				["discord", <span>discord emotes</span>],
			]}
		/>
	</div>;
}
