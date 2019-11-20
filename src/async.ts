import {Signal} from 'openfin-service-signal';

import {DeferredPromise} from './DeferredPromise';

export async function serialForEach<T>(arr: T[], asyncF: (x: T, i: number, r: T[]) => Promise<void>): Promise<void>;
export async function serialForEach<T>(arr: T[], asyncF: (x: T, i: number) => Promise<void>): Promise<void>;
export async function serialForEach<T>(arr: T[], asyncF: (x: T) => Promise<void>): Promise<void>;
export async function serialForEach<T>(arr: T[], asyncF: () => Promise<void>): Promise<void>;
export async function serialForEach<T>(arr: T[], asyncF: (...args: any[]) => Promise<void>): Promise<void> {
    let i = 0;
    for (const x of arr) {
        await asyncF(x, i, arr);
        i++;
    }
}

export async function serialMap<T, U>(arr: T[], asyncF: (x: T, i: number, r: T[]) => Promise<U>): Promise<U[]>;
export async function serialMap<T, U>(arr: T[], asyncF: (x: T, i: number) => Promise<U>): Promise<U[]>;
export async function serialMap<T, U>(arr: T[], asyncF: (x: T) => Promise<U>): Promise<U[]>;
export async function serialMap<T, U>(arr: T[], asyncF: () => Promise<U>): Promise<U[]>;
export async function serialMap<T, U>(arr: T[], asyncF: (...args: any[]) => Promise<U>): Promise<U[]> {
    const result: U[] = [];
    await serialForEach(arr, async (x, i, r) => {
        result.push(await asyncF(x, i, r));
    });

    return result;
}

export async function serialFilter<T>(arr: T[], asyncF: (x: T, i: number, r: T[]) => Promise<boolean>): Promise<T[]>;
export async function serialFilter<T>(arr: T[], asyncF: (x: T, i: number) => Promise<boolean>): Promise<T[]>;
export async function serialFilter<T>(arr: T[], asyncF: (x: T) => Promise<boolean>): Promise<T[]>;
export async function serialFilter<T>(arr: T[], asyncF: () => Promise<boolean>): Promise<T[]>;
export async function serialFilter<T>(arr: T[], asyncF: (...args: any[]) => Promise<boolean>): Promise<T[]> {
    const result: T[] = [];
    await serialForEach(arr, async (x, i, r) => {
        if (await asyncF(x, i, r)) {
            result.push(x);
        }
    });

    return result;
}

export async function parallelForEach<T>(arr: T[], asyncF: (x: T, i: number, r: T[]) => Promise<void>): Promise<void>;
export async function parallelForEach<T>(arr: T[], asyncF: (x: T, i: number) => Promise<void>): Promise<void>;
export async function parallelForEach<T>(arr: T[], asyncF: (x: T) => Promise<void>): Promise<void>;
export async function parallelForEach<T>(arr: T[], asyncF: () => Promise<void>): Promise<void>;
export async function parallelForEach<T>(arr: T[], asyncF: (...args: any[]) => Promise<void>): Promise<void> {
    await Promise.all(arr.map(asyncF));
}

export async function parallelMap<T, U>(arr: T[], asyncF: (x: T, i: number, r: T[]) => Promise<U>): Promise<U[]>;
export async function parallelMap<T, U>(arr: T[], asyncF: (x: T, i: number) => Promise<U>): Promise<U[]>;
export async function parallelMap<T, U>(arr: T[], asyncF: (x: T) => Promise<U>): Promise<U[]>;
export async function parallelMap<T, U>(arr: T[], asyncF: () => Promise<U>): Promise<U[]>;
export async function parallelMap<T, U>(arr: T[], asyncF: (...args: any[]) => Promise<U>): Promise<U[]> {
    const result: U[] = [];
    await parallelForEach(arr, async (x, i, r) => {
        result[i] = await asyncF(x, i, r);
    });

    return result;
}

export async function parallelFilter<T>(arr: T[], asyncF: (x: T, i: number, r: T[]) => Promise<boolean>): Promise<T[]>;
export async function parallelFilter<T>(arr: T[], asyncF: (x: T, i: number) => Promise<boolean>): Promise<T[]>;
export async function parallelFilter<T>(arr: T[], asyncF: (x: T) => Promise<boolean>): Promise<T[]>;
export async function parallelFilter<T>(arr: T[], asyncF: () => Promise<boolean>): Promise<T[]>;
export async function parallelFilter<T>(arr: T[], asyncF: (...args: any[]) => Promise<boolean>): Promise<T[]> {
    const table: boolean[] = [];

    await parallelForEach(arr, async (x, i, r) => {
        table[i] = await asyncF(x, i, r);
    });

    return arr.filter((x, i) => table[i]);
}

/**
 * Races a given promise against a timeout, and either resolves to the value the the promise resolved it, if it resolved before the
 * timeout, or rejects.
 *
 * @param timeoutMs Timeout period in ms
 * @param promise Promise to race against the timeout
 */
export function withStrictTimeout<T>(timeoutMs: number, promise: Promise<T>, rejectMessage: string): Promise<T> {
    const timeout = new Promise<T>((res, rej) => setTimeout(() => rej(new Error(rejectMessage)), timeoutMs));
    return allowReject(Promise.race([timeout, promise]));
}

/**
 * Races a given promise against a timeout, and resolves to a `[didTimeout, value?]` tuple indicating
 * whether the timeout occurred, and the value the promise resolved to (if timeout didn't occur).
 *
 * @param timeoutMs Timeout period in ms
 * @param promise Promise to race against the timeout
 */
export function withTimeout<T>(timeoutMs: number, promise: Promise<T>): Promise<[boolean, T | undefined]> {
    const timeout = new Promise<[boolean, undefined]>((res) => setTimeout(() => res([true, undefined]), timeoutMs));
    const p = promise.then((value) => ([false, value] as [boolean, T]));
    return Promise.race([timeout, p]);
}

/**
 * Returns a promise that resolves when the given predicate is true, evaluated immediately and each time the provided signal is fired.
 *
 * @param signal When this signal is fired, the predicate is revaluated
 * @param predicate The predicate to evaluate
 * @param guard A promise. If this rejects, give up listening to the signal and reject
 */
export function untilTrue<A extends any[]>(signal: Signal<A>, predicate: () => boolean, guard?: Promise<void>): Promise<void> {
    if (predicate()) {
        return Promise.resolve();
    }

    return untilSignal(signal, predicate, guard);
}

/**
 * Returns a promise that resolves when the given signal is fired, and the given predicate evaluates to true when passed the arguments
 * recevied from the signal.
 *
 * @param signal The signal to listen to
 * @param predicate The predicate to evaluate against arguments received from the signal
 * @param guard A promise. If this rejects, give up listening to the signal and reject
 */
export function untilSignal<A extends any[]>(signal: Signal<A>, predicate: (...args: A) => boolean, guard?: Promise<void>): Promise<void> {
    const promise = new DeferredPromise();
    const slot = signal.add((...args: A) => {
        if (predicate(...args)) {
            slot.remove();
            promise.resolve();
        }
    });

    if (guard) {
        guard.catch((e) => {
            slot.remove();
            promise.reject(e);
        });
    }

    return allowReject(promise.promise);
}

/**
 * Attaches an empty `catch` block to a promise, then returns the original promise. This prevents rejection of the promise being logged as
 * a warning during tests, but does not otherwise change behaviour should the promise reject. This should be called for promises we expect
 * to reject under normal circumstances, but would not otherwise have a `catch` block attached.
 *
 * @param promise The promise to attach the catch block to
 */
export function allowReject<T>(promise: Promise<T>): Promise<T> {
    promise.catch(() => {});
    return promise;
}
