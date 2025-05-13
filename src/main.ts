import {
  MarkdownView,
  Plugin,
  Editor,
  Menu,
  MenuItem,
  TFile,
  normalizePath,
  Notice,
  addIcon,
  MarkdownFileInfo,
  parseLinktext,
  getLinkpath,
} from "obsidian";
import * as pathlib from "path";
import { resolve, basename, dirname } from "path-browserify";

import { isAssetTypeAnImage, arrayToObject } from "./utils";
import { downloadAllImageFiles } from "./download";
import { UploaderManager } from "./uploader/index";
import { PicGoDeleter } from "./deleter";
import Helper from "./helper";
import { t } from "./lang/helpers";
import { SettingTab, PluginSettings, DEFAULT_SETTINGS } from "./setting";

import type { Image } from "./types";

export default class imageAutoUploadPlugin extends Plugin {
  settings: PluginSettings;
  helper: Helper;
  editor: Editor;
  picGoDeleter: PicGoDeleter;

  async loadSettings() {
    this.settings = Object.assign(DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  onunload() {}

  async onload() {
    await this.loadSettings();

    this.helper = new Helper(this.app);
    this.picGoDeleter = new PicGoDeleter(this);

    addIcon(
      "upload",
      `<svg t="1636630783429" class="icon" viewBox="0 0 100 100" version="1.1" p-id="4649" xmlns="http://www.w3.org/2000/svg">
      <path d="M 71.638 35.336 L 79.408 35.336 C 83.7 35.336 87.178 38.662 87.178 42.765 L 87.178 84.864 C 87.178 88.969 83.7 92.295 79.408 92.295 L 17.249 92.295 C 12.957 92.295 9.479 88.969 9.479 84.864 L 9.479 42.765 C 9.479 38.662 12.957 35.336 17.249 35.336 L 25.019 35.336 L 25.019 42.765 L 17.249 42.765 L 17.249 84.864 L 79.408 84.864 L 79.408 42.765 L 71.638 42.765 L 71.638 35.336 Z M 49.014 10.179 L 67.326 27.688 L 61.835 32.942 L 52.849 24.352 L 52.849 59.731 L 45.078 59.731 L 45.078 24.455 L 36.194 32.947 L 30.702 27.692 L 49.012 10.181 Z" p-id="4650" fill="#8a8a8a"></path>
    </svg>`
    );

    this.addSettingTab(new SettingTab(this.app, this));

    this.addCommand({
      id: "Upload all images",
      name: "Upload all images",
      checkCallback: (checking: boolean) => {
        let leaf = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (leaf) {
          if (!checking) {
            this.uploadAllFile();
          }
          return true;
        }
        return false;
      },
    });
    this.addCommand({
      id: "Download all images",
      name: "Download all images",
      checkCallback: (checking: boolean) => {
        let leaf = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (leaf) {
          if (!checking) {
            downloadAllImageFiles(this);
          }
          return true;
        }
        return false;
      },
    });
    this.setupPasteHandler();
    this.registerFileMenu();
    this.registerFilesMenu();
    this.registerSelection();
  }

  /**
   * 获取当前使用的上传器
   */
  getUploader() {
    const uploader = new UploaderManager(this.settings.uploader, this);

    return uploader;
  }

  /**
   * 上传图片
   */
  upload(images: Image[] | string[]) {
    let uploader = this.getUploader();
    return uploader.upload(images);
  }

  /**
   * 通过剪贴板上传图片
   */
  uploadByClipboard(fileList?: FileList) {
    let uploader = this.getUploader();
    return uploader.uploadByClipboard(fileList);
  }

  registerSelection() {
    this.registerEvent(
      this.app.workspace.on(
        "editor-menu",
        (menu: Menu, editor: Editor, info: MarkdownView | MarkdownFileInfo) => {
          if (this.app.workspace.getLeavesOfType("markdown").length === 0) {
            return;
          }
          const selection = editor.getSelection();
          if (selection) {
            const markdownRegex = /!\[.*\]\((.*)\)/g;
            const markdownMatch = markdownRegex.exec(selection);
            if (markdownMatch && markdownMatch.length > 1) {
              const markdownUrl = markdownMatch[1];
              if (
                this.settings.uploadedImages.find(
                  (item: { imgUrl: string }) => item.imgUrl === markdownUrl
                )
              ) {
                this.addRemoveMenu(menu, markdownUrl, editor);
              }
            }
          }
        }
      )
    );
  }

  addRemoveMenu = (menu: Menu, imgPath: string, editor: Editor) => {
    menu.addItem((item: MenuItem) =>
      item
        .setIcon("trash-2")
        .setTitle(t("Delete image using PicList"))
        .onClick(async () => {
          try {
            const selectedItem = this.settings.uploadedImages.find(
              (item: { imgUrl: string }) => item.imgUrl === imgPath
            );
            if (selectedItem) {
              const res = await this.picGoDeleter.deleteImage([selectedItem]);
              if (res.success) {
                new Notice(t("Delete successfully"));
                const selection = editor.getSelection();
                if (selection) {
                  editor.replaceSelection("");
                }
                this.settings.uploadedImages =
                  this.settings.uploadedImages.filter(
                    (item: { imgUrl: string }) => item.imgUrl !== imgPath
                  );
                this.saveSettings();
              } else {
                new Notice(t("Delete failed"));
              }
            }
          } catch {
            new Notice(t("Error, could not delete"));
          }
        })
    );
  };

  registerFileMenu() {
    this.registerEvent(
      this.app.workspace.on(
        "file-menu",
        (menu: Menu, file: TFile, source: string, leaf) => {
          if (source === "canvas-menu") return false;
          if (!isAssetTypeAnImage(file.path)) return false;
          if (source === "file-explorer-context-menu"){
            menu.addItem((item: MenuItem) => {
              item
                .setTitle(t("Upload Image File"))
                .setIcon("upload")
                .onClick(async () => {
                  await this.uploadImageTFiles([file]);
                });
            });
          }
          else {
            menu.addItem((item: MenuItem) => {
              item
                .setTitle(t("upload"))
                .setIcon("upload")
                .onClick(() => {
                  if (!(file instanceof TFile)) {
                    return false;
                  }
                  this.fileMenuUpload(file);
                });
            });
          }
        }
      )
    );
  }

  fileMenuUpload(file: TFile) {
    let imageList: Image[] = [];
    const fileArray = this.helper.getAllFiles();

    for (const match of fileArray) {
      const imageName = match.name;
      const encodedUri = match.path;

      const fileName = basename(decodeURI(encodedUri));

      if (file && file.name === fileName) {
        if (isAssetTypeAnImage(file.path)) {
          imageList.push({
            path: file.path,
            name: imageName,
            source: match.source,
            file: file,
          });
        }
      }
    }

    if (imageList.length === 0) {
      new Notice(t("Can not find image file"));
      return;
    }

    this.upload(imageList).then(res => {
      if (!res.success) {
        new Notice("Upload error");
        return;
      }

      let uploadUrlList = res.result;
      this.replaceImage(imageList, uploadUrlList);
    });
  }

  registerFilesMenu(){
    this.registerEvent(
      this.app.workspace.on(
        "files-menu",
        (menu: Menu, files: TFile[], source: string, leaf) => {
          if (source !== "file-explorer-context-menu") return false;
          menu.addItem((item: MenuItem) => {
            item
              .setTitle(t("Upload Image Files"))
              .setIcon("upload")
              .onClick(async () => {
                var imageFiles = files.filter(file => ((file instanceof TFile) && isAssetTypeAnImage(file.path)));
                if (files.length !== imageFiles.length){
                  console.log(`Omitting ${files.length - imageFiles.length} non-image files`);
                }
                await this.uploadImageTFiles(imageFiles);
              });
          });
        }
      )
    );
  }

  async uploadImageTFiles(imageFiles: TFile[]){
    imageFiles = imageFiles.filter(file => isAssetTypeAnImage(file.path));
    var historyMessage = `Uploading ${imageFiles.length} image file(s)...`;
    const progressNotice = new Notice(historyMessage, 0);
    var progressMessage = "";
    var total: number = 0;
    var count: number = 0;
    

    // 1. find all relevant links in vault.
    // Let's say, in source file (usually markdown), there is a link `![displayName](targetFilePath)` or `[[targetFileWikilink|displayName]]`.
    // 1.1 prepare all resolved links in vault.
    // this.app.metadataCache.resolvedLinks: Record<string, Record<string, number>>, meaning: {sourceFilePath: {targetFilePath: nLinks}}
    // reversedLinks: Record<string, Record<string, number>>, meaning: {targetFilePath: {sourceFilePath: nLinks}}
    // reversedLinksOfImageFiles: Record<string, Record<string, number>>, meaning: {imageFilePath: {sourceFilePath: nLinks}}
    const reversedLinksOfImageFiles: Record<string, Record<string, number>> = {};
    for (const imageFile of imageFiles){
      reversedLinksOfImageFiles[imageFile.path] = {};
    }
    Object.keys(this.app.metadataCache.resolvedLinks).forEach((key) => {total += 1});
    count = 0; 
    for (const [sourceFilePath, links] of Object.entries(this.app.metadataCache.resolvedLinks)) {
      count += 1;
      progressMessage = `Resolving links in vault (${count}/${total})...`;
      progressNotice.setMessage(historyMessage + "\n" + progressMessage);
      for (const [targetFilePath, nLinks] of Object.entries(links)) {
        if (!reversedLinksOfImageFiles[targetFilePath]) { // ignore not selected files
          continue;
        }
        if (!reversedLinksOfImageFiles[targetFilePath][sourceFilePath])
          reversedLinksOfImageFiles[targetFilePath][sourceFilePath] = nLinks;
        else 
          reversedLinksOfImageFiles[targetFilePath][sourceFilePath] += nLinks;
      }
    }
    historyMessage += `\nResolving links in vault (${count}/${total})... Done`;
    progressNotice.setMessage(historyMessage);
    
    // 1.2 find all relevant image links in all files
    const imageLinksInSrcFiles: Record<string, {targetFilePath: string, displayName: string, start: number, end: number}[]> = {};
    // start and end here are offsets in src file content.
    total = imageFiles.length;
    count = 0;
    for (const imageFile of imageFiles) {
      count += 1;
      progressMessage = `Finding relevant notes for ${imageFile.name} (${count}/${total})...`;
      progressNotice.setMessage(historyMessage+ "\n" + progressMessage);
      for(const sourceFilePath in reversedLinksOfImageFiles[imageFile.path]){
        const sourceFile = this.app.vault.getAbstractFileByPath(sourceFilePath);
        if (!(sourceFile instanceof TFile)) continue;
        const srcFileContent = await this.app.vault.read(sourceFile);
        const srcFileMetaDataCache = this.app.metadataCache.getFileCache(sourceFile);
        if (!srcFileMetaDataCache || !srcFileMetaDataCache.sections) continue;
        const sections = srcFileMetaDataCache.sections;
        const allowedCodeType = ["ad-quote"]; // TODO: add an option in settings to define this list.
        const REGEX_MD_LINK = /\!\[(.*?)\]\(<(\S+\.\w+)>\)|\!\[(.*?)\]\((\S+\.\w+)(?:(\s+"[^"]*"|\s*\|.*)*)?\)|\!\[(.*?)\]\((https?:\/\/.*?)\)/g;
        const REGEX_WIKI_LINK = /\!\[\[(.*?)(\s*\|.*)?\]\]/g;
        for (const section of sections) {
          const sectionContent = srcFileContent.substring(section.position.start.offset, section.position.end.offset);
          if (section.type == "code") {
            var codeBlockAllowed = false;
            for (const codeType of allowedCodeType) {
              if (sectionContent.startsWith('\`\`\`'+codeType)) {
                codeBlockAllowed = true;
                break;
              }
            }
            if (!codeBlockAllowed) continue;
          }
          const mdMatches = sectionContent.matchAll(REGEX_MD_LINK);
          const wikiMatches = sectionContent.matchAll(REGEX_WIKI_LINK);
          const imageLinksInSrcFile = imageLinksInSrcFiles[sourceFilePath] || [];
          mdMatches.forEach(match => {
            if (match.index === undefined) return;
            const displayName = match[1] || match[3] || match[5]; 
            if (match[6]) return; // ignore network image
            const encodedURI = match[2] || match[4];
            const decodedURI = decodeURI(encodedURI); // Actually, I'm not sure if this can handle all cases.
            if (pathlib.isAbsolute(decodedURI)) return;
            // decodedURI should be a relative path. Ignore absolute path.
            const targetFilePath = pathlib.normalize(pathlib.join(pathlib.dirname(sourceFilePath), decodedURI));
            if (targetFilePath === imageFile.path) {
              const start = section.position.start.offset + match.index;
              const end = start + match[0].length;
              imageLinksInSrcFile[imageLinksInSrcFile.length] = {
                targetFilePath: targetFilePath,
                displayName: displayName || "image",
                start: start,
                end: end,
              };
            }
          });
          wikiMatches.forEach(match => {
            if (match.index === undefined) return;
            const linktext = match[1];
            const residual = match[2];
            const {path, subpath} = parseLinktext(linktext);
            const firstDest = this.app.metadataCache.getFirstLinkpathDest(path, sourceFilePath);
            if (!firstDest) return;
            const targetFilePath = firstDest.path;
            if (targetFilePath === imageFile.path) {
              const start = section.position.start.offset + match.index;
              const end = start + match[0].length;
              imageLinksInSrcFile[imageLinksInSrcFile.length] = {
                targetFilePath: targetFilePath,
                displayName: linktext + (residual || ""),
                start: start,
                end: end,
              };
            }
          });
          // Must sort by start position to avoid overlap.
          imageLinksInSrcFile.sort((a, b) => a.start - b.start);
          for (var i = 0; i < imageLinksInSrcFile.length-1; i++){
            if (imageLinksInSrcFile[i].end > imageLinksInSrcFile[i+1].start) {
              new Notice(`Warning: image link overlap detected in ${sourceFilePath}. Task aborted.`);
              return;
            }
          }
          imageLinksInSrcFiles[sourceFilePath] = imageLinksInSrcFile;
        }
      }
    } 
    historyMessage += `\nFinding relevant notes for ${imageFiles.length} image file(s)... Done`;
    // now imageLinksInSrcFiles contains all relevant image links in all files.

    // 2. upload all image files, generate oldFile-newLink map
    const imageList: Image[] = imageFiles.map(file => {return {path: file.path, name: file.name, source: `![${file.name}](${file.path})`, file: file};});
    progressMessage = `Uploading ${imageList.length} image file(s), it may take a while...`;
    progressNotice.setMessage(historyMessage + "\n" + progressMessage);
    this.upload(imageList).then(async res => {
      if (!res.success) {
        new Notice("Upload error");
        return;
      }

      let uploadUrlList = res.result;
      historyMessage += `\nUploading ${imageList.length} image file(s), it may take a while... Done`;
      progressNotice.setMessage(historyMessage);
      // 3. replace all old links with new links
      // 3.1 prepare link map
      if (imageFiles.length !== uploadUrlList.length){
        new Notice("Error: upload files is different of reciver files from api. Aborted.");
        return;
      }
      const linkMap: Record<string, string> = {};
      for (let i = 0; i < imageFiles.length; i++) {
        const imageFile = imageFiles[i];
        const uploadUrl = uploadUrlList[i];
        linkMap[imageFile.path] = uploadUrl;
      }
      // 3.2 replace all links and apply to files
      total = Object.keys(imageLinksInSrcFiles).length;
      count = 0;
      for (const sourceFilePath in imageLinksInSrcFiles) {
        count += 1;
        progressMessage = `Replacing links in ${sourceFilePath} (${count}/${total})...`;
        progressNotice.setMessage(historyMessage + "\n" + progressMessage);
        const imageLinks = imageLinksInSrcFiles[sourceFilePath];
        const sourceFile = this.app.vault.getAbstractFileByPath(sourceFilePath);
        if (!(sourceFile instanceof TFile)) continue;
        const srcFileContent = await this.app.vault.read(sourceFile);
        var newFileContent = "";
        var ptr=0;
        for (const imageLink of imageLinks) {
          const {targetFilePath, displayName, start, end} = imageLink;
          const uploadUrl = linkMap[targetFilePath];
          if (!uploadUrl) {
            continue;
          } else {
            newFileContent += srcFileContent.substring(ptr, start); // copy before image link
            newFileContent += `![${displayName}](${uploadUrl})`;
            ptr = end;
          }
        }
        newFileContent += srcFileContent.substring(ptr); // copy after last image link
        await this.app.vault.modify(sourceFile, newFileContent);
      }
      historyMessage += `\nReplacing links in ${Object.keys(imageLinksInSrcFiles).length} file(s)... Done`;
      progressNotice.setMessage(historyMessage);
      // 4. delete old files if necessary
      if (this.settings.deleteSource){
        progressMessage += `Deleting ${imageFiles.length} local image file(s), this may take a while...`;
        progressNotice.setMessage(historyMessage+"\n"+progressMessage);
        imageFiles.map(imageFile => this.app.fileManager.trashFile(imageFile));
        historyMessage += `\nDeleting ${imageFiles.length} local image file(s), this may take a while... Done`;
        progressNotice.setMessage(historyMessage);
      }
      sleep(5000).then(() => {
        progressNotice.hide();
      });
    });
  }

  filterFile(fileArray: Image[]) {
    const imageList: Image[] = [];

    for (const match of fileArray) {
      if (match.path.startsWith("http")) {
        if (this.settings.workOnNetWork) {
          if (
            !this.helper.hasBlackDomain(
              match.path,
              this.settings.newWorkBlackDomains
            )
          ) {
            imageList.push({
              path: match.path,
              name: match.name,
              source: match.source,
            });
          }
        }
      } else {
        imageList.push({
          path: match.path,
          name: match.name,
          source: match.source,
        });
      }
    }

    return imageList;
  }

  /**
   * 替换上传的图片
   */
  replaceImage(imageList: Image[], uploadUrlList: string[]) { // replaceImageUrlsInActiveFile
    let content = this.helper.getValue();

    imageList.map(item => {
      const uploadImage = uploadUrlList.shift();

      let name = this.handleName(item.name);
      content = content.replaceAll(item.source, `![${name}](${uploadImage})`);
    });

    this.helper.setValue(content);

    if (this.settings.deleteSource) {
      imageList.map(image => {
        if (image.file && !image.path.startsWith("http")) {
          this.app.fileManager.trashFile(image.file);
        }
      });
    }
  }

  /**
   * 上传所有图片
   */
  uploadAllFile() { // uploadAllImageFilesInActiveFile
    const activeFile = this.app.workspace.getActiveFile();
    const fileMap = arrayToObject(this.app.vault.getFiles(), "name");
    const filePathMap = arrayToObject(this.app.vault.getFiles(), "path");
    let imageList: (Image & { file: TFile | null })[] = [];
    const fileArray = this.filterFile(this.helper.getAllFiles());

    for (const match of fileArray) {
      const imageName = match.name;
      const uri = decodeURI(match.path);

      if (uri.startsWith("http")) {
        imageList.push({
          path: match.path,
          name: imageName,
          source: match.source,
          file: null,
        });
      } else {
        const fileName = basename(uri);
        let file: TFile | undefined | null;
        // 优先匹配绝对路径
        if (filePathMap[uri]) {
          file = filePathMap[uri];
        }

        // 相对路径
        if ((!file && uri.startsWith("./")) || uri.startsWith("../")) {
          const filePath = normalizePath(
            resolve(dirname(activeFile.path), uri)
          );

          file = filePathMap[filePath];
        }

        // 尽可能短路径
        if (!file) {
          file = fileMap[fileName];
        }

        if (file) {
          if (isAssetTypeAnImage(file.path)) {
            imageList.push({
              path: normalizePath(file.path),
              name: imageName,
              source: match.source,
              file: file,
            });
          }
        }
      }
    }

    if (imageList.length === 0) {
      new Notice(t("Can not find image file"));
      return;
    } else {
      new Notice(`Have found ${imageList.length} images`);
    }

    this.upload(imageList).then(res => {
      let uploadUrlList = res.result;
      if (imageList.length !== uploadUrlList.length) {
        new Notice(
          t("Warning: upload files is different of reciver files from api")
        );
        return;
      }
      const currentFile = this.app.workspace.getActiveFile();
      if (activeFile.path !== currentFile.path) {
        new Notice(t("File has been changedd, upload failure"));
        return;
      }

      this.replaceImage(imageList, uploadUrlList);
    });
  }

  setupPasteHandler() {
    this.registerEvent(
      this.app.workspace.on(
        "editor-paste",
        (evt: ClipboardEvent, editor: Editor, markdownView: MarkdownView) => {
          const allowUpload = this.helper.getFrontmatterValue(
            "image-auto-upload",
            this.settings.uploadByClipSwitch
          );

          let files = evt.clipboardData.files;
          if (!allowUpload) {
            return;
          }

          // 剪贴板内容有md格式的图片时
          if (this.settings.workOnNetWork) {
            const clipboardValue = evt.clipboardData.getData("text/plain");
            const imageList = this.helper
              .getImageLink(clipboardValue)
              .filter(image => image.path.startsWith("http"))
              .filter(
                image =>
                  !this.helper.hasBlackDomain(
                    image.path,
                    this.settings.newWorkBlackDomains
                  )
              );

            if (imageList.length !== 0) {
              this.upload(imageList).then(res => {
                let uploadUrlList = res.result;
                this.replaceImage(imageList, uploadUrlList);
              });
            }
          }

          // 剪贴板中是图片时进行上传
          if (this.canUpload(evt.clipboardData)) {
            this.uploadFileAndEmbedImgurImage(
              editor,
              async (editor: Editor, pasteId: string) => {
                let res: any;
                res = await this.uploadByClipboard(evt.clipboardData.files);

                // if (res.code !== 0) {
                if (!res.success) {
                  this.handleFailedUpload(editor, pasteId, res.msg);
                  return;
                }
                // const url = res.data;
                const url = res.result[0];

                return url;
              },
              evt.clipboardData
            ).catch();
            evt.preventDefault();
          }
        }
      )
    );
    this.registerEvent(
      this.app.workspace.on(
        "editor-drop",
        async (evt: DragEvent, editor: Editor, markdownView: MarkdownView) => {
          // when ctrl key is pressed, do not upload image, because it is used to set local file
          if (evt.ctrlKey) {
            return;
          }
          const allowUpload = this.helper.getFrontmatterValue(
            "image-auto-upload",
            this.settings.uploadByClipSwitch
          );

          if (!allowUpload) {
            return;
          }

          let files = evt.dataTransfer.files;
          if (files.length !== 0 && files[0].type.startsWith("image")) {
            let sendFiles: Array<string> = [];
            let files = evt.dataTransfer.files;
            Array.from(files).forEach((item, index) => {
              if (item.path) {
                sendFiles.push(item.path);
              } else {
                const { webUtils } = require("electron");
                const path = webUtils.getPathForFile(item);
                sendFiles.push(path);
              }
            });
            evt.preventDefault();

            const data = await this.upload(sendFiles);

            if (data.success) {
              data.result.map((value: string) => {
                let pasteId = (Math.random() + 1).toString(36).substr(2, 5);
                this.insertTemporaryText(editor, pasteId);
                this.embedMarkDownImage(editor, pasteId, value, files[0].name);
              });
            } else {
              new Notice("Upload error");
            }
          }
        }
      )
    );
  }

  canUpload(clipboardData: DataTransfer) {
    this.settings.applyImage;
    const files = clipboardData.files;
    const text = clipboardData.getData("text");

    const hasImageFile =
      files.length !== 0 && files[0].type.startsWith("image");
    if (hasImageFile) {
      if (!!text) {
        return this.settings.applyImage;
      } else {
        return true;
      }
    } else {
      return false;
    }
  }

  async uploadFileAndEmbedImgurImage(
    editor: Editor,
    callback: Function,
    clipboardData: DataTransfer
  ) {
    let pasteId = (Math.random() + 1).toString(36).substr(2, 5);
    this.insertTemporaryText(editor, pasteId);
    const name = clipboardData.files[0].name;

    try {
      const url = await callback(editor, pasteId);
      this.embedMarkDownImage(editor, pasteId, url, name);
    } catch (e) {
      this.handleFailedUpload(editor, pasteId, e);
    }
  }

  insertTemporaryText(editor: Editor, pasteId: string) {
    let progressText = imageAutoUploadPlugin.progressTextFor(pasteId);
    editor.replaceSelection(progressText + "\n");
  }

  private static progressTextFor(id: string) {
    return `![Uploading file...${id}]()`;
  }

  embedMarkDownImage(
    editor: Editor,
    pasteId: string,
    imageUrl: any,
    name: string = ""
  ) {
    let progressText = imageAutoUploadPlugin.progressTextFor(pasteId);
    name = this.handleName(name);

    let markDownImage = `![${name}](${imageUrl})`;

    imageAutoUploadPlugin.replaceFirstOccurrence(
      editor,
      progressText,
      markDownImage
    );
  }

  handleFailedUpload(editor: Editor, pasteId: string, reason: any) {
    new Notice(reason);
    console.error("Failed request: ", reason);
    let progressText = imageAutoUploadPlugin.progressTextFor(pasteId);
    imageAutoUploadPlugin.replaceFirstOccurrence(
      editor,
      progressText,
      "⚠️upload failed, check dev console"
    );
  }

  handleName(name: string) {
    const imageSizeSuffix = this.settings.imageSizeSuffix || "";

    if (this.settings.imageDesc === "origin") {
      return `${name}${imageSizeSuffix}`;
    } else if (this.settings.imageDesc === "none") {
      return "";
    } else if (this.settings.imageDesc === "removeDefault") {
      if (name === "image.png") {
        return "";
      } else {
        return `${name}${imageSizeSuffix}`;
      }
    } else {
      return `${name}${imageSizeSuffix}`;
    }
  }

  static replaceFirstOccurrence(
    editor: Editor,
    target: string,
    replacement: string
  ) {
    let lines = editor.getValue().split("\n");
    for (let i = 0; i < lines.length; i++) {
      let ch = lines[i].indexOf(target);
      if (ch != -1) {
        let from = { line: i, ch: ch };
        let to = { line: i, ch: ch + target.length };
        editor.replaceRange(replacement, from, to);
        break;
      }
    }
  }
}
