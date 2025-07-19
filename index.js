import "dotenv/config";
import { algoliasearch } from "algoliasearch";
import { glob } from "glob";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const client = algoliasearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_ADMIN_API_KEY
);

async function testAlgoliaConnection() {
  try {
    console.log("Testing Algolia connection...");

    const testObj = {
      objectID: "test_connection",
      tool: "test",
      description: "Connection test",
      examples: [{ description: "test", command: "test" }],
    };

    const { taskID } = await client.saveObject({
      indexName: "devcli_commands1",
      body: testObj,
    });

    await client.waitForTask({
      indexName: "devcli_commands1",
      taskID,
    });

    console.log("✅ Single object upload successful");

    // Test small batch
    console.log("Testing small batch upload...");
    const smallBatch = [
      {
        objectID: "test_batch_1",
        tool: "test1",
        description: "Test tool 1",
        examples: [{ description: "test", command: "test1" }],
      },
      {
        objectID: "test_batch_2",
        tool: "test2",
        description: "Test tool 2",
        examples: [{ description: "test", command: "test2" }],
      },
    ];

    try {
      const batchResult = await client.saveObjects({
        indexName: "devcli_commands1",
        body: smallBatch,
      });

      console.log("✅ Batch upload works!");

      // Clean up test objects
      await client.deleteObject({
        indexName: "devcli_commands1",
        objectID: "test_connection",
      });

      await client.deleteObjects({
        indexName: "devcli_commands1",
        objectIDs: ["test_batch_1", "test_batch_2"],
      });

      return "batch";
    } catch (batchError) {
      console.log("❌ Batch upload failed, will use individual uploads");
      console.log("Batch error:", batchError.message);

      // Clean up single test object
      await client.deleteObject({
        indexName: "devcli_commands1",
        objectID: "test_connection",
      });

      return "individual";
    }
  } catch (error) {
    console.error("❌ Algolia connection failed:", error.message);
    return false;
  }
}

async function uploadIndividually(commands) {
  let totalUploaded = 0;

  console.log("Using individual upload method...");

  for (let i = 0; i < commands.length; i++) {
    try {
      await client.saveObject({
        indexName: "devcli_commands1",
        body: commands[i],
      });

      totalUploaded++;

      if (i % 100 === 0) {
        console.log(`✅ Uploaded ${i + 1}/${commands.length} objects...`);
      }

      // Rate limiting
      if (i % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    } catch (error) {
      console.error(`❌ Failed ${commands[i].objectID}:`, error.message);
    }
  }

  return totalUploaded;
}

//tried but did not work
async function uploadInBatches(commands, batchSize = 100) {
  let totalUploaded = 0;

  for (let i = 0; i < commands.length; i += batchSize) {
    const batch = commands.slice(i, i + batchSize);

    try {
      const { taskIDs } = await client.saveObjects({
        indexName: "devcli_commands1",
        body: batch,
      });

      totalUploaded += batch.length;
      console.log(
        `✅ Batch ${Math.ceil((i + 1) / batchSize)}: ${
          batch.length
        } objects uploaded`
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (batchError) {
      console.error(
        `❌ Batch ${Math.ceil((i + 1) / batchSize)} failed:`,
        batchError.message
      );
    }
  }

  return totalUploaded;
}

async function processFiles() {
  try {
    // Test connection and determine upload method
    const uploadMethod = await testAlgoliaConnection();
    if (!uploadMethod) {
      console.error("Stopping due to Algolia connection issues");
      return;
    }

    const tldrPagesPath = path.join(__dirname, "..", "tldr", "pages", "common");
    const globPath = tldrPagesPath.replace(/\\/g, "/");
    const files = await glob(`${globPath}/**/*.md`);

    console.log(`Found ${files.length} .md files`);
    let commands = [];
    let processedCount = 0;

    // Your existing file processing logic...
    for (const file of files) {
      try {
        const fileContent = fs.readFileSync(file, "utf-8");
        const tool = path.basename(file, ".md");
        const lines = fileContent.split("\n").filter((line) => line.trim());

        let description = "";
        let commandExamples = [];

        for (const line of lines) {
          if (line.startsWith("> ") && !line.includes("More information:")) {
            description = line.replace("> ", "").trim();
            break;
          }
        }

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.startsWith("- ")) {
            const commandDescription = line
              .replace("- ", "")
              .replace(/:$/, "")
              .trim();

            for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) {
              const nextLine = lines[j];
              if (nextLine.includes("`")) {
                const commandMatch = nextLine.match(/`([^`]+)`/);
                if (commandMatch) {
                  commandExamples.push({
                    description: commandDescription,
                    command: commandMatch[1],
                  });
                  break;
                }
              }
            }
          }
        }

        if (commandExamples.length > 0) {
          commands.push({
            objectID: tool,
            tool,
            description: description || `Command-line tool: ${tool}`,
            examples: commandExamples,
          });
        }

        processedCount++;
        if (processedCount % 500 === 0) {
          console.log(`Processed ${processedCount}/${files.length} files...`);
        }
      } catch (fileError) {
        console.error(`Error processing ${file}:`, fileError.message);
      }
    }

    console.log(`\nProcessing complete: ${commands.length} valid tools found`);

    if (commands.length === 0) {
      console.log("❌ No valid tools extracted.");
      return;
    }

    console.log(`\nUploading ${commands.length} tools to Algolia...`);

    let totalUploaded;
    if (uploadMethod === "batch") {
      totalUploaded = await uploadInBatches(commands);
    } else {
      totalUploaded = await uploadIndividually(commands);
    }

    console.log(
      `\n✅ Upload complete: ${totalUploaded}/${commands.length} objects uploaded`
    );
  } catch (error) {
    console.error("Script error:", error);
  }
}

processFiles();
