import React from 'react'
import {Expandable, Help} from "./Common";
import {localize} from "./Localization";

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
	}
}

export let updateDamageStats = (data: DamageStatisticsData) => {};

export class DamageStatistics extends React.Component {
	data: DamageStatisticsData = {
		tinctureBuffPercentage: 0,
		countdown: 0,
		totalPotency: {applied: 0, pending: 0},
		lastDamageApplicationTime: 0,
		gcdSkills: {applied: 0, pending: 0},
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

		return <Expandable title={"damageStatistics"} titleNode={localize({en: "Damage statistics", zh: "输出统计"})} content={
			<div>
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
			</div>
		}/>
	}
}