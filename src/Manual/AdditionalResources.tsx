import React from "react";
import { NavH2Section } from "./Manual";
import {
	GITHUB_URL,
	HELP_CHANNEL_URL,
	BSKY_URL,
	BLOG_URL,
	TISCHEL_PLUGIN_URL,
	OFFICIAL_JOB_GUIDE_URL,
	FFXIV_WIKI_URL,
	XIVAPI_URL,
	XIV_ID_URL,
	BALANCE_PAGE_URL,
	ICY_VEINS_URL,
	FFLOGS_URL,
	ALLAGAN_STUDIES_URL,
	BATTLE_SYSTEM_DISCUSSION_URL,
	SAVAGE_SPEEDKILL_JP_URL,
	SAVAGE_SPEEDKILL_EN_URL,
	GAMES_HAUNTED_URL,
	FPS_TAX_CN_URL,
	FPS_TAX_EN_URL,
	XIVANALYSIS_URL,
	XIVGEAR_URL,
	XIVRAIDER_URL,
	AMA_SIM_URL,
	CN_JOB_GUIDE_URL,
	CN_WIKI_URL,
	CN_MATH_WIZARD_URL,
	CN_GEARING_URL,
} from "./Links";

export function AdditionalResourcesEn() {
	return <>
		<NavH2Section id="additional-resources" label="Additional Resources" />
		<p className="no-indent">
			<i>XIV in the Shell</i>: <a href={GITHUB_URL}>GitHub</a> - <a href={BLOG_URL}>Blog</a> -{" "}
			<a href={BSKY_URL}>Bluesky</a> -{" "}
			<a href={HELP_CHANNEL_URL}>Discord channel in The Balance</a> -{" "}
			<a href={TISCHEL_PLUGIN_URL}>Tischel's BLM in the Shell Dalamud Plugin</a>
		</p>
		<p className="no-indent">
			Game assets and information:{" "}
			<a href={OFFICIAL_JOB_GUIDE_URL}>Official FFXIV PvE job guide</a> -{" "}
			<a href={FFXIV_WIKI_URL}>FFXIV Community Wiki</a> - <a href={XIVAPI_URL}>XIVAPI</a> -{" "}
			<a href={XIV_ID_URL}>XIV-ID</a>
		</p>
		<p className="no-indent">
			Job gameplay: <a href={BALANCE_PAGE_URL}>The Balance</a> -{" "}
			<a href={ICY_VEINS_URL}>Icy Veins</a> - <a href={FFLOGS_URL}>FFLogs</a>
		</p>
		<p className="no-indent">
			Game formulas, mechanics, and other cursed knowledge:{" "}
			<a href={ALLAGAN_STUDIES_URL}>Allagan Studies</a> -{" "}
			<a href={BATTLE_SYSTEM_DISCUSSION_URL}>#battle_system_discussion in The Balance</a> -
			Savage Speedkill Memorandum [<a href={SAVAGE_SPEEDKILL_JP_URL}>JP</a>][
			<a href={SAVAGE_SPEEDKILL_EN_URL}>EN</a>] -{" "}
			<a href={GAMES_HAUNTED_URL}>Game's Haunted</a> - FPS tax research [
			<a href={FPS_TAX_CN_URL}>CN</a>][
			<a href={FPS_TAX_EN_URL}>EN</a>]
		</p>
		<p className="no-indent">
			Other FFXIV community tools: <a href={XIVANALYSIS_URL}>xivanalysis</a> -{" "}
			<a href={XIVGEAR_URL}>XivGear</a> - <a href={XIVRAIDER_URL}>XIV Raider</a> and{" "}
			<a href={AMA_SIM_URL}>Ama's Combat Sim</a>
		</p>
	</>;
}

export function AdditionalResourcesZh() {
	return <>
		<NavH2Section id="additional-resources" label="附录" />
		<p className="no-indent">
			<i>XIV in the Shell</i>: <a href={GITHUB_URL}>GitHub</a> - <a href={BLOG_URL}>Blog</a> -{" "}
			<a href={BSKY_URL}>Bluesky</a> - <a href={HELP_CHANNEL_URL}>Discord频道</a> -{" "}
			<a href={TISCHEL_PLUGIN_URL}>Tischel的BLM in the Shell卫月插件</a>
		</p>
		<p className="no-indent">
			相关游戏资源: <a href={CN_JOB_GUIDE_URL}>最终幻想XIV职业指南</a> -{" "}
			<a href={CN_WIKI_URL}>最终幻想XIV灰机wiki</a> - <a href={XIVAPI_URL}>XIVAPI</a> -{" "}
			<a href={XIV_ID_URL}>XIV-ID</a>
		</p>
		<p className="no-indent">
			职业玩法: <a href={BALANCE_PAGE_URL}>The Balance</a> -{" "}
			<a href={ICY_VEINS_URL}>Icy Veins</a> - <a href={FFLOGS_URL}>FFLogs</a>
		</p>
		<p className="no-indent">
			计算公式，游戏机制和其他相关知识: <a href={ALLAGAN_STUDIES_URL}>Allagan Studies</a> -{" "}
			<a href={CN_MATH_WIZARD_URL}>光之数学家 第三版</a> -{" "}
			<a href={BATTLE_SYSTEM_DISCUSSION_URL}>The Balance的战斗系统讨论频道</a> -
			零式速刷备忘录 [<a href={SAVAGE_SPEEDKILL_JP_URL}>日文</a>][
			<a href={SAVAGE_SPEEDKILL_EN_URL}>英文</a>] -{" "}
			<a href={GAMES_HAUNTED_URL}>Game's Haunted</a> - 帧率税相关研究 [
			<a href={FPS_TAX_CN_URL}>中文</a>][
			<a href={FPS_TAX_EN_URL}>英文</a>]
		</p>
		<p className="no-indent">
			其他社区工具: <a href={XIVANALYSIS_URL}>xivanalysis</a> -{" "}
			<a href={CN_GEARING_URL}>最终幻想14配装器</a> - <a href={XIVRAIDER_URL}>XIV Raider</a>{" "}
			和 <a href={AMA_SIM_URL}>Ama的战斗模拟器</a>
		</p>
	</>;
}
