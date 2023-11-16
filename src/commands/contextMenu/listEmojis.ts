import { ApplicationCommandType, ContextMenuCommandBuilder, ContextMenuCommandInteraction, EmbedBuilder, Emoji, Guild } from "discord.js";
import { getDefaultEmbed } from "../../utils/embeds.js";

const getEmojiString = async (guild: Guild, emojiData: Emoji) => {

	let emoji = '';

	if (emojiData.id) {
		const guildEmoji = await guild.emojis.fetch(emojiData.id);
		emoji = `<:${guildEmoji.name}:${guildEmoji.id}> `;
	} else {
		emoji = `${emojiData.name} `;
	}

	return `${emoji}`;
};

export default {
	data: new ContextMenuCommandBuilder()
				.setName("List emoji reactions")
				.setType(ApplicationCommandType.Message),
	async execute(interaction: ContextMenuCommandInteraction)
	{		
		if(!interaction.isMessageContextMenuCommand()) return;
		
		await interaction.deferReply({ephemeral: true});

		const message = await interaction.channel!.messages.fetch(interaction.targetId);

		let reactionCount = 0;

		let embeds: EmbedBuilder[] = [];
		let content = "";

		for(let i = 0; i < message.reactions.cache.size; i++)
		{
			let reaction = message.reactions.cache.at(i)!;

			reactionCount += reaction.count;

			let list = `${await getEmojiString(interaction.guild!, reaction.emoji)}\n`;

			let users = await reaction.users.fetch();

			users.forEach(user =>
				{
					let name = `${user.displayName}\n`;

					if((list.length + content.length + name.length) >= 1024)
					{
						embeds.push(getDefaultEmbed().setDescription(content))

						content = list;
						list = "";
					}

					list += name;

					
				})

			content += list;
		}

		embeds.push(getDefaultEmbed().setDescription(content));

		if(reactionCount == 0)
		{
			interaction.editReply({content: "The supplied message does not have any reactions"})
			return;
		}

		interaction.editReply({embeds})

	}
}
