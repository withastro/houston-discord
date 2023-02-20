import { AnyThreadChannel, Channel, ChannelType, Collection, Message, TextChannel } from 'discord.js';
import { loadChain } from 'langchain/chains.js';

export type ValidTextChannel = TextChannel | AnyThreadChannel;
export const EMPTY_MESSAGE = 'No new messages to summarize.';

export const IS_PROD = true;
export const APPLICATION_ID = '1076715205691707494';
export const GUILD_ID = IS_PROD ? '830184174198718474' : '1076715142437412974';
export const CORE_CHANNEL_ID = IS_PROD ? '831183830664740864' : '1076715142437412977';
export const TRACKED_CHANNELS = IS_PROD
  ? [
      CORE_CHANNEL_ID,
      // #vip
      '1070219588014456873',
      // #general
      '830184175176122389',
      // #maintainers
      '857704189723541514',
      // #dev
      '845430950191038464',
      // #docs
      '853350631389265940',
    ]
  : [CORE_CHANNEL_ID];

export function validateChannel(channel: Channel | null): channel is ValidTextChannel {
  if (!channel) {
    return false;
  }
  if (
    channel.type !== ChannelType.GuildText &&
    channel.type !== ChannelType.PublicThread &&
    channel.type !== ChannelType.PrivateThread
  ) {
    return false;
  }
  return true;
}

export async function fetchChannelMessages(channel: ValidTextChannel) {
  const FETCH_LIMIT = 100;
  const allMessages = [];
  let isActive = true;
  while (isActive) {
    const messages: Collection<string, Message<true>> = await channel.messages.fetch({
      limit: FETCH_LIMIT,
      before: allMessages[allMessages.length - 1]?.id ?? undefined,
    });
    const filteredMessages = messages
      .filter((m) => m.createdTimestamp > Date.now() - 1000 * 60 * 60 * 24)
      .filter((m) => m.author.bot === false);
    if (messages.size < FETCH_LIMIT || filteredMessages.size === 0 || filteredMessages.size < messages.size) {
      isActive = false;
    }
    allMessages.push(...filteredMessages.values());
  }
  return allMessages.reverse();
}

export async function summarizeMessages(messages: Message<true>[]): Promise<string> {
  if (messages.length === 0) {
    return EMPTY_MESSAGE;
  }
  let combinedMessageText = messages
    .map((m) => `[[${m.author} ${m.hasThread ? 'started a new thread:' : 'wrote:'}]]\n${m.content}`)
    .join('\n\n');

  console.log(combinedMessageText.length);
  if (combinedMessageText.length > 10000) {
    combinedMessageText =
      combinedMessageText.slice(0, 10000) + '...\n\n [[The rest of the conversation has been removed.]]';
  }

  const chain = await loadChain('lc://chains/summarize/stuff/chain.json');
  const res = await chain.call({
    input_documents: [combinedMessageText],
    text: combinedMessageText,
  });

  return res.text.replace(/[^<](@\d*)[^>]/g, ' <$1> ');
}

export async function validateActiveThread(thread: AnyThreadChannel<boolean>) {
  if (!TRACKED_CHANNELS.includes(thread.parentId!)) {
    return undefined;
  }
  const messages = await fetchChannelMessages(thread);
  if (messages.length === 0) {
    return undefined;
  }
  return { thread, count: messages.length };
}
