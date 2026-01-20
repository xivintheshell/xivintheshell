import React, { useRef } from "react";
import { NavH3Section, NavH2Section, Screenshot } from "./Manual";
import { Help } from "../Components/Common";

export function TimelineAnalysisEn() {
	const helpAnchor = useRef<HTMLLIElement | null>(null);
	return <>
		<NavH2Section id="timeline-analysis" label="Timeline Analysis" />
		<NavH3Section id="damage-table" label="Potency, PPS, and the Damage Table" />
		<Screenshot id="9" name="potency" />
		<ol>
			<li>
				<b>Summary statistics</b> The top section summarizes the total potency, potency per
				second (PPS), number of GCD skills applied, and damage over time (DoT) coverage for
				the current timeline. When a skill or sequence of skills is selected, these values
				are updated to reflect the selected range.
				<ul>
					<li>
						If an ability has been used but its damage application delay has not yet
						passed in the simulation, its potency will be described as "pending." To
						include it in the total potency and PPS calculations, add a "wait" event at
						the end of your timeline, or use an additional skill.
					</li>
					<li>
						PPS is calculated as damage applied starting from time 0 until the end of
						the final recorded damage application event. This differs from convention
						for many jobs, which may calculate time from the start of the first GCD
						until the end of the cast/recast time of the final GCD.
					</li>
					<li>
						Potencies are calculated from the values given in ability tooltips,
						accounting for bonuses from active status buffs (such as DNC's Technical
						Step and DRG's Lance Charge + Battle Litany) and job gauge buffs (such as
						BLM's Enochian and DRG's Life of the Dragon). Because of differences in
						damage calculation multipliers and other combat stats, potencies in
						timelines of different jobs (or the same job with different GCD speeds)
						generally cannot be meaningfully compared with each other without the aid of
						external potency-to-damage conversion tools.
					</li>
				</ul>
			</li>
			<li>
				<b>Tincture potency configuration</b> Potions/tinctures/gemdraughts increase the
				strength of damaging actions by temporarily boosting the character's main combat
				stat (STR/DEX/MND/INT). Because <i>XIV in the Shell</i> simulates only potencies
				rather than calculating the full damage formula, we approximate tinctures as an 8%
				buff to skill potencies. If you need a different approximation value, you may
				configure it here.
			</li>
			<li>
				<b>Exclude damage when untargetable</b> When checked, damage application events and
				DoT ticks that occur during an "Untargetable" marker are automatically excluded from
				calculations.
			</li>
			<li ref={helpAnchor}>
				<b>Potency table</b> Displays the number of times each ability was cast under
				different sets of self-applied buffs. Hovering the{" "}
				<Help
					topic="manual-sample-help"
					content={"potency explanation"}
					container={helpAnchor}
				/>{" "}
				tooltip next to a potency value displays the effect of each buff on a skill's
				potency. When a skill or sequence of skills is selected, these values are updated to
				reflect the selected range.
				<ul>
					<li>
						The effect of party buffs added through markers, as well as estimated
						potency boosts from tinctures, are not visible in this breakdown, and only
						appear in the purple value in the "total" column.
					</li>
				</ul>
			</li>
		</ol>
		<NavH3Section id="dot-breakdown" label="DoT Breakdown" />
		<Screenshot id="10" name="thunder" />
		<p>
			Every used DoT ability has a separate table detailing the timing of its usage. The
			offset at which DoT effects tick is randomly generated for each timeline.
		</p>
		<ol>
			<li>
				<b>Cast time and application time</b> The snapshot of the ability, and the time at
				which the DoT effect was applied.
			</li>
			<li>
				<b>Gap and override</b> The gap (duration where the DoT debuff was not applied) and
				override (duration remaining on the previous DoT debuff) for this application of the
				DoT. The total gap and override are displayed at the bottom of this column.
			</li>
			<li>
				<b>Initial and DoT</b> The on-hit and per-tick potencies of the DoT, including the
				effect of self-applied buffs.
			</li>
			<li>
				<b>Ticks</b> The number of ticks triggered from this DoT application. The total
				number of hit ticks and the total possible number of ticks, are displayed at the
				bottom of this column.
			</li>
			<li>
				<b>Total</b> The total potency from this DoT application, including both the initial
				hit and subsequent ticks. Similar to the general potency table, the effects of party
				buff markers and tinctures are displayed here.
			</li>
		</ol>
		<p>
			Jobs that attack with summoned pets (DRK's Living Shadow, MCH's Automaton Queen, and
			SMN's Demi-summons) also have potencies displayed in a DoT table. The per-tick "DoT"
			column for pets is unreliable, but the total potency column and buff snapshots are
			correct. This will be updated to be clearer some time in the future.
		</p>
	</>;
}

export function TimelineAnalysisZh() {
	const helpAnchor = useRef<HTMLLIElement | null>(null);
	return <>
		<NavH2Section id="timeline-analysis" label="时间轴分析" />
		<NavH3Section id="damage-table" label="威力、PPS与伤害统计表" />
		<Screenshot id="9" name="potency" />
		<ol>
			<li>
				<b>汇总统计</b> 顶部栏显示当前轴的总威力、每秒（PPS）、GCD 技能数、DoT 覆盖率。
				<ul>
					<li>
						若有技能已施放但伤害尚未生效，其威力会标为“未结算”；想让它们计入总和，可在时间轴末尾添加等待时间或再施放一个技能。
					</li>
					<li>
						PPS 计算区间从 0
						时刻起，到最后一次伤害生效为止。这与许多职业惯例的以首GCD至末
						GCD结束来计算时间的算法不同。
					</li>
					<li>
						威力值取自游戏内技能面板，已计入自身状态增益（如舞者的技巧舞步结束、龙骑的猛枪与战斗连祷等）与职业量谱增益（如黑魔的天语、龙骑的龙血等）。由于不同职业/属性的伤害换算系数不同，跨职业或跨配装直接比较威力数值意义有限，需借助外部"威力→伤害"转换工具。
					</li>
				</ul>
			</li>
			<li>
				<b>爆发药威力加成</b> 爆发药通过临时提升主属性（力量/敏捷/精神/智力）来增伤。由于
				XIV in the Shell 仅模拟威力而非完整伤害公式，默认把爆发药近似为 8%
				威力提升，如需要调整数值可在此手动修改。
			</li>
			<li>
				<b>Boss上天期间威力按0计算</b>{" "}
				勾选后，所有处在“不可选中”标记内的伤害判定与DoT判定会被自动排除出统计。
			</li>
			<li ref={helpAnchor}>
				<b>威力明细表</b> 列出每个技能在不同Buff组合下被使用的次数与对应威力。鼠标悬停在{" "}
				<Help topic="manual-sample-help" content={"威力说明"} container={helpAnchor} />{" "}
				上时可查看各Buff对威力的乘算关系。
				<ul>
					<li>
						通过时间轴标记加入的团辅以及爆发药加成，不会在此表格中拆分显示，仅合并计入最右侧紫色总威力值。
					</li>
				</ul>
			</li>
		</ol>
		<NavH3Section id="dot-breakdown" label="DoT 明细" />
		<Screenshot id="10" name="thunder" />
		<p>
			每个被使用的DoT类型都会单独成表，列出其生效时间与伤害详情。DoT
			判定点在每条时间轴内随机生成。
		</p>
		<ol>
			<li>
				<b>施放时间与结算时间</b> 技能快照时间与DoT开始生效的实际时间。
			</li>
			<li>
				<b>DoT间隙与DoT覆盖</b>{" "}
				“DoT间隙”为目标身上无该DoT的持续时间；“DoT覆盖”为本次施放时上一个DoT的剩余时间。本列底部给出总DoT间隙与总DoT覆盖值。
			</li>
			<li>
				<b>初始威力与DoT威力</b>{" "}
				DoT技能施放时的直接威力与每跳威力。含本次技能快照时所有自身Buff加成，不含团辅与爆发药。
			</li>
			<li>
				<b>跳DoT次数</b>{" "}
				本次技能跳出的次数。底部会总计本类型DoT实际跳出的次数与当前战斗时长下理论可跳次数。
			</li>
			<li>
				<b>总威力</b>{" "}
				直接威力加全部DoT的总威力。此处已合并团辅与爆发药加成，方便与总表对应。
			</li>
		</ol>
		<p>
			召唤物（如黑骑的弗雷、机工的后式自走人偶、召唤的三神）的威力也按上述格式列表展示。目前召唤物的“DoT威力”列暂不可靠，但总威力与受到的Buff已正确计算。后续版本会优化显示方式。
		</p>
	</>;
}
