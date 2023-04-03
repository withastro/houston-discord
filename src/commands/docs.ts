import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, AutocompleteInteraction, Embed } from "discord.js";
import algoliasearch from "algoliasearch";
import { categories, SearchHit } from "../types";
import { getDefaultEmbed } from "../utils";

const client = algoliasearch("7AFBU8EPJU", "4440670147c44d744fd8da35ff652518");
const index = client.initIndex("astro");

const generateNameFromHit = (hit: SearchHit): string => {
	return reduce(`${hit.hierarchy.lvl0}: ${hit.hierarchy.lvl1}${hit.hierarchy.lvl2? ` - ${hit.hierarchy.lvl2}` : ''} ${(hit.hierarchy.lvl2 && hit.anchor)? `#${hit.anchor}` : ''}`, 100, "...");
}

const reduce = (string: string, limit: number, delimiter: string | null): string =>
{

	if(string.length > limit)
	{
		return string.substring(0, limit - (delimiter? delimiter.length : 0)) + (delimiter? delimiter : "");
	}

	return string;
}

export default {
	data: new SlashCommandBuilder()
		.setName("docs")
		.setDescription("Search the docs")
		.addStringOption(option =>
			option
				.setName("query")
				.setDescription("The query to search for")
				.setRequired(true)
				.setAutocomplete(true))
		.addBooleanOption(option =>
			option.setName("hidden")
			.setDescription("Wether this should only be shown to you. Defaults to true")
			.setRequired(false))
		.addStringOption(option =>
				option.setName('language')
					.setDescription('The doc language to query')
					.setRequired(false)
					.addChoices(
						{ name: 'English', value: 'en' },
						{ name: 'Deutsch', value: 'de' },
						{ name: 'Português do Brasil', value: 'pt-br' },
						{ name: 'Español', value: 'es' },
						{ name: '简体中文', value: 'zh-cn' },
						{ name: '正體中文', value: 'zh-tw' },
						{ name: 'Français', value: 'fr' },
						{ name: 'العربية', value: 'ar' },
						{ name: '日本語', value: 'ja' },
						{ name: '한국어', value: 'ko' },
						{ name: 'Polski', value: 'pl' },
						{ name: 'Русский', value: 'ru' },
					)),
	async execute(interaction: ChatInputCommandInteraction) {

		if(interaction.channelId != "1036711421439901758")
		{
			const embed = getDefaultEmbed().setTitle("This command is still in beta and can therefor not yet be accessed in this channel");
			await interaction.reply({embeds: [embed], ephemeral: true});

			return;
		}

		await interaction.deferReply({ephemeral: interaction.options.getBoolean("hidden") ?? true});

		let reply: SearchHit;

		const embed = getDefaultEmbed();

		try {
			reply = await index.getObject(interaction.options.getString("query")!)
		}
		catch {
			embed.setTitle("No results found").setDescription("No result was found for this query. To search for arbitrary strings, please use `/docsearch`.");
			await interaction.editReply({embeds: [embed]});
			return;
		}

		embed.setTitle(generateNameFromHit(reply)).setDescription(`[read more](${reply.url})`);

		await interaction.editReply({embeds: [embed]});
	},
	async autocomplete(interaction: AutocompleteInteraction)
	{
		const reply = await index.search<SearchHit>(interaction.options.getString("query")!, {
			facetFilters: [["lang:" + (interaction.options.getString('language') ?? "en")]],
			hitsPerPage: 20,
			distinct: true
		})

		const hits = reply.hits;

		await interaction.respond(
			hits.map(hit => {
				return {
					name: generateNameFromHit(hit),
					value: hit.objectID
				}
			})
		)
	}
}