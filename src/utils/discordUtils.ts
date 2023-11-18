import { Env } from "..";
import {verifyKey} from "discord-interactions"
import {APIApplicationCommandInteractionDataStringOption, APIBaseInteraction, APIChatInputApplicationCommandInteractionData, ApplicationCommandOptionType, InteractionType} from "discord-api-types/v10"

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

export function getStringOption(data: APIChatInputApplicationCommandInteractionData, name: string)
{
	if(!data.options)
		return undefined;

	let option: APIApplicationCommandInteractionDataStringOption | undefined = data.options.find(option => {
			return option.name == "repo" && option.type == ApplicationCommandOptionType.String
		}) as APIApplicationCommandInteractionDataStringOption | undefined;

	return option;
}
