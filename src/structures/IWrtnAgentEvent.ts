import OpenAI from "openai";

import { WrtnAgentSource } from "../typings/WrtnAgentSource";
import { IWrtnAgentOperation } from "./IWrtnAgentOperation";
import { IWrtnAgentPrompt } from "./IWrtnAgentPrompt";

/**
 * Nestia A.I. chatbot event.
 *
 * `IWrtnAgentEvent` is an union type of all possible events that can
 * be emitted by the A.I. chatbot of the {@link WrtnAgent} class. You
 * can discriminate the subtype by checking the {@link type} property.
 *
 * @author Samchon
 */
export type IWrtnAgentEvent<T extends IWrtnAgentEvent.IBase<string> = never> =
  | IWrtnAgentEvent.Mapper[keyof IWrtnAgentEvent.Mapper]
  | T;
export namespace IWrtnAgentEvent {
  export type Type = Mapper[keyof Mapper]["type"];
  export type Mapper = {
    initialize: IInitialize;
    select: ISelect;
    cancel: ICancel;
    call: ICall;
    execute: IExecute;
    describe: IDescribe;
    text: IText;
    request: IRequest;
    response: IResponse;
  };

  /**
   * Event of initializing the chatbot.
   */
  export interface IInitialize extends IBase<"initialize"> {}

  /**
   * Event of selecting a function to call.
   */
  export interface ISelect extends IBase<"select"> {
    /**
     * Selected operation.
     *
     * Operation that has been selected to prepare LLM function calling.
     */
    operation: IWrtnAgentOperation;

    /**
     * Reason of selecting the function.
     *
     * The A.I. chatbot will fill this property describing why the function
     * has been selected.
     */
    reason: string;
  }

  /**
   * Event of canceling a function calling.
   */
  export interface ICancel extends IBase<"cancel"> {
    /**
     * Selected operation to cancel.
     *
     * Operation that has been selected to prepare LLM function calling,
     * but canceled due to no more required.
     */
    operation: IWrtnAgentOperation;

    /**
     * Reason of selecting the function.
     *
     * The A.I. chatbot will fill this property describing why the function
     * has been cancelled.
     *
     * For reference, if the A.I. chatbot successfully completes the LLM
     * function calling, the reason of the function cancellation will be
     * "complete".
     */
    reason: string;
  }

  /**
   * Event of calling a function.
   */
  export interface ICall extends IBase<"call"> {
    /**
     * ID of the tool calling.
     */
    id: string;

    /**
     * Target operation to call.
     */
    operation: IWrtnAgentOperation;

    /**
     * Arguments of the function calling.
     *
     * If you modify this {@link arguments} property, it actually modifies
     * the backend server's request. Therefore, be careful when you're
     * trying to modify this property.
     */
    arguments: object;
  }

  /**
   * Event of function calling execution.
   */
  export interface IExecute extends IBase<"execute"> {
    /**
     * ID of the tool calling.
     */
    id: string;

    /**
     * Target operation had called.
     */
    operation: IWrtnAgentOperation;

    /**
     * Arguments of the function calling.
     */
    arguments: object;

    /**
     * Return value.
     */
    value: any;
  }

  /**
   * Event of description.
   *
   * Event describing return values of LLM function callings.
   */
  export interface IDescribe extends IBase<"describe"> {
    /**
     * Executions of the LLM function calling.
     *
     * This prompt describes the return value of them.
     */
    executions: IWrtnAgentPrompt.IExecute[];

    /**
     * Description text.
     */
    text: string;
  }

  /**
   * Event of text message.
   */
  export interface IText extends IBase<"text"> {
    /**
     * Role of the orator.
     */
    role: "assistant" | "user";

    /**
     * The text content.
     */
    text: string;
  }

  /**
   * Request event of LLM provider API.
   */
  export interface IRequest extends IBase<"request"> {
    /**
     * The source agent of the request.
     */
    source: WrtnAgentSource;

    /**
     * Request body.
     */
    body: OpenAI.ChatCompletionCreateParamsNonStreaming;

    /**
     * Options for the request.
     */
    options?: OpenAI.RequestOptions | undefined;
  }

  /**
   * Response event of LLM provider API.
   */
  export interface IResponse extends IBase<"response"> {
    /**
     * The source agent of the response.
     */
    source: WrtnAgentSource;

    /**
     * Request body.
     */
    body: OpenAI.ChatCompletionCreateParamsNonStreaming;

    /**
     * Options for the request.
     */
    options?: OpenAI.RequestOptions | undefined;

    /**
     * Return value from the LLM provider API.
     */
    value: OpenAI.ChatCompletion;
  }

  export interface IBase<Type extends string> {
    /**
     * Discriminator type.
     */
    type: Type;
  }
}
