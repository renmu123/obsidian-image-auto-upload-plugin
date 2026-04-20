<p align="center">
  <img src="docs/images/cover.png" alt="Image Auto Upload Cover" width="100%">
</p>

<h1 align="center">Image Auto Upload Plugin</h1>

<p align="center">
  <strong>Automatically upload images to your image hosting service from Obsidian</strong><br>
  <sub>Supports PicGo, PicList, and PicGo-Core | Desktop only</sub>
</p>

<p align="center">
  <a href="https://github.com/MarkShawn2020/obsidian-image-auto-upload-plugin/releases"><img src="https://img.shields.io/github/v/release/MarkShawn2020/obsidian-image-auto-upload-plugin" alt="Release"></a>
  <a href="https://github.com/MarkShawn2020/obsidian-image-auto-upload-plugin/blob/master/LICENSE"><img src="https://img.shields.io/github/license/MarkShawn2020/obsidian-image-auto-upload-plugin" alt="License"></a>
  <a href="https://github.com/MarkShawn2020/obsidian-image-auto-upload-plugin/stargazers"><img src="https://img.shields.io/github/stars/MarkShawn2020/obsidian-image-auto-upload-plugin" alt="Stars"></a>
</p>

<p align="center">
  <a href="#features">Features</a> &bull;
  <a href="#installation">Installation</a> &bull;
  <a href="#usage">Usage</a> &bull;
  <a href="#configuration">Configuration</a> &bull;
  <a href="readme-zh.md">中文文档</a>
</p>

---

## Features

- **Paste upload** - Automatically upload images when pasting from clipboard
- **Drag & drop upload** - Upload images by dragging files into the editor
- **Batch upload** - Upload all local images in a note with one command
- **Batch download** - Download all remote images to local storage
- **Context menu** - Right-click any image to upload it
- **Per-file control** - Disable auto-upload per file via `frontmatter`
- **Remote server mode** - Deploy PicList on a remote server for centralized uploads
- **PicGo-Core support** - CLI-based upload without the desktop app
- **Multiple formats** - PNG, JPG, JPEG, BMP, GIF, SVG, TIFF, WebP, AVIF, HEIC

## Installation

1. Open Obsidian **Settings** > **Community plugins** > **Browse**
2. Search for **Image auto upload**
3. Click **Install**, then **Enable**

### Uploader Setup

**Option A: PicGo / PicList (GUI app)**

1. Install [PicGo](https://github.com/Molunerfinn/PicGo) or [PicList](https://github.com/Kuingsmile/PicList)
2. Configure your image hosting service in the app
3. Enable the **Server** service and note the port number
4. In plugin settings, set the upload URL to `http://127.0.0.1:36677/upload`

**Option B: PicGo-Core (CLI)**

1. Install via npm: `npm install picgo -g`
2. Configure following the [PicGo-Core docs](https://picgo.github.io/PicGo-Core-Doc/)
3. In plugin settings, set **Default uploader** to `PicGo-Core`

## Usage

### Auto Upload on Paste

Simply paste an image — it uploads automatically and inserts the remote URL.

Disable per file with frontmatter:

```yaml
---
image-auto-upload: false
---
```

### Commands

Open the command palette (`Ctrl/Cmd + P`) and search for:

| Command | Description |
|---|---|
| **Upload all images** | Upload all local images in the current note |
| **Download all images** | Download all remote images to local storage |

### Context Menu

Right-click any image in editing mode to upload it individually. Supports both `![](path)` and `![[wiki]]` formats.

### Drag & Drop

Drag image files into the editor — they upload automatically (PicGo/PicList app only).

## Configuration

### PicList URL Parameters

With PicList (>= 2.5.3), you can specify picbed and config per vault:

```
http://127.0.0.1:36677/upload?picbed=smms&configName=piclist
```

### Remote Server Mode

Deploy [PicList](https://github.com/Kuingsmile/PicList) (>= 2.6.3) or [PicList-Core](https://github.com/Kuingsmile/PicList-Core) (>= 1.3.0) on a server and enable `remoteServerMode` in plugin settings. Uses FormData upload instead of JSON body.

> Note: Network image upload is not supported in remote server mode.

## Development

```bash
pnpm install     # Install dependencies
pnpm dev         # Watch mode
pnpm build       # Typecheck + build
pnpm test        # Run tests
```

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=MarkShawn2020/obsidian-image-auto-upload-plugin&type=Date)](https://star-history.com/#MarkShawn2020/obsidian-image-auto-upload-plugin&Date)

## Credits

- Original author: [renmu123](https://github.com/renmu123/obsidian-image-auto-upload-plugin)
- Inspired by [obsidian-imgur-plugin](https://github.com/gavvvr/obsidian-imgur-plugin)

## License

[MIT](LICENSE)
