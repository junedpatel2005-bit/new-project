import { db } from "@/lib/db";
import { CmsHtmlPreview } from "@/components/CmsHtmlPreview";

export async function CmsHtmlPage({
  slug,
  searchParams,
  defaultHtml,
}: {
  slug: string;
  searchParams?: Promise<{ cmsPreview?: string }>;
  defaultHtml: string;
}) {
  const params = searchParams ? await searchParams : undefined;
  const isPreview = params?.cmsPreview === "1";
  const page = await db.cmsPage.findUnique({ where: { slug } });

  if (isPreview) {
    return (
      <CmsHtmlPreview slug={slug} initialHtml={page?.content.trim() ? page.content : defaultHtml} />
    );
  }
  const html = page?.status === "PUBLISHED" && page.content.trim() ? page.content : defaultHtml;
  return <div className="cms-html-page" dangerouslySetInnerHTML={{ __html: html }} />;
}
