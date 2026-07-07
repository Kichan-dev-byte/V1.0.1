import path from 'path';

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: '0.0.0.0',
  env: process.env.NODE_ENV || 'development',
  dbFilePath: path.join(process.cwd(), 'database.db'),
  defaultSettings: {
    rateStandard: 2.00,
    rateVIP: 3.50,
    rateConsole: 4.00,
    shopName: "NEX Gaming Lounge",
    currencySymbol: "$",
    taxRate: 0.10,
    enableAutoLock: true,
    warnMinutesRemaining: 5,
  }
};
