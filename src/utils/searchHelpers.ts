/**
 * Normalizes a search term by converting it to lowercase, removing accents, trimming spaces, and normalizing multiple spaces.
 * 
 * @param {string} term - The search term to be normalized.
 * @returns {string} The normalized search term.
 */
export function normalizeSearchTerm(term: string): string {
    return term
        .toLowerCase() /** Converts to lowercase */
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') /** Removes accents */
        .trim() /** Removes spaces at the beginning and end */
        .replace(/\s+/g, ' '); /** Normalizes multiple spaces */
}