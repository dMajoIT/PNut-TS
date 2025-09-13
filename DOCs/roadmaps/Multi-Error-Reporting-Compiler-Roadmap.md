# Multi-Error Reporting Compiler Roadmap

## Executive Summary

The PNut-TS compiler currently employs a **fail-fast error handling strategy** inherited from its x86 assembly origins, where compilation stops immediately upon encountering the first error. This approach, while suitable for embedded development workflows, significantly hampers developer productivity compared to modern compilers that collect and report multiple errors per compilation pass.

**Current State**: **291+ immediate `throw new Error()` statements** in `spinResolver.ts` alone, with zero error collection mechanisms.

**Target State**: A **resilient multi-error compiler** that continues compilation after recoverable errors, providing comprehensive error reports that enable developers to fix multiple issues in a single edit-compile cycle.

**Estimated Effort**: **120-180 hours** across 4 implementation phases
**Expected Impact**: **60-80% reduction** in edit-compile-debug cycles for complex projects

## 🚨 Current Fail-Fast Architecture Analysis

### 1. **Immediate Termination Pattern**
**Found**: 291+ error locations in `spinResolver.ts` using direct throws:

```typescript
// CURRENT PATTERN - Immediate failure
throw new Error('Expected a unique variable name, STRUCT name, BYTE, WORD, LONG, "^", ALIGNW, or ALIGNL (m240)');
throw new Error('Pointers cannot be arrays (m480)');
throw new Error('Too much variable space is declared (m600)');
throw new Error('_CLKFREQ, _XTLFREQ, _XINFREQ, _ERRFREQ, _RCFAST, _RCSLOW can only be defined as integer constants');
```

**Problems**:
1. **No error collection mechanism** - Each error immediately terminates compilation
2. **No error recovery** - Parser cannot skip problematic statements and continue
3. **No error context preservation** - Stack unwinding loses compilation state
4. **No error categorization** - All errors treated as fatal regardless of severity

### 2. **Compilation Phase Vulnerability**
**Analysis**: Errors can occur in any phase:

```typescript
// PHASE 1: Symbol Discovery - Should continue after errors
compile_con_blocks_1st()    // Constants resolution errors
compile_var_blocks()        // Variable declaration errors

// PHASE 2: Code Generation - Some errors recoverable
compile_dat_blocks()        // DAT section errors
compile_pub_pri_blocks()    // Method compilation errors
```

**Current Impact**:
- Syntax error in one method → entire compilation fails
- Missing symbol → no other symbols checked
- Type error in constants → variable checking never occurs

### 3. **Developer Experience Problems**

**Workflow Analysis**:
```
CURRENT (Fail-Fast):
Edit → Compile → First Error → Fix → Compile → Next Error → Fix → ...
5 errors = 5 compile cycles

DESIRED (Multi-Error):
Edit → Compile → All Errors Reported → Fix All → Compile → Success
5 errors = 1 compile cycle
```

**Productivity Impact**: For complex files with multiple errors, current approach requires **5-10x more compilation cycles**.

## 🎯 Multi-Error Compiler Strategy

### 1. **Error Categorization Framework**

#### **Fatal Errors** (Must Stop Compilation)
- File system errors (missing source files)
- Memory allocation failures
- Circular dependency loops
- Preprocessor infinite recursion

#### **Recoverable Syntax Errors** (Continue with Error Markers)
- Invalid variable declarations
- Type mismatches in expressions
- Undefined symbol references
- Method signature errors

#### **Semantic Errors** (Continue with Best-Effort Resolution)
- Missing object methods
- Incorrect parameter counts
- Optimization constraint violations
- Memory layout warnings

#### **Warning-Level Issues** (Report but Continue Normally)
- Unused variables/methods
- Deprecated language features
- Performance optimization opportunities
- Style guideline violations

### 2. **Error Recovery Strategies**

#### **Synchronization Points**
Compilation can safely continue from these well-defined boundaries:

```typescript
// SYNC POINTS - Safe recovery locations
- End of block statements (CON, VAR, DAT, PUB, PRI)
- End of method declarations
- Statement separators (newlines, semicolons)
- Object boundaries in hierarchical compilation
```

#### **Error Markers and Placeholder Nodes**
```typescript
// STRATEGY - Replace problematic nodes with error markers
interface ErrorMarker {
  type: 'syntax-error' | 'semantic-error' | 'type-error';
  originalText: string;
  errorMessage: string;
  location: SourceLocation;
  suggestedFix?: string;
}

// Continue compilation with placeholder values
const PLACEHOLDER_SYMBOL: Symbol = {
  name: '<error-marker>',
  type: eElementType.type_undefined,
  value: 0
};
```

#### **Best-Effort Code Generation**
```typescript
// STRATEGY - Generate partial binaries when possible
interface PartialCompilationResult {
  binary: Uint8Array;           // Valid portions
  errorRegions: ErrorRegion[];  // Sections with problems
  missingSymbols: string[];     // For later resolution
  warnings: Warning[];          // Non-fatal issues
}
```

## 🛠️ Implementation Roadmap

### **Phase 1: Error Collection Infrastructure (30-40 hours)**

#### 1.1: Error Collector System (15-20 hours)
```typescript
// IMPLEMENTATION TARGET
interface CompilationError {
  readonly type: 'fatal' | 'error' | 'warning';
  readonly code: string;        // e.g., "m240", "m480"
  readonly message: string;
  readonly location: SourceLocation;
  readonly severity: ErrorSeverity;
  readonly category: ErrorCategory;
  readonly suggestedFix?: string;
}

class ErrorCollector {
  private errors: CompilationError[] = [];
  private maxErrors: number = 100;  // Prevent runaway error collection

  public addError(error: CompilationError): void {
    this.errors.push(error);

    // Continue vs. stop decision
    if (error.type === 'fatal' || this.errors.length >= this.maxErrors) {
      throw new FatalCompilationError(this.errors);
    }
  }

  public addSyntaxError(message: string, location: SourceLocation): void {
    this.addError({
      type: 'error',
      code: this.extractErrorCode(message),
      message,
      location,
      severity: ErrorSeverity.Error,
      category: ErrorCategory.Syntax
    });
  }

  public getErrors(): readonly CompilationError[] {
    return this.errors;
  }

  public hasErrors(): boolean {
    return this.errors.some(e => e.type === 'error' || e.type === 'fatal');
  }
}
```

#### 1.2: Parser Integration (10-15 hours)
```typescript
// MODIFY EXISTING PATTERNS
// BEFORE:
throw new Error('Expected a unique variable name (m240)');

// AFTER:
this.errorCollector.addSyntaxError(
  'Expected a unique variable name (m240)',
  this.getCurrentLocation()
);
return this.createErrorPlaceholder(); // Continue parsing
```

#### 1.3: Source Location Tracking (5-10 hours)
```typescript
// IMPLEMENTATION TARGET
interface SourceLocation {
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly offset: number;
  readonly length: number;
}

class SourceLocationTracker {
  private currentFile: string = '';
  private currentLine: number = 1;
  private currentColumn: number = 1;
  private currentOffset: number = 0;

  public updatePosition(text: string): void {
    for (const char of text) {
      if (char === '\n') {
        this.currentLine++;
        this.currentColumn = 1;
      } else {
        this.currentColumn++;
      }
      this.currentOffset++;
    }
  }

  public getCurrentLocation(): SourceLocation {
    return {
      file: this.currentFile,
      line: this.currentLine,
      column: this.currentColumn,
      offset: this.currentOffset,
      length: 1
    };
  }
}
```

### **Phase 2: Parser Recovery Mechanisms (40-60 hours)**

#### 2.1: Synchronization Points (20-30 hours)
```typescript
// IMPLEMENTATION TARGET
class RecoveringParser {
  private syncPoints = new Set([
    eElementType.type_block,      // Block boundaries
    eElementType.type_end,        // Statement ends
    eElementType.type_eof,        // File boundaries
    eElementType.type_pub,        // Method starts
    eElementType.type_pri
  ]);

  private recoverFromError(): boolean {
    // Skip tokens until we reach a synchronization point
    while (!this.isAtEnd() && !this.syncPoints.has(this.currentToken.type)) {
      this.advance();
    }

    return !this.isAtEnd(); // Can continue if not at end
  }

  private parseVariableDeclaration(): VariableDeclaration | ErrorMarker {
    try {
      return this.parseVariableDeclarationUnsafe();
    } catch (error) {
      this.errorCollector.addSyntaxError(error.message, this.getCurrentLocation());

      if (this.recoverFromError()) {
        return new ErrorMarker('variable-declaration-error', error.message);
      } else {
        throw new FatalCompilationError('Cannot recover from error');
      }
    }
  }
}
```

#### 2.2: Error Placeholder Nodes (10-15 hours)
```typescript
// IMPLEMENTATION TARGET
abstract class ASTNode {
  abstract accept<T>(visitor: ASTVisitor<T>): T;
}

class ErrorNode extends ASTNode {
  constructor(
    public readonly errorType: string,
    public readonly errorMessage: string,
    public readonly originalText: string,
    public readonly location: SourceLocation
  ) {
    super();
  }

  accept<T>(visitor: ASTVisitor<T>): T {
    return visitor.visitErrorNode(this);
  }
}

// Code generation handles error nodes gracefully
class CodeGenerator implements ASTVisitor<void> {
  visitErrorNode(node: ErrorNode): void {
    // Skip code generation for error nodes
    // But continue processing siblings
    this.logSkippedNode(node);
  }
}
```

#### 2.3: Symbol Table Recovery (10-15 hours)
```typescript
// IMPLEMENTATION TARGET
class RecoveringSymbolTable {
  private symbols = new Map<string, Symbol>();
  private errorSymbols = new Set<string>();

  public addSymbol(name: string, symbol: Symbol): void {
    if (this.symbols.has(name)) {
      this.errorCollector.addError(
        new DuplicateSymbolError(name, symbol.location)
      );
      // Keep first definition, mark as error
      this.errorSymbols.add(name);
    } else {
      this.symbols.set(name, symbol);
    }
  }

  public resolveSymbol(name: string): Symbol {
    if (this.symbols.has(name)) {
      return this.symbols.get(name)!;
    } else {
      this.errorCollector.addError(
        new UndefinedSymbolError(name, this.getCurrentLocation())
      );

      // Return placeholder symbol to continue compilation
      return this.createPlaceholderSymbol(name);
    }
  }

  private createPlaceholderSymbol(name: string): Symbol {
    return {
      name,
      type: eElementType.type_undefined,
      value: 0,
      isErrorPlaceholder: true
    };
  }
}
```

### **Phase 3: Compilation Phase Resilience (30-50 hours)**

#### 3.1: Phase-Isolated Error Handling (15-25 hours)
```typescript
// IMPLEMENTATION TARGET
abstract class CompilationPhase {
  protected errorCollector: ErrorCollector;

  public abstract execute(input: any): PhaseResult;

  protected executeWithErrorHandling<T>(
    operation: () => T,
    fallback: () => T,
    errorMessage: string
  ): T {
    try {
      return operation();
    } catch (error) {
      this.errorCollector.addError({
        type: 'error',
        code: 'phase-error',
        message: `${errorMessage}: ${error.message}`,
        location: this.getCurrentLocation(),
        severity: ErrorSeverity.Error,
        category: ErrorCategory.Compilation
      });

      return fallback();
    }
  }
}

class ConstantResolutionPhase extends CompilationPhase {
  public execute(symbols: SymbolTable): ResolvedConstants {
    const resolved = new Map<string, number>();

    for (const [name, symbol] of symbols.entries()) {
      const value = this.executeWithErrorHandling(
        () => this.resolveConstant(symbol),
        () => 0, // Default value for failed resolution
        `Failed to resolve constant '${name}'`
      );

      resolved.set(name, value);
    }

    return new ResolvedConstants(resolved);
  }
}
```

#### 3.2: Binary Generation Resilience (10-20 hours)
```typescript
// IMPLEMENTATION TARGET
class ResilientBinaryGenerator {
  public generateBinary(ast: ASTNode[]): PartialBinaryResult {
    const validSections: BinarySection[] = [];
    const errorRegions: ErrorRegion[] = [];

    for (const node of ast) {
      try {
        const section = this.generateSection(node);
        validSections.push(section);
      } catch (error) {
        if (node instanceof ErrorNode) {
          // Expected error, skip gracefully
          errorRegions.push(new ErrorRegion(node.location, node.errorMessage));
        } else {
          // Unexpected error, collect and continue
          this.errorCollector.addError(this.createGenerationError(error, node));
          errorRegions.push(new ErrorRegion(node.location, error.message));
        }
      }
    }

    return new PartialBinaryResult(validSections, errorRegions);
  }
}
```

#### 3.3: Object Tree Error Isolation (5-10 hours)
```typescript
// IMPLEMENTATION TARGET
class ResilientObjectCompiler {
  public compileObjectTree(objects: ObjectInfo[]): CompilationResult {
    const successfulObjects: CompiledObject[] = [];
    const failedObjects: FailedObject[] = [];

    for (const obj of objects) {
      try {
        const compiled = this.compileObject(obj);
        successfulObjects.push(compiled);
      } catch (error) {
        // Isolate object compilation errors
        failedObjects.push({
          objectName: obj.name,
          error: error.message,
          location: obj.location
        });

        // Continue with other objects
        this.errorCollector.addError(this.createObjectError(error, obj));
      }
    }

    return new CompilationResult(successfulObjects, failedObjects);
  }
}
```

### **Phase 4: Enhanced Error Reporting (20-30 hours)**

#### 4.1: Rich Error Messages (10-15 hours)
```typescript
// IMPLEMENTATION TARGET
class EnhancedErrorReporter {
  public generateReport(errors: CompilationError[]): ErrorReport {
    const grouped = this.groupErrorsByFile(errors);
    const formatted = this.formatErrors(grouped);
    const suggestions = this.generateSuggestions(errors);

    return new ErrorReport(formatted, suggestions, this.generateSummary(errors));
  }

  private formatError(error: CompilationError): FormattedError {
    return {
      severity: error.type,
      code: error.code,
      message: error.message,
      location: this.formatLocation(error.location),
      sourceContext: this.extractSourceContext(error.location),
      suggestion: this.generateSuggestion(error),
      relatedErrors: this.findRelatedErrors(error)
    };
  }

  private extractSourceContext(location: SourceLocation): SourceContext {
    const lines = this.getSourceLines(location.file);
    const contextStart = Math.max(0, location.line - 3);
    const contextEnd = Math.min(lines.length, location.line + 3);

    return {
      beforeLines: lines.slice(contextStart, location.line - 1),
      errorLine: lines[location.line - 1],
      afterLines: lines.slice(location.line, contextEnd),
      highlightColumn: location.column,
      highlightLength: location.length
    };
  }
}
```

#### 4.2: IDE-Friendly Output (5-10 hours)
```typescript
// IMPLEMENTATION TARGET
interface LSPDiagnostic {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  severity: 1 | 2 | 3 | 4; // Error, Warning, Information, Hint
  code: string;
  source: string;
  message: string;
  relatedInformation?: DiagnosticRelatedInformation[];
}

class LSPErrorReporter {
  public generateLSPDiagnostics(errors: CompilationError[]): LSPDiagnostic[] {
    return errors.map(error => ({
      range: {
        start: { line: error.location.line - 1, character: error.location.column - 1 },
        end: { line: error.location.line - 1, character: error.location.column - 1 + error.location.length }
      },
      severity: this.mapSeverity(error.type),
      code: error.code,
      source: 'pnut-ts',
      message: error.message,
      relatedInformation: this.generateRelatedInfo(error)
    }));
  }
}
```

#### 4.3: Error Recovery Suggestions (5-10 hours)
```typescript
// IMPLEMENTATION TARGET
class ErrorSuggestionEngine {
  public generateSuggestion(error: CompilationError): string | undefined {
    switch (error.code) {
      case 'm240':
        return 'Expected variable declaration. Try: VAR long myVariable';
      case 'm480':
        return 'Arrays cannot be pointers. Remove pointer syntax or array brackets';
      case 'undefined-symbol':
        return this.suggestSimilarSymbols(error.message);
      default:
        return this.generateGenericSuggestion(error);
    }
  }

  private suggestSimilarSymbols(errorMessage: string): string {
    const symbolName = this.extractSymbolName(errorMessage);
    const similar = this.findSimilarSymbols(symbolName);

    if (similar.length > 0) {
      return `Did you mean: ${similar.join(', ')}?`;
    }

    return 'Check symbol spelling and scope';
  }
}
```

## 📊 Implementation Effort and Timeline

### **Effort Breakdown**

| Phase | Component | Hours | Priority | Dependencies |
|-------|-----------|-------|----------|--------------|
| 1     | Error Collection Infrastructure | 30-40 | Critical | None |
| 1.1   | Error Collector System | 15-20 | Critical | None |
| 1.2   | Parser Integration | 10-15 | Critical | Error Collector |
| 1.3   | Source Location Tracking | 5-10 | High | None |
| 2     | Parser Recovery Mechanisms | 40-60 | Critical | Phase 1 |
| 2.1   | Synchronization Points | 20-30 | Critical | Error Collector |
| 2.2   | Error Placeholder Nodes | 10-15 | High | Sync Points |
| 2.3   | Symbol Table Recovery | 10-15 | High | Error Collector |
| 3     | Compilation Phase Resilience | 30-50 | High | Phase 2 |
| 3.1   | Phase-Isolated Error Handling | 15-25 | High | Parser Recovery |
| 3.2   | Binary Generation Resilience | 10-20 | Medium | Phase Isolation |
| 3.3   | Object Tree Error Isolation | 5-10 | Medium | Phase Isolation |
| 4     | Enhanced Error Reporting | 20-30 | Medium | All Phases |
| 4.1   | Rich Error Messages | 10-15 | Medium | Error Collection |
| 4.2   | IDE-Friendly Output | 5-10 | Low | Rich Messages |
| 4.3   | Error Recovery Suggestions | 5-10 | Low | Error Analysis |

**Total Effort**: 120-180 hours

### **Implementation Timeline**

#### **Phase 1: Foundation (4-6 weeks)**
- Week 1-2: Error collection infrastructure
- Week 3-4: Parser integration
- Week 5-6: Source location tracking and testing

#### **Phase 2: Recovery (6-8 weeks)**
- Week 1-3: Synchronization points
- Week 4-5: Error placeholder nodes
- Week 6-8: Symbol table recovery and integration

#### **Phase 3: Resilience (4-7 weeks)**
- Week 1-3: Phase-isolated error handling
- Week 4-5: Binary generation resilience
- Week 6-7: Object tree error isolation

#### **Phase 4: Enhanced UX (3-4 weeks)**
- Week 1-2: Rich error messages
- Week 3: IDE-friendly output
- Week 4: Error suggestions and polish

**Total Timeline**: 17-25 weeks

## 🎯 Expected Benefits

### **Developer Experience Improvements**

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Compilation Cycles | 5-10 per fix session | 1-2 per fix session | **75-80%** ↓ |
| Time to Fix Multiple Errors | 15-30 minutes | 3-5 minutes | **80-83%** ↓ |
| Error Discovery Rate | 1 error per compile | 5-10 errors per compile | **500-1000%** ↑ |
| IDE Integration Quality | Basic syntax checking | Rich diagnostics | **Significant** ↑ |

### **Specific Use Cases**

#### **Complex Object Hierarchies**
- **Before**: Child object error stops entire tree compilation
- **After**: Parent continues compilation with error markers, reports all issues

#### **Learning/Teaching Scenarios**
- **Before**: Students fix one error at a time, slow learning
- **After**: Students see all syntax issues immediately, faster learning curve

#### **Large Codebases**
- **Before**: Refactoring requires many compile cycles to find all issues
- **After**: Single compilation reveals all affected areas

### **Compatibility Considerations**

#### **Maintained Behavior**
- Binary output remains identical for error-free code
- All existing error messages preserved
- Error codes (m240, m480, etc.) maintained for tooling compatibility

#### **Enhanced Behavior**
- Additional context and suggestions for existing errors
- Better source location information
- Machine-readable error output for IDE integration

## ✅ Success Metrics

### **Functional Requirements**
- [ ] Compile continues after recoverable syntax errors
- [ ] All errors collected and reported in single pass
- [ ] Binary generation succeeds for valid code sections
- [ ] Error messages maintain existing format and codes

### **Performance Requirements**
- [ ] <10% compilation time increase for error-free code
- [ ] <50% compilation time increase for code with errors
- [ ] Memory usage increase <25% for error collection

### **Quality Requirements**
- [ ] 100% backward compatibility for error-free compilation
- [ ] All existing error messages preserved
- [ ] Enhanced error reporting with source context
- [ ] IDE-friendly diagnostic output format

### **Developer Experience Requirements**
- [ ] Average 75% reduction in compilation cycles for multi-error scenarios
- [ ] Rich error messages with suggestions
- [ ] Source context highlighting
- [ ] Related error grouping

## 🛡️ Risk Mitigation

### **Compatibility Risks**
- **Mitigation**: Feature flag for multi-error mode vs. fail-fast mode
- **Testing**: Comprehensive regression testing with existing test suite
- **Rollback**: Ability to disable multi-error collection if issues arise

### **Performance Risks**
- **Mitigation**: Benchmarking throughout implementation
- **Monitoring**: Automated performance regression detection
- **Optimization**: Lazy error formatting and optional rich diagnostics

### **Code Quality Risks**
- **Mitigation**: Extensive unit testing for error recovery scenarios
- **Review**: Architectural review for error handling patterns
- **Documentation**: Clear guidelines for adding new error types

## 🚀 Future Enhancements

### **Advanced Error Recovery**
- Smart symbol suggestions based on edit distance
- Automatic fix application for common errors
- Context-aware error grouping and prioritization

### **IDE Integration**
- Real-time error checking during editing
- Quick fix suggestions with one-click application
- Error severity customization

### **Developer Productivity**
- Error statistics and trending
- Most common error patterns analysis
- Compilation performance profiling with error correlation

This roadmap transforms PNut-TS from a traditional fail-fast compiler into a modern, developer-friendly tool that significantly improves the edit-compile-debug cycle while maintaining full compatibility with existing SPIN2/PASM2 development workflows.