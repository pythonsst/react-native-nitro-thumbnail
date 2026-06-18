package com.margelo.nitro.nitrothumbnail
  
import com.facebook.proguard.annotations.DoNotStrip

@DoNotStrip
class NitroThumbnail : HybridNitroThumbnailSpec() {
  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }
}
