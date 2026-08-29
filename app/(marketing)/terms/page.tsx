import { CmsHtmlPage } from "@/components/CmsHtmlPage";
import { TERMS_DEFAULT_HTML } from "@/lib/cms-page-defaults";

export default async function TermsPage({
  searchParams,
}: {
  searchParams: Promise<{ cmsPreview?: string }>;
}) {
  return <CmsHtmlPage slug="terms" searchParams={searchParams} defaultHtml={TERMS_DEFAULT_HTML} />;
}
