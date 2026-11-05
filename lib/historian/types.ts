export interface HistorianContext {
  url: string;
  requestedDate: string;
  timestamp: string;
}

export interface ArchiveEvidence {
  id: string;
  kind: "archive_metadata" | "archive_text";
  label: string;
  excerpt: string;
  url: string;
}

export interface EvidencePack {
  context: HistorianContext & { captureDate: string; requestedDisplayDate: string };
  sources: ArchiveEvidence[];
  coverage: "archive_text" | "metadata_only";
  limitations: string[];
  retrievedAt: string;
}

export interface HistorianObservation {
  claim: string;
  evidenceId: string;
  quote: string;
}

export interface HistorianAnswer {
  observations: HistorianObservation[];
  inferences: (HistorianObservation & { rationale: string })[];
  gaps: string[];
}

export interface HistorianResult {
  status: "answered";
  answer: HistorianAnswer;
  evidence: EvidencePack;
  model: string;
  generatedAt: string;
  cached: boolean;
  usage: { inputTokens: number; outputTokens: number; thinkingTokens: number; totalTokens: number };
}

export type HistorianErrorStatus = "invalid_input" | "unverified_capture" | "archive_unavailable" |
  "not_configured" | "disabled" | "rate_limited" | "provider_unavailable" | "invalid_answer" | "too_large";

export type HistorianResponse = HistorianResult | { status: HistorianErrorStatus; message: string };
export type EvidenceResponse = { status: "ready"; evidence: EvidencePack } | { status: HistorianErrorStatus; message: string };
export interface HistorianAvailability { configured: boolean; enabled: boolean; model: string }
