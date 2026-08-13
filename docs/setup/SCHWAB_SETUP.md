# Schwab Import Setup

Trading Journal supports a local, read-only connection to the Schwab Individual
Trader API. Every installation uses the installer's own Schwab Developer
credentials and authorization grant.

The Journal does not ship shared credentials, place orders, start an account
activity stream, or depend on another application.

## 1. Create a Schwab Developer Configuration

1. Sign in or register at [Schwab Developer Portal](https://developer.schwab.com/).
2. Create an Individual Developer application with access to Schwab's accounts
   and trading API product.
3. Configure this callback URL exactly:

   ```text
   https://127.0.0.1:5556
   ```

4. Wait until Schwab reports that the application is ready to use.
5. Copy the app key and secret. Do not commit or share them.

Schwab may change portal labels or approval steps. Follow the current portal
language when it differs from this guide.

## 2. Configure the Journal

From the Journal repository:

```bash
cp .env.example .env
```

Set these values in `.env`:

```text
SCHWAB_APP_KEY=your_app_key
SCHWAB_SECRET=your_app_secret
SCHWAB_REFRESH_TOKEN=
SCHWAB_CALLBACK_URL=https://127.0.0.1:5556
```

`.env` is gitignored. Keep it private and never paste its contents into issues,
logs, screenshots, or support messages.

## 3. Authorize

Open the Journal locally, choose **Import today's trades** or **Sync from
Schwab**, then select **Authorize Schwab**. The Journal opens Schwab consent in
the browser and updates the connection automatically when consent finishes.

The authorization flow starts a short-lived local HTTPS callback listener.
Because the certificate is local and self-signed, the browser may require you
to approve the localhost certificate before completing the callback.

After consent, the Journal updates only `SCHWAB_REFRESH_TOKEN` in this
repository's `.env`. Tokens, callback codes, and raw account identifiers are
never returned to the Journal UI. No Journal restart is required when
authorization starts from the in-app button.

For troubleshooting only, the equivalent terminal fallback remains:

```bash
npm run schwab:authorize
```

## 4. Verify

Open the Journal's Import modal and select **Sync from Schwab**. A successful
connection shows masked authorized accounts. Full account numbers, tokens, and
raw Schwab identifiers are never sent to the browser.

Choose a date range and select **Preview trades**. The preview is read-only.
Review the new and duplicate execution counts, then use the separate
**Import new executions** button to confirm the write.

Confirmed syncs are append-only:

- existing execution rows and import batches are never deleted;
- API fills already represented by a file import are skipped;
- later fills can update an existing open trade in place without changing its
  trade ID;
- notes, tags, attachments, setup, stop, and target data stay attached;
- ambiguous historical fills are skipped for review instead of changing an
  existing closed trade;
- unsafe forward reconciliation errors still roll back the attempted import.

Overlapping ranges are expected. Dates already in the Journal are skipped and
left unchanged while missing dates are appended. A historical gap is accepted
when its opening and closing fills form complete closed trades. An incomplete
historical position is not imported; the preview identifies the symbol and
links back to the Journal. If that trade is incomplete, upload a statement that
contains its full opening and closing fills.

Direct sync never re-imports or overwrites an existing closed trade. A future
repair workflow may offer that behavior only as a separate, explicit action.

## Reauthorization

If the Import modal reports that reauthorization is required:

1. Select **Authorize Schwab**.
2. Finish consent in the Schwab browser window.
3. Return to the Journal; it reloads the authorized account list automatically.

The terminal command in the troubleshooting section remains available if the
button cannot open the Schwab window.

## Troubleshooting

### Missing credentials

Confirm `.env` exists and contains non-empty values for:

- `SCHWAB_APP_KEY`
- `SCHWAB_SECRET`
- `SCHWAB_REFRESH_TOKEN`
- `SCHWAB_CALLBACK_URL`

### Callback does not complete

- Confirm the callback configured in the Schwab Developer portal exactly
  matches `SCHWAB_CALLBACK_URL`.
- Confirm port `5556` is not already in use.
- Complete any localhost certificate warning in the browser.

### Account list is empty

Re-run authorization and confirm the intended Schwab account was included in
the consent flow.

### API unavailable

File upload remains available. Schwab/ThinkorSwim statement CSVs can be used for
historical imports or temporary API outages.

## Removing Schwab Access

1. Revoke the application in Schwab.
2. Stop the Journal.
3. Remove the four `SCHWAB_*` values from `.env`, or delete `.env` if it
   contains nothing else.

No Schwab token or account number is stored in the tracked repository.
