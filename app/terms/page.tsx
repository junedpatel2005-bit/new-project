import { LegalPage } from "@/components/LegalPage";

export default function TermsPage() {
  return <LegalPage eyebrow="Legal" title="Terms of Service" description="The basic rules for using the Servio marketplace." sections={[{ title: "Using Servio", body: "Clients and professionals must provide accurate information and use the marketplace respectfully and lawfully." }, { title: "Marketplace projects", body: "Project payments, milestones, reviews, disputes, and communications should be managed through Servio where available." }]} />;
}
