export type MarketplaceProfessional = {
  id: string;
  name: string;
  title: string;
  avatar: string | null;
  rating: number;
  reviews: number;
  hourlyRate: number | null;
  location: string | null;
  availability: string;
  verified: boolean;
  skills: string[];
  bio: string | null;
};

export type MarketplaceCategory = {
  id: number;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  professionalCount: number;
};

export type MarketplaceJob = {
  id: number;
  title: string;
  description: string;
  category: string;
  budgetMin: number | null;
  budgetMax: number | null;
  urgency: "LOW" | "MEDIUM" | "HIGH";
  workMode: "ON_SITE" | "REMOTE" | "BOTH";
  location: string | null;
  createdAt: string;
  proposalCount: number;
  client: { name: string; avatar: string | null; rating: number };
};
