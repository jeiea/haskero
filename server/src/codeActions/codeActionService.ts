import { HaskeroCodeAction } from "./haskeroCodeAction";
import { TopLevelTypeSignatureCA } from "./topLevelTypeSignatureCA";

export class CodeActionService {
    public static readonly CodeActions: HaskeroCodeAction[] = [
        new TopLevelTypeSignatureCA()
    ]
}