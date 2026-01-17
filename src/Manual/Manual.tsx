import React, { useContext, createContext, useState, useEffect, useCallback } from "react";
import { ContentNode } from "../Components/Common";
import { localize } from "../Components/Localization";
import { getThemeColors, getCachedColorTheme } from "../Components/ColorTheme";
import { IntroEn } from "./Intro";
import { OverviewEn } from "./Overview";
import { TimelineCreationEn } from "./TimelineCreation";
import { TimelineAnalysisEn } from "./TimelineAnalysis";
import { FightMarkersEn } from "./FightMarkers";
import { ImportExportEn } from "./ImportExport";
import { AdditionalResourcesEn } from "./AdditionalResources";

// Unlike pages within the main webapp, where localization is embedded for each text element,
// the localized sub-components of the manual are split up to ensure the semantic structure of
// the page is easier to read.
// The language of the page is determined by the language localStorage parameter set in the main site.
// We should probably expose a language selector here as well.

const colorTheme = getCachedColorTheme();

interface NavItem {
	id: string;
	label: ContentNode;
	indentLevel: number;
}

const NavContext = createContext<{ items: NavItem[]; addItem: (it: NavItem) => void }>({
	items: [],
	addItem: () => {},
});

function Navbar() {
	const navCtx = useContext(NavContext);
	return <nav
		style={{
			float: "right",
			zIndex: 1,
		}}
	>
		<p>Navigation</p>
		<ul>
			<li>
				<a href="#top">back to top</a>
			</li>
			{navCtx.items.map(({ id, label, indentLevel }) => {
				return <li key={id}>
					{Array(indentLevel).map(() => "&nbsp;")}
					<a href={"#" + id}>{label}</a>
				</li>;
			})}
		</ul>
	</nav>;
}

/**
 * A section labeled with an <h2> HTML element that's automatically added to the navbar.
 */
export function NavH2Section(props: {
	id: string;
	label: ContentNode;
	content?: React.ReactElement;
}) {
	const navCtx = useContext(NavContext);
	useEffect(() => navCtx.addItem({ id: props.id, label: props.label, indentLevel: 1 }), []);
	return <>
		<h2 id={props.id}>{props.label}</h2>
		{props.content}
	</>;
}

/**
 * A section labeled with an <h3> HTML element that's automatically added to the navbar.
 */
export function NavH3Section(props: {
	id: string;
	label: ContentNode;
	content?: React.ReactElement;
}) {
	const navCtx = useContext(NavContext);
	useEffect(() => navCtx.addItem({ id: props.id, label: props.label, indentLevel: 2 }), []);
	return <>
		<h3 id={props.id}>{props.label}</h3>
		{props.content}
	</>;
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

	const [childHeaders, setChildHeaders] = useState<NavItem[]>([]);
	const addChild = useCallback(({ id, label, indentLevel }: NavItem) => {
		setChildHeaders((oldHeaders) => {
			// Avoid duplicates if strict mode or hot refresh triggers double-mounts
			if (oldHeaders.find((h) => h.id === id)) {
				return oldHeaders;
			}
			return [...oldHeaders, { id, label, indentLevel }];
		});
	}, []);
	return <div
		className="visibleScrollbar"
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
			overflow: "auto",
		}}
		tabIndex={-1}
	>
		{styleblock}
		<NavContext.Provider value={{ items: childHeaders, addItem: addChild }}>
			<div
				id="nav-container"
				style={{
					position: "sticky",
					top: "1rem",
					marginInline: "1rem",
				}}
			>
				<Navbar />
			</div>
			<div
				style={{
					marginLeft: "1em",
					marginRight: "1em",
					paddingRight: "1em",
					display: "flex",
					flexDirection: "column",
				}}
				tabIndex={-1}
			>
				{localize({ en: BodyEn(), zh: BodyZh() })}
			</div>
		</NavContext.Provider>
	</div>;
}

function BodyEn() {
	return <>
		<h1 id="top">XIV in the Shell User Manual</h1>
		<IntroEn />
		<OverviewEn />
		<TimelineCreationEn />
		<TimelineAnalysisEn />
		<FightMarkersEn />
		<ImportExportEn />
		<AdditionalResourcesEn />
	</>;
}

function BodyZh() {
	return <>
		<p>todo中文</p>
	</>;
}
