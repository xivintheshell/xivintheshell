import React from "react";
import { localize } from "../Components/Localization";
import { getThemeColors, getCachedColorTheme } from "../Components/ColorTheme";
import { GITHUB_URL, HELP_CHANNEL_URL, BSKY_URL } from "../Components/IntroSection";

const BALANCE_PAGE_URL = "https://www.thebalanceffxiv.com/";
const ICY_VEINS_URL = "https://www.icy-veins.com/ffxiv/";

// Unlike pages within the main webapp, where localization is embedded for each text element,
// the localized sub-components of the manual are split up to ensure the semantic structure of
// the page is easier to read.
// The language of the page is determined by the language localStorage parameter set in the main site.
// We should probably expose a language selector here as well.

const colorTheme = getCachedColorTheme();

function Navbar() {
	return <nav
		style={{
			float: "right",
			zIndex: 1,
			marginRight: "1em",
		}}
	>
		<ul>
			<li>
				<a href="#overview">Overview</a>
			</li>
		</ul>
	</nav>;
}

export default function Manual() {
	const colors = getThemeColors(colorTheme);
	// TODO properly share with main component
	const styleblock = <style>{`
		@supports selector(::-webkit-scrollbar) {
			.visibleScrollbar::-webkit-scrollbar {
				appearance: none;
				background-color: ${colors.bgLowContrast};
				height: 8px;
				width: 5px;
			}
			.visibleScrollbar::-webkit-scrollbar-thumb {
				background-color: ${colors.bgHighContrast};
			}
			.invisibleScrollbar::-webkit-scrollbar {
				appearance: none;
				background-color: clear;
				height: 8px;
				width: 5px;
			}
			.invisibleScrollbar::-webkit-scrollbar-thumb {
				background-color: ${colors.bgHighContrast};
			}
		}
		@supports not selector(::-webkit-scrollbar) {
			.visibleScrollbar {
				scrollbar-color: ${colors.bgHighContrast} ${colors.bgLowContrast};
				scrollbar-width: thin;
			}
			.invisibleScrollbar {
				scrollbar-width: none;
			}
		}
		a {
			color: ${colors.accent};
		}
		b, h1, h2, h3, h4 {
			color: ${colors.emphasis};
			margin-bottom: 0.2em;
		}
		p {
			margin-block-start: 0.2em;
			margin-block-end: 0.2em;
		}
		p:first-child {
			margin-block-start: 0px;
		}
		::selection {
			background: rgba(147, 112, 219, 0.4);
		}
		option, select {
			color: ${colors.text};
			background-color: ${colors.background};
		}
		button, input[type="submit"], ::-webkit-file-upload-button {
			color: ${colors.text};
			background-color: ${colors.bgLowContrast};
			border: 1px solid ${colors.bgHighContrast};
		}
		input[type="radio"] {
			appearance: none;
			width: 1em;
			height: 1em;
			border: 1px solid ${colors.bgHighContrast};
			border-radius: 50%;
			background-clip: content-box;
			padding: 2px;
		}
		input[type="radio"]:checked {
			background-color: ${colors.accent};
		}
		input[type="checkbox"] {
			appearance: none;
			width: 1em;
			height: 1em;
			border: 1px solid ${colors.bgHighContrast};
			border-radius: 1px;
			background-clip: content-box;
			padding: 2px;
		}
		input[type="checkbox"]:checked:after {
			content: '\\2714';
			color: ${colors.accent};
			position: absolute;
			font-size: 22px;
			top: -6px;
			left: -2px;
		}
		input[type="range"] {
			appearance: none;
			background-color: transparent;
			border: 1px solid ${colors.bgHighContrast};
			vertical-align: middle;
			height: 0.9em;
			border-radius: 0.45em;
			overflow: hidden;
			padding: 0.05em;
		}
		input[type="range"]::-webkit-slider-thumb {
			appearance: none;
			background-color: ${colors.accent};
			width: 0.8em;
			height: 0.8em;
			border-radius: 0.4em;
		}
		.help-tooltip {
			color: ${colors.text};
			background-color: ${colors.tipBackground};
			opacity: 0.98;
			max-width: 300px;
			outline: 1px solid ${colors.bgHighContrast};
			transition: none;
			font-size: 100%;
			z-index: 10;
		}
		button:disabled {
			background-color: ${colors.background};
		}
	`}</style>;
	return <div
		style={{
			position: "fixed",
			top: 0,
			bottom: 0,
			left: 0,
			right: 0,
			outline: "none",
			accentColor: colors.accent,
			fontFamily: "monospace",
			fontSize: 14,
			color: colors.text,
			backgroundColor: colors.background,
			height: "100%",
		}}
		tabIndex={-1}
	>
		{styleblock}
		<div id="nav-container">
			<Navbar />
		</div>
		<div
			style={{
				marginLeft: "1em",
				marginRight: "1em",
				display: "flex",
				flexDirection: "column",
			}}
			tabIndex={-1}
		>
			{localize({ en: BodyEn(), zh: BodyZh() })}
		</div>
	</div>;
}

function BodyEn() {
	return <>
		<h1>XIV in the Shell User Manual</h1>
		<p
			style={{
				marginLeft: "2em",
				marginTop: "-0.2em",
				marginBottom: "1em",
			}}
		>
			<i>by shanzhe and whoever else he ropes into this</i>
		</p>
		<p>
			Welcome to XIV in the Shell, a rotation planner tool for Final Fantasy XIV! This page
			walks you through how to make the most of our timeline creation and manipulation
			features to improve your gameplay. Use the navigation bar on the right to find help for
			a specific feature.
		</p>
		<p>
			This guide only covers how to use this tool for planning, not how to choose what
			abilities to use in your rotation. For resources on how to learn and optimize your job,
			please refer to other sites like <a href={BALANCE_PAGE_URL}>The Balance</a> and{" "}
			<a href={ICY_VEINS_URL}>Icy Veins</a>.
		</p>
		<p>
			For feedback or questions about this page, please reach out to us on{" "}
			<a href={GITHUB_URL}>GitHub</a>, <a href={BSKY_URL}>Bluesky</a>, or on Discord through
			our <a href={HELP_CHANNEL_URL}>support channel in The Balance</a>.
		</p>
		<h2 id="overview">Overview</h2>
		<h3>Why XIV in the Shell?</h3>
		<h3>Features</h3>
		<h3>Keyboard Shortcuts</h3>
		<h3>Quick Technical Details</h3>
		<h2>Timeline Creation and Editing</h2>
		<h3>Setup and Configuration</h3>
		<h3>Adding Skills</h3>
		<h3>Adding Time Delays and Waits</h3>
		<h3>Rearranging and Deleting Skills</h3>
		<h3>Skill Sequence Presets</h3>
		<h3>The Timeline Editor Table</h3>
		<h2>Timeline Analysis</h2>
		<h3>Potency and PPS</h3>
		<h3>The Damage Table</h3>
		<h3>DoT Applications</h3>
		<h2>Timeline and Buff Markers</h2>
		<h3>Loading Preset Fight Markers</h3>
		<h3>Adding Party Buffs or Custom Markers</h3>
		<h3>Creating Marker Tracks From Logs</h3>
		<h2>Import and Export</h2>
		<h3>Saving to a File</h3>
		<h3>Importing From FFLogs</h3>
		<h3>Copy/Paste With Spreadsheets</h3>
		<h3>Copy/Paste With Discord</h3>
		<h3>Exporting an Image</h3>
		<h3>Exporting for Tischel's Dalamud Plugin</h3>
		<h3>Exporting to Amarantine's Combat Simulator</h3>
	</>;
}

function BodyZh() {
	return <>
		<p>todo中文</p>
	</>;
}
