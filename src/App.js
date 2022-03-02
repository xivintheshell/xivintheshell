import React from 'react';
import { SkillName } from './Game/Common';
import { game, runTest } from './Game/GameState';
import './App.css';

//======================================================

var boundUpdateText = null;

class GameStateDisplay extends React.Component
{
	constructor(props)
	{
		super(props);
		this.state = {
			text: "(empty)"
		};
		var updateText = (text)=>{
			this.setState({ text: text });
		};
		boundUpdateText = updateText.bind(this);
	}
	render()
	{
		return(<div>{this.state.text}</div>);
	}
}
var gameStateDisplay = null;

class DebugTick extends React.Component {
	constructor(props) {
		super(props);
		this.state = {value: 1, redirect: false};
		this.handleChange = this.handleChange.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);
	}

	handleSubmit (event) {
		game.tick(parseFloat(this.state.value));
		console.log(game.toString());
		console.log(game.resources);
		console.log(game.eventsQueue);
		event.preventDefault();
	}

	handleChange(event) {
		this.setState({value: event.target.value});
	}

	render(){ 
		var form =
			<form onSubmit={this.handleSubmit}>
				<span>Tick by </span>
				<input size="5" type="text" 
						value={this.state.value} onChange={this.handleChange} />
				<input type="submit" value="GO" />
			</form>
		return (
			<div className="footer">
				{form}
			</div>
	)}
}

class Blizzard extends React.Component
{
	constructor(props)
	{
		super(props);
		this.state = {timesClicked: 0};
		this.boundAction = this.action.bind(this);
	}
	action()
	{
		game.useSkillIfAvailable(SkillName.Blizzard);
		this.setState({timesClicked: this.state.timesClicked + 1});
		boundUpdateText("hihi");
	}
	render()
	{
		return <button onClick={this.boundAction}>Blizzard {this.state.timesClicked}</button>;
	}
}

class LeyLines extends React.Component
{
	constructor(props)
	{
		super(props);
		this.state = {timesClicked: 0};
		this.boundAction = this.action.bind(this);
	}
	action()
	{
		game.useSkillIfAvailable(SkillName.LeyLines);
		this.setState({timesClicked: this.state.timesClicked + 1});
	}
	render()
	{
		return <button onClick={this.boundAction}>Ley Lines {this.state.timesClicked}</button>;
	}
}

class App extends React.Component {

	constructor(props)
	{
		super(props);
		runTest();
		gameStateDisplay = <GameStateDisplay text="initial text" />
	}

	render()
	{
		return (
			<div className="App">
				<DebugTick />
				<Blizzard />
				<LeyLines />
				{gameStateDisplay}
			</div>
		);
	}
}

export default App;
