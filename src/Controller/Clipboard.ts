// File for managing plaintext, TSV, and discord emoji parsing of ActionNodes.

import { controller } from "./Controller";
import { AddNodeBulk } from "./UndoStack";
import {
	ActionNode,
	skillNode,
	ActionType,
	waitForMPNode,
	durationWaitNode,
	jumpToTimestampNode,
	setResourceNode,
} from "./Record";
import { ActionKey, ACTIONS } from "../Game/Data";
import {
	discordEmoteSkillMap,
	getNormalizedSkillName,
	jaSkillNameMap,
	zhSkillNameMap,
} from "../Game/Skills";
import { parseTime } from "../Components/Common";
import { lookupResourceAnyLocale } from "../Game/Resources";
import { getCurrentLanguage } from "../Components/Localization";

export type ClipboardMode = "plain" | "tsv" | "discord";

// When the cliipboard is invoked, check its contents against the last string copied within
// XIV in the Shell. If it matches, then a paste operation should insert nodes present in lastCopyNodes.
// This works around a limitation in parsing, where sequences of discord emojis can't parse a
// non-skill node at the start of the sequence.
// Furthermore, clipboard formats that aren't TSV don't serialized with target counts. The cached
// lastCopyNodes value ensures target count information isn't lost.
let lastCopyString: string | undefined = undefined;
let lastCopyNodes: ActionNode[] = [];

const SEP_ZH = "、";
const SEP_EN = ", ";
const COLON = ":";

function serializeToClipboard(mode: ClipboardMode): string {
	const actions = controller.record.getSelected().actions;
	const start = controller.record.selectionStartIndex!;
	if (start === undefined) {
		return "";
	}
	let result = "";
	if (mode === "plain") {
		const items: string[] = [];
		actions.forEach((node) => items.push(node.toLocalizedString()));
		const sep = getCurrentLanguage() === "zh" ? SEP_ZH : SEP_EN;
		result = items.join(sep);
	} else if (mode === "tsv") {
		// Export 3 columns of
		// timestamp | target count | name
		const rows: string[] = [];
		const status = controller.checkRecordValidity(controller.record, 0);
		actions.forEach((node, i) =>
			rows.push(
				[
					status.skillUseTimes[i + start].toFixed(3),
					// Note that this serialization is lossy: we cannot reliably recreate
					// targetList from the scalar targetCount value.
					node.targetList.length,
					node.toLocalizedString(),
				].join("\t"),
			),
		);
		result = rows.join("\n");
	} else if (mode === "discord") {
		const items: string[] = [];
		actions.forEach((node) => {
			if (node.info.type === ActionType.Skill) {
				const key = node.info.skillName;
				if (key === "TINCTURE") {
					items.push(":IntPot:");
				} else if (key === "SWIFTCAST") {
					items.push(controller.gameConfig.job === "BLM" ? ":Swift:" : ":Swiftcast:");
				} else {
					// If there's no canonical emoji, just use the name with spaces removed
					items.push(
						`:${ACTIONS[key].discordEmote ?? ACTIONS[key].name.replaceAll(" ", "")}:`,
					);
				}
			} else {
				items.push(node.toLocalizedString());
			}
		});
		result = items.join(" ");
	} else {
		console.error("invalid clipboard mode", mode);
	}
	lastCopyString = result;
	lastCopyNodes = actions;
	return result;
}

function isNumberOrDecimal(c: string): boolean {
	return c === "." || (c >= "0" && c <= "9");
}

function checkNonSkillNode(text: string, lookahead3: string | undefined) {
	// language isn't LR(1), sorry :3
	// praying that sqenix never decides to add any skills that start with any of these special
	// substrings (I'm willfully ignoring DRG "Jump")
	const lowerText = text.toLowerCase();
	const lowerLookahead = lookahead3?.toLowerCase();
	// MP WAIT
	if (
		lowerText === "wait mp" ||
		text === "快进至跳蓝" ||
		(lowerText === "wait" && lowerLookahead === " mp") ||
		(text === "快进至" && lookahead3?.substring(3, 5) === "跳蓝")
	) {
		return waitForMPNode();
	}
	const toks = text.split(" ");
	if (lookahead3 !== undefined) {
		// Don't stop parsing yet if the next character is a decimal point or numeral
		if (isNumberOrDecimal(lookahead3[0])) {
			return undefined;
		}
	}
	// DURATION WAIT
	if (toks.length === 2 && toks[0] === "wait") {
		// assume next token is a timestamp
		const parsedDuration = parseTime(toks[1]);
		return isNaN(parsedDuration) ? undefined : durationWaitNode(parsedDuration);
	}
	if (text.startsWith("快进至")) {
		const parsedDuration = parseTime(text.substring(3));
		return isNaN(parsedDuration) ? undefined : durationWaitNode(parsedDuration);
	}
	// TARGET JUMP
	if (toks.length === 2 && toks[0] === "jump") {
		const parsedTarget = parseTime(toks[1]);
		return isNaN(parsedTarget) ? undefined : jumpToTimestampNode(parsedTarget);
	}
	if (text.startsWith("跳到")) {
		const parsedTarget = parseTime(text.substring(2));
		return isNaN(parsedTarget) ? undefined : jumpToTimestampNode(parsedTarget);
	}
	// BUFF TOGGLE
	if (toks.length >= 2 && toks[0] === "toggle") {
		const parsedBuff = lookupResourceAnyLocale(toks.slice(1).join(" "));
		return parsedBuff !== undefined ? setResourceNode(parsedBuff) : undefined;
	}
	if (text.startsWith("开关")) {
		const parsedBuff = lookupResourceAnyLocale(text.substring(2));
		return parsedBuff !== undefined ? setResourceNode(parsedBuff) : undefined;
	}
	return undefined;
}

function parseTextNode(text: string, targetCount: number = 1): ActionNode | undefined {
	// Before parsing skills, parse other kinds of nodes.
	const otherNode = checkNonSkillNode(text, undefined);
	if (otherNode !== undefined) {
		return otherNode;
	}
	// don't check locale in advance so we can paste from other languages
	// (small penalty of a few more map lookups)
	const key: ActionKey | undefined =
		getNormalizedSkillName(text) ?? zhSkillNameMap.get(text) ?? jaSkillNameMap.get(text);
	// Note that this serialization is lossy: we cannot reliably recreate
	// targetList from the scalar targetCount value.
	return key !== undefined
		? skillNode(
				key,
				Array(targetCount)
					.fill(0)
					.map((_, i) => i + 1),
			)
		: undefined;
}

function parsePasted(text: string): ActionNode[] | undefined {
	if (text === lastCopyString) {
		return lastCopyNodes;
	}
	const lines = text.split("\n");
	const nodes: ActionNode[] = [];
	for (const line of lines) {
		const stripped = line.trimStart();
		if (line.includes("\t")) {
			// Google sheets sends TSV to the clipboard, so if there are tabs we can assume
			// this line is a spreadsheet export.
			const tokens = line.split("\t");
			// A copy from XIV in the Shell itself will put timestamp as the first column,
			// target count as the second column, and skill name as the last. As such, assume that
			// the last token in the line is the one representing the skill.
			if (tokens.length > 0) {
				const skillPrettyName = tokens[tokens.length - 1].trim();
				let targetCount = 1;
				if (tokens.length > 1) {
					const targetCountParsed = parseInt(tokens[tokens.length - 2]);
					if (!isNaN(targetCountParsed)) {
						targetCount = targetCountParsed;
					}
				}
				const node = parseTextNode(skillPrettyName, targetCount);
				if (node !== undefined) {
					nodes.push(node);
				}
			}
		} else if (stripped.length > 2 && stripped[0] === COLON) {
			// colon means we're probably pasting from a discord emote
			// lines that start with a non-emote can't be pasted in discord mode, but that's a small tradeoff
			// to make and somewhat inevitable since waits and some skill names have colons
			// to account for waits/other events we can't just repeat indexOf calls to find the colon character
			// this could be made more failure-resilient by tracking what kind of action we're currently parsing,
			// but that's difficult
			let readingEmote = true;
			let buffer = "";
			for (let i = 1; i < stripped.length; i++) {
				const nextChar = stripped[i];
				// discord emotes shouldn't end with spaces, but just assume that was a mistake
				if (readingEmote && (nextChar === COLON || nextChar === " ")) {
					// if there's a tilde (used for distinguishing servers) or an "_oGCD" suffix,
					// remove them
					// TODO parse XML tags? (retrieved if you right click + "copy text")
					const tildeIdx = buffer.indexOf("~");
					if (tildeIdx > 0) {
						buffer = buffer.substring(0, tildeIdx);
					}
					if (buffer.toLowerCase().endsWith("_ogcd")) {
						buffer = buffer.substring(0, buffer.length - 5);
					}
					if (buffer.length === 0) {
						// no-op
					} else if (buffer === "IntPot") {
						nodes.push(skillNode("TINCTURE"));
					} else if (buffer === "Swift" || buffer === "Swiftcast") {
						nodes.push(skillNode("SWIFTCAST"));
					} else {
						const emoteMapLookup = discordEmoteSkillMap
							.get(controller.gameConfig.job)!
							.get(buffer);
						if (emoteMapLookup !== undefined) {
							nodes.push(skillNode(emoteMapLookup));
						} else {
							console.error("unrecognized discord emote", buffer);
						}
					}
					buffer = "";
					readingEmote = false;
					continue;
				}
				// timestamps may contain colon characters, so ensure the buffer is empty
				// before entering emoji parse mode
				if (nextChar === COLON && buffer.length === 0) {
					readingEmote = true;
					buffer = "";
					continue;
				}
				// if the buffer is already empty, don't add whitespace
				if (buffer.length > 0 || nextChar !== " ") {
					buffer += nextChar;
				}
				// to disambiguate wait events, we need to look ahead by 3 characters
				const lookahead = stripped.substring(i + 1, i + 4);
				if (!readingEmote) {
					const maybeNode = checkNonSkillNode(buffer, lookahead);
					if (maybeNode !== undefined) {
						nodes.push(maybeNode);
						buffer = "";
					}
				}
			}
		} else {
			// Treat everything else as comma-separated plaintext
			let toks = stripped.split(SEP_EN);
			if (toks.length < 2) {
				// Use the Chinese separator instead if commas didn't work
				toks = stripped.split(SEP_ZH);
			}
			toks.forEach((tok) => {
				if (tok.length > 0) {
					const node = parseTextNode(tok.trim());
					if (node !== undefined) {
						nodes.push(node);
					}
				}
			});
		}
	}
	return nodes;
}

export function copy() {
	navigator.clipboard.writeText(serializeToClipboard(controller.clipboardMode));
	// console.log("copy", controller.record.getSelected().actions);
}

export function paste() {
	// Interactions are disabled while we're waiting for a paste operation to complete.
	controller.queuedPastes++;
	// On Chrome, reading the clipboard requires a one-time permission prompt.
	// On Firefox, a "paste" prompt is created every time.
	navigator.clipboard
		.readText()
		.then((clipText) => {
			// HACK: If the clipboard starts with https:// www. or cn. it probably means we're trying
			// to paste from fflogs and forgot to focus the log input line. To be robust we should
			// properly track focus, but as a fast-path fix to avoid hitting any parsing code we
			// just short-circuit here.
			if (
				clipText.startsWith("https://") ||
				clipText.startsWith("www.") ||
				clipText.startsWith("cn.")
			) {
				return;
			}
			const parsed = parsePasted(clipText);
			if (parsed === undefined || parsed.length === 0) {
				console.error("failed to paste parsed clipboard contents:");
				console.error(clipText);
				return;
			}
			controller.undoStack.doThenPush(
				new AddNodeBulk(
					parsed,
					controller.record.selectionStartIndex ?? controller.record.length,
					"paste",
				),
			);
			// console.log("paste", clipText);
		})
		.finally(() => {
			controller.queuedPastes--;
			console.assert(controller.queuedPastes >= 0);
		});
}
