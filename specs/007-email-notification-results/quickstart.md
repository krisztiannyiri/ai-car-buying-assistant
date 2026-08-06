# Quickstart Validation Guide: Email Notification for Car Search Results

**Branch**: `007-email-notification-results` | **Date**: 2026-08-06

## Prerequisites

1. **n8n instance running** at `http://localhost:5678`
2. **SMTP credential configured** in n8n:
   - Go to n8n → Settings → Credentials → New → `SMTP`
   - Name it `Car Buying Assistant SMTP`
   - Fill in your SMTP host, port, username, and password
   - Test the connection before proceeding
3. **Car listings exist** in the `car_listings` data table (verify via n8n → Data → Tables)
4. **Workflow published** — the updated "Car Search Logger" workflow must be active
5. **Next.js app running** at `http://localhost:3000` (if testing the end-to-end UI flow)

## Scenario 1: Results exist → email sent (primary flow)

**What this validates**: FR-001, FR-002, FR-003, FR-004, FR-005, FR-008 and SC-001, SC-003, SC-004

**Steps**:

1. Send a POST request to the n8n webhook with criteria that will match at least one car:
   ```bash
   curl -X POST http://localhost:5678/webhook/a8a5cff0-6066-4fc5-8334-17b97e3d05fd/car-search \
     -H "Content-Type: application/json" \
     -d '{
       "budgetMax": 50000,
       "bodyTypes": ["any"],
       "fuelTypes": ["any"],
       "transmission": "any",
       "minSeats": null,
       "features": [],
       "yearMin": null,
       "yearMax": null,
       "engineDisplacements": ["any"],
       "usageContext": "any",
       "annualMileage": null,
       "endTrigger": "explicit",
       "isRefinement": false,
       "userEmail": "your-test-email@example.com"
     }'
   ```
   Replace `your-test-email@example.com` with a real inbox you can check.

2. **Expected workflow execution** (check n8n → Executions):
   - Webhook → Get Car Listings → Filter Listings → Log Results → IF node (true branch) → Build Email HTML → Send Results Email → workflow ends
   - Execution status: **Success**

3. **Expected email** (check inbox within 30 seconds):
   - Subject: `Your car matches: {N} result(s) found` where N ≥ 1
   - Header shows the total count and a criteria summary
   - Each matched car is displayed as a separate card with all required fields (see [email-template.md](contracts/email-template.md) for required fields)
   - Price is formatted as `€X,XXX` (EUR, comma thousands separator)
   - Null/missing fields show `Not specified` in grey italic

**Pass criteria**: Email arrives, subject matches pattern, all matched cars present, fields correctly formatted.

---

## Scenario 2: No results → no email sent

**What this validates**: FR-001, FR-007 and SC-002

**Steps**:

1. Send a POST request with criteria that will match zero cars (e.g., budget of €1):
   ```bash
   curl -X POST http://localhost:5678/webhook/a8a5cff0-6066-4fc5-8334-17b97e3d05fd/car-search \
     -H "Content-Type: application/json" \
     -d '{
       "budgetMax": 1,
       "bodyTypes": ["any"],
       "fuelTypes": ["any"],
       "transmission": "any",
       "minSeats": null,
       "features": [],
       "yearMin": null,
       "yearMax": null,
       "engineDisplacements": ["any"],
       "usageContext": "any",
       "annualMileage": null,
       "endTrigger": "explicit",
       "isRefinement": false,
       "userEmail": "your-test-email@example.com"
     }'
   ```

2. **Expected workflow execution**:
   - IF node routes to false branch → No Operation node → workflow ends
   - Execution status: **Success**

3. **Expected inbox**: No new email arrives within 60 seconds.

**Pass criteria**: Workflow succeeds, no email sent.

---

## Scenario 3: Missing userEmail → email skipped, warning recorded

**What this validates**: FR-008 and SC-001 (non-blocking skip)

**Steps**:

1. Send a valid search request with `userEmail` omitted or null:
   ```bash
   curl -X POST http://localhost:5678/webhook/a8a5cff0-6066-4fc5-8334-17b97e3d05fd/car-search \
     -H "Content-Type: application/json" \
     -d '{
       "budgetMax": 50000,
       "bodyTypes": ["any"],
       "fuelTypes": ["any"],
       "transmission": "any",
       "minSeats": null,
       "features": [],
       "yearMin": null,
       "yearMax": null,
       "engineDisplacements": ["any"],
       "usageContext": "any",
       "annualMileage": null,
       "endTrigger": "explicit",
       "isRefinement": false,
       "userEmail": null
     }'
   ```

2. **Expected workflow execution**:
   - The email validation step skips the send, records a warning
   - Execution status: **Success** (not an error)

3. **Verify**: In the execution output, the final output item should contain `emailWarning: true`.

**Pass criteria**: Execution succeeds, no email sent, warning recorded in output.

---

## Scenario 4: Malformed userEmail → email skipped, warning recorded

**What this validates**: FR-008 (malformed address handling)

**Steps**:

1. Send a request with an invalid email format:
   ```bash
   # Use same payload as Scenario 3 but with:
   "userEmail": "notanemail"
   ```

2. **Expected**: Same as Scenario 3 — execution succeeds, email skipped, warning recorded.

**Pass criteria**: Execution succeeds, no email sent, warning recorded.

---

## Scenario 5: Email delivery failure → non-blocking warning

**What this validates**: FR-002 (non-blocking failure), SC-001

**Steps**:

1. Temporarily break the SMTP credential (e.g., change the password to something invalid in n8n Credentials).
2. Send a valid request with a valid `userEmail` and criteria that match at least one car.
3. **Expected workflow execution**:
   - Send Results Email node fails (delivery error)
   - "Continue on Fail" causes execution to continue
   - Record Email Warning node runs, stamps `emailWarning: true`
   - Execution status: **Success** (not failed)

4. Restore the SMTP credential.

**Pass criteria**: Execution status is Success despite email failure; warning is present in output.

---

## End-to-End UI Test

**What this validates**: Full flow from chat conversation to email receipt

**Steps**:

1. Open `http://localhost:3000` in a browser.
2. Enter your email address in the pre-chat email input field.
3. Complete a car-buying conversation with the assistant (provide lifestyle info and conclude with a search).
4. Verify the `__WEBHOOK_EVENT__` stream event in the browser network tab shows `status: "success"`.
5. Check your inbox — the email should arrive within 30 seconds.

**Pass criteria**: Email arrives matching the template in [contracts/email-template.md](contracts/email-template.md).

---

## References

- [Webhook payload schema](contracts/webhook-payload.schema.json)
- [Email template contract](contracts/email-template.md)
- [Data model](data-model.md)
