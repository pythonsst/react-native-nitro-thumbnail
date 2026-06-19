import * as React from 'react';
import { View, Text, Button, Alert, StyleSheet } from 'react-native';
import { VideoThumbnail } from 'react-native-nitro-thumbnail';
import {
  REMOTE_SAMPLE,
  SERVER_THUMBNAIL,
  BAD_VIDEO,
  resolveBundledSampleToFile,
} from './sample';

/**
 * Showcase for the shipped <VideoThumbnail>: server-first, shimmer while
 * loading, a customizable play button, and onPress to open the video.
 */
export function RecipeScreen() {
  const [localUri, setLocalUri] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    resolveBundledSampleToFile()
      .then(setLocalUri)
      .catch(() => setLocalUri(null));
  }, []);

  const open = (label: string) =>
    Alert.alert('Play', `Open your video player here → ${label}`);

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{'<VideoThumbnail>'} — shimmer + play</Text>
      <Text style={styles.intro}>
        Server thumbnail if you have one, else it generates. Tap the play button
        to open your player. Toggle the shimmer below.
      </Text>

      <Button
        title={loading ? 'Stop shimmer' : 'Show loading shimmer'}
        onPress={() => setLoading((v) => !v)}
      />

      <Case
        title="1 · Server has a thumbnail"
        desc="serverThumbnail is shown directly — nothing is generated."
      >
        <VideoThumbnail
          width={150}
          height={84}
          videoUrl={REMOTE_SAMPLE}
          serverThumbnail={SERVER_THUMBNAIL}
          isLoading={loading}
          onPress={() => open('server thumbnail')}
        />
      </Case>

      <Case
        title="2 · No server thumbnail (remote)"
        desc="Generated from the remote video, then cached."
      >
        <VideoThumbnail
          width={150}
          height={84}
          videoUrl={REMOTE_SAMPLE}
          timeStamp={1000}
          isLoading={loading}
          onPress={() => open('remote video')}
        />
      </Case>

      <Case
        title="3 · No server thumbnail (local file)"
        desc="Same fallback from a local file:// video, with custom play color."
      >
        <VideoThumbnail
          width={150}
          height={84}
          videoUrl={localUri}
          timeStamp={2000}
          isLoading={loading}
          playButtonColor="#e0218a"
          onPress={() => open('local video')}
        />
      </Case>

      <Case
        title="4 · Generation fails"
        desc="A broken URL → graceful empty state, no crash."
      >
        <VideoThumbnail
          width={150}
          height={84}
          videoUrl={BAD_VIDEO}
          isLoading={loading}
          onPress={() => open('(never — failed)')}
        />
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
