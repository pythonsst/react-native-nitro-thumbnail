import XCTest
@testable import NitroThumbnail // module name from nitro.json (iosModuleName)

final class ThumbnailEncoderTests: XCTestCase {
  func testTargetSizeFitsWithinBoundsPreservingAspect() {
    let s = ThumbnailEncoder.targetSize(
      natural: CGSize(width: 1920, height: 1080), maxWidth: 512, maxHeight: 512)
    XCTAssertEqual(s.width, 512, accuracy: 0.5)
    XCTAssertEqual(s.height, 288, accuracy: 1.0) // 1080 * (512/1920)
  }

  func testTargetSizeNeverUpscales() {
    let s = ThumbnailEncoder.targetSize(
      natural: CGSize(width: 100, height: 100), maxWidth: 512, maxHeight: 512)
    XCTAssertEqual(s.width, 100, accuracy: 0.5)
    XCTAssertEqual(s.height, 100, accuracy: 0.5)
  }

  func testEncodeProducesNonEmptyJpegAndPng() {
    let ctx = CGContext(
      data: nil, width: 4, height: 4, bitsPerComponent: 8,
      bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(),
      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    let img = ctx.makeImage()!
    XCTAssertNotNil(ThumbnailEncoder.encode(img, format: "jpeg", quality: 0.9))
    XCTAssertNotNil(ThumbnailEncoder.encode(img, format: "png", quality: 0.9))
    XCTAssertNil(ThumbnailEncoder.encode(img, format: "webp", quality: 0.9))
  }
}
