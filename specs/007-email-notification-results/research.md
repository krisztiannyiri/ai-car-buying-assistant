# Research: Email Notification for Car Search Results

**Branch**: `007-email-notification-results` | **Date**: 2026-08-06

## Decision Log

### D-001: Conditional Branching Node

**Decision**: Use the **IF node** (`n8n-nodes-base.if`) for the results-count gate.

**Rationale**: The IF node produces two explicit named outputs (true / false), making the routing visible and testable. The false branch is wired to a No Operation node to terminate cleanly with a successful execution status. The Filter node was considered but rejected — while it stops the chain when the condition is not met, it does not produce an explicit false branch, making the "no results → skip email" path implicit and harder to observe.

**Alternatives considered**: Filter node — rejected because it offers no false-branch output.

---

### D-002: Email Sending Node

**Decision**: Use the **Send Email node** (`n8n-nodes-base.emailSend`, v2.1, SMTP mode).

**Rationale**: Provider-agnostic; works with any SMTP relay (Gmail SMTP, SendGrid, AWS SES, custom mail server). The Gmail OAuth2 node (`n8n-nodes-base.gmail`) was considered but rejected — it requires OAuth2 credential setup for a single Google account, adding unnecessary coupling to one provider.

**Prerequisite**: No SMTP credentials exist in the n8n instance at the time of this plan. An SMTP credential must be created in n8n Settings → Credentials before the workflow can be deployed. The credential must be named clearly (e.g. `Car Buying Assistant SMTP`) and referenced in the Send Email node.

**Alternatives considered**: Gmail node — rejected due to provider lock-in and OAuth2 overhead.

---

### D-003: Non-Blocking Email Failure

**Decision**: Enable the **"Continue on Fail"** setting on the Send Email node. Wire its error output to a Set node (`Record Email Warning`) that stamps `emailWarning: true` and `emailWarningMessage: <error>` onto the output item.

**Rationale**: "Continue on Fail" is the built-in per-node setting for non-blocking steps in n8n — no Code node try/catch required. Wiring the error output to a Set node makes the warning visible in the execution log and in the workflow's final output, satisfying the spec requirement to record the omission.

**Alternatives considered**: Code node try/catch — rejected as unnecessary complexity when a native node setting achieves the same outcome.

---

### D-004: HTML Email Template Structure

**Decision**: Table-based layout, XHTML 1.0 Transitional DOCTYPE, all styles inline, UTF-8 encoding, max content width 600 px.

**Rationale**: Table-based layout is the only reliably cross-client structural primitive for HTML email. CSS flexbox and grid are broken or unsupported in Outlook (Word rendering engine) and older mobile clients. Gmail strips `<style>` blocks in some views (forwarded mail, mobile app), so all critical spacing and color must be inline. XHTML 1.0 Transitional DOCTYPE avoids Outlook quirks mode that HTML5 `<!DOCTYPE html>` triggers.

**Key declarations required**:
```html
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"
  "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
</head>
```

The `€` currency symbol is safe as a literal character with UTF-8 declared.

**Alternatives considered**: HTML5 DOCTYPE — rejected due to Outlook quirks mode. External stylesheet — blocked by all major email clients.

---

### D-005: Car Card Visual Design

**Decision**: Each car listing is rendered as a bordered card with: (a) a narrow colored left-accent `<td>` for visual separation, (b) a header row showing make/model/year left-aligned and price right-aligned, (c) a two-column spec grid (label / value pairs), and (d) a features line using bullet separators (`&bull;`).

**Rationale**: The left-accent `<td>` (a narrow cell with a background color) is the most reliable way to render a colored left border in Outlook — CSS `border-left` is ignored on `<td>` elements in Outlook. Two-column spec grids maximize scannability for attribute-heavy content.

**Null/missing value handling**: Every spec row is always rendered. Missing values display as `<span style="color:#9ca3af; font-style:italic;">Not specified</span>`. An empty features array displays as `<span style="color:#9ca3af; font-style:italic;">No additional features listed</span>`.

---

### D-006: userEmail Capture in the Next.js App

**Decision**: Add `userEmail: string | null` to the `CarSearchPayload` TypeScript interface. Capture the email address via a pre-chat input field in the chat UI. Pass it through the chat API route to `fireWebhookWithRetry` and into the n8n webhook payload.

**Rationale**: The email address is a session-level input from the user — it is not something the AI assistant should request mid-conversation, as that would inject a PII collection moment into the expert advisor dialogue. A pre-chat input ("Enter your email to receive car recommendations") is the simplest, most transparent UX pattern and keeps the AI conversation unaffected.

**Source files affected**:
- `lib/types/n8n.ts` — add `userEmail: string | null` to `CarSearchPayload`
- `app/api/chat/route.ts` — read `userEmail` from the request body, include in the webhook payload
- `components/ChatInterface/` — add an email input field shown before the first message is sent

**Alternatives considered**: AI asks for email mid-conversation — rejected; introduces PII collection into the advisor flow. Hardcoded environment variable — rejected; only works for a single recipient. User profile store lookup — rejected per clarification (option A chosen: email comes from payload).
