export type RetroStyle = "web95" | "portal" | "win98";
export type RemakeKind = "youtube" | "facebook" | "github";
export type RemakeLayout = "auto" | "website" | RemakeKind;
export type ContentMode = "public" | "sample";

export interface PublicVideo {
  id: string; title: string; author: string; duration: string;
  url: string; thumbnail: string;
}

export interface PublicRepository {
  fullName: string; description: string; branch: string; path: string;
  entries: { name: string; path: string; type: "file" | "dir"; url: string }[];
  file?: { name: string; text: string; truncated: boolean };
  upUrl: string; issuesUrl: string;
}

export const RETRO_STYLES: { id: RetroStyle; name: string; description: string }[] = [
  { id: "web95", name: "1995 Web", description: "Paper gray, blue links, and a personal homepage layout." },
  { id: "portal", name: "Y2K Portal", description: "Electric blue, directory columns, and pixel-era panels." },
  { id: "win98", name: "Windows 98", description: "Teal desktop, beveled windows, and a classic menu bar." },
];

export interface RetroBlock {
  kind: "heading" | "paragraph" | "item" | "quote" | "code";
  text: string;
  level?: number;
}

export interface RetroPage {
  sourceUrl: string;
  title: string;
  description: string;
  blocks: RetroBlock[];
  links: { label: string; url: string }[];
  fetchedAt: string;
  truncated: boolean;
  remake?: { kind: RemakeKind; content: ContentMode; notice: string; videos?: PublicVideo[]; query?: string; repository?: PublicRepository };
}

export type RetroResponse = { status: "ready"; page: RetroPage } | {
  status: "invalid_input" | "unavailable" | "unsupported";
  message: string;
};
