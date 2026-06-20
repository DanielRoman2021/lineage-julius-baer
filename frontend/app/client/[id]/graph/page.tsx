"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { ClientState } from "@/lib/types";
import { MobileFrame } from "@/components/mobile-frame";
import { LoadingState, ErrorState, EmptyState } from "@/components/states";
import { WealthGraphView } from "@/components/wealth-graph";

export default function ClientGraphPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || "sarah_keller";
  const [state, setState] = useState<ClientState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const reload = useCallback(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    api
      .getClient(id)
      .then((c) => {
        if (alive) setState(c);
      })
      .catch(() => {
        if (alive) {
          setState(null);
          setError(true);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => reload(), [reload]);

  const graph = state?.wealth_graph;
  const hasGraph = !!graph && graph.nodes.length > 0;

  return (
    <MobileFrame title="Ownership & control">
      <div
        style={{
          height: "100%",
          padding: "6px 18px 24px",
          fontFamily: "Archivo, sans-serif",
          background: "#F7F5F0",
        }}
      >
        {loading ? (
          <LoadingState label="Loading your structure" minHeight={620} />
        ) : error || !state ? (
          <ErrorState onRetry={reload} minHeight={620} />
        ) : (
          <>
            {/* back link */}
            <Link
              href={`/client/${id}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12.5,
                color: "#707A8A",
                textDecoration: "none",
                padding: "8px 2px 4px",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#707A8A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M11 18l-6-6 6-6" />
              </svg>
              Back
            </Link>

            {/* header */}
            <div style={{ padding: "6px 2px 14px" }}>
              <div
                style={{
                  fontSize: 12,
                  color: "#A8854A",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                Wealth graph
              </div>
              <div
                style={{
                  fontFamily: "Spectral, serif",
                  fontSize: 24,
                  color: "#141E3C",
                  marginTop: 4,
                  lineHeight: 1.18,
                }}
              >
                Ownership and control structure
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#707A8A",
                  lineHeight: 1.55,
                  marginTop: 7,
                }}
              >
                Persons, companies, trusts, properties and foundations, and how
                they connect.
              </div>
            </div>

            {hasGraph ? (
              <>
                <div
                  style={{
                    height: 560,
                    width: "100%",
                    borderRadius: 18,
                    overflow: "hidden",
                    border: "1px solid #E4DFD3",
                    background: "#FBFAF6",
                  }}
                >
                  <WealthGraphView graph={graph} />
                </div>
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 11.5,
                    color: "#9AA1AE",
                    textAlign: "center",
                  }}
                >
                  Drag across to see the whole picture.
                </div>
              </>
            ) : (
              <EmptyState
                title="No structure yet"
                hint="Your ownership and control map appears here once your documents have been processed."
                minHeight={520}
              />
            )}
          </>
        )}
      </div>
    </MobileFrame>
  );
}
