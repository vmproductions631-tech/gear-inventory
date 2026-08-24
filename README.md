# Gear Inventory

A mobile-first web app for tracking where a video production company's camera
gear physically is — who has it, what job it left on, and when it's due back.

## The problem

A production company's gear lives in a van, a storage unit, three crew
members' cars, and occasionally a client's venue. The usual answer is a
spreadsheet, which fails for a specific reason: updating it requires being at
a computer, and gear moves when you are standing in a parking lot at 6am
loading a van. So the spreadsheet goes stale, and the real inventory lives in
somebody's memory until the day a lens doesn't come back and nobody can say
where it was last seen.

This app is built for the parking lot. Every item carries a QR label; scanning
it opens that item's page, and changing its status is one tap. Because the
cost of updating is near zero, the record stays true — and every transition is
written to an append-only log, so "where was this last seen" always has an
answer.

## Architecture

A Next.js App Router front end talking straight to Postgres via Supabase.
There is deliberately no API layer of my own: the browser holds only the
anon key, and **all** authorization is Postgres row-level security. Photos go
to a private storage bucket and are read back through short-lived signed URLs
rather than public links.

```
  Phone / desktop browser
          |
  +-------v-----------------------------+
  |  Next.js App Router (static + RSC)   |
  |   /scan  /i/[code]  /items  /kits    |
  |   /loadouts  /rentals  /people       |
  +-------+-----------------------------+
          | supabase-js, anon key + user JWT
  +-------v-----------------------------+
  |  Supabase                            |
  |   Auth ....... email/password -> JWT |
  |   Postgres ... RLS on every table    |
  |     policy -> app_private.is_operator|
  |   Storage .... private photos bucket |
  +--------------------------------------+
```

The data model is seven tables. `items` is the spine; `status_log` is an
append-only audit trail of every move; `kits` group items that travel
together; `loadouts` are a batch checkout ("these 14 things are going out on
Friday"); `rentals` cover gear leaving with a client; `people` are the crew a
item can be assigned to. Full DDL is in
[supabase/schema.sql](supabase/schema.sql).

## The genuinely hard part

There is no server, which means the UI cannot be trusted and there is nowhere
else to put authorization. Anyone can open the browser console and issue
arbitrary `supabase-js` calls with the anon key — that key is in the JavaScript
bundle by design. So the security model had to be one where the client holding
the key gains nothing.

Every table is RLS-protected by a single policy calling
`app_private.is_operator()`, a `SECURITY DEFINER` function that checks the
caller's JWT email against an allowlist. Two details matter:

- It is declared `SET search_path = ''`. Without that, a `SECURITY DEFINER`
  function can be hijacked by a caller who puts a malicious schema earlier in
  their search path and shadows a function it calls — a privilege-escalation
  class that is easy to miss because the function looks correct.
- The allowlist lives in the database, not in the app. There is no
  "if (user.isAdmin)" anywhere in the front end, because a check in the front
  end would be advisory. An unauthorised session gets empty result sets from
  Postgres itself, and the UI simply renders nothing.

The practical consequence is that the front end is free to be naive. It asks
for everything and displays what comes back; the database decides what that
is.

## What I'd do differently

1. **Status changes are two writes, not one.** `setItemStatus()` updates
   `items` and then inserts into `status_log` as separate statements
   ([lib/actions.ts](lib/actions.ts)). If the second fails, the item has moved
   with no audit row — precisely the failure the audit trail exists to
   prevent. This belongs in a Postgres function called over RPC so both writes
   land in one transaction.
2. **Batch checkout is a sequential loop.** `confirmCheckout()` awaits
   `setItemStatus` per item, so a mid-loop failure leaves a loadout half
   checked out. Same fix: one RPC that takes the item list.
3. **The operator allowlist is a hardcoded array in a SQL function.** Fine for
   three people; it should be a table with its own RLS policy before it is
   ever a fourth.
4. **No tests.** The status machine is a state transition table with real
   invariants — an item is in exactly one place, retired is terminal — and
   that is exactly the shape of thing that should be property-tested rather
   than clicked through.
5. **No offline support.** The app is used in places with bad signal, which is
   the strongest argument for making it a real PWA with a write queue rather
   than the install-to-homescreen manifest it has today.

## Setup

Requires Node 20+ and a free Supabase project.

```bash
git clone <this-repo>
cd vmp-gear-inventory
npm install
```

**1. Create the database.** In your Supabase project, open the SQL Editor and
run [supabase/schema.sql](supabase/schema.sql). Before running it, edit the
email addresses in `app_private.is_operator()` — those are the accounts that
will be allowed in. Everyone else gets empty tables.

**2. Configure the app.**

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
Supabase → Project Settings → API. Do not put the `service_role` key here; it
bypasses RLS, which is the entire security model.

**3. Run it.**

```bash
npm run dev
```

Open <http://localhost:3000>, create an account with one of the allowlisted
emails, and add an item. Its detail page has a printable QR label.

## Notes on this public version

- The two brand typefaces used in the original are commercially licensed and
  are not redistributable, so this version substitutes Archivo (OFL) and
  Permanent Marker (Apache-2.0), which the stylesheet already named as
  fallbacks. Nothing else about the design changed.
- Crew names and client names in the original have been replaced with generic
  roles and examples.

## Licence

MIT for the source — see [LICENSE](LICENSE). The Vision Maker Productions
logo files under `public/brand/`, `app/favicon.ico`, and the app icons are
trademarks and are **not** covered by that licence; replace them with your own
if you fork this.
