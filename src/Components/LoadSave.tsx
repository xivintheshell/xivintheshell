import React from 'react'
import {FileFormat, Help, loadFromFile, SaveToFile} from "./Common";
import {controller} from "../Controller/Controller";
import {FileType} from "../Controller/Common";
import {localize} from "./Localization";

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
		});

		this.fileSelectorRef = React.createRef();
	}
	render() {
		return <div className={"loadSave"}>
			<div>
				{localize({
					en: "download fight record: ",
					zh: "下载战斗记录："
				})}
				<SaveToFile fileFormat={FileFormat.Json} getContentFn={()=>{
					return controller.record.serialized();
				}} filename={"fight"} displayName={localize({
					en: "txt format",
					zh: "txt格式"
				})}/>
				<SaveToFile fileFormat={FileFormat.Csv} getContentFn={()=>{
					return controller.getActionsLogCsv();
				}} filename={"fight"} displayName={localize({
					en: "csv format",
					zh: "csv格式"
				})}/><Help topic={"fight-txt-csv"} content={localize({
					en: "only txt can be imported later; csv is for using with external tools such as excel.",
					zh: "只有txt可以被导入，csv是导出给excel等外部工具用的"
				})}/>
			</div>
			<div style={{marginTop: 10, marginBottom: 15}}>
				<span>{localize({en: "Load from file: ", zh: "从文件导入战斗记录："})}</span>
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