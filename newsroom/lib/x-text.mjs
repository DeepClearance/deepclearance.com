// X weighted length, matching twitter-text v3 (the counter X uses for the 280 limit).
// Code points in the ranges below weigh 1; everything else (CJK, most symbols) weighs 2.
// Each emoji sequence weighs 2. Every http(s) URL counts as 23, whatever its real length.
export const X_MAX_WEIGHTED_LENGTH = 280;
export const X_URL_LENGTH = 23;

const lightRanges = [[0, 4351], [8192, 8205], [8208, 8223], [8242, 8247]];
const urlPattern = /https?:\/\/[^\s]+/giu;
const emojiPattern = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;
const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });

function codePointWeight(codePoint) {
  return lightRanges.some(([low, high]) => codePoint >= low && codePoint <= high) ? 1 : 2;
}

export function weightedLength(text) {
  const value = String(text ?? "").normalize("NFC");
  let total = 0;
  let last = 0;
  const count = (chunk) => {
    for (const { segment } of segmenter.segment(chunk)) {
      if (emojiPattern.test(segment)) { total += 2; continue; }
      for (const char of segment) total += codePointWeight(char.codePointAt(0));
    }
  };
  for (const match of value.matchAll(urlPattern)) {
    count(value.slice(last, match.index));
    total += X_URL_LENGTH;
    last = match.index + match[0].length;
  }
  count(value.slice(last));
  return total;
}

// The post X receives: approved copy, a blank line, then the canonical article URL.
export function composePost(copy, url) {
  const body = String(copy ?? "").trim();
  return body ? `${body}\n\n${url}` : "";
}

export function checkPost(text) {
  const length = weightedLength(text);
  return { length, max: X_MAX_WEIGHTED_LENGTH, ok: length > 0 && length <= X_MAX_WEIGHTED_LENGTH };
}
