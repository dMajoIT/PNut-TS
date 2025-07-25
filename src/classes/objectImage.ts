/** @format */

// this is our common logging mechanism
//  TODO: make it context/runtime option aware

'use strict';

import { Context } from '../utils/context';
import { hexAddress, hexByte, hexLong, hexWord } from '../utils/formatUtils';
import { OBJ_LIMIT } from './spinResolver';

// src/classes/objectImage.ts
const SUPPRESS_LOG_MSG: boolean = true;

export class ObjectImage {
  private context: Context;
  private isLogging: boolean;
  private isLoggingOutline: boolean;
  private _id: string;
  private readonly obj_limit: number = OBJ_LIMIT; // max object size (2MB) PNut obj_limit as of v49
  private readonly ALLOC_SIZE_IN_BYTES: number = this.obj_limit / 16;
  private _objImageByteAr = new Uint8Array(this.ALLOC_SIZE_IN_BYTES); // initial memory size
  private _objOffset: number = 0; // current index into OBJ image
  private _maxOffset: number = 0; // max index into OBJ image

  constructor(ctx: Context, idString: string) {
    this.context = ctx;
    this._id = idString;
    this.isLogging = ctx.logOptions.logCompile || ctx.logOptions.logResolver;
    // this.isLogging = this.context.reportOptions.coverageTesting ? false : true;
    this.isLoggingOutline = ctx.logOptions.logOutline;
  }

  // Copy constructor
  public static copyFrom(source: ObjectImage): ObjectImage {
    const copy = new ObjectImage(source.context, source._id + '_copy');

    // Copy properties
    copy.isLogging = source.isLogging;
    copy.isLoggingOutline = source.isLoggingOutline;
    copy._objOffset = source._objOffset;
    copy._maxOffset = source._maxOffset;

    // Copy the Uint8Array
    copy._objImageByteAr = new Uint8Array(source._objImageByteAr.length);
    copy._objImageByteAr.set(source._objImageByteAr);

    return copy;
  }

  public ensureFits(offset: number, nbrBytes: number) {
    const lastByteIdx: number = offset + nbrBytes - 1;
    this.ensureCapacity(lastByteIdx + 63); // grow, if possible, and needed, before use
    if (offset < 0 || lastByteIdx >= this._objImageByteAr.length) {
      // BAD Offset
      // [error_INTERNAL]
      throw new Error(
        `cOBJ[${this._id}] write to Offset ${hexAddress(offset)}(${offset}) of ${Math.floor(lastByteIdx / 1024)} kB Won't FIT! (curr ${this._objImageByteAr.length / 1024} kB)`
      );
    }
  }

  private ensureCapacity(neededCapacity: number) {
    if (neededCapacity > this._objImageByteAr.length && this._objImageByteAr.length < this.obj_limit) {
      // our array grows in multiples of ALLOC_SIZE_IN_BYTES at a time
      const tmpCapacity: number = Math.ceil(neededCapacity / this.ALLOC_SIZE_IN_BYTES) * this.ALLOC_SIZE_IN_BYTES;
      const newCapacity: number = tmpCapacity > this.obj_limit ? this.obj_limit : tmpCapacity;
      this.logMessageOutline(`++ MEM-ALLOC: OBJ[${this._id}] grows from (${this._objImageByteAr.length / 1024} kB) to (${newCapacity / 1024} kB)`);
      const newBuffer = new Uint8Array(newCapacity);
      newBuffer.set(this._objImageByteAr);
      //this._objImageByteAr = null; // force prior to be deallocated AUGH doesn't work!
      this._objImageByteAr = newBuffer;
    } else if (neededCapacity > this._objImageByteAr.length) {
      // [error_pex]
      throw new Error(`Program exceeds ${this.obj_limit / 1024}KB (m491)`);
    }
  }

  public refreshLogging() {
    this.isLogging = this.context.logOptions.logCompile || this.context.logOptions.logResolver;
    this.isLoggingOutline = this.context.logOptions.logOutline;
    // this.isLogging = this.context.reportOptions.coverageTesting ? false : true;
  }

  public setLogging(enable: boolean) {
    this.isLogging = enable;
  }

  get isLoggingEnabled(): boolean {
    return this.isLogging;
  }

  get rawUint8Array(): Uint8Array {
    return this._objImageByteAr;
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
      sumValue -= this._objImageByteAr[index];
    }
    //const savedLogState = this.isLogging;
    //this.isLogging = true;
    this.logMessage(`* OBJ[${this._id}]: calculateChecksum(ofs=(${fromOffset}),len=(${toOffset})) -> ${sumValue & 0xff}`);
    //this.isLogging = savedLogState;
    return sumValue & 0xff;
  }

  public setOffsetTo(offset: number) {
    // ?? no guard for this for now...
    this.ensureCapacity(offset + 1);
    this.logMessage(
      `* OBJ[${this._id}]: setOffsetTo() (${hexAddress(this._objOffset)}) -> (${hexAddress(offset)}) diff(${this._objOffset - offset})`
    );
    this._objOffset = offset;
  }

  /*
  public readNext(): number {
    let desiredValue: number = 0;
    desiredValue = this._objImageByteAr[this._objOffset++];
    this.updateMax();
    return desiredValue;
  }
  */

  public appendLong(longValue: number) {
    this.logMessage(`* OBJ[${this._id}]: append(Lv=(${hexLong(longValue & 0xffffffff)})) wroteTo(${hexAddress(this._objOffset)})`);
    this.appendWord(longValue, SUPPRESS_LOG_MSG);
    this.appendWord(longValue >> 16, SUPPRESS_LOG_MSG);
  }

  public appendWord(wordValue: number, alreadyLogged: boolean = false) {
    if (alreadyLogged == false) {
      this.logMessage(`* OBJ[${this._id}]: append(Wv=(${hexWord(wordValue & 0xffff)})) wroteTo(${hexAddress(this._objOffset)})`);
      alreadyLogged = SUPPRESS_LOG_MSG;
    }
    this.appendByte(wordValue, alreadyLogged);
    this.appendByte(wordValue >> 8, alreadyLogged);
  }

  public appendByte(byteValue: number, alreadyLogged: boolean = false) {
    if (alreadyLogged == false) {
      this.logMessage(`* OBJ[${this._id}]: append(v=(${hexByte(byteValue & 0xff)})) wroteTo(${hexAddress(this._objOffset)})`);
      alreadyLogged = SUPPRESS_LOG_MSG;
    }
    this.append(byteValue, alreadyLogged);
  }

  private append(byteValue: number, alreadyLogged: boolean = false) {
    // append byte to end of image
    if (alreadyLogged == false) {
      this.logMessage(`* OBJ[${this._id}]: append(v=(${hexByte(byteValue & 0xff)})) wroteTo(${hexAddress(this._objOffset)})`);
    }
    this.ensureCapacity(this._objOffset + 64); // ensure we have room for 63 more bytes...
    this._objImageByteAr[this._objOffset++] = byteValue & 0xff;
    this.updateMax();
  }

  public read(offset: number): number {
    // read existing value from image
    let desiredValue: number = 0;
    this.ensureCapacity(offset + 1);
    //if (offset >= 0 && offset <= this._maxOffset - 1) {
    desiredValue = this._objImageByteAr[offset];
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
    this.ensureCapacity(offset + 1);
    //if (offset >= 0 && offset <= this._objOffset - 2) {
    desiredValue = this._objImageByteAr[offset];
    desiredValue |= this._objImageByteAr[offset + 1] << 8;
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
    this.ensureCapacity(this._objOffset + 4);
    desiredValue = this._objImageByteAr[this._objOffset++];
    desiredValue |= this._objImageByteAr[this._objOffset++] << 8;
    desiredValue |= this._objImageByteAr[this._objOffset++] << 16;
    desiredValue |= this._objImageByteAr[this._objOffset++] << 24;
    this.logMessage(`* OBJ: readLongNext() v=(${hexLong(desiredValue)}) from(${hexAddress(this._objOffset - 4)})`);
    return desiredValue;
  }

  public replaceByte(uint8: number, offset: number) {
    // replace existing value within image
    this.logMessage(`* OBJ: replaceByte(v=(${hexByte(uint8)}), addr(${hexAddress(offset)}))`);
    //if (offset >= 0 && offset <= this._objOffset - 1) {
    this.ensureCapacity(offset + 1);
    if (offset >= 0 && offset < this._objImageByteAr.length) {
      this._objImageByteAr[offset] = uint8;
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
    this.ensureCapacity(offset + 2);
    this._objImageByteAr[offset] = uint16 & 0xff;
    this._objImageByteAr[offset + 1] = (uint16 >> 8) & 0xff;
    //} else {
    //  this.logMessage(`* OBJ: ERROR BAD address! replaceWord(v=(${hexWord(uint16)}), addr(${hexAddress(offset)}))`);
    //}
  }

  public replaceLong(uint32: number, offset: number) {
    // replace existing value within image
    this.logMessage(`* OBJ: replaceLong(addr(${hexAddress(offset)})) (${hexLong(this.readLong(offset))}) -> (${hexLong(uint32)})`);
    //if (offset >= 0 && offset <= this._objOffset - 4) {
    this.ensureCapacity(offset + 4);
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

  private logMessageOutline(message: string): void {
    if (this.isLoggingOutline) {
      this.context.logger.logMessage(message);
    }
  }
}
