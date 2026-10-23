[![CI](https://github.com/Pramaan-OSS/scheduling/actions/workflows/ci.yml/badge.svg)](https://github.com/Pramaan-OSS/scheduling/actions/workflows/ci.yml)

# Scheduling

Scheduling is a booking product for sharing availability, managing event types and appointments, and working with teams. It uses a neutral glass theme, local fonts and application-owned accounts. Outside services go through one Pramaan client.

## Quick start

Install Docker with Docker Compose, then run:

```sh
cp .env.example .env  # paste your PRAMAAN_API_KEY into .env
./start
```

Open the address printed by the command (normally http://localhost:3000) and use managed social or email sign-in. Local password sign-in remains available when no key is set or managed setup is unavailable. Startup chooses the next free port if that one is busy. No other runtime or account is required. Startup runs the production build; development mode compiles new routes on demand and is slower. The command builds the included client and app, starts the local database and cache, applies migrations, and generates private session, encryption and database secrets in .env. It prints their location, never their values. Keep .env and the database volume together when backing up; losing the encryption key loses access to encrypted private links. Re-running preserves existing secrets and data. Stop with `docker compose down`; this preserves data volumes.

Without a key the app still starts and says “Add PRAMAAN_API_KEY to .env”. Your own connected sign-in, subscription plans, custom domains and bot checking remain optional and off until configured; the commented Optional section lists their settings. The settings screen explains them. The app installs the published `@pramaan/sdk@0.1.0` package; no registry account is needed. For local fake checks only, PRAMAAN_FAKE=1 returns fixture calendar reads and refuses other outside actions without making any network request.

Sign-in and the managed database are provided through Pramaan in test mode. Managed sign-in is prepared on startup with a key, without another account or client setup. Setup uses saved request identifiers; a refusal prints a plain reason while local sign-in stays available. Local development addresses need no domain registration; a public HTTPS app address is registered automatically. Email sign-up and social sign-in open the app's own session only after a server token check and a matching signed subject; the email comes from that verified token. Existing local accounts are never merged by matching email. Managed accounts start as ordinary users; for first-time application administration, use “Set up a local administrator” before creating managed users. Managed email sign-up, email sign-in, token verification and sign-out have been checked with a disposable local account. Social sign-in and the managed database still need a live deployment check. A first start with a key requests it automatically; while unavailable, startup says it is using the bundled database. Connection addresses are saved privately under `.runtime` and never printed. Back up `.runtime` together with `.env` and database volumes. A saved local choice is retained to preserve existing bookings; moving to a managed database later requires an explicit data migration. If provisioning has an uncertain result or its one-time credentials are missing, startup stops instead of issuing another request or opening an empty database.

## What works without a key

Local sign-in, event types, working hours, booking pages and application-owned booking data work without a key. Outside actions require a configured key and explain that requirement. Tests use a fake client, not a live account.

Email, messages, payments, billing, connected sign-in and primary-calendar operations use Pramaan capabilities. Reviewed booking outcomes and contact actions show an estimate before the agent confirms an outside action. An uncertain result must be checked before retrying. Contact action inputs are checked against the action description; unsupported required fields are refused rather than guessed. These integrations have not been proven against a live account.

## Current limits

Choose up to twenty calendars from the exact names shown in calendar settings. Busy-time checks combine those calendars on one owned connection; this contract is adopted, not proven live. Booking writes still use the primary calendar. Older servers can only fall back for primary-calendar checks; any other failed check cannot confirm availability. Pasted meeting links are the default. A host may connect their own meeting app and approve room creation per event type, with a pasted HTTPS link as fallback. Guest links enter the booking, invitation and calendar; private host links are encrypted and visible only to their owner. Room and recording contracts are adopted, not proven live. Recordings appear only when the connected app and file storage return a ready file; automatic recording and browser calling stay off.

Short links are off by default. A host may connect their own short-link app in calendar settings, review the access granted and enable it for booking sharing and text messages. Product URLs remain the fallback. Saved links can be checked and their aggregate clicks read; destination changes and permanent deletion require explicit approval. Uncertain requests must be checked in the connected account before further action. This contract is adopted, not proven live.

Booking emails include details and a calendar invitation for confirmation, rescheduling and cancellation. This contract is adopted but not proven live; an older server refusing invitations or reporting them unavailable gets one expiring download-link fallback. Uncertain sends must be checked before retrying. Paid bookings send the `PRAMAAN_TAX_CATEGORY` setting, defaulting to `digital_products`, on both payment-link and checkout creation. Supported overrides are `saas`, `e_book`, `edtech` and `live_tutoring`; choose the classification appropriate for your offer. Booking payments use hosted payment links, with checkout as the fallback only after a definite unavailable or connection-required answer. This updated contract is adopted, not proven live. The product emails its own stable payment page; Check payment obtains a fresh hosted link and confirms captured money. Existing checkout records retain their original read path. Older records without a saved platform reference must be checked outside the product. Cancelling a booking does not close its hosted payment request; check any later payment outside the product. Paid-booking refunds require host approval in booking details. Full and partial refunds need a captured payment reference; this contract is adopted but not proven live. A pending receipt does not confirm completion. Missing references, older servers refusing them and unavailable services require refunding outside the product. Uncertain requests must be checked before further action. Automatic refunds, stored cards and no-show charges stay off. Directory synchronization, automatic contact writes, paid add-ons and hosted reporting are removed. Bot checking is off by default. Enabling it needs the builder’s own widget account and a way to collect its challenge token; the platform verifies a supplied token only. Capabilities that are not available yet show a plain message.

## Checks

```sh
PRAMAAN_API_KEY='' bun test packages/pramaan/tests
REDIS_URL='' PRAMAAN_API_KEY='' TZ=UTC yarn vitest run
PRAMAAN_API_KEY='' yarn workspace @scheduling/web build
```

Use a separate disposable database for browser checks. Never use real customer data or a real key in tests.

## Connected accounts

Connecting an outside account, such as a calendar or meeting app, carries a monthly Pramaan charge for each connected
account, billed to the Pramaan account behind `PRAMAAN_API_KEY`. Signing in is free. Disconnecting an account ends its
charge.

Email defaults to `Scheduling <noreply@updates.pramaan.one>` through Pramaan. Set `EMAIL_FROM` only to override its address with an allowed sender. Bookings still work when optional delivery is unavailable, and their details stay available in the product. A saved booking stays saved if its notification fails; check delivery before sending again. Confirmation pages do not claim that an email was delivered.

The template does not include operator policy pages. To show your own policy links on booking and sign-up forms, set both `NEXT_PUBLIC_WEBSITE_TERMS_URL` and `NEXT_PUBLIC_WEBSITE_PRIVACY_POLICY_URL` to your published pages. They are optional for local startup.

## Built on and licence

Built on [Cal.diy](https://github.com/calcom/cal.diy), an MIT-licensed booking product. Original notices are retained in `LICENSE-ORIGINAL` and `NOTICE`. This template is distributed under AGPL-3.0; see `LICENSE`.

For the headless regression checks, create a separate local database with a name ending in `_fixture`, set both database addresses to it, apply migrations and run `bun tests/review/seed.ts`. Build and start the web app at `http://127.0.0.1:3107` with an empty key, a test session secret and a 32-character test encryption key. Then run `yarn playwright test --config tests/review/playwright.config.ts`. The seed refuses a remote or non-fixture database; browser requests to other hosts are blocked. Temporary fixtures and results stay under `.runtime/`.
