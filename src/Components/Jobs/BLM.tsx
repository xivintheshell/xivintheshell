import {registerBuffIcon} from "../StatusDisplay";
import {ResourceType} from "../../Game/Common";

[
	ResourceType.Triplecast,
	ResourceType.Triplecast + "2",
	ResourceType.Triplecast + "3",
	ResourceType.Firestarter,
	ResourceType.Thunderhead,
	ResourceType.ThunderDoT,
	ResourceType.LeyLines,
	ResourceType.Manaward,
].forEach((buff) => registerBuffIcon(buff, `./Asset/Buffs/BLM/${buff}.png`));

type BLMStatusResourcesViewProps = {
	mana: number,
	timeTillNextManaTick: number,
	enochianCountdown: number,
	astralFire: number,
	umbralIce: number,
	umbralHearts: number,
	paradox: number,
	astralSoul: number,
	polyglotCountdown: number,
	polyglotStacks: number,
}

type BLMStatusEnemyBuffsViewProps = {
	DoTCountdown: number,
	addleCountdown: number
}

type BLMStatusSelfBuffsViewProps = {
	leyLinesEnabled: boolean,
	leyLinesCountdown: number,
	triplecastCountdown: number,
	triplecastStacks: number,
	firestarterCountdown: number,
	thunderheadCountdown: number,
	manawardCountdown: number,
	swiftcastCountdown: number,
	lucidDreamingCountdown: number,
	surecastCountdown: number,
	tinctureCountdown: number,
	sprintCountdown: number
}

function BLMBuffsDisplay(props: {
	data: BLMStatusSelfBuffsViewProps
}) {

}

function BLMEnemyBuffsDisplay(props: {
	data: BLMStatusEnemyBuffsViewProps
}) {

}

function BLMResourcesDisplay(props: {
	data: {
		level: number,
		resources: BLMStatusResourcesViewProps,
	},
}): React.Element[] {
	const colors = getCurrentThemeColors();
	const data = props.data;
	const resources = props.data.resources;

	const manaBar = <ResourceBar
		name={"MP"}
		color={colors.resources.mana}
		progress={resources.mana / 10000}
		value={Math.floor(resources.mana) + "/10000"}
		width={100}
		hidden={false}
	/>;
	const manaTick = <ResourceBar
		name={localize({
			en: "MP tick",
			zh: "跳蓝时间",
			ja: "MPティック"
		})}
		color={colors.resources.manaTick}
		progress={1 - resources.timeTillNextManaTick / 3}
		value={(3 - resources.timeTillNextManaTick).toFixed(3) + "/3"}
		width={100}
		hidden={false}
	/>;
	const enochian = <ResourceBar
		name={localize({
			en: "enochian",
			zh: "天语",
			ja: "エノキアン"
		})}
		color={colors.resources.enochian}
		progress={resources.enochianCountdown / 15}
		value={`${resources.enochianCountdown.toFixed(3)}`}
		width={100}
		hidden={false}
	/>;
	const afui = <ResourceCounter
		name={localize({
			en: "AF/UI",
			zh: "冰火层数",
			ja: "AF/UB"
		})}
		color={resources.astralFire > 0 ? colors.resources.astralFire : colors.resources.umbralIce}
		currentStacks={resources.astralFire > 0 ? resources.astralFire : resources.umbralIce}
		maxStacks={3}/>;
	const uh = <ResourceCounter
		name={
			localize({
				en: "hearts",
				zh: "冰针",
				ja: "アンブラルハート"
			})}
		color={colors.resources.umbralHeart}
		currentStacks={resources.umbralHearts}
		maxStacks={3}/>;
	const paradox = data.level && Traits.hasUnlocked(TraitName.AspectMasteryIV, data.level) ?
		<ResourceCounter
			name={
				localize({
					en: "paradox",
					zh: "悖论",
					ja: "パラドックス"
				})}
			color={colors.resources.paradox}
			currentStacks={resources.paradox}
			maxStacks={1}/>
		: undefined;
	const soul = data.level && Traits.hasUnlocked(TraitName.EnhancedAstralFire, data.level) ?
		<ResourceCounter
			name={
				localize({
					en: "astral soul",
					zh: "星极魂",
					ja: "アストラルソウル"
				})}
			color={colors.resources.astralSoul}
			currentStacks={resources.astralSoul}
			maxStacks={6}/>
		: undefined;
	const polyTimer = <ResourceBar
		name={
			localize({
				en: "poly timer",
				zh: "通晓计时",
				ja: "エノキ継続時間"
			})}
		color={colors.resources.polyTimer}
		progress={1 - resources.polyglotCountdown / 30}
		value={`${resources.polyglotCountdown.toFixed(3)}`}
		width={100}
		hidden={false}
	/>;
	
	const polyglotStacks = 
		(data.level && Traits.hasUnlocked(TraitName.EnhancedPolyglotII, data.level) && 3) ||
		(data.level && Traits.hasUnlocked(TraitName.EnhancedPolyglot, data.level) && 2) ||
		1;
	const poly = <ResourceCounter
		name={
			localize({
				en: "poly stacks",
				zh: "通晓层数",
				ja: "ポリグロット"
			})}
		color={colors.resources.polyStacks}
		currentStacks={resources.polyglotStacks}
		maxStacks={polyglotStacks}/>;

	return [
		manaBar,
		manaTick,
		afui,
		uh,
		paradox,
		soul,
		enochian,
		polyTimer,
		poly,
	];
}