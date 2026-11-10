/**
 * The component tests optional slots with `== null` and `!= null`, which treat
 * null and undefined alike. These two keep that meaning.
 */
export const isNil = (value: unknown): value is null | undefined =>
  value === null || value === undefined;

export const isPresent = <T>(value: T): value is NonNullable<T> =>
  value !== null && value !== undefined;
