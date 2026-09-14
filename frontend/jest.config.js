// Jest configuration for the SafeSoundArena frontend
// See https://jestjs.io/docs/configuration for all options

module.exports = {
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest', // Use Babel for all modern JS/TS/JSX/TSX
  },

  // Simulate a browser environment for React components
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['./jest.setup.js'],

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

  // Enforce minimum coverage thresholds (adjust as your project grows)
  coverageThreshold: {
    global: {
      branches: 15,
      functions: 18,
      lines: 28,
      statements: 27,
    },
  },

  // Ignore build and node_modules folders in tests (CI-friendly)
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/dist/'],
  // Only ignore node_modules for transform
  transformIgnorePatterns: ['/node_modules/'],


  // Show individual test results with the test suite hierarchy
  verbose: true,

  // Add more options here as needed, e.g.:
  // setupFilesAfterEnv: ['./jest.setup.js'],
};
