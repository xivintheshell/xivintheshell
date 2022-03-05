import React from "react";

export class Clickable extends React.Component {
	constructor(props) { // in: content, onClickFn
		super(props);
		this.onClick = props.onClickFn.bind(this);
	}

	// TODO: bind hotkeys to buttons?
	render() {
		return <div className={"clickable"} onClick={this.onClick}>{this.props.content}</div>
	}
}

export class ProgressBar extends React.Component
{
	constructor(props={
		progress: 0.9,
		backgroundColor: "#6cf",
		width: 200,
		label: "defaultLabel",
		labelColor: "#111",
		offsetY: 0
	}) {
		super(props);
	}
	render() {
		const containerProps = {
			style: {
				top: `${this.props.offsetY}px`,
				width: `${this.props.width}px`,
			},
		};
		const fillerProps = {
			style: {
				background: `${this.props.backgroundColor}`,
				height: "100%",
				borderRadius: "inherit",
				width: `${this.props.progress * 100}%`,
			}
		};
		const labelProps = {
			style: {
				color: this.props.labelColor
			}
		}
		return <div className={"progressBar"} {...containerProps}>
			<div {...fillerProps}>
				<span {...labelProps}>{this.props.label}</span>
			</div>
		</div>
	}
}