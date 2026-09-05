/**
 * chartGeoreference.js — Pixel-to-lat/lon calibration for overlaying a raster
 * chart image (e.g. an Airport Diagram) on the Leaflet map, given 2+ known
 * ground-control-point correspondences (pixel coordinate on the image ↔ real
 * lat/lon, e.g. from `/v1/aviation:runways`'s threshold coordinates).
 *
 * Similarity transform only (uniform scale + rotation + translation, no
 * shear/skew) — correct for a chart that's a straight-on, undistorted scan,
 * which an FAA Airport Diagram is. Solved in a local flat-meters frame
 * (equirectangular approx around the GCPs' centroid — fine at airport scale,
 * same approximation faaData.js already uses for its nm↔degree conversion)
 * rather than directly in lat/lon, since lat/lon isn't a uniform-scale space.
 *
 * Needs 2+ correspondences (a similarity transform has 4 degrees of freedom:
 * scale, rotation, tx, ty — 2 points give 4 equations, exactly determined;
 * 3+ points get least-squares fit).
 */

const R_EARTH_M = 6371000;

// lat/lon → local flat meters, relative to a reference point. Fine for the
// sub-few-km scale of a single airport diagram.
function toLocalMeters(lat, lon, refLat, refLon) {
  const dLat = (lat - refLat) * (Math.PI / 180);
  const dLon = (lon - refLon) * (Math.PI / 180);
  const y = dLat * R_EARTH_M;
  const x = dLon * R_EARTH_M * Math.cos((refLat * Math.PI) / 180);
  return [x, y];
}

function fromLocalMeters(x, y, refLat, refLon) {
  const dLat = y / R_EARTH_M;
  const dLon = x / (R_EARTH_M * Math.cos((refLat * Math.PI) / 180));
  return [refLat + (dLat * 180) / Math.PI, refLon + (dLon * 180) / Math.PI];
}

/**
 * Solve a similarity transform (pixel → local-meters) from correspondences.
 * @param {Array<{px:number, py:number, lat:number, lon:number}>} points
 * @returns {{fn: function, refLat:number, refLon:number, params:{a:number,b:number,tx:number,ty:number}, residualsM:number[]}}
 *   fn(px, py) -> [lat, lon]. residualsM: per-point fit error in meters (0 for
 *   exactly-2-point case; real for 3+, least-squares).
 */
export function solveSimilarityTransform(points) {
  if (!Array.isArray(points) || points.length < 2) {
    throw new Error("solveSimilarityTransform needs at least 2 correspondences");
  }
  const refLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const refLon = points.reduce((s, p) => s + p.lon, 0) / points.length;

  // Image pixel space has +y pointing DOWN the page; the local-meters frame
  // (built from lat/lon) has +y pointing north, i.e. UP. Those are
  // opposite-handed 2D coordinate systems, and a pure similarity transform
  // (rotation + uniform scale, no reflection) can't map between
  // opposite-handed frames without producing a mirror image — verified this
  // session: fitting raw px/py against north-up meters rendered the overlay
  // with every label backwards. Negating py once here (and again in fn's
  // inverse) re-expresses pixel space as a north-up-equivalent frame first,
  // which resolves the handedness mismatch before the fit ever runs.
  const local = points.map(p => {
    const [mx, my] = toLocalMeters(p.lat, p.lon, refLat, refLon);
    return { px: p.px, py: -p.py, mx, my };
  });

  // Similarity transform: [mx,my] = a*[px,-py] + b*[py,px] + [tx,ty]
  //   mx = a*px - b*py + tx
  //   my = a*py + b*px + ty
  // Linear least squares over 4 unknowns (a, b, tx, ty), any N >= 2.
  // Normal equations, solved directly (4x4, closed form via elimination).
  let Sxx = 0, Sxy = 0, Sx = 0, Syy = 0, Sy = 0, N = local.length;
  let Amx = 0, Amy = 0, Bmx = 0, Bmy = 0;
  for (const { px, py, mx, my } of local) {
    Sxx += px * px + py * py;
    Sx += px; Sy += py;
    Amx += px * mx + py * my; // coefficient pairing for 'a'
    Bmx += px * my - py * mx; // coefficient pairing for 'b'
  }
  // Standard closed-form least-squares solution for similarity/Umeyama-style fit:
  // a = sum(px*mx + py*my) / sum(px^2+py^2)  (after centering)
  const cpx = Sx / N, cpy = Sy / N;
  const cmx = local.reduce((s, p) => s + p.mx, 0) / N;
  const cmy = local.reduce((s, p) => s + p.my, 0) / N;
  let num_a = 0, num_b = 0, den = 0;
  for (const { px, py, mx, my } of local) {
    const dpx = px - cpx, dpy = py - cpy;
    const dmx = mx - cmx, dmy = my - cmy;
    num_a += dpx * dmx + dpy * dmy;
    num_b += dpx * dmy - dpy * dmx;
    den += dpx * dpx + dpy * dpy;
  }
  const a = num_a / den;
  const b = num_b / den;
  const tx = cmx - (a * cpx - b * cpy);
  const ty = cmy - (b * cpx + a * cpy);

  const residualsM = local.map(({ px, py, mx, my }) => {
    const predMx = a * px - b * py + tx;
    const predMy = b * px + a * py + ty;
    return Math.hypot(predMx - mx, predMy - my);
  });

  function fn(px, py) {
    const pyUp = -py; // see handedness note above
    const mx = a * px - b * pyUp + tx;
    const my = b * px + a * pyUp + ty;
    return fromLocalMeters(mx, my, refLat, refLon);
  }

  return { fn, refLat, refLon, params: { a, b, tx, ty }, residualsM };
}
