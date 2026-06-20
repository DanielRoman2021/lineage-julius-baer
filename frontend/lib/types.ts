// Types mirror the FastAPI backend (snake_case end-to-end).

export type StageStatus =
  | "queued" | "running" | "done" | "awaiting_approval" | "approved" | "blocked" | "error";

export interface ClientSummary {
  id: string;
  name: string;
  headline: string;
  domicile: string;
  segment: string;
  net_worth: number;
  currency: string;
  status: string;
  tags: string[];
  trust_score: number;
  open_flags: number;
  pending_actions: number;
  has_run: boolean;
}

export interface Client {
  id: string;
  name: string;
  photo_url?: string | null;
  headline: string;
  domicile: string;
  marital_status: string;
  segment: string;
  net_worth: number;
  currency: string;
  rm_id: string;
  rm_name: string;
  status: string;
  tags: string[];
  trust_score: number;
}

export interface WheelDimension { name: string; score: number; note: string; }
export interface WheelOfLife { client_id: string; dimensions: WheelDimension[]; updated_at: string; }

export interface DocumentRec {
  id: string; client_id: string; filename: string; doc_type: string;
  uploaded_at: string; pages: number; extracted_text: string;
  extracted_fields: Record<string, unknown>; parse_status: string; flagged: boolean;
}

export interface SourceCitation { label: string; doc_id?: string | null; page?: number | null; quote?: string | null; }

export interface RiskFlag {
  id: string; client_id: string; document_id?: string | null;
  category: string; severity: string; title: string; matched_entity: string; rationale: string;
  confidence: number; checked_against: string; source_ref?: SourceCitation | null; status: string;
  routed_to_role?: string | null; routed_to_id?: string | null;
  routed_to_name: string; routed_to_initials: string;
}

export interface RoutingDecision {
  id: string; item_id: string; item_type: string; target_role: string;
  criterion: string; explanation: string;
}

export interface Finding {
  id: string; client_id: string; agent_role: string; title: string; summary: string;
  draft_note: string; severity: string; status: string; checked_against: string; confidence: number;
  source_refs: SourceCitation[]; requires_approval: boolean;
  routed_to_id?: string | null; routed_to_name: string; routed_to_initials: string;
}

export interface Person {
  id: string; name: string; initials: string; role: string; title: string;
  email: string; avatar_tone: string;
}

export interface Note {
  id: string; client_id: string; author_id: string; author_name: string;
  text: string; kind: string; tags: string[]; created_at: string;
}

export interface PersonRef { name: string; role: string; initials: string; reason: string; }
export interface ConversationSignal {
  client_id: string; pillar: string; direction: string;
  old_score?: number | null; new_score?: number | null;
  talking_points: string[]; future_topics: string[];
  people_to_involve: PersonRef[]; summary: string; mode: string; created_at: string;
}

export interface SubCheck { key: string; label: string; status: string; detail: string; optional: boolean; }
export interface SpecialistReview {
  role: string; agent_label: string; note: string; status: string;
  routed_to_id?: string | null; routed_to_name: string; routed_to_initials: string; action_label: string;
}
export interface Verification {
  client_id: string; subchecks: SubCheck[]; specialists: SpecialistReview[];
  criteria_total: number; criteria_cleared: number; criteria_to_human: number;
  approver_id: string; approver_name: string; approver_initials: string; guardrail: string;
}

export interface Milestone { year: number; title: string; description: string; }
export interface WealthStory {
  client_id: string; headline: string; narrative_markdown: string;
  milestones: Milestone[]; sources: SourceCitation[];
}

export interface Goal {
  id: string; client_id: string; title: string; goal_type: string;
  target_year?: number | null; estimated_cost?: number | null; funded_status: string; notes: string;
}
export interface GoalOutcome { goal_id: string; goal_title: string; feasible: boolean; gap_amount: number; suggestion: string; }
export interface ProjectionPoint { year: number; age: number; assets: number; liabilities: number; }
export interface FeasibilityAssumptions {
  current_assets: number; annual_income: number; annual_spending: number;
  growth_rate: number; inflation: number; current_age: number; retirement_age: number;
}
export interface Feasibility {
  client_id: string; assumptions: FeasibilityAssumptions; projection: ProjectionPoint[];
  goal_outcomes: GoalOutcome[]; verdict: string; life_gaps: string[];
}

export interface ActionPoint {
  id: string; client_id: string; title: string; description: string; owner_role: string;
  priority: string; status: string; confidence: number; source_refs: SourceCitation[];
}

export interface TrustScore {
  client_id: string; score: number;
  components: { kyc_completeness: number; data_freshness: number; engagement: number; risk_cleared: number };
  trend: string;
}

export interface PipelineStage {
  agent: string; label: string; status: StageStatus; depends_on: string[];
  summary: string; started_at?: string | null; finished_at?: string | null;
}
export interface PipelineRun {
  id: string; client_id: string; status: StageStatus; stages: PipelineStage[];
  started_at?: string | null; finished_at?: string | null; mode: string;
}

export interface AuditEntry {
  id: string; client_id: string; ref_type: string; ref_id: string; input_summary: string;
  model_version: string; output_summary: string; confidence: number; reviewer: string;
  timestamp: string; rationale: string;
}

export interface ClientState {
  client: Client;
  documents: DocumentRec[];
  notes: Note[];
  flags: RiskFlag[];
  routing: RoutingDecision[];
  findings: Finding[];
  wealth_story?: WealthStory | null;
  goals: Goal[];
  feasibility?: Feasibility | null;
  wheel?: WheelOfLife | null;
  actions: ActionPoint[];
  approvals: unknown[];
  audit: AuditEntry[];
  trust?: TrustScore | null;
  pipeline?: PipelineRun | null;
  verification?: Verification | null;
  latest_signal?: ConversationSignal | null;
}

export interface ApprovalAudit {
  input: string; model_version: string; reviewer: string; reason: string;
}
export interface ApprovalItem {
  kind: "flag" | "action" | "finding"; id: string; client_id: string; client_name: string;
  role: string; owner_role: string; title: string; detail: string; confidence: number;
  severity: string; checked_against: string; routed_to_name: string; routed_to_initials: string;
  source?: string | null; guardrail: string; audit: ApprovalAudit;
}
export interface Oversight {
  total_decisions: number; override_rate: number; agreement_rate: number;
  median_review_seconds: number; note: string;
}
export interface PipelineEvent {
  type: "run_started" | "stage" | "run_complete";
  agent?: string; label?: string; status?: StageStatus; summary?: string;
  run_id?: string; mode?: string; trust?: number; open_flags?: number; actions?: number;
}
