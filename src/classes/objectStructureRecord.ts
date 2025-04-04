/** @format */

// this is our common logging mechanism
//  TODO: make it context/runtime option aware

'use strict';

import { Context } from '../utils/context';
import { eMemberType } from './objectStructures';

// 	struct record
// 	-------------
// 	word: size_of_struct_record (including this word)
// 	long: size_of_struct_memory
// 	member record(s)
// 	    long: member offset address
// 	    byte: type (0=byte, 1=word, 2=long, 3=struct + struct_record)
// 	    byte: member_name length
// 	    byte(s): "member_name"
// 	    byte: 1 if another member, 0 if end of record
//
export class ObjectStructureRecord {
  private context: Context;
  private isLogging: boolean = false;
  private _id: string;
  private _recordImage: Uint8Array;
  private readOffset: number = 0;

  constructor(ctx: Context, idString: string, recordImage: Uint8Array) {
    this.context = ctx;
    this._id = idString;
    this.isLogging = this.context.logOptions.logCompile;
    this._recordImage = recordImage;
  }

  get length(): number {
    return this._recordImage.length;
  }

  get memoryLength(): number {
    return this.readLong(2);
  }

  public nextLong(): number {
    let desiredLong: number = 0;
    desiredLong |= this.nextWord();
    desiredLong |= this.nextWord() << 16;
    return desiredLong;
  }

  public nextWord(): number {
    let desiredWord: number = 0;
    desiredWord |= this.nextByte();
    desiredWord |= this.nextByte() << 8;
    return desiredWord;
  }

  public nextByte(): number {
    let desiredByte: number = 0;
    if (this.readOffset >= 0 && this.readOffset < this._recordImage.length) {
      desiredByte = this._recordImage[this.readOffset++];
    } else {
      // [error_INTERNAL]
      throw new Error(`OSRcd: nextByte() bad read offset ${this.readOffset} record-${this._id}`);
    }
    return desiredByte;
  }

  public peekByte(): number {
    // return byte at current offset without incrementing offset
    let desiredByte: number = 0;
    if (this.readOffset >= 0 && this.readOffset < this._recordImage.length) {
      desiredByte = this.readByte(this.readOffset);
    } else {
      // [error_INTERNAL]
      throw new Error(`OSRcd: peekByte() bad read offset ${this.readOffset} record-${this._id}`);
    }
    return desiredByte;
  }

  public peekWord(): number {
    let desiredWord: number = 0;
    desiredWord |= this.readByte(this.readOffset + 0);
    desiredWord |= this.readByte(this.readOffset + 1) << 8;
    return desiredWord;
  }

  public skipToName(): [boolean, number, number] {
    // called when at type byte.  If type is structure then return offset to structure and skip past it
    let structureFoundStatus: boolean = false;
    let structureOffset: number = 0;
    const typeByte = this.nextByte();
    if (typeByte == eMemberType.MT_STRUCT) {
      structureFoundStatus = true;
      structureOffset = this.readOffset;
      const rcdLength = this.nextWord();
      this.readOffset += rcdLength - 2;
    }
    return [structureFoundStatus, typeByte, structureOffset];
  }

  public recordWithinStructureRecord(internalRcdOffset: number): ObjectStructureRecord {
    // return internal structure record from within current record
    //  NOTE: this must be passed the value returned by skipToName()
    if (internalRcdOffset >= 0 && internalRcdOffset < this._recordImage.length) {
      this.readOffset = internalRcdOffset;
    } else {
      // [error_INTERNAL]
      throw new Error(`OSRcd: recordWithinStructureRecord() bad read offset ${internalRcdOffset} record-${this._id}`);
    }
    const recordSize: number = this.peekWord();
    const desiredRecord: Uint8Array = new Uint8Array(recordSize);
    if (recordSize > 0) {
      desiredRecord.set(this._recordImage.subarray(this.readOffset, this.readOffset + recordSize));
    }
    return new ObjectStructureRecord(this.context, `internalRCDofs(${this.readOffset})`, desiredRecord);
  }

  public readString(): string {
    // assume that we are pointed to the length byte
    //  then return following len bytes as string
    const stringLength = this.nextByte();
    const subset = this._recordImage.subarray(this.readOffset, this.readOffset + stringLength);
    const desiredString: string = String.fromCharCode(...subset);
    this.readOffset += stringLength;
    return desiredString;
  }

  public readLong(offset: number): number {
    let desiredLong: number = 0;
    desiredLong |= this.readWord(offset + 0);
    desiredLong |= this.readWord(offset + 2) << 16;
    return desiredLong;
  }

  public readWord(offset: number): number {
    let desiredWord: number = 0;
    desiredWord |= this.readByte(offset + 0);
    desiredWord |= this.readByte(offset + 1) << 8;
    return desiredWord;
  }

  public readByte(offset: number): number {
    let desiredByte: number = 0;
    if (offset >= 0 && offset < this._recordImage.length) {
      desiredByte = this._recordImage[offset];
    } else {
      // [error_INTERNAL]
      throw new Error(`OSRcd: readByte() bad read offset ${offset} record-${this._id}`);
    }
    return desiredByte;
  }
}
