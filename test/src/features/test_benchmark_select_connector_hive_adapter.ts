import { AgenticaSelectBenchmark } from "@agentica/benchmark";
import { ConnectorHiveAdapter } from "@agentica/connector-hive-adapter";
import { Agentica, IAgenticaOperation } from "@agentica/core";
import { HttpLlm, IHttpConnection, OpenApi } from "@samchon/openapi";
import fs from "fs";
import OpenAI from "openai";
import path from "path";

import { TestGlobal } from "../TestGlobal";

export const test_benchmark_select_connector_hive_adapter = async (): Promise<
  void | false
> => {
  if (!TestGlobal.env.CHATGPT_API_KEY) return false;
  if (
    !(
      await fetch(
        `http://localhost:${TestGlobal.connectorHivePort}/health`,
      ).catch(() => ({ ok: false }))
    ).ok
  ) {
    return false;
  }

  const connection: IHttpConnection = {
    host: `https://shopping-be.wrtn.ai`,
  };
  const { selectorExecute } = ConnectorHiveAdapter.boot<"chatgpt">(
    `http://localhost:${TestGlobal.connectorHivePort}`,
  );

  const agent: Agentica<"chatgpt"> = new Agentica({
    model: "chatgpt",
    vendor: {
      model: "gpt-4o-mini",
      api: new OpenAI({
        apiKey: process.env.CHATGPT_API_KEY,
      }),
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
        connection,
      },
    ],
    config: {
      executor: {
        select: selectorExecute,
      },
    },
  });

  const find = (
    method: OpenApi.Method,
    path: string,
  ): IAgenticaOperation<"chatgpt"> => {
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
  const benchmark: AgenticaSelectBenchmark<"chatgpt"> =
    new AgenticaSelectBenchmark({
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
            "And take the shopping cart to the order.",
            "",
            "At last, I'll publish it by cash payment, and my address is",
            "",
            "  - country: South Korea",
            "  - city/province: Seoul",
            "  - department: Wrtn Apartment",
            "  - Possession: 101-1411",
          ].join("\n"),
          expected: {
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
                    type: "standalone",
                    operation: find("post", "/shoppings/customers/orders"),
                  },
                  {
                    type: "standalone",
                    operation: find(
                      "post",
                      "/shoppings/customers/orders/direct",
                    ),
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
          },
        },
      ],
    });
  await benchmark.execute();

  const docs: Record<string, string> = benchmark.report();
  const root: string = `${TestGlobal.ROOT}/docs/benchmarks/select`;

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
