import React, {MouseEventHandler, useEffect, useReducer} from 'react';
import {controller} from '../Controller/Controller'
import {ButtonIndicator, Clickable, Expandable, Help, Input, ValueChangeEvent} from "./Common";
import {getCachedValue, setCachedValue, ShellInfo, ShellJob, ShellVersion, TickMode} from "../Controller/Common";
import {FIXED_BASE_CASTER_TAX, LevelSync, ProcMode, ResourceType} from "../Game/Common";
import {getAllResources, getResourceInfo, ResourceOverrideData} from "../Game/Resources";
import {localize} from "./Localization";
import {getCurrentThemeColors} from "./ColorTheme";
import {SerializedConfig} from "../Game/GameConfig";
import {XIVMath} from "../Game/XIVMath";

export let updateConfigDisplay = (config: SerializedConfig)=>{};

function getTableStyle(bgHighContrastColor: string) {
	return `
		table {
			border-collapse: collapse;
			width: 100%;
		}
		th, td {
			text-align: center;
			padding: 0.15em;
			border: 1px solid ${bgHighContrastColor};
			width: 33%
		}
	`;
}

// helper that prob won't be used elsewhere
function getTaxPreview(level: LevelSync, baseCastTime: number, spsStr: string, fpsStr: string) {
	let sps = parseFloat(spsStr);
	let fps = parseFloat(fpsStr);
	if (isNaN(sps) || isNaN(fps)) {
		return "n/a";
	}
	let adjustedCastTime = XIVMath.preTaxCastTime(level, sps, baseCastTime);
	return (XIVMath.afterFpsTax(fps, adjustedCastTime) - adjustedCastTime + XIVMath.afterFpsTax(fps, FIXED_BASE_CASTER_TAX)).toFixed(3);
}

// key, rscType, rscInfo
export function ResourceOverrideDisplay(props: {
	override: ResourceOverrideData,
	deleteFn?: (rsc: ResourceType) => void, // when null, this component is for display only
}) {
	let rscInfo = getResourceInfo(ShellInfo.job, props.override.type);
	let str: string;
	if (rscInfo.isCoolDown) {
		str = props.override.type + " full in " + props.override.timeTillFullOrDrop + "s";
	} else {
		str = props.override.type;
		if (props.override.type === ResourceType.LeyLines) str += " (" + (props.override.effectOrTimerEnabled ? "enabled" : "disabled") + ")";
		if (props.override.type === ResourceType.Enochian) str += " (" + (props.override.effectOrTimerEnabled ? "timer enabled" : "timer disabled") + ")";
		if (rscInfo.maxValue > 1) str += " (amount: " + props.override.stacks + ")";
		if (rscInfo.maxTimeout >= 0) {
			if (props.override.type === ResourceType.Polyglot) {
				if (props.override.timeTillFullOrDrop > 0) str += " next stack ready in " + props.override.timeTillFullOrDrop + "s";
			} else {
				if (props.override.type !== ResourceType.Enochian || props.override.effectOrTimerEnabled) {
					str += " drops in " + props.override.timeTillFullOrDrop + "s";
				}
			}
		}
	}
	str += " ";
	let deleteBtn: React.JSX.Element | undefined = undefined;
	if (props.deleteFn) {
		const deleteFn = props.deleteFn;
		deleteBtn = <Clickable content="[x]" onClickFn={e=>{ deleteFn(props.override.type); }}/>;
	}
	return <div style={{marginTop: 10, color: "mediumpurple"}}>
		{str}
		{deleteBtn}
	</div>;
}

let refreshConfigSummary = () => {};
export function ConfigSummary(props: {}) {

	const [, forceUpdate] = useReducer(x => x + 1, 0);
	useEffect(() => {
		refreshConfigSummary = forceUpdate;
	}, []);

	let castTimesTableDesc = localize({
		en: "Unlike GCDs that have 2 digits of precision, cast times have 3. See About this tool/Implementation notes.",
		zh: "不同于GCD那样精确到小数点后2位，咏唱时间会精确到小数点后3位。详见 关于/实现细节"
	});
	let preTaxFn = (t: number) => { return controller.gameConfig.adjustedCastTime(t).toFixed(3); }
	let afterTaxFn = (t: number) => {
		let preTax = controller.gameConfig.adjustedCastTime(t);
		return controller.gameConfig.getAfterTaxCastTime(preTax).toFixed(3);
	};
	let castTimesChart = <div>
		<style>{getTableStyle(getCurrentThemeColors().bgHighContrast)}</style>
		<table>
			<tbody>
			<tr>
				<th>{localize({en: "Base", zh: "基准"})}</th>
				<th>{localize({en: "Pre-tax", zh: "税前"})}</th>
				<th>{localize({en: "After-tax", zh: "税后"})}</th>
			</tr>
			<tr>
				<td>2.5</td>
				<td>{preTaxFn(2.5)}</td>
				<td>{afterTaxFn(2.5)}</td>
			</tr>
			<tr>
				<td>2.8</td>
				<td>{preTaxFn(2.8)}</td>
				<td>{afterTaxFn(2.8)}</td>
			</tr>
			<tr>
				<td>3.0</td>
				<td>{preTaxFn(3.0)}</td>
				<td>{afterTaxFn(3.0)}</td>
			</tr>
			<tr>
				<td>3.5</td>
				<td>{preTaxFn(3.5)}</td>
				<td>{afterTaxFn(3.5)}</td>
			</tr>
			<tr>
				<td>4.0</td>
				<td>{preTaxFn(4.0)}</td>
				<td>{afterTaxFn(4.0)}</td>
			</tr>
			</tbody>
		</table>
	</div>
	let lucidTickOffset = controller.game.lucidTickOffset.toFixed(3);
	let lucidOffsetDesc = localize({
		en: "the random time offset of lucid dreaming ticks relative to mp ticks",
		zh: "醒梦buff期间，每次跳蓝后多久跳醒梦（由随机种子决定）"
	});
	// TODO specialize for BLM
	// TODO (revisit): double check this forced cast
	let thunderTickOffset = controller.game.isBLMState() ? controller.game.thunderTickOffset.toFixed(3) : "";
	let thunderOffsetDesc = localize({
		en: "the random time offset of thunder DoT ticks relative to mp ticks",
		zh: "雷DoT期间，每次跳蓝后多久跳雷（由随机种子决定）"
	});
	let procMode = controller.gameConfig.procMode;
	let numOverrides = controller.gameConfig.initialResourceOverrides.length;
	const legacyCasterTax = controller.gameConfig.legacy_casterTax;
	let excerpt = localize({
		en: `WARNING: this record was created in an earlier version of FFXIV in the Shell and uses the deprecated caster tax of ${legacyCasterTax}s instead of calculating from your FPS input below. Hover for details: `,
		zh: `警告：此时间轴文件创建于一个更早版本的排轴器，因此计算读条时间时使用的是当时手动输入的读条税${legacyCasterTax}秒（现已过时），而非由下方的“帧率”和“读条时间修正”计算得来。更多信息：`
	});
	let warningColor = getCurrentThemeColors().warning;
	let blurb = localize({
		en: <div>
			<div className={"paragraph"}>
				The caster tax config is now replaced by 0.1s + FPS tax and is more precise.
				You can read more about FPS tax in About this tool/Implementation notes.
			</div>
			<div className={"paragraph"} style={{color: warningColor}}>
				You are strongly encouraged to create a new record (in another timeline slot or from 'apply and reset') and migrate your fight plan.
				Support for loading legacy files might drop in the future.
			</div>
		</div>,
		zh: <div>
			<div className={"paragraph"}>
				现在的“读条税”由固定的0.1s加自动计算的帧率税构成，模拟结果也更精确。有关帧率税的更多信息详见 关于/实现细节。
			</div>
			<div className={"paragraph"} style={{color: warningColor}}>
				排轴器今后的更新可能会导致无法加载过时的文件，所以强烈建议将此时间轴迁移到一个新建的存档中（添加时间轴，或者应用并重置时间轴）。
			</div>
		</div>
	});
	let legacyCasterTaxBlurb = <p className={"paragraph"} style={{color: warningColor}}>{excerpt}<Help topic={"legacy-caster-tax"} content={blurb}/></p>;
	return <div>
		{controller.gameConfig.shellVersion < ShellVersion.FpsTax ? legacyCasterTaxBlurb : undefined}

		<div>{localize({en: "Lucid tick offset ", zh: "醒梦&跳蓝时间差 "})}<Help topic={"lucidTickOffset"} content={lucidOffsetDesc}/>: {lucidTickOffset}</div>

		{ShellInfo.job === ShellJob.BLM &&
			<div>{localize({en: "Thunder DoT tick offset ", zh: "跳雷&跳蓝时间差 "})}<Help topic={"thunderTickOffset"} content={thunderOffsetDesc}/>: {thunderTickOffset}</div>
		}

		{ShellInfo.job === ShellJob.BLM
			// TODO modify for PCT
			? <Expandable
				title={"castTimesTable"}
				titleNode={<span>{localize({en: "Cast times table", zh: "咏唱时间表"})} <Help
					topic={"castTimesTable"} content={castTimesTableDesc}/></span>}
				defaultShow={false}
				content={castTimesChart}/>
			: <br/>
		}

		<p>{localize({en: "Procs", zh: "随机数模式"})}: {procMode}</p>

		{numOverrides === 0 ? undefined : <p style={{color: "mediumpurple"}}>{localize({
			en: `${numOverrides} initial resource override(s)`,
			zh: `${numOverrides}项初始资源覆盖`
		})}</p>}
	</div>
}

type TimeControlState = {
	timeScale: number,
	tickMode: TickMode
}

export class TimeControl extends React.Component {
	state: TimeControlState;
	setTickMode: (e: ValueChangeEvent) => void;
	setTimeScale: (s: string) => void;
	loadSettings: () => TimeControlState | undefined;
	saveSettings: (settings: TimeControlState) => void;

	constructor(props: {}) {
		super(props);

		this.saveSettings = (settings: TimeControlState)=>{
			let str = JSON.stringify({
				tickMode: settings.tickMode,
				timeScale: settings.timeScale
			});
			setCachedValue("playbackSettings", str);
		}

		this.loadSettings = ()=>{
			let str = getCachedValue("playbackSettings");
			if (str) {
				let settings: TimeControlState = JSON.parse(str);
				return settings;
			}
			return undefined;
		}

		this.setTickMode = ((e: ValueChangeEvent)=>{
			if (!e || !e.target || isNaN(parseInt(e.target.value))) return;
			this.setState({tickMode: parseInt(e.target.value)});
			let numVal = parseInt(e.target.value);
			if (!isNaN(numVal)) {
				controller.setTimeControlSettings({
					tickMode: numVal,
					timeScale: this.state.timeScale
				});
				this.saveSettings({
					tickMode: numVal,
					timeScale: this.state.timeScale
				});
			}
		});

		this.setTimeScale = ((val: string)=>{
			this.setState({timeScale: val});
			let numVal = parseFloat(val);
			if (!isNaN(numVal)) {
				controller.setTimeControlSettings({
					tickMode: this.state.tickMode,
					timeScale: numVal
				});
				this.saveSettings({
					tickMode: this.state.tickMode,
					timeScale: numVal
				});
			}
		});

		let settings = this.loadSettings();
		if (settings) {
			this.state = {
				tickMode: settings.tickMode,
				timeScale: settings.timeScale
			};
		} else {
			this.state = {
				tickMode: 1,
				timeScale: 2
			};
		}
	}
	componentDidMount() {
		controller.setTimeControlSettings({tickMode: this.state.tickMode, timeScale: this.state.timeScale});
	}
	render() {
		let radioStyle: React.CSSProperties = {
			position: "relative",
			top: 3,
			marginRight: "0.75em"
		};
		let tickModeOptionStyle = {
			display: "inline-block",
			marginRight: "0.5em"
		};
		return <div>
			<p>
				<label style={tickModeOptionStyle}>
					<input style={radioStyle} type={"radio"} onChange={this.setTickMode}
					       value={TickMode.RealTimeAutoPause}
					       checked={this.state.tickMode === TickMode.RealTimeAutoPause}
					       name={"tick mode"}/>
					{localize({
						en: "real-time auto pause",
						zh: "实时(带自动暂停）"
					})}
				</label>
				<Help topic={"ctrl-realTimeAutoPause"} content={
					<div className="toolTip">
						{localize({
							en: <div className="paragraph">*Recommended*</div>,
							zh: <div className="paragraph">*推荐设置*</div>
						})}
						{localize({
							en: <div className="paragraph">- click to use a skill. or if it's not ready, click again
								to wait then retry</div>,
							zh: <div className="paragraph">- 点击图标使用技能;
								战斗时间会按下方设置的倍速自动前进直到可释放下一个技能。如果点击的技能CD没有转好，再次点击会快进到它CD转好并重试。</div>
						})}
					</div>
				}/>
				<br/>
				<label style={tickModeOptionStyle}>
					<input style={radioStyle} type={"radio"} onChange={this.setTickMode}
					       value={TickMode.Manual}
					       checked={this.state.tickMode === TickMode.Manual}
					       name={"tick mode"}/>
					{localize({
						en: "manual",
						zh: "手动"
					})}
				</label>
				<Help topic={"ctrl-manual"} content={
					<div className="toolTip">
						{localize({
							en: <div className="paragraph">- click to use a skill. or if it's not ready, click again
								to wait then retry</div>,
							zh: <div className="paragraph">- 点击图标使用技能;
								战斗时间会自动快进至可释放下一个技能。如果点击的技能CD没有转好，再次点击可以快进到它CD转好并重试。</div>
						})}
						{localize({
							en: <div className="paragraph">- <ButtonIndicator text={"space"}/> to advance game time
								to the earliest possible time for the next skill</div>,
							zh: <div className="paragraph">- 点击 <ButtonIndicator text={"空格"}/> 来快进到下一个可释放技能的时间点。
							</div>
						})}
					</div>
				}/>
			</p>
			<Input defaultValue={`${this.state.timeScale}`} description={<span>{localize({en: "time scale ", zh: "倍速 "})}<Help topic={"timeScale"} content={
				<div>{localize({
					en: "rate at which game time advances automatically (aka when in real-time)",
					zh: "战斗时间自动前进的速度"})}</div>
			}/>: </span>} onChange={this.setTimeScale}/>
		</div>
	}
}

// states are mostly strings here because those inputs are controlled by <Input ... />
type ConfigState = {
	shellVersion: ShellVersion,
	level: string,
	spellSpeed: string,
	criticalHit: string,
	directHit: string,
	determination: string,
	animationLock: string,
	fps: string,
	gcdSkillCorrection: string,
	timeTillFirstManaTick: string,
	countdown: string,
	randomSeed: string,
	procMode: ProcMode,
	initialResourceOverrides: ResourceOverrideData[],

	selectedOverrideResource: ResourceType,
	overrideTimer: string,
	overrideStacks: string,
	overrideEnabled: boolean,

	dirty: boolean,
	b1TaxPreview: string,
	gcdPreview: string,
	taxedGcdPreview: string
}

export class Config extends React.Component {

	state: ConfigState;
	updateTaxPreview: (spsStr: string, fpsStr: string, levelStr: string) => void;
	handleSubmit: MouseEventHandler;

	setSpellSpeed: (val: string) => void;
	setLevel: (evt: React.ChangeEvent<HTMLSelectElement>) => void;
	setCriticalHit: (val: string) => void;
	setDirectHit: (val: string) => void;
	setDetermination: (val: string) => void;
	setAnimationLock: (val: string) => void;
	setFps: (val: string) => void;
	setGcdSkillCorrection: (val: string) => void;
	setTimeTillFirstManaTick: (val: string) => void;
	setCountdown: (val: string) => void;
	setRandomSeed: (val: string) => void;
	setProcMode: (evt: React.ChangeEvent<HTMLSelectElement>) => void;
	setOverrideTimer: (val: string) => void;
	setOverrideStacks: (val: string) => void;
	setOverrideEnabled: (evt: React.ChangeEvent<{checked: boolean}>) => void;
	deleteResourceOverride: (rsc: ResourceType) => void;

	constructor(props: {}) {
		super(props);
		this.state = { // NOT DEFAULTS
			shellVersion: ShellInfo.version,
			level: `${LevelSync.lvl100}`,
			spellSpeed: "0",
			criticalHit: "0",
			directHit: "0",
			determination: "0",
			animationLock: "0",
			fps: "0",
			gcdSkillCorrection: "0",
			timeTillFirstManaTick: "0",
			countdown: "0",
			randomSeed: "",
			procMode: ProcMode.RNG,
			initialResourceOverrides: [],
			/////////
			selectedOverrideResource: ResourceType.Mana,
			overrideTimer: "0",
			overrideStacks: "0",
			overrideEnabled: true,
			/////////
			dirty: false,
			b1TaxPreview: "n/a",
			gcdPreview: "n/a",
			taxedGcdPreview: "n/a"
		};

		this.updateTaxPreview = (spsStr: string, fpsStr: string, levelStr: string) => {
			let level = parseFloat(levelStr);
			let sps = parseFloat(spsStr);
			let fps = parseFloat(fpsStr);

			let b1TaxPreview = getTaxPreview(parseFloat(levelStr), 2.5, spsStr, fpsStr);

			let gcdStr: string;
			let taxedGcdStr: string;
			if (isNaN(level) || isNaN(sps) || isNaN(fps) || sps < 400) {
				gcdStr = "n/a";
				taxedGcdStr = "n/a";
			} else {
				let gcd = XIVMath.preTaxGcd(level as LevelSync, sps, 2.5);
				gcdStr = gcd.toFixed(2);
				taxedGcdStr = XIVMath.afterFpsTax(fps, gcd).toFixed(3);
			}

			this.setState({
				b1TaxPreview: b1TaxPreview,
				gcdPreview: gcdStr,
				taxedGcdPreview: taxedGcdStr,
			});
		}

		this.handleSubmit = (event: React.SyntheticEvent) => {
			if (this.#resourceOverridesAreValid()) {
				let seed = this.state.randomSeed;
				if (seed.length === 0) {
					for (let i = 0; i < 4; i++) {
						seed += Math.floor(Math.random() * 10).toString();
					}
					this.setState({randomSeed: seed});
				}
				let config = {...this.state, ...{ randomSeed: seed }};
				this.setConfigAndRestart(config);
				this.setState({dirty: false});
				controller.scrollToTime();
			}
			event.preventDefault();
		};

		this.setSpellSpeed = (val: string) => {
			this.setState({spellSpeed: val, dirty: true});
			this.updateTaxPreview(val, this.state.fps, this.state.level);
		};

		this.setLevel = evt => {
			this.setState({level: evt.target.value, dirty: true});
			this.updateTaxPreview(this.state.spellSpeed, this.state.fps, evt.target.value);
		};

		this.setCriticalHit = (val: string) => {
			this.setState({criticalHit: val, dirty: true});
		};

		this.setDirectHit = (val: string) => {
			this.setState({directHit: val, dirty: true});
		};

		this.setDetermination = (val: string) => {
			this.setState({determination: val, dirty: true});
		};

		this.setAnimationLock = (val: string) => {
			this.setState({animationLock: val, dirty: true});
		};

		this.setFps = (val: string) => {
			this.setState({fps: val, dirty: true});
			this.updateTaxPreview(this.state.spellSpeed, val, this.state.level);
		};

		this.setGcdSkillCorrection = (val: string) => {
			this.setState({gcdSkillCorrection: val, dirty: true});
		};

		this.setTimeTillFirstManaTick = (val: string) => {
			this.setState({timeTillFirstManaTick: val, dirty: true});
		};

		this.setCountdown = (val: string) => {
			this.setState({countdown: val, dirty: true});
		};

		this.setRandomSeed = (val: string) => {
			this.setState({randomSeed: val, dirty: true});
		};

		this.setProcMode = evt => {
			this.setState({procMode: evt.target.value, dirty: true});
		};

		this.setOverrideTimer = (val: string) => {
			this.setState({overrideTimer: val})
		};
		this.setOverrideStacks = (val: string) => {
			this.setState({overrideStacks: val})
		};
		this.setOverrideEnabled = (evt: React.ChangeEvent<{checked: boolean}>) => {
			this.setState({overrideEnabled: evt.target.checked})
		};
		this.deleteResourceOverride = (rscType: ResourceType) => {
			let overrides = this.state.initialResourceOverrides;
			for (let i = 0; i < overrides.length; i++) {
				if (overrides[i].type === rscType) {
					overrides.splice(i, 1);
					break;
				}
			}
			this.setState({initialResourceOverrides: overrides, dirty: true});
		};
	}

	// call this whenever the list of options has potentially changed
	#getFirstAddable(overridesList: ResourceOverrideData[]) {
		let firstAddableRsc = "aba aba";
		let S = new Set<ResourceType>();
		overridesList.forEach(ov=>{
			S.add(ov.type);
		});
		for (let k of getAllResources(ShellInfo.job).keys()) {
			if (!S.has(k)) {
				firstAddableRsc = k;
				break;
			}
		}
		return firstAddableRsc;
	}

	componentDidMount() {
		updateConfigDisplay = ((config)=>{
			this.setState(config);
			let gcd = XIVMath.preTaxGcd(config.level, config.spellSpeed, 2.5);
			this.setState({
				dirty: false,
				b1TaxPreview: getTaxPreview(config.level, 2.5, `${config.spellSpeed}`, `${config.fps}`),
				gcdPreview: gcd.toFixed(2),
				taxedGcdPreview: XIVMath.afterFpsTax(config.fps, gcd).toFixed(3),
				selectedOverrideResource: this.#getFirstAddable(config.initialResourceOverrides)
			});
			refreshConfigSummary();
		});
	}

	#resourceOverridesAreValid() {

		// gather resources for quick access
		let M = new Map();
		this.state.initialResourceOverrides.forEach(ov=> {
			M.set(ov.type, ov);
		});

		// shouldn't have AF and UI at the same time
		if (M.has(ResourceType.AstralFire) && M.has(ResourceType.UmbralIce)) {
			let af = M.get(ResourceType.AstralFire).stacks;
			let ui = M.get(ResourceType.UmbralIce).stacks;
			if (af > 0 && ui > 0) {
				window.alert("shouldn't have both AF and UI stacks");
				return false;
			}
		}

		let af = 0;
		let ui = 0;
		let uh = 0;
		if (M.has(ResourceType.AstralFire)) af = M.get(ResourceType.AstralFire).stacks;
		if (M.has(ResourceType.UmbralIce)) ui = M.get(ResourceType.UmbralIce).stacks;
		if (M.has(ResourceType.UmbralHeart)) uh = M.get(ResourceType.UmbralHeart).stacks;

		// if there's uh, must have AF/UI
		if (uh > 0) {
			if (af === 0 && ui === 0) {
				window.alert("since there's at least one UH stack, there should also be Enochian and AF or UI");
				return false;
			}
		}

		// if there are AF/UI stacks, must have enochian
		if (af > 0 || ui > 0 || uh > 0) {
			if (!M.has(ResourceType.Enochian)) {
				window.alert("since there's at least one AF/UI stack, there should also be an Enochian timer");
				return false;
			}
		}

		// vice versa: if there's enochian, must have AF/UI
		if (M.has(ResourceType.Enochian)) {
			if (af === 0 && ui === 0) {
				window.alert("since there's enochian, there should be at least one AF/UI stack");
				return false;
			}
			// if enochian drop halted, must be in ui and have timer at 15s
			let enochian = M.get(ResourceType.Enochian);
			if (!enochian.effectOrTimerEnabled) {
				if (enochian.timeTillFullOrDrop < 15) {
					window.alert("Because the only way to disable Enochian timer (Umbral Soul) also refreshes Enochian, remaining time must be 15 when timer is disabled");
					return false;
				}
				if (ui === 0) {
					window.alert("Enochian timer can only be disabled when in Umbral Ice (the only skill that does this is Umbral Soul)");
					return false;
				}
			}
		}

		// if polyglot timer is set (>0), must have enochian
		if (M.has(ResourceType.Polyglot)) {
			let polyTimer = M.get(ResourceType.Polyglot).timeTillFullOrDrop;
			if (polyTimer > 0 && !M.has(ResourceType.Enochian)) {
				window.alert("since a timer for polyglot is set (time till next stack > 0), there must also be Enochian");
				return false;
			}
		}

		return true;
	}

	#addResourceOverride() {
		let rscType = this.state.selectedOverrideResource;
		let info = getAllResources(ShellInfo.job).get(rscType)!;

		let inputOverrideTimer = parseFloat(this.state.overrideTimer);
		let inputOverrideStacks = parseInt(this.state.overrideStacks);
		let inputOverrideEnabled = this.state.overrideEnabled;

		// an exception for polyglot: leave empty := no timer set
		if (rscType === ResourceType.Polyglot && this.state.overrideTimer === "") {
			inputOverrideTimer = 0;
		}

		if (isNaN(inputOverrideStacks) || isNaN(inputOverrideTimer)) {
			window.alert("some inputs are not numbers!");
			return;
		}

		let props: ResourceOverrideData;

		if (info.isCoolDown)
		{
			let maxTimer = info.maxStacks * info.cdPerStack;
			if (inputOverrideTimer < 0 || inputOverrideTimer > maxTimer) {
				window.alert("invalid input timeout (must be in range [0, " + maxTimer + "])");
				return;
			}

			props = {
				type: rscType,
				timeTillFullOrDrop: inputOverrideTimer,
				stacks: info.maxStacks > 1 ? inputOverrideStacks : 1,
				effectOrTimerEnabled: true,
			};
		}
		else
		{
			if ((info.maxValue > 1 && rscType!==ResourceType.Paradox) &&
				(inputOverrideStacks < 0 || inputOverrideStacks > info.maxValue))
			{
				window.alert("invalid input amount (must be in range [0, " + info.maxValue + "])");
				return;
			}
			if (info.maxTimeout >= 0 &&
				(inputOverrideTimer < 0 || inputOverrideTimer > info.maxTimeout))
			{
				window.alert("invalid input timeout (must be in range [0, " + info.maxTimeout + "])");
				return;
			}

			props = {
				type: rscType,
				timeTillFullOrDrop: info.maxTimeout >= 0 ? inputOverrideTimer : -1,
				stacks: info.maxValue > 1 ? inputOverrideStacks : 1,
				effectOrTimerEnabled: (rscType === ResourceType.LeyLines || rscType === ResourceType.Enochian) ?
					inputOverrideEnabled : true,
			};
		}
		// end validation

		let overrides = this.state.initialResourceOverrides;
		overrides.push(props);
		this.setState({initialResourceOverrides: overrides, dirty: true});
	}

	#addResourceOverrideNode() {
		const resourceInfos = getAllResources(ShellInfo.job);
		let resourceOptions = [];
		let S = new Set();
		this.state.initialResourceOverrides.forEach(override=>{
			S.add(override.type);
		});

		let counter = 0;
		for (let k of resourceInfos.keys()) {
			if (!S.has(k)) {
				resourceOptions.push(<option key={counter} value={k}>{k}</option>);
				counter++;
			}
		}

		let rscType = this.state.selectedOverrideResource;
		let info = resourceInfos.get(rscType);
		let inputSection = undefined;
		if (info !== undefined) {

			let showTimer, showAmount, showEnabled;
			let timerDefaultValue = "-1", timerOnChange = undefined;
			let amountDefaultValue = "0", amountOnChange = undefined;

			if (info.isCoolDown) {
				showTimer = true; showAmount = false; showEnabled = false;
				timerDefaultValue = this.state.overrideTimer;
				timerOnChange = this.setOverrideTimer;
			} else {
				// timer
				if (info.maxTimeout >= 0) {
					showTimer = true;
					timerDefaultValue = this.state.overrideTimer;
					timerOnChange = this.setOverrideTimer;
				} else {
					showTimer = false;
				}

				// amount
				if (info.maxValue > 1) {
					showAmount = true;
					amountDefaultValue = this.state.overrideStacks;
					amountOnChange = this.setOverrideStacks;
				} else {
					showAmount = false;
				}

				// enabled
				showEnabled = (rscType === ResourceType.LeyLines || rscType === ResourceType.Enochian);
			}

			let timerDesc;
			if (info.isCoolDown) timerDesc = "Time till full: ";
			else if (rscType === ResourceType.Polyglot) timerDesc = "Time till next stack: ";
			else timerDesc = "Time till drop: ";

			let enabledDesc = "enabled";
			if (rscType === ResourceType.Enochian) enabledDesc = "timer enabled";

			inputSection = <div style={{margin: "6px 0"}}>

				{/*timer*/}
				<div hidden={!showTimer}>
					<Input description={timerDesc}
						   defaultValue={timerDefaultValue}
						   onChange={timerOnChange}/>
				</div>

				{/*stacks*/}
				<div hidden={!showAmount}>
					<Input description="Amount: "
						   defaultValue={amountDefaultValue}
						   onChange={amountOnChange}/>
				</div>

				{/*enabled*/}
				<div hidden={!showEnabled}>
					<input style={{position: "relative", top: 3, marginRight: 5}}
						   type="checkbox"
						   checked={this.state.overrideEnabled}
						   onChange={this.setOverrideEnabled}
					/><span>{enabledDesc}</span>
				</div>

			</div>

		}

		return <div>
			<form
				onSubmit={evt => {
					this.#addResourceOverride();
					this.setState({
						selectedOverrideResource: this.#getFirstAddable(this.state.initialResourceOverrides)
					});
					evt.preventDefault();
				}}
				style={{
					marginTop: 16,
					outline: "1px solid " + getCurrentThemeColors().bgMediumContrast,
					outlineOffset: 6
				}}>
				<select
					value={this.state.selectedOverrideResource}
					onChange={evt => {
						if (evt.target) {
							this.setState({
								selectedOverrideResource: evt.target.value,
								overrideEnabled: evt.target.value === ResourceType.LeyLines ?
									this.state.overrideEnabled : true
							});
						}
					}}>
					{resourceOptions}
				</select>
				{inputSection}
				<input type="submit" value="add override"/>
			</form>
		</div>
	}

	#resourceOverridesSection() {
		let resourceOverridesDisplayNodes = [];
		for (let i = 0; i < this.state.initialResourceOverrides.length; i++) {
			let override = this.state.initialResourceOverrides[i];
			resourceOverridesDisplayNodes.push(<ResourceOverrideDisplay
				key={i}
				override={override}
				deleteFn={this.deleteResourceOverride}
			/>);
		}
		return <div style={{marginTop: 10}}>
			<Expandable title="overrideInitialResources" titleNode={<span>
				{localize({en:"Override initial resources", zh: "指定初始资源"})} <Help topic="overrideInitialResources"content={<div>
				<div className={"paragraph"} style={{color: "orangered"}}><b>Can create invalid game states. Go over Instructions/Troubleshoot first and use carefully at your own risk!</b></div>
				<div className={"paragraph"}>Also, currently thunder dot buff created this way doesn't actually tick. It just shows the remaining buff timer.</div>
				<div className={"paragraph"}>I would recommend saving settings (stats, lines presets, timeline markers etc.) to files first, in case invalid game states really mess up the tool and a complete reset is required.</div>
			</div>}/>
			</span>} content={<div>
				<button onClick={evt=>{
					this.setState({ initialResourceOverrides: [], dirty: true });
					evt.preventDefault();
				}}>{localize({en: "clear all overrides", zh: "清除所有指定初始资源"})}</button>
				{resourceOverridesDisplayNodes}
				{this.#addResourceOverrideNode()}
			</div>}/>
		</div>;
	}

	setConfigAndRestart(config: ConfigState) {
		if (isNaN(parseFloat(config.spellSpeed)) ||
			isNaN(parseFloat(config.criticalHit)) ||
			isNaN(parseFloat(config.directHit)) ||
			isNaN(parseFloat(config.determination)) ||
			isNaN(parseFloat(config.animationLock)) ||
			isNaN(parseFloat(config.fps)) ||
			isNaN(parseFloat(config.gcdSkillCorrection)) ||
			isNaN(parseFloat(config.timeTillFirstManaTick)) ||
			isNaN(parseFloat(config.countdown)) ||
			isNaN(parseFloat(config.level))) {
			window.alert("Some config fields are not numbers!");
			return;
		}
		if (config.initialResourceOverrides === undefined) {
			config.initialResourceOverrides = [];
		}
		controller.setConfigAndRestart({
			level: parseFloat(config.level),
			spellSpeed: parseFloat(config.spellSpeed),
			criticalHit: parseFloat(config.criticalHit),
			directHit: parseFloat(config.directHit),
			determination: parseFloat(config.determination),
			animationLock: parseFloat(config.animationLock),
			fps: parseFloat(config.fps),
			gcdSkillCorrection: parseFloat(config.gcdSkillCorrection),
			timeTillFirstManaTick: parseFloat(config.timeTillFirstManaTick),
			countdown: parseFloat(config.countdown),
			randomSeed: config.randomSeed.trim(),
			procMode: config.procMode,
			initialResourceOverrides: config.initialResourceOverrides // info only
		});
		controller.updateAllDisplay();
	}

	componentWillUnmount() {
		updateConfigDisplay = (config)=>{};
	}

	render() {
		let colors = getCurrentThemeColors();
		let fpsAndCorrectionColor = this.state.shellVersion >= ShellVersion.FpsTax ? colors.text : colors.warning;
		let level = parseFloat(this.state.level);
		let b1TaxDesc = <div>
			<style>{getTableStyle(colors.bgHighContrast)}</style>
			<div style={{marginBottom: 10}}>{localize({
				en: "Preview numbers based on your current spell speed and FPS input:",
				zh: "根据当前输入的咏速和帧率，你将得到如下读条+帧率税："
			})}</div>
			<table>
				<tbody>
				<tr>
					<th>{localize({en: "Base cast time", zh: "基础读条时间"})}</th>
					<th>{localize({en: "Caster + FPS tax", zh: "读条税+帧率税"})}</th>
				</tr>
				<tr>
					<td>2.5</td>
					<td>{this.state.b1TaxPreview}</td>
				</tr>
				<tr>
					<td>2.8</td>
					<td>{getTaxPreview(level, 2.8, this.state.spellSpeed, this.state.fps)}</td>
				</tr>
				<tr>
					<td>3.0</td>
					<td>{getTaxPreview(level, 3.0, this.state.spellSpeed, this.state.fps)}</td>
				</tr>
				<tr>
					<td>3.5</td>
					<td>{getTaxPreview(level, 3.5, this.state.spellSpeed, this.state.fps)}</td>
				</tr>
				<tr>
					<td>4.0</td>
					<td>{getTaxPreview(level, 4.0, this.state.spellSpeed, this.state.fps)}</td>
				</tr>
				</tbody>
			</table>
		</div>
		let editSection = <div style={{marginBottom: 16}}>
			<div>
				<span>{localize({en: "level: ", zh: "等级："})}</span>
				<select style={{outline: "none"}} value={this.state.level} onChange={this.setLevel}>
					<option key={LevelSync.lvl100} value={LevelSync.lvl100}>100</option>
					<option key={LevelSync.lvl90} value={LevelSync.lvl90}>90</option>
					<option key={LevelSync.lvl80} value={LevelSync.lvl80}>80</option>
					<option key={LevelSync.lvl70} value={LevelSync.lvl70}>70</option>
				</select>
			</div>
			<div>
				<Input style={{display: "inline-block"}} defaultValue={this.state.spellSpeed}
					   description={localize({en: "spell speed: ", zh: "咏速："})} onChange={this.setSpellSpeed}/>
				<span> (GCD: {this.state.gcdPreview} <Help topic={"gcdPreview"} content={
					<>
						<p>{localize({
							en: "Preview of displayed GCD based on your spell speed.",
							zh: "当前咏速对应的游戏内显示的GCD."
						})}</p>
						<p>{localize({
							en: `Measured average GCD should be ${this.state.taxedGcdPreview} due to FPS tax`,
							zh: `由于帧率税的影响，测量得到的平均GCD为${this.state.taxedGcdPreview}`
						})}</p>
					</>
				}/>)</span>
			</div>
			<Input defaultValue={this.state.criticalHit} description={localize({en: "crit: ", zh: "暴击："})}
				   onChange={this.setCriticalHit}/>
			<Input defaultValue={this.state.directHit} description={localize({en: "direct hit: " , zh: "直击："})} onChange={this.setDirectHit}/>
			<Input defaultValue={this.state.determination} description={localize({en: "determination: " , zh: "信念："})} onChange={this.setDetermination}/>
			<Input defaultValue={this.state.animationLock} description={localize({en: "animation lock: ", zh: "能力技后摇："})} onChange={this.setAnimationLock}/>
			<div>
				<Input style={{display: "inline-block", color: fpsAndCorrectionColor}} defaultValue={this.state.fps} description={localize({en: "FPS: ", zh: "帧率："})} onChange={this.setFps}/>
				<span> ({localize({en: "B1 tax", zh: "冰1税"})}: {this.state.b1TaxPreview} <Help topic={"b1TaxPreview"} content={b1TaxDesc}/>)</span>
			</div>
			<Input
				style={{color: fpsAndCorrectionColor}}
				defaultValue={this.state.gcdSkillCorrection}
				description={<span>{localize({en: "GCD correction", zh: "GCD时长修正"})} <Help topic={"cast-time-correction"} content={localize({
					en: "Leaving this at 0 will probably give you the most accurate simulation. But if you want to manually correct your GCD skill durations (including casts) for whatever reason, you can put a small number (can be negative)",
					zh: "正常情况下填0即能得到最精确的模拟结果。如果实在需要修正的话，这里输入的时长会被加到你的每个GCD技能（包括读条）耗时里（可以为负）"
				})}/>: </span>}
				onChange={this.setGcdSkillCorrection}/>
			<Input defaultValue={this.state.timeTillFirstManaTick} description={localize({en: "time till first MP tick: ", zh: "距首次跳蓝时间："})} onChange={this.setTimeTillFirstManaTick}/>
			<Input defaultValue={this.state.countdown} description={
				<span>{
					localize({en: "countdown ", zh: "倒数时间 "})
				}<Help topic={"countdown"} content={localize({en: "can use a negative countdown to start from a specific time of fight", zh: "可以是负数，时间轴会从战斗中途某个时间开始显示"})}/>: </span>
			} onChange={this.setCountdown}/>
			<Input defaultValue={this.state.randomSeed} description={
				<span>{localize({en: "random seed ", zh: "随机种子 "})}<Help topic={"randomSeed"} content={
					localize({
						en: "can be anything, or leave empty to get 4 random digits.",
						zh: "可以是任意字符串，或者留空，会获得4个随机数字"
					})
				}/>: </span>} onChange={this.setRandomSeed}/>
			<div>
				<span>{localize({en: "proc mode ", zh: "随机BUFF获取 "})}<Help topic={"procMode"} content={
					localize({
						en: "Default RNG: 40% Firestarter",
						zh: "RNG会像游戏内一样，相应技能40%概率获得火苗，Always则每次都会触发火苗，Never则从不触发。"
					})
				}/>: </span>
				<select style={{outline: "none"}} value={this.state.procMode} onChange={this.setProcMode}>
					<option key={ProcMode.RNG} value={ProcMode.RNG}>RNG</option>
					<option key={ProcMode.Never} value={ProcMode.Never}>Never</option>
					<option key={ProcMode.Always} value={ProcMode.Always}>Always</option>
				</select>
			</div>
			{this.#resourceOverridesSection()}
			<button onClick={this.handleSubmit} style={{width: "100%"}}>
				{localize({en: "apply and reset", zh: "应用并重置时间轴"})}{this.state.dirty ? "*" : ""}
			</button>
		</div>;
		return (
			<div style={{marginBottom: 20}}>
				<ConfigSummary/>
				<hr style={{ border: "none", borderTop: `1px solid ${colors.bgHighContrast}`, margin: "16px 0"}}/>
				{editSection}
				<p>{localize({
					en: "You can also import/export fights from/to local files at the bottom of the page.",
					zh: "页面底部有导入和导出战斗文件相关选项。"
				})}</p>
			</div>
		)}
}