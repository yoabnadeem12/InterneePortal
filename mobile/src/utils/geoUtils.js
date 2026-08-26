/**
 * geoUtils.js
 * Haversine formula to compute distance between two GPS coordinates.
 */

/**
 * Returns distance in meters between two lat/lng points.
 */
export const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth radius in meters
  const toRad = x => (x * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Returns true if the user is within radiusMeters of the department.
 */
export const isWithinRadius = (
  deptLat,
  deptLng,
  userLat,
  userLng,
  radiusMeters = 50,
) => {
  const dist = haversineDistance(deptLat, deptLng, userLat, userLng);
  return {isInside: dist <= radiusMeters, distance: Math.round(dist)};
};
