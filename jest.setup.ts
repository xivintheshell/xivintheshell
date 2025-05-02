import '@testing-library/jest-dom'

// I REALLY hate it here
// https://stackoverflow.com/questions/77310637/getting-referenceerror-textencoder-is-not-defined-after-upgrading-jest
// https://stackoverflow.com/questions/68468203/why-am-i-getting-textencoder-is-not-defined-in-jest
import { TextEncoder, TextDecoder } from 'util';

Object.assign(global, { TextDecoder, TextEncoder });
