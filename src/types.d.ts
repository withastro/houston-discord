import { SlashCommandBuilder, SlashCommandOptionsOnlyBuilder } from "@discordjs/builders"
import { InteractionType } from "discord-api-types/v10"
import { Client as DiscordClient } from "discord.js"
import { Env, JsonResponse } from "."
import { InteractionClient } from "./discordClient"

declare type Client = DiscordClient

declare interface Command {
	data: Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup"> | SlashCommandOptionsOnlyBuilder,
	initialize?(env?: Env): boolean | Promise<boolean>,
	execute(client: InteractionClient<InteractionType.ApplicationCommand>): JsonResponse | any,
	autocomplete?(client: InteractionClient),
	button?(client: InteractionClient)
}

declare interface Event {
	event: string,
	once: boolean,
	execute: Function
}

declare type categories = {
	[category: string]: SearchHit[];
}

declare type Tag = {
	id: string;
	count: number;
}

declare interface Weight {
	pageRank: number,
	level: number,
	position: number
}

declare interface SearchHit {
	readonly objectID: string;
    readonly _highlightResult?: {} | undefined;
    readonly _snippetResult?: any | undefined;
	readonly weight: Weight;
	readonly hierarchy: any;
	readonly url: string;
	readonly anchor: string;
	readonly content?: string;
	readonly type: "content" | `lvl${number}`;
}

declare interface Scheduled {
	time?: string,
	execute: Function
}
