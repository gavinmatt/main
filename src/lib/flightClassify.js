// Airline lookup and notability flags shared by the flight table and map.

// Feed values end up in innerHTML, so escape anything that isn't ours.
export function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export function distanceNm(lat1, lon1, lat2, lon2) {
  const R = 3440.065;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const EMERGENCY_SQUAWKS = {
  7500: "Hijack",
  7600: "Radio failure",
  7700: "General emergency",
};

// readsb's emergency field; lifeguard and minfuel are priority, not emergencies.
const EMERGENCY_STATES = {
  general: "General emergency",
  nordo: "Radio failure",
  unlawful: "Hijack",
  downed: "Aircraft downed",
};

export function emergencyReason(f) {
  return EMERGENCY_SQUAWKS[f.squawk] || EMERGENCY_STATES[f.emergency] || null;
}

// Aerial firefighting operators, by callsign prefix.
export const FIREFIGHTING_OPERATORS = new Set(["BGR", "FGD", "TKR", "XCN", "CUL", "ASB"]);

export function isFirefighting(f) {
  const prefix = callsignRaw(f).match(/^[A-Z]{3}/)?.[0];
  return FIREFIGHTING_OPERATORS.has(prefix);
}

export const AIRLINE_NAMES = {
  AAL: "American Airlines",
  DAL: "Delta Air Lines",
  UAL: "United Airlines",
  ASA: "Alaska Airlines",
  SWA: "Southwest Airlines",
  JBU: "JetBlue Airways",
  NKS: "Spirit Airlines",
  FFT: "Frontier Airlines",
  SKW: "SkyWest Airlines",
  ACA: "Air Canada",
  ROU: "Air Canada Rouge",
  WJA: "WestJet",
  WEN: "WestJet Encore",
  TSC: "Air Transat",
  SWG: "Sunwing",
  FLE: "Flair Airlines",
  QXE: "Horizon Air",
  JZA: "Jazz",
  AKT: "Canadian North",
  CNK: "Sunwest Aviation",
  LXJ: "Flexjet",
  VIR: "Virgin Atlantic",
  UPS: "UPS Airlines",
  FDX: "FedEx Express",
  GTI: "Atlas Air",
  CKS: "Kalitta Air",
  ABX: "ABX Air",
  POE: "Porter Airlines",
  PAC: "Polar Air Cargo",
  CLX: "Cargolux",
  MNB: "MNG Airlines",
  TAY: "ASL Airlines Belgium",
  EGG: "Western Global Airlines",
  WGN: "Western Global Airlines",
  MAL: "Morningstar Air",
  CJT: "Cargojet",
  ATN: "Air Transport International",
  CFS: "Empire Airlines",
  AAY: "Allegiant",
  SCX: "Sun Country Airlines",
  BAW: "British Airways",
  DLH: "Lufthansa",
  KLM: "KLM Royal Dutch Airlines",
  AFR: "Air France",
  SAS: "Scandinavian Airlines",
  FIN: "Finnair",
  IBE: "Iberia",
  TAP: "TAP Air Portugal",
  LOT: "LOT Polish Airlines",
  AUA: "Austrian Airlines",
  SWR: "SWISS",
  EIN: "Aer Lingus",
  CFG: "Condor",
  ICE: "Icelandair",
  FBU: "French Bee",
  ANA: "All Nippon Airways",
  JAL: "Japan Airlines",
  KAL: "Korean Air",
  CPA: "Cathay Pacific",
  EVA: "EVA Air",
  CAL: "China Airlines",
  AIC: "Air India",
  UAE: "Emirates",
  QQE: "Qatar Executive",
  QTR: "Qatar Airways",
  ETD: "Etihad Airways",
  SVA: "Saudia",
  THY: "Turkish Airlines",
  IFA: "Fai Airservice",
  HRT: "Chartright Air",
  ETH: "Ethiopian Airlines",
  RAM: "Royal Air Maroc",
  JAS: "Janus Airways",
  AEL: "AirExplore",
  BCS: "DHL Air",
  EWG: "Eurowings",
  TUI: "TUI Airways",
  CAP: "Civil Air Patrol",
  ASP: "AirSprint",
  AIP: "Alpine Aviation",
  EJA: "NetJets",
  AMF: "Ameriflight",
  VJA: "VistaAmerica",
  AJI: "Ameristar Jet Charter",
  TWY: "Sunset Aviation",
  SPA: "Sierra Pacific",
  KOW: "Baker Aviation",
  RAX: "Royal Air Freight",
  CBC: "SkyShare",
  RDN: "Red Barn Operations (Boeing)",
  TFF: "Talon Air",
  EJM: "Executive Jet Management",
  SYB: "SkyService Business Aviation",
  AZG: "Ameriflight",
  TKJ: "AJet",
  SDE: "Air Partners",
  CYO: "ATI Jet",
  NJM: "Northern Jet Management",
  LKF: "Aviation Advisor",
  ICV: "Cargolux Italia",
  JCM: "Secure Air Charter",
  DLX: "Dreamline Aviation",
  FGD: "Conair Aviation",
  ADS: "Anderson Air",
  JTL: "Jet Linx",
  COL: "SC Aviation",
  DHK: "DHL Air",
  PAL: "Philippine Airlines",
  PCJ: "Pacific Jet",
  ITY: "ITA Airways",
  SIA: "Singapore Airlines",
  LVL: "Level Airlines",
  LYC: "Lynden Air Cargo",
  MSR: "Egypt Air",
  TCN: "Jet Excellence",
  BBB: "Blackbird Air",
  AIH: "AirZeta",
  VJT: "VistaJet",
  PHX: "SkyCare",
  JTZ: "Nicholas Air",
  JRE: "FlyExclusive",
  RKJ: "Charter Airlines",
  FFL: "ForeFlight",
  ENY: "Envoy Air",
  RPA: "Republic Airways",
  EDV: "Endeavor Air",
  GJS: "GoJet Airlines",
  ASH: "Mesa Airlines",
  JIA: "PSA Airlines",
  MXY: "Breeze Airways",
  VXP: "Avelo Airlines",
  HAL: "Hawaiian Airlines",
  PCO: "Pacific Coastal Airlines",
  ELY: "El Al",
  AAR: "Asiana Airlines",
  CCA: "Air China",
  CES: "China Eastern Airlines",
  CSN: "China Southern Airlines",
  CHH: "Hainan Airlines",
  HVN: "Vietnam Airlines",
  TZP: "ZIPAIR",
  AJT: "Amerijet",
  NCR: "National Airlines",
  NCA: "Nippon Cargo Airlines",
  CAO: "Air China Cargo",
  KFS: "Kalitta Charters",
  AWI: "Air Wisconsin",
  BOX: "AeroLogic",
  CKK: "China Cargo Airlines",
  CXA: "Xiamen Airlines",
  EDW: "Edelweiss Air",
  ABD: "Air Atlanta Icelandic",
  APZ: "Air Premia",
  AER: "Alaska Central Express",
  ANT: "Air North",
  ADB: "Antonov Airlines",
  OAE: "Omni Air International",
  OCN: "Discover Airlines",
  FDB: "flydubai",
  THA: "Thai Airways",
  GLR: "Central Mountain Air",
  NJE: "NetJets Europe",
  WUP: "Wheels Up",
  XSR: "Executive AirShare",
  PWA: "Priester Aviation",
  CRN: "Carson Air",
  CPT: "Corporate Air",
  CNS: "PlaneSense",
  BGR: "Bridger Aerospace",
  TIV: "Thrive Aviation",
  PBR: "Fast Air",
  PXT: "Pacific Coast Jet",
  STT: "Western Aircraft",
  THT: "Air Tahiti Nui",
  BFF: "Air Nunavut",
  NVC: "NAV CANADA",
  DCM: "FltPlan",
  JCY: "Aerius Management",
  SUT: "Summit Air",
  XCN: "US Forest Service",
  RGY: "Regency Air",
  CRE: "Jet OUT",
  PRE: "Precision Aircraft Management",
  XSN: "AirSF",
  KNT: "Flightpath Charter Airways",
  TKR: "Erickson Aero Tanker",
  TTE: "AvCenter",
  XEN: "Zenflight",
  CWG: "Wing Aviation",
  JWZ: "Paradise Jets",
  TLK: "Starlink Aviation",
  XFL: "Executive Fliteways",
  CTF: "Cutter Aviation",
  HER: "Hera Flight",
  LND: "Direct2",
  MVJ: "Mira Vista Aviation",
  NTW: "Maxair",
  SVL: "Alante Air Charter",
  TOR: "FLYGTA Airlines",
  UAG: "Union Aviation",
  VLZ: "Volare Aviation",
  EDG: "Jet Edge",
  IJA: "International Jet",
  KFB: "STAjets",
  LVW: "Pacific Sky Aviation",
  MBK: "Chrono Jet",
  AKJ: "Akasa Air",
  FSY: "Private Air",
  JBA: "Helijet International",
  KAY: "K5 Aviation",
  KII: "Kalitta Charters II",
  MCB: "Beaver Air Services",
  SCJ: "Spring City Jet",
  SIS: "Silver Air",
  VNT: "Ventura",
  VTE: "Contour Aviation",
  WSN: "Advanced Air",
  WWI: "Worldwide Jet Charter",
  YEL: "Summit Aviation",
  BLK: "Aero",
  WBC: "FTV Aviation",
  CCK: "Carlisle Air Group",
  CTP: "CTP Aviation",
  FLC: "Private",
  GLH: "Chervon",
  HTT: "Latitude Air Ambulance",
  NRL: "Nolinor Aviation",
  PGR: "Prestige Air Group",
  SLH: "Silverhawk Aviation",
  WMN: "Trident Aircraft",
  XGN: "NextGen Flight Solutions",
  ETA: "Reynolds Jet",
  FRG: "Freight Runners Express",
  GXA: "GlobalX",
  IFL: "IFL Group",
  IJW: "InterJet West",
  JCO: "Jet Concierge Club",
  JPR: "Bighorn Airways",
  LUA: "Luminair",
  OKC: "Private Jets",
  POD: "Craft Charter",
  STV: "Saturn Aviation",
  PFT: "Air Cargo Express International",
  BBA: "Bannert Air",
  CMB: "Atlas Air",
  DZR: "Midwest Aviation",
  GDG: "GoodJET",
  NSZ: "Norwegian Air Sweden",
  ERY: "Sky Quest",
  FWK: "Flightworks",
  MWT: "Midwest Aviation Division",
  MWJ: "Private",
  NEW: "NEAJETS",
  NSH: "Sterling Aviation",
  QLK: "QantasLink",
  SCM: "American Jet International",
  SGX: "Slate Aviation",
  WDY: "Chicago Jet Group",
  XLJ: "XCEL JET",
  ARR: "Avalair Aircraft Management",
  BBQ: "Eastern Air Express",
  BHR: "Bighorn Airways",
  BTX: "Volkswagen Air Service",
  CBE: "JH Transportation",
  CRR: "Canadian Pacific Railway",
  CUL: "Coulson Aviation",
  CWA: "CanWest Air",
  DSO: "Dassault Falcon Service",
  ECJ: "East Coast Jets",
  GGW: "Duke Energy",
  GJE: "Global Air Charters",
  GLF: "Gulfstream Aerospace",
  GRP: "Gryphon Air",
  JNX: "jetNEXA",
  KAF: "Kenya Air Force",
  KEW: "Keewatin Air",
  LFG: "Let's Jett",
  LGL: "Luxair",
  LJY: "L.J. Aviation",
  LRQ: "Luxembourg Air Rescue",
  LRT: "Liberty Jet Management",
  LVA: "30 West Jets",
  LYM: "Key Lime Air",
  MDC: "airmedic",
  MMD: "Air Alsie",
  MVP: "Premier Private Jets",
  OME: "AirExplore",
  PEX: "Shell Aviation",
  PWR: "Quanta Aviation Services",
  RFS: "Rainier Flight Service",
  ROT: "TAROM",
  SRA: "Saudi Royal Flight",
  TFJ: "Private",
  TSU: "Gulf and Caribbean Cargo",
  AAB: "Luxaviation Belgium",
  ASB: "Air Spray",
  AWC: "Titan Airways",
  BRG: "Bering Air",
  BVR: "ACM Air Charter",
  CNF: "CanaryFly",
  DCS: "DC Aviation",
  DGX: "DASNAIR",
  DHC: "De Havilland Canada",
  DOJ: "US Department of Justice",
  FLT: "FltPlan",
  FTD: "AB Jets",
  GES: "Gestair",
  IPD: "Business Aviators",
  JLG: "Jet Logistics",
  JNY: "Journey Aviation",
  JUS: "USA Jet Airlines",
  JXA: "Jet Access",
  KAI: "KaiserAir",
  KLE: "RusAero",
  KOC: "SetAir",
  KPO: "Fly Alliance",
  LTX: "Aerolytix International",
  MLM: "Comlux Malta",
  MWH: "Elemental Aviation",
  NGF: "Air Charity Network",
  NJZ: "Neojets",
  OBD: "BOND",
  PCH: "Pilatus Flugzeugwerke",
  PKW: "Sierra West Airlines",
  PRD: "Presidential Aviation",
  RKS: "Phenix Jet",
  SBE: "Leviate Air Group",
  SIL: "Argentum Airways",
  SJJ: "SpiritJets",
  SRY: "Sterling Airways",
  STY: "Altius Aviation",
  SWW: "Swiss Private Jet",
  TBJ: "TAG Aviation Asia",
  TXG: "7Air Cargo",
  VAL: "Voyageur Airways",
  VOK: "Centennial Jets",
  WWF: "Owyhee Air Research",
};

export const COMMON_AIRLINES = new Set([
  "American Airlines",
  "Delta Air Lines",
  "United Airlines",
  "Alaska Airlines",
  "Southwest Airlines",
  "JetBlue Airways",
  "Spirit Airlines",
  "Frontier Airlines",
  "Air Canada",
  "Air Canada Rouge",
  "WestJet",
  "WestJet Encore",
  "FedEx Express",
  "UPS Airlines",
  "Flair Airlines",
  "Horizon Air",
  "Cargojet",
  "Air Transport International",
  "SkyWest Airlines",
  "Sunwest Aviation",
  "Empire Airlines",
  "Alpine Aviation",
  "NetJets",
  "Ameriflight",
  "VistaAmerica",
  "Allegiant",
  "Ameristar Jet Charter",
  "Chartright Air",
  "Sunset Aviation",
  "Sierra Pacific",
  "Baker Aviation",
  "Sun Country Airlines",
  "Envoy Air",
  "Republic Airways",
  "Endeavor Air",
  "GoJet Airlines",
  "Mesa Airlines",
  "PSA Airlines",
  "Breeze Airways",
  "Pacific Coastal Airlines",
  "Summit Air",
  "AirSF",
  "Porter Airlines",
  "AirSprint",
  "Flexjet",
  "Jazz",
  "Carson Air",
  "Corporate Air",
  "ABX Air",
  "Anderson Air",
  "Kalitta Air",
  "Executive Jet Management",
  "Atlas Air",
  "FlyExclusive",
  "Jet Linx",
  "Morningstar Air",
  "Air Partners",
  "SkyService Business Aviation",
  "Jet Excellence",
  "VistaJet",
  "Red Barn Operations (Boeing)",
  "Bridger Aerospace",
  "Thrive Aviation",
  "Fast Air",
  "Pacific Coast Jet",
  "Western Aircraft",
  "SkyShare",
  "Canadian North",
  // Business jet, charter, and utility operators: not airlines, so never "uncommon".
  "Qatar Executive",
  "Fai Airservice",
  "Janus Airways",
  "Civil Air Patrol",
  "Royal Air Freight",
  "Talon Air",
  "ATI Jet",
  "Northern Jet Management",
  "Aviation Advisor",
  "Secure Air Charter",
  "Dreamline Aviation",
  "Conair Aviation",
  "SC Aviation",
  "Pacific Jet",
  "Blackbird Air",
  "AirZeta",
  "SkyCare",
  "Nicholas Air",
  "Charter Airlines",
  "ForeFlight",
  "Kalitta Charters",
  "NetJets Europe",
  "Wheels Up",
  "Executive AirShare",
  "Priester Aviation",
  "NAV CANADA",
  "FltPlan",
  "Aerius Management",
  "Regency Air",
  "Jet OUT",
  "Precision Aircraft Management",
  "Flightpath Charter Airways",
  "AvCenter",
  "Zenflight",
  "Wing Aviation",
  "Paradise Jets",
  "Starlink Aviation",
  "Executive Fliteways",
  "Cutter Aviation",
  "Hera Flight",
  "Direct2",
  "Mira Vista Aviation",
  "Maxair",
  "Alante Air Charter",
  "Union Aviation",
  "Volare Aviation",
  "Jet Edge",
  "International Jet",
  "STAjets",
  "Pacific Sky Aviation",
  "Chrono Jet",
  "Private Air",
  "Helijet International",
  "K5 Aviation",
  "Kalitta Charters II",
  "Beaver Air Services",
  "Spring City Jet",
  "Silver Air",
  "Ventura",
  "Contour Aviation",
  "Advanced Air",
  "Worldwide Jet Charter",
  "Summit Aviation",
  "Aero",
  "FTV Aviation",
  "Carlisle Air Group",
  "CTP Aviation",
  "Chervon",
  "Latitude Air Ambulance",
  "Nolinor Aviation",
  "Prestige Air Group",
  "Silverhawk Aviation",
  "Trident Aircraft",
  "NextGen Flight Solutions",
  "Reynolds Jet",
  "Freight Runners Express",
  "GlobalX",
  "IFL Group",
  "InterJet West",
  "Jet Concierge Club",
  "Bighorn Airways",
  "Luminair",
  "Private Jets",
  "Craft Charter",
  "Saturn Aviation",
  "Air Cargo Express International",
  "Bannert Air",
  "Midwest Aviation",
  "GoodJET",
  "Norwegian Air Sweden",
  "Sky Quest",
  "Flightworks",
  "Midwest Aviation Division",
  "NEAJETS",
  "Sterling Aviation",
  "American Jet International",
  "Slate Aviation",
  "Chicago Jet Group",
  "XCEL JET",
  "Avalair Aircraft Management",
  "Eastern Air Express",
  "JH Transportation",
  "Canadian Pacific Railway",
  "CanWest Air",
  "Dassault Falcon Service",
  "East Coast Jets",
  "Duke Energy",
  "Global Air Charters",
  "Gulfstream Aerospace",
  "Gryphon Air",
  "jetNEXA",
  "Let's Jett",
  "L.J. Aviation",
  "Liberty Jet Management",
  "30 West Jets",
  "Key Lime Air",
  "airmedic",
  "Air Alsie",
  "Premier Private Jets",
  "Shell Aviation",
  "Quanta Aviation Services",
  "Rainier Flight Service",
  "Luxaviation Belgium",
  "ACM Air Charter",
  "DC Aviation",
  "DASNAIR",
  "De Havilland Canada",
  "AB Jets",
  "Gestair",
  "Business Aviators",
  "Jet Logistics",
  "Journey Aviation",
  "USA Jet Airlines",
  "Jet Access",
  "KaiserAir",
  "SetAir",
  "Fly Alliance",
  "Aerolytix International",
  "Comlux Malta",
  "Elemental Aviation",
  "Air Charity Network",
  "Neojets",
  "BOND",
  "Pilatus Flugzeugwerke",
  "Sierra West Airlines",
  "Presidential Aviation",
  "Phenix Jet",
  "Leviate Air Group",
  "Argentum Airways",
  "SpiritJets",
  "Sterling Airways",
  "Altius Aviation",
  "Swiss Private Jet",
  "TAG Aviation Asia",
  "7Air Cargo",
  "Voyageur Airways",
  "Centennial Jets",
  "Owyhee Air Research",
]);

export function airlineFromCallsign(cs) {
  if (!cs) return "—";
  if (/^N\d{1,5}[A-Z]{0,2}$/.test(cs)) return "Private";
  if (/^C-?[FG][A-Z]{3}$/.test(cs)) return "Private";
  if (/^G-?[A-Z]{4}$/.test(cs)) return "Private";
  if (/^D-?[A-Z]{4}$/.test(cs)) return "Private";
  if (/^HB-?[A-Z]{3}$/.test(cs)) return "Private";
  if (/^NCJ\d+/.test(cs)) return "Private";
  const prefix = cs.match(/^[A-Z]{2,3}/)?.[0];
  return AIRLINE_NAMES[prefix] || "—";
}

export function callsignRaw(f) {
  const cs = (f.flight || f.callsign || "").trim().toUpperCase();
  if (!cs || cs === "00000000") return "";
  return cs;
}

export function isUnknownAirline(f) {
  const cs = callsignRaw(f);
  if (!cs) return false;
  const looksLikeAirline = /^[A-Z]{2,3}\d/.test(cs);
  if (!looksLikeAirline) return false;
  const prefix = cs.match(/^[A-Z]{2,3}/)?.[0];
  return !AIRLINE_NAMES[prefix];
}

export function isPrivateFlight(f) {
  const cs = callsignRaw(f);
  if (!cs) return false;
  if (/^NCJ\d+/.test(cs)) return "Private";
  return (
    /^N\d{1,5}[A-Z]{0,2}$/.test(cs) ||
    /^C-?[FG][A-Z]{3}$/.test(cs) ||
    /^G-?[A-Z]{4}$/.test(cs) ||
    /^D-?[A-Z]{4}$/.test(cs) ||
    /^HB-?[A-Z]{3}$/.test(cs)
  );
}

export function isAirlineFlight(f) {
  const cs = callsignRaw(f);
  return /^[A-Z]{2,3}\d/.test(cs);
}

export function hexUpper(f) {
  return f.hex?.toUpperCase() ?? "";
}

export function airlineFromFlight(f) {
  const cs = callsignRaw(f);
  if (/^BOE\d+/.test(cs)) return "Boeing Test Flight";
  if (isPrivateFlight(f)) return "Private";
  if (f.op?.trim()) return f.op.trim();
  if (!cs) return "Undetermined";
  const prefix = cs.match(/^[A-Z]{2,3}/)?.[0];
  return AIRLINE_NAMES[prefix] || "—";
}

export function militaryBranch(f) {
  const cs = callsignRaw(f);
  if (hexUpper(f).startsWith("AE")) {
    if (
      /^(ENRGY|QID|TEX|GOLD|NACHO)/.test(cs) ||
      ((f.alt_baro ?? 0) > 30000 && (f.gs ?? 0) < 500)
    ) {
      return "USAF (TANKER)";
    }
    return "USAF";
  }
  if (/^(ENRGY|QID|TEX|GOLD|NACHO|RCH|REACH|AMC)/.test(cs))
    return "USAF (TANKER)";
  if (/^(NAVY|CNV|VV)/.test(cs)) return "USN";
  if (/^(PAT|ARMY)/.test(cs)) return "USA";
  if (/^(VM|MAR)/.test(cs)) return "USMC";
  if (/^SAM\d/.test(cs)) return "USAF";
  if (/^CFC\d/.test(cs)) return "RCAF";
  if (/^RRR\d/.test(cs)) return "RAF";
  if (/^GAF\d/.test(cs)) return "GAF";
  if (/^CTM\d/.test(cs)) return "FR AF";
  if (/^IAM\d/.test(cs)) return "IT AF";
  if (/^KAF\d/.test(cs)) return "KENYA AF";
  return null;
}

export function classifyNotability(f) {
  const cs = callsignRaw(f);
  if (emergencyReason(f))
    return { label: "EMERGENCY", cls: "bg-red-600 text-white" };
  if (isFirefighting(f))
    return { label: "FIREFIGHTING", cls: "bg-orange-100 text-orange-800" };
  if (f.category === "A7")
    return { label: "HELI", cls: "bg-emerald-100 text-emerald-800" };
  if (/^BOE\d+/.test(cs))
    return { label: "Test Flight", cls: "bg-amber-100 text-amber-800" };
  const branch = militaryBranch(f);
  if (branch) {
    return {
      label: branch,
      cls: branch.includes("TANKER")
        ? "bg-red-200 text-red-900"
        : "bg-red-100 text-red-800",
    };
  }
  const airline = airlineFromFlight(f);
  if (
    isAirlineFlight(f) &&
    airline !== "—" &&
    airline !== "Private" &&
    !COMMON_AIRLINES.has(airline)
  ) {
    return { label: "UNCOMMON", cls: "bg-blue-100 text-blue-800" };
  }
  if ((f.alt_baro ?? 0) > 45000 || (f.gs ?? 0) > 550) {
    return { label: "FAST/HIGH", cls: "bg-yellow-100 text-yellow-800" };
  }
  return null;
}
