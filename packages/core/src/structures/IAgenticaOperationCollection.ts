import { ILlmSchema } from "@samchon/openapi";

import { IAgenticaOperation } from "./IAgenticaOperation";

/**
 * Collection of operations used in the Nestia Agent.
 *
 * `IAgenticaOperationCollection` is an interface type representing
 * a collection of operations for several purposes used in the
 * {@link Agentica} internally.
 *
 * @author Samchon
 */
export interface IAgenticaOperationCollection<Model extends ILlmSchema.Model> {
  /**
   * List of every operations.
   */
  array: IAgenticaOperation<Model>[];

  /**
   * Divided operations.
   *
   * If you've configured the {@link IAgenticaConfig.capacity} property,
   * the  A.I. chatbot ({@link Agentica}) will separate the operations
   * into the several groups to divide and conquer and LLM function selecting
   * for accuracy.
   *
   * In that case, this property `divided`'s length would be dtermined by
   * dividing the number of operations ({@link array}'s length) by the
   * {@link IAgenticaConfig.capacity}.
   *
   * Otherwise, if the {@link IAgenticaConfig.capacity} has not been
   * configured, this `divided` property would be the `undefined` value.
   */
  divided?: IAgenticaOperation<Model>[][] | undefined;

  /**
   * Flat dictionary of operations.
   *
   * Dictionary of operations with their {@link IAgenticaOperation.name}.
   */
  flat: Map<string, IAgenticaOperation<Model>>;

  /**
   * Group dictionary of operations.
   *
   * Dictionary of operations with their
   * {@link IAgenticaOperation.controller.name} and
   * {@link IAgenticaOperation.function.name}.
   */
  group: Map<string, Map<string, IAgenticaOperation<Model>>>;
}
