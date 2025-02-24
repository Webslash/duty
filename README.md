# Duty - TypeScript workflow orchestration

> [!NOTE]  
> You cannot yet install Duty, we are working towards a first release. Please star the repository to show your interest.

Asynchronous workloads are everywhere in modern apps - think batched LLM API calls (e.g., Google Gemini, OpenAI) where you’re juggling throttling, tracking results, and ensuring nothing gets lost. Message queues like SQS or RabbitMQ are the default go-to: fire-and-forget systems that scale but leave you bolting on state management hacks to keep track of what’s happened. 

This created a space for "workflow orchestration tools": resilient engines built to handle long-running tasks with durability baked in. They tackle async workload chaos by:
- Ensuring tasks endure failures
- Preserving state across retries
- Guaranteeing reliable completion
- Eliminating the need for makeshift infrastructure fixes

However, existing solutions are a pain to configure, maintain, and often cost a fortune when you use them for queue-like workloads.

Duty’s different. It’s a lean TypeScript workflow orchestration library that uses your existing **Postgres** database — no external dependencies, no platform lock-in, fully open source.

Install it like you would Prisma/Kysely/Drizzle. Scale it to queue-level volumes, with all the pros of a workflow platform. 

We’re gunning to be the default pick for greenfield projects and a no-brainer migration path for existing solutions. A standalone dashboard (Docker image) gives you visibility into workers, tasks, and activities.


Below is an example of what the API would look like. We'd appreciate a star on this repository if you think this is something for you.


# Future Docs example

> [!NOTE]  
> You cannot yet install Duty, we are working towards a first release. Please star the repository to show your interest.

Durable TypeScript functions made easy

- 📦 Compatible: Uses your existing Postgres database
- 🐺 Standalone: No dependencies on external platforms
- 🎓 Intuitive: Crystal clear documentation, hundreds of examples

```
npm i --save <duty has not been released yet>
```

## How it works 

```ts
const duty = await worker({ database: process.env.DATABASE_URL });

const embedDocumentsTask = await duty.task({
  name: 'embed-documents',
  activities: {
    embedDocument: async (params: { documentId: string }) => {
      const document = await db.documents.findOne(params.documentId);
      const embedding = await openai.embed(document.text);

      await db.embeddings.insert(params.documentId, embedding);
    },
  },
  run: async (context, params: { documentIds: string[] }) => {
    for (let documentId of params.documentIds) {
      await context.activities.embedDocument({ documentId });
    }
  }
});

await embedDocumentsTask.run({ documentIds: ['document-1', 'document-2', '...', 'document-9999999'] })

```

### Concepts

**Tasks** are durable functions designed to perform long-running or complex operations. 

**Task Runs** happen when a task is executed for a given set of parameters. 

**Activities** are smaller, focused, idempotent functions. When an activity resolves, Duty caches the Activity result for the given parameters inside the Task Run. When the Activity is called with the same parameters, a cached result is used instead of running the Activity again.

Duty ensures durability of tasks by:
- Automatically persisting state
- Retrying on failure
- Allowing progress to be resumed thanks to the cached nature of Activities

This is clear in the example above. When execution of the `run` function fails at `document-500` (because OpenAi throttles you, because the server stopped, ...), Duty will retry the Task Run. 

When the Task Run is retried, Duty will once again loop over the documentIds but will not run the activity for the first 499 documents as it encounters cache hits. 

Once Duty reaches `document-500` again, it will continue where it left off.


