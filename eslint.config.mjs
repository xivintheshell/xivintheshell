import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";

export default tseslint.config(
	// ??? https://github.com/eslint/eslint/discussions/18304
	[
		{
			ignores: ["build/**"], // don't know why the files whitelist is insufficient...
		},
		{
			files: ["src/**/*.{js,jsx,ts,tsx}"],
			extends: [
				eslint.configs.recommended,
				tseslint.configs.recommended,
				reactPlugin.configs.flat.recommended,
			],
			rules: {
				"@typescript-eslint/no-explicit-any": "off",
				"@typescript-eslint/no-empty-object-type": "off",
				"@typescript-eslint/no-this-alias": "off",
				// do not warn about unused function parameters, which is very common for state functions
				"@typescript-eslint/no-unused-vars": ["error", { "args": "none" }],
				"@typescript-eslint/no-unused-expressions": ["error", { "allowShortCircuit": true }],
				"react/no-unescaped-entities": "off",
				"react/prop-types": "off", // TODO re-enable someday
			},
			settings: {
				react: {
					version: "detect",
				},
			},
		},
	],
);
