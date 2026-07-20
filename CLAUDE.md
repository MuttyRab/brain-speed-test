# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Brain Speed Test** (`index.html`) is a self-contained, single-file cognitive processing-speed test: inline CSS, vanilla JS, no build system, no framework, no dependencies. It runs a battery of 5 timed tests (Raw Reaction Speed, Decision Speed, and three more) as a step-through wizard UI (`.screen`/`.screen.active` panels), scores results client-side against published norms (e.g. reaction-speed baselines cited from Huentelman et al. 2020 / MindCrowd), and persists only a light/dark theme preference to `localStorage` (`bst` key) — no other state survives a reload.

The version marker lives in an HTML comment near the top (`<!-- brain-speed-test v9-fixed -->`) — bump it when making a meaningful revision, matching the existing convention.

Deployed as a static site to **GitHub Pages** at the custom domain `testbrainspeed.com` (see `CNAME`); `.nojekyll` disables Jekyll processing so the raw HTML is served as-is.

`online_viewer_net.html` is an unrelated scratch/paste artifact (its content literally begins with the stray text `Put your HTML text here<!doctype html>...`) — it is not part of the deployed app and should not be treated as a second entry point.

## Running and testing

Open `index.html` directly in a browser — no server or build step needed. There is no test suite; verify changes by clicking through the wizard (`Start Test 1` → ... → results screen) and toggling the light/dark theme button in both states.

## Conventions

- Keep the app in the single `index.html` file — no external JS/CSS, no dependencies.
- Match the existing inline-CSS custom-property theming approach (`.light` class toggle on `<html>`) and the `.screen`/`.screen.active` step-wizard pattern when adding new tests or screens.
