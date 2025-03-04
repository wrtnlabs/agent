import { IAgenticaContext } from "@agentica/core/src/structures/IAgenticaContext";
import { IAgenticaPrompt } from "@agentica/core/src/structures/IAgenticaPrompt";
import { ILlmSchema } from "@samchon/openapi";

import { IMicroAgenticaExecutor } from "../structures/IMicroAgenticaExecutor";

export namespace ChatGptAgent {
  export const execute =
    <Model extends ILlmSchema.Model>(
      executor: Partial<IMicroAgenticaExecutor<Model>> | null,
    ) =>
    async (ctx: IAgenticaContext<Model>): Promise<IAgenticaPrompt<Model>[]> => {
      const histories: IAgenticaPrompt<Model>[] = await (
        executor?.call ?? ChatGptCallFunctionAgent.execute
      )(ctx);

      return histories;
    };
}
