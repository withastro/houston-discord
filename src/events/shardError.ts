import { ShardEvents } from 'discord.js';

export default {
	event: ShardEvents.Error,
	once: true,
	execute(error: string) {
		console.error(`Shard error: ${error}`);
	},
};
