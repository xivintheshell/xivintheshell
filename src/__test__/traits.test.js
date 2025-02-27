import { TRAITS } from "../Game/Data";

function GetTraits() {
	return Object.keys(TRAITS);
}

function hasUnlockedTrait(traitName, level) {
	let trait = traitName in TRAITS ? TRAITS[traitName] : TRAITS["NEVER"];
	return level >= trait.level;
}

// for helpful error messages
expect.extend({
	toBeLockedAtLevel0([key]) {
		return {
			message: () =>
				`${key} is missing from Traits lookup. Make sure it is included in the TraitList`,
			pass: !hasUnlockedTrait(key, 0),
		};
	},
});

it("allows lookup of all traits", async () => {
	GetTraits().forEach(([name]) => {
		expect([name]).toBeLockedAtLevel0();
	});
});
