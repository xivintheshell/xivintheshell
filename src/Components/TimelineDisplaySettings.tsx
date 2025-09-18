import React, { ReactNode } from "react";
import { controller } from "../Controller/Controller";
import { localize, LocalizedContent } from "./Localization";
import { Checkbox, RadioSet, Help } from "./Common";
import type { ClipboardMode } from "../Controller/Clipboard";

export function TimelineDisplaySettings() {
	const header = (c: LocalizedContent, help: ReactNode | undefined) => <div
		style={{ marginBottom: 5 }}
	>
		<b>{localize(c)}</b>
		{help && " "}
		{help}
	</div>;
	const displaySettingsHelp = <Help
		topic="settings-display"
		content={localize({
			en: "Configure how elements are displayed in the visual timeline and image exports.",
			zh: "设定图形时间轴和图像导出会显示的元素。",
		})}
	/>;
	const clipboardTopHelp = <Help
		topic="settings-copypaste"
		content={localize({
			en: <div>
				Configure the format used when copying a sequence of skills from XIV in the Shell to
				paste in other applications.
				<br />
				Any of the provided formats can be copied <i>from</i> external applications to XIV
				in the Shell at any time, regardless of the value of this setting.
			</div>,
		})}
	/>;
	const plaintextHelp = <Help
		topic="settings-copypaste-plain"
		content={localize({
			en: <div>
				A comma-separated list of skill names.
				<br />
				<br />
				Example:
				<br />
				<span>Fire 3, Fire 4, Despair</span>
			</div>,
			zh: <div>
				以逗号分隔技能名称的列表。
				<br />
				<br />
				例：
				<br />
				<span>火3、火4、绝望</span>
			</div>,
		})}
	/>;
	const tsvHelp = <Help
		topic="settings-copypaste-plain"
		content={localize({
			en: <div>
				A tab-separated list of usage timestamps, target counts, and skill names, for use
				with external spreadsheet applications.
				<br />
				<br />
				Example:
				<table>
					<tbody>
						<tr>
							<td>-3.500</td>
							<td>1</td>
							<td>Fire 3</td>
						</tr>
						<tr>
							<td>0.042</td>
							<td>1</td>
							<td>Fire 4</td>
						</tr>
						<tr>
							<td>2.500</td>
							<td>1</td>
							<td>Despair</td>
						</tr>
					</tbody>
				</table>
			</div>,
			zh: <div>
				制表符分隔的时间、击中目标数、技能名称的列表。可用于外部电子表格软件。
				<br />
				<br />
				例：
				<table>
					<tbody>
						<tr>
							<td>-3.500</td>
							<td>1</td>
							<td>火3</td>
						</tr>
						<tr>
							<td>0.042</td>
							<td>1</td>
							<td>火4</td>
						</tr>
						<tr>
							<td>2.500</td>
							<td>1</td>
							<td>绝望</td>
						</tr>
					</tbody>
				</table>
			</div>,
		})}
	/>;
	const discordHelp = <Help
		topic="settings-copypaste-discord"
		content={localize({
			en: <div>
				A sequence of Discord emotes (only verified for BLM and PCT). Requires access to a
				server with appropriately-named emotes to use.
				<br />
				<br />
				Example:
				<br />
				<span>:F3: :F4: :Despair:</span>
			</div>,
			zh: <div>
				Discord表情的列表（仅验证了黑魔和绘灵)。需要加入有所需的表情的Discord服务器才能用。
				<br />
				<br />
				例：
				<br />
				<span>:F3: :F4: :Despair:</span>
			</div>,
		})}
	/>;
	return <div>
		{header({ en: "Display settings", zh: "显示设置" }, displaySettingsHelp)}
		<Checkbox
			uniqueName={"showDamageMarks"}
			label={localize({ en: "show damage marks", zh: "显示伤害结算标记" })}
			onChange={(val) => {
				controller.setTimelineOptions({ drawDamageMarks: val });
			}}
		/>
		<Checkbox
			uniqueName={"showHealingMarks"}
			label={localize({ en: "show healing marks", zh: "显示恢复结算标记" })}
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
		{header({ en: "Clipboard copy mode", zh: "剪贴板复制模式" }, clipboardTopHelp)}
		<RadioSet
			uniqueName={"clipboardMode"}
			onChange={(val) => (controller.clipboardMode = val as ClipboardMode)}
			// TODO localization, help tooltips and explanations
			options={[
				// eslint-disable-next-line react/jsx-key
				[
					"plain",
					<span>
						{localize({ en: "plain text", zh: "纯文本" })} {plaintextHelp}
					</span>,
				],
				// eslint-disable-next-line react/jsx-key
				[
					"tsv",
					<span>
						{localize({ en: "tab-separated lines", zh: "制表符分隔列表" })} {tsvHelp}
					</span>,
				],
				// eslint-disable-next-line react/jsx-key
				[
					"discord",
					<span>
						discord{localize({ en: " emotes", zh: "表情" })} {discordHelp}
					</span>,
				],
			]}
		/>
	</div>;
}
