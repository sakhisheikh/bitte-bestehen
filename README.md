# Driving Theory

A speed-memorization tool for the German driving theory exam (Class B, TÜV/DEKRA), in English. ~2,400 questions, three viewing modes, installable as a PWA, fully offline-capable.

The intent: most theory apps are slow because they make you guess, submit, and read feedback. This one shows the correct answers pre-highlighted from the start. The job is recognition, not testing — you stop wasting cycles on the wrong-answer reinforcement loop.

## Three views

- **Quiz** (`/`) — One question at a time. Swipe, arrow keys, or tap to advance. Correct answers highlighted in green. Progress auto-saved.
- **Feed** (`/feed.html`) — Same rich card layout but stacked into one continuous scroll. Native scroll only, no gestures hijacking your swipe.
- **Cheatsheet** (`/cheatsheet.html`) — Compact one-row-per-question reference. Smart inline answers for short responses (e.g. distances, speeds). Print or save as PDF for ambient study during dead time.

All three share filter and shuffle state. Filter to 5-point questions only — those are the make-or-break ones (two appear on every exam; failing both = automatic fail).

## Install on iPhone

1. Open the deployed URL in Safari
2. Share → "Add to Home Screen"
3. Launches fullscreen; works offline after first load (service worker caches everything)

## Data source

Questions are sourced from [yowmamasita/driving-theory](https://github.com/yowmamasita/driving-theory) — official TÜV and DEKRA German driving theory questions translated to English.

## Tech

Vanilla JS, single HTML files per view, no build step, no framework. Service worker for offline. ~3.5 MB total including all 2,413 questions.
