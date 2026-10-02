/**
 * Recently visited listings, kept in the browser's localStorage.
 * They are shown in the keyword search when the search input is focused and empty.
 *
 * Only the data needed for a link is stored: { id, slug, title }.
 * Note: localStorage can be unavailable (SSR, private mode), so every access is wrapped in try/catch.
 */

const STORAGE_KEY = 'recentVisits';
const MAX_VISITS = 5;

/**
 * Get the recently visited listings, the latest first.
 *
 * @returns {Array<{ id: string, slug: string, title: string }>} recent visits
 */
export const getRecentVisits = () => {
  try {
    const visits = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    return Array.isArray(visits) ? visits : [];
  } catch (e) {
    return [];
  }
};

/**
 * Save a listing visit. The listing is moved to the top if it was visited before.
 *
 * @param {Object} visit
 * @param {string} visit.id listing id (uuid string)
 * @param {string} visit.slug listing slug for the link
 * @param {string} visit.title listing title
 */
export const saveRecentVisit = visit => {
  try {
    // Remove the earlier visit of the same listing, so it isn't listed twice
    const otherVisits = getRecentVisits().filter(v => v.id !== visit.id);
    const visits = [visit, ...otherVisits].slice(0, MAX_VISITS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
  } catch (e) {
    // localStorage is not available, so the visit is just not saved
  }
};
