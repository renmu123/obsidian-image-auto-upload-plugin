import { readFile } from "fs";

import { PluginSettings } from "./setting";
import { streamToString, getLastImage, bufferToArrayBuffer } from "./utils";
import { exec, spawnSync, spawn } from "child_process";
import { Notice, requestUrl } from "obsidian";
import imageAutoUploadPlugin from "./main";

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

  async uploadFiles(fileList: Array<string>): Promise<any> {
    let response: any;
    let data: PicGoResponse;

    if (this.settings.remoteServerMode) {
      const files = [];
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const buffer: Buffer = await new Promise((resolve, reject) => {
          readFile(file, (err, data) => {
            if (err) {
              reject(err);
            }
            resolve(data);
          });
        });
        const arrayBuffer = bufferToArrayBuffer(buffer);
        files.push(new File([arrayBuffer], file));
      }
      response = await this.uploadFileByData(files);
      data = await response.json();
    } else {
      response = await requestUrl({
        url: this.settings.uploadServer,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ list: fileList }),
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

  async uploadFileByData(fileList: FileList | File[]): Promise<any> {
    const form = new FormData();
    for (let i = 0; i < fileList.length; i++) {
      form.append("list", fileList[i]);
    }

    const options = {
      method: "post",
      body: form,
    };

    const response = await fetch(this.settings.uploadServer, options);
    console.log("response", response);
    return response;
  }

  async uploadFileByClipboard(fileList?: FileList): Promise<any> {
    let data: PicGoResponse;
    let res: any;

    if (this.settings.remoteServerMode) {
      res = await this.uploadFileByData(fileList);
      data = await res.json();
    } else {
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

  async uploadFiles(fileList: Array<String>): Promise<any> {
    const length = fileList.length;
    let cli = this.settings.picgoCorePath || "picgo";
    let command = `${cli} upload ${fileList
      .map(item => `"${item}"`)
      .join(" ")}`;

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
  async uploadByClip() {
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

  async exec(command: string) {
    let { stdout } = await exec(command);
    const res = await streamToString(stdout);
    return res;
  }

  async spawnChild() {
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
