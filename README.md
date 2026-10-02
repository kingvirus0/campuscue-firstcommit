# CampusCue

### From Notice to Action.

CampusCue turns confusing university notices, circulars, and announcements into **clear, actionable information**.

Instead of decoding:

> “All students are hereby informed that the deadline for submission of…”

CampusCue answers:

- **What is happening?**
- **What do I need to do?**
- **When is it due?**
- **Where do I go?**
- **What do I need to bring?**

---

## The problem

University students receive critical information through WhatsApp groups, PDFs, screenshots, notice boards, and faculty circulars. The real problem is **information overload** — deadlines get missed because a notice is too hard to parse quickly.

## The solution

CampusCue converts a notice into a structured action plan:

1. **Input** — paste text or load a realistic demo notice
2. **Extraction** — title, summary, deadline, location, audience, actions, documents, fees, contacts, warnings
3. **Action checklist** — what you must do
4. **Deadline intelligence** — countdowns and urgency
5. **Source verification** — every key fact maps back to the original sentence
6. **Act** — Add to Calendar (`.ics`) and Share to WhatsApp
7. **My Campus** — save notices, track upcoming deadlines, detect deadline collisions

**Positioning:** CampusCue is not “another AI summarizer.” It is **extraction + attribution + action**.

---

## Live demo

1. Open the app
2. Click a **demo notice** (e.g. SIWES Registration)
3. Watch CampusCue extract deadline, actions, documents, and location
4. Click **View Source** to see the exact original sentence
5. Click **Add to Calendar** and **Share to WhatsApp**
6. Process two notices that share a date → see the **deadline collision** warning
7. Open **My Campus** to review saved notices

---

## How it works

```
Paste / demo notice
        ↓
  Heuristic extraction pipeline
  (dates, actions, docs, audience, location)
        ↓
  Structured JSON notice object
  (+ source_evidence per field)
        ↓
  UI renders actions / deadline / source
        ↓
  .ics export · WhatsApp summary · localStorage
```

### Extraction design

The parser is **deterministic and offline-first** so the demo never depends on a live AI API:

- Date patterns: `October 3rd at 4:00 PM`, `Oct 7, 2026`, `3/10/2026`, `tomorrow at 5pm`, ISO-style
- Action patterns: bullets, `must / should / need to / please / submit / pay / bring…`
- Documents, audience (`200-level`), location, fees, contacts, warnings via keyword + sentence rules
- `source_evidence` stores the original sentence used for each important field

Optional AI enrichment can target the same JSON schema later; the MVP ships with heuristics so judges can always run the product.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | Next.js 15 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS 4 |
| Persistence | Browser `localStorage` |
| Calendar | Client-generated iCalendar (`.ics`) |
| Hosting | Vercel (static-friendly Next.js app) |
| AI assistance | Used for scaffolding, design, and extraction heuristics (disclosed below) |

No backend database is required for the hackathon MVP.

---

## Setup

### Prerequisites

- Node.js 18+ (tested on Node 24)
- npm 9+

### Run locally

```bash
cd campuscue-firstcommit
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production build

```bash
npm run build
npm start
```

### Deploy (Vercel)

1. Push this repository to GitHub (public)
2. Import the repo in Vercel
3. Use default Next.js settings
4. Deploy

---

## Project structure

```
src/
  app/
    layout.tsx          # Root layout + metadata
    page.tsx            # Mounts CampusCue UI
    globals.css         # Tailwind + animation
  components/
    CampusCueApp.tsx    # Full client UI
  lib/
    types.ts            # Notice types
    parser.ts           # Heuristic extraction + source evidence
    samples.ts          # Demo notices
    ics.ts              # .ics builder + download
    storage.ts          # localStorage helpers
```

---

## Features checklist

- [x] Paste notice / demo notices
- [x] Structured extraction (deadline, actions, docs, location, audience…)
- [x] Result card with urgency countdown
- [x] Source verification panel
- [x] Add to Calendar (`.ics`)
- [x] WhatsApp-ready share text
- [x] Save to My Campus (localStorage)
- [x] Deadline collision detection
- [x] Mobile-first dark UI

### Not in this MVP (intentionally)

Supabase/auth, PDF/image OCR path, real WhatsApp Business API, push notifications, multi-user accounts.

---

## Judging notes (FirstCommit)

| Criterion | How CampusCue addresses it |
| --- | --- |
| Learning & Growth | Document extraction pipeline, structured data design, date normalization, `.ics` generation, deployment — explained in the demo video and commit history |
| Creativity | Notice → action + source attribution + collision detection (bureaucracy interpreter, not a generic chatbot) |
| Execution | Works offline with seeded demo notices; reproducible local setup |
| Technical Understanding | Clear schema (`ExtractedNotice`), modular `parser` / `ics` / `storage`, heuristics + attribution design |
| Presentation | Before/after transformation, source click, collision warning, calendar + share actions |

---

## AI usage disclosure

Significant AI assistance was used to:

- Scaffold the Next.js + TypeScript + Tailwind project
- Design the product concept, information architecture, and demo narrative
- Write and iterate the heuristic extraction rules, UI components, and README

The author designed the product decisions, schema, feature scope, and judging alignment. The project is a **new creation during FirstCommit**, not a pre-existing portfolio piece. AI was used as a development aid (allowed by hackathon rules), not as a black-box replacement for understanding the system. The extraction pipeline is intentionally explainable so the logic can be walked through in the demo.

---

## Credits & external resources

- [Next.js](https://nextjs.org) — React framework
- [React](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [TypeScript](https://www.typescriptlang.org)
- [create-next-app](https://nextjs.org/docs/app/api-reference/cli/create-next-app) — project scaffold
- iCalendar format knowledge from public RFC 5545 practices
- Demo notice text is fictional and written for this hackathon

No third-party design assets, fonts, or music are used in the product UI.

---

## Demo video outline (3–5 minutes)

1. **Problem** — messy circular text
2. **Upload/paste** → CampusCue processing
3. **Result** — deadline, actions, documents, location
4. **Source verification** — original sentence
5. **Calendar + WhatsApp share**
6. **Collision** — second notice on the same day
7. **Learning story** — what was new, what was hard, how AI was used

---

## License

MIT

---

Built for **Beginner's Paradise · FirstCommit** — *Your first project. Your first commit. Your future.*
