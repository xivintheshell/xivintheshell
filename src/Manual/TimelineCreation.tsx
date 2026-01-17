import React from "react";
import { ButtonIndicator } from "../Components/Common";
import { NavH3Section, NavH2Section } from "./Manual";
import { RANDOM_SEED_WIKI_URL } from "./Links";

const bi = (k: string) => <ButtonIndicator text={k} />;

export function TimelineCreationEn() {
	return <>
		<NavH2Section id="timeline-creation" label="Timeline Creation and Editing" />
		<NavH3Section id="setup-config" label="Setup and Configuration" />
		<p>
			The "Config" panel to the right of the skill input area lets you adjust combat
			statistics and other simulation settings.
		</p>
		<p>PLACEHOLDER</p>
		<ol>
			<li>
				<b>Etro/XivGear import</b> Import a gearset from an etro or XivGear link.
			</li>
			<li>
				<b>Job selector</b> Set the job of the active timeline slot. Combat stats will use a
				default value for the job, or the most recently-used configuration for that job.
				Resource overrides are cleared when the job changes.
			</li>
			<li>
				<b>Information area</b> Summarizes the randomly generated offset of Lucid Dreaming
				ticks (healers/casters only), DoT ticks, initial resource overrides, and random
				procs.
			</li>
			<li>
				<b>Level selector and combat stats</b> Adjust the job level and combat stats.
				Critical hit, direct hit, and determination are used to estimate the effects of
				critical hit buffs like SCH's Chain Stratagem and DNC's Devilment, and potency for
				abilities that always crit or crit-direct hit.
			</li>
			<li>
				<b>Animation lock</b> Adjust the amount of time an ability's animation takes,
				preventing you from using other abilities. This should very roughly be 0.6 + 2 ×
				(your ping). Certain abilities, such as movement skills and DRG's jumps, have
				separate animation locks that cannot be configured.
			</li>
			<li>
				<b>FPS</b> Adjust the estimated FPS of your game client. FFXIV only accepts ability
				inputs when a new frame is rendered, which can accumulate over time to create delays
				on GCD actions over the course of a fight. To ignore the effects of FPS, set this
				value to 9999.
			</li>
			<li>
				<b>GCD correction</b> Adjust the duration of GCDs and cast times. This should
				generally be left at 0, but you can use this to shorten or lengthen these durations
				if you believe the FPS correction formula is inaccurate.
			</li>
			<li>
				<b>Time till first MP tick</b> Adjust the amount of time until the first MP tick
				(also known as the "actor tick") occurs, relative to the start of the simulation.
				Mostly relevant only for BLM.
			</li>
			<li>
				<b>Countdown</b> Adjust the amount of time available pre-pull. Setting this to a
				negative value begins the simulation after the fight has begun.
			</li>
			<li>
				<b>Random seed and proc mode</b> A <a href={RANDOM_SEED_WIKI_URL}>random seed</a>{" "}
				used to determine the occurrence of random events, such as RDM's Verstone Ready and
				DNC's Feather gauge. The proc mode setting can be set to "RNG" to use this seed,
				"Never" to prevent all random events from occurring, or "Always" to make random
				events occur whenever possible.
			</li>
		</ol>
		<p>PLACEHOLDER</p>
		<ol start={11}>
			<li>
				<b>Override initial resources</b> Specify the initial values of job gauges, status
				effects, and cooldowns. This is useful for planning specific phases of long fights
				in isolation, or for encounters that allow you to prepare resources in advance.
			</li>
			<li>
				<b>Apply/apply and reset</b> Pressing "apply" confirms any configuration changes,
				applying them to the current timeline. "Apply and reset" applies the configuration
				changes to the current timeline, and clears its previously-saved actions.
			</li>
		</ol>
		<p>PLACEHOLDER</p>
		<p>The "Control" panel contains simulation settings.</p>
		<p>
			When "real-time auto pause" mode is enabled, using an action will simulate its animation
			lock and cast time in real time, pausing when the next action can be performed.
			Adjusting the "time scale" field advances through time more quickly.
		</p>
		<p>
			When "manual" mode is enabled, animation locks and cast times are immediately skipped
			after using an action.
		</p>
		<NavH3Section id="adding-skills" label="Adding Skills, Time Delays, and Waits" />
		<p>PLACEHOLDER</p>
		<p>
			Click on a skill's icon in the hotbar <b>(1)</b> to add it. It will be inserted at the
			location of the cursor in the timeline. If action(s) are currently selected, attempting
			to add a new skill will place it before the selection. Attempting to use a skill will
			automatically wait for the duration of the skill's cooldown, as well as the current
			animation lock and/or GCD before activating it.
		</p>
		<p>
			To configure the number of targets hit by an AoE ability, adjust the "# of targets hit"
			field <b>(2)</b>. This will affect all subsequent AoE ability inputs, and is ignored for
			abilities that can only hit a single target.
		</p>
		<p>
			To wait a specified duration after the end of the current animation lock, use the "wait
			until _ second(s) since" input <b>(3)</b>. This is useful for simulating deliberate
			"late weaves" with a duration of 0.6s-1.0s, depending on your needs.
		</p>
		<p>
			To jump to a specific timestamp in a fight (such as the beginning of a mechanic or the
			end of a downtime phase), use the "Wait until _" input <b>(4)</b>. This input will
			always end at the specified timestamp, even if surrounding skills are rearranged.
		</p>
		<p>
			To wait until the next MP tick or Lucid Dreaming tick, press the "Wait until MP tick /
			lucid tick" button <b>(5)</b>. This will always wait until the next tick occurs, even if
			surrounding skills are rearranged.
		</p>
		<p>
			To delete all wait events at the end of the timeline, use the "Remove trailing idle
			time" button <b>(6)</b>.
		</p>
		<p>
			To remove a buff or debuff before its natural expiration time, click its icon in the
			status section <b>(7)</b>. Ground-based abilities such as BLM's Ley Lines, SCH's Sacred
			Soil, and DRK's Salted Earth, can be temporarily disabled, then later re-enabled, by
			clicking on them here.
		</p>
		<NavH3Section id="positionals" label="Positionals and Auto-Attacks" />
		<p>PLACEHOLDER</p>
		<p>
			Melee jobs have a pair of "Rear Positional" <b>(1)</b> and "Flank Positional" <b>(2)</b>{" "}
			buffs. Abilities with bonuses for landing positional hits will receive bonuses when the
			appropriate buff is active. Click the appropriate buff icon to toggle it. The "True
			North" buff will grant all positional bonuses, overriding the effect of these buffs.
		</p>
		<p>
			Melee and tank jobs have an additional "auto-attacks engaged" buff <b>(3)</b>. This is
			currently only used on PLD to compute Oath Gauge generation, and can be temporarily
			disabled to simulate disengagements. Using a melee-range weaponskill or ability will
			automatically re-enable auto-attacks.
		</p>
		<p>
			Potency computation for auto-attacks is not currently supported, and will be added at a
			later date.
		</p>
		<NavH3Section id="skill-sequence-presets" label="Skill Sequence Presets" />
		<p>PLACEHOLDER</p>
		<p>
			Below the skill input window is the "skill sequence presets" menu. Here, you can add
			sequences of multiple skills that can later be added in bulk to the timeline by clicking
			on the preset entry.
		</p>
		<p>
			Skills that replace other buttons, such as GNB's Gnashing Fang combo + Continuation and
			PCT's Red/Green/Blue combo, will automatically transform into the appropriate action
			when loaded from a preset.
		</p>
		<NavH3Section id="timeline-visualization" label="Timeline Visualization" />
		<p>
			The graphical timeline displays visual information about skill usages and animation
			locks.
		</p>
		<p>PLACEHOLDER</p>
		<ol>
			<li>
				<b>Time ruler</b> Displays timestamp information.
			</li>
			<li>
				<b>Skill icons</b> A skill icon image represents the usage of a skill (image width
				not to scale with animation lock time). Mousing over an icon will display a tooltip
				with its snapshot time, potency, animation lock/cast time, and active damage/haste
				effects.
				<ol>
					<li>
						<b>Cast bars</b> A purple bar represents a cast time, during which other
						abilities cannot be used. The vertical line in the middle of the bar
						represents the cast's snapshot time (also known as the slidecast window).
					</li>
					<li>
						<b>GCD bars</b> A green bar represents a GCD recast lock.
					</li>
					<li>
						<b>Animation lock bars</b> (not visible in screenshot) A grey bar represents
						an animation lock. These are only visible at higher horizontal scale levels,
						or for abilities with exceptionally long animation locks.
					</li>
					<li>
						<b>Buff underlines</b> The colored bars beneath a skill icon summarize the
						haste and amplification buffs that the ability snapshots.
					</li>
				</ol>
			</li>
			<li>
				<b>Damage ticks</b> A red triangle represents the application timing of a damage
				event. Mousing over a damage tick shows its exact timestamp, potency, and
				snapshotted buffs.
			</li>
			<li>
				<b>Heal ticks</b> A green triangle represents the application timing of a heal
				event. Similar to damage events, mousing over a heal tick will show its timestamp
				and potency.
			</li>
			<li>
				<b>MP ticks</b> A vertical blue line in the background of the timeline represents
				the timing of a natural MP tick, also known as the "actor tick." These ticks occur
				every three seconds, and timing of the first tick can be adjusted in the
				configuration panel.
				<ol>
					<li>
						<b>Lucid Dreaming ticks</b> A light blue triangle represents the timing of a
						Lucid Dreaming MP tick. These ticks occur every three seconds (independent
						of the standard actor tick), and the timing of the first tick is randomly
						generated for each timeline.
					</li>
				</ol>
			</li>
			<li>
				<b>Auto-attacks</b> A vertical orange line represents the occurrence of an
				auto-attack. This is currently only used for PLD to determine Oath Gauge generation.
			</li>
		</ol>
		<p>
			If you wish to hide some of these elements, you may do so by unchecking the relevant
			options in the "Settings" tab at the bottom of the page.
		</p>
		<NavH3Section id="editing-timelines" label="Editing Timelines" />
		<p>PLACEHOLDER</p>
		<p>
			Click on a skill icon in the graphical timeline <b>(1)</b> or a row in the "Timeline
			editor" tab <b>(2)</b> to select it. Use {bi("Shift")} + click, or click and drag on the
			background of the graphical timeline to select a sequence of skills. While skill(s) are
			selected, use {bi("Backspace")} or {bi("Delete")} to delete them.
		</p>
		<p>
			When the timeline extends beyond the bounds of the screen, use {bi("Shift")} + scroll
			wheel while your cursor is within the timeline area to scroll through it. You can also
			adjust the "horizontal scale" slider <b>(3)</b> to increase or decrease the number of
			visible skills.
		</p>
		<p>
			While skill(s) in the timeline are selected, click and drag their icons in the graphical
			timeline to rearrange them. While dragging, a blue line will appear indicating the time
			at which the simulator will try to use the skill. Click the "drag lock" setting{" "}
			<b>(4)</b> to toggle this behavior to prevent accidental edits. All editing actions can
			also be undone and redone with {bi("ctrl")}+{bi("z")} and {bi("ctrl")}+{bi("y")},
			respectively. See <a href="#shortcuts">keyboard shortcuts</a> for additional navigation
			shortcuts.
		</p>
		<p>
			Use the "Add timeline slot" button <b>(5)</b> to, you guessed it, add an additional
			timeline. Use the "Clone timeline slot" button <b>(6)</b> to replicate the
			currently-selected timeline. Up to four timelines can be stored at once.
		</p>
		<p>
			Click on the handle next to a timeline to set it as active. Clicking the small "x" at
			the bottom of the active timeline's handle <b>(7)</b> will delete it.
		</p>
		<NavH3Section id="timeline-editor-table" label="The Timeline Editor Table" />
		<p>PLACEHOLDER</p>
		<p>
			The "Timeline editor" tab at the bottom of the page provides a compact view of the
			skills used in the active timeline. Any edits made in this table must be confirmed or
			discarded with the "apply changes to timeline and save" / "discard changes" buttons on
			the right <b>(1)</b>. If edits would cause a timeline to be invalid (that is, its
			activation conditions are no longer met), then the offending skill will be highlighted
			in red, and the first invalid skill will be described in the box to the right of the
			table.
		</p>
		<p>
			Clicking a row in the editor table <b>(2)</b> selects it. Shift + click allows selecting
			a range of rows. Dragging and dropping the selected actions will reorder them.
		</p>
		<p>
			The "move up" and "move down" buttons <b>(3)</b> move the selected actions up or down in
			the timeline. The "delete selected" button <b>(4)</b> deletes selected actions. The
			"move end of selection to start of selection" button <b>(5)</b> moves the last selected
			skill ahead of the first selected skill.
		</p>
		<p>
			"Copy" and "paste" <b>(6)</b> copy or paste selected actions to/from the clipboard.
		</p>
		<p>
			The "undo" and "redo" buttons <b>(7)</b> undo or redo the last timeline manipulation
			action, including those done outside the timeline editor. Undo history is lost upon
			reloading the page.
		</p>
	</>;
}
