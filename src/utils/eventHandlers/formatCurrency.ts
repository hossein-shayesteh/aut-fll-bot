export const formatCurrency = (amount: number | string): string => {
  // Convert to number if it's a string
  const numAmount = typeof amount === "string" ? parseInt(amount, 10) : amount;

  // Format with thousands separator
  const formattedAmount = numAmount.toLocaleString("fa-IR");

  return formattedAmount;
};
