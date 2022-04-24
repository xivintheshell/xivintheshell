import {IConfig} from "../Game/Common";
import {TickMode} from "./Common";

export interface IPlaybackSettings {
    tickMode: TickMode,
    stepSize: number,
    timeScale: number
}

export class LocalStorage {
    static storeConfig(config: IConfig): void {
        localStorage.setItem("config", JSON.stringify(config));
    }
    static loadConfig(): IConfig | undefined {
        let configStr = localStorage.getItem("config");
        if (configStr) {
            let config = JSON.parse(configStr);
            return config;
        }
        return undefined;
    }

    static storePlaybackSettings(settings: IPlaybackSettings) {
        let str = JSON.stringify({
            tickMode: settings.tickMode,
            stepSize: settings.stepSize,
            timeScale: settings.timeScale
        });
        localStorage.setItem("playbackSettings", str);
    }
    static loadPlaybackSettings(): IPlaybackSettings | undefined {
        let str = localStorage.getItem("playbackSettings");
        if (str) {
            let settings = JSON.parse(str);
            return settings;
        }
        return undefined;
    }
}