# PNut-TS - Command Line

![Project Maintenance][maintenance-shield]

[![License][license-shield]](LICENSE)

![NodeJS][node-badge]

[![Release][Release-shield]](https://github.com/ironsheep/PNut-TS/releases)

[![GitHub issues][Issues-shield]](https://github.com/ironsheep/PNut-TS/issues)

## Everyday Use of PNut-TS

Our new PNut-TS compiler will show you the following when you specify `-h` or `--help`:

```text
PNut-TS: Usage: pnut-ts [optons] filename

Propeller Spin2 compiler - v1.51.0

Options:
  -V, --version               Output the version number
  -d, --debug                 Compile with DEBUG
  -l, --list                  Generate listing files (.lst) from compilation
  -v, --verbose               Output verbose messages
  -a, --altbin                Use alternate .binary name vs. .bin
  -o, --output <name>         Specify output file basename
  -i, --intermediate          Generate *__pre.spin2 after preprocessing
  -q, --quiet                 Quiet mode (suppress banner and non-error text)
  -F, --flashfile             Generate FLASH image file (.flash) suitable for writing to flash chip
  -O, --obj                   Generate object files (.obj) from compilation
  -D, --Define <symbol...>    Define (add) preprocessor symbol(s)
  -U, --Undefine <symbol...>  Undefine (remove) preprocessor symbol(s)
  -I, --Include <dir...>      Add preprocessor include directories
  --log <objectName...>       objectName (choices: "all", "outline", "compiler", "elementizer", "parser", "distiller", "preproc", "resolver")
  --regression <testName...>  testName (choices: "element", "tables", "resolver", "preproc")
  --pass <passName...>        Stop after passName (choices: "preprocess", "elementize", "con-block")
  -h, --help                  display help for command

      Example:
         $ pnut-ts my-top-level.spin2         # compile leaving .bin file
         $ pnut-ts -l my-top-level.spin2      # compile file leaving .bin and .lst files
         
pnut-ts: * Propeller Spin2/PASM2 Compiler 'pnut_ts' (c) 2024 Iron Sheep Productions, LLC., Parallax Inc.
pnut-ts: * Version 1.51.0, Build date: 4/30/2025
```

These options should already make sense but here's a light-weight recap:

| Option forms | Description |
| --- | --- |
| <pre>--d, -\-debug</pre> | enables generation of code for debug() statements  |
| <pre>--O, -\-obj,<br>-l, --list</pre> | control the generation of the additional (.lst) listing and (.ob) object files |
| <pre>-V, -\-version</pre> | shows the compiler version information |
| <pre>-o {filename}, --output {filename}</pre> | allows you to provide a specific filename for the .bin output file |
| <pre>-i, --intermediate</pre> | Generate `*__pre.spin2` file after preprocessing your source file
| <pre>-F, --flashfile</pre> | control the generation of the additional (.flash) flash-mage file |
| <pre>-a, --altbin</pre> | use alternate `.binary` suffix vs. `.bin` |
| <pre>-q, --quiet,<br>-v, --verbose</pre> | control how little or how much extra messaging is output from the compiler |
| <pre>-I \<dir...\>, --Include \<dir...\>,<br>-U \<symbol...\>, --Undefine \<symbol...\>,<br>-D \<symbol...\>, --Define \<symbol...\> | Are all **proprocessor directives** where:<br> -I adds search directories containing .spin2 files to be included (using `#include "filename(.spin2)"` statements)<br> -D defines one or more symbols on the command line (*Equivalent to #define SYMBOL but affects all files in the compilation effort.*)<br> -U un-defines symbols from the command line.<BR>&nbsp;&nbsp;(**NOTE:** *The -U option can not undefine a symbol created by a #define directive.*) |

And of course `-h` or `--help` produces the output as shown above.

**NOTE:** The `-i, or --intermediate` Option causes the post-preprocessed source file to be saved in case you want to inspect what was passed on to the compiler.  This output file has a `__pre` suffix inserted before the .spin2 extension but otherwise has the same name as your compiled file.  E.G., If you compiled `blink.spin2` your intermediate output file would be `blink__pre.spin2`.


## For PNut-TS - Developer use

There are a couple of additional options we use when testing or validating PNut_TS:

```text
  --log <objectName...>       objectName (choices: "all", "outline", "compiler", "elementizer", "parser", "preproc", "resolver")
  --regression <testName...>  testName (choices: "element", "tables", "resolver", "preproc")
  --pass <passName...>        Stop after passName (choices: "preprocess", "elementize", "con-block")

```


The `--log {option(s)}` produce very detailed output from different sections of the compiler.

The `--regression {option(s)}` produce additional reports we use for testing/verifing the compiler.

and

The `--pass {option(s)}` are how we instruct the compiler to end after a given pass.

---

> If you like my work and/or this has helped you in some way then feel free to help me out for a couple of :coffee:'s or :pizza: slices or support my work by contributing at Patreon!
>
> [![coffee](https://www.buymeacoffee.com/assets/img/custom_images/black_img.png)](https://www.buymeacoffee.com/ironsheep) &nbsp;&nbsp; -OR- &nbsp;&nbsp; [![Patreon](./DOCs/images/patreon.png)](https://www.patreon.com/IronSheep?fan_landing=true)[Patreon.com/IronSheep](https://www.patreon.com/IronSheep?fan_landing=true)

---

## License

Licensed under the MIT License.

Follow these links for more information:

### [Copyright](copyright) | [License](LICENSE)

[maintenance-shield]: https://img.shields.io/badge/maintainer-stephen%40ironsheep%2ebiz-blue.svg?style=for-the-badge

[license-shield]: https://img.shields.io/badge/License-MIT-yellow.svg

[Release-shield]: https://img.shields.io/github/release/ironsheep/PNut-TS/all.svg

[Issues-shield]: https://img.shields.io/github/issues/ironsheep/PNut-TS.svg

[node-badge]: https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white
