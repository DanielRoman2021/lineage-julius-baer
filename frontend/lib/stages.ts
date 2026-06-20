import type { PipelineStage } from "./types";

const mk = (agent: string, label: string, depends_on: string[]): PipelineStage => ({
  agent, label, status: "queued", depends_on, summary: "",
});

export const STAGE_TEMPLATE: PipelineStage[] = [
  mk("parse", "Parse documents", []),
  mk("kyc", "KYC screening", ["parse"]),
  mk("compliance_router", "Compliance router", ["kyc"]),
  mk("advisor", "Advisor review", ["compliance_router"]),
  mk("wealth_planner", "Wealth planner", ["compliance_router"]),
  mk("tax", "Tax review", ["compliance_router"]),
  mk("compliance", "Compliance review", ["compliance_router"]),
  mk("wealth_story", "Wealth story", ["compliance_router"]),
  mk("goal", "Goals & feasibility", ["compliance_router"]),
  mk("action", "Action points", [
    "advisor", "wealth_planner", "tax", "compliance", "wealth_story", "goal",
  ]),
];

export function freshStages(): PipelineStage[] {
  return STAGE_TEMPLATE.map((s) => ({ ...s }));
}
