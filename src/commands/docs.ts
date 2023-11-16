import algoliasearch, { SearchClient, SearchIndex } from 'algoliasearch';
import { AutocompleteInteraction, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { decode } from 'html-entities';
import { categories, SearchHit } from '../types';
import { getDefaultEmbed } from '../utils/embeds.js';

let client: SearchClient;
let index: SearchIndex;

const generateNameFromHit = (hit: SearchHit): string => {
	return decode(
		reduce(
			`${hit.hierarchy.lvl0}: ${hit.hierarchy.lvl1}${hit.hierarchy.lvl2 ? ` - ${hit.hierarchy.lvl2}` : ''} ${
				hit.hierarchy.lvl2 && hit.anchor ? `#${hit.anchor}` : ''
			}`,
			100,
			'...'
		)
	);
};

const reduce = (string: string, limit: number, delimiter: string | null): string => {
	if (string.length > limit) {
		return string.substring(0, limit - (delimiter ? delimiter.length : 0)) + (delimiter ? delimiter : '');
	}

	return string;
};

const returnObjectResult = async (interaction: ChatInputCommandInteraction, object: SearchHit) => {
	const embed = getDefaultEmbed();

	embed.setTitle(decode(generateNameFromHit(object)));

	let description = '';

	const facetFilters: string[][] = [['lang:' + (interaction.options.getString('language') ?? 'en')], ['type:content']];

	let highest = 0;

	for (let i = 0; i <= 6; i++) {
		if (!object.hierarchy[`lvl${i}`]) break;

		highest = i;

		facetFilters.push([`hierarchy.lvl${i}:${decode(object.hierarchy[`lvl${i}`])}`]);
	}

	const hits = (
		await index.search<SearchHit>('', {
			facetFilters: facetFilters,
			attributesToRetrieve: [
				'hierarchy.lvl0',
				'hierarchy.lvl1',
				'hierarchy.lvl2',
				'hierarchy.lvl3',
				'hierarchy.lvl4',
				'hierarchy.lvl5',
				'hierarchy.lvl6',
				'content',
				'type',
				'url',
				'weight',
			],
			distinct: false,
		})
	).hits.filter((hit) => !hit.hierarchy[`lvl${highest + 1}`]);

	for (let i = 0; i < hits.length; i++) {
		if (object.hierarchy[`lvl${i}`] == '') continue;
		description += decode(hits[i].content) + '\n';
	}

	description += `\n[read more](${object.url})`;

	embed.setDescription(description);

	await interaction.editReply({ embeds: [embed] });
};

export default {
	data: new SlashCommandBuilder()
		.setName('docs')
		.setDescription('Search the docs')
		.addStringOption((option) =>
			option.setName('query').setDescription('The query to search for').setRequired(true).setAutocomplete(true)
		)
		.addBooleanOption((option) =>
			option
				.setName('hidden')
				.setDescription('Wether this should only be shown to you. Defaults to true')
				.setRequired(false)
		)
		.addStringOption((option) =>
			option
				.setName('language')
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
					{ name: 'Русский', value: 'ru' }
				)
		),
	initialize() {
		if (!process.env.ALGOLIA_APP_ID || !process.env.ALGOLIA_API_KEY || !process.env.ALGOLIA_INDEX) {
			console.warn('Failed to initialize the /docs command: missing algolia enviroment variables.');
			return false;
		}

		client = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY);
		client.initIndex(process.env.ALGOLIA_INDEX);

		return true;
	},
	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: interaction.options.getBoolean('hidden') ?? true });

		if (interaction.options.getString('query')!.startsWith('auto-')) {
			const reply: SearchHit = await index.getObject(interaction.options.getString('query')!.substring(5));
			await returnObjectResult(interaction, reply);
			return;
		}

		let query = interaction.options.getString('query')!;

		if (query.startsWith('user-')) {
			query = query.substring(5);
		}

		const reply = await index.search<SearchHit>(query, {
			facetFilters: [['lang:' + (interaction.options.getString('language') ?? 'en')]],
			highlightPreTag: '**',
			highlightPostTag: '**',
			hitsPerPage: 20,
			snippetEllipsisText: '…',
			attributesToRetrieve: [
				'hierarchy.lvl0',
				'hierarchy.lvl1',
				'hierarchy.lvl2',
				'hierarchy.lvl3',
				'hierarchy.lvl4',
				'hierarchy.lvl5',
				'hierarchy.lvl6',
				'content',
				'type',
				'url',
			],
			attributesToSnippet: [
				'hierarchy.lvl1:10',
				'hierarchy.lvl2:10',
				'hierarchy.lvl3:10',
				'hierarchy.lvl4:10',
				'hierarchy.lvl5:10',
				'hierarchy.lvl6:10',
				'content:10',
			],
		});

		const items = reply.hits.map((hit) => {
			const url = new URL(hit.url);
			if (url.hash == '#overview') url.hash = '';

			return {
				...hit,
				url: url.href,
			};
		});

		const categories: categories = {};

		items.forEach((item) => {
			if (!categories[item.hierarchy.lvl0]) {
				categories[item.hierarchy.lvl0] = [];
			}
			categories[item.hierarchy.lvl0].push(item);
		});

		// exclude tutorials
		delete categories['Tutorials'];

		const embeds: EmbedBuilder[] = [];

		embeds.push(getDefaultEmbed().setTitle(`Results for "${query}"`));

		for (const category in categories) {
			const embed = getDefaultEmbed().setTitle(decode(category));

			let body = '';

			let items: { [heading: string]: SearchHit[] } = {};

			for (let i = 0; i < categories[category].length && i < 5; i++) {
				const item = categories[category][i];
				if (!item._snippetResult) return;

				if (!items[item.hierarchy[`lvl1`]]) {
					items[item.hierarchy[`lvl1`]] = [];
				}

				items[item.hierarchy[`lvl1`]].push(item);
			}

			for (const subjectName in items) {
				const subject = items[subjectName];

				for (let i = 0; i < subject.length; i++) {
					const item = subject[i];

					let hierarchy = '';

					for (let i = 1; i < 7; i++) {
						if (item.hierarchy[`lvl${i}`]) {
							let string = i != 1 ? ' > ' : '';

							string += item.hierarchy[`lvl${i}`];

							hierarchy += string;
						} else {
							break;
						}
					}

					let result = '';

					if (item._snippetResult) {
						if (item.type == 'content') {
							result = item._snippetResult.content.value;
						} else {
							result = item._snippetResult.hierarchy[item.type].value;
						}

						body += decode(`[🔗](${item.url}) **${hierarchy}**\n`);
						body += decode(`[${result.substring(0, 66)}](${item.url})\n`);
					}
				}
			}

			embed.setDescription(body);

			embeds.push(embed);
		}

		if (embeds.length == 1) {
			embeds[0].setTitle(`No results found for "${query}"`);
		}

		await interaction.editReply({ embeds: embeds });
	},
	async autocomplete(interaction: AutocompleteInteraction) {
		const reply = await index.search<SearchHit>(interaction.options.getString('query')!, {
			facetFilters: [['lang:' + (interaction.options.getString('language') ?? 'en')]],
			hitsPerPage: 20,
			distinct: true,
		});

		const hits = reply.hits.map((hit) => {
			return {
				name: generateNameFromHit(hit),
				value: `auto-${hit.objectID}`,
			};
		});

		if (interaction.options.getString('query')!.trim() != '') {
			hits.unshift({
				name: `"${interaction.options.getString('query')!}"`,
				value: `user-${interaction.options.getString('query')!}`,
			});
		}

		await interaction.respond(hits);
	},
};
