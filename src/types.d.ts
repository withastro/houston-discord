import discordjs, { Collection, ContextMenuCommandBuilder, ContextMenuCommandInteraction, Interaction, SlashCommandBuilder } from "discord.js"

declare interface SlashCommand {
	data: SlashCommandBuilder,
	initialize?(): boolean,
	execute(interaction: ChatInputCommandInteraction),
	autocomplete?(interaction: Interaction),
	button?(interaction: Interaction)
}

declare interface ContextMenuCommand {
	data: ContextMenuCommandBuilder,
	execute(interaction: ContextMenuCommandInteraction)
}

declare interface Client extends discordjs.Client {
	slashCommands?: Collection<string, SlashCommand>,
	contextMenuCommands?: Collection<string, ContextMenuCommand>
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
