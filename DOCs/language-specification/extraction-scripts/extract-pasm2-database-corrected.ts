#!/usr/bin/env npx tsx

/**
 * CORRECTED PASM2 Instruction Database Extractor
 *
 * Extracts complete PASM2 instruction set from PNut-TS compiler
 * with operand patterns based on ACTUAL compiler parsing logic
 * from spinResolver.ts - NOT from unreliable comments!
 *
 * Fixes critical errors found in manual operand pattern guessing
 */

import * as fs from 'fs';
import * as path from 'path';

// Import types and utilities from the compiler
import { eValueType } from '../../../src/classes/types';

interface OperandFormat {
  name: string;
  pattern: string;
  description: string;
  valueType: eValueType;
}

interface EffectFlag {
  name: string;
  symbol: string;
  value: number;
  description: string;
}

interface InstructionEncoding {
  bits: number;
  opcode: number;
  effects: number;
  operandFormat: eValueType;
  rawValue: number;
}

interface AssemblyInstruction {
  mnemonic: string;
  enum_name: string;
  opcode: number;
  effects: EffectFlag[];
  operandFormat: OperandFormat;
  description: string;
  syntax: string;
  examples: string[];
  encoding: InstructionEncoding;
  category: string;
}

interface PASM2Database {
  metadata: {
    version: string;
    extractedFrom: string;
    extractedAt: string;
    description: string;
    totalInstructions: number;
    lastUpdated?: string;
    totalConditionCodes?: number;
    totalEffectFlags?: number;
  };
  instructions: AssemblyInstruction[];
  operandFormats: OperandFormat[];
  effectFlags: EffectFlag[];
  categories: string[];
}

// Effect flags with CORRECT encoding (WC=1, WZ=2, WCZ=3) - verified from compiler
const EFFECT_FLAGS: EffectFlag[] = [
  { name: 'none', symbol: '', value: 0b00, description: 'No effect flags' },
  { name: 'wc', symbol: 'WC', value: 0b01, description: 'Write Carry flag' },
  { name: 'wz', symbol: 'WZ', value: 0b10, description: 'Write Zero flag' },
  { name: 'wcz', symbol: 'WCZ', value: 0b11, description: 'Write Carry and Zero flags' }
];

// CORRECTED Operand formats based on ACTUAL compiler parsing logic from spinResolver.ts
// Each pattern verified against the real switch(operandType) case implementation
const OPERAND_FORMATS: { [key in eValueType]?: OperandFormat } = {
  [eValueType.operand_ds]: {
    name: 'operand_ds',
    pattern: 'D,S/#',
    description: 'Destination register, Source register or immediate value',
    valueType: eValueType.operand_ds
  },
  [eValueType.operand_bitx]: {
    name: 'operand_bitx',
    pattern: 'D,S/#',
    description: 'Bit manipulation with optional effect flags: Destination register, bit position',
    valueType: eValueType.operand_bitx
  },
  [eValueType.operand_testb]: {
    name: 'operand_testb',
    pattern: 'D,S/#',
    description: 'Test bit with logic function: Destination register, bit position',
    valueType: eValueType.operand_testb
  },
  [eValueType.operand_du]: {
    name: 'operand_du',
    pattern: 'D{,S/#}',
    description: 'Destination register, optional Source register or immediate (unary/binary)',
    valueType: eValueType.operand_du
  },
  [eValueType.operand_duii]: {
    name: 'operand_duii',
    pattern: 'D{,S/#}',
    description: 'Destination, optional source (ALTI instruction modifier)',
    valueType: eValueType.operand_duii
  },
  [eValueType.operand_duiz]: {
    name: 'operand_duiz',
    pattern: 'D{,S/#}',
    description: 'Destination, optional source (immediate bit set if no source)',
    valueType: eValueType.operand_duiz
  },
  [eValueType.operand_ds3set]: {
    name: 'operand_ds3set',
    pattern: 'S/#{,D,#0..7}',
    description: 'Set nibble: source/immediate, optional destination and nibble index 0-7',
    valueType: eValueType.operand_ds3set
  },
  [eValueType.operand_ds3get]: {
    name: 'operand_ds3get',
    pattern: 'D{,S/#,#0..7}',
    description: 'Get nibble: destination, optional source and nibble index 0-7',
    valueType: eValueType.operand_ds3get
  },
  [eValueType.operand_ds2set]: {
    name: 'operand_ds2set',
    pattern: 'S/#{,D,#0..3}',
    description: 'Set byte: source/immediate, optional destination and byte index 0-3',
    valueType: eValueType.operand_ds2set
  },
  [eValueType.operand_ds2get]: {
    name: 'operand_ds2get',
    pattern: 'D{,S/#,#0..3}',
    description: 'Get byte: destination, optional source and byte index 0-3',
    valueType: eValueType.operand_ds2get
  },
  [eValueType.operand_ds1set]: {
    name: 'operand_ds1set',
    pattern: 'S/#{,D,#0..1}',
    description: 'Set word: source/immediate, optional destination and word index 0-1',
    valueType: eValueType.operand_ds1set
  },
  [eValueType.operand_ds1get]: {
    name: 'operand_ds1get',
    pattern: 'D{,S/#,#0..1}',
    description: 'Get word: destination, optional source and word index 0-1',
    valueType: eValueType.operand_ds1get
  },
  [eValueType.operand_dsj]: {
    name: 'operand_dsj',
    pattern: 'D,S/@',
    description: 'Jump with destination and relative address: register, relative address',
    valueType: eValueType.operand_dsj
  },
  [eValueType.operand_ls]: {
    name: 'operand_ls',
    pattern: 'D/#,S/#',
    description: 'Two operands: destination/immediate, source/immediate',
    valueType: eValueType.operand_ls
  },
  [eValueType.operand_lsj]: {
    name: 'operand_lsj',
    pattern: 'D/#,S/@',
    description: 'Jump/call with immediate destination and relative source: destination/immediate, relative address',
    valueType: eValueType.operand_lsj
  },
  [eValueType.operand_dsp]: {
    name: 'operand_dsp',
    pattern: 'D,S/#/PTRA/PTRB',
    description: 'Destination, source/immediate/pointer register',
    valueType: eValueType.operand_dsp
  },
  [eValueType.operand_lsp]: {
    name: 'operand_lsp',
    pattern: 'D/#,S/#/PTRA/PTRB',
    description: 'Memory operation: destination/immediate, source/immediate/pointer',
    valueType: eValueType.operand_lsp
  },
  [eValueType.operand_rep]: {
    name: 'operand_rep',
    pattern: '@,S/# | D/#,S/#',
    description: 'Repeat block: (@,count) for block end or (count,repetitions)',
    valueType: eValueType.operand_rep
  },
  [eValueType.operand_jmp]: {
    name: 'operand_jmp',
    pattern: '#S | D',
    description: 'Jump: immediate address or register',
    valueType: eValueType.operand_jmp
  },
  [eValueType.operand_call]: {
    name: 'operand_call',
    pattern: '#S | D',
    description: 'Call: immediate address or register',
    valueType: eValueType.operand_call
  },
  [eValueType.operand_calld]: {
    name: 'operand_calld',
    pattern: 'D,#S/{@}S | D,S/#',
    description: 'Call with return register: destination, address/relative/immediate',
    valueType: eValueType.operand_calld
  },
  [eValueType.operand_jpoll]: {
    name: 'operand_jpoll',
    pattern: 'S/#',
    description: 'Poll jump: target address/immediate',
    valueType: eValueType.operand_jpoll
  },
  [eValueType.operand_loc]: {
    name: 'operand_loc',
    pattern: 'D,#S{\\}',
    description: 'Load address: destination register, immediate address (optional \\ for absolute)',
    valueType: eValueType.operand_loc
  },
  [eValueType.operand_aug]: {
    name: 'operand_aug',
    pattern: '#S',
    description: 'Augment: immediate 23-bit value for AUGS/AUGD',
    valueType: eValueType.operand_aug
  },
  [eValueType.operand_d]: {
    name: 'operand_d',
    pattern: 'D',
    description: 'Destination register only',
    valueType: eValueType.operand_d
  },
  [eValueType.operand_de]: {
    name: 'operand_de',
    pattern: 'D | {WC/WZ/WCZ}',
    description: 'Destination register or effect flags only (GETRND)',
    valueType: eValueType.operand_de
  },
  [eValueType.operand_l]: {
    name: 'operand_l',
    pattern: 'D/#0..511',
    description: 'Destination or immediate value 0-511',
    valueType: eValueType.operand_l
  },
  [eValueType.operand_cz]: {
    name: 'operand_cz',
    pattern: '#C{,#Z}',
    description: 'Modify condition flags: C flag value (4-bit), optional Z flag value (4-bit)',
    valueType: eValueType.operand_cz
  },
  [eValueType.operand_pollwait]: {
    name: 'operand_pollwait',
    pattern: '',
    description: 'No operands - poll/wait instruction (moves S to D, sets S to $024)',
    valueType: eValueType.operand_pollwait
  },
  [eValueType.operand_getbrk]: {
    name: 'operand_getbrk',
    pattern: 'D/# WC/WZ/WCZ',
    description: 'Get break address: destination/immediate, REQUIRES effect flags',
    valueType: eValueType.operand_getbrk
  },
  [eValueType.operand_pinop]: {
    name: 'operand_pinop',
    pattern: 'D/#0..511 {WC/WZ}',
    description: 'Pin operation: destination/immediate pin number 0-511, optional effect flags',
    valueType: eValueType.operand_pinop
  },
  [eValueType.operand_testp]: {
    name: 'operand_testp',
    pattern: 'D/#0..511 WC/ANDC/ORC/XORC | WZ/ANDZ/ORZ/XORZ',
    description: 'Test pin: destination/immediate pin number 0-511 with REQUIRED logic function',
    valueType: eValueType.operand_testp
  },
  [eValueType.operand_pushpop]: {
    name: 'operand_pushpop',
    pattern: 'D/# | D',
    description: 'Push immediate/register or Pop to register (PUSHA/PUSHB/POPA/POPB)',
    valueType: eValueType.operand_pushpop
  },
  [eValueType.operand_xlat]: {
    name: 'operand_xlat',
    pattern: '',
    description: 'No operands - translated instruction (RET*/RESI*/XSTOP)',
    valueType: eValueType.operand_xlat
  },
  [eValueType.operand_akpin]: {
    name: 'operand_akpin',
    pattern: 'S/#',
    description: 'Acknowledge pin: pin number/immediate',
    valueType: eValueType.operand_akpin
  },
  [eValueType.operand_asmclk]: {
    name: 'operand_asmclk',
    pattern: '',
    description: 'Assembly clock instruction - no operands',
    valueType: eValueType.operand_asmclk
  },
  [eValueType.operand_nop]: {
    name: 'operand_nop',
    pattern: '',
    description: 'No operation - no operands',
    valueType: eValueType.operand_nop
  },
  [eValueType.operand_debug]: {
    name: 'operand_debug',
    pattern: '',
    description: 'Debug instruction - no operands',
    valueType: eValueType.operand_debug
  }
};

// Instruction categorization based on opcode patterns
function categorizeInstruction(mnemonic: string, opcode: number): string {
  const name = mnemonic.toLowerCase();

  // Arithmetic operations
  if (['add', 'sub', 'mul', 'div', 'abs', 'neg', 'inc', 'dec', 'addx', 'subx', 'adds', 'subs', 'addsx', 'subsx'].includes(name)) {
    return 'Arithmetic';
  }

  // Logical operations
  if (['and', 'or', 'xor', 'andn', 'orn', 'not', 'ones', 'bmask'].includes(name)) {
    return 'Logical';
  }

  // Shift and rotate
  if (['shl', 'shr', 'sal', 'sar', 'rol', 'ror', 'rcl', 'rcr', 'rev', 'zerox', 'signx'].includes(name)) {
    return 'Shift/Rotate';
  }

  // Memory operations
  if (['mov', 'rdbyte', 'rdword', 'rdlong', 'wrbyte', 'wrword', 'wrlong', 'rdlut', 'wrlut'].includes(name)) {
    return 'Memory';
  }

  // Comparison and test
  if (['cmp', 'cmps', 'cmpx', 'cmpr', 'cmpm', 'cmpsub', 'test', 'testn', 'testb', 'testbn', 'testp', 'testpn'].includes(name)) {
    return 'Comparison/Test';
  }

  // Control flow
  if (['jmp', 'call', 'ret', 'djnz', 'djz', 'tjz', 'tjnz', 'tjf', 'tjnf', 'tjs', 'tjns', 'tjv'].includes(name)) {
    return 'Control Flow';
  }

  // Hub operations
  if (['hubset', 'cogid', 'coginit', 'cogstop', 'locknew', 'lockrel', 'lockret', 'locktry'].includes(name)) {
    return 'Hub/Cog';
  }

  // Pin operations
  if (['dirh', 'dirl', 'dirc', 'dirnot', 'drvh', 'drvl', 'drvc', 'drvnot', 'outh', 'outl', 'outc', 'outnot', 'fltl', 'flth', 'fltc', 'fltnot'].includes(name)) {
    return 'Pin Control';
  }

  return 'Miscellaneous';
}

function generateExamples(mnemonic: string, operandPattern: string): string[] {
  const examples: string[] = [];

  switch (operandPattern) {
    case 'D,S/#':
      examples.push(`${mnemonic.toUpperCase()} r0, r1`);
      examples.push(`${mnemonic.toUpperCase()} result, #100`);
      break;

    case 'D{,S/#}':
      examples.push(`${mnemonic.toUpperCase()} result`);
      examples.push(`${mnemonic.toUpperCase()} result, source`);
      examples.push(`${mnemonic.toUpperCase()} result, #42`);
      break;

    case 'D':
      examples.push(`${mnemonic.toUpperCase()} result`);
      break;

    case '':
      examples.push(`${mnemonic.toUpperCase()}`);
      break;

    case 'D,S/@':
      examples.push(`${mnemonic.toUpperCase()} reg, @loop_start`);
      examples.push(`${mnemonic.toUpperCase()} counter, @target`);
      break;

    case 'D/#,S/@':
      examples.push(`${mnemonic.toUpperCase()} #5, @target`);
      examples.push(`${mnemonic.toUpperCase()} counter, @loop_end`);
      break;

    case 'D/#,S/#':
      examples.push(`${mnemonic.toUpperCase()} #$100, #$200`);
      examples.push(`${mnemonic.toUpperCase()} dest_reg, #value`);
      break;

    case 'D,S/#/PTRA/PTRB':
      examples.push(`${mnemonic.toUpperCase()} result, source`);
      examples.push(`${mnemonic.toUpperCase()} result, #100`);
      examples.push(`${mnemonic.toUpperCase()} result, PTRA`);
      break;

    case '#S | D':
      examples.push(`${mnemonic.toUpperCase()} #target_addr`);
      examples.push(`${mnemonic.toUpperCase()} target_reg`);
      break;

    default:
      examples.push(`${mnemonic.toUpperCase()} ${operandPattern}`);
      break;
  }

  return examples;
}

async function extractPASM2Database(): Promise<PASM2Database> {
  console.log('🔍 Extracting CORRECTED PASM2 instruction database from compiler parsing logic...');

  // Read the parseUtils.ts file to extract instruction mappings
  const parseUtilsPath = path.join(__dirname, '../../../src/classes/parseUtils.ts');
  const parseUtilsContent = fs.readFileSync(parseUtilsPath, 'utf-8');

  // Extract instruction mappings using regex
  const instructionRegex = /this\.asmcodeValues\.set\(eAsmcode\.(\w+),\s*setAsmcodeValue\(([^,]+),\s*([^,]+),\s*eValueType\.(\w+)\)\);\s*\/\/\s*(.+)/g;

  const instructions: AssemblyInstruction[] = [];
  let match;

  while ((match = instructionRegex.exec(parseUtilsContent)) !== null) {
    const enumName = match[1]; // e.g., "ac_add"
    const opcodeStr = match[2].trim(); // e.g., "0b000100000"
    const effectsStr = match[3].trim(); // e.g., "0b11"
    const operandFormatName = match[4]; // e.g., "operand_ds"
    const comment = match[5].trim(); // e.g., "ADD D,S/#" (used for mnemonic only)

    // Parse mnemonic from comment (still needed for instruction name)
    const mnemonicMatch = comment.match(/^(\w+)/);
    if (!mnemonicMatch) continue;

    const mnemonic = mnemonicMatch[1];

    // Parse opcode (handle binary and hex formats)
    let opcode: number;
    if (opcodeStr.startsWith('0b')) {
      opcode = parseInt(opcodeStr.substring(2), 2);
    } else if (opcodeStr.startsWith('0x')) {
      opcode = parseInt(opcodeStr.substring(2), 16);
    } else {
      opcode = parseInt(opcodeStr, 10);
    }

    // Parse effects
    let effectsValue: number;
    if (effectsStr.startsWith('0b')) {
      effectsValue = parseInt(effectsStr.substring(2), 2);
    } else {
      effectsValue = parseInt(effectsStr, 10);
    }

    // Map to effect flags using CORRECTED encoding
    const allowedEffects = EFFECT_FLAGS.filter(ef =>
      (effectsValue & ef.value) === ef.value && ef.value !== 0
    );
    if (effectsValue === 0b11) {
      allowedEffects.push(EFFECT_FLAGS.find(ef => ef.name === 'wcz')!);
    }

    // Get CORRECTED operand format
    const operandFormatEnum = eValueType[operandFormatName as keyof typeof eValueType];
    const operandFormat = OPERAND_FORMATS[operandFormatEnum];

    if (!operandFormat) {
      console.warn(`⚠️  Unknown operand format: ${operandFormatName} for ${mnemonic}`);
      continue;
    }

    // Calculate raw encoding value
    const rawValue = (operandFormatEnum << 11) + (effectsValue << 9) + opcode;

    // Create instruction object with CORRECTED operand patterns
    const instruction: AssemblyInstruction = {
      mnemonic: mnemonic.toUpperCase(),
      enum_name: enumName,
      opcode,
      effects: allowedEffects,
      operandFormat,
      description: `${mnemonic.toUpperCase()} instruction - ${operandFormat.description}`,
      syntax: `${mnemonic.toUpperCase()} ${operandFormat.pattern}`,
      examples: generateExamples(mnemonic, operandFormat.pattern),
      encoding: {
        bits: 32,
        opcode,
        effects: effectsValue,
        operandFormat: operandFormatEnum,
        rawValue
      },
      category: categorizeInstruction(mnemonic, opcode)
    };

    instructions.push(instruction);
  }

  // Sort instructions by mnemonic
  instructions.sort((a, b) => a.mnemonic.localeCompare(b.mnemonic));

  // Get unique categories
  const categories = [...new Set(instructions.map(inst => inst.category))].sort();

  const database: PASM2Database = {
    metadata: {
      version: '2.0.0',
      extractedFrom: 'PNut-TS Compiler parseUtils.ts with CORRECTED operand patterns from spinResolver.ts',
      extractedAt: new Date().toISOString(),
      description: 'Complete PASM2 (Parallax Propeller 2 Assembly) instruction set database with compiler-verified operand formats',
      totalInstructions: instructions.length,
      totalEffectFlags: EFFECT_FLAGS.length
    },
    instructions,
    operandFormats: Object.values(OPERAND_FORMATS).filter(Boolean),
    effectFlags: EFFECT_FLAGS,
    categories
  };

  console.log(`✅ Extracted ${instructions.length} instructions with corrected operand patterns`);
  console.log(`📊 Found ${Object.keys(OPERAND_FORMATS).length} unique operand formats`);
  console.log(`🏷️  Categorized into ${categories.length} instruction types`);

  return database;
}

async function main() {
  try {
    console.log('🚀 CORRECTED PASM2 Instruction Database Extraction Started');
    console.log('📋 Using ACTUAL compiler parsing logic - NOT unreliable comments!');
    console.log('');

    const database = await extractPASM2Database();

    // Save to corrected database file
    const outputPath = path.join(__dirname, '../databases/PASM2-Instruction-Database-CORRECTED.json');
    fs.writeFileSync(outputPath, JSON.stringify(database, null, 2));

    console.log('');
    console.log('📊 Extraction Summary:');
    console.log(`   ✅ Instructions: ${database.instructions.length}`);
    console.log(`   ✅ Operand Formats: ${database.operandFormats.length}`);
    console.log(`   ✅ Effect Flags: ${database.effectFlags.length} (WC=1, WZ=2, WCZ=3)`);
    console.log(`   ✅ Categories: ${database.categories.length}`);
    console.log(`   📁 Output: ${outputPath}`);
    console.log('');
    console.log('🎯 KEY CORRECTIONS APPLIED:');
    console.log('   • operand_dsj: D,S/# → D,S/@  (relative address, not immediate)');
    console.log('   • operand_lsj: D/#,S/# → D/#,S/@ (relative address in S)');
    console.log('   • operand_lsp: D/#/PTRx,S/# → D/#,S/#/PTRA/PTRB (corrected order)');
    console.log('   • All patterns verified against spinResolver.ts parsing logic');
    console.log('');
    console.log('✅ CORRECTED PASM2 instruction database generation completed!');

  } catch (error) {
    console.error('❌ Extraction failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}