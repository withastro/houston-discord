import { Command } from '../types';
import { default as AskCommand } from './ask.js';
import { default as DocsCommand } from './docs.js';
import { default as IssueCommand } from './issue.js';
import { default as PTALCommand } from './ptal.js';
import { default as SolvedCommand } from './solved.js';
import { default as SupportCommand } from './support.js';
import { default as TweetCommand } from './tweet.js';
// import {default as RetriggerStatisticsCommand} from "./retriggerStatistics";

type CommandList = {
	[command: string]: Command;
};

const commandList: CommandList = {
	ask: AskCommand,
	docs: DocsCommand,
	issue: IssueCommand,
	ptal: PTALCommand,
	tweet: TweetCommand,
	solved: SolvedCommand,
	support: SupportCommand,
	//"retrigger-statistics": RetriggerStatisticsCommand
};

export default commandList;
