import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { VideoThumbnail } from './VideoThumbnail';
import {
  REMOTE_SAMPLE,
  SERVER_THUMBNAIL,
  BAD_VIDEO,
  resolveBundledSampleToFile,
} from './sample';

/**
 * "Server thumbnail first" recipe — shows every case side by side so you can
 * see exactly when createThumbnail() runs (and when it doesn't).
 */
export function RecipeScreen() {
  // The local case needs a real on-device file:// path; resolve it once.
  const [localUri, setLocalUri] = React.useState<string | null>(null);
  React.useEffect(() => {
    resolveBundledSampleToFile().then(setLocalUri).catch(() => setLocalUri(null));
  }, []);

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Recipe: server thumbnail first</Text>
      <Text style={styles.intro}>
        Pass <Text style={styles.code}>serverThumbnail</Text> when your API already has
        one — the library generates nothing. Leave it empty and it falls back to{' '}
        <Text style={styles.code}>createThumbnail()</Text>.
      </Text>

      <Case
        title="1 · Server has a thumbnail"
        desc="serverThumbnail is set → shown directly, createThumbnail() never runs."
      >
        <VideoThumbnail videoUrl={REMOTE_SAMPLE} serverThumbnail={SERVER_THUMBNAIL} />
      </Case>

      <Case
        title="2 · No server thumbnail (remote video)"
        desc="serverThumbnail is empty → generated from the remote video, then cached."
      >
        <VideoThumbnail videoUrl={REMOTE_SAMPLE} serverThumbnail={null} timeStamp={1000} />
      </Case>

      <Case
        title="3 · No server thumbnail (local file)"
        desc="Same fallback, from a local file:// video."
      >
        <VideoThumbnail videoUrl={localUri} serverThumbnail={null} timeStamp={2000} />
      </Case>

      <Case
        title="4 · Generation fails"
        desc="A broken URL → graceful placeholder, no crash."
      >
        <VideoThumbnail videoUrl={BAD_VIDEO} serverThumbnail={null} />
      </Case>
    </View>
  );
}

function Case({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.case}>
      <View style={styles.caseText}>
        <Text style={styles.caseTitle}>{title}</Text>
        <Text style={styles.caseDesc}>{desc}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { width: '100%', paddingHorizontal: 16, gap: 12 },
  heading: { fontSize: 16, fontWeight: '700' },
  intro: { color: '#374151', lineHeight: 20 },
  code: { fontFamily: 'monospace', color: '#e0218a' },
  case: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
  caseText: { flex: 1, gap: 2 },
  caseTitle: { fontWeight: '600' },
  caseDesc: { color: '#6b7280', fontSize: 13 },
});
