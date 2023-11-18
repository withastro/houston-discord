//import commandList from "./commands";
import { Router } from "itty-router";
import { verifyDiscordRequest } from "./utils/discordUtils";
import {InteractionResponseType} from "discord-interactions"
import {InteractionType} from "discord-api-types/v10";

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

	DISCORD_PUBLIC_KEY: string
}

class JsonResponse extends Response {
  constructor(body?: any, init?: ResponseInit) {
    const jsonBody = JSON.stringify(body);
    init = init || {
      headers: {
        'content-type': 'application/json;charset=UTF-8',
      },
    };
    super(jsonBody, init);
  }
}

const router = Router();

router.get("/", async () => {
	return new Response('Hello World!');
})

router.post("/", async (request, env: Env) => {

	const { isValid, interaction } = await verifyDiscordRequest(
		request,
		env
	);

	if(!isValid || !interaction)
	{
		return new Response('Bad request signature.', { status: 401 });
	}

	if(interaction.type == InteractionType.Ping)
	{
		return new JsonResponse({
      type: InteractionResponseType.PONG,
    });
	}

	if(interaction.type == InteractionType.ApplicationCommand)
	{
		// handle command
	}

	if(interaction.type == InteractionType.ApplicationCommandAutocomplete)
	{
		// handle command autocomplete
	}

	return new Response("Yet to implement");
})

export default {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		return await router.handle(request, env, ctx);
	},
};
