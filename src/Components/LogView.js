import React, { useEffect, useRef } from 'react'
import { LogCategory } from "../Controller/Common";

import "./LogView.css"
import "./Color.css"

let updateTextFunctions = new Map();
class UpdatableText extends React.Component
{
    constructor(props)
    {
        super(props);
        this.state = {
            content: "(empty)"
        };
        const unboundUpdateContent = (inContent) => {
            this.setState({content: inContent});
        };
        updateTextFunctions.set(this.props.name, unboundUpdateContent.bind(this));
    }
    render()
    {
        return(<span>{this.state.content}</span>);
    }
}
const AlwaysScrollToBottom = () => {
    const elementRef = useRef();
    useEffect(() => elementRef.current.scrollIntoView({ behavior: "smooth" }));
    return <div ref={elementRef} />;
};

export var addLogContent = function(logCategory, newContent, color)
{
    let [view, content] = this.views.get(logCategory);
    content.push(<span className={color} key={content.length}>{newContent}<br/></span>);
    let updateFn = updateTextFunctions.get(view.props.name);
    updateFn(<span>{content.map(s=>{return s})} <AlwaysScrollToBottom/></span>);
}
class LogView extends React.Component
{
    constructor(props)
    {
        super(props);
        this.views = new Map();
        this.views.set(LogCategory.Skill, [<UpdatableText key={0} name={LogCategory.Skill}/>, []]);
        this.views.set(LogCategory.Event, [<UpdatableText key={0} name={LogCategory.Event}/>, []]);

        addLogContent = addLogContent.bind(this);
    }
    render()
    {
        return(<div>
            <div className="LogWindow">{this.views.get(LogCategory.Skill)}</div>
            <div className="LogWindow">{this.views.get(LogCategory.Event)}</div>
        </div>);
    }
}
export const logView = <LogView />;