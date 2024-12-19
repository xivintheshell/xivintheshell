import React, { CSSProperties } from "react";
import { clearCachedValues } from "../Controller/Common";
import { Expandable, Help, ButtonIndicator } from "./Common";
import { localize } from "./Localization";
import changelog from "../changelog.json";
import { getCurrentThemeColors } from "./ColorTheme";
import { ShellJob } from "../Game/Constants/Common";

const THIS_DOMAIN = "https://xivintheshell.com";

const GITHUB_URL = "https://github.com/xivintheshell/xivintheshell";

// #xiv_in_the_shell_support in the Balance discord
const HELP_CHANNEL_URL = "https://discord.com/channels/277897135515762698/1307922201726685236";

const BALANCE_URL = "https://discord.gg/thebalanceffxiv";

function Changelog() {
	return <div className={"paragraph"}>
		<Expandable
			title={"Changelog"}
			titleNode={localize({ en: "Changelog", zh: "更新日志", ja: "更新履歴" })}
			defaultShow={false}
			content={
				<>
					<div>
						{changelog.map((entry) => {
							let changes: JSX.Element[] = [];
							for (let i = 0; i < entry.changes.length; i++) {
								changes.push(<div key={i}>{entry.changes[i]}</div>);
							}
							return <div className={"paragraph"} key={entry.date}>
								{entry.date}
								<br />
								{changes}
							</div>;
						})}
					</div>
					<div>
						For older changelog entries before the BLM/PCT in the Shell rejoining, see
						the old sites:&nbsp;
						<a
							target={"_blank"}
							rel={"noreferrer"}
							href={"https://miyehn.me/ffxiv-blm-rotation/"}
						>
							BLM in the Shell
						</a>
						,&nbsp;
						<a target={"_blank"} rel={"noreferrer"} href={"https://picto.zqsz.me/"}>
							PCT in the Shell
						</a>
					</div>
				</>
			}
		/>
	</div>;
}

// needs to be a function to evaluate localization
const getAcknowledgements = () => <>
	<div className="paragraph">
		{localize({
			en: <>
				<span>This tool was initially Black Mage in the Shell, </span>
				<span>
					ideated by <b>Eshiya (Galahad)</b> and developed by <b>miyehn</b> specifically
					for BLM during Endwalker since around February 2022.{" "}
				</span>
				<span>
					After Dawntrail's release, it was expanded to support other jobs and is now
					maintained by a small team of developers:
				</span>
			</>,
			zh: <>
				<span>
					本工具起初是由加拉哈德构想、由miyehn开发的黑魔排轴器，于2022年2月开工，陪黑魔们走过了大半段6.x时期。
				</span>
				<span>
					7.0发售后，它被重构并逐渐开始支持更多职业，现在的排轴器由多名开发共同维护：
				</span>
			</>,
		})}
	</div>
	{localize({
		en: <ul>
			<li>
				Tool design and core systems: <b>shanzhe</b>, <b>miyehn</b>, <b>Turtle</b>,{" "}
				<b>Akairyu</b>
			</li>
			<li>
				BLM: <b>shanzhe</b>, <b>Akairyu</b>, <b>Turtle</b>, <b>miyehn</b>
			</li>
			<li>
				PCT, RDM: <b>shanzhe</b>
			</li>
			<li>
				SAM: <b>Sterling</b>, <b>shanzhe</b>
			</li>
			<li>
				DNC, MCH, BRD: <b>Akairyu</b>
			</li>
			<li>
				RPR: <b>Honey B. Lovely's Favorite Bee</b>
			</li>
			<li>
				WAR: <b>misterperson</b>
			</li>
			<li>
				Framework for adding new jobs: <b>shanzhe</b>
			</li>
			<li>
				Chinese localization: <b>miyehn</b>, <b>Eshiya</b>, <b>Yuyuka</b>, <b>shanzhe</b>
			</li>
		</ul>,
		zh: <ul>
			<li>
				工具设计和核心系统：<b>shanzhe</b>、<b>miyehn</b>、<b>Turtle</b>、<b>Akairyu</b>
			</li>
			<li>
				黑魔：<b>shanzhe</b>、<b>Akairyu</b>、<b>Turtle</b>、<b>miyehn</b>
			</li>
			<li>
				画家、赤魔：<b>shanzhe</b>
			</li>
			<li>
				武士：<b>Sterling</b>、<b>shanzhe</b>
			</li>
			<li>
				舞者、机工、吟游诗人：<b>Akairyu</b>
			</li>
			<li>
				镰刀：<b>Honey B. Lovely's Favorite Bee</b>
			</li>
			<li>
				战士：<b>misterperson</b>
			</li>
			<li>
				添加新职业的程序框架：<b>shanzhe</b>
			</li>
			<li>
				中文本地化：<b>miyehn</b>、<b>加拉哈德</b>、<b>鱼卡</b>、<b>shanzhe</b>
			</li>
		</ul>,
	})}
	<div className="paragraph">
		{localize({
			en:
				"And many thanks to Yara, Spider, Santa, players in 不打冰三攻略组, kiyozero, czmm, " +
				"and other players and groups who contributed feature suggestions, timeline markers, bug reports, etc.",
			zh: "同时，感谢Yara、Spider、Santa、不打冰三攻略组成员、kiyozero、czmm等，以体验反馈、报bug、时间轴标记等形式为这个工具作出过无私贡献的玩家们。",
		})}
	</div>

	{localize({
		en: <div className={"paragraph"}>
			If you have questions or would like to provide feedback, you can message in{" "}
			<a target={"_blank"} href={HELP_CHANNEL_URL} rel="noreferrer">
				this channel in The Balance
			</a>{" "}
			(requires the "Misc. Support" role). In case of sending a bug report, attaching the
			fight record (download "fight.txt" from the bottom or name it anything else) would be
			very helpful.
		</div>,
		zh: <div className={"paragraph"}>
			<span>
				如果遇到bug或者有任何工具相关的问题和建议，都欢迎反馈给我们，可请不打冰三攻略组的黑魔们或鱼卡转达，或加miyehn的QQ（870340705，加时请注明来意）。
			</span>
			<span>
				如果是反馈bug，最好把能够复现bug的战斗记录文件（从下方下载的fight.txt）一起发过来。
			</span>
		</div>,
		ja: <div className={"paragraph"}>
			[outdated (ja)]
			質問、バグ報告、機能提案などがある場合は、Discord（miyehn）またはメール（ellyn.waterford@gmail.com）でお問い合わせください。
			バグ報告の場合は、右側からダウンロードした「fight.txt」を添付していただくと助かります。
		</div>,
	})}
</>;

export function IntroSection(props: { job: ShellJob }) {
	let smallGap: CSSProperties = { marginBottom: 5 };
	let colors = getCurrentThemeColors();
	const job = props.job;
	return <div>
		<Expandable
			defaultShow={true}
			title={"instructions"}
			titleNode={
				<span>
					{localize({ en: "Instructions ", zh: "使用说明 ", ja: "説明 " })}
					<Help
						topic={"expandable"}
						content={localize({
							en: "click me to expand or collapse",
							zh: "点击展开/折叠",
							ja: "クリックして開閉する",
						})}
					/>
				</span>
			}
			content={
				<div>
					<div className="paragraph">
						<b>{localize({ en: "General Usage", zh: "基本用法", ja: "使い方" })}</b>
					</div>
					{localize({
						en: <ul>
							<li style={smallGap}>
								Set your stats in <b>Config</b> on the right, then{" "}
								<ButtonIndicator text={"apply and reset"} />
							</li>
							<li style={smallGap}>
								Click on a skill to use it. If it's not ready yet, click on it again
								will wait and retry.
							</li>
							<li style={smallGap}>
								Press <ButtonIndicator text={"u"} /> to delete the last added action
								(effective when not running in real-time).
							</li>
							<li style={smallGap}>
								Click on a buff applied to self to remove it. Unless it's ley lines,
								in which case it can be re-enabled.
							</li>
						</ul>,
						zh: <ul>
							<li style={smallGap}>
								在右边<b>属性设置</b>里输入装备数据，然后点击{" "}
								<ButtonIndicator text={"应用并重置时间轴"} />
							</li>
							<li style={smallGap}>
								单击使用技能，如果CD还没转好，可以再次点击，会自动等到转好然后重试。
							</li>
							<li style={smallGap}>
								按 <ButtonIndicator text={"u"} />{" "}
								删除时间线上的最后一个操作（实时模式下此操作无效）。
							</li>
							<li style={smallGap}>
								左键单击可以移除自己身上的buff。黑魔纹除外，黑魔纹在单击关闭后可以被再次点击开启。
							</li>
						</ul>,
						ja: <ul>
							<li style={smallGap}>
								右側にある<b>設定</b>でステータスをセットしてから
								<ButtonIndicator text={"適用とリセット"} />
								をクリックしてください。
							</li>
							<li style={smallGap}>
								実行したいアクションをクリックしてください。リキャストが戻ってきていないアクションをクリックすると使用可能な時間まで待って再実行します。
							</li>
							<li style={smallGap}>
								<ButtonIndicator text={"u"} />
								を押すと最後に追加されたアクションを削除できます。
							</li>
							<li style={smallGap}>
								黒魔紋以外のバフをクリックすると削除できます。黒魔紋はバフの有効無効を切り替えられます。
							</li>
						</ul>,
					})}
					<div className="paragraph">
						<b>{localize({ en: "Timeline", zh: "时间轴", ja: "タイムライン" })}</b>
					</div>
					{localize({
						en: <ul>
							<li style={smallGap}>
								Holding <ButtonIndicator text={"shift"} /> lets you scroll
								horizontally
							</li>
							<li style={smallGap}>
								Click to select/unselect a single skill on the timeline. Shift click
								to select a sequence of skills
							</li>
							<li style={smallGap}>
								<ButtonIndicator text={"backspace"} /> or{" "}
								<ButtonIndicator text={"delete"} /> to delete the selected skill and
								everything after it
							</li>
							<li style={smallGap}>
								Click on the timeline's ruler-like header to view historical game
								states. While doing so, the main control region will have an{" "}
								<b style={{ color: "darkorange" }}>orange</b> border and you will
								not be able to use skills. Click on somewhere else on the timeline
								to cancel.
							</li>
						</ul>,
						zh: <ul>
							<li style={smallGap}>
								按住 <ButtonIndicator text={"shift"} />{" "}
								时滑动鼠标滚轮可以横向滚动时间线。
							</li>
							<li style={smallGap}>
								单击选中/取消选中时间轴上的单个技能。已经选中一个技能时，按住{" "}
								<ButtonIndicator text={"shift"} />{" "}
								点击另一个技能会选中期间的所有操作。
							</li>
							<li style={smallGap}>
								按 <ButtonIndicator text={"backspace"} /> 或{" "}
								<ButtonIndicator text={"delete"} /> 删除选中技能及其之后的所有操作。
							</li>
							<li style={smallGap}>
								选中某技能或者刻度上的某时间时，可以看到相应时间的职业资源状态。此时控制区域边框变为
								<b style={{ color: "darkorange" }}>橙色</b>
								且无法使用技能。点击控制区域或时间轴空白处取消。
							</li>
						</ul>,
						ja: <ul>
							<li style={smallGap}>
								<ButtonIndicator text={"shift"} />
								を押しながらスクロールすると横スクロールできます。
							</li>
							<li style={smallGap}>
								タイムライン上のアクションをクリックすると選択できます。
								<ButtonIndicator text={"shift"} />
								を押しながらクリックすると複数選択できます。
							</li>
							<li style={smallGap}>
								<ButtonIndicator text={"backspace"} />か
								<ButtonIndicator text={"delete"} />
								を押すと選択中のアクションとそれ以降のアクションを全て削除します。
							</li>
							<li style={smallGap}>
								タイムラインの経過時間が表示されているヘッダー部分をクリックするとメインコントロールの枠が
								<b style={{ color: "darkorange" }}>オレンジ</b>
								になり、その瞬間の状態を確認できます。
								その間はアクションを実行できません。他の場所をクリックするとキャンセルされ通常モードに戻ります。
							</li>
						</ul>,
					})}

					{localize({
						en: <div className={"paragraph"}>
							<span style={{ color: colors.fileDownload, cursor: "pointer" }}>
								<u>[these]</u>
							</span>{" "}
							are file download links. Click to download, or right click to choose
							save location.
						</div>,
						zh: <div className={"paragraph"}>
							<span style={{ color: colors.fileDownload, cursor: "pointer" }}>
								<u>[这样的按钮]</u>
							</span>{" "}
							是文件下载链接，可以点击直接下载也可以右键另存为。
						</div>,
						ja: <div className={"paragraph"}>
							<span style={{ color: colors.fileDownload, cursor: "pointer" }}>
								<u>[このように表示されている部分]</u>
							</span>
							はダウンロードリンクです。クリックしてダウンロードするか右クリックで場所を指定してダウンロードできます。
						</div>,
					})}

					{localize({
						en: <div className="paragraph">
							You can save/load fight records at the bottom, under the{" "}
							<b>Import/Export</b> tab. Most edits are also automatically saved in
							your browser cache, so it's generally okay to refresh the page and not
							worry about losing progress.
						</div>,
						zh: <div className="paragraph">
							工具最下方的 <b>导入/导出</b>{" "}
							区域有链接可以保存/加载战斗记录。大部分编辑也都会被保存在浏览器缓存，所以一般情况下刷新网页也不会丢失数据。
						</div>,
						//ja: <div className="paragraph">[outdated (ja)] 右側の最下部からデータのセーブとロードができます。ほとんどの編集内容はブラウザのキャッシュにも保存されるためページをリロードをしても失われることはありません。</div>,
					})}

					{localize({
						en: <div className="paragraph">
							Hover over <Help topic={"sampleTips"} content={"sample tip"} />{" "}
							everywhere to see more tips.
						</div>,
						zh: <div className="paragraph">
							鼠标悬浮在各处的 <Help topic={"sampleTips"} content={"我是一个说明"} />{" "}
							上查看更多使用说明。
						</div>,
						ja: <div className="paragraph">
							<Help topic={"sampleTips"} content={"サンプルのヘルプテキストです"} />
							をホバーするとヘルプテキストを確認できます。
						</div>,
					})}
					<div className="paragraph" style={{ marginTop: 16 }}>
						<Expandable
							title={"Troubleshoot"}
							titleNode={localize({
								en: <b>troubleshoot</b>,
								zh: <b>常见问题</b>,
								ja: <b>トラブルシューティング</b>,
							})}
							content={
								<>
									{localize({
										en: <div>
											<div className="paragraph">
												I can't guarantee that my updates are always
												backward compatible. If your fight record files
												aren't loading properly but you don't understand
												why, contact me and I'll try my best to help.
											</div>
											<div className="paragraph">
												If the browser cache is somehow messed up (likely
												due to invalid game states), this is how to reset
												it:
												<br />
												Enter this tool from{" "}
												<b>{THIS_DOMAIN + "/#/{command}"}</b> replacing{" "}
												<b>{"{command}"}</b> with one of the following:
												<ul>
													<li style={smallGap}>
														<b>resetResourceOverrides</b>: delete all
														resource overrides and all actions on the
														current timeline.
													</li>
													<li style={smallGap}>
														<b>resetAll</b>: delete all browser-cached
														settings.
													</li>
												</ul>
											</div>
										</div>,
										zh: <div>
											<div className="paragraph">
												我无法保证每次更新都能兼容已有的战斗记录文件。如果你的战斗记录无法被正常导入但你不清楚原因，可以联系我，我会尽力帮一起看。
											</div>
											<div className="paragraph">
												如果浏览器缓存因不明原因出问题（比如预设了刚打完绝望满蓝这样的“非法状态”），可尝试用以下方法重置浏览器缓存：
												<br />
												用以下链接进入本工具：
												<b>{THIS_DOMAIN + "/#/{command}"}</b>，然后把
												<b>{"{command}"}</b>替换成以下两个指令之一：
												<ul>
													<li style={smallGap}>
														<b>resetResourceOverrides</b>:
														删除当前时间线上的所有资源预设和技能
													</li>
													<li style={smallGap}>
														<b>resetAll</b>:
														删除所有本工具相关的浏览器缓存
													</li>
												</ul>
											</div>
										</div>,
										ja: <div>
											<div className="paragraph">
												後方互換性があるとは限りません。保存したファイルが正しく読み込まれず、その理由がわからない場合はお問い合わせください。できる限りお手伝いします。
											</div>
											<div className="paragraph">
												ブラウザのキャッシュが何らかの理由で壊れている場合、次の方法でリセットできます。
												<br />
												<b>{THIS_DOMAIN + "/#/{command}"}</b> にアクセスし、
												<b>{"{command}"}</b>{" "}
												を以下のいずれかに置き換えます：
												<ul>
													<li style={smallGap}>
														<b>resetResourceOverrides</b>:
														全てのリソースとタイムライン上のアクションを上書きします。
													</li>
													<li style={smallGap}>
														<b>resetAll</b>:
														全てのブラウザキャッシュを削除します。
													</li>
												</ul>
											</div>
										</div>,
									})}
									<div>
										{localize({ en: "Or just: ", zh: "或者直接：" })}
										<button
											style={{ color: "#be0f0f" }}
											onClick={() => {
												clearCachedValues();
												window.location.reload();
											}}
										>
											{localize({
												en: "[DANGER!] clear browser cache and reload",
												zh: "[谨慎操作] 清除缓存并刷新",
												ja: "[キケン！] ブラウザキャッシュをクリアしてリロード",
											})}
										</button>
									</div>
								</>
							}
						/>
					</div>
				</div>
			}
		/>
		<Expandable
			defaultShow={false}
			title={"About this tool"}
			titleNode={localize({ en: "About this tool", zh: "关于", ja: "このツールについて" })}
			content={
				<div>
					<div className="paragraph">
						{localize({
							en: "This is a FFXIV simulator & rotation planner.",
							zh: "是个FF14模拟器/排轴工具。",
							ja: "FF14のスキルローテーションシミュレーターです。",
						})}
					</div>
					{getAcknowledgements()}
					<div className="paragraph">
						{localize({ en: "Some links:", zh: "一些链接：", ja: "リンク集" })}
					</div>
					{localize({
						en: <ul>
							<li>
								<a href={GITHUB_URL}>Github repository</a>
							</li>
							<li>
								<a href={"https://miyehn.me/ffxiv-blm-rotation-endwalker/"}>
									Black Mage in the Shell (Endwalker)
								</a>
								: a snapshot of this tool at the end of Endwalker. It also contains
								some notable fight plans from Endwalker, as memoir.
							</li>
							<li>
								<a href={"https://spide-r.github.io/ffxiv-blm-rotation/"}>
									Black Mage in the Bozjan Shell
								</a>
								: a variation for Save the Queens areas, created by{" "}
								<b>A'zhek Silvaire @ Zalera</b>
							</li>
							<li>
								<a href={"https://na.finalfantasyxiv.com/jobguide/battle/"}>
									Official FFXIV job guides
								</a>
							</li>
							<li>
								The Balance's community{" "}
								<a href={"https://www.thebalanceffxiv.com/"}>job guides</a> and{" "}
								<a href={BALANCE_URL}>Discord</a>
							</li>
						</ul>,
						zh: <ul>
							<li>
								<a href={GITHUB_URL}>Github页面</a>
							</li>
							<li>
								<a href={"https://miyehn.me/ffxiv-blm-rotation-endwalker/"}>
									6.x版排轴器
								</a>
								，历史版本黑魔排轴器。那里也公开展示着一些6.x时期的轴作为纪念。
							</li>
							<li>
								<a href={"https://spide-r.github.io/ffxiv-blm-rotation/"}>
									博兹雅版排轴器（Black Mage in the Bozjan Shell）
								</a>
								: 本工具的博兹雅/天佑女王版。制作者：{" "}
								<b>A'zhek Silvaire @ Zalera</b>
							</li>
							<li>
								<a href={"https://na.finalfantasyxiv.com/jobguide/battle/"}>
									官方各职业介绍（英文）
								</a>
							</li>
							<li>
								The Balance
								<a href={"https://www.thebalanceffxiv.com/"}>
									{" "}
									玩家社区攻略（英文）
								</a>
								和 <a href={BALANCE_URL}>Discord服务器</a>
							</li>
						</ul>,
						ja: <ul>
							{
								/*[outdated (ja)]*/ <>
									<li>
										<a href={GITHUB_URL}>Github repository</a>
									</li>
									<li>
										<a href={"https://spide-r.github.io/ffxiv-blm-rotation/"}>
											Black Mage in the Bozjan Shell
										</a>
										: 南方ボズヤ戦線向けのツール。作者：
										<b>A'zhek Silvaire @ Zalera</b>
									</li>
									<li>
										<a
											href={
												"https://na.finalfantasyxiv.com/jobguide/blackmage/"
											}
										>
											Official FFXIV black mage job guide
										</a>
									</li>
									<li>
										<a target={"_blank"} href={BALANCE_URL} rel="noreferrer">
											{job} resources channel on The Balance
										</a>{" "}
										（ぜひDiscordサーバーに参加してください。）{" "}
									</li>
								</>
							}
						</ul>,
					})}
					<Changelog />
				</div>
			}
		/>
	</div>;
}
