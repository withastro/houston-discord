import { ForumChannel } from "discord.js";
import { Client } from "../types"
import { getDefaultEmbed } from "../utils/embeds.js";

const GUILD_ID = "830184174198718474";
const FORUM_ID = "1019713903481081876";
const AI_FORUM_ID = "1095492539085230272";
const titles = ["Quiet in here?", "No-one around right now?", "Still waiting for an answer?"]

export default {
	time: "*/15 * * * *",
	async execute(client: Client) {
		const guild = await client.guilds.fetch(GUILD_ID);

		const forum: ForumChannel = await guild.channels.fetch(FORUM_ID) as ForumChannel;

		const threads = (await forum.threads.fetchActive()).threads.filter(x => 
			{
				const timestamp = x.createdTimestamp!;

				const date = new Date(timestamp);

				const currentTime = new Date();

				const timeDiff = currentTime.getTime() - date.getTime();
				return (timeDiff >= 3600000 && timeDiff < 86400000) && x.totalMessageSent == 0;
			});
		
		threads.forEach(thread => {
			if(thread.totalMessageSent == 0)
			{
				const embed = getDefaultEmbed().setTitle(titles[Math.floor(Math.random()*titles.length)]).setDescription(`It looks like no-one has responded to your question yet. People might not be available right now or don’t know how to answer your question. Want an answer while you wait? Try asking our experimental bot in <#${AI_FORUM_ID}>.`)
			
				thread.send({embeds: [embed]})
			}
		})
		
	}
}