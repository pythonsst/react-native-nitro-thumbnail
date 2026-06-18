package com.margelo.nitro.nitrothumbnail

import org.junit.Assert.assertEquals
import org.junit.Test

class ThumbnailEvictionTest {
  @Test fun underCapEvictsNothing() {
    val entries = listOf(Triple("a", 10L, 1L), Triple("b", 20L, 2L))
    assertEquals(emptyList<String>(), ThumbnailEncoderKt.filesToEvict(entries, 100L))
  }

  @Test fun overCapEvictsOldestFirst() {
    val entries = listOf(
      Triple("a", 20L, 1L), // oldest
      Triple("b", 20L, 2L),
      Triple("c", 20L, 3L), // newest
    )
    // total 60, cap 25 -> drop a (40) -> drop b (20 <= 25) -> keep c
    assertEquals(listOf("a", "b"), ThumbnailEncoderKt.filesToEvict(entries, 25L))
  }

  @Test fun exactlyAtCapEvictsNothing() {
    val entries = listOf(Triple("a", 50L, 1L), Triple("b", 50L, 2L))
    assertEquals(emptyList<String>(), ThumbnailEncoderKt.filesToEvict(entries, 100L))
  }
}
