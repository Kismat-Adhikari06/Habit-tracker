import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { AggregatedHeatmap } from "@/lib/habits";

type Props = {
  data: AggregatedHeatmap;
  /** base accent color, any CSS color */
  color: string;
  unit: string;
  className?: string;
};

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shade(hex: string, opacity: number) {
  if (!hex.startsWith("#")) return hex;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

const GAP = 3;

function cellOpacity(level: number) {
  return level === 0 ? 0 : 0.25 + level * 0.19;
}

/**
 * On narrow screens, shrink cells (and drop trailing columns) so the yearly
 * grid fits without horizontal overflow. Desktop is unaffected.
 */
function useResponsiveCellSize(isYearly: boolean, columnCount: number) {
  const [size, setSize] = useState(isYearly ? 11 : isDailySizeFallback());

  useEffect(() => {
    if (!isYearly) return;
    const compute = () => {
      // Measure the actual container width via the viewport (card ~= viewport - padding on phones)
      const available = Math.min(document.documentElement.clientWidth, 1152) - 48; // page padding
      const mobileAllowance = document.documentElement.clientWidth < 640 ? 76 : 0; // room for stats/legend on phones
      const fitting = Math.floor((available - mobileAllowance - (columnCount - 1) * GAP) / columnCount);
      setSize(Math.max(5, Math.min(11, fitting)));
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [isYearly, columnCount]);

  return size;
}

function isDailySizeFallback() {
  return typeof window !== "undefined" && window.innerWidth < 640 ? 14 : 18;
}

export function ActivityHeatmap({ data, color, unit, className }: Props) {
  const isYearly = data.mode === "yearly";
  const isDaily = data.mode === "daily";

  // Yearly: month labels derived from the grid itself.
  const yearlyLabels = useMemo(() => {
    if (!isYearly) return [];
    let lastLabelCol = -99;
    return data.columns.map((week, i) => {
      const d = new Date(week[0].date + "T00:00:00Z");
      const prev = i > 0 ? new Date(data.columns[i - 1][0].date + "T00:00:00Z") : null;
      const monthChanged = i === 0 || !prev || prev.getUTCMonth() !== d.getUTCMonth();
      const show = monthChanged && i - lastLabelCol >= 3;
      if (show) lastLabelCol = i;
      return { label: show ? MONTH_LABELS[d.getUTCMonth()] : "", key: i };
    });
  }, [data.columns, isYearly]);

  const labels = isYearly ? yearlyLabels.map((l) => l.label) : data.labels;

  const showLabelsRow = !isDaily;
  const baseCellSize = isYearly ? 11 : isDaily ? 18 : 22;
  const cellSize = useResponsiveCellSize(isYearly, data.columns.length) || baseCellSize;

  return (
    <div className={cn("flex min-w-0 flex-col gap-[3px]", className)}>
      {showLabelsRow && (
        <div className="flex" style={{ gap: GAP }} aria-hidden>
          {labels.map((label, i) => (
            <div key={i} className="relative h-3 text-[9px] leading-3 text-neutral-500" style={{ width: cellSize }}>
              {label && <span className="absolute left-0 whitespace-nowrap">{label}</span>}
            </div>
          ))}
        </div>
      )}

      <div className="flex" style={{ gap: GAP }}>
        {data.columns.map((column, ci) => (
          <div key={ci} className="flex flex-col" style={{ gap: GAP }}>
            {column.map((day) => (
              <div
                key={day.date}
                title={
                  day.value > 0
                    ? `${day.value} ${unit}${isYearly ? "" : isDaily ? "" : " this week"} — ${day.date}`
                    : `No activity — ${day.date}`
                }
                className="rounded-[2.5px]"
                style={{
                  width: cellSize,
                  height: cellSize,
                  minWidth: 0,
                  backgroundColor:
                    day.level === 0
                      ? "rgba(255,255,255,0.055)"
                      : shade(color, cellOpacity(day.level)),
                }}
              />
            ))}
          </div>
        ))}
      </div>

      {isDaily && (
        <div className="flex" style={{ gap: GAP }} aria-hidden>
          {labels.map((label, i) => (
            <div key={i} className="text-center text-[9px] leading-3 text-neutral-500" style={{ width: cellSize }}>
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
