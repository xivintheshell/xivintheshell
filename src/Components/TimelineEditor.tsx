import React, {CSSProperties} from "react";
import {controller} from "../Controller/Controller";
import {ActionNode, ActionType, Record, RecordValidStatus} from "../Controller/Record";
import {localize, localizeSkillName} from "./Localization";
import {getCurrentThemeColors} from "./ColorTheme";
import {TIMELINE_SETTINGS_HEIGHT} from "./Timeline";

export let refreshTimelineEditor = ()=>{};

let bHandledSkillSelectionThisFrame : boolean = false;
function setHandledSkillSelectionThisFrame(handled : boolean) {
	bHandledSkillSelectionThisFrame = handled;
}

function TimelineActionElement(props: {
	node: ActionNode,
	belongingRecord: Record,
	isFirstInvalid: boolean,
	refObj?: React.RefObject<HTMLDivElement>
}) {
	let recordIsDirty = props.belongingRecord !== controller.record;
	let bgColor = props.node.isSelected() ? "rgba(151,111,246,0.25)" : "transparent";
	if (recordIsDirty && props.node.isSelected()) {
		bgColor = "rgba(255, 220, 0, 0.25)";
	}
    let style : CSSProperties = {
        flex: 1,
        position: "relative",
        userSelect: "none",
	    padding: "0.075em 6px",
        background: bgColor
    };
    let name = localize({en: "(other)", zh: "（其它）"});
	if (props.node.type === ActionType.Skill) {
		name = props.node.skillName ? localizeSkillName(props.node.skillName) : localize({en: "(unknown skill)", zh: "未知技能"});
	} else if (props.node.type === ActionType.Wait) {
		name = localize({
			en: "(wait for " + props.node.waitDuration.toFixed(2) + "s)",
			zh: "（等" + props.node.waitDuration.toFixed(2) + "秒）"
		});
	} else if (props.node.type === ActionType.SetResourceEnabled) {
		name = localize({
			en: "(toggle resource: " + props.node.buffName + ")",
			zh: "（开关或去除BUFF：" + props.node.buffName + "）"
		});
	}
    return <div style={style} ref={props.refObj ?? null} onClick={(e)=>{
        setHandledSkillSelectionThisFrame(true);
		if (recordIsDirty) {
			props.belongingRecord.onClickNode(props.node, e.shiftKey);
			refreshTimelineEditor();
		} else {
			controller.timeline.onClickTimelineAction(props.node, e.shiftKey);
			if (props.node.tmp_startLockTime) {
				controller.scrollToTime(props.node.tmp_startLockTime);
			}
		}
    }}>
	    {props.isFirstInvalid ? <span style={{marginRight: 6, padding: "0 4px", backgroundColor: "rgba(255, 0, 0, 0.25)"}}>&rarr;</span> : undefined}
	    <span>{name}</span>
    </div>
}

export let scrollEditorToFirstSelected = () => {};

export class TimelineEditor extends React.Component {
	state: {
		editedRecord: Record | undefined
		recordValidStatus: RecordValidStatus | undefined
		editedNodes: ActionNode[]
	}
	firstSelected: React.RefObject<HTMLDivElement>;
	constructor(props: {}) {
		super(props);
		this.state = {
			editedRecord: undefined,
			recordValidStatus: undefined,
			editedNodes: []
		}
		this.firstSelected = React.createRef();
	}
	componentDidMount() {
		refreshTimelineEditor = () => {
			this.forceUpdate();
		};
		scrollEditorToFirstSelected = (()=>{
			// lmfao this dirty hack again
			setTimeout(()=>{
				if (this.firstSelected.current) {
					this.firstSelected.current.scrollIntoView({
						behavior: "smooth",
						block: "nearest",
					});
				}
			}, 0);
		});
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
			editedNodes: []
		});
	}

	discardEditsBtn() {
		return <button style={{display: "block", marginTop: 10}} onClick={e=>{
			setHandledSkillSelectionThisFrame(true);
			// discard edits
			if (!this.state.editedRecord) {
				console.assert(false);
			}
			this.markClean();
		}}>discard changes</button>
	}

	getRecordCopy() {
		if (this.state.editedRecord) {
			return this.state.editedRecord;
		} else {
			let edited = controller.record.getCloneWithSharedConfig();
			this.setState({editedRecord: edited});
			return edited;
		}
	}

	render() {
		let displayedRecord = this.isDirty() ? this.state.editedRecord as Record : controller.record;

		// left: toolbar
		let applySection = () => {
			if (this.isDirty()) {
				if (this.isValid()) {
					return <div>
						<div style={{backgroundColor: "rgba(255, 220, 0, 0.25)"}}>{localize({en: "This edited sequence is valid.", zh: "此编辑可被应用。"})}</div>
						<button style={{display: "block", marginTop: 10}} onClick={e=>{
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

						}}>apply changes to timeline and save</button>
						{this.discardEditsBtn()}
					</div>
				} else {
					let node = this.state.recordValidStatus?.firstInvalidAction;
					let nodeName = "(unknown node)";
					if (node) {
						if (node.type === ActionType.Wait) {
							nodeName = "(Wait)";
						} else if (node.type === ActionType.SetResourceEnabled) {
							nodeName = "(Toggle resource " + node.buffName + ")";
						} else if (node.type === ActionType.Skill) {
							nodeName = node.skillName ?? "(unknown skill)";
						}
					}
					let errorMessage = "This sequence contains invalid actions! Check: " + nodeName;
					if (this.state.recordValidStatus?.invalidTime) {
						const minutes = Math.floor(this.state.recordValidStatus.invalidTime / 60);
						const seconds = (this.state.recordValidStatus.invalidTime - (minutes * 60));
						errorMessage += ` @ ${minutes.toFixed(0)}:${seconds.toFixed(3)}`;
					}
					errorMessage += ` (${this.state.recordValidStatus?.invalidReason ?? "(unknown)"})`;
					return <div>
						<div style={{backgroundColor: "rgba(255, 0, 0, 0.25)"}}>{errorMessage}</div>
						{this.discardEditsBtn()}
					</div>
				}
			} else {
				return <div>
					{localize({en: "timeline is up to date.", zh: "时间轴已与编辑器同步。"})}
				</div>
			}
		};
		let buttonStyle : CSSProperties= {
			display: "block",
			width: "100%",
			marginBottom: 10,
			padding: 3
		}
		let toolbar = <div style={{
			display: "flex",
			flexDirection: "column",
			flex: 2,
			marginRight: 10,
			position: "relative",
			verticalAlign: "top",
			overflowY: "hidden"
		}}>

			<div style={{marginBottom: 6, flex: 1}}>
				<button style={buttonStyle} onClick={e=>{
					if (displayedRecord.getFirstSelection()) {
						setHandledSkillSelectionThisFrame(true);
						// move selected skills up
						let copy = this.getRecordCopy();
						let editedNodes = this.state.editedNodes;
						let firstEditedNode = copy.moveSelected(-1);
						if (firstEditedNode) editedNodes.push(firstEditedNode);
						let status = controller.checkRecordValidity(copy, editedNodes);
						if (firstEditedNode && status.straightenedIfValid) {
							this.setState({
								editedRecord: status.straightenedIfValid,
								editedNodes: []
							});
						} else {
							this.setState({
								editedNodes: editedNodes
							});
						}
						this.setState({
							recordValidStatus: status,
						});
					}
				}}>{localize({en: "move up", zh: "上移"})}</button>

				<button style={buttonStyle} onClick={e=>{
					if (displayedRecord.getFirstSelection()) {
						setHandledSkillSelectionThisFrame(true);
						// move selected skills down
						let copy = this.getRecordCopy();
						let editedNodes = this.state.editedNodes;
						let firstEditedNode = copy.moveSelected(1);
						if (firstEditedNode) editedNodes.push(firstEditedNode);
						let status = controller.checkRecordValidity(copy, editedNodes);
						if (firstEditedNode && status.straightenedIfValid) {
							this.setState({
								editedRecord: status.straightenedIfValid,
								editedNodes: []
							});
						} else {
							this.setState({
								editedNodes: editedNodes
							});
						}
						this.setState({
							recordValidStatus: status,
						});
					}
				}}>{localize({en: "move down", zh: "下移"})}</button>

				<button style={buttonStyle} onClick={e=>{
					if (displayedRecord.getFirstSelection()) {
						setHandledSkillSelectionThisFrame(true);
						let copy = this.getRecordCopy();
						let editedNodes = this.state.editedNodes;
						let firstEditedNode = copy.deleteSelected();
						if (firstEditedNode) editedNodes.push(firstEditedNode);
						let status = controller.checkRecordValidity(copy, editedNodes);
						if (firstEditedNode && status.straightenedIfValid) {
							this.setState({
								editedRecord: status.straightenedIfValid,
								editedNodes: []
							});
						} else {
							this.setState({
								editedNodes: editedNodes
							});
						}
						this.setState({
							recordValidStatus: status,
						});
					}
				}}>{localize({en: "delete selected", zh: "删除所选"})}</button>
			</div>
		</div>

		// mid: actions list
		let actionsList = [];
		let itr = displayedRecord.getFirstAction();
		while (itr) {
			const isFirstSelected = !this.isDirty() && itr === displayedRecord.getFirstSelection();
			actionsList.push(<TimelineActionElement
				key={itr.getNodeIndex()}
				node={itr}
				belongingRecord={displayedRecord}
				isFirstInvalid={this.state.recordValidStatus?.firstInvalidAction===itr}
				refObj={isFirstSelected ? this.firstSelected : undefined}
			/>);
			itr = itr.next;
		}
		let colors = getCurrentThemeColors();
		return <div style={{display: "flex", flexDirection: "row", position: "relative", height: TIMELINE_SETTINGS_HEIGHT - 50}} onClick={
			(evt)=>{
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
			}
		}>
			{toolbar}
			<div className={"staticScrollbar"} style={{
				border: "1px solid " + colors.bgMediumContrast,
				flex: 6,
				marginRight: 10,
				position: "relative",
				verticalAlign: "top",
				overflowY: "scroll"
			}}>
				{actionsList}
			</div>
			<div style={{
				border: "1px solid " + colors.bgMediumContrast, flex: 6, position: "relative", verticalAlign: "top", overflowY: "hidden"}}>
				{applySection()}
			</div>
		</div>
	}
}