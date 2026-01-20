import React from "react";
import { NavH3Section, NavH2Section, Screenshot } from "./Manual";
import {
	TRACK_SCRIPT_URL,
	CREATING_TRACKS_URL,
	TRACK_SCRIPT_COLAB_NOTEBOOK_URL,
	MARKER_GEN_URL,
} from "./Links";

export function FightMarkersEn() {
	return <>
		<NavH2Section id="fight-markers" label="Fight and Buff Markers" />
		<NavH3Section id="loading-presets" label="Loading Preset Fight Markers" />
		<Screenshot id="11" name="markers" />
		<p>
			<i>XIV in the Shell</i> provides preset timeline markers for on-content savage and
			ultimate fights, as well as a variety of other high-end content. These tracks are
			created by developers and community members, and illustrate precise timings for
			mechanics, downtimes, and incoming damage.
		</p>
		<p>
			Clicking the button with the name of a fight <b>(1)</b> adds its markers to the
			graphical timeline. Clicking the name of tracks for certain fights with phases{" "}
			<b>(2)</b> may also have separate tracks for each phase, explained in more detail in the
			next section.
		</p>
		<p>Presets are split into three categories:</p>
		<ul>
			<li>
				<b>Current content</b> The most recent tier of Savage-difficulty raid encounters,
				along with the current expansion's Ultimate encounters. This may also contain tracks
				for certain other high-end content, including Extreme trials, Criterion dungeons,
				and Quantum bosses.
			</li>
			<li>
				<b>Legacy ultimates</b> Full encounters or select phases of Ultimate encounters from
				previous expansions.
			</li>
			<li>
				<b>Archive</b> Older Savage tiers and other encounters from previous expansions.
			</li>
		</ul>
		<p>
			To load tracks beginning from a certain timestamp, adjust the value in the "Load tracks
			with time offset" field <b>(3)</b>, which adds the specified difference in seconds to
			all markers (for example, a value of 4 would delay all markers by 4 seconds, and a value
			of -4 would move all markers forward by 4 seconds). This offset is applied on top of
			individual phase offsets.
		</p>
		<p>
			Use the "clear all markers" button <b>(4)</b> to clear all markers. Use "remove
			duplicates" <b>(5)</b> to remove all extra copies of identical markers (same text,
			timestamp, track number, etc.), which may occur if a fight preset is loaded multiple
			times by mistake.
		</p>
		<NavH3Section
			id="loading-presets-phases"
			label="Loading Preset Markers for Fights With Phases"
		/>
		<Screenshot id="12" name="phase_load" />
		<p>
			If a preset track supports separate phases, click its name <b>(1)</b> to expand/collapse
			timing information for its phases.
		</p>
		<p>
			The "Load all phases" button <b>(2)</b> loads markers for all phases. The default
			timestamp for the start of a phase is shown next to each field <b>(3)</b>. These should
			be adjusted to account for different kill or push timings. Clicking the name of a
			particular phase <b>(4)</b> loads that phase's markers to the timeline; to create a
			timeline beginning from the start of a particular phase, set its offset to 0 before
			loading.
		</p>
		<p>
			The default phase transition timings in presets usually assume the previous phase lasted
			as long as possible. The beginning of a phase follows the definition provided by FFLogs,
			which is either the end of a "Down for the Count" debuff, or a boss becoming targetable.
			You can find these timings for a particular FFLogs report with the
			`type="targetabilityupdate"` filter, as shown below.
		</p>
		<img src="assets/ManualScreenshots/targetabilityupdate.png" />
		<p>
			Presets take time to create, and the languages in which they are available depend on the
			work of the community members that create them. If you're interested in submitting
			markers for a fight, please reach out to us!
		</p>
		<NavH3Section id="adding-custom-markers" label="Adding Party Buffs and Custom Markers" />
		<Screenshot id="13a" name="pct_opener" />
		<p>
			In addition to the site's built-in presets, you can add your own markers in the "Add
			buffs/markers" section <b>(1)</b>. Markers are split into three distinct categories:
		</p>
		<ul>
			<li>
				<b>Info</b> markers represent generic information about a timeline. This includes
				events like enemy cast bars, boss movements, and mechanic resolution timings.
			</li>
			<li>
				<b>Buff</b> markers represent raid buffs granted by party members. All buffs will
				automatically use their default in-game durations (which can be adjusted to account
				for edge cases like varying propagation timings or Dance Partner swaps), and their
				potency boosts are automatically applied to the damage table. You can see which
				abilities snapshot party buffs and self-applied buffs by a colored underline in the
				graphical timeline, or by hovering the skill image icon.
			</li>
			<li>
				<b>Untargetable</b> markers represent periods of time where all enemies are immune
				to damage, and cannot be targeted. Damage application events that would "ghost" by a
				boss becoming untargetable and DoT ticks that occur during an untargetable period
				are not added to potency totals.
			</li>
		</ul>
		<p>
			Each marker has a track number <b>(2)</b> that determines where it is visible in the
			timeline, where 0 is the bottom-most marker line, and increasing numbers stack on the
			lines above.
		</p>
		<p>
			Clicking on a marker in the timeline <b>(3)</b> will remove it, and restore its
			properties to the "Add buffs/markers" menu for further editing.
		</p>
		<NavH3Section id="exporting-markers" label="Exporting Markers" />
		<Screenshot id="13b" name="pct_opener" />
		<p>
			Marker tracks can be exported and shared with other users in the "Save marker tracks to
			file" menu <b>(1)</b>. Click the "all tracks combined" link <b>(2)</b> to download a
			single file containing all markers, which can then be imported through the "Load
			multiple tracks combined" option <b>(3)</b>. Clicking a link corresponding to a single
			track <b>(4)</b> will export all markers with that track number, which can then be
			imported with the "Load into individual track" option <b>(5)</b>.
		</p>
		<NavH3Section id="creating-markers-from-logs" label="Creating Marker Tracks From Logs" />
		<p>
			A single encounter can have a very large number of events that you may wish to encode
			within a marker track file. In these cases, you will most likely find it easier to
			produce markers in bulk from an FFLogs report.
		</p>
		<p>
			<i>XIV in the Shell</i> developers use a custom{" "}
			<a href={TRACK_SCRIPT_URL}>Python script</a> to generate track files from CSV files
			exported from FFLogs. See <a href={CREATING_TRACKS_URL}>this page</a> for detailed usage
			instructions. If you're unwilling or unable to run the Python script on your own
			computer, you may also run it directly in your web browser through our{" "}
			<a href={TRACK_SCRIPT_COLAB_NOTEBOOK_URL}>Colab notebook</a>.
		</p>
		<p>
			To retrieve markers directly from a report using the FFLogs API, you may also use
			leifengsang's <a href={MARKER_GEN_URL}>XivInTheShellMarkerGen</a> Python script
			(instructions in Chinese). This script reads a user-provided configuration file with
			names of enemy cast and damage events, and produces a track file directly from a report
			ID.
		</p>
	</>;
}

export function FightMarkersZh() {
	return <>
		<NavH2Section id="fight-markers" label="时间轴标记" />
		<NavH3Section id="loading-presets" label="载入预设时间轴标记" />
		<Screenshot id="11" name="markers" />
		<p>
			XIV in the Shell
			提供了当前零式、绝本及其他高难度内容的时间轴标记，由开发者和社区成员维护，精确标注机制判定、不可选中、伤害判定等时刻。
		</p>
		<p>
			点击副本名称 <b>(1)</b> 即可把整套标记加入图形时间轴。若该副本分阶段，点击副本名称{" "}
			<b>(2)</b> 可展开/收起各阶段详情，在下小节中会详细说明。
		</p>
		<p>预设时间轴标记按三类分组：</p>
		<ul>
			<li>
				<b>当前版本</b>{" "}
				包括最新版本零式与当前大版本绝本。也可能包含当前版本的其他高难度内容，如极神、异闻迷宫、深想战等。
			</li>
			<li>
				<b>过去绝本</b> 旧版本绝本或绝本某阶段。
			</li>
			<li>
				<b>归档</b> 旧版本零式及其他旧副本。
			</li>
		</ul>
		<p>
			如需从某时刻开始载入标记，可在“载入文件时间偏移” <b>(3)</b>{" "}
			输入秒数（正数推迟载入时间点，负数提前载入时间点）。该偏移会叠加在阶段偏移之上。
		</p>
		<p>
			“清控当前” <b>(4)</b> 可以一键清空所有标记；“删除重复标记” <b>(5)</b>{" "}
			可仅删除重复项（同名、同时间、同轨道等），避免重复加载。
		</p>
		<NavH3Section id="loading-presets-phases" label="分阶段载入预设" />
		<Screenshot id="12" name="phase_load" />
		<p>
			若副本支持分阶段载入预设，点击副本名称 <b>(1)</b> 展开可以展开/折叠阶段信息。
		</p>
		<p>
			“载入整场战斗” <b>(2)</b> 可以一次性载入整套标记。此处也会列出各阶段默认起始时间{" "}
			<b>(3)</b>。如果只想从某一阶段开始排轴，把该阶段偏移改为 0，再点击该阶段名称 <b>(5)</b>{" "}
			即可单独载入。
		</p>
		<p>
			预设中，默认的阶段切换时间以 FFLogs
			定义为准，即“不可选中”事件结束或BOSS重新可选中的瞬间。对于某份具体的Logs，可在 FFLogs 的
			Filter Expression 中输入type="targetabilityupdate"
			进行过滤，自行查询该场战斗的实际阶段切换时间。
		</p>
		<img src="assets/ManualScreenshots/targetabilityupdate.png" />
		<p>
			时间轴预设制作耗时且依赖社区多语言贡献。如果你愿意提交某场战斗的时间轴标记，请随时联系我们！
		</p>
		<NavH3Section id="adding-custom-markers" label="添加团队增益与自定义标记" />
		<Screenshot id="13a" name="pct_opener" />
		<p>
			除了网站内置的时间轴预设，你还可以在“添加Buff和标记”区域 <b>(1)</b>{" "}
			自行创建标记。标记分为三类：
		</p>
		<ul>
			<li>
				<b>备注信息</b> 用于展示时间轴上的通用信息，例如敌方读条、Boss
				行动、机制判定时机等。
			</li>
			<li>
				<b>团辅</b>{" "}
				代表队友提供的团辅。所有团辅默认使用游戏内的标准持续时间（可根据需要调整，以应对扩散生效或更换舞伴等特殊情况），其提供的威力加成会自动计入伤害统计表。你可以通过图形时间轴中技能图标下方的彩色下划线，或悬停在技能图标上，查看哪些技能快照了团队增益和自身增益。
			</li>
			<li>
				<b>不可选中</b> 表示所有敌人处于无敌状态且无法被选中的时间段。因 Boss
				不可选中而“打空”的伤害判定，以及在此期间触发的 DoT 伤害，均不会计入总威力。
			</li>
		</ul>
		<p>
			每条标记都有一个轨道序号 <b>(2)</b>，用于决定其在时间轴上的显示位置。序号 0
			为最底层轨道，序号越大，显示位置越靠上。
		</p>
		<p>
			点击时间轴上的某个标记 <b>(3)</b>{" "}
			可将其删除，其属性将同步到“添加Buff和标记”菜单中，方便进一步编辑。
		</p>
		<NavH3Section id="exporting-markers" label="导出标记" />
		<Screenshot id="13b" name="pct_opener" />
		<p>
			在“保存标记到文件”菜单 <b>(1)</b> 中，点击“所有轨道”链接 <b>(2)</b>{" "}
			可下载包含所有标记的单个文件，随后可通过“载入多轨文件”选项 <b>(3)</b> 导入。
		</p>
		<p>
			点击某个轨道序号对应的链接 <b>(4)</b> 可仅导出该轨道的标记，随后可通过“加载第_轨”选项{" "}
			<b>(4)</b> 导入。
		</p>
		<NavH3Section id="creating-markers-from-logs" label="从Logs生成时间轴标记" />
		<p>单场战斗可能包含大量事件，手动添加效率较低。此时，推荐使用 FFLogs 报告批量生成标记：</p>
		<p>
			XIV in the Shell 开发者提供一个<a href={TRACK_SCRIPT_URL}>Python脚本</a>，可将从 FFLogs
			导出的 CSV 文件转换为标记轨道文件。详细用法请参见
			<a href={CREATING_TRACKS_URL}>此页面</a>
			。如果你无法或不愿在本地运行脚本，也可以通过我们的{" "}
			<a href={TRACK_SCRIPT_COLAB_NOTEBOOK_URL}>Colab notebook</a> 直接在浏览器中运行。
		</p>
		<p>
			你也可以使用雷锋桑开发的 <a href={MARKER_GEN_URL}>XivInTheShellMarkerGen</a> Python
			脚本，通过 FFLogs API
			直接提取标记。该脚本读取用户提供的配置文件（包含敌方读条与伤害事件名称），并根据报告 ID
			自动生成轨道文件。（现在有gui了，似乎可以改一改这里的描述）
		</p>
	</>;
}
