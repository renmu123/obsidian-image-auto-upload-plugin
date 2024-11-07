import { extname } from "path-browserify";
import { Readable } from "stream";
import { clipboard } from "electron";

export interface IStringKeyMap<T> {
  [key: string]: T;
}

const IMAGE_EXT_LIST = [
  ".png",
  ".jpg",
  ".jpeg",
  ".bmp",
  ".gif",
  ".svg",
  ".tiff",
  ".webp",
  ".avif",
];

export function isAnImage(ext: string) {
  return IMAGE_EXT_LIST.includes(ext.toLowerCase());
}
export function isAssetTypeAnImage(path: string): Boolean {
  return isAnImage(extname(path));
}

export function getOS() {
  const { appVersion } = navigator;
  if (appVersion.indexOf("Win") !== -1) {
    return "Windows";
  } else if (appVersion.indexOf("Mac") !== -1) {
    return "MacOS";
  } else if (appVersion.indexOf("X11") !== -1) {
    return "Linux";
  } else {
    return "Unknown OS";
  }
}
export async function streamToString(stream: Readable) {
  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }

  // @ts-ignore
  return Buffer.concat(chunks).toString("utf-8");
}

export function getUrlAsset(url: string) {
  return (url = url.substr(1 + url.lastIndexOf("/")).split("?")[0]).split(
    "#"
  )[0];
}

export function isCopyImageFile() {
  let filePath = "";
  const os = getOS();

  if (os === "Windows") {
    var rawFilePath = clipboard.read("FileNameW");
    filePath = rawFilePath.replace(new RegExp(String.fromCharCode(0), "g"), "");
  } else if (os === "MacOS") {
    filePath = clipboard.read("public.file-url").replace("file://", "");
  } else {
    filePath = "";
  }
  return isAssetTypeAnImage(filePath);
}

export function getLastImage(list: string[]) {
  const reversedList = list.reverse();
  let lastImage;
  reversedList.forEach(item => {
    if (item && item.startsWith("http")) {
      lastImage = item;
      return item;
    }
  });
  return lastImage;
}

interface AnyObj {
  [key: string]: any;
}

export function arrayToObject<T extends AnyObj>(
  arr: T[],
  key: string
): { [key: string]: T } {
  const obj: { [key: string]: T } = {};
  arr.forEach(element => {
    obj[element[key]] = element;
  });
  return obj;
}

export function bufferToArrayBuffer(buffer: Buffer) {
  const arrayBuffer = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < buffer.length; i++) {
    view[i] = buffer[i];
  }
  return arrayBuffer;
}
