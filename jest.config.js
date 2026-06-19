/** Jest config for unit-testing the library's TypeScript logic.
 *  Native modules are mocked in tests, so we do not need the full
 *  react-native preset here — babel-jest with the RN babel preset is
 *  enough to transform TS/TSX/Flow. (jsdom is added later for the web impl.)
 */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)sx?$': [
      'babel-jest',
      { presets: ['module:@react-native/babel-preset'] },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  // The shipped <VideoThumbnail> pulls in react-native; stub it so the pure
  // logic tests (node/jsdom) can import `src/index` without the full RN preset.
  moduleNameMapper: {
    '^react-native$': '<rootDir>/jest/react-native.js',
    '^react-native-nitro-modules$': '<rootDir>/jest/nitro-modules.js',
  },
  testMatch: ['**/__tests__/**/*.test.(ts|tsx)'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/lib/',
    '/example/',
    '/nitrogen/',
  ],
};
