import * as React from 'react';
import {
  SafeAreaView,
  ScrollView,
  Button,
  Image,
  Text,
  View,
  StyleSheet,
  Platform,
} from 'react-native';
import * as RNFS from '@dr.pogodin/react-native-fs';
import {
  createThumbnail,
  ThumbnailError,
  type Thumbnail,
} from 'react-native-nitro-thumbnail';

// Bundled test clip (3s, 640x360). Metro serves it over http in dev and copies
// it into the app bundle in release builds.
const SAMPLE = require('../assets/sample.mp4');

// A public remote video to demo streaming-thumbnail extraction (no download step).
const REMOTE_SAMPLE = 'https://media.w3.org/2010/05/sintel/trailer.mp4';

/**
 * createThumbnail only supports local files in this build, so resolve the
 * bundled asset to a real on-device `file://` path first.
 */
async function resolveBundledSampleToFile(): Promise<string> {
  const dest = `${RNFS.CachesDirectoryPath}/sample.mp4`;
  const src = Image.resolveAssetSource(SAMPLE);
  if (src?.uri?.startsWith('http')) {
    // Dev: Metro serves the asset over http — download it to a local file.
    await RNFS.downloadFile({ fromUrl: src.uri, toFile: dest }).promise;
  } else if (src?.uri) {
    // Release: the asset is already a local path/bundle resource — copy it.
    const from = src.uri.replace(/^file:\/\//, '');
    if (from !== dest) {
      if (await RNFS.exists(dest)) await RNFS.unlink(dest);
      await RNFS.copyFile(from, dest);
    }
  }
  return `file://${dest}`;
}

export default function App() {
  const [thumb, setThumb] = React.useState<Thumbnail | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const generate = React.useCallback(
    async (resolveUrl: () => Promise<string> | string, timeStamp: number) => {
      setBusy(true);
      setErr(null);
      setThumb(null);
      try {
        const url = await resolveUrl();
        const result = await createThumbnail({ url, timeStamp });
        setThumb(result);
      } catch (e) {
        const te = e as ThumbnailError;
        setErr(`${te.code ?? 'ERR'}: ${te.message}`);
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const run = React.useCallback(
    () => generate(resolveBundledSampleToFile, 1000),
    [generate]
  );

  const runRemote = React.useCallback(
    () => generate(() => REMOTE_SAMPLE, 2000),
    [generate]
  );

  // Auto-run once on mount so the result is visible without interaction.
  React.useEffect(() => {
    run();
  }, [run]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>react-native-nitro-thumbnail</Text>
        <Button
          title={busy ? 'Working…' : 'Create thumbnail (local)'}
          onPress={run}
          disabled={busy}
        />
        <Button
          title={busy ? 'Working…' : 'Create thumbnail (remote)'}
          onPress={runRemote}
          disabled={busy}
        />
        {err && (
          <Text testID="error" style={styles.error}>
            {err}
          </Text>
        )}
        {thumb && (
          <View style={styles.result}>
            <Image
              testID="thumb"
              source={{ uri: thumb.path }}
              style={styles.image}
            />
            <Text testID="json" style={styles.json}>
              {JSON.stringify(thumb, null, 2)}
            </Text>
          </View>
        )}
        <Text style={styles.platform}>platform: {Platform.OS}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 16, gap: 12, alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '600' },
  error: { color: 'red' },
  result: { alignItems: 'center', gap: 8 },
  image: {
    width: 256,
    height: 144,
    backgroundColor: '#eee',
    resizeMode: 'contain',
  },
  json: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  platform: { color: '#888' },
});
