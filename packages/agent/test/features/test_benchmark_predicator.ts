import { TestValidator } from "@nestia/e2e";
import { HttpLlm, OpenApi } from "@samchon/openapi";
import {
  IWrtnAgentBenchmarkExpected,
  IWrtnAgentOperation,
  WrtnAgent,
} from "@wrtnlabs/agent";
import { WrtnAgentBenchmarkPredicator } from "@wrtnlabs/agent/lib/benchmark/common/WrtnAgentBenchmarkPredicator";
import OpenAI from "openai";

export const test_benchmark_predicator = async (): Promise<void> => {
  const agent: WrtnAgent = new WrtnAgent({
    provider: {
      model: "gpt-4o-mini",
      api: new OpenAI({
        apiKey: process.env.CHATGPT_API_KEY,
      }),
      type: "chatgpt",
    },
    controllers: [
      {
        protocol: "http",
        name: "shopping",
        application: HttpLlm.application({
          model: "chatgpt",
          document: await fetch(
            "https://shopping-be.wrtn.ai/editor/swagger.json",
          ).then((res) => res.json()),
        }),
        connection: {
          host: "https://shopping-be.wrtn.ai",
        },
      },
    ],
  });

  const find = (method: OpenApi.Method, path: string): IWrtnAgentOperation => {
    const found = agent
      .getOperations()
      .find(
        (op) =>
          op.protocol === "http" &&
          op.function.method === method &&
          op.function.path === path,
      );
    if (!found) throw new Error(`Operation not found: ${method} ${path}`);
    return found;
  };

  const expected: IWrtnAgentBenchmarkExpected = {
    type: "array",
    items: [
      {
        type: "standalone",
        operation: find("patch", "/shoppings/customers/sales"),
      },
      {
        type: "standalone",
        operation: find("get", "/shoppings/customers/sales/{id}"),
      },
      {
        type: "anyOf",
        anyOf: [
          {
            type: "array",
            items: [
              {
                type: "standalone",
                operation: find(
                  "post",
                  "/shoppings/customers/carts/commodities",
                ),
              },
              {
                type: "standalone",
                operation: find("post", "/shoppings/customers/orders"),
              },
            ],
          },
          {
            type: "standalone",
            operation: find("post", "/shoppings/customers/orders/direct"),
          },
        ],
      },
      {
        type: "standalone",
        operation: find(
          "post",
          "/shoppings/customers/orders/{orderId}/publish",
        ),
      },
    ],
  };

  const result: boolean = WrtnAgentBenchmarkPredicator.success({
    expected,
    operations: [
      find("patch", "/shoppings/customers/sales"),
      find("get", "/shoppings/customers/sales/{id}"),
      find("post", "/shoppings/customers/carts/commodities"),
      find("post", "/shoppings/customers/orders"),
      find("post", "/shoppings/customers/orders/{orderId}/publish"),
    ],
    strict: false,
  });
  TestValidator.equals("success")(result)(true);
};
