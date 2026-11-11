# Architecture

Nore is a static Astro site: a brand identity, a storefront and a case study for a concept
filter-coffee roaster. Every page is plain HTML and CSS first. Small Preact islands add the parts
that hold state (cart, product options, filters, the subscription builder, the brew timer, the kolam
generator). All pricing, cart and pattern logic lives in framework-free TypeScript that never touches
the DOM or storage.

This document is the plan the code is built to. Sections marked _planned_ describe modules that
later work adds on top of the foundation; everything else exists in the repository.

## Principles

1. **Static first.** Reading and browsing work with JavaScript turned off. Islands enhance; they are
   never the only way to reach content.
2. **Logic is pure.** `src/lib` has no imports from Astro, Preact, the DOM or storage. Functions take
   values and return new values. That is what makes a 90% coverage threshold cheap to hold.
3. **The identity is code.** Colour, type, the kolam, the marks, the pouch and the illustrations are
   generated from data and geometry. The site ships no raster images.
4. **One source of truth per fact.** A hex value, a price, a Kannada word or a logo proportion is
   written once and imported everywhere else. Tests fail when a copy drifts.

## Module map

```
src/
  lib/                 Pure domain logic. No DOM, no storage, no framework.
    money.ts           Integer paise: construction, arithmetic, percentages, INR formatting
    prng.ts            String hash and a seeded generator (mulberry32)
    catalog.ts         Product schema (zod) and the domain types derived from it
    pricing.ts         Variant pricing: size multipliers, variants per product, price per cup
    cart.ts            Cart state and reducer (add, set quantity, remove, restore, coupon, clear)
    cart-storage.ts    Parsing of untrusted persisted cart state
    coupon.ts          Coupon rules (BYTWO)
    shipping.ts        Free-shipping threshold, fee and progress
    totals.ts          Priced lines, subtotal, discount, shipping, total
    pin.ts             PIN-code validation and delivery zone
    subscription.ts    Subscriber price, cadence and per-delivery totals
    brew.ts            Filter-coffee calculator and ratio cards for other methods
    contrast.ts        WCAG relative luminance, contrast ratio, ink choice
    kolam/             The generative pattern (see "The kolam generator")
      arrangement.ts   Dot layouts: 5x5 square, 1-3-5-3-1 and 1-3-5-7-5-3-1 diamonds
      gates.ts         Seeded open/closed gates, mirrored across both axes
      strokes.ts       Arcs and straight segments for every side of every dot
      loops.ts         Tracing strokes into closed loops and SVG path data
      kolam.ts         kolam(seed, options) -> { paths, dots, viewBox }
      svg.ts           Standalone SVG serialisation (downloads, determinism tests)
  brand/               The identity as data. Pure TypeScript, imported by components and tests.
    palette.ts         Core colours and the eight origin accents, with roles
    kannada.ts         The three Kannada words the brand may use. Nothing else may contain Kannada.
    marks.ts           Geometry of the two logo marks (froth ring, the pull)
    wordmark.ts        Outlined wordmark paths (generated from the font files by a script)
  content/products/    One JSON file per product, validated by the schema in lib/catalog.ts
  content.config.ts    Content collection definition
  data/                Build-time data access behind a small repository interface
    catalog.ts         getProducts(), getProduct(id): the only code that calls astro:content
  styles/
    tokens.css         Colour, type scale, spacing, radius, shadow and motion tokens
    fonts.css          @font-face for Anek Latin, Anek Kannada and Newsreader (self-hosted)
    base.css           Reset, element defaults, focus style, type utilities
  components/
    brand/             Wordmark, FrothMark, PourMark, Logo, Kolam, Pouch
    illustrations/     TumblerDavara, BrassFilter, CoffeeBranch, Hills, shared paper grain
    layout/            SiteHeader, SiteFooter
    islands/           Preact islands (planned)
  stores/              nanostores shared by islands (planned)
  layouts/
    BaseLayout.astro   <head>, CSP, fonts, skip link, header and footer
  pages/               Routes. Every route ends in a slash; every link goes through the base path.
scripts/               Re-runnable generators (wordmark outlines, font subsets)
tests/                 Repository-level guards (Kannada allow-list, token and palette parity)
e2e/                   Playwright specs, run against the production build under the sub-path
docs/                  This file and the build log
```

Unit tests sit next to the module they cover (`money.ts`, `money.test.ts`).

## Rendering model

- `output: 'static'`. `site` is `https://darshanpawar7.github.io`, `base` comes from `BASE_PATH`
  and defaults to `/nore-coffee/`, `trailingSlash: 'always'`.
- Internal links and asset URLs never hard-code the base. Pages call `href('/brand/')` from
  `src/lib/paths.ts`; assets are imported so that the bundler rewrites them.
- Astro components render the identity at build time: a kolam on a product card is inline SVG in the
  HTML, produced by calling `kolam(name)` during the build. No client code is needed to see it.
- Islands hydrate only where there is state, with the lightest directive that works
  (`client:idle` for the cart button, `client:visible` for below-the-fold tools).

### Islands and state (planned)

| Island                | Page       | State it owns or reads                            |
| --------------------- | ---------- | ------------------------------------------------- |
| `CartButton`          | every page | reads `$cartCount`                                |
| `CartDrawer`          | every page | reads `$cart`, `$totals`; dispatches cart actions |
| `ProductOptions`      | product    | size, grind, quantity; dispatches `add`           |
| `ShopFilters`         | shop       | roast, process, method, sort; mirrors the URL     |
| `SubscriptionBuilder` | subscribe  | the three steps and the live summary              |
| `BrewGuide`           | brew guide | cups, strength, timer                             |
| `KolamGenerator`      | brand      | the typed word and the chosen accent              |
| `CheckoutForm`        | checkout   | field values, validation, the error summary       |

Shared state lives in `src/stores` as nanostores:

- `$cart` is a `persistentAtom` (`@nanostores/persistent`) holding `CartState`. It is the only
  writer to storage. Persistence gives reload survival and cross-tab sync through the `storage`
  event. Its decoder is `parseCartState` from `lib/cart-storage.ts`, so anything read back from
  storage is validated before use.
- `$totals` and `$cartCount` are `computed` stores that call the pure functions in `lib/totals.ts`.
- Islands never compute prices themselves. They dispatch an action (`$cart.set(cartReducer(...))`)
  and render what the computed stores return.

The cart stores identifiers and quantities only (`productId`, `variantId`, `grind`, `quantity`).
Prices are looked up in the catalogue each time totals are computed. A stale or edited cart in
storage can therefore never carry a price of its own.

## Domain logic

### Money

All amounts are integer paise. Size multipliers and discounts are integer percentages
(`190` for 1.9x, `10` for 10% off) applied with integer arithmetic and half-up rounding, so no
floating-point value is ever stored or compared. `formatInr` writes Indian digit grouping by hand
rather than through `Intl`, which keeps server and client output byte-identical.

### Catalogue and variants

`lib/catalog.ts` holds the zod schema for a product. It is a discriminated union on `kind`:

- `beans`: a bag of coffee. One base price for 250 g; 500 g is 1.9x and 1 kg is 3.6x. Has a grind.
- `decoction`: the bottled decoction. One size, no grind.
- `gear`: filters and cups. Variants carry their own prices.

`variantsFor(product)` in `lib/pricing.ts` turns any product into a list of priced variants, so the
cart and the product page treat all three kinds the same way.

### Cart, coupon, shipping

- `cartReducer(state, action)` is a pure reducer. A line is identified by product, variant and
  grind. Removing a line returns enough information to restore it at the same position (undo).
- `BYTWO` gives 10% off the subtotal when the cart holds two or more bags of coffee (`beans`
  units; the decoction bottle and gear do not count). A rejected code returns a reason the UI can
  show.
- Shipping is free when the subtotal reaches Rs 999 and Rs 60 otherwise. The threshold is judged
  on the subtotal before any coupon, so applying a coupon never takes free shipping away.
- Prices include taxes. There is no tax arithmetic.

### PIN codes

Six digits, the first between 1 and 9. A first digit of 5 or 6 is one to three days from
Bengaluru, 9 is the Army Postal Service and is not serviceable, everything else is four to seven
days.

### Brew calculator

Cups (1 to 6) and strength (mild, classic, strong) give powder, water, expected decoction and milk.
Strength changes the decoction-to-milk ratio (1:4, 1:3, 1:2), not the amount of powder.

## The kolam generator

`kolam(seed, options)` is a pure function that returns `{ paths, dots, viewBox }` plus the
intermediate construction (`gates`, `strokes`) that tests and diagrams use.

1. **Seed.** The seed string is normalised (Unicode NFKC, trimmed, lower-cased, inner whitespace
   collapsed), hashed to 32 bits and fed to a mulberry32 generator.
2. **Arrangement.** The first draw picks a 5x5 square, a 1-3-5-3-1 diamond or a 1-3-5-7-5-3-1
   diamond. Dots sit on a square grid with spacing `2h`, centred on the origin.
3. **Lattice.** Every point of the construction lies on an integer lattice with unit `h/2`: a dot at
   `(4i, 4j)`, its four ports at `(4i±1, 4j±1)`, the gate between two neighbours at their midpoint.
   Integer keys make lookups and the invariants exact; conversion to user units happens once, at
   the end.
4. **Gates.** A gate is identified by its midpoint `(x, y)`. Its state is stored under
   `(|x|, |y|)`, so one random draw decides all of its mirror images. Symmetry across both axes is
   a property of the data structure, not something enforced after the fact. A dot left with every
   gate closed gets one opened, so no dot ends up with a lone circle around it.
5. **Strokes.** For each side of each dot: a closed gate gives a quarter-circle arc of radius
   `h/√2` centred on the dot, joining the two ports of that side; an open gate gives two straight
   segments from those ports to the gate point. Every port therefore ends exactly two strokes, one
   from each of the two sides it belongs to, and both leave along the same tangent line.
6. **Loops.** Strokes are chained port to port into closed loops. Each loop becomes one SVG path
   (`M`, `A`, `L`, `Z`), which keeps joins round and lets the line be drawn with a single
   `stroke-dashoffset` animation per loop.

The unit tests assert determinism, mirror symmetry, the two-strokes-per-port invariant, tangent
continuity, that boundary sides are always closed and that no stroke passes closer to a dot than
the arc radius.

## Identity in code

- **Tokens.** `styles/tokens.css` defines raw palette values and semantic roles as custom
  properties. `brand/palette.ts` holds the same palette for build-time use (swatches, contrast
  notes, SVG endpoints). A test reads both and fails if any value differs.
- **Type.** Anek Latin (weight and width axes), Anek Kannada and Newsreader are self-hosted from the
  `@fontsource-variable` packages. The type scale ties width to size: the largest sizes use the
  condensed end of the width axis at heavy weights, interface text uses normal width, and the
  smallest labels are slightly expanded.
- **Wordmark.** The Latin and Kannada wordmarks are outlined once from the font files by
  `scripts/outline-wordmark.mjs` and stored as path data. The logo renders identically everywhere,
  does not wait for a font, and causes no layout shift.
- **Marks.** Two explorations are kept as geometry in `brand/marks.ts`: the froth ring (a tumbler
  seen from above, ringed by froth bubbles) and the pull (a single line between two cups).
- **Kolam, pouch and illustrations** are Astro components that emit inline SVG. They take colour
  from `currentColor` and custom properties, never from inline `style` attributes.
- **Accents.** Each coffee owns one accent. Components receive the accent name and set a class
  (`accent-monsoon`), which defines `--accent` and `--accent-ink`.
- **Kannada.** Three words are allowed. They are defined once in `brand/kannada.ts`; a repository
  test scans every source file and fails on any other Kannada code point.

## Security

- A Content-Security-Policy `<meta>` is part of the base layout. To keep `style-src` strict, markup
  contains no inline `style` attributes; variation is expressed with classes, data attributes and
  SVG presentation attributes.
- No third-party requests at runtime: fonts, scripts and styles are all served from the site.
- Nothing typed by a visitor is ever written to the page as HTML.

## Key decisions

| Decision                                          | Rejected                               | Why                                                                                                                          |
| ------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Astro static output with Preact islands           | A single-page app                      | The site is mostly content. HTML-first pages load fast and work without JavaScript; only stateful widgets pay for a runtime. |
| Prices resolved from the catalogue on every total | Storing prices in cart lines           | Persisted carts outlive price changes. Looking prices up removes a whole class of stale-data bugs.                           |
| Integer paise and integer percentages             | Floating-point rupees                  | 10% of Rs 798 is Rs 79.80. Integers make that exact and comparable.                                                          |
| Symmetry by canonical gate key                    | Generating a full grid, then mirroring | One source of truth per gate orbit; the symmetry test cannot fail by construction.                                           |
| One SVG path per kolam loop                       | One path element per stroke            | Round joins everywhere and a single dash animation per loop.                                                                 |
| Outlined wordmark                                 | Live text in a web font                | A logo should not depend on font loading, and the hero should not shift.                                                     |
| Classes for accents                               | Inline `style` attributes              | Keeps the CSP free of `unsafe-inline` for styles.                                                                            |
| TypeScript 6                                      | TypeScript 7                           | `typescript-eslint` 8 and `@astrojs/check` do not accept 7 yet.                                                              |

## How to extend

- **Add a coffee.** Add a JSON file under `src/content/products`. The schema rejects a missing or
  mistyped field at build time. Its kolam, pouch and card follow from the name and the accent.
- **Add an accent.** Add it to `brand/palette.ts` and `styles/tokens.css`; the parity test names
  whichever one is missing.
- **Add a coupon.** Add a rule to `lib/coupon.ts` with tests. The reducer and totals do not change.
- **Add a kolam arrangement.** Add a layout to `lib/kolam/arrangement.ts`. Any set of dots that is
  symmetric about both axes works with the rest of the pipeline unchanged.
