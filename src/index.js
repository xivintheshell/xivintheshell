import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import Main from './Components/Main';

import './Style/normalize.css';
import './Style/style.css';
import './Style/timeline.css';

function MainWithCommand() {
	let params = useParams();
	return <Main command={params.command}/>;
}

ReactDOM.render(
	//<React.StrictMode>
	<BrowserRouter>
		<Routes>
			<Route path="/ffxiv-blm-rotation/" element={<Main/>}/>
			<Route path="/ffxiv-blm-rotation/:command" element={<MainWithCommand/>}/>
		</Routes>
	</BrowserRouter>,
	//</React.StrictMode>,
	document.getElementById('root')
);