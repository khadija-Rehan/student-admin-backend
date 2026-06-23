// PostgreSQL removed — all data is served from MongoDB (DigiKhyber)
// This stub keeps existing controller imports from breaking
const pool = {
  query: async () => ({ rows: [] }),
}
module.exports = pool
