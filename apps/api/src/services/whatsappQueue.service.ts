type QueueJob = () => Promise<void>;

const queue: QueueJob[] = [];
let running = false;

async function processQueue() {
  if (running) return;
  running = true;

  while (queue.length > 0) {
    const job = queue.shift();
    if (!job) continue;

    try {
      await job();
    } catch (error) {
      console.error("WhatsApp queue job failed:", error);
    }
  }

  running = false;
}

export function enqueueWhatsAppJob(job: QueueJob) {
  queue.push(job);
  void processQueue();
}
