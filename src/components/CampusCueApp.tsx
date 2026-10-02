"use client";

import { useEffect, useMemo, useState } from "react";
import type { ExtractedNotice, SavedNotice, View } from "@/lib/types";
import { extractNotice } from "@/lib/parser";
import { SAMPLE_NOTICES } from "@/lib/samples";
import { buildIcs, downloadIcs } from "@/lib/ics";
import { loadNotices, upsertNotice, removeNotice } from "@/lib/storage";

const STATUS_ORDER = { upcoming: 0, completed: 1, expired: 2 } as const;

function urgency(deadline: ExtractedNotice["deadline"]): {
  label: string;
  color: string;
  chip: string;
  remaining: string;
} {
  if (!deadline.date) {
    return {
      label: "No deadline detected",
      color: "text-zinc-400",
      chip: "bg-zinc-800 text-zinc-200",
      remaining: "—",
    };
  }
  const dt = new Date(
    `${deadline.date}T${deadline.time ?? "23:59"}:00`
  );
  const diff = dt.getTime() - Date.now();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (diff < 0) {
    return {
      label: "Deadline passed",
      color: "text-zinc-500",
      chip: "bg-zinc-800 text-zinc-300",
      remaining: "Expired",
    };
  }
  if (hours < 24) {
    return {
      label: "Due soon",
      color: "text-rose-400",
      chip: "bg-rose-500/15 text-rose-300 border border-rose-500/30",
      remaining: `${hours}h ${mins}m remaining`,
    };
  }
  const days = Math.floor(hours / 24);
  return {
    label: "Upcoming",
    color: "text-amber-300",
    chip: "bg-amber-500/10 text-amber-300 border border-amber-500/25",
    remaining: `${days}d ${hours % 24}h remaining`,
  };
}

function formatDate(date: string | null, time: string | null): string {
  if (!date) return "Not detected";
  const d = new Date(`${date}T${time ?? "12:00"}:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: time ? "numeric" : undefined,
    minute: time ? "numeric" : undefined,
  });
}

function statusFromDeadline(deadline: ExtractedNotice["deadline"]): SavedNotice["status"] {
  if (!deadline.date) return "upcoming";
  const dt = new Date(`${deadline.date}T${deadline.time ?? "23:59"}:00`);
  if (Number.isNaN(dt.getTime())) return "upcoming";
  return dt.getTime() < Date.now() ? "expired" : "upcoming";
}

function findCollisions(notices: SavedNotice[]): {
  date: string;
  items: SavedNotice[];
}[] {
  const byDate = new Map<string, SavedNotice[]>();
  for (const n of notices) {
    if (!n.deadline.date || n.status === "completed") continue;
    const list = byDate.get(n.deadline.date) ?? [];
    list.push(n);
    byDate.set(n.deadline.date, list);
  }
  return [...byDate.entries()]
    .filter(([, items]) => items.length >= 2)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, items]) => ({ date, items }));
}

export default function CampusCueApp() {
  const [view, setView] = useState<View>("home");
  const [inputText, setInputText] = useState("");
  const [processingNote, setProcessingNote] = useState("");
  const [current, setCurrent] = useState<ExtractedNotice | null>(null);
  const [sourceField, setSourceField] = useState<string>("deadline");
  const [notices, setNotices] = useState<SavedNotice[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setNotices(loadNotices());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const upcoming = useMemo(
    () =>
      [...notices]
        .sort((a, b) => {
          const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
          if (s !== 0) return s;
          return (a.deadline.date ?? "9999").localeCompare(b.deadline.date ?? "9999");
        }),
    [notices]
  );

  const collisions = useMemo(() => findCollisions(notices), [notices]);

  function runProcessing(text: string, then: () => void) {
    setView("processing");
    setProcessingNote("Reading document…");
    const steps = [
      [350, "Finding important dates…"],
      [750, "Identifying required actions…"],
      [1150, "Checking deadlines…"],
      [1500, "Building action plan…"],
    ] as const;
    steps.forEach(([ms, msg]) => {
      setTimeout(() => setProcessingNote(msg), ms);
    });
    setTimeout(then, 1850);
  }

  function handleExtract(text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      setToast("Paste a notice or try a demo notice first.");
      return;
    }
    runProcessing(trimmed, () => {
      const extracted = extractNotice(trimmed);
      setCurrent(extracted);
      setSourceField("deadline");
      setView("result");
    });
  }

  function handleSave() {
    if (!current) return;
    const saved: SavedNotice = {
      ...current,
      status: statusFromDeadline(current.deadline),
    };
    setNotices(upsertNotice(saved));
    setToast("Notice saved to My Campus.");
  }

  function handleDelete(id: string) {
    setNotices(removeNotice(id));
    setToast("Notice removed.");
  }

  function handleIcs() {
    if (!current) return;
    const ics = buildIcs({
      title: current.title,
      description: current.summary,
      location: current.location,
      date: current.deadline.date,
      time: current.deadline.time,
    });
    downloadIcs(`${current.title.replace(/\s+/g, "-").toLowerCase()}.ics`, ics);
    setToast("Calendar file downloaded (.ics).");
  }

  function handleShare() {
    if (!current) return;
    const lines = [
      `📢 *${current.title}*`,
      current.audience.length ? `👥 For: ${current.audience.join(", ")}` : null,
      current.deadline.date
        ? `📅 Deadline: ${formatDate(current.deadline.date, current.deadline.time)}`
        : "📅 Deadline: check notice",
      current.location ? `📍 ${current.location}` : null,
      "",
      "✅ Actions:",
      ...current.actions.map((a) => `• ${a}`),
      current.documents.length ? "" : null,
      current.documents.length ? "📄 Documents:" : null,
      ...current.documents.map((d) => `• ${d}`),
      "",
      "Shared via CampusCue — From Notice to Action.",
    ].filter(Boolean) as string[];
    const text = lines.join("\n");
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setToast("WhatsApp-ready summary copied.");
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      setToast("Clipboard not available in this browser.");
    }
  }

  function openSource(field: string) {
    setSourceField(field);
    setView("source");
  }

  function goHome() {
    setView("home");
    setCurrent(null);
    setInputText("");
  }

  const urg = current ? urgency(current.deadline) : null;
  const sourceKeys = current
    ? Object.keys(current.sourceEvidence).length
      ? Object.keys(current.sourceEvidence)
      : ["rawText"]
    : [];
  const sourceContent = current
    ? sourceField === "rawText"
      ? current.rawText
      : current.sourceEvidence[sourceField] ?? current.rawText
    : "";

  return (
    <div className="min-h-screen bg-[#0b1020] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(1200px_600px_at_10%_-10%,rgba(99,102,241,0.22),transparent),radial-gradient(900px_500px_at_100%_0%,rgba(244,114,182,0.12),transparent)]" />

      <header className="relative border-b border-white/10 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <button onClick={goHome} className="group text-left">
            <div className="text-lg font-semibold tracking-tight text-white group-hover:text-indigo-300">
              CampusCue
            </div>
            <div className="text-xs text-indigo-300/80">From Notice to Action.</div>
          </button>
          <nav className="flex items-center gap-2">
            <button
              onClick={goHome}
              className={`rounded-full px-3 py-1.5 text-sm ${
                view === "home" || view === "result" || view === "processing"
                  ? "bg-white/10 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Upload
            </button>
            <button
              onClick={() => setView("dashboard")}
              className={`rounded-full px-3 py-1.5 text-sm ${
                view === "dashboard"
                  ? "bg-white/10 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              My Campus
              {notices.length > 0 && (
                <span className="ml-1.5 rounded-full bg-indigo-500/30 px-1.5 py-0.5 text-[10px] text-indigo-200">
                  {notices.length}
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {view === "home" && (
          <section className="space-y-10">
            <div className="max-w-2xl">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-200">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                Built for FirstCommit · Notice → Understanding → Action
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                School notices.
                <br />
                <span className="bg-gradient-to-r from-indigo-300 via-sky-300 to-fuchsia-300 bg-clip-text text-transparent">
                  Finally understandable.
                </span>
              </h1>
              <p className="mt-4 text-base leading-relaxed text-zinc-400 sm:text-lg">
                Upload a circular, paste a WhatsApp announcement, or drop a messy
                notice. CampusCue extracts deadlines, required actions, documents,
                and location — with source verification so you can trust every fact.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Paste a notice
                </label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  rows={10}
                  placeholder={
                    "Paste a university notice, circular, or announcement here…\n\nExample: All 200-level students are hereby informed that…"
                  }
                  className="w-full resize-y rounded-xl border border-white/10 bg-black/30 p-4 text-sm leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-indigo-400/50"
                />
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => handleExtract(inputText)}
                    className="rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400"
                  >
                    Turn notice into actions
                  </button>
                  <button
                    onClick={() => {
                      setInputText("");
                      setToast("Cleared paste box.");
                    }}
                    className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
                <div className="mb-3 text-sm font-medium text-zinc-300">
                  Try a demo notice
                </div>
                <p className="mb-4 text-xs leading-relaxed text-zinc-500">
                  Judges: don’t hunt for a PDF. These realistic circulars show the
                  full pipeline in seconds.
                </p>
                <div className="space-y-3">
                  {SAMPLE_NOTICES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setInputText(s.text);
                        handleExtract(s.text);
                      }}
                      className="w-full rounded-xl border border-white/10 bg-black/20 p-4 text-left transition hover:border-indigo-400/40 hover:bg-indigo-500/10"
                    >
                      <div className="text-sm font-medium text-white">
                        {s.label}
                      </div>
                      <div className="mt-1 text-xs text-indigo-300/80">
                        {s.blurb}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  t: "Extract",
                  d: "Deadlines, actions, documents, location — structured, not summarized.",
                },
                {
                  t: "Verify",
                  d: "Every key fact links back to the original sentence in the notice.",
                },
                {
                  t: "Act",
                  d: "Add to calendar, share a WhatsApp-ready plan, save to My Campus.",
                },
              ].map((x) => (
                <div
                  key={x.t}
                  className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-5"
                >
                  <div className="text-sm font-semibold text-indigo-300">
                    {x.t}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    {x.d}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {view === "processing" && (
          <section className="mx-auto max-w-md py-20 text-center">
            <div className="mx-auto mb-6 h-14 w-14 animate-pulse rounded-2xl bg-indigo-500/20 ring-1 ring-indigo-400/40" />
            <h2 className="text-2xl font-semibold text-white">
              Analyzing your notice…
            </h2>
            <p className="mt-3 text-indigo-300">{processingNote}</p>
            <div className="mx-auto mt-8 h-1.5 w-56 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/2 animate-campuscue-slide rounded-full bg-indigo-400" />
            </div>
          </section>
        )}

        {view === "result" && current && urg && (
          <section className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <button
                  onClick={goHome}
                  className="mb-3 text-sm text-zinc-400 hover:text-white"
                >
                  ← New notice
                </button>
                <h1 className="text-3xl font-semibold tracking-tight text-white">
                  {current.title}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
                  {current.summary}
                </p>
              </div>
              <div className={`rounded-full px-3 py-1 text-xs font-medium ${urg.chip}`}>
                {urg.label} · {urg.remaining}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/[0.06] p-5">
                <div className="text-xs uppercase tracking-wider text-rose-300/80">
                  Deadline
                </div>
                <div className={`mt-1 text-xl font-semibold ${urg.color}`}>
                  {formatDate(current.deadline.date, current.deadline.time)}
                </div>
                <div className="mt-1 text-sm text-zinc-400">
                  {urg.remaining}
                </div>
                {current.deadline.raw && (
                  <button
                    onClick={() => openSource("deadline")}
                    className="mt-3 text-xs text-indigo-300 underline-offset-2 hover:underline"
                  >
                    View source →
                  </button>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="text-xs uppercase tracking-wider text-zinc-500">
                  Where
                </div>
                <div className="mt-1 text-lg font-medium text-white">
                  {current.location ?? "Not specified in notice"}
                </div>
                {current.location && (
                  <button
                    onClick={() => openSource("location")}
                    className="mt-3 text-xs text-indigo-300 underline-offset-2 hover:underline"
                  >
                    View source →
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                  What you need to do
                </h2>
                {current.sourceEvidence.actions && (
                  <button
                    onClick={() => openSource("actions")}
                    className="text-xs text-indigo-300 hover:underline"
                  >
                    View source
                  </button>
                )}
              </div>
              {current.actions.length ? (
                <ul className="space-y-2.5">
                  {current.actions.map((a, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 rounded-lg bg-black/20 p-3"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-emerald-400/30 bg-emerald-400/10 text-[10px] text-emerald-300">
                        ✓
                      </span>
                      <span className="text-sm leading-relaxed text-zinc-200">
                        {a}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500">
                  No explicit action list found — read the original notice carefully.
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                  Documents required
                </h3>
                {current.documents.length ? (
                  <ul className="mt-3 space-y-1.5">
                    {current.documents.map((d, i) => (
                      <li key={i} className="text-sm text-zinc-200">
                        • {d}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-zinc-500">None listed.</p>
                )}
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                  Who needs to act
                </h3>
                {current.audience.length ? (
                  <ul className="mt-3 space-y-1.5">
                    {current.audience.map((a, i) => (
                      <li key={i} className="text-sm text-zinc-200">
                        • {a}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-zinc-500">
                    General notice — check if it applies to you.
                  </p>
                )}
                {current.contacts.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-xs uppercase tracking-wider text-zinc-500">
                      Contact
                    </h4>
                    <p className="mt-1 text-sm text-indigo-200">
                      {current.contacts.join(" · ")}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {current.warnings.length > 0 && (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.07] p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-300">
                  Important warnings
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {current.warnings.map((w, i) => (
                    <li key={i} className="text-sm text-amber-100/90">
                      ⚠ {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleIcs}
                className="rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-400"
              >
                Add to Calendar
              </button>
              <button
                onClick={handleShare}
                className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-400"
              >
                {copied ? "Copied ✓" : "Share to WhatsApp"}
              </button>
              <button
                onClick={handleSave}
                className="rounded-xl border border-white/15 px-5 py-2.5 text-sm text-zinc-200 hover:bg-white/5"
              >
                Save to My Campus
              </button>
              <button
                onClick={() => openSource("deadline")}
                className="rounded-xl border border-white/15 px-5 py-2.5 text-sm text-zinc-200 hover:bg-white/5"
              >
                View Source
              </button>
            </div>
          </section>
        )}

        {view === "source" && current && (
          <section className="mx-auto max-w-2xl">
            <button
              onClick={() => setView("result")}
              className="mb-4 text-sm text-zinc-400 hover:text-white"
            >
              ← Back to result
            </button>
            <div className="rounded-2xl border border-indigo-400/20 bg-indigo-500/[0.07] p-6">
              <h1 className="text-xl font-semibold text-white">
                Source verification
              </h1>
              <p className="mt-1 text-sm text-indigo-200/80">
                CampusCue attributes every important field back to the original
                notice text — extraction + attribution, not black-box magic.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {sourceKeys.map((key) => (
                  <button
                    key={key}
                    onClick={() => setSourceField(key)}
                    className={`rounded-full px-3 py-1 text-xs capitalize ${
                      sourceField === key
                        ? "bg-indigo-500 text-white"
                        : "bg-white/5 text-zinc-300 hover:bg-white/10"
                    }`}
                  >
                    {key === "rawText" ? "Full notice" : key}
                  </button>
                ))}
              </div>

              <div className="mt-5">
                <div className="text-xs uppercase tracking-wider text-zinc-500">
                  Field: {sourceField}
                </div>
                <blockquote className="mt-2 rounded-xl border border-white/10 bg-black/40 p-4 text-sm leading-relaxed text-zinc-100">
                  {sourceField === "deadline" && current.deadline.date && (
                    <mark className="bg-rose-500/20 px-1 text-rose-100">
                      {current.deadline.raw ?? formatDate(current.deadline.date, current.deadline.time)}
                    </mark>
                  )}
                  {sourceField !== "deadline" && (
                    <span className="whitespace-pre-wrap">{sourceContent}</span>
                  )}
                  {sourceField === "deadline" && !current.deadline.date && (
                    <span className="text-zinc-400">
                      No explicit deadline sentence found in this notice.
                    </span>
                  )}
                </blockquote>
              </div>

              <div className="mt-6">
                <div className="text-xs uppercase tracking-wider text-zinc-500">
                  Original notice
                </div>
                <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/30 p-4 text-xs leading-relaxed text-zinc-300">
                  {current.rawText}
                </pre>
              </div>
            </div>
          </section>
        )}

        {view === "dashboard" && (
          <section className="space-y-6">
            <div>
              <h1 className="text-3xl font-semibold text-white">My Campus</h1>
              <p className="mt-1 text-sm text-zinc-400">
                Saved notices, upcoming deadlines, and collision warnings.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-2xl font-semibold text-white">
                  {upcoming.filter((n) => n.status === "upcoming").length}
                </div>
                <div className="text-xs text-zinc-400">Upcoming deadlines</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-2xl font-semibold text-white">
                  {notices.length}
                </div>
                <div className="text-xs text-zinc-400">Saved notices</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-2xl font-semibold text-white">
                  {notices.filter((n) => n.status === "expired").length}
                </div>
                <div className="text-xs text-zinc-400">Expired / passed</div>
              </div>
            </div>

            {collisions.length > 0 && (
              <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-5">
                <h2 className="font-semibold text-amber-300">
                  ⚠️ Deadline collision
                </h2>
                {collisions.map((c) => (
                  <p key={c.date} className="mt-2 text-sm text-amber-100">
                    You have <strong>{c.items.length}</strong> important events on{" "}
                    <strong>{formatDate(c.date, null)}</strong>:{" "}
                    {c.items.map((i) => i.title).join(" · ")}
                  </p>
                ))}
              </div>
            )}

            {upcoming.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
                <p className="text-zinc-400">No saved notices yet.</p>
                <button
                  onClick={goHome}
                  className="mt-4 rounded-xl bg-indigo-500 px-4 py-2 text-sm text-white hover:bg-indigo-400"
                >
                  Process your first notice
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((n) => {
                  const u = urgency(n.deadline);
                  return (
                    <div
                      key={n.id}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-white">{n.title}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] ${u.chip}`}>
                            {n.status}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-zinc-400">
                          {formatDate(n.deadline.date, n.deadline.time)}
                          {n.deadline.date ? ` · ${u.remaining}` : ""}
                        </div>
                        {n.location && (
                          <div className="mt-1 text-xs text-zinc-500">
                            {n.location}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setCurrent(n);
                            setSourceField("deadline");
                            setView("result");
                          }}
                          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5"
                        >
                          Open
                        </button>
                        <button
                          onClick={() => handleDelete(n.id)}
                          className="rounded-lg border border-rose-400/20 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="relative border-t border-white/10 px-4 py-6 text-center text-xs text-zinc-500">
        CampusCue — From Notice to Action. Built for Beginner&apos;s Paradise ·
        FirstCommit.
      </footer>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-zinc-900/95 px-4 py-2 text-sm text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
