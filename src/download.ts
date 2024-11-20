import { normalizePath, Notice, requestUrl } from "obsidian";

import { relative, join, parse } from "path-browserify";
import imageType from "image-type";

import { getUrlAsset, uuid } from "./utils";
import { t } from "./lang/helpers";
import type imageAutoUploadPlugin from "./main";

export async function downloadAllImageFiles(plugin: imageAutoUploadPlugin) {
  const activeFile = plugin.app.workspace.getActiveFile();
  const folderPath = await plugin.app.fileManager.getAvailablePathForAttachment(
    ""
  );

  const fileArray = plugin.helper.getAllFiles();

  if (!(await plugin.app.vault.adapter.exists(folderPath))) {
    await plugin.app.vault.adapter.mkdir(folderPath);
  }

  let imageArray = [];
  for (const file of fileArray) {
    if (!file.path.startsWith("http")) {
      continue;
    }

    const url = file.path;
    const asset = getUrlAsset(url);
    let name = decodeURI(parse(asset).name).replaceAll(/[\\\\/:*?\"<>|]/g, "-");

    const response = await download(plugin, url, folderPath, name);
    if (response.ok) {
      const activeFolder = plugin.app.workspace.getActiveFile().parent.path;

      imageArray.push({
        source: file.source,
        name: name,
        path: normalizePath(
          relative(normalizePath(activeFolder), normalizePath(response.path))
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

async function download(
  plugin: imageAutoUploadPlugin,
  url: string,
  folderPath: string,
  name: string
) {
  const response = await requestUrl({ url });

  if (response.status !== 200) {
    return {
      ok: false,
      msg: "error",
    };
  }

  const type = await imageType(new Uint8Array(response.arrayBuffer));
  if (!type) {
    return {
      ok: false,
      msg: "error",
    };
  }

  try {
    let path = normalizePath(join(folderPath, `${name}.${type.ext}`));

    // 如果文件名已存在，则用随机值替换，不对文件后缀进行判断
    if (await plugin.app.vault.adapter.exists(path)) {
      path = normalizePath(join(folderPath, `${uuid()}.${type.ext}`));
    }

    plugin.app.vault.adapter.writeBinary(path, response.arrayBuffer);
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
