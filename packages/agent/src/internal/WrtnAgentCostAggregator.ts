import OpenAI from "openai";

import { IWrtnAgentTokenUsage } from "../structures/IWrtnAgentTokenUsage";

export namespace WrtnAgentCostAggregator {
  export const aggregate = (
    cost: IWrtnAgentTokenUsage,
    completion: OpenAI.ChatCompletion,
  ): void => {
    if (!completion.usage) return;

    // TOTAL
    cost.total += completion.usage.total_tokens;

    // PROMPT
    cost.prompt.total += completion.usage.prompt_tokens;
    cost.prompt.audio +=
      completion.usage.prompt_tokens_details?.audio_tokens ?? 0;
    cost.prompt.cached +=
      completion.usage.prompt_tokens_details?.cached_tokens ?? 0;

    // COMPLETION
    cost.completion.total += completion.usage.total_tokens;
    cost.completion.accepted_prediction +=
      completion.usage.completion_tokens_details?.accepted_prediction_tokens ??
      0;
    cost.completion.audio +=
      completion.usage.completion_tokens_details?.audio_tokens ?? 0;
    cost.completion.reasoning +=
      completion.usage.completion_tokens_details?.reasoning_tokens ?? 0;
    cost.completion.rejected_prediction +=
      completion.usage.completion_tokens_details?.rejected_prediction_tokens ??
      0;
  };
}
