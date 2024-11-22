import { Platform, Notice } from "obsidian";

import PicGoUploader from "./picgo";
import PicGoCoreUploader from "./picgoCore";

import type ImageAutoUploadPlugin from "../main";
import type { Image } from "../types";

export function getUploader(uploader: string) {
  switch (uploader) {
    case "PicGo":
      return PicGoUploader;
    case "PicGo-Core":
      return PicGoCoreUploader;
    default:
      throw new Error("Invalid uploader");
  }
}

export class UploaderManager {
  uploader: PicGoUploader | PicGoCoreUploader;
  plugin: ImageAutoUploadPlugin;

  constructor(uploader: string, plugin: ImageAutoUploadPlugin) {
    this.plugin = plugin;
    const Uploader = getUploader(uploader);
    this.uploader = new Uploader(this.plugin);
  }

  async upload(fileList: Array<string> | Array<Image>) {
    if (Platform.isMobileApp && !this.plugin.settings.remoteServerMode) {
      new Notice("Mobile App must use remote server mode.");
      throw new Error("Mobile App must use remote server mode.");
    }

    return this.uploader.upload(fileList);
  }
  async uploadByClipboard(fileList?: FileList) {
    if (Platform.isMobileApp && !this.plugin.settings.remoteServerMode) {
      new Notice("Mobile App must use remote server mode.");
      throw new Error("Mobile App must use remote server mode.");
    }

    return this.uploader.uploadByClipboard(fileList);
  }
}

export type Uploader = PicGoUploader | PicGoCoreUploader;
export { PicGoUploader, PicGoCoreUploader };
