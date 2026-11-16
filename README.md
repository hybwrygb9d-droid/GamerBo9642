# UQT — Universal Quest Tracker v0.2

[Open UQT](https://hybwrygb9d-droid.github.io/GamerBo9642/)

## Skibi Defense scanner
1. Add **Skibi Defense**. Its Roblox link is filled automatically when scanning.
2. Click **Scan this game**. With automatic launch enabled, UQT requests that the browser open the installed Roblox client. The browser may ask for confirmation.
3. Click **Share game window** and choose Roblox, or choose **Scan screenshot**.
4. Open your inventory, click **Scan current screen**, and repeat as you scroll through inventory pages. UQT reads text locally using Tesseract.js.
5. Review matches. Set owned/missing status yourself, and choose **Track as goal** for anything you want to track. Unseen entries stay unknown.
6. **Done · save & close** stops capture. Progress, reviewed items and the research catalog save in this browser. Future progress updates are manual.

The bundled Skibi Defense catalog was fetched on 16 November 2026 from https://rowikis.com/skibi-defense/towers/ and has 280 unit names and source links. It is a community reference and includes some event, removed, and unobtainable units. It is not a complete verified knowledge base of the game.

## Live internet research
GitHub Pages cannot execute a research server. Download `uqt-scanner.zip` from **Research sources & helper**, extract it, and use Python 3.9 or later:
- Windows: double-click `Start-UQT-Windows.cmd` (Python's `py` launcher required).
- macOS: from the extracted folder, run `python3 research/helper.py`.

The helper listens only at `127.0.0.1:8766`. Leave its terminal open. It opens a local copy of the tracker. You may also keep using the GitHub Pages tracker if your browser allows local-network access. The two addresses have separate browser saves; export/import to transfer progress.

On opening the scanner, UQT checks for the helper and refreshes sources if it is running. **Research / refresh** retries manually. Skibi Defense uses its known tower reference. Other games use best-effort wiki source discovery, or the source URLs you supply. Discovery and sites can fail or block requests. The helper collects linked item candidates from up to ten pages within a 90-second research budget; review those candidates. It does not use an LLM or promise exhaustive research, recommendations, icon recognition, prices, or accurate ownership inference.

## Privacy and controls
Images and screen frames stay in the browser. Recognition engine/language files download from jsDelivr and Project Naptha on first use. Research sends the game name and chosen public source URLs to the helper, which fetches public web pages. No Roblox password, account cookie, process memory, or injected scripts are used.

F2 toggles compact mode; F3 closes the tracker and stops capture. Shortcuts require page focus. Compact mode is draggable inside the tab, not a Windows desktop overlay. Browser/OS screen-capture permission is required; a website cannot silently bypass it.

Export backups before clearing site data or switching addresses/devices. Tesseract.js 6.0.1 is included under Apache-2.0; see `research/TESSERACT-LICENSE.md`.
