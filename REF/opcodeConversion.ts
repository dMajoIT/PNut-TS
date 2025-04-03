// generated opcode table load

export enum eOpcode {
  oc_bitnot,
  oc_neg,
  oc_fneg,
  oc_abs,
  oc_fabs,
  oc_encod,
  oc_decod,
  oc_bmask,
  oc_ones,
  oc_sqrt,
  oc_fsqrt,
  oc_qlog,
  oc_qexp,
  oc_log2,
  oc_log10,
  oc_log,
  oc_exp2,
  oc_exp10,
  oc_exp,
  oc_shr,
  oc_shl,
  oc_sar,
  oc_ror,
  oc_rol,
  oc_rev,
  oc_zerox,
  oc_signx,
  oc_bitand,
  oc_bitxor,
  oc_bitor,
  oc_mul,
  oc_fmul,
  oc_div,
  oc_fdiv,
  oc_divu,
  oc_rem,
  oc_remu,
  oc_sca,
  oc_scas,
  oc_frac,
  oc_add,
  oc_fadd,
  oc_sub,
  oc_fsub,
  oc_pow,
  oc_fge,
  oc_fle,
  oc_addbits,
  oc_addpins,
  oc_lt,
  oc_flt,
  oc_ltu,
  oc_lte,
  oc_flte,
  oc_lteu,
  oc_e,
  oc_fe,
  oc_ne,
  oc_fne,
  oc_gte,
  oc_fgte,
  oc_gteu,
  oc_gt,
  oc_fgt,
  oc_gtu,
  oc_ltegt,
  oc_lognot,
  oc_lognot_name,
  oc_logand,
  oc_logand_name,
  oc_logxor,
  oc_logxor_name,
  oc_logor,
  oc_logor_name,
  oc_ternary,
}

// generated opcode table load

//		oc		op		prec	bytecode	ternary	binary	unary	assign	float	alias	hubcode
  this.opcodeValues.set(eOpcode.oc_bitnot, opcodeValue(eValueType.op_bitnot, 0, eByteCode.bc_bitnot, 0, 0, 1, 1, 0, 0, 0))   //  !
  this.opcodeValues.set(eOpcode.oc_neg, opcodeValue(eValueType.op_neg, 0, eByteCode.bc_neg, 0, 0, 1, 1, 1, 0, 0))   //  -	(uses op_sub symbol)
  this.opcodeValues.set(eOpcode.oc_fneg, opcodeValue(eValueType.op_fneg, 0, eByteCode.bc_fneg, 0, 0, 1, 0, 1, 0, 1))   //  -.	(uses op_fsub symbol)
  this.opcodeValues.set(eOpcode.oc_abs, opcodeValue(eValueType.op_abs, 0, eByteCode.bc_abs, 0, 0, 1, 1, 1, 0, 0))   //  ABS
  this.opcodeValues.set(eOpcode.oc_fabs, opcodeValue(eValueType.op_fabs, 0, eByteCode.bc_fabs, 0, 0, 1, 0, 1, 0, 1))   //  FABS
  this.opcodeValues.set(eOpcode.oc_encod, opcodeValue(eValueType.op_encod, 0, eByteCode.bc_encod, 0, 0, 1, 1, 0, 0, 0))   //  ENCOD
  this.opcodeValues.set(eOpcode.oc_decod, opcodeValue(eValueType.op_decod, 0, eByteCode.bc_decod, 0, 0, 1, 1, 0, 0, 0))   //  DECOD
  this.opcodeValues.set(eOpcode.oc_bmask, opcodeValue(eValueType.op_bmask, 0, eByteCode.bc_bmask, 0, 0, 1, 1, 0, 0, 0))   //  BMASK
  this.opcodeValues.set(eOpcode.oc_ones, opcodeValue(eValueType.op_ones, 0, eByteCode.bc_ones, 0, 0, 1, 1, 0, 0, 0))   //  ONES
  this.opcodeValues.set(eOpcode.oc_sqrt, opcodeValue(eValueType.op_sqrt, 0, eByteCode.bc_sqrt, 0, 0, 1, 1, 0, 0, 0))   //  SQRT
  this.opcodeValues.set(eOpcode.oc_fsqrt, opcodeValue(eValueType.op_fsqrt, 0, eByteCode.bc_fsqrt, 0, 0, 1, 0, 1, 0, 1))   //  FSQRT
  this.opcodeValues.set(eOpcode.oc_qlog, opcodeValue(eValueType.op_qlog, 0, eByteCode.bc_qlog, 0, 0, 1, 1, 0, 0, 0))   //  QLOG
  this.opcodeValues.set(eOpcode.oc_qexp, opcodeValue(eValueType.op_qexp, 0, eByteCode.bc_qexp, 0, 0, 1, 1, 0, 0, 0))   //  QEXP
  this.opcodeValues.set(eOpcode.oc_log2, opcodeValue(eValueType.op_log2, 0, eByteCode.bc_log2, 0, 0, 1, 0, 1, 0, 1))   //  LOG2
  this.opcodeValues.set(eOpcode.oc_log10, opcodeValue(eValueType.op_log10, 0, eByteCode.bc_log10, 0, 0, 1, 0, 1, 0, 1))   //  LOG10
  this.opcodeValues.set(eOpcode.oc_log, opcodeValue(eValueType.op_log, 0, eByteCode.bc_log, 0, 0, 1, 0, 1, 0, 1))   //  LOG
  this.opcodeValues.set(eOpcode.oc_exp2, opcodeValue(eValueType.op_exp2, 0, eByteCode.bc_exp2, 0, 0, 1, 0, 1, 0, 1))   //  EXP2
  this.opcodeValues.set(eOpcode.oc_exp10, opcodeValue(eValueType.op_exp10, 0, eByteCode.bc_exp10, 0, 0, 1, 0, 1, 0, 1))   //  EXP10
  this.opcodeValues.set(eOpcode.oc_exp, opcodeValue(eValueType.op_exp, 0, eByteCode.bc_exp, 0, 0, 1, 0, 1, 0, 1))   //  EXP
  this.opcodeValues.set(eOpcode.oc_shr, opcodeValue(eValueType.op_shr, 1, eByteCode.bc_shr, 0, 1, 0, 1, 0, 0, 0))   //  >>
  this.opcodeValues.set(eOpcode.oc_shl, opcodeValue(eValueType.op_shl, 1, eByteCode.bc_shl, 0, 1, 0, 1, 0, 0, 0))   //  <<
  this.opcodeValues.set(eOpcode.oc_sar, opcodeValue(eValueType.op_sar, 1, eByteCode.bc_sar, 0, 1, 0, 1, 0, 0, 0))   //  SAR
  this.opcodeValues.set(eOpcode.oc_ror, opcodeValue(eValueType.op_ror, 1, eByteCode.bc_ror, 0, 1, 0, 1, 0, 0, 0))   //  ROR
  this.opcodeValues.set(eOpcode.oc_rol, opcodeValue(eValueType.op_rol, 1, eByteCode.bc_rol, 0, 1, 0, 1, 0, 0, 0))   //  ROL
  this.opcodeValues.set(eOpcode.oc_rev, opcodeValue(eValueType.op_rev, 1, eByteCode.bc_rev, 0, 1, 0, 1, 0, 0, 0))   //  REV
  this.opcodeValues.set(eOpcode.oc_zerox, opcodeValue(eValueType.op_zerox, 1, eByteCode.bc_zerox, 0, 1, 0, 1, 0, 0, 0))   //  ZEROX
  this.opcodeValues.set(eOpcode.oc_signx, opcodeValue(eValueType.op_signx, 1, eByteCode.bc_signx, 0, 1, 0, 1, 0, 0, 0))   //  SIGNX
  this.opcodeValues.set(eOpcode.oc_bitand, opcodeValue(eValueType.op_bitand, 2, eByteCode.bc_bitand, 0, 1, 0, 1, 0, 0, 0))   //  &
  this.opcodeValues.set(eOpcode.oc_bitxor, opcodeValue(eValueType.op_bitxor, 3, eByteCode.bc_bitxor, 0, 1, 0, 1, 0, 0, 0))   //  ^
  this.opcodeValues.set(eOpcode.oc_bitor, opcodeValue(eValueType.op_bitor, 4, eByteCode.bc_bitor, 0, 1, 0, 1, 0, 0, 0))   //  |
  this.opcodeValues.set(eOpcode.oc_mul, opcodeValue(eValueType.op_mul, 5, eByteCode.bc_mul, 0, 1, 0, 1, 1, 0, 0))   //  *
  this.opcodeValues.set(eOpcode.oc_fmul, opcodeValue(eValueType.op_fmul, 5, eByteCode.bc_fmul, 0, 1, 0, 0, 1, 0, 1))   //  *.
  this.opcodeValues.set(eOpcode.oc_div, opcodeValue(eValueType.op_div, 5, eByteCode.bc_div, 0, 1, 0, 1, 1, 0, 0))   //  /
  this.opcodeValues.set(eOpcode.oc_fdiv, opcodeValue(eValueType.op_fdiv, 5, eByteCode.bc_fdiv, 0, 1, 0, 0, 1, 0, 1))   //  /.
  this.opcodeValues.set(eOpcode.oc_divu, opcodeValue(eValueType.op_divu, 5, eByteCode.bc_divu, 0, 1, 0, 1, 0, 0, 0))   //  +/
  this.opcodeValues.set(eOpcode.oc_rem, opcodeValue(eValueType.op_rem, 5, eByteCode.bc_rem, 0, 1, 0, 1, 0, 0, 0))   //  //
  this.opcodeValues.set(eOpcode.oc_remu, opcodeValue(eValueType.op_remu, 5, eByteCode.bc_remu, 0, 1, 0, 1, 0, 0, 0))   //  +//
  this.opcodeValues.set(eOpcode.oc_sca, opcodeValue(eValueType.op_sca, 5, eByteCode.bc_sca, 0, 1, 0, 1, 0, 0, 0))   //  SCA
  this.opcodeValues.set(eOpcode.oc_scas, opcodeValue(eValueType.op_scas, 5, eByteCode.bc_scas, 0, 1, 0, 1, 0, 0, 0))   //  SCAS
  this.opcodeValues.set(eOpcode.oc_frac, opcodeValue(eValueType.op_frac, 5, eByteCode.bc_frac, 0, 1, 0, 1, 0, 0, 0))   //  FRAC
  this.opcodeValues.set(eOpcode.oc_add, opcodeValue(eValueType.op_add, 6, eByteCode.bc_add, 0, 1, 0, 1, 1, 0, 0))   //  +
  this.opcodeValues.set(eOpcode.oc_fadd, opcodeValue(eValueType.op_fadd, 6, eByteCode.bc_fadd, 0, 1, 0, 0, 1, 0, 1))   //  +.
  this.opcodeValues.set(eOpcode.oc_sub, opcodeValue(eValueType.op_sub, 6, eByteCode.bc_sub, 0, 1, 0, 1, 1, 0, 0))   //  -
  this.opcodeValues.set(eOpcode.oc_fsub, opcodeValue(eValueType.op_fsub, 6, eByteCode.bc_fsub, 0, 1, 0, 0, 1, 0, 1))   //  -.
  this.opcodeValues.set(eOpcode.oc_pow, opcodeValue(eValueType.op_pow, 6, eByteCode.bc_pow, 0, 1, 0, 0, 1, 0, 1
))  this.opcodeValues.set(eOpcode.oc_fge, opcodeValue(eValueType.op_fge, 7, eByteCode.bc_fge, 0, 1, 0, 1, 1, 0, 0))   //  #>
  this.opcodeValues.set(eOpcode.oc_fle, opcodeValue(eValueType.op_fle, 7, eByteCode.bc_fle, 0, 1, 0, 1, 1, 0, 0))   //  <#
  this.opcodeValues.set(eOpcode.oc_addbits, opcodeValue(eValueType.op_addbits, 8, eByteCode.bc_addbits, 0, 1, 0, 1, 0, 0, 0))   //  ADDBITS
  this.opcodeValues.set(eOpcode.oc_addpins, opcodeValue(eValueType.op_addpins, 8, eByteCode.bc_addpins, 0, 1, 0, 1, 0, 0, 0))   //  ADDPINS
  this.opcodeValues.set(eOpcode.oc_lt, opcodeValue(eValueType.op_lt, 9, eByteCode.bc_lt, 0, 1, 0, 0, 1, 0, 0))   //  <
  this.opcodeValues.set(eOpcode.oc_flt, opcodeValue(eValueType.op_flt, 9, eByteCode.bc_flt, 0, 1, 0, 0, 1, 0, 1))   //  <.
  this.opcodeValues.set(eOpcode.oc_ltu, opcodeValue(eValueType.op_ltu, 9, eByteCode.bc_ltu, 0, 1, 0, 0, 0, 0, 0))   //  +<
  this.opcodeValues.set(eOpcode.oc_lte, opcodeValue(eValueType.op_lte, 9, eByteCode.bc_lte, 0, 1, 0, 0, 1, 0, 0))   //  <=
  this.opcodeValues.set(eOpcode.oc_flte, opcodeValue(eValueType.op_flte, 9, eByteCode.bc_flte, 0, 1, 0, 0, 1, 0, 1))   //  <=.
  this.opcodeValues.set(eOpcode.oc_lteu, opcodeValue(eValueType.op_lteu, 9, eByteCode.bc_lteu, 0, 1, 0, 0, 0, 0, 0))   //  +<=
  this.opcodeValues.set(eOpcode.oc_e, opcodeValue(eValueType.op_e, 9, eByteCode.bc_e, 0, 1, 0, 0, 1, 0, 0))   //  ==
  this.opcodeValues.set(eOpcode.oc_fe, opcodeValue(eValueType.op_fe, 9, eByteCode.bc_fe, 0, 1, 0, 0, 1, 0, 1))   //  ==.
  this.opcodeValues.set(eOpcode.oc_ne, opcodeValue(eValueType.op_ne, 9, eByteCode.bc_ne, 0, 1, 0, 0, 1, 0, 0))   //  <>
  this.opcodeValues.set(eOpcode.oc_fne, opcodeValue(eValueType.op_fne, 9, eByteCode.bc_fne, 0, 1, 0, 0, 1, 0, 1))   //  <>.
  this.opcodeValues.set(eOpcode.oc_gte, opcodeValue(eValueType.op_gte, 9, eByteCode.bc_gte, 0, 1, 0, 0, 1, 0, 0))   //  >=
  this.opcodeValues.set(eOpcode.oc_fgte, opcodeValue(eValueType.op_fgte, 9, eByteCode.bc_fgte, 0, 1, 0, 0, 1, 0, 1))   //  >=.
  this.opcodeValues.set(eOpcode.oc_gteu, opcodeValue(eValueType.op_gteu, 9, eByteCode.bc_gteu, 0, 1, 0, 0, 0, 0, 0))   //  +>=
  this.opcodeValues.set(eOpcode.oc_gt, opcodeValue(eValueType.op_gt, 9, eByteCode.bc_gt, 0, 1, 0, 0, 1, 0, 0))   //  >
  this.opcodeValues.set(eOpcode.oc_fgt, opcodeValue(eValueType.op_fgt, 9, eByteCode.bc_fgt, 0, 1, 0, 0, 1, 0, 1))   //  >.
  this.opcodeValues.set(eOpcode.oc_gtu, opcodeValue(eValueType.op_gtu, 9, eByteCode.bc_gtu, 0, 1, 0, 0, 0, 0, 0))   //  +>
  this.opcodeValues.set(eOpcode.oc_ltegt, opcodeValue(eValueType.op_ltegt, 9, eByteCode.bc_ltegt, 0, 1, 0, 0, 1, 0, 0))   //  <=>
  this.opcodeValues.set(eOpcode.oc_lognot, opcodeValue(eValueType.op_lognot, 10, eByteCode.bc_lognot, 0, 0, 1, 1, 0, 1, 0))   //  !!
  this.opcodeValues.set(eOpcode.oc_lognot_name, opcodeValue(eValueType.op_lognot, 10, eByteCode.bc_lognot, 0, 0, 1, 1, 0, 0, 0))   //  NOT
  this.opcodeValues.set(eOpcode.oc_logand, opcodeValue(eValueType.op_logand, 11, eByteCode.bc_logand, 0, 1, 0, 1, 0, 1, 0))   //  &&
  this.opcodeValues.set(eOpcode.oc_logand_name, opcodeValue(eValueType.op_logand, 11, eByteCode.bc_logand, 0, 1, 0, 1, 0, 0, 0))   //  AND
  this.opcodeValues.set(eOpcode.oc_logxor, opcodeValue(eValueType.op_logxor, 12, eByteCode.bc_logxor, 0, 1, 0, 1, 0, 1, 0))   //  ^^
  this.opcodeValues.set(eOpcode.oc_logxor_name, opcodeValue(eValueType.op_logxor, 12, eByteCode.bc_logxor, 0, 1, 0, 1, 0, 0, 0))   //  XOR
  this.opcodeValues.set(eOpcode.oc_logor, opcodeValue(eValueType.op_logor, 13, eByteCode.bc_logor, 0, 1, 0, 1, 0, 1, 0))   //  ||
  this.opcodeValues.set(eOpcode.oc_logor_name, opcodeValue(eValueType.op_logor, 13, eByteCode.bc_logor, 0, 1, 0, 1, 0, 0, 0))   //  OR
  this.opcodeValues.set(eOpcode.oc_ternary, opcodeValue(eValueType.op_ternary, 14, 0, 1, 0, 0, 1, 0, 0, 0))   //  ?
