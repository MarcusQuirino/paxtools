/**
 * Copies `text`, falling back to a hidden textarea + `execCommand("copy")`
 * where the Clipboard API is missing or refused (plain-http origins, embedded
 * webviews, some mobile browsers). Inside an open dialog pass the dialog as
 * `host`: its focus trap keeps a textarea outside it from being selected.
 * Resolves to whether the copy took.
 */
export async function copyText(
  text: string,
  host: HTMLElement = document.body,
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.readOnly = true;
    // 16px keeps iOS from zooming in on focus.
    area.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px";
    host.appendChild(area);
    area.focus();
    area.select();
    area.setSelectionRange(0, text.length);
    try {
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      area.remove();
    }
  }
}
