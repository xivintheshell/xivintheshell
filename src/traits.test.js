import {TraitName,ReservedTraitName} from "./Game/Common"
import {Traits} from "./Game/Traits"

function GetTraits() {
    const traitNameArr = Object.keys(TraitName).filter((v) => isNaN(Number(v)))
    const traitNumberArr = Object.values(TraitName).filter((v) => !isNaN(Number(v)));
    return  traitNameArr
        .map((e, i) => [e, traitNumberArr[i]])
        .filter(([name, value]) => !(Object.keys(ReservedTraitName).includes(name)));
}

// for helpful error messages
expect.extend({
    toBeGreaterExt([name, value], expected) {
        return {
            message: () => `${name} = ${value}. Must be greater than ${expected} (values 0-${expected} are reserved)`,
            pass: value > expected
        }
    },
    toBeUnique([name, value], map) {
        return {
            message: () => `${name} conflicts with ${map.get(value)}. Both have a value of ${value}.`,
            pass: !map.has(value)
        }
    },
    toBeLockedAtLevel0([name, value]) {
        return {
            message: () => `${name} is missing from Traits lookup. Make sure it is included in the TraitList`,
            pass: !Traits.hasUnlocked(value, 0)
        }
    }
  });

// If this test fails, a Job's TraitName enum start was not set
it("has no traits with value less than 100", async () => {
    GetTraits().forEach(([name, value]) => {
        expect([name, value]).toBeGreaterExt(99);
    })
})

it("has unique trait values", async () => {
    let map = new Map();
    GetTraits().forEach(([name, value]) => {
        expect([name, value]).toBeUnique(map);
        map.set(value, name);
    })
})

it("allows lookup of all traits", async () => {
    GetTraits().forEach(([name, value]) => {
        expect([name,value]).toBeLockedAtLevel0();
    });
})
