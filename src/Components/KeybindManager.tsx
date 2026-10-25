import React, { useState, useContext, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Dialog } from "@base-ui/react/dialog";
import { Tooltip } from "@base-ui/react/tooltip";
import { ScrollArea } from "@base-ui/react/scroll-area";
import { localize, localizeSkillName } from "./Localization";
import { DialogTrigger, DialogClose, dialogOnOpenChangeHandler } from "./Common";
import { ColorThemeContext, getCurrentThemeColors } from "./ColorTheme";
import { KeybindOverlay, SkillIconImage, iconStyle, iconImgStyle } from "./Skills";
import { getAllAssignableSkillNames, getConditionalReplacement } from "../Game/Skills";
import { controller } from "../Controller/Controller";
import {
	MAX_NUM_HOTBARS,
	MAX_HOTBAR_SLOTS,
	DELETE_LAST_TIMELINE_ACTION,
	assignBind,
	bindEntryFromPress,
	clearBind,
	clearHotbarBinds,
	findBindConflict,
	formatBind,
	getDefaultBind,
	getDisplayBind,
	hotbarKeybindAction,
	isModifierKey,
	resetAllBinds,
	resetBind,
	keybindActionEq,
	swapBindAssignment,
	validateBind,
	type BindEntry,
	type KeybindAction,
	type KeyPress,
} from "../Controller/KeybindManager";
import { ShellJob, JOBS } from "../Game/Data/Jobs";
import { GameState } from "../Game/GameState";
import { ActionKey } from "../Game/Data";

// discriminated union for drags from full skill list vs. drag from another slot
type HotbarDragOrigin = { kind: "palette" } | { kind: "slot"; bar: number; slot: number };

const EMPTY_MODIFIERS: KeyPress = { key: "" };

function bindFromEvent(e: KeyboardEvent): BindEntry {
	return bindEntryFromPress({
		key: e.key,
		code: e.code,
		shiftKey: e.shiftKey,
		ctrlKey: e.ctrlKey,
		altKey: e.altKey,
		metaKey: e.metaKey,
	});
}

function actionLabel(actionKey: KeybindAction): string {
	if (actionKey.kind === "system") {
		return localize({ en: "Remove last timeline entry", zh: "删除时间轴最后一项" }).toString();
	}
	return localize({
		en: `Hotbar ${actionKey.hotbar} slot ${actionKey.slot}`,
		zh: `热键栏 ${actionKey.hotbar} 槽位 ${actionKey.slot}`,
	}).toString();
}

function captureText(actionKey: KeybindAction): string {
	if (actionKey.kind === "hotbar") {
		return `Awaiting bind for Hotbar ${actionKey.hotbar}, Slot ${actionKey.slot} (Esc to cancel)`;
	}
	const target =
		actionKey.command === "deleteLastTimelineAction"
			? "Remove last timeline entry"
			: actionKey.command;
	return `Awaiting bind for "${target}" (Esc to cancel)`;
}

function rowKey(actionKey: KeybindAction): string {
	if (actionKey.kind === "system") return `system:${actionKey.command}`;
	return `hotbar:${actionKey.hotbar}:${actionKey.slot}`;
}

// responsible for mapping user inputs -> hotbar slots and system shortcuts
export function KeybindManager() {
	const [dialogOpen, _setDialogOpen] = useState(false);
	const [bindRevision, setBindRevision] = useState(0);
	const [armedAction, setArmedAction] = useState<KeybindAction | undefined>(undefined);
	const [heldModifiers, setHeldModifiers] = useState<KeyPress>(EMPTY_MODIFIERS);
	const armedActionRef = useRef(armedAction);
	// ref copies state for the benefit of the key listener, which is not part of the react lifecycle
	armedActionRef.current = armedAction;

	const setEmptyModifiers = () => setHeldModifiers(EMPTY_MODIFIERS);
	const setHeldModifiersFromKeypress = (e: KeyboardEvent): KeyPress => {
		return {
			key: "",
			shiftKey: e.shiftKey,
			ctrlKey: e.ctrlKey,
			altKey: e.altKey,
			metaKey: e.metaKey,
		};
	};
	const cancelArmedAction = () => {
		setArmedAction(undefined);
		setEmptyModifiers();
	};
	const setDialogOpen = (open: boolean) => {
		_setDialogOpen(open);
		dialogOnOpenChangeHandler(open);
		if (!open) {
			setArmedAction(undefined);
		}
	};
	const publish = () => {
		controller.onKeybindsChanged();
		setBindRevision((n) => n + 1);
	};
	// return true on a successful keybind update
	const tryAssign = (actionKey: KeybindAction, bind: BindEntry): boolean => {
		const reason = validateBind(bind);
		if (reason !== undefined) {
			window.alert(localize(reason).toString());
			return false;
		}
		const conflict = findBindConflict(actionKey, bind);
		if (conflict !== undefined) {
			const swap = window.confirm(
				localize({
					en: `${formatBind(bind)} is currently bound to ${actionLabel(conflict)}. Swap the two bindings?`,
				}).toString(),
			);
			if (!swap) {
				return false;
			}
			swapBindAssignment(actionKey, bind, conflict);
		} else {
			assignBind(actionKey, bind);
		}
		publish();
		return true;
	};
	useEffect(() => {
		if (armedAction === undefined) {
			return;
		}
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.repeat) {
				return;
			}
			if (e.key === "Escape") {
				e.preventDefault();
				e.stopPropagation();
				cancelArmedAction();
				return;
			}
			if (isModifierKey(e.key)) {
				setHeldModifiersFromKeypress(e);
				return;
			}
			e.preventDefault();
			e.stopPropagation();
			const actionKey = armedActionRef.current;
			if (actionKey === undefined) {
				return;
			}
			const bind = bindFromEvent(e);
			const reason = validateBind(bind);
			if (reason !== undefined) {
				window.alert(localize(reason).toString());
				cancelArmedAction();
				return;
			}
			tryAssign(actionKey, bind);
			cancelArmedAction();
		};
		const onKeyUp = (e: KeyboardEvent) => {
			if (!isModifierKey(e.key)) {
				return;
			}
			setHeldModifiersFromKeypress(e);
		};
		window.addEventListener("keydown", onKeyDown, true);
		window.addEventListener("keyup", onKeyUp, true);
		return () => {
			window.removeEventListener("keydown", onKeyDown, true);
			window.removeEventListener("keyup", onKeyUp, true);
		};
	}, [armedAction]);
	const lightMode = useContext(ColorThemeContext) === "Light";
	const colors = getCurrentThemeColors();
	const renderRow = (actionKey: KeybindAction, label: React.ReactNode) => {
		const armed = armedAction !== undefined && keybindActionEq(armedAction, actionKey);
		const shown = armed ? formatBind(heldModifiers) : (getDisplayBind(actionKey) ?? "");
		return <tr key={rowKey(actionKey)}>
			<td style={{ padding: "4px 12px 4px 0", textAlign: "left", width: "100%" }}>{label}</td>
			<td
				style={{
					padding: "4px 8px",
					minWidth: "8em",
					textAlign: "center",
					cursor: "pointer",
					outline: armed
						? `2px solid ${colors.dropTarget}`
						: `1px solid ${colors.bgHighContrast}`,
					outlineOffset: -2,
				}}
				onClick={() => {
					setArmedAction(actionKey);
					setEmptyModifiers();
				}}
				onContextMenu={(e) => {
					e.preventDefault();
					clearBind(actionKey);
					if (
						armedActionRef.current !== undefined &&
						keybindActionEq(armedActionRef.current, actionKey)
					) {
						cancelArmedAction();
					}
					publish();
				}}
			>
				{shown === "" ? "\u00a0" : shown}
			</td>
			<td style={{ padding: "4px 0 4px 8px", textAlign: "right" }}>
				<button
					onClick={() => {
						const fallback = getDefaultBind(actionKey);
						if (fallback === undefined) {
							clearBind(actionKey);
							publish();
							return;
						}
						if (findBindConflict(actionKey, fallback) === undefined) {
							resetBind(actionKey);
							cancelArmedAction();
							publish();
							return;
						}
						tryAssign(actionKey, fallback);
						cancelArmedAction();
					}}
				>
					{localize({ en: "reset", zh: "重置" })}
				</button>
			</td>
		</tr>;
	};
	const description = <div style={{ marginBlock: 10 }}>
		{localize({
			en: "Click a binding to change it. Right-click to remove.",
		})}
	</div>;
	// bindRevision is read so a save re-renders the tables from the live bind map.
	void bindRevision;
	const body = <div>
		<h4>{localize({ en: "System", zh: "系统" })}</h4>
		<table style={{ width: "100%" }}>
			<tbody>
				{renderRow(
					DELETE_LAST_TIMELINE_ACTION,
					localize({ en: "Remove last timeline entry", zh: "删除时间轴最后一项" }),
				)}
			</tbody>
		</table>
		{[...Array(MAX_NUM_HOTBARS).keys()].map((barIndex) => <div
			key={`keybinds-bar-${barIndex + 1}`}
		>
			<h4>{localize({ en: `Hotbar ${barIndex + 1}`, zh: `热键栏 ${barIndex + 1}` })}</h4>
			<table style={{ width: "100%" }}>
				<tbody>
					{[...Array(MAX_HOTBAR_SLOTS).keys()].map((slotIndex) =>
						renderRow(
							hotbarKeybindAction(barIndex + 1, slotIndex + 1),
							localize({
								en: `Slot ${slotIndex + 1}`,
								zh: `槽位 ${slotIndex + 1}`,
							}),
						),
					)}
				</tbody>
			</table>
		</div>)}
	</div>;
	return <>
		<Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
			<DialogTrigger
				titleNode={localize({ en: "edit keybinds" })}
				handle={"\u2022 "}
				containerStyle={{ marginBlock: 5 }}
			/>
			<Dialog.Portal>
				<Dialog.Backdrop
					className="Backdrop"
					style={{
						opacity: lightMode ? 0.2 : 0.7,
					}}
				/>
				<Dialog.Popup
					className="Popup invisibleScrollbar"
					style={{
						backgroundColor: colors.background,
						border: "1px solid " + colors.bgMediumContrast,
						color: colors.text,
						overflow: "hidden",
						maxHeight: "100%",
						width: "32rem",
					}}
				>
					<Dialog.Title render={<h3>{localize({ en: "Edit keybinds" })}</h3>} />
					<DialogClose />
					<Dialog.Description className="Description" render={description} />
					<ScrollArea.Root className="Body" style={{ maxHeight: "80%" }}>
						<ScrollArea.Viewport className="BodyViewport">
							<ScrollArea.Content
								style={{
									display: "flex",
									flexDirection: "column",
									paddingRight: 16,
								}}
							>
								{body}
							</ScrollArea.Content>
						</ScrollArea.Viewport>
						<ScrollArea.Scrollbar
							style={{
								display: "flex",
								justifyContent: "center",
								backgroundColor: colors.bgLowContrast,
								width: 5,
							}}
						>
							<ScrollArea.Thumb
								style={{
									width: "100%",
									backgroundColor: colors.bgHighContrast,
								}}
							/>
						</ScrollArea.Scrollbar>
					</ScrollArea.Root>
					<div style={{ marginBlock: 10 }}>
						<button
							onClick={() => {
								clearHotbarBinds();
								publish();
							}}
						>
							{localize({
								en: "clear all hotbar bindings",
								zh: "清空所有热键栏绑定",
							})}
						</button>
						<span> </span>
						<button
							onClick={() => {
								resetAllBinds();
								cancelArmedAction();
								publish();
							}}
						>
							{localize({
								en: "reset all bindings to default",
								zh: "全部恢复默认绑定",
							})}
						</button>
					</div>
					<div style={{ minHeight: "1.5em", color: colors.emphasis }}>
						{armedAction !== undefined && captureText(armedAction)}
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	</>;
}

// responsible for mapping hotbar slots -> job actions
export function HotbarManager(props: {
	activeJob: ShellJob;
	hotbarOneOnBottom: boolean;
	// Passing in the whole GameState handle just for a reference to DisplayedSkills is less than
	// ideal, but DisplayedSkills needs the state object to compute skill replacements and refactoring
	// it would be a pain.
	state: Readonly<GameState>;
}) {
	const [dialogOpen, _setDialogOpen] = useState(false);
	// Hotbar slot under the pointer. Set only while a skill icon is being dragged.
	const [bindTarget, setBindTarget] = useState<[number, number] | undefined>(undefined);
	// Bumped after a layout commit so this dialog re-reads controller.hotbarLayout.
	const [, setHotbarRevision] = useState(0);
	// dragGhost is needed to render the skill icon being dragged, as we suppress the native
	// browser image drag event.
	const [dragGhost, setDragGhost] = useState<ActionKey | undefined>(undefined);
	const skillToBind = useRef<ActionKey | undefined>(undefined);
	const dragOrigin = useRef<HotbarDragOrigin | undefined>(undefined);
	const bindTargetRef = useRef<[number, number] | undefined>(undefined);
	const ghostRef = useRef<HTMLDivElement>(null);
	const ghostOffset = useRef({ x: 0, y: 0 });
	const pointerPos = useRef({ x: 0, y: 0 });
	const dragCapture = useRef<{ element: HTMLElement; pointerId: number } | undefined>(undefined);
	const endDragRef = useRef<(commit: boolean) => void>(() => {});
	const setDialogOpen = (open: boolean) => {
		_setDialogOpen(open);
		dialogOnOpenChangeHandler(open);
	};
	const setDragTarget = (next: [number, number] | undefined) => {
		const prev = bindTargetRef.current;
		if (prev === next || (prev && next && prev[0] === next[0] && prev[1] === next[1])) {
			return;
		}
		bindTargetRef.current = next;
		setBindTarget(next);
	};
	// Needed to compute coordinates of a drag destination because touch gestures don't fire
	// drag events.
	const hotbarSlotAt = (x: number, y: number): [number, number] | undefined => {
		const hit = document.elementFromPoint(x, y);
		const slot = hit?.closest<HTMLElement>("[data-hotbar-slot]");
		if (slot?.dataset.bar === undefined || slot.dataset.slot === undefined) return undefined;
		return [Number(slot.dataset.bar), Number(slot.dataset.slot)];
	};
	const placeGhost = (x: number, y: number) => {
		pointerPos.current = { x, y };
		const node = ghostRef.current;
		if (!node) return;
		node.style.transform = `translate(${x - ghostOffset.current.x}px, ${y - ghostOffset.current.y}px)`;
	};
	const releaseDragCapture = () => {
		const capture = dragCapture.current;
		dragCapture.current = undefined;
		if (capture !== undefined && capture.element.hasPointerCapture(capture.pointerId)) {
			capture.element.releasePointerCapture(capture.pointerId);
		}
	};
	const endDrag = (commit: boolean) => {
		releaseDragCapture();
		const skill = skillToBind.current;
		const target = bindTargetRef.current;
		const origin = dragOrigin.current;
		if (commit && skill !== undefined && target !== undefined && origin !== undefined) {
			const [targetBar, targetSlot] = target;
			const sameSlot =
				origin.kind === "slot" && origin.bar === targetBar && origin.slot === targetSlot;
			if (!sameSlot) {
				const next = controller.hotbarLayout.map((row) => row.slice());
				const displaced = next[targetBar - 1][targetSlot - 1];
				next[targetBar - 1][targetSlot - 1] = skill;
				if (origin.kind === "slot") {
					next[origin.bar - 1][origin.slot - 1] = displaced;
				}
				controller.saveHotbarLayout(next);
				setHotbarRevision((n) => n + 1);
			}
		}
		skillToBind.current = undefined;
		dragOrigin.current = undefined;
		setDragGhost(undefined);
		setDragTarget(undefined);
	};
	endDragRef.current = endDrag;
	// While the primary button is held, a right-click does not deliver a button-2 pointer event to the
	// capturing element. It does fire contextmenu, which is what currently swallows the browser menu.
	useEffect(() => {
		const onContextMenu = () => {
			if (skillToBind.current === undefined) return;
			endDragRef.current(false);
		};
		window.addEventListener("contextmenu", onContextMenu, true);
		return () => window.removeEventListener("contextmenu", onContextMenu, true);
	}, []);
	const onSkillPointerDown = (
		e: React.PointerEvent<HTMLDivElement>,
		skillName: ActionKey,
		origin: HotbarDragOrigin,
	) => {
		if (e.button === 2 && skillToBind.current !== undefined) {
			endDrag(false);
			return;
		}
		if (e.button !== 0) return;
		// Suppress native browser image drag, which fires pointerCancel
		e.preventDefault();
		const rect = e.currentTarget.getBoundingClientRect();
		ghostOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
		dragCapture.current = { element: e.currentTarget, pointerId: e.pointerId };
		e.currentTarget.setPointerCapture(e.pointerId);
		skillToBind.current = skillName;
		dragOrigin.current = origin;
		setDragGhost(skillName);
		placeGhost(e.clientX, e.clientY);
	};
	const onSkillPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		if (skillToBind.current === undefined) return;
		if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
		placeGhost(e.clientX, e.clientY);
		setDragTarget(hotbarSlotAt(e.clientX, e.clientY));
	};
	const onSkillPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
		if (skillToBind.current === undefined) return;
		if (e.button !== 0) {
			endDrag(false);
			return;
		}
		if (e.currentTarget.hasPointerCapture(e.pointerId)) {
			e.currentTarget.releasePointerCapture(e.pointerId);
		}
		endDrag(true);
	};
	const onSkillPointerCancel = () => {
		if (skillToBind.current === undefined) return;
		endDrag(false);
	};
	const unbindSlot = (bar: number, slot: number) => {
		const next = controller.hotbarLayout.map((row) => row.slice());
		if (next[bar - 1]?.[slot - 1] === undefined || next[bar - 1][slot - 1] === "NEVER") {
			return;
		}
		next[bar - 1][slot - 1] = "NEVER";
		controller.saveHotbarLayout(next);
		setHotbarRevision((n) => n + 1);
	};
	const clearHotbars = () => {
		controller.saveHotbarLayout(
			Array.from({ length: MAX_NUM_HOTBARS }, () =>
				Array.from({ length: MAX_HOTBAR_SLOTS }, () => "NEVER" as ActionKey),
			),
		);
		setHotbarRevision((n) => n + 1);
	};
	const resetHotbars = () => {
		controller.saveHotbarLayout(
			props.state.displayedSkills.getDefaultHotbarLayout(props.state),
		);
		setHotbarRevision((n) => n + 1);
	};
	const lightMode = useContext(ColorThemeContext) === "Light";
	const colors = getCurrentThemeColors();
	const description = <div>
		{localize({
			en: "Drag a skill icon to a slot to assign or move it. Right-click a slot to unassign it.",
		})}
	</div>;
	const tooltipAnchorRef = useRef<HTMLDivElement>(null);
	const body = <div>
		<div>
			{(props.hotbarOneOnBottom
				? [...Array(MAX_NUM_HOTBARS).keys()].reverse()
				: [...Array(MAX_NUM_HOTBARS).keys()]
			).map((i) => <div key={`hotbarManager-bar-${i + 1}`}>
				<h4>{localize({ en: "Hotbar " + (i + 1).toString() })}</h4>
				{[...Array(MAX_HOTBAR_SLOTS).keys()].map((j) => {
					const assigned = controller.hotbarLayout[i]?.[j];
					const hasBind = !(assigned === undefined || assigned === "NEVER");
					const boundSkill = hasBind ? assigned : undefined;
					const displayedSkill =
						boundSkill === undefined
							? undefined
							: getConditionalReplacement(boundSkill, props.state);
					const keybind = controller.keybindEnabled
						? controller.getKeybindForHotbarSlot(i + 1, j + 1)
						: undefined;
					const slotNode = <div
						className={hasBind ? undefined : "clickableLinkLike"}
						data-hotbar-slot=""
						data-bar={i + 1}
						data-slot={j + 1}
						style={{
							...iconStyle,
							touchAction: "none",
							...(!hasBind
								? {
										// If there's no skill bound, just draw the slot number.
										boxSizing: "border-box",
										border: `1px solid ${colors.bgHighContrast}`,
										display: "inline-flex",
										alignItems: "center",
										justifyContent: "center",
										color: colors.text,
									}
								: {}),
							...(bindTarget !== undefined &&
							i + 1 === bindTarget[0] &&
							j + 1 === bindTarget[1]
								? {
										// Draw a blue box if this is the target of a drag/drop
										outline: `4px solid ${colors.dropTarget}`,
										outlineOffset: "-4px",
									}
								: {}),
						}}
						onDragStart={(e) => e.preventDefault()}
						onContextMenu={(e) => {
							e.preventDefault();
							if (skillToBind.current !== undefined) endDrag(false);
						}}
						onPointerDown={(e) => {
							if (e.button === 2) {
								if (skillToBind.current !== undefined) {
									endDrag(false);
									return;
								}
								// unbind the skill on right click
								e.preventDefault();
								unbindSlot(i + 1, j + 1);
								return;
							}
							if (boundSkill === undefined) return;
							onSkillPointerDown(e, boundSkill, {
								kind: "slot",
								bar: i + 1,
								slot: j + 1,
							});
						}}
						onPointerMove={onSkillPointerMove}
						onPointerUp={onSkillPointerUp}
						onPointerCancel={onSkillPointerCancel}
					>
						{displayedSkill === undefined ? (
							j + 1
						) : (
							<SkillIconImage
								style={{ ...iconImgStyle, pointerEvents: "none" }}
								activeJob={props.activeJob}
								skillName={displayedSkill}
							/>
						)}
						{keybind !== undefined && <KeybindOverlay label={keybind} />}
					</div>;
					const key = `hotbarManager-bar-${i + 1}-slot-${j + 1}`;
					if (displayedSkill === undefined) {
						return <React.Fragment key={key}>{slotNode}</React.Fragment>;
					}
					return <Tooltip.Root disableHoverablePopup={true} key={key}>
						<Tooltip.Trigger delay={0} render={slotNode} />
						<Tooltip.Portal container={tooltipAnchorRef}>
							<Tooltip.Positioner
								sideOffset={3}
								side="top"
								className="tooltip-positioner hotbar-tooltip-positioner"
							>
								<Tooltip.Popup className="info-tooltip tooltip">
									<div className="paragraph">
										<b>{localizeSkillName(displayedSkill)}</b>
									</div>
								</Tooltip.Popup>
							</Tooltip.Positioner>
						</Tooltip.Portal>
					</Tooltip.Root>;
				})}
			</div>)}
		</div>
	</div>;
	const allSkills = <div style={{ marginBlock: 10 }}>
		<h3>{localize({ en: "All skills" })}</h3>
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(auto-fill, 48px)",
				justifyContent: "start",
				width: `min(100%, ${MAX_HOTBAR_SLOTS * 48}px)`,
			}}
		>
			{getAllAssignableSkillNames(props.state).map((actionKey, i) => <Tooltip.Root
				disableHoverablePopup={true}
				key={`hotbarManager-allSkills-${i}`}
			>
				<Tooltip.Trigger
					delay={0}
					render={
						<div
							className="clickableLinkLike"
							style={{ ...iconStyle, touchAction: "none" }}
							onDragStart={(e) => e.preventDefault()}
							onPointerDown={(e) =>
								onSkillPointerDown(e, actionKey, { kind: "palette" })
							}
							onPointerMove={onSkillPointerMove}
							onPointerUp={onSkillPointerUp}
							onPointerCancel={onSkillPointerCancel}
						>
							<SkillIconImage
								style={{ ...iconImgStyle, pointerEvents: "none" }}
								activeJob={props.activeJob}
								skillName={actionKey}
							/>
						</div>
					}
				/>
				<Tooltip.Portal container={tooltipAnchorRef}>
					<Tooltip.Positioner
						sideOffset={3}
						side="top"
						className="tooltip-positioner hotbar-tooltip-positioner"
					>
						<Tooltip.Popup className="info-tooltip tooltip">
							<div className="paragraph">
								<b>{localizeSkillName(actionKey)}</b>
							</div>
						</Tooltip.Popup>
					</Tooltip.Positioner>
				</Tooltip.Portal>
			</Tooltip.Root>)}
		</div>
	</div>;
	return <>
		<style>{`
			.info-tooltip {
				color: ${colors.text};
				background-color: ${colors.tipBackground};
				opacity: 0.98;
				max-width: 300px;
				outline: 1px solid ${colors.bgHighContrast};
				transition: none;
				font-size: 100%;
				z-index: 10;
			}
			/* Keep the popup from hiding the hotbar slot under the cursor during a drag. */
			.hotbar-tooltip-positioner {
				pointer-events: none;
			}
		`}</style>
		<Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
			<DialogTrigger
				titleNode={localize({ en: "edit hotbars" })}
				handle={"\u2022 "}
				containerStyle={{ marginBlock: 5 }}
			/>
			<Dialog.Portal>
				<Dialog.Backdrop
					className="Backdrop"
					style={{
						opacity: lightMode ? 0.2 : 0.7,
					}}
				/>
				<Dialog.Popup
					className="Popup invisibleScrollbar"
					style={{
						backgroundColor: colors.background,
						border: "1px solid " + colors.bgMediumContrast,
						color: colors.text,
						overflow: "hidden",
						maxHeight: "100%",
						// all skills should show in a single row at this width by default
						width: "54rem",
					}}
				>
					<Dialog.Title
						render={
							<h3>
								{localize({
									en: `Edit hotbars (${props.activeJob})`,
									zh: `设计热键栏（${JOBS[props.activeJob].zh}）`,
								})}
							</h3>
						}
					/>
					<DialogClose />
					<div id="hotbarSettingsAnchor" ref={tooltipAnchorRef}>
						<Dialog.Description className="Description" render={description} />
						<ScrollArea.Root className="Body" style={{ maxHeight: "70%" }}>
							<ScrollArea.Viewport className="BodyViewport">
								<ScrollArea.Content
									style={{ display: "flex", flexDirection: "column" }}
								>
									{body}
								</ScrollArea.Content>
							</ScrollArea.Viewport>
							<ScrollArea.Scrollbar
								style={{
									display: "flex",
									justifyContent: "center",
									backgroundColor: colors.bgLowContrast,
									width: 5,
								}}
							>
								<ScrollArea.Thumb
									style={{
										width: "100%",
										backgroundColor: colors.bgHighContrast,
									}}
								/>
							</ScrollArea.Scrollbar>
						</ScrollArea.Root>
						{allSkills}
						<div style={{ marginBlock: 10 }}>
							<button onClick={clearHotbars}>
								{localize({ en: "clear all hotbars", zh: "清空所有热键栏" })}
							</button>
							<span> </span>
							<button onClick={resetHotbars}>
								{localize({ en: "reset to default", zh: "恢复默认" })}
							</button>
						</div>
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
		{dragGhost !== undefined &&
			createPortal(
				<div
					ref={ghostRef}
					style={{
						position: "fixed",
						left: 0,
						top: 0,
						width: iconStyle.width,
						height: iconStyle.height,
						pointerEvents: "none",
						zIndex: 1000,
						opacity: 0.85,
						// pointerdown writes these refs before this render, so the first paint is already
						// at the cursor. Later moves update the node directly.
						transform: `translate(${pointerPos.current.x - ghostOffset.current.x}px, ${pointerPos.current.y - ghostOffset.current.y}px)`,
					}}
				>
					<SkillIconImage
						style={{ ...iconImgStyle, pointerEvents: "none" }}
						activeJob={props.activeJob}
						skillName={
							dragOrigin.current?.kind === "slot"
								? getConditionalReplacement(dragGhost, props.state)
								: dragGhost
						}
					/>
				</div>,
				document.body,
			)}
	</>;
}
