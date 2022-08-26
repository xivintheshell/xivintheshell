import React, {CSSProperties} from 'react'
import {MarkerElem} from "../Controller/Timeline";
import {controller} from "../Controller/Controller";
import ReactTooltip from "react-tooltip";
import {setEditingMarkerValues} from "./TimelineMarkerPresets";

export let getTimelineMarkersHeight = () => { return 0 };

export let updateMarkers_TimelineMarkers = (trackBins: Map<number, MarkerElem[]>) => {};

type TimelineMarkersState = {
	trackBins: Map<number, MarkerElem[]>;
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
			trackBins: new Map()
		};

		getTimelineMarkersHeight = ()=>{
			return controller.timeline.getNumMarkerTracks() * this.trackHeight + this.marginBottom;
		};

		updateMarkers_TimelineMarkers = ((trackBins: Map<number, MarkerElem[]>) => {
			this.setState({trackBins: trackBins});
		}).bind(this);
	}

	componentWillUnmount() {
		getTimelineMarkersHeight = () => { return 0 };
		updateMarkers_TimelineMarkers = (trackBins: Map<number, MarkerElem[]>) => {};
	}

	render() {
		let makeMarker = (marker: MarkerElem, key: number | string) => {
			let radius = marker.duration === 0 ? 4 : 2;
			let leftPos = controller.timeline.positionFromTime(marker.time + controller.gameConfig.countdown);
			let absTop = 0;//(maxTrack - marker.track) * this.trackHeight;
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

		let makeTrack = (trackIndex: number, key: number) => {
			let track: JSX.Element[] = [];
			let trackBin = this.state.trackBins.get(trackIndex);
			if (trackBin) {
				for (let i = 0; i < trackBin.length; i++) {
					track.push(makeMarker(trackBin[i], trackIndex + "-" + i));
				}
			}
			return <div key={key} style={{
				position: "absolute",
				top: (numTracks - 1 - trackIndex) * this.trackHeight,
				width: "100%",
				height: this.trackHeight,
				background: trackIndex % 2 === 0 ? "#f3f3f3" : "#ffffff"
			}}>{track}</div>
		}

		let numTracks = controller.timeline.getNumMarkerTracks();
		let tracks: JSX.Element[] = [];
		for (let i = 0; i < numTracks; i++) {
			tracks.push(makeTrack(i, i));
		}

		return <div ref={this.myRef} style={{
			height: getTimelineMarkersHeight(),
			position: "relative"
		}}>{tracks}</div>;
	}
}

export let timelineMarkers = <TimelineMarkers/>;