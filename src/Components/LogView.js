import React from 'react'
import { LogCategory } from "../Controller/Common";

let updateTextFunctions = new Map();
class UpdatableText extends React.Component
{
    constructor(props)
    {
        super(props);
        this.myRef = React.createRef();
        this.state = {
            content: "(empty)"
        };
        const unboundUpdateContent = (inContent) => {
            this.setState({content: inContent});
        };
        updateTextFunctions.set(this.props.name, unboundUpdateContent.bind(this));
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
        return(<div ref={this.myRef} className={this.props.className}>{this.state.content}</div>);
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

export var addLogContent = function(logCategory, newContent, color) {}

class LogView extends React.Component
{
    constructor(props)
    {
        super(props);
        this.views = new Map();
        this.views.set(LogCategory.Action, [<UpdatableText className="logWindow small" key={0} name={LogCategory.Action}/>, []]);
        this.views.set(LogCategory.Event, [<UpdatableText className="logWindow medium" key={1} name={LogCategory.Event}/>, []]);

        addLogContent = this.unboundAddLogContent.bind(this);
    }
    unboundAddLogContent(logCategory, newContent, color) {
        let [view, content] = this.views.get(logCategory);
        let newEntry = <div className={color + " logEntry"} key={content.length}>{newContent}<br/></div>;
        content.push(newEntry);
        let updateFn = updateTextFunctions.get(view.props.name);
        updateFn(<span>{content.map(s=>{return s})} </span>);
    }
    render()
    {
        return(<div>
            {this.views.get(LogCategory.Action)}
            {this.views.get(LogCategory.Event)}
        </div>);
    }
}
export const logView = <LogView />;