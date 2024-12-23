import type { TaskActivityResult } from ".";
import type { StorageAdapter } from "./adapters";
import { getActivityId } from "./utils";

export const createActivityResultCache = async (config: {
  taskRunId: string;
  storage: StorageAdapter;
}) => {
  const initialActivityResults =
    await config.storage.getActivityResultsByTaskRunId({
      taskRunId: config.taskRunId,
    });

  const cache: Record<string, TaskActivityResult> = Object.fromEntries(
    initialActivityResults.map((activityResult) => [
      activityResult.id,
      activityResult,
    ])
  );

  const get = async (activityName: string, activityParams: any) => {
    const activityId = getActivityId(
      config.taskRunId,
      activityName,
      activityParams
    );

    if (activityId in cache) {
      console.log("Cache hit", activityId, cache[activityId]);
      return { value: cache[activityId].resultValue };
    }

    return undefined;
  };

  const set = async (
    activityName: string,
    activityParams: any,
    result: any
  ) => {
    const activityId = getActivityId(
      config.taskRunId,
      activityName,
      activityParams
    );

    const data = await config.storage.setActivityResult({
      taskRunId: config.taskRunId,
      activityId,
      result,
    });

    cache[activityId] = data;
  };

  return { get, set };
};
