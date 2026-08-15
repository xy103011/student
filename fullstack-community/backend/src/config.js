module.exports = {
  PORT: process.env.PORT || 3001,
  JWT_SECRET: process.env.JWT_SECRET || 'fullstack-community-dev-secret',
  JWT_EXPIRES: '7d',
};
