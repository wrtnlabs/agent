import {
  IAgenticaContext,
  IAgenticaOperation,
  IAgenticaPrompt,
} from "@agentica/core";
import { ILlmSchema } from "@samchon/openapi";
import {
  HttpError,
  IConnection,
  functional,
} from "@wrtnlabs/connector-hive-api";

const useEmbeddedContext = <SchemaModel extends ILlmSchema.Model>() => {
  const set = new Set<IAgenticaContext<SchemaModel>>();
  return [
    (ctx: IAgenticaContext<SchemaModel>) => set.has(ctx),
    (ctx: IAgenticaContext<SchemaModel>) => {
      set.add(ctx);
    },
  ] as const;
};

export namespace ConnectorHiveAdapter {
  export const boot = <SchemaModel extends ILlmSchema.Model>(
    connectorHiveHost: string,

    // @TODO apply option
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options?: {
      cache?: {
        version:
          | number
          | {
              [key: string]: number;
            };
      };
    },
  ) => {
    const connection: IConnection = { host: connectorHiveHost };
    const [isEmbeddedContext, setEmbeddedContext] =
      useEmbeddedContext<SchemaModel>();
    const embedOperation = async (op: IAgenticaOperation<SchemaModel>) => {
      const application = await functional.applications.by_names
        .getByName(connection, op.controller.name)
        .catch(async (e) => {
          if (!(e instanceof HttpError)) {
            throw e;
          }
          if (e.status !== 404) throw e;

          return await functional.applications.create(
            { host: connectorHiveHost },
            {
              name: op.controller.name,
              description: undefined,
            },
          );
        });
      const latestVersion = await functional.applications.by_ids.versions.latest
        .getLatest(connection, application.id)
        .catch((e) => {
          if (!(e instanceof HttpError)) {
            throw e;
          }
          if (e.status !== 404) throw e;

          return null;
        });

      // @TODO How to consider the version concurrency?
      const version = (latestVersion?.version ?? 0) + 1;

      await functional.applications.by_ids.versions
        .create(connection, application.id, { version })
        .then((version) =>
          functional.application_versions.by_ids.connectors.create(
            connection,
            version.id,
            {
              name: op.name,
              description: op.function.description ?? "", // typia bugs.
            },
          ),
        );

      return { version, applicationId: application.id };
    };

    const embedContext = async (ctx: IAgenticaContext<SchemaModel>) => {
      await Promise.all(ctx.operations.array.map(embedOperation));
      setEmbeddedContext(ctx);
    };

    const selectorExecute = async (
      ctx: IAgenticaContext<SchemaModel>,
    ): Promise<IAgenticaPrompt<SchemaModel>[]> => {
      if (!isEmbeddedContext(ctx)) {
        await embedContext(ctx);
      }

      const result =
        await functional.connector_retrievals.createRetrievalRequest(
          connection,
          {
            query: ctx.prompt.text,
            limit: 10,
            filter: undefined,
          },
        );

      const text: IAgenticaPrompt.IText = {
        type: "text",
        role: "assistant",
        text: `I will use next tools because it is semantic search result: ${JSON.stringify(
          result.map((v) => v.name),
        )}`,
      };
      return [text];
    };

    return { selectorExecute };
  };
}
