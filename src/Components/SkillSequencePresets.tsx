import React, { useContext, useEffect, useState, useReducer } from "react";
import {
	Clickable,
	Expandable,
	FileFormat,
	Input,
	LoadJsonFromFileOrUrl,
	SaveToFile,
} from "./Common";
import { controller } from "../Controller/Controller";
import { FileType, ReplayMode } from "../Controller/Common";
import { SkillIconImage } from "./Skills";
import { ActionType, Line } from "../Controller/Record";
import { getThemeField, ColorThemeContext } from "./ColorTheme";
import { localize } from "./Localization";

type Fixme = any;

export let updateSkillSequencePresetsView = () => {};

function SaveAsPreset(props: { enabled: boolean }) {
	const [fileName, setFileName] = useState("(untitled)");
	const onChange = (val: string) => setFileName(val);
	return <form>
		<Input
			style={{ display: "inline-block", marginTop: "10px" }}
			defaultValue={fileName}
			description={localize({ en: "name: ", zh: "预设名：" })}
			width={30}
			onChange={onChange}
		/>
		<span> </span>
		<button
			type={"submit"}
			disabled={!props.enabled}
			onClick={(e) => {
				controller.addSelectionToPreset(fileName);
				e.preventDefault();
			}}
		>
			{localize({ en: "add selection to preset", zh: "将选中的技能保存为预设" })}
		</button>
	</form>;
}

function PresetLine(props: { line: Line }) {
	const line = props.line;
	const icons = [];
	let ctr = 0;
	const iconStyle = {
		margin: "0 1px",
		width: "18px",
		verticalAlign: "middle",
	};
	for (const action of line.actions) {
		// waits and other actions aren't rendered, but TODO maybe they should be
		if (action.info.type === ActionType.Skill) {
			const skillName = action.info.skillName;
			icons.push(<SkillIconImage style={iconStyle} key={ctr} skillName={skillName} />);
			ctr++;
		}
	}
	const clickableContent = <span>
		{line.name} ({icons})
	</span>;

	const addLineStyle = controller.displayingUpToDateGameState
		? {}
		: {
				//filter: "grayscale(100%)",
				//pointerEvents: "none",
				cursor: "not-allowed",
			};
	return <div style={{ marginBottom: "8px" }}>
		<Clickable
			content={clickableContent}
			style={addLineStyle}
			onClickFn={
				controller.displayingUpToDateGameState
					? () => {
							controller.tryAddLine(line, ReplayMode.SkillSequence);
							controller.updateAllDisplay();
							controller.scrollToTime();
						}
					: undefined
			}
		/>
		<span> </span>
		<Clickable
			content="[x]"
			onClickFn={() => {
				controller.deleteLine(line);
			}}
		/>
	</div>;
}

export function SkillSequencePresets() {
	const colors = useContext(ColorThemeContext);
	const [, forceUpdate] = useReducer((x) => x + 1, 0);
	useEffect(() => {
		updateSkillSequencePresetsView = () => forceUpdate();
		return () => {
			updateSkillSequencePresetsView = () => {};
		};
	}, []);
	const hasSelection =
		controller && controller.record && controller.record.getFirstSelection() !== undefined;

	const bg = getThemeField(colors, "bgMediumContrast");
	const content = <div>
		<button
			style={{ marginBottom: 10 }}
			onClick={() => {
				controller.deleteAllLines();
			}}
		>
			{localize({ en: "clear all presets", zh: "重置所有预设" })}
		</button>
		<LoadJsonFromFileOrUrl
			allowLoadFromUrl={false} // disabled for now, until when/if people have some common openers
			defaultLoadUrl={"https://miyehn.me/ffxiv-blm-rotation/presets/lines/default.txt"}
			onLoadFn={(content: Fixme) => {
				if (content.fileType === FileType.SkillSequencePresets) {
					controller.appendFilePresets(content);
				} else {
					window.alert("incorrect file type '" + content.fileType + "'");
				}
			}}
		/>
		<div
			style={{
				outline: "1px solid " + bg,
				margin: "10px 0",
				padding: "10px",
			}}
		>
			{controller.getPresetLines().map((line, i) => <PresetLine line={line} key={i} />)}
			<SaveAsPreset enabled={hasSelection} />
			<div style={{ marginTop: 16 }}>
				<SaveToFile
					fileFormat={FileFormat.Json}
					getContentFn={() => controller.serializedPresets()}
					filename={"presets"}
					displayName={localize({
						en: "download presets to file",
						zh: "将当前预设下载为文件",
					})}
				/>
			</div>
		</div>
	</div>;
	return <Expandable
		title={localize({ en: "Skill sequence presets", zh: "技能序列预设" }) as string}
		content={content}
		defaultShow={false}
	/>;
}
