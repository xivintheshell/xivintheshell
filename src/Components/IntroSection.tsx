import React, {CSSProperties} from 'react';
import {Expandable, Help, ButtonIndicator} from "./Common";
import {localize} from "./Localization";
import {DebugOptions} from "./DebugOptions";
import changelog from "../pct_changelog.json"
import {getCurrentThemeColors} from "./ColorTheme";

const HELP_CHANNEL_URL = "https://discordapp.com/channels/277897135515762698/1274591512902238270";
const RESOURCE_CHANNEL_URL = "https://discordapp.com/channels/277897135515762698/1246222197488615524";

function Changelog() {
	return <div className={"paragraph"}><Expandable title={"Changelog"} titleNode={localize({en: "Changelog", zh: "更新日志", ja: "更新履歴"})} defaultShow={false} content={
		<div>
			{
				changelog.map(entry => {
					let changes: JSX.Element[] = [];
					for (let i = 0; i < entry.changes.length; i++) {
						changes.push(<div key={i}>{entry.changes[i]}</div>);
					}
					return <div className={"paragraph"} key={entry.date}>
						{entry.date}<br/>
						{changes}
					</div>
				})
			}
		</div>
	}/></div>
}

export function IntroSection(props: {}) {
	let smallGap: CSSProperties = { marginBottom: 5 };
	let colors = getCurrentThemeColors();
	return <div>
		<Expandable
			defaultShow={true}
			title={"instructions"}
			titleNode={<span>{localize({en: "Instructions ", zh: "使用说明 ", ja: "説明 "})}
				<Help topic={"expandable"} content={localize({en:"click me to expand or collapse", zh: "点击展开/折叠", ja: "クリックして開閉する"})}/></span>}
			content={<div>
				<div className="paragraph">
					<b>{localize({en: "General Usage", zh: "基本用法", ja: "使い方"})}</b>
				</div>
				{localize({
					en: <ul>
						<li style={smallGap}>Set your stats in <b>Config/Edit</b> on the right, then <ButtonIndicator text={"apply and reset"}/></li>
						<li style={smallGap}>Click on a skill to use it. If it's not ready yet, click on it again will wait and retry.</li>
						<li style={smallGap}>Press <ButtonIndicator text={"u"}/> to delete the last added action (effective when not running in real-time).</li>
						<li style={smallGap}>Click on a buff applied to self to remove it. Unless it's ley lines, in which case it can be re-enabled.</li>
					</ul>,
					zh: <ul>
						<li style={smallGap}>在右边 <b>设置/编辑</b> 里输入装备数据，然后点击 <ButtonIndicator text={"应用并重置时间轴"}/></li>
						<li style={smallGap}>单击使用技能，如果CD还没转好，可以再次点击，会自动等到转好然后重试。</li>
						<li style={smallGap}>按 <ButtonIndicator text={"u"}/> 删除时间线上的最后一个操作（实时模式下此操作无效）。</li>
						<li style={smallGap}>左键单击可以移除自己身上的buff。黑魔纹除外，黑魔纹在单击关闭后可以被再次点击开启。</li>
					</ul>,
					ja: <ul>
						<li style={smallGap}>右側にある<b>設定/編集</b>でステータスをセットしてから<ButtonIndicator text={"適用とリセット"}/>をクリックしてください。</li>
						<li style={smallGap}>実行したいアクションをクリックしてください。リキャストが戻ってきていないアクションをクリックすると使用可能な時間まで待って再実行します。</li>
						<li style={smallGap}><ButtonIndicator text={"u"}/>を押すと最後に追加されたアクションを削除できます。</li>
						<li style={smallGap}>黒魔紋以外のバフをクリックすると削除できます。黒魔紋はバフの有効無効を切り替えられます。</li>
					</ul>,
				})}
				<div className="paragraph">
					<b>{localize({en: "Timeline", zh: "时间轴", ja: "タイムライン"})}</b>
				</div>
				{localize({
					en: <ul>
						<li style={smallGap}>Holding <ButtonIndicator text={"shift"}/> lets you scroll horizontally</li>
						<li style={smallGap}>Click to select a skill on the timeline. Shift click to select a sequence of skills</li>
						<li style={smallGap}><ButtonIndicator text={"backspace"}/> or <ButtonIndicator text={"delete"}/> to delete the selected skill and everything after it</li>
						<li style={smallGap}>Click on the timeline's ruler-like header to view historical game states.
							While doing so, the main control region will have an <b style={{color: "darkorange"}}>orange</b> border
							and you will not be able to use skills. Click on somewhere else on the timeline to cancel.
						</li>
					</ul>,
					zh: <ul>
						<li style={smallGap}>按住 <ButtonIndicator text={"shift"}/> 时滑动鼠标滚轮可以横向滚动时间线。</li>
						<li style={smallGap}>单击可以选中时间轴上的技能。已经选中一个技能时，按住 <ButtonIndicator text={"shift"}/> 点击另一个技能会选中期间的所有操作。</li>
						<li style={smallGap}>按 <ButtonIndicator text={"backspace"}/> 或 <ButtonIndicator text={"delete"}/> 删除选中技能及其之后的所有操作。</li>
						<li style={smallGap}>选中某技能或者刻度上的某时间时，可以看到相应时间的职业资源状态。此时控制区域边框变为<b style={{color: "darkorange"}}>橙色</b>且无法使用技能。点击控制区域或时间轴空白处取消。
						</li>
					</ul>,
					ja: <ul>
						<li style={smallGap}><ButtonIndicator text={"shift"}/>を押しながらスクロールすると横スクロールできます。</li>
						<li style={smallGap}>タイムライン上のアクションをクリックすると選択できます。<ButtonIndicator text={"shift"}/>を押しながらクリックすると複数選択できます。</li>
						<li style={smallGap}><ButtonIndicator text={"backspace"}/>か<ButtonIndicator text={"delete"}/>を押すと選択中のアクションとそれ以降のアクションを全て削除します。</li>
						<li style={smallGap}>タイムラインの経過時間が表示されているヘッダー部分をクリックするとメインコントロールの枠が<b style={{color: "darkorange"}}>オレンジ</b>になり、その瞬間の状態を確認できます。
							その間はアクションを実行できません。他の場所をクリックするとキャンセルされ通常モードに戻ります。
						</li>
					</ul>
				})}

				{localize({
					en: <div className={"paragraph"}><span style={{color: colors.fileDownload, cursor: "pointer"}}><u>[these]</u></span> are file download links. Click to download, or right click to choose save location.</div>,
					zh: <div className={"paragraph"}><span style={{color: colors.fileDownload, cursor: "pointer"}}><u>[这样的按钮]</u></span> 是文件下载链接，可以点击直接下载也可以右键另存为。</div>,
					ja: <div className={"paragraph"}><span style={{color: colors.fileDownload, cursor: "pointer"}}><u>[このように表示されている部分]</u></span>はダウンロードリンクです。クリックしてダウンロードするか右クリックで場所を指定してダウンロードできます。</div>,
				})}

				{localize({
					en: <div className="paragraph">You can save/load fight records from the right, under <b>Control</b> section. Most edits are also automatically saved in your browser cache, so it's generally okay to refresh the page and not worry about losing progress.</div>,
					zh: <div className="paragraph">右侧最下方有链接可以保存/加载战斗记录。大部分编辑也都会被保存在浏览器缓存，所以一般情况下刷新网页也不会影响进度。</div>,
					ja: <div className="paragraph">右側の最下部からデータのセーブとロードができます。ほとんどの編集内容はブラウザのキャッシュにも保存されるためページをリロードをしても失われることはありません。</div>,
				})}

				{localize({
					en: <div className="paragraph">Hover over <Help topic={"sampleTips"} content={"sample tip"}/> everywhere to see more tips.</div>,
					zh: <div className="paragraph">鼠标悬浮在各处的 <Help topic={"sampleTips"} content={"我是一个说明"}/> 上查看更多使用说明。</div>,
					ja: <div className="paragraph"><Help topic={"sampleTips"} content={"サンプルのヘルプテキストです"}/>をホバーするとヘルプテキストを確認できます。</div>,
				})}
				<div className="paragraph" style={{marginTop: 16}}>
					<Expandable title={"Troubleshoot"} titleNode={localize({en: <b>troubleshoot</b>, zh: <b>常见问题</b>, ja: <b>トラブルシューティング</b>})} content={
						localize({
						en: <div>
								<div className="paragraph">
									I can't guarantee that my updates are always backward compatible. If your fight record files aren't loading properly but you don't understand why, contact me and I'll try my best to help.
								</div>
								<div className="paragraph">
								If the browser cache is somehow messed up (likely due to invalid game states), this is how to reset it:<br/>
								Enter this tool from <b>{"https://picto.zqsz.me/#/{command}"}</b> replacing <b>{"{command}"}</b> with one of the following:
								<ul>
									<li style={smallGap}><b>resetResourceOverrides</b>: delete all resource overrides and all actions on the current timeline.</li>
									<li style={smallGap}><b>resetAll</b>: delete all browser-cached settings.</li>
								</ul>
							</div>
						</div>,
						zh: <div>
							<div className="paragraph">
								我无法保证每次更新都能兼容已有的战斗记录文件。如果你的战斗记录无法被正常导入但你不清楚原因，可以联系我，我会尽力帮一起看。
							</div>
							<div className="paragraph">
								如果浏览器缓存因不明原因出问题（比如预设了刚打完绝望满蓝这样的“非法状态”），可尝试用以下方法重置浏览器缓存：<br/>
								用以下链接进入本工具：<b>{"https://picto.zqsz.me/#/{command}"}</b>，然后把<b>{"{command}"}</b>替换成以下两个指令之一：
								<ul>
									<li style={smallGap}><b>resetResourceOverrides</b>: 删除当前时间线上的所有资源预设和技能</li>
									<li style={smallGap}><b>resetAll</b>: 删除所有本工具相关的浏览器缓存</li>
								</ul>
							</div>
						</div>,
						ja: <div>
								<div className="paragraph">
									後方互換性があるとは限りません。保存したファイルが正しく読み込まれず、その理由がわからない場合はお問い合わせください。できる限りお手伝いします。
								</div>
								<div className="paragraph">
									ブラウザのキャッシュが何らかの理由で壊れている場合、次の方法でリセットできます。<br/>
									<b>{"https://picto.zqsz.me/#/{command}"}</b> にアクセスし、<b>{"{command}"}</b> を以下のいずれかに置き換えます：
								<ul>
									<li style={smallGap}><b>resetResourceOverrides</b>: 全てのリソースとタイムライン上のアクションを上書きします。</li>
									<li style={smallGap}><b>resetAll</b>: 全てのブラウザキャッシュを削除します。</li>
								</ul>
							</div>
						</div>,
						})}/>
				</div>
			</div>}
		/>
		<Expandable
			defaultShow={false}
			title={"About this tool"}
			titleNode={localize({en: "About this tool", zh: "关于", ja: "このツールについて"})}
			content={<div>
				<div className="paragraph">{localize({
					en: "This is a FFXIV pictomancer simulator & rotation planner.",
					zh: "是个画图魔（？我不知道怎么翻译）模拟器/排轴工具。",
					ja: "FF14 ピクトマンサーのスキルローテーションシミュレーターです。"})}
				</div>
				<div className="paragraph">
					{localize({en: "This tool is made by ", zh: "作者：", ja: "作者："})}
					<b>shanzhe (Shanzhe Qi @ Seraph)</b>,
					{localize({
						en: <> adapted from <a href={"https://miyehn.me/ffxiv-blm-rotation/"}>BLM in the Shell</a> by <b>miyehn</b>.</>,
						zh: <>从<b>miyehn</b>创作的<a href={"https://miyehn.me/ffxiv-blm-rotation/"}>BLM in the Shell</a>而改编。</>,
					})}
				</div>
				{localize({
					en: <div className={"paragraph"}>
						If you have questions or would like to provide feedback, you can message in <a target={"_blank"} href={HELP_CHANNEL_URL} rel="noreferrer">this thread in The Balance</a>.
						You can also find me directly on discord (@shanzhe in The Balance), or file an issue on GitHub (link below). In case of sending a bug report, attaching the
						fight record (download "fight.txt" from the right or name it anything else) would be very helpful.
						</div>
				})}

				<div className="paragraph">{localize({en: "Some links:", zh: "一些链接：", ja: "リンク集"})}</div>
				{localize({
					en: <ul>
						<li><a href={"https://github.com/zqsz-xiv/ffxiv-blm-rotation/tree/sz/picto-in-the-shell"}>Github repository</a></li>
						<li><a href={"https://miyehn.me/ffxiv-blm-rotation/"}>Black Mage in the Shell</a></li>
						<li><a href={"https://na.finalfantasyxiv.com/jobguide/pictomancer/"}>Official FFXIV pictomancer job
							guide</a></li>
						<li><a target={"_blank"} href={RESOURCE_CHANNEL_URL}>
							PCT resources channel on The Balance</a> (make sure you've already joined the server)</li>
					</ul>,
					zh: <ul>
						<li><a href={"https://github.com/zqsz-xiv/ffxiv-blm-rotation/tree/sz/picto-in-the-shell"}>Github页面</a></li>
						<li><a href={"https://miyehn.me/ffxiv-blm-rotation/"}>Black Mage in the Shell</a></li>
						<li><a target={"_blank"} href={RESOURCE_CHANNEL_URL}>
							The Balance服务器里的PCT频道</a> （需要先加入Discord服务器）</li>
					</ul>,
					ja:
						<ul>
						<li><a href={"https://github.com/zqsz-xiv/ffxiv-blm-rotation/tree/sz/picto-in-the-shell"}>Github repository</a></li>
						<li><a href={"https://miyehn.me/ffxiv-blm-rotation/"}>Black Mage in the Shell</a></li>
						<li><a target={"_blank"} href={RESOURCE_CHANNEL_URL}>
							PCT resources channel on The Balance</a> （ぜひDiscordサーバーに参加してください。） </li>
					</ul>,
				})}
				<div className="paragraph"><Expandable title={"Known issues"} titleNode={localize({en: "Known issues"})} defaultShow={false} content={
					<div>
					{localize({
						en: <ul>
							<li className="paragraph">
								We haven't tested what happens when buffs like Hyperphantasia and Aetherhues fall off mid-cast. Hopefully nothing bad.
							</li>
							<li className="paragraph">
								If Hammer Time expires, the combo should remain preserved (i.e. your next hammer would start on Polishing Hammer). We haven't implemented this.
							</li>
							<li className="paragraph">
								Hammer auto crit/DH is implemented in final potency calculations, but the multiplier is not currently displayed in self-buffs.
							</li>
							<li className="paragraph">
								Starry Muse is removed from the party buff list, even though a second Pictomancer can stagger their buff with yours. We will revisit this behavior at a later date.
							</li>
							<li className="paragraph">
								Resource overrides (initial palette/paint gauge, drawn motifs) are currently disabled. They will be enabled at a later date.
							</li>
						</ul>
					})}
					</div>
				}/>
				</div>
				<Changelog/>
				<Expandable
					defaultShow={false}
					title={"Debug"}
					content={<DebugOptions/>}
				/>
			</div>
			}
		/>
	</div>
}
