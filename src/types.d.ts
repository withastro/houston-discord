import discordjs, {SlashCommandBuilder} from "discord.js"

declare interface Command {
	data: SlashCommandBuilder,
	execute: Function,
	autocomplete?: Function
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
	[category: string]: SearchHit[];
}

declare interface SearchHit {
	readonly objectID: string;
    readonly _highlightResult?: {} | undefined;
    readonly _snippetResult?: any | undefined;
    readonly _rankingInfo?: RankingInfo | undefined;
    readonly _distinctSeqID?: number | undefined;
	readonly hierarchy: any;
	readonly url: string;
	readonly anchor: string;
	readonly type: "content" | `lvl${number}`;
}