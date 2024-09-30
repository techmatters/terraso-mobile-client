export type FieldChange<T> = {
  fieldName: string & T;
};

export const gatherChangedFields = <T>(
  fields: Record<string, FieldChange<T>>,
  input: any,
): Record<string, any> => {
  const mutatedFields: Record<string, any> = {};
  for (const field of Object.keys(fields)) {
    if (field in input && input[field] !== undefined)
      mutatedFields[field] = input[field];
  }
  return mutatedFields;
};

export const mutateFields = <T>(
  fields: T[] & string[],
  mutationInput: any,
  mutationTarget: any,
): Set<T> => {
  const mutation: Record<string, any> = {};
  const mutatedFields: Set<T> = new Set();
  for (const field of fields) {
    if (field in mutationInput && mutationInput[field] !== undefined)
      mutation[field] = mutationInput[field];
    mutatedFields.add(field);
  }
  Object.assign(mutationTarget, mutation);
  return mutatedFields;
};
