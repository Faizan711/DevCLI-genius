// File: helloAlgolia.mjs
import "dotenv/config";
import { algoliasearch } from "algoliasearch";

const appID = "ALGOLIA_APPLICATION_ID";
// API key with `addObject` and `editSettings` ACL
const apiKey = "ALGOLIA_API_KEY";
const indexName = "test-index";

const client = algoliasearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_ADMIN_API_KEY
);

const record = { objectID: "object-1", name: "test record" };

// Add record to an index
const { taskID } = await client.saveObject({
  indexName,
  body: record,
});

// Wait until indexing is done
await client.waitForTask({
  indexName,
  taskID,
});

// Search for "test"
const { results } = await client.search({
  requests: [
    {
      indexName,
      query: "test",
    },
  ],
});

console.log(JSON.stringify(results));
