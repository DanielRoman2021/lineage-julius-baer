"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, FolderClosed, LayoutDashboard, ListChecks, Share2, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function RunModeBadge() {
  const [mode, setMode] = useState<string>("");
  useEffect(() => {
    api.health().then((h) => setMode(h.mode)).catch(() => setMode("offline"));
  }, []);
  if (!mode) return null;
  const live = mode === "live";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
      style={{ background: live ? "#EAF0EB" : "rgba(201,168,106,.15)", color: live ? "#436B52" : "#A8854A" }}
      title={live ? "Live Anthropic agents" : "Demo mode, runs offline with prepared answers"}
    >
      <Sparkles size={12} />
      {live ? "Live AI" : "Demo mode"}
    </span>
  );
}

function currentClient(path: string): string {
  const m = path.match(/\/rm\/clients\/([^/]+)/);
  return m ? m[1] : "sarah_keller";
}

export function RmShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const cid = currentClient(path);
  const nav = [
    { href: "/rm", label: "Dashboard", icon: LayoutDashboard, match: (p: string) => p === "/rm" },
    { href: "/rm/intake", label: "Intake & DNA", icon: UserPlus, match: (p: string) => p.includes("/intake") },
    { href: `/rm/clients/${cid}/vault`, label: "Document Vault", icon: FolderClosed, match: (p: string) => p.includes("/vault") },
    { href: "/rm/verification", label: "Verification", icon: ShieldCheck, match: (p: string) => p.includes("/verification") || p.includes("/flow") },
    { href: `/rm/clients/${cid}/story`, label: "Wealth Story", icon: BookOpen, match: (p: string) => p.includes("/story") },
    { href: `/rm/clients/${cid}/structure`, label: "Structure", icon: Share2, match: (p: string) => p.includes("/structure") },
    { href: "/rm/approvals", label: "Action Points", icon: ListChecks, match: (p: string) => p.includes("/approvals") },
  ];

  return (
    <div className="flex min-h-screen" style={{ background: "#EDEAE2" }}>
      <aside className="hidden w-[232px] shrink-0 flex-col py-[26px] md:flex" style={{ background: "#141E3C", color: "#C7CEDC" }}>
        <Link href="/" className="px-[26px]" style={{ fontFamily: "Spectral", fontSize: 20, letterSpacing: "0.26em", color: "#F7F5F0", fontWeight: 500 }}>
          LINEAGE
        </Link>
        <nav className="mt-[38px] flex flex-col gap-[3px] px-[14px]">
          {nav.map((n) => {
            const active = n.match(path);
            return (
              <Link
                key={n.label}
                href={n.href}
                className="flex items-center gap-[13px] rounded-[7px] px-[14px] py-[11px] text-[13.5px]"
                style={
                  active
                    ? { background: "rgba(201,168,106,.14)", color: "#F4F1EA", fontWeight: 600, boxShadow: "inset 2px 0 0 #C9A86A" }
                    : { color: "#9BA6BC" }
                }
              >
                <n.icon size={17} style={{ color: active ? "#C9A86A" : "currentColor" }} />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex items-center gap-[11px] px-[20px] pt-4" style={{ borderTop: "1px solid rgba(255,255,255,.07)", margin: "0 14px" }}>
          <span className="grid h-[34px] w-[34px] place-items-center rounded-full text-[13px] font-bold" style={{ background: "#C9A86A", color: "#141E3C" }}>MB</span>
          <div>
            <p className="text-[13px]" style={{ color: "#F4F1EA" }}>Markus Brunner</p>
            <p className="text-[11.5px]" style={{ color: "#7E8AA0" }}>Relationship Manager</p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[68px] items-center gap-[18px] px-8" style={{ borderBottom: "1px solid #E4DFD3", background: "#FBFAF6" }}>
          <Link href="/" className="md:hidden" style={{ fontFamily: "Spectral", letterSpacing: "0.2em", color: "#141E3C" }}>LINEAGE</Link>
          <div className="ml-auto flex items-center gap-4">
            <RunModeBadge />
            <Link href="/client/sarah_keller" className="text-xs font-medium" style={{ color: "#707A8A" }}>View as client</Link>
          </div>
        </header>
        <main className="min-w-0 flex-1" style={{ background: "#F7F5F0" }}>{children}</main>
      </div>
    </div>
  );
}
