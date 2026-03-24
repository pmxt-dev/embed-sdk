import type { CatalogEvent, CatalogMarketCard, SidebarData, SidebarTrendingItem, SidebarPrimaryItem, PortfolioSummary, PricePoint } from '@pmxt/components';
import { toCategorySlug as _toCategorySlug } from '@pmxt/components';
import { apiGet, apiPost } from './client';
import { mapMarketCard, mapEvent } from './mappers';
import type { RawMarketCard, RawEvent } from './mappers';

export { toEventSlug } from '@pmxt/components';

export async function fetchTopMarkets(limit = 2, sort = 'volume'): Promise<CatalogMarketCard[]> {
    const res = await apiGet<RawMarketCard[]>('/v1/markets', {
        params: { status: 'active', sort, limit, include: 'outcomes' },
    });
    return res.data.map(mapMarketCard);
}

export async function fetchAllMarkets(): Promise<CatalogMarketCard[]> {
    const res = await apiGet<RawMarketCard[]>('/v1/markets', {
        params: { status: 'active', limit: 100, include: 'outcomes' },
    });
    return res.data.map(mapMarketCard);
}

export async function fetchLiveMarketCount(): Promise<number> {
    const res = await apiGet<RawMarketCard[]>('/v1/markets', {
        params: { status: 'active', limit: 1 },
    });
    return res.meta.total ?? 0;
}

export async function fetchCategories(): Promise<string[]> {
    const res = await apiGet<string[]>('/v1/categories');
    return res.data;
}

export async function fetchEvent(slug: string): Promise<CatalogEvent> {
    const res = await apiGet<RawEvent>(`/v1/events/${encodeURIComponent(slug)}`, {
        params: { include: 'markets.outcomes' },
    });
    return mapEvent(res.data);
}

/** Fetch events with markets, sorted by 24h volume (hottest first). */
export async function fetchTopEvents(limit = 5): Promise<CatalogEvent[]> {
    const fetchLimit = Math.max(limit * 3, 20);
    const res = await apiGet<RawEvent[]>('/v1/events', {
        params: { status: 'active', limit: fetchLimit, include: 'markets.outcomes' },
    });
    const events = res.data.map(mapEvent);

    const totalVolume24h = (e: CatalogEvent) =>
        (e.markets ?? []).reduce((sum, m) => sum + (m.volume24h ?? 0), 0);

    return events
        .sort((a, b) => totalVolume24h(b) - totalVolume24h(a))
        .slice(0, limit);
}

export async function fetchEvents(): Promise<CatalogEvent[]> {
    const res = await apiGet<RawEvent[]>('/v1/events', {
        params: { status: 'active', limit: 100 },
    });
    return res.data.map(mapEvent);
}

/** Find the lead outcome across all markets in an event (highest-price non-"Not" outcome). */
function eventLeadOutcome(event: CatalogEvent): { name: string; price: number } {
    const allOutcomes = (event.markets ?? []).flatMap(m =>
        m.outcomes.map(o => ({ description: o.description, price: o.price ?? 0 })),
    );
    const sorted = [...allOutcomes].sort((a, b) => b.price - a.price);
    const positives = sorted.filter(o => !o.description.toLowerCase().startsWith('not '));
    const lead = (positives.length > 0 ? positives : sorted)[0];
    return lead
        ? { name: lead.description, price: lead.price }
        : { name: 'N/A', price: 0 };
}

function eventChange24h(event: CatalogEvent): number {
    const markets = event.markets ?? [];
    let weightedChange = 0;
    let totalWeight = 0;
    for (const m of markets) {
        if (m.change24h != null && m.volume24h != null && m.volume24h > 0) {
            weightedChange += m.change24h * m.volume24h;
            totalWeight += m.volume24h;
        }
    }
    return totalWeight > 0 ? weightedChange / totalWeight : 0;
}

function formatEventTrend(event: CatalogEvent): string {
    const change = eventChange24h(event);
    const abs = Math.abs(Math.round(change * 100) / 100);
    return change >= 0 ? `up ${abs}` : `down ${abs}`;
}

function buildSubtitle(name: string, pct: string, eventTitle: string): string {
    const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalise(name) === normalise(eventTitle)) {
        return pct;
    }
    return `${name} -- ${pct}`;
}

function eventToTrendingItem(event: CatalogEvent, id: number): SidebarTrendingItem {
    const { name, price } = eventLeadOutcome(event);
    const pct = `${Math.round(price * 100)}%`;
    return {
        id,
        title: event.title,
        subtitle: buildSubtitle(name, pct, event.title),
        probability: pct,
        trend: formatEventTrend(event),
        isUp: eventChange24h(event) >= 0,
        eventSlug: event.slug,
    };
}

function eventToPrimaryItem(event: CatalogEvent, id: number): SidebarPrimaryItem {
    const { name, price } = eventLeadOutcome(event);
    const pct = `${Math.round(price * 100)}%`;
    return {
        id,
        title: event.title,
        subtitle: buildSubtitle(name, pct, event.title),
        probability: pct,
        trend: formatEventTrend(event),
        eventSlug: event.slug,
    };
}

export async function fetchSidebar(): Promise<SidebarData> {
    const [events, categories] = await Promise.all([
        fetchTopEvents(20),
        fetchCategories(),
    ]);

    const banners = events.slice(0, 2).map(e => ({
        title: e.title,
        subtitle: e.category,
        image: e.image_url ?? '',
    }));

    const trending = events.slice(0, 3).map((e, i) => eventToTrendingItem(e, i + 1));
    const primaries = events.slice(3, 6).map((e, i) => eventToPrimaryItem(e, i + 1));

    const sections = categories.slice(0, 4).map(cat => {
        const catEvents = events.filter(e => e.category === cat).slice(0, 3);
        return {
            title: cat,
            items: catEvents.map((e, i) => eventToTrendingItem(e, i + 1)),
        };
    }).filter(s => s.items.length > 0);

    return { banners, trending, primaries, sections };
}

export function toCategorySlug(name: string): string {
    return _toCategorySlug(name);
}

export async function categoryFromSlug(slug: string): Promise<string | undefined> {
    const categories = await fetchCategories();
    return categories.find(c => toCategorySlug(c) === slug);
}

export async function fetchMarketsByOneCategory(categoryName: string, limit = 100): Promise<CatalogMarketCard[]> {
    const res = await apiGet<RawMarketCard[]>('/v1/markets', {
        params: {
            status: 'active',
            category: categoryName,
            sort: 'volume',
            limit,
            include: 'outcomes',
        },
    });
    return res.data.map(mapMarketCard);
}

export interface CategoryGroup {
    category: string;
    markets: CatalogMarketCard[];
}

export async function fetchPortfolio(address: string): Promise<PortfolioSummary> {
    const res = await apiGet<PortfolioSummary>(`/v1/portfolio/${encodeURIComponent(address)}`);
    return res.data;
}

export async function fetchHoldings(address: string): Promise<number> {
    const portfolio = await fetchPortfolio(address);
    return portfolio.positions.length;
}

export interface BalanceResponse {
    readonly total: { readonly USDC: number };
    readonly free: { readonly USDC: number };
    readonly used: { readonly USDC: number };
}

export async function fetchBalance(address: string): Promise<BalanceResponse> {
    const res = await apiGet<BalanceResponse>(`/v1/balance/${encodeURIComponent(address)}`);
    return res.data;
}

export interface Position {
    readonly tokenId: string;
    readonly balance: number;
    readonly eventTitle?: string;
    readonly outcome?: string;
}

export async function fetchPositions(address: string): Promise<readonly Position[]> {
    const res = await apiGet<Position[]>(`/v1/positions/${encodeURIComponent(address)}`);
    return res.data;
}

// --- Order Types ---

export interface BuildOrderRequest {
    readonly tokenId: string;
    readonly side: 'buy' | 'sell';
    readonly amount: number;
    readonly userAddress: string;
    readonly negRisk?: boolean;
    readonly amountType?: 'usdc' | 'tokens';
}

export interface BuildOrderResult {
    readonly typedData: {
        readonly types: Record<string, readonly { name: string; type: string }[]>;
        readonly domain: Record<string, unknown>;
        readonly primaryType: string;
        readonly message: Record<string, unknown>;
    };
    readonly params: {
        readonly worstPrice: number;
        readonly maxCostUsdc?: number;
        readonly tokenAmount?: number;
        readonly deadline: number;
        readonly nonce: string;
    };
    readonly negRisk: boolean;
    readonly tickSize: string;
    readonly estimatedCost?: number;
    readonly estimatedProceeds?: number;
    readonly fillable: boolean;
    readonly bestAsk?: number;
    readonly bestBid?: number;
}

export interface SubmitOrderRequest {
    readonly side: 'buy' | 'sell';
    readonly signature: string;
    readonly tokenId: string;
    readonly userAddress: string;
    readonly worstPrice: number;
    readonly deadline: number;
    readonly nonce: string;
    readonly negRisk?: boolean;
    readonly tickSize?: string;
    readonly wait?: boolean;
    readonly maxCostUsdc?: number;
    readonly tokenAmount?: number;
}

export interface OrderResult {
    readonly status: string;
    readonly tokensBought?: number;
    readonly usdcSpent?: number;
    readonly tokensSold?: number;
    readonly usdcReceived?: number;
    readonly txHash?: string;
    readonly taskId?: number;
}

export async function buildOrder(req: BuildOrderRequest): Promise<BuildOrderResult> {
    const res = await apiPost<BuildOrderResult>('/v1/orders/build', req);
    return res.data;
}

export async function submitSignedOrder(req: SubmitOrderRequest): Promise<OrderResult> {
    const res = await apiPost<OrderResult>('/v1/orders/submit', req);
    return res.data;
}

// --- Deposit / Withdraw ---

export interface UnsignedTx {
    readonly to: string;
    readonly value: string;
    readonly data: string;
    readonly chainId: number;
}

export interface BuildTxResult {
    readonly tx: UnsignedTx;
}

export async function buildDeposit(amount: number): Promise<BuildTxResult> {
    const res = await apiPost<BuildTxResult>('/v1/deposit/build', { amount });
    return res.data;
}

export async function buildWithdraw(amount: number): Promise<BuildTxResult> {
    const res = await apiPost<BuildTxResult>('/v1/withdraw/build', { amount });
    return res.data;
}

export async function buildClaimWithdrawal(): Promise<BuildTxResult> {
    const res = await apiPost<BuildTxResult>('/v1/withdraw/claim/build', {});
    return res.data;
}

export interface WithdrawalStatus {
    readonly claimableAt?: number;
}

export async function getWithdrawalStatus(address: string): Promise<WithdrawalStatus> {
    const res = await apiGet<WithdrawalStatus>(`/v1/withdraw/status/${encodeURIComponent(address)}`);
    return res.data;
}

export async function searchMarkets(query: string): Promise<CatalogMarketCard[]> {
    if (query.length === 0) return [];
    const res = await apiGet<RawMarketCard[]>('/v1/markets', {
        params: { q: query, status: 'active', limit: 50, include: 'outcomes' },
    });
    return res.data.map(mapMarketCard);
}

export async function searchEvents(query: string): Promise<CatalogEvent[]> {
    if (query.length === 0) return [];
    const res = await apiGet<RawEvent[]>('/v1/events', {
        params: { q: query, status: 'active', limit: 20 },
    });
    return res.data.map(mapEvent);
}

export async function fetchMarketsByCategory(limitPerCategory = 6, maxCategories = 8): Promise<CategoryGroup[]> {
    const allCategories = await fetchCategories();
    const categories = allCategories.slice(0, maxCategories);
    const groups = await Promise.all(
        categories.map(async (category) => {
            const markets = await fetchMarketsByOneCategory(category, limitPerCategory);
            return { category, markets };
        }),
    );
    return groups.filter(g => g.markets.length > 0);
}

export async function fetchEventsByOneCategory(categoryName: string, limit = 6): Promise<CatalogEvent[]> {
    const res = await apiGet<RawEvent[]>('/v1/events', {
        params: { status: 'active', category: categoryName, limit, include: 'markets.outcomes' },
    });
    return res.data.map(mapEvent);
}

export interface CategoryEventGroup {
    category: string;
    events: CatalogEvent[];
}

export async function fetchEventsByCategory(eventsPerCategory = 6, maxCategories = 8): Promise<CategoryEventGroup[]> {
    const allCategories = await fetchCategories();
    const categories = allCategories.slice(0, maxCategories);
    const groups = await Promise.all(
        categories.map(async (category) => {
            const events = await fetchEventsByOneCategory(category, eventsPerCategory);
            return { category, events };
        }),
    );
    const nonEmpty = groups.filter(g => g.events.length > 0);

    // Sort categories by aggregate 24h volume (hottest first)
    const groupVolume24h = (g: CategoryEventGroup) =>
        g.events.reduce((sum, e) =>
            sum + (e.markets ?? []).reduce((s, m) => s + (m.volume24h ?? 0), 0), 0);

    return [...nonEmpty].sort((a, b) => groupVolume24h(b) - groupVolume24h(a));
}

export interface PaginatedEvents {
    events: CatalogEvent[];
    total: number;
    limit: number;
    offset: number;
}

/** Fetch events with pagination metadata. Supports optional category filter. */
export async function fetchEventsPaginated(options: {
    category?: string;
    limit?: number;
    offset?: number;
} = {}): Promise<PaginatedEvents> {
    const { category, limit = 20, offset = 0 } = options;
    const params: Record<string, string | number | undefined> = {
        status: 'active',
        limit,
        offset,
        include: 'markets.outcomes',
    };
    if (category) {
        params.category = category;
    }
    const res = await apiGet<RawEvent[]>('/v1/events', { params });
    return {
        events: res.data.map(mapEvent),
        total: res.meta.total ?? 0,
        limit: res.meta.limit ?? limit,
        offset: res.meta.offset ?? offset,
    };
}

export async function fetchPriceHistory(
    outcomePmxtId: string,
    interval: '1h' | '6h' | '1d' | '1w' | '1m' | 'max' = 'max',
    fidelity = 60,
): Promise<PricePoint[]> {
    const res = await apiGet<PricePoint[]>(
        `/v1/outcomes/${encodeURIComponent(outcomePmxtId)}/history`,
        { params: { interval, fidelity } },
    );
    return res.data;
}

// --- Trades ---

export interface Trade {
    readonly id: string;
    readonly tokenId: string;
    readonly side: 'buy' | 'sell';
    readonly shares: number;
    readonly pricePerShare: number;
    readonly totalUsdc: number;
    readonly txHash: string | null;
    readonly status: string;
    readonly createdAt: string;
    readonly eventSlug: string;
    readonly marketQuestion: string;
}

export async function fetchTrades(address: string, limit = 50, offset = 0): Promise<{ trades: Trade[]; total: number }> {
    const res = await apiGet<Trade[]>(`/v1/trades/${encodeURIComponent(address)}`, {
        params: { limit, offset },
    });
    return { trades: res.data, total: res.meta.total ?? 0 };
}

export async function fetchPriceHistoryBatch(
    tokenIds: string[],
    interval: '1h' | '6h' | '1d' | '1w' | '1m' | 'max' = 'max',
    fidelity = 60,
): Promise<Record<string, PricePoint[]>> {
    if (tokenIds.length === 0) return {};
    const res = await apiPost<Record<string, PricePoint[]>>(
        '/v1/outcomes/history-batch',
        { tokenIds, interval, fidelity },
    );
    return res.data;
}
