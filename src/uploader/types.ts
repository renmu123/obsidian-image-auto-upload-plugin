import type { Image } from "../types";

export interface Response {
  success: boolean;
  msg?: string;
  result: string[];
}

export interface Uploader {
  upload(fileList: Array<Image> | Array<string>): Promise<Response>;
  uploadByClipboard(fileList?: FileList): Promise<Response>;
}
