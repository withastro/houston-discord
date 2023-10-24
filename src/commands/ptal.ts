import { URL } from "node:url";
import { SlashCommandBuilder, ChatInputCommandInteraction, ButtonBuilder, ButtonStyle, ActionRowBuilder, InteractionReplyOptions, ButtonInteraction, ButtonComponent, ColorResolvable, InteractionType } from "discord.js";
import { Octokit } from "@octokit/rest";

import { getDefaultEmbed } from "../utils/embeds.js";

function TryParseURL(url: string, interaction: ChatInputCommandInteraction | ButtonInteraction)
{
	try
	{
		return new URL(url.trim());
	}
	catch (exception)
	{
		if(exception instanceof TypeError)
		{
			interaction.reply({content: `The following URL is invalid: ${url}`});
			return null;
		}
		interaction.reply({content: "Something went wrong while parsing your URL's"});
		return null;
	}
}

function GetEmojiFromURL(url: URL, interaction: ChatInputCommandInteraction | ButtonInteraction)
{
	let apexDomain = url.hostname.split(".").at(-2);
	let emoji = interaction.guild?.emojis.cache.find(emoji => emoji.name == apexDomain);

	if(emoji)
	{
		return `<:${emoji.name}:${emoji.id}>`;
	}
	else
	{
		return "❓";
	}
}

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

type PullRequestState = 'PENDING' | 'REVIEWED' | 'CHANGES_REQUESTED' | 'APPROVED' | 'MERGED' | 'CLOSED';
function GetColorFromPullRequestState(state: PullRequestState): ColorResolvable
{
	switch (state) {
		case "PENDING": return 'Blue'
		case "REVIEWED": return 'Gold'
		case "CHANGES_REQUESTED": return 'Red'
		case "APPROVED": return 'Green'
		case "MERGED": return 'Grey'
		case "CLOSED": return 'Grey'
	}
}
function GetHumanStatusFromPullRequestState(state: PullRequestState): string
{
	switch (state) {
		case "PENDING": return '⏳ Awaiting Review'
		case "REVIEWED": return '💬 Reviewed'
		case "CHANGES_REQUESTED": return '⭕ Blocked'
		case "APPROVED": return '✅ Approved'
		case "MERGED": return '🟣 Merged'
		case "CLOSED": return '🗑️ Closed'
	}
}

function GetReviewStateFromReview(state: string): PullRequestState
{
	switch (state) {
		case "COMMENTED": return 'REVIEWED'
		case "CHANGES_REQUESTED": return 'CHANGES_REQUESTED'
		case "APPROVED": return 'APPROVED'
		default: {
			throw new Error(`Unhandled Review State "${state}"`);
		}
	}
}

const generateReplyFromInteraction = async (description: string, github: string, deployment: string | null, other: string | null, interaction: ChatInputCommandInteraction | ButtonInteraction): Promise<InteractionReplyOptions | null> => 
{	
	// Allow /ptal in test server
	if (interaction.guild?.name !== 'bot test') {
		if(!(await interaction.guild?.channels.fetch(interaction.channelId))?.name.includes("ptal"))
		{
			interaction.reply({content: "This command can only be used in PTAL channels", ephemeral: true})
			return null;
		}
	}

	let urls: string[] = [];
	let components: any[] = [];
	const isUpdate = interaction.type === InteractionType.MessageComponent;
	let embed = getDefaultEmbed();

	const githubOption = github;
	const deploymentOption = deployment;
	const otherOption = other;

	let content = "";
	let pr_state: PullRequestState = 'PENDING';

	let githubURL = TryParseURL(githubOption, interaction);
	if(githubURL)
	{
		const pathSections = githubURL.pathname.split("/");
		pathSections.shift();
		if(githubURL.hostname != "github.com" || pathSections.length != 4 || pathSections[2] != "pull" || !Number.parseInt(pathSections[3]))
		{
			interaction.reply({content: `Please link a pull request. Format: \`https://github.com/ORGANISATION/REPOSITORY/pull/NUMBER\``, ephemeral: true});
			return null;
		}

		const [owner, repo, _, id] = pathSections;
		const pull_number = Number.parseInt(id);
		const pr_info = {
			owner,
			repo,
			pull_number
		}
		embed.addFields({ name: "Repository", value: `[${owner}/${repo}#${pull_number}](https://github.com/${owner}/${repo}/pull/${id})` });
		embed.setURL(githubURL.href);

		let githubLink = new ButtonBuilder()
			.setEmoji(GetEmojiFromURL(githubURL, interaction))
			.setLabel("View on Github")
			.setStyle(ButtonStyle.Link)
			.setURL(githubURL.href);

		components.push(githubLink);
		try
		{
			let pr = await octokit.rest.pulls.get({ owner, repo, pull_number });
			embed.setAuthor({ name: pr.data.user.login, iconURL: `https://github.com/${pr.data.user.login}.png` })

			let reviewTracker: string[] = [];
			if (pr.data.state === 'closed') {
				if (pr.data.merged)
				{
					pr_state = 'MERGED';
				}
				else
				{
					pr_state = 'CLOSED';
				}
			}
			if (pr.data.state === 'open') {
				embed.setTitle(pr.data.title);
			} else {
				embed.setTitle(`[${pr_state}] ${pr.data.title}`)
			}

			if (pr.data.review_comments > 0)
			{
				let { data: reviews } = await octokit.rest.pulls.listReviews({ ...pr_info, per_page: 100 });
				const reviewsByUser = new Map<string, PullRequestState>();
				const reviewURLs = new Map<string, string>();
				for (let { state: rawState, user, html_url } of reviews) {
					const id = user?.login;
					if (!id) continue;
					// Filter out reviews from the author, they are always just replies.
					if (id === pr.data.user.login) {
						continue;
					}
					const current = reviewsByUser.get(id);
					const state = GetReviewStateFromReview(rawState)
					if (state === 'REVIEWED' && current) {
						// Plain reviews after an approval/block should not factor into the overall status
						continue;
					}
					reviewsByUser.set(id, state)
					reviewURLs.set(id, html_url)
				}
				for (const [user, state] of reviewsByUser) {
					switch (state) {
						case 'APPROVED': {
							const link = reviewURLs.get(user);
							if (pr.data.state === 'open') {
								reviewTracker.push(`[✅ @${user}](${link})`)
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
								reviewTracker.push(`[⭕ @${user}](${link})`)
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
								reviewTracker.push(`[💬 @${user}](${link})`)
							} else {
								reviewTracker.push(`💬`);
							}
							
							if (pr.data.state === 'open' && pr_state === 'PENDING') {
								pr_state = state;
							}
						}
					}
				}
			}
			embed.setColor(GetColorFromPullRequestState(pr_state));
			embed.addFields({ name: "Status", value: GetHumanStatusFromPullRequestState(pr_state), inline: true });

			const { data: files } = await octokit.rest.pulls.listFiles(pr_info)
			const changesets = files.filter(file => file.filename.startsWith(".changeset/") && file.status == "added")
			embed.addFields({ name: "Changeset", value: changesets.length > 0 ? '✅' : '⭕', inline: true })

			if (reviewTracker.length > 0) {
				embed.addFields({name: "Reviews", value: reviewTracker.join(pr.data.state === 'open' ? '\n' : '') });
			}
		}
		catch (error)
		{
				console.error(error);
				interaction.reply({ content: "Something went wrong when parsing your pull request. Are you sure the URL you submitted is correct?", ephemeral: true });
				return null;
		}
	}
	else
		return null;

	if(deploymentOption)
	{
		let deployment = TryParseURL(deploymentOption, interaction);
		if(deployment)
		{
			let deploymentLink = new ButtonBuilder()
				.setEmoji(GetEmojiFromURL(deployment, interaction))
				.setLabel("View as Preview")
				.setStyle(ButtonStyle.Link)
				.setURL(deployment.href);

			components.push(deploymentLink);
		}
		else
			return null;
	}
	if(otherOption)
	{
		urls.push(...otherOption.split(","));
	}
	const verb = isUpdate ? 'Updated' : 'Requested'
	embed.setFooter({ text: `${verb} by @${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
	embed.setTimestamp(new Date());

	// required since return from foreach doesn't return out of full function
	let parsedURLs = true;

	for (const url of urls) {
		const urlObject = TryParseURL(url, interaction);

		if (!urlObject) {
			parsedURLs = false;
			break;
		}

		content += `${GetEmojiFromURL(urlObject, interaction)} `;
		content += `<${urlObject.href}>\n`;
	}

	if(!parsedURLs)
		return null;

	if(content.length > 0)
	{
		embed.setDescription(content);
	}
	
	if (!['MERGED', 'CLOSED'].includes(pr_state)) {
		const refreshButton = new ButtonBuilder()
			.setCustomId(`ptal-refresh`)
			.setLabel("Refresh")
			.setStyle(ButtonStyle.Primary)
			.setEmoji("🔁");

		components.push(refreshButton);
	}

	let actionRow = new ActionRowBuilder<ButtonBuilder>();
	actionRow.addComponents(...components);

	return {content: `**PTAL** ${description}`, embeds: [embed], components: [actionRow]};
}

export default {
	data: new SlashCommandBuilder()
		.setName("ptal")
		.setDescription("Open a Please Take a Look (PTAL) request")
		.addStringOption(option =>
			option.setName("description")
			.setDescription("A short description of the PTAL request")
			.setRequired(true))
		.addStringOption(option =>
				option.setName("github")
				.setDescription("A link to a GitHub pull request")
				.setRequired(true))
		.addStringOption(option =>
				option.setName("deployment")
				.setDescription("A link to a deployment related to the PTAL")
				.setRequired(false))
		.addStringOption(option =>
				option.setName("other")
				.setDescription("Other links related to the PTAL, comma seperated")
				.setRequired(false)),
	async execute(interaction: ChatInputCommandInteraction) {

		const reply = await generateReplyFromInteraction(interaction.options.getString("description", true), interaction.options.getString("github", true), interaction.options.getString("deployment", false), interaction.options.getString("other", false), interaction);

		if(!reply)
			return;

		interaction.reply(reply);
		
	},
	async button(interaction: ButtonInteraction)
	{
		let parts = interaction.customId.split("-");

		if(parts[1] == "refresh")
		{
			let descriptionArray = interaction.message.content.split(" ");
			descriptionArray.shift();
			let description = descriptionArray.join(" ");

			const githubButton = interaction.message.components[0].components[0] as ButtonComponent;
			let otherButton = interaction.message.components[0].components[1] as ButtonComponent;

			let urls: string[] = [];

			let desc = interaction.message.embeds[0].description;

			let lines = desc?.split("\n")!;
			for(let i = lines?.length - 1; i >= 0; i--)
			{
				const line = lines[i].trim();
				let words = line.split(" ");
				if(words.at(-1)?.startsWith("<http"))
				{
					urls.unshift(words.at(-1)!.substring(1, words.at(-1)!.length - 2));
				}
				else
				{
					break;
				}
			}

			await interaction.deferUpdate();
			const reply = await generateReplyFromInteraction(description, githubButton.url!, otherButton.url, urls.join(","), interaction);
			if (!reply) return;
			
			try {
				await interaction.editReply({ content: reply.content, embeds: reply.embeds, components: reply.components });
			} catch (exception) {
				console.error(exception);
				await interaction.editReply({ content: "Something went wrong while updating your /ptal request!" })
			}
		}
	}
}
