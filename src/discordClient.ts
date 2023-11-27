import { APIChatInputApplicationCommandInteraction, InteractionResponseType } from "discord-api-types/v10";
import { Env } from ".";

class DiscordResponse extends Response {
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

export class DiscordClient {
	env: Env;
	ctx: ExecutionContext;

	constructor(env: Env, ctx: ExecutionContext)
	{
		this.env = env;
		this.ctx = ctx;
	}

}

export class InteractionClient extends DiscordClient {

	interaction: APIChatInputApplicationCommandInteraction;

	constructor(interaction: APIChatInputApplicationCommandInteraction, env: Env, ctx: ExecutionContext) {
		super(env, ctx);
		
		this.interaction = interaction;

	}

	deferReply(promise?: Promise<any>): DiscordResponse {

		if(promise)
		{
			this.ctx.waitUntil(promise);
		}

		return new DiscordResponse({
			type: InteractionResponseType.DeferredChannelMessageWithSource
		});
	}

	reply(data: any): DiscordResponse {

		return new DiscordResponse({
			type: InteractionResponseType.ChannelMessageWithSource,
			data
		})

	}

}
