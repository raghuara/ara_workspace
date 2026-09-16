// Picks the storage driver from STORAGE_DRIVER (local | azure). Controllers
// only ever call storage.upload / storage.getUrl / storage.remove, so
// switching drivers is an environment-variable change, not a code change.
const localDriver = require("./local.driver");

const wanted = (process.env.STORAGE_DRIVER || "local").toLowerCase();
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || "";
const looksReal = /^(DefaultEndpointsProtocol|BlobEndpoint)=/i.test(connectionString);

let driver = localDriver;

if (wanted === "azure") {
  if (looksReal) {
    driver = require("./azure.driver");
  } else {
    console.warn(
      "[storage] STORAGE_DRIVER=azure but AZURE_STORAGE_CONNECTION_STRING is missing or a placeholder — using local disk instead."
    );
  }
}

console.log(
  driver.name === "azure"
    ? `[storage] driver: azure | container: ${driver.container} | folder: ${driver.prefix || "(root)"}`
    : "[storage] driver: local"
);

module.exports = driver;
