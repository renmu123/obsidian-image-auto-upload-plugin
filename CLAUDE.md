# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
pnpm dev          # Watch mode with rollup
pnpm build        # Typecheck + build (outputs to dist/)
pnpm typecheck    # TypeScript check only
pnpm test         # Run tests with vitest
```

## Architecture

This is an Obsidian plugin that auto-uploads images to image hosting services (PicGo/PicList/PicGo-Core).

### Core Modules

- **main.ts** - Plugin entry point, registers commands and event handlers (paste, drop, context menu)
- **uploader.ts** - Two uploader implementations:
  - `PicGoUploader` - HTTP-based upload to PicGo/PicList server
  - `PicGoCoreUploader` - CLI-based upload via picgo-core command
- **helper.ts** - Editor utilities and image link parsing (regex-based extraction of markdown/wiki image links)
- **setting.ts** - Plugin settings UI and `PluginSettings` interface
- **deleter.ts** - Image deletion via PicList API
- **download.ts** - Download remote images to local

### Key Patterns

- Uploader is selected at load time based on `settings.uploader` ("PicGo" or "PicGo-Core")
- `remoteServerMode` enables FormData upload instead of JSON body (for remote PicList servers)
- Frontmatter `image-auto-upload: false` disables auto-upload per file
- Image link regex in helper.ts handles both `![](path)` and `![[wiki]]` formats

### i18n

Translations in `src/lang/locale/`. Use `t("key")` from `src/lang/helpers.ts`.
