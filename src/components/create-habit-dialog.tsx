"use client";

import { useMemo, useState } from "react";
import {
  Dumbbell, Footprints, Droplets, GitCommitHorizontal, Ban, BookOpen, Zap, Moon,
  Heart, PenLine, Bike, Salad, Cigarette, Music, GraduationCap, Brain,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createHabitAction } from "@/app/actions";
import type { TrackingType } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICON_CHOICES: { name: string; icon: LucideIcon }[] = [
  { name: "dumbbell", icon: Dumbbell },
  { name: "footprints", icon: Footprints },
  { name: "droplets", icon: Droplets },
  { name: "github", icon: GitCommitHorizontal },
  { name: "ban", icon: Ban },
  { name: "book", icon: BookOpen },
  { name: "zap", icon: Zap },
  { name: "moon", icon: Moon },
  { name: "heart", icon: Heart },
  { name: "pen", icon: PenLine },
  { name: "bike", icon: Bike },
  { name: "salad", icon: Salad },
  { name: "cigarette", icon: Cigarette },
  { name: "music", icon: Music },
  { name: "graduation", icon: GraduationCap },
  { name: "brain", icon: Brain },
];

const COLOR_CHOICES = ["#f97316", "#22c55e", "#38bdf8", "#a78bfa", "#f43f5e", "#eab308", "#ec4899", "#14b8a6"];

const TYPES: { value: TrackingType; label: string; hint: string }[] = [
  { value: "duration", label: "Duration", hint: "minutes, hours" },
  { value: "distance", label: "Distance", hint: "km, miles" },
  { value: "quantity", label: "Quantity", hint: "L, ml, pages" },
  { value: "boolean", label: "Boolean", hint: "done or not" },
];

const UNIT_SUGGESTIONS: Record<TrackingType, string[]> = {
  duration: ["min", "hr"],
  distance: ["km", "mi"],
  quantity: ["L", "ml", "pages", "glasses"],
  boolean: ["done"],
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

export function CreateHabitDialog({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("zap");
  const [color, setColor] = useState(COLOR_CHOICES[0]);
  const [type, setType] = useState<TrackingType>("duration");
  const [unit, setUnit] = useState("min");
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);

  const SelectedIcon = useMemo(() => ICON_CHOICES.find((i) => i.name === icon)?.icon ?? Zap, [icon]);

  function reset() {
    setName("");
    setIcon("zap");
    setColor(COLOR_CHOICES[0]);
    setType("duration");
    setUnit("min");
    setTarget("");
  }

  function handleTypeChange(next: TrackingType) {
    setType(next);
    setUnit(UNIT_SUGGESTIONS[next][0]);
  }

  async function handleSave() {
    if (!name.trim() || saving) return;
    setSaving(true);
    const result = await createHabitAction({
      name: name.trim(),
      icon,
      color,
      trackingType: type,
      unit: unit.trim() || "done",
      target: target ? Number(target) : undefined,
    });
    setSaving(false);
    if (!result.ok) return;
    reset();
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-neutral-800 bg-neutral-900 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a new habit</DialogTitle>
          <DialogDescription>Track anything, your way.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* Name */}
          <div className="flex items-center gap-3">
            <span
              className="flex size-11 shrink-0 items-center justify-center rounded-xl"
              style={{ color, backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)` }}
            >
              <SelectedIcon className="size-5" />
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Habit name"
              autoFocus
              className="h-10 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
            />
          </div>

          {/* Icon picker */}
          <Field label="Icon">
            <div className="grid grid-cols-8 gap-1.5">
              {ICON_CHOICES.map(({ name: iconName, icon: Icon }) => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setIcon(iconName)}
                  aria-label={iconName}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg border transition-colors",
                    icon === iconName
                      ? "border-neutral-500 bg-neutral-800 text-neutral-100"
                      : "border-neutral-800 bg-neutral-950 text-neutral-500 hover:text-neutral-300"
                  )}
                >
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
          </Field>

          {/* Color picker */}
          <Field label="Accent color">
            <div className="flex gap-2">
              {COLOR_CHOICES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                  className={cn(
                    "size-7 rounded-full border-2 transition-transform",
                    color === c ? "scale-110 border-white" : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </Field>

          {/* Tracking type */}
          <Field label="Tracking type">
            <div className="grid grid-cols-4 gap-1.5">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleTypeChange(t.value)}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-center transition-colors",
                    type === t.value
                      ? "border-neutral-500 bg-neutral-800"
                      : "border-neutral-800 bg-neutral-950 hover:border-neutral-700"
                  )}
                >
                  <span className={cn("block text-xs font-medium", type === t.value ? "text-neutral-100" : "text-neutral-300")}>
                    {t.label}
                  </span>
                  <span className="block text-[9px] text-neutral-600">{t.hint}</span>
                </button>
              ))}
            </div>
          </Field>

          {/* Unit + target */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Unit">
              {type === "boolean" ? (
                <div className="flex h-10 items-center rounded-lg border border-neutral-800 bg-neutral-950 px-3 text-sm text-neutral-500">
                  done / not done
                </div>
              ) : (
                <input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="min"
                  className="h-10 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
                />
              )}
            </Field>
            <Field label="Daily target (optional)">
              {type === "boolean" ? (
                <div className="flex h-10 items-center rounded-lg border border-neutral-800 bg-neutral-950 px-3 text-sm text-neutral-600">
                  —
                </div>
              ) : (
                <input
                  value={target}
                  onChange={(e) => setTarget(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="e.g. 30"
                  inputMode="decimal"
                  className="h-10 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
                />
              )}
            </Field>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving} className="bg-neutral-100 text-neutral-900 hover:bg-neutral-300">
            {saving ? "Creating…" : "Create habit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </label>
      {children}
    </div>
  );
}
