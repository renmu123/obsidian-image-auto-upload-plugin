import { join, extname } from "path-browserify";

import { PluginSettings } from "./setting";
import { streamToString, getLastImage, bufferToArrayBuffer } from "./utils";
import { payloadGenerator } from "./payloadGenerator";
import {
  requestUrl,
  Platform,
  Notice,
  normalizePath,
  FileSystemAdapter,
} from "obsidian";

import type imageAutoUploadPlugin from "./main";
import type { Image } from "./types";

export interface PicGoResponse {
  msg: string;
  result: string[];
  fullResult: Record<string, any>[];
}

export class PicGoUploader {
  settings: PluginSettings;
  plugin: imageAutoUploadPlugin;

  constructor(settings: PluginSettings, plugin: imageAutoUploadPlugin) {
    this.settings = settings;
    this.plugin = plugin;
  }

  async uploadFiles(fileList: Array<Image | string>): Promise<any> {
    let response: any;
    let data: PicGoResponse;
    if (this.settings.remoteServerMode) {
      const files = [];
      for (let i = 0; i < fileList.length; i++) {
        if (typeof fileList[i] === "string") {
          const { readFile } = require("fs");
          const file = fileList[i] as string;

          const buffer: Buffer = await new Promise((resolve, reject) => {
            readFile(file, (err: any, data: any) => {
              if (err) {
                reject(err);
              }
              resolve(data);
            });
          });
          const arrayBuffer = bufferToArrayBuffer(buffer);
          files.push(new File([arrayBuffer], file));
        } else {
          const timestamp = new Date().getTime();
          const image = fileList[i] as Image;

          if (!image.file) continue;
          const arrayBuffer = await this.plugin.app.vault.adapter.readBinary(
            image.file.path
          );

          files.push(
            new File([arrayBuffer], timestamp + extname(image.file.path))
          );
        }
      }
      response = await this.uploadFileByData(files);
      data = await response.json;
    } else {
      const basePath = (
        this.plugin.app.vault.adapter as FileSystemAdapter
      ).getBasePath();

      const list = fileList.map(item => {
        if (typeof item === "string") {
          return item;
        } else {
          return normalizePath(join(basePath, item.path));
        }
      });
      if (Platform.isMobileApp) {
        new Notice("Mobile App must use remote server mode.");
        return;
      }
      response = await requestUrl({
        url: this.settings.uploadServer,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ list: list }),
      });
      data = await response.json;
    }

    // piclist
    if (data.fullResult) {
      const uploadUrlFullResultList = data.fullResult || [];
      this.settings.uploadedImages = [
        ...(this.settings.uploadedImages || []),
        ...uploadUrlFullResultList,
      ];
    }

    return data;
  }

  private async uploadFileByData(fileList: FileList | File[]): Promise<any> {
    const payload_data: {
      [key: string]: (string | Blob | ArrayBuffer | File)[];
    } = {
      list: [],
    };

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      payload_data["list"].push(file);
    }

    const [request_body, boundary_string] = await payloadGenerator(
      payload_data
    );

    const options = {
      method: "POST",
      url: this.settings.uploadServer,
      contentType: `multipart/form-data; boundary=----${boundary_string}`,
      body: request_body,
    };
    const response = await requestUrl(options);

    return response;
  }

  async uploadFileByClipboard(fileList?: FileList): Promise<any> {
    let data: PicGoResponse;
    let res: any;

    if (this.settings.remoteServerMode) {
      const files = [];
      for (let i = 0; i < fileList.length; i++) {
        const timestamp = new Date().getTime();

        const file = fileList[i];
        const arrayBuffer = await file.arrayBuffer();
        files.push(new File([arrayBuffer], timestamp + ".png"));
      }
      res = await this.uploadFileByData(files);
      data = await res.json;
    } else {
      if (Platform.isMobileApp) {
        new Notice("Mobile App must use remote server mode.");
        return;
      }
      res = await requestUrl({
        url: this.settings.uploadServer,
        method: "POST",
      });

      data = await res.json;
    }

    if (res.status !== 200) {
      return {
        code: -1,
        msg: data.msg,
        data: "",
      };
    }

    // piclist
    if (data.fullResult) {
      const uploadUrlFullResultList = data.fullResult || [];
      this.settings.uploadedImages = [
        ...(this.settings.uploadedImages || []),
        ...uploadUrlFullResultList,
      ];
      this.plugin.saveSettings();
    }

    return {
      code: 0,
      msg: "success",
      data: typeof data.result == "string" ? data.result : data.result[0],
    };
  }
}

export class PicGoCoreUploader {
  settings: PluginSettings;
  plugin: imageAutoUploadPlugin;

  constructor(settings: PluginSettings, plugin: imageAutoUploadPlugin) {
    this.settings = settings;
    this.plugin = plugin;
  }

  async uploadFiles(fileList: Array<Image> | Array<string>): Promise<any> {
    if (Platform.isMobileApp) {
      new Notice("Mobile App must use remote server mode.");
      return;
    }

    const basePath = (
      this.plugin.app.vault.adapter as FileSystemAdapter
    ).getBasePath();

    // TODO: path不是绝对路径，需要修改
    const list = fileList.map(item => {
      if (typeof item === "string") {
        return item;
      } else {
        return normalizePath(join(basePath, item.path));
      }
    });

    const length = list.length;
    let cli = this.settings.picgoCorePath || "picgo";
    let command = `${cli} upload ${list.map(item => `"${item}"`).join(" ")}`;

    const res = await this.exec(command);
    const splitList = res.split("\n");
    const splitListLength = splitList.length;

    const data = splitList.splice(splitListLength - 1 - length, length);

    if (res.includes("PicGo ERROR")) {
      console.log(command, res);

      return {
        success: false,
        msg: "失败",
      };
    } else {
      return {
        success: true,
        result: data,
      };
    }
    // {success:true,result:[]}
  }

  // PicGo-Core 上传处理
  async uploadFileByClipboard() {
    if (Platform.isMobileApp) {
      new Notice("Mobile App must use remote server mode.");
      return;
    }

    const res = await this.uploadByClip();
    const splitList = res.split("\n");
    const lastImage = getLastImage(splitList);

    if (lastImage) {
      return {
        code: 0,
        msg: "success",
        data: lastImage,
      };
    } else {
      console.log(splitList);

      // new Notice(`"Please check PicGo-Core config"\n${res}`);
      return {
        code: -1,
        msg: `"Please check PicGo-Core config"\n${res}`,
        data: "",
      };
    }
  }

  // PicGo-Core的剪切上传反馈
  private async uploadByClip() {
    let command;
    if (this.settings.picgoCorePath) {
      command = `${this.settings.picgoCorePath} upload`;
    } else {
      command = `picgo upload`;
    }
    const res = await this.exec(command);
    // const res = await this.spawnChild();

    return res;
  }

  private async exec(command: string) {
    const { exec } = require("child_process");
    let { stdout } = await exec(command);
    const res = await streamToString(stdout);
    return res;
  }

  private async spawnChild() {
    const { spawn } = require("child_process");
    const child = spawn("picgo", ["upload"], {
      shell: true,
    });

    let data = "";
    for await (const chunk of child.stdout) {
      data += chunk;
    }
    let error = "";
    for await (const chunk of child.stderr) {
      error += chunk;
    }
    const exitCode = await new Promise((resolve, reject) => {
      child.on("close", resolve);
    });

    if (exitCode) {
      throw new Error(`subprocess error exit ${exitCode}, ${error}`);
    }
    return data;
  }
}
