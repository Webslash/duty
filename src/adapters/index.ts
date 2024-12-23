import sqlite from "better-sqlite3";
import { TaskRunStatus, type TaskActivityResult, type TaskRun } from "..";

export const sqliteStorageAdapter = (database: sqlite.Database) => {
  database.exec(
    `CREATE TABLE IF NOT EXISTS DutyTaskRun (
      id TEXT PRIMARY KEY, 
      taskName TEXT, 
      taskParams TEXT,
      status TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  );

  database.exec(
    `CREATE TABLE IF NOT EXISTS DutyTaskActivityResult (
      id TEXT PRIMARY KEY,
      taskRunId TEXT,
      resultValue TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  );

  return {
    claimTaskRun: async (params: { runId: string }) => {
      const transaction = database.transaction(() => {
        const taskRun = database
          .prepare(
            `SELECT * FROM DutyTaskRun WHERE id = ? AND status = ? LIMIT 1`
          )
          .get(params.runId, TaskRunStatus.pending);

        console.log("claimTaskRun", { taskRun });
        if (!taskRun) {
          return false;
        }

        const result = database
          .prepare(`UPDATE DutyTaskRun SET status = ? WHERE id = ?`)
          .run(TaskRunStatus.running);

        console.log("Claimed task run", result);

        return true;
      });

      await transaction();
    },
    getTaskRunsByStatus: async (params: {
      taskName: string;
      status: "pending" | "running" | "completed";
    }) => {
      const taskRuns = (await database
        .prepare(`SELECT * FROM DutyTaskRun WHERE taskName = ? AND status = ?`)
        .all(params.taskName, "pending")) as (TaskRun & {
        taskParams: string;
      })[];

      return taskRuns.map((taskRun) => ({
        ...taskRun,
        taskParams: JSON.parse(taskRun.taskParams),
      })) as TaskRun[];
    },
    registerTaskRun: async (params: {
      taskName: string;
      runId: string;
      taskParams: object;
    }) => {
      await database
        .prepare(
          `INSERT INTO DutyTaskRun (id, taskName, taskParams, status) VALUES (?, ?, ?, ?)`
        )
        .run(
          params.runId,
          params.taskName,
          JSON.stringify(params.taskParams),
          TaskRunStatus.pending
        );
    },
    completeTaskRun: async (params: { runId: string }) => {
      await database
        .prepare(`UPDATE DutyTaskRun SET status = ? WHERE id = ?`)
        .run(TaskRunStatus.completed, params.runId);
    },

    getActivityResultsByTaskRunId: async (params: { taskRunId: string }) => {
      const activityResults = (await database
        .prepare(`SELECT * FROM DutyTaskActivityResult WHERE taskRunId = ?`)
        .all(params.taskRunId)) as (TaskActivityResult & {
        resultValue: string;
      })[];

      return activityResults.map((activityResult) => ({
        ...activityResult,
        resultValue: JSON.parse(activityResult.resultValue),
      }));
    },

    setActivityResult: async (params: {
      taskRunId: string;
      activityId: string;
      result: object;
    }) => {
      const result = await database
        .prepare(
          `
            INSERT INTO DutyTaskActivityResult (id, taskRunId, resultValue) VALUES (?, ?, ?)
            ON CONFLICT(id) DO NOTHING
            RETURNING *
          `
        )
        .run(
          params.activityId,
          params.taskRunId,
          JSON.stringify(params.result)
        );

      console.log("setActivityResult", result);

      return result as unknown as TaskActivityResult;
    },
  };
};

export type StorageAdapter = ReturnType<typeof sqliteStorageAdapter>;
