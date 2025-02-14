import { IWrtnAgentConfig } from "./IWrtnAgentConfig";
import { IWrtnAgentPrompt } from "./IWrtnAgentPrompt";

/**
 * System prompt collection of the A.I. chatbot.
 *
 * `IWrtnAgentSystemPrompt` is a type represents a collection of system
 * prompts that would be used by the A.I. chatbot of {@link WrtnAgent}.
 *
 * You can customize the system prompt by configuring the
 * {@link IWrtnAgentConfig.systemPrompt} property when creating a new
 * {@link WrtnAgent} instance.
 *
 * If you don't configure any system prompts, the default system prompts
 * would be used which are written in the below directory as markdown
 * documents.
 *
 * - https://github.com/samchon/nestia/tree/master/packages/agent/prompts
 *
 * @author Samchon
 */
export interface IWrtnAgentSystemPrompt {
  /**
   * Common system prompt that would be used in every situation.
   *
   * @param config Configuration of the agent
   * @returns The common system prompt
   * @default https://github.com/samchon/nestia/blob/master/packages/agent/prompts/common.md
   */
  common?: (config?: IWrtnAgentConfig.WithoutAgentExecutePlan) => string;

  /**
   * Initialize system prompt.
   *
   * When the A.I. chatbot has not informed any functions to the agent
   * yet because the user has not implied any function calling request yet,
   * {@link WrtnAgent} says that it is a circumstance that nothing has
   * been initialized yet.
   *
   * In that case, the `initialize` system prompt would be used. You can
   * customize the `initialize` system prompt by assigning this function
   * with the given {@link IWrtnAgentPrompt histories} parameter.
   *
   * @param histories Histories of the previous prompts
   * @returns initialize system prompt
   * @default https://github.com/samchon/nestia/blob/master/packages/agent/prompts/initialize.md
   */
  initialize?: (histories: IWrtnAgentPrompt[]) => string;

  /**
   * Select system prompt.
   *
   * The {@link WrtnAgent} has a process selecting some candidate
   * functions to call by asking to the A.I. agent with the previous
   * prompt histories.
   *
   * In that case, this `select` system prompt would be used. You can
   * customize it by assigning this function with the given
   * {@link IWrtnAgentPrompt histories} parameter.
   *
   * Note that, the `"select"` means only the function selection. It does
   * not contain the filling argument or executing the function. It
   * literally contains only the selection process.
   *
   * @param histories Histories of the previous prompts
   * @returns select system promopt
   * @default https://github.com/samchon/nestia/blob/master/packages/agent/prompts/select.md
   */
  select?: (histories: IWrtnAgentPrompt[]) => string;

  /**
   * Cancel system prompt.
   *
   * The {@link WrtnAgent} has a process canceling some candidate
   * functions to call by asking to the A.I. agent with the previous
   * prompt histories.
   *
   * In that case, this `cancel` system prompt would be used. You can
   * customize it by assigning this function with the given
   * {@link IWrtnAgentPrompt histories} parameter.
   *
   * @param histories Histories of the previous prompts
   * @returns cancel system prompt
   * @default https://github.com/samchon/nestia/blob/master/packages/agent/prompts/cancel.md
   */
  cancel?: (histories: IWrtnAgentPrompt[]) => string;

  /**
   * Execute system prompt.
   *
   * The {@link WrtnAgent} has a process filling the arguments of some
   * selected candidate functions by the LLM (Large Language Model)
   * function calling feature with the previous prompt histories, and
   * executing the arguments filled function with validation feedback.
   *
   * In that case, this `execute` system prompt would be used. You can
   * customize it by assigning this function with the given
   * {@link IWrtnAgentPrompt histories} parameter.
   *
   * @param histories Histories of the previous prompts
   * @returns execute system prompt
   * https://github.com/samchon/nestia/blob/master/packages/agent/prompts/execute.md
   */
  execute?: (histories: IWrtnAgentPrompt[]) => string;

  /**
   * Describe system prompt.
   *
   * The {@link WrtnAgent} has a process describing the return values of
   * the executed functions by requesting to the A.I. agent with the
   * previous prompt histories.
   *
   * In that case, this `describe` system prompt would be used. You can
   * customize it by assigning this function with the given
   * {@link IWrtnAgentPrompt histories} parameter.
   *
   * @param histories Histories of the previous prompts
   * @returns describe system prompt
   * @default https://github.com/samchon/nestia/blob/master/packages/agent/prompts/describe.md
   */
  describe?: (histories: IWrtnAgentPrompt.IExecute[]) => string;
}
