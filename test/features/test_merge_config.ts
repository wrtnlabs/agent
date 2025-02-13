import { IWrtnAgentPrompt, WrtnAgent } from "@wrtnlabs/agent";
import OpenAI from "openai";

import { IWrtnAdditionalAgent } from "../../src/structures/IWrtnAdditionalAgent";

export async function test_merge_config() {
  // 기본 설정으로 agent 생성
  const basicAgent = new WrtnAgent({
    provider: {
      model: "gpt-4",
      api: new OpenAI({
        apiKey: process.env.CHATGPT_API_KEY,
      }),
      type: "chatgpt",
    },
    controllers: [],
  });

  // 기본 설정이 올바르게 적용되었는지 확인
  const basicConfig = basicAgent.getConfig();
  if (!basicConfig.agentExecutePlan) {
    throw new Error("기본 agentExecutePlan이 없습니다");
  }

  // 커스텀 설정으로 agent 생성
  const customAgent = new WrtnAgent({
    provider: {
      model: "gpt-4",
      api: new OpenAI({
        apiKey: process.env.CHATGPT_API_KEY,
      }),
      type: "chatgpt",
    },
    controllers: [],
    config: {
      agentExecutePlan: {
        describe: {
          execute: () => [] as IWrtnAgentPrompt[],
        },
        new: {
          execute: () => [] as IWrtnAgentPrompt[],
        },
      } as const,
      a: "",
    },
  });

  // 커스텀 설정이 기본 설정과 올바르게 합성되었는지 확인
  const customConfig = customAgent.getConfig();
  if (!customConfig.agentExecutePlan) {
    throw new Error("커스텀 agentExecutePlan이 없습니다");
  }
}
