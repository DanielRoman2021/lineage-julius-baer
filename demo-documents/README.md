# Demo documents

Sample client document packs you can upload to try the onboarding and the agent
verification flow. The figures and entities in these PDFs are made up for the
demo; the watchlists they match are the bundled mock screening lists, not real
sanctions data.

## How to use

1. Open the app and create a client from the UI (RM cockpit, new client).
   Name it to match the folder so the documents read consistently.
2. Open the client and upload all the PDFs in that folder.
3. Run the pipeline. The wealth figure is read from the documents, and any
   screening match is routed to a human (Compliance) to review and clear.

## Packs

### `tomas-berg/` — sanctions counterparty flag
Suggested client name: **Tomas Berg**. A commodities and freight entrepreneur,
net worth about CHF 140 million. The source-of-wealth and company documents name
**Northbridge Maritime FZE**, a counterparty on the sanctions and adverse-media
lists, so the KYC text screen raises a sanctions flag routed to Compliance. The
documents explain it was an arm's length 2015 to 2017 freight counterparty the
client exited in 2018, before the 2021 listing, so the officer can review and
clear it as immaterial.

### `claudia-moser/` — adverse-media investor flag
Suggested client name: **Claudia Moser**. A renewable-energy founder, net worth
about CHF 120 million. The documents name **Meridian Energy Holdings Ltd**, a
former minority investor on the adverse-media list, so the screen raises an
adverse-media flag routed to Compliance. A softer, clearable flag than the
sanctions one above (the matter concerns the investor, and the stake was bought
back), good for showing the human-in-the-loop review.

## Already in the app
Two onboarding clients are pre-seeded and reachable by link, no upload needed to
exist (you still upload to run them):

- **Henrik Lindqvist** (`/onboard/henrik_lindqvist`) — a clean pass, nothing flagged.
- **Stefan Novak** (`/onboard/stefan_novak`) — a name-screen match to a sanctioned
  individual that Compliance reviews and clears as a name overlap.
