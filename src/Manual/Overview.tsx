import React from "react";
import { ButtonIndicator } from "../Components/Common";
import { NavH3Section, NavH2Section } from "./Manual";

const bi = (k: string) => <ButtonIndicator text={k} />;

const BLOG_1_URL = "https://blog.xivintheshell.com/posts/what-is-xiv-in-the-shell/";
const ETRO_URL = "https://etro.gg/";
const XIVGEAR_URL = "https://xivgear.app/";
const AMA_SIM_URL = "https://github.com/Amarantine-xiv/Amas-FF14-Combat-Sim_source";

export function OverviewEn() {
	return <>
		<NavH2Section
			id="overview"
			label={
				<>
					What is <i>XIV in the Shell</i>?
				</>
			}
		/>
		<p>
			I answered this question in more detail in our <a href={BLOG_1_URL}>first blog post</a>,
			but I’ve copied the important parts here.
		</p>
		<p>
			<b>
				<i>XIV in the Shell</i> is a web-based FFXIV rotation planner and job simulator.
			</b>
		</p>
		<p>
			That’s it! Most high-end raids in FFXIV have very predictable timelines, and the
			mechanics of each fight force players to react differently to maintain a coherent
			rotation. Melees may need to disengage, casters may need to save resources for extended
			movement, and parties may adjust buff window timings in unconventional ways. Our tool
			lets you compare a DPS timeline against a fight's mechanic timeline and party buff
			windows, and makes precise planning accessible in a way that traditional
			spreadsheet-based tools do not.
		</p>
		<p>
			Making rotational adaptations on the fly is a valuable skill for raiders to have, but
			planning while outside instance is useful all the same. Even outside hardcore
			optimization environments, there are a myriad of reasons to create rotation plans for a
			fight:
		</p>
		<ul>
			<li>Theorycrafting sequences for your job</li>
			<li>Getting more comfortable in fights you haven't yet cleared</li>
			<li>Getting more comfortable in fights you've already cleared</li>
			<li>Improving your understanding of a job's fundamentals</li>
			<li>Moving the colored number on your FFLogs profile up</li>
		</ul>
		<p>
			Rotation planning can also just be plain fun for its own sake. The interaction between
			fight mechanics and job kits is a challenging puzzle to solve, and discovering creative
			solutions then executing them well in-game is a uniquely rewarding experience.
		</p>
		<NavH3Section id="features" label="Features" />
		<p>
			<i>XIV in the Shell</i> provides the following capabilities:
		</p>
		<ul>
			<li>Rotation visualization in both a graphical timeline and spreadsheet-like table</li>
			<li>Full simulation of cooldowns, buffs, MP, and job gauge resources</li>
			<li>Customizable starting resources for planning specific phases</li>
			<li>
				Combat stat configuration and import from <a href={ETRO_URL}>etro</a>/
				<a href={XIVGEAR_URL}>XivGear</a>
			</li>
			<li>Rotation import from FFLogs</li>
			<li>Preset fight timelines for most high-end difficulty encounters</li>
			<li>Rotations and fight markers shareable as text files</li>
			<li>Customizable buff timings and timeline markers</li>
			<li>Customizable macros for sequences of multiple skills</li>
			<li>Potency calculation with party buffs and potion usage</li>
			<li>
				Compatibility with <a href={AMA_SIM_URL}>Amarantine's combat simulator</a> for more
				advanced DPS simulation
			</li>
			<li>Import/export from plain text, spreadsheets, and Discord emotes</li>
		</ul>
		<NavH3Section id="quickstart" label="Quick Start" />
		<p>To get started with making a timeline:</p>
		<ol>
			<li>
				Choose your job and combat stats from the "config" panel to the right of the skill
				hotbar, then click "apply and reset."
			</li>
			<p>
				[optional] Load fight markers for a specific encounter from the "Timeline markers"
				tab at the bottom of the page.
			</p>
			<li>
				Input skills by clicking on their icon in the skill hotbar. The simulation will
				automatically advance to the end of its animation lock or cast time. Clicking a
				skill will attempt to use it as soon as its cooldown and the current animation
				lock/GCD timer allows.
			</li>
			<li>
				Rearrange skills by clicking/dragging in the graphical timeline, and hit{" "}
				{bi("Delete")} to remove selected skills.
			</li>
			<p>
				For more details on how to use or configure specific features, please refer to the
				corresponding section in the navigation bar on the right.
			</p>
		</ol>
		<NavH3Section id="shortcuts" label="Keyboard Shortcuts" />
		<p>
			The following keyboard shortcuts are available anywhere on the site, except when editing
			a text/number input field (replace {bi("ctrl")} with {bi("cmd")} for Mac users):
		</p>
		<ul>
			<li>{bi("u")} Delete the last action in the active timeline.</li>
			<li>
				{bi("ctrl")}+{bi("z")} Undo last action.
			</li>
			<li>
				{bi("ctrl")}+{bi("y")} OR {bi("ctrl")}+{bi("shift")}+{bi("z")} Redo last action.
			</li>
			<li>
				{bi("ctrl")}+{bi("c")} Copy selected skills to clipboard. The format can be changed
				in the Settings tab at the bottom of the page.
			</li>
			<li>
				{bi("ctrl")}+{bi("x")} Cut selected skills to clipboard.
			</li>
			<li>
				{bi("ctrl")}+{bi("v")} Paste skills from the clipboard.
			</li>
		</ul>
		<ul>
			<p>
				The following shortcuts are available when interacting with the graphical timeline
				and the "Timeline editor" table:
			</p>
			<li>{bi("Arrow")} keys will be replaced by emojis on the website.</li>
			<li>
				{bi("Backspace")} OR {bi("Delete")} Delete the selected skills from the timeline.
				Subsequent actions are rearranged to be used as soon as possible.
			</li>
			<li>
				{bi("ArrowUp")} Select the previous action in the timeline. If no actions are
				currently selected, select the last action in the timeline.
			</li>
			<li>
				{bi("ArrowDown")} Select the next action in the timeline. If no actions are
				currently selected, select the first action in the timeline.
			</li>
			<li>{bi("Home")} Select the first action in the timeline.</li>
			<li>{bi("End")} Select the last action in the timeline.</li>
			<li>
				{bi("Shift")}+{bi("ArrowUp")} / {bi("Shift")}+{bi("ArrowDown")} / {bi("Shift")}+
				{bi("Home")} / {bi("Shift")}+{bi("End")} Extend the selection window to the
				previous/next/first/last action.
			</li>
			<li>{bi("Escape")} Deselect all actions.</li>
			<li>
				{bi("ctrl")}+{bi("a")} Select all actions.
			</li>
		</ul>
		<NavH3Section id="update-policy" label="Update Policy" />
		<NavH3Section id="technical-details" label="Quick Technical Details" />
		<NavH3Section id="troubleshooting" label="Troubleshooting" />
	</>;
}
