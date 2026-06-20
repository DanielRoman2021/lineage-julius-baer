"""Graph agent — maps the client's ownership and control structure from documents."""
from __future__ import annotations

from agents.base import AgentResult, PipelineContext, load_prompt
from agents.schemas import GraphEdgeOut, GraphNodeOut, WealthGraphOut
from anthropic_client import agenerate
from models.client import AgentType, EntityType, GraphEdge, GraphNode, WealthGraph

AGENT_TYPE = AgentType.graph


def _canned(ctx: PipelineContext) -> WealthGraphOut:
    c = ctx.client
    return WealthGraphOut(
        nodes=[
            GraphNodeOut(id="beneficial_owner", type="person", label=c.name, sublabel="Beneficial owner"),
            GraphNodeOut(id="family_trust", type="trust", label="Family Trust", sublabel="Discretionary trust"),
            GraphNodeOut(id="holding_company", type="company", label="Holding Company", sublabel="Holding entity"),
            GraphNodeOut(id="operating_company", type="company", label="Operating Company", sublabel="Sold in 2023"),
            GraphNodeOut(id="foundation", type="foundation", label="Family Foundation", sublabel="Philanthropy"),
            GraphNodeOut(id="residence", type="property", label="Primary Residence", sublabel="Held personally"),
        ],
        edges=[
            GraphEdgeOut(source="beneficial_owner", target="family_trust", relation="SETTLOR OF"),
            GraphEdgeOut(source="family_trust", target="holding_company", relation="OWNS"),
            GraphEdgeOut(source="holding_company", target="operating_company", relation="OWNS"),
            GraphEdgeOut(source="beneficial_owner", target="holding_company", relation="CONTROLS"),
            GraphEdgeOut(source="beneficial_owner", target="foundation", relation="DIRECTOR OF"),
            GraphEdgeOut(source="beneficial_owner", target="residence", relation="OWNS"),
        ],
    )


async def run(ctx: PipelineContext) -> AgentResult:
    system = load_prompt("graph")
    user = (
        f"{ctx.client_block()}\n\n"
        f"=== DOCUMENTS ===\n{ctx.documents_digest(2200)}\n\n"
        f"Extract every legal entity (person, company, trust, property, foundation) and the "
        f"ownership and control relationships between them. Use stable slug ids for each entity. "
        f"Use relations OWNS, CONTROLS, DIRECTOR OF, SETTLOR OF, BENEFICIARY OF."
    )
    out, mode = await agenerate(
        system=system, user=user, output_model=WealthGraphOut,
        canned=lambda: _canned(ctx), tier="specialist", max_tokens=2200,
    )
    nodes = [
        GraphNode(
            id=n.id,
            type=next((t for t in EntityType if t.value == n.type), EntityType.company),
            label=n.label,
            sublabel=n.sublabel,
        )
        for n in out.nodes
    ]
    edges = [GraphEdge(source=e.source, target=e.target, relation=e.relation) for e in out.edges]
    graph = WealthGraph(client_id=ctx.client.id, nodes=nodes, edges=edges)
    return AgentResult(
        summary=f"Ownership graph: {len(nodes)} entities, {len(edges)} links",
        mode=mode,
        wealth_graph=graph,
    )
