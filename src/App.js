import React from 'react';
import { SkillName } from './Game/Skills';
import { game, runTest } from './Game/GameState';
//import logo from './logo.svg';
import './App.css';

//======================================================

class GameStateDisplay extends React.Component
{
	constructor(props)
	{
		super(props);
		this.state = {
			text: "(empty)"
		};
	}
	update(s){ this.setState({ text: s }); }
	render()
	{
		return(<div>{this.state.text}</div>);
	}
}
let gameStateDisplay = <GameStateDisplay />;

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
		console.log(game.eventsQueue);
		//gameStateDisplay.update(game.toString());
		event.preventDefault();
	}

	handleChange(event) {
		this.setState({value: event.target.value});
	}

	render(){ 
		var powered =
			<form onSubmit={this.handleSubmit}>
				<span>Tick by </span>
				<input size="5" type="text" 
						value={this.state.value} onChange={this.handleChange} />
				<input type="submit" value="GO" />
			</form>
		return (
			<div className="footer">
				{powered}
			</div>
	)}
}

function DebugButton()
{
	var fn = ()=>{
		//console.log("clicked");
		game.useSkillIfAvailable(SkillName.Blizzard);
	};
	return <button onClick={fn}>click me</button>;
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
				<DebugButton />
				{gameStateDisplay}
			</div>
		);
	}
}

export default App;
