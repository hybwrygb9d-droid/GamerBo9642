# UQT — Universal Quest Tracker

Barebones, dependency-free browser prototype. Open `index.html` or serve it with any static web server. GitHub Pages can serve the repository root from `main`.

## Working
- Multiple games with optional Roblox links
- Goals with current/target values, units, notes, completion and pinning
- Manual inventory/session notes
- Browser-local automatic saves; JSON backup export/import
- F2 toggles the compact tracker; F3 hides it without deleting progress
- Drag the compact tracker within the page

## Limits
Automatic scanning, current game research, recommendations and screen recognition are not implemented. The scan control is disabled and labelled accordingly. Shortcuts require page focus. This is not a Windows desktop overlay and cannot stay above Roblox. Saves belong to this browser and website address; clearing site data removes them. Export backups before changing devices or addresses. No accounts, analytics, subscriptions, external scripts, or backend.

## Verification
Browser checks passed for adding a game and goal, progress increments, persistence after reload, F2 compact mode and F3 closing. JavaScript syntax checked with Node. Backup round-trip validation is recorded separately when completed.
