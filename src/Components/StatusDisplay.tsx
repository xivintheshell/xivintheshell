import React from 'react';
import {Clickable, ContentNode, Help, ProgressBar, StaticFn} from "./Common";
import {ResourceType} from "../Game/Common";
import {controller} from "../Controller/Controller";
import {ShellInfo, ShellJob} from "../Controller/Common";
import {localize, localizeResourceType} from "./Localization";
import {getCurrentThemeColors} from "./ColorTheme";
import {TraitName, Traits} from '../Game/Traits';

type StatusResourcesViewProps = {
	mana: number,
	timeTillNextManaTick: number,
	enochianCountdown: number,
	astralFire: number,
	umbralIce: number,
	umbralHearts: number,
	paradox: number,
	astralSoul: number,
	polyglotCountdown: number,
	polyglotStacks: number,
	// TODO split up by job
	portrait: number,
	depictions: number,
	creatureCanvas: number,
	weaponCanvas: number,
	landscapeCanvas: number,
	paletteGauge: number,
	paint: number,
	hasComet: boolean,
}

type StatusResourceLocksViewProps = {
	gcdReady: boolean,
	gcd: number,
	timeTillGCDReady: number,
	castLocked: boolean,
	castLockTotalDuration: number,
	castLockCountdown: number,
	animLocked: boolean,
	animLockTotalDuration: number,
	animLockCountdown: number,
	canMove: boolean
}

type StatusEnemyBuffsViewProps = {
	DoTCountdown: number,
	addleCountdown: number
}

type StatusSelfBuffsViewProps = {
	leyLinesEnabled: boolean,
	leyLinesCountdown: number,
	triplecastCountdown: number,
	triplecastStacks: number,
	firestarterCountdown: number,
	thunderheadCountdown: number,
	manawardCountdown: number,
} & {
	rainbowBrightCountdown: number,
	hyperphantasiaStacks: number,
	hyperphantasiaCountdown: number,
	inspirationEnabled: boolean,
	inspirationCountdown: number,
	subtractiveSpectrumCountdown: number,
	hammerTimeStacks: number,
	hammerTimeCountdown: number,
	starstruckCountdown: number,
	aetherhuesStacks: number,
	aetherhuesCountdown: number,
	monochromeTones: number,
	subtractivePalette: number,
	starryMuseCountdown: number,
	temperaCoatCountdown: number,
	temperaGrassaCountdown: number,
	smudgeCountdown: number,
} & {
	swiftcastCountdown: number,
	lucidDreamingCountdown: number,
	surecastCountdown: number,
	tinctureCountdown: number,
	sprintCountdown: number
};

// everything should be required here except that'll require repeating all those lines to give default values
type StatusViewProps = {
	time: number,
	resources?: StatusResourcesViewProps,
	resourceLocks?: StatusResourceLocksViewProps,
	enemyBuffs?: StatusEnemyBuffsViewProps,
	selfBuffs?: StatusSelfBuffsViewProps,
	level: number
}

// color, value
function ResourceStack(props: {color: string, value: boolean}) {
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
	name: "placeholder" as ContentNode,
	color: "#6cf",
	value: "0.34/1.00",
	progress: 0.34,
	width: 100,
	hidden: false
}) {
	return <div hidden={props.hidden} style={{marginBottom: 4, lineHeight: "1.5em"}}>
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
function ResourceCounter(props: {
	name: ContentNode,
	color: string,
	currentStacks: number,
	maxStacks: number,
	className?: string
}) {
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

// copy of ResourceCounter specialized for the paint gauge
// name, holyColor, cometColor, currentStacks, maxStacks, hasComet
function PaintGaugeCounter(props: {
	name: ContentNode,
	holyColor: string,
	cometColor: string,
	currentStacks: number,
	maxStacks: number,
	hasComet: boolean,
	className?: string,
}) {
	let stacks = [];
	for (let i = 0; i < 5; i++) {
		// dip the last one in black paint
		let isComet = props.hasComet && i === props.currentStacks - 1;
		stacks.push(<ResourceStack key={i} color={isComet ? props.cometColor : props.holyColor} value={i < props.currentStacks}/>)
	}
	return <div className={props.className} style={{marginBottom: 4, lineHeight: "1.5em"}}>
		<div style={{display: "inline-block", height: "100%", width: 108}}>{props.name}</div>
		<div style={{width: 200, display: "inline-block"}}>
			<div style={{display: "inline-block", marginLeft: 6}}>{stacks}</div>
			<div style={{marginLeft: 6, height: "100%", display: "inline-block"}}>{props.currentStacks + "/" + props.maxStacks}</div>
		</div>
	</div>;
}

function ResourceText(props: {
	name: ContentNode,
	text: ContentNode,
	className?: string,
}) {
	return <div className={props.className} style={{marginBottom: 4, lineHeight: "1.5em"}}>
		<div style={{display: "inline-block", height: "100%", width: 108}}>{props.name}</div>
		<div style={{width: 200, display: "inline-block"}}>
			<div style={{display: "inline-block", marginLeft: 6}}>{props.text}</div>
		</div>
	</div>;
}


const buffIcons = new Map();

// TODO move this declaration elsewhere
const blmBuffResources = [
	ResourceType.Triplecast,
	ResourceType.Triplecast + "2",
	ResourceType.Triplecast + "3",
	ResourceType.Firestarter,
	ResourceType.Thunderhead,
	ResourceType.ThunderDoT,
	ResourceType.LeyLines,
	ResourceType.Manaward,
];

const pctBuffResources = [
	ResourceType.Aetherhues,
	ResourceType.Aetherhues + "2",
	ResourceType.MonochromeTones,
	ResourceType.HammerTime,
	ResourceType.HammerTime + "2",
	ResourceType.HammerTime + "3",
	ResourceType.Inspiration,
	ResourceType.SubtractivePalette,
	ResourceType.SubtractivePalette + "2",
	ResourceType.SubtractivePalette + "3",
	ResourceType.SubtractiveSpectrum,
	ResourceType.Hyperphantasia,
	ResourceType.Hyperphantasia + "2",
	ResourceType.Hyperphantasia + "3",
	ResourceType.Hyperphantasia + "4",
	ResourceType.Hyperphantasia + "5",
	ResourceType.RainbowBright,
	ResourceType.Starstruck,
	ResourceType.StarryMuse,
	ResourceType.TemperaCoat,
	ResourceType.TemperaGrassa,
	ResourceType.Smudge,
];

const casterRoleBuffResources = [
	ResourceType.Addle,
	ResourceType.Swiftcast,
	ResourceType.LucidDreaming,
	ResourceType.Surecast,
	ResourceType.Tincture,
];


blmBuffResources.forEach(
	(buff) => buffIcons.set(buff, require(`./Asset/Buffs/BLM/${buff}.png`))
);

pctBuffResources.forEach(
	(buff) => buffIcons.set(buff, require(`./Asset/Buffs/PCT/${buff}.png`))
);

casterRoleBuffResources.forEach(
	(buff) => buffIcons.set(buff, require(`./Asset/Buffs/CasterRole/${buff}.png`))
);

buffIcons.set(ResourceType.Sprint, require("./Asset/Buffs/General/Sprint.png"));

// rscType, stacks, timeRemaining, onSelf, enabled
function Buff(props: {
	rscType: ResourceType,
	onSelf: boolean,
	enabled: boolean,
	stacks: number,
	timeRemaining?: string,
	className: string
}) {
	let assetName: string = props.rscType;
	if (props.stacks > 1) {
		assetName += props.stacks.toString();
	}
	const rscDisplayName = localizeResourceType(props.rscType);
	return <div title={rscDisplayName} className={props.className + " buff " + props.rscType}>
		<Clickable content={
			<img style={{height: 40}} src={buffIcons.get(assetName)} alt={rscDisplayName}/>
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
		{/* When the buff has no timer, we still want it to align with other buffs, so just pad some empty space */}
		<span className={"buff-label"} style={{visibility: props.timeRemaining === undefined ? "hidden" : undefined}}>
			{props.timeRemaining ?? "0.000"}
		</span>
	</div>
}

function BuffsDisplay(props: {
	data: StatusSelfBuffsViewProps
}) {
	let data = props.data;
	let buffs = [];
	buffs.push({
		rscType: ResourceType.LeyLines,
		onSelf: true,
		enabled: data.leyLinesEnabled,
		stacks:1,
		timeRemaining: data.leyLinesCountdown.toFixed(3),
		className: data.leyLinesCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Triplecast,
		onSelf: true,
		enabled: true,
		stacks: data.triplecastStacks,
		timeRemaining: data.triplecastCountdown.toFixed(3),
		className: data.triplecastCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Firestarter,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.firestarterCountdown.toFixed(3),
		className: data.firestarterCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Thunderhead,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.thunderheadCountdown.toFixed(3),
		className: data.thunderheadCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Manaward,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.manawardCountdown.toFixed(3),
		className: data.manawardCountdown > 0 ? "" : "hidden"
	});

	const pushPictoTimer = (rscType: ResourceType, stacks: number, cd: number) => {
		let enabled = (rscType === ResourceType.Inspiration) ? data.inspirationEnabled : true;
		buffs.push({
			rscType: rscType,
			onSelf: true,
			enabled: enabled,
			stacks: stacks,
			timeRemaining: cd.toFixed(3),
			className: cd > 0 ? "" : "hidden"
		});
	};

	const pushPictoIndefinite = (rscType: ResourceType, stacks: number) => {
		buffs.push({
			rscType: rscType,
			onSelf: true,
			enabled: true,
			stacks: stacks,
			className: stacks ? "" : "hidden",
		});
	};

	// TODO check order
	if (ShellInfo.job === ShellJob.PCT) {
		pushPictoTimer(ResourceType.RainbowBright, 1, data.rainbowBrightCountdown);
		pushPictoTimer(ResourceType.Hyperphantasia, data.hyperphantasiaStacks, data.hyperphantasiaCountdown);
		pushPictoTimer(ResourceType.Inspiration, 1, data.inspirationCountdown);
		pushPictoTimer(ResourceType.SubtractiveSpectrum, 1, data.subtractiveSpectrumCountdown);
		pushPictoTimer(ResourceType.HammerTime, data.hammerTimeStacks, data.hammerTimeCountdown);
		pushPictoTimer(ResourceType.Starstruck, 1, data.starstruckCountdown);
		pushPictoTimer(ResourceType.Aetherhues, data.aetherhuesStacks, data.aetherhuesCountdown);
		pushPictoIndefinite(ResourceType.MonochromeTones, data.monochromeTones);
		pushPictoIndefinite(ResourceType.SubtractivePalette, data.subtractivePalette);
		pushPictoTimer(ResourceType.StarryMuse, 1, data.starryMuseCountdown);
		pushPictoTimer(ResourceType.TemperaCoat, 1, data.temperaCoatCountdown);
		pushPictoTimer(ResourceType.TemperaGrassa, 1, data.temperaGrassaCountdown);
		pushPictoTimer(ResourceType.Smudge, 1, data.smudgeCountdown);
	}

	buffs.push({
		rscType: ResourceType.Swiftcast,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.swiftcastCountdown.toFixed(3),
		className: data.swiftcastCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.LucidDreaming,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.lucidDreamingCountdown.toFixed(3),
		className: data.lucidDreamingCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Surecast,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.surecastCountdown.toFixed(3),
		className: data.surecastCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Tincture,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.tinctureCountdown.toFixed(3),
		className: data.tinctureCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Sprint,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.sprintCountdown.toFixed(3),
		className: data.sprintCountdown > 0 ? "" : "hidden"
	});

	let buffElems: React.ReactNode[] = [];
	for (let i = 0; i < buffs.length; i++) {
		buffElems.push(<Buff key={i} {...buffs[i]}/>);
	}

	return <div className={"buffsDisplay self"}>
		{buffElems}
	</div>
}

function EnemyBuffsDisplay(props: {
	data: StatusEnemyBuffsViewProps
}) {
	let data = props.data;
	let buffs = [];
	buffs.push({
		rscType: ResourceType.ThunderDoT,
		onSelf: false,
		enabled: true,
		stacks:1,
		timeRemaining: data.DoTCountdown.toFixed(3),
		className: data.DoTCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Addle,
		onSelf: false,
		enabled: true,
		stacks:1,
		timeRemaining: data.addleCountdown.toFixed(3),
		className: data.addleCountdown > 0 ? "" : "hidden"
	});

	let buffElems: React.ReactNode[] = [];
	for (let i = 0; i < buffs.length; i++) {
		buffElems.push(<Buff key={i} {...buffs[i]}/>);
	}
	return <div className={"buffsDisplay enemy"}>
		{buffElems}
	</div>
}

function ResourceLocksDisplay(props: {
	data: StatusResourceLocksViewProps
}) {
	let colors = getCurrentThemeColors();
	let data = props.data;
	let gcd = <ResourceBar
		name={"GCD"}
		color={colors.resources.gcdBar}
		progress={data.gcdReady ? 0 : 1 - data.timeTillGCDReady / data.gcd}
		value={data.timeTillGCDReady.toFixed(3)}
		width={100}
		hidden={data.gcdReady}/>;
	let tax = <ResourceBar
		name={"casting/taxed"}
		color={data.canMove ? colors.resources.gcdBar : colors.resources.lockBar}
		progress={data.castLocked ? 1 - data.castLockCountdown / data.castLockTotalDuration : 0}
		value={data.castLockCountdown.toFixed(3)}
		width={100}
		hidden={!data.castLocked}/>;
	let anim = <ResourceBar
		name={"using skill"}
		color={colors.resources.lockBar}
		progress={data.animLocked ? 1 - data.animLockCountdown / data.animLockTotalDuration : 0}
		value={data.animLockCountdown.toFixed(3)}
		width={100}
		hidden={!data.animLocked}/>;
	return <div style={{position: "absolute"}}>
		{gcd}
		{tax}
		{anim}
	</div>
}

function ResourcesDisplay(props: {
	data: {
		level: number,
		resources: StatusResourcesViewProps
	}
}) {
	let colors = getCurrentThemeColors();
	let data = props.data;
	let resources = props.data.resources;

	let manaBar = <ResourceBar
		name={"MP"}
		color={colors.resources.mana}
		progress={resources.mana / 10000}
		value={Math.floor(resources.mana) + "/10000"}
		width={100}
		hidden={false}
	/>;
	let manaTick = <ResourceBar
		name={localize({
			en: "MP tick",
			zh: "跳蓝时间",
			ja: "MPティック"
		})}
		color={colors.resources.manaTick}
		progress={1 - resources.timeTillNextManaTick / 3}
		value={(3 - resources.timeTillNextManaTick).toFixed(3) + "/3"}
		width={100}
		hidden={false}
	/>;
	let enochian = <ResourceBar
		name={localize({
			en: "enochian",
			zh: "天语",
			ja: "エノキアン"
		})}
		color={colors.resources.enochian}
		progress={resources.enochianCountdown / 15}
		value={`${resources.enochianCountdown.toFixed(3)}`}
		width={100}
		hidden={false}
	/>;
	let afui = <ResourceCounter
		name={localize({
			en: "AF/UI",
			zh: "冰火层数",
			ja: "AF/UB"
		})}
		color={resources.astralFire > 0 ? colors.resources.astralFire : colors.resources.umbralIce}
		currentStacks={resources.astralFire > 0 ? resources.astralFire : resources.umbralIce}
		maxStacks={3}/>;
	let uh = <ResourceCounter
		name={
			localize({
				en: "hearts",
				zh: "冰针",
				ja: "アンブラルハート"
			})}
		color={colors.resources.umbralHeart}
		currentStacks={resources.umbralHearts}
		maxStacks={3}/>;
	let paradox = data.level && Traits.hasUnlocked(TraitName.AspectMasteryIV, data.level) ?
		<ResourceCounter
			name={
				localize({
					en: "paradox",
					zh: "悖论",
					ja: "パラドックス"
				})}
			color={colors.resources.paradox}
			currentStacks={resources.paradox}
			maxStacks={1}/>
		: undefined;
	let soul = data.level && Traits.hasUnlocked(TraitName.EnhancedAstralFire, data.level) ?
		<ResourceCounter
			name={
				localize({
					en: "astral soul",
					zh: "星极魂",
					ja: "アストラルソウル"
				})}
			color={colors.resources.astralSoul}
			currentStacks={resources.astralSoul}
			maxStacks={6}/>
		: undefined;
	let polyTimer = <ResourceBar
		name={
			localize({
				en: "poly timer",
				zh: "通晓计时",
				ja: "エノキ継続時間"
			})}
		color={colors.resources.polyTimer}
		progress={1 - resources.polyglotCountdown / 30}
		value={`${resources.polyglotCountdown.toFixed(3)}`}
		width={100}
		hidden={false}
	/>;
	
	const polyglotStacks = 
		(data.level && Traits.hasUnlocked(TraitName.EnhancedPolyglotII, data.level) && 3) ||
		(data.level && Traits.hasUnlocked(TraitName.EnhancedPolyglot, data.level) && 2) ||
		1;
	let poly = <ResourceCounter
		name={
			localize({
				en: "poly stacks",
				zh: "通晓层数",
				ja: "ポリグロット"
			})}
		color={colors.resources.polyStacks}
		currentStacks={resources.polyglotStacks}
		maxStacks={polyglotStacks}/>;

	let portrait = <ResourceText
		name={
			localize({
				en: "portrait",
				zh: "肖像标识",
			})
		}
		text={resources.portrait === 0 ? "/" : (
			resources.portrait === 1 ? localize({
				en: "moogle",
				zh: "莫古力",
			}) : localize({
				en: "madeen",
				zh: "马蒂恩",
			})
		)}
	/>;

	let depictions = <ResourceText
		name={
			localize({
				en: "depictions",
				zh: "动物标识",
			})
		}
		text={
			resources.depictions === 0 ? "/" :
				(resources.depictions === 1 ? localize({
					en: "pom",
					zh: "绒球",
				}) :
					(resources.depictions === 2 ? localize({
						en: "wing",
						zh: "翅膀",
					}) :
						(resources.depictions === 3 ? localize({
							en: "fang",
							zh: "兽爪",
						}) : localize({
							en: "maw",
							zh: "尖牙",
						}))))
		}
	/>;

	let creatureCanvas = <ResourceCounter
		name={
			localize({
				en: "creature",
				zh: "动物",
			})
		}
		color={colors.resources.creatureCanvas}
		currentStacks={resources.creatureCanvas}
		maxStacks={1}
	/>;

	let weaponCanvas = <ResourceCounter
		name={
			localize({
				en: "weapon",
				zh: "武器",
			})
		}
		color={colors.resources.weaponCanvas}
		currentStacks={resources.weaponCanvas}
		maxStacks={1}
	/>;

	let landscapeCanvas = <ResourceCounter
		name={
			localize({
				en: "landscape",
				zh: "风景",
			})
		}
		color={colors.resources.landscapeCanvas}
		currentStacks={resources.landscapeCanvas}
		maxStacks={1}
	/>;

	let paletteGauge = <ResourceBar
		name={
			localize({
				en: "palette gauge",
				zh: "调色量谱",
			})
		}
		color={colors.resources.paletteGauge}
		progress={resources.paletteGauge / 100}
		value={resources.paletteGauge.toFixed(0)}
		width={100}
		hidden={false}
	/>;

	// name, holyColor, cometColor, currentStacks, maxStacks, hasComet
	let paint = (Traits.hasUnlocked(TraitName.EnhancedArtistry, data.level)) ? <PaintGaugeCounter
		name={
			localize({
				en: "paint gauge",
				zh: "颜料量谱",
			})
		}
		holyColor={colors.resources.holyPaint}
		cometColor={colors.resources.cometPaint}
		currentStacks={resources.paint}
		maxStacks={5}
		hasComet={Traits.hasUnlocked(TraitName.EnhancedPalette, data.level) && resources.hasComet}
	/> : <React.Fragment></React.Fragment>;

	return <div style={{textAlign: "left"}}>
		{manaBar}
		{manaTick}
		{ShellInfo.job === ShellJob.BLM &&
		<>
		{afui}
		{uh}
		{paradox}
		{soul}
		{enochian}
		{polyTimer}
		{poly}
		</>
		}
		{ShellInfo.job === ShellJob.PCT &&
		<>
		{portrait}
		{depictions}
		{creatureCanvas}
		{weaponCanvas}
		{landscapeCanvas}
		{paletteGauge}
		{paint}
		</>
		}
	</div>;
}

export var updateStatusDisplay = (data: StatusViewProps)=>{};
export class StatusDisplay extends React.Component {
	state: StatusViewProps;
	constructor(props: StatusViewProps) {
		super(props);
		this.state = {
			time: 0,
			level: 100,
		}
		updateStatusDisplay = ((newData)=>{
			this.setState({
				time: newData.time,
				resources: newData.resources,
				resourceLocks: newData.resourceLocks,
				selfBuffs: newData.selfBuffs,
				enemyBuffs: newData.enemyBuffs,
				level: newData.level,
			});
		});
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
				<span style={{display: "block", marginBottom: 10}}>
					{localize({en: "time: ", zh: "战斗时间：", ja: "経過時間："})}
					{`${StaticFn.displayTime(this.state.time, 3)} (${this.state.time.toFixed(3)})`}
				</span>
				{this.state.resources ? <ResourcesDisplay data={{
					level: this.state.level,
					resources: this.state.resources
				}}/> : undefined}
			</div>
			<div className={"-right"}>
				{this.state.resourceLocks ? <ResourceLocksDisplay data={this.state.resourceLocks}/> : undefined}
				{this.state.enemyBuffs ? <EnemyBuffsDisplay data={this.state.enemyBuffs}/> : undefined}
				{this.state.selfBuffs ? <BuffsDisplay data={this.state.selfBuffs}/>: undefined}
			</div>
		</div>
	}
}
