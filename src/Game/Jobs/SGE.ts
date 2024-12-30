import { SGEStatusPropsGenerator } from "../../Components/Jobs/SGE";
import { localize } from "../../Components/Localization";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";
import { CoolDown, Resource } from "../Resources";

export class SGEState extends GameState {
	thunderTickOffset: number;

	constructor(config: GameConfig) {
		super(config);

		this.thunderTickOffset = this.nonProcRng() * 3.0;

		const polyglotStacks =
			(this.hasTraitUnlocked("ENHANCED_POLYGLOT_II") && 3) ||
			(this.hasTraitUnlocked("ENHANCED_POLYGLOT") && 2) ||
			1;
		this.resources.set(new Resource("POLYGLOT", polyglotStacks, 0));

		// skill CDs (also a form of resource)
		const manafontCooldown = (this.hasTraitUnlocked("ENHANCED_MANAFONT") && 100) || 180;
		const swiftcastCooldown = (this.hasTraitUnlocked("ENHANCED_SWIFTCAST") && 40) || 60;
		[
			new CoolDown("cd_MANAFONT", manafontCooldown, 1, 1),
			new CoolDown("cd_SWIFTCAST", swiftcastCooldown, 1, 1),
		].forEach((cd) => this.cooldowns.set(cd));

		this.registerRecurringEvents([
			{
				reportName: localize({ en: "Eukrasian Dosis and Dyskrasia" }),
				groupedDots: [
					{
						dotName: "EUKRASIAN_DOSIS",
						appliedBy: ["EUKRASIAN_DOSIS"],
					},
					{
						dotName: "EUKRASIAN_DOSIS_II",
						appliedBy: ["EUKRASIAN_DOSIS_II"],
					},
					{
						dotName: "EUKRASIAN_DYSKRASIA",
						appliedBy: ["EUKRASIAN_DYSKRASIA"],
					},
				],
			},
		]);
	}

	override get statusPropsGenerator(): StatusPropsGenerator<SGEState> {
		return new SGEStatusPropsGenerator(this);
	}

	override jobSpecificRegisterRecurringEvents() {
		// Addersgall recurring timer
		let recurringAddersgallGain = (rsc: Resource) => {
			/*if (this.hasEnochian()) {
				if (rsc.availableAmount() === rsc.maxValue) {
					controller.reportWarning(WarningType.PolyglotOvercap);
				}
				rsc.gain(1);
			}*/
			this.resources.addResourceEvent({
				rscType: "ADDERSGALL",
				name: "gain addersgall",
				delay: 30,
				fnOnRsc: recurringAddersgallGain,
			});
		};
		// TODO - react to
	}
}
