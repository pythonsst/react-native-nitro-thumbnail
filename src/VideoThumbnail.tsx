/* eslint-disable react-native/no-inline-styles -- this component is intentionally
   styled from props (sizes/colors/animated values), which requires inline styles. */
import * as React from 'react';
import {
  View,
  Image,
  Pressable,
  Animated,
  Easing,
  StyleSheet,
} from 'react-native';
import type {
  StyleProp,
  ViewStyle,
  ImageStyle,
  LayoutChangeEvent,
} from 'react-native';
import { ThumbnailError } from './errors';
import { createThumbnail } from './createThumbnail';
import type { Thumbnail } from './types';

export type VideoThumbnailProps = {
  /** Video to generate from when there is no `serverThumbnail`. */
  videoUrl?: string | null;
  /** A thumbnail URL your API already returns. If set, it's shown and nothing is generated. */
  serverThumbnail?: string | null;
  /** Frame to capture (ms) when generating. Default 1000. */
  timeStamp?: number;
  /** Generation passthrough options. */
  format?: 'jpeg' | 'png';
  maxWidth?: number;
  maxHeight?: number;
  headers?: Record<string, string>;
  cacheName?: string;

  /** Show the loading state even if a thumbnail isn't being generated (e.g. your API is fetching). */
  isLoading?: boolean;
  /** Replace the built-in shimmer with your own loading node. */
  renderLoading?: () => React.ReactNode;
  /** [base, highlight] colors for the built-in shimmer. */
  shimmerColors?: readonly [string, string];
  /** Shimmer sweep duration (ms). Default 1200. */
  shimmerDuration?: number;

  /** Show the play button overlay (requires `onPress`). Default true. */
  showPlayButton?: boolean;
  /** Called when the tile is pressed — open your video player / navigate here. */
  onPress?: () => void;
  /** Replace the built-in play button with your own node. */
  renderPlayButton?: () => React.ReactNode;
  playButtonColor?: string;
  playButtonBackgroundColor?: string;
  playButtonSize?: number;

  /** Appearance. */
  width?: number;
  height?: number;
  borderRadius?: number;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;

  /** Replace the default (empty) error state. */
  renderError?: () => React.ReactNode;

  /** Callbacks. */
  onThumbnail?: (thumb: Thumbnail) => void;
  onError?: (error: ThumbnailError) => void;

  accessibilityLabel?: string;
  testID?: string;
};

/**
 * A drop-in thumbnail tile: shows a server thumbnail if you have one, otherwise
 * generates one with `createThumbnail` (cached). Shimmer while loading, a
 * customizable play button, and `onPress` to open the video. Fully themeable;
 * zero extra dependencies. Works on iOS, Android, and Web.
 */
export function VideoThumbnail(props: VideoThumbnailProps) {
  const {
    videoUrl,
    serverThumbnail,
    timeStamp = 1000,
    format,
    maxWidth,
    maxHeight,
    headers,
    cacheName,
    isLoading = false,
    renderLoading,
    shimmerColors = ['#e2e8f0', '#f8fafc'] as const,
    shimmerDuration = 1200,
    showPlayButton = true,
    onPress,
    renderPlayButton,
    playButtonColor = '#ffffff',
    playButtonBackgroundColor = 'rgba(0,0,0,0.45)',
    playButtonSize = 56,
    width,
    height,
    borderRadius = 12,
    resizeMode = 'cover',
    backgroundColor = '#e2e8f0',
    style,
    imageStyle,
    renderError,
    onThumbnail,
    onError,
    accessibilityLabel,
    testID,
  } = props;

  const [generated, setGenerated] = React.useState<string | null>(null);
  const [generating, setGenerating] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    // Server already has a thumbnail → show it, generate nothing.
    if (serverThumbnail) {
      setGenerated(null);
      setFailed(false);
      return;
    }
    if (!videoUrl) return;

    let alive = true;
    setGenerating(true);
    setFailed(false);
    createThumbnail({
      url: videoUrl,
      timeStamp,
      format,
      maxWidth,
      maxHeight,
      headers,
      cacheName: cacheName ?? `vt-${stableKey(videoUrl)}-${timeStamp}`,
    })
      .then((thumb) => {
        if (!alive) return;
        setGenerated(thumb.path);
        onThumbnail?.(thumb);
      })
      .catch((e) => {
        if (!alive) return;
        setFailed(true);
        if (e instanceof ThumbnailError) onError?.(e);
      })
      .finally(() => {
        if (alive) setGenerating(false);
      });
    return () => {
      alive = false;
    };
    // Intentionally narrow deps: re-run only when the source/frame changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    videoUrl,
    serverThumbnail,
    timeStamp,
    format,
    maxWidth,
    maxHeight,
    cacheName,
  ]);

  const uri = serverThumbnail ?? generated;
  const loading = isLoading || generating;

  const containerStyle: StyleProp<ViewStyle> = [
    styles.container,
    { borderRadius, backgroundColor },
    width != null ? { width } : null,
    height != null ? { height } : null,
    style,
  ];

  let body: React.ReactNode = null;
  if (loading) {
    body = renderLoading ? (
      renderLoading()
    ) : (
      <Shimmer
        colors={shimmerColors}
        duration={shimmerDuration}
        borderRadius={borderRadius}
      />
    );
  } else if (failed || !uri) {
    body = renderError ? renderError() : null;
  } else {
    body = (
      <>
        <Image
          source={{ uri }}
          resizeMode={resizeMode}
          style={[styles.fill, { borderRadius }, imageStyle]}
        />
        {showPlayButton && onPress ? (
          <View style={styles.center} pointerEvents="none">
            {renderPlayButton ? (
              renderPlayButton()
            ) : (
              <PlayBadge
                size={playButtonSize}
                color={playButtonColor}
                backgroundColor={playButtonBackgroundColor}
              />
            )}
          </View>
        ) : null}
      </>
    );
  }

  if (onPress && !loading && uri) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? 'Play video'}
        testID={testID}
        style={containerStyle}
      >
        {body}
      </Pressable>
    );
  }

  return (
    <View
      style={containerStyle}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {body}
    </View>
  );
}

function Shimmer({
  colors,
  duration,
  borderRadius,
}: {
  colors: readonly [string, string];
  duration: number;
  borderRadius: number;
}) {
  const [w, setW] = React.useState(0);
  const progress = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [progress, duration]);

  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-w, w],
  });

  return (
    <View
      onLayout={onLayout}
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: colors[0], borderRadius, overflow: 'hidden' },
      ]}
    >
      {w > 0 ? (
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: w * 0.5,
            backgroundColor: colors[1],
            opacity: 0.55,
            transform: [{ translateX }, { skewX: '-18deg' }],
          }}
        />
      ) : null}
    </View>
  );
}

function PlayBadge({
  size,
  color,
  backgroundColor,
}: {
  size: number;
  color: string;
  backgroundColor: string;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: 0,
          height: 0,
          borderTopWidth: size * 0.22,
          borderBottomWidth: size * 0.22,
          borderLeftWidth: size * 0.34,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
          borderLeftColor: color,
          marginLeft: size * 0.08,
        }}
      />
    </View>
  );
}

/** Filesystem-safe stable key so the cache filename is deterministic. */
function stableKey(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) % 2147483647;
  }
  return h.toString(36);
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
