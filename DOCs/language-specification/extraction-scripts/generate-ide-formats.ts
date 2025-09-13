#!/usr/bin/env npx tsx

/**
 * IDE Integration Format Generator
 *
 * Generates IDE integration formats from extracted PASM2/SPIN2 specifications
 * as per PASM2-SPIN2-Language-Specification-Extraction-Roadmap.md Phase 4
 *
 * Creates TextMate grammar, LSP definitions, and completion specs
 */

import * as fs from 'fs';
import * as path from 'path';

interface TextMateGrammar {
  name: string;
  scopeName: string;
  fileTypes: string[];
  patterns: Array<{
    name?: string;
    match?: string;
    begin?: string;
    end?: string;
    patterns?: any[];
    captures?: Record<string, { name: string }>;
    include?: string;
  }>;
  repository: Record<string, any>;
}

interface LSPCompletionItem {
  label: string;
  kind: number;
  detail: string;
  documentation: string;
  insertText: string;
  insertTextFormat?: number;
}

interface LSPLanguageDefinition {
  languageId: string;
  extensions: string[];
  aliases: string[];
  configuration: {
    comments: {
      lineComment: string;
      blockComment: [string, string];
    };
    brackets: Array<[string, string]>;
    autoClosingPairs: Array<{ open: string; close: string }>;
    surroundingPairs: Array<{ open: string; close: string }>;
  };
  completionItems: LSPCompletionItem[];
}

// LSP Completion Item Kinds
const CompletionItemKind = {
  Text: 1,
  Method: 2,
  Function: 3,
  Constructor: 4,
  Field: 5,
  Variable: 6,
  Class: 7,
  Interface: 8,
  Module: 9,
  Property: 10,
  Unit: 11,
  Value: 12,
  Enum: 13,
  Keyword: 14,
  Snippet: 15,
  Color: 16,
  File: 17,
  Reference: 18,
  Folder: 19,
  EnumMember: 20,
  Constant: 21,
  Struct: 22,
  Event: 23,
  Operator: 24,
  TypeParameter: 25
};

async function loadLanguageData() {
  console.log('📂 Loading extracted language specifications...');

  const spin2Path = path.join(__dirname, '../databases/SPIN2-Language-Specification.json');
  const pasm2Path = path.join(__dirname, '../databases/PASM2-Instruction-Database.json');

  if (!fs.existsSync(spin2Path)) {
    throw new Error('SPIN2 language specification not found. Run extract-spin2-language.ts first.');
  }

  if (!fs.existsSync(pasm2Path)) {
    throw new Error('PASM2 instruction database not found. Run extract-pasm2-database.ts first.');
  }

  const spin2Data = JSON.parse(fs.readFileSync(spin2Path, 'utf-8'));
  const pasm2Data = JSON.parse(fs.readFileSync(pasm2Path, 'utf-8'));

  return { spin2Data, pasm2Data };
}

function generateTextMateGrammar(spin2Data: any, pasm2Data: any): TextMateGrammar {
  console.log('🎨 Generating TextMate grammar for VS Code...');

  // Extract keywords by category
  const blockKeywords = spin2Data.keywords
    .filter((k: any) => k.category === 'Block Structure')
    .map((k: any) => k.keyword);

  const controlFlowKeywords = spin2Data.keywords
    .filter((k: any) => k.category === 'Control Flow')
    .map((k: any) => k.keyword);

  const dataTypeKeywords = spin2Data.keywords
    .filter((k: any) => k.category === 'Data Types')
    .map((k: any) => k.keyword);

  const builtinKeywords = spin2Data.keywords
    .filter((k: any) => k.category === 'Built-in Functions')
    .map((k: any) => k.keyword);

  // Extract operators
  const operators = spin2Data.operators.map((op: any) => {
    // Escape special regex characters
    return op.symbol.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
  });

  // Extract PASM2 instructions
  const asmInstructions = pasm2Data.instructions.map((inst: any) => inst.mnemonic);

  // Extract condition codes
  const conditionCodes = pasm2Data.conditionCodes?.map((cc: any) =>
    cc.aliases ? cc.aliases : [cc.symbol]
  ).flat() || [];

  const grammar: TextMateGrammar = {
    name: 'SPIN2',
    scopeName: 'source.spin2',
    fileTypes: ['spin2'],
    patterns: [
      { include: '#comments' },
      { include: '#strings' },
      { include: '#numbers' },
      { include: '#blocks' },
      { include: '#keywords' },
      { include: '#assembly' },
      { include: '#operators' },
      { include: '#identifiers' }
    ],
    repository: {
      comments: {
        patterns: [
          {
            name: 'comment.line.apostrophe.spin2',
            match: "(\\\\'.*$)"
          },
          {
            name: 'comment.block.documentation.spin2',
            begin: '\\\\{\\\\{',
            end: '\\\\}\\\\}',
            patterns: [
              {
                name: 'markup.bold.spin2',
                match: '\\\\*\\\\*[^*]+\\\\*\\\\*'
              }
            ]
          },
          {
            name: 'comment.block.spin2',
            begin: '\\\\{',
            end: '\\\\}'
          }
        ]
      },

      strings: {
        patterns: [
          {
            name: 'string.quoted.double.spin2',
            begin: '\\\\"',
            end: '\\\\"',
            patterns: [
              {
                name: 'constant.character.escape.spin2',
                match: '\\\\\\\\.'
              }
            ]
          }
        ]
      },

      numbers: {
        patterns: [
          {
            name: 'constant.numeric.binary.spin2',
            match: '\\\\%[01_]+'
          },
          {
            name: 'constant.numeric.hex.spin2',
            match: '\\\\$[0-9A-Fa-f_]+'
          },
          {
            name: 'constant.numeric.decimal.spin2',
            match: '\\\\b[0-9][0-9_]*\\\\b'
          },
          {
            name: 'constant.numeric.float.spin2',
            match: '\\\\b[0-9][0-9_]*\\\\.[0-9_]+([eE][+-]?[0-9_]+)?\\\\b'
          }
        ]
      },

      blocks: {
        patterns: [
          {
            name: 'keyword.control.block.spin2',
            match: `\\\\b(${blockKeywords.join('|')})\\\\b`
          }
        ]
      },

      keywords: {
        patterns: [
          {
            name: 'keyword.control.conditional.spin2',
            match: `\\\\b(${controlFlowKeywords.join('|')})\\\\b`
          },
          {
            name: 'storage.type.spin2',
            match: `\\\\b(${dataTypeKeywords.join('|')})\\\\b`
          },
          {
            name: 'support.function.builtin.spin2',
            match: `\\\\b(${builtinKeywords.join('|')})\\\\b`
          }
        ]
      },

      assembly: {
        patterns: [
          {
            name: 'keyword.mnemonic.assembly.spin2',
            match: `\\\\b(${asmInstructions.join('|')})\\\\b`
          },
          {
            name: 'keyword.control.conditional.assembly.spin2',
            match: `\\\\b(${conditionCodes.slice(0, 50).join('|')})\\\\b` // Limit to avoid regex complexity
          },
          {
            name: 'keyword.other.effect.assembly.spin2',
            match: '\\\\b(WC|WZ|WCZ)\\\\b'
          }
        ]
      },

      operators: {
        patterns: [
          {
            name: 'keyword.operator.assignment.spin2',
            match: ':=|:=:'
          },
          {
            name: 'keyword.operator.arithmetic.spin2',
            match: '\\\\+\\\\+|--|\\\\+|\\\\-|\\\\*|\\\\/'
          },
          {
            name: 'keyword.operator.comparison.spin2',
            match: '==|<>|<=|>=|<|>'
          },
          {
            name: 'keyword.operator.logical.spin2',
            match: '\\\\b(NOT|AND|OR)\\\\b'
          },
          {
            name: 'keyword.operator.bitwise.spin2',
            match: '&|\\\\||\\\\^|!|~'
          },
          {
            name: 'keyword.operator.shift.spin2',
            match: '<<|>>|\\\\b(SAR|ROR|ROL)\\\\b'
          }
        ]
      },

      identifiers: {
        patterns: [
          {
            name: 'entity.name.function.spin2',
            match: '\\\\b[a-zA-Z_][a-zA-Z0-9_]*(?=\\\\s*\\\\()'
          },
          {
            name: 'variable.other.spin2',
            match: '\\\\b[a-zA-Z_][a-zA-Z0-9_]*\\\\b'
          }
        ]
      }
    }
  };

  return grammar;
}

function generateLSPDefinition(spin2Data: any, pasm2Data: any): LSPLanguageDefinition {
  console.log('🔧 Generating Language Server Protocol definitions...');

  const completionItems: LSPCompletionItem[] = [];

  // Add SPIN2 keywords
  spin2Data.keywords.forEach((keyword: any) => {
    completionItems.push({
      label: keyword.keyword,
      kind: CompletionItemKind.Keyword,
      detail: `${keyword.category} keyword`,
      documentation: keyword.description,
      insertText: keyword.keyword
    });
  });

  // Add SPIN2 operators
  spin2Data.operators.forEach((operator: any) => {
    completionItems.push({
      label: operator.symbol,
      kind: CompletionItemKind.Operator,
      detail: `${operator.type} operator (precedence ${operator.precedence})`,
      documentation: operator.description,
      insertText: operator.symbol
    });
  });

  // Add built-in functions with snippets
  spin2Data.builtinFunctions.forEach((func: any) => {
    const params = func.parameters.map((p: any) => p.name).join(', ');
    const snippet = `${func.name}(${params})`;

    completionItems.push({
      label: func.name,
      kind: CompletionItemKind.Function,
      detail: `${func.category} function`,
      documentation: `${func.description}\\n\\nReturns: ${func.returnType}`,
      insertText: snippet,
      insertTextFormat: 2 // Snippet format
    });
  });

  // Add PASM2 instructions
  pasm2Data.instructions.forEach((instruction: any) => {
    const pattern = instruction.operandFormat?.pattern || '';
    const snippet = pattern ? `${instruction.mnemonic} ${pattern}` : instruction.mnemonic;

    completionItems.push({
      label: instruction.mnemonic,
      kind: CompletionItemKind.Function,
      detail: `${instruction.category} instruction`,
      documentation: instruction.description,
      insertText: snippet
    });
  });

  // Add condition codes
  if (pasm2Data.conditionCodes) {
    pasm2Data.conditionCodes.forEach((cc: any) => {
      completionItems.push({
        label: cc.symbol,
        kind: CompletionItemKind.Constant,
        detail: `Condition code (${cc.category})`,
        documentation: cc.description,
        insertText: cc.symbol
      });
    });
  }

  const lspDefinition: LSPLanguageDefinition = {
    languageId: 'spin2',
    extensions: ['.spin2'],
    aliases: ['SPIN2', 'Parallax Propeller 2'],
    configuration: {
      comments: {
        lineComment: "'",
        blockComment: ['{', '}']
      },
      brackets: [
        ['(', ')'],
        ['[', ']'],
        ['{', '}']
      ],
      autoClosingPairs: [
        { open: '(', close: ')' },
        { open: '[', close: ']' },
        { open: '{', close: '}' },
        { open: '"', close: '"' }
      ],
      surroundingPairs: [
        { open: '(', close: ')' },
        { open: '[', close: ']' },
        { open: '{', close: '}' },
        { open: '"', close: '"' }
      ]
    },
    completionItems
  };

  return lspDefinition;
}

function generateCompletionDefinitions(spin2Data: any, pasm2Data: any) {
  console.log('📋 Generating code completion definitions...');

  const completions = {
    metadata: {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      description: 'SPIN2/PASM2 code completion definitions for IDE integration'
    },
    spin2: {
      keywords: spin2Data.keywords.map((k: any) => ({
        label: k.keyword,
        detail: k.description,
        category: k.category,
        insertText: k.keyword,
        examples: k.examples || []
      })),
      operators: spin2Data.operators.map((op: any) => ({
        label: op.symbol,
        detail: op.description,
        precedence: op.precedence,
        type: op.type,
        examples: op.examples || []
      })),
      functions: spin2Data.builtinFunctions.map((f: any) => ({
        label: f.name,
        detail: f.description,
        parameters: f.parameters,
        returnType: f.returnType,
        category: f.category,
        examples: f.examples || []
      }))
    },
    pasm2: {
      instructions: pasm2Data.instructions.map((inst: any) => ({
        label: inst.mnemonic,
        detail: inst.description,
        syntax: inst.syntax,
        operandFormat: inst.operandFormat?.pattern || '',
        category: inst.category,
        examples: inst.examples || []
      })),
      conditionCodes: pasm2Data.conditionCodes?.map((cc: any) => ({
        label: cc.symbol,
        detail: cc.description,
        value: cc.value,
        aliases: cc.aliases || [],
        category: cc.category
      })) || [],
      effectFlags: pasm2Data.effectFlags?.map((ef: any) => ({
        label: ef.symbol,
        detail: ef.description,
        value: ef.value
      })) || []
    }
  };

  return completions;
}

async function main() {
  try {
    console.log('🚀 IDE Integration Format Generation Started');
    console.log('📋 Following PASM2-SPIN2-Language-Specification-Extraction-Roadmap.md Phase 4');
    console.log('');

    // Load language data
    const { spin2Data, pasm2Data } = await loadLanguageData();

    // Create output directory
    const outputDir = path.join(__dirname, '../DOCs/ide-integration');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate TextMate grammar
    const textMateGrammar = generateTextMateGrammar(spin2Data, pasm2Data);
    const grammarPath = path.join(outputDir, 'spin2.tmGrammar.json');
    fs.writeFileSync(grammarPath, JSON.stringify(textMateGrammar, null, 2));

    // Generate LSP definition
    const lspDefinition = generateLSPDefinition(spin2Data, pasm2Data);
    const lspPath = path.join(outputDir, 'spin2-language-server.json');
    fs.writeFileSync(lspPath, JSON.stringify(lspDefinition, null, 2));

    // Generate completion definitions
    const completionDefs = generateCompletionDefinitions(spin2Data, pasm2Data);
    const completionPath = path.join(outputDir, 'spin2-completion.json');
    fs.writeFileSync(completionPath, JSON.stringify(completionDefs, null, 2));

    // Generate VS Code extension configuration
    const vscodeConfig = {
      name: 'SPIN2 Language Support',
      displayName: 'Parallax Propeller 2 SPIN2/PASM2',
      description: 'Language support for Parallax Propeller 2 SPIN2 and PASM2',
      version: '1.0.0',
      engines: {
        vscode: '^1.60.0'
      },
      categories: ['Programming Languages'],
      contributes: {
        languages: [
          {
            id: 'spin2',
            aliases: ['SPIN2', 'Parallax Propeller 2'],
            extensions: ['.spin2'],
            configuration: './language-configuration.json'
          }
        ],
        grammars: [
          {
            language: 'spin2',
            scopeName: 'source.spin2',
            path: './syntaxes/spin2.tmGrammar.json'
          }
        ]
      }
    };

    const vscodeConfigPath = path.join(outputDir, 'vscode-extension-package.json');
    fs.writeFileSync(vscodeConfigPath, JSON.stringify(vscodeConfig, null, 2));

    console.log('');
    console.log('📊 Generation Summary:');
    console.log(`   🎨 TextMate Grammar: ${grammarPath}`);
    console.log(`   🔧 LSP Definition: ${lspPath}`);
    console.log(`   📋 Completion Definitions: ${completionPath}`);
    console.log(`   📦 VS Code Extension Config: ${vscodeConfigPath}`);
    console.log(`   📂 Output Directory: ${outputDir}`);
    console.log('');
    console.log('✅ IDE integration format generation completed successfully!');

  } catch (error) {
    console.error('❌ Generation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}