import { ForumChannel } from 'discord.js';
import { Client } from '../types';
import { getDefaultEmbed } from '../utils/embeds.js';

const titles = ['Quiet in here?', 'No-one around right now?', 'Still waiting for an answer?'];

export default {
	time: process.env.SUPPORT_REDIRECT_SCHEDULE,
	async execute(client: Client) {
		const guild = await client.guilds.fetch(process.env.GUILD_ID!);

		const forum: ForumChannel = (await guild.channels.fetch(process.env.SUPPORT_CHANNEL!)) as ForumChannel;

		const threads = (await forum.threads.fetchActive()).threads.filter((x) => {
			const timestamp = x.createdTimestamp!;

			const date = new Date(timestamp);

			const currentTime = new Date();

			const timeDiff = currentTime.getTime() - date.getTime();
			return timeDiff >= 3600000 && timeDiff < 86400000 && x.totalMessageSent == 0;
		});

		threads.forEach((thread) => {
			if (thread.totalMessageSent == 0) {
				const embed = getDefaultEmbed()
					.setTitle(titles[Math.floor(Math.random() * titles.length)])
					.setDescription(
						`It looks like no-one has responded to your question yet. People might not be available right now or don’t know how to answer your question. Want an answer while you wait? Try asking our experimental bot in <#${process
							.env.SUPPORT_AI_CHANNEL!}>.`
					);

				thread.send({ embeds: [embed] });
			}
		});
	},
};
