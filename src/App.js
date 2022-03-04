import React from 'react';
import { SkillName } from './Game/Common';
import { game, runTest } from './Game/GameState';
import { logView } from "./Components/LogView";
import './App.css';

class DebugTick extends React.Component {
	constructor(props) {
		super(props);
		this.state = {value: 1, redirect: false};
		this.handleChange = this.handleChange.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);
	}

	handleSubmit (event) {
		game.tick(parseFloat(this.state.value));
		event.preventDefault();
	}

	handleChange(event) {
		this.setState({value: event.target.value});
	}

	render(){
		const form =
			<form onSubmit={this.handleSubmit}>
				<span>Tick by </span>
				<input size="5" type="text"
					   value={this.state.value} onChange={this.handleChange}/>
				<input type="submit" value="GO"/>
			</form>;
		return (
			<div className="footer">
				{form}
			</div>
	)}
}

class SkillButton extends React.Component
{
	constructor(props)
	{
		super(props);
		this.skillName = props.skillName;
		this.state = {timesClicked: 0};
		this.boundAction = this.action.bind(this);
	}
	action()
	{
		game.useSkillIfAvailable(this.skillName);
		this.setState({timesClicked: this.state.timesClicked + 1});
	}
	render()
	{
		return <button onClick={this.boundAction}>{this.skillName} {this.state.timesClicked}</button>;
	}
}

class App extends React.Component {

	constructor(props)
	{
		super(props);
		runTest();
	}

	render()
	{
		return (
			<div className="App">
				<DebugTick />
				<SkillButton skillName={SkillName.Blizzard} />
				<SkillButton skillName={SkillName.Fire} />
				<SkillButton skillName={SkillName.Transpose} />
				<SkillButton skillName={SkillName.Thunder3} />
				<SkillButton skillName={SkillName.Manaward} />
				<SkillButton skillName={SkillName.Manafont} />
				<SkillButton skillName={SkillName.Fire3} />
				<SkillButton skillName={SkillName.Blizzard3} />
				<SkillButton skillName={SkillName.Freeze} />
				<SkillButton skillName={SkillName.Flare} />
				<SkillButton skillName={SkillName.LeyLines} />
				{logView}
			</div>
		);
	}
}

export default App;
