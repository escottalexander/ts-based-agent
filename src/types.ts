import { ChatCompletionMessageParam } from "openai/resources";

export interface Message {
  role: string;
  content: string;
  sender?: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  function: {
    name: string;
    arguments: string;
  };
}

export interface StreamChunk {
  sender?: string;
  content?: string;
  tool_calls?: ToolCall[];
  delim?: string;
  response?: any;
}

export interface ResponseObject {
  messages: Message[];
} 