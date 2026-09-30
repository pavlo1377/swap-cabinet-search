# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Project conventions (styling, import order, forms, Redux, i18n, API calls, transaction-process
rules) live in AGENTS.md and are imported here — follow them:

@AGENTS.md

Team git workflow (branch from `dev`, PRs target `dev`, never push to `main`/`dev` directly) —
follow it:

@GIT_WORKFLOW.md

## Commands

Yarn is the package manager (`yarn.lock`). Node `^22.22.0 || >=24`.

```sh
yarn install
yarn run config          # interactive: writes mandatory env vars to .env (see .env-template)
yarn run dev             # config-check, then webpack dev server (:3000) + dev API server (:3500)
yarn run dev-server      # production build + SSR server on :4000 (use this to test SSR / loadData)
yarn run build           # build-web (client bundle) + build-server (node bundle for SSR)
yarn start               # run the production server (server/index.js), requires `yarn build`
```

Tests (Jest + React Testing Library, jsdom):

```sh
yarn test                                   # client tests in src/, WATCH mode by default
yarn test --watchAll=false                  # single run (watch is also skipped when CI is set)
yarn test src/util/currency.test.js --watchAll=false        # single file
yarn test --watchAll=false -t "name of the test"             # single test by name
yarn test-server                            # server tests (server/**/*.test.js, node env)
yarn test-server server/api-util/lineItems.test.js           # single server test file
yarn test-ci                                # what CI runs: server + client, --runInBand
```

Formatting: `yarn format` (write) / `yarn format-ci` (check). There is no standalone lint script and
no ESLint config at the repo root, so the webpack ESLint plugin is effectively disabled.

In the test env, `app.js` replaces every translation value with its key, so tests assert on
translation keys (e.g. `'ListingPage.bookingTitle'`), not English copy.

Windows note: README recommends WSL. Some scripts (`clean`, `format` with single-quoted globs) assume
a Unix shell.

## Architecture overview

### Two servers in dev, one in production

- `yarn dev`: `scripts/start.js` serves the client via webpack dev server (no SSR), and
  `server/apiServer.js` (nodemon) serves only `/api/*`, `/.well-known/*`, sitemap/robots/manifest on
  port 3500 with CORS. `src/util/api.js#apiBaseUrl` points to that port when
  `REACT_APP_DEV_API_SERVER_PORT` is set.
- Production (`server/index.js`): a single Express app that mounts the same `apiRouter`, serves
  `build/static`, and server-side renders every other GET route.

### SSR request flow

1. `server/index.js` loads the node bundle entry (`src/index.js` default export `renderApp` plus
   named exports `matchPathname`, `configureStore`, `routeConfiguration`, `defaultConfig`,
   `mergeConfig`, `fetchAppAssets`) via loadable-components extractors (`server/importer.js`).
2. `server/dataLoader.js` creates a store with a server SDK (cookie-based auth via
   `server/api-util/sdk.js`, wrapped by `sdkCacheProxy.js` for asset caching), fetches hosted assets
   (`appCdnAssets`), merges config, then dispatches `route.loadData(params, search, config)` for every
   matched route **that is not `auth: true`**.
3. `server/renderer.js` renders the `ServerApp` and serializes the Redux state into
   `window.__PRELOADED_STATE__`. React Router `context` flags (`unauthorized`, `forbidden`,
   `notfound`, `url`) set the HTTP status / redirect.
4. On the client, `src/index.js` rehydrates the store from the preloaded state (using the SDK types
   reviver), re-fetches hosted assets and the current user, then hydrates `ClientApp`.
5. `src/routing/Routes.js` calls the same `loadData` on client-side navigation and on first render,
   and handles `auth: true` redirects (to `authPage`, default `SignupPage`).

So a page's data loading is: `SomePage.duck.js#loadData` → exported in
`src/containers/pageDataLoadingAPI.js` → attached to the route in
`src/routing/routeConfiguration.js`. Page components are code-split with `loadable()` there.

### Config: hosted + local

`mergeConfig(hostedConfig, defaultConfig)` (`src/util/configHelpers.js`) runs on both server and
client. Hosted assets from Console (listing types, listing fields, user types, search, layout,
branding, commission, access control, etc.) override the local `src/config/*` files. `layout` and
`accessControl` from the merged config feed `routeConfiguration()` (e.g. search page variant,
listing page variant, private-marketplace `auth: true` on routes). If mandatory hosted config is
missing, the app renders `MaintenanceMode`.

Content pages (LandingPage, CMSPage, TermsOfService, PrivacyPolicy) are driven by hosted page
assets: their ducks call `fetchPageAssets` and render via `src/containers/PageBuilder`.

### Redux and the SDK

- `src/store.js`: the SDK instance is injected as the thunk `extraArgument`, so thunks are
  `(dispatch, getState, sdk) => ...`. Serializable check is off because SDK types (UUID, Money,
  LatLng, Decimal) live in the store.
- API entities are normalized into the global `marketplaceData` slice with
  `addMarketplaceEntities(sdkResponse)`; pages store only ids and read entities back with
  `getListingsById` / `getMarketplaceEntities` (`src/ducks/marketplaceData.duck.js`).
- `BigDecimal` is mapped to `decimal.js`; `typeHandlers` in `src/util/api.js` and
  `server/api-util/sdk.js` must stay in sync.

### Server API (`server/api/*`)

Client calls go through `src/util/api.js` using Transit (`application/transit+json`) by default;
`apiRouter.js` deserializes Transit bodies. Key endpoints:

- `transaction-line-items`: computes pricing for previews using `server/api-util/lineItems.js`
  (+ commission from hosted assets).
- `initiate-privileged` / `transition-privileged`: run privileged transitions with the trusted SDK
  (needs `SHARETRIBE_SDK_CLIENT_SECRET`), recomputing line items server-side so the price can't be
  tampered with in the browser. Pricing changes therefore belong in `server/api-util/lineItems.js`.
- `delete-account`, `login-as`, and social login (`api/auth/*`, Passport for Facebook/Google).

### Transaction processes

Each process exists in three places that must agree: the process on the Sharetribe backend (pushed
with Sharetribe CLI), the reference copies in `ext/transaction-processes/*/process.edn`, and the
client-side state graphs in `src/transactions/transactionProcess*.js` registered in
`src/transactions/transaction.js`. Listing types in config map to a process + unit type, which drives
which initial transition, checkout flow, and TransactionPage UI are used. Processes with Stripe
states also need updating in `server/api/delete-account.js` (see `src/transactions/README.md`).

### Environment

`REACT_APP_*` variables are bundled into the public client (the dev app shows a warning if one
contains `SECRET`). Server-only secrets: `SHARETRIBE_SDK_CLIENT_SECRET`, `FACEBOOK_APP_SECRET`,
`GOOGLE_CLIENT_SECRET`. `.env.development` / `.env.test` override `REACT_APP_ENV`. Useful debug
flags: `VERBOSE=true`, `PREVENT_DATA_LOADING_IN_SSR=true`.
