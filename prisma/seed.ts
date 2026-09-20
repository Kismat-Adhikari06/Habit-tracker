import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SAMPLE_HABITS = [
  { name: "Workout", icon: "dumbbell", color: "#f97316", unit: "min", trackingType: "duration", target: 45 },
  { name: "Running", icon: "footprints", color: "#22c55e", unit: "km", trackingType: "distance", target: 5 },
  { name: "Water", icon: "droplets", color: "#38bdf8", unit: "L", trackingType: "quantity", target: 3 },
  { name: "GitHub Activity", icon: "github", color: "#a78bfa", unit: "contributions", trackingType: "quantity", target: 5 },
  { name: "No Scrolling", icon: "ban", color: "#f43f5e", unit: "done", trackingType: "boolean", target: null },
];

async function main() {
  await prisma.timerSession.deleteMany();
  await prisma.activityEntry.deleteMany();
  await prisma.habit.deleteMany();

  for (const h of SAMPLE_HABITS) {
    await prisma.habit.create({ data: h });
    console.log(`Created habit: ${h.name}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
