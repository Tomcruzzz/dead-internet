import type { RetroPage, RetroStyle } from "./types";
import { escapeHtml } from "./html";
import { renderRemake } from "./render-remake";
export { escapeHtml } from "./html";

function link(label: string, input: string): string {
  try {
    const url = new URL(input);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return escapeHtml(label);
    return `<a href="${escapeHtml(url.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
  } catch { return escapeHtml(label); }
}

const baseCss = `
*{box-sizing:border-box}html{color-scheme:light}body{margin:0;padding:28px 18px;color:#161616;font:16px/1.55 "Times New Roman",serif}
a{color:#0000bb;text-decoration:underline}a:visited{color:#660099}a:focus-visible{outline:3px solid #e66d00;outline-offset:3px}
.shell{max-width:1100px;margin:auto} .windowbar{display:none}.masthead{padding:26px;text-align:center;border:3px double #555}
.stamp{display:inline-block;font:bold 11px/1.4 Arial,sans-serif;letter-spacing:2px;padding:5px 9px;background:#ffffa6;border:1px solid #777;color:#222}
.masthead h1{font-size:40px;line-height:1.1;margin:18px 0 12px;overflow-wrap:anywhere}.tagline{margin:0 auto;max-width:700px}
.address{font:12px/1.6 "Courier New",monospace;padding:9px 16px;border:1px solid #777;overflow-wrap:anywhere}
.welcome{font:bold 13px/1.5 "Courier New",monospace;text-align:center;padding:10px;border-bottom:1px solid #777}
.layout{display:grid;grid-template-columns:210px minmax(0,1fr);gap:18px;padding-top:18px}
aside{font:14px/1.6 Arial,sans-serif} .panel{margin-bottom:16px;border:2px ridge #aaa;background:#eaeaea}
.panel h2{font:bold 13px/1.4 Arial,sans-serif;margin:0;padding:8px 10px;border-bottom:1px solid #888;background:#d4d4d4}
.panel ul{list-style-type:square;margin:12px;padding-left:18px}.panel li{padding:4px 0;overflow-wrap:anywhere}.panel p{padding:0 12px}
.badge{margin:12px;padding:6px;border:2px outset #ddd;background:#ddd;text-align:center;font:bold 11px "Courier New",monospace}
article{min-width:0;background:#fffef2;padding:24px;border:1px solid #888;overflow-wrap:anywhere}
article h2,article h3,article h4{line-height:1.25;margin:28px 0 12px}article h2{font-size:27px;border-bottom:1px solid #888;padding-bottom:9px}article h2:first-child{margin-top:0}
article p{margin:0 0 18px}article ul{padding-left:25px}article li{margin-bottom:10px}blockquote{margin:18px 0;padding:10px 18px;border-left:4px solid #888;font-style:italic}
pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#eee;border:1px inset #aaa;padding:14px;font:13px/1.6 "Courier New",monospace}
.footnote{padding:12px;border-top:1px solid #777;margin-top:18px;text-align:center;font:12px/1.6 "Courier New",monospace}
.fineprint{font-size:12px;color:#444}.footer-links{display:flex;flex-wrap:wrap;justify-content:center;gap:8px 18px;margin-bottom:8px}
@media(max-width:640px){body{padding:12px 8px}.layout{grid-template-columns:1fr}aside{display:grid;grid-template-columns:1fr 1fr;gap:10px}.panel{margin:0}.masthead h1{font-size:29px}article{padding:18px}.masthead{padding:22px 14px}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
`;

const themes: Record<RetroStyle, { css: string; label: string; welcome: string }> = {
  web95: {
    label: "1995 WEB", welcome: "WELCOME TO MY CORNER OF THE WORLD WIDE WEB",
    css: `body{background:#c0c0c0}.masthead{background:#d8d8d8}.masthead h1{font-family:"Times New Roman",serif;text-shadow:2px 2px #fff}.masthead h1:before{content:"~ "}.masthead h1:after{content:" ~"}.address{background:#eee}.welcome{letter-spacing:1px}article{background:#fffef2}.footnote{border-top:3px double #555}`,
  },
  portal: {
    label: "Y2K PORTAL", welcome: "YOUR GATEWAY TO THE INFORMATION SUPERHIGHWAY",
    css: `body{background:#061839;color:#e0ecff;font-family:Verdana,Arial,sans-serif;font-size:14px;background-image:radial-gradient(#426080 1px,transparent 1px);background-size:20px 20px}.shell{border:2px solid #789cd3;background:#cbd9ee;padding:6px;color:#102040}.masthead{background:linear-gradient(125deg,#00328a,#116ae5);border:2px outset #75aaff;text-align:left;color:white}.masthead h1{font:italic 900 42px/1.1 Arial,sans-serif;letter-spacing:-1.5px;text-shadow:3px 3px #00205f}.tagline{margin-left:0;color:#d8e9ff}.stamp{background:#fff000;color:#061839;border:1px solid #fff}.address{background:#e4eeff;border:1px inset #789cd3}.welcome{background:#ffdc35;color:#001d58;border:1px solid #8c7220;font:700 11px Verdana,sans-serif;letter-spacing:1px}.layout{gap:8px;padding-top:8px;grid-template-columns:230px minmax(0,1fr)}.panel{background:#f0f5ff;border:1px solid #7086a5}.panel h2{background:linear-gradient(#126be5,#003c9e);color:white;border:0;text-transform:uppercase;letter-spacing:1px;font-size:11px}.badge{background:#003d99;color:#ffff40;border:2px outset #6594e5}article{background:white;border:1px solid #6f8fbb;font-size:14px}article h2{background:#e5efff;border-bottom:3px solid #1761c0;padding:9px;font:700 23px Arial,sans-serif}a{color:#004cbe}.footnote{background:#e4eeff;border:1px solid #7086a5;padding:12px}.fineprint{color:#345}@media(max-width:640px){.layout{grid-template-columns:1fr}.masthead h1{font-size:30px}}`,
  },
  win98: {
    label: "WINDOWS 98", welcome: "DOCUMENT READY  /  CLASSIC WEB VIEW",
    css: `body{background:#008080;font:14px/1.6 Tahoma,"MS Sans Serif",Arial,sans-serif}.shell{background:#c0c0c0;border:3px outset #eee;padding:4px;box-shadow:8px 8px 0 #005858}.windowbar{display:flex;justify-content:space-between;background:linear-gradient(90deg,#000080,#1084d0);padding:4px 8px;color:white;font-weight:bold;font-size:12px;gap:12px}.windowbar span:last-child{flex-shrink:0;font-family:monospace;letter-spacing:4px}.masthead{background:#c0c0c0;border:none;text-align:left;padding:24px 18px}.masthead h1{font:700 34px/1.15 Tahoma,Arial,sans-serif;color:#000080;letter-spacing:-1px}.tagline{margin-left:0}.stamp{background:#eee;border:2px inset #ddd;font:10px Tahoma,sans-serif;letter-spacing:1px}.address{background:white;border:2px inset #ddd;margin:0 6px}.welcome{background:#c0c0c0;border:0;text-align:left;font:11px Tahoma,sans-serif;padding-left:12px}.layout{gap:10px;padding:4px 6px 6px;grid-template-columns:200px minmax(0,1fr)}.panel{background:#c0c0c0;border:2px inset #eee}.panel h2{background:#000080;color:#fff;padding:5px 8px;font:700 12px Tahoma,sans-serif;border:0}.badge{border:2px outset #eee;font:11px Tahoma,sans-serif}article{border:2px inset #ddd;background:white;font-size:14px}article h2{font:700 24px Tahoma,sans-serif;color:#000080}.footnote{margin:0 6px 4px;border:2px inset #ddd;text-align:left;padding:6px 10px;font:11px Tahoma,sans-serif}.footer-links{justify-content:flex-start}@media(max-width:640px){.layout{grid-template-columns:1fr}.masthead h1{font-size:27px}}`,
  },
};

export function renderRetroPage(page: RetroPage, style: RetroStyle): string {
  if (page.remake) return renderRemake(page, style);
  const theme = themes[style] ?? themes.web95;
  // Every AI plan selects a materially distinct authored composition, not merely a color change.
  const planCss = page.ai?.layout === "newspaper" ? `
  .masthead{border-bottom:7px double currentColor;text-align:center}.masthead h1{font-family:Georgia,serif;font-size:48px;letter-spacing:-2px}
  .layout{display:flex;flex-direction:column}.layout aside{display:flex;flex-wrap:wrap;gap:10px}.layout aside .panel{flex:1;min-width:180px}
  article{column-count:2;column-gap:28px;column-rule:1px solid #aaa;padding:30px}article>*{break-inside:avoid}article>p:first-of-type:first-letter{float:left;font:bold 52px/.9 Georgia,serif;padding:4px 8px 0 0}
  @media(max-width:700px){article{column-count:1}.masthead h1{font-size:30px}}
  ` : page.ai?.layout === "desktop" ? `
  .windowbar{display:flex;justify-content:space-between;background:linear-gradient(90deg,#000080,#1084d0);padding:8px 12px;color:white;font:bold 13px Tahoma,sans-serif}
  .shell{border:3px outset #eee;background:#c0c0c0;padding:5px;box-shadow:8px 8px #0005}.masthead{border:2px inset #eee;margin:8px;background:#e6e6e6;color:#000080;text-align:left;padding:20px}.masthead h1{font:700 30px Tahoma,sans-serif;text-shadow:none}
  .layout{grid-template-columns:200px minmax(0,1fr);gap:16px;padding:8px}.panel{border:2px outset #eee;background:#c0c0c0;color:#111}.panel h2{background:#000080;color:white;padding:8px;font:700 13px Tahoma,sans-serif}
  article{background:#c0c0c0;border:3px outset #eee;padding:12px;column-count:1;color:#111}article>p,article>pre,article>blockquote{padding:18px;background:white;border:2px inset #ddd;margin-bottom:16px}article h2,article h3{background:#000080;color:#fff;padding:10px;font:700 18px Tahoma,sans-serif}
  @media(max-width:640px){.layout{grid-template-columns:1fr}}
  ` : page.ai ? `
  .layout{grid-template-columns:260px minmax(0,1fr);gap:10px}.masthead{text-align:left;border:3px double currentColor}.masthead h1{font-size:44px}.welcome{text-align:left;letter-spacing:2px;border-top:2px solid currentColor}
  article{border:3px double #888;background:transparent;padding:18px}article>p,article>blockquote,article>pre{padding:20px;border:1px solid #888;background:#fffef2;color:#161616;box-shadow:4px 4px #0002;margin-bottom:18px}article h2,article h3{padding:12px;border-left:8px solid #e5ae26;background:#fff0b8;color:#111;font-family:Arial,sans-serif}
  .panel{border:3px ridge #aaa}.panel li{padding:8px 0;border-bottom:1px dotted #888}.badge{padding:15px;font-size:13px}
  @media(max-width:640px){.layout{grid-template-columns:1fr}.masthead h1{font-size:30px}}
  ` : "";
  let list = false;
  const content: string[] = [];
  page.blocks.forEach((block, index) => {
    if (list && block.kind !== "item") { content.push("</ul>"); list = false; }
    const text = escapeHtml(block.text);
    if (block.kind === "item") {
      if (!list) { content.push("<ul>"); list = true; }
      content.push(`<li>${text}</li>`);
    } else if (block.kind === "heading") {
      const level = block.level && block.level > 2 ? 3 : 2;
      content.push(`<h${level} id="section-${index}">${text}</h${level}>`);
    } else if (block.kind === "code") content.push(`<pre>${text}</pre>`);
    else if (block.kind === "quote") content.push(`<blockquote>${text}</blockquote>`);
    else content.push(`<p>${text}</p>`);
  });
  if (list) content.push("</ul>");
  const headings = page.blocks.map((block, index) => ({ ...block, index })).filter(block => block.kind === "heading").slice(0, 10);
  const navigation = page.links.slice(0, 14).map(item => `<li>${link(item.label, item.url)}</li>`).join("");
  const contents = headings.map(block => `<li>${escapeHtml(block.text.slice(0, 65))}</li>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'">
<meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(page.title)} — retro view</title>
<style>${baseCss}${theme.css}${planCss}</style></head><body><div class="shell">
<div class="windowbar"><span>▣ ${escapeHtml(page.title.slice(0, 70))} — Retro Explorer</span><span aria-hidden="true">_ □ ×</span></div>
<header class="masthead"><span class="stamp">${page.ai ? `AI REMAKE / ${page.ai.sourceMode === "sample" ? "SAMPLE CONTENT / " : ""}` : ""}SIMULATED / ${theme.label}</span><h1>${escapeHtml(page.title)}</h1>
${page.description ? `<p class="tagline">${escapeHtml(page.description)}</p>` : ""}</header>
<div class="address">Source: ${link(page.sourceUrl, page.sourceUrl)}</div><div class="welcome">${theme.welcome}</div>
<div class="layout"><aside>
<section class="panel"><h2>Site directory</h2><ul><li>${link("Visit original website ↗", page.sourceUrl)}</li>${navigation}</ul><div class="badge">WORLD WIDE WEB<br>TEXT + LINKS EDITION</div></section>
${contents ? `<section class="panel"><h2>Page sections</h2><ul>${contents}</ul></section>` : ""}
<section class="panel"><h2>About this remake</h2><p class="fineprint">Current website content, reimagined in an old Internet style. This is a creative simulation, not an archived page.</p></section>
</aside><article aria-label="Converted page content">${content.join("")}</article></div>
<footer class="footnote"><div class="footer-links">${link("Original website ↗", page.sourceUrl)}<span>Made with DEAD INTERNET</span><span>SIMULATED</span></div>
Text-first remake. Images, video, scripts, and forms are omitted. Source links open original websites in new tabs.${page.truncated ? " Content was shortened for this preview." : ""}</footer>
</div></body></html>`;
}
