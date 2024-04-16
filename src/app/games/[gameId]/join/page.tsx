import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Page({
  params,
  searchParams: { t },
}: {
  params: { gameId: string };
  searchParams: { t: string };
}) {
  cookies().set({
    name: "name",
    value: "lee",
    httpOnly: true,
    path: "/",
  });

  redirect(`/games/${params.gameId}?${new URLSearchParams({ t })}`);
}
