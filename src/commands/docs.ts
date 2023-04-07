import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, AutocompleteInteraction } from "discord.js";
import algoliasearch from "algoliasearch";
import { categories, SearchHit } from "../types";
import { getDefaultEmbed } from "../utils/embeds.js";

const client = algoliasearch("7AFBU8EPJU", "4440670147c44d744fd8da35ff652518");
const index = client.initIndex("astro");

const replaceTags = (input: string): string => {
	return input.replace("&lt;", '<').replace("&gt;", ">");
}

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

const returnObjectResult = async (interaction: ChatInputCommandInteraction, object: SearchHit) =>
{
	const embed = getDefaultEmbed();

	embed.setTitle(generateNameFromHit(object)).setDescription(`[read more](${object.url})`);

	await interaction.editReply({embeds: [embed]});
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

		if(interaction.channelId != "916064458814681218")
		{
			const embed = getDefaultEmbed().setTitle("This command is still in beta and can therefore not yet be accessed in this channel");
			await interaction.reply({embeds: [embed], ephemeral: true});

			return;
		}

		await interaction.deferReply({ephemeral: interaction.options.getBoolean("hidden") ?? true});

		try {
			const reply: SearchHit = await index.getObject(interaction.options.getString("query")!);
			await returnObjectResult(interaction, reply);
			return;
		}
		catch 
		{
			// reply was 404 because a real query was provided and not an object ID from autocomplete. No action needed.
		}

		const reply = await index.search<SearchHit>(interaction.options.getString("query")!, {
			facetFilters: [["lang:" + (interaction.options.getString('language') ?? "en")]],
			highlightPreTag: "**",
			highlightPostTag: "**",
			hitsPerPage: 20,
			snippetEllipsisText: '…',
			attributesToRetrieve: ["hierarchy.lvl0","hierarchy.lvl1","hierarchy.lvl2","hierarchy.lvl3","hierarchy.lvl4","hierarchy.lvl5","hierarchy.lvl6","content","type","url"],
			attributesToSnippet: ["hierarchy.lvl1:10","hierarchy.lvl2:10","hierarchy.lvl3:10","hierarchy.lvl4:10","hierarchy.lvl5:10","hierarchy.lvl6:10","content:10"]
		})
 
		const items = reply.hits.map(hit => {
			const url = new URL(hit.url);
			if(url.hash == "#overview") url.hash = "";

			return {
				...hit,
				url: url.href
			}
		})

		const categories: categories = {};

		items.forEach(item => {

			if(!categories[item.hierarchy.lvl0])
			{
				categories[item.hierarchy.lvl0] = [];
			}
			categories[item.hierarchy.lvl0].push(item);
		});

		// exclude tutorials
		delete categories["Tutorials"]
		
		const embeds: EmbedBuilder[] = [];

		embeds.push(getDefaultEmbed().setTitle(`Results for "${interaction.options.getString("query")}"`))
		
		for(const category in categories)
		{
			const embed = getDefaultEmbed()
				.setTitle(category);

			let body = ""

			let items: {[heading: string]: SearchHit[]} = {};

			for(let i = 0; i < categories[category].length && i < 5; i++)
			{
				const item = categories[category][i];
				if(!item._snippetResult)
					return;

				if(!items[item.hierarchy[`lvl1`]])
				{
					items[item.hierarchy[`lvl1`]] = [];
				}

				items[item.hierarchy[`lvl1`]].push(item);
			}

			for(const subjectName in items)
			{
				const subject = items[subjectName];

				for(let i = 0; i < subject.length; i++)
				{
					const item = subject[i];

					let hierarchy = "";

					for(let i = 1; i < 7; i++)
					{
						if(item.hierarchy[`lvl${i}`])
						{
							let string = (i != 1)? " > " : "";

							string += item.hierarchy[`lvl${i}`]

							hierarchy += string;
						}
						else
						{
							break;
						}
					}

					let result = "";

					if(item._snippetResult)
					{
						if(item.type == "content")
						{
							result = item._snippetResult.content.value;
						}
						else
						{
							result = item._snippetResult.hierarchy[item.type].value;
						}

						body += `[🔗](${item.url}) **${replaceTags(hierarchy)}**\n`
						body += `[${replaceTags(result.substring(0, 66))}](${item.url})\n`
					}
				}
			}

			embed.setDescription(body)

			embeds.push(embed)
		}

		if(embeds.length == 1)
		{
			embeds[0].setTitle(`No results found for "${interaction.options.getString("query")}"`);
		}

		await interaction.editReply({embeds: embeds});
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