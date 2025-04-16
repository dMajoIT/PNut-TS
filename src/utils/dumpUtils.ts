/** @format */

'use strict';

import { Context } from './context';
import { hexByte } from './formatUtils';

export const OVERRIDE_MESSAGE: boolean = true;

export function dumpBytes(ctx: Context, bytes: Uint8Array, nbrBytes: number, dsplyOffset: number, idStr: string, overrideMsg: boolean = false) {
  const endOffset = nbrBytes - 1;
  let currOffset = 0;
  let addrRange: string = `${hexByte(currOffset)}-${hexByte(endOffset)}`;
  if (dsplyOffset != -1) {
    addrRange = `${hexByte(dsplyOffset)}-${hexByte(dsplyOffset + nbrBytes - 1)}`;
  }
  const titleText: string = overrideMsg ? idStr : `Dump Bytes [${addrRange}] - ${idStr}`;
  const titleFillerLen: number = (77 - titleText.length - 7) / 2;
  const needExtraRt: boolean = Math.floor(titleFillerLen) != titleFillerLen;
  const titleFillerLenRt: number = needExtraRt ? titleFillerLen + 1 : titleFillerLen;
  const ltFillStr: string = ''.padEnd(titleFillerLen, '-');
  const rtFillStr: string = ''.padEnd(titleFillerLenRt, '-');
  const titleStr: string = ` /${ltFillStr}  ${titleText}  ${rtFillStr}\\`;
  debugMessage(ctx, titleStr);
  /// dump hex and ascii data
  let displayOffset: number = dsplyOffset == -1 ? currOffset : dsplyOffset;
  while (currOffset < endOffset) {
    let hexPart = '';
    let asciiPart = '';
    const remainingBytes = endOffset - currOffset;
    const lineLength = remainingBytes > 16 ? 16 : remainingBytes;
    for (let charIdx = 0; charIdx < lineLength; charIdx++) {
      const byteValue = bytes[currOffset + charIdx];
      hexPart += byteValue.toString(16).padStart(2, '0').toUpperCase() + ' ';
      asciiPart += byteValue >= 0x20 && byteValue <= 0x7e ? String.fromCharCode(byteValue) : '.';
      // space between left and right 8 bytes
      if (charIdx == 7) {
        hexPart += ' ';
        asciiPart += ' ';
      }
    }
    const addrPrefix = displayOffset.toString(16).padStart(5, '0').toUpperCase();

    debugMessage(ctx, `${addrPrefix}- ${hexPart.padEnd(49, ' ')}  '${asciiPart}'`);
    currOffset += lineLength;
    displayOffset += lineLength;
  }
  const fillStr: string = ''.padEnd(titleStr.length - 3, '-');
  debugMessage(ctx, ` \\${fillStr}/`);
}

function debugMessage(ctx: Context, message: string): void {
  ctx.logger.logMessage(message);
}
