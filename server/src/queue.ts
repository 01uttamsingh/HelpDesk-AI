import { PgBoss } from "pg-boss";
import { env } from "./config/env";
import { ticketClassificationService } from "./features/tickets/ticket-classification.service";
import { TicketServiceError } from "./features/tickets/ticket.service";

export const TICKET_CLASSIFICATION_QUEUE = "ticket-classification";

export interface TicketClassificationJobData {
  ticketId: number;
}

let bossInstance: PgBoss | null = null;
let isStarted = false;

export function getQueue(): PgBoss {
  if (!bossInstance) {
    bossInstance = new PgBoss({
      connectionString: env.DATABASE_URL,
      useListenNotify: true,
    });

    bossInstance.on("error", (error) => {
      console.error("[pg-boss] Queue error:", error);
    });
  }
  return bossInstance;
}

export async function ensureQueueStarted(): Promise<PgBoss> {
  const boss = getQueue();
  if (!isStarted) {
    await boss.start();
    await boss.createQueue(TICKET_CLASSIFICATION_QUEUE, { notify: true });
    isStarted = true;
  }
  return boss;
}

export async function startQueue(): Promise<PgBoss> {
  const boss = await ensureQueueStarted();

  // Register worker for ticket classification with low-latency polling fallback
  await boss.work(
    TICKET_CLASSIFICATION_QUEUE,
    { batchSize: 1, pollingIntervalSeconds: 1 },
    async (jobs) => {
      for (const job of jobs) {
        const { ticketId } = job.data as TicketClassificationJobData;
        try {
          console.log(`[pg-boss] Processing classification job for ticket #${ticketId}`);
          await ticketClassificationService.classifyTicket(ticketId);
          console.log(`[pg-boss] Completed classification job for ticket #${ticketId}`);
        } catch (error) {
          if (error instanceof TicketServiceError && error.statusCode === 404) {
            console.warn(`[pg-boss] Ticket #${ticketId} no longer exists, skipping job`);
            continue;
          }
          console.error(`[pg-boss] Failed processing job for ticket #${ticketId}:`, error);
          throw error; // Let pg-boss handle retries according to retry policy
        }
      }
    }
  );

  console.log(`[pg-boss] Queue '${TICKET_CLASSIFICATION_QUEUE}' worker registered with LISTEN/NOTIFY`);
  return boss;
}

export async function stopQueue(
  options: { graceful?: boolean; timeout?: number } = { graceful: true, timeout: 5000 }
): Promise<void> {
  if (bossInstance) {
    await bossInstance.stop(options);
    bossInstance = null;
    isStarted = false;
    console.log("[pg-boss] Queue stopped successfully");
  }
}

export async function clearQueue(queueName: string = TICKET_CLASSIFICATION_QUEUE): Promise<void> {
  const boss = await ensureQueueStarted();
  await boss.deleteAllJobs(queueName);
  console.log(`[pg-boss] Cleared all jobs from queue '${queueName}'`);
}

export async function enqueueTicketClassification(ticketId: number): Promise<string | null> {
  const boss = await ensureQueueStarted();
  const jobId = await boss.send(
    TICKET_CLASSIFICATION_QUEUE,
    { ticketId },
    {
      retryLimit: 3,
      retryDelay: 5,
      retryBackoff: true,
      expireInSeconds: 60,
    }
  );
  console.log(`[pg-boss] Enqueued classification job for ticket #${ticketId} (job id: ${jobId})`);
  return jobId;
}
