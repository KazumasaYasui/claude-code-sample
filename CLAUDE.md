# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A browser-based breakout game (ブロック崩し) built with vanilla HTML5 Canvas and JavaScript. No build system, bundler, or package manager is used — the game runs directly in a browser by opening `index.html`.

## Running the Game

Open `index.html` in a browser. There is no build step or server required.

The devcontainer has Playwright/Chromium installed (via `post_create.sh`), so automated browser testing can be done using `npx playwright`.

## Architecture

The project is two files:

- **`index.html`** — Layout, styling (dark theme, canvas dimensions 480×540), and UI elements (score, lives, level, message, restart button). Loads `main.js` as a `<script>`.
- **`main.js`** — All game logic in a single file using `'use strict'` vanilla JS:
  - **State machine**: `STATE_IDLE` → `STATE_PLAYING` → `STATE_DEAD` / `STATE_WIN` / `STATE_GAMEOVER`
  - **Game loop**: `requestAnimationFrame`-based `loop()` calling `update()` then `draw()` each tick
  - **Physics**: Circle-rect collision via `circleRect()` and `resolveCollision()` for ball/brick/paddle interactions
  - **Progression**: Ball speed increases each level (`4 + (level - 1) * 0.5`); bricks award more points for higher rows
  - **Input**: Arrow keys / A-D keys for paddle movement, mouse position overrides keyboard, Space/Enter/Click to launch
