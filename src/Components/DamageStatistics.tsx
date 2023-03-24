import React from 'react'
import {controller} from "../Controller/Controller";
import {Expandable} from "./Common";
import {localize} from "./Localization";

export let updateDamageStats = () => {};

export class DamageStatistics extends React.Component {
	constructor(props: {}) {
		super(props);
		updateDamageStats = (() => {
			this.calculateTableEntries();
			this.forceUpdate();
		}).bind(this);
	}
	calculateTableEntries() {
		// todo
	}
	render() {
		return <Expandable title={"damageStatistics"} titleNode={localize({en: "Damage statistics", zh: "输出统计"})} content={
			<div>placeholder</div>
		}/>
	}
}