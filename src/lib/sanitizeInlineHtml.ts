const ALLOWED_TAGS = new Set(["B", "STRONG", "I", "EM", "U", "BR"]);

/** Strips everything except a small whitelist of inline formatting tags (bold/italic/underline). */
export function sanitizeInlineHtml(html: string): string {
  const template = document.createElement("template");
  template.innerHTML = html;
  const clean = (parent: Node) => {
    Array.from(parent.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) return;
      if (node.nodeType !== Node.ELEMENT_NODE) {
        node.parentNode?.removeChild(node);
        return;
      }
      const element = node as HTMLElement;
      clean(element);
      if (!ALLOWED_TAGS.has(element.tagName)) {
        while (element.firstChild) element.parentNode?.insertBefore(element.firstChild, element);
        element.parentNode?.removeChild(element);
        return;
      }
      Array.from(element.attributes).forEach((attr) => element.removeAttribute(attr.name));
    });
  };
  clean(template.content);
  return template.innerHTML;
}
