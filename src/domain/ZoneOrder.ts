/**
 * Narrative order of the Dreamland zones: Arrival → Lens → Leak. The one
 * place this list is written: the content schema, the intake catalogue, the
 * awake-layer queries and the drift world's layout all import it.
 */
export const ZONE_ORDER = ['arrival', 'lens', 'leak'] as const;

/** A zone slug, as declared on a work. */
export type ZoneSlug = (typeof ZONE_ORDER)[number];
