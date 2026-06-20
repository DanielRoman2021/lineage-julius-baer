"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { LoadingState, ErrorState, EmptyState } from "@/components/states";
import { ClientSwitcher } from "@/components/client-switcher";
import { WealthGraphView } from "@/components/wealth-graph";
import type { ClientState } from "@/lib/types";

export default function OwnershipStructurePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || "sarah_keller";
  const [state, setState] = useState<ClientState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const c = await api.getClient(id);
      setState(c);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (loading) {
    return (
      <div className="p-7">
        <LoadingState label="Loading ownership structure" />
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="p-7">
        <ErrorState onRetry={reload} />
      </div>
    );
  }

  const graph = state.wealth_graph;
  const hasGraph = !!graph && graph.nodes.length > 0;

  return (
    <div style={{ background: "#F7F5F0", color: "#3C4456", fontFamily: "Archivo, sans-serif" }}>
      {/* Sub-header strip */}
      <div
        style={{
          height: 68,
          borderBottom: "1px solid #E4DFD3",
          background: "#FBFAF6",
          display: "flex",
          alignItems: "center",
          padding: "0 32px",
          gap: 18,
        }}
      >
        <ClientSwitcher
          currentId={id}
          hrefFor={(cid) => `/rm/clients/${cid}/structure`}
          subtitle="Ownership & control"
        />
      </div>

      <div style={{ padding: "36px 44px 56px" }}>
        {/* section heading */}
        <div style={{ marginBottom: 22 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#A8854A",
              fontWeight: 700,
            }}
          >
            Wealth graph
          </div>
          <div
            style={{
              fontFamily: "Spectral, serif",
              fontWeight: 300,
              fontSize: 34,
              color: "#141E3C",
              lineHeight: 1.14,
              marginTop: 8,
            }}
          >
            Ownership & control structure
          </div>
          <div style={{ fontSize: 14, color: "#707A8A", lineHeight: 1.6, marginTop: 8, maxWidth: 640 }}>
            Persons, companies, trusts, properties and foundations, and how they connect.
          </div>
        </div>

        {hasGraph ? (
          <div
            style={{
              height: 640,
              width: "100%",
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid #E4DFD3",
              background: "#FBFAF6",
            }}
          >
            <WealthGraphView graph={graph} />
          </div>
        ) : (
          <div
            style={{
              borderRadius: 16,
              border: "1px solid #E4DFD3",
              background: "#fff",
            }}
          >
            <EmptyState
              title="No structure yet"
              hint="The ownership and control map appears here once the client's documents have been processed by the agents."
              minHeight={420}
            />
          </div>
        )}
      </div>
    </div>
  );
}
