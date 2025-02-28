import OpenAI from "openai";

import { ChatGptAgent } from "./chatgpt/ChatGptAgent";
import { AgenticaOperationComposer } from "./internal/AgenticaOperationComposer";
import { AgenticaPromptTransformer } from "./internal/AgenticaPromptTransformer";
import { AgenticaTokenUsageAggregator } from "./internal/AgenticaTokenUsageAggregator";
import { __map_take } from "./internal/__map_take";
import { IAgenticaConfig } from "./structures/IAgenticaConfig";
import { IAgenticaContext } from "./structures/IAgenticaContext";
import { IAgenticaController } from "./structures/IAgenticaController";
import { IAgenticaEvent } from "./structures/IAgenticaEvent";
import { IAgenticaOperation } from "./structures/IAgenticaOperation";
import { IAgenticaOperationCollection } from "./structures/IAgenticaOperationCollection";
import { IAgenticaOperationSelection } from "./structures/IAgenticaOperationSelection";
import { IAgenticaPrompt } from "./structures/IAgenticaPrompt";
import { IAgenticaProps } from "./structures/IAgenticaProps";
import { IAgenticaProvider } from "./structures/IAgenticaProvider";
import { IAgenticaTokenUsage } from "./structures/IAgenticaTokenUsage";

/**
 * Defines a middleware function that processes the request context before passing control to the next middleware.
 *
 * - Each middleware receives the current `ctx` (context) and can modify it as needed.
 * - The `next` function must be called to continue execution; if not called, the chain will stop at the current middleware.
 * - Since `ctx` is shared, a middleware can modify response-related properties without intercepting the `next` function’s return value.
 */
type Middleware = (
  /**
   * The context object for the current request, containing relevant data
   * that middleware functions can read or modify.
   */
  ctx: IAgenticaContext,

  /**
   * A function that passes control to the next middleware in the chain.
   *
   * - Must be called to continue execution; otherwise, the chain will stop.
   * - Returns a `Promise<void>`, so it should be awaited (`await next()`).
   * - Middleware should not modify the return value of `next()`, as response modifications
   *   should be done directly through `ctx`.
   */
  next: () => Promise<void>,
) => Promise<void> | void;

/**
 * Nestia A.I. chatbot agent.
 *
 * `Agentica` is a facade class for the super A.I. chatbot agent
 * which performs the {@link conversate user's conversation function}
 * with LLM (Large Language Model) function calling and manages the
 * {@link getPromptHistories prompt histories}.
 *
 * To understand and compose the `Agentica` class exactly, reference
 * below types concentrating on the documentation comments please.
 * Especially, you have to be careful about the {@link IAgenticaProps}
 * type which is used in the {@link constructor} function.
 *
 * - Constructors
 *   - {@link IAgenticaProps}
 *   - {@link IAgenticaProvider}
 *   - {@link IAgenticaController}
 *   - {@link IAgenticaConfig}
 *   - {@link IAgenticaSystemPrompt}
 * - Accessors
 *   - {@link IAgenticaOperation}
 *   - {@link IAgenticaPrompt}
 *   - {@link IAgenticaEvent}
 *   - {@link IAgenticaTokenUsage}
 *
 * @author Samchon
 */
export class Agentica {
  // THE OPERATIONS
  private readonly operations_: IAgenticaOperationCollection;

  // STACK
  private readonly stack_: IAgenticaOperationSelection[];
  private readonly prompt_histories_: IAgenticaPrompt[];
  private readonly listeners_: Map<string, Set<Function>>;
  private readonly middlewares_: Map<string, Set<Middleware>>;

  // STATUS
  private readonly token_usage_: IAgenticaTokenUsage;
  private ready_: boolean;
  private readonly executor_: (
    ctx: IAgenticaContext,
  ) => Promise<IAgenticaPrompt[]>;

  /* -----------------------------------------------------------
    CONSTRUCTOR
  ----------------------------------------------------------- */
  /**
   * Initializer constructor.
   *
   * @param props Properties to construct the agent
   */
  public constructor(private readonly props: IAgenticaProps) {
    // OPERATIONS
    this.operations_ = AgenticaOperationComposer.compose({
      controllers: props.controllers,
      config: props.config,
    });

    // STATUS
    this.stack_ = [];
    this.listeners_ = new Map();
    this.middlewares_ = new Map();
    this.prompt_histories_ = (props.histories ?? []).map((input) =>
      AgenticaPromptTransformer.transform({
        operations: this.operations_.group,
        input,
      }),
    );

    // STATUS
    this.token_usage_ = AgenticaTokenUsageAggregator.zero();
    this.ready_ = false;
    this.executor_ =
      typeof props.config?.executor === "function"
        ? props.config.executor
        : ChatGptAgent.execute(props.config?.executor ?? null);
  }

  /**
   * @internal
   */
  public clone(): Agentica {
    return new Agentica({
      ...this.props,
      histories: this.props.histories?.slice(),
    });
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
   * function calling information like {@link IAgenticaPrompt.IExecute}.
   *
   * @param content The content to talk
   * @returns List of newly created chat prompts
   */
  public async conversate(content: string): Promise<IAgenticaPrompt[]> {
    const prompt: IAgenticaPrompt.IText<"user"> = {
      type: "text",
      role: "user",
      text: content,
    };
    await this.dispatch(prompt);
    const context = this.getContext({ prompt, usage: this.token_usage_ });

    const CONVERSATE = "conversate" as const;
    const middlewares = this.middlewares_.get(CONVERSATE);
    if (middlewares) {
      await Array.from(middlewares).reduce((acc, cur) => {
        return this.middlewareCompose(acc, cur);
      })(context, async () => {});
    }

    const newbie: IAgenticaPrompt[] = await this.executor_(context);
    this.prompt_histories_.push(prompt, ...newbie);
    return [prompt, ...newbie];
  }

  /**
   * Get configuration.
   */
  public getConfig(): IAgenticaConfig | undefined {
    return this.props.config;
  }

  /**
   * Get LLM Provider.
   */
  public getProvider(): IAgenticaProvider {
    return this.props.provider;
  }

  /**
   * Get controllers.
   *
   * Get list of controllers, which are the collection of functions that
   * the "Super A.I. Chatbot" can execute.
   */
  public getControllers(): ReadonlyArray<IAgenticaController> {
    return this.props.controllers;
  }

  /**
   * Get operations.
   *
   * Get list of operations, which has capsuled the pair of controller
   * and function from the {@link getControllers controllers}.
   *
   * @returns
   */
  public getOperations(): ReadonlyArray<IAgenticaOperation> {
    return this.operations_.array;
  }

  /**
   * Get the chatbot's prompt histories.
   *
   * Get list of chat prompts that the chatbot has been conversated.
   *
   * @returns List of chat prompts
   */
  public getPromptHistories(): IAgenticaPrompt[] {
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
  public getTokenUsage(): IAgenticaTokenUsage {
    return this.token_usage_;
  }

  /**
   * @internal
   */
  public getContext(props: {
    prompt: IAgenticaPrompt.IText<"user">;
    usage: IAgenticaTokenUsage;
  }): IAgenticaContext {
    const dispatch = (event: IAgenticaEvent) => this.dispatch(event);
    return {
      // APPLICATION
      operations: this.operations_,
      config: this.props.config,

      // STATES
      histories: this.prompt_histories_,
      stack: this.stack_,
      ready: () => this.ready_,
      prompt: props.prompt,

      // HANDLERS
      dispatch: (event) => this.dispatch(event),
      request: async (kind, body) => {
        // request information
        const event: IAgenticaEvent.IRequest = {
          type: "request",
          source: kind,
          body: {
            ...body,
            model: this.props.provider.model,
          },
          options: this.props.provider.options,
        };
        await dispatch(event);

        // completion
        const completion: OpenAI.ChatCompletion =
          await this.props.provider.api.chat.completions.create(
            event.body,
            event.options,
          );
        AgenticaTokenUsageAggregator.aggregate({
          kind,
          completion,
          usage: props.usage,
        });
        await dispatch({
          type: "response",
          source: kind,
          body: event.body,
          options: event.options,
          value: completion,
        });
        return completion;
      },
      initialize: async () => {
        this.ready_ = true;
        await dispatch({
          type: "initialize",
        });
      },
    };
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
  public on<Type extends IAgenticaEvent.Type>(
    type: Type,
    listener: (event: IAgenticaEvent.Mapper[Type]) => void | Promise<void>,
  ): this {
    __map_take(this.listeners_, type, () => new Set()).add(listener);
    return this;
  }

  /**
   * Erase an event listener.
   *
   * Erase an event listener to stop calling the callback function.
   *
   * @param type Type of event
   * @param listener Callback function to erase
   */
  public off<Type extends IAgenticaEvent.Type>(
    type: Type,
    listener: (event: IAgenticaEvent.Mapper[Type]) => void | Promise<void>,
  ): this {
    const set = this.listeners_.get(type);
    if (set) {
      set.delete(listener);
      if (set.size === 0) this.listeners_.delete(type);
    }
    return this;
  }

  /**
   * Registers a middleware function to be executed before {@link conversate user's conversation function} is called.
   *
   * - Middlewares are executed in the order they are registered.
   * - Each middleware receives the context and a `next` function to pass control to the next middleware.
   * - If a middleware does not call `next()`, execution will stop at that middleware.
   * - To ensure proper async handling, use `await next()` when calling `next()`.
   *
   * @param middleware The middleware function to be added to the execution chain.
   */
  use(middleware: Middleware): void;
  public use(middleware: Middleware) {
    const type = "conversate" as const;
    __map_take(this.middlewares_, type, () => new Set()).add(middleware);
  }

  private async dispatch<Event extends IAgenticaEvent>(
    event: Event,
  ): Promise<void> {
    const set = this.listeners_.get(event.type);
    if (set) {
      await Promise.all(
        Array.from(set).map(async (listener) => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            await listener(event);
          } catch {
            /* empty */
          }
        }),
      );
    }
  }

  private middlewareCompose(a: Middleware, b: Middleware): Middleware {
    return async (ctx, next) => {
      await a(ctx, async () => {
        await b(ctx, next);
      });
    };
  }
}
