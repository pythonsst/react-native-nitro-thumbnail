package com.margelo.nitro.nitrothumbnail

import org.junit.Assert.assertEquals
import org.junit.Test

class ThumbnailSizeTest {
  @Test fun fitsWithinBoundsPreservingAspect() {
    val (w, h) = ThumbnailEncoderKt.targetSize(1920, 1080, 512, 512)
    assertEquals(512, w)
    assertEquals(288, h) // 1080 * (512/1920)
  }

  @Test fun neverUpscales() {
    val (w, h) = ThumbnailEncoderKt.targetSize(100, 100, 512, 512)
    assertEquals(100, w)
    assertEquals(100, h)
  }

  @Test fun mimeMapping() {
    assertEquals("image/png", ThumbnailEncoderKt.mimeFor("png"))
    assertEquals("image/jpeg", ThumbnailEncoderKt.mimeFor("jpeg"))
  }
}
