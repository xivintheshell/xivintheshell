import React, { CSSProperties } from "react";
import { controller } from "../Controller/Controller";
import { ActionNode, ActionType, Record, RecordValidStatus } from "../Controller/Record";
import { StaticFn } from "./Common";
import { localize, localizeSkillName, localizeResourceType } from "./Localization";
import { TIMELINE_COLUMNS_HEIGHT } from "./Timeline";
import { Columns } from "./Common";
import { ACTIONS } from "../Game/Data";

export let refreshTimelineEditor = () => {};

let bHandledSkillSelectionThisFrame: boolean = false;
function setHandledSkillSelectionThisFrame(handled: boolean) {
	bHandledSkillSelectionThisFrame = handled;
}

function TimelineActionElement(props: {
	index: number;
	node: ActionNode;
	isSelected: boolean;
	belongingRecord: Record;
	isFirstInvalid: boolean;
	refObj?: React.RefObject<HTMLDivElement>;
}) {
	let recordIsDirty = props.belongingRecord !== controller.record;
	let bgColor = props.isSelected ? "rgba(151,111,246,0.25)" : "transparent";
	if (recordIsDirty && props.isSelected) {
		bgColor = "rgba(255, 220, 0, 0.25)";
	}
	let style: CSSProperties = {
		flex: 1,
		position: "relative",
		userSelect: "none",
		padding: "0.075em 6px",
		background: bgColor,
	};
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
			en: "(wait for " + props.node.info.waitDuration.toFixed(2) + "s)",
			zh: "（等" + props.node.info.waitDuration.toFixed(2) + "秒）",
		});
	} else if (props.node.info.type === ActionType.SetResourceEnabled) {
		const localizedBuffName = localizeResourceType(props.node.info.buffName);
		name = localize({
			en: "(toggle resource: " + localizedBuffName + ")",
			zh: "（开关或去除BUFF：" + localizedBuffName + "）",
		});
	}
	return <div
		style={style}
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
		{props.isFirstInvalid ? (
			<span
				style={{
					marginRight: 6,
					padding: "0 4px",
					backgroundColor: "rgba(255, 0, 0, 0.25)",
				}}
			>
				&rarr;
			</span>
		) : undefined}
		<span>{name}</span>
	</div>;
}

export let scrollEditorToFirstSelected = () => {};

export class TimelineEditor extends React.Component {
	state: {
		editedRecord: Record | undefined;
		recordValidStatus: RecordValidStatus | undefined;
		firstEditedNodeIndex: number | undefined;
	};
	firstSelected: React.RefObject<HTMLDivElement>;
	constructor(props: {}) {
		super(props);
		this.state = {
			editedRecord: undefined,
			recordValidStatus: undefined,
			firstEditedNodeIndex: undefined,
		};
		// @ts-expect-error for some reason, newer versions allow the type to be RefObject<elem | null>
		this.firstSelected = React.createRef();
	}
	componentDidMount() {
		refreshTimelineEditor = () => {
			this.forceUpdate();
		};
		scrollEditorToFirstSelected = () => {
			// lmfao this dirty hack again
			setTimeout(() => {
				if (this.firstSelected.current) {
					this.firstSelected.current.scrollIntoView({
						behavior: "smooth",
						block: "nearest",
					});
				}
			}, 0);
		};
	}
	componentWillUnmount() {
		refreshTimelineEditor = () => {};
	}

	isDirty() {
		return this.state.editedRecord !== undefined;
	}

	isValid() {
		return this.state.recordValidStatus && this.state.recordValidStatus.isValid;
	}

	markClean() {
		this.setState({
			editedRecord: undefined,
			recordValidStatus: undefined,
			firstEditedNodeIndex: undefined,
		});
	}

	discardEditsBtn() {
		return <button
			style={{ display: "block", marginTop: 10 }}
			onClick={(e) => {
				setHandledSkillSelectionThisFrame(true);
				// discard edits
				if (!this.state.editedRecord) {
					console.assert(false);
				}
				this.markClean();
			}}
		>
			discard changes
		</button>;
	}

	getRecordCopy() {
		if (this.state.editedRecord) {
			return this.state.editedRecord;
		} else {
			let edited = controller.record.getCloneWithSharedConfig();
			this.setState({ editedRecord: edited });
			return edited;
		}
	}

	render() {
		let displayedRecord = this.isDirty()
			? (this.state.editedRecord as Record)
			: controller.record;

		// left: toolbar
		let applySection = () => {
			if (this.isDirty()) {
				if (this.isValid()) {
					return <div>
						<div style={{ backgroundColor: "rgba(255, 220, 0, 0.25)" }}>
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
								if (this.state.editedRecord) {
									// this.state.editedRecord should always update to something that can be replayed exactly
									// because it comes from status.straightenedIfValid
									controller.applyEditedRecord(this.state.editedRecord);
								} else {
									console.assert(false);
								}
								this.markClean();

								controller.displayCurrentState();
							}}
						>
							apply changes to timeline and save
						</button>
						{this.discardEditsBtn()}
					</div>;
				} else {
					let node = this.state.recordValidStatus?.firstInvalidAction;
					let nodeName = "(unknown node)";
					if (node) {
						if (node.info.type === ActionType.Wait) {
							nodeName = "(Wait)";
						} else if (node.info.type === ActionType.SetResourceEnabled) {
							nodeName = "(Toggle resource " + node.info.buffName + ")";
						} else if (node.info.type === ActionType.Skill) {
							nodeName = node.info.skillName
								? ACTIONS[node.info.skillName].name
								: "(unknown skill)";
						}
					}
					let errorMessage = "This sequence contains invalid actions! Check: " + nodeName;
					if (this.state.recordValidStatus?.invalidTime) {
						const timeStr = StaticFn.displayTime(
							this.state.recordValidStatus.invalidTime,
							3,
						);
						errorMessage += ` @ ${timeStr}`;
					}
					errorMessage += ` (${this.state.recordValidStatus?.invalidReason ?? "(unknown)"})`;
					return <div>
						<div style={{ backgroundColor: "rgba(255, 0, 0, 0.25)" }}>
							{errorMessage}
						</div>
						{this.discardEditsBtn()}
					</div>;
				}
			} else {
				return <div>
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
				let copy = this.getRecordCopy();
				let currentEditedNodeIndex = this.state.firstEditedNodeIndex;
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
					this.setState({
						editedRecord: status.straightenedIfValid,
						firstEditedNodeIndex: undefined,
					});
				} else {
					this.setState({
						firstEditedNodeIndex: currentEditedNodeIndex,
					});
				}
				this.setState({
					recordValidStatus: status,
				});
			}
		};
		let toolbar = <div style={{ marginBottom: 6, flex: 1 }}>
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

		// mid: actions list
		let actionsList: React.JSX.Element[] = [];
		displayedRecord.actions.forEach((action, i) => {
			const isFirstSelected = !this.isDirty() && i === displayedRecord.selectionStartIndex;
			actionsList.push(
				<TimelineActionElement
					key={i}
					index={i}
					node={action}
					isSelected={displayedRecord.isInSelection(i)}
					belongingRecord={displayedRecord}
					isFirstInvalid={this.state.recordValidStatus?.firstInvalidAction === action}
					refObj={isFirstSelected ? this.firstSelected : undefined}
				/>,
			);
		});
		return <div
			onClick={(evt) => {
				if (!evt.shiftKey && !bHandledSkillSelectionThisFrame) {
					if (!this.isDirty()) {
						controller.record.unselectAll();
						controller.displayCurrentState();
					} else {
						refreshTimelineEditor();
						this.state.editedRecord?.unselectAll();
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
						content: <>{actionsList}</>,
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
}
