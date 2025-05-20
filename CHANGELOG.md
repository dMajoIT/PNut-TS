# Change Log

All notable changes to the "Pnut - A reimplementation in TypeScript" are documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for reminders on how to structure this file. Also, note that our version numbering adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Known compatibility issues w/PNut

There is one issue which we are unable to address in this implementation:

1. **Floating point constants**: The mantissa (bits 22:0) can be +/- 1 ls-bit different in value (*this is a math library limitation*)

## [Unreleased]

Work to appear in upcoming releases:

- Work on getting essential coverage completed (all code generation, less exception testing)
- Fix any bugs reported by users
- Keep up with PNut changes soon after they are released.

## [1.51.2] 2025-05-19

- BUGFIX: Issue ([#8](https://github.com/ironsheep/PNut-TS/issues/8)) Repaired preprocessor to allow whitespace preceding preprocesor '#' directives 
- BUGFIX: Issue ([#8](https://github.com/ironsheep/PNut-TS/issues/8)) Repaired compilation of negated variable expression

*(Thank you @wummi for reporting these!)*

## [1.51.1] 2025-05-05

- BUGFIX: Issue ([#7](https://github.com/ironsheep/PNut-TS/issues/7)) compile failure for post increment/decrement (Thank you Macca for reporting this!)

## [1.51.0] 2025-05-01

- Add language version support through `{Spin2_v51}`.
- Add command-line `-F` option which, when specified, causes the .flash file to be written (PNut -ci equiv.)
- Preprocessor intermediate files now end with `__pre.spin2` (vs. '-pre.spin2')
- Preprocessor: #define is no longer affected by command-line -U options
- Added `#pragma exportdef SYMBOL` which makes SYMBOL present as if added with `-DSYMBOL` on the command line but affects all files compiled after the file containing the #pragma (*place in top-most file for best results*)
- {Spin2_v44} is no longer supported due to changes in data structures beginning in v45
- Compatible with PNut versions through PNut_v51a.exe (except for PNut_v44.exe, which is no longer supported)
- **Performance fix**: [Issue #2](https://github.com/ironsheep/PNut-TS/issues/2) Compiling FILEs in DAT section needs attention - is slow

## [1.43.3] 2024-12-14

- Allow empty VAR ([#6](https://github.com/ironsheep/PNut-TS/issues/6))
- Repair command-line -0 option parsing ([#4](https://github.com/ironsheep/PNut-TS/issues/4))
- Adds new --altbin (-a) option to force output binary to have .binary suffix
- Compatible with PNut_v43.exe

## [1.43.2] 2024-09-22

- Repair command-line option parsing (on Windows/Linux)
- BUGFIX fixed elementizer issues caused by preprocessor changes
- Compatible with PNut_v43.exe

### known issues v1.43.2

- Compiler occasionally produces duplicate error messages

## [1.43.1] 2024-09-17

- Finish implementation of PreProcessor (Oops!)
- Clean up output under error conditions
- Compatible with PNut_v43.exe

### known issues v1.43.1

- Compiler occasionally produces duplicate error messages

## [1.43.0] 2024-09-11

- Initial Release for Testing
- Compatible with PNut_v43.exe

## [0.43.1] 2024-08-30

- Fix linux x86 packaging along with install docs

## [0.43.0] 2024-08-29

- Preparation of initial release for testing

## [0.0.0] 2024-01-02

- Initial repo created
