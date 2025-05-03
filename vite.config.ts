import { reactRouter } from "@react-router/dev/vite";
// @ts-expect-error
import { defineConfig } from "vite";

export default defineConfig({
	server: {
		port: 3000,
	},
	// Compatibility with migration from jest
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: ["./vitest.setup.ts"],
	},
	// https://github.com/remix-run/react-router/discussions/12655
	plugins: [!process.env.VITEST && reactRouter()],
});
