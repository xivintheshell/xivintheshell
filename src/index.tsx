import React from "react";
import { createRoot } from "react-dom/client";

import "./Style/normalize.css";
import "./Style/style.css";
import Main from "./Components/Main";

const root = createRoot(document.getElementById("root") as HTMLDivElement);

const searchParams = new URLSearchParams(document.location.search);

// For now, operate under the assumption that only one parameter is passed.
// Only examine keys.
const keys = Array.from(searchParams.keys());

root.render(<Main command={keys.length > 0 ? keys[0] : undefined} />);
