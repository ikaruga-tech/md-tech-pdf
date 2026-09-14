# Local Images Test Document

This document verifies local image preview and resource resolution behavior across VS Code Preview and PDF export.

## Relative PNG Image

![Sample PNG](./assets/sample.png)

## Relative SVG Image

![Sample SVG](./assets/sample.svg)

## Japanese Filename Image

![Japanese Image](./assets/日本語画像.png)

## Remote HTTPS Image

![GitHub Logo](https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png)

## Inline Data URI Image

![Data URI Dot](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==)

## Missing Image (Non-fatal Fallback)

![Missing Image](./assets/not-found.png)

## Raw HTML Image with Attributes

<img src="./assets/sample.png" width="80" height="80" alt="HTML Sample PNG">
