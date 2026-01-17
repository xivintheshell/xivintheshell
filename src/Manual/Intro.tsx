import React from "react";
import { Separator } from "@base-ui-components/react/separator";
import { HELP_QQ_GROUP } from "../Components/IntroSection";
import { getCachedColorTheme, getThemeColors } from "../Components/ColorTheme";
import {
	GITHUB_URL,
	HELP_CHANNEL_URL,
	BSKY_URL,
	BALANCE_PAGE_URL,
	ICY_VEINS_URL,
	MATERIALS_LICENSE_URL,
	CN_TUTORIAL_URL,
} from "./Links";

const colorTheme = getCachedColorTheme();
const Sep = () => <Separator
	orientation="vertical"
	style={{ width: "1px", backgroundColor: getThemeColors(colorTheme).text }}
/>;

const AUTHOR_DIV_STYLE: React.CSSProperties = {
	marginLeft: "2em",
	marginTop: "-0.2em",
	marginBottom: "1em",
	display: "flex",
	gap: "0.5rem",
};

export function IntroEn() {
	return <>
		<div style={AUTHOR_DIV_STYLE}>
			<div>
				<i>by Shanzhe Qi @ Seraph</i>
			</div>
			<Sep />
			<div>last updated 16 January 2026</div>
		</div>
		<p className="no-indent">
			Welcome to <i>XIV in the Shell</i>, a rotation planner tool for <i>Final Fantasy XIV</i>
			! This page walks you through how to make the most of our timeline creation and
			manipulation features to improve your gameplay. Use the navigation bar on the right to
			find help for a specific feature.
		</p>
		<p>
			This manual only covers how to use this tool for planning, not how to choose what
			abilities to use in your rotation. For resources for learning and optimizing your job,
			please refer to other sites like <a href={BALANCE_PAGE_URL}>The Balance</a> and{" "}
			<a href={ICY_VEINS_URL}>Icy Veins</a>. Further information about jobs and FFXIV's combat
			system can be found in the <a href="#additional-resources">Additional Resources</a>{" "}
			section of this page.
		</p>
		<p>
			For feedback or questions about this page, please reach out to us on{" "}
			<a href={GITHUB_URL}>GitHub</a> on Discord through our{" "}
			<a href={HELP_CHANNEL_URL}>support channel in The Balance</a>, or on{" "}
			<a href={BSKY_URL}>Bluesky</a>.
		</p>
		<p>
			This manual page can always be found at <a href="/manual">xivintheshell.com/manual</a>
			or <a href="/manual_en">xivintheshell.com/manual_en</a>.
		</p>
		<p>
			FINAL FANTASY is a registered trademark of Square Enix Holdings Co., Ltd. Game ability
			and status images are © SQUARE ENIX, and used for non-commercial purposes in compliance
			with the <a href={MATERIALS_LICENSE_URL}>Final Fantasy XIV Materials Usage License</a>.
		</p>
	</>;
}

export function IntroZh() {
	return <>
		<div style={AUTHOR_DIV_STYLE}>
			<i>作者：Shanzhe Qi @ Seraph</i> <Sep /> <i>翻译：羽卡（由ai帮助）</i> <Sep />{" "}
			最近更新：2026年1月16号
		</div>
		<p>
			欢迎来到 XIV in the
			Shell，一个为《最终幻想XIV》设计的循环规划工具！本页面将带你了解如何充分利用我们的时间轴创建与编辑功能，从而帮助你提升游戏体验。在右侧目录中可以快速查找特定功能的说明。你也可以观看由雷锋桑和羽卡制作的
			<a href={CN_TUTORIAL_URL}>视频教程</a>来快速上手网站大部分功能。
		</p>
		<p>
			本页面仅介绍如何使用本工具进行循环规划，并不涉及在循环中应如何选择技能。如需要学习并优化你的职业玩法，请参考{" "}
			<a href={BALANCE_PAGE_URL}>The Balance</a>、<a href={ICY_VEINS_URL}>Icy Veins</a>{" "}
			等其他网站。如果你想要了解关于各职业及《最终幻想XIV》战斗系统的更多信息，可以参见本手册的附录部分。
		</p>
		<p>
			如对本页面有任何反馈或疑问，请通过以下方式联系我们：<a href={GITHUB_URL}>GitHub</a>、
			XIV in the Shell反馈QQ群号{HELP_QQ_GROUP}、
			<a href={HELP_CHANNEL_URL}>The Balance 的支持频道（Discord）</a>，或{" "}
			<a href={BSKY_URL}>Bluesky</a>。
		</p>
		<p>
			本页面随时可在<a href="/manual">xivintheshell.com/manual</a>或
			<a href="/manual_zh">xivintheshell.com/manual_zh</a>查看。
		</p>
		<p>
			FINAL FANTASY 是 Square Enix Holdings Co., Ltd. 的注册商标。游戏技能与状态图标版权归属于
			SQUARE ENIX，仅在遵守《最终幻想XIV 素材使用许可》的前提下用于非商业用途。
		</p>
	</>;
}
