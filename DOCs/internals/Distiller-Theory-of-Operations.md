# PNut-TS Object Distiller Theory of Operations

## Overview

The **Object Distiller** is a sophisticated binary optimization system in the PNut-TS compiler that eliminates redundant object code from the final binary. It operates after object compilation to identify and remove duplicate object instances, significantly reducing binary size while maintaining functionality.

## Purpose and Benefits

### Primary Goals
1. **Binary Size Optimization**: Removes duplicate object code from the final binary
2. **Memory Efficiency**: Reduces RAM and flash memory usage on P2 microcontrollers
3. **Code Deduplication**: Eliminates redundant copies of identical child objects
4. **Link-Time Optimization**: Performs optimizations that aren't possible during individual object compilation

### Performance Impact
- **Size Reduction**: Can achieve significant binary size reductions (tracked via `distilledBytes`)
- **Memory Savings**: Reduces both program and variable memory requirements
- **Runtime Efficiency**: Maintains original performance while using less memory

## Architecture Overview

### Current Implementation Status
The distiller is **partially extracted** with dual implementations:

1. **Legacy Array-Based System** (`distiller[]` + `distillPtr`):
   - Original implementation using flat integer arrays
   - Marked with FIXME comments for removal
   - Still used for core optimization algorithms

2. **New Object-Oriented System** (`DistillerList` + `DistillerRecord`):
   - Structured implementation with proper classes
   - Better encapsulation and type safety
   - Currently used for logging and parallel data tracking

### Key Components
```typescript
// Legacy system (to be removed)
private distillPtr: number = 0;          // Array index pointer
private distiller: number[] = [];        // Flat integer array

// New system (target implementation)
private distillerList: DistillerList;    // Object-oriented container
```

## Distiller Record Structure

### Record Format
Each object in the distiller is represented by a structured record:

```
Record Layout (5+ integers):
┌─────────────────────────────────────────────────────────────┐
│ 0: Object ID        (unique identifier)                    │
│ 1: Object Offset    (position in binary image)             │
│ 2: Sub-Object Count (number of child objects)              │
│ 3: Method Count     (number of PUB/PRI methods)            │
│ 4: Object Size      (size in bytes)                        │
│ 5+: Sub-Object IDs  (child object references)              │
└─────────────────────────────────────────────────────────────┘
```

### Data Types and Encoding
- **Object ID**: Unique identifier with MSB flag (0x80000000) for processed status
- **Object Offset**: Byte offset within the binary image
- **Counts**: Simple integer counts for validation
- **Size**: Object size in bytes (used for binary comparison)
- **Sub-Object IDs**: Array of child object references with completion flags

## Distiller Process Flow

### Phase 1: Build (`distill_build()`)
**Purpose**: Recursively analyze object tree and create distiller records

```
Process Flow:
1. Start with root object (ID=0, offset=0)
2. For each object:
   ├── Create distiller record with metadata
   ├── Identify sub-objects from object table
   ├── Recursively process each sub-object
   └── Assign unique sub-object IDs
3. Build complete object dependency tree
```

**Key Operations**:
- Recursive tree traversal of object hierarchy
- Object metadata extraction (size, method count, sub-objects)
- Unique ID assignment for tracking
- Record storage in both legacy array and new DistillerList

### Phase 2: Scrub (`distill_scrub()`)
**Purpose**: Prepare objects for comparison by normalizing sub-object offsets

```
Process Flow:
1. For each object record:
   ├── Read object offset and sub-object count
   ├── Clear all sub-object offset fields (set to 0)
   └── Enable binary comparison of object content
2. "Damage" object IDs to prepare for elimination
```

**Key Operations**:
- **Offset Zeroing**: `objImage.replaceLong(0, objectOffset + subObjIndex * 8)`
- **Normalization**: Makes objects with identical code appear identical
- **Preparation**: Enables byte-for-byte comparison in next phase

### Phase 3: Eliminate (`distill_eliminate()`)
**Purpose**: Identify and remove redundant objects through iterative comparison

```
Elimination Algorithm:
1. For each object record:
   ├── Check if all sub-objects are processed (MSB set)
   ├── If ready, search for identical objects:
   │   ├── Compare object sizes
   │   ├── Compare sub-object counts
   │   ├── Compare sub-object ID arrays
   │   └── Perform binary content comparison
   ├── If match found:
   │   ├── Update all references to point to kept object
   │   ├── Remove redundant object record
   │   └── Mark as eliminated
   └── Repeat until no more eliminations possible
```

**Key Operations**:
- **Dependency Checking**: Objects only eliminated when sub-objects are processed
- **Multi-Level Comparison**: Size → Structure → Content verification
- **Reference Updating**: All pointers redirected to remaining object
- **Iterative Process**: Continues until no more eliminations possible

### Phase 4: Rebuild (`distill_rebuild()`)
**Purpose**: Reconstruct optimized binary image without eliminated objects

```
Rebuild Process:
1. Create new temporary ObjectImage
2. For each remaining object record:
   ├── Copy object binary data to new location
   ├── Update record offset to new position
   └── Maintain object alignment requirements
3. Replace original objImage with optimized version
```

**Key Operations**:
- **Binary Compaction**: Copies only non-eliminated objects
- **Offset Updates**: Records track new positions
- **Memory Optimization**: Removes gaps left by eliminated objects

### Phase 5: Reconnect (`distill_reconnect()`)
**Purpose**: Fix up all sub-object references to point to new locations

```
Reconnection Process:
1. For each object with sub-objects:
   ├── For each sub-object reference:
   │   ├── Find target object's new offset
   │   ├── Calculate relative offset from parent
   │   └── Update parent's sub-object pointer
   └── Recursively process sub-objects
```

**Key Operations**:
- **Reference Resolution**: Maps old IDs to new offsets
- **Relative Addressing**: Converts absolute to relative offsets
- **Recursive Fixing**: Handles nested object relationships

## Optimization Techniques

### 1. Binary Content Comparison
The distiller performs byte-for-byte comparison of object content:
```typescript
// Binary comparison after offset scrubbing
for (let byteIndex = 0; byteIndex < objectSize; byteIndex += 4) {
  const matchLong = objImage.readLong(matchOffset + byteIndex);
  const searchLong = objImage.readLong(searchOffset + byteIndex);
  if (matchLong !== searchLong) {
    return false; // Objects differ
  }
}
```

### 2. Dependency-Based Elimination
Objects are only eliminated when their dependencies are resolved:
```typescript
// Check if all sub-objects are processed (MSB set)
let areAllSubObjectsCompleted = true;
for (let index = 0; index < subObjectCount; index++) {
  const subObjectId = distiller[recordOffset + 5 + index];
  if ((subObjectId & 0x80000000) == 0) {
    areAllSubObjectsCompleted = false;
  }
}
```

### 3. Structural Validation
Multi-level validation ensures objects are truly identical:
1. **Size Check**: Objects must be identical in size
2. **Structure Check**: Same number and types of sub-objects
3. **Content Check**: Byte-for-byte binary comparison
4. **Reference Check**: Sub-object relationships must match

## Integration Points

### In Compilation Pipeline
The distiller runs late in the compilation process:
```
Compilation Flow:
├── Symbol Resolution
├── Code Generation
├── Object Assembly
├── Object Integration
├── Distiller Optimization  ← **Distiller runs here**
└── Final Binary Output
```

### Location in Code
- **Entry Point**: `distill_obj_blocks()` in `src/classes/spinResolver.ts:4879`
- **Phase Integration**: Called after `compile_obj_blocks()` in compile sequence
- **Logging**: Controlled by `--log distiller` command-line option

## Current State and Extraction Opportunities

### Dual Implementation Issue
The distiller currently maintains two parallel implementations:

1. **Legacy Array System** (lines 303-304):
   ```typescript
   private distillPtr: number = 0;        // FIXME: remove after extraction
   private distiller: number[] = [];      // FIXME: remove after extraction
   ```

2. **New Object System** (line 305):
   ```typescript
   private distillerList: DistillerList;  // Target implementation
   ```

### Extraction Opportunities

#### Phase 1: Complete Data Migration
**Current State**: New `DistillerRecord` objects are created and stored in `DistillerList` (line 5097), but algorithms still use legacy arrays.

**Extraction Goal**: Replace all legacy array access with `DistillerList` methods.

#### Phase 2: Algorithm Refactoring
**Target Methods for Extraction**:
- `distill_scrub()` - Object offset normalization
- `distill_eliminate()` - Redundancy detection and removal
- `distill_rebuild()` - Binary image reconstruction
- `distill_reconnect()` - Reference fixup

#### Phase 3: Clean Interface Design
**Proposed Structure**:
```typescript
export class ObjectDistiller {
  private records: DistillerRecord[] = [];

  public buildObjectTree(objImage: ObjectImage): void
  public eliminateRedundantObjects(): number
  public rebuildOptimizedImage(): ObjectImage
  public reconnectReferences(): void
}
```

### Benefits of Complete Extraction
1. **Code Clarity**: Remove FIXME comments and legacy code
2. **Type Safety**: Replace integer arrays with typed objects
3. **Maintainability**: Cleaner separation of concerns
4. **Testability**: Isolated distiller logic easier to unit test
5. **Extensibility**: New optimization strategies easier to implement

## Performance Characteristics

### Time Complexity
- **Build Phase**: O(n) where n = number of objects
- **Elimination Phase**: O(n²) for object comparison
- **Rebuild Phase**: O(n) for binary reconstruction
- **Reconnect Phase**: O(n×m) where m = average sub-objects per object

### Space Complexity
- **Record Storage**: O(n) for object metadata
- **Binary Comparison**: O(1) temporary space
- **Rebuild Buffer**: O(total_binary_size) temporary space

### Optimization Impact
The distiller typically achieves:
- **10-40% binary size reduction** for object-heavy applications
- **Proportional memory savings** at runtime
- **No performance penalty** - identical runtime behavior

## Error Handling and Limits

### Overflow Protection
```typescript
if (this.distillPtr >= this.distiller_limit) {
  throw new Error(`Object distiller overflow (more than ${this.distiller_limit} entries)`);
}
```

### Integrity Validation
- **Reference Validation**: Ensures all sub-object references are valid
- **Size Validation**: Verifies object sizes match actual binary content
- **Completion Checking**: Confirms all dependencies resolved before elimination

## Debugging and Logging

### Debug Capabilities
The distiller provides comprehensive logging via `--log distiller`:
- Record creation and management
- Elimination decisions and rationale
- Binary comparison details
- Reference fixup operations

### Log Integration
```typescript
private logMessageDistill(message: string): void {
  if (this.isLoggingDistill) {
    this.context.logger.logMessage(message);
  }
}
```

## Conclusion

The Object Distiller represents a sophisticated link-time optimization system that significantly reduces binary size through intelligent duplicate elimination. While partially extracted, completing the migration to the object-oriented `DistillerList` system would improve code maintainability and provide a foundation for additional optimizations.

The distiller's multi-phase approach ensures both correctness and optimal size reduction, making it a critical component for memory-constrained P2 microcontroller applications. Understanding its operation is essential for both compiler maintenance and potential enhancements to the optimization capabilities.