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
{"Meijer":      {"bellpep": {"p": 1.29, "at": "2026-11-10T10:00", "name": "Meijer green bell pepper, each"}},
 "Kroger":      {},
 "Target":      {},
 "Aldi pickup": {}}
```

- `p` is the price for **one** of the app's packs (Foods tab `pl`, e.g. "1 lb", "each", "15.25 oz can").
  The app multiplies by `packs`.
- Reuse a price if `at` is under 7 days old; only look up missing or stale items.
- Aldi pickup = Instacart price. The app estimates Aldi in store at 12% less.
