---
title: Changelog
updated: 2026-04-19
status: current
---

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Removed 33 unused dependencies (~40% reduction); shadcn-init bloat cleanup. See commit 4ba3319.
- Canceled Expo/R3F migration (PR #22) — staying on Capacitor + BabylonJS.

### Added
- `docs/PERF_AUDIT.md` — evidence-based performance audit concluding Babylon is not the perf bottleneck; usage patterns are.

## [0.1.0] - 2026-01-01

### Added
- Initial release.
