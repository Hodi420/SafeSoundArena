// Jest configuration for the SafeSoundArena frontend
// See https://jestjs.io/docs/configuration for all options

module.exports = {
  preset: 'ts-jest',
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
  },

  // Simulate a browser environment for React components
  testEnvironment: 'jsdom',

  // Recognized file extensions for modules
  moduleFileExtensions: ['js', 'jsx', 'json', 'node', 'ts', 'tsx'],
  moduleDirectories: ['node_modules', '<rootDir>/node_modules'],

  // Automatically collect coverage from relevant files
  collectCoverage: true,

  // Output coverage reports in multiple formats (great for CI)
  coverageReporters: ['json', 'lcov', 'text', 'clover'],

  // Enforce minimum coverage thresholds (adjust as your project grows)
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 40,
      lines: 40,
      statements: 40,
    },
  },

  // Ignore build and node_modules folders in tests (CI-friendly)
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/dist/'],
  // Only ignore node_modules for transform
  transformIgnorePatterns: ['/node_modules/'],

  // Show individual test results with the test suite hierarchy
  verbose: true,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/__mocks__/fileMock.js',
    "^react$": "react",
    "^react-dom$": "react-dom",
    "^@tanstack/react-query$": "@tanstack/react-query",
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Note: ts-jest configuration set inline under `transform` above

  // Add more options here as needed, e.g.:
  // setupFilesAfterEnv: ['./jest.setup.js'],
};
