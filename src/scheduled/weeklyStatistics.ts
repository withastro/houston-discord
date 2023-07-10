import { AwaitMessagesOptions, ForumChannel, Guild, GuildForumTag, Message, MessageCollectorOptions, TextChannel } from "discord.js";
import { Client, Tag } from "../types"
import { getDefaultEmbed } from "../utils/embeds.js";

const getTagName = async (guild: Guild, fullTagList: GuildForumTag[], id: string) =>
{
	const forumTag = fullTagList.find(forumTag => forumTag.id == id);

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

		return `${emoji}${forumTag?.name}`;
	}
}

export default {
	time: "0 0 * * 1",
	async execute(client: Client) {
		const guild = await client.guilds.fetch(process.env.GUILD_ID!);

		const forum: ForumChannel = await guild.channels.fetch(process.env.SUPPORT_CHANNEL!) as ForumChannel;

		const date = new Date();

		date.setMonth(date.getMonth() - 1);

		const threads = (await forum.threads.fetchActive()).threads.filter(x => x.createdAt! > date);

		const channel = await client.channels.fetch(process.env.SUPPORT_SQUAD_CHANNEL!)! as TextChannel;

		const titleEmbed = getDefaultEmbed().setTitle("Weekly support statistics for the last month");

		channel.send({embeds: [titleEmbed]});

		const redirectsEmbed = getDefaultEmbed().setTitle("Support-ai redirects")
		// Support-ai redirects
		{
			let count = 0;

			for(let i = 0; i < threads.size; i++)
			{
				const thread = threads.at(i)!;
				if(thread.members.me)
				{

					const msgs = await thread.messages.fetch();
					msgs.forEach(message => {
						if(message.author.id == client.user!.id)
							count++;
							return;
					})
				}
			}

			redirectsEmbed.setDescription(`I sent <#${process.env.SUPPORT_AI_CHANNEL!}> redirects in ${count}/${threads.size} support threads`);

			channel.send({embeds: [redirectsEmbed]});
		}

		// Tags
		{
			const tags: { [tag: string]: { [subTag: string]: number } } = {};

			threads.forEach(thread => {
				thread.appliedTags.forEach(tag => {
					if(!tags[tag])
					{
						tags[tag] = {};
					}

					thread.appliedTags.forEach(subTag => {
						if(!tags[tag][subTag])
						{
							tags[tag][subTag] = 0;
						}

						tags[tag][subTag]++;
					})
				})
			})

			let description = "";
			let embedCount = 0;

			for(const tagId in tags)
			{
				const tagName = await getTagName(guild, forum.availableTags, tagId);
				let localDescription = `**${tagName}** (${tags[tagId][tagId]})\n`;

				/** Sub tags sorted descending by count, excluding tags that show up just once. */
				const subTags = Object.entries(tags[tagId])
					.sort(([, countA],[, countB]) => countB - countA)
					.filter(([subTagId, count]) => subTagId !== tagId && count > 1);

				if (subTags.length) {
					const subDescriptions = []
					for(const [id, count] of subTags)
					{
						const subTagName = await getTagName(guild, forum.availableTags, id);
						subDescriptions.push(`${subTagName} (${count})`);
					}
					localDescription += `+ ${subDescriptions.join(' / ')}\n`;
				}

				localDescription += "\n";

				if(description.length + localDescription.length > 4096)
				{
					let embed = getDefaultEmbed();

					if(embedCount == 0)
					{
						embed.setTitle("Tags");
					}

					embed.setDescription(description);
					description = "";
					channel.send({embeds: [embed]});
					embedCount += 1;
				}

				description += localDescription;
			}

				let embed = getDefaultEmbed();

				if(embedCount == 0)
				{
					embed.setTitle("Tags");
				}

				embed.setDescription(description);
				channel.send({embeds: [embed]});
		}
	}
}
