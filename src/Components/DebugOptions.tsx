import React from 'react';
import {Debug} from "../Game/Common";
import {TickMode} from "../Controller/Common";

type DebugSettings = {
	noEnochian: boolean;
};
export class DebugOptions extends React.Component {
	state: {
		noEnochian: boolean
	};
	saveSettings: (settings: DebugSettings) => void;
	loadSettings: () => DebugSettings | undefined;
	apply: (settings: DebugSettings) => void;
	constructor(props: {}) {
		super(props);
		this.saveSettings = (settings: DebugSettings)=>{
			let str: string = JSON.stringify(settings);
			localStorage.setItem("debugOptions", str);
		}
		this.loadSettings = ()=>{
			let str = localStorage.getItem("debugOptions");
			if (str) {
				let content = JSON.parse(str);
				let settings: DebugSettings = {
					noEnochian: content.noEnochian
				};
				return settings;
			}
			return undefined;
		}
		this.apply = (settings: DebugSettings) => {
			Debug.noEnochian = settings.noEnochian
		};

		let settings = this.loadSettings();
		if (settings) {
			this.state = {
				noEnochian: settings.noEnochian
			};
		} else {
			this.state = {
				noEnochian: false
			};
		}
	}
	componentDidMount() {
		this.apply({noEnochian: this.state.noEnochian});
	}

	render() {
		return <div>
			<div style={{marginBottom: 5}}>
				<input type="checkbox" style={{position: "relative", top: 3}} checked={this.state.noEnochian} onChange={(e)=>{
					if (e && e.target) {
						this.setState({noEnochian: e.target.checked});
						this.saveSettings({noEnochian: e.target.checked});
						this.apply({noEnochian: e.target.checked});
					}
				}}/><span> no enochian in potency calculation</span>
			</div>
			<div>
				<button style={{color: "#be0f0f"}} onClick={()=>{
					localStorage.clear();
					window.location.reload();
				}}>[DANGER!] clear browser cache and reload</button>
			</div>
		</div>
	}
}