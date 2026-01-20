import React from "react";
import { ButtonIndicator } from "../Components/Common";
import { NavH3Section, NavH2Section, Screenshot } from "./Manual";
import { RANDOM_SEED_WIKI_URL } from "./Links";

const bi = (k: string) => <ButtonIndicator text={k} />;

export function TimelineCreationEn() {
	return <>
		<NavH2Section id="timeline-creation" label="Timeline Creation and Editing" />
		<NavH3Section id="setup-config" label="Setup and Configuration" />
		<p>
			The "Config" panel to the right of the skill input area lets you adjust combat
			statistics and other simulation settings.
		</p>
		<Screenshot id={1} name="config" />
		<ol>
			<li>
				<b>Etro/XivGear import</b> Import a gearset from an etro or XivGear link.
			</li>
			<li>
				<b>Job selector</b> Set the job of the active timeline slot. Combat stats will use a
				default value for the job, or the most recently-used configuration for that job.
				Resource overrides are cleared when the job changes.
			</li>
			<li>
				<b>Information area</b> Summarizes the randomly generated offset of Lucid Dreaming
				ticks (healers/casters only), DoT ticks, initial resource overrides, and random
				procs.
			</li>
			<li>
				<b>Level selector and combat stats</b> Adjust the job level and combat stats.
				Critical hit, direct hit, and determination are used to estimate the effects of
				critical hit buffs like SCH's Chain Stratagem and DNC's Devilment, and potency for
				abilities that always crit or crit-direct hit.
			</li>
			<li>
				<b>Animation lock</b> Adjust the amount of time an ability's animation takes,
				preventing you from using other abilities. This should very roughly be 0.6 + 2 ×
				(your ping). Certain abilities, such as movement skills and DRG's jumps, have
				separate animation locks that cannot be configured.
			</li>
			<li>
				<b>FPS</b> Adjust the estimated FPS of your game client. FFXIV only accepts ability
				inputs when a new frame is rendered, which can accumulate over time to create delays
				on GCD actions over the course of a fight. To ignore the effects of FPS, set this
				value to 9999.
			</li>
			<li>
				<b>GCD correction</b> Adjust the duration of GCDs and cast times. This should
				generally be left at 0, but you can use this to shorten or lengthen these durations
				if you believe the FPS correction formula is inaccurate.
			</li>
			<li>
				<b>Time till first MP tick</b> Adjust the amount of time until the first MP tick
				(also known as the "actor tick") occurs, relative to the start of the simulation.
				Mostly relevant only for BLM.
			</li>
			<li>
				<b>Countdown</b> Adjust the amount of time available pre-pull. Setting this to a
				negative value begins the simulation after the fight has begun.
			</li>
			<li>
				<b>Random seed and proc mode</b> A <a href={RANDOM_SEED_WIKI_URL}>random seed</a>{" "}
				used to determine the occurrence of random events, such as RDM's Verstone Ready and
				DNC's Feather gauge. The proc mode setting can be set to "RNG" to use this seed,
				"Never" to prevent all random events from occurring, or "Always" to make random
				events occur whenever possible.
			</li>
		</ol>
		<Screenshot id={2} name="resource_overrides" />
		<ol start={11}>
			<li>
				<b>Override initial resources</b> Specify the initial values of job gauges, status
				effects, and cooldowns. This is useful for planning specific phases of long fights
				in isolation, or for encounters that allow you to prepare resources in advance.
			</li>
			<li>
				<b>Apply/apply and reset</b> Pressing "apply" confirms any configuration changes,
				applying them to the current timeline. "Apply and reset" applies the configuration
				changes to the current timeline, and clears its previously-saved actions.
			</li>
		</ol>
		<Screenshot id={3} name="control" />
		<p>The "Control" panel contains simulation settings.</p>
		<p>
			When "real-time auto pause" mode is enabled, using an action will simulate its animation
			lock and cast time in real time, pausing when the next action can be performed.
			Adjusting the "time scale" field advances through time more quickly.
		</p>
		<p>
			When "manual" mode is enabled, animation locks and cast times are immediately skipped
			after using an action.
		</p>
		<NavH3Section id="adding-skills" label="Adding Skills, Time Delays, and Waits" />
		<Screenshot id={4} name="hotbar" />
		<p>
			Click on a skill's icon in the hotbar <b>(1)</b> to add it. It will be inserted at the
			location of the cursor in the timeline. If action(s) are currently selected, attempting
			to add a new skill will place it before the selection. Attempting to use a skill will
			automatically wait for the duration of the skill's cooldown, as well as the current
			animation lock and/or GCD before activating it.
		</p>
		<p>
			To configure the number of targets hit by an AoE ability, adjust the "# of targets hit"
			field <b>(2)</b>. This will affect all subsequent AoE ability inputs, and is ignored for
			abilities that can only hit a single target.
		</p>
		<p>
			To wait a specified duration after the end of the current animation lock, use the "wait
			until _ second(s) since" input <b>(3)</b>. This is useful for simulating deliberate
			"late weaves" with a duration of 0.6s-1.0s, depending on your needs.
		</p>
		<p>
			To jump to a specific timestamp in a fight (such as the beginning of a mechanic or the
			end of a downtime phase), use the "Wait until _" input <b>(4)</b>. This input will
			always end at the specified timestamp, even if surrounding skills are rearranged.
		</p>
		<p>
			To wait until the next MP tick or Lucid Dreaming tick, press the "Wait until MP tick /
			lucid tick" button <b>(5)</b>. This will always wait until the next tick occurs, even if
			surrounding skills are rearranged.
		</p>
		<p>
			To delete all wait events at the end of the timeline, use the "Remove trailing idle
			time" button <b>(6)</b>.
		</p>
		<p>
			To remove a buff or debuff before its natural expiration time, click its icon in the
			status section <b>(7)</b>. Ground-based abilities such as BLM's Ley Lines, SCH's Sacred
			Soil, and DRK's Salted Earth, can be temporarily disabled, then later re-enabled, by
			clicking on them here.
		</p>
		<NavH3Section id="positionals" label="Positionals and Auto-Attacks" />
		<Screenshot id={5} name="positional" />
		<p>
			Melee jobs have a pair of "Rear Positional" <b>(1)</b> and "Flank Positional" <b>(2)</b>{" "}
			buffs. Abilities with bonuses for landing positional hits will receive bonuses when the
			appropriate buff is active. Click the appropriate buff icon to toggle it. The "True
			North" buff will grant all positional bonuses, overriding the effect of these buffs.
		</p>
		<p>
			Melee and tank jobs have an additional "auto-attacks engaged" buff <b>(3)</b>. This is
			currently only used on PLD to compute Oath Gauge generation, and can be temporarily
			disabled to simulate disengagements. Using a melee-range weaponskill or ability will
			automatically re-enable auto-attacks.
		</p>
		<p>
			Potency computation for auto-attacks is not currently supported, and will be added at a
			later date.
		</p>
		<NavH3Section id="skill-sequence-presets" label="Skill Sequence Presets" />
		<Screenshot id="6" name="presets" />
		<p>
			Below the skill input window is the "skill sequence presets" menu. Here, you can add
			sequences of multiple skills that can later be added in bulk to the timeline by clicking
			on the preset entry.
		</p>
		<p>
			Skills that replace other buttons, such as GNB's Gnashing Fang combo + Continuation and
			PCT's Red/Green/Blue combo, will automatically transform into the appropriate action
			when loaded from a preset.
		</p>
		<NavH3Section id="timeline-visualization" label="Timeline Visualization" />
		<p>
			The graphical timeline displays visual information about skill usages and animation
			locks.
		</p>
		<Screenshot id="7" name="timelines" />
		<ol>
			<li>
				<b>Time ruler</b> Displays timestamp information.
			</li>
			<li>
				<b>Skill icons</b> A skill icon image represents the usage of a skill (image width
				not to scale with animation lock time). Mousing over an icon will display a tooltip
				with its snapshot time, potency, animation lock/cast time, and active damage/haste
				effects.
				<ol type="a">
					<li>
						<b>Cast bars</b> A purple bar represents a cast time, during which other
						abilities cannot be used. The vertical line in the middle of the bar
						represents the cast's snapshot time (also known as the slidecast window).
					</li>
					<li>
						<b>GCD bars</b> A green bar represents a GCD recast lock.
					</li>
					<li>
						<b>Animation lock bars</b> (not visible in screenshot) A grey bar represents
						an animation lock. These are only visible at higher horizontal scale levels,
						or for abilities with exceptionally long animation locks.
					</li>
					<li>
						<b>Buff underlines</b> The colored bars beneath a skill icon summarize the
						haste and amplification buffs that the ability snapshots.
					</li>
				</ol>
			</li>
			<li>
				<b>Damage ticks</b> A red triangle represents the application timing of a damage
				event. Mousing over a damage tick shows its exact timestamp, potency, and
				snapshotted buffs.
			</li>
			<li>
				<b>Heal ticks</b> A green triangle represents the application timing of a heal
				event. Similar to damage events, mousing over a heal tick will show its timestamp
				and potency.
			</li>
			<li>
				<b>MP ticks</b> A vertical blue line in the background of the timeline represents
				the timing of a natural MP tick, also known as the "actor tick." These ticks occur
				every three seconds, and timing of the first tick can be adjusted in the
				configuration panel.
				<ol type="a">
					<li>
						<b>Lucid Dreaming ticks</b> A light blue triangle represents the timing of a
						Lucid Dreaming MP tick. These ticks occur every three seconds (independent
						of the standard actor tick), and the timing of the first tick is randomly
						generated for each timeline.
					</li>
				</ol>
			</li>
			<li>
				<b>Auto-attacks</b> A vertical orange line represents the occurrence of an
				auto-attack. This is currently only used for PLD to determine Oath Gauge generation.
			</li>
		</ol>
		<p>
			If you wish to hide some of these elements, you may do so by unchecking the relevant
			options in the "Settings" tab at the bottom of the page.
		</p>
		<NavH3Section id="editing-timelines" label="Editing Timelines" />
		<Screenshot id="8a" name="editor" />
		<p>
			Click on a skill icon in the graphical timeline <b>(1)</b> or a row in the "Timeline
			editor" tab <b>(2)</b> to select it. Use {bi("Shift")} + click, or click and drag on the
			background of the graphical timeline to select a sequence of skills. While skill(s) are
			selected, use {bi("Backspace")} or {bi("Delete")} to delete them.
		</p>
		<p>
			When the timeline extends beyond the bounds of the screen, use {bi("Shift")} + scroll
			wheel while your cursor is within the timeline area to scroll through it. You can also
			adjust the "horizontal scale" slider <b>(3)</b> to increase or decrease the number of
			visible skills.
		</p>
		<p>
			While skill(s) in the timeline are selected, click and drag their icons in the graphical
			timeline to rearrange them. While dragging, a blue line will appear indicating the time
			at which the simulator will try to use the skill. Click the "drag lock" setting{" "}
			<b>(4)</b> to toggle this behavior to prevent accidental edits. All editing actions can
			also be undone and redone with {bi("ctrl")}+{bi("z")} and {bi("ctrl")}+{bi("y")},
			respectively. See <a href="#shortcuts">keyboard shortcuts</a> for additional navigation
			shortcuts.
		</p>
		<p>
			Use the "Add timeline slot" button <b>(5)</b> to, you guessed it, add an additional
			timeline. Use the "Clone timeline slot" button <b>(6)</b> to replicate the
			currently-selected timeline. Up to four timelines can be stored at once.
		</p>
		<p>
			Click on the handle next to a timeline to set it as active. Clicking the small "x" at
			the bottom of the active timeline's handle <b>(7)</b> will delete it.
		</p>
		<NavH3Section id="timeline-editor-table" label="The Timeline Editor Table" />
		<Screenshot id="8b" name="editor" />
		<p>
			The "Timeline editor" tab at the bottom of the page provides a compact view of the
			skills used in the active timeline. Any edits made in this table must be confirmed or
			discarded with the "apply changes to timeline and save" / "discard changes" buttons on
			the right <b>(1)</b>. If edits would cause a timeline to be invalid (that is, its
			activation conditions are no longer met), then the offending skill will be highlighted
			in red, and the first invalid skill will be described in the box to the right of the
			table.
		</p>
		<p>
			Clicking a row in the editor table <b>(2)</b> selects it. Shift + click allows selecting
			a range of rows. Dragging and dropping the selected actions will reorder them.
		</p>
		<p>
			The "move up" and "move down" buttons <b>(3)</b> move the selected actions up or down in
			the timeline. The "delete selected" button <b>(4)</b> deletes selected actions. The
			"move end of selection to start of selection" button <b>(5)</b> moves the last selected
			skill ahead of the first selected skill.
		</p>
		<p>
			"Copy" and "paste" <b>(6)</b> copy or paste selected actions to/from the clipboard.
		</p>
		<p>
			The "undo" and "redo" buttons <b>(7)</b> undo or redo the last timeline manipulation
			action, including those done outside the timeline editor. Undo history is lost upon
			reloading the page.
		</p>
	</>;
}

export function TimelineCreationZh() {
	return <>
		<NavH2Section id="timeline-creation" label="创建与编辑时间轴" />
		<NavH3Section id="setup-config" label="设置与配置" />
		<p>位于技能输入区右侧的“属性设置”面板可调整战斗属性及其他参数。</p>
		<Screenshot id={1} name="config" />
		<ol>
			<li>
				<b>从Etro / XivGear 导入套装</b> 粘贴 etro 或 XivGear 的配装链接，一键导入装备。
			</li>
			<li>
				<b>职业选择器</b>{" "}
				切换当前时间轴的职业。切职后资源预设会被清空，属性会恢复为该职业默认值或最近一次使用的配置。
			</li>
			<li>
				<b>信息区</b>{" "}
				显示随机生成的醒梦判定点偏移（仅对治疗/法系生效），DoT判定点偏移，资源预设数目，随机数模式。
			</li>
			<li>
				<b>等级与战斗属性</b>{" "}
				调整角色等级及暴击、直击、信念等数值，用于估算学者的连环计、舞者的进攻之探戈等暴击类增益效果，以及“必定暴击/直暴”技能的等效威力。
			</li>
			<li>
				<b>能力技后摇</b> 设置能力技后摇时长，后摇生效时无法使用其他技能。建议值 ≈ 0.6 s + 2
				× 延迟。部分能力技（如位移技能、龙骑的跳跃等）有固定的独立后摇，不可更改。
			</li>
			<li>
				<b>帧率</b>{" "}
				模拟客户端帧率，用于估算帧率税影响。FFXIV只在渲染新帧时接收指令，帧率影响会随时间累计，并在长时间战斗中显著推迟GCD。设为
				9999可忽略帧率影响。
			</li>
			<li>
				<b>GCD时长修正</b> 对
				GCD/读条时间进行额外加减。通常设置为0，若认为帧率税补偿公式不准确，可在此手动微调。
			</li>
			<li>
				<b>距首次跳蓝时间</b> 设定战斗开始后多久进行第一次跳蓝，主要影响黑魔。
			</li>
			<li>
				<b>倒数时间</b> 调整开怪倒数时间。若设为负值，则表示从战斗开始后的某时间开始模拟。
			</li>
			<li>
				<b>随机种子与随机BUFF获取模式</b>{" "}
				随机种子用于决定随机事件（如赤魔的赤飞石预备、舞者的幻扇量谱等）是否发生。随机BUFF获取模式选择RNG以基于随机种子触发，选择Never以全部不触发，选择Always以在满足条件时必定触发。
			</li>
		</ol>
		<Screenshot id={2} name="resource_overrides" />
		<ol start={11}>
			<li>
				<b>指定初始资源</b>{" "}
				自定义开局时的职业量谱、BUFF、技能CD等，用于单独规划长战斗的某一阶段，或允许提前攒资源的特殊战斗阶段。
			</li>
			<li>
				<b>应用/应用并重置时间轴</b>{" "}
				“应用”仅保存配置并作用于当前时间轴；“应用并重置时间轴”会清空当前时间轴已录入的全部技能。
			</li>
		</ol>
		<Screenshot id={3} name="control" />
		<p>位于技能输入区右侧的“操作设置”面板可调整模拟设置。</p>
		<p>
			当开启“实时（带自动暂停）”模式时，使用技能会模拟其真实技能后摇/咏唱时间，直到可继续操作时暂停。可调整“倍速”以加快时间流逝。
		</p>
		<p>
			当开启“手动”模式时，使用技能后立刻跳过动画与读条，快进至下一次可施放技能的时间点，无等待。
		</p>
		<NavH3Section id="adding-skills" label="添加技能、等待时间与时间跳转" />
		<Screenshot id="4" name="hotbar" />
		<p>
			点击热键栏中的技能图标 <b>(1)</b>{" "}
			即可插入技能。新技能将在时间轴光标处使用；若已选中技能，则插入至该技能之前。系统会自动在当前条件下的最早可用时间施放技能。
		</p>
		<p>
			若需要调整AoE技能的命中数量，可以在“击中目标数” <b>(2)</b> 输入数字。后续使用的所有 AoE
			技能均按此目标数计算威力，单目标技能不受影响。
		</p>
		<p>
			若需要自定义等待时间，用“快进至__后的__秒” <b>(3)</b>{" "}
			可让当前动画锁结束后再额外等待指定秒数，常用于模拟在GCD后半插入能力技时0.6s~1.0s的短延迟。
		</p>
		<p>
			若需要将时间轴光标快进到某一战斗时刻（如机制开始或停手结束），可以使用:“快进至指定时间”{" "}
			<b>(4)</b>。该点将始终固定在所指定的时间，即使前后技能被拖动。
		</p>
		<p>
			若需要跳转至下一次跳蓝或醒梦判定点，点击“快进至跳蓝/跳醒梦” <b>(5)</b>{" "}
			即可。无论时间轴如何调整，该操作会始终停在最靠近的一次跳蓝或醒梦判定点。
		</p>
		<p>
			“去除时间轴末尾的发呆时间” <b>(6)</b> 会删除时间轴末尾的所有等待事件。
		</p>
		<p>
			在状态区 <b>(7)</b> 点击对应 Buff/Debuff
			图标，即可移除Buff/Debuff。对于地面类技能（如黑魔纹、学者的野战治疗阵、黑骑的腐秽大地等），点击以将该效果临时禁用，再次点击可重新启用。
		</p>
		<NavH3Section id="positionals" label="身位与平A" />
		<Screenshot id="5" name="positional" />
		<p>
			近战职业拥有“身位加成（后）” <b>(1)</b> 和“身位加成（侧）” <b>(2)</b>{" "}
			两个开关。对于有身位加成的技能，对应开关激活时即可享受身位加成。点击图标可开关身位加成。开启“真北”后，所有身位加成强制生效，不受上述开关影响。
		</p>
		<p>
			近战与坦克额外提供“平A已启用” <b>(3)</b>{" "}
			状态，目前仅用于骑士计算忠义量谱，可手动关闭以模拟脱离平A范围。再次使用战技或能力技会自动重新启用平A。平A的威力计算暂不支持，将在后续更新中加入。
		</p>
		<NavH3Section id="skill-sequence-presets" label="技能序列预设" />
		<Screenshot id="6" name="presets" />
		<p>在技能输入窗口下方可找到“技能序列预设”菜单。</p>
		<p>
			你可以在这里把多个技能打包成一个预设；以后只需点击该预设，即可一次性将整个预设插入时间轴。对于共用一个按键的技能（如枪刃的子弹连和续剑、画家的红/绿/蓝连击），从预设加载时会自动变成对应的正确技能。
		</p>
		<NavH3Section id="timeline-visualization" label="时间轴可视化" />
		<p>图形时间轴用不同颜色与符号直观展示技能使用及后摇/读条信息。</p>
		<Screenshot id="7" name="timelines" />
		<ol>
			<li>
				<b>时间标尺</b> 显示绝对时间刻度。
			</li>
			<li>
				<b>技能图标</b>{" "}
				每个图标代表一次技能使用（图标宽度与动画锁时长无关）。鼠标悬停可查看伤害判定时刻、威力、后摇/读条时间、当时生效的伤害增益/加速类Buff。
				<ol type="a">
					<li>
						<b>读条块（紫）</b>{" "}
						读条阶段不可插入其他技能。读条块中的竖线即为可滑步判定点。
					</li>
					<li>
						<b>GCD 块（绿）</b> GCD计时。
					</li>
					<li>
						<b>后摇块（灰，截图中不可见）</b> 在高缩放等级或超长后摇时才会显示。
					</li>
					<li>
						<b>Buff 下划线</b> 位于技能图标下方的彩色短条，可以概览该技能受到的加速/增伤
						Buff。
					</li>
				</ol>
			</li>
			<li>
				<b>伤害判定点</b>{" "}
				红色三角，用于显示伤害生效时刻。鼠标悬停可以显示精确时间、实际威力与Buff快照。
			</li>
			<li>
				<b>治疗判定点</b>{" "}
				绿色三角，用于显示治疗生效时刻。与伤害判定点类似的，鼠标悬停可以显示精确时间与Buff快照。
			</li>
			<li>
				<b>跳蓝点</b> 背景蓝色竖线，用于显示自然回蓝判定点，每 3
				秒一次。首个跳蓝时间点可在“属性设置”面板中调整。
				<ol type="a">
					<li>
						<b>醒梦判定点</b>{" "}
						浅蓝三角。醒梦状态下会每3秒额外回蓝一次，并且其时机与跳蓝点相互独立。首个判定点在每个时间轴中随机生成。（可补充醒梦时间点可以在“属性设置”面板中调整）
					</li>
				</ol>
			</li>
			<li>
				<b>平A判定点</b> 橙色竖线。目前仅用于计算骑士的忠义量谱。
			</li>
		</ol>
		<p>
			如需隐藏以上任一元素，可在页面底部“设置”标签内取消对应勾选。（说起来平A判定点好像隐藏不掉）
		</p>
		<NavH3Section id="editing-timelines" label="编辑时间轴" />
		<Screenshot id="8a" name="editor" />
		<p>
			单击图形时间轴上的技能图标 <b>(1)</b> 或“时间轴编辑器”表格中的行 <b>(2)</b>{" "}
			即可选中技能，{bi("Shift")}+单击首尾技能或在时间轴空白处框选可多选技能。按{" "}
			{bi("Backspace")} 或 {bi("Delete")} 以删除选中的技能。
		</p>
		<p>
			当时间轴过长时，把鼠标停在时间轴上并使用 {bi("Shift")}
			+鼠标滚轮即可滚动时间轴。也可以拖动“水平缩放”滑块 <b>(3)</b> 以调整时间轴缩放倍率。
		</p>
		<p>
			选中技能后，拖拽图标可调整技能位置，蓝线显示排轴器将尝试施放该技能的时机。若需要防止误拖动，可以打开“拖动锁”{" "}
			<b>(4)</b> 以禁用拖动操作。
		</p>
		<p>
			所有编辑动作均可使用 {bi("ctrl")}+{bi("z")} / {bi("ctrl")}+{bi("y")}{" "}
			撤销或重做，更多快捷键见<a href="#shortcuts">键盘快捷键</a>章节。
		</p>
		<p>
			“添加时间轴”按钮 <b>(5)</b> 可创建新的空白时间轴；“复制时间轴”按钮 <b>(6)</b>{" "}
			会复制当前时间轴至新的时间轴。时间轴最多同时保存 4 条。
		</p>
		<p>
			在左侧选块点击可切换当前激活的时间轴。对于已激活的时间轴，选块底部的小"×" <b>(7)</b>{" "}
			可删除该时间轴。
		</p>
		<NavH3Section id="timeline-editor-table" label="时间轴编辑器表格" />
		<Screenshot id="8b" name="editor" />
		<p>
			页面底部的“时间轴编辑器”标签提供紧凑的表格视图。此处进行的任何改动需点击右侧“应用并保存编辑”或“放弃更改”{" "}
			<b>(1)</b>{" "}
			才会生效。若编辑时间轴将导致某技能无法满足施放条件，该行会变红，同时右侧信息区会提示第一条无效技能发生的时间。
		</p>
		<p>
			单击行 <b>(2)</b> 以选中，{bi("Shift")}+单击首尾行以多选，拖拽行可调整顺序。
		</p>
		<p>
			"上移/下移"按钮 <b>(3)</b> 可微调顺序；“删除所选”按钮 <b>(4)</b>{" "}
			可批量删除选中的行。“将选中的最后一个技能节点移到选区最前”按钮 <b>(5)</b>{" "}
			可把选区最后的技能插入到选区最前。
		</p>
		<p>
			"复制/粘贴" <b>(6)</b> 与系统剪贴板互通。
		</p>
		<p>
			"撤销/重做"按钮 <b>(7)</b>{" "}
			对当前激活的时间轴生效（包括图形时间轴操作），刷新页面后历史操作将清空。
		</p>
	</>;
}
