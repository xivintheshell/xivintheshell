import React, {CSSProperties} from 'react'
import {MarkerElem} from "../Controller/Timeline";
import {controller} from "../Controller/Controller";
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

		getTimelineMarkersHeight = ()=>{
			return controller.timeline.getNumMarkerTracks() * 10;
		};

		updateMarkers = ((markers: MarkerElem[]) => {
			this.setState({markers: markers});
		}).bind(this);
	}

	componentWillUnmount() {
		getTimelineMarkersHeight = () => { return 0 };
		updateMarkers = markers => {};
	}

	render() {
		let maxTrack = controller.timeline.getNumMarkerTracks() - 1;
		let makeMarker = (marker: MarkerElem, key: number | string) => {
			let radius = marker.duration === 0 ? 3 : 2;
			let leftPos = controller.timeline.positionFromTime(marker.time + controller.gameConfig.countdown);
			let absTop = (maxTrack - marker.track) * 10;
			let absWidth = controller.timeline.positionFromTime(marker.duration);
			let noTextStyle: CSSProperties = {
				position: "absolute",
				background: marker.color,
				borderRadius: radius,
				top: 5 - radius,
				left: -radius,
				width: absWidth + 2 * radius,
				height: 2 * radius,
			};
			let textStyle: CSSProperties = {
				position: "absolute",
				top: 0,
				left: 0,
				background: marker.color + "7f",
				width: absWidth,
				height: "100%",
			}
			// sets the anchor for inner elems
			let containerStyle: CSSProperties = {
				position: "absolute",
				top: absTop,
				left: leftPos,
				height: 10,
				outline: "1px solid orange",
				fontSize: 9
			}
			let id = "timelineMarker-" + key;
			return <div key={key} style={containerStyle} >
				<div data-tip data-for={id}
					 style={(marker.showText && marker.duration > 0) ? textStyle : noTextStyle}
					 onClick={()=>{
					let success = controller.timeline.deleteMarker(marker);
					console.assert(success);
					setEditingMarkerValues(marker);
				}}/>
				<div style={{marginLeft: 5, position: "absolute", whiteSpace: "nowrap"}}>{
					marker.showText ? marker.description : ""
				}</div>
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