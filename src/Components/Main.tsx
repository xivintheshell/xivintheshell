import React, {CSSProperties} from 'react';
import {Timeline} from "./Timeline";
import { SkillsWindow } from "./Skills";
import {Config, TimeControl} from "./PlaybackControl";
import {StatusDisplay} from "./StatusDisplay";
import {controller} from "../Controller/Controller";
import {ShellJob} from "../Controller/Common";
import 'react-tabs/style/react-tabs.css';
import {SkillSequencePresets} from "./SkillSequencePresets";
import {IntroSection} from "./IntroSection";
import changelog from "../changelog.json"
import {localize, localizeDate, SelectLanguage} from "./Localization"
import {GlobalHelpTooltip, Tabs} from "./Common";
import {getCurrentThemeColors, SelectColorTheme} from "./ColorTheme";
import {DamageStatistics} from "./DamageStatistics";
import {MAX_TIMELINE_SLOTS} from "../Controller/Timeline";
import {clearCachedValues, getCachedValue, setCachedValue, containsEwCacheContent} from "../Controller/Common";

export let setJob = (job: ShellJob) => {};
export let setRealTime = (inRealTime: boolean) => {};
export let setHistorical = (inHistorical: boolean) => {};

function handleUrlCommands(command?: string) {
	if (command === "resetAll") {
		clearCachedValues();
	}
	else if (command === "resetResourceOverrides") {
		let strOld = getCachedValue("gameRecord");
		for (let i = 0; i < MAX_TIMELINE_SLOTS; i++) {
			let str = getCachedValue("gameRecord" + i.toString());
			if (i === 0 && str === null && strOld !== null) str = strOld; // backward compatible
			if (str !== null) {
				let content = JSON.parse(str);
				console.log(content);
				if (content.config) {
					content.config.initialResourceOverrides = [];
				}
				content.actions = [];
				setCachedValue("gameRecord" + i.toString(), JSON.stringify(content));
			}
		}
	}
	else if (command !== undefined) {
		console.log("unrecognized command '" + command + "'");
	}
}

function ConfigTabs(props: {
	height: number
}) {
	return <div style={{
		flex: 3,
		height: props.height,
		marginLeft: 6,
		position: "relative",
		verticalAlign: "top",
	}}>
		<Tabs uniqueName={"mainConfig"} content={[
			{
				titleNode: localize({en: "Config", zh: "属性设置"}),
				contentNode: <Config/>
			},
			{
				titleNode: localize({en: "Control", zh: "操作设置"}),
				contentNode: <TimeControl/>
			}
		]} collapsible={false} scrollable={true} height={props.height} defaultSelectedIndex={0}/>
	</div>
}

export default class Main extends React.Component {

	controlRegionRef: React.RefObject<HTMLDivElement>;
	gameplayKeyCapture: React.KeyboardEventHandler<HTMLDivElement>;
	gameplayMouseCapture: React.MouseEventHandler<HTMLDivElement>;

	state: {
		job: ShellJob,
		realTime: boolean,
		historical: boolean,
		hasFocus: boolean,
		controlRegionHeight: number
	}

	constructor(props: {command?: string}) {
		super(props);

		handleUrlCommands(props.command);

		this.state = {
			job: controller.getActiveJob(),
			hasFocus: false,
			historical: false,
			realTime: false,
			controlRegionHeight: 0
		}
		this.controlRegionRef = React.createRef();

		this.gameplayKeyCapture = ((evt: React.KeyboardEvent)=>{
			if (evt.target && evt.target === this.controlRegionRef.current) {
				controller.handleKeyboardEvent(evt);
				evt.preventDefault();
			}
		});

		this.gameplayMouseCapture = ((evt: React.MouseEvent)=>{
			controller.displayCurrentState();
		});

		setJob = (job: ShellJob) => {
			this.setState({job: job});
			// Change the favicon
			// https://stackoverflow.com/a/260877
			const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
			if (link) {
				if (job === ShellJob.PCT) {
					link.href = process.env.PUBLIC_URL + "/favicon_pct.ico";
				} else {
					link.href = process.env.PUBLIC_URL + "/favicon.ico";
				}
			}
		};

		setRealTime = ((rt: boolean)=>{
			this.setState({realTime: rt});
		});

		setHistorical = ((hi: boolean)=>{
			this.setState({historical: hi});
		});
	}

	componentDidMount() {
		controller.tryAutoLoad();
		controller.updateAllDisplay();

		if (this.controlRegionRef.current) {
			new ResizeObserver(() => {
				let height = this.controlRegionRef.current?.clientHeight ?? 0;
				this.setState({controlRegionHeight: height});
			}).observe(this.controlRegionRef.current);
		}
	}

	componentWillUnmount() {
		setJob = job => {};
		setRealTime = inRealTime=>{};
		setHistorical = hi=>{};
	}

	// tabs: https://reactcommunity.org/react-tabs/
	render() {
		let colors = getCurrentThemeColors();
		let containerStyle : CSSProperties = {
			height: "100%",
			accentColor: colors.accent,
			fontFamily: "monospace",
			fontSize: 13,
			color: colors.text,
			backgroundColor: colors.background,
			display: "flex",
			flexDirection: "column"
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
		let mainControlRegion = <div style={{flex: 7, display: "inline-block", position: "relative"}}>
			<div
				onFocus={()=>{ this.setState({hasFocus: true}) }}
				onBlur={()=>{ this.setState({hasFocus: false}) }}
				style={{
					display: "inline-block",
					padding: 8,
					outline: borderColor
				}}
				tabIndex={-1}
				ref={this.controlRegionRef}
				onKeyDown={this.gameplayKeyCapture}
				onClick={this.gameplayMouseCapture}
			>
				<StatusDisplay/>
				<SkillsWindow/>
			</div>
		</div>;
		return <div style={{
			position: "fixed",
			top: 0, bottom: 0, left: 0, right: 0
		}}>
			<style>{`
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
			`}</style>
			<div style={containerStyle}>
				<div style={{
					flex: 1,
					overflowY: "scroll",
					overscrollBehaviorY: "contain",
				}}>
					<div style={{
						position: "relative",
						maxWidth: 1060,
						margin: "0 auto",
						marginTop: 40,
					}}>
						<SelectLanguage/>
						<SelectColorTheme/>
						<div>
							<h3 style={{marginTop: 20, marginBottom: 6}}>FFXIV in the Shell</h3>
							{localize({
								en: <div style={{marginBottom: 16}}>Last updated: {changelog[0].date} (see <b>About this
									tool/Changelog</b>)
								</div>,
								zh: <div style={{marginBottom: 16}}>最近更新（月日年）：{changelog[0].date}（详见<b>关于/更新日志</b>）</div>,
								ja: <div style={{marginBottom: 16}}>最終更新日：{localizeDate(changelog[0].date, "ja")}（<b>このツールについて/更新履歴</b>を参照）（<a href={"https://coda.io/d/_d-N3WFoMZ8e/Black-Mage-in-the-Shell_suRLF"}>ロードマップ</a>）</div>,
							})}

							{/* PSA */}
							<div style={{
								border: `1px solid ${getCurrentThemeColors().warning}`,
								padding: 10,
								fontWeight: "bold",
								color: getCurrentThemeColors().warning,
								borderRadius: 4
							}}>{localize({
								en: "WARNING: This domain (xivintheshell.com) is in testing. Don't use yet, you might lose all your data!",
								zh: "警告：此地址（xivintheshell.com）还在测试中，目前别用，这里的数据随时可能被删除。"
							})}</div>

							{/*
							EW cached content warning
							Note to devs: this wouldn't work for locally hosted versions though.
							You'll need to manually delete the old key-value pairs in localStorage
							*/}
							{containsEwCacheContent() ? <div style={{
								margin: "10px 0",
								padding: "10px",
								border: "1px solid " + colors.warning,
								color: colors.warning,
								borderRadius: 4
							}}>{ localize({
								en: <div>
									NOTE: Your browser cache contains data from BLM in the Shell before it's updated for Dawntrail.
									Visit the Endwalker archive at <a style={{color: colors.warning}} href={"https://miyehn.me/ffxiv-blm-rotation-endwalker"}>miyehn.me/ffxiv-blm-rotation-endwalker</a> to access and automatically re-save it.
									Once you do that, this notice will also go away.
								</div>,
								zh: <div>提示：你的浏览器缓存里有排轴器更新到7.0前的数据，它们在这里已经不可用。请访问6.0历史版本（链接：<a style={{color: colors.warning}} href={"https://miyehn.me/ffxiv-blm-rotation-endwalker"}>miyehn.me/ffxiv-blm-rotation-endwalker</a>），数据会在那边被重新自动保存。访问过一次后，这个提示也会消失。</div>
							}) }</div> : undefined}

							<IntroSection job={this.state.job}/>
						</div>
						<div style={{
							display: "flex",
							flexDirection: "row",
							position: "relative",
							marginBottom: "20px"}}>
							{mainControlRegion}
							<ConfigTabs height={this.state.controlRegionHeight}/>
						</div>
						<SkillSequencePresets/>
						<hr style={{
							margin: "30px 0px",
							border: "none",
							borderTop: "1px solid " + colors.bgHighContrast,
						}}/>
						<DamageStatistics/>
					</div>
				</div>
				<Timeline/>
				<GlobalHelpTooltip content={"initial content"}/>
			</div>
		</div>;
	}
}