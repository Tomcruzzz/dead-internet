import { escapeHtml as e } from "./html";
import type { RetroPage, RetroStyle } from "./types";

const videoSamples = [
  { title: "Building my first website", author: "Pixel Workshop", category: "Technology", art: "&lt;/&gt;", color: "#d4e9b6", duration: "06:24" },
  { title: "A very serious cat documentary", author: "The Neighborhood", category: "Life", art: "=^.^=", color: "#ffdaad", duration: "02:18" },
  { title: "Midnight synth session", author: "Bedroom Frequencies", category: "Music", art: "♫ ♪ ♫", color: "#d6baf4", duration: "04:52" },
  { title: "The pixel arcade", author: "Insert Coin", category: "Gaming", art: "[+ ::]", color: "#b8dff5", duration: "08:31" },
  { title: "Restoring a beige computer", author: "Desk Museum", category: "Technology", art: "▣ _", color: "#e4dfc5", duration: "12:06" },
  { title: "Rainy afternoon on the Internet", author: "Small Moments", category: "Life", art: "☁ / /", color: "#bccedb", duration: "03:47" },
];

function original(page: RetroPage): string {
  try {
    const url = new URL(page.sourceUrl);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return "";
    return `<a href="${e(url.href)}" target="_blank" rel="noopener noreferrer">Open original site ↗</a>`;
  } catch { return ""; }
}

function videoSite(page: RetroPage): string {
  const live = page.remake?.content === "public";
  const videos = live ? (page.remake?.videos ?? []).filter(video => /^[\w-]{11}$/.test(video.id)).map(video => ({
    ...video, category: "Public video", art: "", color: "#d4e9b6",
    url: `https://www.youtube.com/watch?v=${video.id}`, thumbnail: `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
  })) : videoSamples.map(video => ({ ...video, url: "", thumbnail: "" }));
  const categories = live ? ["All"] : ["All", "Technology", "Music", "Gaming", "Life"];
  const name = page.title === "YouTube" ? 'You<span class="tube">Tube</span>' : e(page.title);
  return `<header class="site-head"><div><h1 class="video-logo">${name}</h1><p class="brand-note">BROADCAST YOURSELF. AGAIN.</p></div><div class="searchbox"><label for="video-search">${live ? "Search public YouTube" : "Search sample videos"}</label><div class="searchrow"><input id="video-search" ${live ? 'data-public-search' : ""} type="search" placeholder="${live ? "Search YouTube…" : "Find something worth watching…"}"><button id="search-videos">${live ? "Search YouTube" : "Search"}</button></div>${live && page.remake?.query ? `<p class="small">Results for: ${e(page.remake.query)}</p>` : ""}</div>${original(page)}</header>
<nav class="menu" aria-label="Video navigation"><button data-library="videos" aria-pressed="true">Videos</button><button data-library="saved" aria-pressed="false">Saved in this preview</button><span class="menu-note">An independent retro remake</span></nav>
<div class="video-layout"><aside class="panel"><h2>${live ? "Public videos" : "Browse channels"}</h2>${categories.map(category => `<button class="directory-button" data-filter="${category}" aria-pressed="${category === "All"}">${category === "All" ? "▤" : "›"} ${category}</button>`).join("")}<div class="sticker">${live ? "REAL PUBLIC DATA<br>RETRO LAYOUT" : "NO ALGORITHM<br>JUST EXPLORING"}</div><p class="muted small">${live ? "Titles, channels, and thumbnails from YouTube. Playback opens the original video. No account connected." : "Illustrative sample catalog. No live videos or account data."}</p></aside>
<main><section id="video-detail" class="panel detail" hidden><button id="close-video" class="back-button">← Back to videos</button><h2 id="watch-title">${live ? "Public video" : "Sample video"}</h2><div class="sample-player"><span aria-hidden="true">▶</span><p>${live ? "WATCH THE ORIGINAL VIDEO" : "VIDEO PREVIEW"}</p>${live ? '<a id="watch-original" href="https://www.youtube.com" target="_blank" rel="noopener noreferrer">Watch on YouTube ↗</a>' : '<small>Illustrative card — no playable video connected</small>'}</div><p>${live ? "This is a real public video. Playback and availability are handled by YouTube." : "Explore this retro watch-page layout, or visit the original site for actual videos."}</p>${original(page)}</section>
<div class="section-title"><h2 id="video-section-title">${live ? "Public YouTube videos" : "Featured videos"}</h2><span class="muted">${live ? "Real source content / simulated layout" : "Sample content / creative remake"}</span></div>
<div class="video-grid">${videos.map((video, index) => `<article class="video-card" data-video-card data-search="${e((video.title + " " + video.author).toLowerCase())}" data-category="${video.category}"><button class="video-open" data-watch="${e(video.title)}" ${live ? `data-video-url="${e(video.url)}"` : ""}><div class="poster poster-${index}" style="--poster:${video.color}">${live ? `<img src="${e(video.thumbnail)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span class="poster-art" aria-hidden="true">${video.art}</span>`}<span class="duration">${e(video.duration)}</span></div><h3>${e(video.title)}</h3></button><p class="muted small">${e(video.author)}${live ? "" : " · Sample creator"}</p><div class="card-bottom"><span class="category-label">${video.category}</span><button data-save aria-pressed="false">Save</button></div></article>`).join("")}</div><p id="no-videos" role="status" hidden>${live ? "No matching loaded videos. Press Search YouTube to load new public results." : "No matching sample videos. Try another search or category."}</p></main></div>`;
}

const members = [{ name: "Alex Pixel", initials: "AP", message: "Finally made a little homepage. It has a guestbook, too. Leave a note on your way out!", color: "#dce8cf" },
  { name: "Jamie Byte", initials: "JB", message: "Weekend plan: burn a mix CD, take the camera outside, and stay offline for a while.", color: "#e5d9f3" },
  { name: "Morgan Dot", initials: "MD", message: "Does anyone else remember when every website had an under-construction sign? Bringing it back.", color: "#f5dfc5" }];

function socialSite(page: RetroPage): string {
  return `<header class="site-head social-head"><div><h1 class="social-logo">[${e(page.title.toLowerCase())}]</h1><p class="brand-note">A SMALLER, SLOWER SOCIAL NETWORK</p></div><span class="demo-account">Guest / local demo</span>${original(page)}</header>
<nav class="menu" aria-label="Social navigation"><button data-pane="social-feed" aria-pressed="true">News Feed</button><button data-pane="social-people" aria-pressed="false">People</button><button data-pane="social-about" aria-pressed="false">About this remake</button></nav>
<div class="social-layout"><aside><section class="panel"><div class="profile-avatar">YOU</div><h2>The neighborhood</h2><p class="muted small">No account connected.<br>Make yourself at home.</p></section><section class="panel"><h2>Community board</h2><p>Welcome to a quieter corner of the web.</p><div class="sticker">KEEP IN TOUCH<br>WITHOUT THE SCROLL</div></section></aside>
<main><section id="social-feed" data-panel><section class="panel composer"><h2>What's on your mind?</h2><label for="post-draft" class="small">Write a demo post — visible only in this preview</label><textarea id="post-draft" maxlength="500" rows="3" placeholder="Something worth sharing…"></textarea><div class="composer-actions"><span class="muted small">Not sent to Facebook. Resets on reload.</span><button id="publish-post">Post locally</button></div><p id="post-status" class="small" role="status"></p></section>
<div class="section-title"><h2>Your neighborhood feed</h2><span class="muted small">Fictional sample members</span></div><div id="post-list">${members.map(member => `<article class="panel post"><div class="post-head"><span class="avatar" style="background:${member.color}">${member.initials}</span><div><h3>${member.name}</h3><span class="muted small">Sample member · Demo post</span></div></div><p>${member.message}</p><div class="post-actions"><button data-like aria-pressed="false">Like</button><span class="muted small">Local interaction only</span></div></article>`).join("")}</div></section>
<section id="social-people" data-panel class="panel" hidden><h2>People in this demo</h2><p class="muted">These are fictional profiles, not Facebook users.</p>${members.map(member => `<article class="person"><span class="avatar" style="background:${member.color}">${member.initials}</span><div><h3>${member.name}</h3><p>Member of the sample neighborhood.</p></div><button data-person="${member.name}">View profile</button></article>`).join("")}<div id="profile-detail" class="panel" hidden><h3 id="profile-name"></h3><p>A fictional neighbor in this design preview. No account or personal data is connected.</p></div></section>
<section id="social-about" data-panel class="panel" hidden><h2>A familiar place, from another era</h2><p>This is an interactive design remake. You can compose demo posts and like them locally. Nothing is published or sent to Facebook.</p><p>Changing the style or reloading starts a fresh preview.</p>${original(page)}</section></main>
<aside class="right-rail panel"><h2>People you might imagine</h2>${members.map(member => `<div class="neighbor"><span class="avatar" style="background:${member.color}">${member.initials}</span><div><strong>${member.name}</strong><p class="muted small">Fictional sample member</p></div></div>`).join("")}<hr><p class="muted small">No ads. No real notifications. Just a design experiment.</p></aside></div>`;
}

function publicCodeSite(page: RetroPage): string {
  const repo = page.remake!.repository!;
  const file = repo.file;
  return `<header class="site-head"><div><h1 class="code-logo">⌘ GitHub</h1><p class="brand-note">PUBLIC CODE. ANOTHER ERA.</p></div><span class="demo-account">Public repository / read-only</span>${original(page)}</header>
<div class="repo-banner"><div><span class="muted small">PUBLIC REPOSITORY</span><h2>${e(repo.fullName)}</h2><p>${e(repo.description)}</p><span class="sample-tag">REAL SOURCE DATA / SIMULATED LAYOUT</span></div><button id="star-repo" data-label-off="☆ Star locally" data-label-on="★ Starred locally" aria-pressed="false">☆ Star locally</button></div>
<nav class="menu" aria-label="Repository navigation"><button data-pane="repo-code" aria-pressed="true">Code</button><button data-pane="repo-issues" aria-pressed="false">Issues</button><button data-pane="repo-about" aria-pressed="false">About</button></nav>
<main class="repo-main"><section id="repo-code" data-panel><div class="repo-toolbar"><span>Branch: <strong>${e(repo.branch)}</strong> · ${e(repo.path || "/")}</span><label>Find a listed file <input id="file-search" type="search" placeholder="Filename…"></label></div><button data-repo-nav="${e(repo.upUrl)}">↑ ${repo.path ? "Parent directory" : "Repository root"}</button><div class="repo-layout"><aside class="panel file-tree"><h2>Public files</h2>${repo.entries.map(entry => `<button data-repo-nav="${e(entry.url)}" data-listed-file>${entry.type === "dir" ? "▣" : "▤"} ${e(entry.name)}</button>`).join("")}${!repo.entries.length ? '<p class="small">Viewing a file. Use Parent directory to browse other files.</p>' : ""}<p id="no-files" class="small" hidden>No matching files.</p></aside><section class="panel file-view"><div class="file-title"><h2 id="file-name">${e(file?.name ?? "Directory listing")}</h2><span class="muted small">Public source${file?.truncated ? " · Preview shortened" : ""}</span></div><pre id="file-content">${e(file?.text ?? "Choose a listed file or folder to load its public contents. No file contents have been invented.")}</pre></section></div>${page.truncated ? '<p class="small">This preview has a file/listing size limit. Open GitHub for the complete source.</p>' : ""}</section>
<section id="repo-issues" data-panel class="panel" hidden><h2>Public issue tracker</h2><p>Issues are not copied into this preview. View actual issues on GitHub.</p><a href="${e(repo.issuesUrl)}" target="_blank" rel="noopener noreferrer">Open repository issues ↗</a></section>
<section id="repo-about" data-panel class="panel" hidden><h2>${e(repo.fullName)}</h2><p>${e(repo.description)}</p><p>Public data retrieved from GitHub. This retro layout is a creative simulation. Local starring does not change your GitHub account.</p>${original(page)}</section></main>`;
}

function codeSite(page: RetroPage): string {
  if (page.remake?.repository) return publicCodeSite(page);
  let project = "community / hello-web";
  try { const parts = new URL(page.sourceUrl).pathname.split("/").filter(Boolean).slice(0, 2); if (parts.length) project = parts.join(" / "); } catch { /* Use the demo project. */ }
  const files = [
    { name: "README.md", content: `# ${project}\n\nThis is a sample repository in a retro design remake.\nThese are illustrative files, not the contents of the original repository.\n\n## Welcome to the small web\n\nA homepage, a stylesheet, and a guestbook. That is all you need.\n\n- Browse the sample files on the left.\n- Try the Issues tab.\n- Star this demo locally.\n\nVisit the original site for real repository contents.` },
    { name: "index.html", content: '<!doctype html>\n<html lang="en">\n  <head><title>My corner of the web</title></head>\n  <body>\n    <h1>Hello, Internet.</h1>\n    <p>Make something small. Share it with a friend.</p>\n  </body>\n</html>' },
    { name: "style.css", content: '/* Sample file — a simpler web */\nbody {\n  background: #c0c0c0;\n  color: #000080;\n  font-family: "Times New Roman", serif;\n  max-width: 800px;\n  margin: 40px auto;\n}\n\na { color: blue; }' },
    { name: "guestbook.txt", content: 'THE GUESTBOOK\n=============\n\nHello from the neighborhood!\nYou do not need a framework to say hello.\n\n[Illustrative sample content]' },
  ];
  return `<header class="site-head"><div><h1 class="code-logo">⌘ ${e(page.title)}</h1><p class="brand-note">WHERE LITTLE PROJECTS FIND A HOME</p></div><span class="demo-account">Code hosting / design remake</span>${original(page)}</header>
<div class="repo-banner"><div><span class="muted small">REPOSITORY LAYOUT</span><h2>${e(project)}</h2><span class="sample-tag">ILLUSTRATIVE SAMPLE FILES</span></div><button id="star-repo" aria-pressed="false">☆ Star this demo</button></div>
<nav class="menu" aria-label="Repository navigation"><button data-pane="repo-code" aria-pressed="true">Code</button><button data-pane="repo-issues" aria-pressed="false">Issues</button><button data-pane="repo-about" aria-pressed="false">About</button></nav>
<main class="repo-main"><section id="repo-code" data-panel><div class="repo-toolbar"><span>Branch: <strong>main</strong> · local preview</span><label>Find a sample file <input id="file-search" type="search" placeholder="Filename…"></label></div><div class="repo-layout"><aside class="panel file-tree"><h2>Files</h2>${files.map((file, index) => `<button data-file="${index}" aria-pressed="${index === 0}">▤ ${file.name}</button>`).join("")}<p id="no-files" class="small" hidden>No matching files.</p></aside><section class="panel file-view"><div class="file-title"><h2 id="file-name">README.md</h2><span class="muted small">Sample file</span></div><pre id="file-content">${e(files[0].content)}</pre></section></div>${files.map((file, index) => `<template id="file-data-${index}" data-name="${file.name}">${e(file.content)}</template>`).join("")}</section>
<section id="repo-issues" data-panel class="panel" hidden><h2>Sample issue tracker</h2><p class="muted">Illustrative issues, not connected to a live repository.</p>${["Make the guestbook keyboard friendly", "Add a dark theme for late-night coding", "Write a getting-started guide"].map((title, index) => `<article class="issue"><button data-expand="issue-${index}" aria-expanded="false">○ ${title}</button><div id="issue-${index}" hidden><p>This is an example issue in the local design preview. No real issue will be created or changed.</p></div></article>`).join("")}</section>
<section id="repo-about" data-panel class="panel" hidden><h2>About this code forge</h2><p>A remake of a code-hosting interface with a retro file browser, sample code, and local starring.</p><p>Repository names may come from the URL; all displayed files and issues are illustrative. Open the source for real project data.</p>${original(page)}</section></main>`;
}

const css = `
*{box-sizing:border-box}html{color-scheme:light}body{margin:0;background:var(--desktop);color:#202020;font:14px/1.5 var(--font);padding:22px}button,input,textarea{font:inherit}button{cursor:pointer;background:var(--button);color:inherit;border:var(--edge);padding:6px 12px}button:hover{filter:brightness(.96)}button[aria-pressed=true]{background:var(--accent);color:var(--accent-text)}button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible{outline:3px solid #e59100;outline-offset:2px}input,textarea{background:white;color:#202020;border:2px inset #ccc;padding:7px;max-width:100%}a{color:var(--link)}p{margin:8px 0 14px}h1,h2,h3{margin:0;line-height:1.25}h2{font-size:19px}h3{font-size:15px}hr{border:0;border-top:1px solid #bbb}[hidden]{display:none!important}.site{max-width:1180px;margin:auto;background:var(--paper);border:var(--edge);box-shadow:var(--shadow)}.simulation{padding:7px 14px;background:#fff5be;border-bottom:1px solid #b6a35e;color:#4b421d;font:11px/1.5 Arial,sans-serif}.simulation strong{letter-spacing:1px}.site-head{display:flex;gap:24px;align-items:center;justify-content:space-between;padding:22px;border-bottom:1px solid #aaa}.site-head h1{font-size:38px}.site-head>a{font-size:12px;white-space:nowrap}.brand-note{margin:8px 0 0;font:10px "Courier New",monospace;letter-spacing:1.4px}.menu{display:flex;align-items:center;gap:6px;flex-wrap:wrap;background:var(--nav);border-bottom:var(--edge);padding:8px 18px}.menu-note{margin-left:auto;font-size:11px;color:var(--nav-text)}.searchbox{flex:1;max-width:430px}.searchbox label{display:block;font-size:11px;margin-bottom:3px}.searchrow{display:flex;gap:5px}.searchrow input{width:100%;min-width:0}.video-logo{font-family:Arial,sans-serif;letter-spacing:-2px}.tube{display:inline-block;background:#c32323;color:white;border-radius:9px;padding:2px 5px;margin-left:1px}.video-layout{display:grid;grid-template-columns:180px minmax(0,1fr);gap:20px;padding:20px}.panel{border:var(--edge);background:var(--panel);padding:16px;min-width:0}.panel>h2{margin-bottom:12px}.directory-button{display:block;width:100%;text-align:left;margin-bottom:5px}.sticker{padding:10px 4px;text-align:center;border:2px outset #ddd;background:#ece4ba;color:#3b3824;font:bold 11px "Courier New",monospace;letter-spacing:1px;margin:20px 0}.small{font-size:11px}.muted{color:#616161}.section-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:15px}.section-title>span{font-size:11px}.video-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px 14px}.video-card{min-width:0}.video-open{border:0;background:transparent;padding:0;text-align:left;width:100%;color:var(--link)}.video-open h3{margin-top:8px;text-decoration:underline}.poster{position:relative;aspect-ratio:16/10;background:var(--poster);border:3px double #777;display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:inset 0 0 0 5px #ffffff50;background-image:linear-gradient(135deg,#ffffff50,transparent)}.poster:before{content:"";position:absolute;inset:8px;border:1px dashed #7778}.poster-art{font:bold 29px "Courier New",monospace;color:#202020;text-shadow:2px 2px #fff7;white-space:nowrap}.duration{position:absolute;right:3px;bottom:3px;background:#222;color:white;font:10px monospace;padding:1px 4px}.card-bottom{display:flex;justify-content:space-between;align-items:center}.card-bottom button{font-size:11px;padding:3px 7px}.category-label{font-size:10px;text-transform:uppercase;color:#666}.video-card .muted{margin-bottom:8px}.detail{margin-bottom:20px}.detail h2{margin:14px 0}.sample-player{background:#151a26;color:#eee;text-align:center;padding:35px 16px;border:5px ridge #777;min-height:210px;font-family:monospace}.sample-player>span{font-size:45px;color:#ddd}.back-button{font-size:12px}.social-logo{font-family:Georgia,serif;letter-spacing:-1.5px;color:var(--accent)}.demo-account{font-size:11px;color:#666}.social-layout{display:grid;grid-template-columns:160px minmax(0,1fr) 210px;gap:16px;padding:20px}.social-layout>aside>.panel{margin-bottom:16px}.profile-avatar{display:grid;place-items:center;margin-bottom:12px;width:80px;height:80px;border:var(--edge);background:#a6bacd;color:#fff;font:bold 18px monospace}.composer textarea{width:100%;display:block;margin:8px 0;resize:vertical}.composer-actions{display:flex;justify-content:space-between;gap:10px;align-items:center}.composer{margin-bottom:22px}.post{margin-bottom:14px}.post-head{display:flex;gap:10px;align-items:center;margin-bottom:13px}.post-head h3{color:var(--link)}.avatar{display:grid;place-items:center;width:38px;height:38px;flex-shrink:0;border:1px solid #999;font:bold 12px monospace}.post-actions{border-top:1px solid #ddd;padding-top:9px;display:flex;align-items:center;gap:12px}.post-actions button{font-size:12px}.neighbor{display:flex;gap:8px;align-items:center;margin-bottom:15px;font-size:11px}.neighbor p{margin:2px 0}.person{display:flex;gap:12px;align-items:center;padding:14px 0;border-bottom:1px solid #ccc}.person>div{flex:1}.person p{margin:3px 0;font-size:12px}.right-rail{align-self:start}.code-logo{font-family:"Courier New",monospace;letter-spacing:-2px}.repo-banner{display:flex;justify-content:space-between;align-items:center;padding:22px;gap:14px}.repo-banner h2{font:22px "Courier New",monospace;margin:7px 0;color:var(--link);overflow-wrap:anywhere}.sample-tag{font-size:10px;color:#666;letter-spacing:1px}.repo-main{padding:20px}.repo-toolbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:13px;gap:15px;font-size:12px}.repo-toolbar input{width:160px}.repo-layout{display:grid;grid-template-columns:200px minmax(0,1fr);gap:14px}.file-tree{padding:0}.file-tree h2{font-size:13px;padding:12px;border-bottom:1px solid #bbb}.file-tree button{display:block;width:100%;border:0;border-bottom:1px solid #ddd;background:transparent;text-align:left;font:12px "Courier New",monospace;padding:12px}.file-tree button[aria-pressed=true]{background:var(--accent);color:var(--accent-text)}.file-view{padding:0}.file-title{display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:1px solid #bbb}.file-title h2{font:13px "Courier New",monospace}.file-view pre{font:12px/1.8 "Courier New",monospace;white-space:pre-wrap;overflow-wrap:anywhere;margin:0;padding:20px;min-height:330px;background:var(--code)}.issue{border-top:1px solid #ccc;padding:12px 0}.issue button{background:transparent;border:0;color:var(--link);text-align:left}.site-footer{padding:12px 18px;border-top:var(--edge);font:11px/1.5 "Courier New",monospace;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}.theme-web95{--desktop:#bfbfbf;--paper:#fffdf0;--panel:#f3f2e9;--button:#ddd;--edge:2px groove #bbb;--accent:#000080;--accent-text:white;--link:#0000bb;--nav:#ddd;--nav-text:#555;--font:"Times New Roman",serif;--shadow:4px 4px 0 #777;--code:#fffdf0}.theme-portal{--desktop:#071a3b;--paper:#fff;--panel:#f0f5ff;--button:#e2ecfc;--edge:1px solid #89a2c4;--accent:#0753b7;--accent-text:white;--link:#004eaf;--nav:#06408e;--nav-text:#d4e6ff;--font:Verdana,Arial,sans-serif;--shadow:0 0 0 5px #285386;--code:#f8fbff;font-size:12px}.theme-portal .site-head{background:linear-gradient(125deg,#deebff,#fff)}.theme-portal .section-title{border-bottom:3px solid #1761c0;padding-bottom:8px}.theme-win98{--desktop:#008080;--paper:#c0c0c0;--panel:#fff;--button:#c0c0c0;--edge:2px outset #e6e6e6;--accent:#000080;--accent-text:white;--link:#000080;--nav:#c0c0c0;--nav-text:#444;--font:Tahoma,Arial,sans-serif;--shadow:5px 5px 0 #005858;--code:white;font-size:12px}.theme-win98 .site{padding:4px}.theme-win98 .site-head{background:linear-gradient(90deg,#000080,#1782c5);color:white}.theme-win98 .site-head a,.theme-win98 .site-head .demo-account,.theme-win98 .social-logo{color:white}.theme-win98 .searchbox input{color:black}.theme-win98 .site-head button{color:#222}.theme-win98 .video-logo{font-size:32px}.theme-win98 .poster{border:3px inset #ddd}.theme-win98 .file-view,.theme-win98 .post{border:2px inset #ddd}@media(max-width:800px){body{padding:12px}.video-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.social-layout{grid-template-columns:140px minmax(0,1fr)}.right-rail{display:none}.site-head{flex-wrap:wrap;gap:15px}.searchbox{max-width:none}.repo-toolbar{flex-wrap:wrap}}@media(max-width:560px){body{padding:6px}.site-head{padding:15px}.site-head h1{font-size:30px}.video-layout,.social-layout,.repo-layout{grid-template-columns:1fr;padding:12px}.repo-layout{padding:0}.video-layout>aside{display:flex;flex-wrap:wrap;gap:5px;align-items:center}.video-layout>aside h2{width:100%}.directory-button{width:auto;margin:0}.video-layout>aside .sticker,.video-layout>aside p,.social-layout>aside{display:none}.video-grid{gap:16px 10px}.poster-art{font-size:23px}.repo-banner{padding:14px}.repo-banner h2{font-size:17px}.repo-main{padding:12px}.menu{padding:8px;gap:4px}.menu-note{display:none}.section-title{align-items:flex-start;flex-direction:column;gap:4px}.file-tree{display:flex;flex-wrap:wrap}.file-tree h2{width:100%}.file-tree button{width:auto}.composer-actions{flex-wrap:wrap}.site-footer{font-size:10px}}
`;

// Fixed, authored interaction code. Source text is never inserted into this script.
const interactionScript = `
(() => {
  const all = s => Array.from(document.querySelectorAll(s));
  const byId = id => document.getElementById(id);
  let category = 'All', library = 'videos';
  function filterVideos() {
    const q = (byId('video-search')?.value || '').trim().toLowerCase();
    let visible = 0;
    all('[data-video-card]').forEach(card => {
      const saved = card.querySelector('[data-save]').getAttribute('aria-pressed') === 'true';
      card.hidden = !(card.dataset.search.includes(q) && (category === 'All' || card.dataset.category === category) && (library !== 'saved' || saved));
      if (!card.hidden) visible++;
    });
    if (byId('no-videos')) byId('no-videos').hidden = visible > 0;
  }
  byId('video-search')?.addEventListener('input', filterVideos);
  function searchYoutube() {
    const input = byId('video-search');
    if (input?.hasAttribute('data-public-search') && input.value.trim()) {
      parent.postMessage({ source: 'dead-internet-remake', action: 'youtube-search', query: input.value.trim().slice(0,200) }, '*');
    } else filterVideos();
  }
  byId('search-videos')?.addEventListener('click', searchYoutube);
  byId('video-search')?.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); searchYoutube(); } });
  byId('file-search')?.addEventListener('input', event => {
    let count = 0;
    all('[data-file], [data-listed-file]').forEach(button => { button.hidden = !button.textContent.toLowerCase().includes(event.target.value.toLowerCase()); if (!button.hidden) count++; });
    byId('no-files').hidden = count > 0;
  });
  document.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.hasAttribute('data-filter')) {
      category = button.dataset.filter;
      all('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      filterVideos();
    }
    if (button.hasAttribute('data-library')) {
      library = button.dataset.library;
      all('[data-library]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      byId('video-section-title').textContent = library === 'saved' ? 'Saved in this preview' : 'Featured videos';
      filterVideos();
    }
    if (button.hasAttribute('data-save') || button.hasAttribute('data-like') || button.id === 'star-repo') {
      const pressed = button.getAttribute('aria-pressed') !== 'true'; button.setAttribute('aria-pressed', String(pressed));
      button.textContent = button.id === 'star-repo' ? (pressed ? button.dataset.labelOn || '★ Starred locally' : button.dataset.labelOff || '☆ Star this demo') : button.hasAttribute('data-save') ? (pressed ? 'Saved' : 'Save') : (pressed ? 'Liked' : 'Like');
      if (button.hasAttribute('data-save')) filterVideos();
    }
    if (button.hasAttribute('data-watch')) {
      byId('watch-title').textContent = button.dataset.watch;
      if (byId('watch-original') && button.dataset.videoUrl) byId('watch-original').href = button.dataset.videoUrl;
      byId('video-detail').hidden = false; byId('video-detail').scrollIntoView({block:'start'});
    }
    if (button.id === 'close-video') byId('video-detail').hidden = true;
    if (button.hasAttribute('data-pane')) {
      all('[data-panel]').forEach(panel => panel.hidden = panel.id !== button.dataset.pane);
      all('[data-pane]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    }
    if (button.hasAttribute('data-person')) { byId('profile-detail').hidden = false; byId('profile-name').textContent = button.dataset.person; }
    if (button.hasAttribute('data-expand')) {
      const detail = byId(button.dataset.expand); detail.hidden = !detail.hidden; button.setAttribute('aria-expanded', String(!detail.hidden));
    }
    if (button.hasAttribute('data-repo-nav')) parent.postMessage({ source: 'dead-internet-remake', action: 'github-navigate', url: button.dataset.repoNav }, '*');
    if (button.hasAttribute('data-file')) {
      const template = byId('file-data-' + button.dataset.file);
      byId('file-name').textContent = template.dataset.name;
      byId('file-content').textContent = template.content.textContent;
      all('[data-file]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    }
    if (button.id === 'publish-post') {
      const draft = byId('post-draft'), text = draft.value.trim().slice(0,500);
      if (!text) { byId('post-status').textContent = 'Write a message first.'; return; }
      const post = document.createElement('article'); post.className = 'panel post';
      const heading = document.createElement('h3'); heading.textContent = 'You (local demo)';
      const meta = document.createElement('p'); meta.className = 'muted small'; meta.textContent = 'Just now · preview only';
      const body = document.createElement('p'); body.textContent = text;
      const like = document.createElement('button'); like.setAttribute('data-like',''); like.setAttribute('aria-pressed','false'); like.textContent = 'Like';
      post.append(heading,meta,body,like); byId('post-list').prepend(post); draft.value = '';
      byId('post-status').textContent = 'Added to this preview only. Nothing was published to Facebook.';
    }
  });
})();
`;

export function renderRemake(page: RetroPage, style: RetroStyle): string {
  const kind = page.remake!.kind;
  const live = page.remake!.content === "public";
  const content = kind === "youtube" ? videoSite(page) : kind === "facebook" ? socialSite(page) : codeSite(page);
  const safeStyle = ["web95", "portal", "win98"].includes(style) ? style : "web95";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-retro-local-v1'; style-src 'unsafe-inline'; img-src ${live && kind === 'youtube' ? 'https://i.ytimg.com' : "'none'"}; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'">
<title>${e(page.title)} — interactive retro remake</title><style>${css}.poster img{position:absolute;width:100%;height:100%;object-fit:cover;inset:0}.sample-player a{color:#a6d4ff}</style></head><body class="theme-${safeStyle}"><div class="site"><div class="simulation"><strong>SIMULATED / INTERACTIVE REMAKE</strong> · ${live ? "Real public source content. Layout is simulated." : "Sample content."} No account connected. Local changes reset on style change or reload.</div>${content}<footer class="site-footer"><span>DEAD INTERNET · A familiar site from another timeline</span>${original(page)}<span>${live ? "PUBLIC SOURCE CONTENT" : "ILLUSTRATIVE SAMPLE CONTENT"}</span></footer></div><script nonce="retro-local-v1">${interactionScript}</script></body></html>`;
}
