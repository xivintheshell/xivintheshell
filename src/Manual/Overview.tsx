import React from "react";
import { ButtonIndicator } from "../Components/Common";
import { NavH3Section, NavH2Section } from "./Manual";
import { BLOG_1_URL, ETRO_URL, XIVGEAR_URL, AMA_SIM_URL, GITHUB_URL } from "./Links";

const bi = (k: string) => <ButtonIndicator text={k} />;

export function OverviewEn() {
	return <>
		<NavH2Section id="overview" label={<>Overview</>} />
		<NavH3Section
			id="what-is-xivintheshell"
			label={
				<>
					What is <i>XIV in the Shell</i>?
				</>
			}
		/>
		<p>
			I answered this question in more detail in our <a href={BLOG_1_URL}>first blog post</a>,
			but I’ve copied the important parts here.
		</p>
		<p>
			<b>
				<i>XIV in the Shell</i> (<a href="/">https://xivintheshell.com</a>) is a web-based
				FFXIV rotation planner and job simulator.
			</b>
		</p>
		<p>
			That’s it! Most high-end raids in FFXIV have very predictable timelines, and the
			mechanics of each fight force players to react differently to maintain a coherent
			rotation. Melees may need to disengage, casters may need to save resources for extended
			movement, and parties may adjust buff window timings in unconventional ways. Our tool
			lets you compare a DPS timeline against a fight's mechanic timeline and party buff
			windows, and makes precise planning accessible in a way that traditional
			spreadsheet-based tools do not.
		</p>
		<p>
			Making rotational adaptations on the fly is a valuable skill for raiders to have, but
			planning while outside instance is useful all the same. Even outside hardcore
			optimization environments, there are a myriad of reasons to create rotation plans for a
			fight:
		</p>
		<ul>
			<li>Theorycrafting sequences for your job</li>
			<li>Getting more comfortable in fights you haven't yet cleared</li>
			<li>Getting more comfortable in fights you've already cleared</li>
			<li>Improving your understanding of a job's fundamentals</li>
			<li>Moving the colored number on your FFLogs profile up</li>
		</ul>
		<p>
			Rotation planning can also just be plain fun for its own sake. The interaction between
			fight mechanics and job kits is a challenging puzzle to solve, and discovering creative
			solutions then executing them well in-game is a uniquely rewarding experience.
		</p>
		<NavH3Section id="features" label="Features" />
		<p>
			<i>XIV in the Shell</i> provides the following capabilities:
		</p>
		<ul>
			<li>Rotation visualization in both a graphical timeline and spreadsheet-like table</li>
			<li>Full simulation of cooldowns, buffs, MP, and job gauge resources</li>
			<li>Customizable starting resources for planning specific phases</li>
			<li>
				Combat stat configuration and import from <a href={ETRO_URL}>etro</a>/
				<a href={XIVGEAR_URL}>XivGear</a>
			</li>
			<li>Rotation import from FFLogs</li>
			<li>Preset fight timelines for most high-end difficulty encounters</li>
			<li>Rotations and fight markers shareable as text files</li>
			<li>Customizable buff timings and timeline markers</li>
			<li>Customizable macros for sequences of multiple skills</li>
			<li>Potency calculation with party buffs and potion usage</li>
			<li>
				Compatibility with <a href={AMA_SIM_URL}>Amarantine's combat simulator</a> for more
				advanced DPS simulation
			</li>
			<li>Import/export from plain text, spreadsheets, and Discord emotes</li>
		</ul>
		<NavH3Section id="quickstart" label="Quick Start" />
		<p>To get started with making a timeline:</p>
		<ol>
			<li>
				Choose your job and combat stats from the "config" panel to the right of the skill
				hotbar, then click "apply and reset."
			</li>
			<p>
				[optional] Load fight markers for a specific encounter from the "Timeline markers"
				tab at the bottom of the page.
			</p>
			<li>
				Input skills by clicking on their icon in the skill hotbar. The simulation will
				automatically advance to the end of its animation lock or cast time. Clicking a
				skill will attempt to use it as soon as its cooldown and the current animation
				lock/GCD timer allows.
			</li>
			<li>
				Rearrange skills by clicking/dragging in the graphical timeline, and hit{" "}
				{bi("Delete")} to remove selected skills.
			</li>
			<p>
				For more details on how to use or configure specific features, please refer to the
				corresponding section in the navigation bar on the right.
			</p>
		</ol>
		<NavH3Section id="shortcuts" label="Keyboard Shortcuts" />
		<p>
			The following keyboard shortcuts are available anywhere on the site, except when editing
			a text/number input field (replace {bi("ctrl")} with {bi("cmd")} for Mac users):
		</p>
		<ul>
			<li>{bi("u")} Delete the last action in the active timeline.</li>
			<li>
				{bi("ctrl")}+{bi("z")} Undo last action.
			</li>
			<li>
				{bi("ctrl")}+{bi("y")} OR {bi("ctrl")}+{bi("shift")}+{bi("z")} Redo last action.
			</li>
			<li>
				{bi("ctrl")}+{bi("c")} Copy selected skills to clipboard. The format can be changed
				in the Settings tab at the bottom of the page.
			</li>
			<li>
				{bi("ctrl")}+{bi("x")} Cut selected skills to clipboard.
			</li>
			<li>
				{bi("ctrl")}+{bi("v")} Paste skills from the clipboard.
			</li>
		</ul>
		<ul>
			<p>
				The following shortcuts are available when interacting with the graphical timeline
				and the "Timeline editor" table:
			</p>
			<li>
				{bi("Backspace")} OR {bi("Delete")} Delete the selected skills from the timeline.
				Subsequent actions are rearranged to be used as soon as possible.
			</li>
			<li>
				{bi("↑")} Select the previous action in the timeline. If no actions are currently
				selected, select the last action in the timeline.
			</li>
			<li>
				{bi("↓")} Select the next action in the timeline. If no actions are currently
				selected, select the first action in the timeline.
			</li>
			<li>{bi("Home")} Select the first action in the timeline.</li>
			<li>{bi("End")} Select the last action in the timeline.</li>
			<li>
				{bi("Shift")}+{bi("↑")} / {bi("Shift")}+{bi("↓")} / {bi("Shift")}+{bi("Home")} /{" "}
				{bi("Shift")}+{bi("End")} Extend the selection window to the
				previous/next/first/last action.
			</li>
			<li>{bi("Escape")} Deselect all actions.</li>
			<li>
				{bi("ctrl")}+{bi("a")} Select all actions.
			</li>
		</ul>
		<NavH3Section id="update-policy" label="Update Policy" />
		<p>
			<i>XIV in the Shell</i> frequently receives updates to improve user experience and
			accuracy of its simulations. We make our best effort to ensure our updates do not break
			saved timelines whenever possible, but cannot always guarantee this, whether due to
			developer error or in-game changes. Please export your timelines often to reduce the
			risk of losing work.
		</p>
		<p>
			Potencies and job mechanics in <i>XIV in the Shell</i> reflect those in the latest
			global server version of FFXIV. We try to make updates available within a few days of
			each patch release, but may be slower depending on the developers' availability.
		</p>
		<NavH3Section id="technical-details" label="Quick Technical Details" />
		<p>
			<i>XIV in the Shell</i> is a client-only single page application. All data is stored
			within your web browser's localStorage module, so clearing your browsing data for{" "}
			<a href="/">xivintheshell.com</a> will permanently delete all of your saved rotations
			and markers. This also means that if you lose any data, we (the developers) are unable
			to recover it for you, because it never leaves the confines of your browser unless you
			explicitly send us your exported files through some other platform. It is highly
			unlikely that we will ever maintain a server of any kind, so as to keep
			development/maintenance costs minimal and reduce the likelihood of site downtime.
		</p>
		<p>
			This site is made in Typescript with Vite + React, and hosted with GitHub Pages. You can
			find our source code on GitHub at <a href={GITHUB_URL}>{GITHUB_URL}</a>. Contributions,
			bug reports, and feature requests are welcome!
		</p>
		<NavH3Section id="troubleshooting" label="Troubleshooting" />
		<p>
			In very rare cases, you may encounter a bug that completely breaks the website, causing
			it to render nothing but a white screen. If this happens, please raise a bug report with
			us on GitHub or Discord, and describe the most recent actions you took before the site
			crashed.
		</p>
		<p>
			If you're unable to communicate with us, you may attempt to fix the issue yourself by
			visiting one of the following links:
		</p>
		<ul>
			<li>
				<b>xivintheshell.com?resetResourceOverrides</b> Deletes all resource overrides and
				clears all actions in your saved timelines.
			</li>
			<li>
				<b>xivintheshell.com?resetAll</b> Deletes all your saved data in{" "}
				<i>XIV in the Shell</i>.
			</li>
			<li>
				<b>xivintheshell.com?resetFFLogsAuth</b> Resets data related to FFLogs
				authorization.
			</li>
		</ul>
		<p>
			If all these steps fail, please clear your browsing data for xivintheshell.com through
			your web browser's settings. Once again: remember to frequently download and save your
			timelines, should the worst come to pass!
		</p>
	</>;
}

export function OverviewZh() {
	return <>
		<NavH2Section id="overview" label={<>概述</>} />
		<NavH3Section id="what-is-xivintheshell" label={<>XIV in the Shell 是什么？</>} />
		<p>
			XIV in the Shell（<a href="/">https://xivintheshell.com</a>
			）是一个用于《最终幻想XIV》的循环规划与职业模拟的网页工具。
		</p>
		<p>
			在《最终幻想XIV》中，大多数高难度副本拥有可预测的时间轴，而玩家需要调整循环来应对机制处理。近战可能被迫远离，法系得预留资源应对长距离移动，团队也可能有非常规的团辅轴。我们的工具使你能把技能轴与副本机制或团辅轴并排比对，把传统表格难以实现的“精准规划”变得触手可及。
		</p>
		<p>
			进本摸轴是高难玩家的必修课，但提前排轴同样有用。即便不在极端环境下，为一场战斗排轴也有无数理由：
		</p>
		<ul>
			<li>帮助进行理论计算</li>
			<li>为还没通关的副本做预习</li>
			<li>为已通关的副本打磨细节</li>
			<li>加深对职业底层逻辑的理解</li>
			<li>使你在 FFLogs 上的颜色再好看一点</li>
		</ul>
		<p>
			有时候，单纯把排轴当成一种解谜游戏也足够有趣。副本机制与职业机体之间的博弈是一道充满挑战的谜题，找到最富有美感的循环并在实战中完美执行，会为你带来独一无二的成就感。
		</p>
		<NavH3Section id="features" label="功能概览" />
		<p>XIV in the Shell 提供以下功能：</p>
		<ul>
			<li>提供图形时间轴与时间轴表格两种循环可视化方案</li>
			<li>完整模拟技能CD、Buff、蓝量与职业量谱资源</li>
			<li>可自定义初始资源，方便针对特定战斗阶段进行规划</li>
			<li>
				配置战斗属性，支持从 <a href={ETRO_URL}>etro</a>/<a href={XIVGEAR_URL}>XivGear</a>{" "}
				一键导入装备
			</li>
			<li>支持从 FFLogs 导入战斗记录</li>
			<li>内置大部分高难度副本的预设时间轴</li>
			<li>循环轴与机制标记均可导出为文件，方便分享</li>
			<li>可自定义的团辅与时间轴标记</li>
			<li>预设技能序列</li>
			<li>含团辅与爆发药的威力计算</li>
			<li>
				兼容<a href={AMA_SIM_URL}>Amarantine的战斗模拟器</a>，进阶 DPS 模拟
			</li>
			<li>支持纯文本、表格、Discord 表情等多种导入/导出格式</li>
		</ul>
		<NavH3Section id="quickstart" label="快速上手" />
		<p>要创建时间轴，请按以下步骤操作：</p>
		<ol>
			<li>在技能栏右侧的“属性设置”面板设置职业与属性，点击“应用并重置时间轴”。</li>
			<p>【可选】点击页面底部的“时间轴标记”标签，为特定副本载入机制标记。</p>
			<li>
				点击技能栏中的图标输入技能。时间轴会自动推进到该技能的后摇或读条结束。点击技能会使其在最早可用时间施放。
			</li>
			<li>在时间轴中拖拽可对技能进行排序，选中技能后按 {bi("Delete")} 键即可删除。</li>
			<p>如需了解各功能的用法与配置细节，请使用右侧导航栏跳转到对应章节。</p>
		</ol>
		<NavH3Section id="shortcuts" label="键盘快捷键" />
		<p>
			T以下快捷键在全站通用（编辑文本/数字输入框时除外；Mac 用户将 {bi("ctrl")} 替换为{" "}
			{bi("cmd")}：
		</p>
		<ul>
			<li>{bi("u")} 删除时间轴上最后的技能</li>
			<li>
				{bi("ctrl")}+{bi("z")} 撤销
			</li>
			<li>
				{bi("ctrl")}+{bi("y")} 或 {bi("ctrl")}+{bi("shift")}+{bi("z")} 重做
			</li>
			<li>
				{bi("ctrl")}+{bi("c")} 将选中技能复制到剪贴板（格式可在页面底部“设置”更改）
			</li>
			<li>
				{bi("ctrl")}+{bi("x")} 将选中技能剪切到剪贴板
			</li>
			<li>
				{bi("ctrl")}+{bi("v")} 从剪贴板粘贴技能
			</li>
		</ul>
		<ul>
			<p>在时间轴与“时间轴编辑器”表格中，还可使用：</p>
			<li>
				{bi("Backspace")} 或 {bi("Delete")} 删除选中技能，后续技能自动前移
			</li>
			<li>{bi("↑")} 选上一行；若当前无选中，则跳至最后一行</li>
			<li>{bi("↓")} 选下一行；若当前无选中，则跳至首行</li>
			<li>{bi("Home")} 跳至首行</li>
			<li>{bi("End")} 跳至末行</li>
			<li>
				{bi("Shift")}+{bi("↑")} / {bi("Shift")}+{bi("↓")} / {bi("Shift")}+{bi("Home")} /{" "}
				{bi("Shift")}+{bi("End")} 扩展选区至上一行/下一行/首行/末行
			</li>
			<li>{bi("Escape")} 取消所有选择</li>
			<li>
				{bi("ctrl")}+{bi("a")} 全选
			</li>
		</ul>
		<NavH3Section id="update-policy" label="更新政策" />
		<p>
			XIV in the Shell
			会持续更新，以提升用户体验与模拟准确性。我们会尽最大努力确保更新不会破坏已保存的时间轴，但受限于开发失误或游戏本身改动，无法百分百保证兼容。请定期导出你的时间轴，避免意外丢失。本工具内的威力与职业机制均以国际服最新版本为准。我们力争在每次补丁上线后数日内完成更新，但具体进度仍取决于开发者的可用时间。
		</p>
		<NavH3Section id="technical-details" label="技术简讯" />
		<p>
			XIV in the Shell 是一款纯客户端单页应用，所有数据仅保存在浏览器的本地缓存中。一旦清除
			xivintheshell.com
			的浏览数据，所有缓存的循环与标记将永久丢失。这同时意味着若发生数据遗失，开发者将无法协助恢复，因为除非你自己导出文件并通过其他平台发送给我们，数据从未离开你的浏览器。同时，为把开发/维护成本压到最低和最大限度减少宕机风险，我们极大概率不会搭建任何服务器。
		</p>
		<p>
			本站基于 TypeScript + Vite + React 构建，托管于 GitHub Pages。源代码公开在{" "}
			<a href={GITHUB_URL}>{GITHUB_URL}</a>，欢迎贡献代码、反馈 Bug 与进行功能建议！
		</p>
		<NavH3Section id="troubleshooting" label="故障排查" />
		<p>
			极少数情况下，你可能会遇到严重 Bug导致网站白屏。如果发生上述状况，请通过
			GitHub、QQ群、或 Discord 向我们提交报告，并描述崩溃前的最后操作。
		</p>
		<p>若无法联系我们，可尝试以下链接进行修复：</p>
		<ul>
			<li>
				<b>xivintheshell.com?resetResourceOverrides</b>{" "}
				删除所有预设资源并清空已保存时间轴的所有技能
			</li>
			<li>
				<b>xivintheshell.com?resetAll</b> 清除 XIV in the Shell 的所有本地数据
			</li>
			<li>
				<b>xivintheshell.com?resetFFLogsAuth</b> 重置与 FFLogs 授权相关的数据
			</li>
		</ul>
		<p>
			若以上方法仍无效，请在浏览器设置里手动清除
			xivintheshell.com的浏览数据。再次提醒：以防万一，务必定期导出并备份你的时间轴！
		</p>
	</>;
}
