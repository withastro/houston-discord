import { BaseInteraction, Events } from 'discord.js';
import { Client } from '../types';

export default {
	event: Events.InteractionCreate,
	once: false,
	async execute(interaction: BaseInteraction) {
		if (!interaction.isButton()) return;

		const client: Client = interaction.client;

		const command = client.slashCommands!.get(interaction.customId.split('-')[0]);

		if (!command) {
			console.error(`No command matching ${interaction.customId.split('-')[0]} was found.`);
			return;
		}

		if (!command.button) {
			console.error(`The ${interaction.customId.split('-')[0]} command does not have a button function.`);
			return;
		}

		try {
			await command.button(interaction);
		} catch (error) {
			console.error(error);
		}
	},
};
