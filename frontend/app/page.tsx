"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <div
      style={{
        minHeight: "900px",
        background:
          "radial-gradient(130% 90% at 50% -10%, #21325A, #141E3C 60%)",
        fontFamily: "Archivo, sans-serif",
        color: "#F4F1EA",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 24px",
      }}
    >
      <style>{`
        a.door{transition:border-color .2s, background .2s, transform .2s;}
        a.door:hover{border-color:#C9A86A; background:#21325A; transform:translateY(-2px);}
        a.door:hover .arrow{transform:translateX(4px);}
        a.door .arrow{transition:transform .2s;}
      `}</style>

      <div style={{ textAlign: "center", maxWidth: "680px" }}>
        <div
          style={{
            fontFamily: "Spectral, serif",
            fontSize: "46px",
            letterSpacing: "0.34em",
            fontWeight: 500,
            color: "#F7F5F0",
            paddingLeft: "0.34em",
          }}
        >
          LINEAGE
        </div>
        <div
          style={{
            margin: "22px auto 0",
            width: "60px",
            height: "1px",
            background: "#C9A86A",
            opacity: 0.7,
          }}
        ></div>
        <div
          style={{
            marginTop: "26px",
            fontFamily: "Spectral, serif",
            fontWeight: 300,
            fontSize: "23px",
            lineHeight: 1.5,
            color: "#D9DEEA",
          }}
        >
          A living record of how a family's wealth was built, and where it is
          going.
        </div>
      </div>

      <div
        style={{
          marginTop: "52px",
          display: "flex",
          gap: "24px",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Link
          className="door"
          href="/rm"
          style={{
            textDecoration: "none",
            width: "332px",
            background: "#1B2A4A",
            border: "1px solid rgba(201,168,106,.32)",
            borderRadius: "14px",
            padding: "30px 30px 26px",
            display: "block",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "11px",
                background: "rgba(201,168,106,.16)",
                border: "1px solid rgba(201,168,106,.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#C9A86A"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="9" />
                <rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" />
                <rect x="3" y="16" width="7" height="5" />
              </svg>
            </span>
            <svg
              className="arrow"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9BA6BC"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </div>
          <div
            style={{
              fontFamily: "Spectral, serif",
              fontSize: "23px",
              color: "#F7F5F0",
              marginTop: "22px",
            }}
          >
            Enter as relationship manager
          </div>
          <div
            style={{
              fontSize: "13.5px",
              color: "#9BA6BC",
              marginTop: "7px",
              lineHeight: 1.55,
            }}
          >
            See your clients, the agent checks, and what needs a person to
            decide.
          </div>
        </Link>

        <Link
          className="door"
          href="/client/sarah_keller"
          style={{
            textDecoration: "none",
            width: "332px",
            background: "#1B2A4A",
            border: "1px solid rgba(201,168,106,.32)",
            borderRadius: "14px",
            padding: "30px 30px 26px",
            display: "block",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "11px",
                background: "rgba(201,168,106,.16)",
                border: "1px solid rgba(201,168,106,.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#C9A86A"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </span>
            <svg
              className="arrow"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9BA6BC"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </div>
          <div
            style={{
              fontFamily: "Spectral, serif",
              fontSize: "23px",
              color: "#F7F5F0",
              marginTop: "22px",
            }}
          >
            Enter as client
          </div>
          <div
            style={{
              fontSize: "13.5px",
              color: "#9BA6BC",
              marginTop: "7px",
              lineHeight: 1.55,
            }}
          >
            Read your own story, see what is next, and talk to your relationship
            manager.
          </div>
        </Link>
      </div>

      <div
        style={{
          marginTop: "54px",
          fontSize: "12px",
          color: "#6B7488",
          letterSpacing: "0.04em",
        }}
      >
        Julius Baer, private banking
      </div>
    </div>
  );
}
