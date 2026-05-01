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
    };
  };
};

type NwsPointResponse = {
  properties?: {
    forecastHourly?: string;
  };
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

  const [openMeteo, elevation, nwsPoint, alerts] = await Promise.all([
    fetchJson<unknown>(forecastUrl.toString()),
    fetchJson<unknown>(elevationUrl.toString()),
    fetchJson<NwsPointResponse>(nwsPointUrl),
    fetchJson<unknown>(alertsUrl),
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
        note: "Current and future right-of-way projects and events that may impact traffic.",
      },
    },
  };
}
