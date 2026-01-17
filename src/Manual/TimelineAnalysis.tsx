import React, { useRef } from "react";
import { NavH3Section, NavH2Section } from "./Manual";
import { Help } from "../Components/Common";
import { localize } from "../Components/Localization";

export function TimelineAnalysisEn() {
	const helpAnchor = useRef<HTMLLIElement | null>(null);
	return <>
		<NavH2Section id="timeline-analysis" label="Timeline Analysis" />
		<NavH3Section id="damage-table" label="Potency, PPS, and the Damage Table" />
		<p>PLACEHOLDER</p>
		<ol>
			<li>
				<b>Summary statistics</b> The top section summarizes the total potency, potency per
				second (PPS), number of GCD skills applied, and damage over time (DoT) coverage for
				the current timeline. When a skill or sequence of skills is selected, these values
				are updated to reflect the selected range.
				<ul>
					<li>
						If an ability has been used but its damage application delay has not yet
						passed in the simulation, its potency will be described as "pending." To
						include it in the total potency and PPS calculations, add a "wait" event at
						the end of your timeline, or use an additional skill.
					</li>
					<li>
						PPS is calculated as damage applied starting from time 0 until the end of
						the final recorded damage application event. This differs from convention
						for many jobs, which may calculate time from the start of the first GCD
						until the end of the cast/recast time of the final GCD.
					</li>
					<li>
						Potencies are calculated from the values given in ability tooltips,
						accounting for bonuses from active status buffs (such as DNC's Technical
						Step and DRG's Lance Charge + Battle Litany) and job gauge buffs (such as
						BLM's Enochian and DRG's Life of the Dragon). Because of differences in
						damage calculation multipliers and other combat stats, potencies in
						timelines of different jobs (or the same job with different GCD speeds)
						generally cannot be meaningfully compared with each other without the aid of
						external potency-to-damage conversion tools.
					</li>
				</ul>
			</li>
			<li>
				<b>Tincture potency configuration</b> Potions/tinctures/gemdraughts increase the
				strength of damaging actions by temporarily boosting the character's main combat
				stat (STR/DEX/MND/INT). Because <i>XIV in the Shell</i> simulates only potencies
				rather than calculating the full damage formula, we approximate tinctures as an 8%
				buff to skill potencies. If you need a different approximation value, you may
				configure it here.
			</li>
			<li>
				<b>Exclude damage when untargetable</b> When checked, damage application events and
				DoT ticks that occur during an "Untargetable" marker are automatically excluded from
				calculations.
			</li>
			<li ref={helpAnchor}>
				<b>Potency table</b> Displays the number of times each ability was cast under
				different sets of self-applied buffs. Hovering the{" "}
				<Help
					topic="manual-sample-help"
					content={localize({
						en: "sample help",
						zh: "我是一个说明",
					})}
					container={helpAnchor}
				/>{" "}
				tooltip next to a potency value displays the effect of each buff on a skill's
				potency. When a skill or sequence of skills is selected, these values are updated to
				reflect the selected range.
				<ul>
					<li>
						The effect of party buffs added through markers, as well as estimated
						potency boosts from tinctures, are not visible in this breakdown, and only
						appear in the purple value in the "total" column.
					</li>
				</ul>
			</li>
		</ol>
		<NavH3Section id="dot-breakdown" label="DoT Breakdown" />
		<p>PLACEHOLDER</p>
		<p>
			Every used DoT ability has a separate table detailing the timing of its usage. The
			offset at which DoT effects tick is randomly generated for each timeline.
		</p>
		<ol>
			<li>
				<b>Cast time and application time</b> The snapshot of the ability, and the time at
				which the DoT effect was applied.
			</li>
			<li>
				<b>Gap and override</b> The gap (duration where the DoT debuff was not applied) and
				override (duration remaining on the previous DoT debuff) for this application of the
				DoT. The total gap and override are displayed at the bottom of this column.
			</li>
			<li>
				<b>Initial and DoT</b> The on-hit and per-tick potencies of the DoT, including the
				effect of self-applied buffs.
			</li>
			<li>
				<b>Ticks</b> The number of ticks triggered from this DoT application. The total
				number of hit ticks and the total possible number of ticks, are displayed at the
				bottom of this column.
			</li>
			<li>
				<b>Total</b> The total potency from this DoT application, including both the initial
				hit and subsequent ticks. Similar to the general potency table, the effects of party
				buff markers and tinctures are displayed here.
			</li>
		</ol>
		<p>
			Jobs that attack with summoned pets (DRK's Living Shadow, MCH's Automaton Queen, and
			SMN's Demi-summons) also have potencies displayed in a DoT table. The per-tick "DoT"
			column for pets is unreliable, but the total potency column and buff snapshots are
			correct. This will be updated to be clearer some time in the future.
		</p>
	</>;
}
