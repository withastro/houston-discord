import { ForumChannel, TextChannel } from "discord.js";
import { Client, Tags } from "../types"
import { getDefaultEmbed } from "../utils/embeds.js";

const GUILD_ID = "830184174198718474";
const FORUM_ID = "1019713903481081876";
const OUTPUT_ID = "916064458814681218";

export default {
	time: "0 0 * * 1",
	async execute(client: Client) {
		const guild = await client.guilds.fetch(GUILD_ID);

		const forum: ForumChannel = await guild.channels.fetch(FORUM_ID) as ForumChannel;

		const date = new Date();

		date.setMonth(date.getMonth() - 1);

		const threads = (await forum.threads.fetchActive()).threads.filter(x => x.createdAt! > date);

		let tags: Tags = {};

		threads.forEach(thread => {
			thread.appliedTags.forEach(tag => {
				if(!tags[tag])
				{
					tags[tag] = 0;
				}

				tags[tag] += 1;
			})
		})

		const embed = getDefaultEmbed().setTitle("Weekly tags report for the last 30 days");

		let description = "";

		for(const tag in tags)
		{
			const forumTag = forum.availableTags.find(forumTag => forumTag.id == tag);

			let emoji = "";

			if(forumTag)
			{
				if(forumTag.emoji)
				{
					if(forumTag.emoji.id)
					{
						const guildEmoji = await guild.emojis.fetch(forumTag.emoji.id)
						emoji = `<:${guildEmoji.name}:${guildEmoji.id}> `;
					}
					else {
						emoji = `${forumTag.emoji.name!} `;
					}
				}

				description += `${emoji}${forumTag?.name}: ${tags[tag]}\n`
			}
		}

		embed.setDescription(description);

		const channel = await client.channels.fetch(OUTPUT_ID)! as TextChannel;

		channel.send({embeds: [embed]});
	}
}