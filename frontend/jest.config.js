// Jest configuration for the SafeSoundArena frontend
// See https://jestjs.io/docs/configuration for all options

module.exports = {
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest', // Use Babel for all modern JS/TS/JSX/TSX
  },

  // Simulate a browser environment for React components
  testEnvironment: 'jsdom',

  // Recognized file extensions for modules
  moduleFileExtensions: [
    'js',
    'jsx',
    'json',
    'node',
    'ts',
    'tsx',
  ],

  // Automatically collect coverage from relevant files
  collectCoverage: true,

  // Output coverage reports in multiple formats (great for CI)
  coverageReporters: ['json', 'lcov', 'text', 'clover'],

  // Enforce minimum coverage thresholds (set to 0 for the current integrated demo test run)
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },

  // Ignore build and node_modules folders in tests (CI-friendly)
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/dist/'],
  // Only ignore node_modules for transform
  transformIgnorePatterns: ['/node_modules/'],


  // Show individual test results with the test suite hierarchy
  verbose: true,

  // Add more options here as needed
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
