import React, {CSSProperties} from 'react'
import {MarkerElem} from "../Controller/Timeline";
// @ts-ignore // FIXME
import {controller} from "../Controller/Controller.js";
import ReactTooltip from "react-tooltip";
import {setEditingMarkerValues} from "./TimelineMarkerPresets";

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
		let maxTrack = 0;
		for (let i = 0; i < this.state.markers.length; i++) {
			maxTrack = Math.max(maxTrack, this.state.markers[i].track);
		}
		let makeMarker = (marker: MarkerElem, key: number | string) => {
			let radius = marker.duration === 0 ? 3 : 2;
			let top = (maxTrack - marker.track) * 10 + 5 - radius;
			let left = controller.timeline.positionFromTime(
				marker.time + controller.gameConfig.countdown) - radius;
			let width = controller.timeline.positionFromTime(marker.duration) + 2 * radius;
			let height = 2 * radius;
			let style: CSSProperties = {
				position: "absolute",
				background: marker.color,
				borderRadius: radius,
				top: top,
				left: left,
				width: width,
				height: height,
				textAlign: "center",
			};
			let id = "timelineMarker-" + key;
			return <div key={key} data-tip data-for={id} style={style} onClick={()=>{
				let success = controller.timeline.deleteMarker(marker);
				console.assert(success);
				setEditingMarkerValues(marker);
			}}>
				<ReactTooltip id={id}>{marker.description}</ReactTooltip>
			</div>;
		};
		let markerElems: JSX.Element[] = [];
		for (let i = 0; i < this.state.markers.length; i++) {
			markerElems.push(makeMarker(this.state.markers[i], i));
		}
		return <div ref={this.myRef} style={{
			height: 10 * (maxTrack + 1),
			//outline: "1px solid red",
			position: "relative"
		}}>{markerElems}</div>;
	}
}

export let timelineMarkers = <TimelineMarkers/>;