/** @format */

// Common file-system operations shares by classes in Pnut-TS.

// src/utils/files.ts

'use strict';
import * as path from 'path';
import * as fs from 'fs';
import { Context } from './context';
import { ChildObjectsImage } from '../classes/childObjectsImage';
import { ObjectImage } from '../classes/objectImage';

export function libraryDir(): string {
  return './lib';
}

/**
 * filters interferring characters from URI form of fileSpec returning just a fileSpec
 * @export
 * @param {string} docUri the URI form of a filespec
 * @return {string}  just a useable fileSpec
 */
export function fileSpecFromURI(docUri: string): string {
  const spaceRegEx = /%20/g; // we are globally replacing %20 markers
  const fileRegEx = /^file:\/\//i; // remove leading "file://", case-insensative
  return docUri.replace(fileRegEx, '').replace(spaceRegEx, ' ');
}

/**
 * Checks if a file is a Spin file.
 * @param {string} fileSpec - The path to the file.
 * @returns {boolean} True if the file is a Spin file, false otherwise.
 */
export function isSpin1File(fileSpec: string): boolean {
  const spinFileStatus: boolean = fileSpec.toLowerCase().endsWith('.spin');
  return spinFileStatus;
}

/**
 * Checks if a file is a Spin2 file.
 * @param {string} fileSpec - The path to the file.
 * @returns {boolean} True if the file is a Spin2 file, false otherwise.
 */
export function isSpin2File(fileSpec: string): boolean {
  const spinFileStatus: boolean = fileSpec.toLowerCase().endsWith('.spin2');
  return spinFileStatus;
}

/**
 * Checks if a file has a Spin extension.
 * @param {string} filename - The name of the file.
 * @returns {boolean} True if the file has a Spin extension, false otherwise.
 */
export function isSpinExt(filename: string): boolean {
  return ['.spin', '.spin2', '.p2asm'].includes(path.extname(filename).toLowerCase());
}

/**
 * Checks if a file exists.
 * @param {string} pathSpec - The path to the file.
 * @returns {boolean} True if the file exists, false otherwise.
 */
export function fileExists(pathSpec: string): boolean {
  let existsStatus: boolean = false;
  if (fs.existsSync(pathSpec)) {
    // File exists in path
    existsStatus = true;
  }
  return existsStatus;
}

export function fileSize(fileSpec: string) {
  let fileSize: number = 0;
  if (fileExists(fileSpec)) {
    const stats = fs.statSync(fileSpec);
    fileSize = stats.size;
  }
  return fileSize;
}

/**
 * locate named include .spin2 file which can be in current directory
 *  NOTE: searches include directory first then the current directory
 *
 * @export
 * @param {string} includePath - an optional include file folder to search
 * @param {string} currPath - the folder containing the current source file
 * @param {string} filename - the name of file to be located
 * @return {*}  {string|undefined} - returns the fileSpec of the file if found, else undefined
 */
export function locateIncludeFile(includePaths: string[], currPath: string, filename: string): string | undefined {
  let locatedFSpec: string | undefined = undefined;
  if (isSpin2File(filename)) {
    for (const includePath of includePaths) {
      if (dirExists(includePath)) {
        const fileSpec: string = path.join(includePath, filename);
        if (fileExists(fileSpec)) {
          locatedFSpec = fileSpec;
          break;
        }
      }
    }
    if (!locatedFSpec && currPath.length > 0 && dirExists(currPath)) {
      const fileSpec: string = path.join(currPath, filename);
      if (fileExists(fileSpec)) {
        locatedFSpec = fileSpec;
      }
    }
  }
  return locatedFSpec;
}

/**
 * locate named .spin2 file which can be in current directory
 * NOTE: The current directory is searched first then the built-in library path is searched
 *
 * @export
 * @param {string} filename
 * @return {*}  {(string | undefined)}
 */
export function locateSpin2File(filename: string, canSearchLibray: boolean = false, ctx: Context): string | undefined {
  let locatedFSpec: string | undefined = undefined;
  if (isSpin2File(filename)) {
    // is it in our current directory?
    let fileSpec: string = path.join(ctx.currentFolder, filename);
    //if (ctx) ctx.logger.logMessage(`TRC: locateSpin2File() checking [${fileSpec}]`);
    if (fileExists(fileSpec)) {
      locatedFSpec = fileSpec;
    } else if (canSearchLibray) {
      // no, is it in our LIB directory?
      fileSpec = path.join(libraryDir(), filename);
      //if (ctx) ctx.logger.logMessage(`TRC: locateSpin2File() checking [${fileSpec}]`);
      if (fileExists(fileSpec)) {
        locatedFSpec = fileSpec;
      }
    }
    // NEW Issue (#9) allow OBJ files to exist in include folders
    if (locatedFSpec === undefined && ctx.preProcessorOptions.includeFolders.length > 0) {
      for (const includeFolder of ctx.preProcessorOptions.includeFolders) {
        const incFolder: string = path.join(ctx.currentFolder, includeFolder);
        //if (ctx) ctx.logger.logMessage(`TRC: locateSpin2File() CHK inc [${incFolder}]`);
        if (dirExists(incFolder)) {
          fileSpec = path.join(incFolder, filename);
          //if (ctx) ctx.logger.logMessage(`TRC: locateSpin2File() checking [${fileSpec}]`);
          if (fileExists(fileSpec)) {
            locatedFSpec = fileSpec;
            break; // found it, so exit loop
          }
        }
      }
    }
    //if (ctx) ctx.logger.logMessage(`TRC: locateSpin2File() -> [${locatedFSpec}]`);
    //} else {
    //if (ctx) ctx.logger.logMessage(`TRC: locateSpin2File(${path.basename(filename)}) NOT a .spin2 file!`);
  }
  return locatedFSpec;
}

/**
 * locate named .spin2 file which can be in current directory
 * NOTE: The current directory is searched first then the built-in library path is searched
 *
 * @export
 * @param {string} filename
 * @return {*}  {(string | undefined)}
 */
export function locateDataFile(workingDir: string, filename: string, ctx?: Context): string | undefined {
  let locatedFSpec: string | undefined = undefined;
  // is it in our current directory?
  let fileSpec: string = path.join(workingDir, filename);
  if (ctx) {
    // nothing
  }
  //if (ctx) ctx.logger.logMessage(`TRC: locateDataFile() checking [${fileSpec}]`);
  if (fileExists(fileSpec)) {
    locatedFSpec = fileSpec;
  } else {
    // no, is it in our LIB directory?
    fileSpec = path.join(libraryDir(), filename);
    //if (ctx) ctx.logger.logMessage(`TRC: locateDataFile() checking [${fileSpec}]`);
    if (fileExists(fileSpec)) {
      locatedFSpec = fileSpec;
    }
  }
  // NEW Issue (#9) allow DAT files to exist in include folders
  if (locatedFSpec == undefined && ctx && ctx.preProcessorOptions.includeFolders.length > 0) {
    for (const includeFolder of ctx.preProcessorOptions.includeFolders) {
      const incFolder: string = path.join(workingDir, includeFolder);
      //if (ctx) ctx.logger.logMessage(`TRC: locateDataFile() CHK inc [${incFolder}]`);
      if (dirExists(incFolder)) {
        fileSpec = path.join(incFolder, filename);
        //if (ctx) ctx.logger.logMessage(`TRC: locateDataFile() checking [${fileSpec}]`);
        if (fileExists(fileSpec)) {
          locatedFSpec = fileSpec;
          break; // found it, so exit loop
        }
      }
    }
  }
  //if (ctx) ctx.logger.logMessage(`TRC: locateDataFile() -> [${locatedFSpec}]`);
  return locatedFSpec;
}

export function dirExists(pathSpec: string): boolean {
  let existsStatus: boolean = false;
  if (fs.existsSync(pathSpec)) {
    // File exists in path
    existsStatus = true;
  }
  return existsStatus;
}

/**
 * loads the content of a file.
 * @param {string} fileSpec - The path to the file.
 * @returns {string} The content of the file.
 */
export function loadFileAsString(fspec: string): string {
  let fileContent: string = '';
  if (fs.existsSync(fspec)) {
    // ctx.logger.log(`TRC: loadFileAsString() attempt load of [${fspec}]`);
    // See: https://nodejs.org/api/buffer.html#buffers-and-character-encodings
    try {
      fileContent = fs.readFileSync(fspec, 'utf-8');
      //fileContent = fs.readFileSync(fspec, 'ascii');
      // SPCIAL @Wummi is putting german chars in strings. These
      //   are not well constructed utf-8 files.  So when we have a decode issue
      //   let's reload as the more forgiving 'latin1' encoding.
      if (fileContent.includes('\uFFFD')) {
        fileContent = fs.readFileSync(fspec, 'latin1');
      }
      // if we still see unusual characters, try utf16le
      if (fileContent.includes('\x00') || fileContent.includes('\xC0')) {
        fileContent = fs.readFileSync(fspec, 'utf16le');
      }
    } catch (err) {
      // ctx.logger.log(`TRC: loadFileAsString() EXCEPTION: err=[${err}]`);
    }
  } else {
    // ctx.logger.log(`TRC: loadFileAsString() fspec=[${fspec}] NOT FOUND!`);
  }
  return fileContent;
}

const EMPTY_CONTENT_MARKER: string = 'XY$$ZZY';

export function loadFileAsUint8Array(fspec: string, ctx: Context | undefined = undefined): Uint8Array {
  let fileContent: Uint8Array | undefined = undefined;
  if (fs.existsSync(fspec)) {
    try {
      const buffer = fs.readFileSync(fspec);
      fileContent = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      //if (ctx) ctx.logger.logMessage(`TRC: loadFileAsUint8Array() loaded (${fileContent.length}) bytes from [${path.basename(fspec)}]`);
    } catch (err) {
      if (ctx) ctx.logger.logMessage(`TRC: loadFileAsUint8Array() ERROR: [${err}]!`);
    }
  } else {
    if (ctx) ctx.logger.logMessage(`TRC: loadFileAsUint8Array() fspec=[${fspec}] NOT FOUND!`);
  }

  if (fileContent === undefined) {
    const encoder = new TextEncoder();
    fileContent = new Uint8Array(encoder.encode(EMPTY_CONTENT_MARKER));
  } else {
    const fileSizeInBytes = fileSize(fspec);
    if (fileSizeInBytes != fileContent.length) {
      if (ctx)
        ctx.logger.logMessage(`TRC: loadFileAsUint8Array() loaded but SIZE MISMATCH stat=(${fileSizeInBytes}), loaded=(${fileContent.length})`);
    }
  }
  return fileContent;
}

export function loadUint8ArrayFailed(content: Uint8Array): boolean {
  // Convert Uint8Array back to string
  const decoder = new TextDecoder();
  const checkContent = content.length > 7 ? content.slice(0, 7) : content;
  const decodedString = decoder.decode(checkContent);
  // Test if decoded string is 'XY$$ZZY'
  const emptyStatus = decodedString === EMPTY_CONTENT_MARKER;
  return emptyStatus;
}

export function dumpUniqueChildObjectFile(
  objBytes: ChildObjectsImage,
  byteCount: number,
  fileSpec: string,
  ctx: Context | undefined = undefined
): void {
  if (ctx) {
    // nothing
  }
  //if (ctx) ctx.logger.logMessage(`  -- writing DIAG OBJ file (${byteCount} bytes from offset ${0}) to ${fileSpec}`);
  const stream = fs.createWriteStream(fileSpec);
  // copy our full buffer becuse it will be over written before the file write completes!
  const buffer = new Uint8Array(byteCount);
  buffer.set(objBytes.rawUint8Array.subarray(0, byteCount));
  //const buffer = Buffer.from(objImage.rawUint8Array.buffer, offset, byteCount);
  stream.write(buffer);

  // Close the stream
  stream.end();
}

export function dumpUniqueObjectFile(objImage: ObjectImage, byteCount: number, fileSpec: string, ctx: Context | undefined = undefined): void {
  //if (ctx) ctx.logger.logMessage(`  -- writing DIAG OBJ file (${byteCount} bytes from offset ${0}) to ${fileSpec}`);
  if (ctx) {
    // nothing
  }
  const stream = fs.createWriteStream(fileSpec);
  // copy our full buffer becuse it will be over written before the file write completes!
  const buffer = new Uint8Array(byteCount);
  buffer.set(objImage.rawUint8Array.subarray(0, byteCount));
  //const buffer = Buffer.from(objImage.rawUint8Array.buffer, offset, byteCount);
  stream.write(buffer);

  // Close the stream
  stream.end();
}
