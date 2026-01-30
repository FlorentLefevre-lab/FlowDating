// src/lib/geo.ts
// Utilitaires de géolocalisation utilisant l'API Geo du gouvernement français

// Cache en mémoire pour éviter de refaire les mêmes requêtes API
const coordsCache = new Map<string, { lat: number; lng: number } | null>();

/**
 * Extrait le nom de la ville en supprimant les codes postaux et autres infos
 * Exemples:
 * - "Laon (02000)" -> "Laon"
 * - "Paris 75001" -> "Paris"
 * - "Lyon, France" -> "Lyon"
 */
export function extractCityName(location: string): string {
  return location
    // Supprimer tout ce qui est entre parenthèses: "Laon (02000)" -> "Laon"
    .replace(/\s*\([^)]*\)/g, '')
    // Supprimer les codes postaux: "Paris 75001" -> "Paris"
    .replace(/\s+\d{5}$/g, '')
    // Supprimer ce qui suit une virgule: "Lyon, France" -> "Lyon"
    .replace(/,.*$/g, '')
    // Supprimer ce qui suit un tiret avec espace: "Aix - en - Provence" -> conserver
    .trim();
}

/**
 * Normalise le nom d'une ville pour la recherche
 */
export function normalizeCity(city: string): string {
  return extractCityName(city)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .trim();
}

/**
 * Récupère les coordonnées d'une ville via l'API Geo du gouvernement français
 * https://geo.api.gouv.fr/decoupage-administratif/communes
 */
export async function getCityCoordinates(city: string | null | undefined): Promise<{ lat: number; lng: number } | null> {
  if (!city) return null;

  // Extraire le nom de la ville (sans code postal, etc.)
  const cityName = extractCityName(city);
  const normalized = normalizeCity(city);

  // Vérifier le cache
  if (coordsCache.has(normalized)) {
    return coordsCache.get(normalized) || null;
  }

  try {
    // Appel à l'API Geo du gouvernement français
    const response = await fetch(
      `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(cityName)}&fields=centre,nom,codesPostaux&limit=1&boost=population`,
      {
        headers: { 'Accept': 'application/json' },
        // Timeout de 5 secondes
        signal: AbortSignal.timeout(5000)
      }
    );

    if (!response.ok) {
      console.warn(`[GEO] API error for "${city}": ${response.status}`);
      coordsCache.set(normalized, null);
      return null;
    }

    const data = await response.json();

    if (data && data.length > 0 && data[0].centre) {
      const coords = {
        lat: data[0].centre.coordinates[1], // GeoJSON: [lng, lat]
        lng: data[0].centre.coordinates[0]
      };
      console.log(`[GEO] Found "${city}" -> ${data[0].nom} (${coords.lat}, ${coords.lng})`);
      coordsCache.set(normalized, coords);
      return coords;
    }

    console.warn(`[GEO] City not found: "${city}"`);
    coordsCache.set(normalized, null);
    return null;

  } catch (error) {
    console.error(`[GEO] Error fetching coordinates for "${city}":`, error);
    coordsCache.set(normalized, null);
    return null;
  }
}

/**
 * Calcule la distance en kilomètres entre deux points géographiques
 * Utilise la formule de Haversine
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Rayon de la Terre en km

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c); // Distance en km, arrondie
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calcule la distance entre deux villes françaises
 * Retourne null si l'une des villes n'est pas trouvée
 */
export async function getDistanceBetweenCities(
  city1: string | null | undefined,
  city2: string | null | undefined
): Promise<number | null> {
  const [coords1, coords2] = await Promise.all([
    getCityCoordinates(city1),
    getCityCoordinates(city2)
  ]);

  if (!coords1 || !coords2) {
    return null;
  }

  return calculateDistance(coords1.lat, coords1.lng, coords2.lat, coords2.lng);
}

/**
 * Filtre une liste de profils par distance maximale
 * Version asynchrone utilisant l'API Geo
 */
export async function filterByDistance<T extends { location?: string | null }>(
  profiles: T[],
  userLocation: string | null | undefined,
  maxDistance: number
): Promise<(T & { distance?: number })[]> {
  // Si on ne peut pas déterminer la position de l'utilisateur, retourner tous les profils
  if (!userLocation) {
    console.log('[GEO] No user location, skipping distance filter');
    return profiles.map(p => ({ ...p, distance: undefined }));
  }

  const userCoords = await getCityCoordinates(userLocation);

  if (!userCoords) {
    console.log(`[GEO] Could not find coordinates for user location: "${userLocation}"`);
    return profiles.map(p => ({ ...p, distance: undefined }));
  }

  console.log(`[GEO] ========== DISTANCE FILTER ==========`);
  console.log(`[GEO] User location: "${userLocation}" -> (${userCoords.lat}, ${userCoords.lng})`);
  console.log(`[GEO] Max distance: ${maxDistance} km`);
  console.log(`[GEO] Profiles to filter: ${profiles.length}`);

  // Récupérer les coordonnées de tous les profils en parallèle
  const profilesWithCoords = await Promise.all(
    profiles.map(async (profile) => {
      if (!profile.location) {
        return { ...profile, distance: undefined, coords: null };
      }

      const coords = await getCityCoordinates(profile.location);
      return { ...profile, coords };
    })
  );

  // Calculer les distances et filtrer
  const results: (T & { distance?: number })[] = [];

  for (const profile of profilesWithCoords) {
    // Si on ne peut pas déterminer les coordonnées, EXCLURE le profil
    if (!profile.coords) {
      console.log(`[GEO] ✗ EXCLUDED (no coords): "${profile.location}"`);
      continue;
    }

    // Calculer la distance
    const distance = calculateDistance(
      userCoords.lat,
      userCoords.lng,
      profile.coords.lat,
      profile.coords.lng
    );

    // Vérifier si trop loin
    if (distance > maxDistance) {
      console.log(`[GEO] ✗ EXCLUDED (too far): "${profile.location}" = ${distance} km > ${maxDistance} km`);
      continue;
    }

    // Profil accepté
    const { coords, ...rest } = profile;
    results.push({ ...rest, distance } as T & { distance?: number });
  }

  const filteredProfiles = results;

  console.log(`[GEO] ========== FILTER RESULTS ==========`);
  console.log(`[GEO] Filtered: ${filteredProfiles.length}/${profiles.length} profiles within ${maxDistance} km`);

  // Log des profils gardés avec leur distance
  filteredProfiles.forEach(p => {
    if (p.distance !== undefined) {
      console.log(`[GEO] ✓ KEPT: ${p.location} at ${p.distance} km`);
    }
  });

  return filteredProfiles;
}

/**
 * Vide le cache des coordonnées (utile pour les tests)
 */
export function clearGeoCache(): void {
  coordsCache.clear();
}
