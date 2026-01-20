import React, { useContext, createContext, useState, useEffect, useCallback, useRef } from "react";
import { ContentNode, DEFAULT_FONTS } from "../Components/Common";
import { getThemeColors, getCachedColorTheme } from "../Components/ColorTheme";
import { IntroEn, IntroZh } from "./Intro";
import { OverviewEn, OverviewZh } from "./Overview";
import { TimelineCreationEn, TimelineCreationZh } from "./TimelineCreation";
import { TimelineAnalysisEn, TimelineAnalysisZh } from "./TimelineAnalysis";
import { FightMarkersEn, FightMarkersZh } from "./FightMarkers";
import { ImportExportEn, ImportExportZh } from "./ImportExport";
import { AdditionalResourcesEn, AdditionalResourcesZh } from "./AdditionalResources";

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

function Navbar(props: { language: string | undefined }) {
	const navCtx = useContext(NavContext);
	return <nav
		style={{
			float: "right",
			zIndex: 1,
			maxWidth: "18%",
		}}
	>
		<p className="no-indent" style={{ paddingLeft: "0.8rem" }}>
			{props.language === "zh" ? "网站导航" : "Navigation"}
		</p>
		<ul style={{ listStyleType: "none", paddingLeft: "0.8rem", marginTop: "0.3rem" }}>
			<li style={{ paddingBlockEnd: "0.15rem" }}>
				<a href="#top">{props.language === "zh" ? "返回页面顶部" : "back to top"}</a>
			</li>
			{navCtx.items.map(({ id, label, indentLevel }) => {
				return <li
					key={id}
					style={{
						paddingLeft: indentLevel > 0 ? `${indentLevel * 1.5}em` : undefined,
						paddingBlock: "0.15rem",
					}}
				>
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
	useEffect(() => navCtx.addItem({ id: props.id, label: props.label, indentLevel: 0 }), []);
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
	useEffect(() => navCtx.addItem({ id: props.id, label: props.label, indentLevel: 1 }), []);
	return <>
		<h3 id={props.id}>{props.label}</h3>
		{props.content}
	</>;
}

const LanguageContext = createContext("en");

export function Screenshot(props: { id: string | number; name: string; alt?: string }) {
	const lang = useContext(LanguageContext);
	const path = `${props.id}_${colorTheme === "Dark" ? "D" : "L"}_${lang === "zh" ? "Z" : "E"}_${props.name}.jpg`;
	return <img src={`assets/ManualScreenshots/${path}`} alt={props.alt} />;
}

export default function Manual(props: { language?: string }) {
	const colors = getThemeColors(colorTheme);
	// TODO properly share with main component when applicable
	// the scrollbar here is thicker than on the main component because the page has actual content
	const styleblock = <style>{`
		@supports selector(::-webkit-scrollbar) {
			.visibleScrollbar::-webkit-scrollbar {
				appearance: none;
				background-color: ${colors.bgLowContrast};
				height: 8px;
				width: 10px;
			}
			.visibleScrollbar::-webkit-scrollbar-thumb {
				background-color: ${colors.bgHighContrast};
			}
		}
		@supports not selector(::-webkit-scrollbar) {
			.visibleScrollbar {
				scrollbar-color: ${colors.bgHighContrast} ${colors.bgLowContrast};
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
			text-indent: 2em;
		}
		.no-indent {
			text-indent: 0;
		}
		p:first-child {
			margin-block-start: 0px;
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
		img {
			width: 80%;
			max-width: fit-content;
			border: 2px dashed ${getThemeColors(colorTheme).bgMediumContrast};
			align-self: center;
			margin: 5px;
		}
		ul {
			margin-block: 0;
		}
		ol {
			margin-block: 0;
		}
	`}</style>;

	const scrollContainer = useRef<HTMLDivElement | null>(null);
	// Focus the body area on load to ensure pagedown/pageup etc. work immediately.
	// Not really sure why altering tabIndex and autoFocus are insufficient, so we need
	// to focus the element on page load instead.
	useEffect(() => {
		scrollContainer.current?.focus();
		// If the URL contains a hash, scroll to the denoted element.
		const hash = window.location.hash.slice(1); // Remove the '#' character
		if (hash && scrollContainer.current) {
			// Wait for content to render before scrolling
			const scrollToHash = () => {
				const targetElement = document.getElementById(hash);
				if (targetElement && scrollContainer.current) {
					// Calculate the position relative to the scroll container
					const containerRect = scrollContainer.current.getBoundingClientRect();
					const targetRect = targetElement.getBoundingClientRect();
					const scrollTop = scrollContainer.current.scrollTop;
					const targetTop = targetRect.top - containerRect.top + scrollTop;

					// Scroll immediately with some offset to account for any sticky headers
					scrollContainer.current.scrollTo({
						top: targetTop - 20,
						behavior: "smooth",
					});
				}
			};
			// Use a small delay to ensure DOM is ready
			setTimeout(scrollToHash, 100);
		}
	}, []);
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
		ref={scrollContainer}
		className="visibleScrollbar"
		style={{
			position: "fixed",
			top: 0,
			bottom: 0,
			left: 0,
			right: 0,
			outline: "none",
			accentColor: colors.accent,
			fontFamily: DEFAULT_FONTS,
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
			{/* Hide the navbar on mobile devices and small windows (too lazy to properly support)
				TODO: change this with DPI, and on window resize
				and/or add explicit collapsible button
			*/}
			{window.innerWidth > 1024 && <div
				id="nav-container"
				style={{
					position: "sticky",
					top: "1rem",
					marginInline: "1rem",
				}}
			>
				<Navbar language={props.language} />
			</div>}
			<LanguageContext.Provider value={props.language ?? "en"}>
				<div
					style={{
						marginLeft: "1em",
						marginRight: "1em",
						paddingRight: "1em",
						marginBottom: "1em",
						display: "flex",
						flexDirection: "column",
					}}
					tabIndex={-1}
				>
					{props.language === "zh" ? BodyZh() : BodyEn()}
				</div>
			</LanguageContext.Provider>
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
		<h1 id="top">XIV in the Shell 用户手册</h1>
		<IntroZh />
		<OverviewZh />
		<TimelineCreationZh />
		<TimelineAnalysisZh />
		<FightMarkersZh />
		<ImportExportZh />
		<AdditionalResourcesZh />
	</>;
}
