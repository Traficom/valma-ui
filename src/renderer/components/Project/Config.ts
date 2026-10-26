import { ProjectSetting } from "./types/ProjectSetting";

export interface Config {
  settings?: ProjectSetting[];
  selected_settings_id?: string;
}