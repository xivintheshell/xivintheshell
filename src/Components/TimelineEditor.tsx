import {Expandable} from "./Common";
import React, {CSSProperties} from "react";
import {controller} from "../Controller/Controller";
import {ActionNode, ActionType} from "../Controller/Record";
import {bHandledSkillSelectionThisFrame, setHandledSkillSelectionThisFrame} from "./TimelineElements";

export let refreshTimelineEditor = ()=>{};

function TimelineActionElement(props: {
    node: ActionNode
}) {
    let style : CSSProperties = {
        flex: 1,
        position: "relative",
        userSelect: "none",
        border: (props.node.isSelected() ? 2 : 1) + "px solid blue",
        marginBottom: 6
    };
    let name = props.node.type === ActionType.Skill ? props.node.skillName : "(other)"
    return <div style={style} onClick={(e)=>{
        setHandledSkillSelectionThisFrame(true);
        controller.timeline.onClickAction(props.node, e.shiftKey);
    }}>{name}</div>
}

class TimelineEditor extends React.Component {
    constructor(props: {}) {
        super(props);
    }
    componentDidMount() {
        refreshTimelineEditor = () => {
            this.forceUpdate();
        };
    }
    componentWillUnmount() {
        refreshTimelineEditor = () => {};
    }

    #actionsList() {
        let list : JSX.Element[] = [];
        let itr = controller.record.getFirstAction();
        while (itr) {
            list.push(<TimelineActionElement key={itr.getNodeIndex()} node={itr}/>);
            itr = itr.next;
        }
        return <div style={{display: "flex", flexDirection: "column", position: "relative"}}>{list}</div>;
    }
    render() {
        let content = <div style={{display: "flex", flexDirection: "row", position: "relative"}} onClick={
            (evt)=>{
                if (!evt.shiftKey && !bHandledSkillSelectionThisFrame) {
                    controller.record.unselectAll();
                    controller.displayCurrentState();
                }
                setHandledSkillSelectionThisFrame(false);
            }
        }>
            <div style={{border: "1px solid yellow", flex: 2, height: 300, marginRight: 10, position: "relative", verticalAlign: "top", overflowY: "hidden"}}>sync</div>
            <div className={"staticScrollbar"} style={{border: "1px solid red", flex: 4, height: 300, marginRight: 10, position: "relative", verticalAlign: "top", overflowY: "scroll"}}>{this.#actionsList()}</div>
            <div style={{border: "1px solid green", flex: 4, height: 300, position: "relative", verticalAlign: "top", overflowY: "hidden"}}>right</div>
        </div>;
        return <Expandable
            title="Timeline editor"
            titleNode={<span>Timeline editor</span>}
            content={content}
            defaultShow={false}/>
    }
}

export let timelineEditor = <TimelineEditor/>