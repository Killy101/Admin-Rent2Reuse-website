export interface Settings {
  general: {
    platformName: string;
    supportEmail: string;
    contactPhone: string;
    address: string;
    logo: string;
    favicon: string;
  };
  users: {
    defaultUserRole: string;
    registrationApproval: boolean;
    loginAttempts: number;
    passwordResetExpiry: number;
    sessionTimeout: number;
  };
  payment: {
    currency: string;
    platformFee: number;
    paymentGateways: {
      stripe: boolean;
      paypal: boolean;
      bankTransfer: boolean;
    };
    depositPercentage: number;
  };
  // Add other sections...
}
