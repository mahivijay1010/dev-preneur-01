function getMongoUri() {
  if (process.env.MONGODB_URI?.trim()) return process.env.MONGODB_URI.trim();

  const username = process.env.MONGO_USERNAME?.trim();
  const password = process.env.MONGO_PASSWORD;
  const host = process.env.MONGO_HOST?.trim();
  const database = process.env.MONGO_NAME?.trim();

  if (!username || !password || !host || !database) {
    throw new Error(
      'Set MONGODB_URI or provide MONGO_USERNAME, MONGO_PASSWORD, MONGO_HOST, and MONGO_NAME.',
    );
  }

  const credentials = `${encodeURIComponent(username)}:${encodeURIComponent(password)}`;
  if (host.endsWith('.mongodb.net')) {
    return `mongodb+srv://${credentials}@${host}/${encodeURIComponent(database)}?retryWrites=true&w=majority`;
  }

  const port = process.env.MONGO_PORT?.trim() || '27017';
  return `mongodb://${credentials}@${host}:${port}/${encodeURIComponent(database)}?authSource=admin`;
}

module.exports = { getMongoUri };
