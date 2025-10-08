import { ForumChannel } from "discord.js";
import type { Client } from "discord.js";
import { getDefaultEmbed } from "../utils/embeds.js";

// Time constants (in milliseconds)
const SOLVED_REMINDER_TIME = parseInt(process.env.SOLVED_REMINDER_TIME || '86400000'); // Default: 24 hours
const AUTO_CLOSE_TIME = parseInt(process.env.AUTO_CLOSE_TIME || '259200000'); // Default: 72 hours (3 days)
const BOT_REMINDER_IDENTIFIER = '<!-- SOLVED_REMINDER_SENT -->';

export default {
	time: process.env.AUTO_CLOSE_SCHEDULE,
	async execute(client: Client) {
		const guild = await client.guilds.fetch(process.env.GUILD_ID!);
		const forum: ForumChannel = (await guild.channels.fetch(process.env.SUPPORT_CHANNEL!)) as ForumChannel;

		// Fetch all available tags to find the "Solved" tag ID
		const availableTags = forum.availableTags;
		const solvedTag = availableTags.find(tag => 
			tag.name.toLowerCase() === 'solved' || 
			tag.name.toLowerCase() === 'resolved'
		);

		if (!solvedTag) {
			console.warn('Auto-close: Could not find "Solved" tag in forum channel');
			return;
		}

		// Get all active threads
		const activeThreads = (await forum.threads.fetchActive()).threads;
		const currentTime = new Date();

		for (const [_threadId, thread] of activeThreads) {
			try {
				// Skip if thread already has solved tag
				if (thread.appliedTags.includes(solvedTag.id)) {
					continue;
				}

				if(thread.id === '1222578561261637734'){
					// This is the pinned thread for CMS, so we just skip it.
					continue;
				}

				const threadAge = currentTime.getTime() - thread.createdTimestamp!;
				
				// Fetch recent messages to check for bot reminder
				const messages = await thread.messages.fetch({ limit: 10 });
				const hasBotReminder = messages.some(msg => 
					msg.author.bot && msg.content.includes(BOT_REMINDER_IDENTIFIER)
				);

				// Stage 1: Send solved reminder after initial period
				if (threadAge >= SOLVED_REMINDER_TIME && threadAge < AUTO_CLOSE_TIME && !hasBotReminder) {
					const embed = getDefaultEmbed()
						.setTitle('If your issue is resolved, please help by doing the following two steps:')
						.setDescription(
							'1. From the ellipses (3-dot menu) in the top-right corner of the post (not the first message), edit the tags to include the Solved tag.\n2. From the same ellipses, select Close Post.\nYour post will still be available to search and can be re-opened simply by replying in it. Closing a post moves it down with older posts, so we can more easily focus on issues that still need to be resolved.\nThank you for your help!'
						);

					await thread.send({
						content: `${BOT_REMINDER_IDENTIFIER}\n🤖 **Auto-reminder**: This thread has been inactive for a while.`,
						embeds: [embed.toJSON()],
					});

					console.log(`Sent solved reminder to thread: ${thread.name} (${thread.id})`);
				}

				// Stage 2: Auto-close thread after extended period without solved tag
				else if (threadAge >= AUTO_CLOSE_TIME && hasBotReminder) {
					// Send final notice before closing
					await thread.send({
						content: '🤖 **Auto-closing**: This thread has been inactive for an extended period without being marked as solved. If you still need help, feel free to create a new post or reply to reopen this thread.',
					});

					// Close the thread
					await thread.setArchived(true);
					console.log(`Auto-closed thread: ${thread.name} (${thread.id})`);
				}

			} catch (error) {
				console.error(`Error processing thread ${thread.id}:`, error);
			}
		}
	},
};
