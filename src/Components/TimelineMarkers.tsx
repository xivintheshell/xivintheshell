import React from 'react'
import {asyncFetch, Clickable, Expandable, Input, loadFromFile, saveToFile} from "./Common";
import {FileType, ReplayMode} from "../Controller/Common";
import {ActionType} from "../Controller/Record";

export let getTimelineMarkersHeight = () => { return 0 };
class TimelineMarkers extends React.Component {
	myRef: React.RefObject<HTMLDivElement>;
	constructor(props: {}) {
		super(props);
		this.myRef = React.createRef();
		getTimelineMarkersHeight = this.unboundGetTimelineMarkersHeight.bind(this);
	}
	componentWillUnmount() {
		getTimelineMarkersHeight = () => { return 0 };
	}
	unboundGetTimelineMarkersHeight() {
		if (this.myRef.current) {
			return this.myRef.current.clientHeight;
		}
		return 0;
	}
	render() {
		return <div ref={this.myRef} style={{
			outline: "1px solid red"
		}}>
			(placeholder markers)
		</div>;
	}
}

export let timelineMarkers = <TimelineMarkers/>;