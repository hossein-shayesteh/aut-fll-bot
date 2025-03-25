export const validators = {
  phoneNumber: (value: string) =>
    /((09)|(\+?989))\d{2}[-\s]?\d{3}[-\s]?\d{4}/g.test(value),
  studentId: (value: string) =>
    /^(?:(?:9[6-9]|40[0-4])(?:(?:2[2-9]|3[0-4]|39|1[0-3])|1(?:2[2-9]|3[0-4]|39|1[0-3])|2(?:2[2-9]|3[0-4]|39|1[0-3]))(?:\d{3}))$/.test(
      value
    ),
};
