import {Debug, SkillName} from "./Common";
import {ResourceOverride} from "./Resources";

export class GameConfig {
    spellSpeed = 400;
    countdown = 0;
    randomSeed = "hello.";
    casterTax = 0.06;
    animationLock = 0.66;
    timeTillFirstManaTick = 1.2;
    rngProcs = true;
    initialResourceOverrides: ResourceOverride[] = [];

    // DEBUG
    constructor(props?: {
        spellSpeed: number,
        countdown: number,
        randomSeed: string,
        casterTax: number,
        animationLock: number,
        timeTillFirstManaTick: number,
        rngProcs: boolean,
        initialResourceOverrides: any[]
    }) {
        if (props) {
            this.spellSpeed = props.spellSpeed;
            this.countdown = props.countdown;
            this.randomSeed = props.randomSeed;
            this.casterTax = props.casterTax;
            this.animationLock = props.animationLock;
            this.rngProcs = props.rngProcs;
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
                this.countdown === other.countdown &&
                this.randomSeed === other.randomSeed &&
                this.casterTax === other.casterTax &&
                this.animationLock === other.animationLock &&
                this.timeTillFirstManaTick === other.timeTillFirstManaTick &&
                this.rngProcs === other.rngProcs;
        } else {
            return false;
        }
    }

    adjustedDoTPotency(inPotency : number) {
        let dotStrength = (1000 + Math.floor((this.spellSpeed - 400) * 130 / 1900.0)) * 0.001;
        return inPotency * dotStrength;
    }

    adjustedCastTime(inCastTime : number) {
        let ceil = Math.ceil((400.0 - this.spellSpeed) * 130 / 1900.0);
        let pts = Math.floor(inCastTime * (1000.0 + ceil));

        return Math.floor(pts / 10) * 0.01;
    }

    getSkillAnimationLock(skillName : SkillName) : number {
        if (skillName === SkillName.Tincture) {
            return 1.16;
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
            countdown: this.countdown,
            randomSeed: this.randomSeed,
            casterTax: this.casterTax,
            animationLock: this.animationLock,
            timeTillFirstManaTick: this.timeTillFirstManaTick,
            rngProcs: this.rngProcs,
            initialResourceOverrides: this.initialResourceOverrides.map(override=>{ return override.serialized(); })
        };
    }
}

