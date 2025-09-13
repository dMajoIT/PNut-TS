# PASM2 and SPIN2 Language Specification Extraction Roadmap

## Executive Summary

The PNut-TS compiler contains a **complete, embedded specification** of both PASM2 (P2 Assembly Language) and SPIN2 (P2 High-Level Language) that can be systematically extracted to create formal language specifications for IDE support, syntax highlighting, and language tooling development.

**Current State**: Language specifications are **distributed across 4 major files** and embedded within **2,000+ symbol definitions**, **300+ assembly instructions**, and **complex parsing logic**.

**Target State**: **Formal Language Specifications** in multiple formats (JSON, XML, EBNF) suitable for IDE integration, Language Server Protocols, and third-party tooling.

**Estimated Effort**: **80-120 hours** across 4 extraction phases
**Expected Impact**: **Complete language tooling ecosystem** enabling modern IDE support for PASM2/SPIN2 development

## 🔍 Language Specification Location Analysis

### 1. **Core Language Elements** (`src/classes/types.ts`)

#### **Element Type Enumeration** (100+ entries)
```typescript
export enum eElementType {
  type_undefined = 0,           // Undefined symbols
  type_left = 3,               // (
  type_right = 4,              // )
  type_leftb = 5,              // [
  type_rightb = 6,             // ]
  type_comma = 7,              // ,
  type_block = 35,             // CON, VAR, DAT, OBJ, PUB, PRI
  type_if = 43,                // IF
  type_case = 48,              // CASE
  type_repeat = 51,            // REPEAT
  type_asm_inst = 75,          // Assembly instructions
  type_con_int = 79,           // Integer constants
  type_loc_byte = 83,          // Local byte variables
  // ... 100+ more entries
}
```

#### **Block Type Specification**
```typescript
export enum eBlockType {
  block_con = 0,               // CON - Constants section
  block_obj = 1,               // OBJ - Object declarations
  block_var = 2,               // VAR - Variable declarations
  block_pub = 3,               // PUB - Public methods
  block_pri = 4,               // PRI - Private methods
  block_dat = 5                // DAT - Data/Assembly section
}
```

#### **Value Type Enumeration** (200+ entries)
```typescript
export enum eValueType {
  dir_orgh = 0,                // ORGH directive
  dir_alignw = 1,              // ALIGNW directive
  dir_org = 3,                 // ORG directive
  // Assembly conditionals
  if_always = 15,              // No condition
  if_c = 12,                   // IF_C condition
  if_z = 10,                   // IF_Z condition
  // Operand types
  operand_ds = 272,            // D,S/# operand format
  operand_du = 273,            // D{,S/#} operand format
  // ... 200+ more entries
}
```

### 2. **PASM2 Instruction Set** (`src/classes/parseUtils.ts`)

#### **Complete Assembly Instruction Specification** (300+ instructions)
```typescript
// Example PASM2 instruction definitions with full encoding
this.asmcodeValues.set(eAsmcode.ac_add, setAsmcodeValue(0b000100000, 0b11, eValueType.operand_ds)); // ADD D,S/#
this.asmcodeValues.set(eAsmcode.ac_sub, setAsmcodeValue(0b000110000, 0b11, eValueType.operand_ds)); // SUB D,S/#
this.asmcodeValues.set(eAsmcode.ac_mov, setAsmcodeValue(0b011000000, 0b11, eValueType.operand_ds)); // MOV D,S/#
this.asmcodeValues.set(eAsmcode.ac_jmp, setAsmcodeValue(0b110100000, 0b00, eValueType.operand_branch)); // JMP D/#
```

**Each instruction contains**:
- **Mnemonic**: Human-readable name (ADD, SUB, MOV, etc.)
- **Opcode**: Binary encoding (0b000100000, etc.)
- **Allowed Effects**: Effect flag combinations (0b11 = WC,WZ allowed)
- **Operand Format**: Parameter syntax pattern (operand_ds = D,S/# format)
- **Comments**: Assembly syntax examples (// ADD D,S/#)

#### **Assembly Condition Codes** (32 conditions)
```typescript
// Condition code definitions with binary values
this.automatic_symbols.set('_CLR', { type: eElementType.type_con_int, value: eValueType.if_ret });
this.automatic_symbols.set('_NC_AND_NZ', { type: eElementType.type_con_int, value: eValueType.if_nc_and_nz });
this.automatic_symbols.set('_GT', { type: eElementType.type_con_int, value: eValueType.if_nc_and_nz });
this.automatic_symbols.set('_Z', { type: eElementType.type_con_int, value: eValueType.if_z });
```

#### **Assembly Effect Modifiers**
```typescript
// Effect flag specifications
this.automatic_symbols.set('WC', { type: eElementType.type_asm_effect, value: 0b01 });
this.automatic_symbols.set('WZ', { type: eElementType.type_asm_effect, value: 0b10 });
this.automatic_symbols.set('WCZ', { type: eElementType.type_asm_effect, value: 0b11 });
```

### 3. **SPIN2 Language Keywords** (`src/classes/parseUtils.ts`)

#### **Control Flow Keywords**
```typescript
enum SYMBOLS {
  IF = 'IF',                   // Conditional execution
  IFNOT = 'IFNOT',            // Negative conditional
  ELSEIF = 'ELSEIF',          // Chained conditional
  ELSE = 'ELSE',              // Alternative branch
  CASE = 'CASE',              // Multi-way branch
  CASE_FAST = 'CASE_FAST',    // Optimized case statement
  OTHER = 'OTHER',            // Default case
  REPEAT = 'REPEAT',          // Loop construct
  WHILE = 'WHILE',            // Conditional loop
  UNTIL = 'UNTIL',            // Negative conditional loop
  FROM = 'FROM',              // Loop start value
  TO = 'TO',                  // Loop end value
  STEP = 'STEP',              // Loop increment
  NEXT = 'NEXT',              // Loop continuation
  QUIT = 'QUIT',              // Loop termination
  RETURN = 'RETURN',          // Method return
  ABORT = 'ABORT',            // Exception handling
}
```

#### **Data Type Keywords**
```typescript
enum SYMBOLS {
  BYTE = 'BYTE',              // 8-bit data type
  WORD = 'WORD',              // 16-bit data type
  LONG = 'LONG',              // 32-bit data type
  BYTEFIT = 'BYTEFIT',        // Byte-sized constant
  WORDFIT = 'WORDFIT',        // Word-sized constant
  FIELD = 'FIELD',            // Bit field definition
  STRUCT = 'STRUCT',          // Structure definition
}
```

#### **Built-in Functions**
```typescript
enum SYMBOLS {
  ABS = 'ABS',                // Absolute value
  SQRT = 'SQRT',              // Square root
  ENCOD = 'ENCOD',            // Bit encoder
  DECOD = 'DECOD',            // Bit decoder
  BMASK = 'BMASK',            // Bit mask generator
  ONES = 'ONES',              // Count bits
  NOT = 'NOT',                // Logical NOT
  AND = 'AND',                // Logical AND
  OR = 'OR',                  // Logical OR
  XOR = 'XOR',                // Logical XOR
  FLOAT = 'FLOAT',            // Float conversion
  ROUND = 'ROUND',            // Float rounding
  TRUNC = 'TRUNC',            // Float truncation
}
```

### 4. **Bytecode Instruction Set** (`src/classes/types.ts`)

#### **SPIN2 Virtual Machine Instructions** (200+ bytecodes)
```typescript
export enum eByteCode {
  bc_drop = 0,                // Drop stack value
  bc_return_results = 4,      // Return method results
  bc_abort_0 = 6,            // Abort with no value
  bc_call_obj_sub = 8,       // Call object method
  bc_call_sub = 10,          // Call local method
  bc_hub_bytecode = 16,      // Hub memory bytecode
  bc_add = 132,              // Addition operation
  bc_subtract = 133,         // Subtraction operation
  // ... 200+ more bytecode instructions
}
```

### 5. **Flexcode Extensions** (`src/classes/types.ts`)

#### **SPIN2 Inline Assembly Bridge** (100+ flexcodes)
```typescript
export enum eFlexcode {
  fc_coginit,                // Start COG
  fc_cogstop,                // Stop COG
  fc_cogid,                  // Get COG ID
  fc_getrnd,                 // Get random number
  fc_getct,                  // Get cycle timer
  fc_pinwrite,               // Write to pin
  fc_pinread,                // Read from pin
  // ... 100+ more flexcode operations
}
```

## 🛠️ Extraction Roadmap

### **Phase 1: Core Language Grammar Extraction (25-35 hours)**

#### 1.1: Token and Operator Specification (8-12 hours)
```typescript
// TARGET OUTPUT: Complete token specification
interface LanguageToken {
  type: TokenType;
  symbol: string;
  description: string;
  category: TokenCategory;
}

const SPIN2_TOKENS: LanguageToken[] = [
  { type: 'OPERATOR', symbol: ':=', description: 'Assignment operator', category: 'assignment' },
  { type: 'OPERATOR', symbol: '++', description: 'Increment operator', category: 'arithmetic' },
  { type: 'DELIMITER', symbol: '(', description: 'Left parenthesis', category: 'grouping' },
  { type: 'KEYWORD', symbol: 'PUB', description: 'Public method declaration', category: 'block' },
  // ... extracted from eElementType enum
];
```

#### 1.2: Block Structure Grammar (8-12 hours)
```typescript
// TARGET OUTPUT: Block-level syntax specification
interface BlockStructure {
  name: string;
  keyword: string;
  allowedSections: string[];
  syntax: string;
  description: string;
}

const SPIN2_BLOCKS: BlockStructure[] = [
  {
    name: 'Constants',
    keyword: 'CON',
    allowedSections: ['global'],
    syntax: 'CON\\n  identifier = expression\\n  ...',
    description: 'Constant definitions section'
  },
  {
    name: 'Variables',
    keyword: 'VAR',
    allowedSections: ['global'],
    syntax: 'VAR\\n  type identifier[count]\\n  ...',
    description: 'Variable declarations section'
  },
  // ... extracted from eBlockType enum
];
```

#### 1.3: Control Flow Constructs (9-11 hours)
```typescript
// TARGET OUTPUT: Control flow syntax specification
interface ControlFlow {
  construct: string;
  syntax: string[];
  semantics: string;
  nesting: boolean;
  examples: string[];
}

const SPIN2_CONTROL_FLOW: ControlFlow[] = [
  {
    construct: 'IF',
    syntax: [
      'IF condition',
      '  statements',
      'ELSEIF condition',
      '  statements',
      'ELSE',
      '  statements'
    ],
    semantics: 'Conditional execution based on boolean expression',
    nesting: true,
    examples: ['IF x > 10\\n  result := x * 2']
  },
  // ... extracted from control flow symbols
];
```

### **Phase 2: PASM2 Assembly Specification (30-40 hours)**

#### 2.1: Instruction Set Architecture (15-20 hours)
```typescript
// TARGET OUTPUT: Complete PASM2 instruction specification
interface AssemblyInstruction {
  mnemonic: string;
  opcode: number;
  format: OperandFormat;
  effects: EffectFlags[];
  description: string;
  syntax: string;
  examples: string[];
  encoding: InstructionEncoding;
}

const PASM2_INSTRUCTIONS: AssemblyInstruction[] = [
  {
    mnemonic: 'ADD',
    opcode: 0b000100000,
    format: 'D,S/#',
    effects: ['WC', 'WZ', 'WCZ'],
    description: 'Add source to destination',
    syntax: 'ADD dest, source',
    examples: ['ADD r0, #42', 'ADD result, counter'],
    encoding: {
      bits: 32,
      fields: {
        instruction: { start: 26, width: 6 },
        condition: { start: 28, width: 4 },
        effect: { start: 20, width: 2 },
        destination: { start: 9, width: 9 },
        source: { start: 0, width: 9 }
      }
    }
  },
  // ... extracted from asmcodeValues map (300+ instructions)
];
```

#### 2.2: Addressing Modes and Operand Types (8-12 hours)
```typescript
// TARGET OUTPUT: Operand format specifications
interface OperandFormat {
  name: string;
  pattern: string;
  description: string;
  examples: string[];
  encoding: OperandEncoding;
}

const PASM2_OPERAND_FORMATS: OperandFormat[] = [
  {
    name: 'operand_ds',
    pattern: 'D,S/#',
    description: 'Destination register, Source register or immediate',
    examples: ['r0, r1', 'result, #42', 'counter, data'],
    encoding: { /* bit field specifications */ }
  },
  {
    name: 'operand_du',
    pattern: 'D{,S/#}',
    description: 'Destination register, optional Source',
    examples: ['r0', 'r0, r1', 'result, #100'],
    encoding: { /* bit field specifications */ }
  },
  // ... extracted from operand type definitions
];
```

#### 2.3: Condition Codes and Effect Flags (7-8 hours)
```typescript
// TARGET OUTPUT: Complete condition and effect specifications
interface ConditionCode {
  name: string;
  symbol: string;
  value: number;
  description: string;
  aliases: string[];
}

const PASM2_CONDITIONS: ConditionCode[] = [
  {
    name: 'if_always',
    symbol: '',
    value: 15,
    description: 'Always execute (unconditional)',
    aliases: ['_SET']
  },
  {
    name: 'if_c',
    symbol: 'IF_C',
    value: 12,
    description: 'Execute if carry flag set',
    aliases: ['_LT']
  },
  // ... extracted from condition code definitions
];
```

### **Phase 3: SPIN2 High-Level Language Specification (20-30 hours)**

#### 3.1: Data Types and Variable Declarations (8-12 hours)
```typescript
// TARGET OUTPUT: Data type system specification
interface DataType {
  name: string;
  size: number;
  alignment: number;
  range: { min: number; max: number };
  syntax: string[];
  examples: string[];
}

const SPIN2_DATA_TYPES: DataType[] = [
  {
    name: 'BYTE',
    size: 1,
    alignment: 1,
    range: { min: 0, max: 255 },
    syntax: ['BYTE variable', 'BYTE array[count]'],
    examples: ['BYTE status', 'BYTE buffer[256]']
  },
  {
    name: 'LONG',
    size: 4,
    alignment: 4,
    range: { min: -2147483648, max: 2147483647 },
    syntax: ['LONG variable', 'LONG array[count]'],
    examples: ['LONG counter', 'LONG values[100]']
  },
  // ... extracted from data type symbols
];
```

#### 3.2: Built-in Functions and Operators (7-10 hours)
```typescript
// TARGET OUTPUT: Function and operator specifications
interface BuiltinFunction {
  name: string;
  parameters: Parameter[];
  returnType: string;
  description: string;
  examples: string[];
  category: FunctionCategory;
}

const SPIN2_BUILTINS: BuiltinFunction[] = [
  {
    name: 'ABS',
    parameters: [{ name: 'value', type: 'LONG' }],
    returnType: 'LONG',
    description: 'Return absolute value of parameter',
    examples: ['result := ABS(-42)  ' returns 42'],
    category: 'arithmetic'
  },
  {
    name: 'SQRT',
    parameters: [{ name: 'value', type: 'LONG' }],
    returnType: 'LONG',
    description: 'Return square root of parameter',
    examples: ['root := SQRT(100)  ' returns 10'],
    category: 'arithmetic'
  },
  // ... extracted from built-in function symbols
];
```

#### 3.3: Method Declaration and Object System (5-8 hours)
```typescript
// TARGET OUTPUT: Method and object specifications
interface MethodSyntax {
  visibility: 'PUB' | 'PRI';
  syntax: string;
  parameters: ParameterSyntax;
  returns: ReturnSyntax;
  examples: string[];
}

const SPIN2_METHOD_SYNTAX: MethodSyntax[] = [
  {
    visibility: 'PUB',
    syntax: 'PUB methodName(param1, param2) : return1, return2 | local1, local2',
    parameters: {
      pattern: '(param1, param2, ...)',
      optional: true,
      description: 'Input parameters passed by value'
    },
    returns: {
      pattern: ': return1, return2, ...',
      optional: true,
      description: 'Return values (multiple allowed)'
    },
    examples: [
      'PUB start',
      'PUB calculate(x, y) : result',
      'PUB process(data) : status, count | temp'
    ]
  },
  // ... extracted from method parsing logic
];
```

### **Phase 4: Output Format Generation (5-15 hours)**

#### 4.1: JSON Language Definition (2-5 hours)
```json
{
  "language": "SPIN2",
  "version": "2.0",
  "description": "Parallax Propeller 2 high-level language",
  "fileExtensions": [".spin2"],
  "tokens": {
    "keywords": ["PUB", "PRI", "CON", "VAR", "DAT", "OBJ", "IF", "ELSE", ...],
    "operators": [":=", "++", "--", "@@", "??", ...],
    "delimiters": ["(", ")", "[", "]", "{", "}", ...],
    "comments": {
      "line": "'",
      "block": { "start": "{", "end": "}" },
      "documentation": { "start": "{{", "end": "}}" }
    }
  },
  "grammar": {
    "blocks": [...],
    "statements": [...],
    "expressions": [...],
    "dataTypes": [...]
  },
  "assembly": {
    "instructions": [...],
    "conditions": [...],
    "effects": [...]
  }
}
```

#### 4.2: Language Server Protocol Support (2-5 hours)
```typescript
// TARGET OUTPUT: LSP-compatible language definition
interface LSPLanguageDefinition {
  languageId: string;
  documentSelector: DocumentFilter[];
  tokenTypes: string[];
  tokenModifiers: string[];
  semanticTokens: SemanticTokensLegend;
  completion: CompletionOptions;
  hover: HoverOptions;
  signatureHelp: SignatureHelpOptions;
}
```

#### 4.3: IDE Integration Formats (1-5 hours)
```xml
<!-- TARGET OUTPUT: TextMate grammar for VS Code -->
<plist version="1.0">
<dict>
  <key>name</key>
  <string>SPIN2</string>
  <key>scopeName</key>
  <string>source.spin2</string>
  <key>patterns</key>
  <array>
    <dict>
      <key>name</key>
      <string>keyword.control.spin2</string>
      <key>match</key>
      <string>\b(IF|ELSE|CASE|REPEAT|WHILE|UNTIL)\b</string>
    </dict>
    <!-- ... complete grammar rules -->
  </array>
</dict>
</plist>
```

## 📊 Extraction Complexity Analysis

### **Data Volume Assessment**

| Language Component | Count | Extraction Complexity | Format Requirements |
|-------------------|-------|---------------------|-------------------|
| **Token Types** | 100+ | Low | Simple enumeration mapping |
| **Keywords** | 80+ | Low | Symbol table extraction |
| **PASM2 Instructions** | 300+ | Medium | Opcode + operand format mapping |
| **Bytecode Instructions** | 200+ | Medium | Virtual machine specification |
| **Condition Codes** | 32 | Low | Value + alias mapping |
| **Operand Formats** | 20+ | High | Complex pattern + encoding rules |
| **Built-in Functions** | 50+ | Medium | Parameter + return type analysis |
| **Control Structures** | 15+ | High | Syntax + semantic rules |

### **Interdependency Mapping**

**Critical Dependencies**:
1. **Element Types** → **All Other Components** (foundational)
2. **Value Types** → **Assembly Instructions** (operand validation)
3. **Symbol Tables** → **Keyword Recognition** (parsing logic)
4. **Operand Formats** → **Instruction Encoding** (machine code generation)

**Extraction Order**:
1. Core token types and symbols (foundation)
2. PASM2 instruction set (self-contained)
3. SPIN2 language constructs (builds on tokens)
4. Output format generation (synthesizes all)

## 🎯 Expected Deliverables

### **Language Specification Documents**

1. **PASM2-Language-Specification.json** - Complete assembly language definition
2. **SPIN2-Language-Specification.json** - Complete high-level language definition
3. **P2-Combined-Language-Grammar.ebnf** - Formal grammar notation
4. **P2-Language-Reference.md** - Human-readable documentation

### **IDE Integration Assets**

1. **spin2.tmGrammar.json** - TextMate/VS Code syntax highlighting
2. **pasm2.tmGrammar.json** - Assembly syntax highlighting
3. **p2-language-server.ts** - LSP implementation foundation
4. **spin2-completion.json** - Code completion definitions

### **Development Tooling**

1. **P2Lexer.ts** - Standalone tokenizer
2. **P2Parser.ts** - Syntax validation library
3. **P2InstructionSet.ts** - Assembly instruction reference
4. **P2SemanticAnalyzer.ts** - Semantic validation framework

## ✅ Success Metrics

### **Completeness Requirements**
- [ ] 100% of PASM2 instructions extracted with full encoding
- [ ] 100% of SPIN2 keywords and operators identified
- [ ] All control flow constructs documented with syntax rules
- [ ] Complete operand format specifications
- [ ] Comprehensive built-in function catalog

### **Accuracy Requirements**
- [ ] Binary-identical instruction encodings vs. compiler
- [ ] Keyword recognition matches parser behavior 100%
- [ ] Operand validation rules match compiler logic
- [ ] Syntax examples compile successfully in PNut-TS

### **Usability Requirements**
- [ ] JSON specifications validate against schema
- [ ] EBNF grammar parses with standard tools
- [ ] IDE integration files work in VS Code/others
- [ ] Language server provides accurate completions

### **Maintenance Requirements**
- [ ] Extraction scripts automatically detect new language features
- [ ] Version compatibility tracking for language evolution
- [ ] Regression testing for specification accuracy
- [ ] Documentation generation from specifications

## 🚀 Implementation Strategy

### **Automated Extraction Pipeline**

```typescript
// TARGET IMPLEMENTATION: Automated language extraction
class LanguageSpecificationExtractor {
  public extractSPIN2Specification(): SPIN2LanguageSpec {
    const tokens = this.extractTokenTypes();
    const keywords = this.extractKeywords();
    const controlFlow = this.extractControlStructures();
    const dataTypes = this.extractDataTypes();
    const builtins = this.extractBuiltinFunctions();

    return new SPIN2LanguageSpec(tokens, keywords, controlFlow, dataTypes, builtins);
  }

  public extractPASM2Specification(): PASM2LanguageSpec {
    const instructions = this.extractInstructions();
    const conditions = this.extractConditionCodes();
    const effects = this.extractEffectFlags();
    const operands = this.extractOperandFormats();

    return new PASM2LanguageSpec(instructions, conditions, effects, operands);
  }

  private extractInstructions(): AssemblyInstruction[] {
    // Parse asmcodeValues map and automatic_symbols
    // Cross-reference with instruction encoding logic
    // Generate complete instruction specifications
  }
}
```

### **Validation Framework**

```typescript
// TARGET IMPLEMENTATION: Specification validation
class SpecificationValidator {
  public validateAgainstCompiler(spec: LanguageSpec): ValidationResult {
    const compilerResults = this.runCompilerTests();
    const specResults = this.runSpecificationTests(spec);

    return this.compareResults(compilerResults, specResults);
  }

  public validateCompleteness(spec: LanguageSpec): CompletenessReport {
    // Ensure all compiler features are captured in specification
    // Check for missing instructions, keywords, or constructs
    // Identify gaps in language coverage
  }
}
```

### **Multi-Format Output Generation**

```typescript
// TARGET IMPLEMENTATION: Format generators
class SpecificationFormatter {
  public generateJSON(spec: LanguageSpec): string {
    return JSON.stringify(this.formatForJSON(spec), null, 2);
  }

  public generateEBNF(spec: LanguageSpec): string {
    return this.formatForEBNF(spec);
  }

  public generateTextMate(spec: LanguageSpec): string {
    return this.formatForTextMate(spec);
  }

  public generateLSP(spec: LanguageSpec): string {
    return this.formatForLSP(spec);
  }
}
```

## 🛡️ Quality Assurance

### **Extraction Accuracy**
- **Cross-Reference Validation**: Compare extracted specifications against compiler behavior
- **Round-Trip Testing**: Parse specification examples through compiler
- **Binary Verification**: Ensure instruction encodings match exactly

### **Specification Completeness**
- **Coverage Analysis**: Verify all language features are captured
- **Gap Detection**: Identify missing or undocumented constructs
- **Version Tracking**: Monitor language evolution and specification updates

### **Tool Integration**
- **IDE Testing**: Validate syntax highlighting and completion in multiple editors
- **LSP Compliance**: Ensure Language Server Protocol compatibility
- **Third-Party Validation**: Test with external parsing tools

## 📈 Long-Term Impact

### **Ecosystem Development**
- **Modern IDE Support**: Full-featured development environments for PASM2/SPIN2
- **Language Tooling**: Linters, formatters, refactoring tools
- **Educational Resources**: Interactive tutorials and documentation
- **Community Growth**: Lower barrier to entry for P2 development

### **Standardization Benefits**
- **Cross-Platform Compatibility**: Consistent language behavior across tools
- **Specification Authority**: Authoritative language reference
- **Third-Party Innovation**: Enable community tool development
- **Long-Term Maintenance**: Systematic approach to language evolution

This roadmap provides a systematic approach to extracting the complete PASM2 and SPIN2 language specifications from the PNut-TS compiler, creating a foundation for modern language tooling and IDE support for Parallax Propeller 2 development.