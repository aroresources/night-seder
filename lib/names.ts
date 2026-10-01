/**
 * Names in three parts.
 *
 * The database keeps `first_name`, `middle_name` and `last_name`, and computes
 * the display `name` from them. Only `first_name` is required: plenty of men
 * are known by one name, and a form that insists on a surname invents one.
 */

export interface NameParts {
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
}

/**
 * Split a pasted line into parts: the first word is the first name, the last
 * word is the surname, and anything between is the middle. One word is just a
 * first name.
 *
 * This is a guess, and it is wrong for some names — a two-word surname lands
 * in the middle. It is only used for bulk paste, where the alternative is
 * typing a hundred names by hand; every one is editable afterwards.
 */
export function parseFullName(line: string): NameParts | null {
  const words = line.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  if (words.length === 1) {
    return { first_name: words[0], middle_name: null, last_name: null };
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
