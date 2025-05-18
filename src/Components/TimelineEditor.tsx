import React, { CSSProperties, useState, useEffect, useReducer } from "react";
import { controller } from "../Controller/Controller";
import { ActionNode, ActionType, Record, RecordValidStatus } from "../Controller/Record";
import { StaticFn } from "./Common";
import { getCurrentThemeColors, ThemeColors } from "./ColorTheme";
import {
	localize,
	localizeSkillName,
	localizeResourceType,
	localizeSkillUnavailableReason,
} from "./Localization";
import { TIMELINE_COLUMNS_HEIGHT } from "./Timeline";
import { Columns } from "./Common";

// about 0.25
const HIGHLIGHT_ALPHA_HEX = "3f";

export let refreshTimelineEditor = () => {};

let bHandledSkillSelectionThisFrame: boolean = false;
function setHandledSkillSelectionThisFrame(handled: boolean) {
	bHandledSkillSelectionThisFrame = handled;
}

const getBorderStyling = (colors: ThemeColors) => {
	return {
		borderColor: colors.bgMediumContrast,
		borderWidth: "1px",
		borderStyle: "solid",
	};
};

const INDEX_TD_STYLE: CSSProperties = {
	width: "1.5%",
	textAlign: "right",
	paddingRight: "0.3em",
	paddingLeft: "0.3em",
};

const TIMESTAMP_TD_STYLE: CSSProperties = {
	width: "12%",
	textAlign: "right",
	paddingRight: "0.3em",
	paddingLeft: "0.3em",
};

const ACTION_TD_STYLE: CSSProperties = {
	width: "86.5%",
	textAlign: "left",
	paddingLeft: "0.3em",
};

const TR_STYLE: CSSProperties = {
	height: "1.6em",
	userSelect: "none",
};

function TimelineActionElement(props: {
	index: number;
	node: ActionNode;
	isSelected: boolean;
	belongingRecord: Record;
	isFirstInvalid: boolean;
	includeDetails: boolean;
	usedAt: number;
	refObj?: React.RefObject<HTMLTableRowElement>;
}) {
	const colors = getCurrentThemeColors();
	let recordIsDirty = props.belongingRecord !== controller.record;
	// Every other row should be highlighted slightly to provide contrast.
	let bgColor = props.index % 2 === 1 ? colors.bgLowContrast : "transparent";
	// These checks to override background color should happen in this specific order.
	if (props.isSelected) {
		bgColor = "rgba(151,111,246,0.25)";
	}
	if (recordIsDirty && props.isSelected) {
		bgColor = colors.editingValid + HIGHLIGHT_ALPHA_HEX;
	}
	let name = localize({ en: "(other)", zh: "（其它）" });
	if (props.node.info.type === ActionType.Skill) {
		const targetStr =
			props.node.info.targetCount > 1
				? localize({
						en: ` (${props.node.info.targetCount} targets)`,
						zh: `（${props.node.info.targetCount}个目标）`,
					})
				: "";
		name = props.node.info.skillName
			? localizeSkillName(props.node.info.skillName) + targetStr
			: localize({ en: "(unknown skill)", zh: "未知技能" });
	} else if (props.node.info.type === ActionType.Wait) {
		name = localize({
			en: "(wait for " + props.node.info.waitDuration.toFixed(3) + "s)",
			zh: "（等" + props.node.info.waitDuration.toFixed(3) + "秒）",
		});
	} else if (props.node.info.type === ActionType.JumpToTimestamp) {
		name = localize({
			en: "(jump to time " + StaticFn.displayTime(props.node.info.targetTime, 3) + ")",
			zh: "（跳到时间 " + StaticFn.displayTime(props.node.info.targetTime, 3) + "）",
		});
	} else if (props.node.info.type === ActionType.WaitForMP) {
		name = localize({
			en: "(wait until MP/lucid tick)",
			zh: "（快进至跳蓝/跳醒梦）",
		});
	} else if (props.node.info.type === ActionType.SetResourceEnabled) {
		const localizedBuffName = localizeResourceType(props.node.info.buffName);
		name = localize({
			en: "(toggle resource: " + localizedBuffName + ")",
			zh: "（开关或去除BUFF：" + localizedBuffName + "）",
		});
	}
	const skillNameCell = <td style={{ ...ACTION_TD_STYLE, ...getBorderStyling(colors) }}>
		{props.isFirstInvalid ? (
			<span
				style={{
					marginRight: 6,
					padding: "0 4px",
					backgroundColor: colors.editingInvalid + HIGHLIGHT_ALPHA_HEX,
				}}
			>
				&rarr;
			</span>
		) : undefined}
		<span>{name}</span>
	</td>;
	const indexCell = props.includeDetails ? (
		<td style={{ ...INDEX_TD_STYLE, ...getBorderStyling(colors) }}>{props.index}</td>
	) : undefined;
	const timestampCell = props.includeDetails ? (
		<td style={{ ...TIMESTAMP_TD_STYLE, ...getBorderStyling(colors) }}>
			{StaticFn.displayTime(props.usedAt, 3)}
		</td>
	) : undefined;
	return <tr
		style={{ ...TR_STYLE, background: bgColor }}
		ref={props.refObj ?? null}
		onClick={(e) => {
			setHandledSkillSelectionThisFrame(true);
			if (recordIsDirty) {
				props.belongingRecord.onClickNode(props.index, e.shiftKey);
				refreshTimelineEditor();
			} else {
				controller.timeline.onClickTimelineAction(props.index, e.shiftKey);
				if (props.node.tmp_startLockTime) {
					controller.scrollToTime(props.node.tmp_startLockTime);
				}
			}
		}}
	>
		{indexCell}
		{timestampCell}
		{skillNameCell}
	</tr>;
}

export let scrollEditorToFirstSelected = () => {};

export function TimelineEditor() {
	const colors = getCurrentThemeColors();
	// @ts-expect-error for some reason, newer versions allow the type to be RefObject<elem | null>
	const firstSelected: React.RefObject<HTMLTableRowElement> = React.createRef();

	const [editedRecord, setEditedRecord] = useState<Record | undefined>(undefined);
	const [recordValidStatus, setRecordValidStatus] = useState<RecordValidStatus | undefined>(
		undefined,
	);
	const [firstEditedNodeIndex, setFirstEditedNodeIndex] = useState<number | undefined>(undefined);
	const [, forceUpdate] = useReducer((x) => x + 1, 0);

	useEffect(() => {
		// on mount
		refreshTimelineEditor = () => {
			forceUpdate();
		};
		scrollEditorToFirstSelected = () => {
			// lmfao this dirty hack again
			setTimeout(() => {
				if (firstSelected.current) {
					firstSelected.current.scrollIntoView({
						behavior: "smooth",
						block: "nearest",
					});
				}
			}, 0);
		};
		return () => {
			// on unmount
			refreshTimelineEditor = () => {};
		};
	}, []);

	const isDirty = editedRecord !== undefined;
	const isValid = recordValidStatus && recordValidStatus.isValid;

	const markClean = () => {
		setEditedRecord(undefined);
		setRecordValidStatus(undefined);
		setFirstEditedNodeIndex(undefined);
	};

	const discardEditsBtn = () => {
		return <button
			style={{ display: "block", marginTop: 10 }}
			onClick={(e) => {
				setHandledSkillSelectionThisFrame(true);
				// discard edits
				if (!editedRecord) {
					console.assert(false);
				}
				markClean();
			}}
		>
			discard changes
		</button>;
	};

	const getRecordCopy = () => {
		if (editedRecord) {
			return editedRecord;
		} else {
			let edited = controller.record.getCloneWithSharedConfig();
			setEditedRecord(edited);
			return edited;
		}
	};

	const displayedRecord = isDirty ? editedRecord : controller.record;

	// left: toolbar
	const applyTextStyle = { padding: "0.3em" };
	const applySection = () => {
		if (isDirty) {
			if (isValid) {
				return <div>
					<div
						style={{
							...applyTextStyle,
							backgroundColor: colors.editingValid + HIGHLIGHT_ALPHA_HEX,
						}}
					>
						{localize({
							en: "This edited sequence is valid.",
							zh: "此编辑可被应用。",
						})}
					</div>
					<button
						style={{ display: "block", marginTop: 10 }}
						onClick={(e) => {
							setHandledSkillSelectionThisFrame(true);

							// would show only after editing properties
							// apply edits to timeline
							if (editedRecord) {
								// this.state.editedRecord should always update to something that can be replayed exactly
								// because it comes from status.straightenedIfValid
								controller.applyEditedRecord(editedRecord);
							} else {
								console.assert(false);
							}
							markClean();

							controller.displayCurrentState();
						}}
					>
						apply changes to timeline and save
					</button>
					{discardEditsBtn()}
				</div>;
			} else {
				const firstInvalidAction = recordValidStatus?.invalidActions[0];
				const node = firstInvalidAction?.node;
				const index = firstInvalidAction?.index;
				let nodeNameEn = "(unknown node)";
				let nodeNameZh = "（未知节点）";
				if (node) {
					if (node.info.type === ActionType.Wait) {
						nodeNameEn = "(Wait)";
						nodeNameZh = "（等待）";
					} else if (node.info.type === ActionType.JumpToTimestamp) {
						nodeNameEn = "(Jump to time)";
						nodeNameZh = "（跳到时间）";
					} else if (node.info.type === ActionType.WaitForMP) {
						nodeNameEn = "(Wait for MP/lucid tick)";
						nodeNameZh = "（快进到挑篮/跳星梦）";
					} else if (node.info.type === ActionType.SetResourceEnabled) {
						const localizedBuffName = localizeResourceType(node.info.buffName);
						nodeNameEn = "(Toggle resource " + localizedBuffName + ")";
						nodeNameZh = "（开关或去除BUFF： " + localizedBuffName + "）";
					} else if (node.info.type === ActionType.Skill) {
						nodeNameEn = node.info.skillName
							? localizeSkillName(node.info.skillName)
							: "(unknown skill)";
						nodeNameZh = node.info.skillName
							? localizeSkillName(node.info.skillName)
							: "（未知技能）";
					}
				}
				let errorMessageEn = `This sequence contains invalid actions! Check action #${index}: ${nodeNameEn}`;
				let errorMessageZh = `此编辑有出意外地行动！请查看在${index}位的行动： ${nodeNameZh}`;
				const invalidTime = index !== undefined ? recordValidStatus?.skillUseTimes[index] : undefined;
				if (invalidTime !== undefined) {
					const timeStr = StaticFn.displayTime(invalidTime, 3);
					errorMessageEn += ` @ ${timeStr}`;
					errorMessageZh += ` @ ${timeStr}`;
				}
				const localizedReason =
					firstInvalidAction?.reason.unavailableReasons
						.map(localizeSkillUnavailableReason)
						.join("; ") ?? localizeSkillUnavailableReason(undefined);
				errorMessageEn += ` (${localizedReason})`;
				errorMessageZh += `（${localizedReason}）`;
				return <div>
					<div
						style={{
							...applyTextStyle,
							backgroundColor: colors.editingInvalid + HIGHLIGHT_ALPHA_HEX,
						}}
					>
						{localize({ en: errorMessageEn, zh: errorMessageZh })}
					</div>
					{discardEditsBtn()}
				</div>;
			}
		} else {
			return <div style={applyTextStyle}>
				{localize({ en: "timeline is up to date.", zh: "时间轴已与编辑器同步。" })}
			</div>;
		}
	};
	let buttonStyle: CSSProperties = {
		display: "block",
		width: "100%",
		marginBottom: 10,
		padding: 3,
	};
	const doRecordEdit = (action: (record: Record) => number | undefined) => {
		if (displayedRecord.getFirstSelection()) {
			setHandledSkillSelectionThisFrame(true);
			let copy = getRecordCopy();
			let currentEditedNodeIndex = firstEditedNodeIndex;
			let firstEditedNode = action(copy);
			if (firstEditedNode !== undefined) {
				if (currentEditedNodeIndex === undefined) {
					currentEditedNodeIndex = firstEditedNode;
				} else {
					currentEditedNodeIndex = Math.min(firstEditedNode, currentEditedNodeIndex);
				}
			}
			let status = controller.checkRecordValidity(copy, currentEditedNodeIndex);
			if (firstEditedNode !== undefined && status.straightenedIfValid) {
				setEditedRecord(status.straightenedIfValid);
				setFirstEditedNodeIndex(undefined);
			} else {
				setFirstEditedNodeIndex(currentEditedNodeIndex);
			}
			setRecordValidStatus(status as RecordValidStatus);
		}
	};
	const toolbar = <div style={{ marginBottom: 6, flex: 1 }}>
		<button
			style={buttonStyle}
			onClick={(e) => doRecordEdit((record) => record.moveSelected(-1))}
		>
			{localize({ en: "move up", zh: "上移" })}
		</button>

		<button
			style={buttonStyle}
			onClick={(e) => doRecordEdit((record) => record.moveSelected(1))}
		>
			{localize({ en: "move down", zh: "下移" })}
		</button>

		<button
			style={buttonStyle}
			onClick={(e) => doRecordEdit((record) => record.deleteSelected())}
		>
			{localize({ en: "delete selected", zh: "删除所选" })}
		</button>

		<button
			style={buttonStyle}
			onClick={(e) =>
				doRecordEdit((record) => {
					const selectionLength = record.getSelectionLength();
					if (selectionLength > 1) {
						// To make use of the existing moveSelected abstraction, we do the following:
						// 1. Deselect everything except the current tail
						// 2. Call `moveSelected(-1 * (selectionLength - 1))`
						// 3. Call `selectUntil` on the original range
						const originalStart = record.selectionStartIndex!;
						const originalEnd = record.selectionEndIndex!;
						record.selectSingle(originalEnd);
						record.moveSelected(-(selectionLength - 1));
						record.selectSingle(originalStart);
						record.selectUntil(originalEnd);
						return record.selectionStartIndex;
					}
					return undefined;
				})
			}
		>
			{localize({
				en: <>
					move end of selection
					<br />
					to start of selection
				</>,
				zh: <>
					将选中的最后一个技能节点
					<br />
					移到选区最前
				</>,
			})}
		</button>
	</div>;

	const includeDetails = true;

	// mid: actions list
	const actionsList: React.JSX.Element[] = [];
	const firstInvalidIndex = recordValidStatus?.invalidActions[0]?.index;
	displayedRecord.actions.forEach((action, i) => {
		const isFirstSelected = !isDirty && i === displayedRecord.selectionStartIndex;
		actionsList.push(
			<TimelineActionElement
				key={i}
				index={i}
				node={action}
				isSelected={displayedRecord.isInSelection(i)}
				belongingRecord={displayedRecord}
				isFirstInvalid={firstInvalidIndex === i}
				usedAt={recordValidStatus?.skillUseTimes[i] ?? 0}
				includeDetails={includeDetails}
				refObj={isFirstSelected ? firstSelected : undefined}
			/>,
		);
	});
	const thStyle: CSSProperties = {
		backgroundColor: colors.bgHighContrast,
	};
	return <div
		onClick={(evt) => {
			if (!evt.shiftKey && !bHandledSkillSelectionThisFrame) {
				if (!isDirty) {
					controller.record.unselectAll();
					controller.displayCurrentState();
				} else {
					refreshTimelineEditor();
					editedRecord?.unselectAll();
				}
			}
			setHandledSkillSelectionThisFrame(false);
		}}
	>
		<Columns contentHeight={TIMELINE_COLUMNS_HEIGHT}>
			{[
				{
					content: toolbar,
					defaultSize: 20,
				},
				{
					content: <table
						style={{
							borderCollapse: "collapse",
							borderColor: colors.bgMediumContrast,
							borderWidth: "1px",
							borderStyle: "solid",
						}}
					>
						<thead>
							<tr style={TR_STYLE}>
								{includeDetails && <th
									className="stickyTh"
									style={{
										...thStyle,
										...INDEX_TD_STYLE,
										...getBorderStyling(colors),
									}}
								>
									#
								</th>}
								{includeDetails && <th
									className="stickyTh"
									style={{
										...thStyle,
										...TIMESTAMP_TD_STYLE,
										...getBorderStyling(colors),
									}}
								>
									{localize({ en: "Time", zh: "时间" })}
								</th>}
								<th
									className="stickyTh"
									style={{
										...thStyle,
										...ACTION_TD_STYLE,
										...getBorderStyling(colors),
									}}
								>
									{localize({ en: "Actions", zh: "行动" })}
								</th>
							</tr>
						</thead>
						<tbody>{actionsList}</tbody>
					</table>,
					defaultSize: 40,
					fullBorder: true,
				},
				{
					content: applySection(),
					defaultSize: 40,
					fullBorder: true,
				},
			]}
		</Columns>
	</div>;
}
