import React from 'react'
import {Columns, FileFormat, LoadJsonFromFileOrUrl, SaveToFile} from "./Common";
import {controller} from "../Controller/Controller";
import {FileType} from "../Controller/Common";
import {localize} from "./Localization";
import {ImageExport} from "./ImageExport";
import {TIMELINE_COLUMNS_HEIGHT} from "./Timeline";

type Fixme = any;

export class LoadSave extends React.Component {
	private readonly onLoad: (content: object) => void;

	constructor(props: {} | Readonly<{}>) {
		super(props);

		this.onLoad = (content: Fixme) => {
			if (content.fileType === FileType.Record) {
				// loadBattleRecordFromFile calls render methods, so no need to explicily
				// invoke updateAllDisplay here
				controller.loadBattleRecordFromFile(content);
				controller.autoSave();
			} else {
				window.alert("wrong file type '" + content.fileType + "'.");
			}
		};
	}

	render() {
		let textExportTitle = localize({
			en: "Export fight to file",
			zh: "导出战斗到文件"
		});
		let textExportContent = <div>
			<p>{localize({
				en: "for sharing and importing:",
				zh: "用于分享和导入："
			})}</p>
			<SaveToFile fileFormat={FileFormat.Json} getContentFn={()=>{
				return controller.record.serialized();
			}} filename={"fight"} displayName={localize({
				en: "txt format",
				zh: "txt格式"
			})}/>
			<p>{localize({
				en: <span>for external tools such as excel and <a href={"https://github.com/Tischel/BLMInTheShell"}>Tischel's plugin</a>:</span>,
				zh: <span>用于excel，<a href={"https://github.com/Tischel/BLMInTheShell"}>Tischel的插件</a>等外部工具：</span>
			})}</p>
			<SaveToFile fileFormat={FileFormat.Csv} getContentFn={()=>{
				return controller.getActionsLogCsv();
			}} filename={"fight"} displayName={localize({
				en: "csv format",
				zh: "csv格式"
			})}/>
			<p>
			{/* google colab probably doesn't work in China, so just link to github instead */}
			{localize({
				en: <span>for use with <a href={"https://colab.research.google.com/github/zqsz-xiv/xivintheshell-ama-sim-notebook/blob/main/in_the_shell_with_ama_sim.ipynb"}>
				Amarantine's combat simulator</a>:</span>,
				zh: <span>用于<a href={"https://github.com/Amarantine-xiv/Amas-FF14-Combat-Sim"}>Amarantine的战斗模拟器</a>而使用：</span>
			})}</p>
			<SaveToFile fileFormat={FileFormat.Csv} getContentFn={
				() => controller.getAmaSimCsv()
			} filename={"fight"} displayName={localize({
				en: "csv format",
				zh: "csv格式"
			})}/>

		</div>;
		let textImportTitle = localize({
			en: "Import fight from file",
			zh: "从文件导入战斗"
		});
		let textImportContent = <LoadJsonFromFileOrUrl allowLoadFromUrl={false} loadUrlOnMount={false} onLoadFn={this.onLoad}/>;
		let imageExportTitle = <>{localize({
			en: "Image Export",
			zh: "导出为图像"
		})}</>

		return <Columns contentHeight={TIMELINE_COLUMNS_HEIGHT}>{[
			{
				defaultSize: 25,
				title: textImportTitle,
				content: textImportContent
			},
			{
				defaultSize: 30,
				title: textExportTitle,
				content: textExportContent
			},
			{
				defaultSize: 45,
				title: imageExportTitle,
				content: <>
					{localize({
						en: <span>export the selected part of the timeline as a png,<br/>or the whole timeline if nothing is selected</span>,
						zh: "将时间轴内选择部分导出为png，如果无选择将整个时间轴导出"
					})}
					<ImageExport/>
				</>
			}
		]}</Columns>
	}
}