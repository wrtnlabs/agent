import { HttpLlm, OpenApi } from "@samchon/openapi";
import {
  IWrtnAgentOperation,
  WrtnAgent,
  WrtnAgentSelectBenchmark,
} from "@wrtnlabs/agent";
import fs from "fs";
import OpenAI from "openai";
import path from "path";

import { TestGlobal } from "../TestGlobal";

export const test_benchmark_select = async (): Promise<void> => {
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
  const benchmark: WrtnAgentSelectBenchmark = new WrtnAgentSelectBenchmark({
    agent,
    config: {
      repeat: 4,
    },
    scenarios: [
      {
        name: "order",
        text: [
          "I wanna see every sales in the shopping mall",
          "",
          "And then show me the detailed information about the Macbook.",
          "",
          "After that, select the most expensive stock",
          "from the Macbook, and put it into my shopping cart.",
          "",
          "At last, take the shopping cart to the order.",
        ].join("\n"),
        operations: [
          find("patch", "/shoppings/customers/sales"),
          find("get", "/shoppings/customers/sales/{id}"),
          find("post", "/shoppings/customers/orders"),
        ],
      },
    ],
  });
  await benchmark.execute();

  const docs: Record<string, string> = benchmark.report();
  const root: string = `${TestGlobal.ROOT}/test/docs/benchmarks/select`;

  await rmdir(root);
  for (const [key, value] of Object.entries(docs)) {
    await mkdir(path.join(root, key.split("/").slice(0, -1).join("/")));
    await fs.promises.writeFile(path.join(root, key), value, "utf8");
  }
};

const mkdir = async (str: string) => {
  try {
    await fs.promises.mkdir(str, {
      recursive: true,
    });
  } catch {}
};
const rmdir = async (str: string) => {
  try {
    await fs.promises.rm(str, {
      recursive: true,
    });
  } catch {}
};
