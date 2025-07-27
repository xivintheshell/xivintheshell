import React, {
	CSSProperties,
	useState,
	useEffect,
	useRef,
	useReducer,
	useContext,
	createContext,
	DragEventHandler,
} from "react";
import { controller } from "../Controller/Controller";
import { ActionNode, ActionType, Record, RecordValidStatus } from "../Controller/Record";
import { StaticFn } from "./Common";
import { getCurrentThemeColors, ThemeColors } from "./ColorTheme";
import {
	localize,
	localizeSkillName,
	localizeResourceType,
	localizeSkillUnavailableReason,
	getCurrentLanguage,
} from "./Localization";
import {
	TIMELINE_COLUMNS_HEIGHT,
	updateTimelineView,
	DragLockContext,
	DragTargetContext,
} from "./Timeline";
import { Columns } from "./Common";
import { SkillReadyStatus } from "../Game/Common";

// about 0.25
const HIGHLIGHT_ALPHA_HEX = "3f";

export let refreshTimelineEditor = () => {};
// [sz] It brings me no joy to write another pair of global setter functions that live outside the
// React life cycle, but we don't really have a better way to pass the active timeline slot at the moment.
export let updateInvalidStatus = () => {};
export let updateActiveTimelineEditor = (slotSwapFn: () => void) => {
	slotSwapFn();
};

const EditorDragContext = createContext<
	(i: number) => {
		drop: DragEventHandler<HTMLTableRowElement>;
		setSelected: (b: boolean) => void;
	}
>((i) => {
	return {
		drop: (e) => {},
		setSelected: (b) => {},
	};
});

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

const getDropTargetStyle = (colors: ThemeColors): CSSProperties => {
	return {
		borderTopWidth: "4px",
		borderTopStyle: "solid",
		borderColor: colors.dropTarget,
	};
};

function adjustIndex(i: number | undefined) {
	return (i ?? 0) + 1;
}

function TimelineActionElement(props: {
	index: number;
	node: ActionNode;
	isSelected: boolean;
	recordIsDirty: boolean;
	isInvalid: boolean;
	includeDetails: boolean;
	usedAt: number;
	refObj?: React.RefObject<HTMLTableRowElement | null>;
}) {
	const colors = getCurrentThemeColors();
	// Every other row should be highlighted slightly to provide contrast.
	let bgColor = props.index % 2 === 1 ? colors.bgLowContrast : "transparent";
	// These checks to override background color should happen in this specific order.
	if (props.isSelected) {
		bgColor = "rgba(151,111,246,0.25)";
	}
	if (props.recordIsDirty && props.isSelected) {
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
		{props.isInvalid ? (
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
		<td style={{ ...INDEX_TD_STYLE, ...getBorderStyling(colors) }}>
			{adjustIndex(props.index)}
		</td>
	) : undefined;
	const timestampCell = props.includeDetails ? (
		<td style={{ ...TIMESTAMP_TD_STYLE, ...getBorderStyling(colors) }}>
			{StaticFn.displayTime(props.usedAt, 3)}
		</td>
	) : undefined;
	const [dragTarget, setDragTarget] = useState(false);
	const globalDragTarget = useContext(DragTargetContext);
	const lockContext = useContext(DragLockContext);
	const localEditorContext = useContext(EditorDragContext)(props.index);
	return <tr
		style={{
			...TR_STYLE,
			background: bgColor,
			...(dragTarget ? getDropTargetStyle(colors) : {}),
		}}
		ref={props.refObj ?? null}
		draggable={!lockContext.value}
		onDragStart={(e) => {
			localEditorContext.setSelected(true);
			if (!props.isSelected) {
				controller.timeline.onClickTimelineAction(props.index, false);
			}
		}}
		onDragLeave={(e) => {
			setDragTarget(false);
			globalDragTarget.setDragTarget(null, null);
		}}
		onDrop={(e) => {
			localEditorContext.drop(e);
			setDragTarget(false);
			globalDragTarget.setDragTarget(null, null);
		}}
		onDragOver={(e) => {
			if (!props.isSelected) {
				// preventDefault enables this to receive drops
				e.preventDefault();
				setDragTarget(true);
				globalDragTarget.setDragTarget(props.index, props.usedAt);
			}
		}}
		onClick={(e) => {
			localEditorContext.setSelected(true);
			if (props.recordIsDirty) {
				// controller.record.onClickNode(props.index, e.shiftKey);
				controller.timeline.onClickTimelineAction(props.index, e.shiftKey);
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
	const firstSelected: React.RefObject<HTMLTableRowElement | null> = useRef(null);

	const [isDirty, setDirty] = useState<boolean>(false);
	const [recordValidStatus, setRecordValidStatus] = useState<RecordValidStatus | undefined>(
		undefined,
	);
	const [firstEditedNodeIndex, setFirstEditedNodeIndex] = useState<number | undefined>(undefined);
	const [, forceUpdate] = useReducer((x) => x + 1, 0);
	const bHandledSkillSelectionThisFrame = useRef(false);
	// In previous versions of XIV in the Shell, when using the timeline editor, we created a
	// copy of the record within the TimelineEditor object, and did not reflect any staged
	// edits in the timeline canvas.
	// Now, since we want these changes to be reflected, we must set/unset the controller's stored
	// record as well.
	const savedControllerRecord = useRef<Record | undefined>(undefined);

	useEffect(() => {
		// on mount
		refreshTimelineEditor = () => {
			forceUpdate();
		};
		updateInvalidStatus = () => {
			// This is called by the controller to ensure timestamps are properly propagated to the
			// timeline editor table.
			setRecordValidStatus(controller.checkRecordValidity(controller.record, 0, true));
		};
		// When switching the active timeline slot, we must ensure that the batched edits are
		// discarded.
		updateActiveTimelineEditor = (slotSwapFn) => {
			if (isDirty && savedControllerRecord.current) {
				controller.record = savedControllerRecord.current;
				// Force a redraw
				controller.checkRecordValidity(controller.record, 0, true);
			}
			slotSwapFn();
			setDirty(false);
			// Make sure to update savedControllerRecord.current in case two swaps are done
			// in succession.
			savedControllerRecord.current = controller.record;
			setRecordValidStatus(controller.checkRecordValidity(controller.record, 0, true));
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
		// Check the validity of the current record so we get timestamps of all actions
		// (may be computationally redundant, but this is the easiest thing to do).
		// TODO: figure out how to cleanly propagate this in an idiomatic way in the future.
		setRecordValidStatus(controller.checkRecordValidity(controller.record, 0, true));
		return () => {
			// on unmount
			refreshTimelineEditor = () => {};
		};
	}, []);

	const isValid = recordValidStatus && recordValidStatus.isValid;

	const markClean = (restoreSavedRecord: boolean) => {
		if (restoreSavedRecord && savedControllerRecord.current) {
			controller.record = savedControllerRecord.current;
		}
		setDirty(false);
		setRecordValidStatus(controller.checkRecordValidity(controller.record, 0, true));
		setFirstEditedNodeIndex(undefined);
	};

	const buttonMarginLeft = 5;

	const discardEditsBtn = () => {
		return <button
			style={{ display: "block", marginTop: 10, marginLeft: buttonMarginLeft }}
			onClick={(e) => {
				bHandledSkillSelectionThisFrame.current = true;
				// discard edits
				if (!isDirty) {
					console.error("attempted to discard edits while timeline editor was not dirty");
				}
				markClean(true);
			}}
		>
			{localize({ en: "discard changes", zh: "放弃更改" })}
		</button>;
	};

	const getRecordCopy = () => {
		if (isDirty) {
			return controller.record;
		} else {
			// To ensure edits reflect in the timeline canvas, we need to temporarily override
			// the controller's active record. We will restore it if edits are discarded.
			savedControllerRecord.current = controller.record;
			controller.record = controller.record.getCloneWithSharedConfig();
			setDirty(true);
			return controller.record;
		}
	};

	const getInvalidActionMessage = (
		invalidAction:
			| {
					node: ActionNode;
					index: number;
					reason: SkillReadyStatus;
			  }
			| undefined,
		inSequence: boolean,
	) => {
		const node = invalidAction?.node;
		const index = invalidAction?.index;
		const reason = invalidAction?.reason;
		const isEn = getCurrentLanguage() === "en";
		const l = (en: string, zh: string) => (isEn ? en : zh);
		let nodeName = l("(unknown node)", "（未知节点）");
		if (node) {
			if (node.info.type === ActionType.Wait) {
				nodeName = l("(Wait)", "（等待）");
			} else if (node.info.type === ActionType.JumpToTimestamp) {
				nodeName = l("(Jump to time)", "（跳到时间）");
			} else if (node.info.type === ActionType.WaitForMP) {
				nodeName = l("(Wait for MP/lucid tick)", "（快进到挑篮/跳星梦）");
			} else if (node.info.type === ActionType.SetResourceEnabled) {
				const localizedBuffName = localizeResourceType(node.info.buffName);
				nodeName = l(
					"(Toggle resource " + localizedBuffName + ")",
					"（开关或去除BUFF： " + localizedBuffName + "）",
				);
			} else if (node.info.type === ActionType.Skill) {
				nodeName = node.info.skillName
					? localizeSkillName(node.info.skillName)
					: l("(unknown skill)", "（未知技能）");
			}
		}
		let errorMessage: string;
		const invalidTime =
			index !== undefined ? recordValidStatus?.skillUseTimes[index] : undefined;
		const localizedReason =
			reason?.unavailableReasons.map(localizeSkillUnavailableReason).join(l("; ", "、")) ??
			localizeSkillUnavailableReason(undefined);
		if (inSequence) {
			errorMessage = l(
				`This sequence contains invalid actions! Check action #${adjustIndex(index)}: ${nodeName}`,
				`此时间轴包含有问题的技能！请检查在第${adjustIndex(index)}位的技能： ${nodeName}`,
			);
		} else {
			errorMessage = l(`This action is invalid! ${nodeName}`, `此技能有问题！ ${nodeName}`);
		}
		if (invalidTime !== undefined) {
			const timeStr = StaticFn.displayTime(invalidTime, 3);
			errorMessage += ` @ ${timeStr}` + l(".", "。");
		}
		return {
			en: <>
				{errorMessage}
				<br />
				<br />
				Reason: {localizedReason}
			</>,
			zh: <>
				{errorMessage}
				<br />
				<br />
				理由：{localizedReason}
			</>,
		};
	};

	// left: toolbar
	const applyTextStyle = { padding: "0.3em" };
	const applySection = () => {
		if (isDirty) {
			return <div>
				<div
					style={{
						...applyTextStyle,
						backgroundColor:
							(isValid ? colors.editingValid : colors.editingInvalid) +
							HIGHLIGHT_ALPHA_HEX,
					}}
				>
					{isValid
						? localize({
								en: "This edited sequence is valid.",
								zh: "此编辑可被应用。",
							})
						: localize(
								getInvalidActionMessage(recordValidStatus?.invalidActions[0], true),
							)}
				</div>
				<button
					style={{ display: "block", marginTop: 10, marginLeft: buttonMarginLeft }}
					onClick={(e) => {
						bHandledSkillSelectionThisFrame.current = true;

						// would show only after editing properties
						// apply edits to timeline
						if (isDirty) {
							controller.applyEditedRecord();
						} else {
							console.error(
								"attempted to apply edits while timeline editor was not dirty",
							);
						}
						markClean(false);

						controller.displayCurrentState();
					}}
				>
					{localize({
						en: "apply changes to timeline and save",
						zh: "应用并保存编辑。",
					})}
				</button>
				{discardEditsBtn()}
			</div>;
		} else {
			if (isValid) {
				return <div style={applyTextStyle}>
					{localize({ en: "Timeline is up to date.", zh: "时间轴已与编辑器同步。" })}
				</div>;
			} else {
				// There are three different error messages if the timeline is invalid.
				const invalidIndexMap = new Map<
					number,
					{ index: number; node: ActionNode; reason: SkillReadyStatus }
				>();
				recordValidStatus?.invalidActions.forEach((info) =>
					invalidIndexMap.set(info.index, info),
				);
				const firstInvalidAction = recordValidStatus?.invalidActions[0];
				let invalidActionToShow = firstInvalidAction;
				let inSequence = true;
				const displayedRecord = controller.record;
				if (
					firstInvalidAction !== undefined &&
					displayedRecord.selectionStartIndex !== undefined
				) {
					// could be written more efficiently, but who cares
					const firstSelectedInvalid = recordValidStatus?.invalidActions.find((info) =>
						displayedRecord.isInSelection(info.index),
					);
					const selectionLength = displayedRecord.getSelectionLength();
					if (selectionLength === 1 && firstSelectedInvalid !== undefined) {
						// 1. The user has selected a single skill, and that skill is invalid.
						// In this case, display the error for this specific skill.
						invalidActionToShow = invalidIndexMap.get(
							displayedRecord.selectionStartIndex!,
						);
						inSequence = false;
					} else if (selectionLength > 1 && firstSelectedInvalid !== undefined) {
						// 2. The user has selected a range of skills, and one of them is invalid.
						// In this case, display the error of the first selected skill in this range.
						invalidActionToShow = firstSelectedInvalid;
					}
				}
				// 3. The user has not made a selection, or the selected action is not
				// part of the selection. If this is the case, indicate where the first
				// invalid action in the whole timeline is.
				return <div>
					<div
						style={{
							...applyTextStyle,
							backgroundColor: colors.editingInvalid + HIGHLIGHT_ALPHA_HEX,
						}}
					>
						{localize(getInvalidActionMessage(invalidActionToShow, inSequence))}
					</div>
				</div>;
			}
		}
	};
	const buttonStyle: CSSProperties = {
		display: "block",
		width: "100%",
		marginBottom: 10,
		padding: 3,
	};
	const doRecordEdit = (action: (record: Record) => number | undefined) => {
		if (controller.record.getFirstSelection()) {
			bHandledSkillSelectionThisFrame.current = true;
			const copy = getRecordCopy();
			let currentEditedNodeIndex = firstEditedNodeIndex;
			const firstEditedNode = action(copy);
			if (firstEditedNode !== undefined) {
				if (currentEditedNodeIndex === undefined) {
					currentEditedNodeIndex = firstEditedNode;
				} else {
					currentEditedNodeIndex = Math.min(firstEditedNode, currentEditedNodeIndex);
				}
			}
			const status = controller.checkRecordValidity(copy, currentEditedNodeIndex);
			if (firstEditedNode !== undefined && status.straightenedIfValid) {
				controller.record = status.straightenedIfValid;
				setFirstEditedNodeIndex(undefined);
			} else {
				setFirstEditedNodeIndex(currentEditedNodeIndex);
			}
			setRecordValidStatus(status as RecordValidStatus);
			updateTimelineView();
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
	const invalidIndices = new Set(recordValidStatus?.invalidActions.map((ac) => ac.index));
	controller.record.actions.forEach((action, i) => {
		const isFirstSelected = !isDirty && i === controller.record.selectionStartIndex;
		actionsList.push(
			<TimelineActionElement
				key={i}
				index={i}
				node={action}
				isSelected={controller.record.isInSelection(i)}
				recordIsDirty={isDirty}
				isInvalid={invalidIndices.has(i)}
				usedAt={recordValidStatus?.skillUseTimes[i] ?? 0}
				includeDetails={includeDetails}
				refObj={isFirstSelected ? firstSelected : undefined}
			/>,
		);
	});

	// We only allow dragging if an element is currently selected.
	// This weird useRef structure lets us minimize the amount of re-rendering necessary by
	// pushing CSS styling state down to each individual <tr> element. I did not empirically measure
	// the performance difference, but it seems like this would cause a lot of overhead otherwise.
	const dragHandlers = (i: number) => {
		return {
			drop: (e: React.DragEvent) => {
				const start = controller.record.selectionStartIndex ?? 0;
				let distance = i - (start ?? 0);
				// If we need to move the item upwards, then we already have the correct offset.
				// If it needs to move down, we need to subtract the length of the current selection.
				if (distance > 0) {
					distance -= controller.record.getSelectionLength();
				}
				if (distance !== 0) {
					doRecordEdit((record) => record.moveSelected(distance));
				}
			},
			setSelected: (b: boolean) => {
				bHandledSkillSelectionThisFrame.current = b;
			},
		};
	};
	// Add a dummy footer <tr> at the end of the list to allow dragging an element to the end.
	const [endDragTarget, setEndDragTarget] = useState(false);
	const lockContext = useContext(DragLockContext);
	const globalDragTarget = useContext(DragTargetContext);
	if (actionsList.length > 0) {
		const actionCount = actionsList.length;
		const dragHandler = dragHandlers(actionCount);
		actionsList.push(
			<tr
				key={actionCount}
				tabIndex={-1}
				style={{
					height: "0.8em",
					background: colors.bgHighContrast,
					userSelect: "none",
					...(endDragTarget ? getDropTargetStyle(colors) : {}),
				}}
				draggable={!lockContext.value}
				onDragStart={(e) => e.preventDefault()}
				onDragEnter={() => console.log("entered last")}
				onDragLeave={(e) => {
					setEndDragTarget(false);
					globalDragTarget.setDragTarget(null, null);
				}}
				onDrop={(e) => {
					setEndDragTarget(false);
					dragHandler.drop(e);
					globalDragTarget.setDragTarget(null, null);
				}}
				onDragOver={(e) => {
					// preventDefault enables this to receive drops
					if (controller.record.selectionEndIndex !== actionCount - 1) {
						e.preventDefault();
						setEndDragTarget(true);
						globalDragTarget.setDragTarget(
							actionCount,
							controller.game.getDisplayTime(),
						);
					}
				}}
			>
				<td style={{ border: "none" }}></td>
				<td style={{ border: "none" }}></td>
				<td style={{ border: "none" }}></td>
			</tr>,
		);
	}

	const thStyle: CSSProperties = {
		backgroundColor: colors.bgHighContrast,
	};
	return <div
		onClick={(evt) => {
			if (!evt.shiftKey && !bHandledSkillSelectionThisFrame.current) {
				controller.record.unselectAll();
				controller.displayCurrentState();
			}
			bHandledSkillSelectionThisFrame.current = false;
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
									{localize({ en: "Actions", zh: "技能" })}
								</th>
							</tr>
						</thead>
						<tbody>
							<EditorDragContext.Provider value={dragHandlers}>
								{actionsList}
							</EditorDragContext.Provider>
						</tbody>
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
