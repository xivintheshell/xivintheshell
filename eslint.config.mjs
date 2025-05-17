import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import { defineConfig } from "eslint/config";

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
				"@typescript-eslint/no-unused-vars": "off",
				"@typescript-eslint/no-explicit-any": "off",
				"@typescript-eslint/no-empty-object-type": "off",
				"@typescript-eslint/no-this-alias": "off",
				"@typescript-eslint/no-unused-expressions": "off",
				"@typescript-eslint/no-require-imports": "off",
				// TODO re-enable these rules and fix the reported errors
				"react/no-unescaped-entities": "off",
				"react/prop-types": "off",
				"prefer-const": "off",
			},
			settings: {
				react: {
					version: "detect",
				},
			},
		},
	],
);
