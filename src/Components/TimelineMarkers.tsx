import React from 'react'
import {MarkerElem} from "../Controller/Timeline";

export let getTimelineMarkersHeight = () => { return 0 };

export let updateMarkers = (markers: MarkerElem[]) => {};

type TimelineMarkersState = {
	markers: MarkerElem[]
}

class TimelineMarkers extends React.Component {
	myRef: React.RefObject<HTMLDivElement>;
	state: TimelineMarkersState;
	constructor(props: {}) {
		super(props);
		this.myRef = React.createRef();
		this.state = {
			markers: []
		};

		getTimelineMarkersHeight = (()=>{
			if (this.myRef.current) {
				return this.myRef.current.clientHeight;
			}
			return 0;
		}).bind(this);

		updateMarkers = ((markers: MarkerElem[]) => {
			this.setState({markers: markers});
		}).bind(this);
	}

	componentWillUnmount() {
		getTimelineMarkersHeight = () => { return 0 };
		updateMarkers = markers => {};
	}

	render() {
		console.log("render markers");
		console.log(this.state.markers);
		return <div ref={this.myRef} style={{
			outline: "1px solid red"
		}}>
			(placeholder markers)
		</div>;
	}
}

export let timelineMarkers = <TimelineMarkers/>;