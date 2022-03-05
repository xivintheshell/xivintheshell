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
