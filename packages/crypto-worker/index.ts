import {
  SerializedKey,
  Plaintext,
  OutputFormat,
  Cipher,
  EncryptionKey,
  Chunk
} from "@notesnook/crypto/dist/src/types";
import { NNCryptoWorkerModule } from "./src/worker";
import { INNCrypto, IStreamable } from "@notesnook/crypto/dist/src/interfaces";
import { wrap } from "comlink";

export class NNCryptoWorker implements INNCrypto {
  private worker?: Worker;
  private workermodule?: NNCryptoWorkerModule;
  private isReady = false;
  private path?: string;

  constructor(path?: string) {
    this.path = path;
  }

  private async init() {
    if (!this.path) throw new Error("path cannot be undefined.");
    if (this.isReady) return;

    this.worker = new Worker(this.path);
    this.workermodule = wrap<NNCryptoWorkerModule>(this.worker);
    // this.workermodule = await spawn<NNCryptoWorkerModule>(this.worker);
    this.isReady = true;
  }

  async encrypt(
    key: SerializedKey,
    plaintext: Plaintext,
    outputFormat: OutputFormat = "uint8array"
  ): Promise<Cipher> {
    await this.init();
    if (!this.workermodule) throw new Error("Worker module is not ready.");

    return this.workermodule.encrypt(key, plaintext, outputFormat);
  }

  async decrypt(
    key: SerializedKey,
    cipherData: Cipher,
    outputFormat: OutputFormat = "text"
  ): Promise<Plaintext> {
    await this.init();
    if (!this.workermodule) throw new Error("Worker module is not ready.");

    return this.workermodule.decrypt(key, cipherData, outputFormat);
  }

  async hash(password: string, salt: string): Promise<string> {
    await this.init();
    if (!this.workermodule) throw new Error("Worker module is not ready.");

    return this.workermodule.hash(password, salt);
  }

  async deriveKey(password: string, salt?: string): Promise<EncryptionKey> {
    await this.init();
    if (!this.workermodule) throw new Error("Worker module is not ready.");

    return this.workermodule.deriveKey(password, salt);
  }

  async exportKey(password: string, salt?: string): Promise<SerializedKey> {
    await this.init();
    if (!this.workermodule) throw new Error("Worker module is not ready.");

    return this.workermodule.exportKey(password, salt);
  }

  async encryptStream(
    key: SerializedKey,
    stream: IStreamable,
    streamId?: string
  ): Promise<string> {
    if (!streamId) throw new Error("streamId is required.");
    await this.init();
    if (!this.workermodule) throw new Error("Worker module is not ready.");
    if (!this.worker) throw new Error("Worker is not ready.");

    const eventListener = await this.createWorkerStream(
      streamId,
      stream,
      () => {
        if (this.worker)
          this.worker.removeEventListener("message", eventListener);
      }
    );
    this.worker.addEventListener("message", eventListener);
    const iv = await this.workermodule.createEncryptionStream(streamId, key);
    this.worker.removeEventListener("message", eventListener);
    return iv;
  }

  async decryptStream(
    key: SerializedKey,
    iv: string,
    stream: IStreamable,
    streamId?: string
  ): Promise<void> {
    if (!streamId) throw new Error("streamId is required.");
    await this.init();
    if (!this.workermodule) throw new Error("Worker module is not ready.");
    if (!this.worker) throw new Error("Worker is not ready.");

    const eventListener = await this.createWorkerStream(
      streamId,
      stream,
      () => {
        if (this.worker)
          this.worker.removeEventListener("message", eventListener);
      }
    );
    this.worker.addEventListener("message", eventListener);
    await this.workermodule.createDecryptionStream(streamId, iv, key);
    this.worker.removeEventListener("message", eventListener);
  }

  private async createWorkerStream(
    streamId: string,
    stream: IStreamable,
    done: () => void
  ): Promise<EventListenerObject> {
    const readEventType = `${streamId}:read`;
    const writeEventType = `${streamId}:write`;
    let finished = false;
    return {
      handleEvent: async (ev: MessageEvent) => {
        if (finished) return;

        const { type } = ev.data;
        if (type === readEventType) {
          const chunk = await stream.read();
          if (!chunk || !this.worker || !chunk.data) return;
          this.worker.postMessage({ type, data: chunk }, [chunk.data.buffer]);
        } else if (type === writeEventType) {
          const chunk = ev.data.data as Chunk;
          await stream.write(chunk);
          if (chunk.final) {
            finished = true;
            done();
          }
        }
      }
    };
  }
}
