import "vitest-canvas-mock";
import "@testing-library/jest-dom";
// To prevent "ReferenceError: Cannot access 'DEFAULT_TIMELINE_OPTIONS' before initialization"
// just import the Main component first.
import "./src/Components/Main";
