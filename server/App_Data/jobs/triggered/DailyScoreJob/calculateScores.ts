import { sql } from "drizzle-orm";
import { db } from "server/db.js";
import { saveTenantScore } from "server/services/scoringService";

const run = async () => {
  try {
    console.log("Running daily tenant score job...");

    // Get all tenants
    const tenants = await db.execute<{ tenantId: string }>(sql`
      SELECT DISTINCT "tenantId" FROM "tenants"
    `);

    for (const tenant of tenants.rows) {
      await saveTenantScore(tenant.tenantId);
      console.log(`✅ Score saved for tenant ${tenant.tenantId}`);
    }

    console.log("🎉 Job finished successfully.");
  } catch (err) {
    console.error("❌ Error running job:", err);
    process.exit(1);
  }
};

run();
