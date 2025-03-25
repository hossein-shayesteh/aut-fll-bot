// Helper functions
export const getPaymentInstructions = (fee: number | string) => {
  const paymentInfo =
    process.env.PAYMENT_CARD_NUMBER ||
    "Please contact admin for payment details";
  const [cardNumber, cardOwner] = paymentInfo.split(",");
  return `Please pay ${fee} to:\nCard Number: ${cardNumber}\nCard Owner: ${cardOwner}\nAfter payment, upload your payment receipt image:`;
};
