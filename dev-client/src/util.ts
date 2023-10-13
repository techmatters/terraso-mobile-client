export function formatNames(firstName: string, lastName?: string) {
  let formatted = '';
  if (lastName !== undefined) {
    formatted += lastName;
    formatted += ', ';
  }
  formatted += firstName;
  return formatted;
}
