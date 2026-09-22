import { Dumbbell, Footprints, Droplets, GitCommitHorizontal, Ban, BookOpen, Zap, Moon, Heart, PenLine, Bike, Salad, Cigarette, Music, GraduationCap, Brain, Camera, AtSign, Play, Smartphone, type LucideIcon } from "lucide-react";

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
  bike: Bike,
  salad: Salad,
  cigarette: Cigarette,
  music: Music,
  graduation: GraduationCap,
  brain: Brain,
  instagram: Camera,
  twitter: AtSign,
  youtube: Play,
  smartphone: Smartphone,
};

export function HabitIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Zap;
  return <Icon className={className} aria-hidden />;
}
