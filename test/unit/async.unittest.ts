import 'jest';
import {parallelForEach, serialForEach, serialMap, serialFilter, parallelMap, parallelFilter} from '../../src/async';
import {useMockTime, advanceTime} from '../utils/unit/time';

type Callback = (entry: TableEntry, index: number, array: Table) => Promise<boolean>;
type Table = TableEntry[];

interface TableEntry {
    index: number;
    truth: boolean;
    delay: number;
}

const numTables = 100;
const maxEntriesPerTable = 100;
const maxDelayPerEntry = 20;

beforeEach(() => {
    useMockTime();
});

describe('When given random data', () => {
    const tables: Table[] = [];
    for (let i = 0; i < numTables; i++) {
        tables.push(createRandomTable(maxEntriesPerTable, maxDelayPerEntry));
    }

    test('`serialForEach` gives an equivalent result to `forEach`', async () => {
        await runAsyncFunction(tables, testSerialForEach, maxDelayPerEntry);
    });

    test('`serialMap` gives an equivalent result to `map`', async () => {
        await runAsyncFunction(tables, testSerialMap, maxDelayPerEntry)
    });

    test('`serialFilter` gives an equivalent result to `filter`', async () => {
        await runAsyncFunction(tables, testSerialFilter, maxDelayPerEntry)
    });

    test('`parallelForEach` gives an equivalent result to `forEach`', async () => {
        await runAsyncFunction(tables, testParallelForEach, maxDelayPerEntry)
    });

    test('`parallelMap` gives an equivalent result to `map`', async () => {
        await runAsyncFunction(tables, testParallelMap, maxDelayPerEntry);
    });

    test('`parallelFilter` gives an equivalent result to `filter`', async () => {
        await runAsyncFunction(tables, testParallelFilter, maxDelayPerEntry);
    });
});

async function testSerialForEach(table: Table) {
    const callLog: number[] = [];

    const callback = createCallback(table, callLog);

    await serialForEach(table, async (entry: TableEntry, index: number, array: Table) => {
        await callback(entry, index, array);
    });

    expect(callLog).toEqual(table.map((entry) => entry.index));
}

async function testSerialMap(table: Table) {
    const callLog: number[] = [];

    const result = await serialMap(table, createCallback(table, callLog));

    expect(callLog).toEqual(table.map((entry) => entry.index));
    expect(result).toEqual(table.map((entry) => entry.truth));
}

async function testSerialFilter(table: Table) {
    const callLog: number[] = [];

    const result = await serialFilter(table, createCallback(table, callLog));

    expect(callLog).toEqual(table.map((entry) => entry.index));
    expect(result).toEqual(table.filter((entry) => entry.truth));
}

async function testParallelForEach(table: Table) {
    const callLog: number[] = [];

    const callback = createCallback(table, callLog);

    await parallelForEach(table, async (entry: TableEntry, index: number, array: Table) => {
        await callback(entry, index, array);
    });

    expect(callLog.sort((a, b) => a - b)).toEqual(table.map((entry) => entry.index));
}

async function testParallelMap(table: Table) {
    const callLog: number[] = [];

    const result = await parallelMap(table, createCallback(table, callLog));

    expect(callLog.sort((a, b) => a - b)).toEqual(table.map((entry) => entry.index));
    expect(result).toEqual(table.map((entry) => entry.truth));
}

async function testParallelFilter(table: Table) {
    const callLog: number[] = [];

    const result = await parallelFilter(table, createCallback(table, callLog));

    expect(callLog.sort((a, b) => a - b)).toEqual(table.map((entry) => entry.index));
    expect(result).toEqual(table.filter((entry) => entry.truth));
}

async function runAsyncFunction(tables: Table[], asyncF: (table: Table) => Promise<void>, maxDelay: number): Promise<void> {
    for (const table of tables) {
        const promise = asyncF(table);
        await advanceTime(table.length * maxDelay);
        await promise;
    }
}

function createRandomTable(maxSize: number, maxDelay: number): Table {
    const table: Table = [];

    const size = Math.floor(Math.random() * maxSize);

    for (let i = 0; i < size; i++) {
        table.push({
            index: i,
            truth: Math.random() < 0.5,
            delay: Math.floor(Math.random() * maxDelay)
        });
    }

    return table;
}

function createCallback(table: Table, callLog: number[]): Callback {
    return async (entry: TableEntry, index: number, array: Table) => {
        await new Promise((res) => setTimeout(res, entry.delay));

        expect(array).toBe(table);
        expect(index).toBe(entry.index);

        callLog.push(index);

        return entry.truth;
    };
}
