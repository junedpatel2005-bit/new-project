/**
 * Default HTML for each CMS-editable static page — today's design flattened to plain HTML.
 * Used both as the live fallback (before anything is published) and as the admin editor's
 * starting textarea content. Kept in its own file with no imports so it can be safely
 * imported from both server route files and the client-side admin editor.
 */

export const ABOUT_DEFAULT_HTML = `
<div class="min-h-screen bg-background">
  <main>
    <section class="gradient-hero">
      <div class="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <p class="text-xs font-semibold uppercase tracking-wider text-primary">About Klick-Pro</p>
        <h1 class="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">Better work starts with trust.</h1>
        <p class="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">Klick-Pro brings clients and skilled professionals together in one safe, simple marketplace.</p>
      </div>
    </section>
    <section class="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div class="grid gap-6 md:grid-cols-3">
        <article class="rounded-2xl border border-border bg-card p-7 shadow-soft">
          <div class="h-7 w-7 rounded-md bg-primary/10"></div>
          <h2 class="mt-5 font-display text-xl font-semibold">Trust first</h2>
          <p class="mt-2 text-sm leading-6 text-muted-foreground">Verified profiles and clear project milestones help everyone work with confidence.</p>
        </article>
        <article class="rounded-2xl border border-border bg-card p-7 shadow-soft">
          <div class="h-7 w-7 rounded-md bg-primary/10"></div>
          <h2 class="mt-5 font-display text-xl font-semibold">Built for both sides</h2>
          <p class="mt-2 text-sm leading-6 text-muted-foreground">Clients hire with clarity while professionals grow their business.</p>
        </article>
        <article class="rounded-2xl border border-border bg-card p-7 shadow-soft">
          <div class="h-7 w-7 rounded-md bg-primary/10"></div>
          <h2 class="mt-5 font-display text-xl font-semibold">Work worth doing</h2>
          <p class="mt-2 text-sm leading-6 text-muted-foreground">From local services to digital projects, good work deserves a better home.</p>
        </article>
      </div>
    </section>
  </main>
</div>
`.trim();

export const FOR_CLIENTS_DEFAULT_HTML = `
<div class="min-h-screen bg-background">
  <main>
    <section class="gradient-hero">
      <div class="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-primary">For clients</p>
          <h1 class="font-display mt-3 text-4xl font-bold tracking-tight md:text-5xl">Hire trusted pros — without the back-and-forth</h1>
          <p class="mt-4 max-w-lg text-muted-foreground">Post once. Get qualified, vetted proposals fast. Pay only when work is done. It's the modern way to get things done.</p>
          <div class="mt-6 flex flex-wrap gap-3">
            <a href="/post-job" class="inline-flex h-11 items-center justify-center rounded-lg bg-cta px-6 text-sm font-semibold text-cta-foreground hover:bg-cta/90">Post a Job — it's free</a>
            <a href="/discover" class="inline-flex h-11 items-center justify-center rounded-lg border border-input px-6 text-sm font-semibold hover:bg-muted">Browse pros</a>
          </div>
          <div class="mt-6 flex items-center gap-1.5 text-sm">
            <span class="font-semibold">4.9 / 5</span>
            <span class="text-muted-foreground">from 28,400 client reviews</span>
          </div>
        </div>
        <div class="rounded-3xl border border-border bg-card p-6 shadow-elevated">
          <p class="text-xs font-semibold uppercase tracking-wider text-primary">Sample timeline</p>
          <ol class="mt-4 space-y-4">
            <li class="flex gap-3">
              <div class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-success/10 text-success">&#10003;</div>
              <div><p class="text-xs text-muted-foreground">0 min</p><p class="text-sm font-medium">You post a kitchen plumbing job</p></div>
            </li>
            <li class="flex gap-3">
              <div class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-success/10 text-success">&#10003;</div>
              <div><p class="text-xs text-muted-foreground">8 min</p><p class="text-sm font-medium">First proposal received from Priya, ₹180</p></div>
            </li>
            <li class="flex gap-3">
              <div class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-success/10 text-success">&#10003;</div>
              <div><p class="text-xs text-muted-foreground">32 min</p><p class="text-sm font-medium">3 more vetted plumbers have applied</p></div>
            </li>
            <li class="flex gap-3">
              <div class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-success/10 text-success">&#10003;</div>
              <div><p class="text-xs text-muted-foreground">1h</p><p class="text-sm font-medium">You hire Priya. She's on her way.</p></div>
            </li>
            <li class="flex gap-3">
              <div class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-success/10 text-success">&#10003;</div>
              <div><p class="text-xs text-muted-foreground">Same day</p><p class="text-sm font-medium">Job done. Payment released.</p></div>
            </li>
          </ol>
        </div>
      </div>
    </section>
    <section class="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <h2 class="font-display text-3xl font-bold tracking-tight">Why clients choose Klick-Pro</h2>
      <div class="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div class="grid h-11 w-11 place-items-center rounded-xl bg-primary/10"></div>
          <h3 class="font-display mt-4 text-lg font-semibold">Vetted professionals</h3>
          <p class="mt-2 text-sm text-muted-foreground">Every pro is ID-verified. Background checks for in-home services.</p>
        </div>
        <div class="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div class="grid h-11 w-11 place-items-center rounded-xl bg-primary/10"></div>
          <h3 class="font-display mt-4 text-lg font-semibold">Escrow payments</h3>
          <p class="mt-2 text-sm text-muted-foreground">Your money is safe. Released only when you approve a milestone.</p>
        </div>
        <div class="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div class="grid h-11 w-11 place-items-center rounded-xl bg-primary/10"></div>
          <h3 class="font-display mt-4 text-lg font-semibold">Fast matches</h3>
          <p class="mt-2 text-sm text-muted-foreground">Get your first proposal in under 2 hours, on average.</p>
        </div>
        <div class="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div class="grid h-11 w-11 place-items-center rounded-xl bg-primary/10"></div>
          <h3 class="font-display mt-4 text-lg font-semibold">World-class support</h3>
          <p class="mt-2 text-sm text-muted-foreground">Real humans, 24/7 — never a bot.</p>
        </div>
      </div>
    </section>
  </main>
</div>
`.trim();

export const FOR_PROFESSIONALS_DEFAULT_HTML = `
<div class="min-h-screen bg-background">
  <main>
    <section class="bg-ink text-ink-foreground">
      <div class="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-cta">For professionals</p>
          <h1 class="font-display mt-3 text-4xl font-bold tracking-tight text-white md:text-5xl">Find quality jobs. Get paid safely. Grow your business.</h1>
          <p class="mt-4 max-w-lg text-white/70">No more chasing leads or waiting on payments. Klick-Pro brings nearby and remote jobs straight to you.</p>
          <div class="mt-6 flex flex-wrap gap-3">
            <a href="/signup" class="inline-flex h-11 items-center justify-center rounded-lg bg-cta px-6 text-sm font-semibold text-cta-foreground hover:bg-cta/90">Join as a Pro — free</a>
            <a href="/discover" class="inline-flex h-11 items-center justify-center rounded-lg border border-white/30 bg-white/10 px-6 text-sm font-semibold text-white hover:bg-white/20">See sample jobs</a>
          </div>
          <div class="mt-8 grid grid-cols-3 gap-6">
            <div><p class="font-display text-2xl font-bold text-white">₹3.2k</p><p class="text-xs text-white/60">Avg. monthly earnings</p></div>
            <div><p class="font-display text-2xl font-bold text-white">&lt;2h</p><p class="text-xs text-white/60">First lead</p></div>
            <div><p class="font-display text-2xl font-bold text-white">120K+</p><p class="text-xs text-white/60">Active pros</p></div>
          </div>
        </div>
        <div class="grid gap-4">
          <div class="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div class="flex items-center gap-3">
              <div class="grid h-10 w-10 place-items-center rounded-xl bg-cta/15"></div>
              <p class="font-display text-lg font-semibold text-white">Grow</p>
            </div>
            <p class="mt-2 text-sm text-white/70">Algorithmic match-making puts you in front of the right clients.</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div class="flex items-center gap-3">
              <div class="grid h-10 w-10 place-items-center rounded-xl bg-cta/15"></div>
              <p class="font-display text-lg font-semibold text-white">Trusted</p>
            </div>
            <p class="mt-2 text-sm text-white/70">Verified badges and ratings build long-term reputation.</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div class="flex items-center gap-3">
              <div class="grid h-10 w-10 place-items-center rounded-xl bg-cta/15"></div>
              <p class="font-display text-lg font-semibold text-white">Nearby</p>
            </div>
            <p class="mt-2 text-sm text-white/70">See jobs by distance, urgency, and budget — at a glance.</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div class="flex items-center gap-3">
              <div class="grid h-10 w-10 place-items-center rounded-xl bg-cta/15"></div>
              <p class="font-display text-lg font-semibold text-white">Paid weekly</p>
            </div>
            <p class="mt-2 text-sm text-white/70">Withdraw earnings to your bank or wallet, anytime.</p>
          </div>
        </div>
      </div>
    </section>
    <section class="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <h2 class="font-display text-3xl font-bold tracking-tight">Built for professionals like you</h2>
      <div class="mt-8 grid gap-5 md:grid-cols-3">
        <div class="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div class="grid h-11 w-11 place-items-center rounded-xl bg-primary/10"></div>
          <h3 class="font-display mt-4 text-lg font-semibold">All trades welcome</h3>
          <p class="mt-2 text-sm text-muted-foreground">Plumbers, designers, photographers, tutors — there's a market for you.</p>
        </div>
        <div class="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div class="grid h-11 w-11 place-items-center rounded-xl bg-primary/10"></div>
          <h3 class="font-display mt-4 text-lg font-semibold">Get verified</h3>
          <p class="mt-2 text-sm text-muted-foreground">Free identity &amp; license verification builds trust with clients.</p>
        </div>
        <div class="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div class="grid h-11 w-11 place-items-center rounded-xl bg-primary/10"></div>
          <h3 class="font-display mt-4 text-lg font-semibold">Insights &amp; analytics</h3>
          <p class="mt-2 text-sm text-muted-foreground">Track win-rates, response times, and earnings in one dashboard.</p>
        </div>
      </div>
    </section>
  </main>
</div>
`.trim();

export const HOW_IT_WORKS_DEFAULT_HTML = `
<div class="min-h-screen bg-background">
  <main>
    <section class="gradient-hero">
      <div class="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <p class="text-xs font-semibold uppercase tracking-wider text-primary">How it works</p>
        <h1 class="font-display mx-auto mt-3 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">A simpler way to hire &amp; get hired</h1>
        <p class="mx-auto mt-4 max-w-xl text-muted-foreground">Klick-Pro handles the busywork — discovery, vetting, payments, and tracking — so you can focus on the work.</p>
      </div>
    </section>
    <section class="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <p class="text-xs font-semibold uppercase tracking-wider text-primary">For clients</p>
      <h2 class="font-display mt-2 text-3xl font-bold tracking-tight md:text-4xl">Get great work done — in 4 steps</h2>
      <div class="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div class="relative rounded-2xl border border-border bg-card p-6 shadow-soft">
          <span class="font-display text-5xl font-bold text-primary/15">01</span>
          <div class="mt-2 grid h-11 w-11 place-items-center rounded-xl bg-primary/10"></div>
          <h3 class="font-display mt-4 text-lg font-semibold">Post your job</h3>
          <p class="mt-2 text-sm text-muted-foreground">Describe the work, set your budget and timeline. It's free and takes 2 minutes.</p>
        </div>
        <div class="relative rounded-2xl border border-border bg-card p-6 shadow-soft">
          <span class="font-display text-5xl font-bold text-primary/15">02</span>
          <div class="mt-2 grid h-11 w-11 place-items-center rounded-xl bg-primary/10"></div>
          <h3 class="font-display mt-4 text-lg font-semibold">Compare proposals</h3>
          <p class="mt-2 text-sm text-muted-foreground">Receive quotes from vetted pros. Chat, compare ratings, and shortlist the best.</p>
        </div>
        <div class="relative rounded-2xl border border-border bg-card p-6 shadow-soft">
          <span class="font-display text-5xl font-bold text-primary/15">03</span>
          <div class="mt-2 grid h-11 w-11 place-items-center rounded-xl bg-primary/10"></div>
          <h3 class="font-display mt-4 text-lg font-semibold">Hire safely</h3>
          <p class="mt-2 text-sm text-muted-foreground">Funds are held in escrow and released only when each milestone is approved.</p>
        </div>
        <div class="relative rounded-2xl border border-border bg-card p-6 shadow-soft">
          <span class="font-display text-5xl font-bold text-primary/15">04</span>
          <div class="mt-2 grid h-11 w-11 place-items-center rounded-xl bg-primary/10"></div>
          <h3 class="font-display mt-4 text-lg font-semibold">Pay &amp; review</h3>
          <p class="mt-2 text-sm text-muted-foreground">Release final payment and rate your pro to help our community.</p>
        </div>
      </div>
    </section>
    <section class="bg-surface">
      <div class="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <p class="text-xs font-semibold uppercase tracking-wider text-cta">For professionals</p>
        <h2 class="font-display mt-2 text-3xl font-bold tracking-tight md:text-4xl">Earn more, with less hassle</h2>
        <div class="mt-10 grid gap-6 md:grid-cols-3">
          <div class="rounded-2xl border border-border bg-card p-7 shadow-soft">
            <span class="rounded-full bg-cta/10 px-2.5 py-0.5 text-xs font-bold text-cta">Step 1</span>
            <div class="mt-3 grid h-11 w-11 place-items-center rounded-xl bg-cta/10"></div>
            <h3 class="font-display mt-4 text-lg font-semibold">Create your profile</h3>
            <p class="mt-2 text-sm text-muted-foreground">Showcase skills, portfolio, and certifications. Get verified for free.</p>
          </div>
          <div class="rounded-2xl border border-border bg-card p-7 shadow-soft">
            <span class="rounded-full bg-cta/10 px-2.5 py-0.5 text-xs font-bold text-cta">Step 2</span>
            <div class="mt-3 grid h-11 w-11 place-items-center rounded-xl bg-cta/10"></div>
            <h3 class="font-display mt-4 text-lg font-semibold">Send proposals</h3>
            <p class="mt-2 text-sm text-muted-foreground">Browse nearby and remote jobs. Submit a quote in under a minute.</p>
          </div>
          <div class="rounded-2xl border border-border bg-card p-7 shadow-soft">
            <span class="rounded-full bg-cta/10 px-2.5 py-0.5 text-xs font-bold text-cta">Step 3</span>
            <div class="mt-3 grid h-11 w-11 place-items-center rounded-xl bg-cta/10"></div>
            <h3 class="font-display mt-4 text-lg font-semibold">Win, deliver, get paid</h3>
            <p class="mt-2 text-sm text-muted-foreground">Deliver milestones, get reviews, and grow your business with Klick-Pro.</p>
          </div>
        </div>
      </div>
    </section>
    <section class="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div class="rounded-3xl bg-primary p-10 text-white md:p-14">
        <div class="grid gap-6 md:grid-cols-2 md:items-center">
          <h3 class="font-display text-3xl font-bold md:text-4xl">Get started today</h3>
          <div class="flex flex-wrap gap-3 md:justify-end">
            <a href="/post-job" class="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cta px-6 text-sm font-semibold text-cta-foreground hover:bg-cta/90">Post a Job</a>
            <a href="/signup" class="inline-flex h-11 items-center justify-center rounded-lg border border-white/30 bg-white/10 px-6 text-sm font-semibold text-white hover:bg-white/20">Become a Pro</a>
          </div>
        </div>
      </div>
    </section>
  </main>
</div>
`.trim();

export const PRICING_DEFAULT_HTML = `
<div class="min-h-screen bg-background">
  <main>
    <section class="gradient-hero">
      <div class="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <p class="text-xs font-semibold uppercase tracking-wider text-primary">Pricing</p>
        <h1 class="font-display mt-3 text-4xl font-bold tracking-tight md:text-5xl">Simple, transparent pricing</h1>
        <p class="mt-4 text-muted-foreground">Free for clients. Pros pay only when they get paid. No hidden fees. Yearly plans save 20%.</p>
      </div>
    </section>
    <section class="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
      <div class="grid gap-6 md:grid-cols-3">
        <div class="relative flex flex-col rounded-3xl border border-border bg-card p-7 shadow-soft">
          <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">For clients &amp; new pros</p>
          <h3 class="font-display mt-2 text-2xl font-bold">Starter</h3>
          <div class="mt-4 flex items-end gap-1"><span class="font-display text-5xl font-bold">₹0</span><span class="mb-1.5 text-sm text-muted-foreground">/mo</span></div>
          <p class="mt-2 text-sm text-muted-foreground">Post jobs and apply for free. Pay only when you hire or are hired.</p>
          <p class="mt-3 inline-flex w-fit rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">Pros: 10% platform fee</p>
          <ul class="mt-6 space-y-3">
            <li class="flex items-start gap-2 text-sm">&#10003; Unlimited job posts</li>
            <li class="flex items-start gap-2 text-sm">&#10003; Up to 8 proposals/month</li>
            <li class="flex items-start gap-2 text-sm">&#10003; Standard support</li>
            <li class="flex items-start gap-2 text-sm">&#10003; Escrow protection</li>
          </ul>
          <a href="/signup" class="mt-7 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Get started</a>
        </div>
        <div class="relative flex flex-col rounded-3xl border border-primary bg-card p-7 shadow-card ring-2 ring-primary/15">
          <span class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-cta px-3 py-0.5 text-xs font-bold text-cta-foreground">Most popular</span>
          <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Most popular for pros</p>
          <h3 class="font-display mt-2 text-2xl font-bold">Pro</h3>
          <div class="mt-4 flex items-end gap-1"><span class="font-display text-5xl font-bold">₹15</span><span class="mb-1.5 text-sm text-muted-foreground">/mo</span></div>
          <p class="mt-2 text-sm text-muted-foreground">Win more work with priority placement and unlimited proposals.</p>
          <p class="mt-3 inline-flex w-fit rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">Pros: 7% platform fee</p>
          <ul class="mt-6 space-y-3">
            <li class="flex items-start gap-2 text-sm">&#10003; Unlimited proposals</li>
            <li class="flex items-start gap-2 text-sm">&#10003; Priority placement</li>
            <li class="flex items-start gap-2 text-sm">&#10003; Verified badge</li>
            <li class="flex items-start gap-2 text-sm">&#10003; AI proposal writer</li>
            <li class="flex items-start gap-2 text-sm">&#10003; Same-day payouts</li>
          </ul>
          <a href="/signup" class="mt-7 inline-flex h-11 items-center justify-center rounded-lg bg-cta px-6 text-sm font-semibold text-cta-foreground hover:bg-cta/90">Start 14-day trial</a>
        </div>
        <div class="relative flex flex-col rounded-3xl border border-border bg-card p-7 shadow-soft">
          <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Teams &amp; agencies</p>
          <h3 class="font-display mt-2 text-2xl font-bold">Business</h3>
          <div class="mt-4 flex items-end gap-1"><span class="font-display text-5xl font-bold">₹39</span><span class="mb-1.5 text-sm text-muted-foreground">/mo</span></div>
          <p class="mt-2 text-sm text-muted-foreground">Hire at scale with team seats, contracts, and dedicated support.</p>
          <p class="mt-3 inline-flex w-fit rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">0% platform fee on jobs</p>
          <ul class="mt-6 space-y-3">
            <li class="flex items-start gap-2 text-sm">&#10003; Up to 10 team seats</li>
            <li class="flex items-start gap-2 text-sm">&#10003; Custom contracts</li>
            <li class="flex items-start gap-2 text-sm">&#10003; Bulk hiring</li>
            <li class="flex items-start gap-2 text-sm">&#10003; Dedicated account manager</li>
            <li class="flex items-start gap-2 text-sm">&#10003; API access</li>
          </ul>
          <a href="/contact" class="mt-7 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Talk to sales</a>
        </div>
      </div>
      <p class="mt-10 text-center text-sm text-muted-foreground">Need something custom? <a href="/contact" class="font-medium text-primary hover:underline">Contact us</a>.</p>
    </section>
  </main>
</div>
`.trim();

export const TERMS_DEFAULT_HTML = `
<div class="min-h-screen bg-background">
  <main>
    <section class="gradient-hero">
      <div class="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <p class="text-xs font-semibold uppercase tracking-wider text-primary">Legal</p>
        <h1 class="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">Terms of Service</h1>
        <p class="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">The basic rules for using the Klick-Pro marketplace.</p>
      </div>
    </section>
    <article class="mx-auto max-w-4xl space-y-8 px-4 py-16 sm:px-6">
      <section class="rounded-2xl border border-border bg-card p-7 shadow-soft">
        <h2 class="font-display text-xl font-semibold">Using Klick-Pro</h2>
        <p class="mt-3 leading-7 text-muted-foreground">Clients and professionals must provide accurate information and use the marketplace respectfully and lawfully.</p>
      </section>
      <section class="rounded-2xl border border-border bg-card p-7 shadow-soft">
        <h2 class="font-display text-xl font-semibold">Marketplace projects</h2>
        <p class="mt-3 leading-7 text-muted-foreground">Project payments, milestones, reviews, disputes, and communications should be managed through Klick-Pro where available.</p>
      </section>
    </article>
  </main>
</div>
`.trim();

export const PRIVACY_DEFAULT_HTML = `
<div class="min-h-screen bg-background">
  <main>
    <section class="gradient-hero">
      <div class="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <p class="text-xs font-semibold uppercase tracking-wider text-primary">Legal</p>
        <h1 class="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">Privacy Policy</h1>
        <p class="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">How Klick-Pro handles your account and marketplace information.</p>
      </div>
    </section>
    <article class="mx-auto max-w-4xl space-y-8 px-4 py-16 sm:px-6">
      <section class="rounded-2xl border border-border bg-card p-7 shadow-soft">
        <h2 class="font-display text-xl font-semibold">Information we use</h2>
        <p class="mt-3 leading-7 text-muted-foreground">We use account, profile, job, proposal, project, and payment information only to operate and improve the Klick-Pro marketplace.</p>
      </section>
      <section class="rounded-2xl border border-border bg-card p-7 shadow-soft">
        <h2 class="font-display text-xl font-semibold">Your choices</h2>
        <p class="mt-3 leading-7 text-muted-foreground">You can update your profile details and contact information from your account settings. We protect personal data using reasonable security measures.</p>
      </section>
    </article>
  </main>
</div>
`.trim();
