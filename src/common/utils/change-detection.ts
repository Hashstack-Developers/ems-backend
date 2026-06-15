export function stringArraysEqualAsSet(
  a: readonly string[],
  b: readonly string[],
): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const setA = new Set(a);
  if (setA.size !== new Set(b).size) {
    return false;
  }

  return b.every((item) => setA.has(item));
}

export function isSameOptionalNumber(
  current: number | null | undefined,
  next: number | null | undefined,
): boolean {
  const normalizedCurrent = current ?? null;
  const normalizedNext = next ?? null;
  return normalizedCurrent === normalizedNext;
}

export function isSameOptionalString(
  current: string | null | undefined,
  next: string | null | undefined,
): boolean {
  const normalizedCurrent = current?.trim() ?? '';
  const normalizedNext = next?.trim() ?? '';
  return normalizedCurrent === normalizedNext;
}
