import { FileSystemAdapter, normalizePath, Notice, requestUrl } from "obsidian";

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { relative, join, parse, resolve } from "path-browserify";
import imageType from "image-type";

import { getUrlAsset } from "./utils";
import { t } from "./lang/helpers";
import type imageAutoUploadPlugin from "./main";

export async function downloadAllImageFiles(plugin: imageAutoUploadPlugin) {
  const activeFile = plugin.app.workspace.getActiveFile();
  const folderPath = getFileAssetPath(plugin);
  const fileArray = plugin.helper.getAllFiles();
  if (!existsSync(folderPath)) {
    mkdirSync(folderPath);
  }

  let imageArray = [];
  const nameSet = new Set();
  for (const file of fileArray) {
    if (!file.path.startsWith("http")) {
      continue;
    }

    const url = file.path;
    const asset = getUrlAsset(url);
    let name = decodeURI(parse(asset).name).replaceAll(/[\\\\/:*?\"<>|]/g, "-");

    // 如果文件名已存在，则用随机值替换，不对文件后缀进行判断
    if (existsSync(join(folderPath))) {
      name = (Math.random() + 1).toString(36).substr(2, 5);
    }
    if (nameSet.has(name)) {
      name = `${name}-${(Math.random() + 1).toString(36).substr(2, 5)}`;
    }
    nameSet.add(name);

    const response = await download(url, folderPath, name);
    if (response.ok) {
      const activeFolder = normalizePath(
        plugin.app.workspace.getActiveFile().parent.path
      );
      const abstractActiveFolder = (
        plugin.app.vault.adapter as FileSystemAdapter
      ).getFullPath(activeFolder);

      imageArray.push({
        source: file.source,
        name: name,
        path: normalizePath(
          relative(
            normalizePath(abstractActiveFolder),
            normalizePath(response.path)
          )
        ),
      });
    }
  }

  let value = plugin.helper.getValue();
  imageArray.map(image => {
    let name = plugin.handleName(image.name);

    value = value.replace(image.source, `![${name}](${encodeURI(image.path)})`);
  });

  const currentFile = plugin.app.workspace.getActiveFile();
  if (activeFile.path !== currentFile.path) {
    new Notice(t("File has been changedd, download failure"));
    return;
  }
  plugin.helper.setValue(value);

  new Notice(
    `all: ${fileArray.length}\nsuccess: ${imageArray.length}\nfailed: ${
      fileArray.length - imageArray.length
    }`
  );
}

async function download(url: string, folderPath: string, name: string) {
  const response = await requestUrl({ url });
  const type = await imageType(new Uint8Array(response.arrayBuffer));

  if (response.status !== 200) {
    return {
      ok: false,
      msg: "error",
    };
  }
  if (!type) {
    return {
      ok: false,
      msg: "error",
    };
  }

  const buffer = Buffer.from(response.arrayBuffer);

  try {
    const path = normalizePath(join(folderPath, `${name}.${type.ext}`));

    // @ts-ignore
    writeFileSync(path, buffer);
    return {
      ok: true,
      msg: "ok",
      path: path,
      type,
    };
  } catch (err) {
    return {
      ok: false,
      msg: err,
    };
  }
}

// 获取当前文件所属的附件文件夹
function getFileAssetPath(plugin: imageAutoUploadPlugin) {
  const basePath = (
    plugin.app.vault.adapter as FileSystemAdapter
  ).getBasePath();

  const assetFolder: string =
    // @ts-ignore
    plugin.app.vault.config.attachmentFolderPath ?? "/";
  const activeFile = plugin.app.vault.getAbstractFileByPath(
    plugin.app.workspace.getActiveFile().path
  );

  // 当前文件夹下的子文件夹
  if (assetFolder.startsWith("./")) {
    const activeFolder = decodeURI(resolve(basePath, activeFile.parent.path));
    return join(activeFolder, assetFolder);
  } else {
    // 根文件夹
    return join(basePath, assetFolder);
  }
}
