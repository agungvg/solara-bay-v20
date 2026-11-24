<!-- Fix #3 re-cover (2026-11-24): recorded re-write of the fix #2 foot + meta pass. -->
# Solara Bay — GTA 6 open-world crime game (make.fun bounty gta6-01)

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/c/gta6-01)
[![rank](https://make.fun/badge/gta6-01/agungvg/solara-bay-v20/rank.svg)](https://make.fun/c/gta6-01)
[![reward](https://make.fun/badge/gta6-01/agungvg/solara-bay-v20/reward.svg)](https://make.fun/c/gta6-01)

An original open-world crime game set in Solara Bay, a sun-soaked bay city:
a beachfront boulevard, a big yacht with a tall sail, a Ferris wheel, a
lantern market, and a skyline of warm stucco towers. Play as Mara Voss —
steal cars, outrun the SBPD, fight the Regent crew, and fly the jetpack over
the sunset boulevard.

## What is in the game

- **8 story missions** with staged objectives, win/lose and payouts
  (M1 First Light → M8 The Solara Heist), plus side jobs and collectibles
- **Wanted 0–5** state machine with 6 named SBPD units (roles + live distances)
- **Vehicles**: hero Comet GT sports car, 5 SBPD police sedans, traffic,
  scooter, tank, 2 searchlight helicopters
- **Combat**: 6 weapon slots (pistol → rocket launcher), ammo, tracers,
  muzzle flash, debris, downed enemies with a pulsing red ring
- **Jetpack**: fuel gauge, flight over the bay, chased by helicopters
- **City**: boulevard, beach + umbrellas, ocean + big yacht, pier, Ferris
  wheel, lantern market with a giant FRUIT sign, palms, 1024px facades
- **Sky**: gradient dome + Tier-2 billboard clouds, noon and golden-hour
  presets, fog matched to the horizon, one shadow-casting sun (4096 map)
- **HUD + minimap**: mission box, cash, clock, wanted stars, SBPD unit list,
  health, weapon, speed, damage, circular minimap
- **Meta**: MAP/STATS screen — detailed street-grid map with the gold M6 route,
  mission ratings M1–M8, 66.1% completion ring, 8 progress tracks, career stats,
  workshop OWNED/LOCKED, gear, crew, 3 save slots (localStorage)
- **Audio**: synthesised engine hum, two-tone sirens, gunshots, radio bass
  line — all WebAudio, no audio files

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

WASD drive / walk · SPACE brake / climb · F fire · E enter/exit vehicle ·
J jetpack · R reload · 1–6 weapons · M map & stats · P pause.

## Build it

```sh
MAKEFUN_OUTPUT_DIR=/tmp/v20-build node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and
writes `dossier.json` with the kit's vendored `makefun-game.ts` library.
Three.js r160 is vendored under `game/vendor/three.module.min.js`.

## Screenshots

1. `1-cover.png` — M6 "WRECK THE REGENT": five-star chase, five police cars
   + one helicopter, noon beachfront, big yacht and Ferris wheel.
2. `2-foot.png` — M2 "COLLECT THE DROP": on-foot shootout at the FRUIT stall.
3. `3-chase.png` — M3 "OUTRUN THE SUNSET ROADBLOCK": jetpack escape under
   fire from two helicopters at golden hour.
4. `4-meta.png` — MAP/STATS: street-grid map with M6 route, mission ratings,
   66.1% ring, career stats, workshop, crew, save slots.

All art, names, story and code are original — nothing from any commercial game.
