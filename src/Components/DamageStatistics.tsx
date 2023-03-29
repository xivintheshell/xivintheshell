import React, {CSSProperties} from 'react'
import {ContentNode, FileFormat, Help, SaveToFile} from "./Common";
import {SkillName} from "../Game/Common";
import {PotencyModifier, PotencyModifierType} from "../Game/Potency";
import {getCurrentThemeColors} from "./ColorTheme";
import {localize, localizeSkillName} from "./Localization";

export type DamageStatsMainTableEntry = {
	skillName: SkillName,
	displayedModifiers: PotencyModifierType[],
	basePotency: number,
	calculationModifiers: PotencyModifier[],
	count: number,
	totalPotencyWithoutPot: number,
	potPotency: number,
	potCount: number
};

export type DamageStatsT3TableEntry = {
	time: number,
	displayedModifiers: PotencyModifierType[],
	baseMainPotency: number,
	baseDotPotency: number,
	calculationModifiers: PotencyModifier[],
	numTicks: number,
	potencyWithoutPot: number,
	potPotency: number
}

export type SelectedStatisticsData = {
	duration: number,
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
	mainTableTotalPotency: {
		withoutPot: number,
		potPotency: number
	}
	t3Table: DamageStatsT3TableEntry[],
	historical: boolean,
	statsCsv: any[][]
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
	} else if (props.tc) {
		text = localize({en: "TC", zh: "雷云"});
		color = colors.resources.thundercloud;
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

function PotencyDisplay(props: {basePotency: number, helpTopic: string, calc: PotencyModifier[]}) {
	let potency = props.basePotency;
	let potencyExplanation = props.basePotency.toFixed(2) + (localize({en: "(base)", zh: "(基础威力)"}) as string);
	props.calc.forEach(m=>{
		potency *= m.factor;
		if (m.factor !== 1) {
			potencyExplanation += " × " + m.factor + "(" + buffName(m.source) + ")"
		}
	});
	return <span>{potency.toFixed(2)} <Help topic={props.helpTopic} content={potencyExplanation}/></span>
}

const rowGap = "0.375em 0.75em";

export class DamageStatistics extends React.Component {
	selected: SelectedStatisticsData = {
		duration: 0,
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
		mainTableTotalPotency: {withoutPot: 0, potPotency: 0},
		t3Table: [],
		historical: false,
		statsCsv: []
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

		//////////////////// Summary ///////////////////////

		const colon = localize({en: ": ", zh: "："}) as string;
		const lparen = localize({en: " (", zh: "（"}) as string;
		const rparen = localize({en: ") ", zh: "）"}) as string;

		let lastDisplay = this.data.lastDamageApplicationTime - this.data.countdown;
		let ppsAvailable = this.data.lastDamageApplicationTime > -this.data.countdown;
		let lastDamageApplicationTimeDisplay = ppsAvailable ? lastDisplay.toFixed(2).toString() : "N/A";
		let potencyStr = localize({en: "Total potency", zh: "总威力"}) as string;
		let selectedPotencyStr = localize({en: "Selected potency", zh: "选中威力"}) as string;
		if (this.data.tinctureBuffPercentage > 0) {
			let s = lparen + (localize({en: "pot +", zh: "爆发药 +"}) as string) + this.data.tinctureBuffPercentage + "%" + rparen;
			potencyStr += s;
			selectedPotencyStr += s;
		}
		potencyStr += colon + this.data.totalPotency.applied.toFixed(2);
		selectedPotencyStr += colon + this.selected.potency.applied.toFixed(2);
		if (this.data.totalPotency.pending > 0) {
			potencyStr += lparen + this.data.totalPotency.pending.toFixed(2) + (localize({en: " pending", zh: "未结算"}) as string) + rparen;
		}
		if (this.selected.potency.pending > 0) {
			selectedPotencyStr += lparen + this.selected.potency.pending.toFixed(2) + (localize({en: " pending", zh: "未结算"}) as string) + rparen;
		}

		let gcdStr = localize({en: "GCD skills", zh: "GCD技能"}) + colon + this.data.gcdSkills.applied;
		let selectedGcdStr = localize({en:"Selected GCD skills", zh:"选中GCD技能"}) + colon + this.selected.gcdSkills.applied;
		if (this.data.gcdSkills.pending > 0) {
			gcdStr += lparen + "+" + this.data.gcdSkills.pending + (localize({en: " not yet applied", zh: "未结算"}) as string) + rparen;
		}
		if (this.selected.gcdSkills.pending > 0) {
			selectedGcdStr += lparen + "+" + this.selected.gcdSkills.pending + (localize({en: " not yet applied", zh: "未结算"}) as string) + rparen;
		}

		let selected: React.ReactNode | undefined = undefined;
		if (this.selected.duration > 0) {
			selected = <div style={{flex: 1}}>
				<div>{localize({en: "Duration (selected)", zh: "选中时长"})}{colon}{this.selected.duration.toFixed(2)}</div>
				<div>{selectedPotencyStr}</div>
				<div>PPS{colon}{(this.selected.potency.applied / this.selected.duration).toFixed(2)}</div>
				<div>{selectedGcdStr}</div>
			</div>
		}

		let summary = <div style={{display: "flex", marginBottom: 10, flexDirection: "row"}}>
			<div style={{flex: 1, color: this.data.historical ? colors.historical : colors.text}}>
				<div>{localize({en: "Last damage application time", zh: "最后伤害结算时间"})}{colon}{lastDamageApplicationTimeDisplay}</div>
				<div>{potencyStr}</div>
				<div>PPS <Help topic={"ppsNotes"} content={
					<div className={"toolTip"}>
						<div className="paragraph">{localize({
							en: "total applied potency divided by last damage application time.",
							zh: "已结算总威力 / 最后伤害结算时间。"
						})}</div>
						<div className="paragraph">{localize({
							en: "could be inaccurate if any damage happens before pull",
							zh: "如果有伤害在0s之前结算，则此PPS不准确"
						})}</div>
					</div>
				}/>{colon}{ppsAvailable ? (this.data.totalPotency.applied / lastDisplay).toFixed(2) : "N/A"}</div>
				<div>{gcdStr}</div>
				<div>
					<SaveToFile fileFormat={FileFormat.Csv} getContentFn={()=>{
						return this.data.statsCsv;
					}} filename={"stats"} displayName={localize({
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

			// skill name node
			let skillNameNode: React.ReactNode | undefined = undefined;
			if (!sameAsLast) {
				skillNameNode = <span>
					{localizeSkillName(props.row.skillName)} {props.row.skillName===SkillName.Thunder3 ?
					<Help topic={"potencyStats-t3"} content={localize({en: "See Thunder 3 table below for details", zh: "详见下方雷3表格"})}/>
					: undefined}
				</span>;
			}

			// potency
			let potencyNode: React.ReactNode | undefined = undefined;
			if (props.row.basePotency > 0 && props.row.skillName !== SkillName.Thunder3) {
				potencyNode = <PotencyDisplay
					basePotency={props.row.basePotency}
					helpTopic={"mainTable-potencyCalc-"+props.key}
					calc={props.row.calculationModifiers}/>;
			}

			// total potency
			let totalPotencyNode: React.ReactNode | undefined = undefined;
			if (props.row.totalPotencyWithoutPot + props.row.potPotency > 0) {
				totalPotencyNode = <span>
					{props.row.totalPotencyWithoutPot.toFixed(2)}
					{props.row.potPotency > 0 ? <span style={{
						color: colors.timeline.potCover
					}}> +{props.row.potPotency.toFixed(2)}({localize({en: "pot", zh: "爆发药"})})({props.row.potCount})</span> : undefined}
				</span>
			}

			return <div key={props.key} style={{
				textAlign: "left",
				position: "relative",
				borderTop: sameAsLast ? "none" : "1px solid " + colors.bgMediumContrast
			}}>
				<div style={cell(20)}>{skillNameNode}</div>
				<div style={cell(15)}>{tags}</div>
				<div style={cell(20)}>{potencyNode}</div>
				<div style={cell(10)}>{props.row.count}</div>
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

		////////////////////// T3 Table ////////////////////////

		let makeT3Row = function(props: {
			row: DamageStatsT3TableEntry,
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

			// potency
			let mainPotencyNode = <PotencyDisplay
				basePotency={props.row.baseMainPotency}
				helpTopic={"t3Table-main-"+props.key}
				calc={props.row.calculationModifiers}/>
			let dotPotencyNode = <PotencyDisplay
				basePotency={props.row.baseDotPotency}
				helpTopic={"t3Table-dot-"+props.key}
				calc={props.row.calculationModifiers}/>

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
				<div style={cell(10)}>{props.row.time.toFixed(2)}</div>
				<div style={cell(15)}>{tags}</div>
				<div style={cell(15)}>{mainPotencyNode}</div>
				<div style={cell(15)}>{dotPotencyNode}</div>
				<div style={cell(10)}>{props.row.numTicks}</div>
				<div style={cell(35)}>{totalPotencyNode}</div>
			</div>
		}

		let t3TableRows: React.ReactNode[] = [];
		for (let i = 0; i < this.data.t3Table.length; i++) {
			t3TableRows.push(makeT3Row({
				row: this.data.t3Table[i],
				key: i
			}));
		}

		//////////////////////////////////////////////////////////

		let headerCellStyle: CSSProperties = {
			display: "inline-block",
			padding: rowGap,
		};
		let mainHeaderStr = localize({en: "Applied Skills", zh: "技能统计"});
		let t3HeaderStr = localize({en: "Thunder 3", zh: "雷3统计"});
		if (this.data.historical) {
			let t = (this.data.time - this.data.countdown).toFixed(2) + "s";
			let upTillStr = lparen + localize({
				en: "up till " + t,
				zh: "截至" + t
			}) + rparen;
			mainHeaderStr += upTillStr;
			t3HeaderStr += upTillStr;
		}
		let mainTable = <div style={{
			position: "relative",
			margin: "0 auto",
			marginBottom: 40,
			maxWidth: 800,
		}}>
			<div style={{...cell(100), ...{textAlign: "center", marginBottom: 10}}}>
				<b style={this.data.historical ? {color: colors.historical}:undefined}>{mainHeaderStr}</b>
			</div>
			<div style={{outline: "1px solid " + colors.bgMediumContrast}}>
				<div>
					<div style={{display: "inline-block", width: "35%"}}><span style={headerCellStyle}><b>{localize({en: "skill", zh: "技能"})}</b></span></div>
					<div style={{display: "inline-block", width: "20%"}}><span style={headerCellStyle}><b>{localize({en: "potency", zh: "单次威力"})}</b></span></div>
					<div style={{display: "inline-block", width: "10%"}}><span style={headerCellStyle}><b>{localize({en: "count", zh: "数量"})}</b></span></div>
					<div style={{display: "inline-block", width: "35%"}}><span style={headerCellStyle}><b>{localize({en: "total", zh: "总威力"})}</b></span></div>
				</div>
				{tableRows}
				<div style={{
					textAlign: "left",
					position: "relative",
					borderTop: "1px solid " + colors.bgMediumContrast
				}}>
					<div style={{display: "inline-block", width: "65%"}}/>
					<div style={{display: "inline-block", width: "35%"}}><span style={headerCellStyle}>
					{this.data.mainTableTotalPotency.withoutPot.toFixed(2)}
						{this.data.mainTableTotalPotency.potPotency>0 ?
							<span style={{color: colors.timeline.potCover}}> +{this.data.mainTableTotalPotency.potPotency.toFixed(2)}{localize({
								en: "(pot +" + this.data.tinctureBuffPercentage + "%)",
								zh: "(爆发药 +" + this.data.tinctureBuffPercentage + "%)"
							})}</span> : undefined}
				</span></div>
				</div>
			</div>
		</div>

		let t3Table = <div style={{
			position: "relative",
			margin: "0 auto",
			marginBottom: 40,
			maxWidth: 800,
		}}>
			<div style={{...cell(100), ...{textAlign: "center", marginBottom: 10}}}>
				<b style={this.data.historical ? {color: colors.historical}:undefined}>{t3HeaderStr}</b>
			</div>
			<div style={{outline: "1px solid " + colors.bgMediumContrast}}>
				<div>
					<div style={{display: "inline-block", width: "25%"}}><span style={headerCellStyle}><b>{localize({en: "time", zh: "时间"})}</b></span></div>
					<div style={{display: "inline-block", width: "15%"}}><span style={headerCellStyle}><b>{localize({en: "initial", zh: "初始威力"})}</b></span></div>
					<div style={{display: "inline-block", width: "15%"}}><span style={headerCellStyle}><b>{localize({en: "DoT potency", zh: "DoT威力"})}</b></span></div>
					<div style={{display: "inline-block", width: "10%"}}><span style={headerCellStyle}><b>{localize({en: "ticks", zh: "跳雷次数"})}</b></span></div>
					<div style={{display: "inline-block", width: "35%"}}><span style={headerCellStyle}><b>{localize({en: "total", zh: "总威力"})}</b></span></div>
				</div>
				{t3TableRows}
			</div>
		</div>

		return <div>
			{summary}
			<div>
				{mainTable}
				{t3Table}
			</div>
		</div>
	}
}