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
				</ul>
				<div className="paragraph">
					<b>Timeline</b>
				</div>
				<ul>
					<li style={smallGap}>Click to select a skill on the timeline. Shift click to select a sequence of skills</li>
					<li style={smallGap}><ButtonIndicator text={"backspace"}/> to delete the selected skill and everything after it</li>
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
					Also thanks <b>Turtle</b> from The Balance for their detailed feedback and bug reports.
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
						TODO
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