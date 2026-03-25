# @pmxt/sdk

TypeScript SDK for the PMXT Embed API -- fetch markets, place orders, manage portfolios.

Works in any JavaScript environment. Pairs with [`@pmxt/components`](https://github.com/pmxt-dev/embed-components) for a complete prediction market UI.

## Install

```bash
npm install @pmxt/sdk
```

## Setup

The SDK reads configuration from environment variables:

```bash
NEXT_PUBLIC_API_KEY=your-api-key               # API key sent as X-API-Key header
NEXT_PUBLIC_API_URL=https://custom-url.com     # optional, overrides the default PMXT API
```

Set these in your `.env.local` (Next.js) or equivalent. Only `NEXT_PUBLIC_API_KEY` is required -- get yours from [pmxt.dev/dashboard](https://pmxt.dev/dashboard).

## Quick Start

### Fetch top events

```ts
import { fetchTopEvents } from "@pmxt/sdk";

const events = await fetchTopEvents(5);
for (const event of events) {
  console.log(event.title, event.markets?.length, "markets");
}
```

### Build and submit an order

```ts
import { buildOrder, submitSignedOrder } from "@pmxt/sdk";

// 1. Build the order (returns EIP-712 typed data for signing)
const built = await buildOrder({
  tokenId: "0x123...",
  side: "buy",
  amount: 10,
  userAddress: "0xabc...",
});

// 2. Sign with the user's wallet (e.g. wagmi signTypedData)
const signature = await signTypedDataAsync(built.typedData);

// 3. Submit the signed order
const result = await submitSignedOrder({
  side: "buy",
  signature,
  tokenId: "0x123...",
  userAddress: "0xabc...",
  worstPrice: built.params.worstPrice,
  deadline: built.params.deadline,
  nonce: built.params.nonce,
  wait: true,
});
```

### Fetch portfolio and balance

```ts
import { fetchPortfolio, fetchBalance } from "@pmxt/sdk";

const portfolio = await fetchPortfolio("0xabc...");
const balance = await fetchBalance("0xabc...");
console.log(`USDC: ${balance.free.USDC}, Positions: ${portfolio.positions.length}`);
```

## API Reference

### Catalog

| Function | Description |
|---|---|
| `fetchTopMarkets(limit?, sort?)` | Fetch top markets by volume |
| `fetchAllMarkets()` | Fetch all active markets |
| `fetchLiveMarketCount()` | Get total count of active markets |
| `fetchCategories()` | List all category names |
| `fetchEvent(slug)` | Fetch a single event by slug |
| `fetchTopEvents(limit?)` | Fetch top events ranked by 24h volume |
| `fetchEvents()` | Fetch all active events |
| `fetchSidebar()` | Fetch pre-built sidebar data (banners, trending, sections) |
| `fetchMarketsByOneCategory(name, limit?)` | Fetch markets in a single category |
| `fetchMarketsByCategory(limitPer?, maxCats?)` | Fetch markets grouped by category |
| `fetchEventsByCategory(eventsPer?, maxCats?)` | Fetch events grouped by category, sorted by volume |
| `fetchEventsPaginated(options?)` | Fetch events with pagination and optional category filter |
| `searchMarkets(query)` | Search markets by text query |
| `searchEvents(query)` | Search events by text query |

### Trading

| Function | Description |
|---|---|
| `buildOrder(req)` | Build an order and get EIP-712 typed data for signing |
| `submitSignedOrder(req)` | Submit a wallet-signed order for execution |

### Funds

| Function | Description |
|---|---|
| `buildDeposit(amount)` | Build an unsigned deposit transaction |
| `buildWithdraw(amount)` | Build an unsigned withdrawal transaction |
| `buildClaimWithdrawal()` | Build a transaction to claim a pending withdrawal |
| `getWithdrawalStatus(address)` | Check withdrawal status and claimable time |
| `fetchBalance(address)` | Fetch USDC balance (total, free, used) |

### Portfolio

| Function | Description |
|---|---|
| `fetchPortfolio(address)` | Fetch full portfolio summary |
| `fetchHoldings(address)` | Get the number of open positions |
| `fetchPositions(address)` | List all token positions |
| `fetchTrades(address, limit?, offset?)` | Fetch paginated trade history |

### Partner

| Function | Description |
|---|---|
| `getPartnerAccruals()` | Get fee accrual summary (total accrued, paid out, outstanding) |
| `getPartnerAccrualHistory(params?)` | Fetch paginated accrual/payout history |

### Utilities

| Function | Description |
|---|---|
| `fetchPriceHistory(outcomeId, interval?, fidelity?)` | Fetch price history for a single outcome |
| `fetchPriceHistoryBatch(tokenIds, interval?, fidelity?)` | Fetch price history for multiple outcomes |
| `toCategorySlug(name)` | Convert a category name to a URL slug |
| `categoryFromSlug(slug)` | Resolve a URL slug back to a category name |
| `toEventSlug(event)` | Generate a URL slug for an event |

## TypeScript

The SDK exports all relevant types:

```ts
import type {
  CategoryGroup,
  CategoryEventGroup,
  PaginatedEvents,
  BalanceResponse,
  Position,
  BuildOrderRequest,
  BuildOrderResult,
  SubmitOrderRequest,
  OrderResult,
  UnsignedTx,
  BuildTxResult,
  WithdrawalStatus,
  Trade,
  PartnerAccrualSummary,
  PartnerPayoutEntry,
} from "@pmxt/sdk";
```

## Related

- [`@pmxt/components`](https://github.com/pmxt-dev/embed-components) -- UI component library built on this SDK
- [Prediction Market Starter](https://github.com/pmxt-dev/prediction-market-starter) -- clone-and-deploy Next.js app
- [API Documentation](https://docs.pmxt.dev)
