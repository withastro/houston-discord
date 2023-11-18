import { Env } from "..";
import {verifyKey} from "discord-interactions"
import {APIBaseInteraction, InteractionType} from "discord-api-types/v10"

export async function verifyDiscordRequest(request: Request, env: Env) {
  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');
  const body = await request.text();
  const isValidRequest =
    signature &&
    timestamp &&
    verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY!);
  if (!isValidRequest) {
    return { isValid: false };
  }

  return { interaction: JSON.parse(body) as APIBaseInteraction<InteractionType, any>, isValid: true };
}
