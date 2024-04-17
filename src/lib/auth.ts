import * as jose from "jose";
import { cookies } from "next/headers";
const ALG = "HS256";
export async function issueJWT(playerId: number) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);

  const jwt = await new jose.SignJWT()
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setSubject(playerId.toFixed())
    .setExpirationTime("18h")
    .sign(secret);
  return jwt;
}

export async function verifyJWT(jwt: string) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);

  const { payload } = await jose.jwtVerify<{ sub: string }>(jwt, secret, {
    algorithms: [ALG],
  });
  console.log("payload", payload);
  return payload;
}

export async function auth(): Promise<number | null> {
  const jwt = cookies().get("player-jwt")?.value;
  if (!jwt) {
    return null;
  }
  try {
    const payload = await verifyJWT(jwt);
    const playerId = Number.parseInt(payload.sub);
    return playerId;
  } catch (e) {
    console.error(e);
    return null;
  }
}
