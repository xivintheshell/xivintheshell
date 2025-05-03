import React from "react";
import { useSearchParams } from "react-router";
import Main from "./Components/Main";

export default function Component() {
	const [searchParams] = useSearchParams();
	// For now, operate under the assumption that only one parameter is passed.
	// Only examine keys.
	const keys = Array.from(searchParams.keys());
	return <Main command={keys.length > 0 ? keys[0] : undefined} />;
}
