# Verification — 18 November 2026

Passed:
- Eight Node regression tests: catalog refresh preserves confirmations across renamed entries; untrusted catalog entries cannot set owned status; malformed imported scan data is normalized; overlapping unit-name matching; late catalog/research replies do not overwrite closed sessions; a late screen stream is stopped after close; cancellation prevents stale OCR writes; automatic scanning does not overlap OCR jobs.
- Real browser OCR on a synthetic image matched Camera Fighter and Ultimate CameraGuy.
- Existing v0.2 saves loaded in v0.3. Confirmed ownership and previous goals survived refresh.
- Missing item -> tracked goal remained unfinished after reload. Duplicate tracking is disabled.
- Quality threshold and ownership persisted after reload; missing-item filter worked.
- F3 closed the scanner and tracker.
- Public Skibi Defense source refreshed successfully: 280 entries on 18 November 2026.
- Local research HTTP endpoint returned 280 entries for the allowed UQT origin and rejected unrelated origins and invalid Host headers.
- JavaScript syntax checks.

Not verified end-to-end:
- Real Roblox inventory OCR, OS capture permission and Windows behavior.
- Roblox automatic launch: the automated browser blocked its deep-link navigation in the previous test.
- The in-app browser screen-sharing picker cannot be operated by the test tools. The pending test was ended by closing/reloading the preview.
- General wiki discovery across arbitrary games, exhaustive game coverage, or recommendations.

The OCR fixture is synthetic inventory text; this is not a claim of testing against a live Roblox account.
