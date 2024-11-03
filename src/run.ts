import dotenv from 'dotenv';
import { Swarm } from ''; //Need to import swarm
import BasedAgent from './agents';
import OpenAI from 'openai';
import { Message } from './types';
import { processAndPrintStreamingResponse, prettyPrintMessages } from './utils';
import chalk from 'chalk';

dotenv.config();

async function runAutonomousLoop(agent: BasedAgent, interval: number = 10): Promise<void> {
  const client = new Swarm();
  const messages: Message[] = [];

  console.log("Starting autonomous Based Agent loop...");

  while (true) {
    try {
      const thought = 
        "Be creative and do something interesting on the Base blockchain. " +
        "Don't take any more input from me. Choose an action and execute it now. Choose those that highlight your identity and abilities best.";
      
      messages.push({ role: "user", content: thought });
      console.log(`\n${chalk.gray("Agent's Thought:")} ${thought}`);

      const response = await client.run({
        agent,
        messages,
        stream: true
      });

      const responseObj = await processAndPrintStreamingResponse(response);
      messages.push(...(responseObj.messages || []));

      await new Promise(resolve => setTimeout(resolve, interval * 1000));
    } catch (error) {
      console.error("Error in autonomous loop:", error);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

async function runOpenAIConversationLoop(agent: BasedAgent): Promise<void> {
  const client = new Swarm();
  const openaiClient = new OpenAI();
  const messages: Message[] = [];

  console.log("Starting OpenAI-Based Agent conversation loop...");

  const openaiMessages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: "You are a user guiding a blockchain agent through various tasks on the Base blockchain..."
    },
    {
      role: "user",
      content: "Start a conversation with the Based Agent and guide it through some blockchain tasks."
    }
  ];

  while (true) {
    try {
      const openaiResponse = await openaiClient.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: openaiMessages
      });

      const openaiMessage = openaiResponse.choices[0].message.content;
      console.log(`\n${chalk.green("OpenAI Guide:")} ${openaiMessage}`);

      messages.push({ role: "user", content: openaiMessage || "" });
      const response = await client.run({ agent, messages, stream: true });
      const responseObj = await processAndPrintStreamingResponse(response);

      messages.push(...(responseObj.messages || []));

      const basedAgentResponse = responseObj.messages?.length ? 
        responseObj.messages[responseObj.messages.length - 1].content : 
        "No response from Based Agent.";
        
      openaiMessages.push({ 
        role: "user", 
        content: `Based Agent response: ${basedAgentResponse}` 
      });

      const userInput = await new Promise<string>(resolve => {
        process.stdout.write("\nPress Enter to continue the conversation, or type 'exit' to end: ");
        process.stdin.once('data', data => resolve(data.toString().trim()));
      });

      if (userInput.toLowerCase() === 'exit') break;
    } catch (error) {
      console.error("Error in conversation loop:", error);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

async function chooseMode(): Promise<string> {
  while (true) {
    console.log("\nAvailable modes:");
    console.log("1. chat    - Interactive chat mode");
    console.log("2. auto    - Autonomous action mode");
    console.log("3. two-agent - AI-to-agent conversation mode");

    const choice = await new Promise<string>(resolve => {
      process.stdout.write("\nChoose a mode (enter number or name): ");
      process.stdin.once('data', data => resolve(data.toString().toLowerCase().trim()));
    });

    const modeMap: { [key: string]: string } = {
      '1': 'chat',
      '2': 'auto',
      '3': 'two-agent',
      'chat': 'chat',
      'auto': 'auto',
      'two-agent': 'two-agent'
    };

    if (choice in modeMap) {
      return modeMap[choice];
    }
    console.log("Invalid choice. Please try again.");
  }
}

async function main() {
  const mode = await chooseMode();
  const agent = new BasedAgent();

  const modeFunctions: { [key: string]: () => Promise<void> } = {
    'chat': async () => { /* Implement chat mode */ },
    'auto': () => runAutonomousLoop(agent),
    'two-agent': () => runOpenAIConversationLoop(agent)
  };

  console.log(`\nStarting ${mode} mode...`);
  await modeFunctions[mode]();
}

console.log("Starting Based Agent...");
main().catch(console.error); 