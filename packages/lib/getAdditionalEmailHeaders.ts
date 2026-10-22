type EmailHostHeaders = {
  [key: string]: {
    [subKey: string]: string;
  };
};

export function getAdditionalEmailHeaders(): EmailHostHeaders {
  return {
    "smtp.emaildelivery.net": {
      "X-SMTPAPI": JSON.stringify({
        filters: {
          bypass_list_management: {
            settings: {
              enable: 1,
            },
          },
        },
      }),
    },
  };
}
