import { ClientOnly } from "./client";
import "../../src/Style/normalize.css";
import "../../src/Style/style.css";

export function generateStaticParams() {
  return [{ slug: [""] }];
}

export default async function Page() {
	return <ClientOnly />;
}
