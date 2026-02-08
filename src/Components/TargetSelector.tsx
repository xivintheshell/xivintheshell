// A set of checkboxes used in the skill window + timeline editor to choose the targets of an ability.

import React from "react";
import { localize } from "./Localization";

enum TargetState {
	NONE = 0,
	TARGETED,
	PRIMARY,
}

// Radio selects must be in the PRIMARY or NONE state, as only one option can be chosen at a time.
// Unlike our standard in-house radio component, this does not cache its state to localStorage.
// This component has not yet been tested: it will be used later when target editing is added
// to the timeline editor tab.
function TargetRadio(props: {
	i: number;
	state: TargetState;
	onChange: (oldState: TargetState, newState: TargetState) => void;
}) {
	return <div
		style={{ marginBottom: 5, cursor: "pointer" }}
		onClick={() => {
			if (props.state === TargetState.NONE) {
				props.onChange(props.state, TargetState.PRIMARY);
			}
			// Since there's only one possible target, clicking on a node in PRIMARY state
			// already is a no-op.
			if (props.state === TargetState.TARGETED) {
				console.error(
					"Target select radio must be in PRIMARY or NONE state, but was in TARGETED. Defaulting to PRIMARY.",
				);
				props.onChange(props.state, TargetState.PRIMARY);
			}
		}}
	>
		<input
			className={
				"shellCheckbox" + (props.state === TargetState.PRIMARY ? " checkbox-star" : "")
			}
			style={{ cursor: "pointer" }}
			type="radio"
			onChange={() => {}}
			checked={false}
		/>
		<span>{props.i === 0 ? localize({ en: "Boss 1", zh: "Boss 1" }) : props.i + 1}</span>
	</div>;
}

function TargetCheckbox(props: {
	i: number;
	state: TargetState;
	onChange: (oldState: TargetState, newState: TargetState) => void;
}) {
	return <div
		style={{ marginBottom: 5, cursor: "pointer" }}
		onClick={() => {
			if (props.state === TargetState.NONE) {
				props.onChange(props.state, TargetState.PRIMARY);
			}
			if (props.state === TargetState.PRIMARY) {
				props.onChange(props.state, TargetState.TARGETED);
			}
			if (props.state === TargetState.TARGETED) {
				props.onChange(props.state, TargetState.NONE);
			}
		}}
	>
		<input
			className={
				"shellCheckbox" + (props.state === TargetState.PRIMARY ? " checkbox-star" : "")
			}
			style={{ cursor: "pointer" }}
			type="checkbox"
			onChange={() => {}}
			checked={props.state === TargetState.TARGETED}
		/>
		<span>{props.i === 0 ? localize({ en: "Boss 1", zh: "Boss 1" }) : props.i + 1}</span>
	</div>;
}

export function TargetSelector(props: {
	style: React.CSSProperties;
	primaryOnly: boolean;
	// both these are 0-indexed
	selected: boolean[];
	primary: number;
	onSelectedChange?: (arr: boolean[]) => void;
	onPrimaryChange?: (n: number) => void;
	onAnySelectionChange?: (newPrimary: number, newSelected: boolean[]) => void;
}) {
	// Use a radio style selector for abilities that can hit only a single target.
	// Use checkboxes for abilities that can hit multiple targets.
	const Selector = props.primaryOnly ? TargetRadio : TargetCheckbox;
	const body = props.selected.map((flag, i) => <Selector
		key={i}
		i={i}
		state={
			props.primary === i
				? TargetState.PRIMARY
				: flag
					? TargetState.TARGETED
					: TargetState.NONE
		}
		onChange={(oldState: TargetState, newState: TargetState) => {
			let selected = props.selected.slice();
			let primary = props.primary;
			// If this target would be deselected but is the only one remaining, then
			// do not perform the de-selection.
			if (newState === TargetState.NONE) {
				selected[i] = false;
				if (selected.filter((flag) => flag).length === 0) {
					return;
				}
			} else if (newState === TargetState.TARGETED) {
				selected[i] = true;
			} else if (newState === TargetState.PRIMARY && oldState !== TargetState.PRIMARY) {
				// If this selector supports only a single target, then all other indices must be
				// de-selected.
				if (props.primaryOnly) {
					selected = Array(selected.length).fill(false);
				}
				selected[i] = true;
				props.onPrimaryChange?.(i);
				primary = i;
			}
			if (oldState === TargetState.PRIMARY && newState !== TargetState.PRIMARY) {
				// If this target is no longer PRIMARY, force a different primary target.
				// If this is the only remaining target, then do not perform the change.
				for (let j = 0; j < selected.length; j++) {
					if (j != i && selected[j]) {
						props.onPrimaryChange?.(j);
						primary = j;
						break;
					}
				}
			}
			props.onSelectedChange?.(selected);
			props.onAnySelectionChange?.(primary, selected);
		}}
	/>);
	return <div
		style={{
			display: "grid",
			grid: "auto-flow / repeat(8, 1fr)",
			...props.style,
		}}
	>
		{body}
	</div>;
}
