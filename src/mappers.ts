import type { CatalogOutcome, CatalogMarket, CatalogMarketCard, CatalogEvent } from '@pmxt/components';

// Raw shapes returned by the backend (camelCase)

interface RawOutcome {
    readonly id: number;
    readonly pmxtId: string;
    readonly description: string;
    readonly price: number | string;
    readonly tokenId: string | null;
}

interface RawMarket {
    readonly id: number;
    readonly pmxtId: string;
    readonly question: string;
    readonly status: string;
    readonly volume?: number | null;
    readonly volume24h?: number | null;
    readonly change24h?: number | null;
    readonly imageUrl?: string | null;
    readonly outcomes: readonly RawOutcome[];
}

interface RawMarketCard {
    readonly id: number;
    readonly pmxtId: string;
    readonly question: string;
    readonly status: string;
    readonly eventPmxtId: string;
    readonly eventSlug: string;
    readonly eventTitle: string;
    readonly category: string;
    readonly volume: number | null;
    readonly volume24h: number | null;
    readonly liquidity: number | null;
    readonly openInterest: number | null;
    readonly imageUrl: string | null;
    readonly change24h?: number | null;
    readonly change7d?: number | null;
    readonly outcomes: readonly RawOutcome[];
}

interface RawEvent {
    readonly id: number;
    readonly pmxtId: string;
    readonly title: string;
    readonly description: string | null;
    readonly category: string;
    readonly slug: string;
    readonly imageUrl: string | null;
    readonly status: string;
    readonly closesAt: string | null;
    readonly markets?: readonly RawMarket[];
}

export type { RawOutcome, RawMarket, RawMarketCard, RawEvent };

export function mapOutcome(raw: RawOutcome): CatalogOutcome {
    return {
        id: raw.id,
        pmxt_id: raw.pmxtId,
        description: raw.description,
        price: typeof raw.price === 'string' ? parseFloat(raw.price) : raw.price,
        token_id: raw.tokenId,
    };
}

export function mapMarket(raw: RawMarket): CatalogMarket {
    return {
        id: raw.id,
        pmxt_id: raw.pmxtId,
        question: raw.question,
        status: raw.status,
        volume: raw.volume ?? null,
        volume24h: raw.volume24h ?? null,
        change24h: raw.change24h ?? null,
        image_url: raw.imageUrl ?? null,
        outcomes: raw.outcomes.map(mapOutcome),
    };
}

export function mapMarketCard(raw: RawMarketCard): CatalogMarketCard {
    return {
        id: raw.id,
        pmxt_id: raw.pmxtId,
        question: raw.question,
        status: raw.status,
        event_pmxt_id: raw.eventPmxtId,
        event_slug: raw.eventSlug,
        event_title: raw.eventTitle,
        category: raw.category,
        volume: raw.volume,
        volume24h: raw.volume24h,
        liquidity: raw.liquidity,
        openInterest: raw.openInterest,
        imageUrl: raw.imageUrl,
        change24h: raw.change24h ?? null,
        change7d: raw.change7d ?? null,
        outcomes: raw.outcomes.map(mapOutcome),
    };
}

export function mapEvent(raw: RawEvent): CatalogEvent {
    return {
        id: raw.id,
        pmxt_id: raw.pmxtId,
        title: raw.title,
        description: raw.description,
        category: raw.category,
        slug: raw.slug,
        image_url: raw.imageUrl,
        status: raw.status,
        closes_at: raw.closesAt,
        markets: raw.markets ? raw.markets.map(mapMarket) : undefined,
    };
}
