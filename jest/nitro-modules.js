// Stub for `react-native-nitro-modules` so the native code path can be imported
// in unit tests (node/jsdom). It's never actually invoked there — the web tests
// exercise the web implementation, and the native logic tests mock `src/native`.
module.exports = {
  NitroModules: {
    createHybridObject: () => ({
      create: () =>
        Promise.reject(new Error('Nitro native module unavailable in tests')),
    }),
  },
};
