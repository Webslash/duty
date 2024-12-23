# Duty

Build TypeScript functions that are durable by default; no PhD required. 

- 🎓 Intuitive: Easy to get started with
- 📦 Compatible: Uses your existing storage layer
- 🐺 Standalone: No dependencies on external platforms

```
npm i --save @duty/core
```

## How it works 

```ts
const db = new PrismaClient() // Supports prisma, kysely,... or easily build your wn.

const duty = await worker({ storage: prismaAdapter(db) });

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

**Activities** are smaller, focused, idempotent functions. When an activity resolves, Duty caches the Activity result for the given parameters inside the Task Run. when the Activity is called with the same parameters, a cached result is used instead of running the Activity again.

Duty ensures durability of tasks by:
- Automatically persisting state
- Retrying on failure
- Allowing progress to be resumed thanks to the cached nature of Activities

This is clear in the example above. When execution of the `run` function fails at `document-500` (because OpenAi throttles you, because the server stopped, ...), Duty will retry the Task Run. 
When the Task Run is retried, Duty will once again loop over the documentIds but will not run the activity for the first 499 documents as it encounters cache hits. 
Once Duty reaches `document-500` again, it will continue where it left off.


