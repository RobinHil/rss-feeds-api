export function normalizeSearchTerm(term: string): string {
    return term
        .toLowerCase() // Conversion en minuscules
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Suppression des accents
        .trim() // Suppression des espaces au début et à la fin
        .replace(/\s+/g, ' '); // Normalisation des espaces multiples
}