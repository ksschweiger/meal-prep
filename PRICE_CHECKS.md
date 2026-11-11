# Price checks and carts (phase 2)

The app and the computer talk through two keys on the Data tab of the Meal Prep Database sheet.

## `priceJobs` (written by the app, updated by the computer)

```json
{"2026-11-11": {
  "status": "waiting",              // app sets "waiting"; computer sets "done" when prices are in
  "at": "2026-11-10T14:00:00Z", "by": "Kayla",
  "items": [{"f": "bellpep", "n": "Bell peppers", "pl": "each", "packs": 3, "cost": 3.87}],
  "cart": {"store": "Meijer", "status": "waiting", "at": "...", "by": "Kayla", "note": ""}
}}
```

- Tapping **Compare cost** (later **Recalculate**) snapshots the checked items into `items` with status `waiting`.
  The list is frozen only while calculating; after that it can change and be recalculated.
- Tapping **Build … cart** refreshes `items` to the currently checked items and adds `cart` with status `waiting`. The computer fills that store's cart for
  every item in `items` (store/generic brands unless the Pantry tab's "Name brand only" says otherwise),
  then sets `cart.status` to `done` and can leave a short `note` (e.g. "2 items out of stock").
- **Cancel** (while calculating) deletes the job.

## `prices` (written by the computer)

```json
{"Kroger":      {"bellpep": {"p": 1.25, "at": "2026-11-12T10:00", "name": "Kroger green bell pepper, each", "id": "0000000004065"}},
 "Meijer":      {"bellpep": {"p": 1.29, "at": "2026-11-12T10:00", "name": "Meijer green bell pepper, each"}},
 "Aldi pickup": {}}
```

- `id` (Kroger only) is the UPC used to fill the Kroger cart.

- `p` is the price for **one** of the app's packs (Foods tab `pl`, e.g. "1 lb", "each", "15.25 oz can").
  The app multiplies by `packs`.
- Reuse a price if `at` is under 7 days old; only look up missing or stale items.
- Aldi pickup = Instacart price. The app estimates Aldi in store at 12% less.

## Stores (decided Nov 11, 2026)

- **Kroger** – Rochester Hills, 65 S Livernois (location 01800492). Official Kroger API through
  `kroger_connect.py` on Kaleb's PC. Prices, stock and **automatic cart filling**.
- **Meijer** – Rochester Hills - S Adams Rd (3610 Marketplace Cir). Price lookups in Chrome, signed out.
  Cart is built by hand in the Meijer app.
- **Aldi pickup** – ALDI - WEB 141 - Rochester Hills (2636 S Adams Rd). Price lookups on aldi.us, signed out.
  Cart is built by hand.
- Target dropped for now. Meijer, Aldi (and Instacart) and Target terms all bar automated/agent access;
  Kaleb chose signed-out, low-volume lookups for Meijer and Aldi knowing that. Only Kroger permits it (API).
- The PC side is the scheduled task "Grocery price check" (hourly, 7 AM–10 PM ET) running on Kaleb's PC.

## Speed rules (decided Nov 9, 2026)

- **Kroger** uses the official Kroger API (developer key), not the browser.
- **If runs are too slow** (target: under ~15 min), turn on the cheap-item cutoff: items whose estimated
  line cost is under the cutoff (start at $3) are priced at one store only and copied to the others;
  only items at or above the cutoff are compared everywhere. Setting: `settings.cheapCutoff` (off when unset).

## Notifications

- When a price check finishes (`status` → `done`) or a cart is built (`cart.status` → `done`), the computer
  sends a push right away through the Notification Hub's senders (ntfy for Kayla, Bark for Kaleb), to the
  person in `by`: "Grocery prices are in" / "Your Meijer cart is ready — open the app to submit".
- Sent directly from the computer, not through the hub's hourly queue, so it isn't delayed up to an hour.

## Metrics (`shopLog`, written by the app; the computer may add fields)

Each cart build appends `{trip, at, by, store, recommended, totals:{store: $}, items, cost}`.
The computer adds `actual` (receipt total) when a receipt photo comes in.
Planned uses: store pick share and whether the recommendation was followed (prioritize the usual store
in price checks), estimate vs. receipt accuracy, item price trends from `prices` history, and savings to date.
