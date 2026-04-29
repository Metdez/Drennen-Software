import { addWeeks, format, startOfWeek } from "date-fns";
import type { CapacityWeek, DepartmentCode } from "@/data/types";

export const DEPARTMENT_CODES: DepartmentCode[] = [
  "press",
  "solidsSaw",
  "cnc",
  "glueUp",
  "casegoodsAssy",
  "tableAssy",
  "handSand",
  "finishing",
  "upfit",
  "shipping",
];

export function createEmptyHoursByDept(): Record<DepartmentCode, number> {
  return {
    press: 0,
    solidsSaw: 0,
    cnc: 0,
    glueUp: 0,
    casegoodsAssy: 0,
    tableAssy: 0,
    handSand: 0,
    finishing: 0,
    upfit: 0,
    shipping: 0,
  };
}

const horizonStart = startOfWeek(new Date("2026-04-29T12:00:00"), { weekStartsOn: 1 });

export const mockCapacityWeeks: CapacityWeek[] = Array.from({ length: 12 }, (_, index) => {
  const weekStart = addWeeks(horizonStart, index);

  return {
    weekStart: format(weekStart, "yyyy-MM-dd"),
    weekLabel: format(weekStart, "M/d"),
    scheduledHoursByDept: createEmptyHoursByDept(),
  };
});
