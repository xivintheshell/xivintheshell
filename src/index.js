import React from 'react';
import ReactDOM from 'react-dom';
import Main from './Components/Main';

import './Style/normalize.css';
import './Style/style.css';
import './Style/timeline.css';

ReactDOM.render(
	//<React.StrictMode>
		<Main />,
	//</React.StrictMode>,
	document.getElementById('root')
);