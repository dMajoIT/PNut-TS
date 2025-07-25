#!/usr/bin/env node
/* eslint-disable no-console */
/** @format */

// src/pnut-ts.ts
'use strict';
import { Command, Option, CommanderError, type OptionValues } from 'commander';
import { Context } from './utils/context';
import { Compiler } from './classes/compiler';
import { eTextSub, SpinDocument } from './classes/spinDocument';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
//import { UsbSerial } from './utils/usb.serial';

// NOTEs re-stdio in js/ts
// REF https://blog.logrocket.com/using-stdout-stdin-stderr-node-js/

// expose our installation path
// REF: https://stackoverflow.com/questions/32944714/best-way-to-find-the-location-of-a-specific-file-within-a-node-dependency
// can then get by:
//  var assets = require('foo');
//  fs.readFile(assets.root + '/bar.png', function(){/*whatever*/});
export const root: string = __dirname;

export class PNutInTypeScript {
  private readonly program = new Command();
  //static isTesting: boolean = false;
  private options: OptionValues = this.program.opts();
  private version: string = '1.51.5';
  private argsArray: string[] = [];
  private context: Context;
  private spinDocument: SpinDocument | undefined = undefined;
  private shouldAbort: boolean = false;
  private requiresFilename: boolean = false;

  constructor(argsOverride?: string[]) {
    //console.log(`PNut-TS: argsOverride=[${argsOverride}]`);
    if (argsOverride !== undefined) {
      this.argsArray = argsOverride;
      //PNutInTypeScript.isTesting = true;
    }
    process.stdout.on('error', (error: Error) => {
      console.error(`PNut-TS: An error occurred on stdout: "${error.message}", Aborting.`);
      process.exit(1);
    });

    process.stderr.on('error', (error: Error) => {
      console.error(`PNut-TS: An error occurred on stderr: "${error.message}", Aborting.`);
      process.exit(1);
    });
    process.stdout.on('close', () => {
      console.log('PNut-TS: stdout was closed');
    });

    process.stderr.on('close', () => {
      console.log('PNut-TS: stderr was closed');
    });
    this.context = new Context();
  }

  public setArgs(runArgs: string[]) {
    //console.log('runArgs: %o', runArgs);
    this.argsArray = runArgs;
    //PNutInTypeScript.isTesting = true;
  }

  public async run(): Promise<number> {
    // ensure we know early if we are running in developer mode
    if (process.env.PNUT_DEVELOP_MODE) {
      this.context.runEnvironment.developerModeEnabled = true;
    }
    // now setup and process arguments
    this.program
      .configureOutput({
        // Visibly override write routines as example!
        writeOut: (str) => process.stdout.write(this.prefixName(str)),
        writeErr: (str) => process.stderr.write(this.prefixName(str)),
        // Highlight errors in color.
        outputError: (str, write) => write(this.errorColor(str))
      })
      .name('pnut-ts')
      .version(`v${this.version}`, '-V, --version', 'Output the version number')
      //.version(`v${this.version}`)
      .usage('[optons] filename')
      //.description(`Propeller Spin2 compiler/downloader - v${this.version}`) // not until flasher is activated
      .description(`Propeller Spin2 compiler - v${this.version}`)
      .arguments('[filename]')
      .action((filename: string) => {
        this.options.filename = filename;
      })
      //.option('-b, --both', 'Compile with DEBUG, download to FLASH and run')
      //.option('-44, --ver44', 'Listings compatible with PNut_v44 and later')
      .option('-d, --debug', 'Compile with DEBUG')
      //      .option('-f, --flash', 'Download to FLASH and run')
      //      .option('-r, --ram', 'Download to RAM and run')
      .option('-l, --list', 'Generate listing files (.lst) from compilation')
      //      .option('-p, --plug <dvcNode>', 'download to/flash Propeller attached to <dvcNode>')
      //      .option('-n, --dvcnodes', 'List available USB PropPlug device (n)odes')
      .option('-v, --verbose', 'Output verbose messages')
      //.option('-B, --bin', 'Generate binary files (.bin) suitable for download')
      .option('-a, --altbin', 'Use alternate .binary name vs. .bin')
      .option('-o, --output <name>', 'Specify output file basename')
      .option('-i, --intermediate', 'Generate *__pre.spin2 after preprocessing')
      .option('-q, --quiet', 'Quiet mode (suppress banner and non-error text)')
      .option('-F, --flashfile', 'Generate FLASH image file (.flash) suitable for writing to flash chip')
      .option('-O, --obj', 'Generate object files (.obj) from compilation')
      .option('-D, --Define <symbol...>', 'Define (add) preprocessor symbol(s)')
      .option('-U, --Undefine <symbol...>', 'Undefine (remove) preprocessor symbol(s)')
      .option('-I, --Include <dir...>', 'Add preprocessor include directories')
      .addOption(
        new Option('--log <objectName...>', 'objectName').choices([
          'all',
          'outline',
          'compiler',
          'elementizer',
          'parser',
          'distiller',
          'preproc',
          'resolver'
        ])
      )
      .addOption(new Option('--regression <testName...>', 'testName').choices(['element', 'tables', 'resolver', 'preproc']))
      .addOption(new Option('--pass <passName...>', 'Stop after passName').choices(['preprocess', 'elementize', 'con-block']));

    this.program.addHelpText('beforeAll', `$-`);

    this.program.addHelpText(
      'afterAll',
      `$-
      Example:
         $ pnut-ts my-top-level.spin2         # compile leaving .bin file
         $ pnut-ts -l my-top-level.spin2      # compile file leaving .bin and .lst files
         `
    );

    // HOLD: (we don't support flash or ram download yet)
    //   $ pnut-ts -c -d -r my-top-level.spin2   # compile file with Debug and run from RAM
    //   $ pnut-ts -cf my-top-level.spin2        # compile file without Debug download to FLASH and run

    //this.program.showHelpAfterError('(add --help for additional information)');

    this.program.exitOverride(); // throw instead of exit

    this.context.logger.setProgramName(this.program.name());

    // Combine process.argv with the modified this.argsArray
    //const testArgsInterp = this.argsArray.length === 0 ? '[]' : this.argsArray.join(', ');
    //this.context.logger.progressMsg(`** process.argv=[${process.argv.join(', ')}], this.argsArray=[${testArgsInterp}]`);
    let processArgv: string[] = process.argv;
    const runningCoverageTesting: boolean = processArgv.includes('--coverage') || path.basename(processArgv[1]) == 'processChild.js';
    const foundJest: boolean = path.basename(processArgv[1]) == 'jest';
    if (foundJest && !runningCoverageTesting) {
      processArgv = processArgv.slice(0, 2);
    }
    const combinedArgs: string[] = this.argsArray.length == 0 ? processArgv : [...processArgv, ...this.argsArray.slice(2)];
    //console.log(`DBG: combinedArgs=[${combinedArgs}](${combinedArgs.length})`);

    //if (!runningCoverageTesting) {
    //}
    //const GAHrunAsCoverageBUG: boolean = combinedArgs.includes('/workspaces/Pnut-ts-dev/node_modules/.bin/jest');
    /*
    if (combinedArgs.includes('/workspaces/Pnut-ts-dev/node_modules/.bin/jest')) {
      //console.error(`ABORT pnut-ts.js run as jest coverage`);
      return 0;
      //process.exit(0);
    }
    //*/
    try {
      this.program.parse(combinedArgs);
    } catch (error: unknown) {
      if (error instanceof CommanderError) {
        //this.context.logger.logMessage(`XYZZY Error: name=[${error.name}], message=[${error.message}]`);
        if (error.name === 'CommanderError') {
          this.context.logger.logMessage(``); // our blank line so prompt is not too close after output
          //this.context.logger.logMessage(`  xyzxzy `);
          if (error.message !== '(outputHelp)') {
            this.context.logger.logMessage(`  (See --help for available options)\n`);
            //this.program.outputHelp();
          }
        } else {
          if (error.name != 'oe' && error.name != 'Ee' && error.name != 'CommanderError2' && error.message != 'outputHelp') {
            this.context.logger.logMessage(`Catch name=[${error.name}], message=[${error.message}]`);
            // Instead of throwing, return a resolved Promise with a specific value, e.g., -1
            return Promise.resolve(-1);
          }
        }
      } else {
        this.context.logger.logMessage(`XYZZY Catch unknown error=[${error}]`);
        // Instead of throwing, return a resolved Promise with a specific value, e.g., -1
        return Promise.resolve(-1);
      }
    }

    if (this.context.runEnvironment.developerModeEnabled) {
      this.context.logger.verboseMsg('PNUT_DEVELOP_MODE is enabled');
    }

    //this.context.logger.progressMsg(`** RUN WITH ARGV=[${combinedArgs.join(', ')}]`);
    if (!foundJest && runningCoverageTesting) {
      this.context.reportOptions.coverageTesting = true;
    }

    //this.context.logger.progressMsg(`after parse()`);
    //console.log('arguments: %o', this.program.args);  // should be just filespec to compile
    //console.log('combArguments: %o', combinedArgs);
    //console.log('options: %o', this.program.opts());

    this.options = { ...this.options, ...this.program.opts() };

    const showingHelp: boolean = this.program.args.includes('--help') || this.program.args.includes('-h');

    if (!showingHelp) {
      if (foundJest || runningCoverageTesting) {
        this.context.logger.progressMsg(`(DBG) foundJest=(${foundJest}), runningCoverageTesting=(${runningCoverageTesting})`);
      }
    }

    if (this.options.verbose) {
      this.context.logger.enabledVerbose();
    }
    if (this.options.intermediate) {
      this.context.preProcessorOptions.writeIntermediateSpin2 = true;
    }
    if (this.options.flashfile) {
      this.context.compileOptions.writeFlashImageFile = true;
    }
    if (this.options.list) {
      this.context.compileOptions.writeListing = true;
    }
    //if (this.options.ver44) {
    // always true from here out...
    this.context.compileOptions.v44FormatListing = true;
    //}

    if (this.options.altbin) {
      this.context.compileOptions.binarySuffix = 'binary'; // use binary vs bin
      this.context.logger.verboseMsg('Writing .binary suffix binary files');
    }

    //if (this.options.bin) {
    // ALWAYS SET THIS until we have a built-in flasher
    this.context.compileOptions.writeBin = true;
    //}

    if (this.options.obj) {
      this.context.compileOptions.writeObj = true;
    }

    /*
    if (this.options.dvcnodes) {
      this.loadUsbPortsFound();
      for (let index = 0; index < this.context.runEnvironment.serialPortDevices.length; index++) {
        const dvcNode = this.context.runEnvironment.serialPortDevices[index];
        this.context.logger.progressMsg(` USB #${index + 1} [${dvcNode}]`);
      }
      if (this.context.runEnvironment.serialPortDevices.length == 0) {
        this.context.logger.progressMsg(` USB  - no Serial Ports Found!`);
      }
    }

    if (this.options.plug) {
      this.context.compileOptions.propPlug = this.options.plug;
      this.context.logger.verboseMsg(`* using USB [${this.context.compileOptions.propPlug}]`);
    }
    */

    if (!this.options.quiet && !foundJest && !runningCoverageTesting) {
      const signOnCompiler: string = "Propeller Spin2/PASM2 Compiler 'pnut_ts' (c) 2025 Iron Sheep Productions, LLC., Parallax Inc.";
      this.context.logger.infoMsg(`* ${signOnCompiler}`);
      const signOnVersion: string = `Version ${this.version}, {buildDateHere}`;
      this.context.logger.infoMsg(`* ${signOnVersion}`);
    }

    if (!this.options.quiet && !showingHelp) {
      let commandLine: string;
      if ((foundJest || runningCoverageTesting) && this.argsArray.length === 0) {
        commandLine = `pnut_ts -- pre-run, IGNORED --`;
      } else {
        commandLine = `pnut_ts ${combinedArgs.slice(2).join(' ')}`;
      }
      this.context.logger.infoMsg(`* ${commandLine}`);
    }

    // OVERRIDE mech to allow args of ['', 'filename.spin2'] - spin2 extension does this!!!
    for (let index = 0; index < this.program.args.length; index++) {
      const argument: string = this.program.args[index];
      if (argument.length > 0 && argument.toLowerCase().includes('.spin')) {
        if (this.options.filename !== argument) {
          this.options.filename = argument;
        }
      }
    }

    if (this.options.filename === undefined) {
      let needAbort: boolean = false;
      for (let index = 0; index < combinedArgs.length; index++) {
        if (combinedArgs[index].length > 0 && combinedArgs[index].toLowerCase().endsWith('.spin2')) {
          if (this.options.filename === undefined) {
            this.options.filename = combinedArgs[index];
          } else {
            this.context.logger.errorMsg('Compiling more than one .spin2 files at a time, not supported!');
            needAbort = true;
            break;
          }
        }
      }
      if (needAbort) {
        return Promise.resolve(-1);
      }
    }

    //this.context.logger.verboseMsg(`* opts[${this.program.opts()}]`);
    //this.context.logger.verboseMsg(`* args[${this.program.args}]`);

    // let other systems know we are running tests of the compiler
    this.context.reportOptions.regressionTesting = foundJest || runningCoverageTesting;

    if (this.options.regression) {
      // forward our REGRESSION TEST Options
      this.requiresFilename = true;
      const choices: string[] = this.options.regression;
      this.context.logger.verboseMsg('MODE: Regression Testing- Gen Reports:');
      if (choices.includes('element')) {
        this.context.reportOptions.writeElementsReport = true;
        this.context.logger.verboseMsg('  Element Report');
      }
      if (choices.includes('tables')) {
        this.context.reportOptions.writeTablesReport = true;
        this.context.logger.verboseMsg('  Tables Report');
      }
      if (choices.includes('preproc')) {
        this.context.reportOptions.writePreprocessReport = true;
        this.context.logger.verboseMsg('  preProcessor Report');
      }
      if (choices.includes('resolver')) {
        this.context.reportOptions.writeResolverReport = true;
        this.context.logger.verboseMsg('  resolver Report');
      }
    }

    if (this.options.log) {
      // forward our LOG Options
      this.requiresFilename = true;
      const choices: string[] = this.options.log;
      this.context.logger.verboseMsg('MODE: Logging:');
      //this.context.logger.verboseMsg(`* log: [${choices}]`);
      const wantsAll: boolean = choices.includes('all');
      if (choices.includes('outline') || wantsAll) {
        this.context.logOptions.logOutline = true;
        this.context.logger.verboseMsg('  Outline');
      }
      if (choices.includes('distiller') || wantsAll) {
        this.context.logOptions.logDistiller = true;
        this.context.logger.verboseMsg('  Distiller');
      }
      if (choices.includes('elementizer') || wantsAll) {
        this.context.logOptions.logElementizer = true;
        this.context.logger.verboseMsg('  Elementizer');
      }
      if (choices.includes('parser') || wantsAll) {
        this.context.logOptions.logParser = true;
        this.context.logger.verboseMsg('  Parser');
      }
      if (choices.includes('compiler') || wantsAll) {
        this.context.logOptions.logCompile = true;
        this.context.logger.verboseMsg('  Compile');
      }
      if (choices.includes('resolver') || wantsAll) {
        this.context.logOptions.logResolver = true;
        this.context.logger.verboseMsg('  Resolver');
      }
      if (choices.includes('preproc')) {
        this.context.logOptions.logPreprocessor = true;
        this.context.logger.verboseMsg('  PreProcessor');
      }
    }

    if (this.options.pass) {
      // forward our PASS Options (stop after pass)
      this.requiresFilename = true;
      const choices: string[] = this.options.pass;
      this.context.logger.verboseMsg('MODE: End after:');
      if (choices.includes('preprocess')) {
        this.context.passOptions.afterPreprocess = true;
        this.context.logger.verboseMsg('  PreProcessing');
      }
      if (choices.includes('elementize')) {
        this.context.passOptions.afterElementize = true;
        this.context.logger.verboseMsg('  Elementizer');
      }
      if (choices.includes('con-block')) {
        this.context.passOptions.afterConBlock = true;
        this.context.logger.verboseMsg('  ConBlocks');
      }
    }

    if (this.options.output) {
      // forward our Output Filename
      const outFilename = this.options.output;
      this.context.compileOptions.outputFilename = outFilename;
      this.context.logger.verboseMsg(`* Override output filename, now [${outFilename}]`);
    }

    /*
    if (this.options.both) {
      this.context.logger.verboseMsg('have BOTH: enabling FLASH and DEBUG');
      this.options.debug = true;
      this.options.flash = true;
      this.options.ram = false;
    }*/

    if (this.options.debug) {
      this.context.logger.progressMsg('Compiling with DEBUG');
      this.context.compileOptions.enableDebug = true;
      this.requiresFilename = true;
    }

    /*
    if (this.options.flash) {
      this.context.logger.progressMsg('Downloading to FLASH');
      this.context.compileOptions.writeFlash = true;
      this.requiresFilename = true;
    }

    if (this.options.ram) {
      this.context.logger.progressMsg('Downloading to RAM');
      this.context.compileOptions.writeRAM = true;
      this.requiresFilename = true;
    }

    if (this.options.ram && this.options.flash) {
      //this.program.error('Please only use one of -f and -r');
      this.context.logger.errorMsg('Please only use one of -f and -r');
      this.shouldAbort = true;
    }*/

    //if (this.options.compile) {
    // ALWAYS SET THIS until we have a built-in flasher
    if (!showingHelp) {
      if ((foundJest || runningCoverageTesting) && this.options.filename === undefined) {
        // we don't handle this!
        this.requiresFilename = false;
        this.context.compileOptions.compile = false;
      } else {
        this.requiresFilename = true;
        this.context.compileOptions.compile = true;
      }
    }
    //}

    if (this.options.Include) {
      // forward  Include Folder name(s)
      const includeDirs: string[] = this.options.Include;
      for (const newFolder of includeDirs) {
        if (fs.existsSync(newFolder) && fs.statSync(newFolder).isDirectory()) {
          this.context.preProcessorOptions.includeFolders.push(newFolder);
        }
      }
      //this.context.logger.verboseMsg(`Include Dirs=[${this.context.preProcessorOptions.includeFolders}]`);
    }

    if (this.options.Define) {
      // forward  Defined Symbol(s)
      this.context.logger.verboseMsg(`* Def [${this.options.Define}]`);
      // internally all Preprocessor symbols are UPPER CASE
      for (const newSymbol of this.options.Define) {
        this.context.preProcessorOptions.defSymbols.push(newSymbol.toUpperCase());
      }
    }

    if (this.options.Undefine) {
      // forward Symbol(s) to be Undefined
      this.context.logger.verboseMsg(`* Undef [${this.options.Undefine}]`);
      // internally all Preprocessor symbols are UPPER CASE
      for (const newSymbol of this.options.Undefine) {
        this.context.preProcessorOptions.undefSymbols.push(newSymbol.toUpperCase());
      }
    }

    let filename: string | undefined = this.options.filename;
    if (filename !== undefined && filename.endsWith('.json')) {
      // we don't handle .json files if presented
      filename = undefined;
    }

    if (filename !== undefined && filename.length > 0) {
      this.context.logger.verboseMsg(`Working with file [${filename}]`);
      // and load our .spin2 top-level file
      this.spinDocument = new SpinDocument(this.context, filename);
      if (this.spinDocument === undefined || !this.spinDocument.validFile) {
        this.context.logger.errorMsg(`File [${filename}] does not exist or is not a .spin2 file!`);
        this.shouldAbort = true;
      } else {
        // record this new file in our master list of files we compiled to buid the binary
        this.context.sourceFiles.addFile(this.spinDocument);
        // TODO post symbols to context object instead of top-level doc??
        this.spinDocument.defineSymbol('__VERSION__', this.version, eTextSub.SA_TEXT_YES);
        this.context.currentFolder = this.spinDocument.dirName;
        // set up output filespec in case we are writing a listing file
        const lstFilespec = filename.replace('.spin2', '.lst');
        this.context.compileOptions.listFilename = lstFilespec;
        const flashFilespec = filename.replace('.spin2', '.flash');
        this.context.compileOptions.flashFilename = flashFilespec;
        if (this.options.list) {
          this.context.logger.verboseMsg(`* Write listing file: ${lstFilespec}`);
        }
        if (this.context.compileOptions.writeObj) {
          const objFilespec = filename.replace('.spin2', '.obj');
          this.context.logger.verboseMsg(`* Write object file: ${objFilespec}`);
        }
      }
    } else {
      if (this.requiresFilename) {
        if (!this.options.verbose) {
          console.log('arguments: %o', this.program.args);
          console.log('combArguments: %o', combinedArgs);
          console.log('options: %o', this.program.opts());
        }
        this.context.logger.errorMsg('Missing filename argument');
        this.shouldAbort = true;
      }
    }

    if (this.shouldAbort == false) {
      this.context.logger.verboseMsg(''); // blank line
      this.context.logger.verboseMsg(`ext dir [${this.context.extensionFolder}]`);
      this.context.logger.verboseMsg(`lib dir [${this.context.libraryFolder}]`);
      this.context.logger.verboseMsg(`wkg dir [${this.context.currentFolder}]`);
      if (this.context.preProcessorOptions.includeFolders.length > 0) {
        this.context.logger.verboseMsg(`inc dir [${this.context.preProcessorOptions.includeFolders}]`);
      }
      this.context.logger.verboseMsg(''); // blank line
      /*
      this.runCommand('node -v').then((result) => {
        if (result.error) {
          this.context.logger.errorMsg(`${result.error}`);
        } else {
          this.context.logger.verboseMsg(`Node version: ${result.value}`);
          this.context.logger.verboseMsg(''); // blank line
        }
      });
      */
      const result = await this.runCommand('node -v');
      if (result.value !== null) {
        this.context.logger.verboseMsg(`Node version: ${result.value} (external)`);
      } else {
        // fake this for now...
        this.context.logger.verboseMsg(`Node version: v18.5.0 (built-in)`);
        /*
        const nodePath = process.execPath;
        this.context.logger.verboseMsg(`nodePath: [${nodePath}]`);
        result = await this.runCommand(`${nodePath} -v`);
        if (result.value !== null) {
          this.context.logger.verboseMsg(`Node version: ${result.value}`);
        } else {
          this.context.logger.verboseMsg(`CMD [${result.cmd}] FAIL: [${result.error}]`);
        }
        */
      }
    }

    if (!this.shouldAbort && this.spinDocument && this.context.compileOptions.compile) {
      this.context.logger.verboseMsg(`Compiling file [${filename}]`);
      if (!this.context.passOptions.afterPreprocess) {
        const theCompiler = new Compiler(this.context);
        try {
          await theCompiler.Compile();
        } catch (error) {
          this.context.logger.errorMsg(`Compilation failed: ${error}`);
          // Instead of throwing, return a resolved Promise with a specific value, e.g., -1
          return Promise.resolve(-1);
        }
      }
    }
    // const optionsString: string = 'options: ' + String(this.options);
    // this.verboseMsg(optionsString);
    if (!this.options.quiet && !showingHelp) {
      if (this.shouldAbort) {
        this.context.logger.progressMsg('Aborted!');
      } else {
        this.context.logger.progressMsg('Done');
      }
    }
    return Promise.resolve(0);
  }

  //private async loadUsbPortsFound(): Promise<void> {
  //  const deviceNodes: string[] = await UsbSerial.serialDeviceList();
  //  this.context.runEnvironment.serialPortDevices = deviceNodes;
  //}

  private errorColor(str: string): string {
    // Add ANSI escape codes to display text in red.
    return `\x1b[31m${str}\x1b[0m`;
  }

  private prefixName(str: string): string {
    if (str.startsWith('$-')) {
      return `${str.substring(2)}`;
    } else {
      return `PNut-TS: ${str}`;
    }
  }

  private async runCommand(command: string): Promise<{ cmd: string; value: string | null; error: string | null }> {
    return new Promise((resolve) => {
      try {
        exec(command, (error, stdout, stderr) => {
          if (error) {
            resolve({ cmd: command, value: null, error: error.message });
          }
          if (stderr) {
            resolve({ cmd: command, value: null, error: stderr });
          }
          resolve({ cmd: command, value: stdout.trim(), error: null });
        });
      } catch (error: unknown) {
        let excString: string;
        if (error instanceof Error) {
          excString = `Exception: ${error.name}-${error.message}`;
        } else {
          excString = `Exception: ${JSON.stringify(error)}`;
        }
        resolve({ cmd: command, value: null, error: excString });
      }
    });
  }
}

// --------------------------------------------------
// our actual command line tool when run stand-alone
//
//if (PNutInTypeScript.isTesting == false) {
const cliTool = new PNutInTypeScript();
cliTool.run();
//}
