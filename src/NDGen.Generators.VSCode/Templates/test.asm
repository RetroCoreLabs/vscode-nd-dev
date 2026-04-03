% Test file for ND-100 Assembly Language

% Memory transfer instructions
LDA 1000        % Load accumulator directly
LDA d2000       % Load accumulator with decimal value
LDA 3000,B      % Load with base register
LDA I 4000      % Load indirect
LDA I 5000,B    % Load indirect with base register
LDA 6000,X      % Load with index register
LDA I 7000,X    % Load indirect with index register

% Jump instructions
JAF 100         % Jump on accumulator full
JAF 200,B       % Jump with base register
JAF *300        % Jump with relative addressing

% Register transfer instructions
MCL PANS        % Clear panel status
MST PANC        % Set panel control
TRA ACTL        % Transfer A to control

% System instructions
IOF             % I/O off
ION             % I/O on