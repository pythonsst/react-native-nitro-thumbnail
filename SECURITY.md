# Security Policy

## Supported versions

This library is pre-1.0; security fixes are applied to the **latest** published version.
Please always test against the most recent release before reporting.

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a vulnerability

Please **do not** open a public issue for security vulnerabilities.

Instead, use GitHub's private reporting:
[**Report a vulnerability**](https://github.com/pythonsst/react-native-nitro-thumbnail/security/advisories/new).

If that's unavailable, email the maintainer at **shiv@cuepilot.ai** with:

- a description of the issue and its impact,
- steps to reproduce (a minimal repro is ideal),
- the version and platform(s) affected.

You can expect an initial acknowledgement within a few days. Once a fix is ready, we'll
coordinate a release and credit you (unless you prefer to remain anonymous).

## Scope

This is a thumbnail-generation library. The most relevant areas are how it handles
untrusted `url`s, custom `headers`, and writes to the app cache directory. Reports about
those paths are especially welcome.
