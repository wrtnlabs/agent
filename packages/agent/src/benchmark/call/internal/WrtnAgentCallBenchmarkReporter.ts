import { MathUtil } from "../../../internal/MathUtil";
import { WrtnAgentBenchmarkUtil } from "../../common/WrtnAgentBenchmarkUtil";
import { WrtnAgentPromptReporter } from "../../common/WrtnAgentPromptReporter";
import { IWrtnAgentCallBenchmarkEvent } from "../IWrtnAgentCallBenchmarkEvent";
import { IWrtnAgentCallBenchmarkResult } from "../IWrtnAgentCallBenchmarkResult";

export namespace WrtnAgentCallBenchmarkReporter {
  export const markdown = (
    result: IWrtnAgentCallBenchmarkResult,
  ): Record<string, string> =>
    Object.fromEntries([
      ["./README.md", writeIndex(result)],
      ...result.experiments
        .map((exp) => [
          [`./${exp.scenario.name}/README.md`, writeExperimentIndex(exp)],
          ...exp.events.map((event, i) => [
            `./${exp.scenario.name}/${i + 1}.${event.type}.md`,
            writeExperimentEvent(event, i),
          ]),
        ])
        .flat(),
    ]);

  const writeIndex = (result: IWrtnAgentCallBenchmarkResult): string => {
    const events: IWrtnAgentCallBenchmarkEvent[] = result.experiments
      .map((r) => r.events)
      .flat();
    const average: number =
      events
        .map((e) => e.completed_at.getTime() - e.started_at.getTime())
        .reduce((a, b) => a + b, 0) / events.length;
    return [
      "# LLM Function Call Benchmark",
      "## Summary",
      `  - Aggregation:`,
      `    - Scenarios: #${result.experiments.length.toLocaleString()}`,
      `    - Trial: ${events.length}`,
      `    - Success: ${events.filter((e) => e.type === "success").length}`,
      `    - Failure: ${events.filter((e) => e.type === "failure").length}`,
      `    - Average Time: ${MathUtil.round(average).toLocaleString()} ms`,
      `  - Token Usage`,
      `    - Total: ${result.usage.total.toLocaleString()}`,
      `    - Prompt`,
      `      - Total: ${result.usage.prompt.total.toLocaleString()}`,
      `      - Audio: ${result.usage.prompt.audio.toLocaleString()}`,
      `      - Cached: ${result.usage.prompt.cached.toLocaleString()}`,
      `    - Completion:`,
      `      - Total: ${result.usage.completion.total.toLocaleString()}`,
      `      - Accepted Prediction: ${result.usage.completion.accepted_prediction.toLocaleString()}`,
      `      - Audio: ${result.usage.completion.audio.toLocaleString()}`,
      `      - Reasoning: ${result.usage.completion.reasoning.toLocaleString()}`,
      `      - Rejected Prediction: ${result.usage.completion.rejected_prediction.toLocaleString()}`,
      "",
      "## Experiments",
      " Name | Select | Call | Time/Avg ",
      ":-----|:-------|:-----|----------:",
      ...result.experiments.map((exp) =>
        [
          `[${exp.scenario.name}](./${exp.scenario.name}/README.md)`,
          drawStatus(
            exp.events,
            (e) => e.type !== "error" && e.select === true,
          ),
          drawStatus(exp.events, (e) => e.type !== "error" && e.call === true),
          `${MathUtil.round(
            exp.events
              .map((e) => e.completed_at.getTime() - e.started_at.getTime())
              .reduce((a, b) => a + b, 0) / exp.events.length,
          ).toLocaleString()} ms`,
        ].join(" | "),
      ),
    ].join("\n");
  };

  const writeExperimentIndex = (
    exp: IWrtnAgentCallBenchmarkResult.IExperiment,
  ): string => {
    return [
      `# ${exp.scenario.name}`,
      "## Summary",
      `  - Scenarios: #${exp.events.length.toLocaleString()}`,
      `  - Success: ${exp.events.filter((e) => e.type === "success").length}`,
      `  - Failure: ${exp.events.filter((e) => e.type === "failure").length}`,
      `  - Average Time: ${MathUtil.round(
        exp.events
          .map((e) => e.completed_at.getTime() - e.started_at.getTime())
          .reduce((a, b) => a + b, 0) / exp.events.length,
      ).toLocaleString()} ms`,
      "",
      "## Events",
      " Name | Type | Time",
      ":-----|:-----|----:",
      ...exp.events.map((e, i) =>
        [
          `[${i + 1}.](./${i + 1}.${e.type}.md)`,
          e.type,
          `${MathUtil.round(e.completed_at.getTime() - e.started_at.getTime())} ms`,
        ].join(" | "),
      ),
      "",
      "## Scenario",
      "### User Prompt",
      exp.scenario.text,
      "",
      "### Expected",
      "```json",
      JSON.stringify(
        WrtnAgentBenchmarkUtil.expectedToJson(exp.scenario.expected),
        null,
        2,
      ),
      "```",
    ].join("\n");
  };

  const writeExperimentEvent = (
    event: IWrtnAgentCallBenchmarkEvent,
    index: number,
  ): string => {
    return [
      `# ${index}. ${event.type}`,
      "## Summary",
      `  - Name: ${event.scenario.name}`,
      `  - Type: ${event.type}`,
      `  - Time: ${MathUtil.round(
        event.completed_at.getTime() - event.started_at.getTime(),
      ).toLocaleString()} ms`,
      ...(event.type !== "error"
        ? [
            `  - Select: ${event.select ? "✅" : "❌"}`,
            `  - Call: ${event.call ? "✅" : "❌"}`,
          ]
        : []),
      `  - Token Usage: ${event.usage.toLocaleString()}`,
      "",
      "## Scenario",
      "### User Prompt",
      event.scenario.text,
      "",
      "### Expected",
      "```json",
      JSON.stringify(
        WrtnAgentBenchmarkUtil.expectedToJson(event.scenario.expected),
        null,
        2,
      ),
      "```",
      "",
      "## Prompt Histories",
      ...event.prompts.map(WrtnAgentPromptReporter.markdown),
      "",
      ...(event.type === "error"
        ? [
            "## Error",
            "```json",
            JSON.stringify(
              WrtnAgentBenchmarkUtil.errorToJson(event.error),
              null,
              2,
            ),
            "```",
          ]
        : []),
    ].join("\n");
  };

  const drawStatus = (
    events: IWrtnAgentCallBenchmarkEvent[],
    success: (e: IWrtnAgentCallBenchmarkEvent) => boolean,
  ): string => {
    const count: number = events.filter(success).length;
    return (
      new Array(count).fill("■").join("") +
      new Array(10 - count).fill("□").join("")
    );
  };
}
