import { SlashCommandBuilder } from "@discordjs/builders"
import { Env, JsonResponse } from "."
import { APIBaseInteraction, InteractionType } from "discord-api-types/v10"
import { DiscordClient, InteractionClient } from "./discordClient"

declare interface Command {
	data: Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">,
	initialize?(env?: Env): boolean | Promise<boolean>,
	execute(client: InteractionClient): JsonResponse | any,
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
