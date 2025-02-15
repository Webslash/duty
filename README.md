# Duty - TypeScript workflow orchestration

> [!NOTE]  
> You cannot yet install Duty, we are working towards a first release. Please star the repository to show your interest.

Today, many applications have some kind of asynchronous processing pattern. 
A common example is building anything with LLM APIs like Google Gemini or OpenAI. You want to do many API calls, ideally throttle here and there, and keep track of the result while you're at it.

Typically this is solved with message queue systems like SQS or RabbitMQ.
The problem with these is that they are often fire-and-forget. This created a space for so-called "workflow orchestration" tools which allow long-running tasks to complete durably. 
The problem with these is that they're not that easy to maintain and too expensive to use at a scale you would a message queue. 

Duty aims to be a lightweight workflow orchestration tool that uses your existing Postgres database and lets you scale to the amounts you would see on any regular message queue. It's a dependency you install like your favourite ORM prisma/kysely/drizzle/knex... 
We aim to be the go-to tool of this type for new software projects as well as an attractive migration target. 

A seperate dashboard component (Docker image) allows you to monitor your active workers, tasks and activities.

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


