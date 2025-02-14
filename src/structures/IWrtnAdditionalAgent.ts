import { ChatGptCancelFunctionAgent } from "../chatgpt/ChatGptCancelFunctionAgent";
import { ChatGptDescribeFunctionAgent } from "../chatgpt/ChatGptDescribeFunctionAgent";
import { ChatGptExecuteFunctionAgent } from "../chatgpt/ChatGptExecuteFunctionAgent";
import { ChatGptInitializeFunctionAgent } from "../chatgpt/ChatGptInitializeFunctionAgent";
import { ChatGptSelectFunctionAgent } from "../chatgpt/ChatGptSelectFunctionAgent";
import { Awaitable } from "../typings/common";
import { IWrtnAgentContext } from "./IWrtnAgentContext";
import { IWrtnAgentEvent } from "./IWrtnAgentEvent";
import { IWrtnAgentPrompt } from "./IWrtnAgentPrompt";

export interface IWrtnAdditionalAgent<
  AgentExecutePlanKeys extends keyof any = string,
> {
  /**
   * The event of agent execution.
   */
  execute: (
    ctx: IWrtnAgentContext,
    previousAgentExecuteResult: IWrtnAgentPrompt[],
    histories: IWrtnAgentPrompt[],
  ) => Promise<IWrtnAgentPrompt[]> | IWrtnAgentPrompt[];
  /**
   * Previous agent configuration for transitioning to the current agent.
   *
   * This array contains conditions that determine when to transition from
   * previous agents to this current agent, functioning like a state machine.
   *
   * Each entry specifies:
   * - name: The name of a previous agent that can transition to this agent
   * - condition: A function that evaluates whether the transition should occur
   *
   * @example
   * ```ts
   * // the example of `cancel_unexecuted` agent
   * previousAgent: [
   *   {
   *     name: "initialize",
   *     condition: (ctx) => ctx.stack.length !== 0
   *   }
   * ]
   * ```
   */
  nextAgent: (
    ctx: IWrtnAgentContext,
    executeResult: IWrtnAgentPrompt[],
    histories: IWrtnAgentPrompt[],
  ) => Awaitable<AgentExecutePlanKeys>;
}

export namespace IWrtnAdditionalAgent {
  export type DefaultAgentName =
    | "initialize"
    | "select"
    | "execute"
    | "describe"
    | "canceled"
    | "end";

  export type DefaultAgentEvent<Type extends string> =
    | (IWrtnAgentEvent.IBase<`before_${Type}`> & {
        ctx: IWrtnAgentContext;
        previousAgentExecuteResult: IWrtnAgentPrompt[];
        histories: IWrtnAgentPrompt[];
      })
    | (IWrtnAgentEvent.IBase<`after_${Type}`> & {
        ctx: IWrtnAgentContext;
        executeResult: IWrtnAgentPrompt[];
        histories: IWrtnAgentPrompt[];
      });

  export const DEFAULT_CHATGPT_AGENT = {
    initialize: {
      execute: (ctx: IWrtnAgentContext): Awaitable<IWrtnAgentPrompt[]> => {
        if (ctx.ready() === false) {
          return [];
        }
        return ChatGptInitializeFunctionAgent.execute(ctx);
      },
      nextAgent: (ctx: IWrtnAgentContext) => {
        if (ctx.ready() === false) {
          return "end";
        }
        if (ctx.stack.length !== 0) {
          return "canceled";
        }
        return "select";
      },
    },
    canceled: {
      execute: ChatGptCancelFunctionAgent.execute,
      nextAgent: () => "select",
    },
    select: {
      execute: ChatGptSelectFunctionAgent.execute,
      nextAgent: (ctx: IWrtnAgentContext) => {
        if (ctx.stack.length === 0) {
          return "end";
        }
        return "execute";
      },
    },
    execute: {
      execute: ChatGptExecuteFunctionAgent.execute,
      nextAgent: () => "describe",
    },
    describe: {
      execute: <
        AgentExecutePlan extends Record<
          string,
          IWrtnAdditionalAgent<keyof AgentExecutePlan>
        >,
      >(
        ctx: IWrtnAgentContext,
        previousAgentExecuteResult: IWrtnAgentPrompt[],
      ): Awaitable<IWrtnAgentPrompt[]> => {
        const executed: IWrtnAgentPrompt.IExecute[] =
          previousAgentExecuteResult.filter(
            (prompt) => prompt.type === "execute",
          );

        // for Awaitable types, Async reduce executes promises sequentially.
        return executed
          .reduce(async (acc, cur) => {
            await acc;
            await ChatGptCancelFunctionAgent.cancelFunction(ctx, {
              reason: "completed",
              name: cur.function.name,
            });
            return Promise.resolve();
          }, Promise.resolve())
          .then(() => ChatGptDescribeFunctionAgent.execute(ctx, executed));
      },
      nextAgent: (
        ctx: IWrtnAgentContext,
        executeResult: IWrtnAgentPrompt[],
      ) => {
        if (executeResult.length === 0 || ctx.stack.length === 0) {
          return "end";
        }
        return "execute";
      },
    },
    end: {
      execute: () => [],
      nextAgent: () => "end",
    },
  } as const;
}
