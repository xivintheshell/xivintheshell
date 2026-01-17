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
} from "./Links";

export function AdditionalResourcesEn() {
	return <>
		<NavH2Section id="additional-resources" label="Additional Resources" />
		<p>
			<i>XIV in the Shell</i>: <a href={GITHUB_URL}>GitHub</a> - <a href={BLOG_URL}>Blog</a> -{" "}
			<a href={BSKY_URL}>Bluesky</a> -{" "}
			<a href={HELP_CHANNEL_URL}>Discord channel in The Balance</a> -{" "}
			<a href={TISCHEL_PLUGIN_URL}>Tischel's BLM in the Shell Dalamud Plugin</a>
		</p>
		<p>
			Game assets and information:{" "}
			<a href={OFFICIAL_JOB_GUIDE_URL}>Official FFXIV PvE job guide</a> -{" "}
			<a href={FFXIV_WIKI_URL}>FFXIV Community Wiki</a> - <a href={XIVAPI_URL}>XIVAPI</a> -{" "}
			<a href={XIV_ID_URL}>XIV-ID</a>
		</p>
		<p>
			Job gameplay: <a href={BALANCE_PAGE_URL}>The Balance</a> -{" "}
			<a href={ICY_VEINS_URL}>Icy Veins</a> - <a href={FFLOGS_URL}>FFLogs</a>
		</p>
		<p>
			Game formulas, mechanics, and other cursed knowledge:{" "}
			<a href={ALLAGAN_STUDIES_URL}>Allagan Studies</a> -{" "}
			<a href={BATTLE_SYSTEM_DISCUSSION_URL}>#battle_system_discussion in The Balance</a> -
			Savage Speedkill Memorandum [<a href={SAVAGE_SPEEDKILL_JP_URL}>JP</a>][
			<a href={SAVAGE_SPEEDKILL_EN_URL}>EN</a>] -{" "}
			<a href={GAMES_HAUNTED_URL}>Game's Haunted</a> - FPS tax research [
			<a href={FPS_TAX_CN_URL}>CN</a>][
			<a href={FPS_TAX_EN_URL}>EN</a>]
		</p>
		<p>
			Other FFXIV community tools: <a href={XIVANALYSIS_URL}>xivanalysis</a> -{" "}
			<a href={XIVGEAR_URL}>XivGear</a> - <a href={XIVRAIDER_URL}>XIV Raider</a> and{" "}
			<a href={AMA_SIM_URL}>Ama's Combat Sim</a>
		</p>
	</>;
}
