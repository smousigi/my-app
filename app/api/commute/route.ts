import { getCommuteData } from "@/lib/commute-data";

export const dynamic = "force-dynamic";

function asPoint(searchParams: URLSearchParams, prefix: "home" | "work") {
  const lat = Number(searchParams.get(`${prefix}Lat`));
  const lon = Number(searchParams.get(`${prefix}Lon`));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  return { lat, lon };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const home = asPoint(searchParams, "home");
  const work = asPoint(searchParams, "work");

  if (!home || !work) {
    return Response.json({ error: "Missing home/work coordinates." }, { status: 400 });
  }

  return Response.json(await getCommuteData(home, work));
}
