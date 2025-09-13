# PASM2/SPIN2 Language Specification Package

Complete language specification and IDE integration package for Parallax Propeller 2 SPIN2 and PASM2 development, extracted directly from the PNut-TS compiler source code.

## 📁 Package Structure

```
DOCs/language-specification/
├── README.md                                    # This file
├── databases/                                   # Language databases
│   ├── PASM2-Instruction-Database.json         # Complete PASM2 instruction set (359 instructions)
│   ├── PASM2-Condition-Codes.json              # Condition codes and effect flags
│   └── SPIN2-Language-Specification.json       # Complete SPIN2 language definition
├── ide-integration/                             # IDE support files
│   ├── README.md                                # IDE integration guide
│   ├── spin2.tmGrammar.json                     # TextMate grammar for VS Code
│   ├── spin2-language-server.json               # LSP definitions
│   ├── spin2-completion.json                    # Code completion database
│   └── vscode-extension-package.json            # VS Code extension template
├── extraction-scripts/                          # Automated extraction tools
│   ├── extract-pasm2-database.ts               # PASM2 instruction extractor
│   ├── extract-condition-codes.ts              # Condition codes extractor
│   ├── extract-spin2-language.ts               # SPIN2 language extractor
│   └── generate-ide-formats.ts                 # IDE format generator
└── documentation/                               # Technical documentation
    └── PASM2-SPIN2-Language-Specification-Extraction-Roadmap.md
```

## 🎯 What's Included

### Language Databases
- **359 PASM2 assembly instructions** with opcodes, operand formats, and examples
- **16 condition codes** with all aliases and binary patterns
- **36 SPIN2 keywords** across 6 categories (blocks, control flow, data types, etc.)
- **72 operators** with precedence, associativity, float variants, and examples
- **55 built-in functions** including flexcode methods with version information
- **8 assembly directives** for code organization and alignment
- **25 registers** for hardware interface and control
- **23 debug commands** for development and debugging support
- **Complete syntax specifications** for blocks, control flow, and data types

### IDE Integration Support
- **TextMate grammar** for VS Code syntax highlighting (173 lines)
- **Language Server Protocol** definitions for IntelliSense (3237 lines)
- **Code completion database** with 650+ completion items (7200+ lines)
- **VS Code extension** configuration template
- **Multi-editor support** instructions for Sublime, Atom, Vim, Emacs

### Extraction Pipeline
- **Automated extraction scripts** that parse the PNut-TS compiler source
- **Validation tools** to ensure accuracy and completeness
- **Update workflow** for maintaining sync with compiler changes
- **100% coverage** of compiler language features

## 🚀 Quick Start

### For IDE Developers

1. **Use the databases** for language feature implementation:
```typescript
import pasm2Instructions from './databases/PASM2-Instruction-Database.json';
import spin2Language from './databases/SPIN2-Language-Specification.json';

// Access 359 PASM2 instructions with full details
console.log(pasm2Instructions.instructions.length); // 359

// Access SPIN2 language elements
console.log(spin2Language.keywords.length); // 36
console.log(spin2Language.operators.length); // 72
console.log(spin2Language.builtInFunctions.length); // 55
console.log(spin2Language.assemblyDirectives.length); // 8
console.log(spin2Language.registers.length); // 25
```

2. **Use IDE integration files** directly:
```bash
# Copy TextMate grammar for VS Code
cp ide-integration/spin2.tmGrammar.json your-extension/syntaxes/

# Use completion definitions for IntelliSense
cp ide-integration/spin2-completion.json your-language-server/
```

### For VS Code Extension

```bash
# Create new extension
yo code

# Copy files
cp ide-integration/spin2.tmGrammar.json syntaxes/
cp ide-integration/vscode-extension-package.json package.json

# Follow the detailed guide in ide-integration/README.md
```

### For Language Server Development

```typescript
import { completionItems } from './ide-integration/spin2-language-server.json';

function provideCompletions(document: TextDocument, position: Position) {
  return completionItems.filter(item =>
    item.label.startsWith(getCurrentWord(document, position))
  );
}
```

## 📊 Language Coverage Statistics

| Component | Count | Description |
|-----------|-------|-------------|
| **PASM2 Instructions** | 359 | Complete P2 assembly instruction set |
| **Operand Formats** | 38 | All instruction parameter patterns |
| **Condition Codes** | 16 | All conditional execution patterns |
| **SPIN2 Keywords** | 36 | Block structures, control flow, data types |
| **Operators** | 72 | Arithmetic, logical, bitwise, comparison, float variants |
| **Built-in Functions** | 55 | Math, bit manipulation, lookup, flexcode methods |
| **Assembly Directives** | 8 | ORG, ORGH, RES, FIT, ALIGNL, ALIGNW, FILE, etc. |
| **Registers** | 25 | PR0-PR7, PTRA, DIRA, OUTA, INA, CNT, etc. |
| **Debug Commands** | 23 | UDEC, UHEX, UBIN, ZSTR debug output families |
| **System Variables** | 3 | CLKMODE, CLKFREQ, VARBASE |
| **Special Symbols** | 12 | @, @@, ^@, ~, ~~, $, %, #, ##, etc. |
| **Data Types** | 3 | BYTE, WORD, LONG with full specifications |
| **Block Structures** | 6 | CON, VAR, DAT, OBJ, PUB, PRI |
| **Control Flow** | 3 | IF statements, CASE statements, REPEAT loops |

## 🔧 Updating the Specifications

The language specifications are automatically extracted from the PNut-TS compiler source. To update:

1. **Run the extraction pipeline**:
```bash
cd DOCs/language-specification/extraction-scripts

# Extract PASM2 instruction database
npx tsx extract-pasm2-database.ts

# Extract condition codes and effect flags
npx tsx extract-condition-codes.ts

# Extract SPIN2 language specification
npx tsx extract-spin2-language.ts

# Generate IDE integration formats
npx tsx generate-ide-formats.ts
```

2. **Validate the results**:
```bash
# All JSON files should be valid
node -e "require('./databases/PASM2-Instruction-Database.json')"
node -e "require('./databases/SPIN2-Language-Specification.json')"
```

3. **Test in your IDE** to ensure syntax highlighting and completion work correctly

## 🎨 Example Code Highlighting

With the generated syntax highlighting, your SPIN2/PASM2 code will look like this:

### SPIN2 Code
```spin2
CON                                    ' Constants section
  LED_PIN = 56                        ' Constant definition
  BAUD_RATE = 115200

VAR                                    ' Variables section
  LONG counter, status                 ' Variable declarations
  BYTE buffer[256]

OBJ                                    ' Objects section
  term : "FullDuplexSerial"           ' Object instantiation

PUB start                             ' Public method
  term.start(31, 30, 0, BAUD_RATE)    ' Method call

  REPEAT                              ' Loop construct
    IF counter > 100                  ' Conditional
      toggle_led()                    ' Method call
      counter := 0                    ' Assignment
    ELSE                              ' Alternative branch
      counter++                       ' Increment operator

PRI toggle_led                        ' Private method
  !OUTA[LED_PIN]                     ' Pin toggle
```

### PASM2 Assembly
```pasm2
DAT                                    ' Data section
              ORG     0               ' Assembly directive

start         MOV     dira, led_mask  ' Assembly instruction

loop          XOR     outa, led_mask WZ ' Instruction with effect flag
              WAITX   freq_hz         ' Wait instruction
              JMP     #loop           ' Jump instruction

led_mask      LONG    1 << LED_PIN    ' Data definition
freq_hz       LONG    80_000_000      ' Frequency constant
```

## 📚 Related Documentation

- **[Extraction Roadmap](documentation/PASM2-SPIN2-Language-Specification-Extraction-Roadmap.md)** - Complete technical roadmap and implementation details
- **[IDE Integration Guide](ide-integration/README.md)** - Detailed instructions for integrating with various editors
- **[PNut-TS Compiler](../../../README.md)** - Main compiler documentation

## 🤝 Contributing

To improve or extend the language specifications:

1. **Report Issues**: Missing features, incorrect syntax highlighting, completion gaps
2. **Submit Enhancements**: Better syntax patterns, additional code snippets
3. **Test Integration**: Verify compatibility with different IDEs and editors
4. **Improve Extraction**: Enhance the automated extraction scripts

## 📄 License

Generated from PNut-TS compiler source code. This language specification package inherits the same license as the main PNut-TS project.

---

**This package provides everything needed to build modern, feature-rich development environments for Parallax Propeller 2 embedded systems programming with SPIN2 and PASM2.**