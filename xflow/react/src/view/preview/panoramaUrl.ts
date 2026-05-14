/** Aligné sur `editor-shared-preview-picker.js` (`normalizePanoramaUrl`). */
export function normalizePanoramaUrl(rawUrl: string | undefined | null): string {
  let imgUrl = rawUrl || "";
  if (!imgUrl.startsWith("http") && !imgUrl.startsWith("data:") && !imgUrl.startsWith("blob:")) {
    imgUrl = `./${imgUrl}`;
  }
  return imgUrl;
}
