# CST Logistics V2 — Linear Workspace Design
**Date:** 2026-03-25
**Status:** Approved
**Model:** Option A — Single Project, State-Driven Pipeline

---

## Overview

A professional software agency workspace for building CST Logistics V2. Designed around a client-to-dev pipeline where the client (CST) has a guest login, submits requests directly into Linear, and the dev team owns all triage, scoping, and execution. Hour tracking is built in per issue.

---

## Workflow States

All issues flow through these states in order. States marked (MANUAL) must be added in Linear Settings → Teams → Licom → Workflow.

| State | Type | Who Owns It | Description |
|---|---|---|---|
| 📥 Client Request | Unstarted | Client | Client creates issues here. Raw input, no technical detail required. |
| 🔍 Triage | Unstarted | Dev Team | Dev reviews, adds technical notes, sets estimate in hours, sets priority. Asks clarifying questions via comments. |
| 📋 Backlog | Unstarted | Dev Team | Approved, scoped, estimated. Ready to pull into a sprint. |
| 🏃 In Progress | Started | Dev Team | Actively being built. |
| 👀 In Review | Started | Dev Team | PR open, code review in progress. |
| 🧪 QA | Started | Dev Team | Testing and verification. |
| ✅ Done | Completed | Dev Team | Shipped. |
| 🚫 Blocked | Started | Dev Team | Waiting on external dependency. Tagged so nothing quietly dies. |

### States Requiring Manual Setup
The following states do not exist in Linear by default and must be created manually:
- **Client Request** (type: unstarted) — position: first
- **Triage** (type: unstarted) — position: second
- **QA** (type: started) — position: between In Review and Done
- **Blocked** (type: started) — position: after In Progress

---

## Hour Tracking

### Planned Hours (Estimate Field)
- Linear's built-in Estimate field, configured to **hours** (not story points)
- Set during Triage by the dev team
- Represents planned/budgeted time for the issue
- To configure: Linear Settings → Teams → Licom → Estimates → select "Hours"

### Actual Hours (Comment Convention)
- When work is completed or paused on an issue, drop a comment:
  ```
  ⏱ 3.5h — implemented fuel surcharge logic and wrote migration
  ```
- At sprint end, sum actual hours per issue to compare against estimates
- Builds scoping intuition over time and feeds future fixed-price quotes
- Future upgrade path: integrate Toggl or Harvest once volume justifies it

---

## Labels

### New Labels (to be created)
| Label | Color | Purpose |
|---|---|---|
| `client-request` | #F2994A (orange) | Issue originated from the client |
| `internal` | #95A2B3 (gray) | Team-generated: refactor, tech debt, infra |
| `needs-clarification` | #F2C94C (yellow) | Blocked in Triage waiting on client answer |
| `quick-win` | #27AE60 (green) | Under 2h estimated, high value — pull first |
| `high-value` | #9B51E0 (purple) | Major business impact |

### Existing Labels (carry forward from V1)
`Feature`, `Bug`, `chore`, `docs`, `blocked`

---

## Project Structure

### Project
**Name:** CST Logistics V2
**Team:** Licom
**Lead:** zack hanna

### Epics (Parent Issues)
Six parent issues group all V2 work. Child issues are created under epics as work is identified.

| # | Epic | Description |
|---|---|---|
| 1 | Client Portal | Self-service rate lookup, invoice history, request submission |
| 2 | Driver Mobile Experience | Mobile-optimized dispatch, green sheets, push notifications |
| 3 | Automated Billing & Invoicing | Generate invoices from settlements, send to customers |
| 4 | Analytics & Reporting | Admin dashboard, per-customer/driver reporting, trend views |
| 5 | Integration Hub | RXO, NTG, Hub Group API connections |
| 6 | Notifications & Alerts | Driver alerts, admin flags, settlement reminders |

### Client Onboarding Issue
A pinned "📌 READ FIRST — How to Submit a Request" issue in the Client Request state that guides CST on how to write good requests:
- Clear title: what you want, not how to build it
- Description: why it matters, who it affects
- Any deadline or business context
- Screenshots or examples if relevant

---

## Client Guest Access

The client (CST) gets a Linear guest account with access to the CST Logistics V2 project. Their experience:
- **Can see:** Issues they created + status + dev team comments
- **Can do:** Create new issues in Client Request state, add comments to their issues
- **Cannot do:** Move issues between states, see internal team-only notes, access other projects

Best practice: Keep internal architecture discussions in sub-issues or private notes. Client-facing communication goes in the main issue comments.

---

## Rules of Engagement

1. **Client creates in Client Request only.** Dev team owns all state transitions.
2. **Nothing leaves Triage without an estimate.** No unscoped work enters the backlog.
3. **Blocked issues get unblocked or cancelled within 1 week.** No silent graveyards.
4. **Log actual hours when you finish a task.** One comment, takes 10 seconds.
5. **Weekly sync over the board.** Not email chains — walk through the board together.
