import { getAnalyticsConfig, getDashboardTransactions } from "./analytics-api";

export interface AnalyticsDuplicateGroup {
  key: string;
  count: number;
  keepSourceId: string;
  duplicateSourceIds: string[];
  sample: {
    timestamp?: string;
    product?: string;
    amount?: number;
    method?: string;
    machine_id?: string;
  };
}

export interface AnalyticsDuplicateReport {
  machineId: string;
  totalTransactions: number;
  duplicateGroups: number;
  duplicateRows: number;
  groups: AnalyticsDuplicateGroup[];
  note: string;
}

function transactionKey(tx: Record<string, unknown>): string {
  const machineId = String(tx.machine_id ?? tx.machineId ?? "");
  const timestamp = String(tx.timestamp ?? tx.created_at ?? tx.date ?? "");
  const product = String(
    tx.product_id ?? tx.productId ?? tx.product_name ?? tx.productName ?? ""
  );
  const amount = Number(tx.amount ?? tx.bill_value ?? tx.billValue ?? 0);
  const method = String(
    tx.payment_method ?? tx.paymentMethod ?? tx.method ?? tx.payment_mode ?? ""
  );
  return `${machineId}|${timestamp}|${product}|${amount}|${method}`;
}

function extractTransactions(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (!payload || typeof payload !== "object") return [];

  const obj = payload as Record<string, unknown>;
  for (const key of ["items", "data", "transactions", "results"]) {
    if (Array.isArray(obj[key])) return obj[key] as Record<string, unknown>[];
  }
  return [];
}

export async function findAnalyticsDuplicateTransactions(
  machineId?: string
): Promise<AnalyticsDuplicateReport> {
  const config = getAnalyticsConfig();
  const resolvedMachineId = (machineId || config.machineId || "").trim();

  const all: Record<string, unknown>[] = [];
  let page = 1;
  const pageSize = 100;

  while (page <= 500) {
    const response = await getDashboardTransactions({
      date_from: "",
      date_to: "",
      machine_id: resolvedMachineId || undefined,
      page,
      page_size: pageSize,
    });
    const batch = extractTransactions(response);
    all.push(...batch);
    if (batch.length < pageSize) break;
    page++;
  }

  const grouped = new Map<string, Record<string, unknown>[]>();
  for (const tx of all) {
    const key = transactionKey(tx);
    const list = grouped.get(key) ?? [];
    list.push(tx);
    grouped.set(key, list);
  }

  const groups: AnalyticsDuplicateGroup[] = [];
  let duplicateRows = 0;

  for (const [key, rows] of Array.from(grouped.entries())) {
    if (rows.length <= 1) continue;
    duplicateRows += rows.length - 1;

    const sourceIds = rows
      .map((row: Record<string, unknown>) =>
        String(row.source_id ?? row.id ?? row.transaction_id ?? "")
      )
      .filter(Boolean)
      .sort();

    const sample = rows[0];
    groups.push({
      key,
      count: rows.length,
      keepSourceId: sourceIds[0] ?? "",
      duplicateSourceIds: sourceIds.slice(1),
      sample: {
        timestamp: String(sample.timestamp ?? sample.created_at ?? ""),
        product: String(sample.product_name ?? sample.product_id ?? ""),
        amount: Number(sample.amount ?? 0),
        method: String(sample.payment_method ?? sample.method ?? ""),
        machine_id: String(sample.machine_id ?? ""),
      },
    });
  }

  groups.sort((a, b) => b.count - a.count);

  return {
    machineId: resolvedMachineId,
    totalTransactions: all.length,
    duplicateGroups: groups.length,
    duplicateRows,
    groups: groups.slice(0, 100),
    note:
      "The analytics API has no delete-transaction endpoint. Share this report with the analytics backend team for direct DB cleanup.",
  };
}
