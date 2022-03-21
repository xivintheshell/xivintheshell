import React from 'react'
import {Clickable, Input} from "./Common";
import {controller} from "../Controller/Controller";

export class LoadSave extends React.Component {
	constructor(props) {
		super(props);
		this.onLoad = this.unboundOnLoad.bind(this);
		this.onSave = this.unboundOnSave.bind(this);
		this.onSaveFilenameChange = this.unboundOnSaveFilenameChange.bind(this);
		this.fileSelectorRef = React.createRef();
		this.saveFilename = "battle.txt";
	}
	//https://thiscouldbebetter.wordpress.com/2012/12/18/loading-editing-and-saving-a-text-file-in-html5-using-javascrip/
	unboundOnLoad() {
		let cur = this.fileSelectorRef.current;
		if (cur && cur.files.length > 0) {
			let fileToLoad = cur.files[0];
			let fileReader = new FileReader();
			fileReader.onload = function(fileLoadedEvent) {
				let str = fileLoadedEvent.target.result.toString();
				console.log(JSON.parse(str));
			};
			fileReader.readAsText(fileToLoad, "UTF-8");
		}
	}
	// https://github.com/eligrey/FileSaver.js#readme
	unboundOnSave() {
		let FileSaver = require('file-saver');
		let content = JSON.stringify(controller.battleRecording.getActions());
		let blob = new Blob([content], {type: "text/plain;charset=utf-8"});
		FileSaver.saveAs(blob, this.saveFilename);
	}
	unboundOnSaveFilenameChange(e) {
		if (e.target) {
			this.saveFilename = e.target.value;
		}
	}
	render() {
		return <div className={"loadSave"}>
			<div>
				<Clickable content="[save]" onClickFn={this.onSave}/>
				<span> as: </span>
				<input className="textInput" width="10" onChange={this.onSaveFilenameChange}/>
			</div>
			<div>
				<Clickable content="[load]" onClickFn={this.onLoad}/>
				<span> from: </span>
				<input type="file" ref={this.fileSelectorRef}/>
			</div>
		</div>
	}
}