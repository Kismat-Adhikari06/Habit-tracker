"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onClick: () => void;
};

export function NewHabitButton({ onClick }: Props) {
  return (
    <Button
      size="icon"
      onClick={onClick}
      className="fixed right-8 bottom-8 z-50 size-14 rounded-full bg-neutral-100 text-neutral-900 shadow-lg shadow-black/50 transition-transform hover:scale-105"
      aria-label="Create new habit"
    >
      <Plus className="size-6" />
    </Button>
  );
}
