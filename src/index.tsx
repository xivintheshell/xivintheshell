import React from "react";
import { createRoot } from "react-dom/client";

import "./Style/normalize.css";
import "./Style/style.css";
import Main from "./Components/Main";
import { getCachedValue } from "./Controller/Common";

// To reduce the size of the bundle, we lazy-load the manual page. At the time of writing, this
// shaves about 100KiB from the 1400KiB js bundle, and 30KiB off a 400KiB gzip blob.
// The manual page is almost entirely text, so this has a non-trivial impact on initial load time
// on the first visit (subsequent visits should get cached).
// TODO: we can reduce chunk sizes even further by code splitting between the Chinese and English
// text versions. If we ever fully add Japanese, this will probably become necessary.
// TODO: we can also consider lazy-loading Main when loading the manual route, but this requires
// some more complicated code splitting logic.
// @ts-expect-error there's some stupid stuff with name resolution I don't want to deal with
const Manual = React.lazy(() => import("./Manual/Manual"));

const root = createRoot(document.getElementById("root") as HTMLDivElement);

const searchParams = new URLSearchParams(document.location.search);

// For now, operate under the assumption that only one parameter is passed.
// Only examine keys.
const keys = Array.from(searchParams.keys());

// With some cursory testing, react-router added some sizable overhead to render times in the dev
// build because of a bunch of babel middleware plugins. As such, we manually route the manual
// page here.
// We do not use React.Suspense here because it actually imposes a non-trivial overhead:
// in a dev hot build, the manual takes ~0.65s to load, but with a Suspense component in between,
// it increases to ~0.9s. I also observed this overhead when deploying to the beta site.
// This overhead is apparently caused by the additional render cycle needed to draw the loading logic
// of the suspense element; since the page loads fairly quickly already (0.3s from cache in production),
// it does not make sense to add a loading fallback.
const pathname = window.location.pathname;
if (pathname.startsWith("/manual")) {
	root.render(
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
		/>,
	);
} else {
	root.render(<Main command={keys.length > 0 ? keys[0] : undefined} />);
}
