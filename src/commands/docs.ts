import { createFetchRequester } from '@algolia/requester-fetch';
import { EmbedBuilder, SlashCommandBuilder } from '@discordjs/builders';
import { REST } from '@discordjs/rest';
import { algoliasearch, SearchClient } from 'algoliasearch';
import { APIChatInputApplicationCommandInteraction, InteractionResponseType, Routes } from 'discord-api-types/v10';
import { decode } from 'html-entities';
import { Env } from '..';
import { categories, Command, SearchHit } from '../types';
import { getBooleanOption, getStringOption } from '../utils/discordUtils.js';
import { getDefaultEmbed } from '../utils/embeds.js';

let searchClient: SearchClient;
let index: any;
let rest: REST;

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

const returnObjectResult = async (
	interaction: APIChatInputApplicationCommandInteraction,
	object: SearchHit,
	env: Env
) => {
	const embed = getDefaultEmbed();

	embed.setTitle(decode(generateNameFromHit(object)));

	let description = '';

	const facetFilters: string[][] = [
		['lang:' + (getStringOption(interaction.data, 'language') ?? 'en')],
		['type:content'],
	];

	let highest = 0;

	for (let i = 0; i <= 6; i++) {
		if (!object.hierarchy[`lvl${i}`]) break;

		highest = i;

		facetFilters.push([`hierarchy.lvl${i}:${decode(object.hierarchy[`lvl${i}`])}`]);
	}

	const searchResult = await index.searchSingleIndex({
		indexName: env.ALGOLIA_INDEX!,
		searchParams: {
			query: '',
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
		},
	});
	const hits = searchResult.hits.filter((hit: any) => !hit.hierarchy[`lvl${highest + 1}`]);

	for (let i = 0; i < hits.length; i++) {
		if (object.hierarchy[`lvl${i}`] == '') continue;
		description += decode(hits[i].content) + '\n';
	}

	description += `\n[read more](${object.url})`;

	embed.setDescription(description);

	await rest.patch(Routes.webhookMessage(env.DISCORD_CLIENT_ID, interaction.token, '@original'), {
		body: {
			type: InteractionResponseType.UpdateMessage,
			embeds: [embed.toJSON()],
		},
	});
};

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('docs')
		.setDescription('Search the docs')
		.addStringOption((option) =>
			option.setName('query').setDescription('The query to search for').setRequired(true).setAutocomplete(true)
		)
		.addBooleanOption((option) =>
			option
				.setName('hidden')
				.setDescription('Whether this should only be shown to you. Defaults to true')
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
	initialize(env: Env) {
		if (!env.ALGOLIA_APP_ID || !env.ALGOLIA_API_KEY || !env.ALGOLIA_INDEX) {
			console.warn('Failed to initialize the /docs command: missing algolia enviroment variables.');
			return false;
		}

		searchClient = algoliasearch(env.ALGOLIA_APP_ID, env.ALGOLIA_API_KEY, {
			requester: createFetchRequester(),
		});
		index = searchClient;
		rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);

		return true;
	},
	async execute(client) {
		return client.deferReply({ hidden: getBooleanOption(client.interaction.data, 'hidden') ?? true }, async () => {
			let query = getStringOption(client.interaction.data, 'query')!;

			if (query.startsWith('auto-')) {
				const reply: SearchHit = await index.getObject({
					indexName: client.env.ALGOLIA_INDEX!,
					objectID: query.substring(5),
				});
				await returnObjectResult(client.interaction, reply, client.env);
				return;
			}

			if (query.startsWith('user-')) {
				query = query.substring(5);
			}

			const reply = await index.searchSingleIndex({
				indexName: client.env.ALGOLIA_INDEX!,
				searchParams: {
					query: query,
					facetFilters: [['lang:' + (getStringOption(client.interaction.data, 'language') ?? 'en')]],
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
				},
			});

			const items = reply.hits.map((hit: any) => {
				const url = new URL(hit.url);
				if (url.hash == '#overview') url.hash = '';

				return {
					...hit,
					url: url.href,
				};
			});

			const resultCategories: categories = {};

			items.forEach((item: any) => {
				if (!resultCategories[item.hierarchy.lvl0]) {
					resultCategories[item.hierarchy.lvl0] = [];
				}
				resultCategories[item.hierarchy.lvl0].push(item);
			});

			// exclude tutorials
			delete resultCategories['Tutorials'];

			const embeds: EmbedBuilder[] = [];

			console.log(embeds);

			embeds.push(getDefaultEmbed().setTitle(`Results for "${query}"`));

			for (const category in resultCategories) {
				const embed = getDefaultEmbed().setTitle(decode(category));

				let body = '';

				let categoryItems: { [heading: string]: SearchHit[] } = {};

				for (let i = 0; i < resultCategories[category].length && i < 5; i++) {
					const item = resultCategories[category][i];
					if (!item._snippetResult) return;

					if (!categoryItems[item.hierarchy[`lvl1`]]) {
						categoryItems[item.hierarchy[`lvl1`]] = [];
					}

					categoryItems[item.hierarchy[`lvl1`]].push(item);
				}

				for (const subjectName in categoryItems) {
					const subject = categoryItems[subjectName];

					for (let i = 0; i < subject.length; i++) {
						const item = subject[i];

						let hierarchy = '';

						for (let j = 1; j < 7; j++) {
							if (item.hierarchy[`lvl${j}`]) {
								let string = j != 1 ? ' > ' : '';

								string += item.hierarchy[`lvl${j}`];

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

			await rest.patch(Routes.webhookMessage(client.env.DISCORD_CLIENT_ID, client.interaction.token, '@original'), {
				body: {
					type: InteractionResponseType.UpdateMessage,
					embeds: embeds.map((embed) => embed.toJSON()),
				},
			});
			return true;
		});
	},
	async autocomplete(client) {
		const query = getStringOption(client.interaction.data, 'query')!;

		const reply = await index.searchSingleIndex({
			indexName: client.env.ALGOLIA_INDEX!,
			searchParams: {
				query: query,
				facetFilters: [['lang:' + (getStringOption(client.interaction.data, 'language') ?? 'en')]],
				hitsPerPage: 20,
				distinct: true,
			},
		});

		const hits = reply.hits.map((hit: any) => {
			return {
				name: generateNameFromHit(hit),
				value: `auto-${hit.objectID}`,
			};
		});

		if (query.trim() != '') {
			hits.unshift({
				name: `"${query}"`,
				value: `user-${query}`,
			});
		}

		return client.autocomplete(hits);
	},
};

export default command;
