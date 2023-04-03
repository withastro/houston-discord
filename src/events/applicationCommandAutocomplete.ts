import { BaseInteraction, Events, InteractionType } from 'discord.js';
import { Client } from '../types';

export default {
	event: Events.InteractionCreate,
	once: false,
	async execute(interaction: BaseInteraction) {
		if(!interaction.isAutocomplete()) return;
	
		const client: Client = interaction.client;

		const command = client.commands!.get(interaction.commandName);

		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

		if(!command.autocomplete)
		{
			console.error(`The ${interaction.commandName} command does not have an autocomplete function.`);
			return;
		}

		try {
			await command.autocomplete(interaction);
		} catch (error) {
			console.error(error);
		}
	},
};