import { Message, ResponseObject, StreamChunk } from './types';
import chalk from 'chalk';

export async function processAndPrintStreamingResponse(
  response: AsyncGenerator<StreamChunk>
): Promise<ResponseObject> {
  let content = "";
  let lastSender = "";

  for await (const chunk of response) {
    if (chunk.sender) {
      lastSender = chunk.sender;
    }

    if (chunk.content) {
      if (!content && lastSender) {
        process.stdout.write(chalk.blue(`${lastSender}: `));
        lastSender = "";
      }
      process.stdout.write(chunk.content);
      content += chunk.content;
    }

    if (chunk.tool_calls) {
      for (const toolCall of chunk.tool_calls) {
        const name = toolCall.function.name;
        if (!name) continue;
        console.log(chalk.blue(`${lastSender}: `) + chalk.magenta(`${name}()`));
      }
    }

    if (chunk.delim === "end" && content) {
      console.log(); // End of response message
      content = "";
    }

    if (chunk.response) {
      return chunk.response;
    }
  }

  return { messages: [] };
}

export function prettyPrintMessages(messages: Message[]): void {
  for (const message of messages) {
    if (message.role !== "assistant") continue;

    process.stdout.write(chalk.blue(`${message.sender}: `));

    if (message.content) {
      console.log(message.content);
    }

    const toolCalls = message.tool_calls || [];
    if (toolCalls.length > 1) console.log();
    
    for (const toolCall of toolCalls) {
      const { name, arguments: args } = toolCall.function;
      const argStr = JSON.stringify(JSON.parse(args)).replace(/:/g, "=");
      console.log(chalk.magenta(`${name}(${argStr.slice(1, -1)})`));
    }
  }
} 