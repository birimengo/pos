const logger = {
  info: (...args) => {
    console.log('📘 INFO:', ...args);
  },
  error: (...args) => {
    console.error('❌ ERROR:', ...args);
  },
  warn: (...args) => {
    console.warn('⚠️ WARN:', ...args);
  },
  debug: (...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 DEBUG:', ...args);
    }
  },
  transaction: (...args) => {
    console.log('📦 TRANSACTION:', ...args);
  }
};

export default logger;