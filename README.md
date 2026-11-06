# Neon Worlds

Animated pixel-art scenes from the worlds of science fiction, with endless music composed live in the browser. Pick a world, press play, let it run.

**Live:** https://rendorf.github.io/neon-worlds/

Inspired by [Lofi Cities](https://loficities.com), which pairs pixel-art city nights with lofi music made in the browser. Neon Worlds carries the same idea into science fiction.

Twelve worlds ship in v1: Night City, Los Angeles 2019, Neo-Tokyo, Niihama, Chiba City, The Grid, Coruscant, Mega-City One, Vavatch Orbital, Millville, Arrakeen and The Citadel.

**Silicon Based Lifeforms radio.** Press `R`, or the Radio chip, to swap each world's own music for a station of slow, warm psybient in the style of [Carbon Based Lifeforms](https://carbonbasedlifeforms.net). Its tracks run about five minutes in a long-form arrangement (beatless intro, build, groove, breakdown, groove, outro). The pad, sequence and bass filters follow one brightness curve, so the sound opens over minutes. A soft rolling bass, sidechained pads and a greenhouse-water field recording complete it. The station stays on as you change worlds and is shared with `?radio=lifeforms`. It is a tribute: composed live, not their music, and not affiliated with them.

Everything is generated: every scene is drawn by code at 480×270 and loops every four minutes, every note and every ambient sound is synthesised with Web Audio. There are no samples, images or fonts to download, no backend and no tracking.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # loop-seam, determinism and music tests
npm run build      # static site in dist/
npm run preview    # serve dist/ locally
```

`dist/` is a plain static site with relative paths. Every push to `main` runs the tests, builds and deploys to GitHub Pages through `.github/workflows/deploy.yml`. It also works on Cloudflare Pages, Vercel, Netlify or any web server with no configuration.

## Features

- World picker with thumbnails, favourites and a passport of visited worlds.
- Weather per world: rain, acid rain, snow, ash, data rain, sandstorm, dust storm, smog, and a day-night cycle.
- Endless generated music in each world's own style, with up next, skip, and a vibe switch (calm, focus, drive).
- Radio: switch from world music to the Silicon Based Lifeforms psybient station, which plays over every world.
- Synthesised world sounds with a per-world mixer.
- Tour mode, focus timer with tasks, save scene as PNG, share link, mini player (picture-in-picture), fullscreen.
- Settings: CRT scanlines, reduce motion, 12/24-hour clock, fill or whole-scene fit, tour length.
- Keyboard shortcuts: press `?` in the app.

State lives in `localStorage` only. Share links carry `?world=&weather=&vibe=` and, when the radio is on, `&radio=lifeforms`.

## How it is built

```
src/
  main.ts, app.ts        boot and the controller that wires everything
  scene/                 core maths (loop time, seeded rng, hashing), drawing helpers, weather, renderer
  worlds/                one file per world + registry (index.ts)
  audio/                 theory, styles, composer (pure), engine (Web Audio graph), player (scheduler), ambience
  state/                 store (localStorage) and URL
  ui/                    icons, DOM kit, panels
tests/                   vitest: loop seam per world and weather, composer determinism, theory
gallery.html             dev page: every world and weather side by side (?world=id&big&weather&live)
audio-lab.html           dev page: renders every music style offline and prints levels per role
```

Two rules keep it seamless:

1. **Scenes are pure functions of loop time.** `drawStatic` runs once into an offscreen canvas. `drawFrame(ctx, t)` may only use `t` through `phase`, `wave`, `tick`, `hash2` and `lane`, with an integer number of cycles per 240-second loop. The test suite checks that the frame at `t` equals the frame at `t + 240` for every world and weather.
2. **Music is composed from a seed.** `composeTrack(style, seed, vibe)` and `eventsAt(track, step)` are pure, so a track can be replayed exactly. The player schedules notes ahead on the audio clock (lookahead scheduler) so background tabs do not glitch.

## Add a world

1. Copy `src/worlds/night-city.ts` to `src/worlds/<id>.ts` and change the metadata and drawing.
2. Add a `MusicStyle` with the same `id` to `STYLES` in `src/audio/styles.ts`.
3. Register the world in `src/worlds/index.ts`.
4. Run `npm test`, then check it in `gallery.html?world=<id>&big&weather` and balance it in `audio-lab.html`.

## Legal

Unofficial, non-commercial fan project. World names refer to the works credited in the app. All art, music and sound are original. Not affiliated with or endorsed by any rights holder. If the site ever earns money, revisit the use of franchise names.
