import type { QueryResult, QueryResultRow } from "pg";
import { Client } from "pg";
import { createClient } from "@vercel/postgres";
import knex from "knex";
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
  async (textFragments, ...values) => {
    const decorator =
      typeof clientOrFactory === "function"
        ? async (cb: (c: ClientLike) => Promise<QueryResult>) => {
            const client = clientOrFactory();

            await client.connect();

            const result = await cb(client);

            await client.end();

            return result;
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
    console.log("query", query, "values", finalValues);
    const result = await decorator(async (client) =>
      client.query(query, finalValues)
    );

    return result;
  };
type Primitive = string | number | boolean | undefined | null;
type SqlFunction = <O extends QueryResultRow>(
  strings: TemplateStringsArray,
  ...values: Array<Primitive | Primitive[] | TableName>
) => Promise<QueryResult<O>>;

let sql: SqlFunction = customSQL(createClient);

declare const global: { __postgresSqlClient?: Client };

if (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === "development") {
  if (!global.__postgresSqlClient) {
    const client = new Client({
      connectionString: process.env.POSTGRES_URL,
    });
    client.connect();
    global.__postgresSqlClient = client;
  }
  const client = global.__postgresSqlClient;

  sql = customSQL(client);
}

// const db = knex({
//   client: "pg",
//   connection: process.env.POSTGRES_URL,
// });
declare module "knex/types/tables" {
  interface Tables {
    rounds: {
      game_id: string;
      prompt_id: number;
      user_1_id: string;
      user_2_id: string;
      user_1_submission_id: string;
      user_2_submission_id: string;
    };
    game_players: {
      game_id: string;
      player_id: string;
      joined_at: Date;
    };
    prompts: {
      id: number;
      content: string;
    };
  }
}

export { sql };
