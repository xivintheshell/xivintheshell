import {FileType} from "./Common";
import {ActionNode, Line} from "./Record";

type Fixme = any;

export class PresetLinesManager {
    presetLines: Line[] = [];

    constructor() {
        this.#load();
    }

    #save() {
        localStorage.setItem("presetLines", JSON.stringify(this.serialized()));
    }

    #load() {
        let data = localStorage.getItem("presetLines");
        if (data !== null) {
            let content = JSON.parse(data);
            this.deserializeAndAppend(content);
        }
    }

    serialized() {
        return {
            fileType: FileType.SkillSequencePresets,
            presets: this.presetLines.map(line=>{
                return line.serialized();
            }),
        }
    }

    deserializeAndAppend(content: Fixme) {
        for (let i = 0; i < content.presets.length; i++) {
            let line = new Line();
            line.name = content.presets[i].name;
            for (let j = 0; j < content.presets[i].actions.length; j++) {
                let action = content.presets[i].actions[j];
                let node = new ActionNode(action.type);
                node.skillName = action.skillName;
                node.waitDuration = action.waitDuration;
                line.addActionNode(node);
            }
            this.addLine(line);
        }
        this.#save();
    }

    addLine(line: Line) {
        this.presetLines.push(line);
        this.#save();
    }

    deleteLine(line: Line) {
        for (let i = 0; i < this.presetLines.length; i++) {
            if (this.presetLines[i] === line) {
                this.presetLines.splice(i, 1);
                this.#save();
                return;
            }
        }
        console.assert(false);
    }

    deleteAllLines() {
        this.presetLines = [];
        this.#save();
    }

}
