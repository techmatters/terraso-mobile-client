export function formatNames(firstName: string, lastName?: string) {
  return [lastName, firstName].filter(Boolean).join(', ');
}
