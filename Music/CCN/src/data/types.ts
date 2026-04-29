// =====================
// Status flag types
// =====================

export type StatusFlag = "green" | "yellow" | "red" | "on-hold";

export interface ComputedStatus {
  flag: StatusFlag;
  hasHardDate: boolean;
  reason: string;
  contributingFactors: StatusFactor[];
}

export interface StatusFactor {
  kind: "engineering" | "materials" | "capacity" | "hold" | "hard-date";
  severity: "green" | "yellow" | "red";
  detail: string;
}

// =====================
// Department types
// =====================

export type DepartmentCode =
  | "press"
  | "solidsSaw"
  | "cnc"
  | "glueUp"
  | "casegoodsAssy"
  | "tableAssy"
  | "handSand"
  | "finishing"
  | "upfit"
  | "shipping";

export interface Department {
  code: DepartmentCode;
  name: string;
  weeklyClockHours: number;
  weeklyAvailableHours: number;
}

export type ShopLocation =
  | "engineering"
  | "press"
  | "tables"
  | "casegoods"
  | "finish"
  | "ship"
  | "on-hold";

// =====================
// Job types
// =====================

export interface Job {
  jobNumber: string;
  customer: string;
  description: string;
  shipDate: string;
  pressDate: string | null;
  freightType: FreightType;
  netDollar: number;
  balanceDue: number;
  sqft: number | null;
  pieceCount: number;
  currentLocation: ShopLocation;

  // Customer-side
  shipToCity: string;
  shipToState: string;
  customerNotes: string;
  isOnHold: boolean;
  hardDate: string | null;

  // Engineering (from Tim's sheet)
  engineering: EngineeringStatus;

  // Hours by department (from manufacturing schedule)
  hoursByDept: Record<DepartmentCode, number>;

  // Material shortages (from shortage list)
  materials: MaterialItem[];

  // Team assignment (from Anne's work sequence)
  team: string[];
}

export type FreightType =
  | "TL"
  | "common-corral"
  | "cust-pickup"
  | "BH"
  | "vendor-direct"
  | "UPS-ground"
  | "unknown";

export interface EngineeringStatus {
  engineerInitials: string;
  drawingsApprovedDate: string | null;
  partsListIssuedDate: string | null;
  hoursIssued: number;
  hoursActual: number;
  printTicks: PrintTicks;
  status: "not-started" | "in-review" | "released" | "changes-requested";
}

export interface PrintTicks {
  metal: boolean;
  glass: boolean;
  granite: boolean;
  laminate: boolean;
  pressStart: boolean;
  cncStart: boolean;
  anneApproved: boolean;
}

export interface MaterialItem {
  partNumber: string;
  qty: number;
  poNumber: string | null;
  ackNumber: string | null;
  vendor: string;
  vendorDueDate: string | null;
}

// =====================
// Capacity types
// =====================

export interface CapacityWeek {
  weekStart: string;
  weekLabel: string;
  scheduledHoursByDept: Record<DepartmentCode, number>;
}

// =====================
// UI / store types
// =====================

export type FilterChip =
  | "red-only"
  | "yellow-only"
  | "hard-date"
  | "on-hold"
  | "in-press"
  | "in-tables"
  | "in-casegoods"
  | "in-finish";
