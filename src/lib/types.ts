export interface ExtractedNotice {
  id: string;
  title: string;
  summary: string;
  audience: string[];
  deadline: {
    date: string | null;
    time: string | null;
    raw: string | null;
  };
  location: string | null;
  fees: string[];
  actions: string[];
  documents: string[];
  contacts: string[];
  warnings: string[];
  sourceEvidence: Record<string, string>;
  rawText: string;
  createdAt: string;
}

export type View =
  | "home"
  | "processing"
  | "result"
  | "source"
  | "dashboard";

export interface SavedNotice extends ExtractedNotice {
  status: "upcoming" | "completed" | "expired";
}
