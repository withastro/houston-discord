import type {
	Client,
	EmbedBuilder,
	ForumChannel,
	Guild,
	GuildForumTag,
	TextChannel,
} from "discord.js";
import { getDefaultEmbed } from "../utils/embeds.js";

const getTagName = async (
	guild: Guild,
	fullTagList: GuildForumTag[],
	id: string,
) => {
	const forumTag = fullTagList.find((tag) => tag.id === id);

	let emoji = "";

	if (forumTag) {
		if (forumTag.emoji) {
			if (forumTag.emoji.id) {
				const guildEmoji = await guild.emojis.fetch(forumTag.emoji.id);
				emoji = `<${guildEmoji.animated? "a" : ""}:${guildEmoji.name}:${guildEmoji.id}> `;
			} else {
				emoji = `${forumTag.emoji.name!} `;
			}
		}

		return `${emoji}${forumTag?.name}`;
	}
};

export default {
	time: process.env.STATS_SCHEDULE,
	async execute(client: Client) {
		if (!process.env.GUILD_ID) {
			console.warn(
				"No GUILD_ID enviroment variable was set. Skipping weekly statistics",
			);
			return;
		}

		const guild = await client.guilds.fetch(process.env.GUILD_ID);
		await guild.fetch();

		if (!process.env.SUPPORT_CHANNEL) {
			console.warn(
				"No SUPPORT_CHANNEL enviroment variable was set. Skipping weekly statistics",
			);
			return;
		}

		const forum: ForumChannel = (await guild.channels.fetch(
			process.env.SUPPORT_CHANNEL,
		)) as ForumChannel;

		const lastInterval = new Date();
		lastInterval.setDate(lastInterval.getDate() - 7);

		const _threads = (
			await Promise.all([forum.threads.fetch(), forum.threads.fetchArchived()])
		).map((t) => t.threads.filter((x) => x.createdAt! > lastInterval));
		const threads = [..._threads[0].values(), ..._threads[1].values()];

		// const threads = (await forum.threads.fetch()).threads.filter((x) => x.createdAt! > lastInterval)

		if (!process.env.SUPPORT_SQUAD_CHANNEL) {
			console.warn(
				"No SUPPORT_SQUAD_CHANNEL enviroment variable was set. Skipping weekly statistics",
			);
			return;
		}

		const channel = (await client.channels.fetch(
			process.env.SUPPORT_SQUAD_CHANNEL,
		)!) as TextChannel;

		const titleEmbed = getDefaultEmbed().setTitle("Weekly support statistics");

		const embeds: EmbedBuilder[] = [];
		embeds.push(titleEmbed);

		const unsortedTags: { [tag: string]: { [subTag: string]: number } } = {};
		const newMembers = new Set();
		const errors: [string, string][] = [];
		let postsByNewMembers = 0;
		let linkedToDocs = 0;
		let cumulativeResponse = 0;

		// biome-ignore lint/complexity/noForEach: <explanation>
		for (const thread of threads.values()) {
			try {
				const first = (await thread.messages.fetch()).at(-2);
				const starterMessage = await thread.fetchStarterMessage();
				if (first?.content.includes("https://docs.astro.build")) linkedToDocs++;
				if (first && starterMessage)
					cumulativeResponse +=
						first?.createdTimestamp - starterMessage?.createdTimestamp;

				// check for posts from new members
				const owner = await thread.fetchOwner();

				if(owner)
				{
					console.log(owner.id, owner.guildMember?.joinedAt?.toISOString(), lastInterval.toISOString())
					if (
						owner.guildMember?.joinedAt &&
						owner.guildMember.joinedAt > lastInterval
					) {
						console.log(owner.guildMember.joinedAt.toDateString());
						console.log(lastInterval.toDateString());
						newMembers.add(owner.user?.id);
						postsByNewMembers++;
					}
				} else {
					console.log('NO OWNER')
				}

				thread.appliedTags.forEach((tag) => {
					if (!unsortedTags[tag]) {
						unsortedTags[tag] = {};
					}

					thread.appliedTags.forEach((subTag) => {
						if (!unsortedTags[tag][subTag]) {
							unsortedTags[tag][subTag] = 0;
						}

						unsortedTags[tag][subTag]++;
					});
				});
			} catch (err: any) {
				err = err.toString()
				// 10008: unknown message (e.g. deleted message)
				if (err.includes('10008')) continue
				errors.push([err, thread.id]);
			}
		}

		const openEmbed = getDefaultEmbed();
		openEmbed.setTitle("New posts");
		openEmbed.setDescription(
			`${_threads[0].size} open posts\n${_threads[1].size} closed posts\n${linkedToDocs} (${Math.round(
				(linkedToDocs / threads.length) * 100,
			)}%) include a link to docs in first response\nAverage response time of ${Math.round(
				cumulativeResponse / threads.length / 1000 / 60,
			)} minutes`,
		);
		embeds.push(openEmbed);

		const memberEmbed = getDefaultEmbed();
		memberEmbed.setTitle("Posts from new members");
		memberEmbed.setDescription(
			`${newMembers.size} new members posting in #support\n${Math.round(
				(postsByNewMembers / threads.length) * 100,
			)}% of posts by new members`,
		);
		embeds.push(memberEmbed);

		let description = "";
		let embedCount = 0;

		let tags = Object.fromEntries(
			Object.entries(unsortedTags)
				.sort((a, b) => {
					return unsortedTags[a[0]][a[0]] - unsortedTags[b[0]][b[0]];
				})
				.reverse(),
		);

		for (const tagId in tags) {
			const tagName = await getTagName(guild, forum.availableTags, tagId);
			let localDescription = `**${tagName}** (${tags[tagId][tagId]})\n`;

			/** Sub tags sorted descending by count, excluding tags that show up just once. */
			// const subTags = Object.entries(tags[tagId])
			// 	.sort(([, countA], [, countB]) => countB - countA)
			// 	.filter(([subTagId, count]) => subTagId !== tagId && count > 1);

			// if (subTags.length) {
			// 	const subDescriptions = [];
			// 	for (const [id, count] of subTags) {
			// 		const subTagName = await getTagName(guild, forum.availableTags, id);
			// 		subDescriptions.push(`${subTagName} (${count})`);
			// 	}
			// 	localDescription += `+ ${subDescriptions.join(' / ')}\n`;
			// }

			localDescription += "\n";

			if (description.length + localDescription.length > 4096) {
				let embed = getDefaultEmbed();

				if (embedCount == 0) {
					embed.setTitle("Tags");
				}

				embed.setDescription(description);
				description = "";
				embeds.push(embed);
				embedCount += 1;
			}

			description += localDescription;
		}

		let embed = getDefaultEmbed();

		if (embedCount == 0) {
			embed.setTitle("Tags");
		}

		embed.setDescription(description || "failed");
		embeds.push(embed);

		if (errors.length) {
			const errorEmbed = getDefaultEmbed();
			errorEmbed.setTitle("Errors");
			errorEmbed.setDescription(errors.map(([err, id]) => `<#${id}>: ${err}`).join('\n'));
			embeds.push(errorEmbed)
		}

		for (let i = 0; i < embeds.length; i++) {
			channel.send({ embeds: [embeds[i]] });
		}
	},
};
