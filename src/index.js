import React from 'react';
import ReactDOM from 'react-dom';
import { HashRouter, Routes, Route, useParams } from "react-router-dom";
import Main from './Components/Main';

import './Style/normalize.css';
import './Style/style.css';

function MainWithCommand() {
	let params = useParams();
	return <Main command={params.command}/>;
}

ReactDOM.render(
	//<React.StrictMode>
	<HashRouter>
		<Routes>
			<Route path={"/"} element={<Main/>}/>
			<Route path={"/:command"} element={<MainWithCommand/>}/>
		</Routes>
	</HashRouter>,
	//</React.StrictMode>,
	document.getElementById('root')
);