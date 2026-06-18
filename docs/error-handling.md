# Error Handling

> Every way a thumbnail can fail, and the small trick that turns an opaque native
> string into a typed `.code` you can `switch` on.

---

## The contract

`createThumbnail` **never rejects with a raw string or a plain `Error`**. Every
failure — whether it originated in JS validation, Swift, Kotlin, or the DOM — is
normalized into a single class:

```ts
class ThumbnailError extends Error {
  code: ThumbnailErrorCode; // one of seven known values
}
```

Because it extends the built-in `Error`, it works with everything that already
expects an `Error` (Sentry, `console.error`, `error.message`, stack traces). The
`.code` is the value-add: a stable, typed discriminant you can branch on without
string-matching messages that might change.

```ts
import { createThumbnail, ThumbnailError } from 'react-native-nitro-thumbnail';

try {
  const thumb = await createThumbnail({ url });
} catch (e) {
  if (e instanceof ThumbnailError) {
    console.warn(`thumbnail failed [${e.code}]: ${e.message}`);
  } else {
    throw e; // something unrelated — don't swallow it
  }
}
```

---

## The error codes

There are exactly **seven**. The union type is exported as `ThumbnailErrorCode`,
and the runtime list as `THUMBNAIL_ERROR_CODES`.

| Code | Raised when | Typical cause |
|---|---|---|
| `INVALID_URL` | `url` is empty/non-string, malformed, or an unsupported scheme. | Passing `undefined`, a `content://` URI, or a typo'd path. |
| `FILE_NOT_FOUND` | A local file path points at nothing. | Stale path, file deleted, wrong directory. |
| `REMOTE_FETCH_FAILED` | Network/HTTP failure fetching a remote video. | Offline, 401/403/404, bad headers, CORS (web). |
| `DECODE_FAILED` | The video opened but no frame could be extracted. | Corrupt file, unsupported codec, `timeStamp` past the end. |
| `UNSUPPORTED_FORMAT` | The requested output `format` can't be produced. | A `format` other than `'jpeg'`/`'png'`. |
| `WRITE_FAILED` | The encoded image couldn't be written to disk. | Disk full, permissions, no cache dir. |
| `UNKNOWN` | Anything that didn't match a known code. | Unexpected native error; inspect `.message`. |

`INVALID_URL` and `UNSUPPORTED_FORMAT` are caught **in TypeScript before any
native call** — the cheapest possible failure. The rest come from the native
decoders.

---

## How a native error becomes a typed code

This is the one genuinely non-obvious part of the library, and it's worth
understanding if you contribute native code.

**The problem:** Nitro marshals a thrown native error to JS as *just a message
string*. There is no structured error object, no `userInfo`, no `.code` field
that survives the crossing. A Swift `RuntimeError("disk full")` arrives in JS as
the string `"disk full"` — and that's all.

**The solution:** the native side **encodes the code into the message** as a
`[CODE] message` prefix, and the JS side parses it back out.

```mermaid
flowchart TD
    A["Native failure<br/>(Swift / Kotlin)"] --> B["err(code, message)<br/>throws RuntimeError(\"[CODE] message\")"]
    B --> C["Nitro / JSI<br/>marshals → message string only"]
    C --> D["createThumbnail catch<br/>toThumbnailError(e)"]
    D --> E{".code property<br/>present & known?"}
    E -->|yes| H["new ThumbnailError(code, message)"]
    E -->|no| F{"message matches<br/>^[CODE] …?"}
    F -->|yes, known code| G["strip prefix →<br/>code + clean message"]
    F -->|no match| I["code = UNKNOWN"]
    G --> H
    I --> H
    H --> J["reject(ThumbnailError)"]
```

### On the native side

Both platforms have a one-line helper that does the encoding:

```swift
// ios/HybridThumbnail.swift
private static func err(_ code: String, _ message: String) -> RuntimeError {
  return RuntimeError("[\(code)] \(message)")
}
```

```kotlin
// android/.../HybridThumbnail.kt
private fun err(code: String, message: String) =
  RuntimeException("[$code] $message")
```

So a missing remote video throws `RuntimeError("[REMOTE_FETCH_FAILED] Could not
fetch remote video: …")`.

### On the JS side

[`toThumbnailError`](../src/errors.ts) reverses it, with a small ladder of
fallbacks so it's robust to *how* the error arrives:

1. If it's **already a `ThumbnailError`**, return it untouched.
2. If the error object has a **known `.code` property**, trust it (covers any
   future bridge that surfaces structured errors, or a JS-side rejection).
3. Otherwise, **parse the message** with a regex that tolerates an optional
   `funcName:` wrapper some runtimes prepend:

   ```
   ^(?:[\w.]+:\s*)?\[([A-Z_]+)\]\s*([\s\S]*)$
   ```

   If the captured code is one of the seven known codes, use it and strip the
   prefix so `.message` is clean.
4. If nothing matches, the code is `UNKNOWN` and the full message is preserved.

The net effect: native code throws human-readable strings, and JS hands you a
clean `{ code, message }` — no matter which platform you're on.

> **Why not just map codes in JS?** Because the *origin* of the failure is in
> native code, where the context lives (which `NSError` domain, which exception).
> Encoding at the throw site keeps the mapping accurate; decoding in JS keeps the
> public type clean.

---

## Recommended handling pattern

Branch on the codes you can do something about, and treat the rest generically:

```ts
async function safeThumbnail(url: string): Promise<string | null> {
  try {
    const { path } = await createThumbnail({ url });
    return path;
  } catch (e) {
    if (!(e instanceof ThumbnailError)) throw e;

    switch (e.code) {
      case 'FILE_NOT_FOUND':
      case 'INVALID_URL':
        return null;               // nothing to retry — give up quietly

      case 'REMOTE_FETCH_FAILED':
        // transient — caller may retry with backoff
        throw e;

      case 'DECODE_FAILED':
      case 'UNSUPPORTED_FORMAT':
      case 'WRITE_FAILED':
      case 'UNKNOWN':
      default:
        reportToSentry(e);         // unexpected — observe it
        return null;
    }
  }
}
```

### Platform-specific origins

The same code can come from different places depending on platform — useful to
know when debugging:

| Code | iOS origin | Android origin | Web origin |
|---|---|---|---|
| `FILE_NOT_FOUND` | `FileManager.fileExists` is false | `File.exists()` is false | — (browsers use URLs) |
| `REMOTE_FETCH_FAILED` | `NSURLErrorDomain` from `AVFoundation` | `setDataSource(url, headers)` throws | `fetch` rejects or `!resp.ok` |
| `DECODE_FAILED` | `image(at:)` / `copyCGImage` throws | `getFrameAtTime` returns null, or `setDataSource` fails on a local file | `<video>` `onerror` |
| `WRITE_FAILED` | `Data.write` throws | `File.writeBytes` throws | `canvas.toBlob` returns null |

See the [platform guides](./platforms/) for exactly where each is thrown.
