import { SlashCommandBuilder } from '@discordjs/builders';
import { APIChatInputApplicationCommandInteraction, InteractionResponseType, Routes } from 'discord-api-types/v10';
import { getDefaultEmbed } from '../utils/embeds.js';
import { Env, JsonResponse } from '../index.js';
import { REST } from '@discordjs/rest';
import { Command } from '../types.js';

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('ask')
		.setDescription('Trigger a message on questions that should be reworded'),
	async execute(interaction: APIChatInputApplicationCommandInteraction, env: Env) {

		const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);

		const embed = getDefaultEmbed()
			.setTitle('Help us help you!')
			.setDescription(
				"Hey, I'm not sure how to answer your question. Here's some basic info that can help you provide the info we need to help you!\n\nhttps://hackmd.io/w9Sdod7HQTWYaZsaAcW44g"
			);

		return new JsonResponse({type: InteractionResponseType.ChannelMessageWithSource, data:{
			embeds: [embed.toJSON()]
		}})

		//interaction.reply({ embeds: [embed], ephemeral: false });
	},
};

export default command;
