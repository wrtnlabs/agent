import { IWrtnAgentContext } from "../structures/IWrtnAgentContext";
import { IWrtnAgentPrompt } from "../structures/IWrtnAgentPrompt";

export namespace ChatGptAgent {
  export const execute = async (
    ctx: IWrtnAgentContext,
  ): Promise<IWrtnAgentPrompt[]> => {
    const histories: IWrtnAgentPrompt[] = [];

    async function runState(
      stateName: string,
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
