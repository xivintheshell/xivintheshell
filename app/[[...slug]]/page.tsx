import { ClientOnly } from "./client";
import "../../src/Style/normalize.css";
import "../../src/Style/style.css";

export function generateStaticParams() {
	return [{ slug: [""] }];
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	return <ClientOnly slug={slug} />;
}
