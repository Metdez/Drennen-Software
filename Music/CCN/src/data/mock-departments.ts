import type { Department } from "@/data/types";

export const mockDepartments: Department[] = [
  { code: "press", name: "Press", weeklyClockHours: 200, weeklyAvailableHours: 170 },
  { code: "solidsSaw", name: "Solids/Saw", weeklyClockHours: 80, weeklyAvailableHours: 68 },
  { code: "cnc", name: "CNC", weeklyClockHours: 80, weeklyAvailableHours: 68 },
  { code: "glueUp", name: "Glue-Up/Machining", weeklyClockHours: 120, weeklyAvailableHours: 102 },
  { code: "casegoodsAssy", name: "Casegoods Assy", weeklyClockHours: 264, weeklyAvailableHours: 224 },
  { code: "tableAssy", name: "Table Assy", weeklyClockHours: 240, weeklyAvailableHours: 204 },
  { code: "handSand", name: "Hand Sanding", weeklyClockHours: 80, weeklyAvailableHours: 68 },
  { code: "finishing", name: "Finishing", weeklyClockHours: 200, weeklyAvailableHours: 170 },
  { code: "upfit", name: "Upfit", weeklyClockHours: 68, weeklyAvailableHours: 58 },
  { code: "shipping", name: "Shipping", weeklyClockHours: 120, weeklyAvailableHours: 102 },
];
