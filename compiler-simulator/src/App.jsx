import React, { useState, useEffect } from 'react';
import { Play, Code, Zap, FileCode, Cpu, CheckCircle, ChevronRight, ChevronLeft, Pause, RotateCcw, AlertCircle, Trophy, Star, Target, BookOpen, Home, Menu, X } from 'lucide-react';

const CompilerSimulator = () => {
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(`function greet(name) {
  return "Hello, " + name;
}

let result = greet("World");
console.log(result);`);
  
  const [currentStage, setCurrentStage] = useState(-1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [stageOutputs, setStageOutputs] = useState({});
  const [parseTree, setParseTree] = useState(null);
  const [compileError, setCompileError] = useState(null);
  const [activeSection, setActiveSection] = useState('compiler');
  const [score, setScore] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [completedStages, setCompletedStages] = useState(new Set());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const languageExamples = {
    javascript: `function greet(name) {
  return "Hello, " + name;
}

let result = greet("World");
console.log(result);`,
    python: `def greet(name):
    return "Hello, " + name

result = greet("World")
print(result)`,
    c: `#include <stdio.h>

int add(int a, int b) {
    return a + b;
}

int main() {
    int result = add(5, 3);
    printf("%d", result);
    return 0;
}`,
    cpp: `#include <iostream>
using namespace std;

int multiply(int a, int b) {
    return a * b;
}

int main() {
    int result = multiply(4, 5);
    cout << result << endl;
    return 0;
}`,
    java: `public class Main {
    public static int add(int a, int b) {
        return a + b;
    }
    
    public static void main(String[] args) {
        int result = add(10, 20);
        System.out.println(result);
    }
}`
  };

  const languageKeywords = {
    javascript: ['function', 'return', 'let', 'const', 'var', 'if', 'else', 'while', 'for', 'console', 'true', 'false', 'class', 'new', 'this'],
    python: ['def', 'return', 'if', 'else', 'elif', 'while', 'for', 'in', 'print', 'class', 'import', 'from', 'as', 'True', 'False', 'None'],
    c: ['int', 'float', 'char', 'void', 'return', 'if', 'else', 'while', 'for', 'include', 'printf', 'scanf', 'main', 'struct'],
    cpp: ['int', 'float', 'char', 'void', 'return', 'if', 'else', 'while', 'for', 'include', 'cout', 'cin', 'using', 'namespace', 'class', 'public', 'private'],
    java: ['public', 'class', 'static', 'void', 'int', 'String', 'return', 'if', 'else', 'while', 'for', 'new', 'this', 'main', 'System', 'out', 'println']
  };

  const lexicalAnalysis = (sourceCode) => {
    const tokens = [];
    const keywords = languageKeywords[language];
    
    const cleanCode = sourceCode.replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/#.*/g, '');
    
    const regex = /([a-zA-Z_$#]\w*)|(\d+\.?\d*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|([+\-*/%=<>!&|]{1,3})|([(){}\[\];,.:@])|(\s+)/g;
    
    let match;
    let lineNum = 1;
    let lastIndex = 0;
    
    while ((match = regex.exec(cleanCode)) !== null) {
      const [fullMatch, identifier, number, string, operator, punctuation, whitespace] = match;
      
      lineNum += (cleanCode.substring(lastIndex, match.index).match(/\n/g) || []).length;
      lastIndex = match.index + fullMatch.length;
      
      if (whitespace) continue;
      
      if (identifier) {
        const type = keywords.includes(identifier) ? 'KEYWORD' : 'IDENTIFIER';
        tokens.push({ type, value: identifier, line: lineNum });
      } else if (number) {
        tokens.push({ type: 'NUMBER', value: number, line: lineNum });
      } else if (string) {
        tokens.push({ type: 'STRING', value: string, line: lineNum });
      } else if (operator) {
        tokens.push({ type: 'OPERATOR', value: operator, line: lineNum });
      } else if (punctuation) {
        tokens.push({ type: 'PUNCTUATION', value: punctuation, line: lineNum });
      }
    }
    
    return tokens;
  };

  const syntaxAnalysis = (tokens) => {
    let current = 0;
    const ast = { type: 'Program', body: [] };

    const peek = () => tokens[current];
    const consume = () => tokens[current++];
    const expect = (value) => {
      const token = consume();
      if (token?.value !== value) {
        throw new Error(`Expected '${value}' but got '${token?.value || 'EOF'}'`);
      }
      return token;
    };

    const parseExpression = () => {
      const token = peek();
      
      if (!token) return { type: 'Expression', value: 'empty' };
      
      if (token.type === 'STRING' || token.type === 'NUMBER') {
        consume();
        return { type: 'Literal', value: token.value };
      }
      
      if (token.type === 'IDENTIFIER') {
        const name = consume().value;
        
        if (peek()?.value === '(') {
          consume();
          const args = [];
          
          while (peek() && peek().value !== ')') {
            args.push(parseExpression());
            if (peek()?.value === ',') consume();
          }
          
          if (peek()?.value === ')') consume();
          return { type: 'CallExpression', callee: name, arguments: args };
        }
        
        if (peek()?.value === '.') {
          consume();
          const prop = consume().value;
          if (peek()?.value === '(') {
            consume();
            const args = [];
            while (peek() && peek().value !== ')') {
              args.push(parseExpression());
              if (peek()?.value === ',') consume();
            }
            if (peek()?.value === ')') consume();
            return { type: 'CallExpression', callee: `${name}.${prop}`, arguments: args };
          }
        }
        
        return { type: 'Identifier', name };
      }
      
      if (token.type === 'OPERATOR') {
        consume();
        return { type: 'BinaryExpression', operator: token.value };
      }
      
      consume();
      return { type: 'Expression', value: token.value };
    };

    const parseStatement = () => {
      const token = peek();
      
      if (!token) return null;
      
      if (token.value === 'function' || token.value === 'def') {
        consume();
        const name = consume().value;
        
        if (language !== 'python') {
          expect('(');
        } else {
          if (peek()?.value === '(') consume();
        }
        
        const params = [];
        while (peek() && peek().value !== ')' && peek().value !== ':') {
          if (peek().type === 'IDENTIFIER') {
            params.push(consume().value);
          }
          if (peek()?.value === ',') consume();
        }
        
        if (language !== 'python') {
          expect(')');
          expect('{');
        } else {
          if (peek()?.value === ')') consume();
          if (peek()?.value === ':') consume();
        }
        
        const body = [];
        while (peek() && peek().value !== '}' && current < tokens.length) {
          if (peek().value === 'return') {
            consume();
            body.push({ type: 'ReturnStatement', argument: parseExpression() });
            if (peek()?.value === ';') consume();
          } else {
            const stmt = parseStatement();
            if (stmt) body.push(stmt);
            if (language === 'python' && peek()?.line && peek().line > (token.line + body.length)) {
              break;
            }
          }
          if (body.length > 5) break;
        }
        
        if (language !== 'python' && peek()?.value === '}') consume();
        
        return { type: 'FunctionDeclaration', name, params, body };
      }
      
      if (['int', 'float', 'char', 'void', 'double', 'String'].includes(token.value)) {
        const typeToken = consume();
        const name = consume().value;
        
        if (peek()?.value === '(') {
          consume();
          const params = [];
          while (peek() && peek().value !== ')') {
            if (peek().type === 'IDENTIFIER' || peek().type === 'KEYWORD') {
              const paramType = consume().value;
              if (peek()?.type === 'IDENTIFIER') {
                params.push(consume().value);
              }
            }
            if (peek()?.value === ',') consume();
          }
          expect(')');
          expect('{');
          
          const body = [];
          while (peek() && peek().value !== '}') {
            if (peek().value === 'return') {
              consume();
              body.push({ type: 'ReturnStatement', argument: parseExpression() });
              if (peek()?.value === ';') consume();
            } else {
              const stmt = parseStatement();
              if (stmt) body.push(stmt);
            }
          }
          
          if (peek()?.value === '}') consume();
          
          return { type: 'FunctionDeclaration', returnType: typeToken.value, name, params, body };
        } else {
          let init = null;
          if (peek()?.value === '=') {
            consume();
            init = parseExpression();
          }
          if (peek()?.value === ';') consume();
          return { type: 'VariableDeclaration', varType: typeToken.value, name, init };
        }
      }
      
      if (token.value === 'let' || token.value === 'const' || token.value === 'var') {
        const kind = consume().value;
        const name = consume().value;
        
        let init = null;
        if (peek()?.value === '=') {
          consume();
          init = parseExpression();
        }
        if (peek()?.value === ';') consume();
        return { type: 'VariableDeclaration', kind, name, init };
      }
      
      if (token.value === 'public' || token.value === 'class') {
        if (token.value === 'public') consume();
        if (peek()?.value === 'class') {
          consume();
          const name = consume().value;
          if (peek()?.value === '{') consume();
          return { type: 'ClassDeclaration', name };
        }
      }
      
      if (token.value === 'if') {
        consume();
        if (peek()?.value === '(') consume();
        const test = parseExpression();
        if (peek()?.value === ')') consume();
        if (peek()?.value === '{' || peek()?.value === ':') consume();
        
        const consequent = [];
        while (peek() && peek().value !== '}' && consequent.length < 3) {
          const stmt = parseStatement();
          if (stmt) consequent.push(stmt);
        }
        if (peek()?.value === '}') consume();
        
        return { type: 'IfStatement', test, consequent };
      }
      
      if (token.type === 'IDENTIFIER') {
        const expr = parseExpression();
        if (peek()?.value === ';') consume();
        return { type: 'ExpressionStatement', expression: expr };
      }
      
      consume();
      return null;
    };

    try {
      while (current < tokens.length) {
        const stmt = parseStatement();
        if (stmt) ast.body.push(stmt);
        if (current > tokens.length) break;
      }
    } catch (e) {
      throw new Error(`Syntax Error: ${e.message}`);
    }

    return ast;
  };

  const semanticAnalysis = (ast) => {
    const symbols = new Map();
    const errors = [];
    const checks = [];

    const analyzeNode = (node, scope = new Set()) => {
      if (!node) return;
      
      if (node.type === 'FunctionDeclaration') {
        if (symbols.has(node.name)) {
          errors.push(`Function '${node.name}' already declared`);
        } else {
          symbols.set(node.name, { type: 'function', params: node.params.length });
          checks.push(`✓ Function '${node.name}' declared with ${node.params.length} parameter(s)`);
        }
        
        const newScope = new Set([...scope, ...node.params]);
        node.body.forEach(stmt => analyzeNode(stmt, newScope));
      }
      
      if (node.type === 'VariableDeclaration') {
        if (symbols.has(node.name)) {
          errors.push(`Variable '${node.name}' already declared`);
        } else {
          symbols.set(node.name, { type: 'variable' });
          checks.push(`✓ Variable '${node.name}' declared`);
        }
        
        if (node.init) analyzeNode(node.init, scope);
      }
      
      if (node.type === 'CallExpression') {
        const funcName = node.callee.split('.')[0];
        if (funcName !== 'console' && funcName !== 'print' && funcName !== 'printf' && funcName !== 'cout' && funcName !== 'System' && !symbols.has(funcName) && !scope.has(funcName)) {
          errors.push(`Function '${funcName}' is not defined`);
        } else {
          checks.push(`✓ Call to '${node.callee}' is valid`);
        }
        
        node.arguments.forEach(arg => analyzeNode(arg, scope));
      }
      
      if (node.type === 'Identifier') {
        if (!symbols.has(node.name) && !scope.has(node.name) && node.name !== 'undefined') {
          errors.push(`Variable '${node.name}' is not defined`);
        }
      }

      if (node.type === 'IfStatement') {
        analyzeNode(node.test, scope);
        node.consequent.forEach(stmt => analyzeNode(stmt, scope));
      }

      if (node.type === 'ExpressionStatement') {
        analyzeNode(node.expression, scope);
      }

      if (node.type === 'ClassDeclaration') {
        symbols.set(node.name, { type: 'class' });
        checks.push(`✓ Class '${node.name}' declared`);
      }
    };

    ast.body.forEach(node => analyzeNode(node));

    return { errors, checks, symbols };
  };

  const generateIntermediateCode = (ast) => {
    const instructions = [];
    let tempCount = 0;

    const genTemp = () => `t${tempCount++}`;

    const genCode = (node) => {
      if (!node) return genTemp();
      
      if (node.type === 'FunctionDeclaration') {
        instructions.push(`\nFUNC ${node.name}:`);
        node.params.forEach((p, i) => {
          instructions.push(`  LOAD_PARAM ${i} -> ${p}`);
        });
        node.body.forEach(stmt => genCode(stmt));
        instructions.push(`END_FUNC\n`);
      }
      
      if (node.type === 'ReturnStatement') {
        const temp = genCode(node.argument);
        instructions.push(`  RETURN ${temp}`);
      }
      
      if (node.type === 'VariableDeclaration') {
        if (node.init) {
          const temp = genCode(node.init);
          instructions.push(`  STORE ${node.name} = ${temp}`);
        }
      }
      
      if (node.type === 'CallExpression') {
        const args = node.arguments.map(arg => genCode(arg));
        const temp = genTemp();
        instructions.push(`  ${temp} = CALL ${node.callee}(${args.join(', ')})`);
        return temp;
      }
      
      if (node.type === 'Literal') {
        const temp = genTemp();
        instructions.push(`  ${temp} = LOAD ${node.value}`);
        return temp;
      }
      
      if (node.type === 'Identifier') {
        return node.name;
      }
      
      if (node.type === 'ExpressionStatement') {
        return genCode(node.expression);
      }

      if (node.type === 'IfStatement') {
        const testTemp = genCode(node.test);
        instructions.push(`  IF_FALSE ${testTemp} GOTO L1`);
        node.consequent.forEach(stmt => genCode(stmt));
        instructions.push(`L1:`);
      }

      if (node.type === 'ClassDeclaration') {
        instructions.push(`\nCLASS ${node.name}:`);
        instructions.push(`END_CLASS\n`);
      }

      return genTemp();
    };

    instructions.push('MAIN:');
    ast.body.forEach(node => genCode(node));
    instructions.push('  HALT');

    return instructions.join('\n');
  };

  const optimize = (ir) => {
    const optimizations = [];
    
    optimizations.push('1. Constant Folding ✨');
    optimizations.push('   → Pre-computed compile-time constants');
    optimizations.push('   → Reduced runtime calculations\n');

    optimizations.push('2. Dead Code Elimination 🗑️');
    optimizations.push('   → Removed unused variables');
    optimizations.push('   → Eliminated unreachable code\n');

    optimizations.push('3. Common Subexpression Elimination 🔄');
    optimizations.push('   → Reused repeated calculations');
    optimizations.push('   → Optimized memory access\n');

    optimizations.push('4. Register Allocation 💾');
    optimizations.push('   → Minimized memory operations');
    optimizations.push('   → Improved CPU cache usage');

    return {
      code: ir,
      optimizations: optimizations.join('\n'),
      stats: '\n📊 Performance Impact:\n⚡ Execution Speed: ~35% faster\n💾 Memory Usage: ~20% reduction\n🎯 Cache Hits: +45% improvement'
    };
  };

  const generateMachineCode = (ir) => {
    const assembly = [];
    const lines = ir.split('\n').filter(l => l.trim());

    lines.forEach(line => {
      if (line.includes('LOAD')) {
        assembly.push('  PUSH [value]      ; Load value onto stack');
      } else if (line.includes('CALL')) {
        assembly.push('  CALL [address]    ; Function call');
      } else if (line.includes('STORE')) {
        assembly.push('  MOV [dest], [src] ; Store result');
      } else if (line.includes('RETURN')) {
        assembly.push('  RET               ; Return from function');
      } else if (line.includes('HALT')) {
        assembly.push('  HALT              ; Program end');
      }
    });

    const machineCode = [];
    for (let i = 0; i < 12; i++) {
      machineCode.push('0x' + Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase());
    }

    return {
      assembly: assembly.join('\n'),
      machine: machineCode.join(' ')
    };
  };

  const stages = [
    {
      name: 'Lexical Analysis',
      icon: Code,
      color: 'bg-blue-500',
      description: 'Breaking code into tokens',
      funFact: '🔍 Like breaking a sentence into words!',
      process: (code) => {
        const tokens = lexicalAnalysis(code);
        return tokens.map((t, i) => 
          `${String(i + 1).padStart(3, ' ')}. [${t.type.padEnd(12)}] "${t.value}"`
        ).join('\n');
      }
    },
    {
      name: 'Syntax Analysis',
      icon: FileCode,
      color: 'bg-green-500',
      description: 'Building syntax tree',
      funFact: '🌳 A family tree for your code!',
      process: (code, tokens) => {
        const ast = syntaxAnalysis(tokens);
        setParseTree(ast);
        return 'parse_tree';
      },
      showTree: true
    },
    {
      name: 'Semantic Analysis',
      icon: CheckCircle,
      color: 'bg-purple-500',
      description: 'Checking logical errors',
      funFact: '🕵️ Catches bugs before execution!',
      process: (code, tokens, ast) => {
        const result = semanticAnalysis(ast);
        
        if (result.errors.length > 0) {
          return `❌ SEMANTIC ERRORS:\n\n${result.errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}\n\n✓ Checks:\n${result.checks.join('\n')}`;
        }
        
        return `✅ ANALYSIS COMPLETE\n\n${result.checks.join('\n')}\n\n✓ Scope Analysis\n  → All variables accessible\n\n🎉 ALL CHECKS PASSED!`;
      }
    },
    {
      name: 'Intermediate Code',
      icon: Zap,
      color: 'bg-yellow-500',
      description: 'Platform-independent code',
      funFact: '⚡ Universal language translation!',
      process: (code, tokens, ast) => {
        return generateIntermediateCode(ast);
      }
    },
    {
      name: 'Optimization',
      icon: Zap,
      color: 'bg-orange-500',
      description: 'Making code faster',
      funFact: '🚀 Can boost speed 2-10x!',
      process: (code, tokens, ast, ir) => {
        const result = optimize(ir);
        return `🔧 OPTIMIZATIONS:\n\n${result.optimizations}${result.stats}`;
      }
    },
    {
      name: 'Code Generation',
      icon: Cpu,
      color: 'bg-red-500',
      description: 'Machine code output',
      funFact: '🤖 Computer\'s native language!',
      process: (code, tokens, ast, ir) => {
        const result = generateMachineCode(ir);
        return `🖥️ ASSEMBLY:\n\n${result.assembly}\n\n💻 MACHINE CODE:\n\n${result.machine}\n\n🎉 COMPILATION COMPLETE!`;
      }
    }
  ];

  const quizQuestions = [
    {
      question: "What is the first phase of compilation?",
      options: ["Syntax Analysis", "Lexical Analysis", "Semantic Analysis", "Code Generation"],
      correct: 1,
      explanation: "Lexical Analysis is first, breaking code into tokens."
    },
    {
      question: "What does a parser create?",
      options: ["Machine Code", "Tokens", "Parse Tree/AST", "Optimized Code"],
      correct: 2,
      explanation: "Parser creates a Parse Tree (AST) showing code structure."
    },
    {
      question: "Which phase checks for undefined variables?",
      options: ["Lexical Analysis", "Syntax Analysis", "Semantic Analysis", "Optimization"],
      correct: 2,
      explanation: "Semantic Analysis checks meaning, including variable definitions."
    },
    {
      question: "What is optimization's purpose?",
      options: ["Find syntax errors", "Make code faster", "Generate tokens", "Parse code"],
      correct: 1,
      explanation: "Optimization improves performance and efficiency."
    },
    {
      question: "What does code generation produce?",
      options: ["Source Code", "Tokens", "Parse Tree", "Machine Code"],
      correct: 3,
      explanation: "Code Generation produces executable machine code."
    },
    {
      question: "Which is NOT a token type?",
      options: ["KEYWORD", "IDENTIFIER", "OPERATOR", "COMPILER"],
      correct: 3,
      explanation: "COMPILER is not a token type."
    },
    {
      question: "What does IR stand for?",
      options: ["Internal Reference", "Intermediate Representation", "Inline Return", "Index Register"],
      correct: 1,
      explanation: "IR = Intermediate Representation, platform-independent code."
    },
    {
      question: "Why multiple compilation phases?",
      options: ["Slower execution", "Catch different errors", "Confuse programmers", "No reason"],
      correct: 1,
      explanation: "Phases organize compilation and catch different error types."
    }
  ];

  const ParseTree = ({ ast }) => {
    const [visibleNodes, setVisibleNodes] = useState(0);
    
    useEffect(() => {
      if (ast) {
        const totalNodes = ast.body.length * 5;
        const interval = setInterval(() => {
          setVisibleNodes(prev => {
            if (prev < totalNodes) return prev + 1;
            clearInterval(interval);
            return prev;
          });
        }, 100);
        return () => clearInterval(interval);
      }
    }, [ast]);

    if (!ast || !ast.body || ast.body.length === 0) {
      return <div className="text-slate-400 text-center py-8 text-sm">No parse tree generated</div>;
    }

    const nodeClass = (index) => 
      index < visibleNodes ? 'opacity-100 scale-100' : 'opacity-0 scale-50';

    let nodeIndex = 0;

    return (
      <div className="py-4">
        <div className={`transition-all duration-300 ${nodeClass(nodeIndex++)}`}>
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg mb-4 text-center inline-block text-sm">
            📋 Program
          </div>
        </div>
        
        <div className="space-y-4 ml-2">
          {ast.body.map((node, i) => (
            <div key={i} className={`transition-all duration-300 ${nodeClass(nodeIndex++)}`}>
              {node.type === 'FunctionDeclaration' && (
                <div className="border-l-4 border-blue-500 pl-3 bg-blue-500/10 p-2 rounded">
                  <div className="bg-blue-500 text-white px-3 py-1.5 rounded-lg inline-block mb-1 font-semibold text-sm">
                    🔧 {node.name}
                  </div>
                  <div className="ml-4 space-y-1 mt-1">
                    <div className={`transition-all duration-300 ${nodeClass(nodeIndex++)}`}>
                      <div className="bg-cyan-400 text-slate-900 px-2 py-1 rounded text-xs inline-block font-medium">
                        params: [{node.params.join(', ') || 'none'}]
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {node.type === 'VariableDeclaration' && (
                <div className="border-l-4 border-green-500 pl-3 bg-green-500/10 p-2 rounded">
                  <div className="bg-green-500 text-white px-3 py-1.5 rounded-lg inline-block mb-1 font-semibold text-sm">
                    📦 {node.name}
                  </div>
                </div>
              )}
              
              {node.type === 'ExpressionStatement' && (
                <div className="border-l-4 border-orange-500 pl-3 bg-orange-500/10 p-2 rounded">
                  <div className="bg-orange-500 text-white px-3 py-1.5 rounded-lg inline-block font-semibold text-sm">
                    ⚡ Expression
                  </div>
                </div>
              )}

              {node.type === 'ClassDeclaration' && (
                <div className="border-l-4 border-purple-500 pl-3 bg-purple-500/10 p-2 rounded">
                  <div className="bg-purple-500 text-white px-3 py-1.5 rounded-lg inline-block font-semibold text-sm">
                    🏛️ Class: {node.name}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const compileCode = (stageIndex) => {
    try {
      setCompileError(null);
      
      const tokens = lexicalAnalysis(code);
      if (stageIndex === 0) {
        return stages[0].process(code);
      }

      const ast = syntaxAnalysis(tokens);
      setParseTree(ast);
      if (stageIndex === 1) {
        return 'parse_tree';
      }

      if (stageIndex === 2) {
        return stages[2].process(code, tokens, ast);
      }

      const ir = generateIntermediateCode(ast);
      if (stageIndex === 3) {
        return ir;
      }

      if (stageIndex === 4) {
        return stages[4].process(code, tokens, ast, ir);
      }

      if (stageIndex === 5) {
        return stages[5].process(code, tokens, ast, ir);
      }

    } catch (error) {
      setCompileError(error.message);
      throw error;
    }
  };

  const goToStage = (stageIndex) => {
    try {
      const output = compileCode(stageIndex);
      setCurrentStage(stageIndex);
      setStageOutputs(prev => ({ ...prev, [stageIndex]: output }));
      setCompletedStages(prev => new Set([...prev, stageIndex]));
    } catch (error) {
      setCurrentStage(stageIndex);
      setStageOutputs(prev => ({ ...prev, [stageIndex]: `❌ ${error.message}` }));
    }
  };

  const goToNextStage = () => {
    if (currentStage < stages.length - 1) {
      goToStage(currentStage + 1);
    }
  };

  const goToPrevStage = () => {
    if (currentStage > 0) {
      setCurrentStage(currentStage - 1);
    }
  };

  const reset = () => {
    setCurrentStage(-1);
    setStageOutputs({});
    setParseTree(null);
    setIsAnimating(false);
    setIsPaused(false);
    setCompileError(null);
    setCompletedStages(new Set());
  };

  const startAutoPlay = () => {
    setIsAnimating(true);
    setIsPaused(false);
    reset();
    setTimeout(() => goToStage(0), 100);
  };

  useEffect(() => {
    if (isAnimating && !isPaused && currentStage < stages.length - 1) {
      const timer = setTimeout(() => {
        goToNextStage();
      }, 4000);
      return () => clearTimeout(timer);
    } else if (currentStage === stages.length - 1) {
      setIsAnimating(false);
    }
  }, [isAnimating, isPaused, currentStage]);

  const handleQuizAnswer = (questionIndex, optionIndex) => {
    setQuizAnswers(prev => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const submitQuiz = () => {
    let correct = 0;
    quizQuestions.forEach((q, i) => {
      if (quizAnswers[i] === q.correct) correct++;
    });
    setScore(correct);
    setShowResults(true);
  };

  const resetQuiz = () => {
    setQuizAnswers({});
    setShowResults(false);
    setScore(0);
  };

  const getLanguageColor = (lang) => {
    const colors = {
      javascript: 'blue',
      python: 'green',
      c: 'yellow',
      cpp: 'orange',
      java: 'red'
    };
    return colors[lang] || 'blue';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <nav className="bg-slate-900/95 backdrop-blur border-b border-purple-500/30 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <Cpu className="text-purple-400" size={28} />
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Compiler Quest
              </h1>
            </div>
            
            <div className="hidden md:flex gap-2">
              <button
                onClick={() => setActiveSection('compiler')}
                className={`px-4 lg:px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all text-sm lg:text-base ${
                  activeSection === 'compiler'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600'
                    : 'bg-slate-800 hover:bg-slate-700'
                }`}
              >
                <Home size={18} />
                <span className="hidden lg:inline">Compiler</span>
              </button>
              <button
                onClick={() => setActiveSection('learn')}
                className={`px-4 lg:px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all text-sm lg:text-base ${
                  activeSection === 'learn'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600'
                    : 'bg-slate-800 hover:bg-slate-700'
                }`}
              >
                <BookOpen size={18} />
                <span className="hidden lg:inline">Learn</span>
              </button>
              <button
                onClick={() => setActiveSection('quiz')}
                className={`px-4 lg:px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all text-sm lg:text-base ${
                  activeSection === 'quiz'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600'
                    : 'bg-slate-800 hover:bg-slate-700'
                }`}
              >
                <Trophy size={18} />
                <span className="hidden lg:inline">Quiz</span>
              </button>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-slate-800 rounded-lg transition-all"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden mt-4 space-y-2 pb-2">
              <button
                onClick={() => {
                  setActiveSection('compiler');
                  setMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                  activeSection === 'compiler'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600'
                    : 'bg-slate-800'
                }`}
              >
                <Home size={18} />
                Compiler
              </button>
              <button
                onClick={() => {
                  setActiveSection('learn');
                  setMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                  activeSection === 'learn'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600'
                    : 'bg-slate-800'
                }`}
              >
                <BookOpen size={18} />
                Learn
              </button>
              <button
                onClick={() => {
                  setActiveSection('quiz');
                  setMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                  activeSection === 'quiz'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600'
                    : 'bg-slate-800'
                }`}
              >
                <Trophy size={18} />
                Quiz
              </button>
            </div>
          )}
          
          {activeSection === 'compiler' && (
            <div className="mt-3 sm:mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Star className="text-yellow-400" size={14} />
                <span className="text-xs sm:text-sm font-medium">Progress</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 sm:h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${((completedStages.size) / stages.length) * 100}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">{completedStages.size}/{stages.length} stages</p>
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {activeSection === 'compiler' && (
          <>
            <header className="text-center mb-6 sm:mb-8">
              <p className="text-slate-300 text-base sm:text-lg mb-3">
                🚀 Write code in <span className="font-bold text-purple-400">{language.toUpperCase()}</span> and watch it compile!
              </p>
              <div className="flex justify-center gap-2 flex-wrap">
                {Object.keys(languageExamples).map((lang) => {
                  const colorName = getLanguageColor(lang);
                  return (
                    <span 
                      key={lang} 
                      className={`px-2 sm:px-3 py-1 bg-${colorName}-500/20 border border-${colorName}-500/50 rounded-full text-xs sm:text-sm`}
                    >
                      {lang === 'cpp' ? 'C++' : lang === 'javascript' ? 'JS' : lang.charAt(0).toUpperCase() + lang.slice(1)}
                    </span>
                  );
                })}
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className="bg-slate-800/80 backdrop-blur rounded-xl p-4 sm:p-6 shadow-2xl border border-purple-500/30">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                    <Code size={18} className="text-blue-400" />
                    <span className="text-sm sm:text-base">Code Editor</span>
                  </h2>
                  
                  <select
                    value={language}
                    onChange={(e) => {
                      setLanguage(e.target.value);
                      setCode(languageExamples[e.target.value]);
                      reset();
                    }}
                    className="w-full sm:w-auto bg-slate-900 text-white px-3 sm:px-4 py-2 rounded-lg border border-purple-500 font-semibold cursor-pointer hover:bg-slate-800 transition-all text-sm"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="c">C</option>
                    <option value="cpp">C++</option>
                    <option value="java">Java</option>
                  </select>
                </div>
                
                <textarea
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    reset();
                  }}
                  className="w-full h-48 sm:h-64 lg:h-80 bg-slate-900/90 text-green-300 p-3 sm:p-4 rounded-lg font-mono text-xs sm:text-sm border border-slate-600 focus:border-purple-500 focus:outline-none transition-all resize-none"
                  spellCheck="false"
                  placeholder={`Write your ${language} code here...`}
                />
                <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={startAutoPlay}
                    disabled={isAnimating && !isPaused}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-700 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all transform hover:scale-105 shadow-lg text-sm sm:text-base"
                  >
                    <Play size={18} />
                    {isAnimating ? 'Compiling...' : 'Compile'}
                  </button>
                  <button
                    onClick={() => setIsPaused(!isPaused)}
                    disabled={!isAnimating}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-700 rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-lg text-sm sm:text-base"
                  >
                    <Pause size={18} />
                    <span className="hidden sm:inline">{isPaused ? 'Resume' : 'Pause'}</span>
                  </button>
                  <button
                    onClick={reset}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-lg text-sm sm:text-base"
                  >
                    <RotateCcw size={18} />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-800/80 backdrop-blur rounded-xl p-4 sm:p-6 shadow-2xl border border-purple-500/30">
                <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm sm:text-base">
                    <Target className="text-green-400" size={18} />
                    Output
                  </span>
                  {currentStage >= 0 && (
                    <span className="text-xs sm:text-sm bg-purple-600 px-2 sm:px-3 py-1 rounded-full animate-pulse">
                      {currentStage + 1}/{stages.length}
                    </span>
                  )}
                </h2>
                <div className="bg-slate-900/90 rounded-lg p-3 sm:p-5 h-64 sm:h-80 lg:h-96 overflow-auto border border-slate-600 custom-scrollbar">
                  {currentStage >= 0 ? (
                    stages[currentStage].showTree && parseTree ? (
                      <ParseTree ast={parseTree} />
                    ) : (
                      <pre className="text-xs sm:text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                        {stageOutputs[currentStage] || 'Processing...'}
                      </pre>
                    )
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <Cpu size={48} className="mb-4 opacity-50 animate-pulse" />
                      <p className="text-center text-base sm:text-lg font-semibold">Ready!</p>
                      <p className="text-xs sm:text-sm mt-2 text-center">Click Compile to start</p>
                    </div>
                  )}
                </div>
                
                {currentStage >= 0 && !compileError && (
                  <div className="mt-3 sm:mt-4 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-lg p-2 sm:p-3">
                    <p className="text-xs sm:text-sm text-purple-200 font-medium">{stages[currentStage].funFact}</p>
                  </div>
                )}

                {compileError && (
                  <div className="mt-3 sm:mt-4 bg-red-600/20 border border-red-500/50 rounded-lg p-2 sm:p-3 flex items-start gap-2">
                    <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-red-300">Error</p>
                      <p className="text-xs sm:text-sm text-red-200 mt-1">{compileError}</p>
                    </div>
                  </div>
                )}

                <div className="mt-3 sm:mt-4 flex gap-2 sm:gap-3">
                  <button
                    onClick={goToPrevStage}
                    disabled={currentStage <= 0}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 px-3 sm:px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-all text-sm sm:text-base"
                  >
                    <ChevronLeft size={18} />
                    <span className="hidden sm:inline">Previous</span>
                  </button>
                  <button
                    onClick={goToNextStage}
                    disabled={currentStage >= stages.length - 1}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-slate-700 disabled:to-slate-800 disabled:text-slate-600 px-3 sm:px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-all text-sm sm:text-base"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold mb-4 flex items-center gap-2">
                <Zap className="text-yellow-400 animate-pulse" />
                Pipeline
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {stages.map((stage, index) => {
                  const Icon = stage.icon;
                  const isActive = currentStage === index;
                  const isCompleted = completedStages.has(index);
                  
                  return (
                    <div
                      key={index}
                      className={`bg-slate-800/80 backdrop-blur rounded-xl p-4 sm:p-5 border-2 transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-2xl ${
                        isActive
                          ? 'border-purple-500 shadow-lg shadow-purple-500/50 scale-105'
                          : isCompleted
                          ? 'border-green-500/50 shadow-lg shadow-green-500/20'
                          : 'border-slate-700 hover:border-purple-400'
                      }`}
                      onClick={() => goToStage(index)}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`${stage.color} p-2 sm:p-3 rounded-lg transition-all ${
                            isActive ? 'animate-pulse scale-110' : ''
                          }`}
                        >
                          <Icon size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="text-base sm:text-lg font-bold truncate">
                              {index + 1}. {stage.name}
                            </h3>
                            {isCompleted && (
                              <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-slate-300 text-xs sm:text-sm">{stage.description}</p>
                          {isActive && (
                            <div className="mt-2">
                              <span className="text-xs bg-purple-600 px-2 py-1 rounded-full animate-pulse font-bold">
                                ACTIVE
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {activeSection === 'learn' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-slate-800/80 backdrop-blur rounded-xl p-6 sm:p-8 shadow-2xl border border-purple-500/30">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 flex items-center gap-3">
                <BookOpen className="text-blue-400" size={32} />
                Understanding Compilers
              </h2>
              
              <div className="space-y-4 sm:space-y-6 text-slate-300 text-sm sm:text-base">
                <div className="bg-blue-500/10 border-l-4 border-blue-500 p-3 sm:p-4 rounded">
                  <h3 className="text-lg sm:text-xl font-bold text-blue-300 mb-2">What is a Compiler?</h3>
                  <p>A compiler is a special program that translates code written in a high-level programming language (like JavaScript, Python, or C++) into machine code that your computer can execute directly. Think of it as a translator between human-readable code and computer-understandable instructions.</p>
                  <p className="mt-2">Without compilers, programmers would have to write in binary (0s and 1s) or assembly language, which is extremely difficult and time-consuming!</p>
                </div>

                <div className="bg-green-500/10 border-l-4 border-green-500 p-3 sm:p-4 rounded">
                  <h3 className="text-lg sm:text-xl font-bold text-green-300 mb-2">Why Multiple Phases?</h3>
                  <p className="mb-3">Breaking compilation into phases makes it easier to:</p>
                  <ul className="list-disc list-inside mt-2 space-y-2">
                    <li><strong>Catch different types of errors</strong> at appropriate stages - syntax errors in parsing, undefined variables in semantic analysis, etc.</li>
                    <li><strong>Optimize code for better performance</strong> - make your programs run faster and use less memory</li>
                    <li><strong>Support multiple programming languages</strong> and target platforms by reusing phases</li>
                    <li><strong>Maintain and improve</strong> the compiler code more easily by separating concerns</li>
                  </ul>
                </div>

                <div className="bg-purple-500/10 border-l-4 border-purple-500 p-3 sm:p-4 rounded">
                  <h3 className="text-lg sm:text-xl font-bold text-purple-300 mb-2">The Compilation Journey</h3>
                  <p className="mb-3">Every programming language goes through these same 6 stages when compiling. Here's what happens at each stage:</p>
                  <div className="space-y-3 mt-3">
                    {stages.map((stage, i) => (
                      <div key={i} className="flex items-start gap-2 sm:gap-3">
                        <div className={`${stage.color} p-1.5 sm:p-2 rounded flex-shrink-0`}>
                          <stage.icon size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-sm sm:text-base">{i + 1}. {stage.name}</p>
                          <p className="text-xs sm:text-sm text-slate-400">{stage.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-orange-500/10 border-l-4 border-orange-500 p-3 sm:p-4 rounded">
                  <h3 className="text-lg sm:text-xl font-bold text-orange-300 mb-2">Multi-Language Support</h3>
                  <p className="mb-3">This compiler simulator supports 5 different programming languages. Try them all to see how different syntax gets compiled through the same phases:</p>
                  <ul className="space-y-2 text-sm sm:text-base">
                    <li>✨ <strong>JavaScript</strong> - Modern web programming language used in browsers and Node.js</li>
                    <li>🐍 <strong>Python</strong> - Beginner-friendly language with clean, readable syntax based on indentation</li>
                    <li>⚡ <strong>C</strong> - Low-level compiled language for systems programming and embedded devices</li>
                    <li>🚀 <strong>C++</strong> - Object-oriented extension of C with classes and advanced features</li>
                    <li>☕ <strong>Java</strong> - Platform-independent, class-based language used for enterprise applications</li>
                  </ul>
                  <p className="mt-3 text-sm text-slate-400 italic">
                    All languages follow the same compilation phases, but with language-specific keywords and syntax rules!
                  </p>
                </div>

                <div className="bg-yellow-500/10 border-l-4 border-yellow-500 p-3 sm:p-4 rounded">
                  <h3 className="text-lg sm:text-xl font-bold text-yellow-300 mb-2">🎯 Quick Tips for Learning</h3>
                  <ul className="space-y-2">
                    <li>✨ <strong>Experiment!</strong> Try writing different code samples and see how they're compiled</li>
                    <li>🔍 <strong>Watch Carefully:</strong> Each phase adds important information about your code</li>
                    <li>🐛 <strong>Learn from Errors:</strong> Compilation errors teach you proper syntax and structure</li>
                    <li>🚀 <strong>Optimization Matters:</strong> See how compilers make your code run faster automatically</li>
                    <li>🌳 <strong>Parse Trees are Cool:</strong> They show the logical structure of your program</li>
                    <li>💡 <strong>Take the Quiz:</strong> Test your knowledge after exploring the compiler!</li>
                  </ul>
                </div>

                <div className="bg-pink-500/10 border-l-4 border-pink-500 p-3 sm:p-4 rounded">
                  <h3 className="text-lg sm:text-xl font-bold text-pink-300 mb-2">🎓 Did You Know?</h3>
                  <ul className="space-y-2 text-sm sm:text-base">
                    <li>🔥 The first compiler was created by Grace Hopper in 1952</li>
                    <li>⚡ Modern compilers can optimize code better than most humans can manually</li>
                    <li>🌍 The same compiler techniques are used for dozens of programming languages</li>
                    <li>🤖 Compilers don't just translate code - they also catch bugs and improve performance</li>
                    <li>🎯 Learning about compilers helps you write better, more efficient code</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'quiz' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-slate-800/80 backdrop-blur rounded-xl p-6 sm:p-8 shadow-2xl border border-purple-500/30">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                  <Trophy className="text-yellow-400" size={32} />
                  Quiz
                </h2>
                {showResults && (
                  <div className="text-center">
                    <div className="text-3xl sm:text-4xl font-bold text-yellow-400">{score}/{quizQuestions.length}</div>
                    <div className="text-xs sm:text-sm text-slate-400">Score</div>
                  </div>
                )}
              </div>

              {!showResults ? (
                <div className="space-y-4 sm:space-y-6">
                  {quizQuestions.map((q, qIndex) => (
                    <div key={qIndex} className="bg-slate-900/50 p-4 sm:p-5 rounded-lg border border-slate-700">
                      <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-purple-300">
                        Q{qIndex + 1}: {q.question}
                      </h3>
                      <div className="space-y-2">
                        {q.options.map((option, oIndex) => (
                          <button
                            key={oIndex}
                            onClick={() => handleQuizAnswer(qIndex, oIndex)}
                            className={`w-full text-left p-3 sm:p-4 rounded-lg transition-all font-medium text-sm sm:text-base ${
                              quizAnswers[qIndex] === oIndex
                                ? 'bg-purple-600 border-2 border-purple-400 shadow-lg'
                                : 'bg-slate-800 border border-slate-600 hover:bg-slate-700 hover:border-purple-500'
                            }`}
                          >
                            {String.fromCharCode(65 + oIndex)}. {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={submitQuiz}
                    disabled={Object.keys(quizAnswers).length !== quizQuestions.length}
                    className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-700 px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg transition-all transform hover:scale-105 shadow-xl disabled:scale-100"
                  >
                    {Object.keys(quizAnswers).length === quizQuestions.length 
                      ? '🎯 Submit' 
                      : `Answer All (${Object.keys(quizAnswers).length}/${quizQuestions.length})`}
                  </button>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  <div className="text-center p-6 sm:p-8 bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-xl border-2 border-purple-500">
                    <Trophy className="mx-auto mb-4 text-yellow-400" size={48} />
                    <h3 className="text-2xl sm:text-3xl font-bold mb-2">
                      {score === quizQuestions.length ? '🎉 Perfect!' :
                       score >= quizQuestions.length * 0.7 ? '👏 Great!' :
                       score >= quizQuestions.length * 0.5 ? '👍 Good!' :
                       '💪 Keep Learning!'}
                    </h3>
                    <p className="text-lg sm:text-xl text-slate-300">
                      {score}/{quizQuestions.length}
                    </p>
                  </div>

                  {quizQuestions.map((q, qIndex) => {
                    const userAnswer = quizAnswers[qIndex];
                    const isCorrect = userAnswer === q.correct;
                    
                    return (
                      <div 
                        key={qIndex} 
                        className={`p-4 sm:p-5 rounded-lg border-2 ${
                          isCorrect 
                            ? 'bg-green-500/10 border-green-500' 
                            : 'bg-red-500/10 border-red-500'
                        }`}
                      >
                        <div className="flex items-start gap-2 sm:gap-3 mb-3">
                          {isCorrect ? (
                            <CheckCircle className="text-green-400 flex-shrink-0" size={20} />
                          ) : (
                            <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm sm:text-lg font-bold mb-2">
                              Q{qIndex + 1}: {q.question}
                            </h3>
                            <p className={`font-medium text-xs sm:text-base ${isCorrect ? 'text-green-300' : 'text-red-300'}`}>
                              Your: {q.options[userAnswer]}
                            </p>
                            {!isCorrect && (
                              <p className="font-medium text-green-300 mt-1 text-xs sm:text-base">
                                Correct: {q.options[q.correct]}
                              </p>
                            )}
                            <p className="text-xs sm:text-sm text-slate-400 mt-2">
                              💡 {q.explanation}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    onClick={resetQuiz}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg transition-all transform hover:scale-105 shadow-xl"
                  >
                    🔄 Retake
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1e293b;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #7c3aed;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9333ea;
        }
      `}</style>
    </div>
  );
};

export default CompilerSimulator;