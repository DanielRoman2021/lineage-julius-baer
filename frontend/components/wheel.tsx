"use client";
import type { WheelDimension } from "@/lib/types";

/** Wheel of Life, segmented wedges (matches the Lineage design system).
 *  Each dimension is a wedge whose radius encodes its 1 to 10 score.
 *  Low dimensions (<=5) read terracotta as "life gaps". The top priority,
 *  if given, is drawn red. Wedges are clickable when onSelect is provided. */
export function WheelOfLife({
  dimensions,
  size = 340,
  priorityName,
  onSelect,
}: {
  dimensions: WheelDimension[];
  size?: number;
  priorityName?: string;
  onSelect?: (name: string) => void;
}) {
  const N = dimensions.length || 10;
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 48;

  const pol = (r: number, deg: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  };
  const wedge = (r: number, a0: number, a1: number) => {
    const [x0, y0] = pol(r, a0);
    const [x1, y1] = pol(r, a1);
    const large = a1 - a0 <= 180 ? 0 : 1;
    return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
  };
  const seg = 360 / N;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto block w-full" style={{ maxWidth: size }} role="img" aria-label="Wheel of Life">
      <circle cx={cx} cy={cy} r={R} fill="#FBFAF6" stroke="#E4DFD3" />
      {[1, 2, 3, 4, 5].map((g) => (
        <circle key={g} cx={cx} cy={cy} r={(R * g) / 5} fill="none" stroke="#EFEADF" strokeWidth={1} />
      ))}
      {dimensions.map((d, i) => {
        const a0 = i * seg + 1.4;
        const a1 = (i + 1) * seg - 1.4;
        const r = (R * d.score) / 10;
        const isPriority = !!priorityName && d.name === priorityName;
        const low = d.score <= 5;
        const fill = isPriority ? "#C0392B" : low ? "#C8895E" : "#1B2A4A";
        return (
          <path
            key={`w${i}`}
            d={wedge(r, a0, a1)}
            fill={fill}
            opacity={0.92}
            onClick={onSelect ? () => onSelect(d.name) : undefined}
            style={onSelect ? { cursor: "pointer" } : undefined}
          />
        );
      })}
      {/* invisible full wedges to make the whole slice clickable, not just the filled part */}
      {onSelect &&
        dimensions.map((d, i) => (
          <path
            key={`hit${i}`}
            d={wedge(R, i * seg + 1.4, (i + 1) * seg - 1.4)}
            fill="transparent"
            onClick={() => onSelect(d.name)}
            style={{ cursor: "pointer" }}
          />
        ))}
      {dimensions.map((d, i) => {
        const mid = i * seg + seg / 2;
        const [lx, ly] = pol(R + 26, mid);
        const isPriority = !!priorityName && d.name === priorityName;
        return (
          <text
            key={`t${i}`}
            x={lx}
            y={ly}
            fill={isPriority ? "#C0392B" : "#3C4456"}
            fontSize={13}
            fontFamily="Archivo"
            fontWeight={isPriority ? 700 : 600}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {d.name}
          </text>
        );
      })}
    </svg>
  );
}
