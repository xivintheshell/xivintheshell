import React, {CSSProperties} from 'react';
// @ts-ignore
import {Timeline, updateTimelineView} from "./Timeline";
// @ts-ignore
import { SkillsWindow } from "./Skills";
// @ts-ignore
import { Config, TimeControl } from "./PlaybackControl";
// @ts-ignore
import { StatusDisplay } from "./StatusDisplay";
import {controller} from "../Controller/Controller";
import 'react-tabs/style/react-tabs.css';
import {LoadSave} from "./LoadSave";
import {SkillSequencePresets} from "./SkillSequencePresets";
import {IntroSection} from "./IntroSection";
import changelog from "../changelog.json"
import {localize, localizeDate, SelectLanguage} from "./Localization"
import {Expandable, GlobalHelpTooltip} from "./Common";
import {getCurrentThemeColors, SelectColorTheme} from "./ColorTheme";
import {DamageStatistics} from "./DamageStatistics";
import {MAX_TIMELINE_SLOTS} from "../Controller/Timeline";
import {clearCachedValues, getCachedValue, setCachedValue, containsEwCacheContent} from "../Controller/Common";

export let setRealTime = (inRealTime: boolean) => {};
export let setHistorical = (inHistorical: boolean) => {};

function handleUrlCommands(command?: string) {
	if (command === "resetAll") {
		clearCachedValues();
		window.location.href = "/ffxiv-blm-rotation";
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
		window.location.href = "/ffxiv-blm-rotation";
	}
	else if (command !== undefined) {
		console.log("unrecognized command '" + command + "'");
	}
}

export let forceUpdateAll = ()=>{};

export default class Main extends React.Component {

	controlRegionRef: React.RefObject<HTMLDivElement>;
	gameplayKeyCapture: React.KeyboardEventHandler<HTMLDivElement>;
	gameplayMouseCapture: React.MouseEventHandler<HTMLDivElement>;

	state: {
		realTime: boolean,
		historical: boolean,
		hasFocus: boolean,
		controlRegionHeight: number
	}

	constructor(props: {command?: string}) {
		super(props);

		handleUrlCommands(props.command);

		this.state = {
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
		}).bind(this);

		this.gameplayMouseCapture = ((evt: React.MouseEvent)=>{
			controller.displayCurrentState();
		}).bind(this);

		setRealTime = ((rt: boolean)=>{
			this.setState({realTime: rt});
		}).bind(this);

		setHistorical = ((hi: boolean)=>{
			this.setState({historical: hi});
		}).bind(this);

		forceUpdateAll = (()=>{
			this.forceUpdate();
			updateTimelineView();
		}).bind(this);
	}

	componentDidMount() {
		controller.tryAutoLoad();
		controller.updateAllDisplay();

		let handleResize = ()=>{
			let cur = this.controlRegionRef.current;
			if (cur) {
				this.setState({controlRegionHeight: cur.clientHeight});
			}
		}
		handleResize();
		window.addEventListener("resize", handleResize);
	}

	componentWillUnmount() {
		setRealTime = inRealTime=>{};
		setHistorical = hi=>{};
		forceUpdateAll = ()=>{};
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
				.staticScrollbar::-webkit-scrollbar {
					appearance: none;
					background-color: ${colors.bgLowContrast};
					height: 8px;
					width: 5px;
				}
				.staticScrollbar::-webkit-scrollbar-thumb {
					background-color: ${colors.bgHighContrast};
				}
				a {
					color: ${colors.accent};
				}
				b, h1, h2, h3, h4 {
					color: ${colors.emphasis};
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
							<h3 style={{marginTop: 20, marginBottom: 6}}>Black Mage in the Shell</h3>
							{localize({
								en: <div style={{marginBottom: 16}}>Last updated: {changelog[0].date} (see <b>About this
									tool/Changelog</b>) (see my <a href={"https://coda.io/d/_d-N3WFoMZ8e/Black-Mage-in-the-Shell_suRLF"}>roadmap</a>)
								</div>,
								zh: <div style={{marginBottom: 16}}>最近更新（月日年）：{changelog[0].date}（详见<b>关于/更新日志</b>）（<a href={"https://coda.io/d/_d-N3WFoMZ8e/Black-Mage-in-the-Shell_suRLF"}>开发计划</a>）</div>,
								ja: <div style={{marginBottom: 16}}>最終更新日：{localizeDate(changelog[0].date, "ja")}（<b>このツールについて/更新履歴</b>を参照）（<a href={"https://coda.io/d/_d-N3WFoMZ8e/Black-Mage-in-the-Shell_suRLF"}>ロードマップ</a>）</div>,
							})}

							{/* PSA */}
							<div style={{
								padding: "0 10px",
								border: "1px solid " + colors.accent,
								borderRadius: 4
							}}>
								<Expandable title={"psa-062924"} defaultShow={true} titleNode={<b style={{color: colors.accent}}>[6/29/24] PSA from miyehn</b>} content={
									<div>
										{localize({
											en: <div/>,
											zh: <div>
												<div className={"paragraph"}>
													黑魔排轴器已经更新到7.0了，国服的黑魔们要给6.0黑魔排轴的话，请去这个历史版本：<a href={"https://miyehn.me/ffxiv-blm-rotation-endwalker/"}>Black Mage in the Shell (Endwalker)</a>。以下的英文通知内容暂时还不适用于国服。
												</div>
												<div className={"paragraph"}>
													对了，那个历史版本里将会展出一些6.0时期有纪念意义的轴，愿意投稿的话可以发给我 (miyehn) 或者小絮。除了txt文件之外，最好也备注下对应的时间轴标记（markers），如果愿意公开视频和logs链接的话也可以加上。
												</div>
												<div className={"paragraph"}>
													那就愿大家好好享受最后几个月的6.0黑魔了🙏
												</div>
											</div>
										})}
										<div className={"paragraph"}>
											Dawntrail is out now, so is this updated BLM in the Shell!
											It is probably still very unstable, so expect hiccups and <b>save your work frequently elsewhere</b> - don't even trust downloaded files yet,
											there will almost definitely be some breaking changes in the next few days.
											<b> If you encounter bugs, please let me know asap! Message in <a target={"_blank"} href={"https://discord.com/channels/277897135515762698/1255782490862387360"}>this thread</a> or DM me directly!</b>
										</div>

										<h4>Archiving Endwalker BLM in the Shell</h4>
										<div className={"paragraph"}>
											The archive version is now live at <a href={"https://miyehn.me/ffxiv-blm-rotation-endwalker/"}>Black Mage in the Shell (Endwalker)</a>. You can use it to view fight plans from Endwalker.
											In the next few days I'm also putting up a gallery of Endwalker fight plans, as a way of remembering this job in its full glory.
										</div>
										<div className={"paragraph"}>
											I'm still accepting submissions, so if you have interesting plans that you are willing to make public, please send them to me.
											If you do that, it would be helpful if you also include the corresponding timeline markers, logs link (if any & willing to share), video (if any).
											I know some CN black mages are sending me some soon-ish, so look forward to that :)
										</div>
									</div>
								}/>
							</div>

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

							<IntroSection/>
						</div>
						<div style={{
							display: "flex",
							flexDirection: "row",
							position: "relative",
							marginBottom: "20px"}}>
							{mainControlRegion}
							<div className={"staticScrollbar"} style={{
								flex: 3,
								height: this.state.controlRegionHeight,
								marginLeft: 6,
								position: "relative",
								verticalAlign: "top",
								overflowY: "scroll",
							}}>
								<Config/>
								<TimeControl/>
								<LoadSave/>
							</div>
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
