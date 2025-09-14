import React, { useEffect, useReducer, useContext, useState, Dispatch } from "react";
import { controller } from "../Controller/Controller";
import {
	ButtonIndicator,
	Clickable,
	ContentNode,
	Expandable,
	Help,
	Input,
	ValueChangeEvent,
} from "./Common";
import { getCachedValue, setCachedValue, ShellVersion, TickMode } from "../Controller/Common";
import { LevelSync, ProcMode } from "../Game/Common";
import { getAllResources, getResourceInfo, ResourceOverrideData } from "../Game/Resources";
import { localize, localizeResourceType } from "./Localization";
import {
	getThemeColors,
	getCurrentThemeColors,
	ColorThemeContext,
	getThemeField,
} from "./ColorTheme";
import {
	SerializedConfig,
	GameConfig,
	makeDefaultConfig,
	getSavedConfigPart,
} from "../Game/GameConfig";
import { XIVMath } from "../Game/XIVMath";
import { FaCheck } from "react-icons/fa6";
import {
	ShellJob,
	JOBS,
	ImplementationKey,
	ALL_JOBS,
	IMPLEMENTATION_LEVELS,
} from "../Game/Data/Jobs";
import { ResourceKey, CooldownKey, RESOURCES } from "../Game/Data";
import { getGameState } from "../Game/Jobs";

export let updateConfigDisplay = (config: SerializedConfig) => {};

function getTableStyle(bgHighContrastColor: string) {
	return `
		.castTimeTable {
			border-collapse: collapse;
			width: 100%;
		}
		.castTimeTable th, .castTimeTable td {
			text-align: center;
			padding: 0.15em;
			border: 1px solid ${bgHighContrastColor};
			width: 33%
		}
	`;
}

// key, rscType, rscInfo
export function ResourceOverrideDisplay(props: {
	job: ShellJob;
	override: ResourceOverrideData;
	deleteFn?: (rsc: ResourceKey | CooldownKey) => void; // when null, this component is for display only
}) {
	const rscInfo = getResourceInfo(props.job, props.override.type);
	let str: ContentNode;
	const localizedRsc = localizeResourceType(props.override.type);
	if (rscInfo.isCoolDown) {
		str = localize({
			en: localizedRsc + " full in " + props.override.timeTillFullOrDrop + "s",
			zh: `${localizedRsc}将在${props.override.timeTillFullOrDrop}秒后转好`,
		});
	} else {
		str = localizedRsc;
		const lparen = localize({ en: " (", zh: "（" }) as string;
		const rparen = localize({ en: ") ", zh: "）" }) as string;
		//const colon = localize({en: ": ", zh: "："}) as string;
		if (RESOURCES[props.override.type as ResourceKey].mayBeToggled ?? false) {
			str +=
				lparen +
				(props.override.effectOrTimerEnabled
					? localize({ en: "enabled", zh: "生效中" })
					: localize({ en: "disabled", zh: "未生效" })) +
				rparen;
		}
		if (rscInfo.maxValue > 1) {
			str += localize({
				en: ` (amount: ${props.override.stacks})`,
				zh: `（数量：${props.override.stacks}）`,
			});
		}
		if (rscInfo.maxTimeout >= 0) {
			if (props.override.type === "POLYGLOT") {
				if (props.override.timeTillFullOrDrop > 0) {
					str += localize({
						en: ` next stack ready in ${props.override.timeTillFullOrDrop}s`,
						zh: `距下一层${props.override.timeTillFullOrDrop}秒`,
					});
				}
			} else {
				if (props.override.effectOrTimerEnabled) {
					str += localize({
						en: ` drops in ${props.override.timeTillFullOrDrop}s`,
						zh: `将在${props.override.timeTillFullOrDrop}秒后消失`,
					});
				}
			}
		}
	}
	str += " ";
	let deleteBtn: React.JSX.Element | undefined = undefined;
	if (props.deleteFn) {
		const deleteFn = props.deleteFn;
		deleteBtn = <Clickable
			content="[x]"
			onClickFn={(e) => {
				deleteFn(props.override.type);
			}}
		/>;
	}
	return <div style={{ marginTop: 10, color: "mediumpurple" }}>
		{str}
		{deleteBtn}
	</div>;
}

function ResourceOverrideSection(props: {
	job: ShellJob;
	initialResourceOverrides: ResourceOverrideData[];
	selectedOverrideResource: ResourceKey | CooldownKey;
	overrideTimer: string;
	overrideStacks: string;
	overrideEnabled: boolean;
	setInitialResourceOverrides: (data: ResourceOverrideData[]) => void;
	setSelectedOverrideResource: (key: ResourceKey | CooldownKey) => void;
	setOverrideTimer: (value: string) => void;
	setOverrideStacks: (value: string) => void;
	setOverrideEnabled: (value: boolean) => void;
}) {
	const deleteResourceOverride = (rscType: ResourceKey | CooldownKey) => {
		const spliceIdx = props.initialResourceOverrides.findIndex((data) => data.type === rscType);
		if (spliceIdx !== -1) {
			props.initialResourceOverrides.splice(spliceIdx, 1);
			props.setInitialResourceOverrides(props.initialResourceOverrides);
		}
	};
	// list of selected overrides
	const resourceOverridesDisplayNodes = props.initialResourceOverrides.map(
		(override, i) => <ResourceOverrideDisplay
			job={props.job}
			key={i}
			override={override}
			deleteFn={deleteResourceOverride}
		/>,
	);
	// TODO pass from parent as optimization
	const S = new Set(props.initialResourceOverrides.map((rsc) => rsc.type));
	const resourceInfos = getAllResources(props.job);
	// <option> elements for resources that can be overridden
	const optionEntries: { rsc: ResourceKey | CooldownKey; isCoolDown: number }[] = resourceInfos
		.entries()
		.flatMap(([k, info]) => (S.has(k) ? [] : [{ rsc: k, isCoolDown: info.isCoolDown ? 1 : 0 }]))
		.toArray();
	const resourceOptions = optionEntries
		.sort((a, b) => a.isCoolDown - b.isCoolDown)
		.map((opt, i) => <option key={i} value={opt.rsc}>
			{localizeResourceType(opt.rsc)}
		</option>);

	const rscType = props.selectedOverrideResource;
	const info = resourceInfos.get(rscType);
	let inputSection = undefined;
	let showEnabled = true;
	if (info !== undefined) {
		let showTimer, showAmount;
		let timerDefaultValue = "-1",
			timerOnChange = undefined,
			amountDefaultValue = "0",
			amountOnChange = undefined;

		if (info.isCoolDown) {
			showTimer = true;
			showAmount = false;
			showEnabled = false;
			timerDefaultValue = props.overrideTimer;
			timerOnChange = props.setOverrideTimer;
		} else {
			// timer
			if (info.maxTimeout >= 0) {
				showTimer = true;
				timerDefaultValue = props.overrideTimer;
				timerOnChange = props.setOverrideTimer;
			} else {
				showTimer = false;
			}

			// amount
			// hide the amount display if the resource has only one stack
			// unless that stack is set by default
			if (info.maxValue > 1 || info.maxValue === info.defaultValue) {
				showAmount = true;
				amountDefaultValue = props.overrideStacks;
				amountOnChange = props.setOverrideStacks;
			} else {
				showAmount = false;
			}

			showEnabled = RESOURCES[rscType as ResourceKey].mayBeToggled ?? false;
		}

		const timerDesc = info.isCoolDown
			? localize({ en: "Time till full: ", zh: "距CD转好时间：" })
			: rscType === "POLYGLOT"
				? localize({ en: "Time till next stack: ", zh: "距下一层时间：" })
				: localize({ en: "Time till drop: ", zh: " 距状态消失时间：" });

		const enabledDesc = localize({ en: "enabled", zh: "生效中" });

		inputSection = <div style={{ margin: "6px 0" }}>
			{/*timer*/}
			<div hidden={!showTimer}>
				<Input
					description={timerDesc}
					defaultValue={timerDefaultValue}
					onChange={timerOnChange}
				/>
			</div>

			{/*stacks*/}
			<div hidden={!showAmount}>
				<Input
					description={localize({ en: "Amount: ", zh: "数量：" })}
					defaultValue={amountDefaultValue}
					onChange={amountOnChange}
				/>
			</div>

			{/*enabled*/}
			<div hidden={!showEnabled}>
				<input
					style={{ position: "relative", top: 3, marginRight: 5 }}
					type="checkbox"
					checked={props.overrideEnabled}
					onChange={(e) => props.setOverrideEnabled(e.target.checked)}
				/>
				<span>{enabledDesc}</span>
			</div>
		</div>;
	}

	const colors = useContext(ColorThemeContext);
	const bg = getThemeField(colors, "bgMediumContrast");

	const addResourceOverride = (e: React.FormEvent) => {
		e.preventDefault();
		const rscType = props.selectedOverrideResource;
		const info = getAllResources(props.job).get(rscType)!;

		let inputOverrideTimer = parseFloat(props.overrideTimer);
		const inputOverrideStacks = parseInt(props.overrideStacks);
		const inputOverrideEnabled = props.overrideEnabled;

		// an exception for polyglot: leave empty := no timer set
		// TODO do this for other jobs' timed resources
		if (rscType === "POLYGLOT" && props.overrideTimer === "") {
			inputOverrideTimer = 0;
		}

		if (isNaN(inputOverrideStacks) || isNaN(inputOverrideTimer)) {
			window.alert("some inputs are not numbers!");
			return;
		}
		let newRscProps: ResourceOverrideData;
		if (info.isCoolDown) {
			const maxTimer = info.maxStacks * info.cdPerStack;
			if (inputOverrideTimer < 0 || inputOverrideTimer > maxTimer) {
				window.alert("invalid input timeout (must be in range [0, " + maxTimer + "])");
				return;
			}

			newRscProps = {
				type: rscType,
				timeTillFullOrDrop: inputOverrideTimer,
				stacks: info.maxStacks > 1 ? inputOverrideStacks : 1,
				effectOrTimerEnabled: true,
			};
		} else {
			if (
				(info.maxValue > 1 || info.maxValue === info.defaultValue) &&
				(inputOverrideStacks < 0 || inputOverrideStacks > info.maxValue)
			) {
				window.alert("invalid input amount (must be in range [0, " + info.maxValue + "])");
				return;
			}
			if (
				info.maxTimeout >= 0 &&
				(inputOverrideTimer < 0 || inputOverrideTimer > info.maxTimeout)
			) {
				window.alert(
					"invalid input timeout (must be in range [0, " + info.maxTimeout + "])",
				);
				return;
			}

			newRscProps = {
				type: rscType,
				timeTillFullOrDrop: info.maxTimeout >= 0 ? inputOverrideTimer : -1,
				stacks:
					info.maxValue > 1 || info.maxValue === info.defaultValue
						? inputOverrideStacks
						: 1,
				effectOrTimerEnabled: showEnabled || inputOverrideEnabled,
			};
		}
		// end validation
		props.setInitialResourceOverrides([...props.initialResourceOverrides, newRscProps]);
	};
	const addResourceOverrideNode = <div>
		<form
			onSubmit={(evt) => addResourceOverride(evt)}
			style={{
				marginTop: 16,
				outline: "1px solid " + bg,
				outlineOffset: 6,
			}}
		>
			<select
				value={props.selectedOverrideResource}
				onChange={(evt) => {
					if (evt.target) {
						props.setSelectedOverrideResource(
							evt.target.value as ResourceKey | CooldownKey,
						);
					}
				}}
			>
				{resourceOptions}
			</select>
			{inputSection}
			<input
				type="submit"
				value={localize({ en: "add override", zh: "应用此状态" }) as string}
			/>
		</form>
	</div>;
	return <div style={{ marginTop: 10 }}>
		<Expandable
			title="overrideInitialResources"
			titleNode={
				<span>
					{localize({ en: "Override initial resources", zh: "指定初始资源" })}{" "}
					<Help
						topic="overrideInitialResources"
						content={localize({
							en: <div>
								<div className={"paragraph"} style={{ color: "orangered" }}>
									<b>
										Can create invalid game states. Go over
										Instructions/Troubleshoot first and use carefully at your
										own risk!
									</b>
								</div>
								<div className={"paragraph"}>
									Also, currently thunder dot buff created this way doesn't
									actually tick. It just shows the remaining buff timer.
								</div>
								<div className={"paragraph"}>
									I would recommend saving settings (stats, lines presets,
									timeline markers etc.) to files first, in case invalid game
									states really mess up the tool and a complete reset is required.
								</div>
							</div>,
							zh: <div>
								<div className={"paragraph"} style={{ color: "orangered" }}>
									<b>
										错误的初始资源可能会导致非法游戏状态。请在阅读工具顶部的使用说明/常见问题后慎重使用，并优先自行排查问题！
									</b>
								</div>
								<div className={"paragraph"}>
									另：当前靠初始资源覆盖添加的雷dot只显示剩余时间，不会结算伤害。
								</div>
								<div className={"paragraph"}>
									使用此功能时，请最好先下载保存各项数据（面板数值，技能轴，时间轴预设等），以防造成未知错误后排轴器重置导致的数据丢失。
								</div>
							</div>,
						})}
					/>
				</span>
			}
			content={
				<div>
					<button
						onClick={(evt) => {
							if (props.initialResourceOverrides.length > 0) {
								props.setInitialResourceOverrides([]);
							}
							evt.preventDefault();
						}}
					>
						{localize({ en: "clear all overrides", zh: "清除所有指定初始资源" })}
					</button>
					{resourceOverridesDisplayNodes}
					{addResourceOverrideNode}
				</div>
			}
		/>
	</div>;
}

export function ConfigSummary(props: { job: ShellJob; dirty: boolean }) {
	const lucidTickOffset = controller.game.lucidTickOffset.toFixed(3);
	const lucidOffsetDesc = localize({
		en: "the random time offset of lucid dreaming ticks relative to mp ticks",
		zh: "醒梦buff期间，每次跳蓝后多久跳醒梦（由随机种子决定）",
	});
	// TODO specialize for BLM
	// TODO (revisit): double check this forced cast
	const dotTickOffset = controller.game.dotTickOffset.toFixed(3);
	const offsetDesc = localize({
		en: "the random time offset of DoT ticks relative to mp ticks",
		zh: "雷DoT期间，每次跳蓝后多久跳雷（由随机种子决定）", // Akairyu's Note - Needs retranslating after removing the reference to thunder
	});
	// These fields are deliberately updated only when `dirty` is updated and a re-render of this component is forced.
	const procMode = controller.gameConfig.procMode;
	const numOverrides = controller.gameConfig.initialResourceOverrides.length;
	const legacyCasterTax = controller.gameConfig.legacy_casterTax;
	const excerpt = localize({
		en: `WARNING: this record was created in an earlier version of XIV in the Shell and uses the deprecated caster tax of ${legacyCasterTax}s instead of calculating from your FPS input below. Hover for details: `,
		zh: `警告：此时间轴文件创建于一个更早版本的排轴器，因此计算读条时间时使用的是当时手动输入的读条税${legacyCasterTax}秒（现已过时），而非由下方的“帧率”和“读条时间修正”计算得来。更多信息：`,
	});
	const warningColor = getCurrentThemeColors().warning;
	const tryGetImplementationWarning = (impl: ImplementationKey, warningColor: string) => {
		const details = IMPLEMENTATION_LEVELS[impl];
		if (!details.warningContent) {
			return;
		}
		return <p
			style={{
				color: warningColor,
			}}
		>
			{localize(details.warningContent)}
		</p>;
	};

	const legacyCasterTaxBlurbContent = localize({
		en: <div>
			<div className={"paragraph"}>
				The caster tax config is now replaced by 0.1s + FPS tax and is more precise. You can
				read more about FPS tax in the Github repository wiki's implementation notes
				section.
			</div>
			<div className={"paragraph"} style={{ color: warningColor }}>
				You are strongly encouraged to create a new record (in another timeline slot or from
				'apply and reset') and migrate your fight plan. Support for loading legacy files
				might drop in the future.
			</div>
		</div>,
		zh: <div>
			<div className={"paragraph"}>
				现在的“读条税”由固定的0.1s加自动计算的帧率税构成，模拟结果也更精确。有关帧率税的更多信息详见
				关于/实现细节。
			</div>
			<div className={"paragraph"} style={{ color: warningColor }}>
				排轴器今后的更新可能会导致无法加载过时的文件，所以强烈建议将此时间轴迁移到一个新建的存档中（添加时间轴，或者应用并重置时间轴）。
			</div>
		</div>,
	});
	const legacyCasterTaxBlurb = <p style={{ color: warningColor }}>
		{excerpt}
		<Help topic={"legacy-caster-tax"} content={legacyCasterTaxBlurbContent} />
	</p>;
	return <div
		style={{
			textDecoration: props.dirty ? "line-through" : "none",
			marginLeft: 5,
			paddingLeft: 10,
			borderLeft: "1px solid " + getCurrentThemeColors().bgHighContrast,
		}}
	>
		{controller.gameConfig.shellVersion < ShellVersion.FpsTax
			? legacyCasterTaxBlurb
			: undefined}

		{tryGetImplementationWarning(JOBS[props.job].implementationLevel, warningColor)}

		{["CASTER", "HEALER"].includes(JOBS[props.job].role) && <div>
			{localize({ en: "Lucid tick offset ", zh: "醒梦&跳蓝时间差 " })}
			<Help topic={"lucidTickOffset"} content={lucidOffsetDesc} />: {lucidTickOffset}
		</div>}

		{/* Akairyu's Note: Needs retranslating after removing reference to Thunder*/}
		{controller.game.dotResources.length > 0 && <div>
			{localize({ en: "DoT tick offset ", zh: "跳雷&跳蓝时间差 " })}
			<Help topic={"dotTickOffset"} content={offsetDesc} />: {dotTickOffset}
		</div>}

		{props.job === "MNK" && <div>
			{localize({ en: "SSS GCD", zh: "六合星GCD" })}:{" "}
			{controller.gameConfig
				.adjustedSksGCD(5, controller.game.inherentSpeedModifier())
				.toFixed(2)}
		</div>}

		<p>
			{localize({ en: "Procs", zh: "随机数模式" })}: {procMode}
		</p>

		{numOverrides > 0 && <p>
			{localize({
				en: `${numOverrides} initial resource override(s)`,
				zh: `${numOverrides}项初始资源覆盖`,
			})}
		</p>}
	</div>;
}

type TimeControlState = {
	timeScale: number;
	tickMode: TickMode;
};

export function TimeControl() {
	const loadSettings = () => {
		const str = getCachedValue("playbackSettings");
		if (str) {
			const settings: TimeControlState = JSON.parse(str);
			return settings;
		}
		return undefined;
	};
	const settings = loadSettings();
	const [timeScale, _setTimeScale] = useState(settings?.tickMode ?? 1);
	const [tickMode, _setTickMode] = useState(settings?.timeScale ?? TickMode.Manual);

	const saveSettings = (timeScale: number, tickMode: TickMode) => {
		const str = JSON.stringify({
			tickMode,
			timeScale,
		});
		setCachedValue("playbackSettings", str);
	};

	const setTickMode = (e: ValueChangeEvent) => {
		if (!e || !e.target || isNaN(parseInt(e.target.value))) return;
		_setTickMode(parseInt(e.target.value));
		const numVal = parseInt(e.target.value);
		if (!isNaN(numVal)) {
			controller.setTimeControlSettings({
				tickMode: numVal,
				timeScale,
			});
			saveSettings(timeScale, numVal);
		}
	};

	const setTimeScale = (val: string) => {
		const numVal = parseFloat(val);
		_setTimeScale(numVal);
		if (!isNaN(numVal)) {
			controller.setTimeControlSettings({
				tickMode,
				timeScale: numVal,
			});
			saveSettings(numVal, timeScale);
		}
	};

	useEffect(() => {
		controller.setTimeControlSettings({
			tickMode,
			timeScale,
		});
	});
	const radioStyle: React.CSSProperties = {
		position: "relative",
		top: 3,
		marginRight: "0.75em",
	};
	const tickModeOptionStyle = {
		display: "inline-block",
		marginRight: "0.5em",
	};
	return <div>
		<p>
			<label style={tickModeOptionStyle}>
				<input
					style={radioStyle}
					type={"radio"}
					onChange={setTickMode}
					value={TickMode.RealTimeAutoPause}
					checked={tickMode === TickMode.RealTimeAutoPause}
					name={"tick mode"}
				/>
				{localize({
					en: "real-time auto pause",
					zh: "实时(带自动暂停）",
				})}
			</label>
			<Help
				topic={"ctrl-realTimeAutoPause"}
				content={
					<div className="toolTip">
						{localize({
							en: <div className="paragraph">*Recommended*</div>,
							zh: <div className="paragraph">*推荐设置*</div>,
						})}
						{localize({
							en: <div className="paragraph">
								- click to use a skill. if the skill is on cooldown, or you're in an
								animation lock, then the simulation will automatically skip ahead to
								when the skill can be used again
								<br />- animation locks and cast bars will play out in sped-up real
								time until done
							</div>,
							zh: <div className="paragraph">
								- 点击图标使用技能;
								战斗时间会按下方设置的倍速自动前进直到可释放下一个技能。如果点击的技能CD没有转好，模拟会自动地快进到它CD转好并重试。
							</div>,
						})}
					</div>
				}
			/>
			<br />
			<label style={tickModeOptionStyle}>
				<input
					style={radioStyle}
					type={"radio"}
					onChange={setTickMode}
					value={TickMode.Manual}
					checked={tickMode === TickMode.Manual}
					name={"tick mode"}
				/>
				{localize({
					en: "manual",
					zh: "手动",
				})}
			</label>
			<Help
				topic={"ctrl-manual"}
				content={
					<div className="toolTip">
						{localize({
							en: <div className="paragraph">
								- click to use a skill. if the skill is on cooldown, or you're in an
								animation lock, then the simulation will automatically skip ahead to
								when the skill can be used again
								<br />- animation locks and cast times are skipped immediately
							</div>,
							zh: <div className="paragraph">
								- 点击图标使用技能;
								战斗时间会自动快进至可释放下一个技能。如果点击的技能CD没有转好，模拟会自动地快进到它CD转好并重试。
							</div>,
						})}
					</div>
				}
			/>
		</p>
		<Input
			defaultValue={`${timeScale}`}
			description={
				<span>
					{localize({ en: "time scale ", zh: "倍速 " })}
					<Help
						topic={"timeScale"}
						content={
							<div>
								{localize({
									en: "rate at which game time advances automatically (aka when in real-time)",
									zh: "战斗时间自动前进的速度",
								})}
							</div>
						}
					/>
					:{" "}
				</span>
			}
			onChange={setTimeScale}
		/>
	</div>;
}

// State tracking all fields that can be directly set by text input or gearset link import.
// These are strings or string enums because their values are controlled by an <Input> field
type ConfigFields = {
	job: ShellJob;
	level: string;
	spellSpeed: string;
	skillSpeed: string;
	criticalHit: string;
	directHit: string;
	determination: string;
	piety: string;
	animationLock: string;
	fps: string;
	gcdSkillCorrection: string;
	timeTillFirstManaTick: string;
	countdown: string;
	randomSeed: string;
	procMode: ProcMode;
	// set only by xivgear/etro import
	// for use with ama's combat sim
	tenacity: string;
	wd: string;
	main: string;
	// not actually serialized state, but makes the reducer easier to manage
	dirty: boolean;
};

function ConfigInputField(props: {
	name: keyof ConfigFields;
	description: ContentNode;
	initial: string;
	dispatch: Dispatch<Partial<ConfigFields>>;
	removeImportedField: (key: keyof ConfigFields) => void;
	imported: boolean;
}) {
	const colors = useContext(ColorThemeContext);
	const color = (
		props.imported ? getThemeField(colors, "success") : getThemeField(colors, "text")
	) as string;
	return <Input
		style={{ color }}
		defaultValue={props.initial}
		description={props.description}
		onChange={(val: string) => {
			props.dispatch({ [props.name]: val });
			props.removeImportedField(props.name);
		}}
	/>;
}

function GearImport(props: {
	imported: boolean;
	setImported: (value: boolean) => void;
	setImportedFields: (fields: (keyof ConfigFields)[]) => void;
	dispatch: Dispatch<Partial<ConfigFields>>;
}) {
	const colors = getThemeColors(useContext(ColorThemeContext));
	const [gearImportLink, setGearImportLink] = useState("");
	const { imported, setImported } = props;
	const importGear = async (event: React.SyntheticEvent) => {
		event.preventDefault();
		const url = URL.parse(gearImportLink);
		const headers = new Headers();
		try {
			if (url && url.hostname === "etro.gg") {
				const tokens = url.pathname.split("/");
				if (tokens[1] !== "gearset" && tokens.length !== 3) {
					throw new Error(
						"Invalid etro gearset link (hover ? in URL input box for details)",
					);
				}
				headers.append("Content-Type", "application/json");
				const response = await fetch("https://etro.gg/api/gearsets/" + tokens[2], {
					method: "GET",
					headers: headers,
				});
				if (response.ok) {
					const body: any = await response.json();
					const stats = new Map<string, string>(
						body["totalParams"].map((obj: any) => [obj["name"], obj["value"]]),
					);
					// The main stat should always be the first returned field.
					const mainStat =
						body["totalParams"].length > 0 ? body["totalParams"][0]["value"] : 0;
					if (!(body["jobAbbrev"] in JOBS)) {
						throw new Error(
							"Imported gearset was for a job (" +
								body["jobAbbrev"] +
								") that XIV in the Shell doesn't support",
						);
					}
					// TODO should probably validate each of these fields
					const baseSpeed = XIVMath.getSubstatBase(
						parseFloat(body["level"]) as LevelSync,
					).toString();
					const spellSpeed = stats.get("SPS") ?? baseSpeed;
					const skillSpeed = stats.get("SKS") ?? baseSpeed;
					const importedFields: (keyof ConfigFields)[] = [
						"job",
						"level",
						"criticalHit",
						"directHit",
						"determination",
						"main",
					];
					if (stats.has("SPS")) importedFields.push("spellSpeed");
					if (stats.has("SKS")) importedFields.push("skillSpeed");
					if (stats.has("PIE")) importedFields.push("piety");
					if (stats.has("TEN")) importedFields.push("tenacity");
					if (stats.has("Weapon Damage")) importedFields.push("wd");
					props.dispatch({
						job: body["jobAbbrev"],
						level: body["level"],
						spellSpeed,
						skillSpeed,
						wd: stats.get("Weapon Damage"),
						criticalHit: stats.get("CRT"),
						directHit: stats.get("DH"),
						determination: stats.get("DET"),
						piety: stats.get("PIE"),
						tenacity: stats.get("TEN"),
						main: mainStat,
					});
					props.setImportedFields(importedFields);
					setImported(true);
				} else {
					console.error(response);
					throw new Error("etro load failed (please check your link)");
				}
			} else if (url && url.hostname === "xivgear.app") {
				const pageParam = url.searchParams.get("page");
				if (!pageParam) {
					throw new Error(
						"xivgear link must be to a specific set (hover ? in URL input box for details)",
					);
				}
				// strip the "sl|" url-encoded characters at the start of the link
				const setId = pageParam.startsWith("sl|") ? pageParam.substr(3) : pageParam;
				headers.append("Content-Type", "application/json");
				const response = await fetch("https://api.xivgear.app/fulldata/" + setId, {
					method: "GET",
					headers: headers,
				});
				if (response.ok) {
					const body: any = await response.json();
					// TODO should probably validate each of these fields
					if (!(body["job"] in JOBS)) {
						throw new Error(
							"Imported gearset was for a job (" +
								body["job"] +
								") that XIV in the Shell doesn't support",
						);
					}
					const stats = body["sets"][0]["computedStats"];
					// just assume the highest main stat/wd field is the correct one
					const mainStat = Math.max(
						...["strength", "dexterity", "intelligence", "mind"].map(
							(field) => stats[field] ?? 0,
						),
					).toString();
					const wd = Math.max(stats["wdPhys"] ?? 0, stats["wdMag"] ?? 0).toString();
					const fields: Partial<ConfigFields> = {
						job: body["job"],
						level: body["level"],
						spellSpeed: stats["spellspeed"],
						skillSpeed: stats["skillspeed"],
						criticalHit: stats["crit"],
						directHit: stats["dhit"],
						determination: stats["determination"],
						piety: stats["piety"],
						tenacity: stats["tenacity"],
						wd,
						main: mainStat,
					};
					props.dispatch(fields);
					// @ts-expect-error compiler can't be sure that Object.keys matches ConfigFields
					props.setImportedFields(Object.keys(fields));
					setImported(true);
				} else {
					console.error("xivgear load failed: " + response);
					throw new Error("xivgear load failed (please check your link)");
				}
			} else {
				throw new Error("Invalid gearset link (must be from etro.gg or xivgear.app)");
			}
		} catch (e: any) {
			console.error(e);
			window.alert(e.message);
		}
	};
	const etroLink = <a href="https://etro.gg" target="_blank" rel="noreferrer">
		etro
	</a>;
	const xivgearLink = <a href="https://xivgear.app" target="_blank" rel="noreferrer">
		xivgear
	</a>;
	return <form onSubmit={importGear}>
		{localize({
			en: <span>
				Load stats from {etroLink}/{xivgearLink}:{" "}
			</span>,
			zh: <span>
				从{etroLink}或{xivgearLink}导入套装：
			</span>,
		})}
		<Help
			topic={"gearImport"}
			content={
				<>
					<p>
						{localize({
							en: <span>
								Enter and <ButtonIndicator text={"Load"} /> a link to a gearset from
								xivgear.app or etro.gg, edit the rest of config, then{" "}
								<ButtonIndicator text={"apply and reset"} />.
							</span>,
							zh: <span>
								输入xivgear.app或etro.gg的套装链接并
								<ButtonIndicator text={"加载"} />
								，调整其余角色属性，然后
								<ButtonIndicator text={"应用并重置时间轴"} />。
							</span>,
						})}
					</p>
					<p>
						{localize({
							en: "etro: Copy/paste the link to the set (example: https://etro.gg/gearset/e13d5960-4794-4dc4-b273-24ecfed6745e)",
							zh: "etro：复制粘贴套装链接（例：https://etro.gg/gearset/e13d5960-4794-4dc4-b273-24ecfed6745e）",
						})}
					</p>
					<p>
						{localize({
							en:
								'xivgear: At the top of the page, click "Export" -> "Selected Set" -> "Link to This Set" -> "Generate"' +
								" (example: https://xivgear.app/?page=sl%7C143f3245-c35b-4391-8b2b-db5cc1a8de9a)",
							zh: 'xivgear：从页面顶端点击 "Export" -> "Selected Set" -> "Link to This Set" -> "Generate"（例：https://xivgear.app/?page=sl%7C143f3245-c35b-4391-8b2b-db5cc1a8de9a）',
						})}
					</p>
				</>
			}
		/>
		<div style={{ position: "relative", marginTop: 5 }}>
			<Input
				style={{ display: "inline-block" }}
				width={25}
				description={""}
				onChange={(s) => setGearImportLink(s)}
			/>
			<span> </span>
			<input
				style={{ display: "inline-block" }}
				type="submit"
				value={localize({ en: "Load", zh: "加载" }) as string}
			/>
			{
				<FaCheck
					style={{
						display: imported ? "inline" : "none",
						color: colors.success,
						position: "relative",
						top: 4,
						marginLeft: 8,
					}}
				/>
			}
		</div>
	</form>;
}

function getGcdTaxPreview(
	speedStr: string,
	fpsStr: string,
	levelStr: string,
	speedModifier?: number,
): { gcdStr: string; taxedGcdStr: string } {
	const level = parseInt(levelStr);
	const speed = parseInt(speedStr);
	const fps = parseFloat(fpsStr);
	let gcdStr: string;
	let taxedGcdStr: string;
	if (isNaN(level) || isNaN(speed) || isNaN(fps) || speed < XIVMath.getSubstatBase(level)) {
		gcdStr = "n/a";
		taxedGcdStr = "n/a";
	} else {
		const gcd = XIVMath.preTaxGcd(level as LevelSync, speed, 2.5, speedModifier);
		gcdStr = gcd.toFixed(2);
		taxedGcdStr = XIVMath.afterFpsTax(fps, gcd).toFixed(3);
	}
	return {
		gcdStr,
		taxedGcdStr,
	};
}

// TODO this function currently only validates BLM's ice/fire state overrides, but other jobs
// have invalid combinations that need validation too
function validateResourceOverrides(initialResourceOverrides: ResourceOverrideData[]): boolean {
	// gather resources for quick access
	const M = new Map<ResourceKey | CooldownKey, ResourceOverrideData>(
		initialResourceOverrides.map((rsc) => [rsc.type, rsc]),
	);

	// shouldn't have AF and UI at the same time
	if (M.has("ASTRAL_FIRE") && M.has("UMBRAL_ICE")) {
		const af = M.get("ASTRAL_FIRE")!.stacks;
		const ui = M.get("UMBRAL_ICE")!.stacks;
		if (af > 0 && ui > 0) {
			window.alert("shouldn't have both AF and UI stacks");
			return false;
		}
	}

	let af = 0;
	let ui = 0;
	let uh = 0;
	if (M.has("ASTRAL_FIRE")) af = M.get("ASTRAL_FIRE")!.stacks;
	if (M.has("UMBRAL_ICE")) ui = M.get("UMBRAL_ICE")!.stacks;
	if (M.has("UMBRAL_HEART")) uh = M.get("UMBRAL_HEART")!.stacks;

	// if there's uh, must have AF/UI
	if (uh > 0) {
		if (af === 0 && ui === 0) {
			window.alert(
				"since there's at least one UH stack, there should also be Enochian and AF or UI",
			);
			return false;
		}
	}

	// if there are AF/UI stacks, implicitly grant enochian
	let hasEno = false;
	if (af > 0 || ui > 0 || uh > 0) {
		hasEno = true;
	}
	// if polyglot timer is set (>0), must have enochian
	if (M.has("POLYGLOT")) {
		const polyTimer = M.get("POLYGLOT")!.timeTillFullOrDrop;
		if (polyTimer > 0 && !hasEno) {
			window.alert(
				"since a timer for polyglot is set (time till next stack > 0), there must also be AF/UI",
			);
			return false;
		}
	}

	return true;
}

export function Config() {
	const colors = getThemeColors(useContext(ColorThemeContext));
	const [jobSpeedMod, setjobSpeedMod] = useState<number | undefined>(undefined);
	const [shellVersion, setShellVersion] = useState<ShellVersion>(ShellVersion.AllaganGcdFormula);
	// resource override management
	const [initialResourceOverrides, _setInitialResourceOverrides] = useState<
		ResourceOverrideData[]
	>([]);
	const [overrideTimer, setOverrideTimer] = useState("0");
	const [overrideStacks, setOverrideStacks] = useState("0");
	const [overrideEnabled, setOverrideEnabled] = useState(true);
	const setInitialResourceOverrides = (data: ResourceOverrideData[]) => {
		setDirty(true);
		_setInitialResourceOverrides(data);
		setFirstSelectedOverride(data);
	};
	const [selectedOverrideResource, setSelectedOverrideResource] = useState<
		ResourceKey | CooldownKey
	>("NEVER");
	const setFirstSelectedOverride = (overrides: ResourceOverrideData[]) => {
		const S = new Set<ResourceKey | CooldownKey>(overrides.map((ov) => ov.type));
		// TODO update ordering to something that's more intuitive?
		const firstAddableRsc: ResourceKey | CooldownKey =
			getAllResources(configFields.job)
				.keys()
				.find((rsc) => !S.has(rsc)) ?? "NEVER";
		setSelectedOverrideResource(firstAddableRsc);
	};
	const [jobOrLevelDirty, setJobOrLevelDirty] = useState(false);
	// config field management
	function configFieldReducer(
		prevState: ConfigFields,
		action: Partial<ConfigFields>,
	): ConfigFields {
		const newState: ConfigFields = {
			...prevState,
			...action,
		};
		if (!Object.is(newState, prevState)) {
			// The reducer runs on component render and registers a change from the initial state,
			// so the initializing action must explicitly set dirty to false.
			newState.dirty = action.dirty ?? true;
			if (action.job !== undefined && action.job !== prevState.job) {
				// If the job changed, update haste modifiers, clear resource overrides, and
				// use whatever the last saved stats for that job was.
				const dummyConfig: GameConfig = new GameConfig(
					makeDefaultConfig(action.job, parseInt(action.level ?? prevState.level)),
				);
				const speedModifier = getGameState(dummyConfig).inherentSpeedModifier();
				setjobSpeedMod(speedModifier);
				// If we returned to the ORIGINAL job (still stored by the controller), revert
				// stats to whatever was stored by the controller.
				if (action.job === controller.record.config?.job) {
					Object.assign(newState, controller.gameConfig.serialized());
					_setInitialResourceOverrides(controller.gameConfig.initialResourceOverrides);
				} else {
					_setInitialResourceOverrides([]);
					// need to duplicate some code to prevent a bootstrapping error
					const firstAddableRsc: ResourceKey | CooldownKey =
						getAllResources(action.job).keys().toArray()?.[0] ?? "NEVER";
					setSelectedOverrideResource(firstAddableRsc);
					// Update stats from last saved timeline of this job.
					Object.assign(newState, getSavedConfigPart(action.job));
				}
			}
			if (action.level !== undefined && action.level !== prevState.level) {
				const dummyConfig: GameConfig = new GameConfig(
					makeDefaultConfig(prevState.job, parseInt(action.level)),
				);
				const speedModifier = getGameState(dummyConfig).inherentSpeedModifier();
				setjobSpeedMod(speedModifier);
			}
			setJobOrLevelDirty(
				parseInt(newState.level) !== controller.gameConfig.level ||
					newState.job !== controller.gameConfig.job,
			);
		}
		return newState;
	}
	const [configFields, configFieldDispatch] = useReducer(configFieldReducer, {
		job: "BLM" as ShellJob,
		level: `${LevelSync.lvl100}`,
		spellSpeed: "0",
		skillSpeed: "0",
		criticalHit: "0",
		directHit: "0",
		determination: "0",
		piety: "0",
		animationLock: "0",
		fps: "0",
		gcdSkillCorrection: "0",
		timeTillFirstManaTick: "0",
		countdown: "0",
		randomSeed: "",
		procMode: ProcMode.RNG,
		tenacity: "0",
		wd: "0",
		main: "0",
		dirty: false,
	});
	const setDirty = (b: boolean) => configFieldDispatch({ dirty: b });
	const singleDispatch = (key: keyof ConfigFields) => (v: string) =>
		configFieldDispatch({ [key]: v });
	// gearset import state
	const [imported, setImported] = useState(false);
	// @ts-expect-error compiler doesn't know this iteration is exhaustive over configFields keys
	const emptyImportedFields: { [Property in keyof ConfigFields]: boolean } = Object.fromEntries(
		Object.keys(configFields).map((key) => [key, false]),
	);
	const [importedFields, _setImportedFields] = useState(emptyImportedFields);
	const addImportedFields = (keys: (keyof ConfigFields)[]) => {
		_setImportedFields({
			...importedFields,
			...Object.fromEntries(keys.map((key) => [key, true])),
		});
	};
	const removeImportedField = (key: keyof ConfigFields) => {
		_setImportedFields({
			...importedFields,
			[key]: false,
		});
	};
	const clearImportedFields = () => {
		_setImportedFields(emptyImportedFields);
		setImported(false);
	};

	// DANGER!! CONTROLLER STATE HACK
	useEffect(() => {
		updateConfigDisplay = (config: SerializedConfig) => {
			setShellVersion(config.shellVersion);
			setInitialResourceOverrides(config.initialResourceOverrides);
			configFieldDispatch({
				...Object.fromEntries(
					Object.entries(config).flatMap(([key, value]) =>
						key !== "initialResourceOverrides" ? [[key, value.toString()]] : [],
					),
				),
			});
			setDirty(false);
			clearImportedFields();
			// Update resource override module
			setFirstSelectedOverride(config.initialResourceOverrides);
		};
	});

	const fieldColor = (field: keyof ConfigFields) =>
		importedFields[field] ? colors.success : colors.text;

	const editJobSection = <div style={{ marginBottom: 10 }}>
		<span>{localize({ en: "job: ", zh: "职业：" })}</span>
		<select
			style={{ outline: "none", color: fieldColor("job") }}
			value={configFields.job}
			onChange={(s) => {
				removeImportedField("job");
				configFieldDispatch({ job: s.target.value as ShellJob });
			}}
		>
			{ALL_JOBS.filter((job) => JOBS[job].implementationLevel !== "UNIMPLEMENTED").map(
				(job) => {
					const impl = JOBS[job].implementationLevel as ImplementationKey;
					if (impl !== "LIVE") {
						return <option key={job} value={job}>
							{job +
								` (${localize(IMPLEMENTATION_LEVELS[impl].label ?? { en: "" })})`}
						</option>;
					} else {
						return <option key={job} value={job}>
							{job}
						</option>;
					}
				},
			)}
		</select>
	</div>;

	const { gcdStr: spsGcdPreview, taxedGcdStr: taxedSpsGcdPreview } = getGcdTaxPreview(
		configFields.spellSpeed,
		configFields.fps,
		configFields.level,
		jobSpeedMod,
	);
	const { gcdStr: sksGcdPreview, taxedGcdStr: taxedSksGcdPreview } = getGcdTaxPreview(
		configFields.skillSpeed,
		configFields.fps,
		configFields.level,
		jobSpeedMod,
	);
	const fpsAndCorrectionColor =
		shellVersion >= ShellVersion.FpsTax ? colors.text : colors.warning;
	const job: ShellJob = configFields.job;
	const isSps = JOBS[job].role === "CASTER" || JOBS[job].role === "HEALER";
	const speedStr = {
		en: isSps ? "spell" : "skill",
		zh: isSps ? "咏" : "技",
	};
	const getDefaultGcd = (base: number) =>
		XIVMath.preTaxGcd(
			parseFloat(configFields.level) as LevelSync,
			isSps ? parseFloat(configFields.spellSpeed) : parseFloat(configFields.skillSpeed),
			base,
			jobSpeedMod,
		);
	// Approxmiate duration of the GCD after applying innate haste buffs and FPS adjustments.
	const getDefaultGcdTax = (base: number) =>
		XIVMath.afterFpsTax(parseFloat(configFields.fps), getDefaultGcd(base));

	const gcdTaxDesc = <div>
		<style>{getTableStyle(colors.bgHighContrast)}</style>
		<div style={{ marginBottom: 10 }}>
			{localize({
				en: `Preview numbers based on your current ${speedStr.en} speed and FPS input:`,
				zh: `根据当前输入的${speedStr.zh}速和帧率，你将得到如下帧率税：`,
			})}
		</div>
		<table className="castTimeTable">
			<tbody>
				<tr>
					<th>{localize({ en: "GCD time", zh: "GCD时间" })}</th>
					<th>{localize({ en: "After FPS tax", zh: "帧率税后" })}</th>
				</tr>
				{[2.5, 3.0, 3.5, 4.0].map((recast, i) => <tr key={"gcdPreview" + i.toString()}>
					<td>
						{getDefaultGcd(recast).toFixed(2)} ({recast.toFixed(2)}{" "}
						{localize({ en: "base", zh: "原始" })})
					</td>
					<td>{getDefaultGcdTax(recast).toFixed(3)}</td>
				</tr>)}
			</tbody>
		</table>
	</div>;

	const applyConfig = (event: React.SyntheticEvent, resetRecord: boolean) => {
		event.preventDefault();
		if (!resetRecord && jobOrLevelDirty) {
			console.error("attempted to apply w/o reset, but job or level changed");
			return;
		}
		if (validateResourceOverrides(initialResourceOverrides)) {
			let seed = configFields.randomSeed;
			if (seed.length === 0) {
				for (let i = 0; i < 4; i++) {
					seed += Math.floor(Math.random() * 10).toString();
				}
				configFieldDispatch({ randomSeed: seed });
			}
			// Confirm config and restart sim
			const numericFields: (keyof ConfigFields)[] = [
				"spellSpeed",
				"skillSpeed",
				"criticalHit",
				"directHit",
				"determination",
				"animationLock",
				"fps",
				"gcdSkillCorrection",
				"timeTillFirstManaTick",
				"countdown",
				"level",
				"wd",
				"main",
				"tenacity",
			];
			if (
				numericFields
					.map((field) => isNaN(parseFloat(configFields[field].toString())))
					.some((x) => x)
			) {
				window.alert("Some config fields are not numbers!");
				return;
			}
			if (!(configFields.job in JOBS)) {
				window.alert("Invalid job: " + configFields.job);
				return;
			}
			controller.setConfigAndRestart(
				// @ts-expect-error too onerous to manually specify every field in a way that type-checks with fromEntries
				{
					job: configFields.job,
					randomSeed: seed.trim(),
					procMode: configFields.procMode,
					initialResourceOverrides, // info only
					...Object.fromEntries(
						numericFields.map((field) => [
							field,
							parseFloat(configFields[field].toString()),
						]),
					),
				},
				resetRecord,
			);

			setDirty(false);
			setJobOrLevelDirty(false);
			clearImportedFields();
			controller.updateAllDisplay();
			controller.scrollToTime();
		}
	};

	// Stats that use ConfigInputField directly, without any bells and whistles
	const genericInputStats: Array<[keyof ConfigFields, ContentNode]> = [
		["criticalHit", localize({ en: "crit: ", zh: "暴击：" })],
		["directHit", localize({ en: "direct hit: ", zh: "直击：" })],
		["determination", localize({ en: "determination: ", zh: "信念：" })],
		["piety", localize({ en: "piety: ", zh: "信仰：" })],
		["animationLock", localize({ en: "animation lock: ", zh: "能力技后摇：" })],
	];

	const genericInputStatWidgets = genericInputStats.map(([key, description]) => <ConfigInputField
		key={key}
		name={key}
		description={description}
		initial={configFields[key].toString()}
		dispatch={configFieldDispatch}
		imported={importedFields[key]}
		removeImportedField={(key) => removeImportedField(key)}
	/>);

	const editStatsSection = <div style={{ marginBottom: 16 }}>
		<div>
			<span>{localize({ en: "level: ", zh: "等级：" })}</span>
			<select
				style={{ outline: "none", color: fieldColor("level") }}
				value={configFields.level}
				onChange={(e) => configFieldDispatch({ level: e.target.value })}
			>
				{/* hide levels above cap for BLU, unless the file is old and already uses that level */}
				{(configFields.level === "100" || job !== "BLU") && <option
					key={LevelSync.lvl100}
					value={LevelSync.lvl100}
				>
					100
				</option>}
				{(configFields.level === "90" || job !== "BLU") && <option
					key={LevelSync.lvl90}
					value={LevelSync.lvl90}
				>
					90
				</option>}
				<option key={LevelSync.lvl80} value={LevelSync.lvl80}>
					80
				</option>
				<option key={LevelSync.lvl70} value={LevelSync.lvl70}>
					70
				</option>
			</select>
		</div>
		<div>
			<Input
				style={{ display: "inline-block", color: fieldColor("spellSpeed") }}
				defaultValue={configFields.spellSpeed}
				description={localize({ en: "spell speed: ", zh: "咏速：" })}
				onChange={singleDispatch("spellSpeed")}
			/>
			<span>
				{" "}
				(GCD: {spsGcdPreview}{" "}
				<Help
					topic={"gcdPreview"}
					content={
						<>
							<p>
								{localize({
									en: "Preview of displayed GCD based on your spell speed.",
									zh: "当前咏速对应的游戏内显示的GCD.",
								})}
							</p>
							<p>
								{localize({
									en: `Measured average GCD should be ${taxedSpsGcdPreview} due to FPS tax.`,
									zh: `由于帧率税的影响，测量得到的平均GCD为${taxedSpsGcdPreview}。`,
								})}
							</p>
						</>
					}
				/>
				)
			</span>
		</div>
		<div>
			<Input
				style={{ display: "inline-block", color: fieldColor("skillSpeed") }}
				defaultValue={configFields.skillSpeed}
				description={localize({ en: "skill speed: ", zh: "技速：" })}
				onChange={singleDispatch("skillSpeed")}
			/>
			<span>
				{" "}
				(GCD: {sksGcdPreview}{" "}
				<Help
					topic={"sksGcdPreview"}
					content={
						<>
							<p>
								{localize({
									en: "Preview of displayed GCD based on your skill speed.",
									zh: "当前技速对应的游戏内显示的GCD.",
								})}
							</p>
							<p>
								{localize({
									en: `Measured average GCD should be ${taxedSksGcdPreview} due to FPS tax.`,
									zh: `由于帧率税的影响，测量得到的平均GCD为${taxedSksGcdPreview}。`,
								})}
							</p>
						</>
					}
				/>
				)
			</span>
		</div>
		{genericInputStatWidgets}
		<div>
			<Input
				componentColor={fpsAndCorrectionColor}
				style={{ display: "inline-block" }}
				defaultValue={configFields.fps}
				description={localize({ en: "FPS: ", zh: "帧率：" })}
				onChange={singleDispatch("fps")}
			/>
			<span>
				{" "}
				(
				{localize({
					en: `${getDefaultGcd(2.5).toFixed(2)}s w/ tax`,
					zh: `${getDefaultGcd(2.5).toFixed(2)}s+帧率税`,
				})}
				: {getDefaultGcdTax(2.5).toFixed(3)}{" "}
				<Help topic={"gcdTaxPreview"} content={gcdTaxDesc} />)
			</span>
		</div>
		<Input
			componentColor={fpsAndCorrectionColor}
			defaultValue={configFields.gcdSkillCorrection}
			description={
				<span>
					{localize({ en: "GCD correction", zh: "GCD时长修正" })}{" "}
					<Help
						topic={"cast-time-correction"}
						content={localize({
							en: "Leaving this at 0 will probably give you the most accurate simulation. But if you want to manually correct your GCD skill durations (including casts) for whatever reason, you can put a small number (can be negative)",
							zh: "正常情况下填0即能得到最精确的模拟结果。如果实在需要修正的话，这里输入的时长会被加到你的每个GCD技能（包括读条）耗时里（可以为负）",
						})}
					/>
					:{" "}
				</span>
			}
			onChange={singleDispatch("gcdSkillCorrection")}
		/>
		<Input
			defaultValue={configFields.timeTillFirstManaTick}
			description={localize({ en: "time till first MP tick: ", zh: "距首次跳蓝时间：" })}
			onChange={singleDispatch("timeTillFirstManaTick")}
		/>
		<Input
			defaultValue={configFields.countdown}
			description={
				<span>
					{localize({ en: "countdown ", zh: "倒数时间 " })}
					<Help
						topic={"countdown"}
						content={localize({
							en: "can use a negative countdown to start from a specific time of fight",
							zh: "可以是负数，时间轴会从战斗中途某个时间开始显示",
						})}
					/>
					:{" "}
				</span>
			}
			onChange={singleDispatch("countdown")}
		/>
		<Input
			defaultValue={configFields.randomSeed}
			description={
				<span>
					{localize({ en: "random seed ", zh: "随机种子 " })}
					<Help
						topic={"randomSeed"}
						content={localize({
							en: "can be anything, or leave empty to get 4 random digits.",
							zh: "可以是任意字符串，或者留空，会获得4个随机数字",
						})}
					/>
					:{" "}
				</span>
			}
			onChange={singleDispatch("randomSeed")}
		/>
		<div>
			<span>
				{localize({ en: "proc mode ", zh: "随机BUFF获取 " })}
				<Help
					topic={"procMode"}
					content={localize({
						// TODO update to reflect for all jobs
						en: "Default RNG: 40% Firestarter",
						zh: "RNG会像游戏内一样，相应技能40%概率获得火苗，Always则每次都会触发火苗，Never则从不触发。",
					})}
				/>
				:{" "}
			</span>
			<select
				style={{ outline: "none" }}
				value={configFields.procMode}
				onChange={(e) => configFieldDispatch({ procMode: e.target.value as ProcMode })}
			>
				<option key={ProcMode.RNG} value={ProcMode.RNG}>
					RNG
				</option>
				<option key={ProcMode.Never} value={ProcMode.Never}>
					Never
				</option>
				<option key={ProcMode.Always} value={ProcMode.Always}>
					Always
				</option>
			</select>
		</div>
		<ResourceOverrideSection
			job={configFields.job}
			initialResourceOverrides={initialResourceOverrides}
			overrideTimer={overrideTimer}
			overrideStacks={overrideStacks}
			overrideEnabled={overrideEnabled}
			setInitialResourceOverrides={setInitialResourceOverrides}
			selectedOverrideResource={selectedOverrideResource}
			setSelectedOverrideResource={setSelectedOverrideResource}
			setOverrideTimer={setOverrideTimer}
			setOverrideStacks={setOverrideStacks}
			setOverrideEnabled={setOverrideEnabled}
		/>
	</div>;

	return <div style={{ marginBottom: 20 }}>
		<GearImport
			imported={imported}
			setImported={setImported}
			setImportedFields={addImportedFields}
			dispatch={configFieldDispatch}
		/>
		<br />
		{editJobSection}
		<ConfigSummary job={controller.getActiveJob()} dirty={configFields.dirty} />
		{editStatsSection}
		<p style={{ paddingBottom: 5 }}>
			{localize({
				en: "You can also import/export fights from/to local files at the bottom of the page.",
				zh: "页面底部有导入和导出战斗文件相关选项。",
			})}
		</p>
		<div
			className="invisibleScrollbar"
			style={{
				boxSizing: "border-box",
				width: "100%",
				position: "absolute",
				paddingRight: 5,
				paddingLeft: 5,
				bottom: 0,
				left: 0,
				overflowY: "scroll",
			}}
		>
			<div
				style={{
					width: "100%",
					boxSizing: "border-box",
					backgroundColor: colors.background,
					borderTop: "1px solid " + colors.bgMediumContrast,
					paddingTop: 5,
					paddingBottom: 5,
					display: "flex",
					flexDirection: "row",
					justifyContent: "space-between",
					gap: 5,
				}}
			>
				<button
					onClick={(e) => applyConfig(e, false)}
					style={{
						width: "100%",
						fontWeight: !jobOrLevelDirty && configFields.dirty ? "bold" : "normal",
						textDecoration: jobOrLevelDirty ? "line-through" : undefined,
						backgroundColor: jobOrLevelDirty ? colors.background : undefined,
					}}
					disabled={jobOrLevelDirty}
				>
					{localize({ en: "apply", zh: "应用" })}
					{jobOrLevelDirty && " "}
					{jobOrLevelDirty && <Help
						topic="applyWithoutReset"
						content={localize({
							en: "Must reset timeline because job or level changed.",
							zh: "因为职业或等级有变化，必须重置时间轴。",
						})}
					/>}
					{!jobOrLevelDirty && configFields.dirty ? "*" : ""}
				</button>
				<button
					onClick={(e) => applyConfig(e, true)}
					style={{
						width: "100%",
						fontWeight: configFields.dirty ? "bold" : "normal",
					}}
				>
					{localize({ en: "apply and reset", zh: "应用并重置时间轴" })}
					{configFields.dirty ? "*" : ""}
				</button>
			</div>
		</div>
	</div>;
}
