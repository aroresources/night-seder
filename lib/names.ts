/**
 * Names in three parts.
 *
 * The database keeps `first_name`, `middle_name` and `last_name`, and computes
 * the display `name` from them. Only the surname is required: the lists are
 * ordered by it, and a man written down by surname alone is ordinary.
 */

/**
 * The surname is the part that has to be there. A given name is optional —
 * plenty of men are written down by surname alone, and the lists are ordered
 * by surname anyway.
 */
export interface NameParts {
  first_name: string | null;
  middle_name: string | null;
  last_name: string;
}

/**
 * Split a pasted line into parts: the first word is the first name, the last
 * word is the surname, and anything between is the middle. One word on its own
 * is taken as a surname, since that is the part a person must have.
 *
 * This is a guess, and it is wrong for some names — a two-word surname lands
 * in the middle. It is only used for bulk paste, where the alternative is
 * typing a hundred names by hand; every one is editable afterwards.
 */
export function parseFullName(line: string): NameParts | null {
  const words = line.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  // One word is a surname, not a given name: the surname is what is required.
  if (words.length === 1) {
    return { first_name: null, middle_name: null, last_name: words[0] };
  }

  return {
    first_name: words[0],
    middle_name: words.length > 2 ? words.slice(1, -1).join(' ') : null,
    last_name: words[words.length - 1],
  };
}

/**
 * The display name, assembled the same way the database generates it.
 * Used for optimistic UI; anything read back from the database already has it.
 */
export function fullName(parts: NameParts): string {
  return [parts.first_name, parts.middle_name, parts.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
}

/**
 * Lists are ordered by surname, which is how you'd read a list of men out,
 * with the given name breaking ties between brothers. A man with no given
 * name sorts first among his namesakes, which is where an empty string puts
 * him anyway.
 */
export function nameSortKey(parts: NameParts): string {
  const surname = parts.last_name?.trim() || parts.first_name?.trim() || '';
  return `${surname} ${parts.first_name?.trim() ?? ''}`.trimEnd().toLowerCase();
}

export function compareByName(a: NameParts, b: NameParts): number {
  return nameSortKey(a).localeCompare(nameSortKey(b));
}
