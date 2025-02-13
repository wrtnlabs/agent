import { IWrtnAdditionalAgent } from "../structures/IWrtnAdditionalAgent";
import { IWrtnAgentConfig } from "../structures/IWrtnAgentConfig";
import { IWrtnAgentController } from "../structures/IWrtnAgentController";
import { IWrtnAgentOperation } from "../structures/IWrtnAgentOperation";
import { IWrtnAgentOperationCollection } from "../structures/IWrtnAgentOperationCollection";
import { __map_take } from "./__map_take";

export namespace WrtnAgentOperationComposer {
  export const compose = <
    AgentExecutePlan extends Record<
      string,
      IWrtnAdditionalAgent<keyof AgentExecutePlan>
    >,
  >(props: {
    controllers: IWrtnAgentController[];
    config?: IWrtnAgentConfig<AgentExecutePlan>;
  }): IWrtnAgentOperationCollection => {
    const unique: boolean =
      props.controllers.length === 1 ||
      (() => {
        const names: string[] = props.controllers
          .map((controller) =>
            controller.application.functions.map((func) => func.name),
          )
          .flat();
        return new Set(names).size === names.length;
      })();
    const naming = (func: string, ci: number) =>
      unique ? func : `_${ci}_${func}`;

    const array: IWrtnAgentOperation[] = props.controllers
      .map((controller, ci) =>
        controller.protocol === "http"
          ? controller.application.functions.map(
              (func) =>
                ({
                  protocol: "http",
                  controller,
                  function: func,
                  name: naming(func.name, ci),
                }) satisfies IWrtnAgentOperation.IHttp,
            )
          : controller.application.functions.map(
              (func) =>
                ({
                  protocol: "class",
                  controller,
                  function: func,
                  name: naming(func.name, ci),
                }) satisfies IWrtnAgentOperation.IClass,
            ),
      )
      .flat();
    const divided: IWrtnAgentOperation[][] | undefined =
      !!props.config?.capacity && array.length > props.config.capacity
        ? divideOperations({
            array,
            capacity: props.config.capacity,
          })
        : undefined;

    const flat: Map<string, IWrtnAgentOperation> = new Map();
    const group: Map<string, Map<string, IWrtnAgentOperation>> = new Map();
    for (const item of array) {
      flat.set(item.name, item);
      __map_take(group, item.controller.name, () => new Map()).set(
        item.name,
        item,
      );
    }
    return {
      array,
      divided,
      flat,
      group,
    };
  };

  const divideOperations = (props: {
    array: IWrtnAgentOperation[];
    capacity: number;
  }): IWrtnAgentOperation[][] => {
    const size: number = Math.ceil(props.array.length / props.capacity);
    const capacity: number = Math.ceil(props.array.length / size);
    const replica: IWrtnAgentOperation[] = props.array.slice();
    return new Array(size).fill(0).map(() => replica.splice(0, capacity));
  };
}
