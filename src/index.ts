import commandList from "./commands/index.js";
import { Router } from "itty-router";
import { verifyDiscordRequest } from "./utils/discordUtils.js";
import {InteractionResponseType} from "discord-interactions"
import {APIApplicationCommandAutocompleteInteraction, APIApplicationCommandInteractionData, APIBaseInteraction, APIChatInputApplicationCommandInteraction, APIMessageComponentBaseInteractionData, APIMessageComponentButtonInteraction, InteractionType} from "discord-api-types/v10";
import type {ExecutionContext} from "@cloudflare/workers-types"

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
	//
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	// MY_QUEUE: Queue;

	DISCORD_TOKEN: string,
	DISCORD_PUBLIC_KEY: string,
	DISCORD_CLIENT_ID: string,
	GITHUB_TOKEN?: string,
	GUILD_ID?: string,
	SUPPORT_CHANNEL?: string,
	SUPPORT_AI_CHANNEL?: string,
	SUPPORT_SQUAD_CHANNEL?: string,
	STATS_SCHEDULE?: string,
	SUPPORT_REDIRECT_SCHEDULE?: string,
	ALGOLIA_INDEX?: string,
	ALGOLIA_APP_ID?: string,
	ALGOLIA_API_KEY?: string
}

const router = Router();

router.get("/", async () => {
	return new Response('Hello World!');
})

router.post("/", async (request, env: Env) => {

	let interaction: APIBaseInteraction<InteractionType, any> | APIChatInputApplicationCommandInteraction | undefined;
	const discordRequestData = await verifyDiscordRequest(
		request,
		env
	);

	interaction = discordRequestData.interaction;

	if(!discordRequestData.isValid || !interaction)
	{
		return new Response('Bad request signature.', { status: 401 });
	}

	if(interaction.type == InteractionType.Ping)
	{
		return new Response(JSON.stringify({type: InteractionResponseType.PONG}))
	}

	if(interaction.type == InteractionType.ApplicationCommand)
	{
		interaction = interaction as APIChatInputApplicationCommandInteraction;
		const interactionData: APIApplicationCommandInteractionData = interaction.data;

		const command = commandList[interactionData.name];

		if(command)
		{
			if(command.initialize)
			{
				if(!command.initialize(env))
				{
					return new Response("Internal error", {status: 500});
				}
			}

			return await command.execute(interaction, env);
		}

		return new Response("Command not found", {status: 404});
	}

	if(interaction.type == InteractionType.ApplicationCommandAutocomplete)
	{
		interaction = interaction as APIApplicationCommandAutocompleteInteraction;
		const interactionData: APIApplicationCommandInteractionData = interaction.data;

		const command = commandList[interactionData.name];

		if(command)
		{
			if(command.autocomplete)
			{
				if(command.initialize)
				{
					if(!command.initialize(env))
					{
						return new Response("Internal error", {status: 500});
					}
				}

				return await command.autocomplete(interaction);
			}
		}
		return new Response("Command not found", {status: 404});
	}

	if(interaction.type == InteractionType.MessageComponent)
	{
		interaction = interaction as APIMessageComponentButtonInteraction;
		const interactionData: APIMessageComponentBaseInteractionData<any> = interaction.data;
		
		const command = commandList[interactionData.custom_id.split('-')[0]];

		if(command)
		{
			if(command.button)
			{
				if(command.initialize)
				{
					if(!command.initialize(env))
					{
						return new Response("Internal error", {status: 500});
					}
				}

				return await command.button(interaction, env);
			}
		}
	}

	return new Response("Yet to implement");
})

export default {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		return await router.handle(request, env, ctx);
	},
};
