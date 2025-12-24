// A set of checkboxes used in the skill window + timeline editor to choose the targets of an ability.

import React from "react";
import { localize } from "./Localization";

enum TargetState {
	NONE = 0,
	TARGETED,
	PRIMARY,
}

function TargetCheckbox(props: {
	i: number;
	state: TargetState;
	onChange: (oldState: TargetState, newState: TargetState) => void;
}) {
	return <div style={{ marginBottom: 5 }}>
		<input
			className={
				"shellCheckbox" + (props.state === TargetState.PRIMARY ? " checkbox-star" : "")
			}
			type="checkbox"
			onChange={() => {}}
			onClick={() => {
				if (props.state === TargetState.NONE) {
					props.onChange(props.state, TargetState.TARGETED);
				}
				if (props.state === TargetState.PRIMARY) {
					props.onChange(props.state, TargetState.NONE);
				}
				if (props.state === TargetState.TARGETED) {
					props.onChange(props.state, TargetState.PRIMARY);
				}
			}}
			checked={props.state === TargetState.TARGETED}
		/>
		<span>{props.i === 0 ? localize({ en: "Boss 1", zh: "Boss 1" }) : props.i + 1}</span>
	</div>;
}

export function TargetSelector(props: {
	style: React.CSSProperties;
	// both these are 0-indexed
	selected: boolean[];
	primary: number;
	onSelectedChange: (arr: boolean[]) => void;
	onPrimaryChange: (n: number) => void;
}) {
	return <div
		style={{
			display: "grid",
			grid: "auto-flow / repeat(8, 1fr)",
			...props.style,
		}}
	>
		{props.selected.map((flag, i) => <TargetCheckbox
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
				const selected = props.selected.slice();
				// If this target would be deslected but is the only one remaining, then
				// do not perform the de-selection.
				if (newState === TargetState.NONE) {
					selected[i] = false;
					if (selected.filter((flag) => flag).length === 0) {
						return;
					}
				} else if (newState === TargetState.TARGETED) {
					selected[i] = true;
				} else if (newState === TargetState.PRIMARY) {
					props.onPrimaryChange(i);
				}
				if (oldState === TargetState.PRIMARY) {
					// If this target is no longer PRIMARY, force a different primary target.
					// If this is the only remaining target, then do not perform the change.
					for (let j = 0; j < selected.length; j++) {
						if (j != i && selected[j]) {
							props.onPrimaryChange(j);
							break;
						}
					}
				}
				props.onSelectedChange(selected);
			}}
		/>)}
	</div>;
}
