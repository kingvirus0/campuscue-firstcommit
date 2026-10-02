import type { ExtractedNotice } from "./types";

const MONTHS: Record<string, number> = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
  april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
  august: 7, aug: 7, september: 8, sep: 8, sept: 8,
  october: 9, oct: 9, november: 10, nov: 10, december: 11, dec: 11,
};

const ACTION_VERBS =
  /\b(must|should|need to|are required to|required to|please|kindly|submit|upload|pay|bring|complete|register|collect|arrive|attend|fill|sign|print|present|show|contact|call|email|participate)\b/i;

const DOC_HINT =
  /\b(id|passport|receipt|photograph|photo|form|slip|card|document|certificate|letter|payment|calculator|badge)\b/i;

const LOCATION_HINT =
  /\b(office|hall|auditorium|venue|campus|room|center|centre|department|faculty|bursary|registry|library|gate|hostel|block|building|floor|lecture)\b/i;

const TITLE_BOOST =
  /\b(registration|test|exam|seminar|notice|circular|announcement|deadline|schedule|workshop|orientation|matriculation|convocation)\b/i;

const NOISE_TITLE =
  /^(faculty of|department of|office of|internal circular|all |dear |this |please note|issued|for enquiries|note that|public seminar announcement|course notice)/i;

export function extractNotice(rawText: string): ExtractedNotice {
  const text = rawText.replace(/\r\n/g, "\n").trim();
  const lines = text.split("\n").map((l) => l.trim());
  const nonEmpty = lines.filter(Boolean);

  const title = extractTitle(nonEmpty, text);
  const deadline = extractDeadline(text);
  const actions = extractActions(nonEmpty);
  const documents = extractDocuments(nonEmpty);
  const audience = extractAudience(nonEmpty);
  const location = extractLocation(nonEmpty);
  const fees = extractFees(nonEmpty);
  const contacts = extractContacts(nonEmpty);
  const warnings = extractWarnings(nonEmpty);
  const summary = buildSummary(title, actions, deadline);

  const sourceEvidence: Record<string, string> = {};
  if (deadline.raw) sourceEvidence.deadline = deadline.raw;

  const findEvidence = (needle: string | null | undefined) => {
    if (!needle) return null;
    const key = needle.toLowerCase().slice(0, 28);
    return (
      nonEmpty.find(
        (l) =>
          l.length <= 240 &&
          (l.toLowerCase().includes(key) ||
            key.split(/\s+/).every((w) => w.length > 2 && l.toLowerCase().includes(w)))
      ) ?? null
    );
  };

  const locEv = findEvidence(location);
  if (locEv) sourceEvidence.location = locEv;

  const actEv = findEvidence(actions[0]);
  if (actEv) sourceEvidence.actions = actEv;

  const audEv = findEvidence(audience[0]);
  if (audEv) sourceEvidence.audience = audEv;

  const docEv = findEvidence(documents[0]);
  if (docEv) sourceEvidence.documents = docEv;

  if (!sourceEvidence.deadline) {
    const dateLine = nonEmpty.find((l) =>
      /\b\d{1,2}\b.*(am|pm|oct|nov|sep|deadline|due|submit)/i.test(l)
    );
    if (dateLine) sourceEvidence.deadline = dateLine.slice(0, 220);
  }

  return {
    id: `notice_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title,
    summary,
    audience,
    deadline,
    location,
    fees,
    actions,
    documents,
    contacts,
    warnings,
    sourceEvidence,
    rawText: text,
    createdAt: new Date().toISOString(),
  };
}

function extractTitle(lines: string[], fullText: string): string {
  // Prefer lines that look like real notice titles
  for (const line of lines.slice(0, 12)) {
    if (NOISE_TITLE.test(line)) continue;
    if (line.length < 8 || line.length > 90) continue;
    if (line.includes("\n")) continue;

    // Pattern: "SIWES Registration", "CPE 211 Test", "Departmental Seminar"
    if (
      TITLE_BOOST.test(line) &&
      !/^all |^students |^this is/i.test(line) &&
      line.length <= 70
    ) {
      return toTitleCase(cleanTitle(line));
    }

    // Pattern: "COURSE NOTICE — CPE 211 DIGITAL LOGIC DESIGN"
    const dash = line.match(
      /(?:NOTICE|CIRCULAR|ANNOUNCEMENT|MEMORANDUM)\s*[—–\-:|]\s*(.+)/i
    );
    if (dash && dash[1].length <= 70) {
      return toTitleCase(cleanTitle(dash[1]));
    }
  }

  // Body phrase fallback
  const phrase = fullText.match(
    /\b(SIWES Registration|CPE\s*\d+\s*(?:Test|Digital Logic[^.\n]{0,40})|Departmental Seminar|Class Test|Course Registration|Matriculation|Orientation|Public Seminar)\b/i
  );
  if (phrase) return toTitleCase(phrase[1].trim());

  // First short non-header line
  for (const line of lines.slice(0, 10)) {
    if (NOISE_TITLE.test(line)) continue;
    if (line.includes("\n")) continue;
    if (line.length >= 8 && line.length <= 70) {
      return toTitleCase(cleanTitle(line));
    }
  }

  return "Campus Notice";
}

function cleanTitle(s: string): string {
  return s
    .replace(/\s+/g, " ")
    .replace(/[|]+$/g, "")
    .replace(/\s*[—–\-]\s*$/, "")
    .trim();
}

function extractDeadline(text: string): ExtractedNotice["deadline"] {
  // Broad date+time patterns first
  const candidates: Array<{
    date: string | null;
    time: string | null;
    raw: string;
  }> = [];

  const push = (
    raw: string,
    date: string | null,
    time: string | null
  ) => {
    if (date) candidates.push({ date, time, raw: raw.replace(/\s+/g, " ").trim() });
  };

  // October 3rd at 4:00 PM / October 7, 2026 at 10:00 AM
  const reMonthDayYearTime =
    /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,)?\s+(\d{4})[^\n]{0,40}?(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/gi;
  let m: RegExpExecArray | null;
  while ((m = reMonthDayYearTime.exec(text))) {
    push(
      m[0],
      isoFromParts(parseInt(m[2], 10), m[1], parseInt(m[3], 10)),
      normalizeTime(m[4])
    );
  }

  // October 3rd at 4:00 PM (no year)
  const reMonthDayTime =
    /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,)?\s*(?:at\s*)?(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/gi;
  while ((m = reMonthDayTime.exec(text))) {
    const month = MONTHS[m[1].toLowerCase()];
    if (month === undefined) continue;
    // Skip if already captured with year nearby
    const already = candidates.some(
      (c) => c.raw.toLowerCase().includes(m![0].toLowerCase().slice(0, 12)) && c.date
    );
    if (already) continue;
    const time = m[3] ? normalizeTime(m[3]) : null;
    // Only accept if this looks like a deadline context or has a time
    const ctx = text.slice(Math.max(0, m.index - 80), m.index + m[0].length + 20);
    if (time || /deadline|due|submit|closes|before|by\s/i.test(ctx)) {
      push(
        m[0],
        isoFromParts(parseInt(m[2], 10), m[1], defaultYear(m[1])),
        time
      );
    }
  }

  // 3/10/2026 4:00 PM
  const reSlash =
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})[^\n]{0,30}?(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/gi;
  while ((m = reSlash.exec(text))) {
    const year =
      m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10);
    const month = parseInt(m[1], 10) - 1;
    const day = parseInt(m[2], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      push(m[0], isoFromDate(new Date(year, month, day)), m[4] ? normalizeTime(m[4]) : null);
    }
  }

  // ISO datetime
  const reIso =
    /(\d{4})-(\d{2})-(\d{2})(?:T|\s+)(\d{1,2}:\d{2})/g;
  while ((m = reIso.exec(text))) {
    push(m[0], `${m[1]}-${m[2]}-${m[3]}`, normalizeTime(m[4]));
  }

  // tomorrow/today
  const reRel =
    /\b(tomorrow|today)\b[^\n]{0,40}?(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/gi;
  while ((m = reRel.exec(text))) {
    const base = new Date();
    if (/tomorrow/i.test(m[1])) base.setDate(base.getDate() + 1);
    push(m[0], isoFromDate(base), m[2] ? normalizeTime(m[2]) : null);
  }

  // Prefer the candidate closest to deadline language
  if (candidates.length) {
    let best = candidates[0];
    let bestScore = -Infinity;
    for (const c of candidates) {
      const idx = text.toLowerCase().indexOf(c.raw.toLowerCase());
      const window =
        idx >= 0
          ? text.slice(Math.max(0, idx - 100), idx + c.raw.length + 40)
          : c.raw;
      let score = 0;
      if (/deadline|due|closes|must submit|submit.*before/i.test(window)) score += 50;
      if (c.time) score += 20;
      if (/\d{4}/.test(c.date ?? "")) score += 10;
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    return { date: best.date, time: best.time, raw: best.raw };
  }

  // Sentence fallback
  const sentence = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .find(
      (s) =>
        /deadline|due|closes|submit|registration|test|seminar|exam/i.test(s) &&
        /\b\d{1,2}\b|\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(s)
    );

  if (sentence) {
    const dm =
      sentence.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s*(\d{4})?/i) ||
      sentence.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,)?\s*(\d{4})?/i);
    if (dm) {
      const isMonthFirst = MONTHS[dm[1].toLowerCase()] !== undefined;
      const day = parseInt(isMonthFirst ? dm[2] : dm[1], 10);
      const monthName = isMonthFirst ? dm[1] : dm[2];
      const year = dm[3] ? parseInt(dm[3], 10) : defaultYear(monthName);
      const date = isoFromParts(day, monthName, year);
      const timeM = sentence.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/);
      if (date) {
        return {
          date,
          time: timeM ? normalizeTime(timeM[1]) : null,
          raw: sentence.slice(0, 220),
        };
      }
    }
  }

  return { date: null, time: null, raw: null };
}

function extractActions(lines: string[]): string[] {
  const actions: string[] = [];
  const add = (raw: string) => {
    let candidate = raw
      .replace(/^[-*•●◦→]+\s*/u, "")
      .replace(/^\d+[.)]\s*/u, "")
      .trim();
    if (!candidate) return;
    candidate = candidate
      .replace(/^(students?|all students?|staff|participants?)\s+(must|should|are required to|need to|shall)\s+/i, "")
      .replace(/^(must|should|need to|please|kindly|are required to|required to)\s+/i, "")
      .replace(/^(please\s+)?(note that\s+)?/i, "")
      .trim();
    if (candidate.length < 4 || candidate.length > 140) return;
    if (/^(for enquiries|contact |email:|issued|department of|faculty of)/i.test(candidate)) return;
    if (/^attendance is free/i.test(candidate)) return;
    if (/@|http|www\./i.test(candidate) && !/submit|upload|pay|bring|register|complete/i.test(candidate)) {
      return;
    }
    // Cut trailing unrelated clauses after a strong action
    candidate = candidate.replace(
      /\.\s+(the test covers|light refreshments|for more information|for enquiries).*$/i,
      ""
    );
    const cleaned = candidate.replace(/[.;,]+$/, "").trim();
    if (cleaned.length < 4) return;
    if (!actions.some((a) => a.toLowerCase() === cleaned.toLowerCase())) {
      actions.push(toSentence(cleaned));
    }
  };

  for (const line of lines) {
    if (line.length < 4 || line.length > 280) continue;
    if (/^(for enquiries|email:|issued:|department of|faculty of|office of)/i.test(line) &&
        !/must|should|required|need to|please|bring|submit|pay|upload|register/i.test(line)) {
      continue;
    }

    const parts =
      line.length > 100 && /(?<=[.!?])\s+/.test(line)
        ? line.split(/(?<=[.!?])\s+/)
        : [line];

    for (const part of parts) {
      const p = part.trim();
      if (!p || p.length > 180) continue;
      const isBullet = /^[-*•●◦→]/u.test(p) || /^\d+[.)]\s/.test(p);
      const isAction = ACTION_VERBS.test(p);
      if (isBullet || isAction) add(p);
    }
  }

  return actions
    .filter(
      (a, i, arr) =>
        arr.findIndex((x) => x.toLowerCase() === a.toLowerCase()) === i
    )
    .slice(0, 8);
}

function extractDocuments(lines: string[]): string[] {
  const docs: string[] = [];
  const add = (raw: string) => {
    const cleaned = raw
      .replace(/^[-*•●◦→\d.)\s]+/u, "")
      .replace(/^(bring|submit|upload|require[sd]?|provide|present|show|attach|need|must)\s+/i, "")
      .replace(/^(your|the|a|an|their)\s+/i, "")
      .replace(/[.;,]+$/, "")
      .trim();
    if (cleaned.length < 3 || cleaned.length > 60) return;
    if (!DOC_HINT.test(cleaned)) return;
    if (!docs.some((d) => d.toLowerCase() === cleaned.toLowerCase())) {
      docs.push(toTitleCase(cleaned));
    }
  };

  for (const line of lines) {
    if (!DOC_HINT.test(line)) continue;
    if (line.length > 260) continue;
    if (/^(email|contact|for enquiries)/i.test(line)) continue;

    if (/bring|submit|upload|required documents|documents required|provide|need to bring/i.test(line)) {
      const listPart = line.includes(":")
        ? line.split(":").slice(1).join(":")
        : line.replace(
            /^(students?|all students?|participants?)\s+(are\s+)?(required\s+to\s+)?(must\s+)?(bring|submit|upload|provide|need to bring)\s+/i,
            ""
          );
      const chunks = listPart
        .split(/,|;|\band\b|\bplus\b|\n/gi)
        .map((c) =>
          c
            .replace(/\s+to\s+the\s+.*$/i, "")
            .replace(/\s+for\s+submission.*$/i, "")
            .replace(/\s+for\s+entry.*$/i, "")
            .replace(/\s+for\s+the\s+test.*$/i, "")
            .trim()
        )
        .filter(Boolean);
      for (const c of chunks) add(c);
    }
  }
  return docs.slice(0, 8);
}

function extractAudience(lines: string[]): string[] {
  const found: string[] = [];
  const push = (v: string) => {
    if (!found.some((a) => a.toLowerCase() === v.toLowerCase())) found.push(v);
  };

  for (const line of lines) {
    if (line.length > 220) continue;
    const level = line.match(/\b(\d{3}-level)\b/i);
    if (level) push(level[1].toLowerCase());
    if (/\ball students\b/i.test(line)) push("All students");
    if (/\bstaff\b/i.test(line) && /invite|inform|attend|open to/i.test(line)) push("Staff");
    if (/\bcpe\b|computer engineering/i.test(line) && !found.some((a) => /computer|cpe/i.test(a))) {
      push("Computer Engineering");
    }
    if (/\bundergraduate|postgraduate\b/i.test(line)) {
      const u = line.match(/\b(undergraduate|postgraduate)\b/i);
      if (u) push(u[1]);
    }
  }
  return found.slice(0, 5);
}

function extractLocation(lines: string[]): string | null {
  const scored: Array<{ score: number; loc: string }> = [];

  const consider = (raw: string, score: number) => {
    const loc = polishLocation(raw);
    if (!loc) return;
    // Ignore quoted seminar titles etc.
    if (/reliable|systems|ai\b/i.test(loc) && !/auditorium|hall|office/i.test(loc)) return;
    if (scored.some((s) => s.loc.toLowerCase() === loc.toLowerCase())) return;
    scored.push({ score, loc });
  };

  for (const line of lines) {
    if (line.length > 260) continue;
    // Strip quoted content before location search
    const cleanedLine = line.replace(/"[^"]+"/g, " ");
    if (/^(email|contact|for enquiries)/i.test(cleanedLine) &&
        !/office|hall|auditorium|venue|room|bursary|faculty office/i.test(cleanedLine)) {
      continue;
    }

    // High-value named venues
    const high = cleanedLine.match(
      /\b((?:Engineering|Faculty|Department|Main|Central)?\s*(?:Faculty\s+)?Office|Lecture Hall\s*[A-Z0-9]?|Engineering Auditorium|Faculty Office|Bursary Office)\b/gi
    );
    if (high) {
      for (const h of high) {
        if (/engineering faculty office|lecture hall|faculty office|engineering auditorium/i.test(h)) {
          consider(h, 100);
        } else {
          consider(h, 40);
        }
      }
    }

    // Generic venue words
    const generic = cleanedLine.match(
      /\b([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,3}\s+(?:Office|Hall|Auditorium|Venue|Bursary|Registry|Library))\b/g
    );
    if (generic) {
      for (const g of generic) consider(g, 30);
    }

    // "at the Engineering Auditorium" / "to the Engineering Faculty Office"
    const atMatch = cleanedLine.match(
      /\b(?:at|in|to)\s+(?:the\s+)?((?:Engineering|Faculty|Main|Central)\s+(?:Faculty\s+)?(?:Office|Hall|Auditorium|Bursary)|Lecture Hall\s*[A-Z0-9]?|Faculty Office)\b/i
    );
    if (atMatch) consider(atMatch[1], 90);

    // Bare Lecture Hall B
    const hall = cleanedLine.match(/\b(Lecture Hall\s*[A-Z0-9]?)\b/i);
    if (hall) consider(hall[1], 95);
  }

  if (!scored.length) return null;
  scored.sort((a, b) => b.score - a.score);
  return scored[0].loc;
}

function polishLocation(raw: string): string | null {
  let loc = raw
    .replace(/\s+/g, " ")
    .replace(/[.,;:]$/, "")
    .replace(/^(the|a|an)\s+/i, "")
    .trim();
  loc = loc.split(/(?<=[.!?])\s+/)[0].trim();
  loc = loc.split(/\s+(for submission|for entry|for the|where|and)\b/i)[0].trim();
  if (loc.length < 4 || loc.length > 80) return null;
  if (
    /^(please|note|students|all|for|this|the deadline|contact|departmental|public|course|building reliable)/i.test(
      loc
    )
  ) {
    return null;
  }
  if (!LOCATION_HINT.test(loc) && !/faculty|hall|office|venue|auditorium|bursary/i.test(loc)) {
    return null;
  }
  if (loc.length > 50 && /\s(is|are|will|must|should)\s/i.test(loc)) return null;
  return toTitleCase(loc);
}

function extractFees(lines: string[]): string[] {
  const fees: string[] = [];
  for (const line of lines) {
    if (/^(email|contact)/i.test(line)) continue;
    const money = line.match(/(?:₦|N|USD|\$)\s?([\d,]+(?:\.\d{2})?)/i);
    if (money) {
      fees.push(`₦${money[1]}`);
    } else if (/registration fee|pay the|payment of|fee of/i.test(line)) {
      const cleaned = line.replace(/\s+/g, " ").trim().slice(0, 120);
      if (!fees.some((f) => f.toLowerCase() === cleaned.toLowerCase())) fees.push(cleaned);
    }
  }
  return fees.slice(0, 4);
}

function extractContacts(lines: string[]): string[] {
  const contacts: string[] = [];
  for (const line of lines) {
    const emails = line.match(/[\w.+-]+@[\w-]+\.[\w.]+/g);
    if (emails) {
      for (const e of emails) if (!contacts.includes(e)) contacts.push(e);
    }
    const phones = line.match(/(?:\+?\d[\d\s\-()]{8,})/g);
    if (phones) {
      for (const p of phones) {
        const cleaned = p.trim();
        if (cleaned.length >= 9 && !contacts.includes(cleaned)) contacts.push(cleaned);
      }
    }
  }
  return contacts.slice(0, 4);
}

function extractWarnings(lines: string[]): string[] {
  const warnings: string[] = [];
  for (const line of lines) {
    if (line.length > 200) continue;
    if (/^(email|contact|for enquiries)/i.test(line)) continue;
    if (
      /\b(late|not accepted|do not|don't|warning|strictly|compulsory|mandatory|no entry|will not|no late)\b/i.test(
        line
      )
    ) {
      const cleaned = line.replace(/\s+/g, " ").trim();
      if (cleaned.length >= 10 && !warnings.includes(cleaned)) warnings.push(cleaned);
    }
    if (warnings.length >= 3) break;
  }
  return warnings;
}

function buildSummary(
  title: string,
  actions: string[],
  deadline: ExtractedNotice["deadline"]
): string {
  const bits: string[] = [`${title}.`];
  if (deadline.date) {
    bits.push(
      `Key deadline: ${deadline.date}${deadline.time ? ` at ${deadline.time}` : ""}.`
    );
  }
  if (actions.length) {
    bits.push(`You need to ${actions[0].toLowerCase().replace(/\.$/, "")}.`);
  } else {
    bits.push("Review the notice carefully and act on the requirements.");
  }
  return bits.join(" ");
}

function isoFromParts(day: number, monthName: string, year: number): string | null {
  const month = MONTHS[monthName.toLowerCase()];
  if (month === undefined) return null;
  if (!day || day < 1 || day > 31) return null;
  if (!year || year < 2000 || year > 2100) return null;
  return isoFromDate(new Date(year, month, day));
}

function isoFromDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function defaultYear(monthName: string): number {
  const month = MONTHS[monthName.toLowerCase()];
  const now = new Date();
  if (month === undefined) return now.getFullYear();
  if (month < now.getMonth()) return now.getFullYear() + 1;
  return now.getFullYear();
}

function normalizeTime(raw: string): string | null {
  const m = raw.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const mer = m[3]?.toUpperCase();
  if (mer === "PM" && h < 12) h += 12;
  if (mer === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${min}`;
}

function toTitleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b([a-z])/g, (_, c: string) => c.toUpperCase())
    .replace(/\b(Siwes|Cpe|Ics|Ai|Ui|Api|Id)\b/gi, (m) => m.toUpperCase());
}

function toSentence(s: string): string {
  const t = s.trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}
