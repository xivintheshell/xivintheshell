import '@testing-library/jest-dom'

// I REALLY hate it here
// https://stackoverflow.com/questions/77310637/getting-referenceerror-textencoder-is-not-defined-after-upgrading-jest

if (
	typeof globalThis.TextEncoder === "undefined" ||
	typeof globalThis.TextDecoder === "undefined"
) {
	const utils = require("util");
	globalThis.TextEncoder = utils.TextEncoder;
	globalThis.TextDecoder = utils.TextDecoder;
	globalThis.Uint8Array = Uint8Array;
}
