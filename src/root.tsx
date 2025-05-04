import React from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";

export function links() {
	return [
		{
			rel: "icon",
			href: "/favicon.ico",
		},
		{
			rel: "apple-touch-icon",
			href: "/logo192.png",
		},
		{
			rel: "manifest",
			href: "/manifest.json",
		},
	];
}

// console gives us an annoying ("Hey developer") message, even in production builds, if we don't export
// at least something
// TODO: make a loading spinner or something

export function HydrateFallback() {
	return <div></div>;
}

export function Layout({ children }: { children: React.ReactNode }) {
	return <html lang="en">
		<head>
			<meta charSet="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			<meta name="theme-color" content="#FFFFFF" />
			<meta name="description" content="FFXIV job simulator and rotation planner" />
			<Meta />
			<Links />
			<title id="pageTitle">XIV in the Shell</title>
		</head>
		<body>
			<noscript>You need to enable JavaScript to run this app.</noscript>
			{children}
			<ScrollRestoration />
			<Scripts />
		</body>
	</html>;
}

export default function Root() {
	return <Outlet />;
}
