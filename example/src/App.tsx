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
import {
  createThumbnail,
  ThumbnailError,
  type Thumbnail,
} from 'react-native-nitro-thumbnail';
import { REMOTE_SAMPLE, resolveBundledSampleToFile } from './sample';
import { RecipeScreen } from './RecipeScreen';

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
    // 2000ms lands on the cliff/sunset shot in the bundled Sintel excerpt.
    () => generate(resolveBundledSampleToFile, 2000),
    [generate]
  );

  const runRemote = React.useCallback(
    () => generate(() => REMOTE_SAMPLE, 1000),
    [generate]
  );

  // Auto-run once on mount so the result is visible without interaction.
  React.useEffect(() => {
    run();
  }, [run]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🎬 react-native-nitro-thumbnail</Text>
          <Text style={styles.subtitle}>
            Video thumbnails for iOS, Android & Web — one API.
          </Text>
        </View>

        {/* Section 1 — the headless core function */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            1 · createThumbnail() — core API
          </Text>
          <Text style={styles.sectionDesc}>
            The headless function. Returns{' '}
            {'{ path, size, mime, width, height }'}.
          </Text>
          <View style={styles.row}>
            <View style={styles.btn}>
              <Button
                title={busy ? 'Working…' : 'Local file'}
                onPress={run}
                disabled={busy}
              />
            </View>
            <View style={styles.btn}>
              <Button
                title={busy ? 'Working…' : 'Remote URL'}
                onPress={runRemote}
                disabled={busy}
              />
            </View>
          </View>
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
        </View>

        {/* Section 2 — the shipped <VideoThumbnail> component */}
        <View style={styles.card}>
          <RecipeScreen />
        </View>

        <Text style={styles.platform}>platform: {Platform.OS}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  container: { paddingVertical: 16, gap: 16 },
  header: { paddingHorizontal: 16, gap: 4 },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { color: '#6b7280' },
  card: {
    marginHorizontal: 16,
    padding: 16,
    gap: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionDesc: { color: '#6b7280', fontSize: 13 },
  row: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1 },
  error: { color: '#dc2626' },
  result: { gap: 8, alignItems: 'center' },
  image: {
    width: '100%',
    height: 170,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    resizeMode: 'contain',
  },
  json: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: '#334155',
    alignSelf: 'stretch',
  },
  platform: { color: '#9ca3af', textAlign: 'center', paddingTop: 4 },
});
