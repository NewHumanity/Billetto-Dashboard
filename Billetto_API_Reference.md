# Billetto API v3 Definitive Guide

A definitive, developer-centric guide to the Billetto Organiser API v3, synthesized from official documentation and tailored for the specific implementation details and business logic of the BillettoStats dashboard application.

## Table of Contents
1. [Data Model Relationships](#data-model-relationships)
2. [Application-Specific Logic & Calculations](#application-specific-logic--calculations)
3. [Best Practices & Pitfalls](#best-practices--pitfalls)
4. [API Basics](#api-basics)
5. [Common Concepts](#common-concepts)
6. [Core Resources & Endpoints](#core-resources--endpoints)
    - [Events](#events)
    - [Orders](#orders)
    - [Attendees](#attendees)
    - [Ledger Entries](#ledger-entries-financials)
    - [Ticket Types](#ticket-types-product-types)
    - [Campaigns](#campaigns)
    - [Target Groups](#target-groups)
    - [Booking Questions](#booking-questions)

---

## Data Model Relationships

This diagram shows how the main API objects relate to each other.

```plaintext
              [Event] 1..*
                 |
                 |
      +----------+----------+
      |                     |
  [Order] 1..*          [TicketType] 1..*
      |                     |
      |                     +---- (Used to calculate Gross Revenue)
      |
+-----+------+
|            |
[Attendee] 1..* [OrderLine] 1..*
|            |
|            +---- (Contains ticket name and price)
|
+--- [BookingQuestionResponse] * (can be on Attendee or Order)
           |
           +---- [BookingQuestion] 1
```

- An **Event** can have many **Orders** and many **TicketTypes**.
- An **Order** has one **Event** and contains one or more **OrderLines** (the purchased items) and **Attendees**.
- An **Attendee** belongs to one **Order**.
- **Booking Question Responses** can be attached to either an **Order** (asked once) or an **Attendee** (asked for each ticket). They reference a **Booking Question**.

---

## Application-Specific Logic & Calculations

This section explains how key dashboard metrics are derived from raw API data. This logic lives within the application and is not available directly from the API.

- **Financial Summary (Gross Revenue, Fees, Net Payout)**
    - This data is derived from the event's `LedgerEntry` list, which provides the most accurate financial source of truth.
    - `Gross Revenue`: The sum of `amount` from all `LedgerEntry` items where `type` is `charge`. This represents the total money paid by customers.
    - `Billetto Fees`: The sum of `amount` from all `LedgerEntry` items where `type` is `fee`. This value is negative. The dashboard displays its absolute value.
    - `Net Payout`: The sum of `Gross Revenue` and all negative entries (like `fee` and `refund`). It reflects the final amount transferred to the organizer. It can also be verified against `payout` type ledger entries.

- **Sales Velocity Chart**
    - Fetches all `Order` objects for an event.
    - Groups orders by their `created_at` date.
    - For each date, it sums the `quantity` from all `order_lines` within the orders for that day.
    - The result is a list of `{ date, tickets }` objects.

- **Sales Channel Chart**
    - Fetches all `Order` objects for an event.
    - Groups orders by the `sales_channel` field.
    - Counts the number of orders in each group.

- **Booking Questions Analysis (Type Detection)**
    - The API doesn't specify if a question is multiple-choice or open-ended.
    - The application uses a heuristic: if a question has more than 15 unique answers OR the number of total responses is low relative to the number of unique answers, it's treated as `open-ended`. Otherwise, it's `multiple-choice`.

---

## Best Practices & Pitfalls

Critical "must-know" information before you start developing.

- **CORS Proxy is Mandatory**: All API requests from a browser environment **must** be sent through a CORS proxy. This application is configured to use `https://corsproxy.io/?`. Forgetting this will result in failed requests.

- **Monetary Values are in Cents**: Every financial field in the API (`price`, `fee`, `payout`, `amount`, etc.) is an `integer` representing the value in the smallest currency unit (cents). You **must** divide by 100 before displaying these values to the user.

- **Use `expand` Wisely**: The `expand` parameter is powerful but can increase response times. Only expand the resources you need.

- **Cache-First Strategy**: The application uses IndexedDB to cache API responses. The hooks (`useEvents`, `useOrders`, etc.) are designed to pull from this cache first before making a network request. This improves performance and provides offline capabilities.

- **Data Model Limitations**:
    - **Attendee to Ticket Type**: The API does **not** provide a direct link from an `Attendee` resource to the specific `TicketType` they purchased. This is a critical limitation.

---

## API Basics

- **Base URL:** `https://billetto.dk/api/v3/organiser`
- **Authentication:** Use an `Api-Keypair` header for all requests.
  - **Format:** `Api-Keypair: YourAPIKey:YourAPISecret`
- **Rate Limiting:** The API is rate-limited. If you receive an HTTP `429 Too Many Requests` status, check the `Retry-After` header for the number of milliseconds to wait.

### Error Handling

The API uses standard HTTP status codes for errors. The `billettoService.ts` client wraps these into a `BillettoApiError`.

- `401 Unauthorized`: Invalid `Api-Keypair`.
- `404 Not Found`: The requested resource does not exist.
- `429 Too Many Requests`: Rate limit exceeded.
- `400 Bad Request` / `422 Unprocessable Entity`: Invalid parameters in the request.

#### Example Error Response (`401`)
```json
{
  "error": {
    "message": "You are not authorized to perform this request.",
    "type": "authentication_error"
  }
}
```
---

## Common Concepts

### Pagination

List endpoints use cursor-based pagination and are wrapped in a `list` object.

- **Key Fields:**
  - `data` (array): The array of resource objects for the current page.
  - `has_more` (boolean): `true` if more pages are available.
  - `total` (integer): The total number of items across all pages.
- **Query Parameters:** Use `page` (e.g., `?page=2`) and `per_page` (e.g., `?per_page=50`) to navigate.

### Expanding Resources

Include related objects in a response using the `expand` query parameter.

- **For lists:** Prefix with `data.`. Example: `?expand=data.event`
- **For single items:** No prefix needed. Example: `?expand=event`
- **Multiple:** Separate with commas. Example: `?expand=data.event,data.order_lines`

---

## Core Resources & Endpoints

### Events

- **List Events:** `GET /events`
- **Get Single Event:** `GET /events/{event_id}`

#### Key Query Parameters for `GET /events`
- `sort`: Sort order. Use `-` for descending. Example: `?sort=-starts_at`
- `state`: Filter by event state. Example: `?state=published`
- `name`: Filter by event name (prefix match).

#### Event Object

| Field          | Type     | Description                                                                    |
| :------------- | :------- | :----------------------------------------------------------------------------- |
| `id`           | `string` | The unique event identifier.                                                   |
| `name`         | `string` | The name of the event.                                                         |
| `state`        | `string` | **Values:** `canceled`, `completed`, `deleted`, `draft`, `published`, `publishing` |
| `starts_at`    | `datetime` | The start date and time of the event (UTC).                                    |
| `currency`     | `string` | ISO 4217 currency code (e.g., "SEK").                                          |
| `public_url`   | `string` | The public URL for the event page.                                             |
| `availability` | `object` | Contains `available` (int) and `status` ('sold_out', 'low', 'medium', 'high'). |

#### Example Response: `GET /events/{event_id}`

<details>
<summary>Click to view JSON</summary>

```json
{
  "id": "evt_12345",
  "object": "event",
  "name": "Summer Tech Conference 2024",
  "currency": "USD",
  "state": "published",
  "public": true,
  "starts_at": "2024-08-15T09:00:00.000Z",
  "ends_at": "2024-08-16T17:00:00.000Z",
  "public_url": "https://billetto.dk/e/summer-tech-conference-2024",
  "availability": {
    "available": 150,
    "status": "medium"
  }
}
```

</details>

### Orders

- **List Orders:** `GET /orders`
- **Get Single Order:** `GET /orders/{order_id}`

#### Key Query Parameters for `GET /orders`
- `event`: Filter by a specific event ID. Example: `?event={event_id}`
- `sort`: Sort order. Example: `?sort=-created_at`
- `expand`: `data.event`, `data.order_lines`, `data.booking_question_responses`

#### Order Object

| Field                        | Type     | Description                                                                   |
| :--------------------------- | :------- | :---------------------------------------------------------------------------- |
| `id`                         | `string` | The unique order identifier.                                                  |
| `buyer_name`                 | `string` | Full name of the buyer.                                                       |
| `email`                      | `string` | Email address of the buyer.                                                   |
| `created_at`                 | `datetime` | Timestamp of when the order was created.                                      |
| `event`                      | `object` | The related Event object. **(expandable)**                                    |
| `order_lines`                | `list`   | A list of OrderLine objects. **(expandable)**                                 |
| `subtotal`                   | `integer`| The order total before fees, **in cents**.                                      |
| `payout`                     | `integer`| The final amount to be paid out, **in cents**.                                |
| `currency`                   | `string` | ISO 4217 currency code.                                                       |
| `booking_question_responses` | `list`   | A list of BookingQuestionResponse objects. **(expandable)**                   |

#### Example Response: `GET /orders/{order_id}`

<details>
<summary>Click to view JSON</summary>

```json
{
  "id": "ord_67890",
  "object": "order",
  "email": "jane.doe@example.com",
  "buyer_name": "Jane Doe",
  "created_at": "2024-06-20T14:30:00.000Z",
  "currency": "USD",
  "event": {
    "id": "evt_12345",
    "name": "Summer Tech Conference 2024",
    "starts_at": "2024-08-15T09:00:00.000Z"
  },
  "order_lines": {
    "object": "list",
    "data": [
      {
        "id": "ol_abcde",
        "object": "order_line",
        "name": "General Admission",
        "quantity": 2,
        "unit_price": 29900,
        "fee": 1500,
        "currency": "USD"
      }
    ],
    "has_more": false,
    "total": 1
  },
  "subtotal": 59800,
  "payment_fees": 1794,
  "billetto_fees": 3000,
  "payout": 55006,
  "sales_channel": "online"
}
```
</details>

### Attendees

- **List All Attendees:** `GET /attendees`
- **List Event Attendees:** `GET /events/{id}/attendees`

#### Key Query Parameters for `GET /attendees`
- `sort`: Sort order. Example: `?sort=-created_at`
- `expand`: Include related data. Example: `?expand=data.event`

#### Attendee Object

| Field                        | Type     | Description                                                                                               |
| :--------------------------- | :------- | :-------------------------------------------------------------------------------------------------------- |
| `id`                         | `string` | The unique attendee identifier.                                                                           |
| `name`                       | `string` | Full name of the attendee.                                                                                |
| `state`                      | `string` | **Values:** `sold`, `reserved`, `refunded`, `manually_generated`, `cancelled`, `available`, `door_sale`, etc. |
| `price`                      | `integer`| The price of the ticket, **in cents**.                                                                    |
| `event`                      | `object` | The related Event object. **(expandable)**                                                                |
| `booking_question_responses` | `list`   | A list of BookingQuestionResponse objects. **(expandable)**                                               |

#### Example Response: `GET /attendees/{attendee_id}`
<details>
<summary>Click to view JSON</summary>

```json
{
  "id": "att_fghij",
  "object": "attendee",
  "name": "John Smith",
  "email": "john.smith@example.com",
  "price": 29900,
  "fee": 1500,
  "created_at": "2024-06-20T14:30:00.000Z",
  "state": "sold",
  "event": {
    "id": "evt_12345",
    "name": "Summer Tech Conference 2024",
    "starts_at": "2024-08-15T09:00:00.000Z",
    "currency": "USD"
  },
  "booking_question_responses": {
    "object": "list",
    "data": [],
    "has_more": false
  }
}
```
</details>

### Ledger Entries (Financials)

- **List Ledger Entries:** `GET /ledger_entries`

#### Key Query Parameters for `GET /ledger_entries`
- `event`: Filter by a specific event ID. Example: `?event={event_id}`
- `sort`: Sort order. Example: `?sort=-created_at`

#### Ledger Entry Object

| Field         | Type      | Description                                                                                                 |
| :------------ | :-------- | :---------------------------------------------------------------------------------------------------------- |
| `id`          | `string`  | The unique ledger entry identifier.                                                                         |
| `created_at`  | `datetime`| Timestamp of the transaction.                                                                               |
| `type`        | `string`  | **Values:** `charge`, `refund`, `fee`, `payout`, `adjustment`.                                              |
| `amount`      | `integer` | The transaction amount **in cents**. Can be positive (revenue) or negative (fees).                          |
| `order_id`    | `string`  | The associated Order ID, if applicable.                                                                     |

#### Example Response: `GET /ledger_entries` (one item from the list)
<details>
<summary>Click to view JSON</summary>

```json
{
  "id": "le_klmno",
  "object": "ledger_entry",
  "created_at": "2024-06-20T14:30:05.000Z",
  "type": "charge",
  "description": "Order ord_67890",
  "amount": 59800,
  "currency": "USD",
  "event": {
    "id": "evt_12345",
    "name": "Summer Tech Conference 2024"
  },
  "order_id": "ord_67890"
}
```
</details>

### Ticket Types (Product Types)

- **List Ticket Types:** `GET /ticket_types`

#### Key Query Parameters for `GET /ticket_types`
- `event`: **(Required)** Filter by a specific event ID. Example: `?event={event_id}`

#### Ticket Type Object

| Field        | Type            | Description                                                            |
| :----------- | :-------------- | :--------------------------------------------------------------------- |
| `id`         | `string`        | The unique ticket type identifier.                                     |
| `name`       | `string`        | The display name of the ticket type.                                   |
| `price`      | `integer`       | The price of the ticket **in cents**.                                  |
| `sold_count` | `integer`       | The number of tickets of this type sold.                               |
| `state`      | `string`        | **Values:** `on_sale`, `sold_out`, `off_sale`, `hidden`.               |

#### Example Response: `GET /ticket_types?event={event_id}` (one item from list)
<details>
<summary>Click to view JSON</summary>

```json
{
    "id": "tt_pqrst",
    "object": "ticket_group",
    "name": "General Admission",
    "price": 29900,
    "fee": 1500,
    "currency": "USD",
    "sold_count": 85,
    "capacity": 250,
    "state": "on_sale",
    "starts_at": "2024-03-01T10:00:00.000Z",
    "ends_at": "2024-08-14T23:59:59.000Z"
}
```
</details>

### Campaigns

- **List Campaigns:** `GET /campaigns`

#### Campaign Object

| Field           | Type            | Description                                                              |
| :-------------- | :-------------- | :----------------------------------------------------------------------- |
| `id`            | `string`        | The unique campaign identifier.                                          |
| `name`          | `string`        | The name of the campaign.                                                |
| `state`         | `string`        | **Values:** `active`, `inactive`, `expired`, `scheduled`.                |
| `discount_type` | `string`        | **Values:** `percentage`, `fixed_amount`.                                |
| `usage_count`   | `integer`       | The number of times the campaign has been used.                          |

### Target Groups

- **List Target Groups:** `GET /target_groups`

#### Target Group Object

| Field           | Type     | Description                                |
| :-------------- | :------- | :----------------------------------------- |
| `id`            | `string` | The unique target group identifier.        |
| `name`          | `string` | The name of the target group.              |
| `members_count` | `integer`| The number of members in the group.        |

### Booking Questions

These are typically not fetched from a dedicated endpoint but are included by expanding `booking_question_responses` on an `Order` or `Attendee`.

#### Booking Question Object

| Field       | Type     | Description                                                  |
| :---------- | :------- | :----------------------------------------------------------- |
| `id`        | `string` | The unique question identifier.                              |
| `name`      | `string` | The text of the question.                                    |
| `scope`     | `string` | **Values:** `order` (asked once per order), `ticket` (asked per ticket). |

#### Booking Question Response Object

| Field      | Type     | Description                     |
| :--------- | :------- | :------------------------------ |
| `id`       | `string` | The unique response identifier. |
| `text`     | `string` | The answer provided by the user.|
| `question` | `object` | The related BookingQuestion object. **(Must be expanded)** |

#### Example `booking_question_responses` list on an Order
<details>
<summary>Click to view JSON</summary>

```json
{
  "booking_question_responses": {
    "object": "list",
    "data": [
      {
        "id": "bqr_uvwxy",
        "object": "booking_question_response",
        "text": "XL",
        "question": {
          "id": "bq_11223",
          "object": "booking_question",
          "name": "T-shirt size?",
          "description": null,
          "required": true,
          "scope": "order"
        }
      }
    ],
    "has_more": false,
    "total": 1
  }
}
```
</details>