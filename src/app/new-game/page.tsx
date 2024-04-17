import { CreateGameForm } from "@/components/create-game";
import { auth } from "@/lib/auth";

export default async function Page() {
  const playerId = await auth();
  return (
    <main>
      <CreateGameForm alreadyInGame={playerId != null} />
    </main>
  );
}
