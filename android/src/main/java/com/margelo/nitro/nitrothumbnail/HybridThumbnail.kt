package com.margelo.nitro.nitrothumbnail

import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.Promise

/**
 * Android implementation of the Thumbnail HybridObject.
 *
 * Android thumbnail generation is implemented in a later plan (M2). This stub
 * keeps the package building and registering on Android; calling `create`
 * rejects with a clear "not implemented yet" error that the JS layer maps to a
 * `ThumbnailError`.
 */
@DoNotStrip
class HybridThumbnail : HybridThumbnailSpec() {
  override fun create(options: NativeThumbnailOptions): Promise<NativeThumbnailResult> {
    return Promise.rejected(
      RuntimeException(
        "createThumbnail is not yet implemented on Android (coming in a later release)"
      )
    )
  }
}
