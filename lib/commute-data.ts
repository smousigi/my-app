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
      recommendedCorridor: "default" | "alternate";
      recommendation: string;
    };
  };
};

export type ConstructionImpact = {
  id: string;
  address?: string;
  corridor: "default" | "alternate";
  closureType?: string;
  description?: string;
  mobilityType?: string;
  projectName?: string;
  startDate?: string;
  endDate?: string;
  spaceSqft?: number;
  severity: "minor" | "moderate" | "extensive";
};

type NwsPointResponse = {
  properties?: {
    forecastHourly?: string;
  };
};

type StreetUseFeature = {
  attributes?: {
    RECORD_ID?: string;
    RECORD_ADDRESS?: string;
    USE_DESCRIPTION?: string;
    USE_CLOSURE_TYPE?: string;
    USE_MOBILITY_TYPE?: string;
    USE_START_DATE?: number;
    USE_EXPIRE_DATE?: number;
    USE_SPACE_SQFT?: number;
    PROJECT_NAME?: string;
  };
};

type StreetUseResponse = {
  features?: StreetUseFeature[];
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

function dateFromArcgis(value?: number) {
  return typeof value === "number" ? new Date(value).toLocaleDateString("en-US") : undefined;
}

function impactSeverity(feature: StreetUseFeature): ConstructionImpact["severity"] {
  const attributes = feature.attributes ?? {};
  const text = [
    attributes.USE_DESCRIPTION,
    attributes.USE_CLOSURE_TYPE,
    attributes.USE_MOBILITY_TYPE,
    attributes.PROJECT_NAME,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const sqft = attributes.USE_SPACE_SQFT ?? 0;

  if (/full|closed|closure|crane|major|street improvement|utility major|excavation|detour/.test(text) || sqft >= 1000) {
    return "extensive";
  }

  if (/lane|sidewalk|bike|trail|parking|pedestrian|mobility|row construction/.test(text) || sqft >= 250) {
    return "moderate";
  }

  return "minor";
}

async function queryStreetUsePoint(point: Point, corridor: ConstructionImpact["corridor"]) {
  const url = new URL("https://gisdata.seattle.gov/server/rest/services/SDOT/SDOT_StreetUse_V2/MapServer/0/query");
  url.searchParams.set("f", "json");
  url.searchParams.set("where", "1=1");
  url.searchParams.set(
    "outFields",
    [
      "RECORD_ID",
      "RECORD_ADDRESS",
      "USE_DESCRIPTION",
      "USE_CLOSURE_TYPE",
      "USE_MOBILITY_TYPE",
      "USE_START_DATE",
      "USE_EXPIRE_DATE",
      "USE_SPACE_SQFT",
      "PROJECT_NAME",
    ].join(","),
  );
  url.searchParams.set("returnGeometry", "false");
  url.searchParams.set("geometry", `${point.lon},${point.lat}`);
  url.searchParams.set("geometryType", "esriGeometryPoint");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("distance", "550");
  url.searchParams.set("units", "esriSRUnit_Meter");
  url.searchParams.set("resultRecordCount", "50");

  const data = await fetchJson<StreetUseResponse>(url.toString());

  return (data?.features ?? []).map((feature): ConstructionImpact | null => {
    const attributes = feature.attributes;

    if (!attributes?.RECORD_ID) {
      return null;
    }

    return {
      id: attributes.RECORD_ID,
      address: attributes.RECORD_ADDRESS,
      corridor,
      closureType: attributes.USE_CLOSURE_TYPE,
      description: attributes.USE_DESCRIPTION,
      mobilityType: attributes.USE_MOBILITY_TYPE,
      projectName: attributes.PROJECT_NAME,
      startDate: dateFromArcgis(attributes.USE_START_DATE),
      endDate: dateFromArcgis(attributes.USE_EXPIRE_DATE),
      spaceSqft: attributes.USE_SPACE_SQFT,
      severity: impactSeverity(feature),
    };
  });
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

  const [defaultResults, alternateResults] = await Promise.all([
    Promise.all(defaultCorridor.map((point) => queryStreetUsePoint(point, "default"))),
    Promise.all(alternateCorridor.map((point) => queryStreetUsePoint(point, "alternate"))),
  ]);

  const dedupe = (items: (ConstructionImpact | null)[][]) => {
    const seen = new Set<string>();

    return items
      .flat()
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
        return weight[a.severity] - weight[b.severity];
      })
      .slice(0, 8);
  };

  const defaultImpacts = dedupe(defaultResults);
  const alternateImpacts = dedupe(alternateResults);
  const score = (impacts: ConstructionImpact[]) =>
    impacts.reduce((total, impact) => total + (impact.severity === "extensive" ? 5 : impact.severity === "moderate" ? 2 : 1), 0);
  const defaultScore = score(defaultImpacts);
  const alternateScore = score(alternateImpacts);
  const recommendedCorridor: "default" | "alternate" = defaultScore >= alternateScore + 3 ? "alternate" : "default";

  return {
    defaultImpacts,
    alternateImpacts,
    recommendedCorridor,
    recommendation:
      recommendedCorridor === "alternate"
        ? "SDOT active right-of-way permits look heavier on the default Roosevelt/Eastlake corridor. Prefer the Fremont/Westlake alternate and verify in Google Maps before leaving."
        : "SDOT active right-of-way permits do not show a clearly better construction-avoidance alternate. Use the default Roosevelt/Eastlake bike corridor and verify current detours before leaving.",
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
        note: "Active Street Use permit records near the default and alternate bike corridors.",
        ...constructionImpacts,
      },
    },
  };
}
