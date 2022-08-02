import React from 'react'
import {Color, LogCategory} from "../Controller/Common";

type AutoScrollProps = {
	name: LogCategory,
	className: string,
	content: React.ReactNode,
};
class AutoScroll extends React.Component {
	props: AutoScrollProps;
	private readonly myRef: React.RefObject<HTMLDivElement>;
	constructor(props: AutoScrollProps) {
		super(props);
		this.props = props;
		this.myRef = React.createRef();
	}
	componentDidMount() {
		this.scroll();
	}
	scroll() {
		if (this.myRef.current !== null) {
			this.myRef.current.scrollTop = this.myRef.current.scrollHeight;
		}
	}
	componentDidUpdate() {
		this.scroll();
	}
	render() {
		return(<div ref={this.myRef} className={this.props.className}>{this.props.content}</div>);
	}
}

let logContent = new Map();
logContent.set(LogCategory.Action, []);
logContent.set(LogCategory.Event, []);

let addLogContentInner = function(logCategory: LogCategory, newContent: string, color: Color) {
	logContent.get(logCategory).push({
		text: newContent,
		color: color
	});
}
export let addLogContent = addLogContentInner;

type LogViewProps = {};
class LogView extends React.Component {
	props: LogViewProps;
	constructor(props: LogViewProps) {
		super(props);
		this.props = props;
		addLogContent = ((logCategory: LogCategory, newContent: string, color: Color)=>{
			addLogContentInner(logCategory, newContent, color);
			this.forceUpdate();
		}).bind(this);
	}
	componentWillUnmount() {
		addLogContent = addLogContentInner;
	}
	render() {
		let mappedContent = function(category: LogCategory) {
			let list = logContent.get(category);
			let outList = [];
			for (let i=0; i<list.length; i++) {
				let entry = list[i];
				outList.push(<div key={i} className={entry.color + " logEntry"}>{entry.text}</div>)
			}
			return outList;
		}
		return(<div className={"logsAll"}>
			<AutoScroll className={"logWindow actions"} key={0} name={LogCategory.Action} content={mappedContent(LogCategory.Action)}/>
			<AutoScroll className={"logWindow events"} key={1} name={LogCategory.Event} content={mappedContent(LogCategory.Event)}/>
		</div>);
	}
}
export const logView = <LogView />;