import { SlashCommandBuilder } from '@discordjs/builders';
import type { Command } from '../types';
import { getDefaultEmbed } from '../utils/embeds.js';

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('contribute')
		.setDescription('Show good first issues and help wanted issues from the Astro repository.'),
	async execute(client) {
		const embed = getDefaultEmbed()
			.setTitle('🚀 Contribute to Astro')
			.setDescription('Help make Astro better! Here are some ways to get started with contributing:')
			.setColor(0xff5d01)
			.setThumbnail('https://astro.build/assets/press/astro-icon-dark.svg')
			.addFields(
				{
					name: '🌱 Good First Issues',
					value: '[Browse all good first issues →](https://github.com/withastro/astro/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)',
				},
				{
					name: '🙋 Help Wanted',
					value: '[Browse all help wanted issues →](https://github.com/withastro/astro/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22)',
				},
				{
					name: '📚 Getting Started',
					value: '• [Contributing Guide](https://github.com/withastro/astro/blob/main/CONTRIBUTING.md)\n• [Development Setup](https://github.com/withastro/astro/blob/main/CONTRIBUTING.md#development)',
				}
			)
			.setFooter({ text: 'Houston, we have a contributor! 🚀' });

		return client.reply({
			embeds: [embed.toJSON()],
			allowed_mentions: { parse: ['roles'] },
		});
	},
};

export default command;
