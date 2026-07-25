import { createHash, createHmac } from "node:crypto";
import type { ParsedExecution } from "@/lib/import/tos";
import { normalizeBrokerSymbol } from "@/lib/import/securityIdentifiers";

type RecordValue = Record<string, unknown>;

type ExecutionCandidate = ParsedExecution & {
  brokerExecutionKey: string;
  rawOrderId: string;
};

type FeeEvent = {
  orderId: string;
  executedAt: number | null;
  amount: number;
};

export type SchwabNormalizedExecution = ParsedExecution & {
  brokerExecutionKey: string;
};

export type SchwabNormalizationResult = {
  executions: SchwabNormalizedExecution[];
  ordersRead: number;
  transactionsRead: number;
  excludedAssets: number;
  malformedExecutions: number;
  warnings: string[];
};

type NormalizeOptions = {
  accountHash: string;
  identitySecret: string;
  startEpoch: number;
  endEpochExclusive: number;
};

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function epochSeconds(value: unknown) {
  const timestamp = Date.parse(stringValue(value));
  return Number.isFinite(timestamp) ? Math.floor(timestamp / 1000) : null;
}

function hmac(secret: string, parts: Array<string | number>) {
  return createHmac("sha256", secret).update(parts.join("|")).digest("hex");
}

function sha1(parts: Array<string | number>) {
  return createHash("sha1").update(parts.join("|")).digest("hex");
}

function flattenOrders(values: unknown[]) {
  const orders: RecordValue[] = [];
  const visit = (value: unknown) => {
    if (!isRecord(value)) return;
    orders.push(value);
    for (const child of arrayValue(value.childOrderStrategies)) visit(child);
  };
  for (const value of values) visit(value);
  return orders;
}

function sideFromInstruction(instruction: string): "buy" | "sell" | null {
  const normalized = instruction.toUpperCase();
  if (normalized.includes("BUY")) return "buy";
  if (normalized.includes("SELL")) return "sell";
  return null;
}

function positionEffect(
  rawPositionEffect: string,
  instruction: string,
): "TO OPEN" | "TO CLOSE" | null {
  const normalized = `${rawPositionEffect} ${instruction}`.toUpperCase();
  if (normalized.includes("OPEN")) return "TO OPEN";
  if (normalized.includes("CLOS")) return "TO CLOSE";
  return null;
}

function feeEvents(transactions: unknown[]) {
  const events: FeeEvent[] = [];
  for (const value of transactions) {
    if (!isRecord(value)) continue;
    const orderId = stringValue(value.orderId);
    if (!orderId) continue;
    let amount = 0;
    for (const item of arrayValue(value.transferItems)) {
      if (!isRecord(item) || !stringValue(item.feeType)) continue;
      amount += Math.abs(numberValue(item.amount) ?? 0);
    }
    if (amount <= 0) continue;
    events.push({
      orderId,
      executedAt: epochSeconds(value.time),
      amount,
    });
  }
  return events;
}

function assignFees(executions: ExecutionCandidate[], events: FeeEvent[]) {
  let unmatched = 0;
  for (const event of events) {
    const candidates = executions.filter(
      (execution) => execution.rawOrderId === event.orderId,
    );
    if (candidates.length === 0) {
      unmatched += 1;
      continue;
    }
    const target = event.executedAt == null
      ? candidates[0]
      : candidates.reduce((closest, candidate) => (
          Math.abs(candidate.executedAt - event.executedAt!)
            < Math.abs(closest.executedAt - event.executedAt!)
            ? candidate
            : closest
        ));
    target.fees += event.amount;
  }
  return unmatched;
}

function assignCanonicalHashes(executions: ExecutionCandidate[]) {
  executions.sort(
    (left, right) =>
      left.executedAt - right.executedAt
      || left.symbol.localeCompare(right.symbol)
      || left.brokerExecutionKey.localeCompare(right.brokerExecutionKey),
  );
  const occurrences = new Map<string, number>();
  for (const execution of executions) {
    const base = [
      execution.symbol,
      execution.executedAt,
      execution.side,
      execution.quantity,
      execution.price,
      execution.posEffect ?? "",
    ].join("|");
    const occurrence = occurrences.get(base) ?? 0;
    occurrences.set(base, occurrence + 1);
    execution.sourceRowHash = sha1([base, occurrence]);
  }
}

function publicExecution(execution: ExecutionCandidate): SchwabNormalizedExecution {
  return {
    symbol: execution.symbol,
    brokerSymbol: execution.brokerSymbol,
    side: execution.side,
    quantity: execution.quantity,
    price: execution.price,
    executedAt: execution.executedAt,
    posEffect: execution.posEffect,
    fees: execution.fees,
    brokerOrderKey: execution.brokerOrderKey,
    sourceRowHash: execution.sourceRowHash,
    brokerExecutionKey: execution.brokerExecutionKey,
  };
}

export function normalizeSchwabHistory(
  orders: unknown[],
  transactions: unknown[],
  options: NormalizeOptions,
): SchwabNormalizationResult {
  const flattenedOrders = flattenOrders(orders);
  const executions: ExecutionCandidate[] = [];
  let excludedAssets = 0;
  let malformedExecutions = 0;
  let unknownPositionEffects = 0;
  let unknownInstructions = 0;

  for (const order of flattenedOrders) {
    const orderId = stringValue(order.orderId);
    const legs = arrayValue(order.orderLegCollection).filter(isRecord);
    const legsById = new Map(
      legs.map((leg, index) => [stringValue(leg.legId) || String(index), leg]),
    );
    const activities = arrayValue(order.orderActivityCollection).filter(isRecord);

    for (let activityIndex = 0; activityIndex < activities.length; activityIndex += 1) {
      const activity = activities[activityIndex];
      const activityId = stringValue(activity.activityId) || String(activityIndex);
      const executionType = stringValue(activity.executionType).toUpperCase();
      if (executionType && executionType !== "FILL") continue;
      const executionLegs = arrayValue(activity.executionLegs).filter(isRecord);

      for (let executionIndex = 0; executionIndex < executionLegs.length; executionIndex += 1) {
        const executionLeg = executionLegs[executionIndex];
        const legId = stringValue(executionLeg.legId) || String(executionIndex);
        const orderLeg = legsById.get(legId) ?? (legs.length === 1 ? legs[0] : null);
        const instrument = orderLeg && isRecord(orderLeg.instrument)
          ? orderLeg.instrument
          : null;
        const assetType = stringValue(instrument?.assetType).toUpperCase();
        if (assetType && assetType !== "EQUITY") {
          excludedAssets += 1;
          continue;
        }

        const rawSymbol = stringValue(instrument?.symbol).toUpperCase();
        const instruction = stringValue(orderLeg?.instruction).toUpperCase();
        const side = sideFromInstruction(instruction);
        const quantity = numberValue(executionLeg.quantity);
        const price = numberValue(executionLeg.price);
        const executedAt = epochSeconds(executionLeg.time);
        if (
          !orderId
          || !rawSymbol
          || !side
          || quantity == null
          || quantity <= 0
          || price == null
          || price <= 0
          || executedAt == null
        ) {
          malformedExecutions += 1;
          if (!side) unknownInstructions += 1;
          continue;
        }
        if (
          executedAt < options.startEpoch
          || executedAt >= options.endEpochExclusive
        ) {
          continue;
        }

        const normalizedSymbol = normalizeBrokerSymbol(rawSymbol);
        const posEffect = positionEffect(
          stringValue(orderLeg?.positionEffect),
          instruction,
        );
        if (!posEffect) unknownPositionEffects += 1;

        executions.push({
          symbol: normalizedSymbol.symbol,
          brokerSymbol: normalizedSymbol.resolution ? rawSymbol : undefined,
          side,
          quantity,
          price,
          executedAt,
          posEffect,
          fees: 0,
          brokerOrderKey: hmac(options.identitySecret, [
            "schwab-order",
            options.accountHash,
            orderId,
          ]),
          brokerExecutionKey: hmac(options.identitySecret, [
            "schwab-execution",
            options.accountHash,
            orderId,
            activityId,
            legId,
            executedAt,
            quantity,
            price,
          ]),
          rawOrderId: orderId,
          sourceRowHash: "",
        });
      }
    }
  }

  const unmatchedFeeEvents = assignFees(executions, feeEvents(transactions));
  assignCanonicalHashes(executions);

  const warnings = [
    excludedAssets > 0
      ? `${excludedAssets} non-equity execution ${excludedAssets === 1 ? "leg was" : "legs were"} excluded.`
      : null,
    malformedExecutions > 0
      ? `${malformedExecutions} execution ${malformedExecutions === 1 ? "leg was" : "legs were"} excluded because required fields were missing or invalid.`
      : null,
    unknownInstructions > 0
      ? `${unknownInstructions} execution ${unknownInstructions === 1 ? "instruction was" : "instructions were"} not recognized.`
      : null,
    unknownPositionEffects > 0
      ? `${unknownPositionEffects} execution ${unknownPositionEffects === 1 ? "leg has" : "legs have"} no opening/closing position effect.`
      : null,
    unmatchedFeeEvents > 0
      ? `${unmatchedFeeEvents} fee ${unmatchedFeeEvents === 1 ? "record did" : "records did"} not match an execution in the selected dates.`
      : null,
  ].filter((warning): warning is string => warning != null);

  return {
    executions: executions.map(publicExecution),
    ordersRead: flattenedOrders.length,
    transactionsRead: transactions.length,
    excludedAssets,
    malformedExecutions,
    warnings,
  };
}
