// Card rendering is pluggable and OFF by default: the card method and any card copy are still open
// with Josh. A renderer receives the draft and its checked claims and returns { key, alt } for an
// image already stored in R2 (MEDIA), or null for no card. X posts without a card show the site's
// link preview. Select with the CARD_RENDERER var.
export const renderers = {
  // Default: no card.
  none: async () => null,
  // Wiring stub for a future renderer. It records that a card was requested and returns no image,
  // so nothing placeholder-like can ever reach X.
  stub: async ({ article }) => { console.log(`card requested for ${article.slug} (stub renderer, no image)`); return null; },
};

export async function renderCard(env, input) {
  const renderer = renderers[env.CARD_RENDERER || "none"];
  if (!renderer) throw new Error(`Unknown CARD_RENDERER "${env.CARD_RENDERER}".`);
  return renderer({ ...input, env });
}
