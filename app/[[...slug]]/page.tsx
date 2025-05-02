import { ClientOnly } from "./client";
import "../../src/Style/normalize.css";
import "../../src/Style/style.css";

export const dynamicParams = false; // Ensure 404 on missing assets

export function generateStaticParams() {
	return [{ slug: [""] }];
}

export default async function Page() {
	return <ClientOnly />;
}
