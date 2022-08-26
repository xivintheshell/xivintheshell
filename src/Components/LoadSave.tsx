import React from 'react'
import {loadFromFile, SaveToFile} from "./Common";
import {controller} from "../Controller/Controller";
import {FileType} from "../Controller/Common";

type Fixme = any;

export class LoadSave extends React.Component {
	private readonly onLoad: () => void;
	private readonly fileSelectorRef: React.RefObject<HTMLInputElement>;

	constructor(props: {} | Readonly<{}>) {
		super(props);

		this.onLoad = (()=>{
			let cur = this.fileSelectorRef.current;
			if (cur && cur.files!==null && cur.files.length > 0) {
				let fileToLoad = cur.files[0];
				loadFromFile(fileToLoad, (content: Fixme)=>{
					if (content.fileType === FileType.Record) {
						controller.loadBattleRecordFromFile(content);
						controller.updateAllDisplay();
						controller.autoSave();
					} else {
						window.alert("wrong file type '" + content.fileType + "'.");
					}
				});
				cur.value = "";
			}
		}).bind(this);

		this.fileSelectorRef = React.createRef();
	}
	render() {
		return <div className={"loadSave"}>
			<div>
				<SaveToFile getContentFn={()=>{
					return controller.record.serialized();
				}} filename={"fight"} displayName={"download fight record"}/>
			</div>
			<div style={{marginTop: 10}}>
				<span>Load from: </span>
				<input
					style={{
						width: "110px",
						color: "transparent"
					}}
					type="file"
					ref={this.fileSelectorRef}
					onChange={this.onLoad}/>
			</div>
		</div>
	}
}