import AVFoundation
import Foundation
import NitroModules

final class HybridThumbnail: HybridThumbnailSpec {
  func create(
    options: NativeThumbnailOptions
  ) throws -> Promise<NativeThumbnailResult> {
    return Promise.async {
      let (asset, isRemote) = try Self.makeAsset(options.url, headers: options.headers)

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
        let ns = error as NSError
        if isRemote && ns.domain == NSURLErrorDomain {
          throw Self.err(
            "REMOTE_FETCH_FAILED",
            "Could not fetch remote video: \(error.localizedDescription)")
        }
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

  /// Build an AVURLAsset for a local file path or a remote http(s) URL (with headers).
  /// Returns the asset and whether it is remote (for error-code mapping).
  private static func makeAsset(
    _ raw: String, headers: [String: String]?
  ) throws -> (AVURLAsset, Bool) {
    if raw.hasPrefix("http://") || raw.hasPrefix("https://") {
      guard let u = URL(string: raw) else {
        throw err("INVALID_URL", "Malformed URL: \(raw)")
      }
      var options: [String: Any] = [:]
      if let headers = headers, !headers.isEmpty {
        options["AVURLAssetHTTPHeaderFieldsKey"] = headers
      }
      return (AVURLAsset(url: u, options: options), true)
    }
    if raw.hasPrefix("file://"), let u = URL(string: raw) {
      guard FileManager.default.fileExists(atPath: u.path) else {
        throw err("FILE_NOT_FOUND", "No file at \(u.path)")
      }
      return (AVURLAsset(url: u), false)
    }
    if raw.hasPrefix("/") {
      guard FileManager.default.fileExists(atPath: raw) else {
        throw err("FILE_NOT_FOUND", "No file at \(raw)")
      }
      return (AVURLAsset(url: URL(fileURLWithPath: raw)), false)
    }
    throw err("INVALID_URL", "Unsupported URL: \(raw)")
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
