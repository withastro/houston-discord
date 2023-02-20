import { AnyThreadChannel, EmbedBuilder } from 'discord.js';
import { EMPTY_MESSAGE, TRACKED_CHANNELS, ValidTextChannel } from './util.js';

export function createWelcomeEmbed() {
  return new EmbedBuilder()
    .setColor(0xffff99)
    .setTitle(`:wave: Welcome to your daily briefing!`)
    .setDescription(
      `Here is the core team summary of the last 24 hours in the Astro Discord.\n\n:eye: ${TRACKED_CHANNELS.map(
        (id) => `<#${id}>`
      ).join(' ')}`
    )
    .setTimestamp();
}

export function createSummaryEmbed(channel: ValidTextChannel, summaryText: string) {
  if (summaryText === EMPTY_MESSAGE) {
    return new EmbedBuilder()
      .setColor(0x888888)
      .setTitle(`Daily Summary: <#${channel.id}>`)
      .setDescription(summaryText.trim());
  }
  return new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle(`Daily Summary: <#${channel.id}>`)
    .setDescription(summaryText.trim())
    .setFooter({ text: 'Summary of the last 24 hours' })
    .setTimestamp();
}

export function createThreadListEmbed(
  channel: ValidTextChannel,
  allThreads: { thread: AnyThreadChannel; count: number }[]
) {
  return new EmbedBuilder()
    .setColor(0x0099ff)
    .setDescription(
      allThreads
        .slice(0, 10)
        .map((t) => `<#${t.thread.parent?.id}> > <#${t.thread.id}> (${t.count})`)
        .join('\n')
    )
    .setTitle(`Daily Summary: All Active Threads`)
    .setFooter({ text: 'Summary of active threads in the last 24 hours' })
    .setTimestamp();
}
