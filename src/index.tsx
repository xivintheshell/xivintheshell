import React from "react";
import { createRoot } from "react-dom/client";

import "./Style/normalize.css";
import "./Style/style.css";
import Main from "./Components/Main";
// TODO code split/do dynamic import for manual page?
// main must be imported first to ensure proper initialization
import Manual from "./Manual/Manual";

const root = createRoot(document.getElementById("root") as HTMLDivElement);

const searchParams = new URLSearchParams(document.location.search);

// For now, operate under the assumption that only one parameter is passed.
// Only examine keys.
const keys = Array.from(searchParams.keys());

// With some cursory testing, react-router added some sizable overhead to render times in the dev
// build because of a bunch of babel middleware plugins. As such, we manually route the manual
// page here.
const pathname = window.location.pathname;
if (pathname === "/manual" || pathname === "manual/") {
	root.render(<Manual />);
} else {
	root.render(<Main command={keys.length > 0 ? keys[0] : undefined} />);
}
