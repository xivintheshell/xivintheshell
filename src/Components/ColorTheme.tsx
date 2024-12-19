import React from "react";
import { MdDarkMode, MdLightMode } from "react-icons/md";
import { getCachedValue, setCachedValue } from "../Controller/Common";
import { controller } from "../Controller/Controller";
import { ShellJob } from "../Game/Constants/Common";

export type ColorTheme = "Light" | "Dark";

let getCurrentColorTheme: () => ColorTheme = () => {
	return "Light";
};
let setCurrentColorTheme: (colorTheme: ColorTheme) => void = (colorTheme) => {};

export const enum MarkerColor {
	Red = "#f64141",
	Orange = "#e89b5f",
	Yellow = "#ffd535",
	Green = "#50c53d",
	Cyan = "#53e5e5",
	Blue = "#217ff5",
	Purple = "#9755ef",
	Pink = "#ee79ee",
	Grey = "#6f6f6f",
}

export type BLMResourceColors = {
	enochian: string;
	astralFire: string;
	astralSoul: string;
	umbralIce: string;
	umbralHeart: string;
	paradox: string;
	polyTimer: string;
	polyStacks: string;
};

export type PCTResourceColors = {
	creatureCanvas: string;
	weaponCanvas: string;
	landscapeCanvas: string;
	paletteGauge: string;
	holyPaint: string;
	cometPaint: string;
	starryBuff: string;
};

export type RDMResourceColors = {
	whiteMana: string;
	blackMana: string;
	manaStack: string;
	emboldenBuff: string;
	manaficBuff: string;
	accelBuff: string;
};

export type RPRResourceColors = {
	soulGaugeLow: string;
	soulGaugeHigh: string;
	shroudGaugeLow: string;
	shroudGaugeHigh: string;
	lemureShroud: string;
	voidShroudLow: string;
	voidShroudHigh: string;
	deathsDesign: string;
	arcaneCircle: string;
};

export type SAMResourceColors = {
	kenki: string;
	setsu: string;
	getsu: string;
	kaSen: string;
	meditation: string;
	fugetsu: string;
	iai: string;
};

export type DNCResourceColors = {
	esprit: string;
	feathers: string;
	emboite: string;
	entrechat: string;
	jete: string;
	pirouette: string;
};

export type MCHResourceColors = {
	heat: string;
	battery: string;
};

export type WARResourceColors = {
	beastGauge: string;
};

export type BRDResourceColors = {
	soulVoice: string;
	pitchPerfect: string;
	repertoire: string;
	wanderersCoda: string;
	magesCoda: string;
	armysCoda: string;
	ragingStrikes: string;
	barrage: string;
	battleVoice: string;
	radiantFinale: string;
};

export type JobAccentColors = Partial<{
	[key in ShellJob]: string;
}>;

export type ThemeColors = {
	accent: string;
	jobAccents: JobAccentColors;
	realTime: string;
	historical: string;
	fileDownload: string;
	text: string;
	emphasis: string;
	success: string;
	warning: string;
	background: string;
	tipBackground: string;
	bgLowContrast: string;
	bgMediumContrast: string;
	bgHighContrast: string;
	resources: {
		gcdBar: string;
		lockBar: string;
		mana: string;
		manaTick: string;
		cdhTag: string;
		comboTag: string;
	};
	blm: BLMResourceColors;
	pct: PCTResourceColors;
	rdm: RDMResourceColors;
	dnc: DNCResourceColors;
	sam: SAMResourceColors;
	mch: MCHResourceColors;
	rpr: RPRResourceColors;
	war: WARResourceColors;
	brd: BRDResourceColors;
	timeline: {
		ruler: string;
		tracks: string;
		castBar: string;
		lockBar: string;
		gcdBar: string;
		llCover: string;
		potCover: string;
		buffCover: string;
		damageMark: string;
		untargetableDamageMark: string;
		mpTickMark: string;
		warningMark: string;
		lucidTickMark: string;
		countdown: string;
		markerAlpha: string;
	};
};

export let getCurrentThemeColors: () => ThemeColors = () => {
	let currentColorTheme = getCurrentColorTheme();
	if (currentColorTheme === "Dark") {
		return {
			accent: "mediumpurple",
			jobAccents: {
				BLM: "#9370db", // mediumpurple
				PCT: "#e176c2",
				RDM: "#ff0000", // TODO less red
				DNC: "#e2b0af", // color ripped from xiva/fflogs
				SAM: "#f59542",
				MCH: "#6ee1d6",
				WAR: "#b10b0b", // color picker'd on job stone
				RPR: "#965a90",
				BRD: "#91ba5e",
				GNB: "#f6b26b",
			},
			realTime: "mediumseagreen",
			historical: "#ff8c00", // darkorange
			fileDownload: "#798c3f",
			text: "#b0b0b0",
			emphasis: "#dadada",
			success: "mediumseagreen",
			warning: "#ff6224",
			background: "#1f1f21",
			tipBackground: "#2a2a2a",
			bgLowContrast: "#333",
			bgMediumContrast: "#393939",
			bgHighContrast: "#626262",
			resources: {
				gcdBar: "#5cab43",
				lockBar: "#737373",
				mana: "#62a5d2",
				manaTick: "#3d5c73",
				cdhTag: "#d55124",
				comboTag: "#5c8bad", // light blue
			},
			blm: {
				enochian: "#b69241",
				astralFire: "#d55124",
				astralSoul: "#cb8046",
				umbralIce: "#509bd5",
				umbralHeart: "#8fced5",
				paradox: "#d953ee",
				polyTimer: "#594472",
				polyStacks: "#b138ee",
			},
			pct: {
				creatureCanvas: "#a948e3",
				weaponCanvas: "#a53535",
				landscapeCanvas: "#2e51dd",
				paletteGauge: "#b69241",
				holyPaint: "#9bc6dd", // blue-ish light gray
				cometPaint: "#7e19aa", // purple-ish black
				starryBuff: "#509bd5",
			},
			rdm: {
				whiteMana: "#dddddd",
				blackMana: "#2a4bf5", // blueish
				manaStack: "#cb8046", // astral soul
				emboldenBuff: "#de0202", // bright red but a little less saturated
				manaficBuff: "#c169c2", // lavender
				accelBuff: "#f0d1e8", // very light pink
			},
			dnc: {
				esprit: "#e2b0af",
				feathers: "#8DA147",
				emboite: "#bf615c",
				entrechat: "#3a8db7",
				jete: "#539350",
				pirouette: "#b0984e",
			},
			sam: {
				kenki: "#d55124",
				setsu: "#c7ffff",
				getsu: "#7987fc",
				kaSen: "#f8a2a6",
				meditation: "#ff853d",
				fugetsu: "#0f52ba",
				iai: "#89cfef",
			},
			mch: {
				heat: "#D35A10",
				battery: "#2C9FCB",
			},
			rpr: {
				soulGaugeLow: "#660929",
				soulGaugeHigh: "#e5004e",
				shroudGaugeLow: "#03706c",
				shroudGaugeHigh: "#00fcf3",
				lemureShroud: "#53ffff",
				voidShroudLow: "#5c125c",
				voidShroudHigh: "#ff04ff",
				deathsDesign: "#ab0009",
				arcaneCircle: "#ff94fd",
			},
			war: {
				beastGauge: "#ffba00",
			},
			brd: {
				soulVoice: "#5DBD99",
				pitchPerfect: "#9ac5f1",
				repertoire: "#e8c35a",
				wanderersCoda: "#add549",
				magesCoda: "#ffbcf8",
				armysCoda: "#eb9b5f",
				ragingStrikes: "#c04414",
				barrage: "#e6c65b",
				battleVoice: "#71bed1",
				radiantFinale: "#edcce7",
			},
			timeline: {
				ruler: "#2d2d2d",
				tracks: "#242424",
				castBar: "#42364d",
				lockBar: "#696969",
				gcdBar: "#354931",
				llCover: "#5ea647",
				potCover: "#c4543a",
				buffCover: "#9370db",
				damageMark: "#ff0000",
				untargetableDamageMark: "#7f7f7f",
				mpTickMark: "#32525e",
				warningMark: "#9d7103",
				lucidTickMark: "#56b3d5",
				countdown: "rgba(15, 15, 15, 0.4)",
				markerAlpha: "4f",
			},
		};
	} else {
		// Light mode
		return {
			accent: "mediumpurple",
			jobAccents: {
				BLM: "#9370db", // mediumpurple
				PCT: "#f485d6",
				RDM: "#ff0000", // TODO less red
				DNC: "#e2b0af", // color ripped from xiva/fflogs
				SAM: "#f59542",
				MCH: "#6ee1d6",
				WAR: "#b10b0b", // color picker'd on job stone
				RPR: "#965a90",
				BRD: "#91ba5e",
			},
			realTime: "mediumseagreen",
			historical: "#ff8c00", // darkorange
			fileDownload: "#798c3f",
			text: "#000000",
			emphasis: "#000000",
			success: "mediumseagreen",
			warning: "#ff4d07",
			background: "#ffffff",
			tipBackground: "#ffffff",
			bgLowContrast: "#efefef",
			bgMediumContrast: "lightgrey",
			bgHighContrast: "darkgrey",
			resources: {
				gcdBar: "#8edc72",
				lockBar: "#cbcbcb",
				mana: "#8ACEEA",
				manaTick: "#C2EAFF",
				cdhTag: "#ff6633",
				comboTag: "#53a7c9", // light blue
			},
			blm: {
				enochian: "#f5cf96",
				astralFire: "#ff6633",
				astralSoul: "#ffa641",
				umbralIce: "#66bbff",
				umbralHeart: "#95dae3",
				paradox: "#d953ee",
				polyTimer: "#d5bbf1",
				polyStacks: "#b138ee",
			},
			pct: {
				creatureCanvas: "#b854e8",
				weaponCanvas: "#d54d48",
				landscapeCanvas: "#4568f6",
				paletteGauge: "#f5cf96",
				holyPaint: "#b7c9d5", // blue-ish light gray
				cometPaint: "#9926c8", // purple-ish black
				starryBuff: "#66bbff",
			},
			rdm: {
				whiteMana: "#fcd8d4", // light pink
				blackMana: "#467aeb", // blue
				manaStack: "#9926c8", // astral soul
				emboldenBuff: "#c91310", // dark red
				manaficBuff: "#530954", // dark purple
				accelBuff: "#c973b4", // lighter purple
			},
			dnc: {
				esprit: "#e2b0af",
				feathers: "#8DA147",
				emboite: "#bf615c",
				entrechat: "#3a8db7",
				jete: "#539350",
				pirouette: "#b0984e",
			},
			sam: {
				kenki: "#d55124",
				setsu: "#addede",
				getsu: "#7987fc",
				kaSen: "#f8a2a6",
				meditation: "#ff853d",
				fugetsu: "#0f52ba",
				iai: "#89cfef",
			},
			mch: {
				heat: "#D35A10",
				battery: "#2C9FCB",
			},
			rpr: {
				soulGaugeLow: "#660929",
				soulGaugeHigh: "#e5004e",
				shroudGaugeLow: "#03706c",
				shroudGaugeHigh: "#00fcf3",
				lemureShroud: "#53ffff",
				voidShroudLow: "#5c125c",
				voidShroudHigh: "#ff04ff",
				deathsDesign: "#ab0009",
				arcaneCircle: "#ff94fd",
			},
			war: {
				beastGauge: "#e74a3c",
			},
			brd: {
				soulVoice: "#5DBD99",
				pitchPerfect: "#9ac5f1",
				repertoire: "#e8c35a",
				wanderersCoda: "#add549",
				magesCoda: "#ffbcf8",
				armysCoda: "#eb9b5f",
				ragingStrikes: "#c04414",
				barrage: "#e6c65b",
				battleVoice: "#71bed1",
				radiantFinale: "#edcce7",
			},
			timeline: {
				ruler: "#e9e9e9",
				tracks: "#f3f3f3",
				castBar: "#ecd6f3",
				lockBar: "#9d9d9d",
				gcdBar: "#ccefc6",
				llCover: "#87ec71",
				potCover: "#ff865c",
				buffCover: "#9370db",
				damageMark: "#ff0000",
				untargetableDamageMark: "#7f7f7f",
				mpTickMark: "#b6dfea",
				warningMark: "#ffbb29",
				lucidTickMark: "#88cae0",
				countdown: "rgba(0, 0, 0, 0.1)",
				markerAlpha: "7f",
			},
		};
	}
};

function ColorThemeOption(props: { colorTheme: ColorTheme }) {
	let icon = <MdLightMode />;
	let colors = getCurrentThemeColors();
	if (props.colorTheme === "Dark") icon = <MdDarkMode />;
	return <div
		style={{
			display: "inline-block",
			cursor: "pointer",
			verticalAlign: "middle",
			borderBottom:
				props.colorTheme === getCurrentColorTheme() ? "none" : "1px solid " + colors.text,
			borderTop:
				props.colorTheme === getCurrentColorTheme() ? "1px solid " + colors.text : "none",
		}}
		onClick={() => {
			setCurrentColorTheme(props.colorTheme);
		}}
	>
		{icon}
	</div>;
}

export class SelectColorTheme extends React.Component {
	state: {
		colorTheme: ColorTheme;
	};
	constructor(props: {}) {
		super(props);
		let colorTheme: ColorTheme = "Light";
		let savedColorTheme: string | null = getCachedValue("colorTheme");
		if (savedColorTheme === "Light" || savedColorTheme === "Dark") colorTheme = savedColorTheme;
		this.state = {
			colorTheme: colorTheme,
		};
	}

	componentDidMount() {
		getCurrentColorTheme = () => {
			return this.state.colorTheme;
		};
		setCurrentColorTheme = (colorTheme: ColorTheme) => {
			this.setState({ colorTheme: colorTheme });
			setCachedValue("colorTheme", colorTheme);
		};
	}
	componentDidUpdate(
		prevProps: Readonly<{}>,
		prevState: Readonly<{ colorTheme: ColorTheme }>,
		snapshot?: any,
	) {
		if (prevState.colorTheme !== this.state.colorTheme) {
			controller.updateAllDisplay();
		}
	}

	componentWillUnmount() {
		getCurrentColorTheme = () => {
			return "Light";
		};
		setCurrentColorTheme = (colorTheme) => {};
	}

	render() {
		return <div
			style={{
				display: "inline-block",
				position: "absolute",
				right: 10,
			}}
		>
			<div style={{ display: "inline-block", fontSize: 16, position: "relative" }}>
				<ColorThemeOption colorTheme={"Light"} />|
				<ColorThemeOption colorTheme={"Dark"} />
			</div>
		</div>;
	}
}
