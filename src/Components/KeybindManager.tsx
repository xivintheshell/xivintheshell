import React, { useState, useContext, useRef } from "react";
import { createPortal } from "react-dom";
import { Dialog } from "@base-ui/react/dialog";
import { Tooltip } from "@base-ui/react/tooltip";
import { ScrollArea } from "@base-ui/react/scroll-area";
import { localize, localizeSkillName } from "./Localization";
import { DialogTrigger, DialogClose, dialogOnOpenChangeHandler } from "./Common";
import { ColorThemeContext, getCurrentThemeColors } from "./ColorTheme";
import { SkillIconImage, iconStyle, iconImgStyle } from "./Skills";
import { MAX_NUM_HOTBARS, MAX_HOTBAR_SLOTS, hotbarSlotId } from "../Controller/KeybindManager";
import { ShellJob } from "../Game/Data/Jobs";
import { GameState } from "../Game/GameState";
import { ActionKey } from "../Game/Data";

// discriminated union for drags from full skill list vs. drag from another slot
type HotbarDragOrigin = { kind: "palette" } | { kind: "slot"; bar: number; slot: number };

// responsible for mapping user inputs -> hotbar slots (and potentially other shortcuts in the future)
export function KeybindManager() {
	const [dialogOpen, _setDialogOpen] = useState(false);
	const setDialogOpen = (open: boolean) => {
		_setDialogOpen(open);
		dialogOnOpenChangeHandler(open);
	};
	const lightMode = useContext(ColorThemeContext) === "Light";
	const colors = getCurrentThemeColors();
	const description = <div>{localize({ en: "work in progress" })}</div>;
	const body = <div>{localize({ en: "work in progress" })}</div>;
	return <>
		<Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
			<DialogTrigger titleNode={localize({ en: "edit keybinds" })} handle={"\u2022 "} />
			<Dialog.Portal>
				<Dialog.Backdrop
					className="Backdrop"
					style={{
						opacity: lightMode ? 0.2 : 0.7,
					}}
				/>
				<Dialog.Popup
					className="Popup invisibleScrollbar"
					id="dialogPopup"
					style={{
						backgroundColor: colors.background,
						border: "1px solid " + colors.bgMediumContrast,
						color: colors.text,
						overflow: "hidden",
						maxHeight: "100%",
						// width is chosen so all skills fit in one row by default, but at higher
						// zoom levels or different resolutions then it may wrap
						width: "60vw",
					}}
				>
					<Dialog.Title render={<h3>{localize({ en: "Edit keybinds" })}</h3>} />
					<DialogClose />
					<Dialog.Description className="Description" render={description} />
					<ScrollArea.Root className="Body" style={{ maxHeight: "100%" }}>
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
	const [dialogOpen, _setDialogOpen] = useState(true);
	// Hotbar slot under the pointer. Set only while a skill icon is being dragged.
	const [bindTarget, setBindTarget] = useState<[number, number] | undefined>(undefined);
	// Test stand-in for persisted hotbar bindings, keyed with hotbarSlotId.
	const [boundActions, setBoundActions] = useState<Map<string, ActionKey>>(() => new Map());
	// dragGhost is needed to render the skill icon being dragged, as we suppress the native
	// browser image drag event.
	const [dragGhost, setDragGhost] = useState<ActionKey | undefined>(undefined);
	const skillToBind = useRef<ActionKey | undefined>(undefined);
	const dragOrigin = useRef<HotbarDragOrigin | undefined>(undefined);
	const bindTargetRef = useRef<[number, number] | undefined>(undefined);
	const ghostRef = useRef<HTMLDivElement>(null);
	const ghostOffset = useRef({ x: 0, y: 0 });
	const pointerPos = useRef({ x: 0, y: 0 });
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
	const endDrag = (commit: boolean) => {
		const skill = skillToBind.current;
		const target = bindTargetRef.current;
		const origin = dragOrigin.current;
		if (commit && skill !== undefined && target !== undefined && origin !== undefined) {
			const targetKey = hotbarSlotId(target[0], target[1]);
			const sourceKey =
				origin.kind === "slot" ? hotbarSlotId(origin.bar, origin.slot) : undefined;
			setBoundActions((prev) => {
				if (sourceKey === targetKey) return prev;
				const next = new Map(prev);
				const displaced = next.get(targetKey);
				next.set(targetKey, skill);
				if (sourceKey !== undefined) {
					if (displaced === undefined) next.delete(sourceKey);
					else next.set(sourceKey, displaced);
				}
				return next;
			});
		}
		skillToBind.current = undefined;
		dragOrigin.current = undefined;
		setDragGhost(undefined);
		setDragTarget(undefined);
	};
	const onSkillPointerDown = (
		e: React.PointerEvent<HTMLDivElement>,
		skillName: ActionKey,
		origin: HotbarDragOrigin,
	) => {
		if (e.button !== 0) return;
		// Suppress native browser image drag, which fires pointerCancel
		e.preventDefault();
		const rect = e.currentTarget.getBoundingClientRect();
		ghostOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
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
		const key = hotbarSlotId(bar, slot);
		setBoundActions((prev) => {
			if (!prev.has(key)) return prev;
			const next = new Map(prev);
			next.delete(key);
			return next;
		});
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
					const boundSkill = boundActions.get(hotbarSlotId(i + 1, j + 1));
					return <Tooltip.Root
						disableHoverablePopup={true}
						key={`hotbarManager-bar-${i + 1}-slot-${j + 1}`}
					>
						<Tooltip.Trigger
							delay={0}
							render={
								<div
									className="clickableLinkLike"
									data-hotbar-slot=""
									data-bar={i + 1}
									data-slot={j + 1}
									style={{
										...iconStyle,
										touchAction: "none",
										...(bindTarget !== undefined &&
										i + 1 === bindTarget[0] &&
										j + 1 === bindTarget[1]
											? {
													outline: `4px solid ${colors.dropTarget}`,
													outlineOffset: "-4px",
												}
											: {}),
									}}
									onDragStart={(e) => e.preventDefault()}
									onContextMenu={(e) => e.preventDefault()}
									onPointerDown={(e) => {
										if (e.button === 2) {
											e.preventDefault();
											if (skillToBind.current !== undefined) return;
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
									<SkillIconImage
										style={{ ...iconImgStyle, pointerEvents: "none" }}
										activeJob={props.activeJob}
										skillName={boundSkill ?? "NEVER"}
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
										<b>{localizeSkillName(boundSkill ?? "NEVER")}</b>
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
			{props.state.displayedSkills
				.getCurrentSkillNames(props.state)
				.map((actionKey, i) => <Tooltip.Root
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
			<DialogTrigger titleNode={localize({ en: "edit hotbars" })} handle={"\u2022 "} />
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
						// width is chosen so all skills fit in one row by default, but at higher
						// zoom levels or different resolutions then it may wrap
						width: "60vw",
					}}
				>
					<Dialog.Title render={<h3>{localize({ en: "Edit hotbars" })}</h3>} />
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
						skillName={dragGhost}
					/>
				</div>,
				document.body,
			)}
	</>;
}
