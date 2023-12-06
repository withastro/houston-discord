import { SlashCommandBuilder } from '@discordjs/builders';
import { getDefaultEmbed } from '../utils/embeds.js';
import { Command } from '../types';

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('ask')
		.setDescription('Trigger a message on questions that should be reworded'),
	async execute(client) {

		const embed = getDefaultEmbed()
			.setTitle('Help us help you!')
			.setDescription(
				"Hey, I'm not sure how to answer your question. Here's some basic info that can help you provide the info we need to help you!\n\nhttps://hackmd.io/w9Sdod7HQTWYaZsaAcW44g"
			);

		return client.reply({
			embeds: [embed.toJSON()]
		})
	},
};

export default command;
