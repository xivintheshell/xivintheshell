import React, {CSSProperties} from 'react';
import {Expandable, Help, ButtonIndicator} from "./Common";
import {DebugOptions} from "./DebugOptions";
import changelog from "../changelog.json"

function Changelog() {
	return <div className={"paragraph"}><Expandable title={"Changelog"} defaultShow={false} content={
		<div>
			{
				changelog.map(entry => {
					let changes: JSX.Element[] = [];
					for (let i = 0; i < entry.changes.length; i++) {
						changes.push(<div key={i}>{entry.changes[i]}</div>);
					}
					return <div className={"paragraph"} key={entry.date}>
						{entry.date}<br/>
						{changes}
					</div>
				})
			}
		</div>
	}/></div>
}

export function IntroSection(props: {}) {
	let smallGap: CSSProperties = { marginBottom: 5 };
	return <div>
		<Expandable
			defaultShow={true}
			title={"instructions"}
			titleNode={<span>{"Instructions "}
				<Help topic={"expandable"} content={"click me to expand or collapse"}/></span>}
			content={<div>
				<div className="paragraph">
					<b>General usage</b>
				</div>
				<ul>
					<li style={smallGap}>Set your stats in <b>Config/Edit</b> on the right, then <ButtonIndicator text={"apply and reset"}/></li>
					<li style={smallGap}>Click on a skill to use it. If it's not ready yet, click on it again will wait and retry.</li>
					<li style={smallGap}>Press <ButtonIndicator text={"u"}/> to delete the last added action (effective when not running in real-time).</li>
					<li style={smallGap}>Click on a buff applied to self to remove it. Unless it's ley lines, in which case it can be re-enabled.</li>
				</ul>
				<div className="paragraph">
					<b>Timeline</b>
				</div>
				<ul>
					<li style={smallGap}>Click to select a skill on the timeline. Shift click to select a sequence of skills</li>
					<li style={smallGap}><ButtonIndicator text={"backspace"}/> to delete the selected skill and everything after it</li>
					<li style={smallGap}>Click on the timeline's ruler-like header to view historical game states.
						While doing so, the main control region will have an <b style={{color: "darkorange"}}>orange</b> border
						and you will not be able to use skills. Click on somewhere else on the timeline to cancel.
					</li>
				</ul>
				<div className={"paragraph"}>
					<span style={{color: "darkolivegreen", cursor: "pointer"}}><u>[these]</u></span> are file download links. Click to download, or right click to choose save location.
				</div>
				<div className="paragraph">
					Most edits are automatically saved in your browser cache, so it's generally okay to refresh the page
					and
					not worry about losing progress.
				</div>
				<div className="paragraph">Hover over <Help topic={"sampleTips"} content={"sample tip"}/> everywhere to
					see more tips.
				</div>
				<div className="paragraph" style={{marginTop: 16}}>
					<Expandable title={"Troubleshoot"} titleNode={<b>Troubleshoot</b>} content={
						<div className="paragraph">
							If the browser cache is somehow messed up (likely due to invalid game states), this is how to reset it:<br/>
							Enter this tool from <b>{"https://miyehn.me/ffxiv-blm-rotation/#/{command}"}</b> replacing <b>{"{command}"}</b> with one of the following:
							<ul>
								<li style={smallGap}><b>resetResourceOverrides</b>: delete all resource overrides and all actions on the current timeline.</li>
								<li style={smallGap}><b>resetAll</b>: delete all browser-cached settings.</li>
							</ul>
						</div>
					}/>
				</div>
			</div>}
		/>
		<Expandable
			defaultShow={false}
			title={"About this tool"}
			content={<div>
				<div className="paragraph">This is a FFXIV black mage simulator & rotation planner.</div>
				<div className="paragraph">This tool is made by:</div>
				<ul>
					<li><b>Eshiya (Galahad Donnadieu @ Exodus)</b>: the PM and the big brain BLM</li>
					<li><b>miyehn (Ellyn Waterford @ Sargatanas)</b>: software developer and a humble BLM student</li>
					<li><b>Turtle, Spider,</b> and many other players who contributed feature suggestions, timeline markers, bug reports, or in any other way</li>
				</ul>
				<div className="paragraph">
					If you have questions,
					encountered bugs, or would like to suggest features, you can find me (miyehn) on discord
					(miyehn#5857) or via email (rainduym@gmail.com). In case of sending me a bug report, attaching the
					fight record (download "fight.txt" from the right or name it anything else) would be
					very helpful.
				</div>
				<div className="paragraph">Also, consider contributing! I'm not raiding this tier so I can't make the timeline markers..
				</div>
				<div className="paragraph">Some links:</div>
				<ul>
					<li><a href={"https://github.com/miyehn/ffxiv-blm-rotation"}>Github repository</a></li>
					<li><a href={"https://spide-r.github.io/ffxiv-blm-rotation/"}>Black Mage in the Bozjan Shell</a>: a variation of this tool for Save the Queens areas by <b>A'zhek Silvaire @ Zalera</b></li>
					<li><a href={"https://na.finalfantasyxiv.com/jobguide/blackmage/"}>Official FFXIV black mage job
						guide</a></li>
					<li><a href={"https://discord.com/channels/277897135515762698/592613187245834260"}>
						BLM resources channel on The Balance</a> (make sure you've already joined the server)</li>
				</ul>
				<div className="paragraph"><Expandable title={"Implementation notes"} defaultShow={false} content={
					<div>
						<div className="paragraph">
							Galahad found that slidecast window size is linear with respect to cast time. I made a <a href={"https://github.com/miyehn/ffxiv-blm-rotation/tree/main/scripts"}>script</a>, parsed
							a few logs and confirmed this. Albeit the slope is tiny (~0.02) so I'm just using 0.5s here
							for simplicity.
						</div>
						<div className="paragraph">
							Astral fire / umbral ice refresh happens at slidecast timing (0.5s before cast finishes)
						</div>
						<div className="paragraph">
							Thanks to Galahad and Blink, skill application delays (see the last function
							argument <a href={"https://github.com/miyehn/ffxiv-blm-rotation/blob/main/src/Game/Skills.ts#L48"}>here</a>)
							should be pretty accurate now: looking at the logs, the ones for spells are between "prepare XX" to actual damage,
							the others from between "casts XX" to whatever the effect is (mostly buff apply/refresh times).
							Please contact me if you know how to measure the rest of missing data.
						</div>
						<div className="paragraph">
							Lucid dreaming ticks happen on actor ticks, which have a random offset relative to MP tick.
							The earliest first tick time is 0.3s after you press the skill button. It ticks 7 times.
						</div>
					</div>
				}/></div>
				<Changelog/>
				<Expandable
					defaultShow={false}
					title={"Debug"}
					content={<DebugOptions/>}
				/>
			</div>
			}
		/>
	</div>
}