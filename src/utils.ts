import { createHash } from "crypto";

export const hashJson = (json: any) =>
  createHash("sha256").update(JSON.stringify(json)).digest("hex");

export const getActivityId = (
  taskRunId: string,
  activityName: string,
  activityParams: any
) => {
  const activityId = `${taskRunId}-${activityName}-${hashJson(activityParams)}`;
  return activityId;
};
