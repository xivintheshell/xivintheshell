import React from 'react';
import {Debug} from "../Game/Common";
import {localize} from "./Localization";
import {clearCachedValues, getCachedValue, setCachedValue} from "../Controller/Common";

type DebugSettings = {
	noEnochian: boolean;
	noManaTicks: boolean;
};
export class DebugOptions extends React.Component {
	state: {
		noEnochian: boolean,
		noManaTicks: boolean
	};
	saveSettings: (settings: DebugSettings) => void;
	loadSettings: () => DebugSettings | undefined;
	apply: (settings: DebugSettings) => void;
	constructor(props: {}) {
		super(props);
		this.saveSettings = (settings: DebugSettings)=>{
			let str: string = JSON.stringify(settings);
			setCachedValue("debugOptions", str);
		}
		this.loadSettings = ()=>{
			let str = getCachedValue("debugOptions");
			if (str) {
				let content = JSON.parse(str);
				let settings: DebugSettings = {
					noEnochian: content.noEnochian ? content.noEnochian : false,
					noManaTicks: content.noManaTicks ? content.noManaTicks : false,
				};
				return settings;
			}
			return undefined;
		}
		this.apply = (settings: DebugSettings) => {
			Debug.noEnochian = settings.noEnochian;
			Debug.disableManaTicks = settings.noManaTicks;
		};

		let settings = this.loadSettings();
		if (settings) {
			this.state = {
				noEnochian: settings.noEnochian,
				noManaTicks: settings.noManaTicks
			};
		} else {
			this.state = {
				noEnochian: false,
				noManaTicks: false
			};
		}
	}
	componentDidMount() {
		this.apply({
			noEnochian: this.state.noEnochian,
			noManaTicks: this.state.noManaTicks
		});
	}

	render() {
		return <div>
			<div className="paragraph">
				Default unchecked; may create invalid game states.
			</div>
			<div className="paragraph">
				<input type="checkbox" style={{position: "relative", top: 3}}
					   checked={this.state.noEnochian}
					   onChange={(e) => {
						   if (e && e.target) {
							   this.setState({noEnochian: e.target.checked});
							   let settings: DebugSettings = {
								   noEnochian: e.target.checked,
								   noManaTicks: this.state.noManaTicks
							   };
							   this.saveSettings(settings);
							   this.apply(settings);
						   }
					   }}/><span> no enochian in potency calculation</span>
			</div>
			<div className="paragraph">
				<input type="checkbox" style={{position: "relative", top: 3}}
					   checked={this.state.noManaTicks}
					   onChange={(e) => {
						   if (e && e.target) {
							   this.setState({noManaTicks: e.target.checked});
							   let settings: DebugSettings = {
								   noEnochian: this.state.noEnochian,
								   noManaTicks: e.target.checked
							   };
							   this.saveSettings(settings);
							   this.apply(settings);
						   }
					   }}/><span> no MP ticks</span>
			</div>
			<div>
				<button style={{color: "#be0f0f"}} onClick={()=>{
					clearCachedValues();
					window.location.reload();
				}}>{localize({
					en: "[DANGER!] clear browser cache and reload",
					zh: "[谨慎操作] 清除缓存并刷新",
					ja: "[キケン！] ブラウザキャッシュをクリアしてリロード",
    			})}</button>
			</div>
		</div>
	}
}