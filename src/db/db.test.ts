import type { ClientLike } from "./db";
import { TableName, customSQL } from "./db";

const client: ClientLike = {
  async query(query, values) {
    console.log(query, values);
    return {
      rows: [],
      command: "",
      rowCount: 0,
      oid: 1,
      fields: [],
    };
  },
  async connect() {
    return;
  },
  async end() {
    return;
  },
};
let sql = customSQL(client);

sql`INSERT INTO table (item, array) VALUES (${1}, ${["a", "b", "c"]})`;

sql = customSQL(() => client);

sql`INSERT INTO table (item, array) VALUES (${1}, ${["a", "b", "c"]})`;
const tn = new TableName("table");
sql`SELECT * FROM ${tn}`;
sql`INSERT INTO ${tn} (item, array) VALUES (${1}, ${["a", "b", "c"]})`;
