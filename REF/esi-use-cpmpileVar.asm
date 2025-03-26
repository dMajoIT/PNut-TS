
; -------------------------------------------------------

		call	@@compileindex		;compile index, checking for constant
		mov	al,bc_setup_reg_pi	;get index bytecode
		jnz	@@notregi		;if not constant index, got bytecode and reg
		mov	al,bc_setup_reg		;constant, revert to non-index bytecode
		add	esi,[con_value]		;add index into reg
@@notregi:	call	enter_obj		;enter setup bytecode
		mov	eax,esi			;sign-extend to express bottom/top reg addresses in one byte
		shl	eax,32-9
		sar	eax,32-9
		call	compile_rfvars		;compile rfvars for base register

; -------------------------------------------------------

		call	@@compileindex		;compile index, checking for constant
		mov	al,bc_setup_reg_pi	;get index bytecode
		jnz	@@notregi		;if not constant index, got bytecode and reg
		mov	al,bc_setup_reg		;constant, revert to non-index bytecode	TESTT could be optimized to use single bytecode by having two: one for $0xx and one for $1xx
		call	enter_obj		;enter setup bytecode
		mov	eax,esi			;get reg address plus index
		add	eax,[con_value]		;add index into reg
		jmp	@@regsignx
@@notregi:	call	enter_obj		;enter setup bytecode
		mov	eax,esi			;get reg address
@@regsignx:	shl	eax,32-9		;sign-extend address to express bottom/top reg addresses in one byte
		sar	eax,32-9
		call	compile_rfvars		;compile rfvars for base register

; -------------------------------------------------------
