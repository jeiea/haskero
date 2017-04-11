import CheckBox from './checkBox'
import * as vscode from 'vscode';

export default class CheckBoxList {
    constructor(private readonly checkBoxes: CheckBox[]) { }

    public show(): Thenable<CheckBox[]> {
        return this.innerShow(this.checkBoxes);
    }

    private innerShow(checkBoxes: CheckBox[]): Thenable<CheckBox[]> {

        let qpOptions = checkBoxes.map(c => c.name());
        qpOptions.push("Validate");

        return vscode.window.showQuickPick(qpOptions).then((selectedNames) => {
            //If user validate the choices
            if (selectedNames === "Validate") {
                return checkBoxes;
            }
            //else, the user select (or unselect) an option
            else {
                const selectedChoice = checkBoxes.find(c => c.value === CheckBox.nameToValue(selectedNames));

                if (selectedChoice.isUnique) {
                    checkBoxes.forEach(cb => {
                        cb.unCheck();
                    });
                }
                else {
                    checkBoxes.filter(cb => cb.isUnique).forEach(cb => {
                        cb.unCheck();
                    });
                }

                selectedChoice.switch();
                return this.innerShow(checkBoxes);
            }
        });
    }
}