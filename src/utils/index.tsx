import { v4 as uuidv4 } from 'uuid';

export function formatJson(value: any) {
  try {
    if (typeof value === 'string') {
      value === JSON.parse(value);
    }
    return JSON.stringify(value, null, 2);
  } catch (e) {}
  return value;
}

export const createId = () => {
  return uuidv4();
};
