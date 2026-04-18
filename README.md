# WistiaGet — Wistia Video Extractor

A lightweight, serverless browser tool for extracting and downloading Wistia-hosted videos. No installs, no server, no dependencies — open the HTML file and go.

---

## Files

```
wistia-downloader.html   — markup and page structure
wistia-downloader.css    — all styles and layout
wistia-downloader.js     — extraction logic and UI behavior
README.md                — this file
```

All three files must be kept in the same folder. Open `wistia-downloader.html` in any modern browser to run the tool.

---

## How It Works

The tool follows the same steps you would take manually:

1. **Find the Wistia video ID** — scanned from the page HTML by locating the `fast.wistia.com/embed/medias/{id}` URL embedded in the source.
2. **Fetch the media manifest** — calls `https://fast.wistia.net/embed/medias/{id}.json`, Wistia's public metadata endpoint.
3. **Parse all assets** — reads every entry in the `media.assets` array from the JSON response.
4. **Present a download grid** — displays all available formats with name, size, dimensions, and direct download links.

---

## Usage

### URL Mode (public pages)

1. Paste the URL of any page containing a Wistia video into the input field.
2. Press **Extract ↗** or hit `Enter`.
3. The tool fetches the page source, finds the video ID, then queries the Wistia API automatically.

> Pasting a URL that starts with `http` will auto-trigger extraction.

### Page Source Mode (auth-protected pages)

For pages behind a login (course platforms, membership sites, etc.) the tool cannot fetch the source on your behalf due to browser CORS restrictions. Use this mode instead:

1. Click the **⟨/⟩ Page Source** tab.
2. Open the video page in your browser and press `Ctrl+U` (`⌘+U` on Mac) to open the raw page source.
3. Press `Ctrl+A` then `Ctrl+C` to copy everything.
4. Paste into the textarea and press **Extract ↗**.

---

## Results Grid

Once extraction succeeds, a table is rendered with one row per asset:

| Column | Description |
|---|---|
| **Name** | Asset type (e.g. Original, Hd Mp4 Video, Iphone Video) |
| **Size** | File size in KB, MB, or GB |
| **Width** | Video width in pixels |
| **Height** | Video height in pixels |
| **URL** | Direct `.mp4` delivery URL (truncated, full URL shown on hover) |
| **Copy URL** | Copies the `.mp4` URL to your clipboard |
| **Download** | Opens the `.mp4` URL in a new browser tab |

All asset types returned by Wistia are shown — not just the highest quality — so you can choose the format that suits your needs.

---

## Console Log

The on-screen log panel shows a timestamped trace of every step:

- Page fetch status (direct or via proxy)
- Matched pattern used to find the video ID
- The `fast.wistia.net` JSON URL (clickable)
- Whether the direct or proxy fetch succeeded
- The full raw JSON response in a scrollable code block
- Asset count and final status

This makes it easy to diagnose failures without opening browser DevTools.

---

## Video ID Detection

The tool scans for the video ID using the following patterns, in priority order:

| Priority | Pattern | Example match |
|---|---|---|
| 1 | `fast.wistia.com/embed/medias/{id}` | Found in page `<script>` tags |
| 2 | `fast.wistia.net/embed/iframe/{id}` | Found in `<iframe>` embeds |
| 3 | `hashedId: "{id}"` | Found in inline JS config |
| 4 | `_wq.push(... id: "{id}" ...)` | Found in Wistia queue calls |
| 5 | `wvideo={id}` | Found in query strings |
| 6 | `wistia_{id}` | Found in CSS class names |

---

## CORS Handling

Direct fetches from the browser are blocked by CORS on most third-party pages. The tool handles this with a three-tier fallback:

1. **Direct fetch** — attempted first; succeeds if the target allows cross-origin requests.
2. **allorigins.win** — public CORS proxy, tried second.
3. **corsproxy.io** — tried third.
4. **cors.sh** — final fallback.

If all fetches fail (common for auth-protected pages), the console will prompt you to switch to **Page Source** mode.

---

## Limitations

- **Private / password-protected videos** — the Wistia metadata API (`fast.wistia.net/embed/medias/{id}.json`) is public, but the video delivery URLs it returns may still require a valid session or referrer check depending on how the account is configured. In those cases the download link will return a 403 or redirect.
- **HLS streams** — some Wistia accounts serve video as `.m3u8` (HLS) rather than plain `.mp4`. These links are listed in the grid but cannot be downloaded directly in a browser; use a tool like [FFmpeg](https://ffmpeg.org) or [VLC](https://www.videolan.org) to download HLS streams.
- **No server required** — the tool runs entirely in the browser. There is no backend, no API key, and no data is sent anywhere except to Wistia's own CDN and the CORS proxies listed above.

---

## Manual Fallback

If all automated methods fail, you can retrieve the video manually:

1. Right-click the playing video and select **Copy link**.
2. Find the video ID in the copied URL — look for `wvideo=` or `hashedId=`.
3. Open `https://fast.wistia.net/embed/iframe/[VIDEO-ID]` in your browser.
4. In the page source, search for `"type":"original"` and copy the URL on the next line.
5. Replace the `.bin` extension with `.mp4` and open that URL to download.
