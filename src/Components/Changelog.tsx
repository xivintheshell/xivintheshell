import React, { useState, useEffect, useRef } from "react";
import { Dialog } from "@base-ui-components/react/dialog";
import changelog from "../changelog.json";
import { Clickable, Expandable, Help, ButtonIndicator, ContentNode } from "./Common";
import { localize, LocalizedContent } from "./Localization";
import { getCachedValue, setCachedValue } from "../Controller/Common";

export function getLastChangeDate(): string {
	return changelog[0].date;
}

// changelog.json contains a non-empty array of entries with the following schema:
// - date: the date a change was made
// - changes: a string array describing the changes
// - [optional] changes_zh: chinese localized version of `changes`
// the array of entries is assumed to have unique dates, and be sorted in descending order by date
type ChangelogEntry = {
	date: string;
	changes: string[];
	changes_zh?: string[];
};

type OldChangelogParams = {
	entryStartIndex: number;
};

function getRenderedEntry(entry: ChangelogEntry) {
	return <div>
		{entry.date}
		<ul>
			{localize({
				en: <>{entry.changes.map((change, i) => <li key={i}>{change}</li>)}</>,
				zh:
					entry.changes_zh !== undefined ? (
						<>{entry.changes_zh.map((change, i) => <li key={i}>{change}</li>)}</>
					) : undefined,
			})}
		</ul>
	</div>;
}

// TODO swap for dark theme
const changelogDialogStyles = `
.Backdrop {
  position: fixed;
  inset: 0;
  background-color: black;
  opacity: 0.2;
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
  height: 60vw;
  max-height: 60vw;
  overflow: auto;
  margin-top: -2rem;
  padding: 1.5rem;
  border-radius: 0.5rem;
  background-color: white;
  transition: all 50ms cubic-bezier(0.45, 1.005, 0, 1.005);

  font-family: monospace;
  font-size: 13px;

  &[data-starting-style],
  &[data-ending-style] {
	opacity: 0;
	transform: translate(-50%, -50%) scale(0.9);
  }
}

.Title {
  margin-top: -0.375rem;
  margin-bottom: 0.25rem;
  font-family: monospace;
  font-size: 1.125rem;
  line-height: 1.75rem;
  letter-spacing: -0.0025em;
  font-weight: 500;
}
`;

export function Changelog() {
	let entryStartIndex: number = 0;
	let titleNode: ContentNode;
	let dialogHandle: ContentNode;
	const [upToDate, setUpToDate] = useState(false);
	// Check whether CL is up to date on page load
	useEffect(() => {
		const lastReadDate = getCachedValue("changelogLastRead");
		const lastReadChangeCountStr = getCachedValue("changelogLastReadChangeCount");
		setUpToDate(
			lastReadDate === undefined ||
				!lastReadChangeCountStr ||
				(lastReadDate === changelog[0].date &&
					parseInt(lastReadChangeCountStr) === changelog[0].changes.length),
		);
	}, []);

	if (upToDate) {
		// If this is the user's first visit, or they have already seen all relevant entries, don't do anything special.
		titleNode = localize({ en: "Changelog", zh: "更新日志", ja: "更新履歴" });
		dialogHandle = "•"; // U+2022 "bullet"
	} else {
		// If something has changed, then stylize the changelog label.
		titleNode = localize({
			en: "Changelog (new updates!!)",
			zh: "更新日志（有变！！）",
		});
		dialogHandle = "!";
	}
	// Don't use a bespoke Clickable component for the expand button, since it suppresses Dialog.Trigger's
	// built-in dismiss behavior.
	const dialogTrigger = <div className="clickable">
		<span>
			<span>{dialogHandle} </span>
			{titleNode}
		</span>
	</div>;
	return <>
		<style>{changelogDialogStyles}</style>
		<Dialog.Root>
			<Dialog.Trigger render={dialogTrigger} />
			<Dialog.Portal>
				<Dialog.Backdrop className="Backdrop" />
				<Dialog.Popup className="Popup visibleScrollbar" id="changelogPopup">
					<Dialog.Title className="Title">{titleNode}</Dialog.Title>
					<Dialog.Description
						className="Description"
						render={<OldChangelog entryStartIndex={entryStartIndex} />}
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
function OldChangelog(props: OldChangelogParams) {
	const entriesToShow = [];
	for (let i = props.entryStartIndex; i < changelog.length; i++) {
		entriesToShow.push(getRenderedEntry(changelog[i]));
	}
	// Use a custom Expandable that's always closed to start, and ignores localStorage.
	// This ensures the changelog dialog is always scrolled to the top, as I couldn't find any
	// elegant ways to save the scroll state of the pane without slight layout shifts.
	const [show, setShow] = useState(false);
	const titleNode = localize({ en: "Older Changes", zh: "之前的更新" });
	return <div style={{ marginTop: 10, marginBottom: 10 }}>
		<Clickable
			content={
				<span>
					<span>{show ? "- " : "+ "}</span>
					{titleNode}
				</span>
			}
			onClickFn={() => setShow(!show)}
		/>
		<div style={{ position: "relative", display: show ? "block" : "none" }}>
			<div style={{ margin: 10, paddingLeft: 6, marginBottom: 20 }}>
				<div>{entriesToShow.map((entry, i) => <div key={i}>{entry}</div>)}</div>
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
}
