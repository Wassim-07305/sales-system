"use server";

import { createClient } from "@/lib/supabase/server";

export interface CashFlowMonthData {
  month: string;
  received: number | null;
  expected: number | null;
}

export interface UpcomingPayment {
  id: string;
  contract_id: string;
  contract_ref: string;
  client_name: string;
  amount: number;
  due_date: string;
  status: string;
}

export interface CashFlowData {
  receivedThisMonth: number;
  expectedThisMonth: number;
  overdueTotal: number;
  recognizedTotal: number;
  chartData: CashFlowMonthData[];
  upcomingPayments: UpcomingPayment[];
  revenueBreakdown: {
    received: number;
    pending: number;
    overdue: number;
  };
}

export async function getCashFlowData(): Promise<CashFlowData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Build date range: 6 months ago to 3 months in future
  const sixMonthsAgo = new Date(currentYear, currentMonth - 5, 1);
  const threeMonthsFuture = new Date(currentYear, currentMonth + 4, 0);

  const startDate = sixMonthsAgo.toISOString().split("T")[0];
  const endDate = threeMonthsFuture.toISOString().split("T")[0];
  const today = now.toISOString().split("T")[0];

  // Current month boundaries
  const monthStart = new Date(currentYear, currentMonth, 1)
    .toISOString()
    .split("T")[0];
  const monthEnd = new Date(currentYear, currentMonth + 1, 0)
    .toISOString()
    .split("T")[0];

  // Fetch all installments in range with contract + client info
  const { data: installments } = await supabase
    .from("payment_installments")
    .select(
      "*, contract:contracts(id, amount, status, client:profiles(id, full_name))"
    )
    .gte("due_date", startDate)
    .lte("due_date", endDate)
    .order("due_date", { ascending: true });

  const all = installments || [];

  // Fetch overdue (past due, not paid) - no date upper bound needed
  const { data: overdueInstallments } = await supabase
    .from("payment_installments")
    .select("amount")
    .lt("due_date", today)
    .neq("status", "paid");

  const overdueTotal = (overdueInstallments || []).reduce(
    (s, p) => s + (p.amount || 0),
    0
  );

  // Revenue recognized = sum of all paid installments ever
  const { data: allPaid } = await supabase
    .from("payment_installments")
    .select("amount")
    .eq("status", "paid");

  const recognizedTotal = (allPaid || []).reduce(
    (s, p) => s + (p.amount || 0),
    0
  );

  // This month metrics
  const thisMonthInstallments = all.filter(
    (p) => p.due_date >= monthStart && p.due_date <= monthEnd
  );
  const receivedThisMonth = thisMonthInstallments
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + (p.amount || 0), 0);
  const expectedThisMonth = thisMonthInstallments
    .filter((p) => p.status !== "paid")
    .reduce((s, p) => s + (p.amount || 0), 0);

  // Build chart data: 6 past months + current + 3 future months
  const monthNames = [
    "Jan",
    "Fev",
    "Mar",
    "Avr",
    "Mai",
    "Jun",
    "Jul",
    "Aou",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const chartData: CashFlowMonthData[] = [];
  for (let offset = -5; offset <= 3; offset++) {
    const d = new Date(currentYear, currentMonth + offset, 1);
    const mStart = d.toISOString().split("T")[0];
    const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    const monthInstallments = all.filter(
      (p) => p.due_date >= mStart && p.due_date <= mEnd
    );

    const isPast = offset <= 0;
    const received = monthInstallments
      .filter((p) => p.status === "paid")
      .reduce((s, p) => s + (p.amount || 0), 0);
    const expected = monthInstallments.reduce(
      (s, p) => s + (p.amount || 0),
      0
    );

    chartData.push({
      month: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
      received: isPast ? received : null,
      expected: offset >= 0 ? expected : null,
    });
  }

  // Upcoming payments (next 3 months, not paid)
  const futureStart = monthStart;
  const futureEnd = new Date(currentYear, currentMonth + 3, 0)
    .toISOString()
    .split("T")[0];

  const upcomingPayments: UpcomingPayment[] = all
    .filter(
      (p) =>
        p.due_date >= futureStart &&
        p.due_date <= futureEnd &&
        p.status !== "paid"
    )
    .map((p) => ({
      id: p.id,
      contract_id: p.contract_id,
      contract_ref: `#${(p.contract_id || "").slice(0, 8)}`,
      client_name:
        (p.contract as any)?.client?.full_name || "Client inconnu",
      amount: p.amount || 0,
      due_date: p.due_date,
      status: p.due_date < today ? "overdue" : p.status,
    }));

  // Revenue breakdown for pie chart: all installments from signed contracts
  const { data: allInstallments } = await supabase
    .from("payment_installments")
    .select("amount, status, due_date");

  const allInst = allInstallments || [];
  const totalReceived = allInst
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + (p.amount || 0), 0);
  const totalOverdue = allInst
    .filter((p) => p.status !== "paid" && p.due_date < today)
    .reduce((s, p) => s + (p.amount || 0), 0);
  const totalPending = allInst
    .filter((p) => p.status !== "paid" && p.due_date >= today)
    .reduce((s, p) => s + (p.amount || 0), 0);

  return {
    receivedThisMonth,
    expectedThisMonth,
    overdueTotal,
    recognizedTotal,
    chartData,
    upcomingPayments,
    revenueBreakdown: {
      received: totalReceived,
      pending: totalPending,
      overdue: totalOverdue,
    },
  };
}
