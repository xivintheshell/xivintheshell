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

	trackHeight = 14;
	fontSize = 11;
	marginBottom = 6;

	constructor(props: {}) {
		super(props);
		this.myRef = React.createRef();
		this.state = {
			markers: []
		};

		getTimelineMarkersHeight = ()=>{
			return controller.timeline.getNumMarkerTracks() * this.trackHeight + this.marginBottom;
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
			let radius = marker.duration === 0 ? 4 : 2;
			let leftPos = controller.timeline.positionFromTime(marker.time + controller.gameConfig.countdown);
			let absTop = (maxTrack - marker.track) * this.trackHeight;
			let absWidth = controller.timeline.positionFromTime(marker.duration);
			let colorBarStyleWithoutText: CSSProperties = {
				position: "absolute",
				background: marker.color,
				borderRadius: radius,
				top: this.trackHeight / 2 - radius,
				left: -radius,
				width: absWidth + 2 * radius,
				height: 2 * radius,
			};
			let colorBarStyleWithText: CSSProperties = {
				position: "absolute",
				top: 0,
				left: 0,
				background: marker.color + "7f",
				width: absWidth,
				height: "100%",
			}
			let containerStyle: CSSProperties = {
				position: "absolute",
				top: absTop,
				left: leftPos,
				height: this.trackHeight,
				//outline: "1px solid orange",
				fontSize: this.fontSize,
			}
			let textStyle: CSSProperties = {
				marginLeft: this.trackHeight / 2,
				position: "absolute",
				whiteSpace: "nowrap",
				pointerEvents: "none"
			}
			let id = "timelineMarker-" + key;
			return <div key={key} style={containerStyle} >
				<div data-tip data-for={id}
					 style={(marker.showText && marker.duration > 0) ? colorBarStyleWithText : colorBarStyleWithoutText}
					 onClick={()=>{
					let success = controller.timeline.deleteMarker(marker);
					console.assert(success);
					setEditingMarkerValues(marker);
				}}/>
				<div style={textStyle}>{
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
			height: getTimelineMarkersHeight(),
			position: "relative"
		}}>{markerElems}</div>;
	}
}

export let timelineMarkers = <TimelineMarkers/>;