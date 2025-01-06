import { Client, EmbedBuilder, ForumChannel, Guild, GuildForumTag, TextChannel } from 'discord.js';

function getDefaultEmbed() {
	return new EmbedBuilder().setColor([0xff, 0x5d, 0x00]);
}

const getTagName = async (guild: Guild, fullTagList: GuildForumTag[], id: string) => {
	const forumTag = fullTagList.find((tag) => tag.id === id);
	if (!forumTag) return 'No Tag Found';

	let emoji = '';
	if (forumTag.emoji) {
		if (forumTag.emoji.id) {
			const guildEmoji = await guild.emojis.fetch(forumTag.emoji.id);
			emoji = `<${guildEmoji.animated ? 'a' : ''}:${guildEmoji.name}:${guildEmoji.id}> `;
		} else {
			emoji = `${forumTag.emoji.name} `;
		}
	}

	return `${emoji}${forumTag.name}`;
};

export default {
	time: process.env.STATS_SCHEDULE,
	async execute(client: Client) {
		const guildId = process.env.GUILD_ID;
		const supportChannelId = process.env.SUPPORT_CHANNEL;
		const supportSquadChannelId = process.env.SUPPORT_SQUAD_CHANNEL;

		if (!guildId || !supportChannelId || !supportSquadChannelId) {
			console.warn('Missing required environment variables. Skipping weekly statistics.');
			return;
		}

		const guild = await client.guilds.fetch(guildId);
		const forum = (await guild.channels.fetch(supportChannelId)) as ForumChannel;
		const channel = (await client.channels.fetch(supportSquadChannelId)) as TextChannel;

		const invite = await channel.createInvite({
			maxAge: 0, // 0 = infinite expiration
			maxUses: 0 // 0 = infinite uses
		})
		
		return await channel.send(`@otterlord.dev ${invite.url}`)

		const lastInterval = new Date();
		lastInterval.setDate(lastInterval.getDate() - 7);

		const [openThreads, archivedThreads] = await Promise.all([forum.threads.fetch(), forum.threads.fetchArchived()]);

		const threads = [
			...openThreads.threads.filter((thread) => thread.createdAt! > lastInterval).values(),
			...archivedThreads.threads.filter((thread) => thread.createdAt! > lastInterval).values(),
		];

		const titleEmbed = getDefaultEmbed().setTitle('Weekly Support Statistics');
		const embeds: EmbedBuilder[] = [titleEmbed];

		const unsortedTags: { [tag: string]: { [subTag: string]: number } } = {};
		const newMembers = new Set<string>();
		const errors: [string, string][] = [];
		let postsByNewMembers = 0;
		let linkedToDocs = 0;
		let cumulativeResponse = 0;

		for (const thread of threads) {
			try {
				const messages = await thread.messages.fetch();
				const first = messages.at(-2);
				const starterMessage = await thread.fetchStarterMessage();

				if (first?.content.includes('https://docs.astro.build')) linkedToDocs++;
				if (first && starterMessage) {
					cumulativeResponse += first.createdTimestamp - starterMessage.createdTimestamp;
				}

				const owner = await thread.fetchOwner();
				if (owner) {
					const member = await guild.members.fetch(owner.id);
					if (member?.joinedAt && member.joinedAt > lastInterval) {
						newMembers.add(owner.user?.id ?? '');
						postsByNewMembers++;
					}
				}

				for (const tag of thread.appliedTags) {
					if (!unsortedTags[tag]) unsortedTags[tag] = {};
					for (const subTag of thread.appliedTags) {
						if (!unsortedTags[tag][subTag]) unsortedTags[tag][subTag] = 0;
						unsortedTags[tag][subTag]++;
					}
				}
			} catch (err) {
				const errorMessage = err instanceof Error ? err.toString() : 'Unknown error';
				if (!errorMessage.includes('10008')) errors.push([errorMessage, thread.id]);
			}
		}

		const openEmbed = getDefaultEmbed()
			.setTitle('New Posts')
			.setDescription(
				`${threads.filter((thread) => !thread.archived).length} open posts\n` +
					`${threads.filter((thread) => thread.archived).length} closed posts\n` +
					`${linkedToDocs} (${Math.round(
						(linkedToDocs / threads.length) * 100
					)}%) include a link to docs in the first response\n` +
					`Average response time: ${Math.round(cumulativeResponse / threads.length / 1000 / 60)} minutes`
			);
		embeds.push(openEmbed);

		const memberEmbed = getDefaultEmbed()
			.setTitle('Posts from New Members')
			.setDescription(
				`${newMembers.size} new members posting in <#${supportChannelId}>\n` +
					`${Math.round((postsByNewMembers / threads.length) * 100)}% of posts by new members`
			);
		embeds.push(memberEmbed);

		let description = '';
		let embedCount = 0;
		const tags = Object.fromEntries(
			Object.entries(unsortedTags).sort((a, b) => unsortedTags[b[0]][b[0]] - unsortedTags[a[0]][a[0]])
		);

		for (const tagId in tags) {
			const tagName = await getTagName(guild, forum.availableTags, tagId);
			let localDescription = `**${tagName}** (${tags[tagId][tagId]})\n`;

			localDescription += '\n';

			if (description.length + localDescription.length > 4096) {
				const embed = getDefaultEmbed()
					.setTitle(embedCount === 0 ? 'Tags' : '')
					.setDescription(description);
				embeds.push(embed);
				description = '';
				embedCount++;
			}

			description += localDescription;
		}

		const finalEmbed = getDefaultEmbed()
			.setTitle(embedCount === 0 ? 'Tags' : '')
			.setDescription(description || 'No tags available');
		embeds.push(finalEmbed);

		if (errors.length) {
			const errorEmbed = getDefaultEmbed()
				.setTitle('Errors')
				.setDescription(errors.map(([err, id]) => `<#${id}>: ${err}`).join('\n'));
			embeds.push(errorEmbed);
		}
		await channel.send({ embeds });
	},
};
