import { SlashCommandBuilder } from '@discordjs/builders';
import { Command } from '../types';
import { getDefaultEmbed } from '../utils/embeds.js';

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('solved')
		.setDescription('Trigger a message to ask users to mark their issue as solved'),
	async execute(client) {
		const embed = getDefaultEmbed()
			.setTitle('If your issue is resolved, please consider doing the following:')
			.setDescription(
				'* From the ellipses (3-dot menu) in the top-right corner of the post (not the first message), edit the tags to include the Solved tag.\n* From the same ellipses, select Close Post.\nYour post will still be available to search and can be re-opened simply by replying in it. Closing a post moves it down with older posts, so we can more easily focus on issues that still need to be resovled.\nThank you for your help!'
			);

		return client.reply({
			embeds: [embed.toJSON()],
		});
	},
};

export default command;
