import React, {CSSProperties} from 'react';
import {Expandable, Help, ButtonIndicator} from "./Common";
import {DebugOptions} from "./DebugOptions";

export function IntroSection(props: {}) {
	let smallGap: CSSProperties = { marginBottom: 5 };
	return <div>
		<Expandable
			defaultShow={true}
			title={"instructions"}
			titleNode={<span>{"Instructions "}
				<Help topic={"expandable"} content={"click me to expand or collapse"}/></span>}
			content={<div style={{margin: 10, paddingLeft: 10, marginBottom: 20}}>
				<div className="paragraph">
					<b>General usage</b>
				</div>
				<ul>
					<li style={smallGap}>Set your stats in <b>Rotation</b> settings on the right, then <ButtonIndicator text={"apply and reset"}/></li>
					<li style={smallGap}>Click on a skill to use it. If it's not ready yet, click on it again will wait and retry.</li>
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
				<div className="paragraph">
					Most edits are automatically saved in your browser cache, so it's generally okay to refresh the page
					and
					not worry about losing progress.
				</div>
				<div className="paragraph">Hover over <Help topic={"sampleTips"} content={"sample tip"}/> everywhere to
					see more tips.
				</div>
			</div>}
		/>
		<Expandable
			defaultShow={false}
			title={"About this tool"}
			content={<div style={{margin: 10, paddingLeft: 10, marginBottom: 20}}>
				<div className="paragraph">This is a FFXIV black mage simulator & rotation planner.</div>
				<div className="paragraph">
					This tool is developed by <b>miyehn (Ellyn Waterford @ Sargatanas)</b> with generous help from their
					black mage friends and players on The Balance discord. Big shout out to <b>Galahad Donnadieu
					@ Exodus</b> for teaching me BLM from the ground up, testing the tool, and help collecting data.
					Also thank <b>Turtle</b> from The Balance for their detailed feedback and bug reports.
				</div>
				<div className="paragraph">
					If you have questions,
					encountered bugs, or would like to suggest features, you can find me on discord
					(miyehn#5857) or via email (rainduym@gmail.com). In case of sending me a bug report, attaching the
					fight record (download "fight.txt" from the right or name it anything else) would be
					very helpful.
				</div>
				<div className="paragraph">Also, consider contributing! I didn't even clear P3S or P4S so it's hard for
					me to make timeline presets for those fights...
				</div>
				<div className="paragraph">Some links:</div>
				<ul>
					<li><a href={"https://github.com/miyehn/ffxiv-blm-rotation"}>Github repository</a></li>
					<li><a href={"https://na.finalfantasyxiv.com/jobguide/blackmage/"}>Official FFXIV black mage job
						guide</a></li>
					<li><a href={"https://discord.com/channels/277897135515762698/592613187245834260"}>
						BLM resources channel on The Balance (make sure you've already joined the server)</a></li>
				</ul>
				<div className="paragraph"><Expandable title={"Implementation notes"} defaultShow={false} content={
					<div style={{margin: 10, paddingLeft: 10, marginBottom: 20}}>
						<div className="paragraph">
							Galahad found that slidecast window size is linear with respect to cast time. I made a <a href={"https://github.com/miyehn/ffxiv-blm-rotation/tree/main/scripts"}>script</a>, parsed
							a few logs and confirmed this. Albeit the slope is tiny (~0.02) so I'm just using 0.5s here
							for simplicity.
						</div>
						<div className="paragraph">
							Astral fire / umbral ice refresh happens at slidecast timing (0.5s before cast finishes)
						</div>
						<div className="paragraph">
							Skill application delays are fairly accurate for spells (got them from logs), but all abilities
							except lucid dreaming just use a 0.1s estimate (see the last function
							argument <a href={"https://github.com/miyehn/ffxiv-blm-rotation/blob/main/src/Game/Skills.ts#L48"}>here</a>).
							Please contact me if you know how to measure this missing data.
							These delay times affect when buffs are applied as well as where the red damage marks appear
							on the timeline.
						</div>
						<div className="paragraph">
							Lucid dreaming ticks happen halfway between MP ticks. The earliest first tick time is 0.3s after you press
							the skill button. It always ticks 7 times.
						</div>
					</div>
				}/></div>
				<div className="paragraph"><Expandable title={"Changelog"} defaultShow={false} content={
					<div style={{margin: 10, paddingLeft: 10, marginBottom: 20}}>
						<div className="paragraph">6/27<br/>
							ayyee coming back for a couple of features lined up in the next two weeks or so. For now just updated some node dependencies.
						</div>
						<div className="paragraph">5/26<br/>
							leaving this thingy for now but if anyone encounters bugs and/or gets confused let me know. I can always come back to fix things.
						</div>
						<div className="paragraph">5/7 (yes I'm still working on it)<br/>
							added support for enabling/disabling ley lines and removing buffs applied to self
						</div>
						<div className="paragraph">5/3<br/>
							added this section so most people can stay here instead of go and look at my messy code and commit messages<br/>
							fixed a performance issue related to viewing historical game states. <br/>
							added a few implementation notes
						</div>
						<div className="paragraph">5/2<br/>
							can now view historical game states by clicking on the timeline
						</div>
					</div>
				}/></div>
				<Expandable
					defaultShow={false}
					title={"Debug"}
					content={<div style={{margin: 10, paddingLeft: 10, marginBottom: 20}}>
						<DebugOptions/>
					</div>
					}/>
			</div>
			}
		/>
	</div>
}