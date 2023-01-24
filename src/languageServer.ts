import {
  Disposable,
  FormattingOptions,
  languages,
  TextDocument,
  TextEdit,
  workspace,
} from "vscode";
import { LanguageClient, LanguageClientOptions, ServerOptions } from "vscode-languageclient/node";
import { Context } from "./extension";
import { Logger } from "./logger";
import { getConfig } from "./util";

export class LanguageServer implements Disposable {
  private enabled: boolean;
  private path: string;
  private client: LanguageClient | null = null;
  private readonly disposables: Disposable[] = [];
  private readonly logger: Logger;

  constructor(context: Context) {
    this.logger = context.logger;

    const config = getConfig();
    this.enabled = config.languageServer.enabled;
    this.path = config.languageServer.path;

    const languagesSupported = ["satysfi"];
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    this.disposables.push(
      workspace.onDidChangeConfiguration(() => {
        const config = getConfig();

        if (config.languageServer.path !== this.path) {
          if (this.enabled) {
            this.stopServer();
            this.startServer();
          }
          this.path = config.languageServer.path;
        }

        if (config.languageServer.enabled !== this.enabled) {
          if (config.languageServer.enabled) {
            this.startServer();
          } else {
            this.stopServer();
          }
          this.enabled = config.languageServer.enabled;
        }
      }),
      languages.registerDocumentFormattingEditProvider(
        languagesSupported.map((language) => ({ language, scheme: "file" })),
        {
          async provideDocumentFormattingEdits(document, options) {
            return await self.format(document, options);
          },
        },
      ),
    );

    if (this.enabled) this.startServer();
  }

  private async startServer() {
    const serverPath = getConfig().languageServer.path;

    const serverOptions: ServerOptions = {
      run: { command: serverPath },
      debug: { command: serverPath },
    };

    const clientOptions: LanguageClientOptions = {
      documentSelector: [{ scheme: "file", language: "satysfi" }],
    };

    this.client = new LanguageClient(
      "satysfi-language-server",
      "SATySFi Language Server",
      serverOptions,
      clientOptions,
    );

    await this.client.start();

    this.logger.log(`Language Server: start ${serverPath}`);
  }

  private async stopServer() {
    await this.client?.stop();
    this.client = null;

    this.logger.log("Language Server: stop");
  }

  public async restartServer() {
    await this.stopServer();
    return this.startServer();
  }

  public async format(document: TextDocument, options: FormattingOptions): Promise<TextEdit[]> {
    if (!this.client) return [];
    return await this.client.sendRequest("textDocument/formatting", {
      textDocument: { uri: document.uri.toString() },
      options,
    });
  }

  public dispose(): void {
    this.stopServer();
    this.disposables.forEach((d) => d.dispose());
  }
}
