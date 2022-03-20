import React from 'react'
import {controller} from "../Controller/Controller";
import {ElemType} from "../Controller/Timeline";
import {skillIcons} from "./Skills";
import {Slider} from "./Common";
import ReactTooltip from 'react-tooltip';

const MAX_HEIGHT = 400;

function Cursor(props) {
	let style={
		top: props.vOffset,
		left: props.elem.left - 3,
		hoverText: props.elem.time,
	};
	return <div style={style} className={"timeline-elem cursor"} data-tip data-for={`${props.elemID}`}>
		<svg width={6} height={MAX_HEIGHT}>
			<line x1="3" y1="0" x2="3" y2={`${MAX_HEIGHT}`} stroke={"black"}/>
			<polygon points="0,0 6,0 3,6" fill="black" stroke="none"/>
		</svg>
		<ReactTooltip id={`${props.elemID}`}>{props.elem.hoverText}</ReactTooltip>
	</div>;
}

function DamageMark(props) {
	let style={
		top: props.vOffset,
		left: props.elem.left-3,
		//hoverText: props.elem.ho
	};
	return <div style={style} className={"timeline-elem damageMark"} data-tip data-for={`${props.elemID}`}>
		<svg width={6} height={6}>
			<polygon points="0,0 6,0 3,6" fill="red" stroke="none"/>
		</svg>
		<ReactTooltip id={`${props.elemID}`}>{props.elem.hoverText}</ReactTooltip>
	</div>;
}

function TimelineSkill(props) {
	let iconPath = skillIcons.get(props.elem.data.skillName);
	let icon = <img width={28} height={28} className={"timeline-elem-skill-icon"} src={iconPath} alt={props.elem.data.skillName}/>

	let lockBarWidth = controller.timeline.positionFromTime(props.elem.data.lockDuration);
	let lockBarStyle = {
		position: "absolute",
		zIndex: -1,
		background: props.elem.data.isSpellCast ? "#e7d9ee" : "#9d9d9d",
		width: lockBarWidth,
		height: props.elem.data.isSpellCast ? 14 : 28,
	};
	let lockBar = <div style={lockBarStyle}/>

	let recastBarWidth = controller.timeline.positionFromTime(props.elem.data.recastDuration);
	let recastBarStyle = {
		top: 14,
		position: "absolute",
		zIndex: -1,
		background: "#dbf3d6",
		width: recastBarWidth,
		height: 14
	};
	let recastBar = <div style={recastBarStyle}/>

	let style={
		left: props.elem.left,
		top: props.elem.data.isGCD ? 14 : 0,
	};
	return <div style={style} className={"timeline-elem skill"} data-tip data-for={`${props.elemID}`}>
		{lockBar}{props.elem.data.isGCD ? recastBar : <div/>}{icon}
		<ReactTooltip id={`${props.elemID}`}>{props.elem.data.skillName + "@" + props.elem.data.time.toFixed(2)}</ReactTooltip>
	</div>;
}

function TimelineHeader(props) {
	return <div className="timeline-header">
		timeline header
	</div>
}

function TimelineContent(props) {
	return <div className="timeline-content" width={800}>
		{props.elements}
	</div>
}

export let updateTimelineContent = function(startTime, canvasWidth, data) {}
class TimelineMain extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			startTime: 0,
			canvasWidth: 300,
			elements: []
		}
		updateTimelineContent = this.unboundUpdateTimelineContent.bind(this);
	}
	componentDidMount() {
		this.setState({
			startTime: 0,
			canvasWidth: controller.timeline.getCanvasWidth(),
			elements: controller.timeline.getTimelineElements()
		});
	}
	componentWillUnmount() {
		updateTimelineContent = (startTime, canvasWidth, data)=>{};
	}
	unboundUpdateTimelineContent(startTime, canvasWidth, data) {
		this.setState({
			startTime: startTime,
			canvasWidth: canvasWidth,
			elements: data
		});
	}
	render() {
		let elemComponents = [];
		let verticalOffset = "-2em";
		for (let i = 0; i < this.state.elements.length; i++) {
			let e = this.state.elements[i];
			if (e.type === ElemType.s_Cursor) {
				elemComponents.push(<Cursor key={i} elem={e} elemID={"elemID-"+i} vOffset={verticalOffset}/>)
			}
			else if (e.type === ElemType.DamageMark) {
				elemComponents.push(<DamageMark key={i} elem={e} elemID={"elemID-"+i} vOffset={verticalOffset}/>)
			}
			else if (e.type === ElemType.Skill) {
				elemComponents.push(<TimelineSkill key={i} elem={e} elemID={"elemID-"+i} vOffset={verticalOffset}/>)
			}
		}
		return <div className="timeline-main" style={{width: this.state.canvasWidth+"px"}}>
			<TimelineHeader/>
			<TimelineContent elements={elemComponents}/>
		</div>
	}
}

function FixedLeftColumn(props) {
	return <div className={"timeline-fixedLeftColumn"}>
		timeline left col
	</div>;
}

class FixedRightColumn extends React.Component {
	render() {
		return <div className={"timeline-fixedRightColumn"}>
			<TimelineMain/>
		</div>
	}
}

class Timeline extends React.Component
{
	render()
	{
		return <div>
			<Slider description={"display scale: "} defaultValue={0.4} onChange={(newVal)=>{
				controller.timeline.setHorizontalScale(parseFloat(newVal));
			}}/>
			<div className={"timeline timelineTab"}>
				<FixedRightColumn/>
			</div>
		</div>
	}
}

export const timeline = <Timeline />;