"use client";

import dynamic from "next/dynamic";

// This is a JS file instead of TSX because there's some weirdness with dynamic imports
// that I don't care enough to figure out how to resolve.

const Main = dynamic(() => import("../../../src/Components/Main"), { ssr: false });

export function ClientOnly({ slug }) {
	return <Main command={slug} />;
}
