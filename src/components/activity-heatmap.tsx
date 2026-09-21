import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { AggregatedHeatmap } from "@/lib/habits";

type Props = {
  data: AggregatedHeatmap;
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

function cellOpacity(level: number) {
  return level === 0 ? 0 : 0.25 + level * 0.19;
}

/**
 * Compute a cell size + gap that makes `columnCount` columns fit exactly in
 * `availableWidth`. Falls back to the default sizes when they already fit.
 * `minSize` differs per mode: daily/weekly keep readable cells (min 12),
 * yearly is allowed to shrink to GitHub-mobile proportions (min 3px).
 */
function computeFitSize(
  columnCount: number,
  availableWidth: number,
  defaultSize: number,
  defaultGap: number,
  minSize: number,
): { size: number; gap: number } | null {
  if (!availableWidth || columnCount <= 0) return null;
  const totalDefault = columnCount * defaultSize + (columnCount - 1) * defaultGap;
  if (totalDefault <= availableWidth) return null; // default already fits

  // Try shrinking the gap first, then the cell.
  for (const gap of [defaultGap, 2, 1]) {
    const size = Math.floor((availableWidth - (columnCount - 1) * gap) / columnCount);
    if (size >= minSize) return { size: Math.min(defaultSize, size), gap };
  }
  const size = Math.max(
    minSize,
    Math.floor((availableWidth - (columnCount - 1) * 1) / columnCount),
  );
  return { size, gap: 1 };
}

export function ActivityHeatmap({ data, color, unit, className }: Props) {
  const isYearly = data.mode === "yearly";
  const isDaily = data.mode === "daily";

  // Yearly: month labels from the grid itself.
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

  // ---------- Cell sizing ----------
  const baseCellSize = isYearly ? 11 : isDaily ? 20 : 22;
  const minCellSize = isYearly ? 3 : 12;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setContainerWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fitted =
    containerWidth > 0
      ? computeFitSize(data.columns.length, containerWidth, baseCellSize, 3, minCellSize)
      : null;

  const cellSize = fitted?.size ?? baseCellSize;
  const gap = fitted?.gap ?? 3;

  // Corner radius scales with the cell so tiny cells never turn into circles
  // and big cells keep the GitHub-style subtle rounding.
  const radius = Math.max(1, Math.min(2.5, Math.round(cellSize * 0.25 * 10) / 10));
  const labelSize = cellSize <= 5 ? "text-[7px] leading-2" : cellSize <= 8 ? "text-[8px] leading-[9px]" : "text-[9px] leading-3";

  // ---------- Render ----------
  const labelsRow = showLabelsRow ? (
    <div className="flex flex-shrink-0" style={{ gap, direction: "ltr" }} aria-hidden>
      {labels.map((label, i) => (
        <div
          key={i}
          className={cn("relative flex-shrink-0 text-neutral-500", labelSize)}
          style={{ width: cellSize, height: cellSize <= 5 ? 8 : 12 }}
        >
          {label && <span className="absolute left-0 whitespace-nowrap">{label}</span>}
        </div>
      ))}
    </div>
  ) : null;

  const gridRow = (
    <div className="flex flex-shrink-0" style={{ gap, direction: "ltr" }}>
      {data.columns.map((column, ci) => (
        <div key={ci} className="flex flex-col" style={{ gap }}>
          {column.map((day) => (
            <div
              key={day.date}
              title={
                day.value > 0
                  ? `${day.value} ${unit}${isDaily ? "" : data.mode === "weekly" ? " this week" : ""} — ${day.date}`
                  : `No activity — ${day.date}`
              }
              className="aspect-square flex-shrink-0"
              style={{
                width: cellSize,
                borderRadius: radius,
                backgroundColor:
                  day.level === 0 ? "rgba(255,255,255,0.055)" : shade(color, cellOpacity(day.level)),
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );

  const dailyLabelsRow = isDaily ? (
    <div className="flex flex-shrink-0" style={{ gap }} aria-hidden>
      {labels.map((label, i) => (
        <div
          key={i}
          className="flex-shrink-0 text-center text-[9px] leading-3 text-neutral-500"
          style={{ width: cellSize }}
        >
          {label}
        </div>
      ))}
    </div>
  ) : null;

  // Everything fits the card width by construction — no horizontal scrolling
  // in any mode. The grid can still scroll as a safety net if measurement
  // hasn't happened yet (first paint).
  return (
    <div
      ref={scrollRef}
      className={cn(
        "flex w-full min-w-0 flex-col overflow-x-auto overflow-y-hidden heatmap-scroll",
        className,
      )}
      style={{ gap }}
    >
      {labelsRow}
      {gridRow}
      {dailyLabelsRow}
    </div>
  );
}
