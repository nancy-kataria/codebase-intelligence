// scripts/cleanup.ts
import { Pinecone } from "@pinecone-database/pinecone";

async function cleanup() {
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const index = pc.index(process.env.PINECONE_INDEX_NAME!);
  
  try {
    // Get index stats to see all namespaces
    const stats = await index.describeIndexStats();
    const namespaces = Object.keys(stats.namespaces || {});
    
    if (namespaces.length === 0) {
      console.log("No namespaces found in the index.");
      return;
    }
    
    // Delete each namespace
     await index.deleteAll();
    
  } catch (error) {
    console.error("Error during cleanup:", error);
    throw error;
  }
}

cleanup().catch(console.error);