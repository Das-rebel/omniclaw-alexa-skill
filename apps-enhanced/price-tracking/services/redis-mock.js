/**
 * Mock Redis for Cloud Run deployment
 * No external dependencies needed
 */
module.exports = {
  createClient: () => ({
    connect: async () => {},
    quit: async () => {},
    xadd: async () => 'mock-id',
    xread: async () => [],
    xgroup_create: async () => {},
    ping: async () => 'PONG'
  })
};
