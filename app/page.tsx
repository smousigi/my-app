import Image from "next/image";

const stats = [
  { value: "2.8x", label: "faster launch cycles" },
  { value: "42%", label: "less manual reporting" },
  { value: "18k", label: "events tracked daily" },
];

const features = [
  {
    title: "Live planning",
    description:
      "Turn product goals, customer signals, and release milestones into a plan your whole team can read.",
  },
  {
    title: "Decision history",
    description:
      "Capture why work changed, who approved it, and what evidence moved the roadmap.",
  },
  {
    title: "Launch readiness",
    description:
      "See blockers, owners, dependencies, and success metrics before a release reaches customers.",
  },
];

const activity = [
  "Pricing experiment approved",
  "Customer research synced",
  "Release notes drafted",
  "Support risks reviewed",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f5ef] text-[#171717]">
      <section className="relative overflow-hidden border-b border-black/10 bg-[#fcfbf7]">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between">
            <a href="#" className="flex items-center gap-3" aria-label="Northstar home">
              <span className="grid size-10 place-items-center rounded-lg bg-[#1f3d2b] text-lg font-semibold text-white">
                N
              </span>
              <span className="text-base font-semibold">Northstar</span>
            </a>
            <nav className="hidden items-center gap-8 text-sm font-medium text-black/65 md:flex">
              <a href="#features" className="transition hover:text-black">
                Features
              </a>
              <a href="#workflow" className="transition hover:text-black">
                Workflow
              </a>
              <a href="#results" className="transition hover:text-black">
                Results
              </a>
            </nav>
            <a
              href="#demo"
              className="rounded-full bg-[#171717] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2f2f2f]"
            >
              Book demo
            </a>
          </header>

          <div className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[0.94fr_1.06fr] lg:py-10">
            <div className="max-w-3xl">
              <p className="mb-5 inline-flex rounded-full border border-[#d6cbb5] bg-white px-4 py-2 text-sm font-medium text-[#6f4d1f]">
                Product operations for focused teams
              </p>
              <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] text-balance sm:text-6xl lg:text-7xl">
                Keep every launch moving with one operating view.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-black/67 sm:text-xl">
                Northstar gives product, design, and go-to-market teams a shared
                workspace for planning decisions, launch checks, and customer
                signals without another status meeting.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#demo"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#1f3d2b] px-6 text-sm font-semibold text-white transition hover:bg-[#2a563a]"
                >
                  Start planning
                </a>
                <a
                  href="#features"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-black/15 bg-white px-6 text-sm font-semibold text-black transition hover:border-black/30"
                >
                  Explore features
                </a>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-8 top-12 hidden h-44 w-44 rounded-full bg-[#e3b04b]/30 blur-3xl lg:block" />
              <div className="relative rounded-[2rem] border border-black/10 bg-[#21251f] p-3 shadow-2xl shadow-black/20">
                <div className="rounded-[1.55rem] bg-[#f7f5ef] p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-4 border-b border-black/10 pb-4">
                    <div>
                      <p className="text-sm font-semibold text-black/55">Q3 launch room</p>
                      <h2 className="mt-1 text-xl font-semibold">Mobile checkout rollout</h2>
                    </div>
                    <div className="flex -space-x-2">
                      {["JD", "MR", "AK"].map((name) => (
                        <span
                          key={name}
                          className="grid size-9 place-items-center rounded-full border-2 border-[#f7f5ef] bg-[#d45b42] text-xs font-bold text-white"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 py-5 sm:grid-cols-[1.15fr_0.85fr]">
                    <div className="rounded-2xl border border-black/10 bg-white p-5">
                      <div className="mb-5 flex items-center justify-between">
                        <p className="text-sm font-semibold">Readiness</p>
                        <span className="rounded-full bg-[#dff3df] px-3 py-1 text-xs font-semibold text-[#1f6b34]">
                          On track
                        </span>
                      </div>
                      <div className="space-y-4">
                        {[
                          ["Research", "100%"],
                          ["Engineering", "78%"],
                          ["Messaging", "64%"],
                        ].map(([label, width]) => (
                          <div key={label}>
                            <div className="mb-2 flex justify-between text-sm">
                              <span className="font-medium">{label}</span>
                              <span className="text-black/50">{width}</span>
                            </div>
                            <div className="h-2 rounded-full bg-black/10">
                              <div
                                className="h-2 rounded-full bg-[#1f3d2b]"
                                style={{ width }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-[#f0dfbd] p-5">
                      <Image
                        src="/globe.svg"
                        alt=""
                        width={34}
                        height={34}
                        className="mb-6 opacity-70"
                      />
                      <p className="text-sm font-semibold text-black/55">Customer signal</p>
                      <p className="mt-2 text-2xl font-semibold leading-tight">
                        312 beta users completed checkout in under 45 seconds.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-4">
                    {activity.map((item) => (
                      <div key={item} className="rounded-2xl border border-black/10 bg-white p-4">
                        <Image
                          src="/window.svg"
                          alt=""
                          width={20}
                          height={20}
                          className="mb-5 opacity-55"
                        />
                        <p className="text-sm font-medium leading-5">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="results" className="border-b border-black/10 bg-white px-6 py-14 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="border-l border-black/10 pl-6">
              <p className="text-4xl font-semibold text-[#d45b42]">{stat.value}</p>
              <p className="mt-2 text-sm font-medium text-black/58">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="bg-[#f7f5ef] px-6 py-20 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f4d1f]">
              Built for MVP speed
            </p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
              The structure your team needs before the process gets heavy.
            </h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm"
              >
                <Image
                  src="/file.svg"
                  alt=""
                  width={28}
                  height={28}
                  className="mb-10 opacity-60"
                />
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="mt-3 leading-7 text-black/62">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="bg-[#1f3d2b] px-6 py-20 text-white sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/55">
              Workflow
            </p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
              Plan, decide, and launch from the same source of truth.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {["Collect signals", "Rank work", "Ship confidently"].map((step, index) => (
              <div key={step} className="rounded-2xl bg-white/10 p-6 ring-1 ring-white/15">
                <span className="text-sm font-semibold text-[#f0dfbd]">
                  0{index + 1}
                </span>
                <p className="mt-12 text-xl font-semibold">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="demo" className="bg-[#fcfbf7] px-6 py-20 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 border-t border-black/10 pt-12 md:flex-row md:items-center">
          <div>
            <h2 className="text-3xl font-semibold sm:text-4xl">Ready to shape the first release?</h2>
            <p className="mt-3 max-w-xl leading-7 text-black/62">
              Use this homepage as the front door for a focused MVP, then add
              routes for auth, dashboard, and customer workflows as the product
              becomes real.
            </p>
          </div>
          <a
            href="mailto:hello@example.com"
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#171717] px-6 text-sm font-semibold text-white transition hover:bg-[#2f2f2f]"
          >
            Contact sales
          </a>
        </div>
      </section>
    </main>
  );
}
