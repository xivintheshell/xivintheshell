// vite-plugin-inspect is useful for dev build profiling, but at time of writing does not
// support vite 8, so it'll need tob e manually reinstalled
// import Inspect from "vite-plugin-inspect";
import react from "@vitejs/plugin-react";

// @ts-expect-error
import { defineConfig } from "vite";

export default defineConfig({
	server: {
		port: 3000,
		// Resolve ts and tsx files first in the import order, since the transpiler
		// looks for every single possible extension when resolving imports.
		// This has a VERY significant performance impact on dev server load time.
		// https://vite.dev/guide/performance#reduce-resolve-operations
		resolve: {
			extensions: ["ts", "tsx", "json", "js", "jsx", "mjs", "mts"],
		},
	},
	build: {
		outDir: "build",
	},
	// Compatibility with migration from jest
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: ["./vitest.setup.ts"],
	},
	plugins: [
		react(),
		// https://github.com/antfu-collective/vite-plugin-inspect
		// Uncomment this line + corresponding import if there are perf issues
		// in the dev build (`npm start`) that are not apparent in a production
		// build (`npm preview`).
		// Inspect(),
	],
});
