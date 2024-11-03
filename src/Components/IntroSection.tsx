import React, {CSSProperties} from 'react';
import {ShellInfo, ShellJob} from "../Controller/Common";
import {Expandable, Help, ButtonIndicator} from "./Common";
import {localize} from "./Localization";
import {DebugOptions} from "./DebugOptions";
import changelog from "../changelog.json"
import {getCurrentThemeColors} from "./ColorTheme";

const THIS_DOMAIN = {
	[ShellJob.BLM]: "https://miyehn.me/ffxiv-blm-rotation",
	[ShellJob.PCT]: "https://picto.zqsz.me",
}[ShellInfo.job];

const GITHUB_URL = "https://github.com/xivintheshell/xivintheshell";

const HELP_CHANNEL_URL = {
	[ShellJob.BLM]: "https://discordapp.com/channels/277897135515762698/1255782490862387360",
	[ShellJob.PCT]: "https://discordapp.com/channels/277897135515762698/1274591512902238270",
}[ShellInfo.job];

const RESOURCE_CHANNEL_URL = {
	[ShellJob.BLM]: "https://discordapp.com/channels/277897135515762698/1255595442926915584",
	[ShellJob.PCT]: "https://discordapp.com/channels/277897135515762698/1246222197488615524",
}[ShellInfo.job];

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

// needs to be a function to evaluate localization
const getAcknowledgements = () => {
	return {
		[ShellJob.BLM]: (
			<>
			<div className="paragraph">{localize({en: "This tool is made by:", zh: "作者：", ja: "作者："})}</div>
			{localize({
				en: <ul>
						<li><b>Eshiya (Galahad Donnadieu @ Exodus)</b>: the PM and the big brain BLM</li>
						<li><b>miyehn (Ellyn Waterford @ Sargatanas)</b>: initial software developer and a humble BLM student</li>
						<li><b>Turtle</b>, who did the heavy work of updating this tool from Endwalker to Dawntrail</li>
						<li><b>shanzhe (Shanzhe Qi @ Seraph)</b>, who created PCT in the Shell and the framework for adding other jobs to this tool</li>
						<li><b>Yara, Spider, Santa, Akairyu</b>, and many other players who contributed feature suggestions, timeline markers, bug reports, etc.</li>
					</ul>,
				zh: <ul>
						<li><b>Eshiya（加拉哈德 @ 沃仙曦染）</b>：PM；是个真黑魔玩家</li>
						<li><b>miyehn（米岩 @ 海猫茶屋，国服长草中）</b>：最初的程序；是个云黑魔玩家</li>
						<li><b>Turtle</b>, 把本工具从6.0更新到7.0的大功臣</li>
						<li><b>shanzhe</b>, 画家排轴器作者；为让本工具支持更多职业而搭建了程序框架</li>
						<li><b>Yara, Spider, Santa, Akairyu</b> 等，以体验反馈、报bug、时间轴标记等形式为这个工具作出过无私贡献的玩家们</li>
					</ul>,
				ja: <ul>
						{/*[outdated (ja)] hey Totti you should add yourself here too*/}
						<li><b>Eshiya (Galahad Donnadieu @ Exodus)</b>: プロダクトマネージャー、凄腕黒魔道士</li>
						<li><b>miyehn (Ellyn Waterford @ Sargatanas)</b>: ソフトウェア開発者、しがない黒魔道士</li>
						<li><b>Turtle</b>: 黄金のレガシーへのアップデートを担当</li>
						<li><b>Yara, Spider, Santa, shanzhe, Akairyu</b> そして新機能やバグ報告などで貢献してくださった多くのFF14プレーヤーの皆さん</li>
					</ul>,
			})}

			{localize({
				en: <div className={"paragraph"}>
					If you have questions or would like to provide feedback, you can message in <a target={"_blank"} href={HELP_CHANNEL_URL} rel="noreferrer">this thread in The Balance</a>.
					You can also find me directly on discord (miyehn), or via email (ellyn.waterford@gmail.com). In case of sending a bug report, attaching the
					fight record (download "fight.txt" from the bottom or name it anything else) would be very helpful.
				</div>,
				zh: <div className={"paragraph"}>
					如果遇到bug或者有任何工具相关的问题和建议，都欢迎反馈给我（miyehn），可请不打冰三攻略组的黑魔们转达，或加我QQ（870340705，加时请注明来意）。如果是反馈bug，最好把能够复现bug的战斗记录文件（从下方下载的fight.txt）一起发过来。
				</div>,
				ja: <div className={"paragraph"}>
					[outdated (ja)] 質問、バグ報告、機能提案などがある場合は、Discord（miyehn）またはメール（ellyn.waterford@gmail.com）でお問い合わせください。
					バグ報告の場合は、右側からダウンロードした「fight.txt」を添付していただくと助かります。
				</div>,
			})}

			<div className="paragraph">{localize({
				en: "Also, consider contributing! I'm not raiding lately so I can't make the timeline markers..",
				zh: "贡献大欢迎！比如给我发时间轴标记文件！我自己很久没打高难了，自己做是不可能了。",
				ja: "また、ぜひ貢献も考えてください！最近高難易度にコンテンツに行っていないのでタイムラインマーカーが作れません...",
			})}</div>
			</>
		),
		[ShellJob.PCT]: (
			<>
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
					fight record (download "fight.txt" from the bottom or name it anything else) would be very helpful.
					</div>,
				zh: <div className={"paragraph"}>
					如果你遇到了任何问题或想提供建议，你可以在The Balance的discord频道中的<a target={"_blank"} href={HELP_CHANNEL_URL} rel="noreferrer">【这个分支】</a>留言。你也可以直接在discord上找到我（在The Balance的频道中@shanzhe），或者在GitHub上报问题（链接在下面）。
					如果是反馈bug，最好把能够复现bug的战斗记录文件（下方的下载战斗记录-txt格式，随意命名）一起发过来。
					如果不方便翻墙或者想用中文反馈，也可以联系yuyuka代为传达（QQ：865835107，加时请注明来意）
				</div>
			})}
			</>
		),
	}[ShellInfo.job];
};

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
						<li style={smallGap}>Set your stats in <b>Config</b> on the right, then <ButtonIndicator text={"apply and reset"}/></li>
						<li style={smallGap}>Click on a skill to use it. If it's not ready yet, click on it again will wait and retry.</li>
						<li style={smallGap}>Press <ButtonIndicator text={"u"}/> to delete the last added action (effective when not running in real-time).</li>
						<li style={smallGap}>Click on a buff applied to self to remove it. Unless it's ley lines, in which case it can be re-enabled.</li>
					</ul>,
					zh: <ul>
						<li style={smallGap}>在右边<b>属性设置</b>里输入装备数据，然后点击 <ButtonIndicator text={"应用并重置时间轴"}/></li>
						<li style={smallGap}>单击使用技能，如果CD还没转好，可以再次点击，会自动等到转好然后重试。</li>
						<li style={smallGap}>按 <ButtonIndicator text={"u"}/> 删除时间线上的最后一个操作（实时模式下此操作无效）。</li>
						<li style={smallGap}>左键单击可以移除自己身上的buff。黑魔纹除外，黑魔纹在单击关闭后可以被再次点击开启。</li>
					</ul>,
					ja: <ul>
						<li style={smallGap}>右側にある<b>設定</b>でステータスをセットしてから<ButtonIndicator text={"適用とリセット"}/>をクリックしてください。</li>
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
					en: <div className="paragraph">You can save/load fight records at the bottom, under the <b>Import/Export</b> tab. Most edits are also automatically saved in your browser cache, so it's generally okay to refresh the page and not worry about losing progress.</div>,
					zh: <div className="paragraph">工具最下方的 <b>导入/导出</b> 区域有链接可以保存/加载战斗记录。大部分编辑也都会被保存在浏览器缓存，所以一般情况下刷新网页也不会丢失数据。</div>,
					//ja: <div className="paragraph">[outdated (ja)] 右側の最下部からデータのセーブとロードができます。ほとんどの編集内容はブラウザのキャッシュにも保存されるためページをリロードをしても失われることはありません。</div>,
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
								Enter this tool from <b>{THIS_DOMAIN + "/#/{command}"}</b> replacing <b>{"{command}"}</b> with one of the following:
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
								用以下链接进入本工具：<b>{THIS_DOMAIN + "/#/{command}"}</b>，然后把<b>{"{command}"}</b>替换成以下两个指令之一：
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
									<b>{THIS_DOMAIN + "/#/{command}"}</b> にアクセスし、<b>{"{command}"}</b> を以下のいずれかに置き換えます：
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
					en: "This is a FFXIV " + {
						[ShellJob.BLM]: "black mage",
						[ShellJob.PCT]: "pictomancer",
					}[ShellInfo.job] + " simulator & rotation planner.",
					zh: "是个" + {
						[ShellJob.BLM]: "黑魔",
						[ShellJob.PCT]: "绘灵法师",
					}[ShellInfo.job] + "模拟器/排轴工具。",
					ja: "FF14 " + {
						[ShellJob.BLM]: "黒魔道士",
						[ShellJob.PCT]: "ピクトマンサー",
					}[ShellInfo.job] + "のスキルローテーションシミュレーターです。"})}
				</div>
				{getAcknowledgements()}
				<div className="paragraph">{localize({en: "Some links:", zh: "一些链接：", ja: "リンク集"})}</div>
				{localize({
					en: <ul>
						{ShellInfo.job === ShellJob.BLM && <>
						<li><a href={GITHUB_URL}>Github repository</a></li>
						<li><a href={"https://picto.zqsz.me/"}>Pictomancer in the Shell</a> by <b>shanzhe</b>, for those of you who picked up the paint brush</li>
						<li><a href={"https://akairyugestalter.github.io/ffxiv-blm-rotation/"}>Black Mage in the Shell (Dawntrail at LV90)</a>: a variation for planning fights at LV90, created by <b>Akairyu</b></li>
						<li><a href={"https://miyehn.me/ffxiv-blm-rotation-endwalker/"}>Black Mage in the Shell (Endwalker)</a>: a snapshot of this tool at the end of Endwalker. It also contains some notable fight plans from Endwalker, as memoir.</li>
						<li><a href={"https://spide-r.github.io/ffxiv-blm-rotation/"}>Black Mage in the Bozjan Shell</a>: a variation for Save the Queens areas, created by <b>A'zhek Silvaire @ Zalera</b></li>
						<li><a href={"https://na.finalfantasyxiv.com/jobguide/blackmage/"}>Official FFXIV black mage job guide</a></li>
						</>}
						{ShellInfo.job === ShellJob.PCT && <>
						<li><a href={GITHUB_URL}>Github repository</a></li>
						<li><a href={"https://miyehn.me/ffxiv-blm-rotation/"}>Black Mage in the Shell</a></li>
						<li><a href={"https://na.finalfantasyxiv.com/jobguide/pictomancer/"}>Official FFXIV pictomancer job guide</a></li>
						</>}
						<li><a target={"_blank"} href={RESOURCE_CHANNEL_URL} rel="noreferrer">
							{ShellInfo.job} resources channel on The Balance</a> (make sure you've already joined the server)</li>
					</ul>,
					zh: <ul>
						{ShellInfo.job === ShellJob.BLM && <>
						<li><a href={GITHUB_URL}>Github页面</a></li>
						<li><a href={"https://picto.zqsz.me/"}>绘灵法师排轴器</a>，由<b>shanzhe</b>制作并维护，给那些拾起了画笔的黑黑</li>
						<li><a href={"https://akairyugestalter.github.io/ffxiv-blm-rotation/"}>7.x版排轴器（90级）</a>，可以用来给TOP等副本排轴，作者是<b>Akairyu</b></li>
						<li><a href={"https://miyehn.me/ffxiv-blm-rotation-endwalker/"}>6.x版排轴器</a>，历史版本。那里也公开展示着一些6.x时期的轴作为纪念。</li>
						<li><a href={"https://spide-r.github.io/ffxiv-blm-rotation/"}>博兹雅版排轴器（Black Mage in the Bozjan Shell）</a>: 本工具的博兹雅/天佑女王版。制作者： <b>A'zhek Silvaire @ Zalera</b></li>
						<li><a href={"https://na.finalfantasyxiv.com/jobguide/blackmage/"}>官方的黑魔法师职业介绍</a></li>
						<li><a target={"_blank"} href={RESOURCE_CHANNEL_URL} rel="noreferrer">
							The Balance服务器里的黑魔频道</a> （需要先加入Discord服务器）</li>
						</>}
						{ShellInfo.job === ShellJob.PCT && <>
						<li><a href={GITHUB_URL}>Github页面</a></li>
						<li><a href={"https://miyehn.me/ffxiv-blm-rotation/"}>Black Mage in the Shell</a></li>
						<li><a target={"_blank"} href={RESOURCE_CHANNEL_URL} rel="noreferrer">
							The Balance服务器里的PCT频道</a> （需要先加入Discord服务器）</li>
						</>}
					</ul>,
					ja: <ul>
						{ShellInfo.job === ShellJob.BLM && <>
						<li><a href={"https://github.com/miyehn/ffxiv-blm-rotation"}>Github repository</a></li>
						<li><a href={"https://spide-r.github.io/ffxiv-blm-rotation/"}>Black Mage in the Bozjan Shell</a>: 南方ボズヤ戦線向けのツール。作者：<b>A'zhek Silvaire @ Zalera</b></li>
						<li><a href={"https://na.finalfantasyxiv.com/jobguide/blackmage/"}>Official FFXIV black mage job guide</a></li>
						<li><a target={"_blank"} href={RESOURCE_CHANNEL_URL} rel="noreferrer">
							BLM resources channel on The Balance</a> （ぜひDiscordサーバーに参加してください。） </li>
						</>}
						{ShellInfo.job === ShellJob.PCT && <>
						<li><a href={GITHUB_URL}>Github repository</a></li>
						<li><a href={"https://miyehn.me/ffxiv-blm-rotation/"}>Black Mage in the Shell</a></li>
						<li><a target={"_blank"} href={RESOURCE_CHANNEL_URL} rel="noreferrer">
							{ShellInfo.job} resources channel on The Balance</a> （ぜひDiscordサーバーに参加してください。） </li>
						</>}
					</ul>,
				})}
				{ShellInfo.job === ShellJob.PCT &&
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
						</ul>
					})}
					</div>
				}/>
				</div>
				}
				{ShellInfo.job === ShellJob.BLM &&
				<div className="paragraph"><Expandable title={"Implementation notes"} titleNode={localize({en: "Implementation notes", zh: "实现细节", ja: "実装に関するメモ"})} defaultShow={false} content={
					<div>
						{localize({
							en:
								<div className="paragraph">
									[DT] Ice spells seem to grant MP when they land on target(s), aka skillApplicationDelay seconds after snapshot. See <a href={"https://drive.google.com/file/d/1fnjBoXlbIQR1StFlfrwH6eQYE90rV1V5/view?usp=drive_link"}>this screen recording</a>.
									Note that Umbral Soul also has ~0.633s skill application delay.
								</div>,
							zh:
								<div className="paragraph">
									[7.0] 从录屏（<a href={"https://drive.google.com/file/d/1fnjBoXlbIQR1StFlfrwH6eQYE90rV1V5/view?usp=drive_link"}>Google Drive</a>）来看，冰技能是在伤害判定的瞬间回蓝。顺便，灵极魂也有0.633秒左右的技能生效延迟，按下技能后需要等待相应时间才有回蓝。
								</div>
						})}
						{localize({
							en:
								<div className="paragraph">
									[DT] Manafont now has a much shorter (~0.2s) skill application delay compared to in EW. In fact only MP regen from Manafont has this delay; all other effects seem instant.
								</div>,
							zh:
								<div className="paragraph">
									[7.0] 魔泉的生效延迟跟6.0相比缩短了很多，目前只有0.2秒左右。而且只有回蓝受这个延迟影响，其它效果都是瞬发。
								</div>
						})}
						{localize({
							en:
								<div className="paragraph">
									[DT] I re-measured some buff timings from <a href={"https://drive.google.com/drive/folders/1Jp6UEGRLlruERpyQ9CuEMXFsOaVixx48?usp=drive_link"}>screen recordings</a>. Lmk if you have something more exact.
								</div>,
							zh:
								<div className="paragraph">
									[7.0] 我通过录屏（<a href={"https://drive.google.com/drive/folders/1Jp6UEGRLlruERpyQ9CuEMXFsOaVixx48?usp=drive_link"}>Google Drive</a>）的方式重新测量了几个buff的实际持续时长（有的实际时长比技能描述稍长一些）。如果你有更准确的数据，请务必联系我。
								</div>
						})}
						{localize({
							en:
								<div className="paragraph">
									Galahad found that slidecast window size is linear with respect to cast time. I made a <a href={"https://github.com/miyehn/ffxiv-blm-rotation/tree/main/scripts"}>script</a>, parsed
									a few logs and confirmed this. Albeit the slope is tiny (~0.02) so I'm just using 0.5s here
									for simplicity.
								</div>,
							zh:
								<div className="paragraph">
									根据加拉哈德的一个理论，滑步窗口长度和读条时间呈线性关系；我写了<a href={"https://github.com/miyehn/ffxiv-blm-rotation/tree/main/scripts"}>这个脚本</a>去扒logs记录，证明此理论是基本准确的。由于这个理论的实际影响非常小（斜率约0.02），实际的滑步窗口还是被设置成了恒定的0.5秒。
							</div>,
							ja:
								<div className="paragraph">
									Galahad によると滑り撃ちの有効時間がキャスト時間に比例するため、私は<a href={"https://github.com/miyehn/ffxiv-blm-rotation/tree/main/scripts"}>スクリプト</a>を作成していくつかのログを解析して確認しました。傾きは~0.02と非常に小さいため単純化して0.5秒としました。</div>,
						})}
						{localize({
							en:
								<div className="paragraph">
									Astral fire / umbral ice refresh happens at slidecast timing (0.5s before cast finishes)
								</div>,
							zh:
								<div className="paragraph">
									天语状态会在滑步窗口开始时刷新，也就是读条结束前0.5秒。
								</div>,
							ja:
								<div className="paragraph">
									AFとUBの更新は滑り撃ちが可能な時間と同じタイミング（キャスト終了の0.5秒前）で発生します。
								</div>,
						})}
						{localize({
							en:
								<div className="paragraph">
									Thanks to Galahad and Blink, skill application delays (see the last function
									argument <a href={"https://github.com/miyehn/ffxiv-blm-rotation/blob/main/src/Game/Skills.ts#L48"}>here</a>)
									should be pretty accurate now: looking at the logs, the ones for spells are between "prepare XX" to actual damage,
									the others from between "casts XX" to whatever the effect is (mostly buff apply/refresh times).
									Please contact me if you know how to measure the rest of missing data.
								</div>,
							zh:
								<div className="paragraph">
									感谢Blink和加拉哈德提供的各种技能后摇/生效延迟数据，详见<a href={"https://github.com/miyehn/ffxiv-blm-rotation/blob/main/src/Game/Skills.ts#L48"}>这里最后一个函数变量</a> 。这些通过log来对比技能释放时间/buff生效刷新时间获得的数据，总的来说是比较准确的。欢迎联系我来查漏补缺。
								</div>,
							ja:
								<div className="paragraph">
									Galahad と Blink のおかげでアクション適用までの遅延時間の計算はかなり正確になりました（<a href={"https://github.com/miyehn/ffxiv-blm-rotation/blob/main/src/Game/Skills.ts#L48"}>こちら</a>の関数の最後の引数を参照）。
									ログを確認すると、魔法は「prepare XX」から実際のダメージまで、その他の場合は「casts XX」から効果が発生するまでの間です（主にバフの適用/更新時間）。
									その他のデータの計測方法をご存知の場合はお知らせください。
								</div>,
							})}
						{localize ({
							en:
								<div className="paragraph">
									Lucid dreaming and thunder ticks have independent tick timers. They each have a random time offset relative to
									MP ticks. See Config section for the current offsets.
									For lucid dreaming, the earliest first tick time is 0.623s after you press the skill button. It ticks 7
									times.
								</div>,
							zh:
								<div className="paragraph">
									跳雷和跳醒梦的时间都是独立计算的，它们和普通跳蓝之间存在一个随机的时间差，这个时间差可以在右侧的设置界面查看。醒梦后的第一跳蓝最早会出现在技能释放后的0.623秒，总计7跳。
								</div>,
							ja:
								<div className="paragraph">
									ルーシッドドリームとサンダー系のティックは独立したタイマーを持っています。それぞれMPティックとは異なるランダムな時間のオフセットがあります。現在のオフセットについては設定セクションを参照してください。
									ルーシッドドリームの場合、最初のティックはスキルボタンを押してから0.623秒後に発生し7回ティックします。
								</div>,
						})}
						{localize ({
							en:
								<div className="paragraph">
									7/29/24 cast time precision update: Unlike GCDs with 2 digits of precision, cast times are now updated to use 3 digits of precision, because it matches with the game more closely.
									Here is an <a href={"https://docs.google.com/spreadsheets/d/18IN-ygAXd2zCR1A3umV3efYcy8xz6O3f/edit?usp=sharing&ouid=104672178485330237849&rtpof=true&sd=true"}>updated full SPS chart</a>. I also <a href={"https://docs.google.com/spreadsheets/d/1d_oPA34tZ-ZOxZSMI6JQDssLiXHUIVv6qmvMTFzoqL8/edit?usp=sharing"}>spammed some spells</a> and the results are in line with this chart.
									If you would like to learn more, here it is:&nbsp;
									<a href={"https://docs.google.com/document/d/1zxUd7vFfs24cGteOeCnEsoCzfDxIvKNROIvDUqG-6no/pub"}>writeup by 米露可丝沐希@延夏 et al. translated to English by shanzhe</a>. More resources (in Chinese):&nbsp;
									<a href={"/ffxiv-blm-rotation/misc/关于读条技能与瞬发技能取整精度的猜想与实验.pdf"}>some tests results and steps to reproduce</a>.
								</div>,
							zh:
								<div className="paragraph">
									7/29/24 咏唱时间精度更新：不同于精确到小数点后2位的GCD公式，现在咏唱时间的计算公式精确到小数点后3位。经测试，这个精度更吻合游戏内实际的咏唱时间。
									关于这个新的咏唱时间公式，可以详见米露可丝沐希@延夏等人的<a href={"https://www.bilibili.com/read/cv29822181/?jump_opus=1"}>这篇文章</a>。<a href={"/ffxiv-blm-rotation/misc/关于读条技能与瞬发技能取整精度的猜想与实验.pdf"}>此处</a>有部分测试结果和详细的复现步骤。<br/>
									附：目前完整的咏速表（<a
									href={"https://docs.google.com/spreadsheets/d/18IN-ygAXd2zCR1A3umV3efYcy8xz6O3f/edit?usp=sharing&ouid=104672178485330237849&rtpof=true&sd=true"}>Google Sheets</a>）。我个人做了一些测试，logs结果也符合这个改动（<a href={"https://docs.google.com/spreadsheets/d/1d_oPA34tZ-ZOxZSMI6JQDssLiXHUIVv6qmvMTFzoqL8/edit?usp=sharing"}>Google Sheets</a>）。
								</div>,
							ja:
								<div className="paragraph">
									[outdated (ja)]{/*2024/8/29: 黒魔紋上のキャストとリキャスト時間が誤っていました。現在は単純に0.85倍にしていますが、最大で0.01秒の誤差があります。Vanilla Milksmoothie が正確な値を提案してくれましたが現在は実装する時間がないため、または過去のtxtファイルが壊れる可能性があるため、実装していません。問題がある場合はお知らせください。*/}
								</div>,
						})}
						{localize({
							en:
								<div className="paragraph">
									8/23/24 FPS tax: the previous "caster tax" config is now replaced by 0.1s + FPS tax, which is also explained in the above writeup. <a href={"https://docs.google.com/document/d/1zxUd7vFfs24cGteOeCnEsoCzfDxIvKNROIvDUqG-6no/pub"}>Linking here again</a>.
								</div>,
							zh:
								<div className="paragraph">
									8/23/24 帧率税：以往的“读条税”设置现已被更精确的 0.1s + 帧率税 取代，更多信息详见上文提到的<a href={"https://www.bilibili.com/read/cv29822181/?jump_opus=1"}>米露可丝沐希@延夏等人的文章</a>。
								</div>,
						})}
					</div>

				}/>
				</div>
				}
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
