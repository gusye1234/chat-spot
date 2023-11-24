import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function validateOpenAIKey(key: string) {
  if (!key.startsWith('sk-')) {
    return false;
  }
  // maybe wrong
  if (key.length !== 51) {
    return false;
  }
  return true;
}
