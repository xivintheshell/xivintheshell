import React from 'react';
import {Clickable, Help, ProgressBar} from "./Common";
import {ResourceType} from "../Game/Common";
import {controller} from "../Controller/Controller";
import {localize} from "./Localization";
import {getCurrentThemeColors} from "./ColorTheme";

// color, value
function ResourceStack(props) {
	let colors = getCurrentThemeColors();
	return <div style={{
		top: 1,
		marginRight: 8,
		position: "relative",
		width: 16,
		height: 16,
		borderRadius: 8,
		display: "inline-block",
		border: "1px solid " + colors.bgHighContrast,
		verticalAlign: "top"
	}}>
		<div hidden={!props.value} style={{
			backgroundColor: `${props.color}`,
			position: "absolute",
			top: 2,
			bottom: 2,
			left: 2,
			right: 2,
			borderRadius: "inherit"
		}}/>
	</div>;
}

// name, color, value, progress, width, className
function ResourceBar(props = {
	name: "placeholder",
	color: "#6cf",
	value: "0.34/1.00",
	progress: 0.34,
	width: 100,
	hidden: false
}) {
	return <div className={props.className} hidden={props.hidden} style={{marginBottom: 4, lineHeight: "1.5em"}}>
		<div style={{display: "inline-block", height: "100%", width: 108}}>{props.name}</div>
		<div style={{width: 200, display: "inline-block"}}>
			<ProgressBar backgroundColor={props.color}
						 progress={props.progress}
						 width={props.width}
						 offsetY={4}/>
			<div style={{marginLeft: 6, height: "100%", display: "inline-block"}}>{props.value}</div>
		</div>
	</div>;
}

// name, color, currentStacks, maxStacks
function ResourceCounter(props) {
	let stacks = [];
	for (let i = 0; i < props.maxStacks; i++) {
		stacks.push(<ResourceStack key={i} color={props.color} value={i < props.currentStacks}/>)
	}
	return <div className={props.className} style={{marginBottom: 4, lineHeight: "1.5em"}}>
		<div style={{display: "inline-block", height: "100%", width: 108}}>{props.name}</div>
		<div style={{width: 200, display: "inline-block"}}>
			<div style={{display: "inline-block", marginLeft: 6}}>{stacks}</div>
			<div style={{marginLeft: 6, height: "100%", display: "inline-block"}}>{props.currentStacks + "/" + props.maxStacks}</div>
		</div>
	</div>;
}
const buffIcons = new Map();
buffIcons.set(ResourceType.Triplecast, require("./Asset/buff_triplecast.png"));
buffIcons.set(ResourceType.Triplecast + "2", require("./Asset/buff_triplecast2.png"));
buffIcons.set(ResourceType.Triplecast + "3", require("./Asset/buff_triplecast3.png"));
buffIcons.set(ResourceType.Sharpcast, require("./Asset/buff_sharpcast.png"));
buffIcons.set(ResourceType.Firestarter, require("./Asset/buff_firestarter.png"));
buffIcons.set(ResourceType.Thundercloud, require("./Asset/buff_thundercloud.png"));
buffIcons.set(ResourceType.ThunderDoT, require("./Asset/buff_thunder3.png"));
buffIcons.set(ResourceType.LeyLines, require("./Asset/buff_leyLines.png"));
buffIcons.set(ResourceType.Manaward, require("./Asset/buff_manaward.png"));
buffIcons.set(ResourceType.Addle, require("./Asset/buff_addle.png"));
buffIcons.set(ResourceType.Swiftcast, require("./Asset/buff_swiftcast.png"));
buffIcons.set(ResourceType.LucidDreaming, require("./Asset/buff_lucidDreaming.png"));
buffIcons.set(ResourceType.Surecast, require("./Asset/buff_surecast.png"));
buffIcons.set(ResourceType.Tincture, require("./Asset/buff_tincture.png"));
buffIcons.set(ResourceType.Sprint, require("./Asset/buff_sprint.png"));

// rscType, stacks, timeRemaining, onSelf, enabled
function Buff(props) {
	let assetName = props.rscType;
	if (props.rscType === ResourceType.Triplecast) {
		if (props.stacks === 2) assetName += "2";
		else if (props.stacks === 3) assetName += "3";
	}
	return <div title={props.rscType} className={props.className + " buff " + props.rscType}>
		<Clickable content={
			<img style={{height: 40}} src={buffIcons.get(assetName)} alt={props.rscType}/>
		} style={{
			display: "inline-block",
			verticalAlign: "top",
			filter: props.enabled ? "none" : "grayScale(100%)"
		}} onClickFn={()=>{
			if (props.onSelf) {
				controller.requestToggleBuff(props.rscType);
				controller.updateStatusDisplay(controller.game);
				controller.updateSkillButtons(controller.game);
				controller.autoSave();
			}
		}}/>
		<span className={"buff-label"}>{props.timeRemaining}</span>
	</div>
}

function BuffsDisplay(props) {
	let data = (props && props.data) ? props.data : {
		leyLinesEnabled: true,
		leyLinesCountdown: 0,
		sharpcastCountdown: 0,
		triplecastCountdown: 0,
		triplecastStacks: 0,
		firestarterCountdown: 0,
		thundercloudCountdown: 0,
		manawardCountdown: 0,
		swiftcastCountdown: 0,
		lucidDreamingCountdown: 0,
		surecastCountdown: 0,
		tinctureCountdown: 0,
		sprintCountdown: 0
	};
	let buffs = [];
	buffs.push({
		rscType: ResourceType.LeyLines,
		onSelf: true,
		enabled: data.leyLinesEnabled,
		stacks:1,
		timeRemaining: data.leyLinesCountdown.toFixed(2),
		className: data.leyLinesCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Sharpcast,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.sharpcastCountdown.toFixed(2),
		className: data.sharpcastCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Triplecast,
		onSelf: true,
		enabled: true,
		stacks: data.triplecastStacks,
		timeRemaining: data.triplecastCountdown.toFixed(2),
		className: data.triplecastCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Firestarter,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.firestarterCountdown.toFixed(2),
		className: data.firestarterCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Thundercloud,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.thundercloudCountdown.toFixed(2),
		className: data.thundercloudCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Manaward,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.manawardCountdown.toFixed(2),
		className: data.manawardCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Swiftcast,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.swiftcastCountdown.toFixed(2),
		className: data.swiftcastCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.LucidDreaming,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.lucidDreamingCountdown.toFixed(2),
		className: data.lucidDreamingCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Surecast,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.surecastCountdown.toFixed(2),
		className: data.surecastCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Tincture,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.tinctureCountdown.toFixed(2),
		className: data.tinctureCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Sprint,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.sprintCountdown.toFixed(2),
		className: data.sprintCountdown > 0 ? "" : "hidden"
	});

	for (let i = 0; i < buffs.length; i++) buffs[i].key=i;
	return <div className={"buffsDisplay self"}>
		 {buffs.map(obj=>{return <Buff {...obj}/>;})}
	</div>
}

function EnemyBuffsDisplay(props)
{
	let data = (props && props.data) ? props.data : {
		DoTCountdown: 0,
		addleCountdown: 0
	};
	let buffs = [];
	buffs.push({
		rscType: ResourceType.ThunderDoT,
		enabled: true,
		stacks:1,
		timeRemaining: data.DoTCountdown.toFixed(2),
		className: data.DoTCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Addle,
		enabled: true,
		stacks:1,
		timeRemaining: data.addleCountdown.toFixed(2),
		className: data.addleCountdown > 0 ? "" : "hidden"
	});

	for (let i = 0; i < buffs.length; i++) buffs[i].key=i;
	return <div className={"buffsDisplay enemy"}>
		 {buffs.map(obj=>{return <Buff {...obj}/>;})}
	</div>
}

function ResourceLocksDisplay(props) {
	let colors = getCurrentThemeColors();
	let data = (props && props.data) ? props.data : {
		gcdReady: true,
		gcd: 2.5,
		timeTillGCDReady: 0,
		castLocked: false,
		castLockTotalDuration: 0,
		castLockCountdown: 0,
		animLocked: false,
		animLockTotalDuration: 0,
		animLockCountdown: 0,
		canMove: true
	};
	let gcd = <ResourceBar
		name={"GCD"}
		color={colors.resources.gcdBar}
		progress={data.gcdReady ? 0 : 1 - data.timeTillGCDReady / data.gcd}
		value={data.timeTillGCDReady.toFixed(2)}
		width={100}
		hidden={data.gcdReady}/>;
	let tax = <ResourceBar
		name={"casting/taxed"}
		color={data.canMove ? colors.resources.gcdBar : colors.resources.lockBar}
		progress={data.castLocked ? 1 - data.castLockCountdown / data.castLockTotalDuration : 0}
		value={data.castLockCountdown.toFixed(2)}
		width={100}
		hidden={!data.castLocked}/>;
	let anim = <ResourceBar
		name={"using skill"}
		color={colors.resources.lockBar}
		progress={data.animLocked ? 1 - data.animLockCountdown / data.animLockTotalDuration : 0}
		value={data.animLockCountdown.toFixed(2)}
		width={100}
		hidden={!data.animLocked}/>;
	return <div style={{position: "absolute"}}>
		{gcd}
		{tax}
		{anim}
	</div>
}

function ResourcesDisplay(props) {
	let colors = getCurrentThemeColors();
	let data = (props && props.data) ? props.data : {
		mana: 10000,
		timeTillNextManaTick: 0.8,
		enochianCountdown: 0,
		astralFire: 0,
		umbralIce: 0,
		umbralHearts: 0,
		paradox: 0,
		polyglotCountdown: 30,
		polyglotStacks: 0
	}
	let manaBar = <ResourceBar
		name={"MP"}
		color={colors.resources.mana}
		progress={data.mana / 10000}
		value={Math.floor(data.mana) + "/10000"}
		width={100}/>;
	let manaTick = <ResourceBar
		name={localize({
		en: "MP tick",
		zh: "跳蓝时间"
		})}
		color={colors.resources.manaTick}
		progress={1 - data.timeTillNextManaTick / 3}
		value={(3 - data.timeTillNextManaTick).toFixed(2) + "/3"}
		width={100}/>;
	let enochian = <ResourceBar
		name={localize({
			en: "enochian",
			zh: "天语",
      ja: "エノキアン"
		})}
		color={colors.resources.enochian}
		progress={data.enochianCountdown / 15}
		value={`${data.enochianCountdown.toFixed(2)}`}
		width={100}/>;
	let afui = <ResourceCounter
		name={localize({
			en: "AF/UI",
			zh: "冰火层数",
      ja: "AF/UB"
		})}
		color={data.astralFire > 0 ? colors.resources.astralFire : colors.resources.umbralIce}
		currentStacks={data.astralFire > 0 ? data.astralFire : data.umbralIce}
		maxStacks={3}/>;
	let uh = <ResourceCounter
		name={
		localize({
			en: "hearts",
			zh: "冰针",
      ja: "アンブラルハート"
		})}
		color={colors.resources.umbralHeart}
		currentStacks={data.umbralHearts}
		maxStacks={3}/>;
	let paradox = <ResourceCounter
		name={
		localize({
			en: "paradox",
			zh: "悖论",
      ja: "パラドックス"
	})}
		color={colors.resources.paradox}
		currentStacks={data.paradox}
		maxStacks={1}/>;
	let polyTimer = <ResourceBar
		name={
		localize({
			en: "poly timer",
			zh: "通晓计时",
      ja: "エノキ継続時間"
		})}
		color={colors.resources.polyTimer}
		progress={1 - data.polyglotCountdown / 30}
		value={`${data.polyglotCountdown.toFixed(2)}`}
		width={100}/>;
	let poly = <ResourceCounter
		name={
		localize({
			en: "poly stacks",
			zh: "通晓层数",
      ja: "ポリグロット"
		})}
		color={colors.resources.polyStacks}
		currentStacks={data.polyglotStacks}
		maxStacks={2}/>;
	return <div style={{textAlign: "left"}}>
		{manaBar}
		{manaTick}
		{afui}
		{uh}
		{paradox}
		{enochian}
		{polyTimer}
		{poly}
	</div>;
}

export var updateStatusDisplay = (data)=>{};
export class StatusDisplay extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			time: 0,
			resources: null,
			resourceLocks: null,
			selfBuffs: null,
			enemyBuffs: null
		}
		updateStatusDisplay = ((newData)=>{
			this.setState({
				time: newData.time,
				resources: newData.resources,
				resourceLocks: newData.resourceLocks,
				selfBuffs: newData.selfBuffs,
				enemyBuffs: newData.enemyBuffs
			});
		}).bind(this);
	}
	componentDidMount() {
		controller.updateStatusDisplay(controller.game);
	}
	render() {
		return <div className={"statusDisplay"}>
			<div style={{position: "absolute", top: -8, right: 0, zIndex: 1}}><Help topic={"mainControlRegion"} content={
				<div className="toolTip">
          {localize({
            en: 
              <>
                <div className="paragraph"><span style={{color: "lightgray"}}>grey</span> border: not focused</div>
                <div className="paragraph"><b style={{color: "mediumpurple"}}>purple</b> border: receiving input</div>
                <div className="paragraph"><b style={{color: "mediumseagreen"}}>green</b> border: real-time</div>
                <div className="paragraph"><b style={{color: "darkorange"}}>orange</b> border: viewing historical state, not receiving input</div>
              </>,
            ja:
              <>
                <div className="paragraph"><span style={{color: "lightgray"}}>グレー</span> : 未選択</div>
                <div className="paragraph"><b style={{color: "mediumpurple"}}>紫</b> : 入力可</div>
                <div className="paragraph"><b style={{color: "mediumseagreen"}}>緑</b> : リアルタイム</div>
                <div className="paragraph"><b style={{color: "darkorange"}}>オレンジ</b> : 任意の時点の状態を確認中。入力不可</div>
              </>,
          })}
				</div>
			}/></div>
			<div className={"-left"}>
				<span style={{display: "block", marginBottom: 10}}>{localize({en: "time: ", zh: "战斗时间：", ja: "経過時間："})}{this.state.time.toFixed(2)}</span>
				<ResourcesDisplay data={this.state.resources}/>
			</div>
			<div className={"-right"}>
				<ResourceLocksDisplay data={this.state.resourceLocks}/>
				<EnemyBuffsDisplay data={this.state.enemyBuffs}/>
				<BuffsDisplay data={this.state.selfBuffs}/>
			</div>
		</div>
	}
}
