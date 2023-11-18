import { SlashCommandBuilder } from '@discordjs/builders';
import { APIChatInputApplicationCommandInteraction, InteractionResponseType, Routes } from 'discord-api-types/v10';
import { getDefaultEmbed } from '../utils/embeds.js';
import { Env } from '../index.js';
import { REST } from '@discordjs/rest';
import { Command } from '../types';

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('ask')
		.setDescription('Trigger a message on questions that should be reworded'),
	async execute(interaction: APIChatInputApplicationCommandInteraction, env: Env) {

		const embed = getDefaultEmbed()
			.setTitle('Help us help you!')
			.setDescription(
				"Hey, I'm not sure how to answer your question. Here's some basic info that can help you provide the info we need to help you!\n\nhttps://hackmd.io/w9Sdod7HQTWYaZsaAcW44g"
			);

		const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);

		await rest.post(Routes.interactionCallback(interaction.id, interaction.token), {
			body: {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					embeds: [embed.toJSON()]
				}
			}
		})

		return new Response()
	},
};

export default command;
