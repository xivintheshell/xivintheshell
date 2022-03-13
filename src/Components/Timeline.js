import React from 'react'
import {controller} from "../Controller/Controller";
import {ElemType} from "../Controller/Timeline";
import ReactTooltip from 'react-tooltip';
import {addLogContent} from "./LogView";

const MAX_HEIGHT = 500;

function Cursor(props) {
	let style={
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

function TimelineHeader(props) {
	return <div className="timeline-header">
		timeline header
	</div>
}

function TimelineContent(props) {
	return <div className="timeline-content" width={800}>
		timeline content
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
		for (let i = 0; i < this.state.elements.length; i++) {
			let e = this.state.elements[i];
			if (e.type === ElemType.s_Cursor) {
				elemComponents.push(<Cursor key={i} elem={e} elemID={"elemID-"+i}/>)

			} else if (e.type === ElemType.DamageMark) {
				elemComponents.push(<DamageMark key={i} elem={e} elemID={"elemID-"+i}/>)

			}
		}
		return <div className="timeline-main" style={{width: this.state.canvasWidth+"px"}}>
			<TimelineHeader/>
			<TimelineContent/>
			{elemComponents}
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
		return <div className={"timeline"}>
			<FixedRightColumn/>
		</div>
	}
}

export const timeline = <Timeline />;