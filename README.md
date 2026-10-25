# RailOps AI — Intelligent Block Planning & Asset Availability System

> **AI-Powered Automatic Block Planning to Maximize Asset Availability for Train Operations on Indian Railways.**

---

## 🚆 Overview

**RailOps AI** is a decision-support and automatic block scheduling platform engineered specifically for the operational complexities of Indian Railways. It solves the critical bottleneck of coordinating high-density passenger and freight train operations with essential railway infrastructure maintenance across Track (`TMS`), Signalling (`SMMS`), and Traction/OHE (`TDMS`).

Rather than relying on manual disconnections or static heuristic spreadsheets, RailOps AI uses **interval arithmetic, multi-criteria constraint optimization, and human-in-the-loop validation** to carve out safe, conflict-free maintenance windows while strictly preserving passenger and freight train punctuality.

---

## ⚡ Core Architectural Capabilities

### 1. Operational Priority Hierarchy
RailOps AI enforces a strict operational hierarchy across all scheduling decisions:
$$\text{Passenger Express Trains (Priority 1)} > \text{Freight Movements (Priority 2)} > \text{Committed Maintenance Blocks (Priority 3)} > \text{New Maintenance Allocations (Priority 4)}$$
- **Timetable Protection**: Passenger and freight train movements are protected operational envelopes, not maintenance conflicts.
- **$\pm 20$-Minute Safety Buffer**: A configurable safety buffer (`SAFETY_BUFFER_MINUTES = 20`) is strictly enforced around train movements and maintenance possessions to eliminate track fouling and head-on risks.
- **Future-Only Allocations**: Candidate start times must satisfy $\text{start} \ge \text{now} + 20\text{ min}$.

### 2. Dynamic Interval Candidate Window Generator
- Employs interval arithmetic (`subtractInterval`) in `backend/engine/windowGenerator.js` to subtract passenger envelopes, freight paths, committed possessions, and corridor peak banks from the 24-hour timeline.
- Evaluates **all 5 major trunk corridors dynamically**:
  - **`COR-01`**: Delhi – Mumbai (1,384 km)
  - **`COR-02`**: Delhi – Howrah (1,441 km)
  - **`COR-03`**: Mumbai – Chennai (1,279 km)
  - **`COR-04`**: Howrah – Chennai (1,659 km)
  - **`COR-05`**: Delhi – Chennai (2,175 km)

### 3. Multi-Department Bundling & Partial Execution
- **Multi-Department Consolidation**: Consolidates Track, Signalling, and Traction maintenance requested in the same physical work zone into a single coordinated corridor possession.
- **Shared Protection Setup**: Saves 20–30 minutes per consolidated department, recovering up to 5 hours of unnecessary corridor closure.
- **Splittable Tasks (`isSplittable: true`)**: If required work is 4h but the available safe window is only 3h, the engine allocates 3h and carries forward the remaining 1h. Non-splittable tasks exceeding window capacity are rejected with explainable reasons.

### 4. Recommendation Lifecycle & Pre-Commit Validation (`validateBeforeCommit`)
- AI recommendations follow a 6-state lifecycle: `PROPOSED` $\rightarrow$ `ACCEPTED` $\rightarrow$ `SCHEDULED` | `REJECTED` | `EXPIRED` | `SUPERSEDED`.
- **Pre-Commit Safety Gate**: Clicking **ACCEPT** executes real-time pre-commit validation against the live database:
  - **If Valid**: Commits the block to the live schedule, updates defect states, and records an audit log.
  - **If Stale / Invalid**: Rejects commit, marks `SUPERSEDED`, triggers auto-replanning across all 5 corridors, and presents the next safe alternative.

### 5. Conflict Resolution → What-If Simulation → Re-Optimization
- Connects Dashboard Active Conflicts and the Operational Conflict Modal directly into a **Conflict Resolution Mode** in the What-If simulation.
- **Before vs After Comparison**: Evaluates real baseline metrics against the re-optimized plan (Asset Availability, Cumulative Delay, Impacted Trains, Active Conflicts).
- **Dual Operator Actions**:
  - **`✓ APPLY RE-OPTIMIZED PLAN`**: Triggers fresh pre-commit validation, commits the rescheduled possession, and dynamically recalculates active conflicts via `detectConflictMatrix`.
  - **`✕ KEEP CURRENT PLAN`**: Exits the simulation without modifying the schedule or faking resolution; preserves the conflict.

### 6. Clean 3-Layer Visual Timeline
- Maintains 3 visually separate operational layers on the Dashboard:
  1. **Maintenance Block Timeline**: UP / DN Main possessions with live status badges.
  2. **Passenger / Express Movement Schedule**: Cyan-themed protected timetable services (Priority 1).
  3. **Goods / Freight Movement Schedule**: Amber-themed dedicated freight rakes (Priority 2).
- Zero false red conflict icons on trains.

---

## 🛠 Tech Stack

- **Frontend**: React 18, Vite 5, Tailwind CSS, React Router, Context API, Lucide Icons
- **Backend**: Node.js, Express.js, MongoDB (Mongoose)
- **Engines**: Custom constraint solver, interval arithmetic window generator, multi-criteria window scorer, multi-department block bundler, disruption re-optimizer

---

## 🚀 Quickstart & Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: v6.0 or higher running locally on `mongodb://127.0.0.1:27017/railops_ai`

### 1. Clone the Repository
```bash
git clone https://github.com/PiyushKadam2006/RailOps-ai.git
cd RailOps-ai
```

### 2. Backend Setup & Seeding
```bash
cd backend
npm install

# Seed the controlled deterministic dataset for Sep 4 & 5, 2026
node seed/seed.js

# Start backend server (runs on port 5000)
npm run dev
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install

# Start frontend dev server (runs on port 5173)
npm run dev
```

### 4. Access the Application
Open your browser and navigate to:
```
http://localhost:5173
```

---

## 🧪 Automated Test Suites

The platform includes automated, deterministic test suites verifying all scheduling rules, constraint boundaries, and conflict resolution flows:

### Run Scheduler & Constraint Regression Suite (15 Tests)
```bash
cd backend
node test/scheduler.test.js
```
**Expected Output**: `TEST SUMMARY: 15 PASSED, 0 FAILED (TOTAL 15 TESTS)`

| Test # | Scenario Verified |
|---|---|
| **1** | Passenger train overlaps candidate $\rightarrow$ Candidate rejected |
| **2** | Freight train overlaps candidate $\rightarrow$ Candidate rejected |
| **3** | Existing maintenance overlaps candidate $\rightarrow$ Candidate rejected |
| **4** | 3 compatible departments fit in work zone $\rightarrow$ One coordinated block (5.5h saved) |
| **5** | 4h splittable task in 3h window $\rightarrow$ 3h allocated + 1h carried forward |
| **6** | 4h non-splittable task in 3h window $\rightarrow$ Candidate rejected (`INSUFFICIENT_DURATION`) |
| **7** | Candidate window is in the past $\rightarrow$ Rejected (`PAST_OR_IMMEDIATE_START`) |
| **8** | Candidate window violates 20m safety buffer $\rightarrow$ Rejected (`PAST_OR_IMMEDIATE_START`) |
| **9** | Operator accepts valid recommendation $\rightarrow$ Pre-commit validated and scheduled |
| **10** | Operator accepts stale recommendation $\rightarrow$ Refuses commit; marks `SUPERSEDED` and replans |
| **11** | Operator rejects recommendation $\rightarrow$ Marked `REJECTED` and saved to audit ledger |
| **12** | Recommendation expires $\rightarrow$ Marked `EXPIRED` in database |
| **13** | Optimizer searches all 5 corridors dynamically $\rightarrow$ Not hardcoded to single corridor |
| **14** | Two compatible requests across departments $\rightarrow$ Merged with shared protection benefits |
| **15** | Two requests on different corridors $\rightarrow$ Strictly isolated by corridor boundaries |

### Run Conflict Resolution & Re-Optimization Suite (5 Tests)
```bash
cd backend
node test/conflict_resolution.test.js
```
**Expected Output**: `ALL CONFLICT RESOLUTION & RE-OPTIMIZATION CHECKS PASSED!`
- **Check 1**: Initial active conflict detection on `COR-03` (`BLK-CONF-01` vs `BLK-CONF-02`).
- **Check 2**: Non-destructive What-If simulation with Before vs After metrics.
- **Check 3**: Pre-commit validation rejects stale/colliding windows (`HTTP 409 STALE`).
- **Check 4**: Valid operator apply reschedules possession and updates database.
- **Check 5**: Dynamic recalculation directly from MongoDB verifies 0 remaining active conflicts.

---

## 📊 End-to-End Operator Workflow

```
DASHBOARD (1 Active Conflict: BLK-CONF-01 vs BLK-CONF-02 on COR-03)
    │
    ▼ [Click "RESOLVE CONFLICT" or "View Alternatives in What-If Sim"]
WHAT-IF SIMULATION (Conflict Resolution Mode)
    │
    ▼ [Inspect Before vs After: Availability 88% ➔ 92.6%, Delay 3.3h ➔ 1.1h]
OPERATOR DECISION
    ├─► [KEEP CURRENT PLAN] ──► Preserves schedule and active conflict untouched
    │
    ▼ [APPLY RE-OPTIMIZED PLAN]
PRE-COMMIT VALIDATION (validateBeforeCommit)
    │
    ├─► [VALID] ──► Commits to DB ──► Recalculates Conflicts (1 ➔ 0) ──► Updates Dashboard
    │
    └─► [STALE] ──► Refuses Commit ──► Auto-Replans Next Safe Slot ──► Notifies Operator
```

---


