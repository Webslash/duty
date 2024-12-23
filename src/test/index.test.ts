import sqlite from "better-sqlite3";
import path from "path";

import { afterAll, afterEach, describe, expect, test, vi } from "vitest";
import { worker } from "..";
import { createHash } from "crypto";
import { unlinkSync } from "fs";
import { sqliteStorageAdapter } from "../adapters";
import { getActivityId } from "../utils";

const sqlitePath = path.join(__dirname, "test.db");

const db = {
  findOne: (id: string) => ({ id, text: id }),
  insert: (id: string, data: any) => ({ id, data }),
};

const openai = {
  embed: (text: string) => [createHash("sha256").update(text).digest("hex")],
};

describe("Duty", async () => {
  const database = sqlite(sqlitePath);
  const storage = sqliteStorageAdapter(database);

  afterEach(() => {
    vi.restoreAllMocks();
  });
  // beforeAll(async () => {});
  afterAll(async () => {
    unlinkSync(sqlitePath);
  });

  test("Example - resume an embedding task", async () => {
    const duty = await worker({ storage });

    const taskName = "embedDocuments";

    await storage.registerTaskRun({
      runId: "run-1",
      taskName,
      taskParams: { documentIds: ["test1", "test2"] },
    });

    await storage.registerTaskRun({
      runId: "run-2",
      taskName,
      taskParams: { documentIds: ["test3", "test4", "test4"] },
    });

    await storage.setActivityResult({
      taskRunId: "run-1",
      result: { embedding: "test1-embedding" },
      activityId: getActivityId("run-1", "embedDocument", {
        documentId: "test1",
      }),
    });

    const activities = {
      embedDocument: async (params: { documentId: string }) => {
        const document = await db.findOne(params.documentId);
        const embedding = await openai.embed(document.text);

        await db.insert(params.documentId, embedding);

        return { embedding };
      },
    };

    const activitySpy = vi.spyOn(activities, "embedDocument");

    const embedDocumentsTask = await duty.task({
      name: taskName,
      activities: {
        embedDocument: async (params: { documentId: string }) => {
          const document = await db.findOne(params.documentId);
          const embedding = await openai.embed(document.text);

          await db.insert(params.documentId, embedding);

          return { embedding };
        },
      },
      run: async (context, params: { documentIds: string[] }) => {
        // let documentId = await useState("documentId"); // -> proxy?
        for (let documentId of params.documentIds) {
          console.log(documentId);
          const result = await context.activities.embedDocument({ documentId });
          console.log(result);
        }
      },
    });

    console.log("testing");
    expect(true).toBe(true);
  });

  // test("Example - start a new embedding task", async () => {
  //   const duty = await worker({ storage });

  //   const embedDocumentsTask = duty.task({
  //     name: "embedDocuments",
  //     activities: {
  //       embedDocument: async (params: { documentId: string }) => {
  //         const document = await db.findOne(params.documentId);
  //         const embedding = await openai.embed(document.text);

  //         await db.insert(params.documentId, embedding);
  //       },
  //     },
  //     run: async (context, params: { documentIds: string[] }) => {
  //       // let documentId = await useState("documentId"); // -> proxy?
  //       for (let documentId of params.documentIds) {
  //         console.log(documentId);
  //         await context.activities.embedDocument({ documentId });
  //       }
  //     },
  //   });

  //   const result = await embedDocumentsTask.run({
  //     documentIds: [
  //       "4f7421ee-d0f4-4da8-8e85-6ab697345851",
  //       "0b778a2f-db08-420d-a083-44c2c05e2c9d",
  //       "34311caa-9800-49a0-868d-38fca9ae67b7",
  //       "... as many as you like",
  //     ],
  //   });

  //   console.log("testing");
  //   expect(true).toBe(true);
  // });

  // test("should start with no existing workflows", async () => {
  //   const duty = await worker({ storage });

  //   const getAllDrivesTask = duty.task({
  //     name: "getAllDrives",
  //     activities: {
  //       fetchDrive: async (activityParams: { driveId: string }) => ({
  //         id: activityParams.driveId,
  //         name: `drive ${activityParams.driveId}`,
  //       }),
  //     },
  //     defaultState: {
  //       count: 0,
  //     },
  //     run: async (context, runParams: { integrationId: string }) => {
  //       let [count, setCount] = await context.useState("count");

  //       while (count < 100) {}

  //       for (let i = 0; i < 100; i++) {
  //         const [driveId, setDriveId] = context.useState("driveId");
  //         await context.activities.fetchDrive({ driveId });
  //       }
  //     },
  //   });

  //   /**
  //    * The first prop of the task run is the signature. We will look for existing runs for this task with this signature
  //    * and continue the run if we find an existing run history.
  //    */
  //   const result = await getAllDrivesTask.run({ integrationId: "abc-123" });

  //   console.log("testing");
  //   expect(true).toBe(true);
  // });
});
