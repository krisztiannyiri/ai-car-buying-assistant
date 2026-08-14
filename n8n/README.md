# n8n workflow

`car-search-workflow.json` is an export of the live **Car Search Logger** workflow — the
one the MCP server calls at `POST /webhook/car-search`. Before this file existed the graph
lived only inside the `n8n_data` Docker volume, so losing the volume lost the workflow
(ARCHITECTURE.md gap 3).

## Restoring after a volume reset

1. `docker compose up -d` and open http://localhost:5678.
2. **Workflows → ⋯ → Import from File** → pick `car-search-workflow.json`.
3. Recreate the two things the export cannot carry:
   - **SMTP credential** for the `Send Results Email` node (spec 007 T001). Without it the
     node fails, but `onError: continueErrorOutput` routes to `Record Email Warning`, so the
     search still returns results.
   - **Data Store** `car_listings` with its 12 seed rows. Columns and enums are specified in
     `specs/005-webhook-db-search/contracts/car-search-data-store.md`. The imported
     `Get Car Listings` node references data table id `mj0YdKHUlNanTFsA`; repoint it at your
     new table if the id differs.
4. Activate the workflow.

## Re-exporting after a change

Edit in the n8n UI, then **⋯ → Download** and replace this file, so the committed copy stays
the source of truth. Keep ARCHITECTURE.md §7 in sync with the node graph.

## Known state

`Log Query` is present but unconnected — a leftover from spec 003 that no longer runs. It is
kept in the export so an import reproduces the live graph exactly; delete it in the UI and
re-export when convenient.
