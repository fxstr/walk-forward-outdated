import path from 'path';
/**
 * Gets instrument from file name by removing the file ending and de-capitalizing all letters.
 * @param  {String} fileName    File name
 * @return {String}             Instrument's name
 */

export default function getInstrumentNameFromFileName(fileName) {
  return path.basename(fileName).replace(/\.\w+$/, '').toLowerCase();
}
//# sourceMappingURL=getInstrumentNameFromFileName.mjs.map