export type LocationPoint = {
  label: string;
  address: string;
  lat: number;
  lon: number;
};

export type Point = {
  lat: number;
  lon: number;
};

export type ConstructionImpact = {
  id: string;
  corridor: "default" | "alternate";
  impactType?: string;
  description?: string;
  agency?: string;
  projectName?: string;
  startDate?: string;
  endDate?: string;
  distanceMeters: number;
  severity: "minor" | "moderate" | "extensive";
};

export type CommuteApiResponse = {
  generatedAt: string;
  points: {
    home: Point;
    midpoint: Point;
    work: Point;
  };
  sources: {
    openMeteo: unknown;
    elevation: unknown;
    nwsHourly: unknown;
    alerts: unknown;
    construction: {
      name: string;
      url: string;
      note: string;
      defaultImpacts: ConstructionImpact[];
      alternateImpacts: ConstructionImpact[];
      defaultScore: number;
      alternateScore: number;
      recommendedCorridor: "default" | "alternate";
      recommendation: string;
      reasons: string[];
    };
  };
};

type NwsPointResponse = {
  properties?: {
    forecastHourly?: string;
  };
};

type DotMapsFeature = {
  attrs?: {
    agency?: string;
    descr?: string;
    end_date?: string;
    id?: number | string;
    name?: string;
    permit_number?: string;
    start_date?: string;
    type?: string;
  };
  center?: {
    coordinates?: [number, number];
  };
  id?: number | string;
  remote_id?: string;
  shape?: {
    coordinates?: unknown;
    type?: string;
  };
};

type DotMapsResponse = {
  results?: DotMapsFeature[];
};

export const northgateStation: LocationPoint = {
  label: "Northgate Station",
  address: "Northgate Station, Seattle, WA",
  lat: 47.7023,
  lon: -122.3289,
};

export const workDestination: LocationPoint = {
  label: "2021 7th Ave",
  address: "2021 7th Ave, Seattle, WA 98121",
  lat: 47.6155,
  lon: -122.3389,
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      headers: {
        Accept: "application/geo+json, application/json",
        "User-Agent": "SeattleBikeCommutePlanner/1.0",
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function impactSeverity(feature: DotMapsFeature): ConstructionImpact["severity"] {
  const attrs = feature.attrs ?? {};
  const text = [attrs.type, attrs.descr, attrs.name, attrs.agency]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/closed|closure|detour|block|crane|paving|excavation|open trench|directional drill|mobility impact/.test(text)) {
    return "extensive";
  }

  if (/lane|sidewalk|bike|trail|pedestrian|utility|conduit|water|service renew|repair/.test(text)) {
    return "moderate";
  }

  return "minor";
}

function milesToMeters(miles: number) {
  return miles * 1609.344;
}

function pointToSegmentDistanceMeters(point: Point, start: Point, end: Point) {
  const avgLat = ((start.lat + end.lat + point.lat) / 3) * (Math.PI / 180);
  const x = (candidate: Point) => milesToMeters((candidate.lon - start.lon) * 69.172 * Math.cos(avgLat));
  const y = (candidate: Point) => milesToMeters((candidate.lat - start.lat) * 69.0);
  const px = x(point);
  const py = y(point);
  const ex = x(end);
  const ey = y(end);
  const length = ex * ex + ey * ey;
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, (px * ex + py * ey) / length));
  return Math.hypot(px - t * ex, py - t * ey);
}

function pointToCorridorDistanceMeters(point: Point, corridor: Point[]) {
  return Math.min(
    ...corridor.slice(0, -1).map((segmentStart, index) => pointToSegmentDistanceMeters(point, segmentStart, corridor[index + 1])),
  );
}

function featurePoints(feature: DotMapsFeature): Point[] {
  const points: Point[] = [];
  const addCoordinate = (coordinate: unknown) => {
    if (
      Array.isArray(coordinate) &&
      coordinate.length >= 2 &&
      typeof coordinate[0] === "number" &&
      typeof coordinate[1] === "number"
    ) {
      points.push({ lon: coordinate[0], lat: coordinate[1] });
    }
  };
  const walk = (coordinates: unknown) => {
    if (!Array.isArray(coordinates)) {
      return;
    }

    if (typeof coordinates[0] === "number") {
      addCoordinate(coordinates);
      return;
    }

    coordinates.forEach(walk);
  };

  walk(feature.shape?.coordinates);
  addCoordinate(feature.center?.coordinates);
  return points;
}

async function queryDotMapsLayer(layer: string) {
  const url = new URL(`https://streetwork.seattle.gov/publicapi/temporal_entity/${layer}/`);
  url.searchParams.set("format", "json");
  url.searchParams.set("bbox", "-122.37,47.60,-122.30,47.72,EPSG:4326");

  return (await fetchJson<DotMapsResponse>(url.toString()))?.results ?? [];
}

function normalizeImpact(
  feature: DotMapsFeature,
  corridorName: ConstructionImpact["corridor"],
  corridor: Point[],
): ConstructionImpact | null {
  const points = featurePoints(feature);

  if (!points.length) {
    return null;
  }

  const nearestDistance = Math.min(...points.map((point) => pointToCorridorDistanceMeters(point, corridor)));

  if (nearestDistance > 260) {
    return null;
  }

  return {
    id: String(feature.remote_id ?? feature.id ?? feature.attrs?.id),
    corridor: corridorName,
    impactType: feature.attrs?.type,
    description: feature.attrs?.descr,
    agency: feature.attrs?.agency,
    projectName: feature.attrs?.name,
    startDate: feature.attrs?.start_date,
    endDate: feature.attrs?.end_date,
    distanceMeters: Math.round(nearestDistance),
    severity: impactSeverity(feature),
  };
}

function impactSummary(impact?: ConstructionImpact) {
  if (!impact) {
    return "";
  }

  return `Top differentiator: ${impact.impactType ?? "construction"} ${impact.distanceMeters}m from the corridor${
    impact.projectName ? ` (${impact.projectName})` : ""
  }${impact.endDate ? ` through ${impact.endDate}` : ""}.`;
}

async function getConstructionImpacts() {
  const defaultCorridor: Point[] = [
    { lat: 47.7023, lon: -122.3289 },
    { lat: 47.6902, lon: -122.3219 },
    { lat: 47.6777, lon: -122.3172 },
    { lat: 47.6614, lon: -122.3172 },
    { lat: 47.6486, lon: -122.3212 },
    { lat: 47.6348, lon: -122.3256 },
    { lat: 47.6235, lon: -122.3296 },
    { lat: 47.6155, lon: -122.3389 },
  ];
  const alternateCorridor: Point[] = [
    { lat: 47.7023, lon: -122.3289 },
    { lat: 47.6796, lon: -122.3289 },
    { lat: 47.6700, lon: -122.3420 },
    { lat: 47.6519, lon: -122.3509 },
    { lat: 47.6376, lon: -122.3411 },
    { lat: 47.6236, lon: -122.3381 },
    { lat: 47.6155, lon: -122.3389 },
  ];
  const layers = ["excavation", "paving", "mobility_impact"];
  const features = (await Promise.all(layers.map(queryDotMapsLayer))).flat();
  const defaultResults = features.map((feature) => normalizeImpact(feature, "default", defaultCorridor));
  const alternateResults = features.map((feature) => normalizeImpact(feature, "alternate", alternateCorridor));
  const dedupe = (items: (ConstructionImpact | null)[]) => {
    const seen = new Set<string>();

    return items
      .filter((item): item is ConstructionImpact => Boolean(item))
      .filter((item) => {
        if (seen.has(item.id)) {
          return false;
        }
        seen.add(item.id);
        return true;
      })
      .sort((a, b) => {
        const weight = { extensive: 0, moderate: 1, minor: 2 };
        return weight[a.severity] - weight[b.severity] || a.distanceMeters - b.distanceMeters;
      })
      .slice(0, 8);
  };

  const defaultImpacts = dedupe(defaultResults);
  const alternateImpacts = dedupe(alternateResults);
  const score = (impacts: ConstructionImpact[]) =>
    impacts.reduce((total, impact) => {
      const severityWeight = impact.severity === "extensive" ? 12 : impact.severity === "moderate" ? 5 : 1;
      const typeWeight = impact.impactType === "Mobility Impact" ? 6 : impact.impactType === "Paving" ? 5 : 3;
      const proximityWeight = impact.distanceMeters <= 75 ? 5 : impact.distanceMeters <= 160 ? 3 : 1;
      return total + severityWeight + typeWeight + proximityWeight;
    }, 0);
  const defaultScore = score(defaultImpacts);
  const alternateScore = score(alternateImpacts);
  const recommendedCorridor: "default" | "alternate" = defaultScore > alternateScore ? "alternate" : "default";
  const moreImpacted = defaultScore > alternateScore ? "Roosevelt / Eastlake" : "Green Lake / Fremont / Westlake";
  const lessImpacted = defaultScore > alternateScore ? "Green Lake / Fremont / Westlake" : "Roosevelt / Eastlake";
  const worseImpacts = defaultScore > alternateScore ? defaultImpacts : alternateImpacts;
  const betterImpacts = defaultScore > alternateScore ? alternateImpacts : defaultImpacts;
  const reasons = [
    `${moreImpacted} score: ${Math.max(defaultScore, alternateScore)} vs ${lessImpacted}: ${Math.min(defaultScore, alternateScore)}.`,
    `${moreImpacted} has ${worseImpacts.length} nearby active project(s); ${lessImpacted} has ${betterImpacts.length}.`,
    impactSummary(worseImpacts[0]),
  ].filter(Boolean);

  return {
    defaultImpacts,
    alternateImpacts,
    defaultScore,
    alternateScore,
    recommendedCorridor,
    recommendation:
      recommendedCorridor === "alternate"
        ? "SDOT dotMaps shows heavier active construction close to Roosevelt / Eastlake. Prefer Green Lake / Fremont / Westlake today."
        : "SDOT dotMaps does not show a stronger construction reason to avoid Roosevelt / Eastlake today. Use the default bike corridor.",
    reasons,
  };
}

export async function getCommuteData(home: Point, work: Point): Promise<CommuteApiResponse> {
  const midpoint = {
    lat: (home.lat + work.lat) / 2,
    lon: (home.lon + work.lon) / 2,
  };

  const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
  forecastUrl.searchParams.set("latitude", `${home.lat},${midpoint.lat},${work.lat}`);
  forecastUrl.searchParams.set("longitude", `${home.lon},${midpoint.lon},${work.lon}`);
  forecastUrl.searchParams.set(
    "hourly",
    [
      "temperature_2m",
      "apparent_temperature",
      "precipitation_probability",
      "precipitation",
      "rain",
      "showers",
      "snowfall",
      "weather_code",
      "wind_speed_10m",
      "wind_gusts_10m",
    ].join(","),
  );
  forecastUrl.searchParams.set("temperature_unit", "fahrenheit");
  forecastUrl.searchParams.set("wind_speed_unit", "mph");
  forecastUrl.searchParams.set("precipitation_unit", "inch");
  forecastUrl.searchParams.set("forecast_days", "2");
  forecastUrl.searchParams.set("timezone", "America/Los_Angeles");

  const elevationUrl = new URL("https://api.open-meteo.com/v1/elevation");
  elevationUrl.searchParams.set("latitude", `${home.lat},${midpoint.lat},${work.lat}`);
  elevationUrl.searchParams.set("longitude", `${home.lon},${midpoint.lon},${work.lon}`);

  const nwsPointUrl = `https://api.weather.gov/points/${midpoint.lat.toFixed(4)},${midpoint.lon.toFixed(4)}`;
  const alertsUrl = `https://api.weather.gov/alerts/active?point=${midpoint.lat.toFixed(4)},${midpoint.lon.toFixed(4)}`;

  const [openMeteo, elevation, nwsPoint, alerts, constructionImpacts] = await Promise.all([
    fetchJson<unknown>(forecastUrl.toString()),
    fetchJson<unknown>(elevationUrl.toString()),
    fetchJson<NwsPointResponse>(nwsPointUrl),
    fetchJson<unknown>(alertsUrl),
    getConstructionImpacts(),
  ]);

  const hourlyUrl = nwsPoint?.properties?.forecastHourly;
  const nwsHourly = hourlyUrl ? await fetchJson<unknown>(hourlyUrl) : null;

  return {
    generatedAt: new Date().toISOString(),
    points: { home, midpoint, work },
    sources: {
      openMeteo,
      elevation,
      nwsHourly,
      alerts,
      construction: {
        name: "SDOT Project and Construction Coordination Map",
        url: "https://streetwork.seattle.gov/map",
        note: "Current dotMaps construction projects within 260m of the compared bike corridors.",
        ...constructionImpacts,
      },
    },
  };
}
