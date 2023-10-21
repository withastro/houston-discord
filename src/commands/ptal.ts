import { SlashCommandBuilder, ChatInputCommandInteraction, ButtonBuilder, ButtonStyle, ActionRowBuilder, InteractionReplyOptions, ButtonInteraction, ButtonComponent } from "discord.js";
import { URL } from "url";
import { getDefaultEmbed } from "../utils/embeds.js";
import {Octokit} from "@octokit/rest";

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

			try
			{
				let pr = await octokit.rest.pulls.get({owner: pathSections[0], repo: pathSections[1], pull_number: Number.parseInt(pathSections[3])});
				embed.setTitle(`#${pathSections[3]} ${pr.data.title}`);

				let files = (await octokit.rest.pulls.listFiles({owner: pathSections[0], repo: pathSections[1], pull_number: Number.parseInt(pathSections[3])})).data;
				let changeSets = files.filter(file => {
					if(file.filename.startsWith(".changeset/") && file.status == "added")
					{
						return true;
					}
					return false;
				})

				embed.addFields({name: "Changeset", value: (changeSets.length == 1)? "✅" : "❌", inline: true});
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
				console.log(line)
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
