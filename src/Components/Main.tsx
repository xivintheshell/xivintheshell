import React, { CSSProperties } from "react";
import { Timeline } from "./Timeline";
import { SkillsWindow } from "./Skills";
import { Config, TimeControl } from "./PlaybackControl";
import { StatusDisplay } from "./StatusDisplay";
import { controller } from "../Controller/Controller";
import "react-tabs/style/react-tabs.css";
import { SkillSequencePresets } from "./SkillSequencePresets";
import { HELP_CHANNEL_URL, IntroSection } from "./IntroSection";
import { getLastChangeDate } from "./Changelog";
import { localize, localizeDate, SelectLanguage } from "./Localization";
import { SocialLinks } from "./SocialLinks";
import { Expandable, Tabs } from "./Common";
import {
	getCachedColorTheme,
	getThemeColors,
	getCurrentThemeColors,
	SelectColorTheme,
	ColorTheme,
	ColorThemeContext,
} from "./ColorTheme";
import { DamageStatistics } from "./DamageStatistics";
import { MAX_TIMELINE_SLOTS } from "../Controller/Timeline";
import {
	clearCachedValues,
	getCachedValue,
	setCachedValue,
	containsEwCacheContent,
	isBetaSite,
} from "../Controller/Common";
import { JOBS, ShellJob } from "../Game/Data/Jobs";

export let setJob = (job: ShellJob) => {};
export let setRealTime = (inRealTime: boolean) => {};
export let setHistorical = (inHistorical: boolean) => {};

function handleUrlCommands(command?: string) {
	if (command === "resetAll") {
		clearCachedValues();
	} else if (command === "resetResourceOverrides") {
		const strOld = getCachedValue("gameRecord");
		for (let i = 0; i < MAX_TIMELINE_SLOTS; i++) {
			let str = getCachedValue("gameRecord" + i.toString());
			if (i === 0 && str === null && strOld !== null) str = strOld; // backward compatible
			if (str !== null) {
				const content = JSON.parse(str);
				console.log(content);
				if (content.config) {
					content.config.initialResourceOverrides = [];
				}
				content.actions = [];
				setCachedValue("gameRecord" + i.toString(), JSON.stringify(content));
			}
		}
	} else if (command === "code") {
		// Used by FFLogs authorization flow; don't do anything.
		// The dialog component will automatically open itself by reading the URL parameters.
		console.log("FFLogs authorization triggered.");
	} else if (command !== undefined) {
		console.log("unrecognized command '" + command + "'");
	}
}

function ConfigTabs(props: { height: number }) {
	return <div
		style={{
			flex: 3,
			height: props.height,
			marginLeft: 6,
			position: "relative",
			verticalAlign: "top",
		}}
	>
		<Tabs
			uniqueName={"mainConfig"}
			content={[
				{
					titleNode: localize({ en: "Config", zh: "属性设置" }),
					contentNode: <Config />,
				},
				{
					titleNode: localize({ en: "Control", zh: "操作设置" }),
					contentNode: <TimeControl />,
				},
			]}
			collapsible={false}
			scrollable={true}
			height={props.height}
			defaultSelectedIndex={0}
		/>
	</div>;
}

function PSA(props: { hidden?: boolean; color?: string; children: React.ReactNode }) {
	const color = props.color ?? getCurrentThemeColors().accent;
	return <div
		style={{
			display: props.hidden === true ? "none" : "block",
			color: color,
			border: "1px solid " + color,
			borderRadius: 4,
			padding: "10px 10px 0 10px",
		}}
	>
		{props.children}
	</div>;
}

const betaPrefix = isBetaSite ? "[BETA] " : "";

export default class Main extends React.Component<{ command?: string }> {
	controlRegionRef: React.RefObject<HTMLDivElement | null>;
	gameplayKeyCapture: React.KeyboardEventHandler<HTMLDivElement>;
	setColorTheme: (colorTheme: ColorTheme) => void;

	state: {
		job: ShellJob;
		realTime: boolean;
		historical: boolean;
		hasFocus: boolean;
		controlRegionHeight: number;
		colorTheme: ColorTheme;
	};

	constructor(props: { command?: string }) {
		super(props);

		handleUrlCommands(props.command);

		this.state = {
			job: controller.getActiveJob(),
			hasFocus: false,
			historical: false,
			realTime: false,
			controlRegionHeight: 0,
			colorTheme: getCachedColorTheme(),
		};
		this.controlRegionRef = React.createRef();

		this.gameplayKeyCapture = (evt: React.KeyboardEvent) => {
			controller.handleKeyboardEvent(evt);
		};

		setJob = (job: ShellJob) => {
			this.setState({ job: job });
			// Change the favicon
			// https://stackoverflow.com/a/260877
			const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
			link.href = "/favicons/beta.ico";
			// Change the title
			const title = document.getElementById("pageTitle") as HTMLTitleElement;
			if (title) {
				title.text = `[BETA] Occult Crescent in the Shell`;
			}
		};

		setRealTime = (rt: boolean) => {
			this.setState({ realTime: rt });
		};

		setHistorical = (hi: boolean) => {
			this.setState({ historical: hi });
		};

		this.setColorTheme = (colorTheme: ColorTheme) => {
			if (colorTheme !== this.state.colorTheme) {
				controller.updateAllDisplay();
				this.setState({ colorTheme });
				setCachedValue("colorTheme", colorTheme);
			}
		};
	}

	componentDidMount() {
		controller.tryAutoLoad();
		controller.updateAllDisplay();

		if (this.controlRegionRef.current) {
			new ResizeObserver(() => {
				const height = this.controlRegionRef.current?.clientHeight ?? 0;
				this.setState({ controlRegionHeight: height });
			}).observe(this.controlRegionRef.current);
		}
	}

	componentWillUnmount() {
		setJob = (job) => {};
		setRealTime = (inRealTime) => {};
		setHistorical = (hi) => {};
	}

	// tabs: https://reactcommunity.org/react-tabs/
	render() {
		const colors = getThemeColors(this.state.colorTheme);
		const containerStyle: CSSProperties = {
			height: "100%",
			accentColor: colors.accent,
			fontFamily: "monospace",
			fontSize: 13,
			color: colors.text,
			backgroundColor: colors.background,
			display: "flex",
			flexDirection: "column",
		};
		let borderColor: string;

		if (this.state.historical) {
			borderColor = "2px solid " + colors.historical;
		} else if (!this.state.hasFocus) {
			borderColor = "1px solid " + colors.bgMediumContrast;
		} else if (this.state.realTime) {
			borderColor = "2px solid " + colors.realTime;
		} else {
			borderColor = "2px solid " + colors.accent;
		}
		const liStyle = { marginBottom: "5px" };
		const mainControlRegion = <div
			style={{ flex: 7, display: "inline-block", position: "relative" }}
		>
			<div
				onFocus={() => {
					this.setState({ hasFocus: true });
				}}
				onBlur={() => {
					this.setState({ hasFocus: false });
				}}
				style={{
					display: "inline-block",
					padding: 8,
					outline: borderColor,
				}}
				tabIndex={-1}
				ref={this.controlRegionRef}
			>
				<StatusDisplay />
				<SkillsWindow />
			</div>
		</div>;
		// Hide external links if the page is too thin.
		const renderLinks = window.innerWidth > 1024;
		return <div
			style={{
				position: "fixed",
				top: 0,
				bottom: 0,
				left: 0,
				right: 0,
				outline: "none",
			}}
			tabIndex={-1}
			onKeyDown={this.gameplayKeyCapture}
		>
			<style>{`
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
						scrollbar-width: auto;
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
				}
				p {
					margin-block-start: 10px;
					margin-block-end: 10px;
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
			`}</style>
			<ColorThemeContext.Provider value={this.state.colorTheme}>
				<div style={containerStyle} id={"globalHelpTooltipAnchor"}>
					<div
						style={{
							flex: 1,
							overflowY: "scroll",
							overscrollBehaviorY: "contain",
						}}
					>
						<div
							style={{
								position: "relative",
								maxWidth: 1060,
								margin: "0 auto",
								marginTop: 40,
								display: "grid",
							}}
						>
							<div
								style={{
									position: "absolute",
									display: "flex",
									flexWrap: "wrap",
									justifySelf: "right",
									justifyContent: "space-between",
									alignItems: "flex-start",
									gap: "1.4em",
								}}
							>
								{renderLinks && <SocialLinks />}
								<SelectLanguage />
								<SelectColorTheme setColorTheme={this.setColorTheme} />
							</div>
							<div>
								<h3 style={{ marginTop: 0, marginBottom: 6 }}>
									[BETA] Occult Crescent in the Shell
								</h3>
								{localize({
									en: <div style={{ marginBottom: 16 }}>
										Last updated: {getLastChangeDate()} (see <b>Changelog</b>)
									</div>,
									zh: <div style={{ marginBottom: 16 }}>
										最近更新（月日年）：{getLastChangeDate()}（详见
										<b>更新日志</b>）
									</div>,
									ja: <div style={{ marginBottom: 16 }}>
										最終更新日：{localizeDate(getLastChangeDate(), "ja")}（
										<b>更新履歴</b>を参照）（
										<a
											href={
												"https://coda.io/d/_d-N3WFoMZ8e/Black-Mage-in-the-Shell_suRLF"
											}
										>
											ロードマップ
										</a>
										）
									</div>,
								})}

								{/*
								EW cached content warning
								Note to devs: this wouldn't work for locally hosted versions though.
								You'll need to manually delete the old key-value pairs in localStorage
								*/}
								{containsEwCacheContent() ? (
									<div
										style={{
											margin: "10px 0",
											padding: "10px",
											border: "1px solid " + colors.warning,
											color: colors.warning,
											borderRadius: 4,
										}}
									>
										{localize({
											en: <div>
												NOTE: Your browser cache contains data from BLM in
												the Shell before it's updated for Dawntrail. Visit
												the Endwalker archive at{" "}
												<a
													style={{ color: colors.warning }}
													href={
														"https://miyehn.me/ffxiv-blm-rotation-endwalker"
													}
												>
													miyehn.me/ffxiv-blm-rotation-endwalker
												</a>{" "}
												to access and automatically re-save it. Once you do
												that, this notice will also go away.
											</div>,
											zh: <div>
												提示：你的浏览器缓存里有排轴器更新到7.0前的数据，它们在这里已经不可用。请访问6.0历史版本（链接：
												<a
													style={{ color: colors.warning }}
													href={
														"https://miyehn.me/ffxiv-blm-rotation-endwalker"
													}
												>
													miyehn.me/ffxiv-blm-rotation-endwalker
												</a>
												），数据会在那边被重新自动保存。访问过一次后，这个提示也会消失。
											</div>,
										})}
									</div>
								) : undefined}

								{/* Beta site warning */}
								{
									<PSA color={colors.warning}>
										<div style={{ marginBottom: "10px" }}>
											<div style={{ marginBottom: "10px" }}>
												<b style={{ color: colors.warning }}>
													You're currently using the BETA -- Occult
													Crescent version of XIV in the Shell.
												</b>{" "}
												Occult Crescent actions may eventually be added to
												the main site (
												<a href="xivintheshell.com">xivintheshell.com</a>),
												but files created on this version of the site may or
												may not remain usable.
											</div>
											<div style={{ marginBottom: "10px" }}>
												The following phantom jobs are currently supported:
												Monk, Samurai, Oracle, and Dancer. There are
												currently no plans to actively update this version
												of the site or add more jobs, but bug reports and
												additional data are welcome (@shanzhe in The Balance
												or a field op Discord of your choice).
											</div>
											<div style={{ marginBottom: "10px" }}>
												This site is meant primarily as a tool for
												visualizing cooldown usage, and may contain
												inaccuracies, including:
												<ul>
													<li>
														Lack of calculation for phantom action
														potencies (math is complicated)
													</li>
													<li>
														Job damage and trait buffs are not applied
														to phantom actions
													</li>
													<li>Rounding errors in haste effects</li>
													<li>
														Incorrect application delays on most phantom
														actions
													</li>
												</ul>
											</div>
											<div style={{ marginBottom: "10px" }}>
												If you need to do precise math with phantom
												potencies, consider exporting the damage log to a
												CSV and processing the output in a spreadsheet.
											</div>
										</div>
									</PSA>
								}
								{<div style={{ margin: "10px" }}></div>}

								<IntroSection job={this.state.job} />

								{/* PSA */}
								<Expandable
									defaultShow={true}
									title={"7-2-user-survey"}
									titleNode={
										<span>
											{localize({
												en: "7.2 User Survey",
												zh: "7.2用户体验调查",
											})}
										</span>
									}
									content={
										<PSA>
											{localize({
												en: <>
													<p>
														Help us improve XIV in the Shell! Please
														take our user survey:{" "}
														<b>
															<a
																target={"_blank"}
																rel={"noreferrer"}
																href={
																	"https://forms.gle/eKVygxxZVd894323A"
																}
															>
																https://forms.gle/eKVygxxZVd894323A
															</a>
														</b>
													</p>
												</>,
												zh: <>
													<p>
														帮我们改进排轴器！请参加我们的用户体验调查：{" "}
														<b>
															<a
																target={"_blank"}
																rel={"noreferrer"}
																href={
																	"https://www.wjx.cn/vm/mQ1gV2b.aspx"
																}
															>
																https://www.wjx.cn/vm/mQ1gV2b.aspx
															</a>
														</b>
													</p>
												</>,
											})}
										</PSA>
									}
								/>
							</div>
							<div
								style={{
									display: "flex",
									flexDirection: "row",
									position: "relative",
									marginBottom: "20px",
								}}
							>
								{mainControlRegion}
								<ConfigTabs height={this.state.controlRegionHeight} />
							</div>
							<SkillSequencePresets />
							<hr
								style={{
									margin: "30px 0px",
									border: "none",
									borderTop: "1px solid " + colors.bgHighContrast,
								}}
							/>
							<DamageStatistics />
						</div>
					</div>
					<Timeline />
				</div>
			</ColorThemeContext.Provider>
		</div>;
	}
}
