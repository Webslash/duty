import { createHash } from "crypto";
import jsonStringify from "fast-json-stable-stringify";

export const hashJson = (json: any) =>
  createHash("sha256").update(jsonStringify(json)).digest("hex");

export const getActivityId = (
  taskRunId: string,
  activityName: string,
  activityParams: any
) => {
  const activityId = `${taskRunId}-${activityName}-${hashJson(activityParams)}`;
  return activityId;
};
