import { Dumbbell, Footprints, Droplets, GitCommitHorizontal, Ban, BookOpen, Zap, Moon, Heart, PenLine, type LucideIcon } from "lucide-react";

/** Map of icon names we allow for habits. Add more here as needed. */
const ICONS: Record<string, LucideIcon> = {
  dumbbell: Dumbbell,
  footprints: Footprints,
  droplets: Droplets,
  github: GitCommitHorizontal,
  ban: Ban,
  book: BookOpen,
  zap: Zap,
  moon: Moon,
  heart: Heart,
  pen: PenLine,
};

export function HabitIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Zap;
  return <Icon className={className} aria-hidden />;
}
