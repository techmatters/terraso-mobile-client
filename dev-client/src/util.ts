export function formatNames(firstName: string, lastName?: string) {
  let formatted = firstName;
  if (lastName !== undefined) {
    formatted += ', ';
    formatted += lastName;
  }
  return formatted;
}
