import type {
  ActionPoint, ApprovalItem, AuditEntry, ClientState, ClientSummary, ConversationSignal,
  Feasibility, Finding, Note, Oversight, PipelineEvent, PipelineRun, Person, RiskFlag,
  TrustScore, Verification, WealthStory, WheelDimension, WheelOfLife,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  return r.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  return r.json() as Promise<T>;
}

export const api = {
  base: BASE,
  health: () => get<{ ok: boolean; mode: string }>("/api/health"),
  listClients: () => get<{ clients: ClientSummary[]; mode: string }>("/api/clients"),
  getClient: (id: string) => get<ClientState>(`/api/clients/${id}`),
  uploadDocuments: async (id: string, files: File[]) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    const r = await fetch(`${BASE}/api/clients/${id}/documents`, { method: "POST", body: fd });
    if (!r.ok) throw new Error(`${r.status} upload failed`);
    return r.json();
  },
  getPipeline: (id: string) => get<PipelineRun>(`/api/clients/${id}/pipeline`),
  getVerification: (id: string) => get<Verification>(`/api/clients/${id}/verification`),
  listPeople: () => get<{ people: Person[] }>("/api/people"),
  getNotes: (id: string) => get<Note[]>(`/api/clients/${id}/notes`),
  addNote: (id: string, body: Record<string, unknown>) => post<Note>(`/api/clients/${id}/notes`, body),
  decideFinding: (id: string, findingId: string, body: Record<string, string>) =>
    post<Finding>(`/api/clients/${id}/findings/${findingId}/decision`, body),
  getAudit: (id: string) => get<AuditEntry[]>(`/api/clients/${id}/audit`),
  conversationSignal: (id: string, body: { pillar: string; old_score?: number; new_score?: number }) =>
    post<ConversationSignal>(`/api/clients/${id}/conversation-signal`, body),
  getFlags: (id: string) => get<RiskFlag[]>(`/api/clients/${id}/flags`),
  getWheel: (id: string) => get<WheelOfLife>(`/api/clients/${id}/wheel`),
  setDna: (id: string, dimensions: WheelDimension[]) =>
    post<WheelOfLife>(`/api/clients/${id}/dna`, { dimensions }),
  getStory: (id: string) => get<WealthStory>(`/api/clients/${id}/wealth-story`),
  getFeasibility: (id: string) => get<Feasibility>(`/api/clients/${id}/feasibility`),
  simulate: (id: string, body: Record<string, number>) =>
    post<Feasibility>(`/api/clients/${id}/feasibility/simulate`, body),
  getActions: (id: string) => get<ActionPoint[]>(`/api/clients/${id}/actions`),
  getTrust: (id: string) => get<TrustScore>(`/api/clients/${id}/trust-score`),
  approvals: () => get<{ items: ApprovalItem[]; oversight: Oversight }>("/api/approvals"),
  decideFlag: (id: string, flagId: string, body: Record<string, string>) =>
    post<{ flag: RiskFlag; trust: number }>(`/api/clients/${id}/flags/${flagId}/decision`, body),
  approveAction: (id: string, actionId: string, body: Record<string, string>) =>
    post<ActionPoint>(`/api/clients/${id}/actions/${actionId}/approve`, body),
  rerouteAction: (id: string, actionId: string, body: Record<string, string>) =>
    post<ActionPoint>(`/api/clients/${id}/actions/${actionId}/reroute`, body),
};

/** Stream the pipeline run (POST SSE) via fetch + ReadableStream. */
export async function runPipeline(
  id: string,
  onEvent: (e: PipelineEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${BASE}/api/clients/${id}/run`, { method: "POST", signal });
  if (!res.body) throw new Error("no stream body");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const chunks = buf.split("\n\n");
    buf = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const line = chunk.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      try {
        onEvent(JSON.parse(line.slice(5).trim()) as PipelineEvent);
      } catch {
        /* ignore keep-alive / partial */
      }
    }
  }
}
