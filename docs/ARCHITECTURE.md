# Architecture

Nore is a static site: Astro renders every page to HTML at build time, and Preact islands add behaviour only
where there is state. There is no server. The cart lives in the visitor's browser.

## Principles

- **HTML first.** Every page reads and browses without JavaScript. Islands enhance; they do not gate content.
- **Logic is pure and tested.** Anything that decides a number, a rule or a pattern lives in `src/lib`, takes
  plain values and returns plain values, and has unit tests next to it.
- **Never trust what was stored.** A cart or a subscription read back from storage is parsed field by field.
- **No raster images.** Every bag, illustration, chart and pattern is SVG drawn in code.
- **A strict Content-Security-Policy.** Nothing inline runs or styles the page without a hash, and nothing is
  fetched from another origin.

## Module map

```text
src/
  lib/                 Pure logic. No DOM, no storage, no framework.
    money.ts           Integer paise: construction, arithmetic, percentages, Indian digit grouping
    prng.ts            Seed normalising, a 32-bit hash and a seeded generator (mulberry32)
    catalog.ts         Product types and labels, with no validation library, so islands can import them
    catalog-schema.ts  The zod schema for a product, typed against catalog.ts (build time and tests only)
    products.ts        The range: eight products as typed data
    pricing.ts         Sizes (1.9x and 3.6x), variants for any product, price per cup at 10 g a cup
    cart.ts            Cart state and its reducer: add, set quantity, remove, undo, coupon, clear
    cart-storage.ts    Parsing a stored cart, line by line
    totals.ts          Priced lines, the BYTWO coupon, shipping and progress, the totals
    pin.ts             PIN-code checks and delivery estimates from Bengaluru
    brew.ts            The filter-coffee calculator and ratio cards
    subscription.ts    Subscriber prices, cadences, and the draft handed to checkout
    checkout.ts        The checkout's validation rules, states and union territories, order numbers
    contrast.ts        WCAG luminance and contrast, and choosing ink for an accent
    paths.ts           Every internal link goes through href(), so any base path works
    kolam/             The generator (see below)
  brand/               The identity as data: palette.ts, marks.ts, kannada.ts
  content.config.ts    The products collection: products.ts, validated by catalog-schema.ts at build
  data/catalog.ts      The only code that calls astro:content; returns the range in house order
  stores/cart.ts       $cart (persistent), $totals and $itemCount (computed), $drawerOpen, dispatch()
  components/
    brand/             Mark, Logo, Kolam, Pouch
    illustrations/     Pull (the home page scene), BrassFilter
    layout/            SiteHeader, SiteFooter
    islands/           Cart, CartContents, CartPage, ProductOptions, ShopFilters, CheckoutForm,
                       OrderConfirmation, SubscribeBuilder, BrewGuide, KolamGenerator
    ProductCard.astro, TasteProfile.astro
  layouts/BaseLayout   <head>, preloads, the early script, header and footer
  pages/               /, shop, coffee/[id], cart, checkout, checkout/done, subscribe, brew, brand,
                       case-study, 404
  styles/              tokens, fonts, base, islands, transitions
  fonts/               Subset font files made by scripts/subset-fonts.py
tests/brand.test.ts    Palette parity, accent inks, view-transition names, the Kannada allow-list
e2e/                   Playwright, against the production build under the sub-path
scripts/               subset-fonts.py, screenshots.mjs, wasm-fallback.ts
```

## Rendering

- `output: 'static'`, `site: 'https://darshanpawar7.github.io'`, `base` from `BASE_PATH` (default
  `/nore-coffee/`), `trailingSlash: 'always'`.
- Islands hydrate with the lightest directive that works: `client:load` for the cart, the product options,
  the shop filters, the checkout and the builder; `client:visible` for the brew guide and the kolam generator.
- Stylesheets are inlined (`build.inlineStylesheets: 'always'`): a few kilobytes each, and one round trip
  fewer before the first paint. Astro's `security.csp` hashes every inline script and style into the page's
  CSP `<meta>`, so `style-src` and `script-src` still allow nothing else.
- Nothing is inlined as a `data:` URL (`assetsInlineLimit: 0`): a small font inlined that way was blocked by
  `font-src 'self'`.
- One inline script runs first in `<head>`. It marks `<html>` with `js`, so notes meant for visitors without
  JavaScript stay hidden. It also quiets the promise rejections of page transitions the browser skips.
- Bags morph from card to product page through native cross-document view transitions: `@view-transition`
  in CSS and one `view-transition-name` per product in `styles/transitions.css`. There is no client router.
  This also matters because Astro's CSP support does not cover its `<ClientRouter />`.

## Islands and state

| Island              | Page              | State it owns or reads                           |
| ------------------- | ----------------- | ------------------------------------------------ |
| `Cart`              | every page        | the count, the drawer (a modal `<dialog>`)       |
| `CartContents`      | drawer, cart page | `$cart`, `$totals`; dispatches cart actions      |
| `ProductOptions`    | product           | size, grind, quantity; dispatches `add`          |
| `ShopFilters`       | shop              | roast, process, method, sort; mirrors the URL    |
| `CheckoutForm`      | checkout          | fields, validation, the error summary, the order |
| `OrderConfirmation` | checkout/done     | the last order, from session storage             |
| `SubscribeBuilder`  | subscribe         | the three steps; hands a draft to checkout       |
| `BrewGuide`         | brew              | cups, strength, the drip timer                   |
| `KolamGenerator`    | brand             | the typed word, the accent, the download         |

- `$cart` is a `persistentAtom` in local storage. It survives reloads and navigations, and the storage
  event keeps open tabs in step. Its decoder is `parseCartState`, so anything read back is validated.
- `$totals` and `$itemCount` are computed stores over the pure functions in `lib/totals.ts`. Islands never
  work out a price.
- A cart line holds `productId`, `variantId`, `grind` and `quantity`, never a price.
- The shop's cards are build-time HTML. `ShopFilters` hides, shows and re-appends the real nodes, so reading
  order and visual order always agree, and without JavaScript every card shows.
- Islands render a placeholder until mounted wherever the server cannot know the answer (the cart count,
  the cart page, the checkout), so hydration never disagrees with the HTML.

## Domain rules

- **Money** is integer paise. Size multipliers and discounts are whole percentages applied with integer
  arithmetic; halves round away from zero, so a refund mirrors its charge. Indian digit grouping is written
  by hand, so the build and every browser print the same string.
- **Variants.** A bag comes in 250 g, 500 g (1.9x) and 1 kg (3.6x); the decoction is one bottle.
- **BYTWO** takes 10% off the subtotal when the cart holds two or more bags of coffee (the bottle is not a
  bag). A refused code comes back with a reason the drawer shows.
- **Shipping** is free from ₹999, judged before any coupon, so a coupon never takes it away; otherwise ₹60.
- **PIN codes** are six digits. A first digit of 5 or 6 is one to three days from Bengaluru; 9 is the Army
  Postal Service and is not served; 0 does not exist; the rest is four to seven days.
- **Brew maths.** Ten grams of powder and sixty millilitres of water a cup. Wet grounds keep twice their weight
  of water, and strength sets the decoction-to-milk ratio: 1:4, 1:3 or 1:2.
- **Subscriptions** are 90% of the bag price, with free shipping; fortnightly means two deliveries a month.

## The kolam generator

`kolam(seed, options)` returns `{ paths, dots, viewBox }`, plus the construction (`strokes`, `openGates`)
for diagrams and tests.

1. **Seed.** The name is normalised (NFKC, trimmed, lower-cased, inner spaces collapsed), hashed to 32 bits
   and fed to mulberry32. The same name always draws the same kolam.
2. **Arrangement.** The first draw picks a 5 × 5 square, a 1-3-5-3-1 diamond or a 1-3-5-7-5-3-1 diamond.
3. **Lattice.** Every point lies on an integer lattice of quarter dot-spacings: a dot at `(4i, 4j)`, its
   ports on the diagonals at `(4i ± 1, 4j ± 1)`, and the gate between two neighbours at their midpoint. Whole
   numbers make every lookup and every invariant exact.
4. **Gates.** A gate's state is stored under `(|x|, |y|)`, so one draw decides all four of its mirror images:
   symmetry across both axes is a property of the data. Mirroring across the diagonals too was tried, but it
   leaves only about sixty kolams per arrangement, too few for every coffee to have its own. A dot left with
   every gate closed gets one opened, so no dot sits alone inside its own circle.
5. **Strokes.** A closed side gets a quarter circle of radius √2 lattice steps around the dot, joining its two
   ports. An open side gets two straight half-lines from those ports to the gate. Every port ends exactly two
   strokes, both along the same tangent.
6. **Loops.** The two half-lines through a gate are joined into a crossing, and the walk traces the segments
   into closed loops: one SVG path each, so joins are round and one dash animation draws each loop.

The tests check determinism, symmetry across both axes, two strokes at every port, crossings only between
two real dots, closed loops, and a different kolam for every product.

## Identity in code

- **Tokens.** `styles/tokens.css` holds the palette and the eight accent classes (`accent-monsoon` sets
  `--accent` and `--accent-ink`). `brand/palette.ts` holds the same values for swatches and SVG. A test fails
  if they differ, or if an accent's ink is not the one with better contrast.
- **Type and fonts.** `scripts/subset-fonts.py` writes the font files:
  - Anek Latin's Latin file as published, since the hero needs its width axis;
  - a 1.8 KB file holding only the rupee and minus signs;
  - Anek Kannada cut to the glyphs of the three words, pinned to the one width the identity uses (9.7 KB);
  - Newsreader's weight-only file.
- **Kannada.** `brand/kannada.ts` holds the three words the brand may use, and the font script reads them
  from there. A test scans the source and fails on any other Kannada.
- **Components emit SVG.** `Mark`, `Kolam`, `Pouch`, `TasteProfile`, `Pull` and `BrassFilter` take colour from
  `currentColor` and custom properties, never from inline `style` attributes, which the CSP would block.

## Accessibility

- Native elements first: a modal `<dialog>` for the cart, radio groups for sizes and choices, `<progress>`
  for free shipping, a real `<select>` for grind and state.
- The checkout's error summary takes focus and links to each field; fields carry `aria-invalid` and point to
  their messages with `aria-describedby`.
- Live regions announce the shop's count, what was added to the cart, delivery estimates and the timer.
- Every animation stops under `prefers-reduced-motion` and leaves the finished picture.
- End-to-end tests run axe on every page, buy a coffee by keyboard alone, and check that no page scrolls
  sideways on a phone.

## Key decisions

| Decision                                           | Rejected                          | Why                                                                                                    |
| -------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Astro static output with Preact islands            | A single-page app                 | Mostly content. HTML-first pages load fast and work without JavaScript; only stateful widgets pay.     |
| Prices looked up from the catalogue on every total | Prices stored in cart lines       | A stored cart outlives price changes; looking prices up removes a whole class of stale-data bugs.      |
| Integer paise and whole percentages                | Floating-point rupees             | 10% of ₹798 is ₹79.80. Integers make that exact and comparable.                                        |
| Symmetry by canonical gate key                     | Generating a grid, then mirroring | One source of truth per orbit; the symmetry test cannot fail by construction.                          |
| Native cross-document view transitions             | Astro's `<ClientRouter />`        | No router script, and it works with Astro's CSP.                                                       |
| Subset fonts, live text                            | Outlined wordmark paths           | Subsetting brought the fonts from 615 KB to 171 KB and keeps the wordmark selectable, searchable text. |
| Types without zod in the browser                   | Inferring types from the schema   | The schema stays at build time; the islands ship without a validation library.                         |

## How to extend

- **Add a coffee.** Add it to `src/lib/products.ts`. The schema rejects a missing or mistyped field at build
  time. Add its line to `styles/transitions.css` (a test names any missing one); its kolam, pouch and card
  follow from the name and the accent.
- **Add an accent.** Add it to `ACCENTS` in `lib/catalog.ts`, to `brand/palette.ts` and to `styles/tokens.css`;
  the parity test names whichever is missing.
- **Add a coupon.** Add a rule to `checkCoupon` in `lib/totals.ts`, with tests. The reducer does not change.
- **Add a kolam arrangement.** Add rows to `lib/kolam/arrangement.ts`. Any odd, mirrored set of rows works with
  the rest of the pipeline unchanged.
