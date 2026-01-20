import React from "react";
import { ButtonIndicator } from "../Components/Common";
import { NavH3Section, NavH2Section, Screenshot } from "./Manual";
import { TISCHEL_PLUGIN_URL, AMA_SIM_URL } from "./Links";

const bi = (k: string) => <ButtonIndicator text={k} />;

export function ImportExportEn() {
	return <>
		<NavH2Section id="import-export" label="Import and Export" />
		<NavH3Section id="exporting-text" label="Exporting to a Text File" />
		<Screenshot id="14" name="importexport" />
		<p>
			You can download the active timeline as a text file from the "Import/Export" menu, by
			clicking the "txt format" link <b>(1)</b>. This file can then be shared and imported
			through the "Load from file" menu <b>(2)</b>. We recommend you export your plans
			frequently to avoid accidentally losing progress.
		</p>
		<NavH3Section id="importing-fflogs" label="Importing From FFLogs" />
		<p>
			Fight plans can be imported directly from FFLogs reports from the "Import fight from
			FFLogs" menu. This will open a dialog to begin the first step of the log import process.
		</p>
		<Screenshot id="15a" name="auth" />
		<ol>
			<li>
				Click the button to allow <i>XIV in the Shell</i> to read FFLogs reports on your
				behalf.
			</li>
		</ol>
		<Screenshot id="15b" name="link" />
		<ol start={2}>
			<li>
				Paste a log report URL. The link may contain a full report, a specific fight number,
				and/or a specific player number.
			</li>
		</ol>
		<Screenshot id="15c" name="fightchoice" />
		<ol start={1}>
			{/* TODO these should be subheadings of the above section */}
			<li>
				If the URL did not specify a single fight, click the desired pull from the list of
				fights.
			</li>
		</ol>
		<Screenshot id="15d" name="playerchoice" />
		<ol start={2}>
			<li>
				After choosing a specific fight and a player was not specified in the URL, click the
				desired player name from the list of players.
			</li>
		</ol>
		<Screenshot id="15e" name="stats" />
		<ol start={3}>
			<li>
				Enter the combat stats of the selected player. Due to limitations with FFLogs, all
				stats for players other than the creator of the log must be entered manually or
				estimated, and will use the values of the most recently-created timeline for that
				job by default.
			</li>
		</ol>
		<Screenshot id="15f" name="results" />
		<ol start={4}>
			<li>
				After pressing "go," <i>XIV in the Shell</i> will import the list of actions from
				the log to the active timeline slot, automatically inserting "wait" and "delay"
				events as appropriate. You will see a table summarizing the differences between
				simulated timestamps and those recorded in the log, as well as a list of actions
				that the simulation believes did not meet their activation requirements. After
				closing the dialog, you may edit the configuration and timeline actions as needed to
				make the timeline valid.
			</li>
		</ol>
		<NavH3Section id="text-copy-paste" label="Text Copy/Paste" />
		<p>
			<i>XIV in the Shell</i> allows copy/pasting sequences of actions with {bi("ctrl")}+
			{bi("c")} and {bi("ctrl")}+{bi("v")}. Three different formats are supported:
		</p>
		<p>
			<i>Example sequence: Fire III, Fire IV, Despair</i>
		</p>
		<img src="assets/MarkerScreenshots/copypaste.jpg" />
		<ul>
			<li>
				<b>Plain text</b> A comma-separated list of actions names.
				<p>
					<i>Example:</i>
				</p>
				<p>Fire 3, Fire 4, Despair</p>
			</li>
			<li>
				<b>Tab-separated lines</b> A tab-separated list of usage timestamps, target counts,
				and skill names, compatible with external spreadsheet applications.
				<p>
					<i>Example:</i>
				</p>
				<p>
					{/* TODO format properly */}
					-3.500 1 Fire 3
					<br />
					0.042 1 Fire 4
					<br />
					2.500 1 Despair
				</p>
			</li>
			<li>
				<b>Discord emotes</b> A sequence of Discord emotes (only verified for BLM and PCT).
				<p>
					<i>Example:</i>
				</p>
				<p>:F3: :F4: :Despair:</p>
			</li>
		</ul>
		<p>
			The format copied to the clipboard from <i>XIV in the Shell</i> is determined by the
			"Clipboard copy mode" found in the "Settings" tab at the bottom of the page. Pasting
			from any of these three formats is always valid, regardless of the value of this
			setting.
		</p>
		<NavH3Section id="exporting-images" label="Exporting an Image" />
		<Screenshot id="18b" name="importexport" />
		<p>
			Besides using your computer's built-in screenshot functionality, you may also use{" "}
			<i>XIV in the Shell</i>'s "Image Export" feature to download a timeline as a PNG image.
		</p>
		<p>
			To export the selected portion of a timeline as an image, press the "export selection as
			png" link <b>(1)</b>. If no actions are selected, the entirety of the active timeline is
			selected.
		</p>
		<p>
			To split the exported image across multiple lines, set the "seconds before wrapping"
			field <b>(2)</b> to a non-zero value. Each row in the image will contain at most the
			specified number of seconds.
		</p>
		<p>
			To omit the time ruler and fight markers from export, uncheck the "include time and
			markers" setting. Timeline elements in the export are also affected by the display
			settings configured in the "Settings" tab.
		</p>
		<NavH3Section id="exporting-damage-logs" label="Exporting Damage Logs" />
		<Screenshot id="17" name="damageexport" />
		<p>
			You can export a detailed log of all damage events by clicking the "downloaded detailed
			damage log as CSV file" button <b>(1)</b> above the site's potency summary table. The
			output contains 3 columns:
		</p>
		<ul>
			<li>
				<b>time</b> The decimal timestamp, in seconds, at which the damage event occurred.
			</li>
			<li>
				<b>damageSource</b> The name and usage time of the ability that caused this damage
				event.
			</li>
			<li>
				<b>potency</b> The total potency (including buffs and modifiers) of this damage
				event.
			</li>
		</ul>
		<NavH3Section id="exporting-for-external-tools" label="Exporting for External Tools" />
		<Screenshot id="18b" name="importexport" />
		<p>
			Use the "excel / Tischel's plugin csv format" download link <b>(1)</b> to generate a
			file compatible with external tools, like spreadsheet software or Tischel's{" "}
			<a href={TISCHEL_PLUGIN_URL}>BLM in the Shell Plugin</a>. The exported CSV will contain
			the following columns:
		</p>
		<ul>
			<li>
				<b>time</b> The decimal timestamp, in seconds, at which the action was used.
			</li>
			<li>
				<b>action</b> The name of the action used.
			</li>
			<li>
				<b>isGCD</b> 1 if the action is a GCD ability, 0 if not.
			</li>
			<li>
				<b>castTime</b> The duration, in seconds, of this action's cast time. 0 If the
				action did not have a cast time.
			</li>
		</ul>
		<NavH3Section
			id="exporting-for-combat-sim"
			label="Exporting to Amarantine's Combat Simulator"
		/>
		<p>
			<a href={AMA_SIM_URL}>Amarantine's Combat Simulator</a> provides powerful DPS simulation
			and kill time estimation capabilities. <i>XIV in the Shell</i> can be used to generate
			and edit timelines that are compatible with this simulator, and both tools are used by
			many speedkill teams as part of their planning process.
		</p>
		<p>
			To download a CSV file compatible with Ama's Combat Sim, use the "Amarantine's combat
			simulator csv format" download link <b>(2)</b>. The generated CSV file will also contain
			metadata headers describing the configured combat stats, external party buff timeline
			markers, and untargetable downtime windows.
		</p>
		<p>
			Note that if the configured combat stats were originally imported from XivGear or etro,
			stats in the gearset that cannot be directly configured within <i>XIV in the Shell</i>{" "}
			(WD, STR/DEX/MND/INT, and TEN) will also be included in the export file for simulation
			purposes.
		</p>
	</>;
}

export function ImportExportZh() {
	return <>
		<NavH2Section id="import-export" label="导入与导出" />
		<NavH3Section id="exporting-text" label="导出为文本文件" />
		<Screenshot id="14" name="importexport" />
		<p>
			在"导入/导出"菜单中，点击"txt 格式"链接 <b>(1)</b>
			，即可将当前时间轴下载为txt文件。该文件可通过“从文件导入战斗”菜单 <b>(2)</b>{" "}
			重新导入或分享给他人。我们建议你积极导出文件，防止意外导致进度丢失。
		</p>
		<NavH3Section id="importing-fflogs" label="从 FFLogs 导入" />
		<p>可通过"从 FFLogs 导入战斗"菜单，直接将日志报告导入为时间轴。操作步骤如下：</p>
		<Screenshot id="15a" name="auth" />
		<ol>
			<li>点击授权按钮，允许 XIV in the Shell 代你读取 FFLogs 报告。</li>
		</ol>
		<Screenshot id="15b" name="link" />
		<ol start={2}>
			<li>粘贴FFLogs日志网址。链接可包含完整报告，也可指定特定战斗场次和/或特定玩家编号。</li>
		</ol>
		<Screenshot id="15c" name="fightchoice" />
		<ol start={1}>
			<li>若链接未指定单场战斗，从战斗列表中选择所需战斗场次。</li>
		</ol>
		<Screenshot id="15d" name="playerchoice" />
		<ol start={2}>
			<li>若链接未指定玩家，在玩家列表中点击目标玩家名字。</li>
		</ol>
		<Screenshot id="15e" name="stats" />
		<ol start={3}>
			<li>
				输入该玩家的战斗属性。受 FFLogs
				限制，非上传者本人的属性需手动填写或估算。默认将使用该职业最近一条时间轴的数值。
			</li>
		</ol>
		<Screenshot id="15e" name="results" />
		<ol start={4}>
			<li>
				点击“确定”，XIV in the Shell
				会把日志中的技能序列导入当前时间轴，并自动插入必要的等待事件。导入完成后会显示一张对照表，列出时间轴模拟时间与日志记录时间的差异，以及模拟认为未能满足激活条件的技能。关闭对话框后，你可以继续调整属性设置或时间轴，使其完全匹配。
			</li>
		</ol>
		<NavH3Section id="text-copy-paste" label="文本复制/粘贴" />
		<p>
			XIV in the Shell 支持用 {bi("ctrl")}+{bi("c")} / {bi("ctrl")}+{bi("v")}{" "}
			复制与粘贴技能序列，共三种格式可选。
		</p>
		<p>
			<i>示例序列：爆炎，炽炎，绝望</i>
		</p>
		<img src="assets/MarkerScreenshots/copypaste.jpg" />
		<ul>
			<li>
				<b>纯文本</b>{" "}
				由顿号分隔的技能名序列。（中文和英文粘贴的技能序列所用的分隔符不同，此处表述已经修改）
				<p>
					<i>例：</i>
				</p>
				<p>爆炎、炽炎、绝望</p>
			</li>
			<li>
				<b>制表符分隔列表</b> 由制表符分隔的时间戳、目标数、技能名序列，方便粘贴到表格软件。
				<p>
					<i>例：</i>
				</p>
				<p>
					-3.500 1 爆炎
					<br />
					0.042 1 炽炎
					<br />
					2.500 1 绝望
				</p>
			</li>
			<li>
				<b>Discord 表情</b> 一组Discord表情序列（仅黑魔 / 画家已验证）。
				<p>
					<i>例：</i>
				</p>
				<p>:F3: :F4: :Despair:</p>
			</li>
		</ul>
		<p>
			从时间轴中复制时，使用的格式由页面底部“设置”→“剪贴板复制模式”决定；粘贴到时间轴时，三种格式均可自动识别，不受该设置限制。
		</p>
		<NavH3Section id="exporting-images" label="导出图片" />
		<Screenshot id="18b" name="importexport" />
		<p>除了系统截图，也可使用站内的“导出为图像”功能将时间轴导出为 PNG。</p>
		<p>
			点击"将选择部分导出为 png" <b>(1)</b>{" "}
			即可保存选中的部分。若未选中任何技能，则导出整个当前时间轴。
		</p>
		<p>
			若想让图片自动换行，可在“每行秒数” <b>(2)</b> 填写非零值，这样每行最多显示指定秒数。
		</p>
		<p>
			取消勾选“包含时间刻度与时间轴标记”可隐藏时间刻度与时间轴标记，其余显示元素遵循“设置”标签中的开关状态。
		</p>
		<NavH3Section id="exporting-damage-logs" label="导出伤害日志" />
		<Screenshot id="17" name="damageexport" />
		<p>
			可以在技能统计表上方点击"下载详细伤害结算记录（CSV格式）" <b>(1)</b>{" "}
			以导出详细的伤害结算记录。其输出包含三列数据：
		</p>
		<ul>
			<li>
				<b>time</b> 伤害事件发生的时间戳（秒）。
			</li>
			<li>
				<b>damageSource</b> 造成该伤害的技能名称及其施放时间。
			</li>
			<li>
				<b>potency</b> 该伤害事件的威力（包含所有Buff和个人增益等）。
			</li>
		</ul>
		<NavH3Section id="exporting-for-external-tools" label="导出供外部工具使用" />
		<Screenshot id="18a" name="importexport" />
		<p>
			点击"excel / Tischel的插件 CSV 格式" <b>(1)</b> 可生成兼容表格软件或 Tischel 开发的{" "}
			<a href={TISCHEL_PLUGIN_URL}>BLM in the Shell Plugin</a> 的文件。其输出包含四列数据：
		</p>
		<ul>
			<li>
				<b>time</b> 技能施放的时间戳（秒）。
			</li>
			<li>
				<b>action</b> 技能名。
			</li>
			<li>
				<b>isGCD</b> 若为1则是GCD 技能，0 则不是。
			</li>
			<li>
				<b>castTime</b> 读条时间（秒），如为瞬发技能则此项为0。
			</li>
		</ul>
		<NavH3Section id="exporting-for-combat-sim" label="导出至Amarantine的战斗模拟器" />
		<p>
			<a href={AMA_SIM_URL}>Amarantine的战斗模拟器</a>具备强大的 DPS
			模拟与击杀时间估算功能。XIV in the Shell
			可生成与其兼容的时间轴，许多速刷团在规划阶段都会同时使用这两款工具。
		</p>
		<p>
			如需导出适用于 Amarantine的战斗模拟器的 CSV 文件，请点击"Amarantine的战斗模拟器 CSV
			格式"下载链接 <b>(2)</b>。
		</p>
		<p>
			生成的 CSV 文件头部会附带元数据，包含当前配置的战斗属性，外部团辅时间轴标记，上天时段。
		</p>
		<p>
			注意：若战斗属性最初来自 XivGear 或 etro 导入，则 XIV in the Shell
			无法直接设置的属性（武器性能、主属性、坚韧）也会一并写入导出文件，供模拟器完整使用。
		</p>
	</>;
}
