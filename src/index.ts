import type { ExecutionContext } from '@cloudflare/workers-types';
import {
	APIApplicationCommandAutocompleteInteraction,
	APIApplicationCommandInteractionData,
	APIBaseInteraction,
	APIChatInputApplicationCommandInteraction,
	APIMessageComponentBaseInteractionData,
	APIMessageComponentButtonInteraction,
	InteractionType,
} from 'discord-api-types/v10';
import { InteractionResponseType } from 'discord-interactions';
import { Router } from 'itty-router';
import commandList from './commands/index.js';
import { InteractionClient } from './discordClient.js';
import { verifyDiscordRequest } from './utils/discordUtils.js';

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

	DISCORD_TOKEN: string;
	DISCORD_PUBLIC_KEY: string;
	DISCORD_CLIENT_ID: string;
	GITHUB_TOKEN?: string;
	GUILD_ID?: string;
	SUPPORT_CHANNEL?: string;
	SUPPORT_AI_CHANNEL?: string;
	SUPPORT_PATROL_ID?: string;
	SUPPORT_SQUAD_CHANNEL?: string;
	STATS_SCHEDULE?: string;
	SUPPORT_REDIRECT_SCHEDULE?: string;
	ALGOLIA_INDEX?: string;
	ALGOLIA_APP_ID?: string;
	ALGOLIA_API_KEY?: string;
}

const router = Router();

router.get('/', async () => {
	return new Response('Hello World!');
});

router.post('/', async (request, env: Env, ctx: ExecutionContext) => {
	let interaction: APIBaseInteraction<InteractionType, any> | APIChatInputApplicationCommandInteraction | undefined;
	const discordRequestData = await verifyDiscordRequest(request, env);

	interaction = discordRequestData.interaction;

	if (!discordRequestData.isValid || !interaction) {
		return new Response('Bad request signature.', { status: 401 });
	}

	if (interaction.type == InteractionType.Ping) {
		return new Response(JSON.stringify({ type: InteractionResponseType.PONG }));
	}

	if (interaction.type == InteractionType.ApplicationCommand) {
		interaction = interaction as APIChatInputApplicationCommandInteraction;
		const interactionData: APIApplicationCommandInteractionData = interaction.data;

		const command = commandList[interactionData.name];

		if (command) {
			if (command.initialize) {
				if (!command.initialize(env)) {
					return new Response('Internal error', { status: 500 });
				}
			}

			return await command.execute(new InteractionClient(interaction, env, ctx));
		}

		return new Response('Command not found', { status: 404 });
	}

	if (interaction.type == InteractionType.ApplicationCommandAutocomplete) {
		interaction = interaction as APIApplicationCommandAutocompleteInteraction;
		const interactionData: APIApplicationCommandInteractionData = interaction.data;

		const command = commandList[interactionData.name];

		if (command) {
			if (command.autocomplete) {
				if (command.initialize) {
					if (!command.initialize(env)) {
						return new Response('Internal error', { status: 500 });
					}
				}

				return await command.autocomplete(new InteractionClient(interaction, env, ctx));
			}
		}
		return new Response('Command not found', { status: 404 });
	}

	if (interaction.type == InteractionType.MessageComponent) {
		interaction = interaction as APIMessageComponentButtonInteraction;
		const interactionData: APIMessageComponentBaseInteractionData<any> = interaction.data;

		const command = commandList[interactionData.custom_id.split('-')[0]];

		if (command) {
			if (command.button) {
				if (command.initialize) {
					if (!command.initialize(env)) {
						return new Response('Internal error', { status: 500 });
					}
				}

				return await command.button(new InteractionClient(interaction, env, ctx));
			}
		}
	}

	return new Response('Not found', { status: 404 });
});

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		try {
			const response = await router.handle(request, env, ctx);

			return response ?? new Response('Not found', { status: 404 });
		} catch (error) {
			console.error(error);

			return new Response('Internal Server Error', { status: 500 });
		}
	},
};
