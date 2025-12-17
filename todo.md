
# BillettoStats Dashboard - Comprehensive Development Roadmap

This document outlines the strategic roadmap for elevating the BillettoStats dashboard to a world-class, high-performance application.

## 🏗️ Phase 1: Architecture & State Management (The Foundation)

The current app relies on a monolithic `AppContext` and custom fetching hooks (`useEvents`, etc.). This causes unnecessary re-renders and makes the code difficult to maintain.

- [x] **Migrate Data Fetching to TanStack Query (v5):**
    - [x] **Why:** Replaces manual `useEffect`, `isLoading` state, `RefreshBar` logic, and `idb` cache management with a battle-tested library.
    - [x] **Implementation:**
        - Create query keys: `['events']`, `['event', id, 'details']`, `['orders', { eventId, page }]`.
        - Replace `services/dbService.ts` caching logic with `QueryClient` persistence (using `createAsyncStoragePersister` with IDB).
        - Implement `useInfiniteQuery` for the Orders and Ledger tables to handle pagination seamlessly.
    - [x] **Benefit:** Automatic background refetching, deduping requests, and optimistic updates.

- [x] **Decouple UI State with Zustand:** (Completed)
    - [x] **Store Creation:** Created `stores/uiStore.ts`.
    - [x] **App Integration:** `App.tsx` now consumes the store for Theme, Sidebar, Modals, and Toasts.
    - [x] **Auth Store:** Created `useAuthStore` for `apiKey` and `useProxy`.
    - [ ] **Next Steps:** Fully migrate consumers to use the store directly instead of `AppContext` proxy.

- [x] **Strict Schema Validation (`zod`):**
    - [x] **Action:** Define Zod schemas for all Billetto API responses in `types.ts` (Done in `schemas.ts`).
    - [x] **Integration:** Validate data inside the `queryFn` of TanStack Query (Implemented in `utils/apiHelpers.ts`).
    - [x] **Benefit:** Fail fast with specific error messages ("Expected string, got null in order.payout") rather than silent `NaN` errors in charts.

## 🚀 Phase 2: Performance Engineering (The "Power User" Feel)

- [x] **Off-Main-Thread Computations (Web Workers):**
    - [x] **Target:** `useAudience.ts` and `usePerformance.ts`.
    - [x] **Implementation:** Use `comlink` to move the heavy `reduce`/`map` loops over 10,000+ orders into a `worker.ts`.
    - [x] **Benefit:** The UI remains responsive (scrollable, clickable) while calculating "Lifetime Value" for thousands of customers.

- [x] **Virtualization (`@tanstack/react-virtual`):**
    - [x] **Target:** `OrdersTable`, `AllAttendeesTable`, `LedgerTable`.
    - [x] **Action:** Render only the items currently in the viewport.
    - [x] **Metric:** Support lists of 50,000+ rows without DOM lag.

- [x] **Code Splitting & Lazy Loading:**
    - [x] **Action:** Implement `React.lazy` and `Suspense` for route components (`DashboardView`, `OrdersView`, etc.).
    - [x] **Action:** Lazy load heavy charting libraries (`recharts`, `d3-cloud`) only when the specific view is active. (d3-cloud is isolated in `BookingQuestionsAnalysis`)

## 🎨 Phase 3: Interaction & World-Class UX

- [ ] **Command Palette (⌘K) Upgrade:**
    - [ ] **Library:** Migrate to `cmdk` for a more accessible, composable command menu.
    - [ ] **Features:**
        - "Go to [Event Name]"
        - "Search [Customer Name]"
        - "Theme: Toggle Dark Mode"
        - "Export: CSV"

- [x] **Motion Design (`framer-motion`):**
    - [x] **Layout Animations:** `layoutId` for smooth transitions of cards when switching tabs.
    - [x] **Micro-interactions:** 
        - Animated counters for StatCards (count up from 0).
        - Shake animation on invalid API key entry.
        - "Swoosh" animation when items are added to the cart/list. (Implemented as entry animations)

- [ ] **Advanced Charting Features:**
    - [ ] **Brush & Zoom:** Allow users to select a date range on the `SalesVelocityChart` to zoom in on specific sales spikes.
    - [ ] **Synchronized Tooltips:** Hovering a date on one chart shows a vertical cursor line across all aligned charts.

## 📆 Phase 4: New Feature Sets

- [x] **Calendar View:**
    - [x] **New Route:** `/calendar`.
    - [x] **Visualization:** A full-month calendar view showing when events start/end.
    - [x] **Data:** Overlay daily sales volume as heat-map colors on the calendar days.

- [x] **PDF Reporting:**
    - [x] **Library:** `@react-pdf/renderer`.
    - [x] **Feature:** "Download Executive Report". Generates a branded PDF with the event's top stats, sales velocity chart, and financial summary for stakeholders.

- [x] **Comparison Mode:**
    - [x] **Feature:** Select two events to compare side-by-side.
    - [x] **Metrics:** "Event A sold 15% faster in the first 24h than Event B".

## 🛡️ Phase 5: Reliability & DevOps

- [x] **Unit & Integration Testing (`vitest` + `react-testing-library`):**
    - [x] **Priority 1:** Test `utils/analysis.ts` financial logic (cents math, VAT calculations). (Extracted to `utils/eventProcessing.ts` for better testability).
    - [x] **Priority 2:** Test `BillettoApiClient` error handling (429 Rate Limits).

- [x] **End-to-End Testing (`Playwright`):**
    - [x] **Scenario:** User logs in -> Caches events -> Goes offline -> Can still view Dashboard.

- [x] **Mock Service Worker (`msw`):**
    - [x] Develop against a local mock server to avoid hitting Billetto API rate limits during development. (Handlers created in `mocks/handlers.ts`)

## ♿ Phase 6: Accessibility (a11y)

- [ ] **Audit:** Run Axe DevTools.
- [ ] **Focus Management:** Ensure focus returns to the trigger button when Modals/Dialogs close.
- [ ] **Keyboard Nav:** Ensure all tables can be navigated with arrow keys.
- [ ] **Screen Readers:** Add `aria-live` regions for background task progress updates.
