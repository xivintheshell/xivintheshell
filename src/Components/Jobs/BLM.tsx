import {
    registerBuffIcon,
    BuffProps,
    ResourceBarProps,
    ResourceCounterProps,
    ResourceDisplayProps,
    StatusPropsGenerator
} from "../StatusDisplay";
import {ResourceType} from "../../Game/Common";
import {TraitName, Traits} from "../../Game/Traits";
import {BLMState} from "../../Game/Jobs/BLM";
import {getCurrentThemeColors} from "../../Components/ColorTheme";
import {localize} from "../../Components/Localization";

[
    ResourceType.Triplecast,
    ResourceType.Triplecast + "2",
    ResourceType.Triplecast + "3",
    ResourceType.Firestarter,
    ResourceType.Thunderhead,
    ResourceType.ThunderDoT,
    ResourceType.LeyLines,
    ResourceType.Manaward,
].forEach((buff) => registerBuffIcon(buff, `BLM/${buff}.png`));

export class BLMStatusPropsGenerator extends StatusPropsGenerator<BLMState> {
    override getEnemyBuffViewProps(): BuffProps[] {
        const DoTCountdown = this.state.resources.timeTillReady(ResourceType.ThunderDoT);
        const addleCountdown = this.state.resources.timeTillReady(ResourceType.Addle);
        return [
            {
                rscType: ResourceType.ThunderDoT,
                onSelf: false,
                enabled: true,
                stacks:1,
                timeRemaining: DoTCountdown.toFixed(3),
                className: DoTCountdown > 0 ? "" : "hidden"
            },
            {
                rscType: ResourceType.Addle,
                onSelf: false,
                enabled: true,
                stacks:1,
                timeRemaining: addleCountdown.toFixed(3),
                className: addleCountdown > 0 ? "" : "hidden"
            }
        ];
    }

    override getSelfBuffViewProps(): BuffProps[] {
        const resources = this.state.resources;
        const leyLinesEnabled = resources.get(ResourceType.LeyLines).enabled;
        const leyLinesCountdown = resources.timeTillReady(ResourceType.LeyLines);
        const triplecastCountdown = resources.timeTillReady(ResourceType.Triplecast);
        const triplecastStacks = resources.get(ResourceType.Triplecast).availableAmount();
        const firestarterCountdown = resources.timeTillReady(ResourceType.Firestarter);
        const thunderheadCountdown = resources.timeTillReady(ResourceType.Thunderhead);
        const manawardCountdown = resources.timeTillReady(ResourceType.Manaward);
        const swiftcastCountdown = resources.timeTillReady(ResourceType.Swiftcast);
        const lucidDreamingCountdown = resources.timeTillReady(ResourceType.LucidDreaming);
        const surecastCountdown = resources.timeTillReady(ResourceType.Surecast);
        const tinctureCountdown = resources.timeTillReady(ResourceType.Tincture);
        const sprintCountdown = resources.timeTillReady(ResourceType.Sprint);
        return [
            {
                rscType: ResourceType.LeyLines,
                onSelf: true,
                enabled: leyLinesEnabled,
                stacks:1,
                timeRemaining: leyLinesCountdown.toFixed(3),
                className: leyLinesCountdown > 0 ? "" : "hidden"
            },
            {
                rscType: ResourceType.Triplecast,
                onSelf: true,
                enabled: true,
                stacks: triplecastStacks,
                timeRemaining: triplecastCountdown.toFixed(3),
                className: triplecastCountdown > 0 ? "" : "hidden"
            },
            {
                rscType: ResourceType.Firestarter,
                onSelf: true,
                enabled: true,
                stacks:1,
                timeRemaining: firestarterCountdown.toFixed(3),
                className: firestarterCountdown > 0 ? "" : "hidden"
            },
            {
                rscType: ResourceType.Thunderhead,
                onSelf: true,
                enabled: true,
                stacks:1,
                timeRemaining: thunderheadCountdown.toFixed(3),
                className: thunderheadCountdown > 0 ? "" : "hidden"
            },
            {
                rscType: ResourceType.Manaward,
                onSelf: true,
                enabled: true,
                stacks:1,
                timeRemaining: manawardCountdown.toFixed(3),
                className: manawardCountdown > 0 ? "" : "hidden"
            },
            {
                rscType: ResourceType.Swiftcast,
                onSelf: true,
                enabled: true,
                stacks:1,
                timeRemaining: swiftcastCountdown.toFixed(3),
                className: swiftcastCountdown > 0 ? "" : "hidden"
            },
            {
                rscType: ResourceType.LucidDreaming,
                onSelf: true,
                enabled: true,
                stacks:1,
                timeRemaining: lucidDreamingCountdown.toFixed(3),
                className: lucidDreamingCountdown > 0 ? "" : "hidden"
            },
            {
                rscType: ResourceType.Surecast,
                onSelf: true,
                enabled: true,
                stacks:1,
                timeRemaining: surecastCountdown.toFixed(3),
                className: surecastCountdown > 0 ? "" : "hidden"
            },
            {
                rscType: ResourceType.Tincture,
                onSelf: true,
                enabled: true,
                stacks:1,
                timeRemaining: tinctureCountdown.toFixed(3),
                className: tinctureCountdown > 0 ? "" : "hidden"
            },
            {
                rscType: ResourceType.Sprint,
                onSelf: true,
                enabled: true,
                stacks:1,
                timeRemaining: sprintCountdown.toFixed(3),
                className: sprintCountdown > 0 ? "" : "hidden"
            }
        ];
    }

    override getResourceViewProps(): ResourceDisplayProps[] {
        const colors = getCurrentThemeColors();
        let eno = this.state.resources.get(ResourceType.Enochian);
        let enoCountdown: number;
        if (eno.available(1) && !eno.pendingChange) {
            enoCountdown = 15;
        } else {
            enoCountdown = this.state.resources.timeTillReady(ResourceType.Enochian);
        }
        const resources = this.state.resources;
        const mana = resources.get(ResourceType.Mana).availableAmount();
        const timeTillNextManaTick = resources.timeTillReady(ResourceType.Mana);
        const enochianCountdown = enoCountdown;
        const astralFire = this.state.getFireStacks();
        const umbralIce = this.state.getIceStacks();
        const umbralHearts = resources.get(ResourceType.UmbralHeart).availableAmount();
        const paradox = resources.get(ResourceType.Paradox).availableAmount();
        const astralSoul = resources.get(ResourceType.AstralSoul).availableAmount();
        const polyglotCountdown = eno.available(1) ? resources.timeTillReady(ResourceType.Polyglot) : 30;
        const polyglotStacks = resources.get(ResourceType.Polyglot).availableAmount();

        const maxPolyglotStacks =
            (Traits.hasUnlocked(TraitName.EnhancedPolyglotII, this.state.config.level) && 3) ||
            (Traits.hasUnlocked(TraitName.EnhancedPolyglot, this.state.config.level) && 2) ||
            1;
        const infos = [
            {
                kind: "bar",
                name: "MP",
                color: colors.resources.mana,
                progress: mana / 10000,
                valueString: Math.floor(mana) + "/10000",
            } as ResourceBarProps,
            {
                kind: "bar",
                name: localize({
                    en: "MP tick",
                    zh: "跳蓝时间",
                    ja: "MPティック"
                }),
                color: colors.resources.manaTick,
                progress: 1 - timeTillNextManaTick / 3,
                valueString: (3 - timeTillNextManaTick).toFixed(3) + "/3",
            } as ResourceBarProps,
            {
                kind: "bar",
                name: localize({
                    en: "enochian",
                    zh: "天语",
                    ja: "エノキアン"
                }),
                color: colors.resources.enochian,
                progress: enochianCountdown / 15,
                valueString: enochianCountdown.toFixed(3),
            } as ResourceBarProps,
            {
                kind: "counter",
                name: localize({
                    en: "AF/UI",
                    zh: "冰火层数",
                    ja: "AF/UB"
                }),
                color: astralFire > 0 ? colors.resources.astralFire : colors.resources.umbralIce,
                currentStacks: astralFire > 0 ? astralFire : umbralIce,
                maxStacks: 3,
            } as ResourceCounterProps,
            {
                kind: "counter",
                name: localize({
                    en: "hearts",
                    zh: "冰针",
                    ja: "アンブラルハート"
                }),
                color: colors.resources.umbralHeart,
                currentStacks: umbralHearts,
                maxStacks: 3,
            } as ResourceCounterProps,
            {
                kind: "counter",
                name: localize({
                    en: "paradox",
                    zh: "悖论",
                    ja: "パラドックス"
                }),
                color: colors.resources.paradox,
                currentStacks: paradox,
                maxStacks: 1,
            } as ResourceCounterProps,
        ];
        if (Traits.hasUnlocked(TraitName.EnhancedAstralFire, this.state.config.level)) {
            infos.push({
                kind: "counter",
                name: localize({
                    en: "astral soul",
                    zh: "星极魂",
                    ja: "アストラルソウル"
                }),
                color: colors.resources.astralSoul,
                currentStacks: astralSoul,
                maxStacks: 6,
            } as ResourceCounterProps);
        }
        infos.push(
            {
                kind: "bar",
                name: localize({
                    en: "poly timer",
                    zh: "通晓计时",
                    ja: "エノキ継続時間"
                }),
                color: colors.resources.polyTimer,
                progress: 1 - polyglotCountdown / 30,
                valueString: polyglotCountdown.toFixed(3),
            } as ResourceBarProps,
            {
                kind: "counter",
                name: localize({
                    en: "poly stacks",
                    zh: "通晓层数",
                    ja: "ポリグロット"
                }),
                color: colors.resources.polyStacks,
                currentStacks: polyglotStacks,
                maxStacks: maxPolyglotStacks,
            } as ResourceCounterProps,
        );
        return infos;
    }
}