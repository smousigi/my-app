import RouteTabs, { type RoutePlan } from "@/app/route-tabs";
import {
  getCommuteData,
  northgateStation,
  workDestination,
  type CommuteApiResponse as RawCommuteApiResponse,
} from "@/lib/commute-data";

export const dynamic = "force-dynamic";

type OpenMeteoSeries = {
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    precipitation_probability?: number[];
    precipitation?: number[];
    rain?: number[];
    showers?: number[];
    weather_code?: number[];
    wind_gusts_10m?: number[];
  };
};

type NwsPeriod = {
  startTime: string;
  probabilityOfPrecipitation?: { value?: number | null };
  shortForecast?: string;
};

type CommuteApiResponse = RawCommuteApiResponse & {
  sources: RawCommuteApiResponse["sources"] & {
    openMeteo?: OpenMeteoSeries[] | OpenMeteoSeries | null;
    elevation?: { elevation?: number[] } | null;
    nwsHourly?: { properties?: { periods?: NwsPeriod[] } } | null;
    alerts?: { features?: { properties?: { event?: string; severity?: string; headline?: string } }[] } | null;
  };
};

type RideWindow = {
  label: string;
  start: Date;
  end: Date;
};

type WindowFinding = {
  label: string;
  status: "go" | "caution" | "no";
  summary: string;
  details: string[];
};

type RideStats = {
  lowTemp?: number;
  maxPop?: number;
  maxRain?: number;
  maxGust?: number;
};

const routeDistanceMiles = 8.1;
const routeMinutes = "35-50";
const rainyCodes = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
const routePlans: RoutePlan[] = [
  {
    id: "there",
    label: "Ride to work",
    origin: northgateStation,
    destination: workDestination,
    title: "Northgate to 2021 7th Ave",
    description:
      "Use Google bicycling directions as the live route source, favoring the Roosevelt and Eastlake bike corridor over Aurora.",
    steps: [
      "Exit Northgate Station toward NE 103rd St.",
      "Turn right onto NE 103rd St.",
      "Turn left onto 1st Ave NE and continue south.",
      "Turn right onto NE 92nd St.",
      "Turn left onto Meridian Ave N and follow the signed neighborhood greenway south.",
      "Continue onto the Roosevelt bike corridor through the Maple Leaf and Roosevelt area.",
      "Keep south through the University District, following bike-route signs toward Eastlake.",
      "Bear right onto Eastlake Ave E and continue south in the bike corridor.",
      "Continue into South Lake Union toward Westlake Ave N.",
      "Turn left toward 7th Ave, then continue to 2021 7th Ave.",
    ],
  },
  {
    id: "home",
    label: "Ride home",
    origin: workDestination,
    destination: northgateStation,
    title: "2021 7th Ave to Northgate",
    description:
      "Reverse the same lower-stress bike corridor, checking Google for one-way constraints, closures, and current detours.",
    steps: [
      "Leave 2021 7th Ave and head north toward South Lake Union.",
      "Turn right toward Westlake Ave N or the signed bike connection Google recommends.",
      "Turn left onto the Eastlake bike corridor and continue north.",
      "Continue north through Eastlake toward the University District.",
      "Keep right where the route transitions toward Roosevelt.",
      "Continue north on the Roosevelt bike corridor.",
      "Follow the neighborhood greenway north through Maple Leaf.",
      "Turn right toward NE 92nd St.",
      "Turn left onto 1st Ave NE and continue north.",
      "Turn right onto NE 103rd St, then enter Northgate Station.",
    ],
  },
];

function timeToday(hours: number, minutes: number) {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function rideWindows(): RideWindow[] {
  return [
    { label: "Morning ride", start: timeToday(8, 0), end: timeToday(9, 30) },
    { label: "Afternoon ride", start: timeToday(15, 30), end: timeToday(17, 0) },
  ];
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}

function weatherText(code?: number) {
  if (code === undefined) return "Unknown";
  if (code === 0) return "Clear";
  if ([1, 2, 3].includes(code)) return "Cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if (rainyCodes.has(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  return "Mixed";
}

function max(values: number[]) {
  return values.length ? Math.max(...values) : undefined;
}

function min(values: number[]) {
  return values.length ? Math.min(...values) : undefined;
}

function forecastSeries(data?: CommuteApiResponse) {
  return Array.isArray(data?.sources.openMeteo)
    ? data.sources.openMeteo
    : data?.sources.openMeteo
      ? [data.sources.openMeteo]
      : [];
}

function collectWindowStats(
  window: RideWindow,
  data?: CommuteApiResponse,
): RideStats & { rainyCode: boolean; nwsRainy: boolean; codes: number[]; nwsText?: string } {
  const temps: number[] = [];
  const rain: number[] = [];
  const pops: number[] = [];
  const gusts: number[] = [];
  const codes: number[] = [];

  for (const location of forecastSeries(data)) {
    const times = location.hourly?.time ?? [];
    times.forEach((time, index) => {
      const stamp = new Date(time);
      if (stamp >= window.start && stamp <= window.end) {
        const temp = location.hourly?.temperature_2m?.[index];
        const precipitation = location.hourly?.precipitation?.[index] ?? 0;
        const rainAmount =
          precipitation + (location.hourly?.rain?.[index] ?? 0) + (location.hourly?.showers?.[index] ?? 0);
        const pop = location.hourly?.precipitation_probability?.[index];
        const gust = location.hourly?.wind_gusts_10m?.[index];
        const code = location.hourly?.weather_code?.[index];

        if (typeof temp === "number") temps.push(temp);
        if (typeof rainAmount === "number") rain.push(rainAmount);
        if (typeof pop === "number") pops.push(pop);
        if (typeof gust === "number") gusts.push(gust);
        if (typeof code === "number") codes.push(code);
      }
    });
  }

  const nwsPeriods = data?.sources.nwsHourly?.properties?.periods ?? [];
  const nwsMatches = nwsPeriods.filter((period) => {
    const start = new Date(period.startTime);
    return start >= window.start && start <= window.end;
  });
  const nwsPop = max(
    nwsMatches
      .map((period) => period.probabilityOfPrecipitation?.value)
      .filter((value): value is number => typeof value === "number"),
  );

  return {
    lowTemp: min(temps),
    maxPop: max([...pops, ...(typeof nwsPop === "number" ? [nwsPop] : [])]),
    maxRain: max(rain),
    maxGust: max(gusts),
    rainyCode: codes.some((code) => rainyCodes.has(code)),
    nwsRainy: nwsMatches.some((period) => /rain|showers|thunder/i.test(period.shortForecast ?? "")),
    codes,
    nwsText: nwsMatches[0]?.shortForecast,
  };
}

function analyzeWindow(window: RideWindow, data?: CommuteApiResponse): WindowFinding {
  const stats = collectWindowStats(window, data);
  const details: string[] = [];
  const isRainy = (stats.maxRain ?? 0) > 0.005 || (stats.maxPop ?? 0) >= 35 || stats.rainyCode || stats.nwsRainy;

  if (typeof stats.lowTemp === "number") details.push(`Lowest temp: ${Math.round(stats.lowTemp)} F`);
  if (typeof stats.maxPop === "number") details.push(`Peak rain chance: ${Math.round(stats.maxPop)}%`);
  if (typeof stats.maxRain === "number") details.push(`Hourly precip: ${stats.maxRain.toFixed(3)} in`);
  if (typeof stats.maxGust === "number") details.push(`Max gust: ${Math.round(stats.maxGust)} mph`);
  if (stats.codes.length) details.push(`Open-Meteo: ${weatherText(stats.codes.find((code) => rainyCodes.has(code)) ?? stats.codes[0])}`);
  if (stats.nwsText) details.push(`NWS: ${stats.nwsText}`);

  if (isRainy) {
    return {
      label: window.label,
      status: "no",
      summary: `Rain risk between ${formatTime(window.start)} and ${formatTime(window.end)}`,
      details,
    };
  }

  if (typeof stats.lowTemp === "number" && stats.lowTemp < 50) {
    return {
      label: window.label,
      status: "no",
      summary: `Below your 50 F threshold between ${formatTime(window.start)} and ${formatTime(window.end)}`,
      details,
    };
  }

  if ((stats.maxGust ?? 0) >= 25 || (stats.maxPop ?? 0) >= 25) {
    return {
      label: window.label,
      status: "caution",
      summary: "Rideable, but the forecast is close enough to keep watching",
      details,
    };
  }

  return {
    label: window.label,
    status: "go",
    summary: `Looks rideable between ${formatTime(window.start)} and ${formatTime(window.end)}`,
    details,
  };
}

function combinedStats(windows: RideWindow[], data?: CommuteApiResponse): RideStats {
  const stats = windows.map((window) => collectWindowStats(window, data));
  return {
    lowTemp: min(stats.map((item) => item.lowTemp).filter((value): value is number => typeof value === "number")),
    maxPop: max(stats.map((item) => item.maxPop).filter((value): value is number => typeof value === "number")),
    maxRain: max(stats.map((item) => item.maxRain).filter((value): value is number => typeof value === "number")),
    maxGust: max(stats.map((item) => item.maxGust).filter((value): value is number => typeof value === "number")),
  };
}

export default async function Home() {
  const forecast = (await getCommuteData(northgateStation, workDestination)) as CommuteApiResponse;
  const windows = rideWindows();
  const findings = windows.map((window) => analyzeWindow(window, forecast));
  const overall = findings.some((finding) => finding.status === "no")
    ? "no"
    : findings.some((finding) => finding.status === "caution")
      ? "caution"
      : "go";
  const stats = combinedStats(windows, forecast);
  const elevations = forecast.sources.elevation?.elevation;
  const elevationText =
    elevations && elevations.length >= 3
      ? `${Math.round(elevations[0] * 3.28084)} ft start, ${Math.round(elevations[1] * 3.28084)} ft midpoint, ${Math.round(elevations[2] * 3.28084)} ft finish`
      : "Elevation unavailable";
  const alerts = forecast.sources.alerts?.features ?? [];
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;
  const statusTheme =
    overall === "go"
      ? {
          shell: "border-[#82cfa9] bg-[#dff4e8]",
          badge: "bg-[#12613d] text-white",
          text: "text-[#12613d]",
          label: "GOOD",
        }
      : overall === "caution"
        ? {
            shell: "border-[#e6c56a] bg-[#fff0c7]",
            badge: "bg-[#76510b] text-white",
            text: "text-[#76510b]",
            label: "MAYBE",
          }
        : {
            shell: "border-[#ef9d90] bg-[#ffe1dc]",
            badge: "bg-[#913425] text-white",
            text: "text-[#913425]",
            label: "BAD",
          };

  return (
    <main className="min-h-screen bg-[#edf3f0] px-4 py-5 text-[#16201b] sm:px-6 lg:px-8">
      <section className="mx-auto grid max-w-7xl gap-5">
        <div className={`rounded-lg border p-5 shadow-xl shadow-black/10 sm:p-6 ${statusTheme.shell}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className={`text-sm font-semibold uppercase tracking-[0.16em] ${statusTheme.text}`}>
              Today&apos;s bike recommendation
            </p>
            <span className={`inline-flex h-11 items-center justify-center rounded-md px-5 text-sm font-bold ${statusTheme.badge}`}>
              {statusTheme.label}
            </span>
          </div>
        </div>

        <RouteTabs mapsKey={mapsKey} routePlans={routePlans} />

        <div className="grid gap-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-lg border border-black/10 bg-white p-3 sm:p-4">
              <p className="text-xs font-semibold text-[#647069] sm:text-sm">Route distance</p>
              <p className="mt-1 text-2xl font-semibold sm:text-3xl">{routeDistanceMiles.toFixed(1)} mi</p>
              <p className="mt-1 text-xs text-[#647069] sm:text-sm">Bicycling estimate</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-white p-3 sm:p-4">
              <p className="text-xs font-semibold text-[#647069] sm:text-sm">Ride time</p>
              <p className="mt-1 text-2xl font-semibold sm:text-3xl">{routeMinutes}</p>
              <p className="mt-1 text-xs text-[#647069] sm:text-sm">minutes on RadCity 3</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-white p-3 sm:p-4">
              <p className="text-xs font-semibold text-[#647069] sm:text-sm">Lowest temp</p>
              <p className="mt-1 text-2xl font-semibold sm:text-3xl">
                {typeof stats.lowTemp === "number" ? `${Math.round(stats.lowTemp)} F` : "--"}
              </p>
              <p className="mt-1 text-xs text-[#647069] sm:text-sm">Commute windows</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-white p-3 sm:p-4">
              <p className="text-xs font-semibold text-[#647069] sm:text-sm">Rain chance</p>
              <p className="mt-1 text-2xl font-semibold sm:text-3xl">
                {typeof stats.maxPop === "number" ? `${Math.round(stats.maxPop)}%` : "--"}
              </p>
              <p className="mt-1 text-xs text-[#647069] sm:text-sm">Peak forecast risk</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-black/10 bg-white p-4">
              <p className="font-semibold">Elevation</p>
              <p className="mt-2 text-sm leading-6 text-[#647069]">{elevationText}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-white p-4">
              <p className="font-semibold">Wind and alerts</p>
              <p className="mt-2 text-sm leading-6 text-[#647069]">
                {typeof stats.maxGust === "number" ? `Peak gust ${Math.round(stats.maxGust)} mph. ` : ""}
                {alerts.length ? `${alerts.length} active NWS alert(s) near the route.` : "No active NWS alerts near the route."}
              </p>
            </div>
            <a
              href={forecast.sources.construction.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-black/10 bg-white p-4 transition hover:bg-[#f8fbfa]"
            >
              <p className="font-semibold">Construction</p>
              <p className="mt-2 text-sm leading-6 text-[#647069]">Open SDOT right-of-way projects before leaving.</p>
            </a>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {findings.map((finding) => (
              <article key={finding.label} className="rounded-lg border border-black/10 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold">{finding.label}</h2>
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-bold ${
                      finding.status === "go"
                        ? "bg-[#dff4e8] text-[#12613d]"
                        : finding.status === "caution"
                          ? "bg-[#fff0c7] text-[#76510b]"
                          : "bg-[#ffe1dc] text-[#913425]"
                    }`}
                  >
                    {finding.status === "go" ? "GO" : finding.status === "caution" ? "TOSS UP" : "NO"}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#53605a]">{finding.summary}</p>
                <ul className="mt-3 space-y-1 text-sm text-[#647069]">
                  {finding.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
