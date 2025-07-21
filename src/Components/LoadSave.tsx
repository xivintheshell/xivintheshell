import React, { useContext, useState } from "react";
import { Columns, FileFormat, Input, LoadJsonFromFileOrUrl, SaveToFile } from "./Common";
import { controller } from "../Controller/Controller";
import { FileType } from "../Controller/Common";
import { localize } from "./Localization";
import { ImageExport } from "./ImageExport";
import { TIMELINE_COLUMNS_HEIGHT } from "./Timeline";
import { ColorThemeContext, getThemeField } from "./ColorTheme";
import { FaCheck } from "react-icons/fa6";

type Fixme = any;

export function LoadSave() {
	const activeColorTheme = useContext(ColorThemeContext);
	const [uploadLink, setUploadLink] = useState("");
	const [uploaded, setUploaded] = useState(false);

	const onFileLoad = (content: Fixme) => {
		if (content.fileType === FileType.Record) {
			// loadBattleRecordFromFile calls render methods, so no need to explicily
			// invoke updateAllDisplay here
			controller.loadBattleRecordFromFile(content);
			controller.autoSave();
		} else if (
			content.fileType === FileType.MarkerTrackIndividual ||
			content.fileType === FileType.MarkerTracksCombined
		) {
			window.alert(
				"wrong file type '" +
					content.fileType +
					'\'; use the "Timeline markers" section instead if you meant import markers.',
			);
		} else {
			window.alert("wrong file type '" + content.fileType + "'.");
		}
	};

	const textExportTitle = localize({
		en: "Export fight to file",
		zh: "导出战斗到文件",
	});
	const textExportContent = <div>
		<p>
			{localize({
				en: "for sharing and importing:",
				zh: "用于分享和导入：",
			})}
		</p>
		<SaveToFile
			fileFormat={FileFormat.Json}
			getContentFn={() => {
				return controller.record.serialized();
			}}
			filename={"fight"}
			displayName={localize({
				en: "txt format",
				zh: "txt格式",
			})}
		/>
		<p>
			{localize({
				en: <span>
					for external tools such as excel and{" "}
					<a href={"https://github.com/Tischel/BLMInTheShell"}>Tischel's plugin</a>:
				</span>,
				zh: <span>
					用于excel，
					<a href={"https://github.com/Tischel/BLMInTheShell"}>Tischel的插件</a>
					等外部工具：
				</span>,
			})}
		</p>
		<SaveToFile
			fileFormat={FileFormat.Csv}
			getContentFn={() => {
				return { body: controller.getActionsLogCsv() };
			}}
			filename={"fight"}
			displayName={localize({
				en: "csv format",
				zh: "csv格式",
			})}
		/>
		<p>
			{/* google colab probably doesn't work in China, so just link to github instead */}
			{localize({
				en: <span>
					for use with{" "}
					<a
						href={
							"https://colab.research.google.com/github/zqsz-xiv/xivintheshell-ama-sim-notebook/blob/main/in_the_shell_with_ama_sim.ipynb"
						}
					>
						Amarantine's combat simulator
					</a>
					:
				</span>,
				zh: <span>
					用于
					<a href={"https://github.com/Amarantine-xiv/Amas-FF14-Combat-Sim"}>
						Amarantine的战斗模拟器
					</a>
					：
				</span>,
			})}
		</p>
		<SaveToFile
			fileFormat={FileFormat.Csv}
			getContentFn={() => controller.getAmaSimCsv()}
			filename={"fight"}
			displayName={localize({
				en: "csv format",
				zh: "csv格式",
			})}
		/>
	</div>;
	const textImportTitle = localize({
		en: "Import fight from file",
		zh: "从文件导入战斗",
	});
	const textImportContent = <LoadJsonFromFileOrUrl
		allowLoadFromUrl={false}
		onLoadFn={onFileLoad}
	/>;
	const imageExportTitle = <>
		{localize({
			en: "Image Export",
			zh: "导出为图像",
		})}
	</>;
	const uploadExportTitle = <>
		{localize({
			en: "Export fight to external site",
		})}
	</>;

	const uploadToURL = (evt: React.SyntheticEvent) => {
		evt.preventDefault();
		fetch(uploadLink, {
			method: "post",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(controller.record.serialized()),
		})
			.then((response) => {
				if (response.ok) {
					setUploaded(true);
				} else {
					const failMessageEn =
						"Upload failed: error " + response.status + "\n" + response.statusText;
					window.alert(
						localize({
							en: failMessageEn,
						}),
					);
					console.error(failMessageEn);
				}
			})
			.catch((error) => {
				const failMessageEn = "Upload failed:\n" + error;
				window.alert(
					localize({
						en: failMessageEn,
					}),
				);
				console.error(failMessageEn);
			});
	};
	const uploadExportContent = <div>
		<p>
			{localize({
				en:
					"Export your fight plan to an external website. " +
					"Make sure you trust whatever link you're uploading to.",
			})}
		</p>

		<form onSubmit={uploadToURL}>
			<div>
				<Input
					style={{ display: "inline-block" }}
					width={25}
					description={""}
					onChange={(s: string) => {
						setUploadLink(s);
						setUploaded(false);
					}}
				/>
				<span> </span>
				<input
					style={{ display: "inline-block" }}
					type="submit"
					value={localize({ en: "Upload" }) as string}
				/>
				{
					<FaCheck
						style={{
							display: uploaded ? "inline" : "none",
							color: getThemeField(activeColorTheme, "success") as string,
							position: "relative",
							top: 4,
							marginLeft: 8,
						}}
					/>
				}
			</div>
		</form>
	</div>;

	return <Columns contentHeight={TIMELINE_COLUMNS_HEIGHT}>
		{[
			{
				defaultSize: 20,
				title: textImportTitle,
				content: textImportContent,
			},
			{
				defaultSize: 26,
				title: textExportTitle,
				content: textExportContent,
			},
			{
				defaultSize: 27,
				title: imageExportTitle,
				content: <ImageExport />,
			},
			{
				defaultSize: 27,
				title: uploadExportTitle,
				content: uploadExportContent,
			},
		]}
	</Columns>;
}
