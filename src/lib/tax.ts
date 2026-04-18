type TaxInfo = {
  name: string;
  percentage: number;
  isInclusive: boolean;
};

export type TaxBreakdownItem = {
  taxName: string;
  taxPercent: number;
  taxAmount: number;
};

export function calculateItemTax(
  unitPrice: number,
  quantity: number,
  taxes: TaxInfo[]
): { taxBreakdown: TaxBreakdownItem[]; taxTotal: number } {
  const lineTotal = unitPrice * quantity;
  const taxBreakdown: TaxBreakdownItem[] = [];
  let taxTotal = 0;

  for (const tax of taxes) {
    const pct = tax.percentage;
    let taxAmount: number;

    if (tax.isInclusive) {
      // Extract tax from the inclusive price
      taxAmount = lineTotal - lineTotal / (1 + pct / 100);
    } else {
      // Add tax on top
      taxAmount = lineTotal * (pct / 100);
    }

    taxAmount = Math.round(taxAmount * 100) / 100;
    taxTotal += taxAmount;

    taxBreakdown.push({
      taxName: tax.name,
      taxPercent: pct,
      taxAmount,
    });
  }

  return { taxBreakdown, taxTotal: Math.round(taxTotal * 100) / 100 };
}

export function calculateOrderTotals(
  items: {
    unitPrice: number;
    quantity: number;
    taxes: TaxInfo[];
  }[]
): {
  subtotal: number;
  taxAmount: number;
  taxBreakdown: TaxBreakdownItem[];
  total: number;
} {
  let subtotal = 0;
  const taxMap = new Map<string, TaxBreakdownItem>();

  for (const item of items) {
    const lineTotal = item.unitPrice * item.quantity;
    subtotal += lineTotal;

    const { taxBreakdown } = calculateItemTax(
      item.unitPrice,
      item.quantity,
      item.taxes
    );

    for (const tb of taxBreakdown) {
      const key = `${tb.taxName}-${tb.taxPercent}`;
      const existing = taxMap.get(key);
      if (existing) {
        existing.taxAmount += tb.taxAmount;
      } else {
        taxMap.set(key, { ...tb });
      }
    }
  }

  subtotal = Math.round(subtotal * 100) / 100;
  const taxBreakdown = Array.from(taxMap.values()).map((t) => ({
    ...t,
    taxAmount: Math.round(t.taxAmount * 100) / 100,
  }));
  const taxAmount = taxBreakdown.reduce((sum, t) => sum + t.taxAmount, 0);
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  return { subtotal, taxAmount, taxBreakdown, total };
}
