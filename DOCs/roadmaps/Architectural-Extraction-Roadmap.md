# PNut-TS Architectural Extraction Roadmap

## Executive Summary

Based on comprehensive codebase analysis, the PNut-TS compiler presents significant opportunities for architectural improvement through strategic class extraction and modularization. The codebase suffers from several **massive monolithic classes** that violate single responsibility principles and hinder testability.

**Key Findings**:
- `spinResolver.ts`: **12,066 lines** with 314+ methods - **CRITICAL EXTRACTION NEEDED**
- `parseUtils.ts`: **3,685 lines** - Utility extraction opportunities
- Multiple classes have insufficient unit test coverage
- Cross-cutting concerns spread across many classes
- Hard-coded dependencies inhibit testing

**Estimated Total Effort**: **180-280 hours** across 7 major extraction projects

## 🚨 Critical Issues Identified

### 1. **SpinResolver Monolith** (12,066 lines)
**Current Problems**:
- Single class handling 10+ distinct responsibilities
- 314+ methods in one class
- Impossible to unit test individual components
- Tight coupling between compilation phases
- Code navigation and maintenance nightmare

### 2. **Missing Abstraction Layers**
- Binary component insertion logic scattered
- No clean interfaces between compilation phases
- Context object used as global state bag
- Hard to test individual algorithms

### 3. **Inadequate Test Coverage**
- Only 23 test files for entire compiler
- Most tests are integration-level
- No unit tests for critical algorithms
- Difficult to isolate failures

## 🎯 Major Extraction Opportunities

### **Priority 1: High Impact, High Value**

#### 1. **Binary Component Assembly System**
**Effort**: 40-50 hours | **Impact**: High | **Risk**: Medium

**Current State**: P2Insert* methods scattered across Spin2Parser
**Target**: Cohesive BinaryAssembly subsystem

```typescript
// Target Architecture
export interface IBinaryComponent {
  insert(objImage: ObjectImage, context: AssemblyContext): void;
  getSize(): number;
  getRequirements(): ComponentRequirements;
}

export class BinaryAssemblyPipeline {
  private components: IBinaryComponent[] = [];

  public addComponent(component: IBinaryComponent): void;
  public assemble(objImage: ObjectImage): void;
  public validateMemoryConstraints(): void;
}

// Individual Components
export class Spin2InterpreterComponent implements IBinaryComponent;
export class DebuggerComponent implements IBinaryComponent;
export class ClockSetterComponent implements IBinaryComponent;
export class FlashLoaderComponent implements IBinaryComponent;
```

**Benefits**:
- Individual component testing
- Memory management isolation
- Clear assembly pipeline
- Easier to add new components

#### 2. **Compilation Phase Engine**
**Effort**: 60-80 hours | **Impact**: Very High | **Risk**: High

**Current State**: All phases embedded in SpinResolver monolith
**Target**: Pipeline-based compilation system

```typescript
// Target Architecture
export interface ICompilationPhase {
  execute(context: CompilationContext): PhaseResult;
  getDependencies(): PhaseType[];
  getName(): string;
}

export class CompilationPipeline {
  private phases: Map<PhaseType, ICompilationPhase> = new Map();

  public addPhase(phase: ICompilationPhase): void;
  public execute(): CompilationResult;
  private validateDependencies(): void;
}

// Individual Phases
export class ConstantResolutionPhase implements ICompilationPhase;
export class VariableAllocationPhase implements ICompilationPhase;
export class ObjectResolutionPhase implements ICompilationPhase;
export class CodeGenerationPhase implements ICompilationPhase;
export class DistillationPhase implements ICompilationPhase;
```

**Benefits**:
- Individual phase testing
- Clear phase dependencies
- Pipeline reusability
- Better error isolation

#### 3. **Symbol Resolution System**
**Effort**: 35-45 hours | **Impact**: High | **Risk**: Medium

**Current State**: Symbol logic scattered throughout SpinResolver
**Target**: Dedicated symbol resolution subsystem

```typescript
// Target Architecture
export class SymbolResolutionEngine {
  private scopes: SymbolScope[] = [];
  private resolvers: Map<SymbolType, ISymbolResolver> = new Map();

  public resolveSymbol(name: string, context: ResolutionContext): Symbol;
  public addScope(scope: SymbolScope): void;
  public registerResolver(type: SymbolType, resolver: ISymbolResolver): void;
}

export interface ISymbolResolver {
  canResolve(symbol: UnresolvedSymbol): boolean;
  resolve(symbol: UnresolvedSymbol, context: ResolutionContext): Symbol;
}

// Specialized Resolvers
export class ConstantSymbolResolver implements ISymbolResolver;
export class MethodSymbolResolver implements ISymbolResolver;
export class ObjectSymbolResolver implements ISymbolResolver;
export class VariableSymbolResolver implements ISymbolResolver;
```

#### 4. **Memory Layout Management**
**Effort**: 25-35 hours | **Impact**: High | **Risk**: Low

**Current State**: Memory calculations scattered across classes
**Target**: Centralized memory management

```typescript
// Target Architecture
export class MemoryLayoutManager {
  private regions: MemoryRegion[] = [];
  private constraints: MemoryConstraint[] = [];

  public allocateRegion(type: RegionType, size: number): MemoryRegion;
  public validateLayout(): ValidationResult;
  public getHubUtilization(): number;
  public optimizeLayout(): void;
}

export interface MemoryRegion {
  type: RegionType;
  offset: number;
  size: number;
  alignment: number;
}
```

### **Priority 2: Medium Impact, Good Value**

#### 5. **Complete Object Distiller Extraction**
**Effort**: 20-30 hours | **Impact**: Medium | **Risk**: Low

**Status**: Partially extracted, needs completion
**Current Issues**: Dual implementation (array + objects)

```typescript
// Target Architecture (building on existing DistillerList)
export class ObjectDistiller {
  public distillObjects(objImage: ObjectImage): OptimizationResult;
  private buildDependencyTree(): void;
  private eliminateRedundantObjects(): void;
  private rebuildOptimizedImage(): void;
  private reconnectReferences(): void;
}
```

#### 6. **Early Deduplication System**
**Effort**: 30-44 hours | **Impact**: Medium | **Risk**: Medium

**Status**: Disabled due to bugs
**Target**: Working early deduplication with proper index mapping

```typescript
// Target Architecture
export class EarlyDeduplicationManager {
  private duplicateDetector: IDuplicateDetector;
  private indexMapper: LogicalPhysicalIndexMapper;

  public checkForDuplicate(objectData: Uint8Array): DuplicateResult;
  public registerNewObject(objectData: Uint8Array): number;
  public getMemorySavings(): DeduplicationStats;
}
```

#### 7. **Parse Utilities Modularization**
**Effort**: 15-25 hours | **Impact**: Medium | **Risk**: Low

**Current State**: 3,685-line utility class
**Target**: Specialized utility modules

```typescript
// Target Architecture
export class BytecodeGenerator {
  public generateInstruction(opcode: eByteCode, operands: number[]): void;
  public optimizeSequence(instructions: Instruction[]): Instruction[];
}

export class FlexcodeMapper {
  public mapBytecodeToFlexcode(bytecode: number): number;
  public validateMapping(bytecode: number): boolean;
}
```

### **Priority 3: Quality of Life Improvements**

#### 8. **Dependency Injection Framework**
**Effort**: 20-30 hours | **Impact**: Medium | **Risk**: Low

**Current Issue**: Hard-coded dependencies, Context as global state
**Target**: Proper dependency injection

```typescript
// Target Architecture
export class CompilerContainer {
  public register<T>(token: ServiceToken<T>, implementation: T): void;
  public resolve<T>(token: ServiceToken<T>): T;
  public createScope(): CompilerContainer;
}

// Service Interfaces
export interface ILogger { /* ... */ }
export interface IFileSystem { /* ... */ }
export interface IExternalFiles { /* ... */ }
```

#### 9. **Enhanced Testing Infrastructure**
**Effort**: 25-35 hours | **Impact**: High | **Risk**: Low

**Current State**: 23 integration tests, minimal unit testing
**Target**: Comprehensive unit test framework

```typescript
// Test Infrastructure
export class CompilerTestHarness {
  public createMockContext(): Context;
  public createTestObjectImage(): ObjectImage;
  public assertBinaryEquivalence(expected: Uint8Array, actual: Uint8Array): void;
}

export class PhaseTestRunner {
  public testPhase<T extends ICompilationPhase>(
    phase: T,
    input: CompilationContext
  ): PhaseTestResult;
}
```

## 📊 Effort and Risk Assessment

### **Total Effort Estimate: 180-280 hours**

| Priority | Component | Effort (Hours) | Impact | Risk | Dependencies |
|----------|-----------|----------------|--------|------|--------------|
| 1 | Binary Assembly | 40-50 | High | Medium | External files |
| 1 | Compilation Pipeline | 60-80 | Very High | High | Symbol resolution |
| 1 | Symbol Resolution | 35-45 | High | Medium | None |
| 1 | Memory Management | 25-35 | High | Low | None |
| 2 | Distiller Extraction | 20-30 | Medium | Low | None |
| 2 | Early Deduplication | 30-44 | Medium | Medium | Index mapping |
| 2 | Parse Utils | 15-25 | Medium | Low | None |
| 3 | Dependency Injection | 20-30 | Medium | Low | All components |
| 3 | Testing Infrastructure | 25-35 | High | Low | DI framework |

### **Risk Mitigation Strategies**

#### **High Risk (Compilation Pipeline)**:
- **Incremental Extraction**: Extract one phase at a time
- **Parallel Implementation**: Keep old code until validation complete
- **Extensive Testing**: Compare binary outputs byte-for-byte
- **Rollback Plan**: Feature flags to revert to monolith

#### **Medium Risk Components**:
- **Comprehensive Unit Tests**: Test each component in isolation
- **Integration Testing**: Verify component interactions
- **Performance Monitoring**: Ensure no performance regression

#### **Low Risk Components**:
- **Standard Practices**: Follow established extraction patterns
- **Code Review**: Peer review for architectural decisions

## 🛣️ Implementation Roadmap

### **Phase 1: Foundation (Weeks 1-4) - 60-90 hours**
1. **Dependency Injection Framework** (Week 1)
2. **Testing Infrastructure** (Week 2)
3. **Memory Management** (Week 3-4)

### **Phase 2: Core Extractions (Weeks 5-12) - 80-120 hours**
1. **Symbol Resolution System** (Weeks 5-7)
2. **Binary Assembly System** (Weeks 8-10)
3. **Parse Utils Modularization** (Weeks 11-12)

### **Phase 3: Pipeline Restructure (Weeks 13-20) - 60-80 hours**
1. **Compilation Phase Engine** (Weeks 13-18)
2. **Integration and Testing** (Weeks 19-20)

### **Phase 4: Optimization (Weeks 21-24) - 30-50 hours**
1. **Complete Distiller Extraction** (Week 21-22)
2. **Early Deduplication Fix** (Week 23-24)

## 🎯 Expected Benefits

### **Immediate Benefits** (Post-Phase 1)
- **Unit Testability**: Individual components testable in isolation
- **Development Velocity**: Easier debugging and feature addition
- **Code Navigation**: Smaller, focused classes easier to understand

### **Medium-term Benefits** (Post-Phase 2)
- **Maintainability**: Clear separation of concerns
- **Extensibility**: New features easier to add
- **Performance**: Targeted optimizations possible

### **Long-term Benefits** (Post-Phase 3)
- **Architecture Quality**: Professional-grade compiler architecture
- **Team Scalability**: Multiple developers can work on different phases
- **Innovation**: Foundation for advanced features (incremental compilation, parallelization)

## 🤔 Feasibility Assessment

### **Is This Doable?**
**YES** - with proper planning and incremental approach.

### **Key Success Factors**:
1. **Incremental Extraction**: Never break the entire compiler
2. **Comprehensive Testing**: Maintain compatibility throughout
3. **Binary Validation**: Ensure identical output at each step
4. **Feature Flags**: Safe rollback mechanisms
5. **Performance Monitoring**: Prevent regressions

### **Recommended Starting Point**:
**Memory Management + Testing Infrastructure** (Phase 1)
- Lower risk, high value
- Enables better testing for subsequent extractions
- Immediate improvement in code quality

### **Alternative Minimal Approach** (60-80 hours):
If full roadmap is too ambitious:
1. Complete Distiller Extraction (20-30 hours)
2. Fix Early Deduplication (30-44 hours)
3. Basic Testing Infrastructure (10-20 hours)

This provides immediate value while laying groundwork for larger architectural improvements.

## 📋 Success Metrics

1. **Lines of Code per Class**: Target <2000 lines for largest classes
2. **Test Coverage**: >80% unit test coverage for extracted components
3. **Binary Compatibility**: 100% identical output for existing test suite
4. **Build Performance**: <5% performance regression
5. **Development Velocity**: Measurable improvement in feature addition time

The roadmap provides a systematic approach to transforming the PNut-TS compiler from a monolithic codebase into a modern, maintainable, and testable architecture while preserving all existing functionality and compatibility.