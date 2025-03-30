import { formatCurrency } from "./formatCurrency";
import { isStudentIdProvided } from "./isStudentIdProvided";

export const getPaymentInstructions = (
  fee: number,
  studentId: string | undefined
) => {
  const hasValidStudentId = isStudentIdProvided(studentId);

  const paymentInfo = hasValidStudentId
    ? process.env.PAYMENT_CARD_NUMBER ||
      "لطفا برای جزئیات پرداخت با پشتیبانی تماس بگیرید"
    : process.env.SECOND_PAYMENT_CARD_NUMBER ||
      "لطفا برای جزئیات پرداخت با پشتیبانی تماس بگیرید";
  const [cardNumber, cardOwner] = paymentInfo.split(",");
  // Format the fee using the helper function
  const formattedFee = formatCurrency(fee);

  return `لطفا مبلغ ${formattedFee} تومان را به حساب زیر واریز کنید:\nشماره کارت: ${cardNumber}\nصاحب کارت: ${cardOwner}\nپس از پرداخت، تصویر رسید پرداخت خود را آپلود کنید:`;
};
