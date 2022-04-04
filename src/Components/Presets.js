import React from 'react'
import {Expandable} from "./Common";

class Presets extends React.Component {
	render() {
		/*
		[load lines from file]:
		[save lines to file] as: ______

		<list all preset lines>
			each line: <name>: <Clickable>{icon}{icon}...{icon}</Clickable> [delete (x)]
			when clicked on a line, controller.tryAddLine(line) : boolean

		(if timeline selection is not empty: ) name: ______ [save current selection as line]
		 */
		let contentStyle = {
			margin: "10px",
			paddingLeft: "10px",
			outline: "1px solid green"
		};
		let content = <div style={contentStyle}>my content</div>;
		return <Expandable
			title="Presets"
			content={content}
			defaultShow={false}/>
	}
}

export let presets = <Presets/>;