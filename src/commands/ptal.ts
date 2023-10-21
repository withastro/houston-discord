import { SlashCommandBuilder, ChatInputCommandInteraction, ButtonBuilder, ButtonStyle, ActionRowBuilder, InteractionReplyOptions, ButtonInteraction, ButtonComponent, ColorResolvable } from "discord.js";
import { URL } from "url";
import { getDefaultEmbed } from "../utils/embeds.js";
import { Octokit } from "@octokit/rest";

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

const octokit = new Octokit();

type PullRequestState = 'PENDING' | 'CHANGES_REQUESTED' | 'APPROVED' | 'MERGED' | 'CLOSED';
function GetColorFromPullRequestState(state: PullRequestState): ColorResolvable
{
	switch (state) {
		case "PENDING": return 'Blue'
		case "CHANGES_REQUESTED": return 'Red'
		case "APPROVED": return 'Green'
		case "MERGED": return 'Purple'
		case "CLOSED": return 'Grey'
	}
}
function GetHumanStatusFromPullRequestState(state: PullRequestState): string
{
	switch (state) {
		case "PENDING": return '⏳ Waiting for Review'
		case "CHANGES_REQUESTED": return '⭕ Changes Requested'
		case "APPROVED": return '✅ Approved'
		case "MERGED": return '🟣 Merged'
		case "CLOSED": return '🗑️ Closed'
	}
}

const generateReplyFromInteraction = async (description: string, github: string, deployment: string | null, other: string | null, interaction: ChatInputCommandInteraction | ButtonInteraction): Promise<InteractionReplyOptions | null> => 
{

	if(!(await interaction.guild?.channels.fetch(interaction.channelId))?.name.includes("ptal"))
	{
		interaction.reply({content: "This command can only be used in PTAL channels", ephemeral: true})
		return null;
	}

	let urls: string[] = [];
	let components: any[] = [];

	let embed = getDefaultEmbed();

	const githubOption = github;
	const deploymentOption = deployment;
	const otherOption = other;

	let content = "";

	let githubURL = TryParseURL(githubOption, interaction);
	{
		if(githubURL)
		{
			const pathSections = githubURL.pathname.split("/");
			pathSections.shift();
			if(githubURL.hostname != "github.com" || pathSections.length != 4 || pathSections[2] != "pull" || !Number.parseInt(pathSections[3]))
			{
				interaction.reply({content: `Please link a pull request. Format: \`https://github.com/ORGANISATION/REPOSITORY/pull/NUMBER\``, ephemeral: true});
				return null;
			}

			embed.addFields({name: "Repository", value: `[${pathSections[0]}/${pathSections[1]}](https://github.com/${pathSections[0]}/${pathSections[1]})`, inline: true});
			embed.setURL(githubURL.href);

			let githubLink = new ButtonBuilder()
				.setEmoji(GetEmojiFromURL(githubURL, interaction))
				.setLabel("View on Github")
				.setStyle(ButtonStyle.Link)
				.setURL(githubURL.href);

			components.push(githubLink);
			
			const [owner, repo, id] = pathSections;
			const pull_number = Number.parseInt(id);
			const pr_info = {
				owner,
				repo,
				pull_number
			}

			try
			{
				let pr = await octokit.rest.pulls.get({owner: pathSections[0], repo: pathSections[1], pull_number: Number.parseInt(pathSections[3])});
				embed.setTitle(`#${pull_number} ${pr.data.title}`);

				let pr_state: PullRequestState = 'PENDING';
				let reviews: string[] = [];
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
				else
				{
					if (pr.data.review_comments > 0)
					{
						let { data: reviews } = await octokit.rest.pulls.listReviews(pr_info);
						for (let { state: reviewState } of reviews) {
							switch (reviewState) {
								case 'APPROVED': {
									reviews.push('✅')
									if (pr_state !== 'CHANGES_REQUESTED') {
										pr_state = 'APPROVED';
									}
									break;
								}
								case 'CHANGED_REQUESTED': {
									reviews.push('💬')
									pr_state = 'CHANGES_REQUESTED';
									break;
								}
							}
						}
					}
				}
				embed.setColor(GetColorFromPullRequestState(pr_state));
				embed.addFields({name: "Status", value: GetHumanStatusFromPullRequestState(pr_state), inline: true});
				embed.addFields({name: "Reviews", value: reviews.join('') || '⏳', inline: true});

				let { data: files } = await octokit.rest.pulls.listFiles(pr_info);
				let changeSets = files.filter(file => {
					if(file.filename.startsWith(".changeset/") && file.status == "added")
					{
						return true;
					}
					return false;
				})
				embed.addFields({name: "Changeset", value: (changeSets.length !== 0)? "✅" : "❌", inline: true});
			}
			catch
			{
					interaction.reply({content: "Something went wrong when parsing your pull request. Are you sure the URL you submitted is correct?", ephemeral: true});
					return null;
			}
		}
		else
			return null;
	}

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

	embed.setAuthor({name: interaction.user.displayName, iconURL: interaction.user.displayAvatarURL()})

	// required since return from foreach doesn't return out of full function
	let parsedURLs = true;

	urls.forEach(url =>
		{
			let urlObject = TryParseURL(url, interaction);

			if(!urlObject)
			{
				parsedURLs = false;
				return;
			}

			content += `${GetEmojiFromURL(urlObject, interaction)} `

			content += `<${urlObject.href}>\n`;
		})

	if(!parsedURLs)
		return null;

	if(content.length > 0)
	{
		embed.setDescription(content);
	}

	const refreshButton = new ButtonBuilder()
		.setCustomId(`ptal-refresh`)
		.setLabel("Refresh")
		.setStyle(ButtonStyle.Primary)
		.setEmoji("🔁");

	components.push(refreshButton);

	let actionRow = new ActionRowBuilder<ButtonBuilder>();
	actionRow.addComponents(...components);

	return {content: `**PTAL** ${description}`, embeds: [embed], components: [actionRow]};
}

export default {
	data: new SlashCommandBuilder()
		.setName("ptal")
		.setDescription("Trigger a message on questions that should be reworded")
		.addStringOption(option =>
			option.setName("description")
			.setDescription("A short description of the PTAL request")
			.setRequired(true))
		.addStringOption(option =>
				option.setName("github")
				.setDescription("A link to a github pull request")
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

			const reply = await generateReplyFromInteraction(description, githubButton.url!, otherButton.url, urls.join(","), interaction);

			if(!reply)
				return;

			interaction.message.edit({content: reply.content, embeds: reply.embeds, components: reply.components});
			interaction.reply({content: "Successfully updated the request", ephemeral: true})
		}
	}
}
