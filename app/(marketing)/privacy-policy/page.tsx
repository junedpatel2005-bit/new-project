import { CmsHtmlPage } from "@/components/CmsHtmlPage";
import { PRIVACY_DEFAULT_HTML } from "@/lib/cms-page-defaults";

export default async function PrivacyPolicyPage({
  searchParams,
}: {
  searchParams: Promise<{ cmsPreview?: string }>;
}) {
  return (
    <CmsHtmlPage slug="privacy-policy" searchParams={searchParams} defaultHtml={PRIVACY_DEFAULT_HTML} />
  );
}
