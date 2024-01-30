import { ActionRowBuilder, ButtonBuilder, SlashCommandBuilder } from '@discordjs/builders';
import { REST } from '@discordjs/rest';
import { RequestError } from '@octokit/request-error';
import { Octokit } from '@octokit/rest';
import {
	APIButtonComponent,
	APIButtonComponentWithURL,
	APIChatInputApplicationCommandInteraction,
	APIGuild,
	APIMessageComponentButtonInteraction,
	APIMessageComponentEmoji,
	ButtonStyle,
	InteractionResponseType,
	InteractionType,
	Routes,
} from 'discord-api-types/v10';
import { Env } from '../index.js';
import { Command } from '../types.js';
import { getStringOption } from '../utils/discordUtils.js';
import { getDefaultEmbed } from '../utils/embeds.js';

let rest: REST;

type InteractionReplyOptions = {};

async function ReplyOrEditReply(
	interaction: APIChatInputApplicationCommandInteraction | APIMessageComponentButtonInteraction,
	replyOptions: InteractionReplyOptions,
	env: Env
) {
	if (interaction.type == InteractionType.ApplicationCommand) {
		await rest.patch(Routes.webhookMessage(env.DISCORD_CLIENT_ID, interaction.token), {
			body: {
				...replyOptions,
			},
		});

		setTimeout(async () => {
			await rest.delete(Routes.webhookMessage(env.DISCORD_CLIENT_ID, interaction.token));
		}, 5000);
	} else {
		await rest.post(Routes.interactionCallback(interaction.id, interaction.token), {
			body: {
				type: InteractionResponseType.ChannelMessageWithSource,
				...replyOptions,
			},
		});
	}
}

async function TryParseURL(
	url: string,
	interaction: APIChatInputApplicationCommandInteraction | APIMessageComponentButtonInteraction,
	env: Env
) {
	try {
		return new URL(url.trim());
	} catch (exception) {
		if (exception instanceof TypeError) {
			await ReplyOrEditReply(interaction, { content: `The following URL is invalid: ${url}` }, env);
			return null;
		}
		await ReplyOrEditReply(interaction, { content: "Something went wrong while parsing your URL's" }, env);
		return null;
	}
}

async function TryGetEmojiFromURL(
	url: URL,
	interaction: APIChatInputApplicationCommandInteraction | APIMessageComponentButtonInteraction,
	env: Env
): Promise<APIMessageComponentEmoji> {
	try {
		let apexDomain = url.hostname.split('.').at(-2);

		let guild = (await rest.get(Routes.guild(env.GUILD_ID!))) as APIGuild;

		let emoji = guild.emojis.find((emoji) => emoji.name == apexDomain);

		if (emoji) {
			return { name: emoji.name!, id: emoji.id!, animated: emoji.animated! };
		}
	} catch {}

	return { name: '❓', animated: false, id: undefined };
}

function GetStringFromEmoji(emoji: APIMessageComponentEmoji) {
	if (emoji.id == undefined) {
		return emoji.name;
	}

	return `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`;
}

type PullRequestState = 'PENDING' | 'REVIEWED' | 'CHANGES_REQUESTED' | 'APPROVED' | 'MERGED' | 'CLOSED';
// values copied from https://github.com/discordjs/discord.js/blob/main/packages/discord.js/src/util/Colors.js
function GetColorFromPullRequestState(state: PullRequestState): number {
	switch (state) {
		case 'PENDING':
			return 0x3498db;
		case 'REVIEWED':
			return 0xf1c40f;
		case 'CHANGES_REQUESTED':
			return 0xed4245;
		case 'APPROVED':
			return 0x57f287;
		case 'MERGED':
		case 'CLOSED':
			return 0x95a5a6;
	}
}

function GetHumanStatusFromPullRequestState(state: PullRequestState): string {
	switch (state) {
		case 'PENDING':
			return '⏳ Awaiting Review';
		case 'REVIEWED':
			return '💬 Reviewed';
		case 'CHANGES_REQUESTED':
			return '⭕ Blocked';
		case 'APPROVED':
			return '✅ Approved';
		case 'MERGED':
			return '🟣 Merged';
		case 'CLOSED':
			return '🗑️ Closed';
	}
}

function GetReviewStateFromReview(state: string): PullRequestState {
	switch (state) {
		case 'COMMENTED':
		case 'DISMISSED':
			return 'REVIEWED';
		case 'CHANGES_REQUESTED':
			return 'CHANGES_REQUESTED';
		case 'APPROVED':
			return 'APPROVED';
		default: {
			throw new Error(`Unhandled Review State "${state}"`);
		}
	}
}

let octokit: Octokit;

const generateReplyFromInteraction = async (
	description: string,
	github: string,
	interaction: APIChatInputApplicationCommandInteraction | APIMessageComponentButtonInteraction,
	env: Env,
	deployment?: string,
	other?: string,
	emoji?: string
): Promise<any> => {
	if (emoji) {
		emoji = emoji.trim();
	}

	let urls: string[] = [];
	let components: any[] = [];
	const isUpdate = interaction.type === InteractionType.MessageComponent;
	let embed = getDefaultEmbed();

	const githubOption = github;
	const deploymentOption = deployment;
	const otherOption = other;

	let content = '';
	let pr_state: PullRequestState = 'PENDING';

	if (deploymentOption) {
		let deployment = await TryParseURL(deploymentOption, interaction, env);
		if (deployment) {
			let deploymentLink = new ButtonBuilder()
				.setEmoji(await TryGetEmojiFromURL(deployment, interaction, env))
				.setLabel('View as Preview')
				.setStyle(ButtonStyle.Link)
				.setURL(deployment.href);

			components.push(deploymentLink);
		} else return null;
	}
	if (otherOption) {
		urls.push(...otherOption.split(','));
	}
	const verb = isUpdate ? 'Updated' : 'Requested';
	embed.setFooter({
		text: `${verb} by @${interaction.member?.user.username}`,
		iconURL: `https://cdn.discordapp.com/avatars/${interaction.member?.user.id}/${interaction.member?.user.avatar}.png`,
	});
	embed.setTimestamp(new Date());

	//github
	{
		const githubRE =
			/((https:\/\/)?github\.com\/)?(?<ORGANISATION>[^\/]+)\/(?<REPOSITORY>[^\/]+)\/pull\/(?<NUMBER>\d+)/;
		const otherRE = /((?<ORGANISATION>[^\/]+)\/)?(?<REPOSITORY>[^(#|\s|\/)]+)(#)(?<NUMBER>\d+)/;

		const match = githubOption.match(githubRE) || githubOption.match(otherRE);
		if (!match) {
			await ReplyOrEditReply(interaction, { content: "The github PR entered wasn't in a supported format" }, env);

			return null;
		}

		let groups = match.groups!;

		const pr_info = {
			owner: groups['ORGANISATION'] ?? 'withastro',
			repo: groups['REPOSITORY'],
			pull_number: parseInt(groups['NUMBER']),
		};

		let url = `https://github.com/${pr_info.owner}/${pr_info.repo}/pull/${pr_info.pull_number}`;
		embed.addFields({ name: 'Repository', value: `[${pr_info.owner}/${pr_info.repo}#${pr_info.pull_number}](${url})` });
		embed.setURL(url);

		let githubLink = new ButtonBuilder()
			.setEmoji(await TryGetEmojiFromURL(new URL(url), interaction, env))
			.setLabel('View on Github')
			.setStyle(ButtonStyle.Link)
			.setURL(url);
		components.push(githubLink);

		let urlFiles = `${url}/files`;

		let githubFilesLink = new ButtonBuilder()
		  .setEmoji({ name: '📁', animated: false, id: undefined })
			.setLabel('Files')
			.setStyle(ButtonStyle.Link)
			.setURL(urlFiles);
		components.push(githubFilesLink);

		try {
			let pr = await octokit.rest.pulls.get(pr_info);
			embed.setAuthor({ name: pr.data.user.login, iconURL: `https://github.com/${pr.data.user.login}.png` });

			let reviewTracker: string[] = [];
			if (pr.data.state === 'closed') {
				if (pr.data.merged) {
					pr_state = 'MERGED';
				} else {
					pr_state = 'CLOSED';
				}
			}
			if (pr.data.state === 'open') {
				embed.setTitle(pr.data.title);
			} else {
				embed.setTitle(`[${pr_state}] ${pr.data.title}`);
			}

			let { data: reviews } = await octokit.rest.pulls.listReviews({ ...pr_info, per_page: 100 });
			const reviewsByUser = new Map<string, PullRequestState>();
			const reviewURLs = new Map<string, string>();
			for (let { state: rawState, user, html_url } of reviews) {
				const id = user?.login;
				if (!id) continue;
				// Filter out reviews from the author and GitHub Actions, they aren't relevant
				if (id === pr.data.user.login || id === 'github-actions[bot]' || id === 'astrobot-houston') {
					continue;
				}
				const current = reviewsByUser.get(id);
				const state = GetReviewStateFromReview(rawState);
				if (state === 'REVIEWED' && current) {
					// Plain reviews after an approval/block should not factor into the overall status
					continue;
				}
				reviewsByUser.set(id, state);
				reviewURLs.set(id, html_url);
			}
			for (const [user, state] of reviewsByUser) {
				switch (state) {
					case 'APPROVED': {
						const link = reviewURLs.get(user);
						if (pr.data.state === 'open') {
							reviewTracker.push(`[✅ @${user}](${link})`);
						} else {
							reviewTracker.push(`✅`);
						}
						if (pr.data.state === 'open' && pr_state !== 'CHANGES_REQUESTED') {
							pr_state = state;
						}
						break;
					}
					case 'CHANGES_REQUESTED': {
						const link = reviewURLs.get(user);
						if (pr.data.state === 'open') {
							reviewTracker.push(`[⭕ @${user}](${link})`);
						} else {
							reviewTracker.push(`⭕`);
						}
						// GitHub Actions shouldn't factor into overall status
						if (pr.data.state === 'open' && user !== 'github-actions[bot]') {
							pr_state = state;
						}
						break;
					}
					case 'REVIEWED': {
						const link = reviewURLs.get(user);
						if (pr.data.state === 'open') {
							reviewTracker.push(`[💬 @${user}](${link})`);
						} else {
							reviewTracker.push(`💬`);
						}

						if (pr.data.state === 'open' && pr_state === 'PENDING') {
							pr_state = state;
						}
					}
				}
			}
			embed.setColor(GetColorFromPullRequestState(pr_state));
			embed.addFields({ name: 'Status', value: GetHumanStatusFromPullRequestState(pr_state), inline: true });

			const { data: files } = await octokit.rest.pulls.listFiles(pr_info);
			const changesets = files.filter((file) => file.filename.startsWith('.changeset/') && file.status == 'added');
			embed.addFields({ name: 'Changeset', value: changesets.length > 0 ? '✅ Added' : '⬜ None', inline: true });

			if (reviewTracker.length > 0) {
				embed.addFields({ name: 'Reviews', value: reviewTracker.join(pr.data.state === 'open' ? '\n' : '') });
			}
		} catch (error) {
			if (error instanceof RequestError && error.status != 404) {
				console.error(error);
			}
			await ReplyOrEditReply(
				interaction,
				{
					content:
						'Something went wrong when parsing your pull request. Are you sure that the pull request you submitted exists?',
				},
				env
			);
			return null;
		}
	}

	// required since return from foreach doesn't return out of full function
	let parsedURLs = true;

	for (const url of urls) {
		const urlObject = await TryParseURL(url, interaction, env);

		if (!urlObject) {
			parsedURLs = false;
			break;
		}

		content += `${GetStringFromEmoji(await TryGetEmojiFromURL(urlObject, interaction, env))} `;
		content += `<${urlObject.href}>\n`;
	}

	if (!parsedURLs) return null;

	if (content.length > 0) {
		embed.setDescription(content);
	}

	if (!['MERGED', 'CLOSED'].includes(pr_state)) {
		const refreshButton = new ButtonBuilder()
			.setCustomId(`ptal-refresh`)
			.setLabel('Refresh')
			.setStyle(ButtonStyle.Primary)
			.setEmoji({ name: '🔁', animated: false, id: undefined });

		components.push(refreshButton);
	}

	let actionRow = new ActionRowBuilder<ButtonBuilder>();
	actionRow.addComponents(...components);
	return {
		content: `${emoji != ' ' && emoji != null ? `${emoji} ` : ''}**PTAL** ${description}`,
		embeds: [embed.toJSON()],
		components: [actionRow.toJSON()],
	};
};

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('ptal')
		.setDescription('Open a Please Take a Look (PTAL) request')
		.addStringOption((option) =>
			option.setName('github').setDescription('A link to a GitHub pull request').setRequired(true)
		)
		.addStringOption((option) =>
			option.setName('description').setDescription('A short description of the PTAL request').setRequired(true)
		)
		.addStringOption((option) =>
			option.setName('deployment').setDescription('A link to a deployment related to the PTAL').setRequired(false)
		)
		.addStringOption((option) =>
			option.setName('other').setDescription('Other links related to the PTAL, comma seperated').setRequired(false)
		)
		.addStringOption((option) =>
			option.setName('type').setDescription('The type of the PTAL request').setRequired(false).setChoices(
				// space in normal is required to avoid an error for the string being empty
				{ name: 'normal', value: ' ' },
				{ name: 'baby', value: '🍼' }
			)
		),
	async initialize(env: Env) {
		if (!env.GITHUB_TOKEN) {
			console.warn('Failed to initialize the /docs command: missing GITHUB_TOKEN enviroment variable.');
			return false;
		}

		octokit = new Octokit({ auth: env.GITHUB_TOKEN });
		rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);

		return true;
	},
	async execute(client) {
		return client.deferReply(
			new Promise(async (resolve) => {
				const reply = await generateReplyFromInteraction(
					getStringOption(client.interaction.data, 'description')!,
					getStringOption(client.interaction.data, 'github')!,
					client.interaction,
					client.env,
					getStringOption(client.interaction.data, 'deployment'),
					getStringOption(client.interaction.data, 'other'),
					getStringOption(client.interaction.data, 'type')
				);
				if (!reply) resolve(false);

				await rest.patch(Routes.webhookMessage(client.env.DISCORD_CLIENT_ID, client.interaction.token, '@original'), {
					body: {
						type: InteractionResponseType.UpdateMessage,
						allowed_mentions: {
							parse: ['users', 'roles'],
						},
						...reply,
					},
				});
				resolve(true);
			})
		);
	},
	async button(client) {
		client.ctx.waitUntil(
			new Promise(async (resolve) => {
				let parts = client.interaction.data.custom_id.split('-');

				if (parts[1] == 'refresh') {
					const title: string = client.interaction.message.content;
					let description = '';

					let emoji = undefined;
					if (!title.startsWith('**PTAL**')) {
						emoji = title.split(' ')[0];
						description = title.split(' ').slice(2).join(' ');
					} else {
						description = title.split(' ').slice(1).join(' ');
					}

					const components: APIButtonComponent[] | APIButtonComponentWithURL[] =
						client.interaction.message.components![0].components;
					let githubURL = '';
					let deploymentURL = undefined;

					for (let i = 0; i < components.length; i++) {
						const component = components[i];

						if (component.style == ButtonStyle.Link) {
							if (component.label == 'View on Github') {
								githubURL = component.url;
							} else if (component.label == 'View as Preview') {
								deploymentURL = component.url;
							}
						}
					}

					const urlList: string = client.interaction.message.embeds[0].description;
					let urls: string[] = [];

					if (urlList && urlList.length > 0) {
						const lines = urlList.split('\n');
						if (lines.length > 0) {
							for (let i = 0; i < lines.length; i++) {
								const line = lines[i].trim();
								const words = line.split(' ');
								if (words.at(-1)?.startsWith('<http')) {
									urls.push(words.at(-1)!.substring(1, words.at(-1)!.length - 1));
								}
							}
						}
					}

					const reply = await generateReplyFromInteraction(
						description,
						githubURL,
						client.interaction,
						client.env,
						deploymentURL,
						urls.join(','),
						emoji
					);
					if (!reply) return;

					try {
						await rest.patch(Routes.webhookMessage(client.env.DISCORD_CLIENT_ID, client.interaction.token), {
							body: {
								content: reply.content,
								embeds: reply.embeds,
								components: reply.components,
							},
						});
					} catch (exception) {
						console.error(exception);
						await rest.patch(Routes.webhookMessage(client.env.DISCORD_CLIENT_ID, client.interaction.token), {
							body: {
								content: 'Something went wrong while updating your /ptal request!',
							},
						});
					}
				}
				resolve(true);
			})
		);

		return client.deferUpdate();
	},
};

export default command;
