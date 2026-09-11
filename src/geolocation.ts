export type GeoFix = { lat: number; lng: number; accuracy: number };

/** Great-circle distance between two coordinates in meters. */
export function distanceMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const toRad = Math.PI / 180;
  const dLat = (bLat - aLat) * toRad;
  const dLng = (bLng - aLng) * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * toRad) * Math.cos(bLat * toRad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type GeoFailure = "unsupported" | "denied" | "unavailable" | "timeout";

export class GeolocationError extends Error {
  kind: GeoFailure;
  constructor(kind: GeoFailure, message?: string) {
    super(message ?? kind);
    this.kind = kind;
  }
}

function readPosition(
  highAccuracy: boolean,
  timeoutMs: number,
): Promise<GeoFix> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? 0,
        }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED)
          reject(new GeolocationError("denied"));
        else if (err.code === err.TIMEOUT)
          reject(new GeolocationError("timeout"));
        else reject(new GeolocationError("unavailable"));
      },
      // maximumAge: 0 forces a fresh fix — a cached fix can be from a
      // completely different place, which read as "too far" incorrectly.
      { enableHighAccuracy: highAccuracy, timeout: timeoutMs, maximumAge: 0 },
    );
  });
}

/**
 * One-shot position read with a graceful fallback: try a precise GPS fix
 * first, then fall back to the faster network-based fix (indoor GPS often
 * times out behind thick walls).
 */
export async function getPrecisePosition(timeoutMs = 8000): Promise<GeoFix> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    throw new GeolocationError("unsupported");
  }
  try {
    return await readPosition(true, timeoutMs);
  } catch (err) {
    // Permission denial is final — do not retry.
    if (err instanceof GeolocationError && err.kind === "denied") throw err;
    return await readPosition(false, 10000);
  }
}

export type PresenceResult =
  | { ok: true; fix: GeoFix; distance: number; radius: number }
  | {
      ok: false;
      fix: GeoFix | null;
      distance: number | null;
      radius: number;
      reason: GeoFailure | "far";
    };

/** How much GPS self-reported error we forgive before deciding "outside". */
export const ACCURACY_TOLERANCE_M = 100;

/**
 * Resolve whether a customer is physically inside the restaurant.
 * When the restaurant has no coordinates on file, presence falls back
 * to the table-token proof (QR scan) alone.
 */
export async function verifyOnSitePresence(
  coords: { lat: number | null | undefined; lng: number | null | undefined },
  geofenceMeters: number | null | undefined,
): Promise<PresenceResult> {
  const radius = geofenceMeters && geofenceMeters > 0 ? geofenceMeters : 150;
  let fix: GeoFix;
  try {
    fix = await getPrecisePosition();
  } catch (err) {
    return {
      ok: false,
      fix: null,
      distance: null,
      radius,
      reason: err instanceof GeolocationError ? err.kind : "unavailable",
    };
  }
  if (coords.lat == null || coords.lng == null) {
    return { ok: true, fix, distance: 0, radius };
  }
  const distance = distanceMeters(fix.lat, fix.lng, coords.lat, coords.lng);
  const tolerance = Math.min(fix.accuracy || 0, ACCURACY_TOLERANCE_M);
  if (distance <= radius + tolerance) {
    return { ok: true, fix, distance, radius };
  }
  return { ok: false, fix, distance, radius, reason: "far" };
}
