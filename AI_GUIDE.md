# AI Reference Guide: BillettoStats Dashboard

This document is a quick-reference guide for me, the AI, to understand the core architecture, data flow, and important logic of the BillettoStats application. Adhering to these principles is crucial for maintaining application integrity.

## 1. Core Architecture & Data Flow

- **Tech Stack**: React, TypeScript, Tailwind CSS, Recharts (for charts), `idb` (for IndexedDB caching).
- **Authentication**: A single `Api-Keypair` string is provided by the user and stored in `localStorage`. It's used to instantiate the `BillettoApiClient`.
- **Data Fetching**: All API calls are handled by `services/billettoService.ts`. This client includes logic for a **mandatory CORS proxy**, headers, and error handling.
- **State Management**: Primarily through local component state (`useState`) and custom React Hooks (`hooks/`). There is no global state manager like Redux. View-specific state is encapsulated within its corresponding hook (e.g., `useEvents`, `useOrders`).
- **Caching Strategy**: The application uses a **cache-first** approach. Data is always requested from IndexedDB (`services/dbService.ts`) before making a network call. This is fundamental to the app's performance and offline capabilities.

## 2. Critical Business Logic (Calculated in App)

The API provides raw data. The application performs several key calculations. **This logic is NOT available from the API directly.**

-   #### **Financial Summary (The Source of Truth)**
    -   **Location**: `hooks/useEvents.ts`
    -   **Source Data**: **Always** use the `LedgerEntry` list for an event. Do not use `Order.payout` or other fields as they can be incomplete.
    -   **`Gross Revenue`**: Sum of `amount` from all `LedgerEntry` items where `type` is `charge`.
    -   **`Billetto Fees`**: Sum of `amount` from all `LedgerEntry` items where `type` is `fee` (this is a negative value).
    -   **`Net Payout`**: Sum of all ledger entries (`charge`, `fee`, `refund`, `adjustment`). If `payout` entries exist, their sum is used as the definitive paid-out amount.

-   #### **Ticket Type Metrics (`sold_count`, `state`, `revenue`)**
    -   **Location**: `hooks/useEvents.ts`
    -   **Source Data**: The `/ticket_types` endpoint provides the capacity (`quantity`) and price, but **NOT** the number of tickets sold.
    -   **Logic**: The `sold_count` for each ticket type is calculated by iterating through **all** of an event's `Order` objects and summing the `quantity` from each `OrderLine` that matches the ticket type's name. The `state` ('On Sale', 'Sold Out') and total `revenue` are then derived from this calculated `sold_count`.

-   #### **Chart Data (Sales Velocity, Sales Channels)**
    -   **Location**: `hooks/useEvents.ts`
    -   **Source Data**: The `allOrders` array, fetched for a selected event.
    -   **Logic**: Data is aggregated and transformed by grouping orders by `created_at` (for velocity) or `sales_channel` (for the pie chart).

-   #### **Booking Questions Analysis**
    -   **Location**: `utils/analysis.ts`
    -   **Logic**: The app determines if a question is `multiple-choice` or `open-ended` using a heuristic (number of unique answers > 15). It also generates `WordCloudData` for open-ended questions by counting word frequencies.

## 3. Guiding Principles & Core Directives

-   #### **No AI/Gemini Implementation**
    -   This is a data visualization and analysis tool. **Do not add any features that use generative AI models like Gemini** for summaries, insights, or other content generation. The focus must remain on presenting the factual data from the Billetto API.

-   #### **Efficient API Usage: Prioritize Bulk Data Fetching**
    -   To minimize API calls and avoid rate limiting, fetch data in bulk whenever possible. Avoid making many small, sequential requests.
    -   **Example**: The `useEvents` hook uses `Promise.all` to fetch all necessary related data (attendees, orders, ledger entries) concurrently when an event is selected.
    -   **Utility**: The `utils/apiHelpers.ts` file provides a `fetchAllPaginatedData` function to handle fetching all items from a paginated endpoint efficiently. This is the preferred method for getting complete datasets.

-   #### **Verify, Don't Assume: Ask for Clarification**
    -   **Do not make assumptions about the API.** All implementation details must be derived *exclusively* from the `Billetto API Docs.pdf` file provided or the existing implementation in `services/billettoService.ts`.
    -   If a feature request requires information not explicitly covered in the provided documentation or existing code (e.g., a new endpoint, a different parameter, an undocumented data field), **you must ask for more information or clarification**. Do not invent endpoints or guess at data structures.

## 4. API Limitations & Development Pitfalls

-   #### **No Attendee-to-TicketType Link**
    -   This is the most critical API limitation. It is **impossible** to determine which `TicketType` an `Attendee` purchased from the attendee object itself.
    -   **Consequence**: Filtering attendees by ticket type is not possible. When analyzing booking questions with a ticket type filter, only **order-scoped** questions can be reliably analyzed.

-   #### **Monetary Values are in Cents**
    -   Every financial field from the API (`price`, `fee`, `amount`, etc.) is an **integer in cents**.
    -   **Action**: **ALWAYS** divide by 100 before displaying any currency value to the user.

-   #### **CORS Proxy is Mandatory**
    -   All API requests from the browser **must** go through the proxy (`https://yogamela.org/billetto-proxy.php?url=`). The `BillettoApiClient` handles this, but it's a critical piece of infrastructure.

-   #### **React Version & Library Compatibility**
    -   The application uses a modern version of React. **Do not downgrade React**.
    -   Certain third-party libraries, specifically `react-wordcloud`, have been found to be incompatible and cause application crashes. **Do not re-introduce `react-wordcloud` or similar incompatible libraries.** The current word cloud implementation in `components/BookingQuestionsAnalysis.tsx` uses `d3-cloud` directly and is the stable, preferred solution.

-   #### **API Response Inconsistencies**
    -   The Billetto API can return data in slightly different formats. The application must be written defensively to handle these variations.
    -   **Campaign Object**: The `Campaign` object has a complex, nested structure. Older documentation suggested a flat structure, but real-world API responses show that properties like discount values and usage limits are nested inside `effects` and `conditions` list objects. The application code in `hooks/useCampaigns.ts` correctly processes this nested structure into a flat `ProcessedCampaign` object for display.
    -   **BookingQuestionResponse Object**: This object is significantly richer than the official documentation suggests.
        -   **Response Text**: The text of a user's answer is primarily found in the `answer` field. However, older API versions or cached data might use a `text` field. The application logic **must** check for `answer` first, then fall back to `text` (e.g., `response.answer || response.text`).
        -   **Question Identifier**: The `question` field can appear in two forms:
            1.  A simple **string** containing the name of the question (e.g., `"Age"`). This is the common case in non-expanded responses.
            2.  A full **object** of type `BookingQuestion` when the resource is requested with `expand=...question`.
            -   The application logic **must** handle both cases by checking `typeof response.question`.
        -   **Additional Fields**: The response object also contains useful metadata not found in base documentation, such as `description`, `required`, `created_at` (for the question), and `updated_at` (for the response). The application's type definitions (`types.ts`) correctly model these fields.


## 5. Hooks and Their Roles

-   **`useEvents.ts`**: The most complex hook. It manages the main dashboard view. It fetches the list of all events and, for the `selectedEventId`, orchestrates fetching all related data (attendees, orders, ticket groups, ledger) to perform the calculations mentioned in section 2.
-   **`useSortableData.ts`**: A generic hook for table sorting. It correctly handles nested data paths (e.g., `'event.name'`).
-   **Other hooks (`useOrders`, `useLedger`, etc.)**: These are simpler and map one-to-one with the main application views. They handle fetching, caching, pagination, and sorting for their specific data type.