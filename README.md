# Interactive Wall Calendar (Frontend Challenge)

A React/Next.js component inspired by a physical wall calendar with a strong visual anchor image, interactive date-range selection, and integrated note-taking.

## Highlights

- Wall calendar aesthetic with a hero image, paper-like card, ring binding detail, and wave accent.
- Date range selection with clear visual states:
	- Start date
	- End date
	- In-between range days
	- Live preview while hovering/focusing before end date is chosen
- Notes system with local persistence:
	- Monthly notes
	- Range-specific notes (attached to selected date range)
	- Export notes as TXT, PDF, or JSON for backup/share
- Responsive behavior:
	- Desktop: split visual layout (image + planner panel)
	- Mobile: stacked layout optimized for touch targets
- Extra UX features:
	- Month navigation
	- Direct month jump picker
	- Quick actions: Today and Clear Range
	- Holiday markers on specific dates

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS v4
- next/font for custom typography

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

3. Open:

```text
http://localhost:3000
```

## Build

```bash
npm run build
npm run start
```

## Project Structure

- `src/app/page.tsx`: main interactive wall calendar component
- `src/app/globals.css`: global theme and custom decorative styles
- `src/app/layout.tsx`: metadata and typography setup
- `public/calendar-hero.png`: reference-inspired hero image


