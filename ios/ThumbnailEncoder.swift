import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

/// Pure, side-effect-free helpers for sizing and encoding thumbnails.
/// Kept separate from the Nitro HybridObject so they can be unit-tested in
/// isolation.
enum ThumbnailEncoder {
  /// Aspect-fit `natural` inside `maxWidth` x `maxHeight`, never upscaling.
  static func targetSize(
    natural: CGSize, maxWidth: Double, maxHeight: Double
  ) -> CGSize {
    guard natural.width > 0, natural.height > 0 else { return natural }
    let scale = min(
      maxWidth / Double(natural.width),
      maxHeight / Double(natural.height),
      1.0) // never upscale
    return CGSize(
      width: Double(natural.width) * scale,
      height: Double(natural.height) * scale)
  }

  /// Encode a CGImage to JPEG or PNG data. Returns nil for unsupported formats.
  static func encode(_ image: CGImage, format: String, quality: Double) -> Data? {
    let isPng = format == "png"
    guard isPng || format == "jpeg" else { return nil }
    let uti: CFString = (isPng ? UTType.png.identifier : UTType.jpeg.identifier)
      as CFString
    let data = NSMutableData()
    guard
      let dest = CGImageDestinationCreateWithData(data, uti, 1, nil)
    else { return nil }
    let props: [CFString: Any] =
      isPng ? [:] : [kCGImageDestinationLossyCompressionQuality: quality]
    CGImageDestinationAddImage(dest, image, props as CFDictionary)
    return CGImageDestinationFinalize(dest) ? (data as Data) : nil
  }
}
