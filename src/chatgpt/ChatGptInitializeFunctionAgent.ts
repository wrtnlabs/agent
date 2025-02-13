import { ILlmFunction } from "@samchon/openapi";
import OpenAI from "openai";
import typia from "typia";

import { WrtnAgentDefaultPrompt } from "../internal/WrtnAgentDefaultPrompt";
import { WrtnAgentSystemPrompt } from "../internal/WrtnAgentSystemPrompt";
import { IWrtnAgentContext } from "../structures/IWrtnAgentContext";
import { IWrtnAgentPrompt } from "../structures/IWrtnAgentPrompt";
import { __IChatInitialApplication } from "../structures/internal/__IChatInitialApplication";
import { ChatGptHistoryDecoder } from "./ChatGptHistoryDecoder";

export namespace ChatGptInitializeFunctionAgent {
  export const execute = async (
    ctx: IWrtnAgentContext,
  ): Promise<IWrtnAgentPrompt[]> => {
    //----
    // EXECUTE CHATGPT API
    //----
    const completion: OpenAI.ChatCompletion = await ctx.request("initialize", {
      messages: [
        // COMMON SYSTEM PROMPT
        {
          role: "system",
          content: WrtnAgentDefaultPrompt.write(ctx.config),
        } satisfies OpenAI.ChatCompletionSystemMessageParam,
        // PREVIOUS HISTORIES
        ...ctx.histories.map(ChatGptHistoryDecoder.decode).flat(),
        // USER INPUT
        {
          role: "user",
          content: ctx.prompt.text,
        },
        {
          // SYSTEM PROMPT
          role: "system",
          content:
            ctx.config?.systemPrompt?.initialize?.(ctx.histories) ??
            WrtnAgentSystemPrompt.INITIALIZE,
        },
      ],
      // GETTER FUNCTION
      tools: [
        {
          type: "function",
          function: {
            name: FUNCTION.name,
            description: FUNCTION.description,
            parameters: FUNCTION.parameters as any,
          },
        },
      ],
      tool_choice: "auto",
      parallel_tool_calls: false,
    });

    //----
    // PROCESS COMPLETION
    //----
    const prompts: IWrtnAgentPrompt[] = [];
    for (const choice of completion.choices) {
      if (
        choice.message.role === "assistant" &&
        !!choice.message.content?.length
      )
        prompts.push({
          type: "text",
          role: "assistant",
          text: choice.message.content,
        });
    }
    if (
      completion.choices.some(
        (c) =>
          !!c.message.tool_calls?.some(
            (tc) =>
              tc.type === "function" && tc.function.name === FUNCTION.name,
          ),
      )
    )
      await ctx.initialize();
    return prompts;
  };
}

const FUNCTION: ILlmFunction<"chatgpt"> = typia.llm.application<
  __IChatInitialApplication,
  "chatgpt"
>().functions[0]!;
