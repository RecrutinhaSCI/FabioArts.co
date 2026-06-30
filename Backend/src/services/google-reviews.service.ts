import prisma from '../prisma/client';

/* ============================================================
   GOOGLE REVIEWS SERVICE (R9D)
   - Proxy + cache em memória para Google Places API v1.
   - Sem persistir reviews no banco.
   - Sempre retorna shape estável; em qualquer falha cai pra manual/off.
   ============================================================ */

export type ReviewSource = 'google' | 'manual' | 'off';

export interface NormalizedReview {
  author:          string;
  rating:          number;
  text:            string;
  relativeTime:    string;
  profilePhotoUrl: string;
}

export interface ReviewsPayload {
  enabled:      boolean;
  source:       ReviewSource;
  rating:       number | null;
  reviewsCount: number | null;
  reviews:      NormalizedReview[];
  mapsUrl:      string | null;
  reviewUrl:    string | null;
  cachedAt:     string | null;
}

interface CacheEntry { payload: ReviewsPayload; expiresAt: number; }

const cache = new Map<string, CacheEntry>();

function cacheTtlMs(): number {
  const h = Number(process.env.GOOGLE_REVIEWS_CACHE_HOURS);
  const hours = Number.isFinite(h) && h > 0 ? h : 12;
  return hours * 60 * 60 * 1000;
}

function offPayload(): ReviewsPayload {
  return {
    enabled: false, source: 'off',
    rating: null, reviewsCount: null,
    reviews: [], mapsUrl: null, reviewUrl: null,
    cachedAt: null,
  };
}

function manualPayload(s: {
  googleEnabled: boolean;
  googleMapsUrl: string | null;
  googleReviewUrl: string | null;
  googleRatingManual: number | null;
  googleReviewsCount: number | null;
}): ReviewsPayload {
  return {
    enabled:      true,
    source:       'manual',
    rating:       s.googleRatingManual ?? null,
    reviewsCount: s.googleReviewsCount ?? null,
    reviews:      [],
    mapsUrl:      s.googleMapsUrl ?? null,
    reviewUrl:    s.googleReviewUrl ?? null,
    cachedAt:     null,
  };
}

function normalizeReview(r: any): NormalizedReview {
  // Places API v1 reviews shape:
  // { authorAttribution:{displayName, photoUri}, rating, text:{text}, relativePublishTimeDescription }
  const author          = r?.authorAttribution?.displayName ?? '';
  const profilePhotoUrl = r?.authorAttribution?.photoUri    ?? '';
  const text            = (r?.text?.text ?? r?.originalText?.text ?? '').toString();
  const rating          = Number.isFinite(Number(r?.rating)) ? Number(r.rating) : 0;
  const relativeTime    = (r?.relativePublishTimeDescription ?? '').toString();
  return { author, rating, text, relativeTime, profilePhotoUrl };
}

async function fetchFromGoogle(placeId: string, apiKey: string): Promise<{
  rating: number | null;
  reviewsCount: number | null;
  reviews: NormalizedReview[];
  mapsUri: string | null;
}> {
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key':    apiKey,
      'X-Goog-FieldMask':  'rating,userRatingCount,reviews,googleMapsUri',
    },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Google Places ${res.status}: ${errText.slice(0, 200)}`);
  }

  const body = await res.json() as {
    rating?: number;
    userRatingCount?: number;
    googleMapsUri?: string;
    reviews?: unknown[];
  };

  const reviews = Array.isArray(body.reviews)
    ? body.reviews.slice(0, 5).map(normalizeReview)
    : [];

  return {
    rating:       Number.isFinite(Number(body.rating)) ? Number(body.rating) : null,
    reviewsCount: Number.isFinite(Number(body.userRatingCount)) ? Number(body.userRatingCount) : null,
    reviews,
    mapsUri:      body.googleMapsUri ?? null,
  };
}

export const GoogleReviewsService = {

  /** Limpa cache. Sem placeId: limpa tudo. */
  clearCache(placeId?: string): void {
    if (placeId) cache.delete(placeId);
    else cache.clear();
  },

  /** Endpoint principal: orquestra settings → cache → google → fallback */
  async get(): Promise<ReviewsPayload> {
    const settings = await prisma.siteSettings.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (!settings || settings.googleEnabled !== true) return offPayload();

    const placeId = (settings.googlePlaceId ?? process.env.GOOGLE_PLACE_ID ?? '').trim();
    const apiKey  = (process.env.GOOGLE_PLACES_API_KEY ?? '').trim();

    // Sem placeId ou sem key → modo manual (se houver mapsUrl) ou off
    if (!placeId || !apiKey) {
      if (settings.googleMapsUrl) return manualPayload(settings);
      return offPayload();
    }

    // Cache hit?
    const hit = cache.get(placeId);
    const now = Date.now();
    if (hit && hit.expiresAt > now) return hit.payload;

    // Buscar no Google
    try {
      const g = await fetchFromGoogle(placeId, apiKey);
      const payload: ReviewsPayload = {
        enabled:      true,
        source:       'google',
        // Google é fonte da verdade; usa manual só se Google não devolver
        rating:       g.rating       ?? settings.googleRatingManual ?? null,
        reviewsCount: g.reviewsCount ?? settings.googleReviewsCount ?? null,
        reviews:      g.reviews,
        mapsUrl:      settings.googleMapsUrl   ?? g.mapsUri ?? null,
        reviewUrl:    settings.googleReviewUrl ?? null,
        cachedAt:     new Date().toISOString(),
      };
      cache.set(placeId, { payload, expiresAt: now + cacheTtlMs() });
      return payload;
    } catch (err) {
      console.error('[google-reviews] Falha ao consultar Places API:', (err as Error).message);
      if (settings.googleMapsUrl) return manualPayload(settings);
      return offPayload();
    }
  },
};
