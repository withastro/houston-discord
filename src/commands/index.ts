import { Command } from "../types";
import {default as AskCommand} from "./ask";
import {default as DocsCommand} from "./docs";
import {default as IssueCommand} from "./issue";
import {default as PTALCommand} from "./ptal";
import {default as RetriggerStatisticsCommand} from "./retriggerStatistics";

type CommandList = {
	[command: string]: Command;
}

const commandList: CommandList = {
	"ask": AskCommand,
	"docs": DocsCommand,
	"issue": IssueCommand,
	"ptal": PTALCommand,
	"retrigger-statistics": RetriggerStatisticsCommand
}

export default commandList;
