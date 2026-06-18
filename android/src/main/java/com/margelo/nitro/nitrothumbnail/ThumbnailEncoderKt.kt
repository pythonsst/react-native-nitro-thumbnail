package com.margelo.nitro.nitrothumbnail

import android.graphics.Bitmap
import java.io.ByteArrayOutputStream
import kotlin.math.roundToInt

/** Pure sizing/encoding helpers, kept separate from the HybridObject for unit testing. */
object ThumbnailEncoderKt {
  /** Aspect-fit (naturalW, naturalH) inside (maxW, maxH), never upscaling. */
  fun targetSize(naturalW: Int, naturalH: Int, maxW: Int, maxH: Int): Pair<Int, Int> {
    if (naturalW <= 0 || naturalH <= 0) return naturalW to naturalH
    val scale = minOf(
      maxW.toDouble() / naturalW,
      maxH.toDouble() / naturalH,
      1.0, // never upscale
    )
    return (naturalW * scale).roundToInt() to (naturalH * scale).roundToInt()
  }

  fun mimeFor(format: String): String = if (format == "png") "image/png" else "image/jpeg"

  /** Encode a Bitmap to PNG or JPEG bytes. Returns null for unsupported formats. */
  fun encode(bitmap: Bitmap, format: String, quality: Double): ByteArray? {
    val fmt = when (format) {
      "png" -> Bitmap.CompressFormat.PNG
      "jpeg" -> Bitmap.CompressFormat.JPEG
      else -> return null
    }
    val q = (quality * 100).roundToInt().coerceIn(0, 100)
    val out = ByteArrayOutputStream()
    return if (bitmap.compress(fmt, q, out)) out.toByteArray() else null
  }
}
