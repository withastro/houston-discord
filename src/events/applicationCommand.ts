import { BaseInteraction, Events } from 'discord.js';
import { Client } from '../types';

export default {
	event: Events.InteractionCreate,
	once: false,
	async execute(interaction: BaseInteraction) {
		if (!interaction.isChatInputCommand()) return;

		const client: Client = interaction.client;

		const command = client.commands!.get(interaction.commandName);

		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(error);
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	},
};
