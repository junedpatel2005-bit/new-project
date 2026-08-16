import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

const groups = [
  {
    title: "General",
    items: [
      {
        q: "What is Servio?",
        a: "Servio is a marketplace that connects clients with verified professionals — from plumbers to product designers — for both local and remote work.",
      },
      {
        q: "Is it free to use?",
        a: "Yes. Posting jobs and creating a profile are free. Clients pay only the agreed price; pros pay a small platform fee on completed jobs.",
      },
      {
        q: "Where is Servio available?",
        a: "We're live in 200+ cities across North America, Europe, and parts of Asia. New cities launch every month.",
      },
    ],
  },
  {
    title: "Hiring & payments",
    items: [
      {
        q: "How are professionals vetted?",
        a: "Every pro completes ID verification. For in-home services, we also run background checks and license validation.",
      },
      {
        q: "How do payments work?",
        a: "Funds are held in escrow when you hire. They're released to the pro only when you approve each milestone.",
      },
      {
        q: "What if I'm not satisfied?",
        a: "If a job isn't delivered as agreed, our dispute team will mediate and, where applicable, refund your payment.",
      },
    ],
  },
  {
    title: "For professionals",
    items: [
      {
        q: "How quickly can I start earning?",
        a: "Most pros receive their first job invitation within 48 hours of completing verification.",
      },
      {
        q: "When do I get paid?",
        a: "As soon as a milestone is approved. Withdrawals to your bank arrive within 1–2 business days; instant withdrawals are available with Pro.",
      },
      { q: "What's the platform fee?", a: "10% on Starter, 7% on Pro, and 0% on Business plans." },
    ],
  },
];

export default function FAQ() {
  return (
    <div className="min-h-screen bg-background">
      <section className="gradient-hero">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Help center</p>
          <h1 className="font-display mt-3 text-4xl font-bold tracking-tight md:text-5xl">
            Frequently asked questions
          </h1>
          <p className="mt-4 text-muted-foreground">
            Can't find what you're looking for? Our team is one click away.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6 lg:px-8">
        {groups.map((g) => (
          <div key={g.title} className="mt-10">
            <h2 className="font-display text-xl font-semibold">{g.title}</h2>
            <Accordion
              type="single"
              collapsible
              className="mt-4 rounded-2xl border border-border bg-card shadow-soft"
            >
              {g.items.map((it, i) => (
                <AccordionItem key={i} value={`${g.title}-${i}`} className="px-5">
                  <AccordionTrigger className="text-left font-medium">{it.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {it.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
        <div className="mt-12 rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
          <h3 className="font-display text-2xl font-semibold">Still have questions?</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Our support team replies in under an hour.
          </p>
          <Button asChild size="lg" className="mt-5 bg-cta text-cta-foreground hover:bg-cta/90">
            <Link href="/">Contact support</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
