# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_Nothing yet._

## [0.1.4] - 2026-06-19

### Added

- **`VideoThumbnail` component** — an optional, fully-customizable thumbnail tile:
  server-thumbnail-first, built-in shimmer while loading, a customizable play button, and
  an `onPress` callback to open your video player. Zero extra dependencies; works on iOS,
  Android, and Web.

### Changed

- Example app gained a runnable "server thumbnail first" showcase (all cases + shimmer
  toggle) and uses Big Buck Bunny for the remote demo (colorful from the first frame).
- Documentation site: SEO essentials (sitemap.xml, robots.txt, JSON-LD structured data).

## [0.1.3] - 2026-06-19

### Changed

- Metadata only: expanded npm `keywords`, added `engines.node`, and corrected the
  repository-owner metadata (package `author`). No runtime/API changes.

## [0.1.2] - 2026-06-19

### Added

- **Android:** support for `content://` URIs (gallery / image-picker videos) via
  `setDataSource(context, uri)`.

### Changed

- Redesigned the README (nav bar, architecture diagram, live-docs CTAs) and published the
  documentation site at <https://react-native-nitro-thumbnail.vercel.app>.

## [0.1.1] - 2026-06-18

### Changed

- Documentation overhaul: full `docs/` guide set, diagrams, and a playable demo in the
  README.

### Fixed

- npm-safe media URLs in the README so images render on npmjs.com.

## [0.1.0] - 2026-06-18

### Added

- Initial release. `createThumbnail(options)` extracts a thumbnail from a local or remote
  video on **iOS** (`AVAssetImageGenerator`), **Android** (`MediaMetadataRetriever`), and
  **Web** (`<video>` + `<canvas>`).
- Options: `url`, `timeStamp`, `format`, `maxWidth`, `maxHeight`, `quality`, `cacheName`,
  `dirSize`, `headers`, `timeToleranceMs`, `onlySyncedFrames`.
- Typed `ThumbnailError` with a `.code` for every failure mode.
- Built-in caching: deterministic `cacheName` dedup and `dirSize` LRU eviction.
- Drop-in compatibility with `react-native-create-thumbnail` (named + default export).

[Unreleased]: https://github.com/pythonsst/react-native-nitro-thumbnail/compare/v0.1.4...HEAD
[0.1.4]: https://github.com/pythonsst/react-native-nitro-thumbnail/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/pythonsst/react-native-nitro-thumbnail/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/pythonsst/react-native-nitro-thumbnail/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/pythonsst/react-native-nitro-thumbnail/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/pythonsst/react-native-nitro-thumbnail/releases/tag/v0.1.0
