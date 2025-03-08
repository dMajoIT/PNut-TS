/** @format */

// this is our common logging mechanism
//  TODO: make it context/runtime option aware

'use strict';

import { off } from 'process';
import { Context } from '../utils/context';
import { hexAddress, hexByte } from '../utils/formatUtils';

// src/classes/objectStructures.ts

//  Struct-definition record
//
//  struct_name = existing_struct_name
//
//  struct_name({byte/word/long/struct} member_name{[count]}, ...)
//
// 	struct element
// 	--------------
// 	type = type_con_struct
// 	value = struct id
//
// 	struct record
// 	-------------
// 	word: size_of_struct_record (including this word)
// 	long: size_of_struct
// 	member record(s)
// 	    long: member offset address
// 	    byte: type (0=byte, 1=word, 2=long, 3=struct + struct_record)
// 	    byte: member_name length
// 	    byte(s): "member_name"
// 	    byte: 1 if another member, 0 if end of record
//

enum eMemberType {
  MT_BYTE,
  MT_WORD,
  MT_LONG,
  MT_STRUCT,
  MT_Unknown
}

export class ObjectStructures {
  private context: Context;
  private isLogging: boolean = false;
  private _id: string;

  static readonly MAX_STRUCTURES: number = 0x1000; // PNut  struct_id_limit := $1000;
  static readonly INITIAL_SIZE: number = 1024; // Initial size for the Uint8Array

  private _objStructRecordOffsets: number[] = [];
  private _objStructureSet: Uint8Array;
  private _objStructureOffset: number = 0; // current index into OBJ image
  private _objReadStructureOffset: number = 0; // read index into OBJ image
  // structure support
  private _structIdNext: number = 0;
  private _structRecordSize: number = 0;
  private _structMemorySize: number = 0;
  private _structStartOffset: number = 0;

  constructor(ctx: Context, idString: string) {
    this.context = ctx;
    this._id = idString;
    this.isLogging = this.context.logOptions.logCompile;
    this._objStructureSet = new Uint8Array(ObjectStructures.INITIAL_SIZE);
  }

  [Symbol.iterator]() {
    return this._objStructureSet.values();
  }

  get length(): number {
    return this._objStructureOffset;
  }

  get haveMaxStructures(): boolean {
    return this._structIdNext >= ObjectStructures.MAX_STRUCTURES ? true : false;
  }

  public setOffset(offset: number) {
    this._objReadStructureOffset = offset;
  }

  public readNext(): number {
    let desiredValue: number = 0;
    desiredValue = this._objStructureSet[this._objReadStructureOffset++];
    this.logMessage(`* OBJSTRUCT: readnext(${hexAddress(this._objReadStructureOffset - 1)}) -> v=(${hexByte(desiredValue)})`);
    return desiredValue;
  }

  public readRecord(recordId: number): Uint8Array {
    // retrieve the record from the set of structure-definition records
    let desiredRecord: Uint8Array = new Uint8Array();
    let desiredRcdLen: number = 0;
    if (recordId >= 0 && recordId < this._objStructRecordOffsets.length) {
      const recordOffset = this._objStructRecordOffsets[recordId];
      desiredRcdLen = (this._objStructureSet[recordOffset] << 0) | this._objStructureSet[recordOffset + 1];
      desiredRecord = new Uint8Array(desiredRcdLen);
      if (desiredRcdLen > 0) {
        desiredRecord.set(this._objStructureSet.subarray(recordOffset, recordOffset + desiredRcdLen));
      }
    }
    return desiredRecord;
  }

  public beginRecord() {
    // starting new record, record offset into table for new ID
    //  reset accumulated record size and memory size
    //const newRecordId: number = this._objStructRecordOffsets.length;
    this._structStartOffset = this._objStructureOffset;
    this._objStructRecordOffsets.push(this._structStartOffset);
    this._structRecordSize = 0;
    this._structMemorySize = 0;
  }

  public endRecord() {
    // record accumulated record size and memory size into record
    this.replaceWord(this._structStartOffset, this._structRecordSize);
    this.replaceLong(this._structStartOffset + 2, this._structMemorySize);
  }

  public enterSymbolName(name: string) {
    // record name into record, length first
    if (name !== undefined && name.length > 0 && name.length < 32) {
      this.enterByte(name.length);
      for (let index = 0; index < name.length; index++) {
        this.enterByte(name.charCodeAt(index));
      }
    } else {
      this.context.logger.errorMsg(`ERROR: ObjectStructures() bad name!`);
    }
  }

  public readLongAt(offset: number, buffer: Uint8Array): number {
    let longValue: number = 0;
    longValue |= buffer[offset + 0];
    longValue |= buffer[offset + 1] << 8;
    longValue |= buffer[offset + 2] << 16;
    longValue |= buffer[offset + 3] << 24;
    return longValue;
  }

  public enterSubStructure(recordId: number): number {
    // PNut @@enter_struct:
    const existingRecord = this.readRecord(recordId);
    const structSize = this.readLongAt(2, existingRecord);
    for (let index = 0; index < existingRecord.length; index++) {
      this.enterByte(existingRecord[index]);
    }
    return structSize;
  }

  public enterLong(uint32Value: bigint) {
    const valueAsNumber = Number(uint32Value & BigInt(0xffffffff));
    this.enterByte(valueAsNumber);
    this.enterByte(valueAsNumber >> 8);
    this.enterByte(valueAsNumber >> 16);
    this.enterByte(valueAsNumber >> 24);
  }

  public enterWord(uint16Value: number) {
    this.enterByte(uint16Value);
    this.enterByte(uint16Value >> 8);
  }

  public enterByte(uint8Value: number) {
    // append byte to end of image
    this.logMessage(`* OBJSTRUCT: append(v=(${hexByte(uint8Value)})) wroteTo(${hexAddress(this._objStructureOffset)})`);
    this.ensureCapacity(this._objStructureOffset + 1);
    this._objStructureSet[this._objStructureOffset++] = uint8Value & 0xff;
  }

  private replaceLong(offset: number, value: number) {
    this.replaceByte(offset, value);
    this.replaceByte(offset + 1, value >> 8);
    this.replaceByte(offset + 2, value >> 16);
    this.replaceByte(offset + 3, value >> 24);
  }

  private replaceWord(offset: number, value: number) {
    this.replaceByte(offset, value);
    this.replaceByte(offset + 1, value >> 8);
  }

  private replaceByte(offset: number, value: number) {
    if (offset >= 0 && offset <= this._objStructureOffset) {
      this.logMessage(`* OBJSTRUCT: replace(v=(${hexByte(value)})) wroteTo(${hexAddress(offset)})`);
      this._objStructureSet[offset] = value & 0xff;
    }
  }

  private ensureCapacity(neededCapacity: number) {
    if (neededCapacity > this._objStructureSet.length) {
      // our array grows by a INITIAL_SIZE at a time
      const newCapacity = this._objStructureSet.length + ObjectStructures.INITIAL_SIZE;
      const newBuffer = new Uint8Array(newCapacity);
      newBuffer.set(this._objStructureSet);
      this._objStructureSet = newBuffer;
    }
  }

  public read(offset: number): number {
    // read existing value from image
    let desiredValue: number = 0;
    if (offset >= 0 && offset <= this._objStructureOffset - 1) {
      desiredValue = this._objStructureSet[offset];
    }
    return desiredValue;
  }

  public reset() {
    // effectively empty our image
    this._objStructureOffset = 0; // call method, so logs
    this._objReadStructureOffset = 0;
    this._objStructRecordOffsets = [];
    this.logMessage(`* OBJSTRUCT: reset()`);
  }

  private logMessage(message: string): void {
    if (this.isLogging) {
      this.context.logger.logMessage(message);
    }
  }
}
