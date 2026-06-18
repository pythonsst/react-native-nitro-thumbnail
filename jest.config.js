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
  testMatch: ['**/__tests__/**/*.test.(ts|tsx)'],
  testPathIgnorePatterns: ['/node_modules/', '/lib/', '/example/', '/nitrogen/'],
};
