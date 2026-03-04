/** Base URL path, without trailing slash. Empty string in dev, '/dasmap' in prod. */
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
