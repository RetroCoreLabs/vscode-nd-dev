// This file contains type definitions for the extension
// It defines interfaces for instructions, registers, and the Debug Adapter Protocol

import * as vscode from 'vscode';

export interface Bit {
    Name: string;
    Description: string;
    Position: number;
    Size: number;
}

export interface EnumOption {
    Name: string;
    Value: string;
    Description: string | null;
}

export interface InstructionOperand {
    Name: string;
    Type: string | null;
    Description: string;
    Bits: Bit[] | string;
    EnumOptions: EnumOption[] | null;
}

export interface Instruction {
    Name: string;
    Opcode: string;
    Format: string;
    Description: string;
    DetailedDescription?: string;
    GeneratedBitFormat: string | null;
    Category: string;
    InstructionClass: string | null;
    Privilege: string;
    FlagsAffected: string[];
    Operands: InstructionOperand[];
    Visualization: string;
}

export interface Register {
    Name: string;
    Size: number;
    Description: string;
    Type: string | null;
    Bits: Bit[];
}

export interface InstructionData {
    [key: string]: Instruction;
}

export interface RegisterData {
    [key: string]: Register;
} 