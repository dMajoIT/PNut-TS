/** @format */

// this is our common logging mechanism
//  TODO: make it context/runtime option aware

'use strict';

import { Context } from '../utils/context';
import { hexAddress, hexByte, hexLong, hexWord } from '../utils/formatUtils';

// src/classes/objectImage.ts
const SUPPRESS_LOG_MSG: boolean = true;

export class ObjectImage {
  private context: Context;
  private isLogging: boolean = false;
  private _id: string;

  static readonly MAX_SIZE_IN_BYTES: number = 0x100000;
  private _objImage = new Uint8Array(ObjectImage.MAX_SIZE_IN_BYTES); // total memory size
  private _objOffset: number = 0; // current index into OBJ image
  private _maxOffset: number = 0; // current index into OBJ image

  constructor(ctx: Context, idString: string) {
    this.context = ctx;
    this._id = idString;
    this.isLogging = this.context.logOptions.logCompile || this.context.logOptions.logResolver;
  }

  public setLogging(enable: boolean) {
    this.isLogging = enable;
  }

  get rawUint8Array(): Uint8Array {
    return this._objImage;
  }

  get offset(): number {
    // return current offset
    return this._objOffset;
  }

  get offsetHex(): string {
    // return current offset
    return hexAddress(this._objOffset);
  }

  get length(): number {
    return this._objOffset;
  }

  public calculateChecksum(fromOffset: number, toOffset: number): number {
    let sumValue: number = 0;
    for (let index = fromOffset; index <= toOffset; index++) {
      sumValue -= this._objImage[index];
    }
    //const savedLogState = this.isLogging;
    //this.isLogging = true;
    this.logMessage(`OBJ[${this._id}]: calculateChecksum(ofs=(${fromOffset}),len=(${toOffset})) -> ${sumValue & 0xff}`);
    //this.isLogging = savedLogState;
    return sumValue & 0xff;
  }

  public setOffsetTo(offset: number) {
    // ?? no guard for this for now...
    this.logMessage(
      `* OBJ[${this._id}]: setOffsetTo() (${hexAddress(this._objOffset)}) -> (${hexAddress(offset)}) diff(${this._objOffset - offset})`
    );
    this._objOffset = offset;
  }

  public readNext(): number {
    let desiredValue: number = 0;
    desiredValue = this._objImage[this._objOffset++];
    this.updateMax();
    return desiredValue;
  }

  public append(uint8: number, alreadyLogged: boolean = false) {
    // append byte to end of image
    if (alreadyLogged == false) {
      this.logMessage(`* OBJ[${this._id}]: append(v=(${hexByte(uint8 & 0xff)})) wroteTo(${hexAddress(this._objOffset)})`);
    }
    if (this._objOffset < ObjectImage.MAX_SIZE_IN_BYTES) {
      this._objImage[this._objOffset++] = uint8 & 0xff;
      this.updateMax();
    } else {
      // [error_pex]
      throw new Error('Program exceeds 1024KB');
    }
  }

  public appendLong(uint32: number) {
    this.logMessage(`* OBJ[${this._id}]: append(v=(${hexLong(uint32 & 0xffffffff)})) wroteTo(${hexAddress(this._objOffset)})`);
    this.append(uint32, SUPPRESS_LOG_MSG);
    this.append(uint32 >> 8, SUPPRESS_LOG_MSG);
    this.append(uint32 >> 16, SUPPRESS_LOG_MSG);
    this.append(uint32 >> 24, SUPPRESS_LOG_MSG);
  }

  public read(offset: number): number {
    // read existing value from image
    let desiredValue: number = 0;
    //if (offset >= 0 && offset <= this._maxOffset - 1) {
    desiredValue = this._objImage[offset];
    //}
    return desiredValue;
  }

  private updateMax() {
    if (this._objOffset > this._maxOffset) {
      this._maxOffset = this._objOffset;
    }
  }

  public readWord(offset: number): number {
    // read existing word from image
    let desiredValue: number = 0;
    //if (offset >= 0 && offset <= this._objOffset - 2) {
    desiredValue = this._objImage[offset];
    desiredValue |= this._objImage[offset + 1] << 8;
    //}
    return desiredValue;
  }

  public readLong(offset: number): number {
    // read existing word from image
    let desiredValue: number = 0;
    //if (offset >= 0 && offset <= this._objOffset - 4) {
    desiredValue = this.readWord(offset);
    desiredValue |= this.readWord(offset + 2) << 16;
    //}
    return desiredValue;
  }

  public readLongNext(): number {
    // read existing word from image
    let desiredValue: number = 0;
    desiredValue = this._objImage[this._objOffset++];
    desiredValue |= this._objImage[this._objOffset++] << 8;
    desiredValue |= this._objImage[this._objOffset++] << 16;
    desiredValue |= this._objImage[this._objOffset++] << 24;
    this.logMessage(`* OBJ: readLongNext() v=(${hexLong(desiredValue)}) from(${hexAddress(this._objOffset - 4)})`);
    return desiredValue;
  }

  public replaceByte(uint8: number, offset: number) {
    // replace existing value within image
    this.logMessage(`* OBJ: replaceByte(v=(${hexByte(uint8)}), addr(${hexAddress(offset)}))`);
    //if (offset >= 0 && offset <= this._objOffset - 1) {
    if (offset >= 0 && offset <= ObjectImage.MAX_SIZE_IN_BYTES - 1) {
      this._objImage[offset] = uint8;
    } else {
      this.logMessage(`* OBJ: ERROR BAD address! replaceByte(v=(${hexByte(uint8)}), addr(${hexAddress(offset)}))`);
    }
  }

  public replaceWord(uint16: number, offset: number, alreadyLogged: boolean = false) {
    // replace existing value within image
    if (alreadyLogged == false) {
      this.logMessage(`* OBJ: replaceWord(v=(${hexWord(uint16)}), addr(${hexAddress(offset)}))`);
    }
    //if (offset >= 0 && offset <= this._objOffset - 2) {
    this._objImage[offset] = uint16 & 0xff;
    this._objImage[offset + 1] = (uint16 >> 8) & 0xff;
    //} else {
    //  this.logMessage(`* OBJ: ERROR BAD address! replaceWord(v=(${hexWord(uint16)}), addr(${hexAddress(offset)}))`);
    //}
  }

  public replaceLong(uint32: number, offset: number) {
    // replace existing value within image
    this.logMessage(`* OBJ: replaceLong(addr(${hexAddress(offset)})) (${hexLong(this.readLong(offset))}) -> (${hexLong(uint32)})`);
    //if (offset >= 0 && offset <= this._objOffset - 4) {
    this.replaceWord(uint32, offset, SUPPRESS_LOG_MSG);
    this.replaceWord(uint32 >> 16, offset + 2, SUPPRESS_LOG_MSG);
    //} else {
    //  this.logMessage(`* OBJ: ERROR BAD address! replacereplaceLongWord(v=(${hexLong(uint32)}), addr(${hexAddress(offset)}))`);
    //}
  }

  public reset() {
    this.logMessage(`* OBJ: reset Offset to zero`);
    // effectively empty our image
    this.setOffsetTo(0); // call method, so logs
  }
  public dumpBytes(startOffset: number, byteCount: number, dumpId: string) {
    /// dump hex and ascii data
    let displayOffset: number = 0;
    let currOffset = startOffset;
    this.logMessage(`-- -------- ${dumpId} ------------------ --`);
    while (displayOffset < byteCount) {
      let hexPart = '';
      let asciiPart = '';
      const remainingBytes = byteCount - displayOffset;
      const lineLength = remainingBytes > 16 ? 16 : remainingBytes;
      for (let i = 0; i < lineLength; i++) {
        const byteValue = this.read(currOffset + i);
        hexPart += byteValue.toString(16).padStart(2, '0').toUpperCase() + ' ';
        asciiPart += byteValue >= 0x20 && byteValue <= 0x7e ? String.fromCharCode(byteValue) : '.';
      }
      const offsetPart = displayOffset.toString(16).padStart(5, '0').toUpperCase();

      this.logMessage(`${offsetPart}- ${hexPart.padEnd(48, ' ')}  '${asciiPart}'`);
      currOffset += lineLength;
      displayOffset += lineLength;
    }
    this.logMessage(`-- -------- -------- ------------------ --`);
  }

  private logMessage(message: string): void {
    if (this.isLogging) {
      this.context.logger.logMessage(message);
    }
  }
}
