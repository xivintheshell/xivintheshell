import {Debug, SkillName} from "./Common";

export class GameConfig {
    spellSpeed = 400;
    countdown = 0;
    randomSeed = "hello.";
    casterTax = 0.06;
    animationLock = 0.66;
    timeTillFirstManaTick = 1.2;
    allowProcs = true;

    equals(other : GameConfig) {
        return this.spellSpeed === other.spellSpeed &&
            this.countdown === other.countdown &&
            this.randomSeed === other.randomSeed &&
            this.casterTax === other.casterTax &&
            this.animationLock === other.animationLock &&
            this.timeTillFirstManaTick === other.timeTillFirstManaTick &&
            this.allowProcs === other.allowProcs;
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
}

