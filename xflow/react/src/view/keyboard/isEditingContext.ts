/** C8.2 / C8.4 — focus dans un champ où les raccourcis nodaux ne doivent pas s’appliquer. */
export function isEditingContext(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (target.isContentEditable) return true;
  return false;
}
