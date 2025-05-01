// For some twelvesforsaken reason CRA doesn't even receive security updates anymore, so now we have
// to switch to nextjs to use newer react-adjacent libraries and components.
// Why in Hydaelyn's name do we have to create a folder called '[[...slug]]'?
// Why does the migration guide (https://nextjs.org/docs/app/guides/migrating/from-create-react-app)
// have 11 steps?
// Who in the seven hells thought making people add this much boilerplate for every project
// was a good and ergonomic user experience?
// It's this stuff that drives even the sanest of developers to RP in their code comments. If
// someone knows of a third lore-accurate intensifier that I can add to that second "why," please
// do let me know posthaste so I can add it.

export default function RootLayout({ children }: { children: React.ReactNode }) {
	// favicon, manifest.json, and other metadata area automatically handled by nextjs
	return <html lang="en">
		<head>
			<meta name="theme-color" content="#FFFFFF" />
			<meta name="description" content="FFXIV job simulator and rotation planner" />
			<title id="pageTitle">XIV in the Shell</title>
		</head>
		<body>
			<noscript>You need to enable JavaScript to run this app.</noscript>
			<div id="root">{children}</div>
		</body>
	</html>;
}
