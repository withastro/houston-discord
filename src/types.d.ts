import discordjs, {SlashCommandBuilder} from "discord.js"

declare interface Command {
	data: SlashCommandBuilder,
	execute: Function
}

declare interface Client extends discordjs.Client {
	commands?: Collection<string, Command>
}

declare interface Event {
	event: string,
	once: boolean,
	execute: Function
}

declare type categories = {
	[key: string]: any;
}

declare interface SearchHit {
	readonly objectID: string;
    readonly _highlightResult?: {} | undefined;
    readonly _snippetResult?: {} | undefined;
    readonly _rankingInfo?: RankingInfo | undefined;
    readonly _distinctSeqID?: number | undefined;
	readonly url: string;
}