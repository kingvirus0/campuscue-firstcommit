# CampusCue — Devpost "About the project"

## Inspiration

Every semester, students get buried in the same kind of message:

> *“All students are hereby informed that the deadline for submission of…”*

Long circulars on WhatsApp. Screenshots of notice boards. PDFs that are really walls of text. The information is often already there — but the meaning is buried.

Students don’t need more announcements. They need to know:

- What am I supposed to do?
- When is it due?
- Where do I go?
- What do I need to bring?

CampusCue started from that frustration: **the problem isn’t missing information — it’s information overload.** Critical deadlines get missed because a notice is too hard to parse quickly. I wanted to build the thing I wish existed when I opened a five-page circular and only needed four answers.

---

## What it does

**CampusCue — From Notice to Action.**

CampusCue turns confusing university notices into clear, actionable information.

**Core loop:**  
Upload → Understand → Extract → Action → Remind → Share

**What it does:**

1. **Notice scanner** — paste a circular, announcement, or load a realistic demo notice  
2. **Extraction** — title, deadline, required actions, documents, location, audience, fees, contacts, warnings  
3. **Action engine** — turns the notice into a checklist students can actually follow  
4. **Deadline intelligence** — countdown + urgency (due soon / upcoming / expired)  
5. **Source verification** — every key fact links back to the original sentence  
6. **Calendar export** — one click downloads a real `.ics` file  
7. **WhatsApp-ready share** — copies a clean reminder for group chats  
8. **My Campus** — saved notices + deadline collision warnings when multiple events land on the same day  

**Positioning:** CampusCue is not “another AI summarizer.” It turns institutional information into things students can actually do.

---

## How we built it

**Stack:** Next.js 15 · React 19 · TypeScript · Tailwind CSS · localStorage · client-side iCalendar (`.ics`) generation

**Architecture:**

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

I designed a clear `ExtractedNotice` schema first, then built the parser, then the UI around that contract. Demo notices are seeded so the full pipeline is visible in seconds — judges never have to hunt for a PDF to understand the product.

Extraction is **deterministic and offline-first**:

- **Dates:** `October 3rd at 4:00 PM`, `Oct 7, 2026 at 10:00 AM`, `tomorrow at 5pm`, slash dates, ISO-style  
- **Actions:** bullets + verbs like `must`, `should`, `bring`, `submit`, `pay`, `register`  
- **Documents, audience, location, fees, contacts, warnings** via keyword + sentence rules  
- **Source evidence:** the original sentence used for each important field  

That means the core demo works without a live AI API — and the logic can be explained step by step instead of hidden in a black box.

---

## Challenges we ran into

1. **Messy real-world text**  
   Notices don’t follow templates. Headers, paragraphs, bullet lists, and informal WhatsApp-style messages all mix together. I iterated the parser to handle both formal circulars and shorter announcements.

2. **Title and location noise**  
   Early extraction grabbed the wrong lines (“Faculty of Engineering” instead of “SIWES Registration”). I refined ranking, keyword priority, and source-evidence rules so the demo output looks intentional and correct.

3. **Trust vs. convenience**  
   AI-assisted extraction can be wrong. Instead of hiding that, I built **View Source** so every important field can be checked against the original notice. That became the product’s differentiator.

4. **Demo reliability under deadline pressure**  
   A hackathon demo can’t depend on external API keys or flaky network calls. I made the pipeline local-first with seeded notices so the story always works on stage.

5. **Scope control**  
   It was tempting to build a full student platform (auth, PDF OCR, notifications, accounts). I deliberately locked the MVP to one strong loop: notice → action → verify → remind → share.

---

## Accomplishments that we're proud of

- **A complete, working product** — not a slide deck: paste notice → structured action plan → calendar file → shareable summary  
- **Source verification as a core feature** — trust built into the product, not bolted on  
- **Deadline collision detection** — CampusCue starts to feel like a student information layer, not a one-shot summarizer  
- **Explainable pipeline** — schema, parser, UI, and export are modular and easy to walk through in a demo  
- **Demo-ready by design** — seeded realistic notices (SIWES registration, course test, departmental seminar) so the transformation is obvious in the first 60 seconds  
- **Shipped with documentation** — README with setup, architecture, AI disclosure, and credits  

---

## What we learned

This project was a steep learning curve in the best way:

- **Structured data design** — deciding what a “notice” *is* (schema) before writing UI made everything cleaner  
- **Heuristic extraction** — teaching a parser to pull deadlines, actions, and locations out of messy English text  
- **Source attribution** — making AI-assisted extraction trustworthy by always linking facts back to the original sentence  
- **Date normalization** — converting relative and absolute dates into countdowns and calendar events  
- **iCalendar (`.ics`) generation** — enough of the format to produce real calendar files  
- **MVP discipline** — cutting features on purpose so the core loop could actually ship  
- **Shipping under pressure** — prioritizing learning, clarity, and a reliable demo over feature count  

---

## What's next for CampusCue - From Notice to Action

CampusCue is the start of a **student information layer**, not a one-time AI tool.

**Near term:**
- PDF and image upload with client-side text extraction / OCR  
- Optional AI enrichment targeting the same structured JSON schema  
- Search, filters, and categories across saved notices  
- Smart reminders before deadlines (not just calendar export)  
- Share-to-WhatsApp deep links for student groups  

**Bigger vision:**
Instead of students juggling WhatsApp + PDFs + email + notice boards + Google Calendar, CampusCue becomes the place where announcements become:

**Understandable → searchable → actionable → trackable.**

The long-term goal is a semester-wide companion that understands institutional bureaucracy and turns it into clear next steps — for every department, every circular, every deadline.

---

### Tagline

> **CampusCue — From Notice to Action.**  
> We don’t summarize school notices. We turn them into things students can actually do.

### AI disclosure (include if the form asks separately)

AI tools were used as a development aid for scaffolding, brainstorming, debugging, and iterating code — in line with FirstCommit rules. The author designed the product concept, feature scope, information architecture, schema, and judging alignment. The project is a new creation during FirstCommit. The extraction pipeline is intentionally explainable so the logic can be walked through in the demo.
