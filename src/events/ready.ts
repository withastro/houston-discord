import { Client, Events } from 'discord.js';

export default {
	event: Events.ClientReady,
	once: true,
	execute(client: Client) {
		console.log(`Successfully logged in as ${client.user!.tag}`);
	},
};
