const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

const API_KEY = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_KEY ?? '')
    : (process.env.API_KEY ?? process.env.NEXT_PUBLIC_API_KEY ?? '');

export interface ApiResponse<T> {
    data: T;
    meta: {
        timestamp: string;
        requestId: string;
        total?: number;
        limit?: number;
        offset?: number;
    };
}

export interface RequestOptions {
    params?: Record<string, string | number | undefined>;
}

export async function apiGet<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const url = new URL(path, BASE_URL);

    if (options.params) {
        for (const [key, value] of Object.entries(options.params)) {
            if (value !== undefined) {
                url.searchParams.set(key, String(value));
            }
        }
    }

    const headers: Record<string, string> = {};
    if (API_KEY) {
        headers['X-API-Key'] = API_KEY;
    }

    const res = await fetch(url.toString(), { headers, next: { revalidate: 60 } });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? `API error: ${res.status}`);
    }

    return res.json();
}

export async function apiPost<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const url = new URL(path, BASE_URL);

    if (options.params) {
        for (const [key, value] of Object.entries(options.params)) {
            if (value !== undefined) {
                url.searchParams.set(key, String(value));
            }
        }
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (API_KEY) {
        headers['X-API-Key'] = API_KEY;
    }

    const res = await fetch(url.toString(), {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        next: { revalidate: 60 },
    });

    if (!res.ok) {
        const respBody = await res.json().catch(() => ({}));
        throw new Error(respBody?.error?.message ?? `API error: ${res.status}`);
    }

    return res.json();
}
