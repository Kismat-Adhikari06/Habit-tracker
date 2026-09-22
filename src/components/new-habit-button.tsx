"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onClick: () => void;
};

/** Header "add habit" button, sits next to the settings icon. */
export function NewHabitButton({ onClick }: Props) {
  return (
    <Button
      size="icon"
      onClick={onClick}
      className="size-9 rounded-full border border-neutral-800 bg-neutral-900/80 text-neutral-400 transition-colors hover:text-neutral-200"
      aria-label="Create new habit"
      title="Create new habit"
    >
      <Plus className="size-4" />
    </Button>
  );
}