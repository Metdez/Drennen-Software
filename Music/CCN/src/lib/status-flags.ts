import { differenceInCalendarDays, format, isAfter, isEqual, parseISO } from "date-fns";
import { mockDepartments } from "@/data/mock-departments";
import type { CapacityWeek, ComputedStatus, DepartmentCode, Job, StatusFactor } from "@/data/types";

const severityRank: Record<StatusFactor["severity"], number> = {
  green: 0,
  yellow: 1,
  red: 2,
};

function daysUntil(date: string | null, today: Date): number | null {
  if (!date) {
    return null;
  }

  return differenceInCalendarDays(parseISO(date), today);
}

function formatShort(isoDate: string): string {
  return format(parseISO(isoDate), "M/d");
}

function fallbackGreenFactor(): StatusFactor {
  return { kind: "engineering", severity: "green", detail: "Engineering released" };
}

function computeEngineeringFactor(job: Job, today: Date): StatusFactor {
  const pressDays = daysUntil(job.pressDate, today);

  if (job.engineering.status === "released" && job.engineering.printTicks.pressStart) {
    return fallbackGreenFactor();
  }

  if (job.engineering.partsListIssuedDate === null && pressDays !== null && pressDays < 14) {
    return {
      kind: "engineering",
      severity: "red",
      detail: `Parts list not issued; press date is ${pressDays} days away`,
    };
  }

  if (job.engineering.status === "in-review" && pressDays !== null && pressDays < 21) {
    return {
      kind: "engineering",
      severity: "yellow",
      detail: "Engineering still in review; press date approaching",
    };
  }

  if (job.engineering.status === "changes-requested") {
    return { kind: "engineering", severity: "red", detail: "Customer changes pending" };
  }

  return {
    kind: "engineering",
    severity: job.engineering.partsListIssuedDate ? "green" : "yellow",
    detail: job.engineering.partsListIssuedDate ? "Engineering released" : "Parts list has not been issued",
  };
}

function computeMaterialFactor(job: Job, today: Date): StatusFactor | null {
  if (job.materials.length === 0) {
    return { kind: "materials", severity: "green", detail: "No material shortages listed" };
  }

  const pressDate = job.pressDate;
  if (!pressDate) {
    return { kind: "materials", severity: "yellow", detail: "Material risk cannot be dated without a press date" };
  }

  return job.materials
    .map<StatusFactor>((item) => {
      const pressDays = daysUntil(pressDate, today);

      if (item.vendorDueDate === null && pressDays !== null && pressDays < 21) {
        return {
          kind: "materials",
          severity: "red",
          detail: `${item.partNumber}: no PO acknowledgment`,
        };
      }

      if (item.vendorDueDate === null) {
        return {
          kind: "materials",
          severity: "yellow",
          detail: `${item.partNumber}: no vendor due date`,
        };
      }

      const dueDate = parseISO(item.vendorDueDate);
      const parsedPressDate = parseISO(pressDate);
      const slackDays = differenceInCalendarDays(parsedPressDate, dueDate);

      if (isAfter(dueDate, parsedPressDate) || isEqual(dueDate, parsedPressDate)) {
        return {
          kind: "materials",
          severity: "red",
          detail: `${item.partNumber}: vendor due ${formatShort(item.vendorDueDate)} after press date ${formatShort(pressDate)}`,
        };
      }

      if (slackDays < 5) {
        return {
          kind: "materials",
          severity: "yellow",
          detail: `${item.partNumber}: tight (${slackDays} days slack)`,
        };
      }

      return {
        kind: "materials",
        severity: "green",
        detail: `${item.partNumber}: due ${formatShort(item.vendorDueDate)}, before press date`,
      };
    })
    .sort((a, b) => severityRank[b.severity] - severityRank[a.severity])[0];
}

function findCapacityWeek(pressDate: string | null, capacity: CapacityWeek[]): CapacityWeek | null {
  if (!pressDate) {
    return null;
  }

  const press = parseISO(pressDate);

  return (
    capacity.find((week) => {
      const start = parseISO(week.weekStart);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return press >= start && press <= end;
    }) ?? null
  );
}

function computeCapacityFactor(job: Job, capacity: CapacityWeek[]): StatusFactor | null {
  const capacityWeek = findCapacityWeek(job.pressDate, capacity);

  if (!capacityWeek) {
    return null;
  }

  const touchedDeptCodes = Object.entries(job.hoursByDept)
    .filter(([, hours]) => hours > 0)
    .map(([dept]) => dept as DepartmentCode);

  const factors = touchedDeptCodes.map<StatusFactor>((deptCode) => {
    const dept = mockDepartments.find((candidate) => candidate.code === deptCode);
    const available = dept?.weeklyAvailableHours ?? 0;
    const utilization = available === 0 ? 0 : capacityWeek.scheduledHoursByDept[deptCode] / available;
    const deptName = dept?.name ?? deptCode;
    const percent = (utilization * 100).toFixed(0);

    if (utilization > 1.05) {
      return {
        kind: "capacity",
        severity: "red",
        detail: `${deptName} is ${percent}% capacity in week of ${capacityWeek.weekLabel}`,
      };
    }

    if (utilization > 0.95) {
      return {
        kind: "capacity",
        severity: "yellow",
        detail: `${deptName} is ${percent}% capacity in week of ${capacityWeek.weekLabel}`,
      };
    }

    return {
      kind: "capacity",
      severity: "green",
      detail: `${deptName} is ${percent}% capacity in week of ${capacityWeek.weekLabel}`,
    };
  });

  return factors.sort((a, b) => severityRank[b.severity] - severityRank[a.severity])[0] ?? null;
}

function reasonForFactor(factor: StatusFactor): string {
  return factor.detail.endsWith(".") ? factor.detail : `${factor.detail}.`;
}

export function computeStatusFlag(job: Job, today: Date, capacity: CapacityWeek[]): ComputedStatus {
  if (job.isOnHold) {
    return {
      flag: "on-hold",
      hasHardDate: job.hardDate !== null,
      reason: "Job is on hold in Lori's schedule.",
      contributingFactors: [{ kind: "hold", severity: "red", detail: job.customerNotes || "Job is on hold" }],
    };
  }

  const factors = [
    computeEngineeringFactor(job, today),
    computeMaterialFactor(job, today),
    computeCapacityFactor(job, capacity),
  ].filter((factor): factor is StatusFactor => factor !== null);

  const worstFactor = factors.sort((a, b) => severityRank[b.severity] - severityRank[a.severity])[0] ?? fallbackGreenFactor();

  return {
    flag: worstFactor.severity,
    hasHardDate: job.hardDate !== null,
    reason: reasonForFactor(worstFactor),
    contributingFactors: factors.length > 0 ? factors : [fallbackGreenFactor()],
  };
}
