"use client";
import { ReactFlow, Background, Handle, Position, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";
import { User, Building2, Landmark, Home, HeartHandshake, type LucideIcon } from "lucide-react";
import type { EntityType, WealthGraph } from "@/lib/types";

type TypeMeta = { icon: LucideIcon; label: string; tone: string };

const TYPE_META: Record<EntityType, TypeMeta> = {
  person: { icon: User, label: "Person", tone: "#3C4456" },
  company: { icon: Building2, label: "Company", tone: "#1F6F5C" },
  trust: { icon: Landmark, label: "Trust", tone: "#B9852E" },
  property: { icon: Home, label: "Property", tone: "#9A5B3F" },
  foundation: { icon: HeartHandshake, label: "Foundation", tone: "#5B4B8A" },
};

const TYPE_ORDER: EntityType[] = ["person", "company", "trust", "property", "foundation"];

function EntityNode({ data }: { data: { type: EntityType; label: string; sublabel: string } }) {
  const meta = TYPE_META[data.type] ?? TYPE_META.person;
  const Icon = meta.icon;
  return (
    <div className="w-[180px] rounded-xl border border-ivory-300 bg-white px-3 py-2.5 shadow-card">
      <Handle type="target" position={Position.Top} className="!h-1.5 !w-1.5 !border-0 !bg-gold" />
      <div className="flex items-center gap-2">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${meta.tone}1A`, color: meta.tone }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span
          className="inline-block rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wider"
          style={{ backgroundColor: `${meta.tone}14`, color: meta.tone }}
        >
          {meta.label}
        </span>
      </div>
      <p className="display mt-1.5 text-[13px] font-medium leading-snug text-navy">{data.label}</p>
      {data.sublabel && <p className="mt-0.5 text-[10.5px] leading-snug text-slate-muted">{data.sublabel}</p>}
      <Handle type="source" position={Position.Bottom} className="!h-1.5 !w-1.5 !border-0 !bg-gold" />
    </div>
  );
}

const nodeTypes = { entity: EntityNode };

export function WealthGraphView({ graph }: { graph: WealthGraph }) {
  const { nodes, edges, hasData } = useMemo(() => {
    if (!graph || !graph.nodes || graph.nodes.length === 0) {
      return { nodes: [] as Node[], edges: [] as Edge[], hasData: false };
    }

    // Tier layout: roots (no incoming edge) at tier 0, BFS depth along edges sets tier.
    const incoming = new Map<string, number>();
    const adjacency = new Map<string, string[]>();
    for (const n of graph.nodes) {
      incoming.set(n.id, 0);
      adjacency.set(n.id, []);
    }
    for (const e of graph.edges) {
      if (incoming.has(e.target)) incoming.set(e.target, (incoming.get(e.target) ?? 0) + 1);
      if (adjacency.has(e.source)) adjacency.get(e.source)!.push(e.target);
    }

    const tier = new Map<string, number>();
    const queue: string[] = [];
    for (const n of graph.nodes) {
      if ((incoming.get(n.id) ?? 0) === 0) {
        tier.set(n.id, 0);
        queue.push(n.id);
      }
    }
    // Fallback: if every node has an incoming edge (cycle), seed with the first node.
    if (queue.length === 0 && graph.nodes.length > 0) {
      tier.set(graph.nodes[0].id, 0);
      queue.push(graph.nodes[0].id);
    }
    while (queue.length > 0) {
      const id = queue.shift()!;
      const depth = tier.get(id) ?? 0;
      for (const next of adjacency.get(id) ?? []) {
        const candidate = depth + 1;
        if (!tier.has(next) || candidate > (tier.get(next) ?? 0)) {
          tier.set(next, candidate);
          queue.push(next);
        }
      }
    }
    // Any node never reached gets tier 0.
    for (const n of graph.nodes) if (!tier.has(n.id)) tier.set(n.id, 0);

    // Spread siblings on x within each tier.
    const rowByTier = new Map<number, number>();
    const nodes: Node[] = graph.nodes.map((n) => {
      const t = tier.get(n.id) ?? 0;
      const row = rowByTier.get(t) ?? 0;
      rowByTier.set(t, row + 1);
      return {
        id: n.id,
        type: "entity",
        position: { x: 40 + row * 210, y: 30 + t * 150 },
        data: { type: n.type, label: n.label, sublabel: n.sublabel },
        draggable: false,
      };
    });

    const edges: Edge[] = graph.edges.map((e, i) => ({
      id: `${e.source}-${e.target}-${i}`,
      source: e.source,
      target: e.target,
      type: "smoothstep",
      animated: false,
      label: e.relation,
      labelBgPadding: [4, 2] as [number, number],
      labelBgStyle: { fill: "#F7F5F0", fillOpacity: 0.92 },
      labelStyle: { fill: "#707A8A", fontSize: 9 },
      style: { stroke: "#B9852E", strokeDasharray: "5 4", strokeWidth: 1.4 },
    }));

    return { nodes, edges, hasData: true };
  }, [graph]);

  if (!hasData) {
    return <p className="px-3 py-4 text-[11px] text-slate-muted">No structure yet</p>;
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        panOnScroll={false}
        proOptions={{ hideAttribution: true }}
        minZoom={0.3}
        maxZoom={1.6}
      >
        <Background color="#E7E2D6" gap={22} />
      </ReactFlow>
      <div className="absolute bottom-3 left-3 flex flex-col gap-1 rounded-lg border border-ivory-300 bg-white/90 px-2.5 py-2 shadow-card backdrop-blur">
        {TYPE_ORDER.map((t) => {
          const meta = TYPE_META[t];
          const Icon = meta.icon;
          return (
            <div key={t} className="flex items-center gap-1.5">
              <span
                className="flex h-4 w-4 items-center justify-center rounded"
                style={{ backgroundColor: `${meta.tone}1A`, color: meta.tone }}
              >
                <Icon className="h-2.5 w-2.5" />
              </span>
              <span className="text-[10px] text-slate-muted">{meta.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
