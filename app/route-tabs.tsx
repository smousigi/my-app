"use client";

import { useState } from "react";
import type { LocationPoint } from "@/lib/commute-data";

export type RoutePlan = {
  id: "there" | "home";
  label: string;
  origin: LocationPoint;
  destination: LocationPoint;
  waypoints?: string[];
  title: string;
  description: string;
  steps: string[];
};

export default function RouteTabs({
  mapsKey,
  routePlans,
}: {
  mapsKey?: string;
  routePlans: RoutePlan[];
}) {
  const [activeRouteId, setActiveRouteId] = useState<RoutePlan["id"]>("there");
  const activeRoute = routePlans.find((route) => route.id === activeRouteId) ?? routePlans[0];
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
    activeRoute.origin.address,
  )}&destination=${encodeURIComponent(activeRoute.destination.address)}&travelmode=bicycling${
    activeRoute.waypoints?.length ? `&waypoints=${encodeURIComponent(activeRoute.waypoints.join("|"))}` : ""
  }`;
  const embedUrl = mapsKey
    ? `https://www.google.com/maps/embed/v1/directions?key=${mapsKey}&origin=${encodeURIComponent(
        activeRoute.origin.address,
      )}&destination=${encodeURIComponent(activeRoute.destination.address)}&mode=bicycling&avoid=highways${
        activeRoute.waypoints?.length ? `&waypoints=${encodeURIComponent(activeRoute.waypoints.join("|"))}` : ""
      }`
    : "";

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.25fr]">
      <div className="rounded-lg border border-black/10 bg-white p-5 shadow-xl shadow-black/5 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#a0502d]">Recommended route</p>
            <h2 className="mt-2 text-2xl font-semibold">{activeRoute.title}</h2>
            <p className="mt-3 max-w-2xl leading-7 text-[#53605a]">{activeRoute.description}</p>
          </div>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-md bg-[#1f5e4d] px-4 text-sm font-semibold text-white"
          >
            Open in Google Maps
          </a>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg bg-[#edf3f0] p-1">
          {routePlans.map((route) => (
            <button
              key={route.id}
              type="button"
              onClick={() => setActiveRouteId(route.id)}
              className={`h-11 rounded-md text-sm font-semibold transition ${
                activeRouteId === route.id ? "bg-[#1f5e4d] text-white shadow-sm" : "text-[#53605a] hover:bg-white"
              }`}
            >
              {route.label}
            </button>
          ))}
        </div>

        <div className="mt-5 overflow-hidden rounded-lg border border-black/10 bg-[#dfe8e4]">
          {embedUrl ? (
            <iframe
              title={`Google Maps bicycling route for ${activeRoute.label}`}
              src={embedUrl}
              className="h-[390px] w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="grid min-h-[360px] place-items-center p-6 text-center">
              <div>
                <p className="text-lg font-semibold">Google Maps embed key not configured</p>
                <p className="mt-2 max-w-md text-sm leading-6 text-[#53605a]">
                  Add `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY` to show the live bicycling map here. The directions
                  button still opens the recommended Google Maps bike route.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-black/10 bg-white p-5 shadow-xl shadow-black/5 sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#a0502d]">Step by step</p>
        <h2 className="mt-2 text-2xl font-semibold">{activeRoute.label}</h2>
        <ol className="mt-5 space-y-3">
          {activeRoute.steps.map((step, index) => (
            <li key={step} className="grid grid-cols-[2rem_1fr] gap-3">
              <span className="grid size-8 place-items-center rounded-md bg-[#e4f3ec] text-sm font-bold text-[#12613d]">
                {index + 1}
              </span>
              <p className="pt-1 leading-6 text-[#53605a]">{step}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
