import React, { useState, useEffect, useRef, useContext } from "react";
import { Dialog } from "@base-ui-components/react/dialog";
import { FaXmark } from "react-icons/fa6";
import changelog from "../changelog.json";
import { getCurrentThemeColors, ColorThemeContext } from "./ColorTheme";
import { Clickable, ContentNode } from "./Common";
import { localize } from "./Localization";
import { getCachedValue, setCachedValue, isFirstVisit } from "../Controller/Common";

export function getLastChangeDate(): string {
	return changelog[0].date;
}

// changelog.json contains a non-empty array of entries with the following schema:
// - date: the date a change was made
// - changes: a string array describing the changes
// - [optional] changes_zh: chinese localized version of `changes`
// - [optional] level: "major" | "minor", determines if the changelog button should be highlighted
// the array of entries is assumed to have unique dates, and be sorted in descending order by date
type ChangelogEntry = {
	date: string;
	changes: string[];
	changes_zh?: string[];
	level?: string;
};

type ChangelogBodyParams = {
	newChanges: boolean;
	hiddenStartIndex: number;
};

function getRenderedEntry(entry: ChangelogEntry) {
	const colors = getCurrentThemeColors();
	return <div className="changelogGroup">
		<div>{entry.date}</div>
		<div>
			{localize({
				en: <>
					{entry.changes.map((change, i) => <div
						className="changelogLine"
						key={i}
						style={{
							color: change.substring(1, 5) === "BETA" ? colors.warning : colors.text,
						}}
					>
						{change}
					</div>)}
				</>,
				zh:
					entry.changes_zh !== undefined ? (
						<>
							{entry.changes_zh.map((change, i) => <div
								className="changelogLine"
								key={i}
								style={{
									color:
										change.substring(1, 5) === "BETA"
											? colors.warning
											: colors.text,
								}}
							>
								{change}
							</div>)}
						</>
					) : undefined,
			})}
		</div>
	</div>;
}

// Partially copied from BaseUI's Dialog example
// https://base-ui.com/react/components/dialog
const changelogDialogStyles = `
.Backdrop {
  position: fixed;
  inset: 0;
  background-color: black;
  transition: opacity 50ms cubic-bezier(0.45, 1.005, 0, 1.005);

  &[data-starting-style],
  &[data-ending-style] {
	opacity: 0;
  }
}

.Popup {
  box-sizing: border-box;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 50vw;
  height: 70vh;
  max-height: 70vh;
  overflow-y: scroll;
  margin-top: -2rem;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
  transition: all 50ms cubic-bezier(0.45, 1.005, 0, 1.005);

  font-family: monospace;
  font-size: 13px;

  &[data-starting-style],
  &[data-ending-style] {
	opacity: 0;
	transform: translate(-50%, -50%) scale(0.9);
  }
}

.changelogGroup {
	margin-top: 1em;
	margin-bottom: 1em;
}

.changelogLine {
	margin-top: 0.5em;
	margin-bottom: 0.5em;
	margin-left: 0.5em;
}
`;

export function Changelog() {
	let titleNode: ContentNode;
	let dialogHandle: ContentNode;
	let handleStyle: React.CSSProperties = {};
	const hiddenStartIndex = useRef(5);
	const [upToDate, setUpToDate] = useState(false);
	const [majorChange, setMajorChange] = useState(false);

	const lightMode = useContext(ColorThemeContext) === "Light";
	const colors = getCurrentThemeColors();

	// Check whether CL is up to date on page load
	useEffect(() => {
		let lastReadDate = getCachedValue("changelogLastRead");
		let lastReadChangeCountStr = getCachedValue("changelogLastReadChangeCount");
		// For users that had visited the site prior to deployment of the internal refactor,
		// use the most recent changelog entry (5/10/25) as the last read.
		// If someone last visited the site at an earlier date... there's not really
		// anything we can do about that.
		if (!isFirstVisit && (lastReadDate === null || lastReadChangeCountStr === null)) {
			lastReadDate = "5/10/25";
			lastReadChangeCountStr = "1";
		}
		const initiallyUpToDate =
			lastReadDate === null ||
			lastReadChangeCountStr === null ||
			(lastReadDate === changelog[0].date &&
				lastReadChangeCountStr === changelog[0].changes.length.toString());
		setUpToDate(initiallyUpToDate);
		if (lastReadDate !== null && lastReadChangeCountStr !== null) {
			// lastReadDate was set, so the user should see the newest changes.
			if (!initiallyUpToDate) {
				let i = 0;
				// We might need to cap the list of "new" entries at some number in the future,
				// but for now just assume that it's enough for the user to comfortably scroll.
				let hasMajorChange = false;
				for (; i < changelog.length - 1; i++) {
					// Assume that changelog is sorted, and lastReadDate is somewhere in the list.
					if (lastReadDate === changelog[i].date) {
						// If the change count of this entry does not match the saved value, then include
						// this entry to be displayed.
						if (lastReadChangeCountStr !== changelog[i].changes.length.toString()) {
							i++;
						}
						break;
					}
					hasMajorChange = hasMajorChange || changelog[i].level === "major";
				}
				setMajorChange(hasMajorChange);
				hiddenStartIndex.current = i;
			}
		} else {
			setCachedValue("changelogLastRead", changelog[0].date);
			setCachedValue("changelogLastReadChangeCount", changelog[0].changes.length.toString());
		}
	}, []);

	// When the dialog is closed, mark all entries as read.
	const onOpenChange = (open: boolean) => {
		if (!open) {
			hiddenStartIndex.current = 5;
			if (!upToDate) {
				setCachedValue("changelogLastRead", changelog[0].date);
				setCachedValue(
					"changelogLastReadChangeCount",
					changelog[0].changes.length.toString(),
				);
			}
			setUpToDate(true);
		}
	};

	if (upToDate) {
		// If this is the user's first visit, or they have already seen all relevant entries, don't do anything special.
		titleNode = localize({ en: "Changelog", zh: "更新日志", ja: "更新履歴" });
		dialogHandle = "•"; // U+2022 "bullet"
	} else {
		// If something has changed, then stylize the changelog label.
		const colors = getCurrentThemeColors();
		titleNode = localize({
			en: "Changelog (new updates" + (majorChange ? "!!" : "") + ")",
			zh: "更新日志（有变" + (majorChange ? "！！" : "") + "）",
		});
		dialogHandle = "!";
		if (majorChange) {
			handleStyle = {
				color: colors.warning,
				fontWeight: "bold",
			};
		} else {
			handleStyle = {
				fontWeight: "bold",
			};
		}
	}
	// Don't use a bespoke Clickable component for the expand button, since it suppresses Dialog.Trigger's
	// built-in dismiss behavior.
	const dialogTrigger = <div className="clickable">
		<span style={handleStyle}>
			<span>{dialogHandle} </span>
			<span className="clickableLinkLike">{titleNode}</span>
		</span>
	</div>;

	const exitTrigger = <FaXmark
		className="dialogExit"
		style={{
			color: colors.bgHighContrast,
		}}
	/>;

	return <>
		<style>{changelogDialogStyles}</style>
		<Dialog.Root onOpenChange={onOpenChange}>
			<Dialog.Trigger render={dialogTrigger} nativeButton={false} />
			<Dialog.Portal>
				<Dialog.Backdrop
					className="Backdrop"
					style={{
						opacity: lightMode ? 0.2 : 0.7,
					}}
				/>
				<Dialog.Popup
					className="Popup visibleScrollbar"
					id="changelogPopup"
					style={{
						backgroundColor: colors.background,
						border: "1px solid " + colors.bgMediumContrast,
						color: colors.text,
					}}
				>
					<Dialog.Title render={<h3>{titleNode}</h3>} />
					<Dialog.Close render={exitTrigger} nativeButton={false} />
					<Dialog.Description
						className="Description"
						render={
							<ChangelogBody
								hiddenStartIndex={hiddenStartIndex.current}
								newChanges={!upToDate}
							/>
						}
					/>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	</>;
}

/**
 * XIV in the Shell tracks the date of the user's last seen changelog entry, as well as the number of
 * changes that were listed in that entry when the user opened it.
 *
 * If the user loads the page and the first changelog entry is newer or has a different number of entries,
 * then the changelog label will be stylized, and older entries are collapsed.
 *
 * If the user opens the changelog and there are no new entries, the most recent 5 dates are displayed,
 * with older entries placed in an expandable below.
 */
function ChangelogBody(props: ChangelogBodyParams) {
	const shownEntries = [];
	const hiddenEntries = [];
	for (let i = 0; i < props.hiddenStartIndex; i++) {
		shownEntries.push(getRenderedEntry(changelog[i]));
	}
	for (let i = props.hiddenStartIndex; i < changelog.length; i++) {
		hiddenEntries.push(getRenderedEntry(changelog[i]));
	}
	const shownTitle = localize({
		en: props.newChanges ? "New Changes" : "Recent Changes",
		zh: props.newChanges ? "新的更新" : "最近的更新",
	});
	const shownChanges = <div style={{ marginTop: 10, marginBottom: 10 }}>
		<span style={{ marginTop: 10, marginBottom: 10 }}>
			<b>{shownTitle}</b>
		</span>
		<div style={{ margin: 10, paddingLeft: 6 }}>
			{shownEntries.map((entry, i) => <div key={i}>{entry}</div>)}
		</div>
	</div>;
	// Use a custom Expandable that's always closed to start, and ignores localStorage.
	// This ensures the changelog dialog is always scrolled to the top, as I couldn't find any
	// elegant ways to save the scroll state of the pane without slight layout shifts.
	const [show, setShow] = useState(false);
	const titleNode = localize({ en: "Older Changes", zh: "之前的更新" });
	const hiddenChanges = <div style={{ marginTop: 10, marginBottom: 10 }}>
		<Clickable
			content={
				<span>
					<span>{show ? "- " : "+ "}</span>
					<b>{titleNode}</b>
				</span>
			}
			onClickFn={() => setShow(!show)}
		/>
		<div style={{ position: "relative", display: show ? "block" : "none" }}>
			<div style={{ margin: 10, paddingLeft: 6, marginBottom: 20 }}>
				<div>{hiddenEntries.map((entry, i) => <div key={i}>{entry}</div>)}</div>
				<div>
					For older changelog entries before the BLM/PCT in the Shell rejoining, see&nbsp;
					<b>About this site/Changelog</b> on the old sites:&nbsp;
					<a
						target={"_blank"}
						rel={"noreferrer"}
						href={"https://miyehn.me/ffxiv-blm-rotation/"}
					>
						BLM in the Shell
					</a>
					,&nbsp;
					<a target={"_blank"} rel={"noreferrer"} href={"https://picto.zqsz.me/"}>
						PCT in the Shell
					</a>
				</div>
			</div>
		</div>
	</div>;
	return <div>
		{shownChanges}
		{hiddenChanges}
	</div>;
}
