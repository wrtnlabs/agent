import {
  IWrtnAgentContext,
  IWrtnAgentPrompt,
  WrtnAgent,
} from "@wrtnlabs/agent";
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
  if (!("agentExecutePlan" in basicConfig)) {
    throw new Error("기본 agentExecutePlan이 없습니다");
  }

  // DEFAULT_CHATGPT_AGENT의 모든 기본 상태가 존재하는지 확인
  const defaultStates: IWrtnAdditionalAgent.DefaultAgentName[] = [
    "initialize",
    "select",
    "execute",
    "describe",
    "canceled",
    "end",
  ];

  for (const state of defaultStates) {
    if (!basicAgent) {
      break;
    }
    if (!basicConfig.agentExecutePlan) {
      break;
    }

    if (!(state in basicConfig.agentExecutePlan)) {
      throw new Error(`기본 상태 "${state}"가 누락되었습니다`);
    }
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
          nextAgent:
            IWrtnAdditionalAgent.DEFAULT_CHATGPT_AGENT.describe.nextAgent,
        },
        new: {
          execute: () => [] as IWrtnAgentPrompt[],
          nextAgent: () => "describe" as const,
        },
      },
    },
  });

  // 커스텀 설정이 기본 설정과 올바르게 합성되었는지 확인
  const customConfig = customAgent.getConfig();
  if (!("agentExecutePlan" in customConfig)) {
    throw new Error("커스텀 agentExecutePlan이 없습니다");
  }

  // 1. 기본 상태들이 모두 유지되는지 확인
  for (const state of defaultStates) {
    if (!customConfig.agentExecutePlan) {
      break;
    }
    if (!(state in customConfig.agentExecutePlan)) {
      throw new Error(`커스텀 설정 후 기본 상태 "${state}"가 누락되었습니다`);
    }
  }

  // 2. 커스텀 상태 'new'가 추가되었는지 확인
  if (
    customConfig.agentExecutePlan &&
    !("new" in customConfig.agentExecutePlan)
  ) {
    throw new Error("커스텀 상태 'new'가 추가되지 않았습니다");
  }

  // 3. describe 상태가 올바르게 오버라이드되었는지 확인
  const customDescribe = customConfig?.agentExecutePlan?.["describe"];
  if (!customDescribe) {
    throw new Error("커스텀 describe가 없습니다");
  }
  const customDescribeResult = await customDescribe.execute(
    {} as IWrtnAgentContext, // mock context
    [], // mock previous result
    [], // mock histories
  );

  if (customDescribeResult.length !== 0) {
    throw new Error("커스텀 describe.execute가 적용되지 않았습니다");
  }

  // 4. describe의 nextAgent는 기본값을 유지하는지 확인
  const defaultDescribeNextAgent =
    IWrtnAdditionalAgent.DEFAULT_CHATGPT_AGENT.describe.nextAgent;
  if (customDescribe.nextAgent !== defaultDescribeNextAgent) {
    throw new Error("describe.nextAgent가 기본값을 유지하지 않습니다");
  }

  // 5. new 상태의 nextAgent가 "describe"를 반환하는지 확인
  const newStateNextAgent = customConfig?.agentExecutePlan?.["new"]?.nextAgent;
  if (!newStateNextAgent) {
    throw new Error("커스텀 new 상태의 nextAgent가 없습니다");
  }
  const nextState = await newStateNextAgent({} as IWrtnAgentContext, [], []);
  if (nextState !== "describe") {
    throw new Error(
      `new 상태의 nextAgent가 "describe"를 반환하지 않습니다. 반환값: ${nextState}`,
    );
  }

  return await Promise.resolve();
}
