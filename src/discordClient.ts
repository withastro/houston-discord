import { APIChatInputApplicationCommandInteraction, InteractionResponseType, APIBaseInteraction, InteractionType } from "discord-api-types/v10";
import { Env } from ".";
import { InteractionResponseFlags } from "discord-interactions";

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

	constructor(env: Env, ctx: ExecutionContext) {
		this.env = env;
		this.ctx = ctx;
	}

}

export class InteractionClient<Type extends InteractionType, DataType> extends DiscordClient {

	interaction: APIBaseInteraction<Type, DataType>;

	constructor(interaction: APIBaseInteraction<Type, any>, env: Env, ctx: ExecutionContext) {
		super(env, ctx);

		this.interaction = interaction;

	}

	deferReply(promise: Promise<any>, empheral?: boolean): DiscordResponse {

		this.ctx.waitUntil(promise);

		return new DiscordResponse({
			type: InteractionResponseType.DeferredChannelMessageWithSource,
			data: {
				flags: (empheral)? InteractionResponseFlags.EPHEMERAL : 0
			}
		});
	}

	deferUpdate(promise?: Promise<any>): DiscordResponse {
		if (promise) {
			this.ctx.waitUntil(promise);
		}

		return new DiscordResponse({
			type: InteractionResponseType.DeferredMessageUpdate
		});
	}

	reply(data: any): DiscordResponse {

		return new DiscordResponse({
			type: InteractionResponseType.ChannelMessageWithSource,
			data
		})
	}

	autocomplete(choices: any): DiscordResponse {
		return new DiscordResponse({
			type: InteractionResponseType.ApplicationCommandAutocompleteResult,
			data: {
				choices
			},
		})
	}

}
