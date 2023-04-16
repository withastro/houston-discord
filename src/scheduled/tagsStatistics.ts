import { ForumChannel, TextChannel } from "discord.js";
import { Client, Tag } from "../types"
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

		let tags: Tag[] = [];

		threads.forEach(thread => {
			thread.appliedTags.forEach(tag => {
				if(tags.filter(stag => stag.id == tag).length == 0)
				{
					tags.push({id: tag, count: 0})
				}

				tags[tags.findIndex(stag => stag.id == tag)].count++;
			})
		})

		tags.sort((a, b) => b.count - a.count);
		console.log(tags);

		const embed = getDefaultEmbed().setTitle("Weekly tags report for the last 30 days");

		let description = "";

		for(let i = 0; i < tags.length; i++)
		{
			const tag = tags[i];
			const forumTag = forum.availableTags.find(forumTag => forumTag.id == tag.id);

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

				description += `${emoji}${forumTag?.name}: ${tags[i].count}\n`
			}
		}

		embed.setDescription(description);

		const channel = await client.channels.fetch(OUTPUT_ID)! as TextChannel;

		channel.send({embeds: [embed]});
	}
}