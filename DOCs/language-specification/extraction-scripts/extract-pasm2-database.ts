#!/usr/bin/env npx tsx

/**
 * PASM2 Instruction Database Extractor
 *
 * Extracts complete PASM2 instruction set from PNut-TS compiler
 * as per PASM2-SPIN2-Language-Specification-Extraction-Roadmap.md
 *
 * Generates comprehensive JSON database following Phase 2.1 specifications
 */

import * as fs from 'fs';
import * as path from 'path';

// Import types and utilities from the compiler
import { eValueType } from '../src/classes/types';

interface OperandFormat {
  name: string;
  pattern: string;
  description: string;
  valueType: eValueType;
}

interface ConditionCode {
  name: string;
  symbol: string;
  value: number;
  description: string;
  aliases: string[];
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
  };
  instructions: AssemblyInstruction[];
  operandFormats: OperandFormat[];
  conditionCodes: ConditionCode[];
  effectFlags: EffectFlag[];
  categories: string[];
}

// Effect flags mapping based on compiler source
const EFFECT_FLAGS: EffectFlag[] = [
  { name: 'none', symbol: '', value: 0b00, description: 'No effect flags' },
  { name: 'wc', symbol: 'WC', value: 0b01, description: 'Write Carry flag' },
  { name: 'wz', symbol: 'WZ', value: 0b10, description: 'Write Zero flag' },
  { name: 'wcz', symbol: 'WCZ', value: 0b11, description: 'Write Carry and Zero flags' }
];

// Operand format mapping based on eValueType
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
    description: 'Bit manipulation: Destination register, bit position',
    valueType: eValueType.operand_bitx
  },
  [eValueType.operand_testb]: {
    name: 'operand_testb',
    pattern: 'D,S/#',
    description: 'Test bit: Destination register, bit position',
    valueType: eValueType.operand_testb
  },
  [eValueType.operand_du]: {
    name: 'operand_du',
    pattern: 'D{,S/#}',
    description: 'Destination register, optional Source register or immediate',
    valueType: eValueType.operand_du
  },
  [eValueType.operand_duii]: {
    name: 'operand_duii',
    pattern: 'D{,S/#}',
    description: 'Destination, optional immediate source (instruction modifier)',
    valueType: eValueType.operand_duii
  },
  [eValueType.operand_duiz]: {
    name: 'operand_duiz',
    pattern: 'D{,S/#}',
    description: 'Destination, optional immediate source (internal use)',
    valueType: eValueType.operand_duiz
  },
  [eValueType.operand_ds3set]: {
    name: 'operand_ds3set',
    pattern: '{D,}S/#{,#0..7}',
    description: 'Set nibble: optional destination, source, nibble index',
    valueType: eValueType.operand_ds3set
  },
  [eValueType.operand_ds3get]: {
    name: 'operand_ds3get',
    pattern: 'D{,S/#,#0..7}',
    description: 'Get nibble: destination, optional source, nibble index',
    valueType: eValueType.operand_ds3get
  },
  [eValueType.operand_ds2set]: {
    name: 'operand_ds2set',
    pattern: '{D,}S/#{,#0..3}',
    description: 'Set byte: optional destination, source, byte index',
    valueType: eValueType.operand_ds2set
  },
  [eValueType.operand_ds2get]: {
    name: 'operand_ds2get',
    pattern: 'D{,S/#,#0..3}',
    description: 'Get byte: destination, optional source, byte index',
    valueType: eValueType.operand_ds2get
  },
  [eValueType.operand_ds1set]: {
    name: 'operand_ds1set',
    pattern: '{D,}S/#{,#0..1}',
    description: 'Set word: optional destination, source, word index',
    valueType: eValueType.operand_ds1set
  },
  [eValueType.operand_ds1get]: {
    name: 'operand_ds1get',
    pattern: 'D{,S/#,#0..1}',
    description: 'Get word: destination, optional source, word index',
    valueType: eValueType.operand_ds1get
  },
  [eValueType.operand_dsj]: {
    name: 'operand_dsj',
    pattern: 'D,S/#',
    description: 'Jump instruction: register, target address/immediate',
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
    pattern: 'D/#,S/#',
    description: 'Call instruction: destination/immediate, source/immediate',
    valueType: eValueType.operand_lsj
  },
  [eValueType.operand_dsp]: {
    name: 'operand_dsp',
    pattern: 'D,S/#/PTRx',
    description: 'Destination, source/immediate/pointer register',
    valueType: eValueType.operand_dsp
  },
  [eValueType.operand_lsp]: {
    name: 'operand_lsp',
    pattern: 'D/#/PTRx,S/#',
    description: 'Write to memory: destination/immediate/pointer, source/immediate',
    valueType: eValueType.operand_lsp
  },
  [eValueType.operand_rep]: {
    name: 'operand_rep',
    pattern: '@S/#',
    description: 'Repeat instruction: count or register',
    valueType: eValueType.operand_rep
  },
  [eValueType.operand_jmp]: {
    name: 'operand_jmp',
    pattern: '#S',
    description: 'Jump absolute: immediate address',
    valueType: eValueType.operand_jmp
  },
  [eValueType.operand_call]: {
    name: 'operand_call',
    pattern: '#S',
    description: 'Call absolute: immediate address',
    valueType: eValueType.operand_call
  },
  [eValueType.operand_calld]: {
    name: 'operand_calld',
    pattern: 'D,#S',
    description: 'Call with return register: destination register, immediate address',
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
    pattern: 'D,#S',
    description: 'Load address: destination register, immediate address',
    valueType: eValueType.operand_loc
  },
  [eValueType.operand_aug]: {
    name: 'operand_aug',
    pattern: '#S',
    description: 'Augment: immediate value',
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
    pattern: 'D{,S/#}',
    description: 'Destination register, optional source with effects',
    valueType: eValueType.operand_de
  },
  [eValueType.operand_l]: {
    name: 'operand_l',
    pattern: '#S',
    description: 'Immediate value only',
    valueType: eValueType.operand_l
  },
  [eValueType.operand_cz]: {
    name: 'operand_cz',
    pattern: '_ret_,czexp,czexp',
    description: 'Condition code modification',
    valueType: eValueType.operand_cz
  },
  [eValueType.operand_pollwait]: {
    name: 'operand_pollwait',
    pattern: '',
    description: 'No operands - poll/wait instruction',
    valueType: eValueType.operand_pollwait
  },
  [eValueType.operand_getbrk]: {
    name: 'operand_getbrk',
    pattern: 'D,S/#',
    description: 'Get break point information',
    valueType: eValueType.operand_getbrk
  },
  [eValueType.operand_pinop]: {
    name: 'operand_pinop',
    pattern: 'S/#',
    description: 'Pin operation: pin number/immediate',
    valueType: eValueType.operand_pinop
  },
  [eValueType.operand_testp]: {
    name: 'operand_testp',
    pattern: 'S/#',
    description: 'Test pin: pin number/immediate',
    valueType: eValueType.operand_testp
  },
  [eValueType.operand_pushpop]: {
    name: 'operand_pushpop',
    pattern: 'D/#',
    description: 'Push/pop: register or immediate',
    valueType: eValueType.operand_pushpop
  },
  [eValueType.operand_xlat]: {
    name: 'operand_xlat',
    pattern: '',
    description: 'No operands - translation/return instruction',
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
    description: 'Assembly clock instruction',
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

  if (name.match(/^(ror|rol|shr|shl|rcr|rcl|sar|sal)$/)) return 'Shift and Rotate';
  if (name.match(/^(add|sub|mul|div|inc|dec)/) || name.match(/^(cmp|test)/) || name.includes('sum')) return 'Arithmetic';
  if (name.match(/^(and|or|xor|not|mux)/) || name.includes('bit')) return 'Logical and Bit';
  if (name.match(/^(mov|set|get|alt)/) || name.includes('nib') || name.includes('byte') || name.includes('word')) return 'Data Movement';
  if (name.match(/^(jmp|j[a-z]+|call|ret|djz|djnz|tjz|tjnz)/) || name.includes('branch')) return 'Control Flow';
  if (name.match(/^(rd|wr)/) || name.includes('pin') || name.includes('lut')) return 'Memory and I/O';
  if (name.match(/^(encod|decod|ones|bmask|zerox|signx|sqrt|abs)$/)) return 'Utility Functions';
  if (name.includes('cog') || name.includes('hub')) return 'System Control';
  if (name.includes('float') || name.includes('frac') || name.includes('sca')) return 'Floating Point';
  if (name.includes('crc') || name.includes('pix')) return 'Special Functions';

  return 'Miscellaneous';
}

// Generate example usage for instruction
function generateExamples(mnemonic: string, operandPattern: string): string[] {
  const examples: string[] = [];
  const name = mnemonic.toLowerCase();

  switch (operandPattern) {
    case 'D,S/#':
      examples.push(`${mnemonic.toUpperCase()} r0, r1`);
      examples.push(`${mnemonic.toUpperCase()} result, #42`);
      if (name.includes('cmp')) {
        examples.push(`${mnemonic.toUpperCase()} counter, limit WCZ`);
      }
      break;

    case 'D{,S/#}':
      examples.push(`${mnemonic.toUpperCase()} r0`);
      examples.push(`${mnemonic.toUpperCase()} r0, r1`);
      examples.push(`${mnemonic.toUpperCase()} result, #100`);
      break;

    case 'D/#':
      examples.push(`${mnemonic.toUpperCase()} #loop_start`);
      examples.push(`${mnemonic.toUpperCase()} target_addr`);
      break;

    default:
      examples.push(`${mnemonic.toUpperCase()} ${operandPattern}`);
      break;
  }

  return examples;
}

async function extractPASM2Database(): Promise<PASM2Database> {
  console.log('🔍 Extracting PASM2 instruction database from PNut-TS compiler...');

  // Read the parseUtils.ts file to extract instruction mappings
  const parseUtilsPath = path.join(__dirname, '../src/classes/parseUtils.ts');
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
    const comment = match[5].trim(); // e.g., "ADD D,S/#"

    // Parse mnemonic from comment
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

    // Map to effect flags
    const allowedEffects = EFFECT_FLAGS.filter(ef =>
      (effectsValue & ef.value) === ef.value && ef.value !== 0
    );
    if (effectsValue === 0b11) {
      allowedEffects.push(EFFECT_FLAGS.find(ef => ef.name === 'wcz')!);
    }

    // Get operand format
    const operandFormatEnum = eValueType[operandFormatName as keyof typeof eValueType];
    const operandFormat = OPERAND_FORMATS[operandFormatEnum];

    if (!operandFormat) {
      console.warn(`⚠️  Unknown operand format: ${operandFormatName} for ${mnemonic}`);
      continue;
    }

    // Calculate raw encoding value
    const rawValue = (operandFormatEnum << 11) + (effectsValue << 9) + opcode;

    // Create instruction object
    const instruction: AssemblyInstruction = {
      mnemonic: mnemonic.toUpperCase(),
      enum_name: enumName,
      opcode,
      effects: allowedEffects,
      operandFormat,
      description: `${mnemonic.toUpperCase()} instruction - ${comment}`,
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

  console.log(`✅ Extracted ${instructions.length} PASM2 instructions`);

  // Sort instructions by mnemonic for consistency
  instructions.sort((a, b) => a.mnemonic.localeCompare(b.mnemonic));

  // Get unique categories
  const categories = Array.from(new Set(instructions.map(i => i.category))).sort();

  // Build database
  const database: PASM2Database = {
    metadata: {
      version: '1.0.0',
      extractedFrom: 'PNut-TS Compiler parseUtils.ts',
      extractedAt: new Date().toISOString(),
      description: 'Complete PASM2 (Parallax Propeller 2 Assembly) instruction set database extracted from PNut-TS compiler',
      totalInstructions: instructions.length
    },
    instructions,
    operandFormats: Object.values(OPERAND_FORMATS).filter(Boolean),
    conditionCodes: [], // TODO: Extract from automatic_symbols
    effectFlags: EFFECT_FLAGS,
    categories
  };

  return database;
}

async function main() {
  try {
    console.log('🚀 PASM2 Instruction Database Extraction Started');
    console.log('📋 Following PASM2-SPIN2-Language-Specification-Extraction-Roadmap.md Phase 2.1');
    console.log('');

    const database = await extractPASM2Database();

    // Write to JSON file
    const outputPath = path.join(__dirname, '../DOCs/internals/PASM2-Instruction-Database.json');
    fs.writeFileSync(outputPath, JSON.stringify(database, null, 2));

    console.log('');
    console.log('📊 Extraction Summary:');
    console.log(`   📝 Total Instructions: ${database.instructions.length}`);
    console.log(`   🎯 Operand Formats: ${database.operandFormats.length}`);
    console.log(`   🏷️  Categories: ${database.categories.length}`);
    console.log(`   💾 Output: ${outputPath}`);
    console.log('');
    console.log('✅ PASM2 instruction database extraction completed successfully!');

  } catch (error) {
    console.error('❌ Extraction failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}