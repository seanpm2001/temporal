import { isObjectlike } from './utils'

// TODO: rename 'ensure' to 'require' ?

export function ensureInstanceOf<T>(Class: { new(): T; }, obj: T): T {
  if (!(obj instanceof Class)) {
    throw new TypeError('Must be certain type'); // TODO: show Class's symbol?
  }
  return obj;
}
function ensureType<A>(typeName: string, arg: A): A {
  if (typeof arg !== typeName) {
    throw new TypeError(`Must be certain type ${typeName}`);
  }
  return arg;
}

export const ensureString = ensureType.bind(undefined, 'string') as (arg: string) => string;

export const ensureNumber = ensureType.bind(undefined, 'number') as (arg: number) => number;

// TODO: provide entity like 'epochNanoseconds' or 'epochMicroseconds'
export const ensureBigInt = ensureType.bind(undefined, 'bigint') as (arg: bigint) => bigint;

export const ensureBoolean = ensureType.bind(undefined, 'boolean') as (arg: boolean) => boolean;

export function ensureInteger(arg: number): number {
  return ensureNumberIsInteger(ensureNumber(arg));
}

export function ensureObjectlike<O extends {}>(arg: O): O {
  if (!isObjectlike(arg)) {
    throw new TypeError('Must be object-like');
  }
  return arg;
}

export function toString(arg: string): string {
  if (typeof arg === 'symbol') {
    throw new TypeError('Cannot convert a Symbol to a String');
  }
  return String(arg);
}
/*
truncates floats
*/

export function toInteger(arg: number): number {
  return Math.trunc(toNumber(arg)) || 0; // ensure no -0
}
/*
throws error on floats
*/

export function toIntegerStrict(arg: number): number {
  return ensureNumberIsInteger(toNumber(arg));
}
function ensureNumberIsInteger(num: number): number {
  if (!Number.isInteger(num)) {
    throw new RangeError('must be integer');
  }
  return num || 0; // ensure no -0... TODO: why???
}
/*
Caller must do ||0 to ensure no -0
*/
export function toNumber(arg: number): number {
  if (typeof arg === 'bigint') {
    throw new TypeError('Cannot convert bigint to number') // ...in this case
  }

  arg = Number(arg);
  if (isNaN(arg)) {
    throw new RangeError('not a number');
  }
  if (!Number.isFinite(arg)) {
    throw new RangeError('must be finite');
  }
  return arg;
}

export function toStringOrUndefined(input: string | undefined): string | undefined {
  if (input !== undefined) {
    return toString(input)
  }
}

export function toIntegerOrUndefined(input: number | undefined): number | undefined {
  if (input !== undefined) {
    return toInteger(input)
  }
}

export function ensureStringOrUndefined(input: string | undefined): string | undefined {
  if (input !== undefined && typeof input !== 'string') {
    throw new TypeError('Must be string or undefined')
  }
  return input
}

export function ensureIntegerOrUndefined(input: number | undefined): number | undefined {
  if (input === undefined) {
    // good
  } else if (typeof input === 'number') {
    if (!Number.isInteger(input)) {
      throw new RangeError('Cannot accept non-integer')
    }
  } else {
    throw new TypeError('Invalid type. Expected integer or undefined')
  }
  return input
}

/*
Non-zero
*/
export function ensurePositiveInteger(input: number): number {
  if (typeof input === 'number') {
    if (!Number.isInteger(input)) {
      throw new RangeError('Cannot accept non-integer')
    }
    if (input <= 0) {
      throw new RangeError('Must be positive')
    }
  } else {
    throw new TypeError('Invalid type. Expected integer or undefined')
  }
  return input
}
