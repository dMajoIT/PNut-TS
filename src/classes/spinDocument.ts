/** @format */

// this is our file loader and internal interface to the file
// it also handles light-weight preprocessing of the file

'use strict';
// src/classes/spinDocument.ts

import fs from 'fs';
import * as path from 'path';

import { isSpin1File, isSpin2File, fileExists, dirExists, fileSpecFromURI, loadFileAsString, locateIncludeFile } from '../utils/files';
import { TextLine } from './textLine';
import { Context } from '../utils/context';
import { SymbolTable } from './symbolTable';
import { eElementType } from './types';
import { RegressionReporter } from './regression';
import { SpinElement } from './spinElement';

export enum eEOLType {
  EOL_Unknown,
  EOL_CRLF,
  EOL_LF_ONLY,
  EOL_CR_ONLY
}

export enum eLangaugeId {
  LID_Unknown,
  LID_SPIN,
  LID_SPIN2
}

export enum eTextSub {
  SA_TEXT_YES,
  SA_NUMBER_NO
}

export interface iError {
  sourceLineIndex: number;
  characterOffset: number;
  message: string;
}

class PreProcState {
  private ifSideEmits: boolean = false;
  private elseSideEmits: boolean = false;
  private inIfSide: boolean = false;
  private foundElse: boolean = false; // T/F where T means the endif can be emitted even if side not emitting
  private skipThisIfDef: boolean = false; // T/F where T means all sides of IFDEF...ENDIF don't emit code

  constructor() {
    this.clear();
  }

  get ignoreIfdef(): boolean {
    return this.skipThisIfDef;
  }

  get thisSideEmits(): boolean {
    let shouldEmit: boolean = false;
    if (this.skipThisIfDef == false) {
      if (this.inIfSide) {
        shouldEmit = this.ifSideEmits;
      } else if (this.inIfSide == false) {
        shouldEmit = this.elseSideEmits;
      } else {
        shouldEmit = this.foundElse;
      }
    }
    return shouldEmit;
  }

  public clear() {
    this.ifSideEmits = false;
    this.elseSideEmits = false;
    this.inIfSide = false;
    this.foundElse = false;
    this.skipThisIfDef = false;
  }

  public setIgnoreIfdef() {
    this.skipThisIfDef = true;
  }

  public setInIf() {
    this.inIfSide = true;
  }

  public setInElse() {
    this.inIfSide = false;
    this.foundElse = true;
  }

  public setIfEmits(doesEmit: boolean = true) {
    this.ifSideEmits = doesEmit;
    this.elseSideEmits = !doesEmit;
  }
}

/**
 * The SpinDocument class represents a Spin document, providing methods to analyze and manipulate the document's content.
 */
export class SpinDocument {
  private context: Context;
  private isLogging: boolean;
  private isLoggingOutline: boolean;
  // unique document IDs
  static nextDocumentId: number = 0;
  private documentId: number;
  // raw lines from file
  private readonly rawLines: string[] = [];
  // remaining lines are preprocessing
  private readonly preprocessedLines: TextLine[] = [];
  // description of file
  private readonly eolType: eEOLType = eEOLType.EOL_Unknown;
  private readonly langId: eLangaugeId = eLangaugeId.LID_Unknown;
  private readonly docFolder: string;
  private readonly fileBaseName: string;
  private haveFile: boolean = false;
  // preprocessor data
  private incFolders: string[] = [];
  private preProcSymbols: SymbolTable = new SymbolTable();
  // these can be used for text substitution in code
  private preProcTextSymbols: SymbolTable = new SymbolTable();
  private preProcNestingState: PreProcState[] = [];
  // preprocess state information
  private cmdLineDefines: string[] = [];
  private cmdLineUndefines: string[] = [];
  private headerComments: string[] = [];
  private trailerComments: string[] = [];
  private gatheringHeaderComment: boolean = true;
  private gatheringTrailerComment: boolean = true;
  private inDocComment: boolean = false;
  private inNonDocComment: boolean = false;
  private nonDocNestCount: number = 0;
  // PNut-ts version number handling for this .spin2 file
  private defaultVersion: number = 41;
  private legalVersions: number[] = [41, 43, 44, 45, 46, 47, 48, 49, 50, 51];
  private requiredVersion: number = 0;
  // errors reported while processing file
  private errorsfound: iError[] = [];
  private spinElements: SpinElement[] = [];

  constructor(ctx: Context, fileSpec: string) {
    // record file name and location
    this.context = ctx;
    this.isLogging = this.context.logOptions.logPreprocessor;
    this.isLoggingOutline = ctx.logOptions.logOutline;
    this.documentId = SpinDocument.nextDocumentId++;
    const bFileFound: boolean = fileExists(fileSpec);
    this.logMessage(`CODE: checking fileSpec=[${fileSpec}](${fileSpec.length}) bFileFound=(${bFileFound})`);
    this.docFolder = bFileFound ? path.dirname(fileSpecFromURI(fileSpec)) : '';
    this.fileBaseName = bFileFound ? path.basename(fileSpecFromURI(fileSpec)) : '';
    // record file type (decoded from name)
    if (bFileFound) {
      if (isSpin1File(this.fileBaseName)) {
        this.langId = eLangaugeId.LID_SPIN;
      } else if (isSpin2File(this.fileBaseName)) {
        this.langId = eLangaugeId.LID_SPIN2;
        this.haveFile = true; // only spin2 files are usable for now
      }
      if (this.langId == eLangaugeId.LID_SPIN2) {
        // load file and record line-ending type then split into lines (removing endings)
        const fileContents: string = loadFileAsString(fileSpec);
        if (fileContents.includes('\r\n')) {
          this.eolType = eEOLType.EOL_CRLF;
          this.rawLines = fileContents.split(/\r\n/);
        } else if (fileContents.includes('\n')) {
          this.eolType = eEOLType.EOL_LF_ONLY;
          this.rawLines = fileContents.split(/\n/);
        } else {
          this.eolType = eEOLType.EOL_CR_ONLY;
          this.rawLines = fileContents.split(/\r/);
        }
        this.logMessage(`CODE: loaded [${this.fileBaseName}] from [${this.docFolder}]`);
      }

      // load our predefined symbols with values
      this.preloadSymbolTable();

      // set include folder if provided from the command line
      if (this.context.preProcessorOptions.includeFolders.length > 0) {
        for (const newFolder of this.context.preProcessorOptions.includeFolders) {
          this.setIncludePath(newFolder);
        }
      }

      // add any symbols arriving from the command line
      const cliDefinedSymbols: string[] = this.context.preProcessorOptions.defSymbols;
      if (cliDefinedSymbols.length > 0) {
        for (let index = 0; index < cliDefinedSymbols.length; index++) {
          const newSymbolName = cliDefinedSymbols[index];
          this.defineSymbol(newSymbolName, 1, eTextSub.SA_NUMBER_NO);
          // record external symbol for quick check
          this.cmdLineDefines.push(newSymbolName);
        }
      }

      if (this.rawLines.length > 0) {
        this.logMessage(`SpinPP: file=[${this.fileBaseName}], id=(${this.fileId})`);
        this.preProcess();
        if (this.context.preProcessorOptions.writeIntermediateSpin2) {
          this.writeProprocessedSrc(this.dirName, this.fileName, this.allPreprocessedLines);
        }
      }
    } else {
      this.logMessage(`CODE: ERROR failed to load [${this.fileBaseName}] from [${this.docFolder}] - skipping EMPTY SpinDocument setup`);
    }
  }

  public writeProprocessedSrc(dirName: string, fileName: string, lines: TextLine[]) {
    const fileBasename = path.basename(fileName, '.spin2');
    const outFilename = path.join(dirName, `${fileBasename}__pre.spin2`);
    // Create a write stream
    this.logMessage(`* writing preprocessed source to ${outFilename}`);
    const stream = fs.createWriteStream(outFilename);

    for (const textLine of lines) {
      stream.write(`${textLine.text}\n`);
    }

    // Close the stream
    stream.end();
  }

  get fileId(): number {
    // return this files' unique ID
    return this.documentId;
  }

  get elementList(): SpinElement[] {
    // return entire element list for this file
    return this.spinElements;
  }

  public setElementList(elements: SpinElement[]) {
    // capture element list for this source file
    this.spinElements = elements;
  }

  public defineSymbol(newSymbol: string, value: string | number, subType: eTextSub): void {
    this.logMessage(`CODE: defSymbol(${newSymbol})=[${value}]`);
    if (!this.preProcSymbols.exists(newSymbol)) {
      if (typeof value === 'number') {
        this.preProcSymbols.add(newSymbol, eElementType.type_con_int, BigInt(value));
      } else {
        this.preProcSymbols.add(newSymbol, eElementType.type_con_int, value);
      }
      if (subType == eTextSub.SA_TEXT_YES) {
        if (typeof value === 'number') {
          // hmmm... this should never happen...
          this.preProcTextSymbols.add(newSymbol, eElementType.type_con_int, BigInt(value));
        } else {
          this.preProcTextSymbols.add(newSymbol, eElementType.type_con_int, value);
        }
      }
    } else {
      this.logMessage(`CODE: symbol(${newSymbol}) already exists, add skipped`);
    }
  }

  public setIncludePath(includeDir: string): void {
    this.logMessage(`CODE: setIncludePath(${includeDir})`);
    // is inc-folder
    if (!this.dirName.endsWith(includeDir)) {
      const newIncludePath: string = path.join(this.dirName, includeDir);
      if (dirExists(newIncludePath)) {
        this.incFolders.push(newIncludePath);
        //this.logMessage(`CODE: IncludePath(${newIncludePath}) exists!`);
        this.logMessage(`CODE: Processing includes from [${newIncludePath}]`);
      } else {
        this.logMessage(`CODE: ERROR: failed locate incFolder [${newIncludePath}]`);
      }
    } else {
      this.logMessage(`CODE: INFO: skip add of INC, IS our current dir inc=[${includeDir}], curr=[${this.dirName}]`);
    }
  }

  get versionNumber(): number {
    // return the Spin language version required by this file
    return this.requiredVersion == 0 ? this.defaultVersion : this.requiredVersion;
  }

  public reportError(message: string, lineIndex: number, characterOffset: number) {
    // record a new error
    const errorReport: iError = {
      message: message,
      sourceLineIndex: lineIndex,
      characterOffset: characterOffset
    };
    //this.logMessage(`CODE: new error: Ln#${lineIndex + 1}: ${message}`);
    this.errorsfound.push(errorReport);
  }

  get errors(): iError[] {
    // return list of all errors found
    return this.errorsfound;
  }

  get validFile(): boolean {
    return this.haveFile;
  }

  get fileName(): string {
    return this.fileBaseName;
  }

  get fileSpec(): string {
    return path.join(this.docFolder, this.fileBaseName);
  }

  get dirName(): string {
    return this.docFolder;
  }

  get rawLineCount(): number {
    return this.preprocessedLines.length;
  }

  get lastLineNumber(): number {
    return this.preprocessedLines[this.preprocessedLines.length - 1].sourceLineNumber;
  }

  get allPreprocessedLines(): TextLine[] {
    // return entire content of file
    return this.preprocessedLines;
  }

  get EndOfLine(): eEOLType {
    return this.eolType;
  }

  get languageId(): eLangaugeId {
    return this.langId;
  }

  /**
   * Returns a TextLine object representing the line at the given index.
   * @param {number} lineIndex - The index of the line to return.
   * @returns {TextLine} A TextLine object representing the line at the given index. If the index is out of range,
   * returns a TextLine object representing an empty line with a line number of -1.
   */
  public rawLineAt(lineIndex: number): TextLine {
    // NOTE: fileID cannot be less than zero nor can the line number be > max lines
    //  this just represents a line that doesn't exist
    let desiredLine: TextLine = new TextLine(-1, '', -1);
    if (lineIndex >= 0 && lineIndex < this.rawLineCount) {
      desiredLine = this.preprocessedLines[lineIndex];
      //this.logMessage(`DOC: rawLineAt(${lineIndex}) finds desiredString=[${desiredLine.text}](${desiredLine.text.length})`);
    }
    // return the with additional details about the line
    return desiredLine;
  }

  /**
   * Returns a TextLine object representing the line at the given index.
   * @param {number} lineIndex - The index of the line to return.
   * @returns {TextLine} A TextLine object representing the line at the given index. If the index is out of range,
   * returns a TextLine object representing an empty line with a line number of -1.
   */
  public sourceLineAt(lineIndex: number): TextLine {
    // NOTE: fileID cannot be less than zero nor can the line number be > last line number
    //  this just represents a line that doesn't exist
    let desiredLine: TextLine = new TextLine(-1, '', -1);
    if (lineIndex >= 0 && lineIndex < this.lastLineNumber) {
      const desiredLines: TextLine[] = this.preprocessedLines.filter((textLine) => textLine.sourceLineNumber === lineIndex + 1);
      if (desiredLines.length > 0) {
        desiredLine = desiredLines[desiredLines.length - 1];
      }
      //this.logMessage(`DOC: sourceLineAt(${lineIndex}) finds desiredString=[${desiredLine.text}](${desiredLine.text.length})`);
    }
    // return the with additional details about the line
    return desiredLine;
  }

  private preProcess(): void {
    // Gather header (doc-only and non-doc) comments and trailer (doc-only) comments
    // From header (doc-only and non-doc) comments identify required version if any version
    // Process raw-lines into file content lines w/original line numbers based on #ifdef/#ifndef, etc. directives
    this.logMessage(`SpinPP: preProcess() file=[${this.fileBaseName}], id=(${this.fileId})- ENTRY`);
    let replaceCurrent: string = ``;
    for (let lineIdx = 0; lineIdx < this.rawLines.length; lineIdx++) {
      let skipThisline: boolean = false;
      let forceKeepThisline: boolean = false;
      let insertTextLines: TextLine[] = [];
      let currLine = this.rawLines[lineIdx];
      this.logMessage(`SpinPP: currLine[${lineIdx}]: [${currLine}](${currLine.length})`);
      if (currLine.startsWith("'")) {
        // have single line non-doc (') or doc ('') comment
        this.recordComment(currLine);
        // check for nonDoc comments (generally looking for '} patterns) in single line comment (only if already in nonDoc Comment)
        if (this.inNonDocComment) {
          const openCt: number = currLine.split('{').length - 1;
          const closeCt: number = currLine.split('}').length - 1;
          const nbrCloses = closeCt - openCt;
          this.nonDocNestCount -= nbrCloses;
          // if we clsoed nonDoc the clear inNonDoc state
          this.inNonDocComment = this.nonDocNestCount == 0 ? false : true;
          this.logMessage(`SpinPP: ': depth=(${this.nonDocNestCount}), isNonDocCmt=(${this.inNonDocComment})`);
        }
      } else if (this.inNonDocComment) {
        // handle  {..\n{\n..}\n..}
        const tmpLine = this.removeNonDocComments(currLine);
        // once this runs... we only have "{...[{...]" or "...}[...}], etc."
        const openCt: number = tmpLine.split('{').length - 1;
        if (openCt > 0) {
          this.nonDocNestCount += openCt;
        }
        const closeCt: number = tmpLine.split('}').length - 1;
        if (closeCt > 0) {
          this.nonDocNestCount -= closeCt;
        }
        const wasInNonDocComment: boolean = this.inNonDocComment;
        this.inNonDocComment = this.nonDocNestCount == 0 ? false : true;
        this.logMessage(
          `SpinPP: SRT-{: tmpLine=[${tmpLine}], openCt=(${openCt}), closeCt=(${closeCt}), depth=(${this.nonDocNestCount}), isNonDocCmt=(${this.inNonDocComment})`
        );
        if (wasInNonDocComment) {
          // entire line is within open but no close...
          this.logMessage(`SpinPP: IN-{: Line is comment [${currLine}]`);
          skipThisline = true; // is comment but let's skip emitting it
        } else {
          this.logMessage(`SpinPP: IN-{: comment ended [${currLine}]`);
          currLine = tmpLine.trimEnd();
          if (currLine.length == 0) {
            skipThisline = true;
          }
        }
      } else if (this.inDocComment) {
        // handle {{..}}
        const docClosePosn: number = currLine.indexOf('}}');
        // record only comment portion of line
        if (docClosePosn == -1) {
          this.recordComment(currLine);
        } else {
          this.recordComment(currLine.substring(0, docClosePosn + 1));
        }
        if (docClosePosn != -1) {
          this.inDocComment = false;
        }
      } else if (currLine.startsWith('#')) {
        // handle preprocessor #directive
        this.gatheringHeaderComment = false; // no more gathering once we hit text
        if (currLine.startsWith('#define')) {
          // parse #define {symbol} {value}
          const [symbol, value] = this.getSymbolValue(currLine);
          if (symbol) {
            const canAdd = this.thisSideKeepsCode() || !this.inIfDef();
            replaceCurrent = this.commentOut(currLine);
            if (canAdd) {
              this.logMessage(`SpinPP: add new symbol [${symbol}]=[${value}]`);
              this.defineSymbol(symbol, value, eTextSub.SA_TEXT_YES); // this should work?!!
            }
          } else {
            // ERROR bad statement
            this.reportError(`#define is missing symbol name`, lineIdx, 0);
          }
        } else if (currLine.startsWith('#undef')) {
          // parse #undef {symbol}
          const symbol = this.getSymbolName(currLine);
          if (symbol) {
            // this.logMessage(`SpinPP: (DBG) UNDEF inPreProcIForIxFNOT=(${inPreProcIForIxFNOT}), thisSidxeKeepsCode=(${thisSideKexepsCode})`);
            if (this.thisSideKeepsCode() || !this.inIfDef()) {
              if (!this.undefineSymbol(symbol)) {
                // ERROR no such symbol
                this.reportError(`#undef symbol [${symbol}] not found`, lineIdx, 0);
              } else {
                this.logMessage(`SpinPP: removed symbol [${symbol}]`);
                replaceCurrent = this.commentOut(currLine);
              }
            } else {
              // ignore this code since in conditional code
              this.logMessage(`SpinPP: NOT keeping code SKIP [${currLine}]`);
            }
          } else {
            this.reportError(`#undef is missing symbol name`, lineIdx, 0);
          }
        } else if (currLine.startsWith('#ifdef') || currLine.startsWith('#elseifdef')) {
          // parse #ifdef {symbol}
          // parse #elseifdef {symbol}
          const isElseForm: boolean = currLine.startsWith('#elseifdef');
          const wasEmitting = !this.inIfDef() || (this.inIfDef() && this.thisSideKeepsCode());
          const ifState = isElseForm ? this.currIfDef() : this.enterIf();
          if (ifState === undefined) {
            this.reportError(`#elseifdef found before #ifdef/#ifndef`, lineIdx, 0);
          } else {
            ifState.setInIf();
            if (wasEmitting == false) {
              // we were in ifdef and not emitting so ignore this whole ifdef
              ifState.setIgnoreIfdef();
            }
            if (isElseForm == false || (isElseForm == true && this.inIfDef())) {
              // this.logMessage(`SpinPP: (DBG) inPreProcIxForIFNOT=(${inPrePxrocIForIFNOT})`);
              const symbol = this.getSymbolName(currLine);
              if (symbol !== undefined) {
                if (this.cmdLineDefines.includes(symbol)) {
                  insertTextLines = [new TextLine(this.fileId, `' NOTE: ${symbol} provided on command line using -D ${symbol}`, lineIdx)];
                  this.logMessage(`SpinPP: #define of [${symbol}] caused by "-D ${symbol}" on command line`);
                }
                const symbolDefined: boolean = this.preProcSymbols.exists(symbol);
                ifState.setIfEmits(symbolDefined === true);
                if (symbolDefined) {
                  this.logMessage(`SpinPP: ifdef - symbol defined [${symbol}]`);
                  // found symbol... we are keeping code from IF side
                } else {
                  // symbol doesn't exist keep code from ELSE side
                  this.logMessage(`SpinPP: ifdef - NOT symbol defined [${symbol}]`);
                }
                forceKeepThisline = true;
                // this.logMessage(`SpinPP: (DBG) thisSideKeexpsCode=(${thisSideKxeepsCode})`);
                replaceCurrent = this.commentOut(currLine);
              } else {
                // ERROR bad statement
                this.reportError(`#directive is missing symbol name`, lineIdx, 0);
              }
            } else {
              // ERROR missing preceeding #if*...
              this.reportError(`#elseifdef without earlier #if*...`, lineIdx, 0);
            }
          }
        } else if (currLine.startsWith('#ifndef') || currLine.startsWith('#elseifndef')) {
          // parse #ifndef {symbol}
          // parse #elseifndef {symbol}
          const isElseForm: boolean = currLine.startsWith('#elseifndef');
          const wasEmitting = !this.inIfDef() || (this.inIfDef() && this.thisSideKeepsCode());
          const ifState = isElseForm ? this.currIfDef() : this.enterIf();
          if (ifState === undefined) {
            this.reportError(`#elseifndef found before #ifdef/#ifndef`, lineIdx, 0);
          } else {
            ifState.setInIf();
            if (wasEmitting == false) {
              // we were in ifdef and not emitting so ignore this whole ifdef
              ifState.setIgnoreIfdef();
            }
            if (isElseForm == false || (isElseForm == true && this.inIfDef())) {
              // this.logMessage(`SpinPP: (DBG) inPreProcIxForIFNOT=(${inPreProcIFxorIFNOT})`);
              const symbol = this.getSymbolName(currLine);
              if (symbol !== undefined) {
                if (this.cmdLineDefines.includes(symbol)) {
                  insertTextLines = [new TextLine(this.fileId, `' NOTE: ${symbol} provided on command line using -D ${symbol}`, lineIdx)];
                }
                const symbolDefined: boolean = this.preProcSymbols.exists(symbol);
                ifState.setIfEmits(symbolDefined === false);
                if (symbolDefined === false) {
                  // found symbol... we are keeping code from ELSE side
                  this.logMessage(`SpinPP: ifndef - symbol NOT defined [${symbol}]`);
                } else {
                  // symbol doesn't exist keep code from IF side
                  this.logMessage(`SpinPP: ifndef - symbol defined [${symbol}]`);
                }
                replaceCurrent = this.commentOut(currLine);
                // this.logMessage(`SpinPP: (DBG) thisSideKeexpsCode=(${thisSideKexepsCode})`);
              } else {
                // ERROR bad statement
                this.reportError(`#directive is missing symbol name`, lineIdx, 0);
              }
            } else {
              // ERROR missing preceeding #if*...
              this.reportError(`#elseifndef without earlier #if*...`, lineIdx, 0);
            }
          }
        } else if (currLine.startsWith('#else')) {
          // parse #else
          const ifState = this.currIfDef();
          if (ifState === undefined) {
            // ERROR missing preceeding #if*...
            this.reportError(`#else found before #ifdef/#ifndef`, lineIdx, 0);
          } else {
            replaceCurrent = this.commentOut(currLine);
            ifState.setInElse();
          }
        } else if (currLine.startsWith('#endif')) {
          // parse #endif
          if (!this.inIfDef()) {
            // ERROR missing preceeding #if*...
            this.reportError(`#endif without earlier #if*...`, lineIdx, 0);
          } else {
            replaceCurrent = this.commentOut(currLine);
            this.exitIf();
          }
          // this.logMessage(`SpinPP: (DBG) inPrePrxocIForIFNOT=(${inPreProcIFoxrIFNOT})`);
        } else if (currLine.startsWith('#error')) {
          // parse #error
          replaceCurrent = this.commentOut(currLine);
          const message: string = currLine.substring(7);
          this.reportError(`ERROR: ${message}`, lineIdx, 0);
        } else if (currLine.startsWith('#warn')) {
          // parse #warn
          replaceCurrent = this.commentOut(currLine);
          const message: string = currLine.substring(7);
          this.reportError(`WARNING: ${message}`, lineIdx, 0);
        } else if (currLine.startsWith('#include')) {
          this.logMessage(`SpinPP: have #include [${currLine}]`);
          // handle #include "filename"
          //  ensure suffix not present or must be ".spin2"
          const filename = this.isolateFilename(currLine, lineIdx);
          if (filename !== undefined) {
            const filespec = locateIncludeFile(this.incFolders, this.dirName, filename);
            if (filespec !== undefined) {
              replaceCurrent = this.commentOut(currLine);
              currLine = '';
              // load file into spinDoc
              // reuse existing document if present
              let incSpinDocument = this.context.sourceFiles.getFile(filespec);
              if (incSpinDocument === undefined) {
                this.logMessageOutline(`--- load include file [${path.basename(filespec)}]`);
                incSpinDocument = new SpinDocument(this.context, filespec);
                // record this new file in our master list of files we compiled to buid the binary
                this.context.sourceFiles.addFile(incSpinDocument);
              }
              // get parsed content from spinDoc inserting into current content after / -or / in-place-of this line
              insertTextLines = incSpinDocument.allPreprocessedLines;
            } else {
              this.reportError(`File [${filename}] not found!`, lineIdx, 0);
            }
          } else {
            this.reportError(`Filename missing from #include statement!`, lineIdx, 0);
          }
        } else if (currLine.startsWith('#pragma')) {
          // handle #pragma {comand} {symbol}
          const [command, symbol, value] = this.getPragmaSymbolValue(currLine);
          if (command.length > 0 && command.toUpperCase() == 'EXPORTDEF') {
            if (symbol !== undefined) {
              const foundUndefine: boolean = this.context.preProcessorOptions.undefSymbols.includes(symbol);
              const alreadyDefined: boolean = this.context.preProcessorOptions.defSymbols.includes(symbol);
              const canAdd = (this.thisSideKeepsCode() || !this.inIfDef()) && !foundUndefine && !alreadyDefined;
              replaceCurrent = this.commentOut(currLine);
              if (canAdd) {
                this.logMessage(`SpinPP: #pragam ${command}: force -D of symbol [${symbol}]=[${value}]`);
                this.context.preProcessorOptions.defSymbols.push(symbol.toUpperCase());
              } else if (foundUndefine) {
                this.logMessage(`SpinPP: #pragma ${command} [${symbol}] prevented by "-U ${symbol}" on command line`);
                insertTextLines = [
                  new TextLine(this.fileId, `' NOTE: #pragma ${command} ${symbol} prevented by command line "-U ${symbol}"`, lineIdx)
                ];
              } else if (alreadyDefined) {
                this.logMessage(`SpinPP: #pragma ${command} [${symbol}] IGNORED, already defined by "-D ${symbol}" on command line`);
                insertTextLines = [
                  new TextLine(
                    this.fileId,
                    `' NOTE: #pragma ${command} ${symbol} IGNORED, already defined by "-D ${symbol}" on command line`,
                    lineIdx
                  )
                ];
              }
            } else {
              // ERROR bad statement
              this.reportError(`#pragma ${command} is missing symbol name`, lineIdx, 0);
            }
          } else {
            // ERROR bad statement
            this.reportError(`#pragma [${command}] UNSUPPORTED!`, lineIdx, 0);
          }
        } else if (currLine.match(/^#-*[0-9%$]+\s*,*|^#_*[A-Za-z_]+\s*,*/)) {
          // ignore these enumeration starts, they are not meant to be directives
          this.logMessage(`SpinPP: SKIP ENUM [${currLine}]`);
        } else {
          // generate error! vs. throwing exception
          let lineParts = this.splitLineOnWhiteSpace(currLine);
          if (lineParts.length == 0) {
            lineParts = [currLine];
          }
          this.reportError(`Unknown #directive: [${lineParts[0]}]`, lineIdx, 0);
          skipThisline = true;
        }
      } else if (currLine.startsWith('{{')) {
        // handle start of doc-comment {{..}}
        if (!currLine.substring(2).includes('}}')) {
          this.inDocComment = true;
        }
        if (this.gatheringHeaderComment) {
          this.logMessage(`SpinPP: hdrCmt++[${currLine}]`);
          this.headerComments.push(currLine);
        }
      } else if (currLine.startsWith('{')) {
        // starting a line with a non-doc comment, could be one of many cases...
        // if we are positioned at the start of a '{.{..}.}' non-doc comment then skip lines until
        // NOTE: handle case where {..}{..} (the nondoc-comments are back to back with/without spaces in-between)
        const tmpLine = this.removeNonDocComments(currLine);
        // once this runs... we only have "{...[{...]" or "...}[...}], etc."
        const openCt: number = tmpLine.split('{').length - 1;
        if (openCt > 0) {
          this.nonDocNestCount += openCt;
        }
        const closeCt: number = tmpLine.split('}').length - 1;
        if (closeCt > 0) {
          this.nonDocNestCount -= closeCt;
        }
        this.inNonDocComment = this.nonDocNestCount == 0 ? false : true;
        this.logMessage(
          `SpinPP: SRT-{: tmpLine=[${tmpLine}], openCt=(${openCt}), closeCt=(${closeCt}), depth=(${this.nonDocNestCount}), isNonDocCmt=(${this.inNonDocComment})`
        );
        if (this.gatheringHeaderComment) {
          this.logMessage(`SpinPP: hdrCmt++[${currLine}]`);
          this.headerComments.push(currLine);
        }
        if (this.inNonDocComment) {
          // entire line is within open but no close...
          this.logMessage(`SpinPP: STRT-{: Line is comment [${currLine}]`);
          skipThisline = true; // is comment but let's skip emitting it
        } else {
          this.logMessage(`SpinPP: STRT-{: comment ended with } [${currLine}]`);
          currLine = tmpLine.trimEnd();
          if (currLine.length == 0) {
            continue;
          }
        }
      } else {
        // have code line
        this.gatheringHeaderComment = false; // no more gathering once we hit text
        this.gatheringTrailerComment = true; // from here on out, we are...
        this.trailerComments = []; // but every non-comment line we clear all we have so we only get final comments
      }

      // ifSideKeepsCode || inIfSide
      //     true             false    skip = true
      //     true             true     skip = false
      //     false            false    skip = false
      //     false            true     skip = true
      if (!skipThisline) {
        if (this.inIfDef()) {
          skipThisline = this.thisSideKeepsCode() ? false : true;
          if (forceKeepThisline) {
            skipThisline = false;
          }
        }
      }

      if (!skipThisline) {
        const skipSubst: boolean = currLine.startsWith('#') || currLine.startsWith("'") ? true : false;
        currLine = replaceCurrent.length > 0 ? replaceCurrent : currLine;
        if (!skipSubst) {
          const tmpLine: string = this.macroSubstitute(currLine);
          if (currLine !== tmpLine) {
            const nonSubstLine: string = `' ${currLine}`;
            this.preprocessedLines.push(new TextLine(this.fileId, nonSubstLine, lineIdx));
            this.logMessage(`SpinPP: EMIT replacement Line [${nonSubstLine}]`);
            this.logMessage(`SpinPP: MACRO currLine [${currLine}](${currLine.length})`);
            this.logMessage(`SpinPP: MACRO  tmpLine [${tmpLine}](${tmpLine.length})`);
            currLine = tmpLine.trimEnd();
          }
        }
        this.preprocessedLines.push(new TextLine(this.fileId, currLine, lineIdx));
        if (replaceCurrent.length > 0) {
          this.logMessage(`SpinPP: EMIT replacement Line [${currLine}]`);
        }
        replaceCurrent = ''; // used, empty it so no dupes
      } else {
        //this.logMessage(`SpinPP: Line SKIP [${currLine}]`);
      }

      if (insertTextLines.length > 0) {
        this.logMessage(`SpinPP: INSERT #${insertTextLines.length} line(s)`);
        for (const newTextLine of insertTextLines) {
          // assume these are already preprocessed
          this.preprocessedLines.push(newTextLine);
        }
        //insertTextLines = []; // included new lines, empty list
      }
    }
    this.getVersionFromHeader(this.headerComments);

    this.dumpErrors(); // report on errors if any found

    // if regression testing the emit our preprocessing result
    if (this.context?.reportOptions.writePreprocessReport) {
      this.logMessage('SpinPP: writePreprocessReport()');
      const reporter: RegressionReporter = new RegressionReporter(this.context);
      reporter.writeProprocessResults(this.dirName, this.fileName, this.allPreprocessedLines);
    }
    this.logMessage(`SpinPP: preProcess() file=[${this.fileBaseName}], ver=(v${this.versionNumber}) id=(${this.fileId})- EXIT`);
  }

  private dumpErrors() {
    if (this.errorsfound.length > 0) {
      this.logMessage(''); // blank line
    }
    for (let index = 0; index < this.errorsfound.length; index++) {
      const error = this.errorsfound[index];
      this.logMessage(`ERROR: Ln#${error.sourceLineIndex + 1}: ${error.message}`);
    }
  }

  private recordComment(line: string) {
    if (this.gatheringHeaderComment) {
      this.logMessage(`SpinPP: hdrCmt++[${line}]`);
      this.headerComments.push(line);
    } else if (this.gatheringTrailerComment) {
      this.trailerComments.push(line);
    }
  }

  private undefineSymbol(oldSymbol: string): boolean {
    let removeStatus: boolean = false;
    if (this.preProcSymbols.exists(oldSymbol)) {
      this.logMessage(`SpinPP: undefSymbol(${oldSymbol})`);
      this.preProcSymbols.remove(oldSymbol);
      removeStatus = true;
    }
    return removeStatus;
  }

  private macroSubstitute(line: string): string {
    const substitutedLine: string = this.preProcTextSymbols.replaceSymbolsInString(line);
    return substitutedLine;
  }

  private removeNonDocComments(currLine: string): string {
    // Replace any inline non-doc comments with spaces, ignoring { and } inside double-quoted strings
    let nonCommentLine = currLine;
    // eslint-disable-next-line prefer-const
    let bShouldLog = false; // true when testing

    if (currLine.length > 1 && currLine.includes('{')) {
      this.logMessage(`SpinPP: rmvNDC() currLine [${currLine}](${currLine.length}) - ENTRY`);
      this.logMessageConditional(bShouldLog, `SpinPP: rmvNDC() currLine [${currLine}](${currLine.length}) - ENTRY`);

      let loopCt = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        //bShouldLog = loopCt < 20; // uncomment when testing

        // Stack to track positions of `{` and `}`
        const stack: number[] = [];
        let deepestOpenPosn = -1;
        let matchingClosePosn = -1;
        let insideString = false; // Track whether we are inside a double-quoted string

        // Iterate through the line to find the innermost `{}` pair
        for (let i = 0; i < nonCommentLine.length; i++) {
          const char = nonCommentLine[i];

          // Toggle insideString flag when encountering a double quote
          if (char === '"' && (i === 0 || nonCommentLine[i - 1] !== '\\')) {
            insideString = !insideString;
          }

          // Skip processing if inside a double-quoted string
          if (insideString) {
            continue;
          }

          if (char === '{') {
            stack.push(i); // Push the position of `{` onto the stack
          } else if (char === '}') {
            if (stack.length > 0) {
              // Pop the last `{` position from the stack
              deepestOpenPosn = stack.pop()!;
              matchingClosePosn = i;
            }
          }
        }

        this.logMessageConditional(
          bShouldLog,
          `SpinPP: rmvNDC() loop (#${++loopCt}) deepestOpen=(${deepestOpenPosn}), matchingClose=(${matchingClosePosn})`
        );

        // Break if no more `{}` pairs are found
        if (deepestOpenPosn === -1 || matchingClosePosn === -1) {
          break;
        }

        // Replace the innermost comment block with spaces
        nonCommentLine = this.replaceSubstringWithSpaces(nonCommentLine, deepestOpenPosn, matchingClosePosn + 1);
      }

      if (currLine !== nonCommentLine) {
        this.logMessage(`SpinPP: rmvNDC()       currLine [${currLine}](${currLine.length})`);
        this.logMessage(`SpinPP: rmvNDC() nonCommentLine [${nonCommentLine}](${nonCommentLine.length})`);
        this.logMessageConditional(bShouldLog, `SpinPP: rmvNDC()       currLine [${currLine}](${currLine.length})`);
        this.logMessageConditional(bShouldLog, `SpinPP: rmvNDC() nonCommentLine [${nonCommentLine}](${nonCommentLine.length})`);
      }
    }

    return nonCommentLine;
  }

  /*
  //private removeNonDocCommentsOLD3(currLine: string): string {
    // Replace any inline non-doc comments with spaces
    let nonCommentLine = currLine;
    let loopCt = 0;

    if (currLine.length > 1 && currLine.includes('{')) {
      this.logMessage(`SpinPP: rmvNDC() currLine [${currLine}](${currLine.length}) - ENTRY`);

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const bShouldLog = loopCt < 20;

        // Stack to track positions of `{` and `}`
        const stack: number[] = [];
        let deepestOpenPosn = -1;
        let matchingClosePosn = -1;

        // Iterate through the line to find the innermost `{}` pair
        for (let i = 0; i < nonCommentLine.length; i++) {
          if (nonCommentLine[i] === '{') {
            stack.push(i); // Push the position of `{` onto the stack
          } else if (nonCommentLine[i] === '}') {
            if (stack.length > 0) {
              // Pop the last `{` position from the stack
              deepestOpenPosn = stack.pop()!;
              matchingClosePosn = i;
            }
          }
        }

        this.logMessageConditional(
          bShouldLog,
          `SpinPP: rmvNDC() loop (#${++loopCt}) deepestOpen=(${deepestOpenPosn}), matchingClose=(${matchingClosePosn})`
        );

        // Break if no more `{}` pairs are found
        if (deepestOpenPosn === -1 || matchingClosePosn === -1) {
          break;
        }

        // Replace the innermost comment block with spaces
        nonCommentLine = this.replaceSubstringWithSpaces(nonCommentLine, deepestOpenPosn, matchingClosePosn + 1);
      }

      if (currLine !== nonCommentLine) {
        this.logMessage(`SpinPP: rmvNDC()       currLine [${currLine}](${currLine.length})`);
        this.logMessage(`SpinPP: rmvNDC() nonCommentLine [${nonCommentLine}](${nonCommentLine.length})`);
      }
    }

    return nonCommentLine;
  }

  //private removeNonDocCommentsOLD2(currLine: string): string {
    // Replace any inline non-doc comments with spaces
    let nonCommentLine = currLine;
    let loopCt = 0;

    if (currLine.length > 1 && currLine.includes('{')) {
      this.logMessage(`SpinPP: rmvNDC() currLine [${currLine}](${currLine.length}) - ENTRY`);

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const bShouldLog = loopCt < 20;

        // Find the first open `{` and close `}` positions
        const firstOpenPosn = nonCommentLine.indexOf('{');
        const firstClosePosn = firstOpenPosn != -1 ? nonCommentLine.indexOf('}', firstOpenPosn + 1) : -1;

        this.logMessageConditional(bShouldLog, `SpinPP: rmvNDC() loop (#${++loopCt}) firstOpen=(${firstOpenPosn}), firstClose=(${firstClosePosn})`);

        // Break if no more `{` or `}` are found
        if (firstOpenPosn === -1 || firstClosePosn === -1) {
          break;
        }

        // Replace the comment block with spaces
        nonCommentLine = this.replaceSubstringWithSpaces(nonCommentLine, firstOpenPosn, firstClosePosn + 1);
      }

      if (currLine !== nonCommentLine) {
        this.logMessage(`SpinPP: rmvNDC()       currLine [${currLine}](${currLine.length})`);
        this.logMessage(`SpinPP: rmvNDC() nonCommentLine [${nonCommentLine}](${nonCommentLine.length})`);
      }
    }

    return nonCommentLine;
  }

  //private removeNonDocCommentsOLD0(currLine: string): string {
    // replace any inline nonDoc comments with spaces
    let nonCommentLine: string = currLine;
    let loopCt: number = 0;
    if (currLine.length > 1) {
      // must have at least one open { and be more than one char to remove comment
      let needReplace: boolean = false;
      let firstOpenPosn: number = currLine.indexOf('{');
      let nextOpenPosn: number = -1;
      // have any open '{'?
      if (firstOpenPosn != -1) {
        let currPosn: number = firstOpenPosn;
        this.logMessage(`SpinPP: rmvNDC() currLine [${currLine}](${currLine.length}) - ENTRY`);
        do {
          const bShouldLog: boolean = loopCt < 20;
          nextOpenPosn = nonCommentLine.substring(firstOpenPosn + 1).indexOf('{');
          if (nextOpenPosn != -1) {
            nextOpenPosn += firstOpenPosn + 1;
          }
          let nextClosePosn: number = nonCommentLine.substring(firstOpenPosn + 1).indexOf('}');
          if (nextClosePosn != -1) {
            nextClosePosn += firstOpenPosn + 1;
          }
          this.logMessageConditional(
            bShouldLog,
            `SpinPP: rmvNDC() loop (#${++loopCt}) firstOpenPosn=(${firstOpenPosn}), nextOpenPosn=(${nextOpenPosn}), nextClosePosn=(${nextClosePosn})`
          );
          if (nextOpenPosn == -1) {
            // no nesting on this line...
            if (nextClosePosn != -1) {
              // have open.close on this line, remove it
              currPosn = firstOpenPosn;
              needReplace = true;
            } else {
              // have only nested open, still in comment
              break;
            }
          } else {
            // nextOpen is NOT = -1!
            if (nextClosePosn != -1 && nextOpenPosn != -1) {
              // have both
              if (nextClosePosn < nextOpenPosn) {
                // have close, then another open
                // no replacement, just move to next open
                currPosn = nextOpenPosn;
              } else {
                // have open followed by a close
                // replace with spaces
                currPosn = nextOpenPosn;
                needReplace = true;
              }
            } else if (nextClosePosn != -1) {
              // have only close
              // no replacement, just move to next open
              currPosn = nextClosePosn + 1;
            } else {
              // have NO open or close
              break;
            }
          }
          if (needReplace) {
            const cmtEndIdx = nextClosePosn + 1 > nonCommentLine.length - 1 ? nonCommentLine.length - 1 : nextClosePosn + 1;
            nonCommentLine = this.replaceSubstringWithSpaces(nonCommentLine, currPosn, cmtEndIdx);
          }

          // DONE XYZZY this is emergency fix... DO REAL  FIX BEFORE release
          //const priorFirstOpen = firstOpenPosn;
          firstOpenPosn = nonCommentLine.indexOf('{');
          //if (priorFirstOpen == firstOpenPosn) {
          //  break;
          //}
        } while (firstOpenPosn != -1);
      }
      if (currLine !== nonCommentLine) {
        this.logMessage(`SpinPP: rmvNDC()       currLine [${currLine}](${currLine.length})`);
        this.logMessage(`SpinPP: rmvNDC() nonCommentLine [${nonCommentLine}](${nonCommentLine.length})`);
      }
    }
    return nonCommentLine;
  }
  */

  private replaceSubstringWithSpaces(line: string, startIdx: number, endIdx: number): string {
    let spacedLine = line;
    const bShoudLog: boolean = false; // TRUE when testing
    const badText: string = line.substring(startIdx, endIdx);
    const replaceText: string = ''.padEnd(badText.length, ' ');
    this.logMessage(`SpinPP: REPL string [${line}](${line.length}) - (s:${startIdx}-e:${endIdx})[${badText}]`);
    this.logMessageConditional(bShoudLog, `SpinPP: REPL string [${line}](${line.length}) - (s:${startIdx}-e:${endIdx})[${badText}]`);
    if (badText.length > 0 && badText.length <= line.length) {
      spacedLine = line.replace(badText, replaceText);
      this.logMessage(`SpinPP: REPL    new [${spacedLine}](${spacedLine.length})`);
      this.logMessageConditional(bShoudLog, `SpinPP: REPL    new [${spacedLine}](${spacedLine.length})`);
    }
    return spacedLine;
  }

  private commentOut(line: string): string {
    return `' ${line}`;
  }

  private isolateFilename(currLine: string, index: number): string | undefined {
    let isolatedFilename: string | undefined = undefined;
    const match = currLine.match(/#include\s+"(.*)"/);
    if (match) {
      const filename = match[1];
      const fileExtension = path.extname(filename);
      //this.logMessage(`CODE: filename=[${filename}], fileExtension=[${fileExtension}]`);
      if (fileExtension.length == 0) {
        isolatedFilename = `${filename}.spin2`;
      } else if (fileExtension.length > 0 && fileExtension.toLowerCase() === '.spin2') {
        isolatedFilename = filename;
      } else {
        this.reportError(`Filetype [${fileExtension}] NOT supported, must be .spin2`, index, 0);
      }
    } else {
      this.reportError(`Unable to get filename from #include ... (missing quotes?)`, index, 0);
    }
    this.logMessage(`CODE: isolatedFilename=[${isolatedFilename}]`);
    return isolatedFilename;
  }

  private getSymbolValue(line: string): [string | undefined, string] {
    const lineParts = this.splitLineOnWhiteSpace(line);
    let symbol: string | undefined = undefined;
    let value: string = '1';
    if (lineParts.length > 1) {
      // internally all Preprocessor symbols are UPPER CASE
      symbol = lineParts[1].toUpperCase();
      if (lineParts.length > 2) {
        value = lineParts[2];
      }
    }
    return [symbol, value];
  }

  private getPragmaSymbolValue(line: string): [string, string | undefined, string] {
    const lineParts = this.splitLineOnWhiteSpace(line);
    // handle #pragma {command} {symbol}
    let symbol: string | undefined = undefined;
    let command: string = '';
    const value: string = '1';
    if (lineParts.length > 2) {
      // internally all Preprocessor symbols are UPPER CASE
      command = lineParts[1].toUpperCase();
      symbol = lineParts[2].toUpperCase();
    }
    return [command, symbol, value];
  }

  private splitLineOnWhiteSpace(line: string): string[] {
    const lineParts = line.split(/[ \t\r\n]/).filter(Boolean);
    // this.logMessage(`CODE: (DBG) splitLineOnWhiteSpace(${line})`);
    // this.logMessage(`CODE: (DBG) lineParts=[${lineParts}](${lineParts.length})`);
    return lineParts;
  }

  private getSymbolName(line: string): string | undefined {
    const lineParts = this.splitLineOnWhiteSpace(line);
    let symbol: string | undefined = undefined;
    if (lineParts.length > 1) {
      // internally all Preprocessor symbols are UPPER CASE
      symbol = lineParts[1].toUpperCase();
    }
    return symbol;
  }

  private getVersionFromHeader(headerComments: string[]): void {
    const spinLangVersionRegEx = /\{Spin2_v(\d{2,3})\}/i;
    //this.forceLogMessage(`* SpinPP: headerComments=[${this.headerComments}]`);
    for (let index = 0; index < headerComments.length; index++) {
      const headerLine = headerComments[index];
      const symbolMatch = headerLine.match(spinLangVersionRegEx);
      // yields: symbolMatch=[{Spin2_v43},43](2), hdr=[' {Spin2_v43}]
      if (symbolMatch) {
        const possibleVersion = parseInt(symbolMatch[1]);
        //this.logMessage(`- #${index + 1}: symbolMatch=[${symbolMatch}](${symbolMatch?.length}), hdr=[${headerLine}]`);
        this.requiredVersion = this.legalVersions.includes(possibleVersion) ? possibleVersion : 0;
        //this.logMessage(`  -- possibleVersion=(${possibleVersion}) -> requiredVersion=(${this.requiredVersion})`);
        if (possibleVersion != this.requiredVersion) {
          this.reportError(`ERROR: ${symbolMatch[0]}, ${possibleVersion} is not a legal Spin2 Language Version!`, index, 0);
        }
      }
    }
    //this.forceLogMessage(`* found ${this.requiredVersion}`);
  }

  private preloadSymbolTable() {
    const now = new Date();
    // Outputs: YYYY-MM-DD
    const formattedDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    // Outputs: HH:MM
    const formattedTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const baseSymbols: { [key: string]: number | string } = {};
    // build list of internal symbols
    baseSymbols['__propeller__'] = 1;
    baseSymbols['__P2__'] = 1;
    baseSymbols['__propeller2__'] = 1;
    baseSymbols['__PNUT_TS__'] = 1;
    baseSymbols['__DATE__'] = formattedDate;
    baseSymbols['__FILE__'] = this.fileBaseName;
    baseSymbols['__TIME__'] = formattedTime;
    if (this.context?.compileOptions.enableDebug) {
      baseSymbols['__DEBUG__'] = 1;
    }
    // this following is done in pnut_ts.ts itself!
    //   baseSymbols['__VERSION__'] = ...;
    // populate our symbol table with this list
    for (const symbolKey of Object.keys(baseSymbols)) {
      const value = baseSymbols[symbolKey];
      const symTextFlag: eTextSub = value === 1 ? eTextSub.SA_NUMBER_NO : eTextSub.SA_TEXT_YES;
      this.defineSymbol(symbolKey, value, symTextFlag);
    }
  }

  // #ifdef/#ifndef support routines

  private enterIf(): PreProcState {
    const newProcLevel = new PreProcState();
    newProcLevel.setInIf();
    this.preProcNestingState.push(newProcLevel);
    return newProcLevel;
  }

  private exitIf(): PreProcState {
    if (!this.inIfDef()) {
      throw new Error(`[PREPROCESSOR] error found #endif without #ifdef or #ifndef`);
    }
    this.preProcNestingState.pop(); // remove top most
    const procLevel = this.preProcNestingState[this.preProcNestingState.length - 1];
    return procLevel;
  }

  private inIfDef(): boolean {
    return this.preProcNestingState.length > 0;
  }

  private currIfDef(): PreProcState | undefined {
    let desiredLevel: PreProcState | undefined = undefined;
    if (this.preProcNestingState.length > 0) {
      desiredLevel = this.preProcNestingState[this.preProcNestingState.length - 1];
    }
    return desiredLevel;
  }

  private thisSideKeepsCode(): boolean {
    let emitCode: boolean = false;
    if (this.inIfDef()) {
      const ifState = this.currIfDef();
      if (ifState !== undefined) {
        emitCode = ifState.thisSideEmits;
      }
    }
    return emitCode;
  }

  private logMessage(message: string): void {
    if (this.isLogging) {
      this.context.logger.logMessage(message);
    }
  }

  private logMessageConditional(condition: boolean, message: string): void {
    if (condition == true) {
      this.context.logger.logMessage(message);
    }
  }

  private forceLogMessage(message: string): void {
    this.context.logger.logMessage(message);
  }

  private logMessageOutline(message: string): void {
    if (this.isLoggingOutline) {
      this.context.logger.logMessage(message);
    }
  }
}
