import type { QueryResult, QueryResultRow } from "pg";
import { Client } from "pg";
import { createClient } from "@vercel/postgres";

function* incrementGenerator() {
  let count = 1;
  while (true) {
    yield count++;
  }
}

function* arrayIter<T>(arr: T[]) {
  for (const item of arr) {
    yield item;
  }
}

export type ClientLike = {
  connect: () => Promise<void>;
  end: () => Promise<void>;
  query: <O extends QueryResultRow, TValues>(
    query: string,
    values: TValues[]
  ) => Promise<QueryResult<O>>;
};

export class TableName {
  constructor(public readonly value: string) {}
  get name(): string {
    // will "quote" the tablename
    // TODO is this sufficeint to prevent SQL injection?
    return JSON.stringify(this.value);
  }
}

export const customSQL: (
  clientOrFactory: (() => ClientLike) | ClientLike
) => SqlFunction =
  (clientOrFactory) =>
  async <Result extends QueryResultRow>(
    textFragments: TemplateStringsArray,
    ...values: Array<Primitive | Primitive[] | TableName>
  ) => {
    const decorator =
      typeof clientOrFactory === "function"
        ? async (cb: (c: ClientLike) => Promise<QueryResult>) => {
            const client = clientOrFactory();

            await client.connect();
            try {
              const result = await cb(client);

              return result;
            } finally {
              await client.end();
            }
          }
        : (cb: (c: ClientLike) => Promise<QueryResult>) => cb(clientOrFactory);

    const queryFragments: string[] = [];
    const variableIndex = incrementGenerator();
    const valueIterator = arrayIter(values);
    const finalValues: Primitive[] = [];
    textFragments.forEach((segment, i) => {
      queryFragments.push(segment);

      const coorespondingValue = valueIterator.next().value;

      const isLast = i === textFragments.length - 1;
      if (isLast) return;
      if (Array.isArray(coorespondingValue)) {
        const arrayContents = coorespondingValue
          .map(() => `$${variableIndex.next().value}`)
          .join(", ");
        queryFragments.push(`ARRAY[${arrayContents}]`);
        finalValues.push(...coorespondingValue);
        return;
      }
      if (coorespondingValue instanceof TableName) {
        queryFragments.push(coorespondingValue.name);

        return;
      }

      finalValues.push(coorespondingValue as Primitive);
      queryFragments.push(`$${variableIndex.next().value}`);
    });

    const query = queryFragments.join(" ");
    // console.log("query", query, "values", finalValues);
    const result = await decorator(async (client) =>
      client.query<Result, unknown>(query, finalValues)
    );

    return result;
  };
type Primitive = string | number | boolean | undefined | null;
type SqlFunction = <O extends QueryResultRow>(
  strings: TemplateStringsArray,
  ...values: Array<Primitive | Primitive[] | TableName>
) => Promise<QueryResult<O>>;

let sql: SqlFunction = customSQL(createClient);

if (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === "development") {
  const createClient = () =>
    new Client({
      connectionString: process.env.POSTGRES_URL,
    });

  sql = customSQL(createClient);
}

export { sql };
