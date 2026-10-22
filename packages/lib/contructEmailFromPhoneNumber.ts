export const contructEmailFromPhoneNumber = (phoneNumber: string) => {
  const cleanedPhoneNumber = phoneNumber.replace(/\+/g, "");
  return `${cleanedPhoneNumber}@sms.scheduling.local`;
};
