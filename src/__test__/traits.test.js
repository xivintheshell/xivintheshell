import { TRAITS } from "../Game/Data";
import { hasUnlockedTrait } from "../Utilities/hasUnlockedTrait";

function GetTraits() {
	return Object.keys(TRAITS);
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
