import { CmsHtmlPage } from "@/components/CmsHtmlPage";
import { PRICING_DEFAULT_HTML } from "@/lib/cms-page-defaults";

export default async function Pricing({
  searchParams,
}: {
  searchParams: Promise<{ cmsPreview?: string }>;
}) {
  return (
    <CmsHtmlPage slug="pricing" searchParams={searchParams} defaultHtml={PRICING_DEFAULT_HTML} />
  );
}
