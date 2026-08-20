
import { FileFilter } from 'electron';
const path = (window as any).path;
const windowFileDialog = (window as any).files.openFileDialog;


export const openFolderDialog = async (inputPath?: string) => {
  const defaultPath =
    inputPath && path.extname(inputPath)
      ? path.dirname(inputPath)
      : inputPath;

  const result = await windowFileDialog({
    defaultPath,
    properties: ['openDirectory'],
  });

  return result.canceled ? null : result.filePaths[0];
};


export const openFileDialog = async (path: string, filters: FileFilter[]) => {
  const result = await windowFileDialog({ defaultPath: path, properties: ['openFile'], filters: filters});
  return result.canceled ? null : result.filePaths[0];
}