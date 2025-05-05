#!/bin/bash
SCRIPT=${0##*/}
SCRIPT_VERSION="1.0"

# Check that we are in desired directory
if [ "${PWD##*/}" != "DIST" ]; then
   echo "${SCRIPT}: ERROR: this script must be from from PropV2-Shared/.../DIST folder! Aborted"
   exit 1;
fi

dmg_src_folder="_unzipped/macos"

#(set -x;codesign --sign - ${pkg_src_folder}/p2-pnut-ts-macos-arm64)
#(set -x;codesign --sign - ${pkg_src_folder}/p2-pnut-ts-macos-x64)
#(set -x;codesign --verbose=4 --options=runtime -s "Apple Distribution: Iron Sheep Productions, LLC (T67FW2JCJW)" ${dmg_src_folder}/macos-arm64.dmg)
#(set -x;codesign --verbose=4 --options=runtime -s "Apple Distribution: Iron Sheep Productions, LLC (T67FW2JCJW)" ${dmg_src_folder}/macos-x64.dmg)
(set -x;codesign --verbose=4 --options=runtime -s "Developer ID Application: Iron Sheep Productions, LLC (T67FW2JCJW)" ${dmg_src_folder}/macos-arm64.dmg)
(set -x;codesign --verbose=4 --options=runtime -s "Developer ID Application: Iron Sheep Productions, LLC (T67FW2JCJW)" ${dmg_src_folder}/macos-x64.dmg)
