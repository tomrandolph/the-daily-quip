import { redirect } from "next/navigation";
import * as uuid from "uuid";
import * as crypto from "crypto";
import { sql } from "@/db/db";
import { createGame } from "@/actions/game";
import { CreateGameForm } from "@/components/create-game";

export default async function Page() {
  return (
    <main>
      <CreateGameForm />
    </main>
  );
}
