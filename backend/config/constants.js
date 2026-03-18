export const PAYMENT_METHODS = ['cash', 'card', 'mobile_money', 'bank_transfer', 'mixed'];
export const TRANSACTION_STATUS = ['completed', 'refunded', 'voided'];
export const USER_ROLES = ['admin', 'manager', 'cashier', 'inventory_manager'];
export const STOCK_ALERT_LEVELS = {
  LOW: 5,
  CRITICAL: 2,
  OUT: 0
};

export default {
  PAYMENT_METHODS,
  TRANSACTION_STATUS,
  USER_ROLES,
  STOCK_ALERT_LEVELS
};