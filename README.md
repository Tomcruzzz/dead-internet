# Dead Internet

Find a historical website snapshot using the Internet Archive Wayback Machine.

## Run locally

Install dependencies with `npm ci`, then run `npm run dev` and open
http://localhost:3000. For production, run `npm run build` then `npm start`.
Use a Node.js version supported by the installed Next.js package.

Enter a website such as `youtube.com` and a date such as `2007-06-15`.
Dates accept YYYY, YYYY-MM, or YYYY-MM-DD; omitted parts default to January/day 1.
The app searches within six calendar months of the target, tries with and without
www, and displays the nearest successful HTML capture and its source link.

## Playback and recovery

Archived pages load in an isolated Wayback iframe. Use **Retry snapshot** to reload,
**Use static safe mode** to disable archived scripts, or **Open on Wayback** to view
the source directly. Static mode may omit content that requires JavaScript.
Neither mode allows archived pages to navigate the top-level app or access its origin.

A viewer load event does not prove that the archived page rendered successfully.
Cross-origin restrictions prevent checking its contents; missing resources, blank
pages, and archive errors can still occur. Recovery controls remain available.

Archive lookup requests have a 45-second server deadline and the client stops
waiting after 60 seconds. Archive access requires a working Internet connection.
No archive API key or environment variables are required.

## Verification

- `npm test`: unit and mocked API regression tests.
- `npm run lint`: lint checks.
- `npm run build`: production compilation and type checking.
- `npm run smoke`: real-network HTTP checks against a running app on port 3000.
  Set `SMOKE_BASE_URL` to test another address.

HTTP smoke checks cover a real historical lookup, missing snapshots, future dates,
invalid dates, and playback HTTP content. They do not prove visible iframe rendering.
Browser acceptance remains tracked in `.kiro/completion-plan.md`.
