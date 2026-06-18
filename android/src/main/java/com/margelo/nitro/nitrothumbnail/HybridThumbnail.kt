package com.margelo.nitro.nitrothumbnail

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import java.io.File
import java.util.UUID

@DoNotStrip
class HybridThumbnail : HybridThumbnailSpec() {
  override fun create(options: NativeThumbnailOptions): Promise<NativeThumbnailResult> {
    return Promise.async {
      // cacheName dedup: if a thumbnail with this name already exists, return it.
      if (!options.cacheName.isNullOrEmpty()) {
        val candidate = outputFile(options.format, options.cacheName)
        existingResult(candidate, options.format)?.let { return@async it }
      }

      val retriever = MediaMetadataRetriever()
      try {
        setSource(retriever, options.url, options.headers)

        val maxW = options.maxWidth.toInt()
        val maxH = options.maxHeight.toInt()
        val timeUs = (options.timeStamp * 1000L).toLong() // ms -> microseconds
        val sync = if (options.onlySyncedFrames)
          MediaMetadataRetriever.OPTION_CLOSEST_SYNC
        else
          MediaMetadataRetriever.OPTION_CLOSEST

        val frame: Bitmap = extractFrame(retriever, timeUs, sync, maxW, maxH)
          ?: throw err("DECODE_FAILED", "Could not extract a frame at ${options.timeStamp}ms")

        val bytes = ThumbnailEncoderKt.encode(frame, options.format, options.quality)
          ?: throw err("UNSUPPORTED_FORMAT", "Cannot encode as ${options.format}")

        val out = outputFile(options.format, options.cacheName)
        try {
          out.writeBytes(bytes)
        } catch (e: Exception) {
          throw err("WRITE_FAILED", e.message ?: "write failed")
        }

        enforceLimit(out.parentFile, (options.dirSize * 1024 * 1024).toLong())

        NativeThumbnailResult(
          path = Uri.fromFile(out).toString(),
          size = bytes.size.toDouble(),
          mime = ThumbnailEncoderKt.mimeFor(options.format),
          width = frame.width.toDouble(),
          height = frame.height.toDouble(),
        )
      } finally {
        retriever.release()
      }
    }
  }

  // MARK: helpers

  /** Nitro surfaces only the error message to JS, so encode the code as a "[CODE] message" prefix. */
  private fun err(code: String, message: String) = RuntimeException("[$code] $message")

  /** Point the retriever at a local file or a remote http(s) URL (with headers). */
  private fun setSource(
    retriever: MediaMetadataRetriever,
    raw: String,
    headers: Map<String, String>?,
  ) {
    when {
      raw.startsWith("http://") || raw.startsWith("https://") -> {
        try {
          retriever.setDataSource(raw, headers ?: emptyMap())
        } catch (e: Exception) {
          throw err("REMOTE_FETCH_FAILED", "Could not fetch remote video: ${e.message}")
        }
      }
      else -> {
        val path = when {
          raw.startsWith("file://") -> Uri.parse(raw).path ?: raw.removePrefix("file://")
          raw.startsWith("/") -> raw
          else -> throw err("INVALID_URL", "Unsupported URL: $raw")
        }
        val file = File(path)
        if (!file.exists()) throw err("FILE_NOT_FOUND", "No file at $path")
        try {
          retriever.setDataSource(file.absolutePath)
        } catch (e: Exception) {
          throw err("DECODE_FAILED", "Could not open video: ${e.message}")
        }
      }
    }
  }

  private fun extractFrame(
    retriever: MediaMetadataRetriever,
    timeUs: Long,
    option: Int,
    maxW: Int,
    maxH: Int,
  ): Bitmap? {
    if (Build.VERSION.SDK_INT >= 27) {
      retriever.getScaledFrameAtTime(timeUs, option, maxW, maxH)?.let { return it }
    }
    // Pre-27 (or null result): full frame then scale down preserving aspect.
    val full = retriever.getFrameAtTime(timeUs, option) ?: return null
    val (w, h) = ThumbnailEncoderKt.targetSize(full.width, full.height, maxW, maxH)
    if (w == full.width && h == full.height) return full
    val scaled = Bitmap.createScaledBitmap(full, w.coerceAtLeast(1), h.coerceAtLeast(1), true)
    if (scaled != full) full.recycle()
    return scaled
  }

  private fun outputFile(format: String, cacheName: String?): File {
    val ctx = NitroModules.applicationContext
      ?: throw err("WRITE_FAILED", "No Android context available")
    val dir = File(ctx.cacheDir, "thumbnails").apply { mkdirs() }
    val ext = if (format == "png") "png" else "jpg"
    val base = if (!cacheName.isNullOrEmpty()) cacheName else "thumb-${UUID.randomUUID()}"
    return File(dir, "$base.$ext")
  }

  /** Read an existing thumbnail's metadata (for cacheName dedup), or null. */
  private fun existingResult(file: File, format: String): NativeThumbnailResult? {
    if (!file.exists()) return null
    val opts = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeFile(file.absolutePath, opts)
    if (opts.outWidth <= 0 || opts.outHeight <= 0) return null
    return NativeThumbnailResult(
      path = Uri.fromFile(file).toString(),
      size = file.length().toDouble(),
      mime = ThumbnailEncoderKt.mimeFor(format),
      width = opts.outWidth.toDouble(),
      height = opts.outHeight.toDouble(),
    )
  }

  /** Enforce the dirSize cap via LRU eviction of the thumbnails directory. */
  private fun enforceLimit(dir: File?, capBytes: Long) {
    if (dir == null || capBytes <= 0) return
    val files = dir.listFiles() ?: return
    val entries = files.filter { it.isFile }
      .map { Triple(it.absolutePath, it.length(), it.lastModified()) }
    for (path in ThumbnailEncoderKt.filesToEvict(entries, capBytes)) {
      File(path).delete()
    }
  }
}
