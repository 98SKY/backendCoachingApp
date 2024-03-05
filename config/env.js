require('dotenv').config();

module.exports = {
  development: {
    PORT: process.env.DEV_PORT || 3000,
  },
  uat: {
    PORT: process.env.UAT_PORT || 4000,
  },
  production: {
    PORT: process.env.PROD_PORT || 5000,
  },
};
