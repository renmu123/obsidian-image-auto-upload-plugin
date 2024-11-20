import type { TFile } from "obsidian";

export interface Image {
  path: string;
  name: string;
  source: string;
  file?: TFile | null;
}
