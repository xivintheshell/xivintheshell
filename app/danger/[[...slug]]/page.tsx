import { ClientOnly } from "./client";
import "../../../src/Style/normalize.css";
import "../../../src/Style/style.css";

// When using nextjs to build a static SPA, it seems like any parameter not defined in
// generateStaticParams causes a 500 error in dev mode. That's right, a 500 error, not a 404.
// As such, any time a new command is added, we have to declare it here.
// https://github.com/vercel/next.js/issues/46425
export function generateStaticParams() {
	return ["", "resetResourceOverrides", "resetAll"].map((s) => {return { slug: [s] }});
}

// When the url is xivintheshell.com/#/{command}, pass command to the page.
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	return <ClientOnly slug={slug} />;
}
