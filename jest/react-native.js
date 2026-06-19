// Minimal `react-native` stub for the library's unit tests (node + jsdom envs).
// The VideoThumbnail component is imported (so `src/index` loads) but never
// rendered in these tests — it only needs StyleSheet.create to run at module
// scope without crashing. Real component behaviour is verified in the example app.
const identity = (s) => s;
const Noop = () => null;

class AnimatedValue {
  interpolate() {
    return 0;
  }
  setValue() {}
}

module.exports = {
  StyleSheet: {
    create: identity,
    flatten: identity,
    absoluteFill: {},
    absoluteFillObject: {},
    hairlineWidth: 1,
  },
  View: Noop,
  Image: Noop,
  Text: Noop,
  Pressable: Noop,
  ActivityIndicator: Noop,
  Animated: {
    View: Noop,
    Value: AnimatedValue,
    timing: () => ({ start() {}, stop() {} }),
    loop: () => ({ start() {}, stop() {} }),
  },
  Easing: { linear: identity },
  Platform: {
    OS: 'ios',
    select: (o) => (o ? (o.ios ?? o.default) : undefined),
  },
};
