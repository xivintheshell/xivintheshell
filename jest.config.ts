import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
	// Provide the path to your Next.js app to load next.config.js and .env files in your test environment
	dir: './',
})

// Add any custom config to be passed to Jest
const config: Config = {
	coverageProvider: 'v8',
	testEnvironment: 'jsdom',
	// Add more setup options before each test is run
	setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
	// I hate it here
	// https://stackoverflow.com/questions/79506842/react-19-jest-let-test-cases-failed-with-error-referenceerror-messagechannel
	moduleNameMapper: {
		"react-dom/server": "react-dom/server.edge",
	},
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config)
