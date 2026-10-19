import React, { useState, useContext, useRef } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Tooltip } from "@base-ui/react/tooltip";
import { ScrollArea } from "@base-ui/react/scroll-area";
import { localize, localizeSkillName } from "./Localization";
import { DialogTrigger, DialogClose, dialogOnOpenChangeHandler } from "./Common";
import { ColorThemeContext, getCurrentThemeColors } from "./ColorTheme";
import { SkillIconImage, iconStyle, iconImgStyle } from "./Skills";
import { MAX_NUM_HOTBARS, MAX_HOTBAR_SLOTS } from "../Controller/KeybindManager";
import { ShellJob } from "../Game/Data/Jobs";
import { GameState } from "../Game/GameState";
import { ActionKey } from "../Game/Data";

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
	// identifies which slot the user is hovering over
	const [bindTarget, setBindTarget] = useState<[number, number] | undefined>(undefined);
	const [skillToBind, setSkillToBind] = useState<ActionKey | undefined>(undefined);
	const setDialogOpen = (open: boolean) => {
		_setDialogOpen(open);
		dialogOnOpenChangeHandler(open);
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
				{[...Array(MAX_HOTBAR_SLOTS).keys()].map((j) => <Tooltip.Root
					disableHoverablePopup={true}
					key={`hotbarManager-bar-${i + 1}-slot-${j + 1}`}
				>
					<Tooltip.Trigger
						delay={0}
						render={
							<div
								className="clickableLinkLike"
								style={{
									...iconStyle,
									...(bindTarget !== undefined &&
									i + 1 === bindTarget[0] &&
									j + 1 === bindTarget[1]
										? {
												outline: `4px solid ${colors.dropTarget}`,
												outlineOffset: "-4px",
											}
										: {}),
								}}
								onPointerDown={
									// TODO replace NEVER with backing serialization
									() => setSkillToBind("NEVER")
								}
								onPointerEnter={() => setBindTarget([i + 1, j + 1])}
								onPointerLeave={() => setBindTarget(undefined)}
								onPointerCancel={() => setBindTarget(undefined)}
							>
								<SkillIconImage
									style={iconImgStyle}
									activeJob={props.activeJob}
									skillName={"NEVER"}
								/>
							</div>
						}
					/>
					<Tooltip.Portal container={tooltipAnchorRef}>
						<Tooltip.Positioner
							sideOffset={3}
							side="top"
							className="tooltip-positioner"
						>
							<Tooltip.Popup className="info-tooltip tooltip">
								<div className="paragraph">
									<b>{localizeSkillName("NEVER")}</b>
								</div>
							</Tooltip.Popup>
						</Tooltip.Positioner>
					</Tooltip.Portal>
				</Tooltip.Root>)}
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
								style={iconStyle}
								onPointerDown={() => setSkillToBind(actionKey)}
							>
								<SkillIconImage
									style={iconImgStyle}
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
							className="tooltip-positioner"
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
	</>;
}
