import { randomUUID } from "crypto";
import { createActivityResultCache } from "./activityResultCache";
import type { StorageAdapter } from "./adapters";

/**
 * IDEAS & TODO
 *
 * - TODO: Serialize task run & activity params correctly - currently it's just JSON.stringify
 * - IDEA: Allow shared activity result cache between all runs of a task
 *
 * @returns
 */

export enum TaskRunStatus {
  pending = "pending",
  running = "running",
  completed = "completed",
}

export interface TaskRun {
  id: string;
  taskName: string;
  taskParams: object;
  status: TaskRunStatus;
  createdAt: string;
}

export interface TaskActivityResult {
  id: string;
  taskRunId: string;
  resultValue: object;
  createdAt: string;
}

export const worker = async (workerConfig: { storage: StorageAdapter }) => {
  console.log("Initializing worker");

  const task = async <
    RunParams extends Record<string, any>,
    Activities extends Record<string, (...args: any[]) => any> = {}
  >(taskConfig: {
    name: string;
    activities: Activities;
    run: (
      context: { activities: Activities },
      runParams: RunParams
    ) => Promise<void>;
  }) => {
    const runFunction = async (runParams: RunParams, taskRunId?: string) => {
      if (!taskRunId) {
        taskRunId = `${taskConfig.name}-${randomUUID()}`;
      }

      const activityCache = await createActivityResultCache({
        taskRunId,
        storage: workerConfig.storage,
      });

      const patchedActivities = Object.fromEntries(
        Object.entries(taskConfig.activities).map(
          ([activityName, activityFunction]) => {
            const cachedActivityFunction = async (...args: any[]) => {
              const activityParams = args[0];

              const cachedResult = await activityCache.get(
                activityName,
                activityParams
              );

              if (cachedResult) {
                console.log("Using cached result", cachedResult);
                return cachedResult.value as ReturnType<
                  typeof activityFunction
                >;
              }

              const runResultValue = await activityFunction(...args);

              await activityCache.set(
                activityName,
                activityParams,
                runResultValue
              );

              return runResultValue;
            };

            return [activityName, cachedActivityFunction];
          }
        )
      ) as unknown as typeof taskConfig.activities;

      const context = {
        activities: patchedActivities,
      };

      await workerConfig.storage.claimTaskRun({ runId: taskRunId });

      await taskConfig.run(context, runParams);

      console.log("Fully completed task run", taskRunId);
    };

    const pendingRuns = await workerConfig.storage.getTaskRunsByStatus({
      taskName: taskConfig.name,
      status: TaskRunStatus.pending,
    });

    console.log("Pending runs", pendingRuns);

    for (let pendingRun of pendingRuns) {
      runFunction(pendingRun.taskParams as any, pendingRun.id).then(() => {});
    }

    console.log(`Initialized worker with ${pendingRuns.length} pending tasks`);

    return { run: runFunction };
  };

  return { task };
};
