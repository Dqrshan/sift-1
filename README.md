# SIFT·1 — The AI Sorting Companion for the Modern Home

![SIFT·1](public/logo.svg)

A concept domestic smart dustbin with onboard AI vision that identifies waste, sorts it into sealed compartments, quarantines hazards, and tracks household impact. Built with Next.js, Three.js, and a modern React stack.

## Features

- **AI Vision Sorting** — On-device SIFT-V3 model identifies objects, materials, and contamination state in ~1.2 seconds
- **4 Sealed Compartments** — 12 L each, gasket-sealed with activated-carbon filter for odor control
- **Hazard Drawer** — 2 L fire-resistant lining for batteries and small e-waste
- **Ultrasonic Fill Sensing** — Per-compartment level sensing with fill forecasts
- **Interactive 3D Model** — Explore the anatomy and mechanics in Three.js

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui
- **3D:** Three.js, react-resizable-panels
- **State:** Zustand, TanStack Query
- **Database:** Prisma with SQLite
- **Auth:** Next-auth
- **i18n:** next-intl
- **Build:** Bun

## Getting Started

### Prerequisites

- Bun 1.3+
- Node 18+ (optional, npm works too)

### Install

```bash
bun install
```

### Run dev server

```bash
bun dev
```

### Build for production

```bash
bun run build
bun start
```

### Database

```bash
bun db:push        # Push schema changes
bun db:generate    # Generate Prisma client
bun db:migrate     # Run migrations
```

## Project Structure

```
├── prisma/
│   └── schema.prisma    # Database schema (SQLite)
├── src/
│   ├── app/             # Next.js app router pages
│   ├── components/      # React components
│   ├── hooks/           # Custom hooks
│   └── lib/             # Utility functions
├── examples/            # WebSocket demo examples
├── mini-services/       # Micro-service examples
├── tests/               # Test scripts
├── .env                 # Environment variables
└── netlify.toml         # Netlify deployment config
```

## Deployment

This project is configured for Netlify:

```bash
netlify deploy --prod
```

See `netlify.toml` for build configuration.

## License

Concept project — not for commercial use.
