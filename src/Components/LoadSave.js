import React from 'react'
import {Clickable, loadFromFile, saveToFile} from "./Common";
import {controller} from "../Controller/Controller";
import {FileType} from "../Controller/Common";

export class LoadSave extends React.Component {
	constructor(props) {
		super(props);
		this.onLoad = this.unboundOnLoad.bind(this);
		this.onSave = this.unboundOnSave.bind(this);
		this.onSaveFilenameChange = this.unboundOnSaveFilenameChange.bind(this);
		this.fileSelectorRef = React.createRef();
		this.saveFilename = "battle.txt";
	}
	unboundOnLoad() {
		let cur = this.fileSelectorRef.current;
		if (cur && cur.files.length > 0) {
			let fileToLoad = cur.files[0];
			loadFromFile(fileToLoad, (content)=>{
				if (content.fileType === FileType.Record) {
					controller.loadBattleRecordFromFile(content);
				} else {
					window.alert("wrong file type '" + content.fileType + "'.");
					return;
				}
			});
		}
	}
	unboundOnSave() {
		saveToFile(controller.record.serialized(), this.saveFilename);
	}
	unboundOnSaveFilenameChange(e) {
		if (e.target) {
			this.saveFilename = e.target.value;
		}
	}
	render() {
		return <div className={"loadSave"}>
			<div>
				<input defaultValue="battle.txt" className="textInput" width="8" onChange={this.onSaveFilenameChange}/>
				<button onClick={this.onSave}>save to file</button>
			</div>
			<div>
				<span>Load from: </span>
				<input type="file" ref={this.fileSelectorRef} onChange={this.onLoad}/>
			</div>
		</div>
	}
}