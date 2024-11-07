import { describe, it, expect } from "vitest";
import {
  isAnImage,
  isAssetTypeAnImage,
  getOS,
  streamToString,
  getUrlAsset,
  isCopyImageFile,
  getLastImage,
  arrayToObject,
  bufferToArrayBuffer,
} from "../src/utils";
import { Readable } from "stream";
// import { clipboard } from "electron";

describe("utils tests", () => {
  it("should check if a file extension is an image", () => {
    expect(isAnImage(".png")).toBe(true);
    expect(isAnImage(".txt")).toBe(false);
  });

  it("should check if a file path is an image", () => {
    expect(isAssetTypeAnImage("image.png")).toBe(true);
    expect(isAssetTypeAnImage("document.txt")).toBe(false);
  });

  it("should get the OS", () => {
    const os = getOS();
    expect(["Windows", "MacOS", "Linux", "Unknown OS"]).toContain(os);
  });

  it("should convert stream to string", async () => {
    const stream = Readable.from(["hello", " ", "world"]);
    const result = await streamToString(stream);
    expect(result).toBe("hello world");
  });

  it("should get URL asset", () => {
    const url = "http://example.com/path/to/image.png?query=123#fragment";
    const asset = getUrlAsset(url);
    expect(asset).toBe("image.png");
  });

  // it("should check if copied file is an image", () => {
  //   // clipboard.write({ text: "image.png" });
  //   const result = isCopyImageFile();
  //   expect(result).toBe(true);
  // });

  // it("should get the last image from a list", () => {
  //   const list = [
  //     "http://example.com/image1.png",
  //     "http://example.com/image2.png",
  //     "http://example.com/document.txt",
  //   ];
  //   const lastImage = getLastImage(list);
  //   expect(lastImage).toBe("http://example.com/image2.png");
  // });

  it("should convert array to object", () => {
    const arr = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ];
    const obj = arrayToObject(arr, "id");
    expect(obj).toEqual({
      "1": { id: 1, name: "Alice" },
      "2": { id: 2, name: "Bob" },
    });
  });

  it("should convert buffer to array buffer", () => {
    const buffer = Buffer.from([1, 2, 3]);
    const arrayBuffer = bufferToArrayBuffer(buffer);
    expect(arrayBuffer.byteLength).toBe(3);
    expect(new Uint8Array(arrayBuffer)).toEqual(new Uint8Array([1, 2, 3]));
  });
});
