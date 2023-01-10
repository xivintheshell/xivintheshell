import {Expandable} from "./Common";
import React, {CSSProperties} from "react";
import {controller} from "../Controller/Controller";
import {ActionNode, ActionType, Record, RecordValidStatus} from "../Controller/Record";
import {bHandledSkillSelectionThisFrame, setHandledSkillSelectionThisFrame} from "./TimelineElements";

export let refreshTimelineEditor = ()=>{};

function TimelineActionElement(props: {
	node: ActionNode,
	belongingRecord: Record
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
        background: bgColor
    };
    let name = "(other)";
	if (props.node.type === ActionType.Skill) {
		name = props.node.skillName ?? "(unknown skill)";
	} else if (props.node.type === ActionType.Wait) {
		name = "(wait for " + props.node.waitDuration + "s)";
	} else if (props.node.type === ActionType.SetResourceEnabled) {
		name = "(toggle resource: " + props.node.buffName + ")";
	}
    return <div style={style} onClick={(e)=>{
        setHandledSkillSelectionThisFrame(true);
		if (recordIsDirty) {
			props.belongingRecord.onClickNode(props.node, e.shiftKey);
			refreshTimelineEditor();
		} else {
			controller.timeline.onClickTimelineAction(props.node, e.shiftKey);
		}
    }}>{name}</div>
}

class TimelineEditor extends React.Component {
	state: {
		editedRecord: Record | undefined
		recordValidStatus: RecordValidStatus | undefined
	}
	constructor(props: {}) {
		super(props);
		this.state = {
			editedRecord: undefined,
			recordValidStatus: undefined
		}
	}
	componentDidMount() {
		refreshTimelineEditor = () => {
			this.forceUpdate();
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
			recordValidStatus: undefined
		});
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
						<span>This edited sequence is valid. </span>
						<button onClick={e=>{
							setHandledSkillSelectionThisFrame(true);

							// apply edits to timeline
							if (this.state.editedRecord) {
								controller.applyEditedRecord(this.state.editedRecord);
							} else {
								console.assert(false);
							}
							this.markClean();

							controller.record.unselectAll();
							controller.displayCurrentState();
						}}>apply edits to timeline</button>
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
					return  <div>
						This sequence contains invalid actions! Check: {
						nodeName + " (" + (this.state.recordValidStatus?.invalidReason ?? "(unknown)") + ")"
					}
					</div>
				}
			} else {
				return <div>
					timeline is up to date.
				</div>
			}
		};
		let buttonStyle : CSSProperties= {
			display: "block",
			width: "100%",
			marginBottom: 10
		}
		let toolbar = <div style={{display: "flex", flexDirection: "column", flex: 2, height: 200, marginRight: 10, position: "relative", verticalAlign: "top", overflowY: "hidden"}}>

			<div style={{marginBottom: 6, flex: 1}}>
				<button style={buttonStyle} onClick={e=>{
					setHandledSkillSelectionThisFrame(true);
					// move selected skills up
					let copy = this.getRecordCopy();
					copy.moveSelected(-1);
					let status = controller.checkRecordValidity(copy);
					// select first invalid
					if (!status.isValid) {
						if (status.firstInvalidAction) {
							copy.selectSingle(status.firstInvalidAction);
						}
					}
					this.setState({recordValidStatus: status});

				}}>move up</button>

				<button style={buttonStyle} onClick={e=>{
					setHandledSkillSelectionThisFrame(true);
					// move selected skills down
					let copy = this.getRecordCopy();
					copy.moveSelected(1);
					let status = controller.checkRecordValidity(copy);
					// select first invalid
					if (!status.isValid) {
						if (status.firstInvalidAction) {
							copy.selectSingle(status.firstInvalidAction);
						}
					}
					this.setState({recordValidStatus: status});
				}}>move down</button>

				<button style={buttonStyle} onClick={e=>{
					setHandledSkillSelectionThisFrame(true);

					let copy = this.getRecordCopy();
					copy.deleteSelected();

					let status = controller.checkRecordValidity(copy);

					// select first invalid
					if (!status.isValid) {
						if (status.firstInvalidAction) {
							copy.selectSingle(status.firstInvalidAction);
						}
					}

					this.setState({recordValidStatus: status});
				}}>delete selected</button>
			</div>
		</div>

		// mid: actions list
		let actionsList = [];
		let itr = displayedRecord.getFirstAction();
		while (itr) {
			actionsList.push(<TimelineActionElement key={itr.getNodeIndex()} node={itr} belongingRecord={displayedRecord}/>);
			itr = itr.next;
		}
		let content = <div style={{display: "flex", flexDirection: "row", position: "relative"}} onClick={
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
			<div className={"staticScrollbar"} style={{border: "1px solid lightgrey", flex: 6, height: 200, marginRight: 10, position: "relative", verticalAlign: "top", overflowY: "scroll"}}>
				{actionsList}
			</div>
			<div style={{border: "1px solid lightgrey", flex: 6, height: 200, position: "relative", verticalAlign: "top", overflowY: "hidden"}}>
				{applySection()}
			</div>
		</div>;
		return <Expandable
			title="Timeline editor"
			titleNode={<span>Timeline editor</span>}
			content={content}
			defaultShow={false}/>
	}
}

export let timelineEditor = <TimelineEditor/>