<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Listings, categories and prices live in the database; public pages read them through `src/lib/catalog.functions.ts` + `catalog-queries.ts`, and `src/data/catalog.ts` keeps only shared vocabulary/types so there is one source of truth.
- Quantity and auction rules live in pure modules (`src/lib/quantity.ts`, `src/lib/auction.ts`) covered by `src/lib/rules.test.ts`; the server must reuse the same rules when added.
- Demo auction end times are computed client-side from page open (`src/lib/demo-clock.ts`) to avoid SSR hydration mismatches.
- `/annonces` uses folder-style leaves (`annonces.index.tsx`, `annonces.$id.tsx`) with no layout parent, so detail pages render standalone.
- UI copy is colocated as `{ ar, fr, en }` objects rendered with `t()` from `useI18n()`; the language lives in a cookie read in the root `beforeLoad` so the server renders the right `lang`/`dir` (no hydration flash).
- Admin screens live in `src/components/admin/` behind `/admin`; every admin server function re-checks the admin role (`assertAdmin`), the UI check (`useIsAdmin`) is display-only.
- Listing photos upload from the browser to the private `listing-photos` bucket under `<userId>/…` (storage policies enforce the folder) and are shown via signed URLs; private query keys start with `me` or `admin` so sign-out can drop them.
- Pages that need an account live under `src/routes/_authenticated/` (client-only guard redirecting to `/connexion?redirect=`), so adding a protected page is just a new file there.
- The backend is the owner's own Supabase project (not Lovable Cloud), set by the public URL/publishable key in `.env`; server code reads `process.env` first and falls back to the `VITE_` values so the published worker still reaches it. Schema changes are applied by the owner with the SQL export, since no migration tool is attached.
- Brand logos and demo listing photos are bundled with the app (and CDN demo-photo links map back to the bundled copies in `resolveImage`), because the site is also hosted outside Lovable where `/__l5e/` asset links do not resolve.
