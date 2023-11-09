export const formatName = (firstName: string, lastName?: string) => {
  return [lastName, firstName].filter(Boolean).join(', ');
};

export const removeKeys = (a: any, b: any) => {
  const remove = [a, b];
  let currA, currB;
  while (remove.length) {
    currA = remove.pop();
    currB = remove.pop();
    for (const keyA of Object.keys(currA)) {
      if (!(keyA in currB)) {
        delete currA[keyA];
        continue;
      }
      const valA = currA[keyA];
      const valB = currB[keyA];
      if (typeof valA !== typeof valB) {
        delete currA[keyA];
        continue;
      }
      if (typeof valA === 'object' && !Array.isArray(valA) && valA !== null) {
        remove.push(valA, valB);
      }
    }
  }
};

export const normalizeText = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // unicode range for combining diacritical marks
