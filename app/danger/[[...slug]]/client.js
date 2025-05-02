"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// This is a JS file instead of TSX because there's some weirdness with dynamic imports
// that I don't care enough to figure out how to resolve.

const Main = dynamic(() => import("../../../src/Components/Main"), { ssr: false });

export function ClientOnly({ slug }) {
	// Insert a client-side navigation command to make sure static asset URLs don't get mangled
	// by the command prefix.
	useEffect(() => {
		useRouter().push("/");
	}, []);
	return <Main command={slug} />;
}
