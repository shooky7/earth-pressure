// Earth Pressure Calculations
// Supports: Rankine (Active/Passive), Coulomb (Active/Passive), At-Rest

const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;

// ─── Rankine Theory ───────────────────────────────────────────────────────────

export function rankineActive(phi) {
  const p = toRad(phi);
  const Ka = Math.pow(Math.tan(Math.PI / 4 - p / 2), 2);
  return parseFloat(Ka.toFixed(4));
}

export function rankinePassive(phi) {
  const p = toRad(phi);
  const Kp = Math.pow(Math.tan(Math.PI / 4 + p / 2), 2);
  return parseFloat(Kp.toFixed(4));
}

// ─── Coulomb Theory ──────────────────────────────────────────────────────────

export function coulombActive(phi, delta, beta, theta) {
  const p = toRad(phi);
  const d = toRad(delta);
  const b = toRad(beta);
  const t = toRad(theta);

  const num = Math.pow(Math.sin(t + p), 2);
  const denom =
    Math.pow(Math.sin(t), 2) *
    Math.sin(t - d) *
    Math.pow(
      1 +
        Math.sqrt(
          (Math.sin(p + d) * Math.sin(p - b)) /
            (Math.sin(t - d) * Math.sin(t + b))
        ),
      2
    );

  if (denom <= 0 || isNaN(num / denom)) return null;
  return parseFloat((num / denom).toFixed(4));
}

export function coulombPassive(phi, delta, beta, theta) {
  const p = toRad(phi);
  const d = toRad(delta);
  const b = toRad(beta);
  const t = toRad(theta);

  const num = Math.pow(Math.sin(t - p), 2);
  const denom =
    Math.pow(Math.sin(t), 2) *
    Math.sin(t + d) *
    Math.pow(
      1 -
        Math.sqrt(
          (Math.sin(p + d) * Math.sin(p + b)) /
            (Math.sin(t + d) * Math.sin(t + b))
        ),
      2
    );

  if (denom <= 0 || isNaN(num / denom)) return null;
  return parseFloat((num / denom).toFixed(4));
}

// ─── At-Rest Pressure (Jaky's Formula) ───────────────────────────────────────

export function atRestK(phi, OCR = 1) {
  const K0_nc = 1 - Math.sin(toRad(phi));
  const K0 = K0_nc * Math.pow(OCR, Math.sin(toRad(phi)));
  return parseFloat(K0.toFixed(4));
}

// ─── Pressure Distribution (per layer) ───────────────────────────────────────

export function computePressureProfile(params) {
  const { gamma, height, phi, cohesion, surcharge, waterTable, gammaSat, theory, delta, beta, theta, OCR } = params;

  const steps = 20;
  const dz = height / steps;
  const profile = [];

  let Ka, Kp, K0;

  if (theory === 'rankine' || theory === 'both') {
    Ka = rankineActive(phi);
    Kp = rankinePassive(phi);
  }
  if (theory === 'coulomb' || theory === 'both') {
    Ka = coulombActive(phi, delta, beta, theta) ?? rankineActive(phi);
    Kp = coulombPassive(phi, delta, beta, theta) ?? rankinePassive(phi);
  }
  if (theory === 'atrest') {
    K0 = atRestK(phi, OCR);
  }

  const gammaEff = gammaSat - 9.81; // submerged unit weight

  for (let i = 0; i <= steps; i++) {
    const z = i * dz;
    const isSubmerged = waterTable !== null && z > waterTable;
    const gammaUse = isSubmerged ? gammaEff : gamma;

    const sigmaV = surcharge + (isSubmerged
      ? gamma * waterTable + gammaEff * (z - waterTable)
      : gamma * z);

    const sigmaH_active = Ka !== undefined
      ? Math.max(0, Ka * sigmaV - 2 * cohesion * Math.sqrt(Ka))
      : K0 * sigmaV;

    const sigmaH_passive = Kp !== undefined ? Kp * sigmaV + 2 * cohesion * Math.sqrt(Kp) : null;
    const sigmaH_atrest = K0 !== undefined ? K0 * sigmaV : null;

    const porewater = isSubmerged ? 9.81 * (z - waterTable) : 0;

    profile.push({
      depth: parseFloat(z.toFixed(2)),
      sigmaV: parseFloat(sigmaV.toFixed(2)),
      active: parseFloat(sigmaH_active.toFixed(2)),
      passive: sigmaH_passive !== null ? parseFloat(sigmaH_passive.toFixed(2)) : null,
      atrest: sigmaH_atrest !== null ? parseFloat(sigmaH_atrest.toFixed(2)) : null,
      porewater: parseFloat(porewater.toFixed(2)),
    });
  }

  return profile;
}

// ─── Resultant Force & Point of Action ───────────────────────────────────────

export function computeResultant(profile, type = 'active') {
  let Pa = 0;
  let moment = 0;
  const H = profile[profile.length - 1].depth;

  for (let i = 1; i < profile.length; i++) {
    const z1 = profile[i - 1].depth;
    const z2 = profile[i].depth;
    const p1 = profile[i - 1][type] ?? 0;
    const p2 = profile[i][type] ?? 0;
    const dz = z2 - z1;

    const trapForce = 0.5 * (p1 + p2) * dz;
    const zCentroid = z1 + dz * (p1 + 2 * p2) / (3 * (p1 + p2 + 0.001));

    Pa += trapForce;
    moment += trapForce * (H - zCentroid);
  }

  const pointOfAction = Pa > 0 ? parseFloat((moment / Pa).toFixed(2)) : 0;
  return { force: parseFloat(Pa.toFixed(2)), pointOfAction };
}

// ─── Theory Recommendation ────────────────────────────────────────────────────

export function recommendTheory({ phi, delta, beta, theta, cohesion, waterTable }) {
  const reasons = [];
  let recommended = 'rankine';

  if (delta > 0 || beta !== 0 || theta !== 90) {
    recommended = 'coulomb';
    if (delta > 0) reasons.push('wall friction (δ > 0) — Coulomb accounts for this');
    if (beta !== 0) reasons.push(`backfill slope (β = ${beta}°) — Coulomb handles inclined fills`);
    if (theta !== 90) reasons.push(`wall inclination (θ = ${theta}°) — use Coulomb for non-vertical walls`);
  } else {
    reasons.push('vertical wall, no friction, horizontal fill — Rankine is exact and simpler');
  }

  if (cohesion > 0) {
    reasons.push('cohesive soil present — include tension crack depth in design');
  }

  if (waterTable !== null) {
    reasons.push('water table detected — pore water pressure added separately');
  }

  return { recommended, reasons };
}
