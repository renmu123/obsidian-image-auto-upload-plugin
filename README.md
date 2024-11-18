[中文文档](readme-zh.md)

# Obsidian Image Auto Upload Plugin

This plugin can help you to auto upload image by
[PicGo](https://github.com/Molunerfinn/PicGo)
[PicGo-Core](https://picgo.github.io/PicGo-Core-Doc/)
[PicList](https://github.com/Kuingsmile/PicList)

**You should restart obsidian after updating the plugin.**

**I have not test in Mac**

# Start

1. install the [picgo](https://github.com/Molunerfinn/PicGo) and config it
2. open the tool and open the setting "设置 server"
3. install the plugin in obsidian
4. open the plugin setting, and set the "picGo server" `http://127.0.0.1:{{port in picgo}}/upload`（example：`http://127.0.0.1:36677/upload`）
5. try paste image

## Set picbed and configName

If you are using PicList (version >= 2.5.3), you can set the picbed and configName through url parameters.
example: `http://127.0.0.1:36677/upload?picbed=smms&configName=piclist`
This will upload the image to the smms picbed and use the piclist configName.
Use this feature, you can upload image to different picbeds in different vaults.

# Features

## Upload when paste image

When you paste image to obsidian, this plugin will auto upload you image.

You can set `image-auto-upload: false` in `frontmatter` to control one file.

support ".png", ".jpg", ".jpeg", ".bmp", ".gif", ".svg", ".tiff", ".webp", ".avif"

Because of the [bug](https://github.com/renmu123/obsidian-image-auto-upload-plugin/issues/2) in PicGo 2.3.0-beta7, you can not use this feature. you can install other PicGo version.

```yaml
---
image-auto-upload: true
---
```

## Upload all local images file by command

press `ctrl+P` and input `upload all images`，enter, then will auto upload all local images

## download all internet to local

press `ctrl+P` and input `download all images`，enter, then will auto download all internet images to loacl, only test in win10

## Upload image by contextMenu

Now you can upload image by contextMenu in edit mode.

## Support drag-and-drop

Only work for picgo or picList app.

## server mode

You can deploy [PicList](https://github.com/Kuingsmile/PicList/releases) or [PicList-Core](https://github.com/Kuingsmile/PicList-Core) in your server and upload to it.

Support [PicList](https://github.com/Kuingsmile/PicList/releases) 2.6.3 later or [PicList-Core](https://github.com/Kuingsmile/PicList-Core)1.3.0 later

You can not upload network in this mode.
如果无法粘贴时上传图片，你也可以尝试启用该模式
If you upload fail when you paste img, you can alse try to enable the mode.

## Support picgo-core

You can install picgo-core with npm. Reference to [doc](https://picgo.github.io/PicGo-Core-Doc/)

# TODO

- [x] upload all local images file by command
- [x] support yaml to config if upload image
- [x] support picgo-core
- [x] support upload image from system copy selected image
- [x] support network image

# Thanks

[obsidian-imgur-plugin](https://github.com/gavvvr/obsidian-imgur-plugin)
