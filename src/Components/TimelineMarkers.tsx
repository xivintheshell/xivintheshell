import React, {CSSProperties} from 'react'
import {MarkerElem} from "../Controller/Timeline";
import {controller} from "../Controller/Controller";
import ReactTooltip from "react-tooltip";
import {setEditingMarkerValues} from "./TimelineMarkerPresets";
import {StaticFn} from "./Common";

export let getTimelineMarkersHeight = () => { return 0 };

type TimelineMarkersProps = {
	horizontalScale: number,
	trackBins: Map<number, MarkerElem[]>;
}

let Marker = React.memo(function(props: {
	markerID: number | string,
	markerElem: MarkerElem,
	horizontalScale: number
}) {
	const trackHeight = 14;
	const fontSize = 11;

	let marker = props.markerElem;
	let radius = marker.duration === 0 ? 4 : 2;
	let leftPos = StaticFn.positionFromTimeAndScale(marker.time + controller.gameConfig.countdown, props.horizontalScale);
	let absTop = 0;//(maxTrack - marker.track) * this.trackHeight;
	let absWidth = StaticFn.positionFromTimeAndScale(marker.duration, props.horizontalScale);
	let colorBarStyleWithoutText: CSSProperties = {
		position: "absolute",
		background: marker.color,
		borderRadius: radius,
		top: trackHeight / 2 - radius,
		left: -radius,
		width: absWidth + 2 * radius,
		height: 2 * radius,
		zIndex: 1
	};
	let colorBarStyleWithText: CSSProperties = {
		position: "absolute",
		top: 0,
		left: 0,
		background: marker.color + "7f",
		width: absWidth,
		height: "100%",
		zIndex: 1
	}
	let containerStyle: CSSProperties = {
		position: "absolute",
		top: absTop,
		left: leftPos,
		height: trackHeight,
		fontSize: fontSize,
	}
	let textStyle: CSSProperties = {
		marginLeft: trackHeight / 2,
		position: "absolute",
		whiteSpace: "nowrap",
		pointerEvents: "none",
		zIndex: 1
	}
	let fullID = "timelineMarker-" + props.markerID;
	return <div key={props.markerID} style={containerStyle} >
		<div data-tip data-for={fullID}
		     style={(marker.showText && marker.duration > 0) ? colorBarStyleWithText : colorBarStyleWithoutText}
		     onClick={()=>{
			     let success = controller.timeline.deleteMarker(marker);
			     console.assert(success);
			     setEditingMarkerValues(marker);
		     }}/>
		<div style={textStyle}>{
			marker.showText ? marker.description : ""
		}</div>
		<ReactTooltip id={fullID}>{"[" + marker.time + "] " + marker.description}</ReactTooltip>
	</div>;
});

export class TimelineMarkers extends React.Component {
	myRef: React.RefObject<HTMLDivElement>;
	trackHeight = 14;
	fontSize = 11;
	marginBottom = 6;
	props: TimelineMarkersProps = {
		horizontalScale: 1,
		trackBins: new Map()
	};

	constructor(props: TimelineMarkersProps) {
		super(props);
		this.props = props;
		this.myRef = React.createRef();

		getTimelineMarkersHeight = ()=>{
			return controller.timeline.getNumMarkerTracks() * this.trackHeight + this.marginBottom;
		};

	}

	componentWillUnmount() {
		getTimelineMarkersHeight = () => { return 0 };
	}

	makeTrack(numTracks: number, trackIndex: number, key: number) {
		let track: JSX.Element[] = [];
		let trackBin = this.props.trackBins.get(trackIndex);
		if (trackBin) {
			for (let i = 0; i < trackBin.length; i++) {
				let id = trackIndex + "-" + i;
				track.push(<Marker horizontalScale={this.props.horizontalScale} markerElem={trackBin[i]} key={id} markerID={id}/>);
			}
		}
		return <div key={key} style={{
			position: "absolute",
			top: (numTracks - 1 - trackIndex) * this.trackHeight,
			width: "100%",
			height: this.trackHeight,
			background: "transparent"
		}}>{track}</div>
	}

	render() {

		let numTracks = controller.timeline.getNumMarkerTracks();

		let tracks: JSX.Element[] = [];
		for (let i = 0; i < numTracks; i++) {
			tracks.push(this.makeTrack(numTracks, i, i));
		}

		return <div ref={this.myRef} style={{
			height: getTimelineMarkersHeight(),
			position: "relative"
		}}>{tracks}</div>;
	}
}