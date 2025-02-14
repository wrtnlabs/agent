import OpenAI from "openai";

import { ChatGptAgent } from "./chatgpt/ChatGptAgent";
import { WrtnAgentCostAggregator } from "./internal/WrtnAgentCostAggregator";
import { WrtnAgentOperationComposer } from "./internal/WrtnAgentOperationComposer";
import { WrtnAgentPromptTransformer } from "./internal/WrtnAgentPromptTransformer";
import { __map_take } from "./internal/__map_take";
import { IWrtnAdditionalAgent } from "./structures/IWrtnAdditionalAgent";
import { IWrtnAgentConfig } from "./structures/IWrtnAgentConfig";
import { IWrtnAgentController } from "./structures/IWrtnAgentController";
import { IWrtnAgentEvent } from "./structures/IWrtnAgentEvent";
import { IWrtnAgentOperationCollection } from "./structures/IWrtnAgentOperationCollection";
import { IWrtnAgentOperationSelection } from "./structures/IWrtnAgentOperationSelection";
import { IWrtnAgentPrompt } from "./structures/IWrtnAgentPrompt";
import { IWrtnAgentProps } from "./structures/IWrtnAgentProps";
import { IWrtnAgentProvider } from "./structures/IWrtnAgentProvider";
import { IWrtnAgentTokenUsage } from "./structures/IWrtnAgentTokenUsage";

/**
 * Nestia A.I. chatbot agent.
 *
 * `WrtnChatAgent` is a facade class for the super A.I. chatbot agent
 * which performs the {@link converstate user's conversation function}
 * with LLM (Large Language Model) function calling and manages the
 * {@link getPromptHistories prompt histories}.
 *
 * To understand and compose the `WrtnAgent` class exactly, reference
 * below types concentrating on the documentation comments please.
 * Especially, you have to be careful about the {@link IWrtnAgentProps}
 * type which is used in the {@link constructor} function.
 *
 * - Constructors
 *   - {@link IWrtnAgentProps}
 *   - {@link IWrtnAgentProvider}
 *   - {@link IWrtnAgentController}
 *   - {@link IWrtnAgentConfig}
 *   - {@link IWrtnAgentSystemPrompt}
 * - Accessors
 *   - {@link IWrtnAgentOperation}
 *   - {@link IWrtnAgentPrompt}
 *   - {@link IWrtnAgentEvent}
 *   - {@link IWrtnAgentTokenUsage}
 *
 * @author Samchon
 */
export class WrtnAgent {
  // THE OPERATIONS
  private readonly operations_: IWrtnAgentOperationCollection;

  // STACK
  private readonly stack_: IWrtnAgentOperationSelection[];
  private readonly prompt_histories_: IWrtnAgentPrompt[];
  private readonly listeners_: Map<
    string,
    Set<(event: IWrtnAgentEvent) => void | Promise<void>>
  >;
  private readonly config_: IWrtnAgentConfig;

  // STATUS
  private readonly token_usage_: IWrtnAgentTokenUsage;
  private ready_: boolean;

  /* -----------------------------------------------------------
    CONSTRUCTOR
  ----------------------------------------------------------- */
  /**
   * Initializer constructor.
   *
   * @param props Properties to construct the agent
   */
  public constructor(private readonly props: IWrtnAgentProps) {
    // OPERATIONS
    this.config_ = {
      ...props.config,
      agentExecutePlan: Object.assign(
        {},
        props.config?.agentExecutePlan ?? {},
        Object.entries(IWrtnAdditionalAgent.DEFAULT_CHATGPT_AGENT).reduce(
          (acc, [key, value]) => {
            acc[key] = Object.assign(
              {},
              value,
              props.config?.agentExecutePlan?.[key] ?? {},
            );
            return acc;
          },
          {} as Record<string, IWrtnAdditionalAgent<string>>,
        ),
      ),
    };

    this.operations_ = WrtnAgentOperationComposer.compose({
      controllers: props.controllers,
      config: this.config_,
    });

    // STATUS
    this.stack_ = [];
    this.listeners_ = new Map();
    this.prompt_histories_ = (props.histories ?? []).map((input) =>
      WrtnAgentPromptTransformer.transform({
        operations: this.operations_.group,
        input,
      }),
    );

    // STATUS
    this.token_usage_ = {
      total: 0,
      prompt: {
        total: 0,
        audio: 0,
        cached: 0,
      },
      completion: {
        total: 0,
        accepted_prediction: 0,
        audio: 0,
        reasoning: 0,
        rejected_prediction: 0,
      },
    };
    this.ready_ = false;
  }

  /* -----------------------------------------------------------
    ACCESSORS
  ----------------------------------------------------------- */
  /**
   * Conversate with the A.I. chatbot.
   *
   * User talks to the A.I. chatbot with the content.
   *
   * When the user's conversation implies the A.I. chatbot to execute a
   * function calling, the returned chat prompts will contain the
   * function calling information like {@link IWrtnAgentPrompt.IExecute}.
   *
   * @param content The content to talk
   * @returns List of newly created chat prompts
   */
  public async conversate(content: string): Promise<IWrtnAgentPrompt[]> {
    const prompt: IWrtnAgentPrompt.IText = {
      type: "text",
      role: "user",
      text: content,
    };
    await this.dispatch(prompt);

    const newbie: IWrtnAgentPrompt[] = await ChatGptAgent.execute({
      // APPLICATION
      operations: this.operations_,
      config: this.config_,

      // STATES
      histories: this.prompt_histories_,
      stack: this.stack_,
      ready: () => this.ready_,
      prompt,

      // HANDLERS
      dispatch: (event) => this.dispatch(event),
      request: async (source, body) => {
        // request information
        const event: IWrtnAgentEvent.IRequest = {
          type: "request",
          source,
          body: {
            ...body,
            model: this.props.provider.model,
          },
          options: this.props.provider.options,
        };

        // completion
        const value: OpenAI.ChatCompletion =
          await this.props.provider.api.chat.completions.create(
            event.body,
            event.options,
          );
        WrtnAgentCostAggregator.aggregate(this.token_usage_, value);
        await this.dispatch({
          type: "response",
          source,
          body: event.body,
          options: event.options,
          value,
        });
        return value;
      },
      initialize: async () => {
        this.ready_ = true;
        await this.dispatch({
          type: "initialize",
        });
      },
    });
    this.prompt_histories_.push(prompt, ...newbie);
    return [prompt, ...newbie];
  }

  /**
   * Get configuration.
   */
  public getConfig(): IWrtnAgentConfig {
    return this.config_;
  }

  /**
   * Get LLM Provider.
   */
  public getProvider(): IWrtnAgentProvider {
    return this.props.provider;
  }

  /**
   * Get controllers.
   *
   * Get list of controllers, which are the collection of functions that
   * the "Super A.I. Chatbot" can execute.
   */
  public getControllers(): ReadonlyArray<IWrtnAgentController> {
    return this.props.controllers;
  }

  /**
   * Get the chatbot's prompt histories.
   *
   * Get list of chat prompts that the chatbot has been conversated.
   *
   * @returns List of chat prompts
   */
  public getPromptHistories(): IWrtnAgentPrompt[] {
    return this.prompt_histories_;
  }

  /**
   * Get token usage of the A.I. chatbot.
   *
   * Entire token usage of the A.I. chatbot during the conversating
   * with the user by {@link conversate} method callings.
   *
   * @returns Cost of the A.I. chatbot
   */
  public getTokenUsage(): IWrtnAgentTokenUsage {
    return this.token_usage_;
  }

  /* -----------------------------------------------------------
    EVENT HANDLERS
  ----------------------------------------------------------- */
  /**
   * Add an event listener.
   *
   * Add an event listener to be called whenever the event is emitted.
   *
   * @param type Type of event
   * @param listener Callback function to be called whenever the event is emitted
   */
  public on<Type extends IWrtnAgentEvent.Type>(
    type: Type,
    listener: (event: IWrtnAgentEvent.Mapper[Type]) => void | Promise<void>,
  ): void {
    __map_take(this.listeners_, type, () => new Set()).add(
      listener as (event: IWrtnAgentEvent) => void | Promise<void>,
    );
  }

  /**
   * Erase an event listener.
   *
   * Erase an event listener to stop calling the callback function.
   *
   * @param type Type of event
   * @param listener Callback function to erase
   */
  public off<Type extends IWrtnAgentEvent.Type>(
    type: Type,
    listener: (event: IWrtnAgentEvent.Mapper[Type]) => void | Promise<void>,
  ): void {
    const set:
      | Set<(event: IWrtnAgentEvent.Mapper[Type]) => void | Promise<void>>
      | undefined = this.listeners_.get(type);
    if (set) {
      set.delete(listener);
      if (set.size === 0) this.listeners_.delete(type);
    }
  }

  private async dispatch<Event extends IWrtnAgentEvent>(
    event: Event,
  ): Promise<void> {
    const set: Set<(event: Event) => void | Promise<void>> | undefined =
      this.listeners_.get(event.type);
    if (set)
      await Promise.all(
        Array.from(set).map(async (listener) => {
          try {
            await listener(event);
          } catch {
            return;
          }
        }),
      );
  }
}
