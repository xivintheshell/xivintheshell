import React, { useState, useContext } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { MAX_NUM_HOTBARS, MAX_HOTBAR_SLOTS } from "../Controller/KeybindManager";
import { localize } from "./Localization";
import { DialogTrigger, DialogClose } from "./Common";
import { ColorThemeContext, getCurrentThemeColors } from "./ColorTheme";

// responsible for mapping user inputs -> hotbar slots (and potentially other shortcuts in the future)
export function KeybindManager() {
	// TODO
}

// responsible for mapping hotbar slots -> job actions
export function HotbarManager() {
	const [dialogOpen, setDialogOpen] = useState(false);
	const lightMode = useContext(ColorThemeContext) === "Light";
	const colors = getCurrentThemeColors();
	const body = <div>
		placeholder for current job
		{[...Array(MAX_NUM_HOTBARS).keys()].map((i) => <div key={`hotbarManager-bar-${i}`}>
			<h3>{localize({ en: "Hotbar " + i.toString() })}</h3>
			{[...Array(MAX_HOTBAR_SLOTS).keys()].map((j) => <div
				key={`hotbarManager-bar-${i}-slot-${j}`}
			>
				[{i}, {j}]
			</div>)}
		</div>)}
	</div>;
	return <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
		<DialogTrigger titleNode={localize({ en: "edit hotbar actions (click to open dialog)" })} />
		<Dialog.Portal>
			<Dialog.Backdrop
				className="Backdrop"
				style={{
					opacity: lightMode ? 0.2 : 0.7,
				}}
			/>
			<Dialog.Popup
				className="Popup visibleScrollbar"
				id="dialogPopup"
				style={{
					backgroundColor: colors.background,
					border: "1px solid " + colors.bgMediumContrast,
					color: colors.text,
				}}
			>
				<Dialog.Title render={<h3>{localize({ en: "Edit hotbar actions" })}</h3>} />
				<DialogClose />
				<Dialog.Description className="Description" render={body} />
			</Dialog.Popup>
		</Dialog.Portal>
	</Dialog.Root>;
}
