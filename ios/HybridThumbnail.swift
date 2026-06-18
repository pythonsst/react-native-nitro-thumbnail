import AVFoundation
import Foundation
import NitroModules

final class HybridThumbnail: HybridThumbnailSpec {
  func create(
    options: NativeThumbnailOptions
  ) throws -> Promise<NativeThumbnailResult> {
    return Promise.async {
      let url = try Self.resolveURL(options.url) // local only this plan
      let asset = AVURLAsset(url: url)

      let gen = AVAssetImageGenerator(asset: asset)
      gen.appliesPreferredTrackTransform = true
      gen.maximumSize = CGSize(width: options.maxWidth, height: options.maxHeight)
      let tol = CMTime(value: CMTimeValue(options.timeToleranceMs), timescale: 1000)
      gen.requestedTimeToleranceBefore = tol
      gen.requestedTimeToleranceAfter = tol

      let time = CMTime(value: CMTimeValue(options.timeStamp), timescale: 1000)
      let cg: CGImage
      do {
        cg = try gen.copyCGImage(at: time, actualTime: nil)
      } catch {
        throw Self.err(
          "DECODE_FAILED",
          "Could not extract frame: \(error.localizedDescription)")
      }

      guard
        let data = ThumbnailEncoder.encode(
          cg, format: options.format, quality: options.quality)
      else {
        throw Self.err("UNSUPPORTED_FORMAT", "Cannot encode as \(options.format)")
      }

      let outURL = try Self.outputURL(
        format: options.format, cacheName: options.cacheName)
      do {
        try data.write(to: outURL, options: .atomic)
      } catch {
        throw Self.err("WRITE_FAILED", error.localizedDescription)
      }

      return NativeThumbnailResult(
        path: outURL.absoluteString,
        size: Double(data.count),
        mime: options.format == "png" ? "image/png" : "image/jpeg",
        width: Double(cg.width),
        height: Double(cg.height))
    }
  }

  // MARK: helpers

  /// Nitro surfaces only the error *message* string to JS, so encode the typed
  /// code as a leading `[CODE] message` prefix that `toThumbnailError` parses.
  private static func err(_ code: String, _ message: String) -> RuntimeError {
    return RuntimeError("[\(code)] \(message)")
  }

  private static func resolveURL(_ raw: String) throws -> URL {
    if raw.hasPrefix("file://"), let u = URL(string: raw) {
      guard FileManager.default.fileExists(atPath: u.path) else {
        throw err("FILE_NOT_FOUND", "No file at \(u.path)")
      }
      return u
    }
    if raw.hasPrefix("/") {
      guard FileManager.default.fileExists(atPath: raw) else {
        throw err("FILE_NOT_FOUND", "No file at \(raw)")
      }
      return URL(fileURLWithPath: raw)
    }
    // remote (http/https) handled in a later plan
    throw err(
      "INVALID_URL",
      "Only local file URLs are supported in this build: \(raw)")
  }

  private static func outputURL(format: String, cacheName: String?) throws -> URL {
    let dir = FileManager.default
      .urls(for: .cachesDirectory, in: .userDomainMask)[0]
      .appendingPathComponent("thumbnails", isDirectory: true)
    try FileManager.default.createDirectory(
      at: dir, withIntermediateDirectories: true)
    let ext = format == "png" ? "png" : "jpg"
    let base =
      cacheName?.isEmpty == false ? cacheName! : "thumb-\(UUID().uuidString)"
    return dir.appendingPathComponent("\(base).\(ext)")
  }
}
