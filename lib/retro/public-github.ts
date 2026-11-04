import { fetchPublicPage } from "./fetch";
import { RetroError } from "./errors";
import { createRemake } from "./remake";
import type { PublicRepository, RetroPage } from "./types";

type JsonObject = Record<string, unknown>;
const object = (value: unknown): JsonObject => value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
const string = (value: unknown, max = 300) => typeof value === "string" ? value.slice(0, max) : "";

export function repositoryLocation(url: URL): { owner: string; repo: string; rest: string[] } {
  if (!["github.com", "www.github.com"].includes(url.hostname)) throw new RetroError("unsupported", "Public repository data requires a github.com repository URL.");
  let parts: string[];
  try { parts = url.pathname.split("/").filter(Boolean).map(part => decodeURIComponent(part)); }
  catch { throw new RetroError("invalid_input", "Enter a valid GitHub repository URL."); }
  if (!parts.length) parts = ["octocat", "Hello-World"];
  const [owner, name, ...rest] = parts;
  const repo = name?.replace(/\.git$/, "");
  if (!owner || !repo || !/^[\w-]{1,39}$/.test(owner) || !/^[\w.-]{1,100}$/.test(repo) || [".", ".."].includes(repo) ||
    rest.some(part => part === "." || part === ".." || part.includes("/") || part.includes("\\"))) {
    throw new RetroError("invalid_input", "Use a GitHub repository URL such as github.com/octocat/Hello-World.");
  }
  return { owner, repo, rest };
}

export async function publicGithub(input: URL, callerSignal?: AbortSignal, fetchPage = fetchPublicPage): Promise<RetroPage> {
  const location = repositoryLocation(input);
  const { owner, repo } = location;
  const signal = AbortSignal.any([AbortSignal.timeout(25_000), ...(callerSignal ? [callerSignal] : [])]);
  const root = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  async function json(url: string): Promise<unknown> {
    const result = await fetchPage(url, { signal, allowedHosts: ["api.github.com"], policy: {
      maxBytes: 1_000_000, accept: "application/vnd.github+json", contentTypes: ["application/json"],
    } });
    try { return JSON.parse(result.body.toString("utf8")); }
    catch { throw new RetroError("unavailable", "GitHub returned an unreadable response. Try again later."); }
  }
  const metadata = object(await json(root));
  const defaultBranch = string(metadata.default_branch, 200);
  if (!defaultBranch || metadata.private === true) throw new RetroError("unsupported", "This repository is not available as a public repository.");
  let branch = defaultBranch, path = "";
  if (location.rest.length) {
    const [view, ...suffix] = location.rest;
    if (!["tree", "blob"].includes(view) || !suffix.length) throw new RetroError("unsupported", "Use the repository root or a tree/blob file URL. Issues and other pages can be opened on GitHub.");
    const joined = suffix.join("/");
    if (joined === defaultBranch || joined.startsWith(defaultBranch + "/")) { path = joined.slice(defaultBranch.length).replace(/^\//, ""); }
    else { branch = suffix[0]; path = suffix.slice(1).join("/"); }
  }
  const encodedPath = path.split("/").filter(Boolean).map(encodeURIComponent).join("/");
  const suffix = `?ref=${encodeURIComponent(branch)}`;
  const data = await json(`${root}/contents${encodedPath ? "/" + encodedPath : ""}${suffix}`);
  const webRoot = `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const webPath = (filePath: string, type: "file" | "dir") => `${webRoot}/${type === "dir" ? "tree" : "blob"}/${branch.split("/").map(encodeURIComponent).join("/")}/${filePath.split("/").map(encodeURIComponent).join("/")}`;
  let truncated = false;
  function fileText(value: unknown): { name: string; text: string; truncated: boolean } | undefined {
    const file = object(value);
    if (file.type !== "file") return;
    const name = string(file.name, 200);
    if (file.encoding !== "base64" || typeof file.content !== "string" || Number(file.size) > 200_000) {
      return { name, text: "This file is binary, too large, or not available as text. Open it on GitHub to view the full contents.", truncated: true };
    }
    const buffer = Buffer.from(file.content, "base64");
    if (buffer.includes(0)) return { name, text: "Binary file. Open it on GitHub to view the original.", truncated: false };
    const text = buffer.toString("utf8");
    return { name, text: text.slice(0, 100_000), truncated: text.length > 100_000 };
  }
  const entries: PublicRepository["entries"] = [];
  let file: PublicRepository["file"];
  if (Array.isArray(data)) {
    truncated = data.length > 100;
    for (const value of data.slice(0, 100)) {
      const entry = object(value);
      const name = string(entry.name, 200), entryPath = string(entry.path, 2000);
      if (!name || !entryPath || !["file", "dir"].includes(string(entry.type))) continue;
      const type = entry.type as "file" | "dir";
      entries.push({ name, path: entryPath, type, url: webPath(entryPath, type) });
    }
    // Retrieve only a bounded README, not the contents of every listed file.
    const readme = entries.find(entry => entry.type === "file" && /^readme(?:\.|$)/i.test(entry.name));
    if (readme) {
      try { file = fileText(await json(`${root}/contents/${readme.path.split("/").map(encodeURIComponent).join("/")}${suffix}`)); }
      catch { /* The listing remains useful even when the optional README is unavailable. */ }
    }
  } else {
    file = fileText(data);
    if (!file) throw new RetroError("unsupported", "This GitHub item is not a supported directory or text file.");
  }
  const source = new URL(path ? webPath(path, Array.isArray(data) ? "dir" : "file") : webRoot);
  const page = createRemake(source, "github");
  page.truncated = truncated || Boolean(file?.truncated);
  page.description = string(metadata.description, 500);
  page.remake = { kind: "github", content: "public", notice: "Real public GitHub repository data in a simulated retro layout. File navigation reloads public data. Star actions are local only; no GitHub account is connected.", repository: {
    fullName: string(metadata.full_name, 200) || `${owner}/${repo}`, description: page.description,
    branch, path, entries, file,
    upUrl: path ? webPath(path.split("/").slice(0, -1).join("/"), "dir") : webRoot,
    issuesUrl: `${webRoot}/issues`,
  } };
  return page;
}
