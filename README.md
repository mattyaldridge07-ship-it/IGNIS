# IGNIS

**Interactive Fusion Thruster Digital Twin & Engineering Suite**

IGNIS is a parametric engineering suite and interactive 3D digital twin of a
Direct Fusion Drive (DFD) engine — a magnetically confined, aneutronic /
semi-aneutronic fusion rocket (D-³He or D-T). It lets you tune plasma,
magnetic, and propellant parameters in real time and see the effect ripple
through a 3D CAD viewport, live telemetry, LaTeX-derived equations, and a
techno-economic cost model simultaneously.

## Features

- **Interactive 3D CAD viewport** (React Three Fiber) — procedural engine
  assembly (frame, tungsten/borated-polyethylene shielding, HTS coil rings,
  quartz vacuum tube, RF antenna, propellant injectors, magnetic nozzle) with
  an exploded-view slider and a shader-driven cutaway plane.
- **Raymarched volumetric plasma core** — a custom GLSL shader visualising
  the density profile `n(r,z) = n₀·(1-(r/a)²)^α·cos(πz/L)` with a
  temperature-driven violet → cyan → white colour ramp.
- **Magnetic field-line visualisation** — flux-conserving field lines
  (`r(z) ∝ 1/√B(z)`) that pinch at the mirror throat and flare through the
  nozzle, with animated particles tracing ion drift.
- **Physics solvers** (`src/physics/`) — Bosch-Hale fusion reactivity,
  Bremsstrahlung/synchrotron radiative loss, Biot-Savart on-axis magnetic
  field from the coaxial HTS coil array, mirror ratio / loss-cone angle, a
  REBCO critical-current-density quench check, and nozzle exhaust/Isp/thrust.
- **Techno-economic model** (`src/economics/`) — HTS tape length and cost,
  fuel burn cost (He-³ or tritium), shielding mass/cost, launch-to-orbit
  cost, and an exportable Bill of Materials (CSV/JSON).
- **Live telemetry** — Isp, thrust, net jet power, Q-factor, and core β
  gauges plus Isp-vs-mass-flow and power-balance charts.
- **Live LaTeX derivations** — KaTeX-rendered equations with the current
  numeric values substituted in as you move the sliders.

## Tech stack

Vite + React + TypeScript · Tailwind CSS v4 · Three.js / React Three Fiber +
drei · custom GLSL shaders · Zustand · Radix UI primitives · KaTeX ·
Recharts.

## Getting started

```bash
npm install
npm run dev       # start the dev server at http://localhost:5173
npm run build     # type-check and produce a production build in dist/
npm run test      # run the physics solver unit tests
```

## Deploying to GitHub Pages

The Vite `base` is set to `/IGNIS/` in `vite.config.ts` to match this repo's
Pages URL. To publish:

```bash
npm run deploy
```

This builds the app and pushes `dist/` to the `gh-pages` branch (via the
`gh-pages` package). Then, in the repo's **Settings → Pages**, set the
source to the `gh-pages` branch. The site will be served at
`https://<username>.github.io/IGNIS/`.

## Project structure

```
src/
├── components/
│   ├── cad/        # 3D engine assembly, volumetric plasma, field lines
│   └── ui/          # Sidebar controls, telemetry, derivations, cost modal
├── physics/         # Plasma, magnetics, and nozzle solvers
├── economics/        # Cost model and BOM generator
├── store/            # Zustand store tying parameters to solved state
└── shaders/           # GLSL for the plasma raymarcher, cutaway, field lines
```

## Disclaimer

IGNIS is an educational/illustrative engineering visualiser, not a certified
reactor design tool. The physics models use standard textbook
parametrisations (Bosch-Hale, Biot-Savart, NRL-style radiative loss
formulas) with simplifying assumptions (single-fluid temperature, 0D energy
balance, phenomenological REBCO Jc(B,T) scaling) appropriate for interactive
exploration, not mission-critical design.
