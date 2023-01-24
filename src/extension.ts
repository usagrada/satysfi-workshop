import { commands, ExtensionContext, languages } from "vscode";
import { Builder } from "./builder";
import {
  COMMAND_BUILD,
  COMMAND_OPEN_BUILD_LOG,
  COMMAND_RESTART_LANGUAGE_SERVER,
  COMMAND_TYPECHECK,
} from "./const";
import { LanguageServer } from "./languageServer";
import { Logger } from "./logger";
import { packageCompletion } from "./packageCompletion";
import { StatusBar } from "./statusbar";
import { TypeChecker } from "./typeChecker";

export interface Context {
  logger: Logger;
  statusBar: StatusBar;
}

export function activate(extContext: ExtensionContext): void {
  const context = {
    logger: new Logger(),
    statusBar: new StatusBar(extContext),
  };

  const builder = new Builder(context);
  extContext.subscriptions.push(builder);

  const typeChecker = new TypeChecker(context);
  extContext.subscriptions.push(typeChecker);

  extContext.subscriptions.push(...packageCompletion());

  const languageServer = new LanguageServer(context);
  extContext.subscriptions.push(languageServer);

  const languagesSupported = ["satysfi"];
  const formatter = languages.registerDocumentFormattingEditProvider(
    languagesSupported.map((language) => ({ language, scheme: "file" })),
    {
      async provideDocumentFormattingEdits(document, options) {
        return await languageServer.format(document, options);
      },
    },
  );
  extContext.subscriptions.push(formatter);

  commands.registerCommand(COMMAND_BUILD, () => builder.buildProject());
  commands.registerCommand(COMMAND_TYPECHECK, () => typeChecker.checkCurrentDocument());
  commands.registerCommand(COMMAND_OPEN_BUILD_LOG, () => context.logger.showBuildLog());
  commands.registerCommand(COMMAND_RESTART_LANGUAGE_SERVER, () => languageServer.restartServer());
}
