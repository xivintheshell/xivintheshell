import React, {CSSProperties} from 'react'
import {ContentNode, FileFormat, Help, SaveToFile} from "./Common";
import {SkillName} from "../Game/Common";
import {PotencyModifier, PotencyModifierType} from "../Game/Potency";
import {getCurrentThemeColors} from "./ColorTheme";
import {localize, localizeSkillName} from "./Localization";
import {controller} from "../Controller/Controller";
import {
	allSkillsAreIncluded,
	getSkillOrDotInclude,
	getTargetableDurationBetween,
	updateSkillOrDoTInclude
} from "../Controller/DamageStatistics";

export type DamageStatsMainTableEntry = {
	skillName: SkillName,
	displayedModifiers: PotencyModifierType[],
	basePotency: number,
	calculationModifiers: PotencyModifier[],
	usageCount: number,
	hitCount: number,
	totalPotencyWithoutPot: number,
	showPotency: boolean,
	potPotency: number,
	potCount: number
};

export type DamageStatsThunderTableEntry = {
	castTime: number,
	applicationTime: number,
	displayedModifiers: PotencyModifierType[],
	gap: number,
	override: number,
	mainPotencyHit: boolean,
	baseMainPotency: number,
	baseDotPotency: number,
	calculationModifiers: PotencyModifier[],
	totalNumTicks: number,
	numHitTicks: number,
	potencyWithoutPot: number,
	potPotency: number
}

export type SelectedStatisticsData = {
	totalDuration: number,
	targetableDuration: number,
	potency: {
		applied: number,
		pending: number
	},
	gcdSkills: {
		applied: number,
		pending: number
	}
}

export type DamageStatisticsData = {
	time: number,
	tinctureBuffPercentage: number,
	countdown: number,
	totalPotency: {
		applied: number,
		pending: number
	},
	lastDamageApplicationTime: number,
	gcdSkills: {
		applied: number,
		pending: number
	},
	mainTable: DamageStatsMainTableEntry[],
	mainTableSummary: {
		totalPotencyWithoutPot: number,
		totalPotPotency: number
	},
	thunderTable: DamageStatsThunderTableEntry[],
	thunderTableSummary: {
		cumulativeGap: number,
		cumulativeOverride: number,
		timeSinceLastDoTDropped: number,
		totalTicks: number,
		maxTicks: number,
		dotCoverageTimeFraction: number,
		theoreticalMaxTicks: number,
		totalPotencyWithoutPot: number,
		totalPotPotency: number,
	},
	historical: boolean,
}

export let updateDamageStats = (data: DamageStatisticsData) => {};
export let updateSelectedStats = (data: SelectedStatisticsData) => {};

function buffName(buff: PotencyModifierType) {
	let text = "";
	if (buff === PotencyModifierType.AF3) {
		text = localize({en: "AF3", zh: "三层火"}) as string;
	} else if (buff === PotencyModifierType.AF2) {
		text = localize({en: "AF2", zh: "二层火"}) as string;
	} else if (buff === PotencyModifierType.AF1) {
		text = localize({en: "AF1", zh: "一层火"}) as string;
	} else if (buff === PotencyModifierType.UI3) {
		text = localize({en: "UI3", zh: "三层冰"}) as string;
	} else if (buff === PotencyModifierType.UI2) {
		text = localize({en: "UI2", zh: "二层冰"}) as string;
	} else if (buff === PotencyModifierType.UI1) {
		text = localize({en: "UI1", zh: "一层冰"}) as string;
	} else if (buff === PotencyModifierType.ENO) {
		text = localize({en: "enochian", zh: "天语"}) as string;
	} else if (buff === PotencyModifierType.POT) {
		text = localize({en: "pot", zh: "爆发药"}) as string;
	}
	return text;
}

function BuffTag(props: {buff?: PotencyModifierType, tc?: boolean}) {
	let colors = getCurrentThemeColors();
	let text: ContentNode = "";
	let color: string = "#66ccff";
	if (props.buff === PotencyModifierType.AF3) {
		text = localize({en: "AF3", zh: "三层火"});
		color = colors.resources.astralFire;
	} else if (props.buff === PotencyModifierType.AF2) {
		text = localize({en: "AF2", zh: "二层火"});
		color = colors.resources.astralFire;
	} else if (props.buff === PotencyModifierType.AF1) {
		text = localize({en: "AF1", zh: "一层火"});
		color = colors.resources.astralFire;
	} else if (props.buff === PotencyModifierType.UI3) {
		text = localize({en: "UI3", zh: "三层冰"});
		color = colors.resources.umbralIce;
	} else if (props.buff === PotencyModifierType.UI2) {
		text = localize({en: "UI2", zh: "二层冰"});
		color = colors.resources.umbralIce;
	} else if (props.buff === PotencyModifierType.UI1) {
		text = localize({en: "UI1", zh: "一层冰"});
		color = colors.resources.umbralIce;
	} else if (props.buff === PotencyModifierType.ENO) {
		text = localize({en: "ENO", zh: "天语"});
		color = colors.resources.enochian;
	}
	return <span style={{
		borderRadius: 2,
		border: "1px solid " + color,
		fontSize: 11,
		marginRight: 4,
		padding: "1px 4px",
		background: color + "1f"
	}}><b style={{color: color}}>{text}</b></span>
}

function PotencyDisplay(props: {
	basePotency: number,
	helpTopic: string,
	includeInStats: boolean,
	explainUntargetable?: boolean,
	calc: PotencyModifier[]})
{
	let potency = props.basePotency;
	let potencyExplanation = props.basePotency.toFixed(2) + (localize({en: "(base)", zh: "(基础威力)"}) as string);
	if (props.explainUntargetable) {
		potencyExplanation += localize({en: "(untargetable)", zh: "(不可选中)"});
	}
	props.calc.forEach(m=>{
		potency *= m.factor;
		if (m.factor !== 1) {
			potencyExplanation += " × " + m.factor + "(" + buffName(m.source) + ")"
		}
	});
	return <span style={{textDecoration: props.includeInStats ? "none" : "line-through"}}>{potency.toFixed(2)} <Help topic={props.helpTopic} content={potencyExplanation}/></span>
}

const rowGap = "0.375em 0.75em";

export class DamageStatistics extends React.Component {
	selected: SelectedStatisticsData = {
		totalDuration: 0,
		targetableDuration: 0,
		potency: {applied: 0, pending: 0},
		gcdSkills: {applied: 0, pending: 0}
	}
	data: DamageStatisticsData = {
		time: 0,
		tinctureBuffPercentage: 0,
		countdown: 0,
		totalPotency: {applied: 0, pending: 0},
		lastDamageApplicationTime: 0,
		gcdSkills: {applied: 0, pending: 0},
		mainTable: [],
		mainTableSummary: {totalPotencyWithoutPot: 0, totalPotPotency: 0},
		thunderTable: [],
		thunderTableSummary: {
			cumulativeGap: 0,
			cumulativeOverride: 0,
			timeSinceLastDoTDropped: 0,
			totalTicks: 0,
			maxTicks: 0,
			dotCoverageTimeFraction: 0,
			theoreticalMaxTicks: 0,
			totalPotencyWithoutPot: 0,
			totalPotPotency: 0
		},
		historical: false,
	};

	constructor(props: {}) {
		super(props);
		updateDamageStats = ((data: DamageStatisticsData) => {
			this.data = data;
			this.forceUpdate();
		}).bind(this);
		updateSelectedStats = ((selected: SelectedStatisticsData) => {
			this.selected = selected;
			this.forceUpdate();
		}).bind(this);
	}

	componentWillUnmount() {
		updateDamageStats = (data: DamageStatisticsData) => {}
	}

	render() {

		let colors = getCurrentThemeColors();
		const allIncluded = allSkillsAreIncluded();

		//////////////////// Summary ///////////////////////

		const colon = localize({en: ": ", zh: "："}) as string;
		const lparen = localize({en: " (", zh: "（"}) as string;
		const rparen = localize({en: ") ", zh: "）"}) as string;
		const checkedOnlyStr = allIncluded ? "" : localize({en: " (checked only)", zh: "（勾选部分）"}) as string;

		let lastDisplay = this.data.lastDamageApplicationTime - this.data.countdown;
		let targetableDurationTilLastDisplay  = getTargetableDurationBetween(0, lastDisplay);
		let ppsAvailable = this.data.lastDamageApplicationTime > -this.data.countdown;
		let lastDamageApplicationTimeDisplay = ppsAvailable ? lastDisplay.toFixed(2).toString() : "N/A";
		let potencyStr = localize({en: "Total potency", zh: "总威力"}) as string;
		let selectedPotencyStr = localize({en: "Selected potency", zh: "选中威力"}) as string;
		if (this.data.tinctureBuffPercentage > 0) {
			let s = lparen + (localize({en: "pot +", zh: "爆发药 +"}) as string) + this.data.tinctureBuffPercentage + "%" + rparen;
			potencyStr += s;
			selectedPotencyStr += s;
		}
		potencyStr += checkedOnlyStr;
		selectedPotencyStr += checkedOnlyStr;

		potencyStr += colon + this.data.totalPotency.applied.toFixed(2);
		selectedPotencyStr += colon + this.selected.potency.applied.toFixed(2);
		if (this.data.totalPotency.pending > 0) {
			potencyStr += lparen + this.data.totalPotency.pending.toFixed(2) + (localize({en: " pending", zh: "未结算"}) as string) + rparen;
		}
		if (this.selected.potency.pending > 0) {
			selectedPotencyStr += lparen + this.selected.potency.pending.toFixed(2) + (localize({en: " pending", zh: "未结算"}) as string) + rparen;
		}

		let gcdStr = localize({en: "GCD skills", zh: "GCD技能"}) + checkedOnlyStr + colon + this.data.gcdSkills.applied;
		let selectedGcdStr = localize({en:"Selected GCD skills", zh:"选中GCD技能"}) + checkedOnlyStr + colon + this.selected.gcdSkills.applied;
		if (this.data.gcdSkills.pending > 0) {
			gcdStr += lparen + "+" + this.data.gcdSkills.pending + (localize({en: " not yet applied", zh: "未结算"}) as string) + rparen;
		}
		if (this.selected.gcdSkills.pending > 0) {
			selectedGcdStr += lparen + "+" + this.selected.gcdSkills.pending + (localize({en: " not yet applied", zh: "未结算"}) as string) + rparen;
		}

		let dotStr = localize({en: "Thunder DoT uptime", zh: "雷覆盖时间"}) + colon + (this.data.thunderTableSummary.dotCoverageTimeFraction*100).toFixed(2) + "%";
		dotStr += lparen + localize({en: "ticks", zh: "跳雷次数"}) + colon + this.data.thunderTableSummary.totalTicks + "/" + this.data.thunderTableSummary.maxTicks + rparen;

		let selected: React.ReactNode | undefined = undefined;
		let selectedPPSAvailable = this.selected.targetableDuration > 0;
		if (this.selected.totalDuration > 0) {
			selected = <div style={{flex: 1}}>
				<div>{localize({en: "Selected duration", zh: "选中时长"})}{colon}{this.selected.totalDuration.toFixed(2)}</div>
				<div>{selectedPotencyStr}</div>
				<div>PPS{checkedOnlyStr + colon}{selectedPPSAvailable ? (this.selected.potency.applied / this.selected.targetableDuration).toFixed(2) : "N/A"}</div>
				<div>{selectedGcdStr}</div>
			</div>
		}

		let summary = <div style={{display: "flex", marginBottom: 10, flexDirection: "row"}}>
			<div style={{flex: 1, color: this.data.historical ? colors.historical : colors.text}}>
				<div>{localize({en: "Last damage application time", zh: "最后伤害结算时间"})}{colon}{lastDamageApplicationTimeDisplay}</div>
				<div>{potencyStr}</div>
				<div>PPS{checkedOnlyStr} <Help topic={"ppsNotes"} content={
					<div className={"toolTip"}>
						<div className="paragraph">{localize({
							en: "(total applied potency) / (total targetable duration until last damage application time).",
							zh: "已结算总威力 / (最后伤害结算时间 - 不可选中总时长)。"
						})}</div>
						<div className="paragraph">{localize({
							en: "could be inaccurate if any damage happens before pull",
							zh: "如果有伤害在0s之前结算，则此PPS不准确"
						})}</div>
					</div>
				}/>{colon}{ppsAvailable ? (this.data.totalPotency.applied / targetableDurationTilLastDisplay).toFixed(2) : "N/A"}</div>
				<div>{gcdStr}</div>
				<div>{dotStr}</div>
				<div>
					<SaveToFile fileFormat={FileFormat.Csv} getContentFn={()=>{
						return controller.getDamageLogCsv();
					}} filename={"damage-log"} displayName={localize({
						en: "download detailed damage log as CSV file",
						zh: "下载详细伤害结算记录（CSV格式）"
					})}/>
				</div>
			</div>
			{selected}
		</div>;

		///////////////////////// Main table //////////////////////////

		let cell = function(widthPercentage: number): CSSProperties {
			return {
				verticalAlign: "middle",
				boxSizing: "border-box",
				display: "inline-block",
				width: widthPercentage + "%",
				padding: rowGap,
			};
		}

		let makeRow = function(props: {
			lastRowSkill?: SkillName,
			row: DamageStatsMainTableEntry,
			key: number
		}) {
			const sameAsLast = props.row.skillName === props.lastRowSkill;

			let tags: React.ReactNode[] = [];
			for (let i = 0; i < props.row.displayedModifiers.length; i++) {
				tags.push(<BuffTag key={i} buff={props.row.displayedModifiers[i]}/>);
			}

			const includeInStats = getSkillOrDotInclude(props.row.skillName);

			// include checkbox
			let includeCheckboxes: React.ReactNode[] = [];
			if (!sameAsLast && props.row.basePotency > 0) {
				includeCheckboxes.push(<input key="main" type={"checkbox"} style={{position: "relative", top: 2, marginRight: 10}} checked={includeInStats} onChange={()=>{
					updateSkillOrDoTInclude({skillNameOrDoT: props.row.skillName, include: !includeInStats});
				}}/>);
			}
			// additional checkbox for DoT
			if (props.row.skillName === SkillName.HighThunder) {
				includeCheckboxes.push(<input key="dot" type={"checkbox"} style={{position: "relative", top: 2, marginRight: 10}} checked={
					getSkillOrDotInclude("DoT")
				} onChange={()=>{
					updateSkillOrDoTInclude({skillNameOrDoT: "DoT", include: !getSkillOrDotInclude("DoT")});
				}}/>);
			}

			// skill name node
			let skillNameNode: React.ReactNode | undefined = undefined;
			if (!sameAsLast) {
				skillNameNode = <span>
					<span style={{textDecoration: includeInStats ? "none" : "line-through", color: includeInStats ? colors.text : colors.bgHighContrast}}>
						{localizeSkillName(props.row.skillName)} {props.row.skillName===SkillName.HighThunder ?
							<Help topic={"potencyStats-thunder"} content={localize({en: "See Thunder table below for details", zh: "详见下方雷3表格"})}/>
							: undefined}
					</span>
					{props.row.skillName===SkillName.HighThunder ? <span style={{
						textDecoration: getSkillOrDotInclude("DoT") ? "none" : "line-through",
						color: getSkillOrDotInclude("DoT") ? colors.text : colors.bgHighContrast
					}}><br/>
						{localize({en: "(DoT)", zh: "（跳雷）"})}
					</span> : undefined}
				</span>;
			}

			// potency
			let potencyNode: React.ReactNode | undefined = undefined;
			if (props.row.basePotency > 0 && props.row.skillName !== SkillName.HighThunder) {
				potencyNode = <PotencyDisplay
					includeInStats={includeInStats}
					basePotency={props.row.basePotency}
					helpTopic={"mainTable-potencyCalc-"+props.key}
					calc={props.row.calculationModifiers}/>;
			}

			// usage count node
			let unhitUsages = props.row.usageCount - props.row.hitCount;
			let usageCountNode = <span style={{textDecoration: includeInStats ? "none" : "line-through"}}>
				{props.row.hitCount}
				{unhitUsages>0 ? <span style={{color: colors.timeline.untargetableDamageMark + "af"}}> +{unhitUsages} <Help
					topic={"mainTable-numUntargetableUsages-"+props.key}
					content={localize({en: "usage(s) when untargetable", zh: "Boss上天期间使用次数"})}/></span> : undefined}
			</span>

			// total potency
			let totalPotencyNode: React.ReactNode | undefined = undefined;
			if (props.row.showPotency) {
				totalPotencyNode = <span style={{textDecoration: includeInStats ? "none" : "line-through"}}>
					{props.row.totalPotencyWithoutPot.toFixed(2)}
					{props.row.potPotency > 0 ? <span style={{
						color: includeInStats ? colors.timeline.potCover : colors.bgHighContrast
					}}> +{props.row.potPotency.toFixed(2)}({localize({en: "pot", zh: "爆发药"})})({props.row.potCount})</span> : undefined}
				</span>
			}
			let rowStyle: CSSProperties = {
				textAlign: "left",
				position: "relative",
				borderTop: sameAsLast ? "none" : "1px solid " + colors.bgMediumContrast,
			};
			if (!includeInStats) {
				rowStyle.color = colors.bgHighContrast;
			}
			return <div key={props.key} style={rowStyle}>
				<div style={cell(3)}>{includeCheckboxes}</div>
				<div style={cell(22)}>{skillNameNode}</div>
				<div style={cell(10)}>{tags}</div>
				<div style={cell(16)}>{potencyNode}</div>
				<div style={cell(14)}>{usageCountNode}</div>
				<div style={cell(35)}>{totalPotencyNode}</div>
			</div>
		}
		let tableRows: React.ReactNode[] = [];
		for (let i = 0; i < this.data.mainTable.length; i++) {
			tableRows.push(makeRow({
				row: this.data.mainTable[i],
				key: i,
				lastRowSkill: i===0 ? undefined : this.data.mainTable[i-1].skillName
			}));
		}

		////////////////////// Thunder Table ////////////////////////

		let makeThunderRow = function(props: {
			row: DamageStatsThunderTableEntry,
			key: number
		}) {

			// tags
			let tags: React.ReactNode[] = [];
			for (let i = 0; i < props.row.displayedModifiers.length; i++) {
				tags.push(<BuffTag key={i} buff={props.row.displayedModifiers[i]}/>);
			}
			if (props.row.baseMainPotency === 400) {
				tags.push(<BuffTag key={tags.length} tc={true}/>);
			}

			// gap
			let gapStr = props.row.gap.toFixed(2);
			let gapNode = props.row.gap > 0 ? <span>{gapStr}</span> : <span/>;

			// override
			let overrideStr = props.row.override.toFixed(2);
			let overrideNode = props.row.override > 0 ? <span>{overrideStr}</span> : <span/>;

			// potency
			let mainPotencyNode = <PotencyDisplay
				basePotency={props.row.mainPotencyHit ? props.row.baseMainPotency : 0}
				includeInStats={true}
				explainUntargetable={!props.row.mainPotencyHit}
				helpTopic={"thunderTable-main-"+props.key}
				calc={props.row.calculationModifiers}/>
			let dotPotencyNode = <PotencyDisplay
				basePotency={props.row.baseDotPotency}
				includeInStats={true}
				helpTopic={"thunderTable-dot-"+props.key}
				calc={props.row.calculationModifiers}/>

			// num ticks node
			let unhitTicks = props.row.totalNumTicks-props.row.numHitTicks;
			let numTicksNode = <span>
				{props.row.numHitTicks}
				{unhitTicks>0 ? <span style={{color: colors.timeline.untargetableDamageMark + "af"}}> +{unhitTicks} <Help
					topic={"thunderTable-numUntargetableTicks-"+props.key}
					content={localize({en: "tick(s) when untargetable", zh: "Boss上天期间跳雷次数"})}/></span> : undefined}
			</span>

			// total potency
			let totalPotencyNode = <span>
				{props.row.potencyWithoutPot.toFixed(2)}
				{props.row.potPotency > 0 ? <span style={{
					color: colors.timeline.potCover
				}}> +{props.row.potPotency.toFixed(2)}({localize({en: "pot", zh: "爆发药"})})</span> : undefined}
			</span>

			return <div key={props.key} style={{
				textAlign: "left",
				position: "relative",
				borderTop: "1px solid " + colors.bgMediumContrast
			}}>
				<div style={cell(8)}>{props.row.castTime.toFixed(2)}</div>
				<div style={cell(8)}>{props.row.applicationTime.toFixed(2)}</div>
				<div style={cell(12)}>{tags}</div>
				<div style={cell(10)}>{gapNode}</div>
				<div style={cell(10)}>{overrideNode}</div>
				<div style={cell(10)}>{mainPotencyNode}</div>
				<div style={cell(10)}>{dotPotencyNode}</div>
				<div style={cell(8)}>{numTicksNode}</div>
				<div style={cell(24)}>{totalPotencyNode}</div>
			</div>
		}

		let thunderTableRows: React.ReactNode[] = [];
		for (let i = 0; i < this.data.thunderTable.length; i++) {
			thunderTableRows.push(makeThunderRow({
				row: this.data.thunderTable[i],
				key: i
			}));
		}

		//////////////////////////////////////////////////////////

		let headerCellStyle: CSSProperties = {
			display: "inline-block",
			padding: rowGap,
		};
		let mainHeaderStr = allIncluded ?
			localize({en: "Applied Skills", zh: "技能统计"}) :
			localize({en: "Applied Skills (Checked Only)", zh: "技能统计（仅统计选中技能）"});
		let thunderHeaderStr = localize({en: "High Thunder", zh: "雷3统计"}); /* Needs retranslation */
		if (this.data.historical) {
			let t = (this.data.time - this.data.countdown).toFixed(2) + "s";
			let upTillStr = lparen + localize({
				en: "up till " + t,
				zh: "截至" + t
			}) + rparen;
			mainHeaderStr += upTillStr;
			thunderHeaderStr += upTillStr;
		}
		let mainTable = <div style={{
			position: "relative",
			margin: "0 auto",
			marginBottom: 40,
			maxWidth: 960,
		}}>
			<div style={{...cell(100), ...{textAlign: "center", marginBottom: 10}}}>
				<b style={this.data.historical ? {color: colors.historical}:undefined}>{mainHeaderStr}</b>
			</div>
			<div style={{outline: "1px solid " + colors.bgMediumContrast}}>
				<div>
					<div style={{display: "inline-block", width: "35%"}}><span style={headerCellStyle}><b>{localize({en: "skill", zh: "技能"})}</b></span></div>
					<div style={{display: "inline-block", width: "16%"}}><span style={headerCellStyle}><b>{localize({en: "potency", zh: "单次威力"})}</b></span></div>
					<div style={{display: "inline-block", width: "14%"}}><span style={headerCellStyle}><b>{localize({en: "count", zh: "数量"})}</b></span></div>
					<div style={{display: "inline-block", width: "35%"}}><span style={headerCellStyle}><b>{localize({en: "total", zh: "总威力"})}</b></span></div>
				</div>
				{tableRows}
				<div style={{
					textAlign: "left",
					position: "relative",
					borderTop: "1px solid " + colors.bgMediumContrast
				}}>
					<div style={cell(65)}/>
					<div style={cell(35)}><span>
					{this.data.mainTableSummary.totalPotencyWithoutPot.toFixed(2)}
						{this.data.mainTableSummary.totalPotPotency>0 ?
							<span style={{color: colors.timeline.potCover}}> +{this.data.mainTableSummary.totalPotPotency.toFixed(2)}{localize({
								en: " (pot +" + this.data.tinctureBuffPercentage + "%)",
								zh: "(爆发药 +" + this.data.tinctureBuffPercentage + "%)"
							})}</span> : undefined}
				</span></div>
				</div>
			</div>
		</div>

		let thunderTable = <div style={{
			position: "relative",
			margin: "0 auto",
			marginBottom: 40,
			maxWidth: 960,
		}}>
			<div style={{...cell(100), ...{textAlign: "center", marginBottom: 10}}}>
				<b style={this.data.historical ? {color: colors.historical}:undefined}>{thunderHeaderStr}</b>
			</div>
			<div style={{outline: "1px solid " + colors.bgMediumContrast}}>
				<div>
					<div style={{display: "inline-block", width: "8%"}}><span style={headerCellStyle}><b>{localize({en: "cast time", zh: "读条时间"})}</b></span></div>
					<div style={{display: "inline-block", width: "8%"}}><span style={headerCellStyle}><b>{localize({en: "application time", zh: "结算时间"})}</b></span></div>
					<div style={{display: "inline-block", width: "12%"}}><span style={headerCellStyle}/></div>
					<div style={{display: "inline-block", width: "10%"}}><span style={headerCellStyle}>
						<b>{localize({en: "gap", zh: "DoT间隙"})} </b>
						<Help topic={"thunderTable-gap-title"} content={localize({
							en: <div>
								<div className={"paragraph"}>DoT coverage time gap since pull or previous Thunder</div>
								<div className={"paragraph"}>The last row also includes gap at the beginning and end of the fight</div>
							</div>,
							zh: <div>雷DoT覆盖间隙，最后一行也包括战斗开始和结束时没有雷DoT的时间</div>,
						})}/>
					</span></div>
					<div style={{display: "inline-block", width: "10%"}}><span style={headerCellStyle}>
						<b>{localize({en: "override", zh: "DoT覆盖"})} </b>
						<Help topic={"thunderTable-override-title"} content={localize({
							en: <div>Overridden DoT time from previous Thunder</div>,
							zh: <div>提前覆盖雷DoT时长</div>,
						})}/>
					</span></div>
					<div style={{display: "inline-block", width: "10%"}}><span style={headerCellStyle}><b>{localize({en: "initial", zh: "初始威力"})}</b></span></div>
					<div style={{display: "inline-block", width: "10%"}}><span style={headerCellStyle}><b>{localize({en: "DoT", zh: "DoT威力"})}</b></span></div>
					<div style={{display: "inline-block", width: "8%"}}><span style={headerCellStyle}><b>{localize({en: "ticks", zh: "跳雷次数"})}</b></span></div>
					<div style={{display: "inline-block", width: "24%"}}><span style={headerCellStyle}><b>{localize({en: "total", zh: "总威力"})}</b></span></div>
				</div>
				{thunderTableRows}
				<div style={{
					textAlign: "left",
					position: "relative",
					borderTop: "1px solid " + colors.bgMediumContrast,
				}}>
					<div style={cell(28)}/>
					<div style={cell(10)}>{this.data.thunderTableSummary.cumulativeGap.toFixed(2)}</div>
					<div style={cell(10)}>{this.data.thunderTableSummary.cumulativeOverride.toFixed(2)}</div>
					<div style={cell(20)}/>
					<div style={cell(8)}>{this.data.thunderTableSummary.totalTicks}/{this.data.thunderTableSummary.maxTicks}</div>
					<div style={cell(24)}>
						{this.data.thunderTableSummary.totalPotencyWithoutPot.toFixed(2)}
						{this.data.thunderTableSummary.totalPotPotency>0 ?
							<span style={{color: colors.timeline.potCover}}> +{this.data.thunderTableSummary.totalPotPotency.toFixed(2)}{localize({
								en: " (pot +" + this.data.tinctureBuffPercentage + "%)",
								zh: "(爆发药 +" + this.data.tinctureBuffPercentage + "%)"
							})}</span> : undefined}
					</div>
				</div>
			</div>
		</div>

		return <div>
			{summary}
			<div>
				{mainTable}
				{thunderTable}
			</div>
		</div>
	}
}