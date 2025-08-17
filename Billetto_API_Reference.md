# Billetto Organiser API Reference (for BillettoStats)

This document provides a concise reference for all Billetto Organiser API v3 endpoints used by the BillettoStats application. It is based on a combination of the official documentation and an analysis of the application's codebase, and it serves as the definitive source of truth for this project.

## Basics

-   **Base URL**: `https://billetto.dk/api/v3/organiser`
-   **Authentication**: Requests must include an `Api-Keypair` header.
    -   **Header**: `Api-Keypair`
    -   **Value**: `YourAPIKey:YourAPISecret`

### Expanding Resources

Some resources contain IDs of related objects (e.g., an Order contains an `event` ID). You can embed the full related object in the response using the `expand` query parameter.

-   **Single resource**: `expand=event`
-   **Multiple resources**: `expand=event,order_lines`
-   **List requests**: For list endpoints, prefix the path with `data.`. Example: `expand=data.event` on a `/orders` list request.
-   **Nested Lists**: To expand a field within a nested list, you must traverse the full path, including the nested `data` property.
    -   **Example**: To expand the `question` object within the `booking_question_responses` list on an attendee, the correct path is `data.booking_question_responses.data.question`.

---

## Resources

### Events

#### `GET /events`

Lists all events for the authenticated organiser account.

-   **Parameters**:
    -   `page` (integer, optional): The page number for pagination.
    -   `limit` (integer, optional): The number of results per page.
    -   `sort` (string, optional): Field to sort by (e.g., `-starts_at` for descending).
-   **Used in**: `DashboardView` to display the main event list.

#### `GET /events/{id}`

Retrieves a single event by its unique ID.

-   **Used in**: `DashboardView` when an event is selected.

#### `GET /events/{id}/attendees`

Lists all attendees for a specific event.

-   **Parameters**:
    -   `page`, `limit` (optional): For pagination.
    -   `expand` (string, optional): Comma-separated list of resources to expand (e.g., `data.booking_question_responses.data.question`).
-   **Used in**: `DashboardView` to fetch attendee data for a selected event.

#### The Event Object

| Field            | Type             | Description                                                                                                                                                             |
| ---------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`             | string           | The unique event identifier.                                                                                                                                            |
| `object`         | string           | The object type, always "event".                                                                                                                                        |
| `name`           | string/null      | The event name.                                                                                                                                                         |
| `currency`       | string           | The three-letter ISO currency code.                                                                                                                                     |
| `state`          | string           | The event status (e.g., "published", "completed", "draft", "canceled").                                                                                                 |
| `public`         | boolean          | Indicates whether an event is publicly available or not.                                                                                                                |
| `online_event`   | boolean          | Indicates whether an event is performed online.                                                                                                                         |
| `kind`           | string           | The event kind (e.g., "regular", "recurring", "scheduled").                                                                                                             |
| `total_capacity` | integer/null     | The total capacity for the event.                                                                                                                                       |
| `parent`         | null/string      | The parent event ID for recurring events.                                                                                                                               |
| `public_url`     | URL              | The public event page URL.                                                                                                                                              |
| `starts_at`      | datetime/null    | The start date & time of the event.                                                                                                                                     |
| `ends_at`        | datetime/null    | The end date & time of the event.                                                                                                                                       |
| `published_at`   | datetime/null    | The date & time of the initial event publication.                                                                                                                       |
| `created_at`     | datetime         | The creation date & time of the event.                                                                                                                                  |
| `updated_at`     | datetime         | The date & time of the last event update.                                                                                                                               |
| `availability`   | object           | An object containing availability information.                                                                                                                          |
| `availability.available` | integer/null     | The number of tickets available for the event.                                                                                                                          |
| `availability.status`    | string           | Textual representation of availability (e.g., "high", "low", "sold_out", "unknown").                                                                            |
| `venue`          | string/null      | The ID of the associated venue. Can be expanded.                                                                                                                        |
| `organization`   | string           | The ID of the associated organization. Can be expanded.                                                                                                                 |
| `location`       | string/null      | The ID of the associated location. Can be expanded.                                                                                                                     |
| `plans`          | list             | A list object containing plan resources (structure unknown).                                                                                                            |

---

### Attendees

#### `GET /attendees`

Lists all attendees across all events for the authenticated organiser.

-   **Parameters**:
    -   `page`, `limit`, `sort` (optional).
    -   `expand` (string, optional): e.g., `event`.
-   **Used in**: `AttendeesView` for the global list of all attendees.

#### `GET /attendees/{id}`

Retrieves a single attendee by their unique ID.

-   **Parameters**:
    -   `expand` (string, optional): e.g., `event`.
-   **Used in**: `AttendeesView` to show details in a modal.

#### The Attendee Object

| Field                       | Type          | Description                                                                                                                                                             |
| --------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                        | string        | The unique Attendee identifier.                                                                                                                                         |
| `object`                    | string        | The object type, always "attendee".                                                                                                                                     |
| `barcode`                   | string        | The barcode printed on the ticket.                                                                                                                                      |
| `state`                     | string        | The attendee status (e.g., "sold", "refunded", "cancelled").                                                                                                            |
| `fee_included`              | boolean       | Indicates whether the Billetto fee is included in the ticket price.                                                                                                     |
| `name`                      | string        | The attendee's full name.                                                                                                                                               |
| `email`                     | string        | The attendee's email address.                                                                                                                                           |
| `photo`                     | null/string   | (Optional) A URL to the attendee's photo.                                                                                                                               |
| `type`                      | string        | The type of item, typically "ticket".                                                                                                                                   |
| `ticket_buyer`              | string        | The ID of the person who bought the ticket.                                                                                                                             |
| `order`                     | string        | The ID of the associated order. Can be expanded.                                                                                                                        |
| `price`                     | integer       | The ticket price **in cents**.                                                                                                                                          |
| `fee`                       | integer       | The Billetto fee for the ticket **in cents**.                                                                                                                           |
| `created_at`                | datetime      | The creation date & time of the attendee record.                                                                                                                        |
| `updated_at`                | datetime      | The date & time of the last update.                                                                                                                                     |
| `space`                     | null/string   | (Optional) The seat label for seated events.                                                                                                                            |
| `address_line_1`            | string        | (Optional) The attendee's address.                                                                                                                                      |
| `address_line_2`            | string        | (Optional) The attendee's address.                                                                                                                                      |
| `postal_code`               | string        | (Optional) The attendee's postal code.                                                                                                                                  |
| `city`                      | string        | (Optional) The attendee's city.                                                                                                                                         |
| `country_code`              | string        | (Optional) The attendee's ISO country code.                                                                                                                             |
| `phone_number`              | string        | (Optional) The attendee's phone number.                                                                                                                                 |
| `scannings`                 | list          | A list object containing Scanning resources.                                                                                                                            |
| `booking_question_responses`| list          | A list object containing Booking Question Response resources.                                                                                                           |
| `order_line`                | string        | The ID of the associated order line. Can be expanded.                                                                                                                   |
| `ticket_type`               | string        | The ID of the associated ticket type. Can be expanded.                                                                                                                  |
| `event`                     | string        | The ID of the associated event. Can be expanded.                                                                                                                        |
| `membership`                | null/string   | (Optional) The ID of an associated membership.                                                                                                                          |
| `subscription`              | null/string   | (Optional) The ID of an associated subscription.                                                                                                                        |
| `newsletter_permission`     | boolean       | Indicates if the attendee opted in to newsletters.                                                                                                                      |

#### The Booking Question Response Object (within Attendee)

This reflects the structure as observed in API responses, which may differ from official documentation.

| Field         | Type     | Description                                               |
| ------------- | -------- | --------------------------------------------------------- |
| `id`          | string   | The unique response identifier.                           |
| `object`      | string   | The object type, always "booking_question_response".      |
| `answer`      | string   | The actual response to the question.                      |
| `question`    | string   | The name/text of the question that was asked.             |
| `description` | string   | (Optional) A description of the question.                 |
| `required`    | boolean  | Whether the question was mandatory.                       |
| `created_at`  | datetime | The creation date & time of the question definition.      |
| `updated_at`  | datetime | The last update date & time of the response.              |

---

### Orders

#### `GET /orders`

Lists all orders for the authenticated organiser. Can be filtered by event.

-   **Parameters**:
    -   `page`, `limit`, `sort` (optional).
    -   `event` (string, optional): The event ID to filter orders by.
    -   `expand` (string, optional): e.g., `data.event`, `data.order_lines`.
-   **Used in**: `OrdersView` (all orders) and `DashboardView` (event-specific orders).

#### `GET /orders/{id}`

Retrieves a single order by its unique ID.

-   **Parameters**:
    -   `expand` (string, optional): e.g., `event`, `order_lines`, `order_transactions`.
-   **Used in**: `OrdersView` and `LedgerView` to show order details in a modal.

#### The Order Object

| Field                        | Type     | Description                                                               |
| ---------------------------- | -------- | ------------------------------------------------------------------------- |
| `id`                         | string   | The unique Order identifier.                                              |
| `object`                     | string   | The object type, always "order".                                          |
| `email`                      | string   | The buyer's email address.                                                |
| `state`                      | string   | The state of the order (e.g., "successful", "failed").                    |
| `buyer_name`                 | string   | The full name of the buyer.                                               |
| `phone`                      | string   | (Optional) The buyer's phone number.                                      |
| `ip`                         | string   | (Optional) The IP address of the buyer.                                   |
| `sold_by`                    | string   | (Optional) The account ID that sold the order.                            |
| `sales_channel`              | string   | The channel through which the sale was made (e.g., "online").             |
| `terminal_name`              | string   | (Optional) The name of the payment terminal used.                         |
| `revenue_channel`            | string   | The revenue channel (e.g., "mixed").                                      |
| `currency`                   | string   | The three-letter ISO currency code.                                       |
| `payment_fees`               | integer  | Payment gateway fees in cents.                                            |
| `billetto_fees`              | integer  | Billetto's fees in cents.                                                 |
| `payout`                     | integer  | The final payout amount in cents (can be negative).                       |
| `subtotal`                   | integer  | The total value of order lines before fees, in cents.                     |
| `created_at`                 | datetime | The creation date & time of the order.                                    |
| `updated_at`                 | datetime | The date & time of the last update.                                       |
| `event`                      | string   | The ID of the associated event. Can be expanded.                          |
| `address`                    | string   | (Optional) The ID of the associated address object.                       |
| `subscription`               | null/str | (Optional) The ID of the associated subscription.                         |
| `order_lines`                | list     | A list object containing Order Line resources.                            |
| `booking_question_responses` | list     | A list object containing Booking Question Response resources.             |
| `order_transactions`         | list     | A list object containing Order Transaction resources.                     |
| `manage_url`                 | URL      | (Optional) A URL to manage the order on the Billetto website.             |

#### The Order Transaction Object

| Field                            | Type     | Description                                                                      |
| -------------------------------- | -------- | -------------------------------------------------------------------------------- |
| `id`                             | string   | The unique Order Transaction identifier.                                         |
| `object`                         | string   | The object type, always "order_transaction".                                     |
| `currency`                       | string   | The three-letter ISO currency code.                                              |
| `state`                          | string   | The state of the transaction (e.g., "successful").                               |
| `payment_gateway_transaction_id` | string   | The transaction ID from the payment gateway (e.g., Stripe's `pi_...`).           |
| `payment_method`                 | string   | The payment method used (e.g., "klarna", "card").                                |
| `payment_gateway_identifier`     | string   | The identifier for the payment gateway (e.g., "Stripe SE").                      |
| `payment_gateway_order_id`       | string   | The order ID used by the payment gateway.                                        |
| `sales_channel`                  | string   | The sales channel for this transaction.                                          |
| `revenue_channel`                | string   | The revenue channel for this transaction.                                        |
| `terminal_name`                  | null/str | The name of the terminal used.                                                   |
| `amount`                         | integer  | The transaction amount in cents.                                                 |
| `refunded_amount`                | integer  | The amount refunded in cents.                                                    |
| `balance`                        | integer  | The remaining balance in cents (`amount` - `refunded_amount`).                   |
| `created_at`                     | datetime | The creation date & time.                                                        |
| `updated_at`                     | datetime | The last update date & time.                                                     |
| `successful_at`                  | datetime | (Optional) The timestamp when the transaction became successful.                 |
| `refunded_at`                    | null/dt  | (Optional) The timestamp of any refund.                                          |
| `captured_at`                    | datetime | (Optional) The timestamp when the payment was captured.                          |
| `refunds`                        | list     | A list object containing any Refund resources.                                   |

---

### Ledger

#### `GET /ledger_entries`

Lists all financial ledger entries (charges, fees, refunds, payouts). Can be filtered by event.

-   **Parameters**:
    -   `page`, `limit`, `sort` (optional).
    -   `event` (string, optional): The event ID to filter entries by.
    -   `expand` (string, optional): e.g., `event`.
-   **Used in**: `LedgerView` and `DashboardView` (for financial calculations).

#### The Ledger Entry Object

| Field                        | Type     | Description                                                                                                                                                                                                                                                             |
| ---------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                         | string   | The unique ledger entry identifier.                                                                                                                                                                                                                                     |
| `object`                     | string   | The object type, always "ledger_entry".                                                                                                                                                                                                                                 |
| `time`                       | datetime | The timestamp of the entry.                                                                                                                                                                                                                                             |
| `created_at`                 | datetime | The creation date & time of the entry.                                                                                                                                                                                                                                  |
| `entry_type`                 | string   | The type of ledger entry. Can be: `ORDER_REVENUE`, `ORGANIZER_PAYMENT_FEE`, `TICKETS_FEE`, `IMMEDIATE_PAYOUT`, `COMMISSION`, `IMMEDIATE_PAYOUT_WITHDRAWAL`, `CHARGEBACK`, `PROMOTION_FEE`, `INVOICE_FEE`, `WALLET_CHARGE`, `DISCOUNTS`, `PAYOUT`, `REFUND`.                    |
| `entry_subtype`              | string   | A more detailed classification of the entry type (e.g., "billetto_advertising_fee", "online_order").                                                                                                                                                                    |
| `revenue_subtype`            | null/str | (Optional) A further breakdown of the revenue type.                                                                                                                                                                                                                     |
| `purchase_terminal`          | string   | The terminal used for the transaction (e.g., "online", "box-office").                                                                                                                                                                                                   |
| `terminal_name`              | string   | The name of the payment terminal used (e.g., "Stripe SE").                                                                                                                                                                                                              |
| `cash_register_session_uuid` | null/str | (Optional) The unique ID for a cash register session.                                                                                                                                                                                                                   |
| `payment_gateway`            | string   | The payment gateway used for the transaction (e.g., "Stripe").                                                                                                                                                                                                          |
| `revenue_channel`            | string   | The revenue channel for this entry (e.g., "mixed").                                                                                                                                                                                                                     |
| `transaction_type`           | string   | The type of transaction (e.g., "PAYMENT", "CANCELLATION", "REFUND", "FAILED").                                                                                                                                                                                            |
| `currency`                   | string   | The three-letter ISO currency code.                                                                                                                                                                                                                                     |
| `vat_rate`                   | string   | The VAT rate applied as a string (e.g., "25.0").                                                                                                                                                                                                                        |
| `event_id`                   | integer  | The ID of the associated event. Can be expanded to an event object.                                                                                                                                                                                                     |
| `order_id`                   | integer  | The ID of the associated order.                                                                                                                                                                                                                                         |
| `source`                     | string   | (Optional) The marketing source for the transaction (e.g., "billetto advertising").                                                                                                                                                                                     |
| `medium`                     | string   | (Optional) The marketing medium for the transaction (e.g., "email").                                                                                                                                                                                                    |
| `amount`                     | integer  | The total amount for the transaction in cents. Can be negative for fees or refunds.                                                                                                                                                                                     |
| `vat`                        | integer  | The VAT amount for the transaction in cents.                                                                                                                                                                                                                            |

---

### Campaigns

#### `GET /campaigns`

Lists all campaigns for the authenticated organiser.

-   **Parameters**:
    -   `page`, `limit`, `sort` (optional).
    -   `expand` (string, optional): e.g., `event`.
-   **Used in**: `CampaignsView`.

#### `GET /campaigns/{id}/orders`

Lists all orders where a specific campaign was used.

-   **Parameters**:
    -   `page`, `limit`, `sort` (optional).
    -   `expand` (string, optional): e.g., `event`.
-   **Used in**: `CampaignsView` to show order details for a selected campaign.

---

### Ticket Groups (Ticket Types)

#### `GET /ticket_types`

Lists all ticket types (referred to as Ticket Groups in the app). This endpoint is typically filtered by event.

-   **Parameters**:
    -   `event` (string, **required**): The event ID to filter ticket types by.
    -   `page`, `limit` (optional).
-   **Used in**: `DashboardView` to display ticket sales breakdown.

---

### Target Groups

#### `GET /target_groups`

Lists all target groups for the authenticated organiser.

-   **Parameters**:
    -   `page`, `limit`, `sort` (optional).
-   **Used in**: `TargetGroupsView`.

#### `GET /target_groups/{id}/members`

Lists all members within a specific target group.

-   **Parameters**:
    -   `page`, `limit` (optional).
-   **Used in**: `TargetGroupsView` to display members when a group is selected.
