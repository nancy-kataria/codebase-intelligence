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
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const index = pc.index(process.env.PINECONE_INDEX_NAME!);
  
  try {
    const stats = await index.describeIndexStats();
    const namespaces = Object.keys(stats.namespaces || {});
    
    if (namespaces.length === 0) {
      console.log("No namespaces found in the index.");
      return;
    }
    
    for (const namespace of namespaces) {
      await index.namespace(namespace).deleteAll();
    }
    
  } catch (error) {
    console.error("Error during cleanup:", error);
    throw error;
  }
}

cleanup().catch(console.error);