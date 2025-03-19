/** @format */

// this is our common logging mechanism
//  TODO: make it context/runtime option aware

'use strict';

import { Context } from '../utils/context';
import { hexAddress, hexByte } from '../utils/formatUtils';

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
    }
    return desiredByte;
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
    }
    return desiredByte;
  }
}
