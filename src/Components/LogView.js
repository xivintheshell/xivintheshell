import React from 'react'
import { LogCategory } from "../Controller/Common";

class AutoScroll extends React.Component
{
    constructor(props)
    {
        super(props);
        this.myRef = React.createRef();
    }
    componentDidMount() {
        this.scroll();
    }
    scroll() {
        let cur = this.myRef.current;
        if (cur) {
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

// meh.. for later maybe
class ScrollAnchor extends React.Component
{
    constructor(props)
    {
        super(props);
        this.myRef = React.createRef();
    }
    scroll()
    {
        console.log(this.myRef);
        if (this.myRef.current !== null) {
            this.myRef.current.scrollIntoView({behavior: "smooth"});
        }
    }
    render() {
        this.scroll();
        return <div ref={this.myRef}/>;
    }
}

let logContent = new Map();
logContent.set(LogCategory.Action, []);
logContent.set(LogCategory.Event, []);

let addLogContentInner = function(logCategory, newContent, color) {
    logContent.get(logCategory).push({
        text: newContent,
        color: color
    });
}
export var addLogContent = addLogContentInner;

class LogView extends React.Component
{
    constructor(props)
    {
        super(props);
        addLogContent = this.unboundAddLogContent.bind(this);
    }
    componentWillUnmount() {
        addLogContent = addLogContentInner;
    }
    unboundAddLogContent(logCategory, newContent, color) {
        addLogContentInner(logCategory, newContent, color);
        this.forceUpdate();
    }
    render()
    {
        let mappedContent = function(category) {
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