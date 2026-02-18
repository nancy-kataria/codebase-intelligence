import { Pinecone } from "@pinecone-database/pinecone";

/**
 * Performs cleanup operations on the Pinecone vector database index
 * 
 * Connects to the configured Pinecone index and deletes all namespaces from the index.
 * 
 * @returns Promise<void> - Resolves when cleanup completes successfully
 * 
 * @throws {Error} When Pinecone API connection fails
 * @throws {Error} When vector deletion operations fail
 * @throws {Error} When environment variables are missing (PINECONE_API_KEY, PINECONE_INDEX_NAME)
 */
async function cleanup() {
  console.log("Starting Pinecone cleanup...");
  console.log("Index name:", process.env.PINECONE_INDEX_NAME);
  
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const index = pc.index(process.env.PINECONE_INDEX_NAME!);
  
  try {
    const stats = await index.describeIndexStats();
    console.log("Index stats:", JSON.stringify(stats, null, 2));
    
    const namespaces = Object.keys(stats.namespaces || {});
    
    if (namespaces.length === 0) {
      console.log("No namespaces found in the index.");
      return;
    }
    
    for (const namespace of namespaces) {
      await index.namespace(namespace).deleteAll();
      console.log(`Successfully deleted namespace: "${namespace}"`);
    }
    
    // Verify deletion
    const finalStats = await index.describeIndexStats();
    console.log("Final stats after cleanup:", JSON.stringify(finalStats, null, 2));
    console.log("Cleanup completed.");
    
  } catch (error) {
    console.error("Error during cleanup:", error);
    throw error;
  }
}

cleanup().catch(console.error);