// Azure Blob Storage driver. The container is private; read links are
// short-lived SAS URLs generated on demand.
//
// Blob names have no real folders — a "/" in the name is shown as a folder in
// the Portal. AZURE_STORAGE_PREFIX puts every file under one top-level folder
// (e.g. "ara_workspace" or "profile/ara_workspace") so this app's files never
// mix with anything else already in the container.
const { BlobServiceClient, BlobSASPermissions } = require("@azure/storage-blob");

const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER || "ara-workspace";
const PREFIX = (process.env.AZURE_STORAGE_PREFIX || "ara_workspace").replace(/^\/+|\/+$/g, "");

const toBlobName = (key) => (PREFIX ? `${PREFIX}/${key}` : key);

let containerPromise = null;

// Connect lazily on first use. The container must already exist — creating
// one automatically would hide a typo in AZURE_STORAGE_CONTAINER.
const getContainer = () => {
  if (!containerPromise) {
    const service = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
    const container = service.getContainerClient(CONTAINER_NAME);
    containerPromise = container.exists().then((found) => {
      if (!found) {
        containerPromise = null;
        throw new Error(
          `[storage] Azure container "${CONTAINER_NAME}" was not found. Check AZURE_STORAGE_CONTAINER.`
        );
      }
      return container;
    });
  }
  return containerPromise;
};

const upload = async ({ key, buffer, contentType }) => {
  const container = await getContainer();
  await container.getBlockBlobClient(toBlobName(key)).uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentType }
  });
};

const getUrl = async (key, { expiresInSeconds = 900, fileName, download = false } = {}) => {
  const container = await getContainer();
  const disposition = download ? "attachment" : "inline";
  return container.getBlobClient(toBlobName(key)).generateSasUrl({
    permissions: BlobSASPermissions.parse("r"),
    expiresOn: new Date(Date.now() + expiresInSeconds * 1000),
    contentDisposition: fileName ? `${disposition}; filename="${fileName.replace(/"/g, "")}"` : disposition
  });
};

const remove = async (key) => {
  const container = await getContainer();
  await container.getBlobClient(toBlobName(key)).deleteIfExists();
};

module.exports = {
  name: "azure",
  container: CONTAINER_NAME,
  prefix: PREFIX,
  upload,
  getUrl,
  remove
};
