import { formatCurrency } from "./formatCurrency";

export const getPaymentInstructions = (fee: number) => {
  const paymentInfo =
    process.env.PAYMENT_CARD_NUMBER ||
    "لطفا برای جزئیات پرداخت با پشتیبانی تماس بگیرید";
  const [cardNumber, cardOwner] = paymentInfo.split(",");
  // Format the fee using the helper function
  const formattedFee = formatCurrency(fee);

  return `لطفا مبلغ ${formattedFee} تومان را به حساب زیر واریز کنید:\nشماره کارت: ${cardNumber}\nصاحب کارت: ${cardOwner}\nپس از پرداخت، تصویر رسید پرداخت خود را آپلود کنید:`;
};
