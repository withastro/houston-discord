import { BaseInteraction, Events } from 'discord.js';
import { Client } from '../types';

export default {
	event: Events.InteractionCreate,
	once: false,
	async execute(interaction: BaseInteraction) {
		if (!interaction.isContextMenuCommand()) return;

		const client: Client = interaction.client;

		const command = client.contextMenuCommands!.get(interaction.commandName);

		if (!command) {
			console.error(`No context menu command matching ${interaction.commandName} was found.`);
			return;
		}

		try {
			if(interaction.commandType != command.data.type)
			{
				console.warn(`Recieved context menu command ${interaction.commandName} of the wrong type!`)
				await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
				return;
			}
			await command.execute(interaction);
		} catch (error) {
			console.error(error);
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	},
};
