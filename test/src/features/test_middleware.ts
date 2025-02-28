import { Agentica } from "@agentica/core";
import { TestValidator } from "@nestia/e2e";
import OpenAI from "openai";

import { TestGlobal } from "../TestGlobal";

export async function test_middleware(): Promise<void | false> {
  if (!TestGlobal.env.CHATGPT_API_KEY) return false;

  //----
  // PREPARATIONS
  //----
  const agent: Agentica = new Agentica({
    provider: {
      model: "gpt-4o-mini",
      api: new OpenAI({
        apiKey: TestGlobal.env.CHATGPT_API_KEY,
      }),
      type: "chatgpt",
    },
    controllers: [],
  });

  let i = 1;

  agent.use(function middleware_one(_ctx, next) {
    i = i + 1; // 2
    TestValidator.equals("called")(i)(2);
    next();
  });

  agent.use(function middleware_two(_ctx, next) {
    i = i * 2; // 4
    TestValidator.equals("called")(i)(4);
    next();
  });

  agent.use(async function middleware_three(_ctx, next) {
    i = i - 1; // 3
    TestValidator.equals("called")(i)(3);
    await next();
  });

  await agent.conversate("hi!");
}
