import React from "react";
import { createRoot } from "react-dom/client";

import "./Style/normalize.css";
import "./Style/style.css";
import Main from "./Components/Main";
import { getCachedValue } from "./Controller/Common";
import { DEFAULT_FONTS } from "./Components/Common";
import { getCachedColorTheme, getThemeColors } from "./Components/ColorTheme";

// To reduce the size of the bundle, we lazy-load the manual page. At the time of writing, this
// decreases the main bundle size from ~1400 KiB to 176 KiB.
// The manual page is almost entirely text, so this has a very substantial impact on
// initial load time on the first visit (subsequent visits should get cached).
// TODO: we can reduce chunk sizes even further by code splitting between the Chinese and English
// text versions. If we ever fully add Japanese, this will probably become necessary.
// @ts-expect-error there's some stupid stuff with name resolution I don't want to deal with
const Manual = React.lazy(() => import("./Manual/Manual"));

function ManualFallback() {
	const colors = getThemeColors(getCachedColorTheme());
	return <div
		style={{
			height: "100vh",
			width: "100%",
			marginBlock: "1em",
			marginInline: "1em",
			backgroundColor: colors.background,
			color: colors.text,
			fontFamily: DEFAULT_FONTS,
		}}
	>
		<h2>{getCachedValue("language") === "zh" ? "加载中..." : "Loading..."}</h2>
	</div>;
}

const root = createRoot(document.getElementById("root") as HTMLDivElement);

const searchParams = new URLSearchParams(document.location.search);

// For now, operate under the assumption that only one parameter is passed.
// Only examine keys.
const keys = Array.from(searchParams.keys());

// With some cursory testing, react-router added some sizable overhead to render times in the dev
// build because of a bunch of babel middleware plugins. As such, we manually route the manual
// page here.
const pathname = window.location.pathname;
if (pathname.startsWith("/manual")) {
	root.render(
		<React.Suspense fallback={<ManualFallback />}>
			<Manual
				language={
					pathname === "/manual" || pathname === "/manual/"
						? (getCachedValue("language") ?? undefined)
						: pathname === "/manual_en" || pathname === "/manual_en/"
							? "en"
							: pathname === "/manual_zh" || pathname === "/manual_zh/"
								? "zh"
								: undefined
				}
			/>
		</React.Suspense>,
	);
} else {
	root.render(<Main command={keys.length > 0 ? keys[0] : undefined} />);
}
