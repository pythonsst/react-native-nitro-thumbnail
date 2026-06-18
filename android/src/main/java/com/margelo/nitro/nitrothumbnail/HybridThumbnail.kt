package com.margelo.nitro.nitrothumbnail

import android.graphics.Bitmap
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
      val file = resolveLocalFile(options.url) // local only this plan
      val retriever = MediaMetadataRetriever()
      try {
        try {
          retriever.setDataSource(file.absolutePath)
        } catch (e: Exception) {
          throw err("DECODE_FAILED", "Could not open video: ${e.message}")
        }

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

  private fun resolveLocalFile(raw: String): File {
    val path = when {
      raw.startsWith("file://") -> Uri.parse(raw).path ?: raw.removePrefix("file://")
      raw.startsWith("/") -> raw
      raw.startsWith("http://") || raw.startsWith("https://") ->
        throw err("INVALID_URL", "Only local file URLs are supported in this build: $raw")
      else -> throw err("INVALID_URL", "Unsupported URL: $raw")
    }
    val file = File(path)
    if (!file.exists()) throw err("FILE_NOT_FOUND", "No file at $path")
    return file
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
}
