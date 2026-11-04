/**
 * Plug types and mains voltage by ISO country code (IEC World Plugs).
 * Covers the most-travelled countries; unknown codes fall back to a generic tip.
 */
interface PlugInfo {
  types: string[];
  volts: number;
}

const P = (types: string, volts = 230): PlugInfo => ({ types: types.split(''), volts });

const PLUGS: Record<string, PlugInfo> = {
  // North & Central America, Caribbean
  US: P('AB', 120), CA: P('AB', 120), MX: P('AB', 127), PR: P('AB', 120), CR: P('AB', 120),
  PA: P('AB', 120), GT: P('AB', 120), DO: P('AB', 120), JM: P('AB', 110), BS: P('AB', 120),
  CU: P('ABCL', 110), CO: P('AB', 110), EC: P('AB', 120), PE: P('ABC', 220), VE: P('AB', 120),
  BR: P('CN', 127), AR: P('CI', 220), CL: P('CL', 220), UY: P('CFIL', 220),
  // Europe — Schuko / Europlug
  DE: P('CF'), NL: P('CF'), AT: P('CF'), ES: P('CF'), PT: P('CF'), GR: P('CF'), SE: P('CF'),
  NO: P('CF'), FI: P('CF'), IS: P('CF'), LU: P('CF'), HU: P('CF'), RO: P('CF'), BG: P('CF'),
  HR: P('CF'), SI: P('CF'), RS: P('CF'), BA: P('CF'), ME: P('CF'), AL: P('CF'), MK: P('CF'),
  EE: P('CF'), LV: P('CF'), LT: P('CF'), UA: P('CF'), RU: P('CF'), TR: P('CF'), GE: P('CF'),
  FR: P('CE'), BE: P('CE'), PL: P('CE'), CZ: P('CE'), SK: P('CE'), MC: P('CEF'),
  DK: P('CEFK'), IT: P('CFL'), SM: P('CFL'), CH: P('CJ'), LI: P('CJ'),
  // UK & Type G countries
  GB: P('G'), IE: P('G'), MT: P('G'), CY: P('G'), GI: P('G'), HK: P('G', 220), MO: P('DG', 220),
  SG: P('G'), MY: P('G', 240), AE: P('G'), QA: P('G', 240), BH: P('G'), KW: P('G', 240),
  OM: P('G', 240), SA: P('G'), KE: P('G', 240), UG: P('G', 240), MU: P('CG'), BN: P('G', 240),
  NG: P('DG'), GH: P('DG'), TZ: P('DG'), ZW: P('DG', 220), LK: P('DG'), MV: P('DG'),
  // Asia & Pacific
  JP: P('AB', 100), KR: P('CF', 220), TW: P('AB', 110), CN: P('ACI', 220), PH: P('ABC', 220),
  TH: P('ABCO'), VN: P('ABC', 220), KH: P('ACG'), LA: P('ABCEF'), ID: P('CF'), MM: P('CDFG'),
  IN: P('CDM'), NP: P('CDM'), PK: P('CD'), BD: P('CDGK', 220), AU: P('I'), NZ: P('I'),
  FJ: P('I', 240), PG: P('I', 240),
  // Middle East & Africa
  IL: P('CHM'), JO: P('BCDFGJ'), EG: P('CF', 220), MA: P('CE', 220), TN: P('CE'), DZ: P('CF'),
  ZA: P('CDMN'), NA: P('DM', 220), BW: P('DG'), ET: P('CEFL', 220), RW: P('CJ'), SN: P('CDEK'),
};

const REGION_NAME = (code: string) => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
};

export interface AdapterAdvice {
  needed: boolean;
  name: string;
  reason: string;
}

/**
 * Decide whether an adapter is needed and which one.
 * `home` may be undefined (device locale unknown) — then we still name the destination type.
 */
export function adapterAdvice(home: string | undefined, dest: string | undefined): AdapterAdvice | null {
  if (!dest) return { needed: true, name: 'Travel plug adapter', reason: 'Check the plug type at your destination' };
  const d = PLUGS[dest.toUpperCase()];
  if (!d) {
    if (home && home.toUpperCase() === dest.toUpperCase()) return null;
    return { needed: true, name: 'Travel plug adapter', reason: `Check the plug type in ${REGION_NAME(dest)}` };
  }
  const h = home ? PLUGS[home.toUpperCase()] : undefined;
  const types = d.types.join('/');
  // C (Europlug) fits E, F and most two-pin sockets — count it as compatible.
  const compatible = h && h.types.some((t) => d.types.includes(t) || (t === 'C' && d.types.some((x) => 'EFJKL'.includes(x))));
  const voltWarn = h && Math.abs(h.volts - d.volts) > 50 ? ' — check your devices are dual-voltage' : '';
  if (compatible) {
    return voltWarn
      ? {
          needed: true,
          name: 'Voltage converter (if devices aren’t dual-voltage)',
          reason: `Same plugs, but ${REGION_NAME(dest)} runs on ${d.volts}V`,
        }
      : null;
  }
  return {
    needed: true,
    name: `Type ${types} plug adapter`,
    reason: `${REGION_NAME(dest)} uses type ${types} sockets, ${d.volts}V${voltWarn}`,
  };
}
