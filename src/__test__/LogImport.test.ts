// PLACEHOLDER TESTING FILE FOR LOG IMPORT
// High-level approach to testing:
// - Mock window.fetch
// - Save the JSON of the response to each of these queries to a file, and return them in the mock
// - Verify the imported sequence matches what is expected
//
// The import component can mostly be tested on its own, as long as the state of the global controller
// is correctly reset before/after the test.
//
// Cases to test:
// - Token + PKCE sequence request success/failure
// - GraphQL query failure
// - PCT M1S log (includes Tempera Coat/Grassa pops)
// - PCT FRU log
// - SCH AMR log w/ recorded stats (for some reason Energy Drain ID isn't getting registered properly?)
// - BLM 7.2 AMR log (really long; kind of a perf test)
// - SAM log with Tengentsu pop + synced SAM log with Third Eye pop
// - Repeated query of log does not trigger fetch mock a second time
// - Currently unsupported cases to test later:
//   - Toxikon generation on SGE
//   - Gauge generation on RPR on enemy death with DD active
//   - Generic AoE log

it("placeholder log import test", () => {});
