import {Debug, SkillName, ProcMode} from "./Common";
import {ResourceOverride} from "./Resources";

export class GameConfig {
    spellSpeed = 400;
    criticalHit = 420;
    directHit = 420;
    countdown = 0;
    randomSeed = "hello.";
    casterTax = 0.06;
    animationLock = 0.66;
    timeTillFirstManaTick = 1.2;
    procMode = ProcMode.RNG;
    extendedBuffTimes = false;
    initialResourceOverrides: ResourceOverride[] = [];

    // DEBUG
    constructor(props?: {
        spellSpeed: number,
        criticalHit: number,
        directHit: number,
        countdown: number,
        randomSeed: string,
        casterTax: number,
        animationLock: number,
        timeTillFirstManaTick: number,
        procMode: ProcMode,
        extendedBuffTimes: boolean,
        initialResourceOverrides: any[]
    }) {
        if (props) {
            this.spellSpeed = props.spellSpeed;
            this.criticalHit = props.criticalHit ?? 420;
            this.directHit = props.directHit ?? 420;
            this.countdown = props.countdown;
            this.randomSeed = props.randomSeed;
            this.casterTax = props.casterTax;
            this.animationLock = props.animationLock;
            this.timeTillFirstManaTick = props.timeTillFirstManaTick;
            this.procMode = props.procMode;
            this.extendedBuffTimes = props.extendedBuffTimes;
            if (props.initialResourceOverrides) {
                this.initialResourceOverrides = props.initialResourceOverrides.map(obj=>{
                    return new ResourceOverride(obj);
                });
            }
        }
    }

    equals(other : GameConfig) {
        let sortFn = (a: ResourceOverride, b: ResourceOverride)=>{
            return a.props.type < b.props.type ? -1 : 1;
        };
        let thisSortedOverrides = this.initialResourceOverrides.sort(sortFn);
        let otherSortedOverrides = other.initialResourceOverrides.sort(sortFn);
        if (thisSortedOverrides.length === otherSortedOverrides.length) {
            for (let i = 0; i < thisSortedOverrides.length; i++) {
                if (!thisSortedOverrides[i].equals(otherSortedOverrides[i])) {
                    return false;
                }
            }
            return this.spellSpeed === other.spellSpeed &&
                this.criticalHit === other.criticalHit &&
                this.directHit === other.directHit &&
                this.countdown === other.countdown &&
                this.randomSeed === other.randomSeed &&
                this.casterTax === other.casterTax &&
                this.animationLock === other.animationLock &&
                this.timeTillFirstManaTick === other.timeTillFirstManaTick &&
                this.procMode === other.procMode &&
                this.extendedBuffTimes === other.extendedBuffTimes;
        } else {
            return false;
        }
    }

    adjustedDoTPotency(inPotency : number) {
        let dotStrength = (1000 + Math.floor((this.spellSpeed - 420) * 130 / 2780.0)) * 0.001;
        return inPotency * dotStrength;
    }

    // 7/22/24: about the difference between adjustedGCD and adjustedCastTime, see scripts/sps-LL/test.js
    adjustedGCD(hasLL: boolean) {
        let baseGCD = 2.5;
        let subtractLL = hasLL ? 15 : 0;
        return Math.floor(Math.floor(Math.floor((100-subtractLL)*100/100)*Math.floor((2000-Math.floor(130*(this.spellSpeed-420)/2780+1000))*(1000*baseGCD)/10000)/100)*100/100)/100;
    }

    adjustedCastTime(inCastTime : number, hasLL: boolean) {
        let subtractLL = hasLL ? 15 : 0;
        return Math.floor(Math.floor(Math.floor((100-subtractLL)*100/100)*Math.floor((2000-Math.floor(130*(this.spellSpeed-420)/2780+1000))*(1000*inCastTime)/1000)/100)*100/100)/1000;
    }

    getSkillAnimationLock(skillName : SkillName) : number {
        /* see: https://discord.com/channels/277897135515762698/1256614366674161705
        if (skillName === SkillName.Tincture) {
            return 1.16;
        }
         */
        if (skillName === SkillName.AetherialManipulation || skillName === SkillName.BetweenTheLines) {
            return 0.8; // from: https://nga.178.com/read.php?tid=21233094&rand=761
        } else {
            return this.animationLock;
        }
    }

    static getSlidecastWindow(castTime : number) {
        return Debug.constantSlidecastWindow ? 0.5 : 0.46 + 0.02 * castTime;
    }

    serialized() {
        return {
            spellSpeed: this.spellSpeed,
            criticalHit: this.criticalHit,
            directHit: this.directHit,
            countdown: this.countdown,
            randomSeed: this.randomSeed,
            casterTax: this.casterTax,
            animationLock: this.animationLock,
            timeTillFirstManaTick: this.timeTillFirstManaTick,
            procMode: this.procMode,
            extendedBuffTimes: this.extendedBuffTimes,
            initialResourceOverrides: this.initialResourceOverrides.map(override=>{ return override.serialized(); })
        };
    }
}

