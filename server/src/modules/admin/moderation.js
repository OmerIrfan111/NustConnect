/**
 * Finds the code that can hide / restore a reported item or moderate a user. Admin never imports another module:
 * it reads the manifests the loader already collected in `app.locals.modules` (docs/CONTRACTS.md §6).
 *
 * A report names its target by `targetType` (for example "ride"). That resolves to a module in this order:
 *   1. a module whose `moderationHooks.targetTypes` array contains it   (the explicit way, preferred)
 *   2. a module whose slug equals it                                    (targetType "reviews")
 *   3. the built-in alias table below                                   (ride -> rideshare, item -> marketplace, ...)
 * and the module's `moderationHooks.hide(id)` / `restore(id)` is called. Hidden content must stay invisible to students
 * (lists, search and direct URL) and visible to moderators: that part is each module's job.
 */

const ALIASES = {
  ride: 'rideshare',
  trip: 'rideshare',
  meetup: 'rideshare',
  item: 'marketplace',
  listing: 'marketplace',
  skillpost: 'marketplace',
  review: 'reviews',
  entity: 'reviews',
  opportunity: 'reviews',
  lostitem: 'lostfound',
  founditem: 'lostfound',
  claim: 'lostfound',
  faq: 'support',
  complaint: 'support',
  location: 'campus',
  bill: 'campus',
};

/** Returns the manifest that handles `targetType`, or null. */
function moduleFor(registry, targetType) {
  const all = [...registry.values()];
  const explicit = all.find((m) => Array.isArray(m.moderationHooks?.targetTypes) && m.moderationHooks.targetTypes.includes(targetType));
  if (explicit) return explicit;
  if (registry.has(targetType)) return registry.get(targetType);
  return registry.get(ALIASES[targetType]) || null;
}

/** `hide` or `restore` for the target, or null when no module provides it. */
function hookFor(registry, targetType, action) {
  const m = moduleFor(registry, targetType);
  const fn = m?.moderationHooks?.[action];
  return typeof fn === 'function' ? { slug: m.slug, run: fn } : null;
}

/** The auth module's user moderation contract: `userModeration = { warn, suspend, unsuspend }` (each `(userId, note) => …`). */
function userModeration(registry) {
  return registry.get('auth')?.userModeration || null;
}

module.exports = { moduleFor, hookFor, userModeration, ALIASES };
