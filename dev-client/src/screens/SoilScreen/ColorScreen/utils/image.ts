import {Buffer} from '@craftzdog/react-native-buffer';
import {decode} from 'jpeg-js';

export type Photo = {
  base64: string;
  width: number;
  height: number;
  uri: string;
};

export const decodeBase64Jpg = (base64: string) =>
  decode(Buffer.from(base64, 'base64'), {useTArray: true});

export const base64ImageToSource = (base64: string) => ({
  uri: 'data:image/jpeg;base64,' + base64,
});
