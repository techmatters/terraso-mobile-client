export function formatName(firstName: string, lastName?: string) {
  return [lastName, firstName].filter(Boolean).join(', ');
}
