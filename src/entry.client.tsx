import React from "react";
import ReactDOM from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import "./Style/normalize.css";
import "./Style/style.css";

ReactDOM.hydrateRoot(
	document,
	<React.StrictMode>
		<HydratedRouter />
	</React.StrictMode>,
);
