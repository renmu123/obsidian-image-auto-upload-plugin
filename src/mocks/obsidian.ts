export class App {
  workspace = {
    getActiveFile: () => ({ path: "mock/path" }),
    getActiveViewOfType: () => ({
      editor: {
        getValue: () => "",
        setValue: (value: string) => {},
        getScrollInfo: () => ({ left: 0, top: 0 }),
        scrollTo: (left: number, top: number) => {},
        getCursor: () => ({ line: 0, ch: 0 }),
        setCursor: (pos: { line: number; ch: number }) => {},
      },
    }),
  };
  metadataCache = {
    getCache: (path: string) => ({
      frontmatter: {
        key: "value",
      },
    }),
  };
}

export class MarkdownView {}
