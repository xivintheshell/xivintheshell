import React from "react";
import { NavH3Section, NavH2Section } from "./Manual";
import {
	TRACK_SCRIPT_URL,
	CREATING_TRACKS_URL,
	TRACK_SCRIPT_COLAB_NOTEBOOK_URL,
	MARKER_GEN_URL,
} from "./Links";

export function FightMarkersEn() {
	return <>
		<NavH2Section id="fight-markers" label="Fight and Buff Markers" />
		<NavH3Section id="loading-presets" label="Loading Preset Fight Markers" />
		<p>PLACEHOLDER</p>
		<p>
			<i>XIV in the Shell</i> provides preset timeline markers for on-content savage and
			ultimate fights, as well as a variety of other high-end content. These tracks are
			created by developers and community members, and illustrate precise timings for
			mechanics, downtimes, and incoming damage.
		</p>
		<p>
			Clicking the button with the name of a fight <b>(1)</b> adds its markers to the
			graphical timeline. Clicking the name of tracks for certain fights with phases{" "}
			<b>(2)</b> may also have separate tracks for each phase, explained in more detail in the
			next section.
		</p>
		<p>Presets are split into three categories:</p>
		<ul>
			<li>
				<b>Current content</b> The most recent tier of Savage-difficulty raid encounters,
				along with the current expansion's Ultimate encounters. This may also contain tracks
				for certain other high-end content, including Extreme trials, Criterion dungeons,
				and Quantum bosses.
			</li>
			<li>
				<b>Legacy ultimates</b> Full encounters or select phases of Ultimate encounters from
				previous expansions.
			</li>
			<li>
				<b>Archive</b> Older Savage tiers and other encounters from previous expansions.
			</li>
		</ul>
		<p>
			To load tracks beginning from a certain timestamp, adjust the value in the "Load tracks
			with time offset" field <b>(3)</b>, which adds the specified difference in seconds to
			all markers (for example, a value of 4 would delay all markers by 4 seconds, and a value
			of -4 would move all markers forward by 4 seconds). This offset is applied on top of
			individual phase offsets.
		</p>
		<p>
			Use the "clear all markers" button <b>(4)</b> to clear all markers. Use "remove
			duplicates" <b>(5)</b> to remove all extra copies of identical markers (same text,
			timestamp, track number, etc.), which may occur if a fight preset is loaded multiple
			times by mistake.
		</p>
		<NavH3Section
			id="loading-presets-phases"
			label="Loading Preset Markers for Fights With Phases"
		/>
		<p>PLACEHOLDER</p>
		<p>
			If a preset track supports separate phases, click its name <b>(1)</b> to expand/collapse
			timing information for its phases.
		</p>
		<p>
			The "Load all phases" button <b>(2)</b> loads markers for all phases. The default
			timestamp for the start of a phase is shown next to each field <b>(3)</b>. These should
			be adjusted to account for different kill or push timings. Clicking the name of a
			particular phase <b>(5)</b> loads that phase's markers to the timeline; to create a
			timeline beginning from the start of a particular phase, set its offset to 0 before
			loading.
		</p>
		<p>
			The default phase transition timings in presets usually assume the previous phase lasted
			as long as possible. The beginning of a phase follows the definition provided by FFLogs,
			which is either the end of a "Down for the Count" debuff, or a boss becoming targetable.
			You can find these timings for a particular FFLogs report with the
			`type="targetabilityupdate"` filter, as shown below.
		</p>
		<p>PLACEHOLDER</p>
		<p>
			Presets take time to create, and the languages in which they are available depend on the
			work of the community members that create them. If you're interested in submitting
			markers for a fight, please reach out to us!
		</p>
		<NavH3Section id="adding-custom-markers" label="Adding Party Buffs and Custom Markers" />
		<p>PLACEHOLDER</p>
		<p>
			In addition to the site's built-in presets, you can add your own markers in the "Add
			buffs/markers" section <b>(1)</b>. Markers are split into three distinct categories:
		</p>
		<ul>
			<li>
				<b>Info</b> markers represent generic information about a timeline. This includes
				events like enemy cast bars, boss movements, and mechanic resolution timings.
			</li>
			<li>
				<b>Buff</b> markers represent raid buffs granted by party members. All buffs will
				automatically use their default in-game durations (which can be adjusted to account
				for edge cases like varying propagation timings or Dance Partner swaps), and their
				potency boosts are automatically applied to the damage table. You can see which
				abilities snapshot party buffs and self-applied buffs by a colored underline in the
				graphical timeline, or by hovering the skill image icon.
			</li>
			<li>
				<b>Untargetable</b> markers represent periods of time where all enemies are immune
				to damage, and cannot be targeted. Damage application events that would "ghost" by a
				boss becoming untargetable and DoT ticks that occur during an untargetable period
				are not added to potency totals.
			</li>
		</ul>
		<p>
			Each marker has a track number <b>(2)</b> that determines where it is visible in the
			timeline, where 0 is the bottom-most marker line, and increasing numbers stack on the
			lines above.
		</p>
		<p>
			Clicking on a marker in the timeline <b>(3)</b> will remove it, and restore its
			properties to the "Add buffs/markers" menu for further editing.
		</p>
		<NavH3Section id="exporting-markers" label="Exporting Markers" />
		<p>PLACEHOLDER</p>
		<p>
			Marker tracks can be exported and shared with other users in the "Save marker tracks to
			file" menu <b>(1)</b>. Click the "all tracks combined" link <b>(2)</b> to download a
			single file containing all markers, which can then be imported through the "Load
			multiple tracks combined" option <b>(3)</b>. Clicking a link corresponding to a single
			track <b>(4)</b> will export all markers with that track number, which can then be
			imported with the "Load into individual track" option <b>(5)</b>.
		</p>
		<NavH3Section id="creating-markers-from-logs" label="Creating Marker Tracks From Logs" />
		<p>
			A single encounter can have a very large number of events that you may wish to encode
			within a marker track file. In these cases, you will most likely find it easier to
			produce markers in bulk from an FFLogs report.
		</p>
		<p>
			<i>XIV in the Shell</i> developers use a custom{" "}
			<a href={TRACK_SCRIPT_URL}>Python script</a> to generate track files from CSV files
			exported from FFLogs. See <a href={CREATING_TRACKS_URL}>this page</a> for detailed usage
			instructions. If you're unwilling or unable to run the Python script on your own
			computer, you may also run it directly in your web browser through our{" "}
			<a href={TRACK_SCRIPT_COLAB_NOTEBOOK_URL}>Colab notebook</a>.
		</p>
		<p>
			To retrieve markers directly from a report using the FFLogs API, you may also use
			leifengsang's <a href={MARKER_GEN_URL}>XivInTheShellMarkerGen</a> Python script
			(instructions in Chinese). This script reads a user-provided configuration file with
			names of enemy cast and damage events, and produces a track file directly from a report
			ID.
		</p>
	</>;
}
