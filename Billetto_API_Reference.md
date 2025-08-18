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
    -   **Example**: To expand `refund` objects within the `order_transactions` list on an order, the correct path is `order_transactions.data.refunds`.

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
| `venue`          | string/`Venue`/null      | The ID of the associated venue. Can be expanded to a `Venue` object.                                                                                                   |
| `organization`   | string/`Organization`   | The ID of the associated organization. Can be expanded to an `Organization` object.                                                                                   |
| `location`       | string/`Location`/null      | The ID of the associated location. Can be expanded to a `Location` object.                                                                                                   |
| `editorial`      | string/`Editorial`/null    | **NEW**: Contains descriptive content for the event. Can be expanded to an `Editorial` object.                                                                          |
| `categorisation` | `Categorisation`          | **NEW**: An object containing the category, sub-category, and type of the event.                                                                                          |
| `plans`          | list             | A list object containing `Plan` resources.                                                                                                            |


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
    -   `expand` (string, optional): e.g., `event`, `scannings`.
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
| `ticket_buyer`              | string/`TicketBuyer` (expandable) | The ID of the person who bought the ticket. Can be expanded. |
| `order`                     | string (expandable) | The order ID used to buy the ticket. Can be expanded. |
| `price`                     | integer       | The ticket price **in cents**.                                                                                                                                          |
| `fee`                       | integer       | The Billetto fee for the ticket **in cents**.                                                                                                                           |
| `created_at`                | datetime      | The creation date & time of the attendee record.                                                                                                                        |
| `updated_at`                | datetime      | The date & time of the last update.                                                                                                                                     |
| `space` | string/`Space` (expandable) | The seat label for the specific seat. Can be expanded. |
| `address_line_1`            | string        | (Optional) The attendee's address.                                                                                                                                      |
| `address_line_2`            | string        | (Optional) The attendee's address.                                                                                                                                      |
| `postal_code`               | string        | (Optional) The attendee's postal code.                                                                                                                                  |
| `city`                      | string        | (Optional) The attendee's city.                                                                                                                                         |
| `country_code`              | string        | (Optional) The attendee's ISO country code.                                                                                                                             |
| `phone_number`              | string        | (Optional) The attendee's phone number.                                                                                                                                 |
| `scannings`                 | list (expandable) | A list object containing `Scanning` resources. Can be expanded.                                                                                                   |
| `booking_question_responses`| list          | A list object containing Booking Question Response resources.                                                                                                           |
| `order_line`                | string        | The ID of the associated order line. Can be expanded.                                                                                                                   |
| `ticket_type`               | string        | The ID of the associated ticket type. Can be expanded.                                                                                                                  |
| `event`                     | string        | The ID of the associated event. Can be expanded.                                                                                                                        |
| `membership` | string/`Membership` (expandable) | The membership event ID. Can be expanded. |
| `subscription` | string/`Subscription` (expandable) | The subscription ID. Can be expanded. |
| `newsletter_permission`     | boolean       | Indicates if the attendee opted in to newsletters.                                                                                                                      |

#### The Booking Question Response Object (within Attendee/Order)

This reflects the structure as observed in recent API responses. The application should be robust to handle variations.

| Field         | Type                  | Description                                                                                                   |
| ------------- | --------------------- | ------------------------------------------------------------------------------------------------------------- |
| `id`          | string                | The unique response identifier.                                                                               |
| `object`      | string                | The object type, always "booking_question_response".                                                          |
| `answer`      | string                | The primary field for the response text.                                                                      |
| `text`        | string (optional)     | A legacy field for the response text. The application should use `answer` first and fall back to `text`.        |
| `question`    | string OR object      | Can be a simple string (the question's name) or a full `BookingQuestion` object if expanded.                    |
| `description` | string                | (Optional) The description that was shown with the question.                                                  |
| `required`    | boolean               | Whether the question was mandatory.                                                                           |
| `created_at`  | datetime              | The creation date & time of the question definition.                                                          |
| `updated_at`  | datetime              | The date & time this specific response was created or last updated.                                           |

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
| `address`                    | string/`Address`   | (Optional) The ID of the associated address object. Can be expanded.                       |
| `subscription`               | null/`Subscription` | (Optional) The ID of the associated subscription. Can be expanded.                         |
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
| `refunds`                        | list (expandable) | A list object containing any `Refund` resources. Expand with `order_transactions.data.refunds`. |

#### The Refund Object

| Field               | Type   | Description                                                           |
| ------------------- | ------ | --------------------------------------------------------------------- |
| `id`                | string | The unique Refund identifier.                                         |
| `object`            | string | The object type, always "refund".                                     |
| `amount`            | integer| The refunded amount in cents.                                         |
| `currency`          | string | The three-letter ISO currency code.                                   |
| `reason`            | string | The reason for the refund (e.g., "customer_requested", "duplicate").  |
| `created_at`        | datetime| The creation date & time of the refund.                               |
| `order_transaction` | string | The ID of the parent order transaction.                               |

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

| Field                        | Type             | Description                                                                                                                                                                                                                                                             |
| ---------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                         | string           | The unique ledger entry identifier.                                                                                                                                                                                                                                     |
| `object`                     | string           | The object type, always "ledger_entry".                                                                                                                                                                                                                                 |
| `time`                       | datetime         | The timestamp of the entry.                                                                                                                                                                                                                                             |
| `created_at`                 | datetime         | The creation date & time of the entry.                                                                                                                                                                                                                                  |
| `entry_type`                 | string           | The type of ledger entry. Can be: `ORDER_REVENUE`, `ORGANIZER_PAYMENT_FEE`, `TICKETS_FEE`, `IMMEDIATE_PAYOUT`, `COMMISSION`, `IMMEDIATE_PAYOUT_WITHDRAWAL`, `CHARGEBACK`, `PROMOTION_FEE`, `INVOICE_FEE`, `WALLET_CHARGE`, `DISCOUNTS`, `PAYOUT`, `REFUND`.                    |
| `entry_subtype`              | string           | A more detailed classification (e.g., "billetto_advertising_fee", "online_order", "fee_included").                                                                                                                                                                      |
| `revenue_subtype`            | string / null    | A further breakdown of the revenue type.                                                                                                                                                                                                                                |
| `purchase_terminal`          | string           | The terminal used for the transaction (e.g., "online", "box-office").                                                                                                                                                                                                   |
| `terminal_name`              | string / null    | The name of the payment terminal used (e.g., "Stripe SE").                                                                                                                                                                                                              |
| `cash_register_session_uuid` | string / null    | The unique ID for a cash register session.                                                                                                                                                                                                                              |
| `payment_gateway`            | string           | The payment gateway used for the transaction (e.g., "Stripe").                                                                                                                                                                                                          |
| `revenue_channel`            | string           | The revenue channel for this entry (e.g., "mixed").                                                                                                                                                                                                                     |
| `transaction_type`           | string           | The type of transaction (e.g., "PAYMENT", "CANCELLATION", "REFUND", "FAILED").                                                                                                                                                                                            |
| `currency`                   | string           | The three-letter ISO currency code.                                                                                                                                                                                                                                     |
| `vat_rate`                   | string / null    | The VAT rate applied as a string (e.g., "25.0").                                                                                                                                                                                                                        |
| `event_id`                   | string / number  | The ID of the associated event.                                                                                                                                                                                                                                         |
| `order_id`                   | string / number  | The ID of the associated order.                                                                                                                                                                                                                                         |
| `source`                     | string / null    | The marketing source for the transaction (e.g., "billetto advertising").                                                                                                                                                                                                |
| `medium`                     | string / null    | The marketing medium for the transaction (e.g., "email").                                                                                                                                                                                                               |
| `amount`                     | integer          | The total amount for the transaction in cents. Can be negative for fees or refunds.                                                                                                                                                                                     |
| `vat`                        | integer          | The VAT amount for the transaction in cents.                                                                                                                                                                                                                            |
| `event`                      | object (expanded)| The expanded Event object if requested. Contains `id` and `name`.                                                                                                                                                                                                     |

#### Ledger Entry Examples

**1. `ORDER_REVENUE` (with Marketing Attribution)**
This entry represents the income from a ticket sale that was tracked via a UTM link.

```json
{
  "id": "le_123marketingrevenue",
  "object": "ledger_entry",
  "created_at": "2024-05-20T14:30:00Z",
  "entry_type": "ORDER_REVENUE",
  "amount": 2500,
  "vat": 500,
  "currency": "EUR",
  "source": "facebook",
  "medium": "cpc",
  "revenue_channel": "utm",
  "event_id": "evt_abc123",
  "order_id": "ord_def456"
}
```

**2. `REFUND`**
This entry represents a refund processed for an order. The amount is negative.

```json
{
  "id": "le_456refund",
  "object": "ledger_entry",
  "created_at": "2024-05-21T10:00:00Z",
  "entry_type": "REFUND",
  "amount": -2500,
  "vat": -500,
  "currency": "EUR",
  "transaction_type": "REFUND",
  "event_id": "evt_abc123",
  "order_id": "ord_def456"
}
```

**3. `CHARGEBACK`**
This entry represents a chargeback initiated by a customer's bank. The amount is negative and represents a loss.

```json
{
  "id": "le_789chargeback",
  "object": "ledger_entry",
  "created_at": "2024-05-22T18:00:00Z",
  "entry_type": "CHARGEBACK",
  "amount": -2500,
  "vat": -500,
  "currency": "EUR",
  "event_id": "evt_abc123",
  "order_id": "ord_def456"
}
```

**4. `PAYOUT`**
This entry represents a transfer of funds from Billetto to the organizer's bank account. It is not tied to a specific event or order.

```json
{
  "id": "le_101payout",
  "object": "ledger_entry",
  "created_at": "2024-06-01T09:00:00Z",
  "entry_type": "PAYOUT",
  "amount": -1575050,
  "vat": 0,
  "currency": "EUR",
  "event_id": null,
  "order_id": null
}
```

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

#### The Campaign Object

*NOTE: The structure of this object is complex and nested, differing from older documentation. The following reflects the actual API response.*

| Field                | Type                                   | Description                                                                                                   |
| -------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `id`                 | string                                 | The unique Campaign identifier.                                                                               |
| `object`             | string                                 | The object type, always "campaign".                                                                           |
| `name`               | string                                 | The campaign name.                                                                                            |
| `state`              | string                                 | The campaign state (e.g., "running", "prepared", "completed").                                                |
| `applications_count` | integer                                | The number of times the campaign has been used in an order.                                                   |
| `event`              | string OR object OR null               | Event ID string if event-specific, a full Event object if expanded, or null if global.                        |
| `conditions`         | `ListResponse<CampaignCondition>`      | A list object containing the conditions required to activate the campaign.                                    |
| `effects`            | `ListResponse<CampaignEffect>`         | A list object containing the effects (e.g., discounts) applied by the campaign.                               |

#### The Campaign Condition Object

| Field    | Type     | Description                                                                  |
| -------- | -------- | ---------------------------------------------------------------------------- |
| `id`     | string   | The unique Campaign Condition identifier.                                    |
| `object` | string   | The object type, always "campaign_condition".                                |
| `type`   | string   | The condition type (e.g., "accesscode", "targetgroup").                      |
| `data`   | object   | An object containing condition-specific data. e.g., `{ "code": "PROMO123" }` |

#### The Campaign Effect Object

| Field          | Type     | Description                                                                                                                                    |
| -------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`           | string   | The unique Campaign Effect identifier.                                                                                                         |
| `object`       | string   | The object type, always "campaign_effect".                                                                                                     |
| `type`         | string   | The effect type (e.g., "percentage-discount-ticket-type-price").                                                                               |
| `usage_limit`  | integer/null | The maximum number of tickets that can use this effect.                                                                                        |
| `orders_limit` | integer/null | The maximum number of orders that can use this effect.                                                                                         |
| `order_limit`  | integer/null | The maximum number of tickets per order that this effect applies to.                                                                           |
| `data`         | object   | An object containing effect-specific data. e.g., `{ "percentage_discount": "10", "ticket_types": ListResponse<TicketType>, "categories": [] }` |

---

### Ticket Types

#### `GET /ticket_types`

Lists all ticket types for an event. The application refers to these as "Ticket Groups".

-   **Parameters**:
    -   `event` (string, **required**): The event ID to filter ticket types by.
    -   `page`, `limit` (optional).
-   **Used in**: `DashboardView` to display ticket sales breakdown.
-   **Note**: Key fields like `sold_count` and `state` are not provided by this endpoint and are **calculated by the application** based on order data.

#### The Ticket Type Object

| Field                   | Type         | Description                                                        |
| ----------------------- | ------------ | ------------------------------------------------------------------ |
| `id`                    | string       | The unique Ticket Type identifier.                                 |
| `object`                | string       | The object type, always "ticket_type".                             |
| `uuid`                  | string       | A secondary unique identifier.                                     |
| `type`                  | string       | The type classification (e.g., "PayTicketType", "AddonTicketType"). |
| `name`                  | string       | The display name of the ticket type.                               |
| `created_at`            | datetime     | The creation date & time.                                          |
| `updated_at`            | datetime     | The last update date & time.                                       |
| `quantity`              | integer/null | The total number of tickets available (capacity).                  |
| `fee_included`          | boolean      | Indicates if the Billetto fee is included in the price.            |
| `vip`                   | boolean      | Indicates if this is a VIP ticket type.                            |
| `description`           | string       | The public description of the ticket type.                         |
| `min_tickets_per_order` | integer      | The minimum number of tickets of this type per order.              |
| `max_tickets_per_order` | integer/null | The maximum number of tickets of this type per order.              |
| `sales_period`          | string       | A string describing the sales period (e.g., "eventend").           |
| `sells_from`            | datetime/null| The date & time when sales start.                                  |
| `sells_to`              | datetime/null| The date & time when sales end.                                    |
| `vat_rate`              | number/null  | The VAT rate applied.                                              |
| `price`                 | integer      | The price of the ticket in cents.                                  |
| `admission`             | boolean      | Indicates if this ticket grants admission.                         |
| `addons`                | boolean      | Indicates if this is an addon.                                     |
| `event`                 | string       | The ID of the associated event.                                    |

#### The Ticket Type Price Object (within TicketType)
| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier. |
| `type` | string | Always "price". |
| `price` | integer | Price in cents. |
| `plan` | `Plan`/null | (Optional) The associated payment plan. |

---

### Target Groups

#### `GET /target_groups`

Lists all target groups for the authenticated organiser.

-   **Parameters**:
    -   `page`, `limit`, `sort` (optional).
-   **Used in**: `TargetGroupsView`.
-   **Note**: The response for this endpoint **does not** include `members_count` or `created_at`. The total member count for a group must be retrieved by fetching its members list.

#### The Target Group Object

| Field      | Type         | Description                                                        |
| ---------- | ------------ | ------------------------------------------------------------------ |
| `id`       | string       | The unique Target Group identifier.                                |
| `object`   | string       | The object type, always "target_group".                            |
| `name`     | string       | The display name of the target group.                              |
| `kind`     | string       | The type of group (e.g., "static", "event_attendees", "fans").     |
| `segments` | array (expandable) | An array of `Segment` definitions that constitute the group. Can be expanded. |
| `event`    | string / null| The associated event ID if this is an event-specific group, otherwise null. |

### Target Group Members

#### `GET /target_groups/{id}/members`

Lists all members within a specific target group.

-   **Parameters**:
    -   `page`, `limit` (optional).
-   **Used in**: `TargetGroupsView` to display members when a group is selected.

#### The Target Group Member Object

The structure of a member object can vary. The application is designed to handle two primary formats:

**1. Personal Info Format** (Typically for target groups based on event attendees, fans, etc.)

| Field  | Type   | Description                               |
| ------ | ------ | ----------------------------------------- |
| `id`   | string | The unique Target Group Member identifier.|
| `object` | string | The object type, always "target_group_member". |
| `name`   | string | The member's full name.                   |
| `email`  | string | The member's email address.               |

**2. Code-Based Format** (Typically for static groups used for promo codes, access codes, etc.)

| Field              | Type         | Description                                                        |
| ------------------ | ------------ | ------------------------------------------------------------------ |
| `id`               | string       | The unique Target Group Member identifier.                         |
| `object`           | string       | The object type, always "target_group_member".                     |
| `target_group`     | string       | The ID of the parent target group.                                 |
| `ticket_buyer`     | string / null| (Optional) The ID of an associated ticket buyer.                   |
| `code`             | string / null| A unique code associated with the member (e.g., a promo code).     |
| `space_identifier` | string / null| (Optional) An identifier for a specific seat or space.             |
| `limit`            | integer / null | (Optional) A usage limit for this member/code.                     |
| `quantity`         | integer / null | (Optional) A quantity limit, often per ticket or order.            |
| `category_key`     | string / null| (Optional) A key for a specific category.                          |
---

## New & Detailed Objects

### The Address Object
Represents a customer address, linked to an `Order`.

| Field | Type | Description |
|---|---|---|
| `id` | string | The unique Address identifier. |
| `object` | string | The object type, always "address". |
| `type` | string | The address type ("personal" or "company"). |
| `first_name` | string | (Optional) The first name. |
| `last_name` | string | (Optional) The last name. |
| `address_line_1` | string | The first address line. |
| `address_line_2` | string | (Optional) The second address line. |
| `city` | string | The address city. |
| `postal_code` | string | The address postal code. |
| `country_code` | string | ISO 3166-1 alpha-2 country code. |
| `company_name` | string | (Optional) The company name. |
| `company_vat_number` | string | (Optional) The company VAT number. |

### The Editorial Object
An expandable object on an `Event` that contains rich content and media.

| Field | Type | Description |
|---|---|---|
| `host` | string | (Optional) The event host's name. |
| `description` | string | (Optional) The plain-text event description. |
| `description_html` | string | (Optional) The HTML event description. |
| `tags` | array | (Optional) An array of tag strings. |
| `gallery_items` | list | A list object of `GalleryItem` resources. |
| `headliners` | list | A list object of `Headliner` resources. |

### The Gallery Item Object
Represents an image in an event's gallery.

| Field | Type | Description |
|---|---|---|
| `id` | string | The unique Gallery Item identifier. |
| `object` | string | The object type, always "gallery_item". |
| `type` | string | The image source ("unsplash" or "upload"). |
| `original_url` | URL | The URL of the original image. |
| `cropped_url` | URL | A URL for a cropped version of the image. |
| `position` | integer | The display order of the item. |

### The Headliner Object
Represents a performer or main feature of an event.

| Field | Type | Description |
|---|---|---|
| `id` | string | The unique Headliner identifier. |
| `object` | string | The object type, always "headliner". |
| `name` | string | The headliner's name. |
| `title` | string | (Optional) The headliner's title or role. |
| `description` | string | (Optional) A short description. |
| `image_url` | URL | (Optional) A URL for the headliner's image. |

### The Categorisation Object
Contains event classification data.

| Field | Type | Description |
|---|---|---|
| `category` | string/null | The main category of the event. |
| `subcategory` | string/null | The sub-category of the event. |
| `type` | string/null | The type of the event (e.g., "concert", "conference"). |

### The Ticket Buyer Object
A simplified representation of the user who purchased the ticket.

| Field | Type | Description |
|---|---|---|
| `id` | string | The unique Ticket Buyer identifier. |
| `object` | string | The object type, likely "ticket_buyer" or a user type. |
| `name` | string | The buyer's name. |
| `email` | string | The buyer's email. |

### The Space Object
Represents a specific seat or location for a ticketed event.

| Field | Type | Description |
|---|---|---|
| `id` | string | The unique Space identifier. |
| `object` | string | The object type, always "space". |
| `label` | string | The label for the seat (e.g., "A12", "Row 5 Seat 3"). |
| `seat_category` | string | (Optional) The category of the seat (e.g., "VIP", "Stalls"). |

### The Subscription Object
Represents a subscription that may grant access to events.

| Field | Type | Description |
|---|---|---|
| `id` | string | The unique Subscription identifier. |
| `object` | string | The object type, always "subscription". |
| `name` | string | The name of the subscription plan. |
| `state` | string | The status of the subscription (e.g., "active", "cancelled"). |
| `created_at` | datetime | The creation date of the subscription. |
| `expires_at` | datetime | (Optional) The expiration date of the subscription. |

### The Membership Object
Represents a membership linked to an event or series.

| Field | Type | Description |
|---|---|---|
| `id` | string | The unique Membership identifier. |
| `object` | string | The object type, always "membership". |
| `name` | string | The name of the membership. |
| `event_id` | string | The ID of the event this membership is associated with. |

### The Plan Object
Represents a payment plan, often for subscriptions or ticket types.

| Field | Type | Description |
|---|---|---|
| `id` | string | The unique Plan identifier. |
| `object` | string | The object type, always "plan". |
| `name` | string | The name of the plan. |
| `price` | integer | The price in cents. |
| `interval`| string | The billing interval ("day", "week", "month", "year"). |

### The Scanning Object

Represents a single scan of an attendee's ticket barcode.

| Field          | Type   | Description                                                     |
| -------------- | ------ | --------------------------------------------------------------- |
| `id`           | string | The unique Scanning identifier.                                 |
| `object`       | string | The object type, always "scanning".                             |
| `created_at`   | datetime| The timestamp of when the scan occurred.                        |
| `status`       | string | The result of the scan (e.g., "accepted", "rejected").          |
| `message`      | string/null| An optional message associated with the scan (e.g., "Already scanned"). |
| `scanner_name` | string/null| The name of the device or person who performed the scan.      |

### The Venue Object

Represents the physical venue where an event is held.

| Field  | Type   | Description                   |
| ------ | ------ | ----------------------------- |
| `id`   | string | The unique Venue identifier.  |
| `object`| string | The object type, always "venue". |
| `name` | string | The name of the venue.        |

### The Location Object

Represents the geographical location of an event.

| Field        | Type   | Description                      |
| -------------- | ------ | -------------------------------- |
| `id`           | string | The unique Location identifier.  |
| `object`     | string | The object type, always "location". |
| `name`         | string | The name of the location.        |
| `full_address` | string | The complete, formatted address. |

### The Organization Object

Represents the organizing body or company hosting an event.

| Field  | Type   | Description                        |
| ------ | ------ | ---------------------------------- |
| `id`   | string | The unique Organization identifier.|
| `object`| string | The object type, always "organization". |
| `name` | string | The name of the organization.      |

### The Segment Object

Represents a set of rules that define a `TargetGroup`. A target group can be composed of one or more segments.

| Field  | Type   | Description                          |
| ------ | ------ | ------------------------------------ |
| `id`   | string | The unique Segment identifier.       |
| `object`| string | The object type, always "segment".   |
| `rules`| array  | An array of `SegmentRule` objects. |

#### The Segment Rule Object

| Field    | Type   | Description                                                                 |
| -------- | ------ | --------------------------------------------------------------------------- |
| `field`  | string | The data field to filter on (e.g., "event_id").                             |
| `operator`| string | The comparison operator (e.g., "eq" for equals, "in" for included in list). |
| `value`  | any    | The value to compare against.                                               |