"use client";
import { ReactFlow, Background, Handle, Position, type Edge, type Node } from "@xyflow/react";
import { useMemo } from "react";
import type { PipelineStage } from "@/lib/types";

const LAYOUT: Record<string, [number, number]> = {
  parse: [0, 2.5],
  kyc: [1, 2.5],
  compliance_router: [2, 2.5],
  advisor: [3, 0],
  wealth_planner: [3, 1],
  tax: [3, 2],
  compliance: [3, 3],
  wealth_story: [3, 4],
  goal: [3, 5],
  action: [4, 2.5],
};

const STATUS_TONE: Record<string, { ring: string; dot: string; text: string }> = {
  queued: { ring: "border-ivory-300", dot: "bg-ivory-300", text: "text-slate-muted" },
  running: { ring: "border-gold shadow-lift", dot: "bg-gold animate-pulse", text: "text-navy" },
  done: { ring: "border-emerald/40", dot: "bg-emerald", text: "text-navy" },
  awaiting_approval: { ring: "border-amber shadow-lift", dot: "bg-amber animate-pulse", text: "text-navy" },
  approved: { ring: "border-emerald/40", dot: "bg-emerald", text: "text-navy" },
  blocked: { ring: "border-ruby", dot: "bg-ruby", text: "text-navy" },
  error: { ring: "border-ruby", dot: "bg-ruby", text: "text-navy" },
};

function AgentNode({ data }: { data: { label: string; status: string; summary: string; kind: string; selected: boolean } }) {
  const tone = STATUS_TONE[data.status] ?? STATUS_TONE.queued;
  return (
    <div
      className={`w-[178px] rounded-xl border bg-white px-3 py-2.5 shadow-card transition-all ${tone.ring} ${
        data.selected ? "ring-2 ring-navy" : ""
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-1.5 !w-1.5 !border-0 !bg-gold" />
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
        <span className={`display text-[13px] font-medium ${tone.text}`}>{data.label}</span>
      </div>
      {data.kind !== "agent" && (
        <span className="mt-1 inline-block rounded-full bg-navy/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-slate-muted">
          {data.kind === "gate" ? "human gate" : data.kind}
        </span>
      )}
      {data.summary && <p className="mt-1 line-clamp-2 text-[10.5px] leading-snug text-slate-muted">{data.summary}</p>}
      <Handle type="source" position={Position.Right} className="!h-1.5 !w-1.5 !border-0 !bg-gold" />
    </div>
  );
}

const nodeTypes = { agent: AgentNode };

export function PipelineGraph({
  stages,
  selected,
  onSelect,
}: {
  stages: PipelineStage[];
  selected?: string;
  onSelect?: (agent: string) => void;
}) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = stages.map((s) => {
      const [col, row] = LAYOUT[s.agent] ?? [0, 0];
      const kind =
        s.agent === "compliance_router" ? "router" : s.agent === "compliance" && s.status === "awaiting_approval" ? "gate" : "agent";
      return {
        id: s.agent,
        type: "agent",
        position: { x: 30 + col * 232, y: 20 + row * 86 },
        data: { label: s.label, status: s.status, summary: s.summary, kind, selected: selected === s.agent },
        draggable: false,
      };
    });
    const edges: Edge[] = [];
    for (const s of stages) {
      for (const dep of s.depends_on) {
        const tone = s.status === "awaiting_approval" ? "#B9852E" : "#C9A86A";
        edges.push({
          id: `${dep}-${s.agent}`,
          source: dep,
          target: s.agent,
          animated: s.status === "running",
          style: { stroke: tone },
        });
      }
    }
    return { nodes, edges };
  }, [stages, selected]);

  return (
    <div className="h-[560px] w-full overflow-hidden rounded-2xl border border-ivory-300 bg-ivory-100">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, n) => onSelect?.(n.id)}
        minZoom={0.4}
        maxZoom={1.4}
      >
        <Background color="#E7E2D6" gap={22} />
      </ReactFlow>
    </div>
  );
}
