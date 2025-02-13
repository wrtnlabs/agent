import { IWrtnAdditionalAgent } from "../structures/IWrtnAdditionalAgent";
import { IWrtnAgentContext } from "../structures/IWrtnAgentContext";
import { IWrtnAgentPrompt } from "../structures/IWrtnAgentPrompt";

export namespace ChatGptAgent {
  export const execute = async <
    AgentExecutePlan extends {
      [Key in string]: IWrtnAdditionalAgent<keyof AgentExecutePlan>;
    },
  >(
    ctx: IWrtnAgentContext.WithAgentExecutePlan<AgentExecutePlan>,
  ): Promise<IWrtnAgentPrompt[]> => {
    const histories: IWrtnAgentPrompt[] = [];

    async function runState(
      stateName: keyof AgentExecutePlan,
      agentExecutedResult: IWrtnAgentPrompt[],
    ) {
      const plan = ctx.config.agentExecutePlan?.[stateName];
      if (plan == null) {
        return;
      }
      const executedResult = await plan.execute(
        ctx,
        agentExecutedResult,
        histories,
      );
      histories.push(...executedResult);
      const nextState = await plan.nextAgent(ctx, executedResult, histories);

      if (nextState === "end") {
        return;
      }

      await runState(nextState, executedResult);
    }

    await runState("initialize", []);
    return histories;
  };
}
