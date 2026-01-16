import React from "react";
import { GITHUB_URL, HELP_CHANNEL_URL, BSKY_URL } from "../Components/IntroSection";

const BALANCE_PAGE_URL = "https://www.thebalanceffxiv.com/";
const ICY_VEINS_URL = "https://www.icy-veins.com/ffxiv/";
const MATERIALS_LICENSE_URL = "https://support.na.square-enix.com/rule.php?id=5382&la=1&tag=authc";

export function IntroEn() {
	return <>
		<p
			style={{
				marginLeft: "2em",
				marginTop: "-0.2em",
				marginBottom: "1em",
			}}
		>
			<i>by Shanzhe Qi @ Seraph</i> -- last updated 16 January 2026
		</p>
		<p>
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
		<br />
		<p>
			FINAL FANTASY is a registered trademark of Square Enix Holdings Co., Ltd. Game ability
			and status images are © SQUARE ENIX, and used for non-commercial purposes in compliance
			with the <a href={MATERIALS_LICENSE_URL}>Final Fantasy XIV Materials Usage License</a>.
		</p>
	</>;
}
