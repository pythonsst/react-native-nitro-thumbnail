import * as React from 'react';
import {
  Image,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  type TextStyle,
} from 'react-native';
import { createThumbnail, ThumbnailError } from 'react-native-nitro-thumbnail';

export type VideoThumbnailProps = {
  /** The video to generate from when there's no server thumbnail. */
  videoUrl?: string | null;
  /** A thumbnail URL your API already returns. If set, we show it and do NOT generate. */
  serverThumbnail?: string | null;
  /** Where to grab the frame (ms) when we must generate. */
  timeStamp?: number;
  width?: number;
  height?: number;
};

type Source = 'server' | 'generated' | 'pending' | 'failed';

/**
 * Server-first thumbnail.
 *
 *   1. If `serverThumbnail` is provided  → show it, never touch the decoder.
 *   2. Otherwise                         → generate one with createThumbnail()
 *      (cached by a stable `cacheName`, so it only decodes once).
 *   3. On failure                        → show a placeholder, never crash.
 */
export function VideoThumbnail({
  videoUrl,
  serverThumbnail,
  timeStamp = 1000,
  width = 160,
  height = 90,
}: VideoThumbnailProps) {
  const [generated, setGenerated] = React.useState<string | null>(null);
  const [source, setSource] = React.useState<Source>('pending');

  React.useEffect(() => {
    // ── Case 1: the server already has a thumbnail → use it, generate nothing.
    if (serverThumbnail) {
      setSource('server');
      return;
    }
    // ── Case 2: no server thumbnail → generate as a fallback.
    if (!videoUrl) {
      setSource('failed');
      return;
    }
    let alive = true;
    setSource('pending');
    createThumbnail({
      url: videoUrl,
      timeStamp,
      cacheName: `vt-${stableKey(videoUrl)}-${timeStamp}`, // decode once, reuse forever
    })
      .then((thumb) => {
        if (!alive) return;
        setGenerated(thumb.path);
        setSource('generated');
      })
      .catch((e) => {
        if (alive) setSource('failed');
        if (e instanceof ThumbnailError) {
          console.warn(`thumbnail failed [${e.code}]: ${e.message}`);
        }
      });
    return () => {
      alive = false;
    };
  }, [videoUrl, serverThumbnail, timeStamp]);

  const uri = serverThumbnail ?? generated;
  const box = { width, height };

  return (
    <View>
      {uri ? (
        <Image source={{ uri }} style={[styles.thumb, box]} />
      ) : (
        <View style={[styles.thumb, styles.center, box]}>
          {source === 'pending' ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.placeholder}>⚠️</Text>
          )}
        </View>
      )}
      <Text style={[styles.badge, BADGE_STYLE[source]]}>{BADGE_TEXT[source]}</Text>
    </View>
  );
}

const BADGE_TEXT: Record<Source, string> = {
  server: '🟢 from server',
  generated: '🔵 generated',
  pending: '⏳ generating…',
  failed: '🔴 failed (placeholder)',
};

const BADGE_STYLE: Record<Source, TextStyle> = {
  server: { color: '#16a34a' },
  generated: { color: '#2563eb' },
  pending: { color: '#6b7280' },
  failed: { color: '#dc2626' },
};

/** Filesystem-safe stable key so the cache filename is deterministic. */
function stableKey(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

const styles = StyleSheet.create({
  thumb: { borderRadius: 8, backgroundColor: '#e5e7eb' },
  center: { alignItems: 'center', justifyContent: 'center' },
  placeholder: { fontSize: 22 },
  badge: { marginTop: 4, fontSize: 12, fontWeight: '600', textAlign: 'center' },
});
