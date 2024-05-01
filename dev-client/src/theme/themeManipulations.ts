/*
 * Copyright © 2024 Technology Matters
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see https://www.gnu.org/licenses/.
 */

/*
 * returns a union of the nested paths of an object. for example,
 *   PathOf<{obj: {prop1: string; prop2: number}; prop: boolean}>
 * is the type
 *   'obj.prop1' | 'obj.prop2' | 'prop'
 */
export type PathOf<Object extends Record<string, any>> = string &
  // we're only interested in the keys of this object, but TS makes us define it as an object,
  // so we just set the values to never
  keyof {
    // for each property in the object, check if the value at that property is a nested object
    [Property in keyof Object as Object[Property] extends Record<string, any>
      ? // if it is, concatenate the property with the recursive paths of the nested object
        `${Property & string}.${string & PathOf<Object[Property]>}`
      : // otherwise just return the property
        Property]: never;
  };

/*
 * given a path into an object, returns the type of the value at that path. for example
 *   TypeAt<{obj: {prop1: string; prop2: number}; prop: boolean}, 'obj.prop1'>
 * is the type string
 */
type TypeAt<
  Object extends Record<string, any>,
  Key extends PathOf<Object>,
> = Key extends `${infer Head}.${infer Tail}`
  ? TypeAt<Object[Head], PathOf<Object[Head]> & Tail>
  : Object[Key];

// gets a value from an object based on a nested path into the object in a typesafe way.
// if the key is not a path into the object, we return it as-is
export const getByKey = <Object extends Record<string, any>, Key>(
  object: Object,
  key: Key,
): Key extends PathOf<Object> ? TypeAt<Object, Key> : Key =>
  (typeof key === 'string'
    ? key.split('.').reduce((o, k) => o[k], object) ?? key
    : key) as Key extends PathOf<Object> ? TypeAt<Object, Key> : Key;

export type ElementOf<T extends Set<any>> =
  T extends Set<infer Element> ? Element : never;

/*
 * the default TS type for set.has enforces that the checked value's type matches
 * the set's element type. this version allows checking any value, and if the set
 * does contain the value we use a typeguard to propagate that information to the
 * typechecker
 */
export const setHas = <T>(set: Set<T>, value: any): value is T =>
  set.has(value);
