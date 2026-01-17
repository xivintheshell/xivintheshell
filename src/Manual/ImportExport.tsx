import React from "react";
import { ButtonIndicator } from "../Components/Common";
import { NavH3Section, NavH2Section } from "./Manual";
import { TISCHEL_PLUGIN_URL, AMA_SIM_URL } from "./Links";

const bi = (k: string) => <ButtonIndicator text={k} />;

export function ImportExportEn() {
	return <>
		<NavH2Section id="import-export" label="Import and Export" />
		<NavH3Section id="exporting-text" label="Exporting to a Text File" />
		<p>PLACEHOLDER</p>
		<p>
			You can download the active timeline as a text file from the "Import/Export" menu, by
			clicking the "txt format" link <b>(1)</b>. This file can then be shared and imported
			through the "Load from file" menu <b>(2)</b>. We recommend you export your plans
			frequently to avoid accidentally losing progress.
		</p>
		<NavH3Section id="importing-fflogs" label="Importing From FFLogs" />
		<p>
			Fight plans can be imported directly from FFLogs reports from the "Import fight from
			FFLogs" menu. This will open a dialog to begin the first step of the log import process.
		</p>
		<p>PLACEHOLDER</p>
		<ol>
			<li>
				Click the button to allow <i>XIV in the Shell</i> to read FFLogs reports on your
				behalf.
			</li>
		</ol>
		<p>PLACEHOLDER</p>
		<ol start={2}>
			<li>
				Paste a log report URL. The link may contain a full report, a specific fight number,
				and/or a specific player number.
			</li>
		</ol>
		<p>PLACEHOLDER</p>
		<ol start={1}>
			<li>
				If the URL did not specify a single fight, click the desired pull from the list of
				fights.
			</li>
		</ol>
		<p>PLACEHOLDER</p>
		<ol start={2}>
			<li>
				After choosing a specific fight and a player was not specified in the URL, click the
				desired player name from the list of players.
			</li>
		</ol>
		<p>PLACEHOLDER</p>
		<ol start={3}>
			<li>
				Enter the combat stats of the selected player. Due to limitations with FFLogs, all
				stats for players other than the creator of the log must be entered manually or
				estimated, and will use the values of the most recently-created timeline for that
				job by default.
			</li>
		</ol>
		<p>PLACEHOLDER</p>
		<ol start={4}>
			<li>
				After pressing "go," <i>XIV in the Shell</i> will import the list of actions from
				the log to the active timeline slot, automatically inserting "wait" and "delay"
				events as appropriate. You will see a table summarizing the differences between
				simulated timestamps and those recorded in the log, as well as a list of actions
				that the simulation believes did not meet their activation requirements. After
				closing the dialog, you may edit the configuration and timeline actions as needed to
				make the timeline valid.
			</li>
		</ol>
		<NavH3Section id="text-copy-paste" label="Text Copy/Paste" />
		<p>
			<i>XIV in the Shell</i> allows copy/pasting sequences of actions with {bi("ctrl")}+
			{bi("c")} and {bi("ctrl")}+{bi("v")}. Three different formats are supported:
		</p>
		<p>
			<i>Example sequence: Fire III, Fire IV, Despair</i>
		</p>
		<p>PLACEHOLDER</p>
		<ul>
			<li>
				<b>Plain text</b> A comma-separated list of actions names.
				<p>
					<i>Example:</i>
				</p>
				<p>Fire 3, Fire 4, Despair</p>
			</li>
			<li>
				<b>Tab-separated lines</b> A tab-separated list of usage timestamps, target counts,
				and skill names, compatible with external spreadsheet applications.
				<p>
					<i>Example:</i>
				</p>
				<p>
					{/* TODO format properly */}
					-3.500 1 Fire 3
					<br />
					0.042 1 Fire 4
					<br />
					2.500 1 Despair
				</p>
			</li>
			<li>
				<b>Discord emotes</b> A sequence of Discord emotes (only verified for BLM and PCT).
				<p>
					<i>Example:</i>
				</p>
				<p>:F3: :F4: :Despair:</p>
			</li>
		</ul>
		<p>
			The format copied to the clipboard from <i>XIV in the Shell</i> is determined by the
			"Clipboard copy mode" found in the "Settings" tab at the bottom of the page. Pasting
			from any of these three formats is always valid, regardless of the value of this
			setting.
		</p>
		<NavH3Section id="exporting-images" label="Exporting an Image" />
		<p>PLACEHOLDER</p>
		<p>
			Besides using your computer's built-in screenshot functionality, you may also use{" "}
			<i>XIV in the Shell</i>'s "Image Export" feature to download a timeline as a PNG image.
		</p>
		<p>
			To export the selected portion of a timeline as an image, press the "export selection as
			png" link <b>(1)</b>. If no actions are selected, the entirety of the active timeline is
			selected.
		</p>
		<p>
			To split the exported image across multiple lines, set the "seconds before wrapping"
			field <b>(2)</b> to a non-zero value. Each row in the image will contain at most the
			specified number of seconds.
		</p>
		<p>
			To omit the time ruler and fight markers from export, uncheck the "include time and
			markers" setting. Timeline elements in the export are also affected by the display
			settings configured in the "Settings" tab.
		</p>
		<NavH3Section id="exporting-damage-logs" label="Exporting Damage Logs" />
		<p>PLACEHOLDER</p>
		<p>
			You can export a detailed log of all damage events by clicking the "downloaded detailed
			damage log as CSV file" button <b>(1)</b> above the site's potency summary table. The
			output contains 3 columns:
		</p>
		<ul>
			<li>
				<b>time</b> The decimal timestamp, in seconds, at which the damage event occurred.
			</li>
			<li>
				<b>damageSource</b> The name and usage time of the ability that caused this damage
				event.
			</li>
			<li>
				<b>potency</b> The total potency (including buffs and modifiers) of this damage
				event.
			</li>
		</ul>
		<NavH3Section id="exporting-for-external-tools" label="Exporting for External Tools" />
		<p>PLACEHOLDER</p>
		<p>
			Use the "excel / Tischel's plugin csv format" download link <b>(1)</b> to generate a
			file compatible with external tools, like spreadsheet software or Tischel's{" "}
			<a href={TISCHEL_PLUGIN_URL}>BLM in the Shell Plugin</a>. The exported CSV will contain
			the following columns:
		</p>
		<ul>
			<li>
				<b>time</b> The decimal timestamp, in seconds, at which the action was used.
			</li>
			<li>
				<b>action</b> The name of the action used.
			</li>
			<li>
				<b>isGCD</b> 1 if the action is a GCD ability, 0 if not.
			</li>
			<li>
				<b>castTime</b> The duration, in seconds, of this action's cast time. 0 If the
				action did not have a cast time.
			</li>
		</ul>
		<NavH3Section
			id="exporting-for-combat-sim"
			label="Exporting to Amarantine's Combat Simulator"
		/>
		<p>PLACEHOLDER</p>
		<p>
			<a href={AMA_SIM_URL}>Amarantine's Combat Simulator</a> provides powerful DPS simulation
			and kill time estimation capabilities. <i>XIV in the Shell</i> can be used to generate
			and edit timelines that are compatible with this simulator, and both tools are used by
			many speedkill teams as part of their planning process.
		</p>
		<p>
			To download a CSV file compatible with Ama's Combat Sim, use the "Amarantine's combat
			simulator csv format" download link <b>(2)</b>. The generated CSV file will also contain
			metadata headers describing the configured combat stats, external party buff timeline
			markers, and untargetable downtime windows.
		</p>
		<p>
			Note that if the configured combat stats were originally imported from XivGear or etro,
			stats in the gearset that cannot be directly configured within <i>XIV in the Shell</i>{" "}
			(WD, STR/DEX/MND/INT, and TEN) will also be included in the export file for simulation
			purposes.
		</p>
	</>;
}
