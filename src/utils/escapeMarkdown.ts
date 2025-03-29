export function escapeMarkdown(text?: string) {
  if (!text) return "";
  return text.replace(/([_*\[\]()~`>#+=|{}.!\\])/g, "\\$1");
}
