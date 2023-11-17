const mongoose = require('mongoose');
const { createClient } = require('redis');
const keys = require('../config/keys');

let client;

const startRedis = async () => {
  client = await createClient({
    url: keys.redisUrl,
  })
    .on('error', (err) => console.log(err))
    .connect();
};

startRedis();

const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function (options = {}) {
  this.useCache = true;
  this.hashKey = JSON.stringify(options.key || '');
  //Makes the function chainable
  return this;
};

mongoose.Query.prototype.exec = async function () {
  if (!this.useCache) {
    return exec.apply(this, arguments);
  }
  const key = JSON.stringify(
    Object.assign({}, this.getQuery(), {
      collection: this.mongooseCollection.name,
    })
  );

  //Fetch document from redis cache using the key set from the cache function
  const cacheValue = await client.hGet(this.hashKey, key);

  if (cacheValue) {
    const doc = JSON.parse(cacheValue);
    return Array.isArray(doc)
      ? doc.map((d) => this.model(d))
      : new this.model(doc);
  }

  const result = await exec.apply(this, arguments);

  await client.hSet(this.hashKey, key, JSON.stringify(result), {
    EX: 10,
  });

  return result;
};

module.exports = {
  async clearHash(hashKey) {
    await client.del(JSON.stringify(hashKey));
  },
};
