import React, {CSSProperties} from 'react'
import {ContentNode, Help} from "./Common";
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

export type DamageStatisticsData = {
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
}

export let updateDamageStats = (data: DamageStatisticsData) => {};

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

function BuffTag(props: {buff: PotencyModifierType}) {
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
		padding: "1px 4px",
		background: color + "1f"
	}}><b style={{color: color}}>{text}</b></span>
}

const rowGap = "0.375em 0.75em";

export class DamageStatistics extends React.Component {
	data: DamageStatisticsData = {
		tinctureBuffPercentage: 0,
		countdown: 0,
		totalPotency: {applied: 0, pending: 0},
		lastDamageApplicationTime: 0,
		gcdSkills: {applied: 0, pending: 0},
		mainTable: [],
		mainTableTotalPotency: {withoutPot: 0, potPotency: 0}
	};

	constructor(props: {}) {
		super(props);
		updateDamageStats = ((data: DamageStatisticsData) => {
			this.data = data;
			this.forceUpdate();
		}).bind(this);
	}

	componentWillUnmount() {
		updateDamageStats = (data: DamageStatisticsData) => {}
	}

	render() {
		let lastDisplay = this.data.lastDamageApplicationTime - this.data.countdown;
		let ppsAvailable = this.data.lastDamageApplicationTime > -this.data.countdown;
		let lastDamageApplicationTimeDisplay = ppsAvailable ? lastDisplay.toFixed(2).toString() : "N/A";
		let potencyStr = "Total potency";
		if (this.data.tinctureBuffPercentage > 0) {
			potencyStr += " (pot +" + this.data.tinctureBuffPercentage + "%)";
		}
		potencyStr += ": " + this.data.totalPotency.applied.toFixed(2);
		if (this.data.totalPotency.pending > 0) {
			potencyStr += " (" + this.data.totalPotency.pending.toFixed(2) + " pending)";
		}

		let gcdStr = "GCD skills: " + this.data.gcdSkills.applied;
		if (this.data.gcdSkills.pending > 0) {
			gcdStr += " (+" + this.data.gcdSkills.pending + " not yet applied)";
		}

		let summary = <div style={{marginBottom: 10}}>
			<span>Last damage application time: {lastDamageApplicationTimeDisplay}</span><br/>
			<span>{potencyStr}</span><br/>
			<span>PPS <Help topic={"ppsNotes"} content={
				<div className={"toolTip"}>
					<div className="paragraph">
						total applied potency divided by last damage application time since pull (0s).
					</div>
					<div className="paragraph">
						could be inaccurate if any damage happens before pull
					</div>
				</div>
			}/>: {ppsAvailable ? (this.data.totalPotency.applied / lastDisplay).toFixed(2) : "N/A"}</span><br/>
			<span>{gcdStr}</span>
		</div>;

		let colors = getCurrentThemeColors();

		let makeRow = function(props: {
			lastRowSkill?: SkillName,
			row: DamageStatsMainTableEntry,
			key: number
		}) {
			const sameAsLast = props.row.skillName === props.lastRowSkill;

			const style: CSSProperties = {
				padding:  rowGap,
				display: "inline-block"
			};

			let w = function(widthPercentage: number): CSSProperties {
				return {
					display: "inline-block",
					width: widthPercentage + "%"
				};
			}
			let tags: React.ReactNode[] = [];
			for (let i = 0; i < props.row.displayedModifiers.length; i++) {
				tags.push(<BuffTag key={i} buff={props.row.displayedModifiers[i]}/>);
			}

			// skill name node
			let skillNameNode: React.ReactNode | undefined = undefined;
			if (!sameAsLast) {
				skillNameNode = <span style={style}>
					{localizeSkillName(props.row.skillName)} {props.row.skillName===SkillName.Thunder3 ?
					<Help topic={"potencyStats-t3"} content={localize({en: "See Thunder 3 table below for details", zh: "详见下方雷3表格"})}/>
					: undefined}
				</span>;
			}

			// potency
			let potency = props.row.basePotency;
			let potencyExplanation = props.row.basePotency + (localize({en: "(base)", zh: "(基础威力)"}) as string);
			props.row.calculationModifiers.forEach(m=>{
				potency *= m.factor;
				if (m.factor !== 1) {
					potencyExplanation += " × " + m.factor + "(" + buffName(m.source) + ")"
				}
			});
			let potencyNode: React.ReactNode | undefined = undefined;
			if (potency > 0 && props.row.skillName !== SkillName.Thunder3) {
				potencyNode = <span style={style}>{potency.toFixed(2)} <Help topic={"potencyCalc-"+props.key} content={potencyExplanation}/></span>
			}

			// total potency
			let totalPotencyNode: React.ReactNode | undefined = undefined;
			if (props.row.totalPotencyWithoutPot + props.row.potPotency > 0) {
				totalPotencyNode = <span style={style}>
					{props.row.totalPotencyWithoutPot.toFixed(2)}
					{props.row.potPotency > 0 ? <span style={{
						color: colors.timeline.potCover
					}}> +{props.row.potPotency.toFixed(2)}({localize({en: "pot", zh: "爆发药"})})({props.row.potCount})</span> : undefined}
				</span>
			}

			return <div key={props.key} style={{
				textAlign: "left",
				position: "relative",
				borderTop: sameAsLast ? "none" : "1px solid " + colors.bgMediumContrast}}>
				<div style={w(20)}>{skillNameNode}</div>
				<div style={w(15)}><span style={style}>{tags}</span></div>
				<div style={w(22)}>{potencyNode}</div>
				<div style={w(8)}><span style={style}>{props.row.count}</span></div>
				<div style={w(35)}>{totalPotencyNode}</div>
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

		let headerCellStyle: CSSProperties = {
			display: "inline-block",
			padding: rowGap,
		};
		let mainTable = <div style={{
			position: "relative",
			margin: "0 auto",
			marginBottom: 40,
			maxWidth: 800,
			outline: "1px solid " + colors.bgMediumContrast
		}}>
			<div>
				<div style={{display: "inline-block", width: "35%"}}><span style={headerCellStyle}><b>skill</b></span></div>
				<div style={{display: "inline-block", width: "22%"}}><span style={headerCellStyle}><b>potency</b></span></div>
				<div style={{display: "inline-block", width: "8%"}}><span style={headerCellStyle}><b>count</b></span></div>
				<div style={{display: "inline-block", width: "35%"}}><span style={headerCellStyle}><b>total</b></span></div>
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

		let t3Table = <div style={{
			position: "relative",
			margin: "0 auto",
			marginBottom: 40,
			maxWidth: 800,
			outline: "1px solid " + colors.bgMediumContrast
		}}>
			<div>
				<div style={{display: "inline-block", width: "8%"}}><span style={headerCellStyle}><b>time</b></span></div>
				<div style={{display: "inline-block", width: "22%"}}><span style={headerCellStyle}><b>initial potency</b></span></div>
				<div style={{display: "inline-block", width: "22%"}}><span style={headerCellStyle}><b>DoT potency</b></span></div>
				<div style={{display: "inline-block", width: "13%"}}><span style={headerCellStyle}><b>ticks</b></span></div>
				<div style={{display: "inline-block", width: "35%"}}><span style={headerCellStyle}><b>total</b></span></div>
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