import { Primitive } from "typia";

import { IWrtnAdditionalAgent } from "./IWrtnAdditionalAgent";
import { IWrtnAgentConfig } from "./IWrtnAgentConfig";
import { IWrtnAgentController } from "./IWrtnAgentController";
import { IWrtnAgentPrompt } from "./IWrtnAgentPrompt";
import { IWrtnAgentProvider } from "./IWrtnAgentProvider";

/**
 * Properties of the Nestia Agent.
 *
 * `IWrtnAgentProps` is an interface that defines the properties
 * of the {@link WrtnAgent.constructor}. In the `IWrtnAgentProps`,
 * there're everything to prepare to create a Super A.I. chatbot
 * performing the LLM (Large Language Model) function calling.
 *
 * At first, you have to specify the LLM service {@link provider} like
 * OpenAI with its API key and client API. And then, you have to define
 * the {@link controllers} serving the functions to call. The controllers
 * are separated by two protocols; HTTP API and TypeScript class. At last,
 * you can {@link config configure} the agent by setting the locale, timezone,
 * and some of system prompts.
 *
 * Additionally, if you want to start from the previous A.I. chatbot
 * session, you can accomplish it by assigning the previous prompt
 * histories to the {@link histories} property.
 *
 * @author Samchon
 */
export interface IWrtnAgentProps<
  AgentExecutePlan extends Record<
    | keyof AgentExecutePlan
    | keyof typeof IWrtnAdditionalAgent.DEFAULT_CHATGPT_AGENT,
    IWrtnAdditionalAgent<
      | keyof AgentExecutePlan
      | keyof typeof IWrtnAdditionalAgent.DEFAULT_CHATGPT_AGENT
    >
  >,
> {
  /**
   * LLM service provider.
   */
  provider: IWrtnAgentProvider;

  /**
   * Controllers serving functions to call.
   */
  controllers: IWrtnAgentController[];

  /**
   * Configuration of agent.
   *
   * Configuration of A.I. chatbot agent including the user's locale,
   * timezone, and some of system prompts. Also, you can affect to the
   * LLM function selecting/calling logic by configuring additional
   * properties.
   *
   * If you don't configure this property, these values would be default.
   *
   * - `locale`: your system's locale and timezone
   * - `timezone`: your system's timezone
   * - `systemPrompt`: default prompts written in markdown
   *   - https://github.com/samchon/nestia/tree/master/packages/agent/prompts
   */
  config?: IWrtnAgentConfig<AgentExecutePlan>;

  /**
   * Prompt histories.
   *
   * If you're starting the conversation from an existing session,
   * assign the previouis prompt histories to this property.
   */
  histories?: Primitive<IWrtnAgentPrompt>[];
}
