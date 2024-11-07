import { describe, it, expect, vi, beforeEach } from "vitest";
import Helper from "../src/helper";

class App {}

describe("Helper", () => {
  let app: any;
  let helper: Helper;
  let editorMock: any;

  beforeEach(() => {
    app = new App();
    // @ts-ignore
    helper = new Helper(app);

    editorMock = {
      getValue: vi.fn(),
    };

    vi.spyOn(helper, "getEditor").mockReturnValue(editorMock);
  });

  it("should return all file URLs including local and internet images", () => {
    const mockValue = `
      ![local image](./path/to/local-image.png)
      ![local image with angle brackets](<./path/to/local-image.png>)
      ![internet image](https://example.com/internet-image.jpg)
      ![[wiki link|alt text]]
    `;
    editorMock.getValue.mockReturnValue(mockValue);

    const result = helper.getAllFiles();

    expect(result).toEqual([
      {
        path: "./path/to/local-image.png",
        name: "local image",
        source: "![local image](./path/to/local-image.png)",
      },
      {
        path: "./path/to/local-image.png",
        name: "local image with angle brackets",
        source:
          "![local image with angle brackets](<./path/to/local-image.png>)",
      },
      {
        path: "https://example.com/internet-image.jpg",
        name: "internet image",
        source: "![internet image](https://example.com/internet-image.jpg)",
      },
      {
        path: "wiki link",
        name: "wiki link|alt text",
        source: "![[wiki link|alt text]]",
      },
    ]);
  });

  it("should return an empty array if no images are found", () => {
    const mockValue = "No images here!";
    editorMock.getValue.mockReturnValue(mockValue);

    const result = helper.getAllFiles();

    expect(result).toEqual([]);
  });

  describe("getImageLink", () => {
    it("should return all file URLs including local and internet images from getImageLink", () => {
      const mockValue = `
      ![local image](./path/to/local-image.png)
      ![local image with angle brackets](<./path/to/local-image.png>)
      ![internet image](https://example.com/internet-image.jpg)
      ![[wiki link|alt text]]
    `;

      const result = helper.getImageLink(mockValue);

      expect(result).toEqual([
        {
          path: "./path/to/local-image.png",
          name: "local image",
          source: "![local image](./path/to/local-image.png)",
        },
        {
          path: "./path/to/local-image.png",
          name: "local image with angle brackets",
          source:
            "![local image with angle brackets](<./path/to/local-image.png>)",
        },
        {
          path: "https://example.com/internet-image.jpg",
          name: "internet image",
          source: "![internet image](https://example.com/internet-image.jpg)",
        },
        {
          path: "wiki link",
          name: "wiki link|alt text",
          source: "![[wiki link|alt text]]",
        },
      ]);
    });

    it("should return an empty array if no images are found in getImageLink", () => {
      const mockValue = "No images here!";

      const result = helper.getImageLink(mockValue);

      expect(result).toEqual([]);
    });

    it("should handle mixed local and internet images in getImageLink", () => {
      const mockValue = `
      ![local image](./path/to/local-image.png)
      ![internet image](https://example.com/internet-image.jpg)
    `;

      const result = helper.getImageLink(mockValue);

      expect(result).toEqual([
        {
          path: "./path/to/local-image.png",
          name: "local image",
          source: "![local image](./path/to/local-image.png)",
        },
        {
          path: "https://example.com/internet-image.jpg",
          name: "internet image",
          source: "![internet image](https://example.com/internet-image.jpg)",
        },
      ]);
    });

    it("should handle only wiki links in getImageLink", () => {
      const mockValue = `
      ![[wiki link|alt text]]
    `;

      const result = helper.getImageLink(mockValue);

      expect(result).toEqual([
        {
          path: "wiki link",
          name: "wiki link|alt text",
          source: "![[wiki link|alt text]]",
        },
      ]);
    });

    it("should handle images without alt text in getImageLink", () => {
      const mockValue = `
      ![](./path/to/local-image.png)
      ![](https://example.com/internet-image.jpg)
    `;

      const result = helper.getImageLink(mockValue);

      expect(result).toEqual([
        {
          path: "./path/to/local-image.png",
          name: "",
          source: "![](./path/to/local-image.png)",
        },
        {
          path: "https://example.com/internet-image.jpg",
          name: "",
          source: "![](https://example.com/internet-image.jpg)",
        },
      ]);
    });
  });
});
