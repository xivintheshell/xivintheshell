import React, { createContext, useContext } from "react";
import { MdDarkMode, MdLightMode } from "react-icons/md";
import { getCachedValue } from "../Controller/Common";
import { ShellJob } from "../Game/Data/Jobs";
import { PotencyModifierType } from "../Game/Potency";

export type ColorTheme = "Light" | "Dark";

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

export type BLUResourceColors = {
	moonflute: string;
	whistle: string;
	bristle: string;
	tinglea: string;
	tingleb: string;
	surpanakha: string;
	wingedreprobation: string;
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

export type GNBResourceColors = {
	// TODO
};

export type SMNResourceColors = {
	aetherflow: string;
	bahamut: string;
	phoenix: string;
	solar: string;
	ruby: string;
	topaz: string;
	emerald: string;
	searing: string;
};

export type DRGResourceColors = {
	lifeSurge: string;
	lanceCharge: string;
	battleLitany: string;
	lifeOfTheDragon: string;
	enhancedPiercingTalon: string;
	powerSurge: string;
	firstmindsFocusStacks: string;
	lifeOfTheDragonBar: string;
	drgComboTimer: string;
};

export type SGEResourceColors = {
	addersgall: string;
	addersting: string;
	zoe: string;
	autophysis: string;
	krasis: string;
	soteria: string;
	philosophia: string;
};

export type PLDResourceColors = {
	divineMight: string;
	requiescat: string;
	fightOrFlight: string;
	pldComboTimer: string;
	ironWillColor: string;
	oathGaugeColor: string;
};

export type DRKResourceColors = {
	darkside: string;
	blood: string;
	darkarts: string;
	drkComboTimer: string;
	grit: string;
};

export type NINResourceColors = {
	ninComboTimer: string;
	kazematoi: string;
	meisui: string;
	ninki: string;
	bunshin: string;
	kassatsu: string;
	nozuchi: string;
	dokumori: string;
	trick: string;
};

export type MNKResourceColors = {
	opo: string;
	raptor: string;
	coeurl: string;
	lunar: string;
	solar: string;
	chakra: string;
	extraChakra: string;
	riddleOfFire: string;
	brotherhood: string;
};

export type WHMResourceColors = {
	lily: string;
	blood: string;
	pom: string;
	asylum: string;
	confession: string;
	temperance: string;
};

export type ASTResourceColors = {
	div: string;
	astralCard: string;
	umbralCard: string;
	lord: string;
	lady: string;
	neutral: string;
	synastry: string;
	arrow: string;
};

export type VPRResourceColors = {
	vprComboTimer: string;
	rattlingCoil: string;
	serpentOfferings: string;
	anguineTribute: string;
	huntersInstinct: string;
	swiftscaled: string;
};

export type SCHResourceColors = {
	chain: string;
	faerieGauge: string;
	aetherflow: string;
	seraph: string;
	feyIllumination: string;
	dissipation: string;
	protraction: string;
	recitation: string;
};

export type JobAccentColors = Partial<{
	[key in ShellJob]: string;
}>;

export type ThemeColors = {
	accent: string;
	jobAccents: JobAccentColors;
	editingValid: string;
	editingInvalid: string;
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
		petTag: string;
	};
	blm: BLMResourceColors;
	blu: BLUResourceColors;
	pct: PCTResourceColors;
	rdm: RDMResourceColors;
	dnc: DNCResourceColors;
	sam: SAMResourceColors;
	mch: MCHResourceColors;
	rpr: RPRResourceColors;
	war: WARResourceColors;
	brd: BRDResourceColors;
	gnb: GNBResourceColors;
	smn: SMNResourceColors;
	drg: DRGResourceColors;
	sge: SGEResourceColors;
	pld: PLDResourceColors;
	drk: DRKResourceColors;
	nin: NINResourceColors;
	mnk: MNKResourceColors;
	whm: WHMResourceColors;
	ast: ASTResourceColors;
	vpr: VPRResourceColors;
	sch: SCHResourceColors;
	timeline: {
		ruler: string;
		tracks: string;
		castBar: string;
		lockBar: string;
		gcdBar: string;
		invalidBg: string;
		llCover: string;
		potCover: string;
		buffCover: string;
		damageMark: string;
		healingMark: string;
		aggroMark: string;
		untargetableDamageMark: string;
		mpTickMark: string;
		warningMark: string;
		lucidTickMark: string;
		countdown: string;
		markerAlpha: string;
	};
};

// This function can only be called from within the body of a function-style React component
// because it calls React.useContext.
// If you need the theme colors elsewhere, propagate it from a higher-level component and
// manually call `getThemeColors` or `getThemeField`.
export const getCurrentThemeColors: () => ThemeColors = () => {
	return getThemeColors(useContext(ColorThemeContext));
};

// useContext can only be called within function components.
// Since we still have some class components, we need to manually retrieve the theme in some cases
// via the contextType property: https://legacy.reactjs.org/docs/context.html#classcontexttype
export const getThemeColors: (theme: ColorTheme) => ThemeColors = (theme: ColorTheme) => {
	return theme === "Dark" ? DARK_THEME_COLORS : LIGHT_THEME_COLORS;
};

export const getThemeField = (theme: ColorTheme, field: keyof ThemeColors) => {
	return getThemeColors(theme)[field];
};

const DARK_THEME_COLORS: ThemeColors = {
	accent: "mediumpurple",
	jobAccents: {
		BLM: "#9370db", // mediumpurple
		BLU: "#9370db",
		PCT: "#e176c2",
		RDM: "#ff0000", // TODO less red
		DNC: "#e2b0af", // color ripped from xiva/fflogs
		SAM: "#f59542",
		MCH: "#6ee1d6",
		WAR: "#b10b0b", // color picker'd on job stone
		RPR: "#965a90",
		BRD: "#91ba5e",
		GNB: "#f6b26b",
		SMN: "#2D9B78", // copied from fflogs
		SGE: "#80a0f0",
	},
	editingValid: "#ffdc00", // yellow
	editingInvalid: "#ff0000", // red
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
		petTag: "#eb9b5f",
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
	blu: {
		moonflute: "#b69241",
		whistle: "#b69241",
		bristle: "#b69241",
		tinglea: "#217ff5",
		tingleb: "#217ff5",
		surpanakha: "#b69241",
		wingedreprobation: "#ffd535",
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
	gnb: {},
	smn: {
		// TODO
		aetherflow: "#ffd4ff",
		bahamut: "#2D9B78",
		phoenix: "#d55124",
		solar: "#9bc6dd",
		ruby: "#e5004e",
		topaz: "#b0984e",
		emerald: "#539350",
		searing: "#2D9B78",
	},
	drg: {
		lifeSurge: "#ff6633",
		lanceCharge: "#d6002d",
		lifeOfTheDragon: "#0968af",
		battleLitany: "#33b8e3",
		powerSurge: "#59ed78",
		enhancedPiercingTalon: "#f4caa6",
		firstmindsFocusStacks: "#9926c8",
		lifeOfTheDragonBar: "#d74936",
		drgComboTimer: "#3d61ae",
	},
	sge: {
		addersgall: "#80a0f0",
		addersting: "#9e2dca",
		zoe: "cyan",
		autophysis: "lightblue",
		krasis: "teal",
		soteria: "green",
		philosophia: "lightgreen",
	},
	pld: {
		divineMight: "#ff6633",
		requiescat: "#d6002d",
		fightOrFlight: "#0968af",
		pldComboTimer: "#59ed78",
		ironWillColor: "#d74936",
		oathGaugeColor: "#3d61ae",
	},
	drk: {
		darkside: "#c000d1",
		blood: "#8803fc",
		darkarts: "#ffdf0d",
		drkComboTimer: "#cb8046",
		grit: "#82cad9",
	},
	nin: {
		ninComboTimer: "#8532a8",
		kazematoi: "#ab1fd1",
		meisui: "#559ef2",
		ninki: "#8532a8",
		bunshin: "#ed8021",
		kassatsu: "#fa9bd4",
		nozuchi: "#d6a440",
		dokumori: "#9a0ec4",
		trick: "#ffd454",
	},
	mnk: {
		opo: "#feabf7",
		raptor: "#c495fb",
		coeurl: "#00d9a5",
		lunar: "#a984f5",
		solar: "#c6c5c3",
		riddleOfFire: "#d98d58",
		brotherhood: "#da4c32",
		chakra: "#fffea5",
		extraChakra: "#fe9b28",
	},
	whm: {
		lily: "#d3ffff",
		blood: "#e08889",
		pom: "#9788e0",
		asylum: "#b5e075",
		confession: "#8df2e8",
		temperance: "#77f7b7",
	},
	ast: {
		div: MarkerColor.Yellow,
		astralCard: "#52d3f7",
		umbralCard: "#f7b3ff",
		lord: "#de1200",
		lady: "#f8facd",
		neutral: "#354869",
		synastry: "#578a7e",
		arrow: "#1690a8",
	},
	vpr: {
		vprComboTimer: "#dea65d",
		rattlingCoil: MarkerColor.Red,
		serpentOfferings: MarkerColor.Red,
		anguineTribute: "#24e2ff",
		huntersInstinct: "#9e5a02",
		swiftscaled: "#ffe20a",
	},
	sch: {
		chain: MarkerColor.Grey,
		faerieGauge: "#96ffbd",
		aetherflow: "#acfff7",
		seraph: "#44b6fd",
		feyIllumination: "#2cc7b0",
		dissipation: "#c4c4c4",
		protraction: "#77c990",
		recitation: "#ffce1c",
	},
	timeline: {
		ruler: "#2d2d2d",
		tracks: "#242424",
		castBar: "#42364d",
		lockBar: "#696969",
		gcdBar: "#354931",
		invalidBg: "#f25449",
		llCover: "#5ea647",
		potCover: "#c4543a",
		buffCover: "#9370db",
		damageMark: "#ff0000",
		healingMark: "#2cda30",
		aggroMark: "#ff8000",
		untargetableDamageMark: "#7f7f7f",
		mpTickMark: "#32525e",
		warningMark: "#9d7103",
		lucidTickMark: "#56b3d5",
		countdown: "rgba(15, 15, 15, 0.4)",
		markerAlpha: "4f",
	},
};

const LIGHT_THEME_COLORS: ThemeColors = {
	accent: "mediumpurple",
	jobAccents: {
		BLM: "#9370db", // mediumpurple
		BLU: "#9370db",
		PCT: "#f485d6",
		RDM: "#ff0000", // TODO less red
		DNC: "#e2b0af", // color ripped from xiva/fflogs
		SAM: "#f59542",
		MCH: "#6ee1d6",
		WAR: "#b10b0b", // color picker'd on job stone
		RPR: "#965a90",
		BRD: "#91ba5e",
		SMN: "#2D9B78", // copied from fflogs
		SGE: "#80a0f0",
	},
	editingValid: "#ffdc00", // yellow
	editingInvalid: "#ff0000", // red
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
		petTag: "#eb9b5f",
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
	blu: {
		moonflute: "#b69241",
		whistle: "#b69241",
		bristle: "#b69241",
		tinglea: "#217ff5",
		tingleb: "#217ff5",
		surpanakha: "#b69241",
		wingedreprobation: "#ffd535",
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
	gnb: {},
	smn: {
		// TODO
		aetherflow: "#ffd4ff",
		bahamut: "#2D9B78",
		phoenix: "#d55124",
		solar: "#9bc6dd",
		ruby: "#e5004e",
		topaz: "#b0984e",
		emerald: "#539350",
		searing: "#2D9B78",
	},
	drg: {
		lifeSurge: "#ff6633",
		lanceCharge: "#d6002d",
		lifeOfTheDragon: "#0968af",
		battleLitany: "#33b8e3",
		powerSurge: "#59ed78",
		enhancedPiercingTalon: "#f4caa6",
		firstmindsFocusStacks: "#9926c8",
		lifeOfTheDragonBar: "#d74936",
		drgComboTimer: "#3d61ae",
	},
	sge: {
		addersgall: "#80a0f0",
		addersting: "#9e2dca",
		zoe: "cyan",
		autophysis: "lightblue",
		krasis: "teal",
		soteria: "green",
		philosophia: "lightgreen",
	},
	pld: {
		divineMight: "#ff6633",
		requiescat: "#d6002d",
		fightOrFlight: "#0968af",
		pldComboTimer: "#59ed78",
		ironWillColor: "#d74936",
		oathGaugeColor: "#3d61ae",
	},
	drk: {
		darkside: "#c000d1",
		blood: "#8803fc",
		darkarts: "#ffdf0d",
		drkComboTimer: "#cb8046",
		grit: "#82cad9",
	},
	nin: {
		ninComboTimer: "#8532a8",
		kazematoi: "#ab1fd1",
		meisui: "#559ef2",
		ninki: "#8532a8",
		bunshin: "#ed8021",
		kassatsu: "#fa9bd4",
		nozuchi: "#d6a440",
		dokumori: "#7e03a3",
		trick: "#e6b525",
	},
	mnk: {
		opo: "#feabf7",
		raptor: "#c495fb",
		coeurl: "#00d9a5",
		lunar: "#a984f5",
		solar: "#c6c5c3",
		riddleOfFire: "#d98d58",
		brotherhood: "#da4c32",
		chakra: "#fee11c",
		extraChakra: "#fe9b28",
	},
	whm: {
		lily: "#a5d0e8",
		blood: "#ff5454",
		pom: "#9788e0",
		asylum: "#b5e075",
		confession: "#8df2e8",
		temperance: "#77f7b7",
	},
	ast: {
		div: MarkerColor.Yellow,
		astralCard: "#52d3f7",
		umbralCard: "#f7b3ff",
		lord: "#de1200",
		lady: "#d3d672",
		neutral: "#354869",
		synastry: "#578a7e",
		arrow: "#1690a8",
	},
	vpr: {
		vprComboTimer: "#dea65d",
		rattlingCoil: MarkerColor.Red,
		serpentOfferings: MarkerColor.Red,
		anguineTribute: "#24e2ff",
		huntersInstinct: "#9e5a02",
		swiftscaled: "#ffe20a",
	},
	sch: {
		chain: MarkerColor.Grey,
		faerieGauge: "#96ffbd",
		aetherflow: "#79d9d0",
		seraph: "#3299d9",
		feyIllumination: "#2cc7b0",
		dissipation: "#c4c4c4",
		protraction: "#77c990",
		recitation: "#ffce1c",
	},
	timeline: {
		ruler: "#e9e9e9",
		tracks: "#f3f3f3",
		castBar: "#ecd6f3",
		lockBar: "#9d9d9d",
		gcdBar: "#ccefc6",
		invalidBg: "#c21104",
		llCover: "#87ec71",
		potCover: "#ff865c",
		buffCover: "#9370db",
		damageMark: "#ff0000",
		healingMark: "#2cda30",
		aggroMark: "#ff8000",
		untargetableDamageMark: "#7f7f7f",
		mpTickMark: "#b6dfea",
		warningMark: "#ffbb29",
		lucidTickMark: "#88cae0",
		countdown: "rgba(0, 0, 0, 0.1)",
		markerAlpha: "7f",
	},
};

export function getModifierTagColor(modifierType: PotencyModifierType) {
	const colors = getCurrentThemeColors();
	const modifierColors = new Map<PotencyModifierType, string>([
		[PotencyModifierType.AF3, colors.blm.astralFire],
		[PotencyModifierType.AF2, colors.blm.astralFire],
		[PotencyModifierType.AF1, colors.blm.astralFire],
		[PotencyModifierType.UI3, colors.blm.umbralIce],
		[PotencyModifierType.UI2, colors.blm.umbralIce],
		[PotencyModifierType.UI1, colors.blm.umbralIce],
		[PotencyModifierType.ENO, colors.blm.enochian],
		//[PotencyModifierType.POT, colors.text], // n/a
		//[PotencyModifierType.PARTY, colors.text], // n/a
		[PotencyModifierType.AUTO_CDH, colors.resources.cdhTag],
		[PotencyModifierType.STARRY, colors.pct.starryBuff],
		[PotencyModifierType.EMBOLDEN_M, colors.rdm.emboldenBuff],
		[PotencyModifierType.MANAFIC, colors.rdm.manaficBuff],
		[PotencyModifierType.ACCELERATION, colors.rdm.accelBuff],
		[PotencyModifierType.STANDARD_SINGLE, colors.dnc.jete],
		[PotencyModifierType.STANDARD_DOUBLE, colors.dnc.jete],
		[PotencyModifierType.TECHNICAL_SINGLE, colors.dnc.esprit],
		[PotencyModifierType.TECHNICAL_DOUBLE, colors.dnc.esprit],
		[PotencyModifierType.TECHNICAL_TRIPLE, colors.dnc.esprit],
		[PotencyModifierType.TECHNICAL_QUADRUPLE, colors.dnc.esprit],
		[PotencyModifierType.DEVILMENT, colors.dnc.feathers],
		[PotencyModifierType.OVERHEATED, MarkerColor.Pink],
		[PotencyModifierType.COMBO, colors.resources.comboTag],
		[PotencyModifierType.FUGETSU, colors.sam.fugetsu],
		[PotencyModifierType.AUTO_CRIT, colors.resources.cdhTag],
		[PotencyModifierType.YATEN, colors.pct.cometPaint], // todo
		[PotencyModifierType.POSITIONAL, MarkerColor.Green], // todo
		[PotencyModifierType.ARCANE_CIRCLE, MarkerColor.Pink],
		[PotencyModifierType.DEATHSDESIGN, MarkerColor.Red],
		[PotencyModifierType.ENHANCED_GIBBET_GALLOWS, MarkerColor.Blue],
		[PotencyModifierType.ENHANCED_REAPING, MarkerColor.Purple],
		[PotencyModifierType.IMMORTAL_SACRIFICE, MarkerColor.Pink],
		[PotencyModifierType.SURGING_TEMPEST, MarkerColor.Purple],
		[PotencyModifierType.BARRAGE, colors.brd.barrage],
		[PotencyModifierType.RAGING_STRIKES, colors.brd.ragingStrikes],
		[PotencyModifierType.BATTLE_VOICE, colors.brd.battleVoice],
		[PotencyModifierType.RADIANT_FINALE_THREE_CODA, colors.brd.radiantFinale],
		[PotencyModifierType.RADIANT_FINALE_TWO_CODA, colors.brd.radiantFinale],
		[PotencyModifierType.RADIANT_FINALE_ONE_CODA, colors.brd.radiantFinale],
		[PotencyModifierType.WANDERERS_MINUET, colors.brd.wanderersCoda],
		[PotencyModifierType.MAGES_BALLAD, colors.brd.magesCoda],
		[PotencyModifierType.ARMYS_PAEON, colors.brd.armysCoda],
		[PotencyModifierType.NO_MERCY, colors.rdm.blackMana], // gnb
		[PotencyModifierType.SEARING_LIGHT, colors.smn.searing], // smn
		[PotencyModifierType.LIFE_SURGE, colors.drg.lifeSurge], // drg
		[PotencyModifierType.LANCE_CHARGE, colors.drg.lanceCharge],
		[PotencyModifierType.LIFE_OF_THE_DRAGON, colors.drg.lifeOfTheDragon],
		[PotencyModifierType.BATTLE_LITANY, colors.drg.battleLitany],
		[PotencyModifierType.POWER_SURGE, colors.drg.powerSurge],
		[PotencyModifierType.ENHANCED_PIERCING_TALON, colors.drg.enhancedPiercingTalon],
		[PotencyModifierType.DIVINE_MIGHT, colors.pld.divineMight], // pld
		[PotencyModifierType.REQUIESCAT, colors.pld.requiescat],
		[PotencyModifierType.FIGHT_OR_FLIGHT, colors.pld.fightOrFlight],
		[PotencyModifierType.PET, colors.resources.petTag],
		[PotencyModifierType.MOON_FLUTE, colors.blu.moonflute],
		[PotencyModifierType.WHISTLE, colors.blu.whistle],
		[PotencyModifierType.BRISTLE, colors.blu.bristle],
		[PotencyModifierType.TINGLEA, colors.blu.tinglea],
		[PotencyModifierType.TINGLEB, colors.blu.tingleb],
		[PotencyModifierType.SURPANAKHA, colors.blu.surpanakha],
		[PotencyModifierType.WINGED_REDEMPTION, colors.blu.wingedreprobation],
		[PotencyModifierType.WINGED_REPROBATION, colors.blu.wingedreprobation],
		[PotencyModifierType.DARKSIDE, colors.drk.darkside],
		[PotencyModifierType.BUNSHIN, colors.nin.bunshin],
		[PotencyModifierType.KASSATSU, colors.nin.kassatsu],
		[PotencyModifierType.HOLLOW_NOZUCHI, colors.nin.nozuchi],
		[PotencyModifierType.KAZEMATOI, colors.nin.kazematoi],
		[PotencyModifierType.MEISUI, colors.nin.meisui],
		[PotencyModifierType.DOKUMORI, colors.nin.dokumori],
		[PotencyModifierType.TRICK_ATTACK, colors.nin.trick],
		[PotencyModifierType.KUNAIS_BANE, colors.nin.trick],
		[PotencyModifierType.BROTHERHOOD, colors.mnk.brotherhood],
		[PotencyModifierType.RIDDLE_OF_FIRE, colors.mnk.riddleOfFire],
		[PotencyModifierType.MNK_BALL, colors.mnk.opo],
		[PotencyModifierType.SSS_CHAKRA, colors.mnk.chakra],
		[PotencyModifierType.DIVINATION, colors.ast.div],
		[PotencyModifierType.HUNTERS_INSTINCT, colors.vpr.huntersInstinct],
		[PotencyModifierType.HONED, colors.vpr.vprComboTimer],
		[PotencyModifierType.VENOM, colors.vpr.vprComboTimer],
		[PotencyModifierType.POISED, colors.vpr.vprComboTimer],
		[PotencyModifierType.CHAIN_STRAT, colors.sch.chain],
	]);
	console.assert(
		modifierColors.has(modifierType),
		`modifier ${modifierType} doesn't have a color!`,
	);
	return modifierColors.get(modifierType) ?? colors.text;
}

function ColorThemeOption(props: {
	colorTheme: ColorTheme;
	setColorTheme: (value: ColorTheme) => void;
}) {
	let icon = <MdLightMode />;
	const colors = getCurrentThemeColors();
	const activeColorTheme = useContext(ColorThemeContext);
	if (props.colorTheme === "Dark") icon = <MdDarkMode />;
	return <div
		style={{
			display: "inline-block",
			cursor: "pointer",
			verticalAlign: "middle",
			borderBottom:
				props.colorTheme === activeColorTheme ? "none" : "1px solid " + colors.text,
			borderTop: props.colorTheme === activeColorTheme ? "1px solid " + colors.text : "none",
		}}
		onClick={() => props.setColorTheme(props.colorTheme)}
	>
		{icon}
	</div>;
}

export const getCachedColorTheme: () => ColorTheme = () => {
	const cachedColorTheme = getCachedValue("colorTheme");
	if (cachedColorTheme === "Light" || cachedColorTheme === "Dark") {
		return cachedColorTheme;
	}
	// If the user did not explicitly set a value, use the system default.
	// https://stackoverflow.com/questions/56393880/how-do-i-detect-dark-mode-using-javascript
	if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
		return "Dark";
	}
	return "Light";
};

export const ColorThemeContext = createContext(getCachedColorTheme());

export function SelectColorTheme(props: { setColorTheme: (value: ColorTheme) => void }) {
	return <div
		style={{
			display: "inline-block",
			position: "absolute",
			right: 10,
		}}
	>
		<div style={{ display: "inline-block", fontSize: 16, position: "relative" }}>
			<ColorThemeOption colorTheme={"Light"} setColorTheme={props.setColorTheme} />|
			<ColorThemeOption colorTheme={"Dark"} setColorTheme={props.setColorTheme} />
		</div>
	</div>;
}
