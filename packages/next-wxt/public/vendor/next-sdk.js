(function(global2, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? factory(exports) : typeof define === "function" && define.amd ? define(["exports"], factory) : (global2 = typeof globalThis !== "undefined" ? globalThis : global2 || self, factory(global2.WebMCP = {}));
})(this, function(exports2) {
  "use strict";
  function getDefaultExportFromCjs(x) {
    return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
  }
  var ajv$1 = { exports: {} };
  var core$1 = {};
  var validate = {};
  var boolSchema = {};
  var errors = {};
  var codegen = {};
  var code$1 = {};
  var hasRequiredCode$1;
  function requireCode$1() {
    if (hasRequiredCode$1) return code$1;
    hasRequiredCode$1 = 1;
    (function(exports3) {
      Object.defineProperty(exports3, "__esModule", { value: true });
      exports3.regexpCode = exports3.getEsmExportName = exports3.getProperty = exports3.safeStringify = exports3.stringify = exports3.strConcat = exports3.addCodeArg = exports3.str = exports3._ = exports3.nil = exports3._Code = exports3.Name = exports3.IDENTIFIER = exports3._CodeOrName = void 0;
      class _CodeOrName {
      }
      exports3._CodeOrName = _CodeOrName;
      exports3.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
      class Name extends _CodeOrName {
        constructor(s) {
          super();
          if (!exports3.IDENTIFIER.test(s))
            throw new Error("CodeGen: name must be a valid identifier");
          this.str = s;
        }
        toString() {
          return this.str;
        }
        emptyStr() {
          return false;
        }
        get names() {
          return { [this.str]: 1 };
        }
      }
      exports3.Name = Name;
      class _Code extends _CodeOrName {
        constructor(code2) {
          super();
          this._items = typeof code2 === "string" ? [code2] : code2;
        }
        toString() {
          return this.str;
        }
        emptyStr() {
          if (this._items.length > 1)
            return false;
          const item = this._items[0];
          return item === "" || item === '""';
        }
        get str() {
          var _a;
          return (_a = this._str) !== null && _a !== void 0 ? _a : this._str = this._items.reduce((s, c) => `${s}${c}`, "");
        }
        get names() {
          var _a;
          return (_a = this._names) !== null && _a !== void 0 ? _a : this._names = this._items.reduce((names2, c) => {
            if (c instanceof Name)
              names2[c.str] = (names2[c.str] || 0) + 1;
            return names2;
          }, {});
        }
      }
      exports3._Code = _Code;
      exports3.nil = new _Code("");
      function _(strs, ...args) {
        const code2 = [strs[0]];
        let i = 0;
        while (i < args.length) {
          addCodeArg(code2, args[i]);
          code2.push(strs[++i]);
        }
        return new _Code(code2);
      }
      exports3._ = _;
      const plus = new _Code("+");
      function str(strs, ...args) {
        const expr = [safeStringify(strs[0])];
        let i = 0;
        while (i < args.length) {
          expr.push(plus);
          addCodeArg(expr, args[i]);
          expr.push(plus, safeStringify(strs[++i]));
        }
        optimize(expr);
        return new _Code(expr);
      }
      exports3.str = str;
      function addCodeArg(code2, arg) {
        if (arg instanceof _Code)
          code2.push(...arg._items);
        else if (arg instanceof Name)
          code2.push(arg);
        else
          code2.push(interpolate(arg));
      }
      exports3.addCodeArg = addCodeArg;
      function optimize(expr) {
        let i = 1;
        while (i < expr.length - 1) {
          if (expr[i] === plus) {
            const res = mergeExprItems(expr[i - 1], expr[i + 1]);
            if (res !== void 0) {
              expr.splice(i - 1, 3, res);
              continue;
            }
            expr[i++] = "+";
          }
          i++;
        }
      }
      function mergeExprItems(a, b) {
        if (b === '""')
          return a;
        if (a === '""')
          return b;
        if (typeof a == "string") {
          if (b instanceof Name || a[a.length - 1] !== '"')
            return;
          if (typeof b != "string")
            return `${a.slice(0, -1)}${b}"`;
          if (b[0] === '"')
            return a.slice(0, -1) + b.slice(1);
          return;
        }
        if (typeof b == "string" && b[0] === '"' && !(a instanceof Name))
          return `"${a}${b.slice(1)}`;
        return;
      }
      function strConcat(c1, c2) {
        return c2.emptyStr() ? c1 : c1.emptyStr() ? c2 : str`${c1}${c2}`;
      }
      exports3.strConcat = strConcat;
      function interpolate(x) {
        return typeof x == "number" || typeof x == "boolean" || x === null ? x : safeStringify(Array.isArray(x) ? x.join(",") : x);
      }
      function stringify(x) {
        return new _Code(safeStringify(x));
      }
      exports3.stringify = stringify;
      function safeStringify(x) {
        return JSON.stringify(x).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
      }
      exports3.safeStringify = safeStringify;
      function getProperty(key) {
        return typeof key == "string" && exports3.IDENTIFIER.test(key) ? new _Code(`.${key}`) : _`[${key}]`;
      }
      exports3.getProperty = getProperty;
      function getEsmExportName(key) {
        if (typeof key == "string" && exports3.IDENTIFIER.test(key)) {
          return new _Code(`${key}`);
        }
        throw new Error(`CodeGen: invalid export name: ${key}, use explicit $id name mapping`);
      }
      exports3.getEsmExportName = getEsmExportName;
      function regexpCode(rx) {
        return new _Code(rx.toString());
      }
      exports3.regexpCode = regexpCode;
    })(code$1);
    return code$1;
  }
  var scope = {};
  var hasRequiredScope;
  function requireScope() {
    if (hasRequiredScope) return scope;
    hasRequiredScope = 1;
    (function(exports3) {
      Object.defineProperty(exports3, "__esModule", { value: true });
      exports3.ValueScope = exports3.ValueScopeName = exports3.Scope = exports3.varKinds = exports3.UsedValueState = void 0;
      const code_1 = requireCode$1();
      class ValueError extends Error {
        constructor(name) {
          super(`CodeGen: "code" for ${name} not defined`);
          this.value = name.value;
        }
      }
      var UsedValueState;
      (function(UsedValueState2) {
        UsedValueState2[UsedValueState2["Started"] = 0] = "Started";
        UsedValueState2[UsedValueState2["Completed"] = 1] = "Completed";
      })(UsedValueState || (exports3.UsedValueState = UsedValueState = {}));
      exports3.varKinds = {
        const: new code_1.Name("const"),
        let: new code_1.Name("let"),
        var: new code_1.Name("var")
      };
      class Scope {
        constructor({ prefixes, parent } = {}) {
          this._names = {};
          this._prefixes = prefixes;
          this._parent = parent;
        }
        toName(nameOrPrefix) {
          return nameOrPrefix instanceof code_1.Name ? nameOrPrefix : this.name(nameOrPrefix);
        }
        name(prefix) {
          return new code_1.Name(this._newName(prefix));
        }
        _newName(prefix) {
          const ng = this._names[prefix] || this._nameGroup(prefix);
          return `${prefix}${ng.index++}`;
        }
        _nameGroup(prefix) {
          var _a, _b;
          if (((_b = (_a = this._parent) === null || _a === void 0 ? void 0 : _a._prefixes) === null || _b === void 0 ? void 0 : _b.has(prefix)) || this._prefixes && !this._prefixes.has(prefix)) {
            throw new Error(`CodeGen: prefix "${prefix}" is not allowed in this scope`);
          }
          return this._names[prefix] = { prefix, index: 0 };
        }
      }
      exports3.Scope = Scope;
      class ValueScopeName extends code_1.Name {
        constructor(prefix, nameStr) {
          super(nameStr);
          this.prefix = prefix;
        }
        setValue(value, { property, itemIndex }) {
          this.value = value;
          this.scopePath = (0, code_1._)`.${new code_1.Name(property)}[${itemIndex}]`;
        }
      }
      exports3.ValueScopeName = ValueScopeName;
      const line = (0, code_1._)`\n`;
      class ValueScope extends Scope {
        constructor(opts) {
          super(opts);
          this._values = {};
          this._scope = opts.scope;
          this.opts = { ...opts, _n: opts.lines ? line : code_1.nil };
        }
        get() {
          return this._scope;
        }
        name(prefix) {
          return new ValueScopeName(prefix, this._newName(prefix));
        }
        value(nameOrPrefix, value) {
          var _a;
          if (value.ref === void 0)
            throw new Error("CodeGen: ref must be passed in value");
          const name = this.toName(nameOrPrefix);
          const { prefix } = name;
          const valueKey = (_a = value.key) !== null && _a !== void 0 ? _a : value.ref;
          let vs = this._values[prefix];
          if (vs) {
            const _name = vs.get(valueKey);
            if (_name)
              return _name;
          } else {
            vs = this._values[prefix] = /* @__PURE__ */ new Map();
          }
          vs.set(valueKey, name);
          const s = this._scope[prefix] || (this._scope[prefix] = []);
          const itemIndex = s.length;
          s[itemIndex] = value.ref;
          name.setValue(value, { property: prefix, itemIndex });
          return name;
        }
        getValue(prefix, keyOrRef) {
          const vs = this._values[prefix];
          if (!vs)
            return;
          return vs.get(keyOrRef);
        }
        scopeRefs(scopeName, values = this._values) {
          return this._reduceValues(values, (name) => {
            if (name.scopePath === void 0)
              throw new Error(`CodeGen: name "${name}" has no value`);
            return (0, code_1._)`${scopeName}${name.scopePath}`;
          });
        }
        scopeCode(values = this._values, usedValues, getCode) {
          return this._reduceValues(values, (name) => {
            if (name.value === void 0)
              throw new Error(`CodeGen: name "${name}" has no value`);
            return name.value.code;
          }, usedValues, getCode);
        }
        _reduceValues(values, valueCode, usedValues = {}, getCode) {
          let code2 = code_1.nil;
          for (const prefix in values) {
            const vs = values[prefix];
            if (!vs)
              continue;
            const nameSet = usedValues[prefix] = usedValues[prefix] || /* @__PURE__ */ new Map();
            vs.forEach((name) => {
              if (nameSet.has(name))
                return;
              nameSet.set(name, UsedValueState.Started);
              let c = valueCode(name);
              if (c) {
                const def = this.opts.es5 ? exports3.varKinds.var : exports3.varKinds.const;
                code2 = (0, code_1._)`${code2}${def} ${name} = ${c};${this.opts._n}`;
              } else if (c = getCode === null || getCode === void 0 ? void 0 : getCode(name)) {
                code2 = (0, code_1._)`${code2}${c}${this.opts._n}`;
              } else {
                throw new ValueError(name);
              }
              nameSet.set(name, UsedValueState.Completed);
            });
          }
          return code2;
        }
      }
      exports3.ValueScope = ValueScope;
    })(scope);
    return scope;
  }
  var hasRequiredCodegen;
  function requireCodegen() {
    if (hasRequiredCodegen) return codegen;
    hasRequiredCodegen = 1;
    (function(exports3) {
      Object.defineProperty(exports3, "__esModule", { value: true });
      exports3.or = exports3.and = exports3.not = exports3.CodeGen = exports3.operators = exports3.varKinds = exports3.ValueScopeName = exports3.ValueScope = exports3.Scope = exports3.Name = exports3.regexpCode = exports3.stringify = exports3.getProperty = exports3.nil = exports3.strConcat = exports3.str = exports3._ = void 0;
      const code_1 = requireCode$1();
      const scope_1 = requireScope();
      var code_2 = requireCode$1();
      Object.defineProperty(exports3, "_", { enumerable: true, get: function() {
        return code_2._;
      } });
      Object.defineProperty(exports3, "str", { enumerable: true, get: function() {
        return code_2.str;
      } });
      Object.defineProperty(exports3, "strConcat", { enumerable: true, get: function() {
        return code_2.strConcat;
      } });
      Object.defineProperty(exports3, "nil", { enumerable: true, get: function() {
        return code_2.nil;
      } });
      Object.defineProperty(exports3, "getProperty", { enumerable: true, get: function() {
        return code_2.getProperty;
      } });
      Object.defineProperty(exports3, "stringify", { enumerable: true, get: function() {
        return code_2.stringify;
      } });
      Object.defineProperty(exports3, "regexpCode", { enumerable: true, get: function() {
        return code_2.regexpCode;
      } });
      Object.defineProperty(exports3, "Name", { enumerable: true, get: function() {
        return code_2.Name;
      } });
      var scope_2 = requireScope();
      Object.defineProperty(exports3, "Scope", { enumerable: true, get: function() {
        return scope_2.Scope;
      } });
      Object.defineProperty(exports3, "ValueScope", { enumerable: true, get: function() {
        return scope_2.ValueScope;
      } });
      Object.defineProperty(exports3, "ValueScopeName", { enumerable: true, get: function() {
        return scope_2.ValueScopeName;
      } });
      Object.defineProperty(exports3, "varKinds", { enumerable: true, get: function() {
        return scope_2.varKinds;
      } });
      exports3.operators = {
        GT: new code_1._Code(">"),
        GTE: new code_1._Code(">="),
        LT: new code_1._Code("<"),
        LTE: new code_1._Code("<="),
        EQ: new code_1._Code("==="),
        NEQ: new code_1._Code("!=="),
        NOT: new code_1._Code("!"),
        OR: new code_1._Code("||"),
        AND: new code_1._Code("&&"),
        ADD: new code_1._Code("+")
      };
      class Node {
        optimizeNodes() {
          return this;
        }
        optimizeNames(_names, _constants) {
          return this;
        }
      }
      class Def extends Node {
        constructor(varKind, name, rhs) {
          super();
          this.varKind = varKind;
          this.name = name;
          this.rhs = rhs;
        }
        render({ es5, _n }) {
          const varKind = es5 ? scope_1.varKinds.var : this.varKind;
          const rhs = this.rhs === void 0 ? "" : ` = ${this.rhs}`;
          return `${varKind} ${this.name}${rhs};` + _n;
        }
        optimizeNames(names2, constants) {
          if (!names2[this.name.str])
            return;
          if (this.rhs)
            this.rhs = optimizeExpr(this.rhs, names2, constants);
          return this;
        }
        get names() {
          return this.rhs instanceof code_1._CodeOrName ? this.rhs.names : {};
        }
      }
      class Assign extends Node {
        constructor(lhs, rhs, sideEffects) {
          super();
          this.lhs = lhs;
          this.rhs = rhs;
          this.sideEffects = sideEffects;
        }
        render({ _n }) {
          return `${this.lhs} = ${this.rhs};` + _n;
        }
        optimizeNames(names2, constants) {
          if (this.lhs instanceof code_1.Name && !names2[this.lhs.str] && !this.sideEffects)
            return;
          this.rhs = optimizeExpr(this.rhs, names2, constants);
          return this;
        }
        get names() {
          const names2 = this.lhs instanceof code_1.Name ? {} : { ...this.lhs.names };
          return addExprNames(names2, this.rhs);
        }
      }
      class AssignOp extends Assign {
        constructor(lhs, op, rhs, sideEffects) {
          super(lhs, rhs, sideEffects);
          this.op = op;
        }
        render({ _n }) {
          return `${this.lhs} ${this.op}= ${this.rhs};` + _n;
        }
      }
      class Label extends Node {
        constructor(label) {
          super();
          this.label = label;
          this.names = {};
        }
        render({ _n }) {
          return `${this.label}:` + _n;
        }
      }
      class Break extends Node {
        constructor(label) {
          super();
          this.label = label;
          this.names = {};
        }
        render({ _n }) {
          const label = this.label ? ` ${this.label}` : "";
          return `break${label};` + _n;
        }
      }
      class Throw extends Node {
        constructor(error) {
          super();
          this.error = error;
        }
        render({ _n }) {
          return `throw ${this.error};` + _n;
        }
        get names() {
          return this.error.names;
        }
      }
      class AnyCode extends Node {
        constructor(code2) {
          super();
          this.code = code2;
        }
        render({ _n }) {
          return `${this.code};` + _n;
        }
        optimizeNodes() {
          return `${this.code}` ? this : void 0;
        }
        optimizeNames(names2, constants) {
          this.code = optimizeExpr(this.code, names2, constants);
          return this;
        }
        get names() {
          return this.code instanceof code_1._CodeOrName ? this.code.names : {};
        }
      }
      class ParentNode extends Node {
        constructor(nodes = []) {
          super();
          this.nodes = nodes;
        }
        render(opts) {
          return this.nodes.reduce((code2, n) => code2 + n.render(opts), "");
        }
        optimizeNodes() {
          const { nodes } = this;
          let i = nodes.length;
          while (i--) {
            const n = nodes[i].optimizeNodes();
            if (Array.isArray(n))
              nodes.splice(i, 1, ...n);
            else if (n)
              nodes[i] = n;
            else
              nodes.splice(i, 1);
          }
          return nodes.length > 0 ? this : void 0;
        }
        optimizeNames(names2, constants) {
          const { nodes } = this;
          let i = nodes.length;
          while (i--) {
            const n = nodes[i];
            if (n.optimizeNames(names2, constants))
              continue;
            subtractNames(names2, n.names);
            nodes.splice(i, 1);
          }
          return nodes.length > 0 ? this : void 0;
        }
        get names() {
          return this.nodes.reduce((names2, n) => addNames(names2, n.names), {});
        }
      }
      class BlockNode extends ParentNode {
        render(opts) {
          return "{" + opts._n + super.render(opts) + "}" + opts._n;
        }
      }
      class Root extends ParentNode {
      }
      class Else extends BlockNode {
      }
      Else.kind = "else";
      class If extends BlockNode {
        constructor(condition, nodes) {
          super(nodes);
          this.condition = condition;
        }
        render(opts) {
          let code2 = `if(${this.condition})` + super.render(opts);
          if (this.else)
            code2 += "else " + this.else.render(opts);
          return code2;
        }
        optimizeNodes() {
          super.optimizeNodes();
          const cond = this.condition;
          if (cond === true)
            return this.nodes;
          let e = this.else;
          if (e) {
            const ns = e.optimizeNodes();
            e = this.else = Array.isArray(ns) ? new Else(ns) : ns;
          }
          if (e) {
            if (cond === false)
              return e instanceof If ? e : e.nodes;
            if (this.nodes.length)
              return this;
            return new If(not2(cond), e instanceof If ? [e] : e.nodes);
          }
          if (cond === false || !this.nodes.length)
            return void 0;
          return this;
        }
        optimizeNames(names2, constants) {
          var _a;
          this.else = (_a = this.else) === null || _a === void 0 ? void 0 : _a.optimizeNames(names2, constants);
          if (!(super.optimizeNames(names2, constants) || this.else))
            return;
          this.condition = optimizeExpr(this.condition, names2, constants);
          return this;
        }
        get names() {
          const names2 = super.names;
          addExprNames(names2, this.condition);
          if (this.else)
            addNames(names2, this.else.names);
          return names2;
        }
      }
      If.kind = "if";
      class For extends BlockNode {
      }
      For.kind = "for";
      class ForLoop extends For {
        constructor(iteration) {
          super();
          this.iteration = iteration;
        }
        render(opts) {
          return `for(${this.iteration})` + super.render(opts);
        }
        optimizeNames(names2, constants) {
          if (!super.optimizeNames(names2, constants))
            return;
          this.iteration = optimizeExpr(this.iteration, names2, constants);
          return this;
        }
        get names() {
          return addNames(super.names, this.iteration.names);
        }
      }
      class ForRange extends For {
        constructor(varKind, name, from, to) {
          super();
          this.varKind = varKind;
          this.name = name;
          this.from = from;
          this.to = to;
        }
        render(opts) {
          const varKind = opts.es5 ? scope_1.varKinds.var : this.varKind;
          const { name, from, to } = this;
          return `for(${varKind} ${name}=${from}; ${name}<${to}; ${name}++)` + super.render(opts);
        }
        get names() {
          const names2 = addExprNames(super.names, this.from);
          return addExprNames(names2, this.to);
        }
      }
      class ForIter extends For {
        constructor(loop, varKind, name, iterable) {
          super();
          this.loop = loop;
          this.varKind = varKind;
          this.name = name;
          this.iterable = iterable;
        }
        render(opts) {
          return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(opts);
        }
        optimizeNames(names2, constants) {
          if (!super.optimizeNames(names2, constants))
            return;
          this.iterable = optimizeExpr(this.iterable, names2, constants);
          return this;
        }
        get names() {
          return addNames(super.names, this.iterable.names);
        }
      }
      class Func extends BlockNode {
        constructor(name, args, async) {
          super();
          this.name = name;
          this.args = args;
          this.async = async;
        }
        render(opts) {
          const _async = this.async ? "async " : "";
          return `${_async}function ${this.name}(${this.args})` + super.render(opts);
        }
      }
      Func.kind = "func";
      class Return extends ParentNode {
        render(opts) {
          return "return " + super.render(opts);
        }
      }
      Return.kind = "return";
      class Try extends BlockNode {
        render(opts) {
          let code2 = "try" + super.render(opts);
          if (this.catch)
            code2 += this.catch.render(opts);
          if (this.finally)
            code2 += this.finally.render(opts);
          return code2;
        }
        optimizeNodes() {
          var _a, _b;
          super.optimizeNodes();
          (_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNodes();
          (_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNodes();
          return this;
        }
        optimizeNames(names2, constants) {
          var _a, _b;
          super.optimizeNames(names2, constants);
          (_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNames(names2, constants);
          (_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNames(names2, constants);
          return this;
        }
        get names() {
          const names2 = super.names;
          if (this.catch)
            addNames(names2, this.catch.names);
          if (this.finally)
            addNames(names2, this.finally.names);
          return names2;
        }
      }
      class Catch extends BlockNode {
        constructor(error) {
          super();
          this.error = error;
        }
        render(opts) {
          return `catch(${this.error})` + super.render(opts);
        }
      }
      Catch.kind = "catch";
      class Finally extends BlockNode {
        render(opts) {
          return "finally" + super.render(opts);
        }
      }
      Finally.kind = "finally";
      class CodeGen {
        constructor(extScope, opts = {}) {
          this._values = {};
          this._blockStarts = [];
          this._constants = {};
          this.opts = { ...opts, _n: opts.lines ? "\n" : "" };
          this._extScope = extScope;
          this._scope = new scope_1.Scope({ parent: extScope });
          this._nodes = [new Root()];
        }
        toString() {
          return this._root.render(this.opts);
        }
        // returns unique name in the internal scope
        name(prefix) {
          return this._scope.name(prefix);
        }
        // reserves unique name in the external scope
        scopeName(prefix) {
          return this._extScope.name(prefix);
        }
        // reserves unique name in the external scope and assigns value to it
        scopeValue(prefixOrName, value) {
          const name = this._extScope.value(prefixOrName, value);
          const vs = this._values[name.prefix] || (this._values[name.prefix] = /* @__PURE__ */ new Set());
          vs.add(name);
          return name;
        }
        getScopeValue(prefix, keyOrRef) {
          return this._extScope.getValue(prefix, keyOrRef);
        }
        // return code that assigns values in the external scope to the names that are used internally
        // (same names that were returned by gen.scopeName or gen.scopeValue)
        scopeRefs(scopeName) {
          return this._extScope.scopeRefs(scopeName, this._values);
        }
        scopeCode() {
          return this._extScope.scopeCode(this._values);
        }
        _def(varKind, nameOrPrefix, rhs, constant) {
          const name = this._scope.toName(nameOrPrefix);
          if (rhs !== void 0 && constant)
            this._constants[name.str] = rhs;
          this._leafNode(new Def(varKind, name, rhs));
          return name;
        }
        // `const` declaration (`var` in es5 mode)
        const(nameOrPrefix, rhs, _constant) {
          return this._def(scope_1.varKinds.const, nameOrPrefix, rhs, _constant);
        }
        // `let` declaration with optional assignment (`var` in es5 mode)
        let(nameOrPrefix, rhs, _constant) {
          return this._def(scope_1.varKinds.let, nameOrPrefix, rhs, _constant);
        }
        // `var` declaration with optional assignment
        var(nameOrPrefix, rhs, _constant) {
          return this._def(scope_1.varKinds.var, nameOrPrefix, rhs, _constant);
        }
        // assignment code
        assign(lhs, rhs, sideEffects) {
          return this._leafNode(new Assign(lhs, rhs, sideEffects));
        }
        // `+=` code
        add(lhs, rhs) {
          return this._leafNode(new AssignOp(lhs, exports3.operators.ADD, rhs));
        }
        // appends passed SafeExpr to code or executes Block
        code(c) {
          if (typeof c == "function")
            c();
          else if (c !== code_1.nil)
            this._leafNode(new AnyCode(c));
          return this;
        }
        // returns code for object literal for the passed argument list of key-value pairs
        object(...keyValues) {
          const code2 = ["{"];
          for (const [key, value] of keyValues) {
            if (code2.length > 1)
              code2.push(",");
            code2.push(key);
            if (key !== value || this.opts.es5) {
              code2.push(":");
              (0, code_1.addCodeArg)(code2, value);
            }
          }
          code2.push("}");
          return new code_1._Code(code2);
        }
        // `if` clause (or statement if `thenBody` and, optionally, `elseBody` are passed)
        if(condition, thenBody, elseBody) {
          this._blockNode(new If(condition));
          if (thenBody && elseBody) {
            this.code(thenBody).else().code(elseBody).endIf();
          } else if (thenBody) {
            this.code(thenBody).endIf();
          } else if (elseBody) {
            throw new Error('CodeGen: "else" body without "then" body');
          }
          return this;
        }
        // `else if` clause - invalid without `if` or after `else` clauses
        elseIf(condition) {
          return this._elseNode(new If(condition));
        }
        // `else` clause - only valid after `if` or `else if` clauses
        else() {
          return this._elseNode(new Else());
        }
        // end `if` statement (needed if gen.if was used only with condition)
        endIf() {
          return this._endBlockNode(If, Else);
        }
        _for(node, forBody) {
          this._blockNode(node);
          if (forBody)
            this.code(forBody).endFor();
          return this;
        }
        // a generic `for` clause (or statement if `forBody` is passed)
        for(iteration, forBody) {
          return this._for(new ForLoop(iteration), forBody);
        }
        // `for` statement for a range of values
        forRange(nameOrPrefix, from, to, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.let) {
          const name = this._scope.toName(nameOrPrefix);
          return this._for(new ForRange(varKind, name, from, to), () => forBody(name));
        }
        // `for-of` statement (in es5 mode replace with a normal for loop)
        forOf(nameOrPrefix, iterable, forBody, varKind = scope_1.varKinds.const) {
          const name = this._scope.toName(nameOrPrefix);
          if (this.opts.es5) {
            const arr = iterable instanceof code_1.Name ? iterable : this.var("_arr", iterable);
            return this.forRange("_i", 0, (0, code_1._)`${arr}.length`, (i) => {
              this.var(name, (0, code_1._)`${arr}[${i}]`);
              forBody(name);
            });
          }
          return this._for(new ForIter("of", varKind, name, iterable), () => forBody(name));
        }
        // `for-in` statement.
        // With option `ownProperties` replaced with a `for-of` loop for object keys
        forIn(nameOrPrefix, obj, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.const) {
          if (this.opts.ownProperties) {
            return this.forOf(nameOrPrefix, (0, code_1._)`Object.keys(${obj})`, forBody);
          }
          const name = this._scope.toName(nameOrPrefix);
          return this._for(new ForIter("in", varKind, name, obj), () => forBody(name));
        }
        // end `for` loop
        endFor() {
          return this._endBlockNode(For);
        }
        // `label` statement
        label(label) {
          return this._leafNode(new Label(label));
        }
        // `break` statement
        break(label) {
          return this._leafNode(new Break(label));
        }
        // `return` statement
        return(value) {
          const node = new Return();
          this._blockNode(node);
          this.code(value);
          if (node.nodes.length !== 1)
            throw new Error('CodeGen: "return" should have one node');
          return this._endBlockNode(Return);
        }
        // `try` statement
        try(tryBody, catchCode, finallyCode) {
          if (!catchCode && !finallyCode)
            throw new Error('CodeGen: "try" without "catch" and "finally"');
          const node = new Try();
          this._blockNode(node);
          this.code(tryBody);
          if (catchCode) {
            const error = this.name("e");
            this._currNode = node.catch = new Catch(error);
            catchCode(error);
          }
          if (finallyCode) {
            this._currNode = node.finally = new Finally();
            this.code(finallyCode);
          }
          return this._endBlockNode(Catch, Finally);
        }
        // `throw` statement
        throw(error) {
          return this._leafNode(new Throw(error));
        }
        // start self-balancing block
        block(body, nodeCount) {
          this._blockStarts.push(this._nodes.length);
          if (body)
            this.code(body).endBlock(nodeCount);
          return this;
        }
        // end the current self-balancing block
        endBlock(nodeCount) {
          const len = this._blockStarts.pop();
          if (len === void 0)
            throw new Error("CodeGen: not in self-balancing block");
          const toClose = this._nodes.length - len;
          if (toClose < 0 || nodeCount !== void 0 && toClose !== nodeCount) {
            throw new Error(`CodeGen: wrong number of nodes: ${toClose} vs ${nodeCount} expected`);
          }
          this._nodes.length = len;
          return this;
        }
        // `function` heading (or definition if funcBody is passed)
        func(name, args = code_1.nil, async, funcBody) {
          this._blockNode(new Func(name, args, async));
          if (funcBody)
            this.code(funcBody).endFunc();
          return this;
        }
        // end function definition
        endFunc() {
          return this._endBlockNode(Func);
        }
        optimize(n = 1) {
          while (n-- > 0) {
            this._root.optimizeNodes();
            this._root.optimizeNames(this._root.names, this._constants);
          }
        }
        _leafNode(node) {
          this._currNode.nodes.push(node);
          return this;
        }
        _blockNode(node) {
          this._currNode.nodes.push(node);
          this._nodes.push(node);
        }
        _endBlockNode(N1, N2) {
          const n = this._currNode;
          if (n instanceof N1 || N2 && n instanceof N2) {
            this._nodes.pop();
            return this;
          }
          throw new Error(`CodeGen: not in block "${N2 ? `${N1.kind}/${N2.kind}` : N1.kind}"`);
        }
        _elseNode(node) {
          const n = this._currNode;
          if (!(n instanceof If)) {
            throw new Error('CodeGen: "else" without "if"');
          }
          this._currNode = n.else = node;
          return this;
        }
        get _root() {
          return this._nodes[0];
        }
        get _currNode() {
          const ns = this._nodes;
          return ns[ns.length - 1];
        }
        set _currNode(node) {
          const ns = this._nodes;
          ns[ns.length - 1] = node;
        }
      }
      exports3.CodeGen = CodeGen;
      function addNames(names2, from) {
        for (const n in from)
          names2[n] = (names2[n] || 0) + (from[n] || 0);
        return names2;
      }
      function addExprNames(names2, from) {
        return from instanceof code_1._CodeOrName ? addNames(names2, from.names) : names2;
      }
      function optimizeExpr(expr, names2, constants) {
        if (expr instanceof code_1.Name)
          return replaceName(expr);
        if (!canOptimize(expr))
          return expr;
        return new code_1._Code(expr._items.reduce((items2, c) => {
          if (c instanceof code_1.Name)
            c = replaceName(c);
          if (c instanceof code_1._Code)
            items2.push(...c._items);
          else
            items2.push(c);
          return items2;
        }, []));
        function replaceName(n) {
          const c = constants[n.str];
          if (c === void 0 || names2[n.str] !== 1)
            return n;
          delete names2[n.str];
          return c;
        }
        function canOptimize(e) {
          return e instanceof code_1._Code && e._items.some((c) => c instanceof code_1.Name && names2[c.str] === 1 && constants[c.str] !== void 0);
        }
      }
      function subtractNames(names2, from) {
        for (const n in from)
          names2[n] = (names2[n] || 0) - (from[n] || 0);
      }
      function not2(x) {
        return typeof x == "boolean" || typeof x == "number" || x === null ? !x : (0, code_1._)`!${par(x)}`;
      }
      exports3.not = not2;
      const andCode = mappend(exports3.operators.AND);
      function and(...args) {
        return args.reduce(andCode);
      }
      exports3.and = and;
      const orCode = mappend(exports3.operators.OR);
      function or(...args) {
        return args.reduce(orCode);
      }
      exports3.or = or;
      function mappend(op) {
        return (x, y) => x === code_1.nil ? y : y === code_1.nil ? x : (0, code_1._)`${par(x)} ${op} ${par(y)}`;
      }
      function par(x) {
        return x instanceof code_1.Name ? x : (0, code_1._)`(${x})`;
      }
    })(codegen);
    return codegen;
  }
  var util$1 = {};
  var hasRequiredUtil;
  function requireUtil() {
    if (hasRequiredUtil) return util$1;
    hasRequiredUtil = 1;
    Object.defineProperty(util$1, "__esModule", { value: true });
    util$1.checkStrictMode = util$1.getErrorPath = util$1.Type = util$1.useFunc = util$1.setEvaluated = util$1.evaluatedPropsToName = util$1.mergeEvaluated = util$1.eachItem = util$1.unescapeJsonPointer = util$1.escapeJsonPointer = util$1.escapeFragment = util$1.unescapeFragment = util$1.schemaRefOrVal = util$1.schemaHasRulesButRef = util$1.schemaHasRules = util$1.checkUnknownRules = util$1.alwaysValidSchema = util$1.toHash = void 0;
    const codegen_1 = requireCodegen();
    const code_1 = requireCode$1();
    function toHash(arr) {
      const hash = {};
      for (const item of arr)
        hash[item] = true;
      return hash;
    }
    util$1.toHash = toHash;
    function alwaysValidSchema(it, schema) {
      if (typeof schema == "boolean")
        return schema;
      if (Object.keys(schema).length === 0)
        return true;
      checkUnknownRules(it, schema);
      return !schemaHasRules(schema, it.self.RULES.all);
    }
    util$1.alwaysValidSchema = alwaysValidSchema;
    function checkUnknownRules(it, schema = it.schema) {
      const { opts, self: self2 } = it;
      if (!opts.strictSchema)
        return;
      if (typeof schema === "boolean")
        return;
      const rules2 = self2.RULES.keywords;
      for (const key in schema) {
        if (!rules2[key])
          checkStrictMode(it, `unknown keyword: "${key}"`);
      }
    }
    util$1.checkUnknownRules = checkUnknownRules;
    function schemaHasRules(schema, rules2) {
      if (typeof schema == "boolean")
        return !schema;
      for (const key in schema)
        if (rules2[key])
          return true;
      return false;
    }
    util$1.schemaHasRules = schemaHasRules;
    function schemaHasRulesButRef(schema, RULES) {
      if (typeof schema == "boolean")
        return !schema;
      for (const key in schema)
        if (key !== "$ref" && RULES.all[key])
          return true;
      return false;
    }
    util$1.schemaHasRulesButRef = schemaHasRulesButRef;
    function schemaRefOrVal({ topSchemaRef, schemaPath }, schema, keyword2, $data) {
      if (!$data) {
        if (typeof schema == "number" || typeof schema == "boolean")
          return schema;
        if (typeof schema == "string")
          return (0, codegen_1._)`${schema}`;
      }
      return (0, codegen_1._)`${topSchemaRef}${schemaPath}${(0, codegen_1.getProperty)(keyword2)}`;
    }
    util$1.schemaRefOrVal = schemaRefOrVal;
    function unescapeFragment(str) {
      return unescapeJsonPointer(decodeURIComponent(str));
    }
    util$1.unescapeFragment = unescapeFragment;
    function escapeFragment(str) {
      return encodeURIComponent(escapeJsonPointer(str));
    }
    util$1.escapeFragment = escapeFragment;
    function escapeJsonPointer(str) {
      if (typeof str == "number")
        return `${str}`;
      return str.replace(/~/g, "~0").replace(/\//g, "~1");
    }
    util$1.escapeJsonPointer = escapeJsonPointer;
    function unescapeJsonPointer(str) {
      return str.replace(/~1/g, "/").replace(/~0/g, "~");
    }
    util$1.unescapeJsonPointer = unescapeJsonPointer;
    function eachItem(xs, f) {
      if (Array.isArray(xs)) {
        for (const x of xs)
          f(x);
      } else {
        f(xs);
      }
    }
    util$1.eachItem = eachItem;
    function makeMergeEvaluated({ mergeNames, mergeToName, mergeValues: mergeValues2, resultToName }) {
      return (gen, from, to, toName) => {
        const res = to === void 0 ? from : to instanceof codegen_1.Name ? (from instanceof codegen_1.Name ? mergeNames(gen, from, to) : mergeToName(gen, from, to), to) : from instanceof codegen_1.Name ? (mergeToName(gen, to, from), from) : mergeValues2(from, to);
        return toName === codegen_1.Name && !(res instanceof codegen_1.Name) ? resultToName(gen, res) : res;
      };
    }
    util$1.mergeEvaluated = {
      props: makeMergeEvaluated({
        mergeNames: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true && ${from} !== undefined`, () => {
          gen.if((0, codegen_1._)`${from} === true`, () => gen.assign(to, true), () => gen.assign(to, (0, codegen_1._)`${to} || {}`).code((0, codegen_1._)`Object.assign(${to}, ${from})`));
        }),
        mergeToName: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true`, () => {
          if (from === true) {
            gen.assign(to, true);
          } else {
            gen.assign(to, (0, codegen_1._)`${to} || {}`);
            setEvaluated(gen, to, from);
          }
        }),
        mergeValues: (from, to) => from === true ? true : { ...from, ...to },
        resultToName: evaluatedPropsToName
      }),
      items: makeMergeEvaluated({
        mergeNames: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true && ${from} !== undefined`, () => gen.assign(to, (0, codegen_1._)`${from} === true ? true : ${to} > ${from} ? ${to} : ${from}`)),
        mergeToName: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true`, () => gen.assign(to, from === true ? true : (0, codegen_1._)`${to} > ${from} ? ${to} : ${from}`)),
        mergeValues: (from, to) => from === true ? true : Math.max(from, to),
        resultToName: (gen, items2) => gen.var("items", items2)
      })
    };
    function evaluatedPropsToName(gen, ps) {
      if (ps === true)
        return gen.var("props", true);
      const props = gen.var("props", (0, codegen_1._)`{}`);
      if (ps !== void 0)
        setEvaluated(gen, props, ps);
      return props;
    }
    util$1.evaluatedPropsToName = evaluatedPropsToName;
    function setEvaluated(gen, props, ps) {
      Object.keys(ps).forEach((p) => gen.assign((0, codegen_1._)`${props}${(0, codegen_1.getProperty)(p)}`, true));
    }
    util$1.setEvaluated = setEvaluated;
    const snippets = {};
    function useFunc(gen, f) {
      return gen.scopeValue("func", {
        ref: f,
        code: snippets[f.code] || (snippets[f.code] = new code_1._Code(f.code))
      });
    }
    util$1.useFunc = useFunc;
    var Type;
    (function(Type2) {
      Type2[Type2["Num"] = 0] = "Num";
      Type2[Type2["Str"] = 1] = "Str";
    })(Type || (util$1.Type = Type = {}));
    function getErrorPath(dataProp, dataPropType, jsPropertySyntax) {
      if (dataProp instanceof codegen_1.Name) {
        const isNumber = dataPropType === Type.Num;
        return jsPropertySyntax ? isNumber ? (0, codegen_1._)`"[" + ${dataProp} + "]"` : (0, codegen_1._)`"['" + ${dataProp} + "']"` : isNumber ? (0, codegen_1._)`"/" + ${dataProp}` : (0, codegen_1._)`"/" + ${dataProp}.replace(/~/g, "~0").replace(/\\//g, "~1")`;
      }
      return jsPropertySyntax ? (0, codegen_1.getProperty)(dataProp).toString() : "/" + escapeJsonPointer(dataProp);
    }
    util$1.getErrorPath = getErrorPath;
    function checkStrictMode(it, msg, mode = it.opts.strictSchema) {
      if (!mode)
        return;
      msg = `strict mode: ${msg}`;
      if (mode === true)
        throw new Error(msg);
      it.self.logger.warn(msg);
    }
    util$1.checkStrictMode = checkStrictMode;
    return util$1;
  }
  var names = {};
  var hasRequiredNames;
  function requireNames() {
    if (hasRequiredNames) return names;
    hasRequiredNames = 1;
    Object.defineProperty(names, "__esModule", { value: true });
    const codegen_1 = requireCodegen();
    const names$1 = {
      // validation function arguments
      data: new codegen_1.Name("data"),
      // data passed to validation function
      // args passed from referencing schema
      valCxt: new codegen_1.Name("valCxt"),
      // validation/data context - should not be used directly, it is destructured to the names below
      instancePath: new codegen_1.Name("instancePath"),
      parentData: new codegen_1.Name("parentData"),
      parentDataProperty: new codegen_1.Name("parentDataProperty"),
      rootData: new codegen_1.Name("rootData"),
      // root data - same as the data passed to the first/top validation function
      dynamicAnchors: new codegen_1.Name("dynamicAnchors"),
      // used to support recursiveRef and dynamicRef
      // function scoped variables
      vErrors: new codegen_1.Name("vErrors"),
      // null or array of validation errors
      errors: new codegen_1.Name("errors"),
      // counter of validation errors
      this: new codegen_1.Name("this"),
      // "globals"
      self: new codegen_1.Name("self"),
      scope: new codegen_1.Name("scope"),
      // JTD serialize/parse name for JSON string and position
      json: new codegen_1.Name("json"),
      jsonPos: new codegen_1.Name("jsonPos"),
      jsonLen: new codegen_1.Name("jsonLen"),
      jsonPart: new codegen_1.Name("jsonPart")
    };
    names.default = names$1;
    return names;
  }
  var hasRequiredErrors;
  function requireErrors() {
    if (hasRequiredErrors) return errors;
    hasRequiredErrors = 1;
    (function(exports3) {
      Object.defineProperty(exports3, "__esModule", { value: true });
      exports3.extendErrors = exports3.resetErrorsCount = exports3.reportExtraError = exports3.reportError = exports3.keyword$DataError = exports3.keywordError = void 0;
      const codegen_1 = requireCodegen();
      const util_1 = requireUtil();
      const names_1 = requireNames();
      exports3.keywordError = {
        message: ({ keyword: keyword2 }) => (0, codegen_1.str)`must pass "${keyword2}" keyword validation`
      };
      exports3.keyword$DataError = {
        message: ({ keyword: keyword2, schemaType }) => schemaType ? (0, codegen_1.str)`"${keyword2}" keyword must be ${schemaType} ($data)` : (0, codegen_1.str)`"${keyword2}" keyword is invalid ($data)`
      };
      function reportError(cxt, error = exports3.keywordError, errorPaths, overrideAllErrors) {
        const { it } = cxt;
        const { gen, compositeRule, allErrors } = it;
        const errObj = errorObjectCode(cxt, error, errorPaths);
        if (overrideAllErrors !== null && overrideAllErrors !== void 0 ? overrideAllErrors : compositeRule || allErrors) {
          addError(gen, errObj);
        } else {
          returnErrors(it, (0, codegen_1._)`[${errObj}]`);
        }
      }
      exports3.reportError = reportError;
      function reportExtraError(cxt, error = exports3.keywordError, errorPaths) {
        const { it } = cxt;
        const { gen, compositeRule, allErrors } = it;
        const errObj = errorObjectCode(cxt, error, errorPaths);
        addError(gen, errObj);
        if (!(compositeRule || allErrors)) {
          returnErrors(it, names_1.default.vErrors);
        }
      }
      exports3.reportExtraError = reportExtraError;
      function resetErrorsCount(gen, errsCount) {
        gen.assign(names_1.default.errors, errsCount);
        gen.if((0, codegen_1._)`${names_1.default.vErrors} !== null`, () => gen.if(errsCount, () => gen.assign((0, codegen_1._)`${names_1.default.vErrors}.length`, errsCount), () => gen.assign(names_1.default.vErrors, null)));
      }
      exports3.resetErrorsCount = resetErrorsCount;
      function extendErrors({ gen, keyword: keyword2, schemaValue, data, errsCount, it }) {
        if (errsCount === void 0)
          throw new Error("ajv implementation error");
        const err = gen.name("err");
        gen.forRange("i", errsCount, names_1.default.errors, (i) => {
          gen.const(err, (0, codegen_1._)`${names_1.default.vErrors}[${i}]`);
          gen.if((0, codegen_1._)`${err}.instancePath === undefined`, () => gen.assign((0, codegen_1._)`${err}.instancePath`, (0, codegen_1.strConcat)(names_1.default.instancePath, it.errorPath)));
          gen.assign((0, codegen_1._)`${err}.schemaPath`, (0, codegen_1.str)`${it.errSchemaPath}/${keyword2}`);
          if (it.opts.verbose) {
            gen.assign((0, codegen_1._)`${err}.schema`, schemaValue);
            gen.assign((0, codegen_1._)`${err}.data`, data);
          }
        });
      }
      exports3.extendErrors = extendErrors;
      function addError(gen, errObj) {
        const err = gen.const("err", errObj);
        gen.if((0, codegen_1._)`${names_1.default.vErrors} === null`, () => gen.assign(names_1.default.vErrors, (0, codegen_1._)`[${err}]`), (0, codegen_1._)`${names_1.default.vErrors}.push(${err})`);
        gen.code((0, codegen_1._)`${names_1.default.errors}++`);
      }
      function returnErrors(it, errs) {
        const { gen, validateName, schemaEnv } = it;
        if (schemaEnv.$async) {
          gen.throw((0, codegen_1._)`new ${it.ValidationError}(${errs})`);
        } else {
          gen.assign((0, codegen_1._)`${validateName}.errors`, errs);
          gen.return(false);
        }
      }
      const E = {
        keyword: new codegen_1.Name("keyword"),
        schemaPath: new codegen_1.Name("schemaPath"),
        // also used in JTD errors
        params: new codegen_1.Name("params"),
        propertyName: new codegen_1.Name("propertyName"),
        message: new codegen_1.Name("message"),
        schema: new codegen_1.Name("schema"),
        parentSchema: new codegen_1.Name("parentSchema")
      };
      function errorObjectCode(cxt, error, errorPaths) {
        const { createErrors } = cxt.it;
        if (createErrors === false)
          return (0, codegen_1._)`{}`;
        return errorObject(cxt, error, errorPaths);
      }
      function errorObject(cxt, error, errorPaths = {}) {
        const { gen, it } = cxt;
        const keyValues = [
          errorInstancePath(it, errorPaths),
          errorSchemaPath(cxt, errorPaths)
        ];
        extraErrorProps(cxt, error, keyValues);
        return gen.object(...keyValues);
      }
      function errorInstancePath({ errorPath }, { instancePath }) {
        const instPath = instancePath ? (0, codegen_1.str)`${errorPath}${(0, util_1.getErrorPath)(instancePath, util_1.Type.Str)}` : errorPath;
        return [names_1.default.instancePath, (0, codegen_1.strConcat)(names_1.default.instancePath, instPath)];
      }
      function errorSchemaPath({ keyword: keyword2, it: { errSchemaPath } }, { schemaPath, parentSchema }) {
        let schPath = parentSchema ? errSchemaPath : (0, codegen_1.str)`${errSchemaPath}/${keyword2}`;
        if (schemaPath) {
          schPath = (0, codegen_1.str)`${schPath}${(0, util_1.getErrorPath)(schemaPath, util_1.Type.Str)}`;
        }
        return [E.schemaPath, schPath];
      }
      function extraErrorProps(cxt, { params, message }, keyValues) {
        const { keyword: keyword2, data, schemaValue, it } = cxt;
        const { opts, propertyName, topSchemaRef, schemaPath } = it;
        keyValues.push([E.keyword, keyword2], [E.params, typeof params == "function" ? params(cxt) : params || (0, codegen_1._)`{}`]);
        if (opts.messages) {
          keyValues.push([E.message, typeof message == "function" ? message(cxt) : message]);
        }
        if (opts.verbose) {
          keyValues.push([E.schema, schemaValue], [E.parentSchema, (0, codegen_1._)`${topSchemaRef}${schemaPath}`], [names_1.default.data, data]);
        }
        if (propertyName)
          keyValues.push([E.propertyName, propertyName]);
      }
    })(errors);
    return errors;
  }
  var hasRequiredBoolSchema;
  function requireBoolSchema() {
    if (hasRequiredBoolSchema) return boolSchema;
    hasRequiredBoolSchema = 1;
    Object.defineProperty(boolSchema, "__esModule", { value: true });
    boolSchema.boolOrEmptySchema = boolSchema.topBoolOrEmptySchema = void 0;
    const errors_1 = requireErrors();
    const codegen_1 = requireCodegen();
    const names_1 = requireNames();
    const boolError = {
      message: "boolean schema is false"
    };
    function topBoolOrEmptySchema(it) {
      const { gen, schema, validateName } = it;
      if (schema === false) {
        falseSchemaError(it, false);
      } else if (typeof schema == "object" && schema.$async === true) {
        gen.return(names_1.default.data);
      } else {
        gen.assign((0, codegen_1._)`${validateName}.errors`, null);
        gen.return(true);
      }
    }
    boolSchema.topBoolOrEmptySchema = topBoolOrEmptySchema;
    function boolOrEmptySchema(it, valid) {
      const { gen, schema } = it;
      if (schema === false) {
        gen.var(valid, false);
        falseSchemaError(it);
      } else {
        gen.var(valid, true);
      }
    }
    boolSchema.boolOrEmptySchema = boolOrEmptySchema;
    function falseSchemaError(it, overrideAllErrors) {
      const { gen, data } = it;
      const cxt = {
        gen,
        keyword: "false schema",
        data,
        schema: false,
        schemaCode: false,
        schemaValue: false,
        params: {},
        it
      };
      (0, errors_1.reportError)(cxt, boolError, void 0, overrideAllErrors);
    }
    return boolSchema;
  }
  var dataType = {};
  var rules = {};
  var hasRequiredRules;
  function requireRules() {
    if (hasRequiredRules) return rules;
    hasRequiredRules = 1;
    Object.defineProperty(rules, "__esModule", { value: true });
    rules.getRules = rules.isJSONType = void 0;
    const _jsonTypes = ["string", "number", "integer", "boolean", "null", "object", "array"];
    const jsonTypes = new Set(_jsonTypes);
    function isJSONType(x) {
      return typeof x == "string" && jsonTypes.has(x);
    }
    rules.isJSONType = isJSONType;
    function getRules() {
      const groups = {
        number: { type: "number", rules: [] },
        string: { type: "string", rules: [] },
        array: { type: "array", rules: [] },
        object: { type: "object", rules: [] }
      };
      return {
        types: { ...groups, integer: true, boolean: true, null: true },
        rules: [{ rules: [] }, groups.number, groups.string, groups.array, groups.object],
        post: { rules: [] },
        all: {},
        keywords: {}
      };
    }
    rules.getRules = getRules;
    return rules;
  }
  var applicability = {};
  var hasRequiredApplicability;
  function requireApplicability() {
    if (hasRequiredApplicability) return applicability;
    hasRequiredApplicability = 1;
    Object.defineProperty(applicability, "__esModule", { value: true });
    applicability.shouldUseRule = applicability.shouldUseGroup = applicability.schemaHasRulesForType = void 0;
    function schemaHasRulesForType({ schema, self: self2 }, type2) {
      const group = self2.RULES.types[type2];
      return group && group !== true && shouldUseGroup(schema, group);
    }
    applicability.schemaHasRulesForType = schemaHasRulesForType;
    function shouldUseGroup(schema, group) {
      return group.rules.some((rule) => shouldUseRule(schema, rule));
    }
    applicability.shouldUseGroup = shouldUseGroup;
    function shouldUseRule(schema, rule) {
      var _a;
      return schema[rule.keyword] !== void 0 || ((_a = rule.definition.implements) === null || _a === void 0 ? void 0 : _a.some((kwd) => schema[kwd] !== void 0));
    }
    applicability.shouldUseRule = shouldUseRule;
    return applicability;
  }
  var hasRequiredDataType;
  function requireDataType() {
    if (hasRequiredDataType) return dataType;
    hasRequiredDataType = 1;
    Object.defineProperty(dataType, "__esModule", { value: true });
    dataType.reportTypeError = dataType.checkDataTypes = dataType.checkDataType = dataType.coerceAndCheckDataType = dataType.getJSONTypes = dataType.getSchemaTypes = dataType.DataType = void 0;
    const rules_1 = requireRules();
    const applicability_1 = requireApplicability();
    const errors_1 = requireErrors();
    const codegen_1 = requireCodegen();
    const util_1 = requireUtil();
    var DataType;
    (function(DataType2) {
      DataType2[DataType2["Correct"] = 0] = "Correct";
      DataType2[DataType2["Wrong"] = 1] = "Wrong";
    })(DataType || (dataType.DataType = DataType = {}));
    function getSchemaTypes(schema) {
      const types2 = getJSONTypes(schema.type);
      const hasNull = types2.includes("null");
      if (hasNull) {
        if (schema.nullable === false)
          throw new Error("type: null contradicts nullable: false");
      } else {
        if (!types2.length && schema.nullable !== void 0) {
          throw new Error('"nullable" cannot be used without "type"');
        }
        if (schema.nullable === true)
          types2.push("null");
      }
      return types2;
    }
    dataType.getSchemaTypes = getSchemaTypes;
    function getJSONTypes(ts) {
      const types2 = Array.isArray(ts) ? ts : ts ? [ts] : [];
      if (types2.every(rules_1.isJSONType))
        return types2;
      throw new Error("type must be JSONType or JSONType[]: " + types2.join(","));
    }
    dataType.getJSONTypes = getJSONTypes;
    function coerceAndCheckDataType(it, types2) {
      const { gen, data, opts } = it;
      const coerceTo = coerceToTypes(types2, opts.coerceTypes);
      const checkTypes = types2.length > 0 && !(coerceTo.length === 0 && types2.length === 1 && (0, applicability_1.schemaHasRulesForType)(it, types2[0]));
      if (checkTypes) {
        const wrongType = checkDataTypes(types2, data, opts.strictNumbers, DataType.Wrong);
        gen.if(wrongType, () => {
          if (coerceTo.length)
            coerceData(it, types2, coerceTo);
          else
            reportTypeError(it);
        });
      }
      return checkTypes;
    }
    dataType.coerceAndCheckDataType = coerceAndCheckDataType;
    const COERCIBLE = /* @__PURE__ */ new Set(["string", "number", "integer", "boolean", "null"]);
    function coerceToTypes(types2, coerceTypes) {
      return coerceTypes ? types2.filter((t) => COERCIBLE.has(t) || coerceTypes === "array" && t === "array") : [];
    }
    function coerceData(it, types2, coerceTo) {
      const { gen, data, opts } = it;
      const dataType2 = gen.let("dataType", (0, codegen_1._)`typeof ${data}`);
      const coerced = gen.let("coerced", (0, codegen_1._)`undefined`);
      if (opts.coerceTypes === "array") {
        gen.if((0, codegen_1._)`${dataType2} == 'object' && Array.isArray(${data}) && ${data}.length == 1`, () => gen.assign(data, (0, codegen_1._)`${data}[0]`).assign(dataType2, (0, codegen_1._)`typeof ${data}`).if(checkDataTypes(types2, data, opts.strictNumbers), () => gen.assign(coerced, data)));
      }
      gen.if((0, codegen_1._)`${coerced} !== undefined`);
      for (const t of coerceTo) {
        if (COERCIBLE.has(t) || t === "array" && opts.coerceTypes === "array") {
          coerceSpecificType(t);
        }
      }
      gen.else();
      reportTypeError(it);
      gen.endIf();
      gen.if((0, codegen_1._)`${coerced} !== undefined`, () => {
        gen.assign(data, coerced);
        assignParentData(it, coerced);
      });
      function coerceSpecificType(t) {
        switch (t) {
          case "string":
            gen.elseIf((0, codegen_1._)`${dataType2} == "number" || ${dataType2} == "boolean"`).assign(coerced, (0, codegen_1._)`"" + ${data}`).elseIf((0, codegen_1._)`${data} === null`).assign(coerced, (0, codegen_1._)`""`);
            return;
          case "number":
            gen.elseIf((0, codegen_1._)`${dataType2} == "boolean" || ${data} === null
              || (${dataType2} == "string" && ${data} && ${data} == +${data})`).assign(coerced, (0, codegen_1._)`+${data}`);
            return;
          case "integer":
            gen.elseIf((0, codegen_1._)`${dataType2} === "boolean" || ${data} === null
              || (${dataType2} === "string" && ${data} && ${data} == +${data} && !(${data} % 1))`).assign(coerced, (0, codegen_1._)`+${data}`);
            return;
          case "boolean":
            gen.elseIf((0, codegen_1._)`${data} === "false" || ${data} === 0 || ${data} === null`).assign(coerced, false).elseIf((0, codegen_1._)`${data} === "true" || ${data} === 1`).assign(coerced, true);
            return;
          case "null":
            gen.elseIf((0, codegen_1._)`${data} === "" || ${data} === 0 || ${data} === false`);
            gen.assign(coerced, null);
            return;
          case "array":
            gen.elseIf((0, codegen_1._)`${dataType2} === "string" || ${dataType2} === "number"
              || ${dataType2} === "boolean" || ${data} === null`).assign(coerced, (0, codegen_1._)`[${data}]`);
        }
      }
    }
    function assignParentData({ gen, parentData, parentDataProperty }, expr) {
      gen.if((0, codegen_1._)`${parentData} !== undefined`, () => gen.assign((0, codegen_1._)`${parentData}[${parentDataProperty}]`, expr));
    }
    function checkDataType(dataType2, data, strictNums, correct = DataType.Correct) {
      const EQ = correct === DataType.Correct ? codegen_1.operators.EQ : codegen_1.operators.NEQ;
      let cond;
      switch (dataType2) {
        case "null":
          return (0, codegen_1._)`${data} ${EQ} null`;
        case "array":
          cond = (0, codegen_1._)`Array.isArray(${data})`;
          break;
        case "object":
          cond = (0, codegen_1._)`${data} && typeof ${data} == "object" && !Array.isArray(${data})`;
          break;
        case "integer":
          cond = numCond((0, codegen_1._)`!(${data} % 1) && !isNaN(${data})`);
          break;
        case "number":
          cond = numCond();
          break;
        default:
          return (0, codegen_1._)`typeof ${data} ${EQ} ${dataType2}`;
      }
      return correct === DataType.Correct ? cond : (0, codegen_1.not)(cond);
      function numCond(_cond = codegen_1.nil) {
        return (0, codegen_1.and)((0, codegen_1._)`typeof ${data} == "number"`, _cond, strictNums ? (0, codegen_1._)`isFinite(${data})` : codegen_1.nil);
      }
    }
    dataType.checkDataType = checkDataType;
    function checkDataTypes(dataTypes, data, strictNums, correct) {
      if (dataTypes.length === 1) {
        return checkDataType(dataTypes[0], data, strictNums, correct);
      }
      let cond;
      const types2 = (0, util_1.toHash)(dataTypes);
      if (types2.array && types2.object) {
        const notObj = (0, codegen_1._)`typeof ${data} != "object"`;
        cond = types2.null ? notObj : (0, codegen_1._)`!${data} || ${notObj}`;
        delete types2.null;
        delete types2.array;
        delete types2.object;
      } else {
        cond = codegen_1.nil;
      }
      if (types2.number)
        delete types2.integer;
      for (const t in types2)
        cond = (0, codegen_1.and)(cond, checkDataType(t, data, strictNums, correct));
      return cond;
    }
    dataType.checkDataTypes = checkDataTypes;
    const typeError = {
      message: ({ schema }) => `must be ${schema}`,
      params: ({ schema, schemaValue }) => typeof schema == "string" ? (0, codegen_1._)`{type: ${schema}}` : (0, codegen_1._)`{type: ${schemaValue}}`
    };
    function reportTypeError(it) {
      const cxt = getTypeErrorContext(it);
      (0, errors_1.reportError)(cxt, typeError);
    }
    dataType.reportTypeError = reportTypeError;
    function getTypeErrorContext(it) {
      const { gen, data, schema } = it;
      const schemaCode = (0, util_1.schemaRefOrVal)(it, schema, "type");
      return {
        gen,
        keyword: "type",
        data,
        schema: schema.type,
        schemaCode,
        schemaValue: schemaCode,
        parentSchema: schema,
        params: {},
        it
      };
    }
    return dataType;
  }
  var defaults = {};
  var hasRequiredDefaults;
  function requireDefaults() {
    if (hasRequiredDefaults) return defaults;
    hasRequiredDefaults = 1;
    Object.defineProperty(defaults, "__esModule", { value: true });
    defaults.assignDefaults = void 0;
    const codegen_1 = requireCodegen();
    const util_1 = requireUtil();
    function assignDefaults(it, ty) {
      const { properties: properties2, items: items2 } = it.schema;
      if (ty === "object" && properties2) {
        for (const key in properties2) {
          assignDefault(it, key, properties2[key].default);
        }
      } else if (ty === "array" && Array.isArray(items2)) {
        items2.forEach((sch, i) => assignDefault(it, i, sch.default));
      }
    }
    defaults.assignDefaults = assignDefaults;
    function assignDefault(it, prop, defaultValue) {
      const { gen, compositeRule, data, opts } = it;
      if (defaultValue === void 0)
        return;
      const childData = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(prop)}`;
      if (compositeRule) {
        (0, util_1.checkStrictMode)(it, `default is ignored for: ${childData}`);
        return;
      }
      let condition = (0, codegen_1._)`${childData} === undefined`;
      if (opts.useDefaults === "empty") {
        condition = (0, codegen_1._)`${condition} || ${childData} === null || ${childData} === ""`;
      }
      gen.if(condition, (0, codegen_1._)`${childData} = ${(0, codegen_1.stringify)(defaultValue)}`);
    }
    return defaults;
  }
  var keyword = {};
  var code = {};
  var hasRequiredCode;
  function requireCode() {
    if (hasRequiredCode) return code;
    hasRequiredCode = 1;
    Object.defineProperty(code, "__esModule", { value: true });
    code.validateUnion = code.validateArray = code.usePattern = code.callValidateCode = code.schemaProperties = code.allSchemaProperties = code.noPropertyInData = code.propertyInData = code.isOwnProperty = code.hasPropFunc = code.reportMissingProp = code.checkMissingProp = code.checkReportMissingProp = void 0;
    const codegen_1 = requireCodegen();
    const util_1 = requireUtil();
    const names_1 = requireNames();
    const util_2 = requireUtil();
    function checkReportMissingProp(cxt, prop) {
      const { gen, data, it } = cxt;
      gen.if(noPropertyInData(gen, data, prop, it.opts.ownProperties), () => {
        cxt.setParams({ missingProperty: (0, codegen_1._)`${prop}` }, true);
        cxt.error();
      });
    }
    code.checkReportMissingProp = checkReportMissingProp;
    function checkMissingProp({ gen, data, it: { opts } }, properties2, missing) {
      return (0, codegen_1.or)(...properties2.map((prop) => (0, codegen_1.and)(noPropertyInData(gen, data, prop, opts.ownProperties), (0, codegen_1._)`${missing} = ${prop}`)));
    }
    code.checkMissingProp = checkMissingProp;
    function reportMissingProp(cxt, missing) {
      cxt.setParams({ missingProperty: missing }, true);
      cxt.error();
    }
    code.reportMissingProp = reportMissingProp;
    function hasPropFunc(gen) {
      return gen.scopeValue("func", {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        ref: Object.prototype.hasOwnProperty,
        code: (0, codegen_1._)`Object.prototype.hasOwnProperty`
      });
    }
    code.hasPropFunc = hasPropFunc;
    function isOwnProperty(gen, data, property) {
      return (0, codegen_1._)`${hasPropFunc(gen)}.call(${data}, ${property})`;
    }
    code.isOwnProperty = isOwnProperty;
    function propertyInData(gen, data, property, ownProperties) {
      const cond = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(property)} !== undefined`;
      return ownProperties ? (0, codegen_1._)`${cond} && ${isOwnProperty(gen, data, property)}` : cond;
    }
    code.propertyInData = propertyInData;
    function noPropertyInData(gen, data, property, ownProperties) {
      const cond = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(property)} === undefined`;
      return ownProperties ? (0, codegen_1.or)(cond, (0, codegen_1.not)(isOwnProperty(gen, data, property))) : cond;
    }
    code.noPropertyInData = noPropertyInData;
    function allSchemaProperties(schemaMap) {
      return schemaMap ? Object.keys(schemaMap).filter((p) => p !== "__proto__") : [];
    }
    code.allSchemaProperties = allSchemaProperties;
    function schemaProperties(it, schemaMap) {
      return allSchemaProperties(schemaMap).filter((p) => !(0, util_1.alwaysValidSchema)(it, schemaMap[p]));
    }
    code.schemaProperties = schemaProperties;
    function callValidateCode({ schemaCode, data, it: { gen, topSchemaRef, schemaPath, errorPath }, it }, func, context, passSchema) {
      const dataAndSchema = passSchema ? (0, codegen_1._)`${schemaCode}, ${data}, ${topSchemaRef}${schemaPath}` : data;
      const valCxt = [
        [names_1.default.instancePath, (0, codegen_1.strConcat)(names_1.default.instancePath, errorPath)],
        [names_1.default.parentData, it.parentData],
        [names_1.default.parentDataProperty, it.parentDataProperty],
        [names_1.default.rootData, names_1.default.rootData]
      ];
      if (it.opts.dynamicRef)
        valCxt.push([names_1.default.dynamicAnchors, names_1.default.dynamicAnchors]);
      const args = (0, codegen_1._)`${dataAndSchema}, ${gen.object(...valCxt)}`;
      return context !== codegen_1.nil ? (0, codegen_1._)`${func}.call(${context}, ${args})` : (0, codegen_1._)`${func}(${args})`;
    }
    code.callValidateCode = callValidateCode;
    const newRegExp = (0, codegen_1._)`new RegExp`;
    function usePattern({ gen, it: { opts } }, pattern2) {
      const u = opts.unicodeRegExp ? "u" : "";
      const { regExp } = opts.code;
      const rx = regExp(pattern2, u);
      return gen.scopeValue("pattern", {
        key: rx.toString(),
        ref: rx,
        code: (0, codegen_1._)`${regExp.code === "new RegExp" ? newRegExp : (0, util_2.useFunc)(gen, regExp)}(${pattern2}, ${u})`
      });
    }
    code.usePattern = usePattern;
    function validateArray(cxt) {
      const { gen, data, keyword: keyword2, it } = cxt;
      const valid = gen.name("valid");
      if (it.allErrors) {
        const validArr = gen.let("valid", true);
        validateItems(() => gen.assign(validArr, false));
        return validArr;
      }
      gen.var(valid, true);
      validateItems(() => gen.break());
      return valid;
      function validateItems(notValid) {
        const len = gen.const("len", (0, codegen_1._)`${data}.length`);
        gen.forRange("i", 0, len, (i) => {
          cxt.subschema({
            keyword: keyword2,
            dataProp: i,
            dataPropType: util_1.Type.Num
          }, valid);
          gen.if((0, codegen_1.not)(valid), notValid);
        });
      }
    }
    code.validateArray = validateArray;
    function validateUnion(cxt) {
      const { gen, schema, keyword: keyword2, it } = cxt;
      if (!Array.isArray(schema))
        throw new Error("ajv implementation error");
      const alwaysValid = schema.some((sch) => (0, util_1.alwaysValidSchema)(it, sch));
      if (alwaysValid && !it.opts.unevaluated)
        return;
      const valid = gen.let("valid", false);
      const schValid = gen.name("_valid");
      gen.block(() => schema.forEach((_sch, i) => {
        const schCxt = cxt.subschema({
          keyword: keyword2,
          schemaProp: i,
          compositeRule: true
        }, schValid);
        gen.assign(valid, (0, codegen_1._)`${valid} || ${schValid}`);
        const merged = cxt.mergeValidEvaluated(schCxt, schValid);
        if (!merged)
          gen.if((0, codegen_1.not)(valid));
      }));
      cxt.result(valid, () => cxt.reset(), () => cxt.error(true));
    }
    code.validateUnion = validateUnion;
    return code;
  }
  var hasRequiredKeyword;
  function requireKeyword() {
    if (hasRequiredKeyword) return keyword;
    hasRequiredKeyword = 1;
    Object.defineProperty(keyword, "__esModule", { value: true });
    keyword.validateKeywordUsage = keyword.validSchemaType = keyword.funcKeywordCode = keyword.macroKeywordCode = void 0;
    const codegen_1 = requireCodegen();
    const names_1 = requireNames();
    const code_1 = requireCode();
    const errors_1 = requireErrors();
    function macroKeywordCode(cxt, def) {
      const { gen, keyword: keyword2, schema, parentSchema, it } = cxt;
      const macroSchema = def.macro.call(it.self, schema, parentSchema, it);
      const schemaRef = useKeyword(gen, keyword2, macroSchema);
      if (it.opts.validateSchema !== false)
        it.self.validateSchema(macroSchema, true);
      const valid = gen.name("valid");
      cxt.subschema({
        schema: macroSchema,
        schemaPath: codegen_1.nil,
        errSchemaPath: `${it.errSchemaPath}/${keyword2}`,
        topSchemaRef: schemaRef,
        compositeRule: true
      }, valid);
      cxt.pass(valid, () => cxt.error(true));
    }
    keyword.macroKeywordCode = macroKeywordCode;
    function funcKeywordCode(cxt, def) {
      var _a;
      const { gen, keyword: keyword2, schema, parentSchema, $data, it } = cxt;
      checkAsyncKeyword(it, def);
      const validate2 = !$data && def.compile ? def.compile.call(it.self, schema, parentSchema, it) : def.validate;
      const validateRef = useKeyword(gen, keyword2, validate2);
      const valid = gen.let("valid");
      cxt.block$data(valid, validateKeyword);
      cxt.ok((_a = def.valid) !== null && _a !== void 0 ? _a : valid);
      function validateKeyword() {
        if (def.errors === false) {
          assignValid();
          if (def.modifying)
            modifyData(cxt);
          reportErrs(() => cxt.error());
        } else {
          const ruleErrs = def.async ? validateAsync() : validateSync();
          if (def.modifying)
            modifyData(cxt);
          reportErrs(() => addErrs(cxt, ruleErrs));
        }
      }
      function validateAsync() {
        const ruleErrs = gen.let("ruleErrs", null);
        gen.try(() => assignValid((0, codegen_1._)`await `), (e) => gen.assign(valid, false).if((0, codegen_1._)`${e} instanceof ${it.ValidationError}`, () => gen.assign(ruleErrs, (0, codegen_1._)`${e}.errors`), () => gen.throw(e)));
        return ruleErrs;
      }
      function validateSync() {
        const validateErrs = (0, codegen_1._)`${validateRef}.errors`;
        gen.assign(validateErrs, null);
        assignValid(codegen_1.nil);
        return validateErrs;
      }
      function assignValid(_await = def.async ? (0, codegen_1._)`await ` : codegen_1.nil) {
        const passCxt = it.opts.passContext ? names_1.default.this : names_1.default.self;
        const passSchema = !("compile" in def && !$data || def.schema === false);
        gen.assign(valid, (0, codegen_1._)`${_await}${(0, code_1.callValidateCode)(cxt, validateRef, passCxt, passSchema)}`, def.modifying);
      }
      function reportErrs(errors2) {
        var _a2;
        gen.if((0, codegen_1.not)((_a2 = def.valid) !== null && _a2 !== void 0 ? _a2 : valid), errors2);
      }
    }
    keyword.funcKeywordCode = funcKeywordCode;
    function modifyData(cxt) {
      const { gen, data, it } = cxt;
      gen.if(it.parentData, () => gen.assign(data, (0, codegen_1._)`${it.parentData}[${it.parentDataProperty}]`));
    }
    function addErrs(cxt, errs) {
      const { gen } = cxt;
      gen.if((0, codegen_1._)`Array.isArray(${errs})`, () => {
        gen.assign(names_1.default.vErrors, (0, codegen_1._)`${names_1.default.vErrors} === null ? ${errs} : ${names_1.default.vErrors}.concat(${errs})`).assign(names_1.default.errors, (0, codegen_1._)`${names_1.default.vErrors}.length`);
        (0, errors_1.extendErrors)(cxt);
      }, () => cxt.error());
    }
    function checkAsyncKeyword({ schemaEnv }, def) {
      if (def.async && !schemaEnv.$async)
        throw new Error("async keyword in sync schema");
    }
    function useKeyword(gen, keyword2, result) {
      if (result === void 0)
        throw new Error(`keyword "${keyword2}" failed to compile`);
      return gen.scopeValue("keyword", typeof result == "function" ? { ref: result } : { ref: result, code: (0, codegen_1.stringify)(result) });
    }
    function validSchemaType(schema, schemaType, allowUndefined = false) {
      return !schemaType.length || schemaType.some((st) => st === "array" ? Array.isArray(schema) : st === "object" ? schema && typeof schema == "object" && !Array.isArray(schema) : typeof schema == st || allowUndefined && typeof schema == "undefined");
    }
    keyword.validSchemaType = validSchemaType;
    function validateKeywordUsage({ schema, opts, self: self2, errSchemaPath }, def, keyword2) {
      if (Array.isArray(def.keyword) ? !def.keyword.includes(keyword2) : def.keyword !== keyword2) {
        throw new Error("ajv implementation error");
      }
      const deps = def.dependencies;
      if (deps === null || deps === void 0 ? void 0 : deps.some((kwd) => !Object.prototype.hasOwnProperty.call(schema, kwd))) {
        throw new Error(`parent schema must have dependencies of ${keyword2}: ${deps.join(",")}`);
      }
      if (def.validateSchema) {
        const valid = def.validateSchema(schema[keyword2]);
        if (!valid) {
          const msg = `keyword "${keyword2}" value is invalid at path "${errSchemaPath}": ` + self2.errorsText(def.validateSchema.errors);
          if (opts.validateSchema === "log")
            self2.logger.error(msg);
          else
            throw new Error(msg);
        }
      }
    }
    keyword.validateKeywordUsage = validateKeywordUsage;
    return keyword;
  }
  var subschema = {};
  var hasRequiredSubschema;
  function requireSubschema() {
    if (hasRequiredSubschema) return subschema;
    hasRequiredSubschema = 1;
    Object.defineProperty(subschema, "__esModule", { value: true });
    subschema.extendSubschemaMode = subschema.extendSubschemaData = subschema.getSubschema = void 0;
    const codegen_1 = requireCodegen();
    const util_1 = requireUtil();
    function getSubschema(it, { keyword: keyword2, schemaProp, schema, schemaPath, errSchemaPath, topSchemaRef }) {
      if (keyword2 !== void 0 && schema !== void 0) {
        throw new Error('both "keyword" and "schema" passed, only one allowed');
      }
      if (keyword2 !== void 0) {
        const sch = it.schema[keyword2];
        return schemaProp === void 0 ? {
          schema: sch,
          schemaPath: (0, codegen_1._)`${it.schemaPath}${(0, codegen_1.getProperty)(keyword2)}`,
          errSchemaPath: `${it.errSchemaPath}/${keyword2}`
        } : {
          schema: sch[schemaProp],
          schemaPath: (0, codegen_1._)`${it.schemaPath}${(0, codegen_1.getProperty)(keyword2)}${(0, codegen_1.getProperty)(schemaProp)}`,
          errSchemaPath: `${it.errSchemaPath}/${keyword2}/${(0, util_1.escapeFragment)(schemaProp)}`
        };
      }
      if (schema !== void 0) {
        if (schemaPath === void 0 || errSchemaPath === void 0 || topSchemaRef === void 0) {
          throw new Error('"schemaPath", "errSchemaPath" and "topSchemaRef" are required with "schema"');
        }
        return {
          schema,
          schemaPath,
          topSchemaRef,
          errSchemaPath
        };
      }
      throw new Error('either "keyword" or "schema" must be passed');
    }
    subschema.getSubschema = getSubschema;
    function extendSubschemaData(subschema2, it, { dataProp, dataPropType: dpType, data, dataTypes, propertyName }) {
      if (data !== void 0 && dataProp !== void 0) {
        throw new Error('both "data" and "dataProp" passed, only one allowed');
      }
      const { gen } = it;
      if (dataProp !== void 0) {
        const { errorPath, dataPathArr, opts } = it;
        const nextData = gen.let("data", (0, codegen_1._)`${it.data}${(0, codegen_1.getProperty)(dataProp)}`, true);
        dataContextProps(nextData);
        subschema2.errorPath = (0, codegen_1.str)`${errorPath}${(0, util_1.getErrorPath)(dataProp, dpType, opts.jsPropertySyntax)}`;
        subschema2.parentDataProperty = (0, codegen_1._)`${dataProp}`;
        subschema2.dataPathArr = [...dataPathArr, subschema2.parentDataProperty];
      }
      if (data !== void 0) {
        const nextData = data instanceof codegen_1.Name ? data : gen.let("data", data, true);
        dataContextProps(nextData);
        if (propertyName !== void 0)
          subschema2.propertyName = propertyName;
      }
      if (dataTypes)
        subschema2.dataTypes = dataTypes;
      function dataContextProps(_nextData) {
        subschema2.data = _nextData;
        subschema2.dataLevel = it.dataLevel + 1;
        subschema2.dataTypes = [];
        it.definedProperties = /* @__PURE__ */ new Set();
        subschema2.parentData = it.data;
        subschema2.dataNames = [...it.dataNames, _nextData];
      }
    }
    subschema.extendSubschemaData = extendSubschemaData;
    function extendSubschemaMode(subschema2, { jtdDiscriminator, jtdMetadata, compositeRule, createErrors, allErrors }) {
      if (compositeRule !== void 0)
        subschema2.compositeRule = compositeRule;
      if (createErrors !== void 0)
        subschema2.createErrors = createErrors;
      if (allErrors !== void 0)
        subschema2.allErrors = allErrors;
      subschema2.jtdDiscriminator = jtdDiscriminator;
      subschema2.jtdMetadata = jtdMetadata;
    }
    subschema.extendSubschemaMode = extendSubschemaMode;
    return subschema;
  }
  var resolve = {};
  var fastDeepEqual;
  var hasRequiredFastDeepEqual;
  function requireFastDeepEqual() {
    if (hasRequiredFastDeepEqual) return fastDeepEqual;
    hasRequiredFastDeepEqual = 1;
    fastDeepEqual = function equal2(a, b) {
      if (a === b) return true;
      if (a && b && typeof a == "object" && typeof b == "object") {
        if (a.constructor !== b.constructor) return false;
        var length, i, keys;
        if (Array.isArray(a)) {
          length = a.length;
          if (length != b.length) return false;
          for (i = length; i-- !== 0; )
            if (!equal2(a[i], b[i])) return false;
          return true;
        }
        if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
        if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
        if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();
        keys = Object.keys(a);
        length = keys.length;
        if (length !== Object.keys(b).length) return false;
        for (i = length; i-- !== 0; )
          if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;
        for (i = length; i-- !== 0; ) {
          var key = keys[i];
          if (!equal2(a[key], b[key])) return false;
        }
        return true;
      }
      return a !== a && b !== b;
    };
    return fastDeepEqual;
  }
  var jsonSchemaTraverse = { exports: {} };
  var hasRequiredJsonSchemaTraverse;
  function requireJsonSchemaTraverse() {
    if (hasRequiredJsonSchemaTraverse) return jsonSchemaTraverse.exports;
    hasRequiredJsonSchemaTraverse = 1;
    var traverse = jsonSchemaTraverse.exports = function(schema, opts, cb) {
      if (typeof opts == "function") {
        cb = opts;
        opts = {};
      }
      cb = opts.cb || cb;
      var pre = typeof cb == "function" ? cb : cb.pre || function() {
      };
      var post = cb.post || function() {
      };
      _traverse(opts, pre, post, schema, "", schema);
    };
    traverse.keywords = {
      additionalItems: true,
      items: true,
      contains: true,
      additionalProperties: true,
      propertyNames: true,
      not: true,
      if: true,
      then: true,
      else: true
    };
    traverse.arrayKeywords = {
      items: true,
      allOf: true,
      anyOf: true,
      oneOf: true
    };
    traverse.propsKeywords = {
      $defs: true,
      definitions: true,
      properties: true,
      patternProperties: true,
      dependencies: true
    };
    traverse.skipKeywords = {
      default: true,
      enum: true,
      const: true,
      required: true,
      maximum: true,
      minimum: true,
      exclusiveMaximum: true,
      exclusiveMinimum: true,
      multipleOf: true,
      maxLength: true,
      minLength: true,
      pattern: true,
      format: true,
      maxItems: true,
      minItems: true,
      uniqueItems: true,
      maxProperties: true,
      minProperties: true
    };
    function _traverse(opts, pre, post, schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex) {
      if (schema && typeof schema == "object" && !Array.isArray(schema)) {
        pre(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
        for (var key in schema) {
          var sch = schema[key];
          if (Array.isArray(sch)) {
            if (key in traverse.arrayKeywords) {
              for (var i = 0; i < sch.length; i++)
                _traverse(opts, pre, post, sch[i], jsonPtr + "/" + key + "/" + i, rootSchema, jsonPtr, key, schema, i);
            }
          } else if (key in traverse.propsKeywords) {
            if (sch && typeof sch == "object") {
              for (var prop in sch)
                _traverse(opts, pre, post, sch[prop], jsonPtr + "/" + key + "/" + escapeJsonPtr(prop), rootSchema, jsonPtr, key, schema, prop);
            }
          } else if (key in traverse.keywords || opts.allKeys && !(key in traverse.skipKeywords)) {
            _traverse(opts, pre, post, sch, jsonPtr + "/" + key, rootSchema, jsonPtr, key, schema);
          }
        }
        post(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
      }
    }
    function escapeJsonPtr(str) {
      return str.replace(/~/g, "~0").replace(/\//g, "~1");
    }
    return jsonSchemaTraverse.exports;
  }
  var hasRequiredResolve;
  function requireResolve() {
    if (hasRequiredResolve) return resolve;
    hasRequiredResolve = 1;
    Object.defineProperty(resolve, "__esModule", { value: true });
    resolve.getSchemaRefs = resolve.resolveUrl = resolve.normalizeId = resolve._getFullPath = resolve.getFullPath = resolve.inlineRef = void 0;
    const util_1 = requireUtil();
    const equal2 = requireFastDeepEqual();
    const traverse = requireJsonSchemaTraverse();
    const SIMPLE_INLINED = /* @__PURE__ */ new Set([
      "type",
      "format",
      "pattern",
      "maxLength",
      "minLength",
      "maxProperties",
      "minProperties",
      "maxItems",
      "minItems",
      "maximum",
      "minimum",
      "uniqueItems",
      "multipleOf",
      "required",
      "enum",
      "const"
    ]);
    function inlineRef(schema, limit2 = true) {
      if (typeof schema == "boolean")
        return true;
      if (limit2 === true)
        return !hasRef(schema);
      if (!limit2)
        return false;
      return countKeys(schema) <= limit2;
    }
    resolve.inlineRef = inlineRef;
    const REF_KEYWORDS = /* @__PURE__ */ new Set([
      "$ref",
      "$recursiveRef",
      "$recursiveAnchor",
      "$dynamicRef",
      "$dynamicAnchor"
    ]);
    function hasRef(schema) {
      for (const key in schema) {
        if (REF_KEYWORDS.has(key))
          return true;
        const sch = schema[key];
        if (Array.isArray(sch) && sch.some(hasRef))
          return true;
        if (typeof sch == "object" && hasRef(sch))
          return true;
      }
      return false;
    }
    function countKeys(schema) {
      let count = 0;
      for (const key in schema) {
        if (key === "$ref")
          return Infinity;
        count++;
        if (SIMPLE_INLINED.has(key))
          continue;
        if (typeof schema[key] == "object") {
          (0, util_1.eachItem)(schema[key], (sch) => count += countKeys(sch));
        }
        if (count === Infinity)
          return Infinity;
      }
      return count;
    }
    function getFullPath(resolver, id2 = "", normalize) {
      if (normalize !== false)
        id2 = normalizeId(id2);
      const p = resolver.parse(id2);
      return _getFullPath(resolver, p);
    }
    resolve.getFullPath = getFullPath;
    function _getFullPath(resolver, p) {
      const serialized = resolver.serialize(p);
      return serialized.split("#")[0] + "#";
    }
    resolve._getFullPath = _getFullPath;
    const TRAILING_SLASH_HASH = /#\/?$/;
    function normalizeId(id2) {
      return id2 ? id2.replace(TRAILING_SLASH_HASH, "") : "";
    }
    resolve.normalizeId = normalizeId;
    function resolveUrl(resolver, baseId, id2) {
      id2 = normalizeId(id2);
      return resolver.resolve(baseId, id2);
    }
    resolve.resolveUrl = resolveUrl;
    const ANCHOR = /^[a-z_][-a-z0-9._]*$/i;
    function getSchemaRefs(schema, baseId) {
      if (typeof schema == "boolean")
        return {};
      const { schemaId, uriResolver } = this.opts;
      const schId = normalizeId(schema[schemaId] || baseId);
      const baseIds = { "": schId };
      const pathPrefix = getFullPath(uriResolver, schId, false);
      const localRefs = {};
      const schemaRefs = /* @__PURE__ */ new Set();
      traverse(schema, { allKeys: true }, (sch, jsonPtr, _, parentJsonPtr) => {
        if (parentJsonPtr === void 0)
          return;
        const fullPath = pathPrefix + jsonPtr;
        let innerBaseId = baseIds[parentJsonPtr];
        if (typeof sch[schemaId] == "string")
          innerBaseId = addRef.call(this, sch[schemaId]);
        addAnchor.call(this, sch.$anchor);
        addAnchor.call(this, sch.$dynamicAnchor);
        baseIds[jsonPtr] = innerBaseId;
        function addRef(ref2) {
          const _resolve = this.opts.uriResolver.resolve;
          ref2 = normalizeId(innerBaseId ? _resolve(innerBaseId, ref2) : ref2);
          if (schemaRefs.has(ref2))
            throw ambiguos(ref2);
          schemaRefs.add(ref2);
          let schOrRef = this.refs[ref2];
          if (typeof schOrRef == "string")
            schOrRef = this.refs[schOrRef];
          if (typeof schOrRef == "object") {
            checkAmbiguosRef(sch, schOrRef.schema, ref2);
          } else if (ref2 !== normalizeId(fullPath)) {
            if (ref2[0] === "#") {
              checkAmbiguosRef(sch, localRefs[ref2], ref2);
              localRefs[ref2] = sch;
            } else {
              this.refs[ref2] = fullPath;
            }
          }
          return ref2;
        }
        function addAnchor(anchor) {
          if (typeof anchor == "string") {
            if (!ANCHOR.test(anchor))
              throw new Error(`invalid anchor "${anchor}"`);
            addRef.call(this, `#${anchor}`);
          }
        }
      });
      return localRefs;
      function checkAmbiguosRef(sch1, sch2, ref2) {
        if (sch2 !== void 0 && !equal2(sch1, sch2))
          throw ambiguos(ref2);
      }
      function ambiguos(ref2) {
        return new Error(`reference "${ref2}" resolves to more than one schema`);
      }
    }
    resolve.getSchemaRefs = getSchemaRefs;
    return resolve;
  }
  var hasRequiredValidate;
  function requireValidate() {
    if (hasRequiredValidate) return validate;
    hasRequiredValidate = 1;
    Object.defineProperty(validate, "__esModule", { value: true });
    validate.getData = validate.KeywordCxt = validate.validateFunctionCode = void 0;
    const boolSchema_1 = requireBoolSchema();
    const dataType_1 = requireDataType();
    const applicability_1 = requireApplicability();
    const dataType_2 = requireDataType();
    const defaults_1 = requireDefaults();
    const keyword_1 = requireKeyword();
    const subschema_1 = requireSubschema();
    const codegen_1 = requireCodegen();
    const names_1 = requireNames();
    const resolve_1 = requireResolve();
    const util_1 = requireUtil();
    const errors_1 = requireErrors();
    function validateFunctionCode(it) {
      if (isSchemaObj(it)) {
        checkKeywords(it);
        if (schemaCxtHasRules(it)) {
          topSchemaObjCode(it);
          return;
        }
      }
      validateFunction(it, () => (0, boolSchema_1.topBoolOrEmptySchema)(it));
    }
    validate.validateFunctionCode = validateFunctionCode;
    function validateFunction({ gen, validateName, schema, schemaEnv, opts }, body) {
      if (opts.code.es5) {
        gen.func(validateName, (0, codegen_1._)`${names_1.default.data}, ${names_1.default.valCxt}`, schemaEnv.$async, () => {
          gen.code((0, codegen_1._)`"use strict"; ${funcSourceUrl(schema, opts)}`);
          destructureValCxtES5(gen, opts);
          gen.code(body);
        });
      } else {
        gen.func(validateName, (0, codegen_1._)`${names_1.default.data}, ${destructureValCxt(opts)}`, schemaEnv.$async, () => gen.code(funcSourceUrl(schema, opts)).code(body));
      }
    }
    function destructureValCxt(opts) {
      return (0, codegen_1._)`{${names_1.default.instancePath}="", ${names_1.default.parentData}, ${names_1.default.parentDataProperty}, ${names_1.default.rootData}=${names_1.default.data}${opts.dynamicRef ? (0, codegen_1._)`, ${names_1.default.dynamicAnchors}={}` : codegen_1.nil}}={}`;
    }
    function destructureValCxtES5(gen, opts) {
      gen.if(names_1.default.valCxt, () => {
        gen.var(names_1.default.instancePath, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.instancePath}`);
        gen.var(names_1.default.parentData, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.parentData}`);
        gen.var(names_1.default.parentDataProperty, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.parentDataProperty}`);
        gen.var(names_1.default.rootData, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.rootData}`);
        if (opts.dynamicRef)
          gen.var(names_1.default.dynamicAnchors, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.dynamicAnchors}`);
      }, () => {
        gen.var(names_1.default.instancePath, (0, codegen_1._)`""`);
        gen.var(names_1.default.parentData, (0, codegen_1._)`undefined`);
        gen.var(names_1.default.parentDataProperty, (0, codegen_1._)`undefined`);
        gen.var(names_1.default.rootData, names_1.default.data);
        if (opts.dynamicRef)
          gen.var(names_1.default.dynamicAnchors, (0, codegen_1._)`{}`);
      });
    }
    function topSchemaObjCode(it) {
      const { schema, opts, gen } = it;
      validateFunction(it, () => {
        if (opts.$comment && schema.$comment)
          commentKeyword(it);
        checkNoDefault(it);
        gen.let(names_1.default.vErrors, null);
        gen.let(names_1.default.errors, 0);
        if (opts.unevaluated)
          resetEvaluated(it);
        typeAndKeywords(it);
        returnResults(it);
      });
      return;
    }
    function resetEvaluated(it) {
      const { gen, validateName } = it;
      it.evaluated = gen.const("evaluated", (0, codegen_1._)`${validateName}.evaluated`);
      gen.if((0, codegen_1._)`${it.evaluated}.dynamicProps`, () => gen.assign((0, codegen_1._)`${it.evaluated}.props`, (0, codegen_1._)`undefined`));
      gen.if((0, codegen_1._)`${it.evaluated}.dynamicItems`, () => gen.assign((0, codegen_1._)`${it.evaluated}.items`, (0, codegen_1._)`undefined`));
    }
    function funcSourceUrl(schema, opts) {
      const schId = typeof schema == "object" && schema[opts.schemaId];
      return schId && (opts.code.source || opts.code.process) ? (0, codegen_1._)`/*# sourceURL=${schId} */` : codegen_1.nil;
    }
    function subschemaCode(it, valid) {
      if (isSchemaObj(it)) {
        checkKeywords(it);
        if (schemaCxtHasRules(it)) {
          subSchemaObjCode(it, valid);
          return;
        }
      }
      (0, boolSchema_1.boolOrEmptySchema)(it, valid);
    }
    function schemaCxtHasRules({ schema, self: self2 }) {
      if (typeof schema == "boolean")
        return !schema;
      for (const key in schema)
        if (self2.RULES.all[key])
          return true;
      return false;
    }
    function isSchemaObj(it) {
      return typeof it.schema != "boolean";
    }
    function subSchemaObjCode(it, valid) {
      const { schema, gen, opts } = it;
      if (opts.$comment && schema.$comment)
        commentKeyword(it);
      updateContext(it);
      checkAsyncSchema(it);
      const errsCount = gen.const("_errs", names_1.default.errors);
      typeAndKeywords(it, errsCount);
      gen.var(valid, (0, codegen_1._)`${errsCount} === ${names_1.default.errors}`);
    }
    function checkKeywords(it) {
      (0, util_1.checkUnknownRules)(it);
      checkRefsAndKeywords(it);
    }
    function typeAndKeywords(it, errsCount) {
      if (it.opts.jtd)
        return schemaKeywords(it, [], false, errsCount);
      const types2 = (0, dataType_1.getSchemaTypes)(it.schema);
      const checkedTypes = (0, dataType_1.coerceAndCheckDataType)(it, types2);
      schemaKeywords(it, types2, !checkedTypes, errsCount);
    }
    function checkRefsAndKeywords(it) {
      const { schema, errSchemaPath, opts, self: self2 } = it;
      if (schema.$ref && opts.ignoreKeywordsWithRef && (0, util_1.schemaHasRulesButRef)(schema, self2.RULES)) {
        self2.logger.warn(`$ref: keywords ignored in schema at path "${errSchemaPath}"`);
      }
    }
    function checkNoDefault(it) {
      const { schema, opts } = it;
      if (schema.default !== void 0 && opts.useDefaults && opts.strictSchema) {
        (0, util_1.checkStrictMode)(it, "default is ignored in the schema root");
      }
    }
    function updateContext(it) {
      const schId = it.schema[it.opts.schemaId];
      if (schId)
        it.baseId = (0, resolve_1.resolveUrl)(it.opts.uriResolver, it.baseId, schId);
    }
    function checkAsyncSchema(it) {
      if (it.schema.$async && !it.schemaEnv.$async)
        throw new Error("async schema in sync schema");
    }
    function commentKeyword({ gen, schemaEnv, schema, errSchemaPath, opts }) {
      const msg = schema.$comment;
      if (opts.$comment === true) {
        gen.code((0, codegen_1._)`${names_1.default.self}.logger.log(${msg})`);
      } else if (typeof opts.$comment == "function") {
        const schemaPath = (0, codegen_1.str)`${errSchemaPath}/$comment`;
        const rootName = gen.scopeValue("root", { ref: schemaEnv.root });
        gen.code((0, codegen_1._)`${names_1.default.self}.opts.$comment(${msg}, ${schemaPath}, ${rootName}.schema)`);
      }
    }
    function returnResults(it) {
      const { gen, schemaEnv, validateName, ValidationError, opts } = it;
      if (schemaEnv.$async) {
        gen.if((0, codegen_1._)`${names_1.default.errors} === 0`, () => gen.return(names_1.default.data), () => gen.throw((0, codegen_1._)`new ${ValidationError}(${names_1.default.vErrors})`));
      } else {
        gen.assign((0, codegen_1._)`${validateName}.errors`, names_1.default.vErrors);
        if (opts.unevaluated)
          assignEvaluated(it);
        gen.return((0, codegen_1._)`${names_1.default.errors} === 0`);
      }
    }
    function assignEvaluated({ gen, evaluated, props, items: items2 }) {
      if (props instanceof codegen_1.Name)
        gen.assign((0, codegen_1._)`${evaluated}.props`, props);
      if (items2 instanceof codegen_1.Name)
        gen.assign((0, codegen_1._)`${evaluated}.items`, items2);
    }
    function schemaKeywords(it, types2, typeErrors, errsCount) {
      const { gen, schema, data, allErrors, opts, self: self2 } = it;
      const { RULES } = self2;
      if (schema.$ref && (opts.ignoreKeywordsWithRef || !(0, util_1.schemaHasRulesButRef)(schema, RULES))) {
        gen.block(() => keywordCode(it, "$ref", RULES.all.$ref.definition));
        return;
      }
      if (!opts.jtd)
        checkStrictTypes(it, types2);
      gen.block(() => {
        for (const group of RULES.rules)
          groupKeywords(group);
        groupKeywords(RULES.post);
      });
      function groupKeywords(group) {
        if (!(0, applicability_1.shouldUseGroup)(schema, group))
          return;
        if (group.type) {
          gen.if((0, dataType_2.checkDataType)(group.type, data, opts.strictNumbers));
          iterateKeywords(it, group);
          if (types2.length === 1 && types2[0] === group.type && typeErrors) {
            gen.else();
            (0, dataType_2.reportTypeError)(it);
          }
          gen.endIf();
        } else {
          iterateKeywords(it, group);
        }
        if (!allErrors)
          gen.if((0, codegen_1._)`${names_1.default.errors} === ${errsCount || 0}`);
      }
    }
    function iterateKeywords(it, group) {
      const { gen, schema, opts: { useDefaults } } = it;
      if (useDefaults)
        (0, defaults_1.assignDefaults)(it, group.type);
      gen.block(() => {
        for (const rule of group.rules) {
          if ((0, applicability_1.shouldUseRule)(schema, rule)) {
            keywordCode(it, rule.keyword, rule.definition, group.type);
          }
        }
      });
    }
    function checkStrictTypes(it, types2) {
      if (it.schemaEnv.meta || !it.opts.strictTypes)
        return;
      checkContextTypes(it, types2);
      if (!it.opts.allowUnionTypes)
        checkMultipleTypes(it, types2);
      checkKeywordTypes(it, it.dataTypes);
    }
    function checkContextTypes(it, types2) {
      if (!types2.length)
        return;
      if (!it.dataTypes.length) {
        it.dataTypes = types2;
        return;
      }
      types2.forEach((t) => {
        if (!includesType(it.dataTypes, t)) {
          strictTypesError(it, `type "${t}" not allowed by context "${it.dataTypes.join(",")}"`);
        }
      });
      narrowSchemaTypes(it, types2);
    }
    function checkMultipleTypes(it, ts) {
      if (ts.length > 1 && !(ts.length === 2 && ts.includes("null"))) {
        strictTypesError(it, "use allowUnionTypes to allow union type keyword");
      }
    }
    function checkKeywordTypes(it, ts) {
      const rules2 = it.self.RULES.all;
      for (const keyword2 in rules2) {
        const rule = rules2[keyword2];
        if (typeof rule == "object" && (0, applicability_1.shouldUseRule)(it.schema, rule)) {
          const { type: type2 } = rule.definition;
          if (type2.length && !type2.some((t) => hasApplicableType(ts, t))) {
            strictTypesError(it, `missing type "${type2.join(",")}" for keyword "${keyword2}"`);
          }
        }
      }
    }
    function hasApplicableType(schTs, kwdT) {
      return schTs.includes(kwdT) || kwdT === "number" && schTs.includes("integer");
    }
    function includesType(ts, t) {
      return ts.includes(t) || t === "integer" && ts.includes("number");
    }
    function narrowSchemaTypes(it, withTypes) {
      const ts = [];
      for (const t of it.dataTypes) {
        if (includesType(withTypes, t))
          ts.push(t);
        else if (withTypes.includes("integer") && t === "number")
          ts.push("integer");
      }
      it.dataTypes = ts;
    }
    function strictTypesError(it, msg) {
      const schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
      msg += ` at "${schemaPath}" (strictTypes)`;
      (0, util_1.checkStrictMode)(it, msg, it.opts.strictTypes);
    }
    class KeywordCxt {
      constructor(it, def, keyword2) {
        (0, keyword_1.validateKeywordUsage)(it, def, keyword2);
        this.gen = it.gen;
        this.allErrors = it.allErrors;
        this.keyword = keyword2;
        this.data = it.data;
        this.schema = it.schema[keyword2];
        this.$data = def.$data && it.opts.$data && this.schema && this.schema.$data;
        this.schemaValue = (0, util_1.schemaRefOrVal)(it, this.schema, keyword2, this.$data);
        this.schemaType = def.schemaType;
        this.parentSchema = it.schema;
        this.params = {};
        this.it = it;
        this.def = def;
        if (this.$data) {
          this.schemaCode = it.gen.const("vSchema", getData(this.$data, it));
        } else {
          this.schemaCode = this.schemaValue;
          if (!(0, keyword_1.validSchemaType)(this.schema, def.schemaType, def.allowUndefined)) {
            throw new Error(`${keyword2} value must be ${JSON.stringify(def.schemaType)}`);
          }
        }
        if ("code" in def ? def.trackErrors : def.errors !== false) {
          this.errsCount = it.gen.const("_errs", names_1.default.errors);
        }
      }
      result(condition, successAction, failAction) {
        this.failResult((0, codegen_1.not)(condition), successAction, failAction);
      }
      failResult(condition, successAction, failAction) {
        this.gen.if(condition);
        if (failAction)
          failAction();
        else
          this.error();
        if (successAction) {
          this.gen.else();
          successAction();
          if (this.allErrors)
            this.gen.endIf();
        } else {
          if (this.allErrors)
            this.gen.endIf();
          else
            this.gen.else();
        }
      }
      pass(condition, failAction) {
        this.failResult((0, codegen_1.not)(condition), void 0, failAction);
      }
      fail(condition) {
        if (condition === void 0) {
          this.error();
          if (!this.allErrors)
            this.gen.if(false);
          return;
        }
        this.gen.if(condition);
        this.error();
        if (this.allErrors)
          this.gen.endIf();
        else
          this.gen.else();
      }
      fail$data(condition) {
        if (!this.$data)
          return this.fail(condition);
        const { schemaCode } = this;
        this.fail((0, codegen_1._)`${schemaCode} !== undefined && (${(0, codegen_1.or)(this.invalid$data(), condition)})`);
      }
      error(append, errorParams, errorPaths) {
        if (errorParams) {
          this.setParams(errorParams);
          this._error(append, errorPaths);
          this.setParams({});
          return;
        }
        this._error(append, errorPaths);
      }
      _error(append, errorPaths) {
        (append ? errors_1.reportExtraError : errors_1.reportError)(this, this.def.error, errorPaths);
      }
      $dataError() {
        (0, errors_1.reportError)(this, this.def.$dataError || errors_1.keyword$DataError);
      }
      reset() {
        if (this.errsCount === void 0)
          throw new Error('add "trackErrors" to keyword definition');
        (0, errors_1.resetErrorsCount)(this.gen, this.errsCount);
      }
      ok(cond) {
        if (!this.allErrors)
          this.gen.if(cond);
      }
      setParams(obj, assign) {
        if (assign)
          Object.assign(this.params, obj);
        else
          this.params = obj;
      }
      block$data(valid, codeBlock, $dataValid = codegen_1.nil) {
        this.gen.block(() => {
          this.check$data(valid, $dataValid);
          codeBlock();
        });
      }
      check$data(valid = codegen_1.nil, $dataValid = codegen_1.nil) {
        if (!this.$data)
          return;
        const { gen, schemaCode, schemaType, def } = this;
        gen.if((0, codegen_1.or)((0, codegen_1._)`${schemaCode} === undefined`, $dataValid));
        if (valid !== codegen_1.nil)
          gen.assign(valid, true);
        if (schemaType.length || def.validateSchema) {
          gen.elseIf(this.invalid$data());
          this.$dataError();
          if (valid !== codegen_1.nil)
            gen.assign(valid, false);
        }
        gen.else();
      }
      invalid$data() {
        const { gen, schemaCode, schemaType, def, it } = this;
        return (0, codegen_1.or)(wrong$DataType(), invalid$DataSchema());
        function wrong$DataType() {
          if (schemaType.length) {
            if (!(schemaCode instanceof codegen_1.Name))
              throw new Error("ajv implementation error");
            const st = Array.isArray(schemaType) ? schemaType : [schemaType];
            return (0, codegen_1._)`${(0, dataType_2.checkDataTypes)(st, schemaCode, it.opts.strictNumbers, dataType_2.DataType.Wrong)}`;
          }
          return codegen_1.nil;
        }
        function invalid$DataSchema() {
          if (def.validateSchema) {
            const validateSchemaRef = gen.scopeValue("validate$data", { ref: def.validateSchema });
            return (0, codegen_1._)`!${validateSchemaRef}(${schemaCode})`;
          }
          return codegen_1.nil;
        }
      }
      subschema(appl, valid) {
        const subschema2 = (0, subschema_1.getSubschema)(this.it, appl);
        (0, subschema_1.extendSubschemaData)(subschema2, this.it, appl);
        (0, subschema_1.extendSubschemaMode)(subschema2, appl);
        const nextContext = { ...this.it, ...subschema2, items: void 0, props: void 0 };
        subschemaCode(nextContext, valid);
        return nextContext;
      }
      mergeEvaluated(schemaCxt, toName) {
        const { it, gen } = this;
        if (!it.opts.unevaluated)
          return;
        if (it.props !== true && schemaCxt.props !== void 0) {
          it.props = util_1.mergeEvaluated.props(gen, schemaCxt.props, it.props, toName);
        }
        if (it.items !== true && schemaCxt.items !== void 0) {
          it.items = util_1.mergeEvaluated.items(gen, schemaCxt.items, it.items, toName);
        }
      }
      mergeValidEvaluated(schemaCxt, valid) {
        const { it, gen } = this;
        if (it.opts.unevaluated && (it.props !== true || it.items !== true)) {
          gen.if(valid, () => this.mergeEvaluated(schemaCxt, codegen_1.Name));
          return true;
        }
      }
    }
    validate.KeywordCxt = KeywordCxt;
    function keywordCode(it, keyword2, def, ruleType) {
      const cxt = new KeywordCxt(it, def, keyword2);
      if ("code" in def) {
        def.code(cxt, ruleType);
      } else if (cxt.$data && def.validate) {
        (0, keyword_1.funcKeywordCode)(cxt, def);
      } else if ("macro" in def) {
        (0, keyword_1.macroKeywordCode)(cxt, def);
      } else if (def.compile || def.validate) {
        (0, keyword_1.funcKeywordCode)(cxt, def);
      }
    }
    const JSON_POINTER = /^\/(?:[^~]|~0|~1)*$/;
    const RELATIVE_JSON_POINTER = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
    function getData($data, { dataLevel, dataNames, dataPathArr }) {
      let jsonPointer;
      let data;
      if ($data === "")
        return names_1.default.rootData;
      if ($data[0] === "/") {
        if (!JSON_POINTER.test($data))
          throw new Error(`Invalid JSON-pointer: ${$data}`);
        jsonPointer = $data;
        data = names_1.default.rootData;
      } else {
        const matches = RELATIVE_JSON_POINTER.exec($data);
        if (!matches)
          throw new Error(`Invalid JSON-pointer: ${$data}`);
        const up = +matches[1];
        jsonPointer = matches[2];
        if (jsonPointer === "#") {
          if (up >= dataLevel)
            throw new Error(errorMsg("property/index", up));
          return dataPathArr[dataLevel - up];
        }
        if (up > dataLevel)
          throw new Error(errorMsg("data", up));
        data = dataNames[dataLevel - up];
        if (!jsonPointer)
          return data;
      }
      let expr = data;
      const segments = jsonPointer.split("/");
      for (const segment of segments) {
        if (segment) {
          data = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)((0, util_1.unescapeJsonPointer)(segment))}`;
          expr = (0, codegen_1._)`${expr} && ${data}`;
        }
      }
      return expr;
      function errorMsg(pointerType, up) {
        return `Cannot access ${pointerType} ${up} levels up, current level is ${dataLevel}`;
      }
    }
    validate.getData = getData;
    return validate;
  }
  var validation_error = {};
  var hasRequiredValidation_error;
  function requireValidation_error() {
    if (hasRequiredValidation_error) return validation_error;
    hasRequiredValidation_error = 1;
    Object.defineProperty(validation_error, "__esModule", { value: true });
    class ValidationError extends Error {
      constructor(errors2) {
        super("validation failed");
        this.errors = errors2;
        this.ajv = this.validation = true;
      }
    }
    validation_error.default = ValidationError;
    return validation_error;
  }
  var ref_error = {};
  var hasRequiredRef_error;
  function requireRef_error() {
    if (hasRequiredRef_error) return ref_error;
    hasRequiredRef_error = 1;
    Object.defineProperty(ref_error, "__esModule", { value: true });
    const resolve_1 = requireResolve();
    class MissingRefError extends Error {
      constructor(resolver, baseId, ref2, msg) {
        super(msg || `can't resolve reference ${ref2} from id ${baseId}`);
        this.missingRef = (0, resolve_1.resolveUrl)(resolver, baseId, ref2);
        this.missingSchema = (0, resolve_1.normalizeId)((0, resolve_1.getFullPath)(resolver, this.missingRef));
      }
    }
    ref_error.default = MissingRefError;
    return ref_error;
  }
  var compile = {};
  var hasRequiredCompile;
  function requireCompile() {
    if (hasRequiredCompile) return compile;
    hasRequiredCompile = 1;
    Object.defineProperty(compile, "__esModule", { value: true });
    compile.resolveSchema = compile.getCompilingSchema = compile.resolveRef = compile.compileSchema = compile.SchemaEnv = void 0;
    const codegen_1 = requireCodegen();
    const validation_error_1 = requireValidation_error();
    const names_1 = requireNames();
    const resolve_1 = requireResolve();
    const util_1 = requireUtil();
    const validate_1 = requireValidate();
    class SchemaEnv {
      constructor(env) {
        var _a;
        this.refs = {};
        this.dynamicAnchors = {};
        let schema;
        if (typeof env.schema == "object")
          schema = env.schema;
        this.schema = env.schema;
        this.schemaId = env.schemaId;
        this.root = env.root || this;
        this.baseId = (_a = env.baseId) !== null && _a !== void 0 ? _a : (0, resolve_1.normalizeId)(schema === null || schema === void 0 ? void 0 : schema[env.schemaId || "$id"]);
        this.schemaPath = env.schemaPath;
        this.localRefs = env.localRefs;
        this.meta = env.meta;
        this.$async = schema === null || schema === void 0 ? void 0 : schema.$async;
        this.refs = {};
      }
    }
    compile.SchemaEnv = SchemaEnv;
    function compileSchema(sch) {
      const _sch = getCompilingSchema.call(this, sch);
      if (_sch)
        return _sch;
      const rootId = (0, resolve_1.getFullPath)(this.opts.uriResolver, sch.root.baseId);
      const { es5, lines } = this.opts.code;
      const { ownProperties } = this.opts;
      const gen = new codegen_1.CodeGen(this.scope, { es5, lines, ownProperties });
      let _ValidationError;
      if (sch.$async) {
        _ValidationError = gen.scopeValue("Error", {
          ref: validation_error_1.default,
          code: (0, codegen_1._)`require("ajv/dist/runtime/validation_error").default`
        });
      }
      const validateName = gen.scopeName("validate");
      sch.validateName = validateName;
      const schemaCxt = {
        gen,
        allErrors: this.opts.allErrors,
        data: names_1.default.data,
        parentData: names_1.default.parentData,
        parentDataProperty: names_1.default.parentDataProperty,
        dataNames: [names_1.default.data],
        dataPathArr: [codegen_1.nil],
        // TODO can its length be used as dataLevel if nil is removed?
        dataLevel: 0,
        dataTypes: [],
        definedProperties: /* @__PURE__ */ new Set(),
        topSchemaRef: gen.scopeValue("schema", this.opts.code.source === true ? { ref: sch.schema, code: (0, codegen_1.stringify)(sch.schema) } : { ref: sch.schema }),
        validateName,
        ValidationError: _ValidationError,
        schema: sch.schema,
        schemaEnv: sch,
        rootId,
        baseId: sch.baseId || rootId,
        schemaPath: codegen_1.nil,
        errSchemaPath: sch.schemaPath || (this.opts.jtd ? "" : "#"),
        errorPath: (0, codegen_1._)`""`,
        opts: this.opts,
        self: this
      };
      let sourceCode;
      try {
        this._compilations.add(sch);
        (0, validate_1.validateFunctionCode)(schemaCxt);
        gen.optimize(this.opts.code.optimize);
        const validateCode = gen.toString();
        sourceCode = `${gen.scopeRefs(names_1.default.scope)}return ${validateCode}`;
        if (this.opts.code.process)
          sourceCode = this.opts.code.process(sourceCode, sch);
        const makeValidate = new Function(`${names_1.default.self}`, `${names_1.default.scope}`, sourceCode);
        const validate2 = makeValidate(this, this.scope.get());
        this.scope.value(validateName, { ref: validate2 });
        validate2.errors = null;
        validate2.schema = sch.schema;
        validate2.schemaEnv = sch;
        if (sch.$async)
          validate2.$async = true;
        if (this.opts.code.source === true) {
          validate2.source = { validateName, validateCode, scopeValues: gen._values };
        }
        if (this.opts.unevaluated) {
          const { props, items: items2 } = schemaCxt;
          validate2.evaluated = {
            props: props instanceof codegen_1.Name ? void 0 : props,
            items: items2 instanceof codegen_1.Name ? void 0 : items2,
            dynamicProps: props instanceof codegen_1.Name,
            dynamicItems: items2 instanceof codegen_1.Name
          };
          if (validate2.source)
            validate2.source.evaluated = (0, codegen_1.stringify)(validate2.evaluated);
        }
        sch.validate = validate2;
        return sch;
      } catch (e) {
        delete sch.validate;
        delete sch.validateName;
        if (sourceCode)
          this.logger.error("Error compiling schema, function code:", sourceCode);
        throw e;
      } finally {
        this._compilations.delete(sch);
      }
    }
    compile.compileSchema = compileSchema;
    function resolveRef(root, baseId, ref2) {
      var _a;
      ref2 = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, ref2);
      const schOrFunc = root.refs[ref2];
      if (schOrFunc)
        return schOrFunc;
      let _sch = resolve2.call(this, root, ref2);
      if (_sch === void 0) {
        const schema = (_a = root.localRefs) === null || _a === void 0 ? void 0 : _a[ref2];
        const { schemaId } = this.opts;
        if (schema)
          _sch = new SchemaEnv({ schema, schemaId, root, baseId });
      }
      if (_sch === void 0)
        return;
      return root.refs[ref2] = inlineOrCompile.call(this, _sch);
    }
    compile.resolveRef = resolveRef;
    function inlineOrCompile(sch) {
      if ((0, resolve_1.inlineRef)(sch.schema, this.opts.inlineRefs))
        return sch.schema;
      return sch.validate ? sch : compileSchema.call(this, sch);
    }
    function getCompilingSchema(schEnv) {
      for (const sch of this._compilations) {
        if (sameSchemaEnv(sch, schEnv))
          return sch;
      }
    }
    compile.getCompilingSchema = getCompilingSchema;
    function sameSchemaEnv(s1, s2) {
      return s1.schema === s2.schema && s1.root === s2.root && s1.baseId === s2.baseId;
    }
    function resolve2(root, ref2) {
      let sch;
      while (typeof (sch = this.refs[ref2]) == "string")
        ref2 = sch;
      return sch || this.schemas[ref2] || resolveSchema.call(this, root, ref2);
    }
    function resolveSchema(root, ref2) {
      const p = this.opts.uriResolver.parse(ref2);
      const refPath = (0, resolve_1._getFullPath)(this.opts.uriResolver, p);
      let baseId = (0, resolve_1.getFullPath)(this.opts.uriResolver, root.baseId, void 0);
      if (Object.keys(root.schema).length > 0 && refPath === baseId) {
        return getJsonPointer.call(this, p, root);
      }
      const id2 = (0, resolve_1.normalizeId)(refPath);
      const schOrRef = this.refs[id2] || this.schemas[id2];
      if (typeof schOrRef == "string") {
        const sch = resolveSchema.call(this, root, schOrRef);
        if (typeof (sch === null || sch === void 0 ? void 0 : sch.schema) !== "object")
          return;
        return getJsonPointer.call(this, p, sch);
      }
      if (typeof (schOrRef === null || schOrRef === void 0 ? void 0 : schOrRef.schema) !== "object")
        return;
      if (!schOrRef.validate)
        compileSchema.call(this, schOrRef);
      if (id2 === (0, resolve_1.normalizeId)(ref2)) {
        const { schema } = schOrRef;
        const { schemaId } = this.opts;
        const schId = schema[schemaId];
        if (schId)
          baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId);
        return new SchemaEnv({ schema, schemaId, root, baseId });
      }
      return getJsonPointer.call(this, p, schOrRef);
    }
    compile.resolveSchema = resolveSchema;
    const PREVENT_SCOPE_CHANGE = /* @__PURE__ */ new Set([
      "properties",
      "patternProperties",
      "enum",
      "dependencies",
      "definitions"
    ]);
    function getJsonPointer(parsedRef, { baseId, schema, root }) {
      var _a;
      if (((_a = parsedRef.fragment) === null || _a === void 0 ? void 0 : _a[0]) !== "/")
        return;
      for (const part of parsedRef.fragment.slice(1).split("/")) {
        if (typeof schema === "boolean")
          return;
        const partSchema = schema[(0, util_1.unescapeFragment)(part)];
        if (partSchema === void 0)
          return;
        schema = partSchema;
        const schId = typeof schema === "object" && schema[this.opts.schemaId];
        if (!PREVENT_SCOPE_CHANGE.has(part) && schId) {
          baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId);
        }
      }
      let env;
      if (typeof schema != "boolean" && schema.$ref && !(0, util_1.schemaHasRulesButRef)(schema, this.RULES)) {
        const $ref = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schema.$ref);
        env = resolveSchema.call(this, root, $ref);
      }
      const { schemaId } = this.opts;
      env = env || new SchemaEnv({ schema, schemaId, root, baseId });
      if (env.schema !== env.root.schema)
        return env;
      return void 0;
    }
    return compile;
  }
  const $id$1 = "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#";
  const description = "Meta-schema for $data reference (JSON AnySchema extension proposal)";
  const type$1 = "object";
  const required$2 = ["$data"];
  const properties$2 = { "$data": { "type": "string", "anyOf": [{ "format": "relative-json-pointer" }, { "format": "json-pointer" }] } };
  const additionalProperties$1 = false;
  const require$$9 = {
    $id: $id$1,
    description,
    type: type$1,
    required: required$2,
    properties: properties$2,
    additionalProperties: additionalProperties$1
  };
  var uri = {};
  var fastUri = { exports: {} };
  var scopedChars;
  var hasRequiredScopedChars;
  function requireScopedChars() {
    if (hasRequiredScopedChars) return scopedChars;
    hasRequiredScopedChars = 1;
    const HEX = {
      0: 0,
      1: 1,
      2: 2,
      3: 3,
      4: 4,
      5: 5,
      6: 6,
      7: 7,
      8: 8,
      9: 9,
      a: 10,
      A: 10,
      b: 11,
      B: 11,
      c: 12,
      C: 12,
      d: 13,
      D: 13,
      e: 14,
      E: 14,
      f: 15,
      F: 15
    };
    scopedChars = {
      HEX
    };
    return scopedChars;
  }
  var utils;
  var hasRequiredUtils;
  function requireUtils() {
    if (hasRequiredUtils) return utils;
    hasRequiredUtils = 1;
    const { HEX } = requireScopedChars();
    const IPV4_REG = /^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$/u;
    function normalizeIPv4(host) {
      if (findToken(host, ".") < 3) {
        return { host, isIPV4: false };
      }
      const matches = host.match(IPV4_REG) || [];
      const [address] = matches;
      if (address) {
        return { host: stripLeadingZeros(address, "."), isIPV4: true };
      } else {
        return { host, isIPV4: false };
      }
    }
    function stringArrayToHexStripped(input, keepZero = false) {
      let acc = "";
      let strip = true;
      for (const c of input) {
        if (HEX[c] === void 0) return void 0;
        if (c !== "0" && strip === true) strip = false;
        if (!strip) acc += c;
      }
      if (keepZero && acc.length === 0) acc = "0";
      return acc;
    }
    function getIPV6(input) {
      let tokenCount = 0;
      const output = { error: false, address: "", zone: "" };
      const address = [];
      const buffer = [];
      let isZone = false;
      let endipv6Encountered = false;
      let endIpv6 = false;
      function consume() {
        if (buffer.length) {
          if (isZone === false) {
            const hex = stringArrayToHexStripped(buffer);
            if (hex !== void 0) {
              address.push(hex);
            } else {
              output.error = true;
              return false;
            }
          }
          buffer.length = 0;
        }
        return true;
      }
      for (let i = 0; i < input.length; i++) {
        const cursor = input[i];
        if (cursor === "[" || cursor === "]") {
          continue;
        }
        if (cursor === ":") {
          if (endipv6Encountered === true) {
            endIpv6 = true;
          }
          if (!consume()) {
            break;
          }
          tokenCount++;
          address.push(":");
          if (tokenCount > 7) {
            output.error = true;
            break;
          }
          if (i - 1 >= 0 && input[i - 1] === ":") {
            endipv6Encountered = true;
          }
          continue;
        } else if (cursor === "%") {
          if (!consume()) {
            break;
          }
          isZone = true;
        } else {
          buffer.push(cursor);
          continue;
        }
      }
      if (buffer.length) {
        if (isZone) {
          output.zone = buffer.join("");
        } else if (endIpv6) {
          address.push(buffer.join(""));
        } else {
          address.push(stringArrayToHexStripped(buffer));
        }
      }
      output.address = address.join("");
      return output;
    }
    function normalizeIPv6(host) {
      if (findToken(host, ":") < 2) {
        return { host, isIPV6: false };
      }
      const ipv62 = getIPV6(host);
      if (!ipv62.error) {
        let newHost = ipv62.address;
        let escapedHost = ipv62.address;
        if (ipv62.zone) {
          newHost += "%" + ipv62.zone;
          escapedHost += "%25" + ipv62.zone;
        }
        return { host: newHost, escapedHost, isIPV6: true };
      } else {
        return { host, isIPV6: false };
      }
    }
    function stripLeadingZeros(str, token) {
      let out = "";
      let skip = true;
      const l = str.length;
      for (let i = 0; i < l; i++) {
        const c = str[i];
        if (c === "0" && skip) {
          if (i + 1 <= l && str[i + 1] === token || i + 1 === l) {
            out += c;
            skip = false;
          }
        } else {
          if (c === token) {
            skip = true;
          } else {
            skip = false;
          }
          out += c;
        }
      }
      return out;
    }
    function findToken(str, token) {
      let ind = 0;
      for (let i = 0; i < str.length; i++) {
        if (str[i] === token) ind++;
      }
      return ind;
    }
    const RDS1 = /^\.\.?\//u;
    const RDS2 = /^\/\.(?:\/|$)/u;
    const RDS3 = /^\/\.\.(?:\/|$)/u;
    const RDS5 = /^\/?(?:.|\n)*?(?=\/|$)/u;
    function removeDotSegments(input) {
      const output = [];
      while (input.length) {
        if (input.match(RDS1)) {
          input = input.replace(RDS1, "");
        } else if (input.match(RDS2)) {
          input = input.replace(RDS2, "/");
        } else if (input.match(RDS3)) {
          input = input.replace(RDS3, "/");
          output.pop();
        } else if (input === "." || input === "..") {
          input = "";
        } else {
          const im = input.match(RDS5);
          if (im) {
            const s = im[0];
            input = input.slice(s.length);
            output.push(s);
          } else {
            throw new Error("Unexpected dot segment condition");
          }
        }
      }
      return output.join("");
    }
    function normalizeComponentEncoding(components, esc2) {
      const func = esc2 !== true ? escape : unescape;
      if (components.scheme !== void 0) {
        components.scheme = func(components.scheme);
      }
      if (components.userinfo !== void 0) {
        components.userinfo = func(components.userinfo);
      }
      if (components.host !== void 0) {
        components.host = func(components.host);
      }
      if (components.path !== void 0) {
        components.path = func(components.path);
      }
      if (components.query !== void 0) {
        components.query = func(components.query);
      }
      if (components.fragment !== void 0) {
        components.fragment = func(components.fragment);
      }
      return components;
    }
    function recomposeAuthority(components) {
      const uriTokens = [];
      if (components.userinfo !== void 0) {
        uriTokens.push(components.userinfo);
        uriTokens.push("@");
      }
      if (components.host !== void 0) {
        let host = unescape(components.host);
        const ipV4res = normalizeIPv4(host);
        if (ipV4res.isIPV4) {
          host = ipV4res.host;
        } else {
          const ipV6res = normalizeIPv6(ipV4res.host);
          if (ipV6res.isIPV6 === true) {
            host = `[${ipV6res.escapedHost}]`;
          } else {
            host = components.host;
          }
        }
        uriTokens.push(host);
      }
      if (typeof components.port === "number" || typeof components.port === "string") {
        uriTokens.push(":");
        uriTokens.push(String(components.port));
      }
      return uriTokens.length ? uriTokens.join("") : void 0;
    }
    utils = {
      recomposeAuthority,
      normalizeComponentEncoding,
      removeDotSegments,
      normalizeIPv4,
      normalizeIPv6,
      stringArrayToHexStripped
    };
    return utils;
  }
  var schemes;
  var hasRequiredSchemes;
  function requireSchemes() {
    if (hasRequiredSchemes) return schemes;
    hasRequiredSchemes = 1;
    const UUID_REG = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu;
    const URN_REG = /([\da-z][\d\-a-z]{0,31}):((?:[\w!$'()*+,\-.:;=@]|%[\da-f]{2})+)/iu;
    function isSecure(wsComponents) {
      return typeof wsComponents.secure === "boolean" ? wsComponents.secure : String(wsComponents.scheme).toLowerCase() === "wss";
    }
    function httpParse(components) {
      if (!components.host) {
        components.error = components.error || "HTTP URIs must have a host.";
      }
      return components;
    }
    function httpSerialize(components) {
      const secure = String(components.scheme).toLowerCase() === "https";
      if (components.port === (secure ? 443 : 80) || components.port === "") {
        components.port = void 0;
      }
      if (!components.path) {
        components.path = "/";
      }
      return components;
    }
    function wsParse(wsComponents) {
      wsComponents.secure = isSecure(wsComponents);
      wsComponents.resourceName = (wsComponents.path || "/") + (wsComponents.query ? "?" + wsComponents.query : "");
      wsComponents.path = void 0;
      wsComponents.query = void 0;
      return wsComponents;
    }
    function wsSerialize(wsComponents) {
      if (wsComponents.port === (isSecure(wsComponents) ? 443 : 80) || wsComponents.port === "") {
        wsComponents.port = void 0;
      }
      if (typeof wsComponents.secure === "boolean") {
        wsComponents.scheme = wsComponents.secure ? "wss" : "ws";
        wsComponents.secure = void 0;
      }
      if (wsComponents.resourceName) {
        const [path, query] = wsComponents.resourceName.split("?");
        wsComponents.path = path && path !== "/" ? path : void 0;
        wsComponents.query = query;
        wsComponents.resourceName = void 0;
      }
      wsComponents.fragment = void 0;
      return wsComponents;
    }
    function urnParse(urnComponents, options) {
      if (!urnComponents.path) {
        urnComponents.error = "URN can not be parsed";
        return urnComponents;
      }
      const matches = urnComponents.path.match(URN_REG);
      if (matches) {
        const scheme = options.scheme || urnComponents.scheme || "urn";
        urnComponents.nid = matches[1].toLowerCase();
        urnComponents.nss = matches[2];
        const urnScheme = `${scheme}:${options.nid || urnComponents.nid}`;
        const schemeHandler = SCHEMES[urnScheme];
        urnComponents.path = void 0;
        if (schemeHandler) {
          urnComponents = schemeHandler.parse(urnComponents, options);
        }
      } else {
        urnComponents.error = urnComponents.error || "URN can not be parsed.";
      }
      return urnComponents;
    }
    function urnSerialize(urnComponents, options) {
      const scheme = options.scheme || urnComponents.scheme || "urn";
      const nid = urnComponents.nid.toLowerCase();
      const urnScheme = `${scheme}:${options.nid || nid}`;
      const schemeHandler = SCHEMES[urnScheme];
      if (schemeHandler) {
        urnComponents = schemeHandler.serialize(urnComponents, options);
      }
      const uriComponents = urnComponents;
      const nss = urnComponents.nss;
      uriComponents.path = `${nid || options.nid}:${nss}`;
      options.skipEscape = true;
      return uriComponents;
    }
    function urnuuidParse(urnComponents, options) {
      const uuidComponents = urnComponents;
      uuidComponents.uuid = uuidComponents.nss;
      uuidComponents.nss = void 0;
      if (!options.tolerant && (!uuidComponents.uuid || !UUID_REG.test(uuidComponents.uuid))) {
        uuidComponents.error = uuidComponents.error || "UUID is not valid.";
      }
      return uuidComponents;
    }
    function urnuuidSerialize(uuidComponents) {
      const urnComponents = uuidComponents;
      urnComponents.nss = (uuidComponents.uuid || "").toLowerCase();
      return urnComponents;
    }
    const http = {
      scheme: "http",
      domainHost: true,
      parse: httpParse,
      serialize: httpSerialize
    };
    const https = {
      scheme: "https",
      domainHost: http.domainHost,
      parse: httpParse,
      serialize: httpSerialize
    };
    const ws = {
      scheme: "ws",
      domainHost: true,
      parse: wsParse,
      serialize: wsSerialize
    };
    const wss = {
      scheme: "wss",
      domainHost: ws.domainHost,
      parse: ws.parse,
      serialize: ws.serialize
    };
    const urn = {
      scheme: "urn",
      parse: urnParse,
      serialize: urnSerialize,
      skipNormalize: true
    };
    const urnuuid = {
      scheme: "urn:uuid",
      parse: urnuuidParse,
      serialize: urnuuidSerialize,
      skipNormalize: true
    };
    const SCHEMES = {
      http,
      https,
      ws,
      wss,
      urn,
      "urn:uuid": urnuuid
    };
    schemes = SCHEMES;
    return schemes;
  }
  var hasRequiredFastUri;
  function requireFastUri() {
    if (hasRequiredFastUri) return fastUri.exports;
    hasRequiredFastUri = 1;
    const { normalizeIPv6, normalizeIPv4, removeDotSegments, recomposeAuthority, normalizeComponentEncoding } = requireUtils();
    const SCHEMES = requireSchemes();
    function normalize(uri2, options) {
      if (typeof uri2 === "string") {
        uri2 = serialize(parse2(uri2, options), options);
      } else if (typeof uri2 === "object") {
        uri2 = parse2(serialize(uri2, options), options);
      }
      return uri2;
    }
    function resolve2(baseURI, relativeURI, options) {
      const schemelessOptions = Object.assign({ scheme: "null" }, options);
      const resolved = resolveComponents(parse2(baseURI, schemelessOptions), parse2(relativeURI, schemelessOptions), schemelessOptions, true);
      return serialize(resolved, { ...schemelessOptions, skipEscape: true });
    }
    function resolveComponents(base, relative, options, skipNormalization) {
      const target = {};
      if (!skipNormalization) {
        base = parse2(serialize(base, options), options);
        relative = parse2(serialize(relative, options), options);
      }
      options = options || {};
      if (!options.tolerant && relative.scheme) {
        target.scheme = relative.scheme;
        target.userinfo = relative.userinfo;
        target.host = relative.host;
        target.port = relative.port;
        target.path = removeDotSegments(relative.path || "");
        target.query = relative.query;
      } else {
        if (relative.userinfo !== void 0 || relative.host !== void 0 || relative.port !== void 0) {
          target.userinfo = relative.userinfo;
          target.host = relative.host;
          target.port = relative.port;
          target.path = removeDotSegments(relative.path || "");
          target.query = relative.query;
        } else {
          if (!relative.path) {
            target.path = base.path;
            if (relative.query !== void 0) {
              target.query = relative.query;
            } else {
              target.query = base.query;
            }
          } else {
            if (relative.path.charAt(0) === "/") {
              target.path = removeDotSegments(relative.path);
            } else {
              if ((base.userinfo !== void 0 || base.host !== void 0 || base.port !== void 0) && !base.path) {
                target.path = "/" + relative.path;
              } else if (!base.path) {
                target.path = relative.path;
              } else {
                target.path = base.path.slice(0, base.path.lastIndexOf("/") + 1) + relative.path;
              }
              target.path = removeDotSegments(target.path);
            }
            target.query = relative.query;
          }
          target.userinfo = base.userinfo;
          target.host = base.host;
          target.port = base.port;
        }
        target.scheme = base.scheme;
      }
      target.fragment = relative.fragment;
      return target;
    }
    function equal2(uriA, uriB, options) {
      if (typeof uriA === "string") {
        uriA = unescape(uriA);
        uriA = serialize(normalizeComponentEncoding(parse2(uriA, options), true), { ...options, skipEscape: true });
      } else if (typeof uriA === "object") {
        uriA = serialize(normalizeComponentEncoding(uriA, true), { ...options, skipEscape: true });
      }
      if (typeof uriB === "string") {
        uriB = unescape(uriB);
        uriB = serialize(normalizeComponentEncoding(parse2(uriB, options), true), { ...options, skipEscape: true });
      } else if (typeof uriB === "object") {
        uriB = serialize(normalizeComponentEncoding(uriB, true), { ...options, skipEscape: true });
      }
      return uriA.toLowerCase() === uriB.toLowerCase();
    }
    function serialize(cmpts, opts) {
      const components = {
        host: cmpts.host,
        scheme: cmpts.scheme,
        userinfo: cmpts.userinfo,
        port: cmpts.port,
        path: cmpts.path,
        query: cmpts.query,
        nid: cmpts.nid,
        nss: cmpts.nss,
        uuid: cmpts.uuid,
        fragment: cmpts.fragment,
        reference: cmpts.reference,
        resourceName: cmpts.resourceName,
        secure: cmpts.secure,
        error: ""
      };
      const options = Object.assign({}, opts);
      const uriTokens = [];
      const schemeHandler = SCHEMES[(options.scheme || components.scheme || "").toLowerCase()];
      if (schemeHandler && schemeHandler.serialize) schemeHandler.serialize(components, options);
      if (components.path !== void 0) {
        if (!options.skipEscape) {
          components.path = escape(components.path);
          if (components.scheme !== void 0) {
            components.path = components.path.split("%3A").join(":");
          }
        } else {
          components.path = unescape(components.path);
        }
      }
      if (options.reference !== "suffix" && components.scheme) {
        uriTokens.push(components.scheme, ":");
      }
      const authority = recomposeAuthority(components);
      if (authority !== void 0) {
        if (options.reference !== "suffix") {
          uriTokens.push("//");
        }
        uriTokens.push(authority);
        if (components.path && components.path.charAt(0) !== "/") {
          uriTokens.push("/");
        }
      }
      if (components.path !== void 0) {
        let s = components.path;
        if (!options.absolutePath && (!schemeHandler || !schemeHandler.absolutePath)) {
          s = removeDotSegments(s);
        }
        if (authority === void 0) {
          s = s.replace(/^\/\//u, "/%2F");
        }
        uriTokens.push(s);
      }
      if (components.query !== void 0) {
        uriTokens.push("?", components.query);
      }
      if (components.fragment !== void 0) {
        uriTokens.push("#", components.fragment);
      }
      return uriTokens.join("");
    }
    const hexLookUp = Array.from({ length: 127 }, (_v, k) => /[^!"$&'()*+,\-.;=_`a-z{}~]/u.test(String.fromCharCode(k)));
    function nonSimpleDomain(value) {
      let code2 = 0;
      for (let i = 0, len = value.length; i < len; ++i) {
        code2 = value.charCodeAt(i);
        if (code2 > 126 || hexLookUp[code2]) {
          return true;
        }
      }
      return false;
    }
    const URI_PARSE = /^(?:([^#/:?]+):)?(?:\/\/((?:([^#/?@]*)@)?(\[[^#/?\]]+\]|[^#/:?]*)(?::(\d*))?))?([^#?]*)(?:\?([^#]*))?(?:#((?:.|[\n\r])*))?/u;
    function parse2(uri2, opts) {
      const options = Object.assign({}, opts);
      const parsed = {
        scheme: void 0,
        userinfo: void 0,
        host: "",
        port: void 0,
        path: "",
        query: void 0,
        fragment: void 0
      };
      const gotEncoding = uri2.indexOf("%") !== -1;
      let isIP = false;
      if (options.reference === "suffix") uri2 = (options.scheme ? options.scheme + ":" : "") + "//" + uri2;
      const matches = uri2.match(URI_PARSE);
      if (matches) {
        parsed.scheme = matches[1];
        parsed.userinfo = matches[3];
        parsed.host = matches[4];
        parsed.port = parseInt(matches[5], 10);
        parsed.path = matches[6] || "";
        parsed.query = matches[7];
        parsed.fragment = matches[8];
        if (isNaN(parsed.port)) {
          parsed.port = matches[5];
        }
        if (parsed.host) {
          const ipv4result = normalizeIPv4(parsed.host);
          if (ipv4result.isIPV4 === false) {
            const ipv6result = normalizeIPv6(ipv4result.host);
            parsed.host = ipv6result.host.toLowerCase();
            isIP = ipv6result.isIPV6;
          } else {
            parsed.host = ipv4result.host;
            isIP = true;
          }
        }
        if (parsed.scheme === void 0 && parsed.userinfo === void 0 && parsed.host === void 0 && parsed.port === void 0 && parsed.query === void 0 && !parsed.path) {
          parsed.reference = "same-document";
        } else if (parsed.scheme === void 0) {
          parsed.reference = "relative";
        } else if (parsed.fragment === void 0) {
          parsed.reference = "absolute";
        } else {
          parsed.reference = "uri";
        }
        if (options.reference && options.reference !== "suffix" && options.reference !== parsed.reference) {
          parsed.error = parsed.error || "URI is not a " + options.reference + " reference.";
        }
        const schemeHandler = SCHEMES[(options.scheme || parsed.scheme || "").toLowerCase()];
        if (!options.unicodeSupport && (!schemeHandler || !schemeHandler.unicodeSupport)) {
          if (parsed.host && (options.domainHost || schemeHandler && schemeHandler.domainHost) && isIP === false && nonSimpleDomain(parsed.host)) {
            try {
              parsed.host = URL.domainToASCII(parsed.host.toLowerCase());
            } catch (e) {
              parsed.error = parsed.error || "Host's domain name can not be converted to ASCII: " + e;
            }
          }
        }
        if (!schemeHandler || schemeHandler && !schemeHandler.skipNormalize) {
          if (gotEncoding && parsed.scheme !== void 0) {
            parsed.scheme = unescape(parsed.scheme);
          }
          if (gotEncoding && parsed.host !== void 0) {
            parsed.host = unescape(parsed.host);
          }
          if (parsed.path) {
            parsed.path = escape(unescape(parsed.path));
          }
          if (parsed.fragment) {
            parsed.fragment = encodeURI(decodeURIComponent(parsed.fragment));
          }
        }
        if (schemeHandler && schemeHandler.parse) {
          schemeHandler.parse(parsed, options);
        }
      } else {
        parsed.error = parsed.error || "URI can not be parsed.";
      }
      return parsed;
    }
    const fastUri$1 = {
      SCHEMES,
      normalize,
      resolve: resolve2,
      resolveComponents,
      equal: equal2,
      serialize,
      parse: parse2
    };
    fastUri.exports = fastUri$1;
    fastUri.exports.default = fastUri$1;
    fastUri.exports.fastUri = fastUri$1;
    return fastUri.exports;
  }
  var hasRequiredUri;
  function requireUri() {
    if (hasRequiredUri) return uri;
    hasRequiredUri = 1;
    Object.defineProperty(uri, "__esModule", { value: true });
    const uri$1 = requireFastUri();
    uri$1.code = 'require("ajv/dist/runtime/uri").default';
    uri.default = uri$1;
    return uri;
  }
  var hasRequiredCore$1;
  function requireCore$1() {
    if (hasRequiredCore$1) return core$1;
    hasRequiredCore$1 = 1;
    (function(exports3) {
      Object.defineProperty(exports3, "__esModule", { value: true });
      exports3.CodeGen = exports3.Name = exports3.nil = exports3.stringify = exports3.str = exports3._ = exports3.KeywordCxt = void 0;
      var validate_1 = requireValidate();
      Object.defineProperty(exports3, "KeywordCxt", { enumerable: true, get: function() {
        return validate_1.KeywordCxt;
      } });
      var codegen_1 = requireCodegen();
      Object.defineProperty(exports3, "_", { enumerable: true, get: function() {
        return codegen_1._;
      } });
      Object.defineProperty(exports3, "str", { enumerable: true, get: function() {
        return codegen_1.str;
      } });
      Object.defineProperty(exports3, "stringify", { enumerable: true, get: function() {
        return codegen_1.stringify;
      } });
      Object.defineProperty(exports3, "nil", { enumerable: true, get: function() {
        return codegen_1.nil;
      } });
      Object.defineProperty(exports3, "Name", { enumerable: true, get: function() {
        return codegen_1.Name;
      } });
      Object.defineProperty(exports3, "CodeGen", { enumerable: true, get: function() {
        return codegen_1.CodeGen;
      } });
      const validation_error_1 = requireValidation_error();
      const ref_error_1 = requireRef_error();
      const rules_1 = requireRules();
      const compile_1 = requireCompile();
      const codegen_2 = requireCodegen();
      const resolve_1 = requireResolve();
      const dataType_1 = requireDataType();
      const util_1 = requireUtil();
      const $dataRefSchema = require$$9;
      const uri_1 = requireUri();
      const defaultRegExp = (str, flags) => new RegExp(str, flags);
      defaultRegExp.code = "new RegExp";
      const META_IGNORE_OPTIONS = ["removeAdditional", "useDefaults", "coerceTypes"];
      const EXT_SCOPE_NAMES = /* @__PURE__ */ new Set([
        "validate",
        "serialize",
        "parse",
        "wrapper",
        "root",
        "schema",
        "keyword",
        "pattern",
        "formats",
        "validate$data",
        "func",
        "obj",
        "Error"
      ]);
      const removedOptions = {
        errorDataPath: "",
        format: "`validateFormats: false` can be used instead.",
        nullable: '"nullable" keyword is supported by default.',
        jsonPointers: "Deprecated jsPropertySyntax can be used instead.",
        extendRefs: "Deprecated ignoreKeywordsWithRef can be used instead.",
        missingRefs: "Pass empty schema with $id that should be ignored to ajv.addSchema.",
        processCode: "Use option `code: {process: (code, schemaEnv: object) => string}`",
        sourceCode: "Use option `code: {source: true}`",
        strictDefaults: "It is default now, see option `strict`.",
        strictKeywords: "It is default now, see option `strict`.",
        uniqueItems: '"uniqueItems" keyword is always validated.',
        unknownFormats: "Disable strict mode or pass `true` to `ajv.addFormat` (or `formats` option).",
        cache: "Map is used as cache, schema object as key.",
        serialize: "Map is used as cache, schema object as key.",
        ajvErrors: "It is default now."
      };
      const deprecatedOptions = {
        ignoreKeywordsWithRef: "",
        jsPropertySyntax: "",
        unicode: '"minLength"/"maxLength" account for unicode characters by default.'
      };
      const MAX_EXPRESSION = 200;
      function requiredOptions(o) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0;
        const s = o.strict;
        const _optz = (_a = o.code) === null || _a === void 0 ? void 0 : _a.optimize;
        const optimize = _optz === true || _optz === void 0 ? 1 : _optz || 0;
        const regExp = (_c = (_b = o.code) === null || _b === void 0 ? void 0 : _b.regExp) !== null && _c !== void 0 ? _c : defaultRegExp;
        const uriResolver = (_d = o.uriResolver) !== null && _d !== void 0 ? _d : uri_1.default;
        return {
          strictSchema: (_f = (_e = o.strictSchema) !== null && _e !== void 0 ? _e : s) !== null && _f !== void 0 ? _f : true,
          strictNumbers: (_h = (_g = o.strictNumbers) !== null && _g !== void 0 ? _g : s) !== null && _h !== void 0 ? _h : true,
          strictTypes: (_k = (_j = o.strictTypes) !== null && _j !== void 0 ? _j : s) !== null && _k !== void 0 ? _k : "log",
          strictTuples: (_m = (_l = o.strictTuples) !== null && _l !== void 0 ? _l : s) !== null && _m !== void 0 ? _m : "log",
          strictRequired: (_p = (_o = o.strictRequired) !== null && _o !== void 0 ? _o : s) !== null && _p !== void 0 ? _p : false,
          code: o.code ? { ...o.code, optimize, regExp } : { optimize, regExp },
          loopRequired: (_q = o.loopRequired) !== null && _q !== void 0 ? _q : MAX_EXPRESSION,
          loopEnum: (_r = o.loopEnum) !== null && _r !== void 0 ? _r : MAX_EXPRESSION,
          meta: (_s = o.meta) !== null && _s !== void 0 ? _s : true,
          messages: (_t = o.messages) !== null && _t !== void 0 ? _t : true,
          inlineRefs: (_u = o.inlineRefs) !== null && _u !== void 0 ? _u : true,
          schemaId: (_v = o.schemaId) !== null && _v !== void 0 ? _v : "$id",
          addUsedSchema: (_w = o.addUsedSchema) !== null && _w !== void 0 ? _w : true,
          validateSchema: (_x = o.validateSchema) !== null && _x !== void 0 ? _x : true,
          validateFormats: (_y = o.validateFormats) !== null && _y !== void 0 ? _y : true,
          unicodeRegExp: (_z = o.unicodeRegExp) !== null && _z !== void 0 ? _z : true,
          int32range: (_0 = o.int32range) !== null && _0 !== void 0 ? _0 : true,
          uriResolver
        };
      }
      class Ajv {
        constructor(opts = {}) {
          this.schemas = {};
          this.refs = {};
          this.formats = {};
          this._compilations = /* @__PURE__ */ new Set();
          this._loading = {};
          this._cache = /* @__PURE__ */ new Map();
          opts = this.opts = { ...opts, ...requiredOptions(opts) };
          const { es5, lines } = this.opts.code;
          this.scope = new codegen_2.ValueScope({ scope: {}, prefixes: EXT_SCOPE_NAMES, es5, lines });
          this.logger = getLogger(opts.logger);
          const formatOpt = opts.validateFormats;
          opts.validateFormats = false;
          this.RULES = (0, rules_1.getRules)();
          checkOptions.call(this, removedOptions, opts, "NOT SUPPORTED");
          checkOptions.call(this, deprecatedOptions, opts, "DEPRECATED", "warn");
          this._metaOpts = getMetaSchemaOptions.call(this);
          if (opts.formats)
            addInitialFormats.call(this);
          this._addVocabularies();
          this._addDefaultMetaSchema();
          if (opts.keywords)
            addInitialKeywords.call(this, opts.keywords);
          if (typeof opts.meta == "object")
            this.addMetaSchema(opts.meta);
          addInitialSchemas.call(this);
          opts.validateFormats = formatOpt;
        }
        _addVocabularies() {
          this.addKeyword("$async");
        }
        _addDefaultMetaSchema() {
          const { $data, meta, schemaId } = this.opts;
          let _dataRefSchema = $dataRefSchema;
          if (schemaId === "id") {
            _dataRefSchema = { ...$dataRefSchema };
            _dataRefSchema.id = _dataRefSchema.$id;
            delete _dataRefSchema.$id;
          }
          if (meta && $data)
            this.addMetaSchema(_dataRefSchema, _dataRefSchema[schemaId], false);
        }
        defaultMeta() {
          const { meta, schemaId } = this.opts;
          return this.opts.defaultMeta = typeof meta == "object" ? meta[schemaId] || meta : void 0;
        }
        validate(schemaKeyRef, data) {
          let v;
          if (typeof schemaKeyRef == "string") {
            v = this.getSchema(schemaKeyRef);
            if (!v)
              throw new Error(`no schema with key or ref "${schemaKeyRef}"`);
          } else {
            v = this.compile(schemaKeyRef);
          }
          const valid = v(data);
          if (!("$async" in v))
            this.errors = v.errors;
          return valid;
        }
        compile(schema, _meta) {
          const sch = this._addSchema(schema, _meta);
          return sch.validate || this._compileSchemaEnv(sch);
        }
        compileAsync(schema, meta) {
          if (typeof this.opts.loadSchema != "function") {
            throw new Error("options.loadSchema should be a function");
          }
          const { loadSchema } = this.opts;
          return runCompileAsync.call(this, schema, meta);
          async function runCompileAsync(_schema, _meta) {
            await loadMetaSchema.call(this, _schema.$schema);
            const sch = this._addSchema(_schema, _meta);
            return sch.validate || _compileAsync.call(this, sch);
          }
          async function loadMetaSchema($ref) {
            if ($ref && !this.getSchema($ref)) {
              await runCompileAsync.call(this, { $ref }, true);
            }
          }
          async function _compileAsync(sch) {
            try {
              return this._compileSchemaEnv(sch);
            } catch (e) {
              if (!(e instanceof ref_error_1.default))
                throw e;
              checkLoaded.call(this, e);
              await loadMissingSchema.call(this, e.missingSchema);
              return _compileAsync.call(this, sch);
            }
          }
          function checkLoaded({ missingSchema: ref2, missingRef }) {
            if (this.refs[ref2]) {
              throw new Error(`AnySchema ${ref2} is loaded but ${missingRef} cannot be resolved`);
            }
          }
          async function loadMissingSchema(ref2) {
            const _schema = await _loadSchema.call(this, ref2);
            if (!this.refs[ref2])
              await loadMetaSchema.call(this, _schema.$schema);
            if (!this.refs[ref2])
              this.addSchema(_schema, ref2, meta);
          }
          async function _loadSchema(ref2) {
            const p = this._loading[ref2];
            if (p)
              return p;
            try {
              return await (this._loading[ref2] = loadSchema(ref2));
            } finally {
              delete this._loading[ref2];
            }
          }
        }
        // Adds schema to the instance
        addSchema(schema, key, _meta, _validateSchema = this.opts.validateSchema) {
          if (Array.isArray(schema)) {
            for (const sch of schema)
              this.addSchema(sch, void 0, _meta, _validateSchema);
            return this;
          }
          let id2;
          if (typeof schema === "object") {
            const { schemaId } = this.opts;
            id2 = schema[schemaId];
            if (id2 !== void 0 && typeof id2 != "string") {
              throw new Error(`schema ${schemaId} must be string`);
            }
          }
          key = (0, resolve_1.normalizeId)(key || id2);
          this._checkUnique(key);
          this.schemas[key] = this._addSchema(schema, _meta, key, _validateSchema, true);
          return this;
        }
        // Add schema that will be used to validate other schemas
        // options in META_IGNORE_OPTIONS are alway set to false
        addMetaSchema(schema, key, _validateSchema = this.opts.validateSchema) {
          this.addSchema(schema, key, true, _validateSchema);
          return this;
        }
        //  Validate schema against its meta-schema
        validateSchema(schema, throwOrLogError) {
          if (typeof schema == "boolean")
            return true;
          let $schema2;
          $schema2 = schema.$schema;
          if ($schema2 !== void 0 && typeof $schema2 != "string") {
            throw new Error("$schema must be a string");
          }
          $schema2 = $schema2 || this.opts.defaultMeta || this.defaultMeta();
          if (!$schema2) {
            this.logger.warn("meta-schema not available");
            this.errors = null;
            return true;
          }
          const valid = this.validate($schema2, schema);
          if (!valid && throwOrLogError) {
            const message = "schema is invalid: " + this.errorsText();
            if (this.opts.validateSchema === "log")
              this.logger.error(message);
            else
              throw new Error(message);
          }
          return valid;
        }
        // Get compiled schema by `key` or `ref`.
        // (`key` that was passed to `addSchema` or full schema reference - `schema.$id` or resolved id)
        getSchema(keyRef) {
          let sch;
          while (typeof (sch = getSchEnv.call(this, keyRef)) == "string")
            keyRef = sch;
          if (sch === void 0) {
            const { schemaId } = this.opts;
            const root = new compile_1.SchemaEnv({ schema: {}, schemaId });
            sch = compile_1.resolveSchema.call(this, root, keyRef);
            if (!sch)
              return;
            this.refs[keyRef] = sch;
          }
          return sch.validate || this._compileSchemaEnv(sch);
        }
        // Remove cached schema(s).
        // If no parameter is passed all schemas but meta-schemas are removed.
        // If RegExp is passed all schemas with key/id matching pattern but meta-schemas are removed.
        // Even if schema is referenced by other schemas it still can be removed as other schemas have local references.
        removeSchema(schemaKeyRef) {
          if (schemaKeyRef instanceof RegExp) {
            this._removeAllSchemas(this.schemas, schemaKeyRef);
            this._removeAllSchemas(this.refs, schemaKeyRef);
            return this;
          }
          switch (typeof schemaKeyRef) {
            case "undefined":
              this._removeAllSchemas(this.schemas);
              this._removeAllSchemas(this.refs);
              this._cache.clear();
              return this;
            case "string": {
              const sch = getSchEnv.call(this, schemaKeyRef);
              if (typeof sch == "object")
                this._cache.delete(sch.schema);
              delete this.schemas[schemaKeyRef];
              delete this.refs[schemaKeyRef];
              return this;
            }
            case "object": {
              const cacheKey = schemaKeyRef;
              this._cache.delete(cacheKey);
              let id2 = schemaKeyRef[this.opts.schemaId];
              if (id2) {
                id2 = (0, resolve_1.normalizeId)(id2);
                delete this.schemas[id2];
                delete this.refs[id2];
              }
              return this;
            }
            default:
              throw new Error("ajv.removeSchema: invalid parameter");
          }
        }
        // add "vocabulary" - a collection of keywords
        addVocabulary(definitions2) {
          for (const def of definitions2)
            this.addKeyword(def);
          return this;
        }
        addKeyword(kwdOrDef, def) {
          let keyword2;
          if (typeof kwdOrDef == "string") {
            keyword2 = kwdOrDef;
            if (typeof def == "object") {
              this.logger.warn("these parameters are deprecated, see docs for addKeyword");
              def.keyword = keyword2;
            }
          } else if (typeof kwdOrDef == "object" && def === void 0) {
            def = kwdOrDef;
            keyword2 = def.keyword;
            if (Array.isArray(keyword2) && !keyword2.length) {
              throw new Error("addKeywords: keyword must be string or non-empty array");
            }
          } else {
            throw new Error("invalid addKeywords parameters");
          }
          checkKeyword.call(this, keyword2, def);
          if (!def) {
            (0, util_1.eachItem)(keyword2, (kwd) => addRule.call(this, kwd));
            return this;
          }
          keywordMetaschema.call(this, def);
          const definition = {
            ...def,
            type: (0, dataType_1.getJSONTypes)(def.type),
            schemaType: (0, dataType_1.getJSONTypes)(def.schemaType)
          };
          (0, util_1.eachItem)(keyword2, definition.type.length === 0 ? (k) => addRule.call(this, k, definition) : (k) => definition.type.forEach((t) => addRule.call(this, k, definition, t)));
          return this;
        }
        getKeyword(keyword2) {
          const rule = this.RULES.all[keyword2];
          return typeof rule == "object" ? rule.definition : !!rule;
        }
        // Remove keyword
        removeKeyword(keyword2) {
          const { RULES } = this;
          delete RULES.keywords[keyword2];
          delete RULES.all[keyword2];
          for (const group of RULES.rules) {
            const i = group.rules.findIndex((rule) => rule.keyword === keyword2);
            if (i >= 0)
              group.rules.splice(i, 1);
          }
          return this;
        }
        // Add format
        addFormat(name, format2) {
          if (typeof format2 == "string")
            format2 = new RegExp(format2);
          this.formats[name] = format2;
          return this;
        }
        errorsText(errors2 = this.errors, { separator = ", ", dataVar = "data" } = {}) {
          if (!errors2 || errors2.length === 0)
            return "No errors";
          return errors2.map((e) => `${dataVar}${e.instancePath} ${e.message}`).reduce((text, msg) => text + separator + msg);
        }
        $dataMetaSchema(metaSchema, keywordsJsonPointers) {
          const rules2 = this.RULES.all;
          metaSchema = JSON.parse(JSON.stringify(metaSchema));
          for (const jsonPointer of keywordsJsonPointers) {
            const segments = jsonPointer.split("/").slice(1);
            let keywords = metaSchema;
            for (const seg of segments)
              keywords = keywords[seg];
            for (const key in rules2) {
              const rule = rules2[key];
              if (typeof rule != "object")
                continue;
              const { $data } = rule.definition;
              const schema = keywords[key];
              if ($data && schema)
                keywords[key] = schemaOrData(schema);
            }
          }
          return metaSchema;
        }
        _removeAllSchemas(schemas, regex) {
          for (const keyRef in schemas) {
            const sch = schemas[keyRef];
            if (!regex || regex.test(keyRef)) {
              if (typeof sch == "string") {
                delete schemas[keyRef];
              } else if (sch && !sch.meta) {
                this._cache.delete(sch.schema);
                delete schemas[keyRef];
              }
            }
          }
        }
        _addSchema(schema, meta, baseId, validateSchema = this.opts.validateSchema, addSchema = this.opts.addUsedSchema) {
          let id2;
          const { schemaId } = this.opts;
          if (typeof schema == "object") {
            id2 = schema[schemaId];
          } else {
            if (this.opts.jtd)
              throw new Error("schema must be object");
            else if (typeof schema != "boolean")
              throw new Error("schema must be object or boolean");
          }
          let sch = this._cache.get(schema);
          if (sch !== void 0)
            return sch;
          baseId = (0, resolve_1.normalizeId)(id2 || baseId);
          const localRefs = resolve_1.getSchemaRefs.call(this, schema, baseId);
          sch = new compile_1.SchemaEnv({ schema, schemaId, meta, baseId, localRefs });
          this._cache.set(sch.schema, sch);
          if (addSchema && !baseId.startsWith("#")) {
            if (baseId)
              this._checkUnique(baseId);
            this.refs[baseId] = sch;
          }
          if (validateSchema)
            this.validateSchema(schema, true);
          return sch;
        }
        _checkUnique(id2) {
          if (this.schemas[id2] || this.refs[id2]) {
            throw new Error(`schema with key or id "${id2}" already exists`);
          }
        }
        _compileSchemaEnv(sch) {
          if (sch.meta)
            this._compileMetaSchema(sch);
          else
            compile_1.compileSchema.call(this, sch);
          if (!sch.validate)
            throw new Error("ajv implementation error");
          return sch.validate;
        }
        _compileMetaSchema(sch) {
          const currentOpts = this.opts;
          this.opts = this._metaOpts;
          try {
            compile_1.compileSchema.call(this, sch);
          } finally {
            this.opts = currentOpts;
          }
        }
      }
      Ajv.ValidationError = validation_error_1.default;
      Ajv.MissingRefError = ref_error_1.default;
      exports3.default = Ajv;
      function checkOptions(checkOpts, options, msg, log = "error") {
        for (const key in checkOpts) {
          const opt = key;
          if (opt in options)
            this.logger[log](`${msg}: option ${key}. ${checkOpts[opt]}`);
        }
      }
      function getSchEnv(keyRef) {
        keyRef = (0, resolve_1.normalizeId)(keyRef);
        return this.schemas[keyRef] || this.refs[keyRef];
      }
      function addInitialSchemas() {
        const optsSchemas = this.opts.schemas;
        if (!optsSchemas)
          return;
        if (Array.isArray(optsSchemas))
          this.addSchema(optsSchemas);
        else
          for (const key in optsSchemas)
            this.addSchema(optsSchemas[key], key);
      }
      function addInitialFormats() {
        for (const name in this.opts.formats) {
          const format2 = this.opts.formats[name];
          if (format2)
            this.addFormat(name, format2);
        }
      }
      function addInitialKeywords(defs) {
        if (Array.isArray(defs)) {
          this.addVocabulary(defs);
          return;
        }
        this.logger.warn("keywords option as map is deprecated, pass array");
        for (const keyword2 in defs) {
          const def = defs[keyword2];
          if (!def.keyword)
            def.keyword = keyword2;
          this.addKeyword(def);
        }
      }
      function getMetaSchemaOptions() {
        const metaOpts = { ...this.opts };
        for (const opt of META_IGNORE_OPTIONS)
          delete metaOpts[opt];
        return metaOpts;
      }
      const noLogs = { log() {
      }, warn() {
      }, error() {
      } };
      function getLogger(logger) {
        if (logger === false)
          return noLogs;
        if (logger === void 0)
          return console;
        if (logger.log && logger.warn && logger.error)
          return logger;
        throw new Error("logger must implement log, warn and error methods");
      }
      const KEYWORD_NAME = /^[a-z_$][a-z0-9_$:-]*$/i;
      function checkKeyword(keyword2, def) {
        const { RULES } = this;
        (0, util_1.eachItem)(keyword2, (kwd) => {
          if (RULES.keywords[kwd])
            throw new Error(`Keyword ${kwd} is already defined`);
          if (!KEYWORD_NAME.test(kwd))
            throw new Error(`Keyword ${kwd} has invalid name`);
        });
        if (!def)
          return;
        if (def.$data && !("code" in def || "validate" in def)) {
          throw new Error('$data keyword must have "code" or "validate" function');
        }
      }
      function addRule(keyword2, definition, dataType2) {
        var _a;
        const post = definition === null || definition === void 0 ? void 0 : definition.post;
        if (dataType2 && post)
          throw new Error('keyword with "post" flag cannot have "type"');
        const { RULES } = this;
        let ruleGroup = post ? RULES.post : RULES.rules.find(({ type: t }) => t === dataType2);
        if (!ruleGroup) {
          ruleGroup = { type: dataType2, rules: [] };
          RULES.rules.push(ruleGroup);
        }
        RULES.keywords[keyword2] = true;
        if (!definition)
          return;
        const rule = {
          keyword: keyword2,
          definition: {
            ...definition,
            type: (0, dataType_1.getJSONTypes)(definition.type),
            schemaType: (0, dataType_1.getJSONTypes)(definition.schemaType)
          }
        };
        if (definition.before)
          addBeforeRule.call(this, ruleGroup, rule, definition.before);
        else
          ruleGroup.rules.push(rule);
        RULES.all[keyword2] = rule;
        (_a = definition.implements) === null || _a === void 0 ? void 0 : _a.forEach((kwd) => this.addKeyword(kwd));
      }
      function addBeforeRule(ruleGroup, rule, before) {
        const i = ruleGroup.rules.findIndex((_rule) => _rule.keyword === before);
        if (i >= 0) {
          ruleGroup.rules.splice(i, 0, rule);
        } else {
          ruleGroup.rules.push(rule);
          this.logger.warn(`rule ${before} is not defined`);
        }
      }
      function keywordMetaschema(def) {
        let { metaSchema } = def;
        if (metaSchema === void 0)
          return;
        if (def.$data && this.opts.$data)
          metaSchema = schemaOrData(metaSchema);
        def.validateSchema = this.compile(metaSchema, true);
      }
      const $dataRef = {
        $ref: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#"
      };
      function schemaOrData(schema) {
        return { anyOf: [schema, $dataRef] };
      }
    })(core$1);
    return core$1;
  }
  var draft7 = {};
  var core = {};
  var id = {};
  var hasRequiredId;
  function requireId() {
    if (hasRequiredId) return id;
    hasRequiredId = 1;
    Object.defineProperty(id, "__esModule", { value: true });
    const def = {
      keyword: "id",
      code() {
        throw new Error('NOT SUPPORTED: keyword "id", use "$id" for schema ID');
      }
    };
    id.default = def;
    return id;
  }
  var ref = {};
  var hasRequiredRef;
  function requireRef() {
    if (hasRequiredRef) return ref;
    hasRequiredRef = 1;
    Object.defineProperty(ref, "__esModule", { value: true });
    ref.callRef = ref.getValidate = void 0;
    const ref_error_1 = requireRef_error();
    const code_1 = requireCode();
    const codegen_1 = requireCodegen();
    const names_1 = requireNames();
    const compile_1 = requireCompile();
    const util_1 = requireUtil();
    const def = {
      keyword: "$ref",
      schemaType: "string",
      code(cxt) {
        const { gen, schema: $ref, it } = cxt;
        const { baseId, schemaEnv: env, validateName, opts, self: self2 } = it;
        const { root } = env;
        if (($ref === "#" || $ref === "#/") && baseId === root.baseId)
          return callRootRef();
        const schOrEnv = compile_1.resolveRef.call(self2, root, baseId, $ref);
        if (schOrEnv === void 0)
          throw new ref_error_1.default(it.opts.uriResolver, baseId, $ref);
        if (schOrEnv instanceof compile_1.SchemaEnv)
          return callValidate(schOrEnv);
        return inlineRefSchema(schOrEnv);
        function callRootRef() {
          if (env === root)
            return callRef(cxt, validateName, env, env.$async);
          const rootName = gen.scopeValue("root", { ref: root });
          return callRef(cxt, (0, codegen_1._)`${rootName}.validate`, root, root.$async);
        }
        function callValidate(sch) {
          const v = getValidate(cxt, sch);
          callRef(cxt, v, sch, sch.$async);
        }
        function inlineRefSchema(sch) {
          const schName = gen.scopeValue("schema", opts.code.source === true ? { ref: sch, code: (0, codegen_1.stringify)(sch) } : { ref: sch });
          const valid = gen.name("valid");
          const schCxt = cxt.subschema({
            schema: sch,
            dataTypes: [],
            schemaPath: codegen_1.nil,
            topSchemaRef: schName,
            errSchemaPath: $ref
          }, valid);
          cxt.mergeEvaluated(schCxt);
          cxt.ok(valid);
        }
      }
    };
    function getValidate(cxt, sch) {
      const { gen } = cxt;
      return sch.validate ? gen.scopeValue("validate", { ref: sch.validate }) : (0, codegen_1._)`${gen.scopeValue("wrapper", { ref: sch })}.validate`;
    }
    ref.getValidate = getValidate;
    function callRef(cxt, v, sch, $async) {
      const { gen, it } = cxt;
      const { allErrors, schemaEnv: env, opts } = it;
      const passCxt = opts.passContext ? names_1.default.this : codegen_1.nil;
      if ($async)
        callAsyncRef();
      else
        callSyncRef();
      function callAsyncRef() {
        if (!env.$async)
          throw new Error("async schema referenced by sync schema");
        const valid = gen.let("valid");
        gen.try(() => {
          gen.code((0, codegen_1._)`await ${(0, code_1.callValidateCode)(cxt, v, passCxt)}`);
          addEvaluatedFrom(v);
          if (!allErrors)
            gen.assign(valid, true);
        }, (e) => {
          gen.if((0, codegen_1._)`!(${e} instanceof ${it.ValidationError})`, () => gen.throw(e));
          addErrorsFrom(e);
          if (!allErrors)
            gen.assign(valid, false);
        });
        cxt.ok(valid);
      }
      function callSyncRef() {
        cxt.result((0, code_1.callValidateCode)(cxt, v, passCxt), () => addEvaluatedFrom(v), () => addErrorsFrom(v));
      }
      function addErrorsFrom(source) {
        const errs = (0, codegen_1._)`${source}.errors`;
        gen.assign(names_1.default.vErrors, (0, codegen_1._)`${names_1.default.vErrors} === null ? ${errs} : ${names_1.default.vErrors}.concat(${errs})`);
        gen.assign(names_1.default.errors, (0, codegen_1._)`${names_1.default.vErrors}.length`);
      }
      function addEvaluatedFrom(source) {
        var _a;
        if (!it.opts.unevaluated)
          return;
        const schEvaluated = (_a = sch === null || sch === void 0 ? void 0 : sch.validate) === null || _a === void 0 ? void 0 : _a.evaluated;
        if (it.props !== true) {
          if (schEvaluated && !schEvaluated.dynamicProps) {
            if (schEvaluated.props !== void 0) {
              it.props = util_1.mergeEvaluated.props(gen, schEvaluated.props, it.props);
            }
          } else {
            const props = gen.var("props", (0, codegen_1._)`${source}.evaluated.props`);
            it.props = util_1.mergeEvaluated.props(gen, props, it.props, codegen_1.Name);
          }
        }
        if (it.items !== true) {
          if (schEvaluated && !schEvaluated.dynamicItems) {
            if (schEvaluated.items !== void 0) {
              it.items = util_1.mergeEvaluated.items(gen, schEvaluated.items, it.items);
            }
          } else {
            const items2 = gen.var("items", (0, codegen_1._)`${source}.evaluated.items`);
            it.items = util_1.mergeEvaluated.items(gen, items2, it.items, codegen_1.Name);
          }
        }
      }
    }
    ref.callRef = callRef;
    ref.default = def;
    return ref;
  }
  var hasRequiredCore;
  function requireCore() {
    if (hasRequiredCore) return core;
    hasRequiredCore = 1;
    Object.defineProperty(core, "__esModule", { value: true });
    const id_1 = requireId();
    const ref_1 = requireRef();
    const core$12 = [
      "$schema",
      "$id",
      "$defs",
      "$vocabulary",
      { keyword: "$comment" },
      "definitions",
      id_1.default,
      ref_1.default
    ];
    core.default = core$12;
    return core;
  }
  var validation = {};
  var limitNumber = {};
  var hasRequiredLimitNumber;
  function requireLimitNumber() {
    if (hasRequiredLimitNumber) return limitNumber;
    hasRequiredLimitNumber = 1;
    Object.defineProperty(limitNumber, "__esModule", { value: true });
    const codegen_1 = requireCodegen();
    const ops = codegen_1.operators;
    const KWDs = {
      maximum: { okStr: "<=", ok: ops.LTE, fail: ops.GT },
      minimum: { okStr: ">=", ok: ops.GTE, fail: ops.LT },
      exclusiveMaximum: { okStr: "<", ok: ops.LT, fail: ops.GTE },
      exclusiveMinimum: { okStr: ">", ok: ops.GT, fail: ops.LTE }
    };
    const error = {
      message: ({ keyword: keyword2, schemaCode }) => (0, codegen_1.str)`must be ${KWDs[keyword2].okStr} ${schemaCode}`,
      params: ({ keyword: keyword2, schemaCode }) => (0, codegen_1._)`{comparison: ${KWDs[keyword2].okStr}, limit: ${schemaCode}}`
    };
    const def = {
      keyword: Object.keys(KWDs),
      type: "number",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { keyword: keyword2, data, schemaCode } = cxt;
        cxt.fail$data((0, codegen_1._)`${data} ${KWDs[keyword2].fail} ${schemaCode} || isNaN(${data})`);
      }
    };
    limitNumber.default = def;
    return limitNumber;
  }
  var multipleOf = {};
  var hasRequiredMultipleOf;
  function requireMultipleOf() {
    if (hasRequiredMultipleOf) return multipleOf;
    hasRequiredMultipleOf = 1;
    Object.defineProperty(multipleOf, "__esModule", { value: true });
    const codegen_1 = requireCodegen();
    const error = {
      message: ({ schemaCode }) => (0, codegen_1.str)`must be multiple of ${schemaCode}`,
      params: ({ schemaCode }) => (0, codegen_1._)`{multipleOf: ${schemaCode}}`
    };
    const def = {
      keyword: "multipleOf",
      type: "number",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, schemaCode, it } = cxt;
        const prec = it.opts.multipleOfPrecision;
        const res = gen.let("res");
        const invalid = prec ? (0, codegen_1._)`Math.abs(Math.round(${res}) - ${res}) > 1e-${prec}` : (0, codegen_1._)`${res} !== parseInt(${res})`;
        cxt.fail$data((0, codegen_1._)`(${schemaCode} === 0 || (${res} = ${data}/${schemaCode}, ${invalid}))`);
      }
    };
    multipleOf.default = def;
    return multipleOf;
  }
  var limitLength = {};
  var ucs2length = {};
  var hasRequiredUcs2length;
  function requireUcs2length() {
    if (hasRequiredUcs2length) return ucs2length;
    hasRequiredUcs2length = 1;
    Object.defineProperty(ucs2length, "__esModule", { value: true });
    function ucs2length$1(str) {
      const len = str.length;
      let length = 0;
      let pos = 0;
      let value;
      while (pos < len) {
        length++;
        value = str.charCodeAt(pos++);
        if (value >= 55296 && value <= 56319 && pos < len) {
          value = str.charCodeAt(pos);
          if ((value & 64512) === 56320)
            pos++;
        }
      }
      return length;
    }
    ucs2length.default = ucs2length$1;
    ucs2length$1.code = 'require("ajv/dist/runtime/ucs2length").default';
    return ucs2length;
  }
  var hasRequiredLimitLength;
  function requireLimitLength() {
    if (hasRequiredLimitLength) return limitLength;
    hasRequiredLimitLength = 1;
    Object.defineProperty(limitLength, "__esModule", { value: true });
    const codegen_1 = requireCodegen();
    const util_1 = requireUtil();
    const ucs2length_1 = requireUcs2length();
    const error = {
      message({ keyword: keyword2, schemaCode }) {
        const comp = keyword2 === "maxLength" ? "more" : "fewer";
        return (0, codegen_1.str)`must NOT have ${comp} than ${schemaCode} characters`;
      },
      params: ({ schemaCode }) => (0, codegen_1._)`{limit: ${schemaCode}}`
    };
    const def = {
      keyword: ["maxLength", "minLength"],
      type: "string",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { keyword: keyword2, data, schemaCode, it } = cxt;
        const op = keyword2 === "maxLength" ? codegen_1.operators.GT : codegen_1.operators.LT;
        const len = it.opts.unicode === false ? (0, codegen_1._)`${data}.length` : (0, codegen_1._)`${(0, util_1.useFunc)(cxt.gen, ucs2length_1.default)}(${data})`;
        cxt.fail$data((0, codegen_1._)`${len} ${op} ${schemaCode}`);
      }
    };
    limitLength.default = def;
    return limitLength;
  }
  var pattern = {};
  var hasRequiredPattern;
  function requirePattern() {
    if (hasRequiredPattern) return pattern;
    hasRequiredPattern = 1;
    Object.defineProperty(pattern, "__esModule", { value: true });
    const code_1 = requireCode();
    const codegen_1 = requireCodegen();
    const error = {
      message: ({ schemaCode }) => (0, codegen_1.str)`must match pattern "${schemaCode}"`,
      params: ({ schemaCode }) => (0, codegen_1._)`{pattern: ${schemaCode}}`
    };
    const def = {
      keyword: "pattern",
      type: "string",
      schemaType: "string",
      $data: true,
      error,
      code(cxt) {
        const { data, $data, schema, schemaCode, it } = cxt;
        const u = it.opts.unicodeRegExp ? "u" : "";
        const regExp = $data ? (0, codegen_1._)`(new RegExp(${schemaCode}, ${u}))` : (0, code_1.usePattern)(cxt, schema);
        cxt.fail$data((0, codegen_1._)`!${regExp}.test(${data})`);
      }
    };
    pattern.default = def;
    return pattern;
  }
  var limitProperties = {};
  var hasRequiredLimitProperties;
  function requireLimitProperties() {
    if (hasRequiredLimitProperties) return limitProperties;
    hasRequiredLimitProperties = 1;
    Object.defineProperty(limitProperties, "__esModule", { value: true });
    const codegen_1 = requireCodegen();
    const error = {
      message({ keyword: keyword2, schemaCode }) {
        const comp = keyword2 === "maxProperties" ? "more" : "fewer";
        return (0, codegen_1.str)`must NOT have ${comp} than ${schemaCode} properties`;
      },
      params: ({ schemaCode }) => (0, codegen_1._)`{limit: ${schemaCode}}`
    };
    const def = {
      keyword: ["maxProperties", "minProperties"],
      type: "object",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { keyword: keyword2, data, schemaCode } = cxt;
        const op = keyword2 === "maxProperties" ? codegen_1.operators.GT : codegen_1.operators.LT;
        cxt.fail$data((0, codegen_1._)`Object.keys(${data}).length ${op} ${schemaCode}`);
      }
    };
    limitProperties.default = def;
    return limitProperties;
  }
  var required$1 = {};
  var hasRequiredRequired;
  function requireRequired() {
    if (hasRequiredRequired) return required$1;
    hasRequiredRequired = 1;
    Object.defineProperty(required$1, "__esModule", { value: true });
    const code_1 = requireCode();
    const codegen_1 = requireCodegen();
    const util_1 = requireUtil();
    const error = {
      message: ({ params: { missingProperty } }) => (0, codegen_1.str)`must have required property '${missingProperty}'`,
      params: ({ params: { missingProperty } }) => (0, codegen_1._)`{missingProperty: ${missingProperty}}`
    };
    const def = {
      keyword: "required",
      type: "object",
      schemaType: "array",
      $data: true,
      error,
      code(cxt) {
        const { gen, schema, schemaCode, data, $data, it } = cxt;
        const { opts } = it;
        if (!$data && schema.length === 0)
          return;
        const useLoop = schema.length >= opts.loopRequired;
        if (it.allErrors)
          allErrorsMode();
        else
          exitOnErrorMode();
        if (opts.strictRequired) {
          const props = cxt.parentSchema.properties;
          const { definedProperties } = cxt.it;
          for (const requiredKey of schema) {
            if ((props === null || props === void 0 ? void 0 : props[requiredKey]) === void 0 && !definedProperties.has(requiredKey)) {
              const schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
              const msg = `required property "${requiredKey}" is not defined at "${schemaPath}" (strictRequired)`;
              (0, util_1.checkStrictMode)(it, msg, it.opts.strictRequired);
            }
          }
        }
        function allErrorsMode() {
          if (useLoop || $data) {
            cxt.block$data(codegen_1.nil, loopAllRequired);
          } else {
            for (const prop of schema) {
              (0, code_1.checkReportMissingProp)(cxt, prop);
            }
          }
        }
        function exitOnErrorMode() {
          const missing = gen.let("missing");
          if (useLoop || $data) {
            const valid = gen.let("valid", true);
            cxt.block$data(valid, () => loopUntilMissing(missing, valid));
            cxt.ok(valid);
          } else {
            gen.if((0, code_1.checkMissingProp)(cxt, schema, missing));
            (0, code_1.reportMissingProp)(cxt, missing);
            gen.else();
          }
        }
        function loopAllRequired() {
          gen.forOf("prop", schemaCode, (prop) => {
            cxt.setParams({ missingProperty: prop });
            gen.if((0, code_1.noPropertyInData)(gen, data, prop, opts.ownProperties), () => cxt.error());
          });
        }
        function loopUntilMissing(missing, valid) {
          cxt.setParams({ missingProperty: missing });
          gen.forOf(missing, schemaCode, () => {
            gen.assign(valid, (0, code_1.propertyInData)(gen, data, missing, opts.ownProperties));
            gen.if((0, codegen_1.not)(valid), () => {
              cxt.error();
              gen.break();
            });
          }, codegen_1.nil);
        }
      }
    };
    required$1.default = def;
    return required$1;
  }
  var limitItems = {};
  var hasRequiredLimitItems;
  function requireLimitItems() {
    if (hasRequiredLimitItems) return limitItems;
    hasRequiredLimitItems = 1;
    Object.defineProperty(limitItems, "__esModule", { value: true });
    const codegen_1 = requireCodegen();
    const error = {
      message({ keyword: keyword2, schemaCode }) {
        const comp = keyword2 === "maxItems" ? "more" : "fewer";
        return (0, codegen_1.str)`must NOT have ${comp} than ${schemaCode} items`;
      },
      params: ({ schemaCode }) => (0, codegen_1._)`{limit: ${schemaCode}}`
    };
    const def = {
      keyword: ["maxItems", "minItems"],
      type: "array",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { keyword: keyword2, data, schemaCode } = cxt;
        const op = keyword2 === "maxItems" ? codegen_1.operators.GT : codegen_1.operators.LT;
        cxt.fail$data((0, codegen_1._)`${data}.length ${op} ${schemaCode}`);
      }
    };
    limitItems.default = def;
    return limitItems;
  }
  var uniqueItems = {};
  var equal = {};
  var hasRequiredEqual;
  function requireEqual() {
    if (hasRequiredEqual) return equal;
    hasRequiredEqual = 1;
    Object.defineProperty(equal, "__esModule", { value: true });
    const equal$1 = requireFastDeepEqual();
    equal$1.code = 'require("ajv/dist/runtime/equal").default';
    equal.default = equal$1;
    return equal;
  }
  var hasRequiredUniqueItems;
  function requireUniqueItems() {
    if (hasRequiredUniqueItems) return uniqueItems;
    hasRequiredUniqueItems = 1;
    Object.defineProperty(uniqueItems, "__esModule", { value: true });
    const dataType_1 = requireDataType();
    const codegen_1 = requireCodegen();
    const util_1 = requireUtil();
    const equal_1 = requireEqual();
    const error = {
      message: ({ params: { i, j } }) => (0, codegen_1.str)`must NOT have duplicate items (items ## ${j} and ${i} are identical)`,
      params: ({ params: { i, j } }) => (0, codegen_1._)`{i: ${i}, j: ${j}}`
    };
    const def = {
      keyword: "uniqueItems",
      type: "array",
      schemaType: "boolean",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, $data, schema, parentSchema, schemaCode, it } = cxt;
        if (!$data && !schema)
          return;
        const valid = gen.let("valid");
        const itemTypes = parentSchema.items ? (0, dataType_1.getSchemaTypes)(parentSchema.items) : [];
        cxt.block$data(valid, validateUniqueItems, (0, codegen_1._)`${schemaCode} === false`);
        cxt.ok(valid);
        function validateUniqueItems() {
          const i = gen.let("i", (0, codegen_1._)`${data}.length`);
          const j = gen.let("j");
          cxt.setParams({ i, j });
          gen.assign(valid, true);
          gen.if((0, codegen_1._)`${i} > 1`, () => (canOptimize() ? loopN : loopN2)(i, j));
        }
        function canOptimize() {
          return itemTypes.length > 0 && !itemTypes.some((t) => t === "object" || t === "array");
        }
        function loopN(i, j) {
          const item = gen.name("item");
          const wrongType = (0, dataType_1.checkDataTypes)(itemTypes, item, it.opts.strictNumbers, dataType_1.DataType.Wrong);
          const indices = gen.const("indices", (0, codegen_1._)`{}`);
          gen.for((0, codegen_1._)`;${i}--;`, () => {
            gen.let(item, (0, codegen_1._)`${data}[${i}]`);
            gen.if(wrongType, (0, codegen_1._)`continue`);
            if (itemTypes.length > 1)
              gen.if((0, codegen_1._)`typeof ${item} == "string"`, (0, codegen_1._)`${item} += "_"`);
            gen.if((0, codegen_1._)`typeof ${indices}[${item}] == "number"`, () => {
              gen.assign(j, (0, codegen_1._)`${indices}[${item}]`);
              cxt.error();
              gen.assign(valid, false).break();
            }).code((0, codegen_1._)`${indices}[${item}] = ${i}`);
          });
        }
        function loopN2(i, j) {
          const eql = (0, util_1.useFunc)(gen, equal_1.default);
          const outer = gen.name("outer");
          gen.label(outer).for((0, codegen_1._)`;${i}--;`, () => gen.for((0, codegen_1._)`${j} = ${i}; ${j}--;`, () => gen.if((0, codegen_1._)`${eql}(${data}[${i}], ${data}[${j}])`, () => {
            cxt.error();
            gen.assign(valid, false).break(outer);
          })));
        }
      }
    };
    uniqueItems.default = def;
    return uniqueItems;
  }
  var _const = {};
  var hasRequired_const;
  function require_const() {
    if (hasRequired_const) return _const;
    hasRequired_const = 1;
    Object.defineProperty(_const, "__esModule", { value: true });
    const codegen_1 = requireCodegen();
    const util_1 = requireUtil();
    const equal_1 = requireEqual();
    const error = {
      message: "must be equal to constant",
      params: ({ schemaCode }) => (0, codegen_1._)`{allowedValue: ${schemaCode}}`
    };
    const def = {
      keyword: "const",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, $data, schemaCode, schema } = cxt;
        if ($data || schema && typeof schema == "object") {
          cxt.fail$data((0, codegen_1._)`!${(0, util_1.useFunc)(gen, equal_1.default)}(${data}, ${schemaCode})`);
        } else {
          cxt.fail((0, codegen_1._)`${schema} !== ${data}`);
        }
      }
    };
    _const.default = def;
    return _const;
  }
  var _enum$1 = {};
  var hasRequired_enum;
  function require_enum() {
    if (hasRequired_enum) return _enum$1;
    hasRequired_enum = 1;
    Object.defineProperty(_enum$1, "__esModule", { value: true });
    const codegen_1 = requireCodegen();
    const util_1 = requireUtil();
    const equal_1 = requireEqual();
    const error = {
      message: "must be equal to one of the allowed values",
      params: ({ schemaCode }) => (0, codegen_1._)`{allowedValues: ${schemaCode}}`
    };
    const def = {
      keyword: "enum",
      schemaType: "array",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, $data, schema, schemaCode, it } = cxt;
        if (!$data && schema.length === 0)
          throw new Error("enum must have non-empty array");
        const useLoop = schema.length >= it.opts.loopEnum;
        let eql;
        const getEql = () => eql !== null && eql !== void 0 ? eql : eql = (0, util_1.useFunc)(gen, equal_1.default);
        let valid;
        if (useLoop || $data) {
          valid = gen.let("valid");
          cxt.block$data(valid, loopEnum);
        } else {
          if (!Array.isArray(schema))
            throw new Error("ajv implementation error");
          const vSchema = gen.const("vSchema", schemaCode);
          valid = (0, codegen_1.or)(...schema.map((_x, i) => equalCode(vSchema, i)));
        }
        cxt.pass(valid);
        function loopEnum() {
          gen.assign(valid, false);
          gen.forOf("v", schemaCode, (v) => gen.if((0, codegen_1._)`${getEql()}(${data}, ${v})`, () => gen.assign(valid, true).break()));
        }
        function equalCode(vSchema, i) {
          const sch = schema[i];
          return typeof sch === "object" && sch !== null ? (0, codegen_1._)`${getEql()}(${data}, ${vSchema}[${i}])` : (0, codegen_1._)`${data} === ${sch}`;
        }
      }
    };
    _enum$1.default = def;
    return _enum$1;
  }
  var hasRequiredValidation;
  function requireValidation() {
    if (hasRequiredValidation) return validation;
    hasRequiredValidation = 1;
    Object.defineProperty(validation, "__esModule", { value: true });
    const limitNumber_1 = requireLimitNumber();
    const multipleOf_1 = requireMultipleOf();
    const limitLength_1 = requireLimitLength();
    const pattern_1 = requirePattern();
    const limitProperties_1 = requireLimitProperties();
    const required_1 = requireRequired();
    const limitItems_1 = requireLimitItems();
    const uniqueItems_1 = requireUniqueItems();
    const const_1 = require_const();
    const enum_1 = require_enum();
    const validation$1 = [
      // number
      limitNumber_1.default,
      multipleOf_1.default,
      // string
      limitLength_1.default,
      pattern_1.default,
      // object
      limitProperties_1.default,
      required_1.default,
      // array
      limitItems_1.default,
      uniqueItems_1.default,
      // any
      { keyword: "type", schemaType: ["string", "array"] },
      { keyword: "nullable", schemaType: "boolean" },
      const_1.default,
      enum_1.default
    ];
    validation.default = validation$1;
    return validation;
  }
  var applicator = {};
  var additionalItems = {};
  var hasRequiredAdditionalItems;
  function requireAdditionalItems() {
    if (hasRequiredAdditionalItems) return additionalItems;
    hasRequiredAdditionalItems = 1;
    Object.defineProperty(additionalItems, "__esModule", { value: true });
    additionalItems.validateAdditionalItems = void 0;
    const codegen_1 = requireCodegen();
    const util_1 = requireUtil();
    const error = {
      message: ({ params: { len } }) => (0, codegen_1.str)`must NOT have more than ${len} items`,
      params: ({ params: { len } }) => (0, codegen_1._)`{limit: ${len}}`
    };
    const def = {
      keyword: "additionalItems",
      type: "array",
      schemaType: ["boolean", "object"],
      before: "uniqueItems",
      error,
      code(cxt) {
        const { parentSchema, it } = cxt;
        const { items: items2 } = parentSchema;
        if (!Array.isArray(items2)) {
          (0, util_1.checkStrictMode)(it, '"additionalItems" is ignored when "items" is not an array of schemas');
          return;
        }
        validateAdditionalItems(cxt, items2);
      }
    };
    function validateAdditionalItems(cxt, items2) {
      const { gen, schema, data, keyword: keyword2, it } = cxt;
      it.items = true;
      const len = gen.const("len", (0, codegen_1._)`${data}.length`);
      if (schema === false) {
        cxt.setParams({ len: items2.length });
        cxt.pass((0, codegen_1._)`${len} <= ${items2.length}`);
      } else if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
        const valid = gen.var("valid", (0, codegen_1._)`${len} <= ${items2.length}`);
        gen.if((0, codegen_1.not)(valid), () => validateItems(valid));
        cxt.ok(valid);
      }
      function validateItems(valid) {
        gen.forRange("i", items2.length, len, (i) => {
          cxt.subschema({ keyword: keyword2, dataProp: i, dataPropType: util_1.Type.Num }, valid);
          if (!it.allErrors)
            gen.if((0, codegen_1.not)(valid), () => gen.break());
        });
      }
    }
    additionalItems.validateAdditionalItems = validateAdditionalItems;
    additionalItems.default = def;
    return additionalItems;
  }
  var prefixItems = {};
  var items = {};
  var hasRequiredItems;
  function requireItems() {
    if (hasRequiredItems) return items;
    hasRequiredItems = 1;
    Object.defineProperty(items, "__esModule", { value: true });
    items.validateTuple = void 0;
    const codegen_1 = requireCodegen();
    const util_1 = requireUtil();
    const code_1 = requireCode();
    const def = {
      keyword: "items",
      type: "array",
      schemaType: ["object", "array", "boolean"],
      before: "uniqueItems",
      code(cxt) {
        const { schema, it } = cxt;
        if (Array.isArray(schema))
          return validateTuple(cxt, "additionalItems", schema);
        it.items = true;
        if ((0, util_1.alwaysValidSchema)(it, schema))
          return;
        cxt.ok((0, code_1.validateArray)(cxt));
      }
    };
    function validateTuple(cxt, extraItems, schArr = cxt.schema) {
      const { gen, parentSchema, data, keyword: keyword2, it } = cxt;
      checkStrictTuple(parentSchema);
      if (it.opts.unevaluated && schArr.length && it.items !== true) {
        it.items = util_1.mergeEvaluated.items(gen, schArr.length, it.items);
      }
      const valid = gen.name("valid");
      const len = gen.const("len", (0, codegen_1._)`${data}.length`);
      schArr.forEach((sch, i) => {
        if ((0, util_1.alwaysValidSchema)(it, sch))
          return;
        gen.if((0, codegen_1._)`${len} > ${i}`, () => cxt.subschema({
          keyword: keyword2,
          schemaProp: i,
          dataProp: i
        }, valid));
        cxt.ok(valid);
      });
      function checkStrictTuple(sch) {
        const { opts, errSchemaPath } = it;
        const l = schArr.length;
        const fullTuple = l === sch.minItems && (l === sch.maxItems || sch[extraItems] === false);
        if (opts.strictTuples && !fullTuple) {
          const msg = `"${keyword2}" is ${l}-tuple, but minItems or maxItems/${extraItems} are not specified or different at path "${errSchemaPath}"`;
          (0, util_1.checkStrictMode)(it, msg, opts.strictTuples);
        }
      }
    }
    items.validateTuple = validateTuple;
    items.default = def;
    return items;
  }
  var hasRequiredPrefixItems;
  function requirePrefixItems() {
    if (hasRequiredPrefixItems) return prefixItems;
    hasRequiredPrefixItems = 1;
    Object.defineProperty(prefixItems, "__esModule", { value: true });
    const items_1 = requireItems();
    const def = {
      keyword: "prefixItems",
      type: "array",
      schemaType: ["array"],
      before: "uniqueItems",
      code: (cxt) => (0, items_1.validateTuple)(cxt, "items")
    };
    prefixItems.default = def;
    return prefixItems;
  }
  var items2020 = {};
  var hasRequiredItems2020;
  function requireItems2020() {
    if (hasRequiredItems2020) return items2020;
    hasRequiredItems2020 = 1;
    Object.defineProperty(items2020, "__esModule", { value: true });
    const codegen_1 = requireCodegen();
    const util_1 = requireUtil();
    const code_1 = requireCode();
    const additionalItems_1 = requireAdditionalItems();
    const error = {
      message: ({ params: { len } }) => (0, codegen_1.str)`must NOT have more than ${len} items`,
      params: ({ params: { len } }) => (0, codegen_1._)`{limit: ${len}}`
    };
    const def = {
      keyword: "items",
      type: "array",
      schemaType: ["object", "boolean"],
      before: "uniqueItems",
      error,
      code(cxt) {
        const { schema, parentSchema, it } = cxt;
        const { prefixItems: prefixItems2 } = parentSchema;
        it.items = true;
        if ((0, util_1.alwaysValidSchema)(it, schema))
          return;
        if (prefixItems2)
          (0, additionalItems_1.validateAdditionalItems)(cxt, prefixItems2);
        else
          cxt.ok((0, code_1.validateArray)(cxt));
      }
    };
    items2020.default = def;
    return items2020;
  }
  var contains = {};
  var hasRequiredContains;
  function requireContains() {
    if (hasRequiredContains) return contains;
    hasRequiredContains = 1;
    Object.defineProperty(contains, "__esModule", { value: true });
    const codegen_1 = requireCodegen();
    const util_1 = requireUtil();
    const error = {
      message: ({ params: { min, max } }) => max === void 0 ? (0, codegen_1.str)`must contain at least ${min} valid item(s)` : (0, codegen_1.str)`must contain at least ${min} and no more than ${max} valid item(s)`,
      params: ({ params: { min, max } }) => max === void 0 ? (0, codegen_1._)`{minContains: ${min}}` : (0, codegen_1._)`{minContains: ${min}, maxContains: ${max}}`
    };
    const def = {
      keyword: "contains",
      type: "array",
      schemaType: ["object", "boolean"],
      before: "uniqueItems",
      trackErrors: true,
      error,
      code(cxt) {
        const { gen, schema, parentSchema, data, it } = cxt;
        let min;
        let max;
        const { minContains, maxContains } = parentSchema;
        if (it.opts.next) {
          min = minContains === void 0 ? 1 : minContains;
          max = maxContains;
        } else {
          min = 1;
        }
        const len = gen.const("len", (0, codegen_1._)`${data}.length`);
        cxt.setParams({ min, max });
        if (max === void 0 && min === 0) {
          (0, util_1.checkStrictMode)(it, `"minContains" == 0 without "maxContains": "contains" keyword ignored`);
          return;
        }
        if (max !== void 0 && min > max) {
          (0, util_1.checkStrictMode)(it, `"minContains" > "maxContains" is always invalid`);
          cxt.fail();
          return;
        }
        if ((0, util_1.alwaysValidSchema)(it, schema)) {
          let cond = (0, codegen_1._)`${len} >= ${min}`;
          if (max !== void 0)
            cond = (0, codegen_1._)`${cond} && ${len} <= ${max}`;
          cxt.pass(cond);
          return;
        }
        it.items = true;
        const valid = gen.name("valid");
        if (max === void 0 && min === 1) {
          validateItems(valid, () => gen.if(valid, () => gen.break()));
        } else if (min === 0) {
          gen.let(valid, true);
          if (max !== void 0)
            gen.if((0, codegen_1._)`${data}.length > 0`, validateItemsWithCount);
        } else {
          gen.let(valid, false);
          validateItemsWithCount();
        }
        cxt.result(valid, () => cxt.reset());
        function validateItemsWithCount() {
          const schValid = gen.name("_valid");
          const count = gen.let("count", 0);
          validateItems(schValid, () => gen.if(schValid, () => checkLimits(count)));
        }
        function validateItems(_valid, block) {
          gen.forRange("i", 0, len, (i) => {
            cxt.subschema({
              keyword: "contains",
              dataProp: i,
              dataPropType: util_1.Type.Num,
              compositeRule: true
            }, _valid);
            block();
          });
        }
        function checkLimits(count) {
          gen.code((0, codegen_1._)`${count}++`);
          if (max === void 0) {
            gen.if((0, codegen_1._)`${count} >= ${min}`, () => gen.assign(valid, true).break());
          } else {
            gen.if((0, codegen_1._)`${count} > ${max}`, () => gen.assign(valid, false).break());
            if (min === 1)
              gen.assign(valid, true);
            else
              gen.if((0, codegen_1._)`${count} >= ${min}`, () => gen.assign(valid, true));
          }
        }
      }
    };
    contains.default = def;
    return contains;
  }
  var dependencies = {};
  var hasRequiredDependencies;
  function requireDependencies() {
    if (hasRequiredDependencies) return dependencies;
    hasRequiredDependencies = 1;
    (function(exports3) {
      Object.defineProperty(exports3, "__esModule", { value: true });
      exports3.validateSchemaDeps = exports3.validatePropertyDeps = exports3.error = void 0;
      const codegen_1 = requireCodegen();
      const util_1 = requireUtil();
      const code_1 = requireCode();
      exports3.error = {
        message: ({ params: { property, depsCount, deps } }) => {
          const property_ies = depsCount === 1 ? "property" : "properties";
          return (0, codegen_1.str)`must have ${property_ies} ${deps} when property ${property} is present`;
        },
        params: ({ params: { property, depsCount, deps, missingProperty } }) => (0, codegen_1._)`{property: ${property},
    missingProperty: ${missingProperty},
    depsCount: ${depsCount},
    deps: ${deps}}`
        // TODO change to reference
      };
      const def = {
        keyword: "dependencies",
        type: "object",
        schemaType: "object",
        error: exports3.error,
        code(cxt) {
          const [propDeps, schDeps] = splitDependencies(cxt);
          validatePropertyDeps(cxt, propDeps);
          validateSchemaDeps(cxt, schDeps);
        }
      };
      function splitDependencies({ schema }) {
        const propertyDeps = {};
        const schemaDeps = {};
        for (const key in schema) {
          if (key === "__proto__")
            continue;
          const deps = Array.isArray(schema[key]) ? propertyDeps : schemaDeps;
          deps[key] = schema[key];
        }
        return [propertyDeps, schemaDeps];
      }
      function validatePropertyDeps(cxt, propertyDeps = cxt.schema) {
        const { gen, data, it } = cxt;
        if (Object.keys(propertyDeps).length === 0)
          return;
        const missing = gen.let("missing");
        for (const prop in propertyDeps) {
          const deps = propertyDeps[prop];
          if (deps.length === 0)
            continue;
          const hasProperty = (0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties);
          cxt.setParams({
            property: prop,
            depsCount: deps.length,
            deps: deps.join(", ")
          });
          if (it.allErrors) {
            gen.if(hasProperty, () => {
              for (const depProp of deps) {
                (0, code_1.checkReportMissingProp)(cxt, depProp);
              }
            });
          } else {
            gen.if((0, codegen_1._)`${hasProperty} && (${(0, code_1.checkMissingProp)(cxt, deps, missing)})`);
            (0, code_1.reportMissingProp)(cxt, missing);
            gen.else();
          }
        }
      }
      exports3.validatePropertyDeps = validatePropertyDeps;
      function validateSchemaDeps(cxt, schemaDeps = cxt.schema) {
        const { gen, data, keyword: keyword2, it } = cxt;
        const valid = gen.name("valid");
        for (const prop in schemaDeps) {
          if ((0, util_1.alwaysValidSchema)(it, schemaDeps[prop]))
            continue;
          gen.if(
            (0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties),
            () => {
              const schCxt = cxt.subschema({ keyword: keyword2, schemaProp: prop }, valid);
              cxt.mergeValidEvaluated(schCxt, valid);
            },
            () => gen.var(valid, true)
            // TODO var
          );
          cxt.ok(valid);
        }
      }
      exports3.validateSchemaDeps = validateSchemaDeps;
      exports3.default = def;
    })(dependencies);
    return dependencies;
  }
  var propertyNames = {};
  var hasRequiredPropertyNames;
  function requirePropertyNames() {
    if (hasRequiredPropertyNames) return propertyNames;
    hasRequiredPropertyNames = 1;
    Object.defineProperty(propertyNames, "__esModule", { value: true });
    const codegen_1 = requireCodegen();
    const util_1 = requireUtil();
    const error = {
      message: "property name must be valid",
      params: ({ params }) => (0, codegen_1._)`{propertyName: ${params.propertyName}}`
    };
    const def = {
      keyword: "propertyNames",
      type: "object",
      schemaType: ["object", "boolean"],
      error,
      code(cxt) {
        const { gen, schema, data, it } = cxt;
        if ((0, util_1.alwaysValidSchema)(it, schema))
          return;
        const valid = gen.name("valid");
        gen.forIn("key", data, (key) => {
          cxt.setParams({ propertyName: key });
          cxt.subschema({
            keyword: "propertyNames",
            data: key,
            dataTypes: ["string"],
            propertyName: key,
            compositeRule: true
          }, valid);
          gen.if((0, codegen_1.not)(valid), () => {
            cxt.error(true);
            if (!it.allErrors)
              gen.break();
          });
        });
        cxt.ok(valid);
      }
    };
    propertyNames.default = def;
    return propertyNames;
  }
  var additionalProperties = {};
  var hasRequiredAdditionalProperties;
  function requireAdditionalProperties() {
    if (hasRequiredAdditionalProperties) return additionalProperties;
    hasRequiredAdditionalProperties = 1;
    Object.defineProperty(additionalProperties, "__esModule", { value: true });
    const code_1 = requireCode();
    const codegen_1 = requireCodegen();
    const names_1 = requireNames();
    const util_1 = requireUtil();
    const error = {
      message: "must NOT have additional properties",
      params: ({ params }) => (0, codegen_1._)`{additionalProperty: ${params.additionalProperty}}`
    };
    const def = {
      keyword: "additionalProperties",
      type: ["object"],
      schemaType: ["boolean", "object"],
      allowUndefined: true,
      trackErrors: true,
      error,
      code(cxt) {
        const { gen, schema, parentSchema, data, errsCount, it } = cxt;
        if (!errsCount)
          throw new Error("ajv implementation error");
        const { allErrors, opts } = it;
        it.props = true;
        if (opts.removeAdditional !== "all" && (0, util_1.alwaysValidSchema)(it, schema))
          return;
        const props = (0, code_1.allSchemaProperties)(parentSchema.properties);
        const patProps = (0, code_1.allSchemaProperties)(parentSchema.patternProperties);
        checkAdditionalProperties();
        cxt.ok((0, codegen_1._)`${errsCount} === ${names_1.default.errors}`);
        function checkAdditionalProperties() {
          gen.forIn("key", data, (key) => {
            if (!props.length && !patProps.length)
              additionalPropertyCode(key);
            else
              gen.if(isAdditional(key), () => additionalPropertyCode(key));
          });
        }
        function isAdditional(key) {
          let definedProp;
          if (props.length > 8) {
            const propsSchema = (0, util_1.schemaRefOrVal)(it, parentSchema.properties, "properties");
            definedProp = (0, code_1.isOwnProperty)(gen, propsSchema, key);
          } else if (props.length) {
            definedProp = (0, codegen_1.or)(...props.map((p) => (0, codegen_1._)`${key} === ${p}`));
          } else {
            definedProp = codegen_1.nil;
          }
          if (patProps.length) {
            definedProp = (0, codegen_1.or)(definedProp, ...patProps.map((p) => (0, codegen_1._)`${(0, code_1.usePattern)(cxt, p)}.test(${key})`));
          }
          return (0, codegen_1.not)(definedProp);
        }
        function deleteAdditional(key) {
          gen.code((0, codegen_1._)`delete ${data}[${key}]`);
        }
        function additionalPropertyCode(key) {
          if (opts.removeAdditional === "all" || opts.removeAdditional && schema === false) {
            deleteAdditional(key);
            return;
          }
          if (schema === false) {
            cxt.setParams({ additionalProperty: key });
            cxt.error();
            if (!allErrors)
              gen.break();
            return;
          }
          if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
            const valid = gen.name("valid");
            if (opts.removeAdditional === "failing") {
              applyAdditionalSchema(key, valid, false);
              gen.if((0, codegen_1.not)(valid), () => {
                cxt.reset();
                deleteAdditional(key);
              });
            } else {
              applyAdditionalSchema(key, valid);
              if (!allErrors)
                gen.if((0, codegen_1.not)(valid), () => gen.break());
            }
          }
        }
        function applyAdditionalSchema(key, valid, errors2) {
          const subschema2 = {
            keyword: "additionalProperties",
            dataProp: key,
            dataPropType: util_1.Type.Str
          };
          if (errors2 === false) {
            Object.assign(subschema2, {
              compositeRule: true,
              createErrors: false,
              allErrors: false
            });
          }
          cxt.subschema(subschema2, valid);
        }
      }
    };
    additionalProperties.default = def;
    return additionalProperties;
  }
  var properties$1 = {};
  var hasRequiredProperties;
  function requireProperties() {
    if (hasRequiredProperties) return properties$1;
    hasRequiredProperties = 1;
    Object.defineProperty(properties$1, "__esModule", { value: true });
    const validate_1 = requireValidate();
    const code_1 = requireCode();
    const util_1 = requireUtil();
    const additionalProperties_1 = requireAdditionalProperties();
    const def = {
      keyword: "properties",
      type: "object",
      schemaType: "object",
      code(cxt) {
        const { gen, schema, parentSchema, data, it } = cxt;
        if (it.opts.removeAdditional === "all" && parentSchema.additionalProperties === void 0) {
          additionalProperties_1.default.code(new validate_1.KeywordCxt(it, additionalProperties_1.default, "additionalProperties"));
        }
        const allProps = (0, code_1.allSchemaProperties)(schema);
        for (const prop of allProps) {
          it.definedProperties.add(prop);
        }
        if (it.opts.unevaluated && allProps.length && it.props !== true) {
          it.props = util_1.mergeEvaluated.props(gen, (0, util_1.toHash)(allProps), it.props);
        }
        const properties2 = allProps.filter((p) => !(0, util_1.alwaysValidSchema)(it, schema[p]));
        if (properties2.length === 0)
          return;
        const valid = gen.name("valid");
        for (const prop of properties2) {
          if (hasDefault(prop)) {
            applyPropertySchema(prop);
          } else {
            gen.if((0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties));
            applyPropertySchema(prop);
            if (!it.allErrors)
              gen.else().var(valid, true);
            gen.endIf();
          }
          cxt.it.definedProperties.add(prop);
          cxt.ok(valid);
        }
        function hasDefault(prop) {
          return it.opts.useDefaults && !it.compositeRule && schema[prop].default !== void 0;
        }
        function applyPropertySchema(prop) {
          cxt.subschema({
            keyword: "properties",
            schemaProp: prop,
            dataProp: prop
          }, valid);
        }
      }
    };
    properties$1.default = def;
    return properties$1;
  }
  var patternProperties = {};
  var hasRequiredPatternProperties;
  function requirePatternProperties() {
    if (hasRequiredPatternProperties) return patternProperties;
    hasRequiredPatternProperties = 1;
    Object.defineProperty(patternProperties, "__esModule", { value: true });
    const code_1 = requireCode();
    const codegen_1 = requireCodegen();
    const util_1 = requireUtil();
    const util_2 = requireUtil();
    const def = {
      keyword: "patternProperties",
      type: "object",
      schemaType: "object",
      code(cxt) {
        const { gen, schema, data, parentSchema, it } = cxt;
        const { opts } = it;
        const patterns = (0, code_1.allSchemaProperties)(schema);
        const alwaysValidPatterns = patterns.filter((p) => (0, util_1.alwaysValidSchema)(it, schema[p]));
        if (patterns.length === 0 || alwaysValidPatterns.length === patterns.length && (!it.opts.unevaluated || it.props === true)) {
          return;
        }
        const checkProperties = opts.strictSchema && !opts.allowMatchingProperties && parentSchema.properties;
        const valid = gen.name("valid");
        if (it.props !== true && !(it.props instanceof codegen_1.Name)) {
          it.props = (0, util_2.evaluatedPropsToName)(gen, it.props);
        }
        const { props } = it;
        validatePatternProperties();
        function validatePatternProperties() {
          for (const pat of patterns) {
            if (checkProperties)
              checkMatchingProperties(pat);
            if (it.allErrors) {
              validateProperties(pat);
            } else {
              gen.var(valid, true);
              validateProperties(pat);
              gen.if(valid);
            }
          }
        }
        function checkMatchingProperties(pat) {
          for (const prop in checkProperties) {
            if (new RegExp(pat).test(prop)) {
              (0, util_1.checkStrictMode)(it, `property ${prop} matches pattern ${pat} (use allowMatchingProperties)`);
            }
          }
        }
        function validateProperties(pat) {
          gen.forIn("key", data, (key) => {
            gen.if((0, codegen_1._)`${(0, code_1.usePattern)(cxt, pat)}.test(${key})`, () => {
              const alwaysValid = alwaysValidPatterns.includes(pat);
              if (!alwaysValid) {
                cxt.subschema({
                  keyword: "patternProperties",
                  schemaProp: pat,
                  dataProp: key,
                  dataPropType: util_2.Type.Str
                }, valid);
              }
              if (it.opts.unevaluated && props !== true) {
                gen.assign((0, codegen_1._)`${props}[${key}]`, true);
              } else if (!alwaysValid && !it.allErrors) {
                gen.if((0, codegen_1.not)(valid), () => gen.break());
              }
            });
          });
        }
      }
    };
    patternProperties.default = def;
    return patternProperties;
  }
  var not = {};
  var hasRequiredNot;
  function requireNot() {
    if (hasRequiredNot) return not;
    hasRequiredNot = 1;
    Object.defineProperty(not, "__esModule", { value: true });
    const util_1 = requireUtil();
    const def = {
      keyword: "not",
      schemaType: ["object", "boolean"],
      trackErrors: true,
      code(cxt) {
        const { gen, schema, it } = cxt;
        if ((0, util_1.alwaysValidSchema)(it, schema)) {
          cxt.fail();
          return;
        }
        const valid = gen.name("valid");
        cxt.subschema({
          keyword: "not",
          compositeRule: true,
          createErrors: false,
          allErrors: false
        }, valid);
        cxt.failResult(valid, () => cxt.reset(), () => cxt.error());
      },
      error: { message: "must NOT be valid" }
    };
    not.default = def;
    return not;
  }
  var anyOf = {};
  var hasRequiredAnyOf;
  function requireAnyOf() {
    if (hasRequiredAnyOf) return anyOf;
    hasRequiredAnyOf = 1;
    Object.defineProperty(anyOf, "__esModule", { value: true });
    const code_1 = requireCode();
    const def = {
      keyword: "anyOf",
      schemaType: "array",
      trackErrors: true,
      code: code_1.validateUnion,
      error: { message: "must match a schema in anyOf" }
    };
    anyOf.default = def;
    return anyOf;
  }
  var oneOf = {};
  var hasRequiredOneOf;
  function requireOneOf() {
    if (hasRequiredOneOf) return oneOf;
    hasRequiredOneOf = 1;
    Object.defineProperty(oneOf, "__esModule", { value: true });
    const codegen_1 = requireCodegen();
    const util_1 = requireUtil();
    const error = {
      message: "must match exactly one schema in oneOf",
      params: ({ params }) => (0, codegen_1._)`{passingSchemas: ${params.passing}}`
    };
    const def = {
      keyword: "oneOf",
      schemaType: "array",
      trackErrors: true,
      error,
      code(cxt) {
        const { gen, schema, parentSchema, it } = cxt;
        if (!Array.isArray(schema))
          throw new Error("ajv implementation error");
        if (it.opts.discriminator && parentSchema.discriminator)
          return;
        const schArr = schema;
        const valid = gen.let("valid", false);
        const passing = gen.let("passing", null);
        const schValid = gen.name("_valid");
        cxt.setParams({ passing });
        gen.block(validateOneOf);
        cxt.result(valid, () => cxt.reset(), () => cxt.error(true));
        function validateOneOf() {
          schArr.forEach((sch, i) => {
            let schCxt;
            if ((0, util_1.alwaysValidSchema)(it, sch)) {
              gen.var(schValid, true);
            } else {
              schCxt = cxt.subschema({
                keyword: "oneOf",
                schemaProp: i,
                compositeRule: true
              }, schValid);
            }
            if (i > 0) {
              gen.if((0, codegen_1._)`${schValid} && ${valid}`).assign(valid, false).assign(passing, (0, codegen_1._)`[${passing}, ${i}]`).else();
            }
            gen.if(schValid, () => {
              gen.assign(valid, true);
              gen.assign(passing, i);
              if (schCxt)
                cxt.mergeEvaluated(schCxt, codegen_1.Name);
            });
          });
        }
      }
    };
    oneOf.default = def;
    return oneOf;
  }
  var allOf = {};
  var hasRequiredAllOf;
  function requireAllOf() {
    if (hasRequiredAllOf) return allOf;
    hasRequiredAllOf = 1;
    Object.defineProperty(allOf, "__esModule", { value: true });
    const util_1 = requireUtil();
    const def = {
      keyword: "allOf",
      schemaType: "array",
      code(cxt) {
        const { gen, schema, it } = cxt;
        if (!Array.isArray(schema))
          throw new Error("ajv implementation error");
        const valid = gen.name("valid");
        schema.forEach((sch, i) => {
          if ((0, util_1.alwaysValidSchema)(it, sch))
            return;
          const schCxt = cxt.subschema({ keyword: "allOf", schemaProp: i }, valid);
          cxt.ok(valid);
          cxt.mergeEvaluated(schCxt);
        });
      }
    };
    allOf.default = def;
    return allOf;
  }
  var _if = {};
  var hasRequired_if;
  function require_if() {
    if (hasRequired_if) return _if;
    hasRequired_if = 1;
    Object.defineProperty(_if, "__esModule", { value: true });
    const codegen_1 = requireCodegen();
    const util_1 = requireUtil();
    const error = {
      message: ({ params }) => (0, codegen_1.str)`must match "${params.ifClause}" schema`,
      params: ({ params }) => (0, codegen_1._)`{failingKeyword: ${params.ifClause}}`
    };
    const def = {
      keyword: "if",
      schemaType: ["object", "boolean"],
      trackErrors: true,
      error,
      code(cxt) {
        const { gen, parentSchema, it } = cxt;
        if (parentSchema.then === void 0 && parentSchema.else === void 0) {
          (0, util_1.checkStrictMode)(it, '"if" without "then" and "else" is ignored');
        }
        const hasThen = hasSchema(it, "then");
        const hasElse = hasSchema(it, "else");
        if (!hasThen && !hasElse)
          return;
        const valid = gen.let("valid", true);
        const schValid = gen.name("_valid");
        validateIf();
        cxt.reset();
        if (hasThen && hasElse) {
          const ifClause = gen.let("ifClause");
          cxt.setParams({ ifClause });
          gen.if(schValid, validateClause("then", ifClause), validateClause("else", ifClause));
        } else if (hasThen) {
          gen.if(schValid, validateClause("then"));
        } else {
          gen.if((0, codegen_1.not)(schValid), validateClause("else"));
        }
        cxt.pass(valid, () => cxt.error(true));
        function validateIf() {
          const schCxt = cxt.subschema({
            keyword: "if",
            compositeRule: true,
            createErrors: false,
            allErrors: false
          }, schValid);
          cxt.mergeEvaluated(schCxt);
        }
        function validateClause(keyword2, ifClause) {
          return () => {
            const schCxt = cxt.subschema({ keyword: keyword2 }, schValid);
            gen.assign(valid, schValid);
            cxt.mergeValidEvaluated(schCxt, valid);
            if (ifClause)
              gen.assign(ifClause, (0, codegen_1._)`${keyword2}`);
            else
              cxt.setParams({ ifClause: keyword2 });
          };
        }
      }
    };
    function hasSchema(it, keyword2) {
      const schema = it.schema[keyword2];
      return schema !== void 0 && !(0, util_1.alwaysValidSchema)(it, schema);
    }
    _if.default = def;
    return _if;
  }
  var thenElse = {};
  var hasRequiredThenElse;
  function requireThenElse() {
    if (hasRequiredThenElse) return thenElse;
    hasRequiredThenElse = 1;
    Object.defineProperty(thenElse, "__esModule", { value: true });
    const util_1 = requireUtil();
    const def = {
      keyword: ["then", "else"],
      schemaType: ["object", "boolean"],
      code({ keyword: keyword2, parentSchema, it }) {
        if (parentSchema.if === void 0)
          (0, util_1.checkStrictMode)(it, `"${keyword2}" without "if" is ignored`);
      }
    };
    thenElse.default = def;
    return thenElse;
  }
  var hasRequiredApplicator;
  function requireApplicator() {
    if (hasRequiredApplicator) return applicator;
    hasRequiredApplicator = 1;
    Object.defineProperty(applicator, "__esModule", { value: true });
    const additionalItems_1 = requireAdditionalItems();
    const prefixItems_1 = requirePrefixItems();
    const items_1 = requireItems();
    const items2020_1 = requireItems2020();
    const contains_1 = requireContains();
    const dependencies_1 = requireDependencies();
    const propertyNames_1 = requirePropertyNames();
    const additionalProperties_1 = requireAdditionalProperties();
    const properties_1 = requireProperties();
    const patternProperties_1 = requirePatternProperties();
    const not_1 = requireNot();
    const anyOf_1 = requireAnyOf();
    const oneOf_1 = requireOneOf();
    const allOf_1 = requireAllOf();
    const if_1 = require_if();
    const thenElse_1 = requireThenElse();
    function getApplicator(draft2020 = false) {
      const applicator2 = [
        // any
        not_1.default,
        anyOf_1.default,
        oneOf_1.default,
        allOf_1.default,
        if_1.default,
        thenElse_1.default,
        // object
        propertyNames_1.default,
        additionalProperties_1.default,
        dependencies_1.default,
        properties_1.default,
        patternProperties_1.default
      ];
      if (draft2020)
        applicator2.push(prefixItems_1.default, items2020_1.default);
      else
        applicator2.push(additionalItems_1.default, items_1.default);
      applicator2.push(contains_1.default);
      return applicator2;
    }
    applicator.default = getApplicator;
    return applicator;
  }
  var format$1 = {};
  var format = {};
  var hasRequiredFormat$1;
  function requireFormat$1() {
    if (hasRequiredFormat$1) return format;
    hasRequiredFormat$1 = 1;
    Object.defineProperty(format, "__esModule", { value: true });
    const codegen_1 = requireCodegen();
    const error = {
      message: ({ schemaCode }) => (0, codegen_1.str)`must match format "${schemaCode}"`,
      params: ({ schemaCode }) => (0, codegen_1._)`{format: ${schemaCode}}`
    };
    const def = {
      keyword: "format",
      type: ["number", "string"],
      schemaType: "string",
      $data: true,
      error,
      code(cxt, ruleType) {
        const { gen, data, $data, schema, schemaCode, it } = cxt;
        const { opts, errSchemaPath, schemaEnv, self: self2 } = it;
        if (!opts.validateFormats)
          return;
        if ($data)
          validate$DataFormat();
        else
          validateFormat();
        function validate$DataFormat() {
          const fmts = gen.scopeValue("formats", {
            ref: self2.formats,
            code: opts.code.formats
          });
          const fDef = gen.const("fDef", (0, codegen_1._)`${fmts}[${schemaCode}]`);
          const fType = gen.let("fType");
          const format2 = gen.let("format");
          gen.if((0, codegen_1._)`typeof ${fDef} == "object" && !(${fDef} instanceof RegExp)`, () => gen.assign(fType, (0, codegen_1._)`${fDef}.type || "string"`).assign(format2, (0, codegen_1._)`${fDef}.validate`), () => gen.assign(fType, (0, codegen_1._)`"string"`).assign(format2, fDef));
          cxt.fail$data((0, codegen_1.or)(unknownFmt(), invalidFmt()));
          function unknownFmt() {
            if (opts.strictSchema === false)
              return codegen_1.nil;
            return (0, codegen_1._)`${schemaCode} && !${format2}`;
          }
          function invalidFmt() {
            const callFormat = schemaEnv.$async ? (0, codegen_1._)`(${fDef}.async ? await ${format2}(${data}) : ${format2}(${data}))` : (0, codegen_1._)`${format2}(${data})`;
            const validData = (0, codegen_1._)`(typeof ${format2} == "function" ? ${callFormat} : ${format2}.test(${data}))`;
            return (0, codegen_1._)`${format2} && ${format2} !== true && ${fType} === ${ruleType} && !${validData}`;
          }
        }
        function validateFormat() {
          const formatDef = self2.formats[schema];
          if (!formatDef) {
            unknownFormat();
            return;
          }
          if (formatDef === true)
            return;
          const [fmtType, format2, fmtRef] = getFormat(formatDef);
          if (fmtType === ruleType)
            cxt.pass(validCondition());
          function unknownFormat() {
            if (opts.strictSchema === false) {
              self2.logger.warn(unknownMsg());
              return;
            }
            throw new Error(unknownMsg());
            function unknownMsg() {
              return `unknown format "${schema}" ignored in schema at path "${errSchemaPath}"`;
            }
          }
          function getFormat(fmtDef) {
            const code2 = fmtDef instanceof RegExp ? (0, codegen_1.regexpCode)(fmtDef) : opts.code.formats ? (0, codegen_1._)`${opts.code.formats}${(0, codegen_1.getProperty)(schema)}` : void 0;
            const fmt = gen.scopeValue("formats", { key: schema, ref: fmtDef, code: code2 });
            if (typeof fmtDef == "object" && !(fmtDef instanceof RegExp)) {
              return [fmtDef.type || "string", fmtDef.validate, (0, codegen_1._)`${fmt}.validate`];
            }
            return ["string", fmtDef, fmt];
          }
          function validCondition() {
            if (typeof formatDef == "object" && !(formatDef instanceof RegExp) && formatDef.async) {
              if (!schemaEnv.$async)
                throw new Error("async format in sync schema");
              return (0, codegen_1._)`await ${fmtRef}(${data})`;
            }
            return typeof format2 == "function" ? (0, codegen_1._)`${fmtRef}(${data})` : (0, codegen_1._)`${fmtRef}.test(${data})`;
          }
        }
      }
    };
    format.default = def;
    return format;
  }
  var hasRequiredFormat;
  function requireFormat() {
    if (hasRequiredFormat) return format$1;
    hasRequiredFormat = 1;
    Object.defineProperty(format$1, "__esModule", { value: true });
    const format_1 = requireFormat$1();
    const format2 = [format_1.default];
    format$1.default = format2;
    return format$1;
  }
  var metadata = {};
  var hasRequiredMetadata;
  function requireMetadata() {
    if (hasRequiredMetadata) return metadata;
    hasRequiredMetadata = 1;
    Object.defineProperty(metadata, "__esModule", { value: true });
    metadata.contentVocabulary = metadata.metadataVocabulary = void 0;
    metadata.metadataVocabulary = [
      "title",
      "description",
      "default",
      "deprecated",
      "readOnly",
      "writeOnly",
      "examples"
    ];
    metadata.contentVocabulary = [
      "contentMediaType",
      "contentEncoding",
      "contentSchema"
    ];
    return metadata;
  }
  var hasRequiredDraft7;
  function requireDraft7() {
    if (hasRequiredDraft7) return draft7;
    hasRequiredDraft7 = 1;
    Object.defineProperty(draft7, "__esModule", { value: true });
    const core_1 = requireCore();
    const validation_1 = requireValidation();
    const applicator_1 = requireApplicator();
    const format_1 = requireFormat();
    const metadata_1 = requireMetadata();
    const draft7Vocabularies = [
      core_1.default,
      validation_1.default,
      (0, applicator_1.default)(),
      format_1.default,
      metadata_1.metadataVocabulary,
      metadata_1.contentVocabulary
    ];
    draft7.default = draft7Vocabularies;
    return draft7;
  }
  var discriminator = {};
  var types = {};
  var hasRequiredTypes;
  function requireTypes() {
    if (hasRequiredTypes) return types;
    hasRequiredTypes = 1;
    Object.defineProperty(types, "__esModule", { value: true });
    types.DiscrError = void 0;
    var DiscrError;
    (function(DiscrError2) {
      DiscrError2["Tag"] = "tag";
      DiscrError2["Mapping"] = "mapping";
    })(DiscrError || (types.DiscrError = DiscrError = {}));
    return types;
  }
  var hasRequiredDiscriminator;
  function requireDiscriminator() {
    if (hasRequiredDiscriminator) return discriminator;
    hasRequiredDiscriminator = 1;
    Object.defineProperty(discriminator, "__esModule", { value: true });
    const codegen_1 = requireCodegen();
    const types_1 = requireTypes();
    const compile_1 = requireCompile();
    const ref_error_1 = requireRef_error();
    const util_1 = requireUtil();
    const error = {
      message: ({ params: { discrError, tagName } }) => discrError === types_1.DiscrError.Tag ? `tag "${tagName}" must be string` : `value of tag "${tagName}" must be in oneOf`,
      params: ({ params: { discrError, tag, tagName } }) => (0, codegen_1._)`{error: ${discrError}, tag: ${tagName}, tagValue: ${tag}}`
    };
    const def = {
      keyword: "discriminator",
      type: "object",
      schemaType: "object",
      error,
      code(cxt) {
        const { gen, data, schema, parentSchema, it } = cxt;
        const { oneOf: oneOf2 } = parentSchema;
        if (!it.opts.discriminator) {
          throw new Error("discriminator: requires discriminator option");
        }
        const tagName = schema.propertyName;
        if (typeof tagName != "string")
          throw new Error("discriminator: requires propertyName");
        if (schema.mapping)
          throw new Error("discriminator: mapping is not supported");
        if (!oneOf2)
          throw new Error("discriminator: requires oneOf keyword");
        const valid = gen.let("valid", false);
        const tag = gen.const("tag", (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(tagName)}`);
        gen.if((0, codegen_1._)`typeof ${tag} == "string"`, () => validateMapping(), () => cxt.error(false, { discrError: types_1.DiscrError.Tag, tag, tagName }));
        cxt.ok(valid);
        function validateMapping() {
          const mapping = getMapping();
          gen.if(false);
          for (const tagValue in mapping) {
            gen.elseIf((0, codegen_1._)`${tag} === ${tagValue}`);
            gen.assign(valid, applyTagSchema(mapping[tagValue]));
          }
          gen.else();
          cxt.error(false, { discrError: types_1.DiscrError.Mapping, tag, tagName });
          gen.endIf();
        }
        function applyTagSchema(schemaProp) {
          const _valid = gen.name("valid");
          const schCxt = cxt.subschema({ keyword: "oneOf", schemaProp }, _valid);
          cxt.mergeEvaluated(schCxt, codegen_1.Name);
          return _valid;
        }
        function getMapping() {
          var _a;
          const oneOfMapping = {};
          const topRequired = hasRequired(parentSchema);
          let tagRequired = true;
          for (let i = 0; i < oneOf2.length; i++) {
            let sch = oneOf2[i];
            if ((sch === null || sch === void 0 ? void 0 : sch.$ref) && !(0, util_1.schemaHasRulesButRef)(sch, it.self.RULES)) {
              const ref2 = sch.$ref;
              sch = compile_1.resolveRef.call(it.self, it.schemaEnv.root, it.baseId, ref2);
              if (sch instanceof compile_1.SchemaEnv)
                sch = sch.schema;
              if (sch === void 0)
                throw new ref_error_1.default(it.opts.uriResolver, it.baseId, ref2);
            }
            const propSch = (_a = sch === null || sch === void 0 ? void 0 : sch.properties) === null || _a === void 0 ? void 0 : _a[tagName];
            if (typeof propSch != "object") {
              throw new Error(`discriminator: oneOf subschemas (or referenced schemas) must have "properties/${tagName}"`);
            }
            tagRequired = tagRequired && (topRequired || hasRequired(sch));
            addMappings(propSch, i);
          }
          if (!tagRequired)
            throw new Error(`discriminator: "${tagName}" must be required`);
          return oneOfMapping;
          function hasRequired({ required: required2 }) {
            return Array.isArray(required2) && required2.includes(tagName);
          }
          function addMappings(sch, i) {
            if (sch.const) {
              addMapping(sch.const, i);
            } else if (sch.enum) {
              for (const tagValue of sch.enum) {
                addMapping(tagValue, i);
              }
            } else {
              throw new Error(`discriminator: "properties/${tagName}" must have "const" or "enum"`);
            }
          }
          function addMapping(tagValue, i) {
            if (typeof tagValue != "string" || tagValue in oneOfMapping) {
              throw new Error(`discriminator: "${tagName}" values must be unique strings`);
            }
            oneOfMapping[tagValue] = i;
          }
        }
      }
    };
    discriminator.default = def;
    return discriminator;
  }
  const $schema = "http://json-schema.org/draft-07/schema#";
  const $id = "http://json-schema.org/draft-07/schema#";
  const title = "Core schema meta-schema";
  const definitions = { "schemaArray": { "type": "array", "minItems": 1, "items": { "$ref": "#" } }, "nonNegativeInteger": { "type": "integer", "minimum": 0 }, "nonNegativeIntegerDefault0": { "allOf": [{ "$ref": "#/definitions/nonNegativeInteger" }, { "default": 0 }] }, "simpleTypes": { "enum": ["array", "boolean", "integer", "null", "number", "object", "string"] }, "stringArray": { "type": "array", "items": { "type": "string" }, "uniqueItems": true, "default": [] } };
  const type = ["object", "boolean"];
  const properties = { "$id": { "type": "string", "format": "uri-reference" }, "$schema": { "type": "string", "format": "uri" }, "$ref": { "type": "string", "format": "uri-reference" }, "$comment": { "type": "string" }, "title": { "type": "string" }, "description": { "type": "string" }, "default": true, "readOnly": { "type": "boolean", "default": false }, "examples": { "type": "array", "items": true }, "multipleOf": { "type": "number", "exclusiveMinimum": 0 }, "maximum": { "type": "number" }, "exclusiveMaximum": { "type": "number" }, "minimum": { "type": "number" }, "exclusiveMinimum": { "type": "number" }, "maxLength": { "$ref": "#/definitions/nonNegativeInteger" }, "minLength": { "$ref": "#/definitions/nonNegativeIntegerDefault0" }, "pattern": { "type": "string", "format": "regex" }, "additionalItems": { "$ref": "#" }, "items": { "anyOf": [{ "$ref": "#" }, { "$ref": "#/definitions/schemaArray" }], "default": true }, "maxItems": { "$ref": "#/definitions/nonNegativeInteger" }, "minItems": { "$ref": "#/definitions/nonNegativeIntegerDefault0" }, "uniqueItems": { "type": "boolean", "default": false }, "contains": { "$ref": "#" }, "maxProperties": { "$ref": "#/definitions/nonNegativeInteger" }, "minProperties": { "$ref": "#/definitions/nonNegativeIntegerDefault0" }, "required": { "$ref": "#/definitions/stringArray" }, "additionalProperties": { "$ref": "#" }, "definitions": { "type": "object", "additionalProperties": { "$ref": "#" }, "default": {} }, "properties": { "type": "object", "additionalProperties": { "$ref": "#" }, "default": {} }, "patternProperties": { "type": "object", "additionalProperties": { "$ref": "#" }, "propertyNames": { "format": "regex" }, "default": {} }, "dependencies": { "type": "object", "additionalProperties": { "anyOf": [{ "$ref": "#" }, { "$ref": "#/definitions/stringArray" }] } }, "propertyNames": { "$ref": "#" }, "const": true, "enum": { "type": "array", "items": true, "minItems": 1, "uniqueItems": true }, "type": { "anyOf": [{ "$ref": "#/definitions/simpleTypes" }, { "type": "array", "items": { "$ref": "#/definitions/simpleTypes" }, "minItems": 1, "uniqueItems": true }] }, "format": { "type": "string" }, "contentMediaType": { "type": "string" }, "contentEncoding": { "type": "string" }, "if": { "$ref": "#" }, "then": { "$ref": "#" }, "else": { "$ref": "#" }, "allOf": { "$ref": "#/definitions/schemaArray" }, "anyOf": { "$ref": "#/definitions/schemaArray" }, "oneOf": { "$ref": "#/definitions/schemaArray" }, "not": { "$ref": "#" } };
  const require$$3 = {
    $schema,
    $id,
    title,
    definitions,
    type,
    properties,
    "default": true
  };
  var hasRequiredAjv;
  function requireAjv() {
    if (hasRequiredAjv) return ajv$1.exports;
    hasRequiredAjv = 1;
    (function(module2, exports3) {
      Object.defineProperty(exports3, "__esModule", { value: true });
      exports3.MissingRefError = exports3.ValidationError = exports3.CodeGen = exports3.Name = exports3.nil = exports3.stringify = exports3.str = exports3._ = exports3.KeywordCxt = exports3.Ajv = void 0;
      const core_1 = requireCore$1();
      const draft7_1 = requireDraft7();
      const discriminator_1 = requireDiscriminator();
      const draft7MetaSchema = require$$3;
      const META_SUPPORT_DATA = ["/properties"];
      const META_SCHEMA_ID = "http://json-schema.org/draft-07/schema";
      class Ajv extends core_1.default {
        _addVocabularies() {
          super._addVocabularies();
          draft7_1.default.forEach((v) => this.addVocabulary(v));
          if (this.opts.discriminator)
            this.addKeyword(discriminator_1.default);
        }
        _addDefaultMetaSchema() {
          super._addDefaultMetaSchema();
          if (!this.opts.meta)
            return;
          const metaSchema = this.opts.$data ? this.$dataMetaSchema(draft7MetaSchema, META_SUPPORT_DATA) : draft7MetaSchema;
          this.addMetaSchema(metaSchema, META_SCHEMA_ID, false);
          this.refs["http://json-schema.org/schema"] = META_SCHEMA_ID;
        }
        defaultMeta() {
          return this.opts.defaultMeta = super.defaultMeta() || (this.getSchema(META_SCHEMA_ID) ? META_SCHEMA_ID : void 0);
        }
      }
      exports3.Ajv = Ajv;
      module2.exports = exports3 = Ajv;
      module2.exports.Ajv = Ajv;
      Object.defineProperty(exports3, "__esModule", { value: true });
      exports3.default = Ajv;
      var validate_1 = requireValidate();
      Object.defineProperty(exports3, "KeywordCxt", { enumerable: true, get: function() {
        return validate_1.KeywordCxt;
      } });
      var codegen_1 = requireCodegen();
      Object.defineProperty(exports3, "_", { enumerable: true, get: function() {
        return codegen_1._;
      } });
      Object.defineProperty(exports3, "str", { enumerable: true, get: function() {
        return codegen_1.str;
      } });
      Object.defineProperty(exports3, "stringify", { enumerable: true, get: function() {
        return codegen_1.stringify;
      } });
      Object.defineProperty(exports3, "nil", { enumerable: true, get: function() {
        return codegen_1.nil;
      } });
      Object.defineProperty(exports3, "Name", { enumerable: true, get: function() {
        return codegen_1.Name;
      } });
      Object.defineProperty(exports3, "CodeGen", { enumerable: true, get: function() {
        return codegen_1.CodeGen;
      } });
      var validation_error_1 = requireValidation_error();
      Object.defineProperty(exports3, "ValidationError", { enumerable: true, get: function() {
        return validation_error_1.default;
      } });
      var ref_error_1 = requireRef_error();
      Object.defineProperty(exports3, "MissingRefError", { enumerable: true, get: function() {
        return ref_error_1.default;
      } });
    })(ajv$1, ajv$1.exports);
    return ajv$1.exports;
  }
  var ajvExports = requireAjv();
  const ajv = /* @__PURE__ */ getDefaultExportFromCjs(ajvExports);
  const NEVER$1 = Object.freeze({
    status: "aborted"
  });
  function $constructor(name, initializer2, params) {
    function init(inst, def) {
      var _a;
      Object.defineProperty(inst, "_zod", {
        value: inst._zod ?? {},
        enumerable: false
      });
      (_a = inst._zod).traits ?? (_a.traits = /* @__PURE__ */ new Set());
      inst._zod.traits.add(name);
      initializer2(inst, def);
      for (const k in _.prototype) {
        if (!(k in inst))
          Object.defineProperty(inst, k, { value: _.prototype[k].bind(inst) });
      }
      inst._zod.constr = _;
      inst._zod.def = def;
    }
    const Parent = params?.Parent ?? Object;
    class Definition extends Parent {
    }
    Object.defineProperty(Definition, "name", { value: name });
    function _(def) {
      var _a;
      const inst = params?.Parent ? new Definition() : this;
      init(inst, def);
      (_a = inst._zod).deferred ?? (_a.deferred = []);
      for (const fn of inst._zod.deferred) {
        fn();
      }
      return inst;
    }
    Object.defineProperty(_, "init", { value: init });
    Object.defineProperty(_, Symbol.hasInstance, {
      value: (inst) => {
        if (params?.Parent && inst instanceof params.Parent)
          return true;
        return inst?._zod?.traits?.has(name);
      }
    });
    Object.defineProperty(_, "name", { value: name });
    return _;
  }
  class $ZodAsyncError extends Error {
    constructor() {
      super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
    }
  }
  const globalConfig = {};
  function config(newConfig) {
    return globalConfig;
  }
  function getEnumValues(entries) {
    const numericValues = Object.values(entries).filter((v) => typeof v === "number");
    const values = Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
    return values;
  }
  function jsonStringifyReplacer(_, value) {
    if (typeof value === "bigint")
      return value.toString();
    return value;
  }
  function cached(getter) {
    return {
      get value() {
        {
          const value = getter();
          Object.defineProperty(this, "value", { value });
          return value;
        }
      }
    };
  }
  function nullish(input) {
    return input === null || input === void 0;
  }
  function cleanRegex(source) {
    const start = source.startsWith("^") ? 1 : 0;
    const end = source.endsWith("$") ? source.length - 1 : source.length;
    return source.slice(start, end);
  }
  function floatSafeRemainder$1(val, step) {
    const valDecCount = (val.toString().split(".")[1] || "").length;
    const stepDecCount = (step.toString().split(".")[1] || "").length;
    const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
    const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
    const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
    return valInt % stepInt / 10 ** decCount;
  }
  function defineLazy(object2, key, getter) {
    Object.defineProperty(object2, key, {
      get() {
        {
          const value = getter();
          object2[key] = value;
          return value;
        }
      },
      set(v) {
        Object.defineProperty(object2, key, {
          value: v
          // configurable: true,
        });
      },
      configurable: true
    });
  }
  function assignProp(target, prop, value) {
    Object.defineProperty(target, prop, {
      value,
      writable: true,
      enumerable: true,
      configurable: true
    });
  }
  function esc(str) {
    return JSON.stringify(str);
  }
  const captureStackTrace = Error.captureStackTrace ? Error.captureStackTrace : (..._args) => {
  };
  function isObject(data) {
    return typeof data === "object" && data !== null && !Array.isArray(data);
  }
  const allowsEval = cached(() => {
    if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) {
      return false;
    }
    try {
      const F = Function;
      new F("");
      return true;
    } catch (_) {
      return false;
    }
  });
  function isPlainObject$1(o) {
    if (isObject(o) === false)
      return false;
    const ctor = o.constructor;
    if (ctor === void 0)
      return true;
    const prot = ctor.prototype;
    if (isObject(prot) === false)
      return false;
    if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
      return false;
    }
    return true;
  }
  const propertyKeyTypes = /* @__PURE__ */ new Set(["string", "number", "symbol"]);
  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function clone(inst, def, params) {
    const cl = new inst._zod.constr(def ?? inst._zod.def);
    if (!def || params?.parent)
      cl._zod.parent = inst;
    return cl;
  }
  function normalizeParams(_params) {
    const params = _params;
    if (!params)
      return {};
    if (typeof params === "string")
      return { error: () => params };
    if (params?.message !== void 0) {
      if (params?.error !== void 0)
        throw new Error("Cannot specify both `message` and `error` params");
      params.error = params.message;
    }
    delete params.message;
    if (typeof params.error === "string")
      return { ...params, error: () => params.error };
    return params;
  }
  function optionalKeys(shape) {
    return Object.keys(shape).filter((k) => {
      return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
    });
  }
  const NUMBER_FORMAT_RANGES = {
    safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
    int32: [-2147483648, 2147483647],
    uint32: [0, 4294967295],
    float32: [-34028234663852886e22, 34028234663852886e22],
    float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
  };
  function pick(schema, mask) {
    const newShape = {};
    const currDef = schema._zod.def;
    for (const key in mask) {
      if (!(key in currDef.shape)) {
        throw new Error(`Unrecognized key: "${key}"`);
      }
      if (!mask[key])
        continue;
      newShape[key] = currDef.shape[key];
    }
    return clone(schema, {
      ...schema._zod.def,
      shape: newShape,
      checks: []
    });
  }
  function omit(schema, mask) {
    const newShape = { ...schema._zod.def.shape };
    const currDef = schema._zod.def;
    for (const key in mask) {
      if (!(key in currDef.shape)) {
        throw new Error(`Unrecognized key: "${key}"`);
      }
      if (!mask[key])
        continue;
      delete newShape[key];
    }
    return clone(schema, {
      ...schema._zod.def,
      shape: newShape,
      checks: []
    });
  }
  function extend(schema, shape) {
    if (!isPlainObject$1(shape)) {
      throw new Error("Invalid input to extend: expected a plain object");
    }
    const def = {
      ...schema._zod.def,
      get shape() {
        const _shape = { ...schema._zod.def.shape, ...shape };
        assignProp(this, "shape", _shape);
        return _shape;
      },
      checks: []
      // delete existing checks
    };
    return clone(schema, def);
  }
  function merge(a, b) {
    return clone(a, {
      ...a._zod.def,
      get shape() {
        const _shape = { ...a._zod.def.shape, ...b._zod.def.shape };
        assignProp(this, "shape", _shape);
        return _shape;
      },
      catchall: b._zod.def.catchall,
      checks: []
      // delete existing checks
    });
  }
  function partial(Class, schema, mask) {
    const oldShape = schema._zod.def.shape;
    const shape = { ...oldShape };
    if (mask) {
      for (const key in mask) {
        if (!(key in oldShape)) {
          throw new Error(`Unrecognized key: "${key}"`);
        }
        if (!mask[key])
          continue;
        shape[key] = Class ? new Class({
          type: "optional",
          innerType: oldShape[key]
        }) : oldShape[key];
      }
    } else {
      for (const key in oldShape) {
        shape[key] = Class ? new Class({
          type: "optional",
          innerType: oldShape[key]
        }) : oldShape[key];
      }
    }
    return clone(schema, {
      ...schema._zod.def,
      shape,
      checks: []
    });
  }
  function required(Class, schema, mask) {
    const oldShape = schema._zod.def.shape;
    const shape = { ...oldShape };
    if (mask) {
      for (const key in mask) {
        if (!(key in shape)) {
          throw new Error(`Unrecognized key: "${key}"`);
        }
        if (!mask[key])
          continue;
        shape[key] = new Class({
          type: "nonoptional",
          innerType: oldShape[key]
        });
      }
    } else {
      for (const key in oldShape) {
        shape[key] = new Class({
          type: "nonoptional",
          innerType: oldShape[key]
        });
      }
    }
    return clone(schema, {
      ...schema._zod.def,
      shape,
      // optional: [],
      checks: []
    });
  }
  function aborted(x, startIndex = 0) {
    for (let i = startIndex; i < x.issues.length; i++) {
      if (x.issues[i]?.continue !== true)
        return true;
    }
    return false;
  }
  function prefixIssues(path, issues) {
    return issues.map((iss) => {
      var _a;
      (_a = iss).path ?? (_a.path = []);
      iss.path.unshift(path);
      return iss;
    });
  }
  function unwrapMessage(message) {
    return typeof message === "string" ? message : message?.message;
  }
  function finalizeIssue(iss, ctx, config2) {
    const full = { ...iss, path: iss.path ?? [] };
    if (!iss.message) {
      const message = unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config2.customError?.(iss)) ?? unwrapMessage(config2.localeError?.(iss)) ?? "Invalid input";
      full.message = message;
    }
    delete full.inst;
    delete full.continue;
    if (!ctx?.reportInput) {
      delete full.input;
    }
    return full;
  }
  function getLengthableOrigin(input) {
    if (Array.isArray(input))
      return "array";
    if (typeof input === "string")
      return "string";
    return "unknown";
  }
  function issue(...args) {
    const [iss, input, inst] = args;
    if (typeof iss === "string") {
      return {
        message: iss,
        code: "custom",
        input,
        inst
      };
    }
    return { ...iss };
  }
  const initializer$1 = (inst, def) => {
    inst.name = "$ZodError";
    Object.defineProperty(inst, "_zod", {
      value: inst._zod,
      enumerable: false
    });
    Object.defineProperty(inst, "issues", {
      value: def,
      enumerable: false
    });
    Object.defineProperty(inst, "message", {
      get() {
        return JSON.stringify(def, jsonStringifyReplacer, 2);
      },
      enumerable: true
      // configurable: false,
    });
    Object.defineProperty(inst, "toString", {
      value: () => inst.message,
      enumerable: false
    });
  };
  const $ZodError = $constructor("$ZodError", initializer$1);
  const $ZodRealError = $constructor("$ZodError", initializer$1, { Parent: Error });
  function flattenError$1(error, mapper = (issue2) => issue2.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of error.issues) {
      if (sub.path.length > 0) {
        fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
        fieldErrors[sub.path[0]].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  function formatError(error, _mapper) {
    const mapper = _mapper || function(issue2) {
      return issue2.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error2) => {
      for (const issue2 of error2.issues) {
        if (issue2.code === "invalid_union" && issue2.errors.length) {
          issue2.errors.map((issues) => processError({ issues }));
        } else if (issue2.code === "invalid_key") {
          processError({ issues: issue2.issues });
        } else if (issue2.code === "invalid_element") {
          processError({ issues: issue2.issues });
        } else if (issue2.path.length === 0) {
          fieldErrors._errors.push(mapper(issue2));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue2.path.length) {
            const el = issue2.path[i];
            const terminal = i === issue2.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue2));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(error);
    return fieldErrors;
  }
  const _parse = (_Err) => (schema, value, _ctx, _params) => {
    const ctx = _ctx ? Object.assign(_ctx, { async: false }) : { async: false };
    const result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise) {
      throw new $ZodAsyncError();
    }
    if (result.issues.length) {
      const e = new (_params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
      captureStackTrace(e, _params?.callee);
      throw e;
    }
    return result.value;
  };
  const parse$1 = /* @__PURE__ */ _parse($ZodRealError);
  const _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
    const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
    let result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise)
      result = await result;
    if (result.issues.length) {
      const e = new (params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
      captureStackTrace(e, params?.callee);
      throw e;
    }
    return result.value;
  };
  const parseAsync$1 = /* @__PURE__ */ _parseAsync($ZodRealError);
  const _safeParse = (_Err) => (schema, value, _ctx) => {
    const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
    const result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise) {
      throw new $ZodAsyncError();
    }
    return result.issues.length ? {
      success: false,
      error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
    } : { success: true, data: result.value };
  };
  const safeParse$2 = /* @__PURE__ */ _safeParse($ZodRealError);
  const _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
    const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
    let result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise)
      result = await result;
    return result.issues.length ? {
      success: false,
      error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
    } : { success: true, data: result.value };
  };
  const safeParseAsync$2 = /* @__PURE__ */ _safeParseAsync($ZodRealError);
  const cuid = /^[cC][^\s-]{8,}$/;
  const cuid2 = /^[0-9a-z]+$/;
  const ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
  const xid = /^[0-9a-vA-V]{20}$/;
  const ksuid = /^[A-Za-z0-9]{27}$/;
  const nanoid = /^[a-zA-Z0-9_-]{21}$/;
  const duration$1 = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
  const guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
  const uuid = (version2) => {
    if (!version2)
      return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000)$/;
    return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version2}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
  };
  const email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
  const _emoji$1 = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
  function emoji() {
    return new RegExp(_emoji$1, "u");
  }
  const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
  const ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})$/;
  const cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
  const cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
  const base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
  const base64url = /^[A-Za-z0-9_-]*$/;
  const hostname = /^([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+$/;
  const e164 = /^\+(?:[0-9]){6,14}[0-9]$/;
  const dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
  const date$1 = /* @__PURE__ */ new RegExp(`^${dateSource}$`);
  function timeSource(args) {
    const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
    const regex = typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
    return regex;
  }
  function time$1(args) {
    return new RegExp(`^${timeSource(args)}$`);
  }
  function datetime$1(args) {
    const time2 = timeSource({ precision: args.precision });
    const opts = ["Z"];
    if (args.local)
      opts.push("");
    if (args.offset)
      opts.push(`([+-]\\d{2}:\\d{2})`);
    const timeRegex2 = `${time2}(?:${opts.join("|")})`;
    return new RegExp(`^${dateSource}T(?:${timeRegex2})$`);
  }
  const string$1 = (params) => {
    const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
    return new RegExp(`^${regex}$`);
  };
  const integer = /^\d+$/;
  const number$2 = /^-?\d+(?:\.\d+)?/i;
  const boolean$1 = /true|false/i;
  const _null$2 = /null/i;
  const lowercase = /^[^A-Z]*$/;
  const uppercase = /^[^a-z]*$/;
  const $ZodCheck = /* @__PURE__ */ $constructor("$ZodCheck", (inst, def) => {
    var _a;
    inst._zod ?? (inst._zod = {});
    inst._zod.def = def;
    (_a = inst._zod).onattach ?? (_a.onattach = []);
  });
  const numericOriginMap = {
    number: "number",
    bigint: "bigint",
    object: "date"
  };
  const $ZodCheckLessThan = /* @__PURE__ */ $constructor("$ZodCheckLessThan", (inst, def) => {
    $ZodCheck.init(inst, def);
    const origin = numericOriginMap[typeof def.value];
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
      if (def.value < curr) {
        if (def.inclusive)
          bag.maximum = def.value;
        else
          bag.exclusiveMaximum = def.value;
      }
    });
    inst._zod.check = (payload) => {
      if (def.inclusive ? payload.value <= def.value : payload.value < def.value) {
        return;
      }
      payload.issues.push({
        origin,
        code: "too_big",
        maximum: def.value,
        input: payload.value,
        inclusive: def.inclusive,
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodCheckGreaterThan = /* @__PURE__ */ $constructor("$ZodCheckGreaterThan", (inst, def) => {
    $ZodCheck.init(inst, def);
    const origin = numericOriginMap[typeof def.value];
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
      if (def.value > curr) {
        if (def.inclusive)
          bag.minimum = def.value;
        else
          bag.exclusiveMinimum = def.value;
      }
    });
    inst._zod.check = (payload) => {
      if (def.inclusive ? payload.value >= def.value : payload.value > def.value) {
        return;
      }
      payload.issues.push({
        origin,
        code: "too_small",
        minimum: def.value,
        input: payload.value,
        inclusive: def.inclusive,
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodCheckMultipleOf = /* @__PURE__ */ $constructor("$ZodCheckMultipleOf", (inst, def) => {
    $ZodCheck.init(inst, def);
    inst._zod.onattach.push((inst2) => {
      var _a;
      (_a = inst2._zod.bag).multipleOf ?? (_a.multipleOf = def.value);
    });
    inst._zod.check = (payload) => {
      if (typeof payload.value !== typeof def.value)
        throw new Error("Cannot mix number and bigint in multiple_of check.");
      const isMultiple = typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder$1(payload.value, def.value) === 0;
      if (isMultiple)
        return;
      payload.issues.push({
        origin: typeof payload.value,
        code: "not_multiple_of",
        divisor: def.value,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodCheckNumberFormat = /* @__PURE__ */ $constructor("$ZodCheckNumberFormat", (inst, def) => {
    $ZodCheck.init(inst, def);
    def.format = def.format || "float64";
    const isInt = def.format?.includes("int");
    const origin = isInt ? "int" : "number";
    const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.format = def.format;
      bag.minimum = minimum;
      bag.maximum = maximum;
      if (isInt)
        bag.pattern = integer;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      if (isInt) {
        if (!Number.isInteger(input)) {
          payload.issues.push({
            expected: origin,
            format: def.format,
            code: "invalid_type",
            input,
            inst
          });
          return;
        }
        if (!Number.isSafeInteger(input)) {
          if (input > 0) {
            payload.issues.push({
              input,
              code: "too_big",
              maximum: Number.MAX_SAFE_INTEGER,
              note: "Integers must be within the safe integer range.",
              inst,
              origin,
              continue: !def.abort
            });
          } else {
            payload.issues.push({
              input,
              code: "too_small",
              minimum: Number.MIN_SAFE_INTEGER,
              note: "Integers must be within the safe integer range.",
              inst,
              origin,
              continue: !def.abort
            });
          }
          return;
        }
      }
      if (input < minimum) {
        payload.issues.push({
          origin: "number",
          input,
          code: "too_small",
          minimum,
          inclusive: true,
          inst,
          continue: !def.abort
        });
      }
      if (input > maximum) {
        payload.issues.push({
          origin: "number",
          input,
          code: "too_big",
          maximum,
          inst
        });
      }
    };
  });
  const $ZodCheckMaxLength = /* @__PURE__ */ $constructor("$ZodCheckMaxLength", (inst, def) => {
    var _a;
    $ZodCheck.init(inst, def);
    (_a = inst._zod.def).when ?? (_a.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.length !== void 0;
    });
    inst._zod.onattach.push((inst2) => {
      const curr = inst2._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
      if (def.maximum < curr)
        inst2._zod.bag.maximum = def.maximum;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const length = input.length;
      if (length <= def.maximum)
        return;
      const origin = getLengthableOrigin(input);
      payload.issues.push({
        origin,
        code: "too_big",
        maximum: def.maximum,
        inclusive: true,
        input,
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodCheckMinLength = /* @__PURE__ */ $constructor("$ZodCheckMinLength", (inst, def) => {
    var _a;
    $ZodCheck.init(inst, def);
    (_a = inst._zod.def).when ?? (_a.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.length !== void 0;
    });
    inst._zod.onattach.push((inst2) => {
      const curr = inst2._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
      if (def.minimum > curr)
        inst2._zod.bag.minimum = def.minimum;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const length = input.length;
      if (length >= def.minimum)
        return;
      const origin = getLengthableOrigin(input);
      payload.issues.push({
        origin,
        code: "too_small",
        minimum: def.minimum,
        inclusive: true,
        input,
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodCheckLengthEquals = /* @__PURE__ */ $constructor("$ZodCheckLengthEquals", (inst, def) => {
    var _a;
    $ZodCheck.init(inst, def);
    (_a = inst._zod.def).when ?? (_a.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.length !== void 0;
    });
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.minimum = def.length;
      bag.maximum = def.length;
      bag.length = def.length;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const length = input.length;
      if (length === def.length)
        return;
      const origin = getLengthableOrigin(input);
      const tooBig = length > def.length;
      payload.issues.push({
        origin,
        ...tooBig ? { code: "too_big", maximum: def.length } : { code: "too_small", minimum: def.length },
        inclusive: true,
        exact: true,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodCheckStringFormat = /* @__PURE__ */ $constructor("$ZodCheckStringFormat", (inst, def) => {
    var _a, _b;
    $ZodCheck.init(inst, def);
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.format = def.format;
      if (def.pattern) {
        bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
        bag.patterns.add(def.pattern);
      }
    });
    if (def.pattern)
      (_a = inst._zod).check ?? (_a.check = (payload) => {
        def.pattern.lastIndex = 0;
        if (def.pattern.test(payload.value))
          return;
        payload.issues.push({
          origin: "string",
          code: "invalid_format",
          format: def.format,
          input: payload.value,
          ...def.pattern ? { pattern: def.pattern.toString() } : {},
          inst,
          continue: !def.abort
        });
      });
    else
      (_b = inst._zod).check ?? (_b.check = () => {
      });
  });
  const $ZodCheckRegex = /* @__PURE__ */ $constructor("$ZodCheckRegex", (inst, def) => {
    $ZodCheckStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      def.pattern.lastIndex = 0;
      if (def.pattern.test(payload.value))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "regex",
        input: payload.value,
        pattern: def.pattern.toString(),
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodCheckLowerCase = /* @__PURE__ */ $constructor("$ZodCheckLowerCase", (inst, def) => {
    def.pattern ?? (def.pattern = lowercase);
    $ZodCheckStringFormat.init(inst, def);
  });
  const $ZodCheckUpperCase = /* @__PURE__ */ $constructor("$ZodCheckUpperCase", (inst, def) => {
    def.pattern ?? (def.pattern = uppercase);
    $ZodCheckStringFormat.init(inst, def);
  });
  const $ZodCheckIncludes = /* @__PURE__ */ $constructor("$ZodCheckIncludes", (inst, def) => {
    $ZodCheck.init(inst, def);
    const escapedRegex = escapeRegex(def.includes);
    const pattern2 = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
    def.pattern = pattern2;
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
      bag.patterns.add(pattern2);
    });
    inst._zod.check = (payload) => {
      if (payload.value.includes(def.includes, def.position))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "includes",
        includes: def.includes,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodCheckStartsWith = /* @__PURE__ */ $constructor("$ZodCheckStartsWith", (inst, def) => {
    $ZodCheck.init(inst, def);
    const pattern2 = new RegExp(`^${escapeRegex(def.prefix)}.*`);
    def.pattern ?? (def.pattern = pattern2);
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
      bag.patterns.add(pattern2);
    });
    inst._zod.check = (payload) => {
      if (payload.value.startsWith(def.prefix))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "starts_with",
        prefix: def.prefix,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodCheckEndsWith = /* @__PURE__ */ $constructor("$ZodCheckEndsWith", (inst, def) => {
    $ZodCheck.init(inst, def);
    const pattern2 = new RegExp(`.*${escapeRegex(def.suffix)}$`);
    def.pattern ?? (def.pattern = pattern2);
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
      bag.patterns.add(pattern2);
    });
    inst._zod.check = (payload) => {
      if (payload.value.endsWith(def.suffix))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "ends_with",
        suffix: def.suffix,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodCheckOverwrite = /* @__PURE__ */ $constructor("$ZodCheckOverwrite", (inst, def) => {
    $ZodCheck.init(inst, def);
    inst._zod.check = (payload) => {
      payload.value = def.tx(payload.value);
    };
  });
  class Doc {
    constructor(args = []) {
      this.content = [];
      this.indent = 0;
      if (this)
        this.args = args;
    }
    indented(fn) {
      this.indent += 1;
      fn(this);
      this.indent -= 1;
    }
    write(arg) {
      if (typeof arg === "function") {
        arg(this, { execution: "sync" });
        arg(this, { execution: "async" });
        return;
      }
      const content = arg;
      const lines = content.split("\n").filter((x) => x);
      const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
      const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
      for (const line of dedented) {
        this.content.push(line);
      }
    }
    compile() {
      const F = Function;
      const args = this?.args;
      const content = this?.content ?? [``];
      const lines = [...content.map((x) => `  ${x}`)];
      return new F(...args, lines.join("\n"));
    }
  }
  const version = {
    major: 4,
    minor: 0,
    patch: 0
  };
  const $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
    var _a;
    inst ?? (inst = {});
    inst._zod.def = def;
    inst._zod.bag = inst._zod.bag || {};
    inst._zod.version = version;
    const checks = [...inst._zod.def.checks ?? []];
    if (inst._zod.traits.has("$ZodCheck")) {
      checks.unshift(inst);
    }
    for (const ch of checks) {
      for (const fn of ch._zod.onattach) {
        fn(inst);
      }
    }
    if (checks.length === 0) {
      (_a = inst._zod).deferred ?? (_a.deferred = []);
      inst._zod.deferred?.push(() => {
        inst._zod.run = inst._zod.parse;
      });
    } else {
      const runChecks = (payload, checks2, ctx) => {
        let isAborted2 = aborted(payload);
        let asyncResult;
        for (const ch of checks2) {
          if (ch._zod.def.when) {
            const shouldRun = ch._zod.def.when(payload);
            if (!shouldRun)
              continue;
          } else if (isAborted2) {
            continue;
          }
          const currLen = payload.issues.length;
          const _ = ch._zod.check(payload);
          if (_ instanceof Promise && ctx?.async === false) {
            throw new $ZodAsyncError();
          }
          if (asyncResult || _ instanceof Promise) {
            asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
              await _;
              const nextLen = payload.issues.length;
              if (nextLen === currLen)
                return;
              if (!isAborted2)
                isAborted2 = aborted(payload, currLen);
            });
          } else {
            const nextLen = payload.issues.length;
            if (nextLen === currLen)
              continue;
            if (!isAborted2)
              isAborted2 = aborted(payload, currLen);
          }
        }
        if (asyncResult) {
          return asyncResult.then(() => {
            return payload;
          });
        }
        return payload;
      };
      inst._zod.run = (payload, ctx) => {
        const result = inst._zod.parse(payload, ctx);
        if (result instanceof Promise) {
          if (ctx.async === false)
            throw new $ZodAsyncError();
          return result.then((result2) => runChecks(result2, checks, ctx));
        }
        return runChecks(result, checks, ctx);
      };
    }
    inst["~standard"] = {
      validate: (value) => {
        try {
          const r = safeParse$2(inst, value);
          return r.success ? { value: r.data } : { issues: r.error?.issues };
        } catch (_) {
          return safeParseAsync$2(inst, value).then((r) => r.success ? { value: r.data } : { issues: r.error?.issues });
        }
      },
      vendor: "zod",
      version: 1
    };
  });
  const $ZodString = /* @__PURE__ */ $constructor("$ZodString", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = [...inst?._zod.bag?.patterns ?? []].pop() ?? string$1(inst._zod.bag);
    inst._zod.parse = (payload, _) => {
      if (def.coerce)
        try {
          payload.value = String(payload.value);
        } catch (_2) {
        }
      if (typeof payload.value === "string")
        return payload;
      payload.issues.push({
        expected: "string",
        code: "invalid_type",
        input: payload.value,
        inst
      });
      return payload;
    };
  });
  const $ZodStringFormat = /* @__PURE__ */ $constructor("$ZodStringFormat", (inst, def) => {
    $ZodCheckStringFormat.init(inst, def);
    $ZodString.init(inst, def);
  });
  const $ZodGUID = /* @__PURE__ */ $constructor("$ZodGUID", (inst, def) => {
    def.pattern ?? (def.pattern = guid);
    $ZodStringFormat.init(inst, def);
  });
  const $ZodUUID = /* @__PURE__ */ $constructor("$ZodUUID", (inst, def) => {
    if (def.version) {
      const versionMap = {
        v1: 1,
        v2: 2,
        v3: 3,
        v4: 4,
        v5: 5,
        v6: 6,
        v7: 7,
        v8: 8
      };
      const v = versionMap[def.version];
      if (v === void 0)
        throw new Error(`Invalid UUID version: "${def.version}"`);
      def.pattern ?? (def.pattern = uuid(v));
    } else
      def.pattern ?? (def.pattern = uuid());
    $ZodStringFormat.init(inst, def);
  });
  const $ZodEmail = /* @__PURE__ */ $constructor("$ZodEmail", (inst, def) => {
    def.pattern ?? (def.pattern = email);
    $ZodStringFormat.init(inst, def);
  });
  const $ZodURL = /* @__PURE__ */ $constructor("$ZodURL", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      try {
        const orig = payload.value;
        const url2 = new URL(orig);
        const href = url2.href;
        if (def.hostname) {
          def.hostname.lastIndex = 0;
          if (!def.hostname.test(url2.hostname)) {
            payload.issues.push({
              code: "invalid_format",
              format: "url",
              note: "Invalid hostname",
              pattern: hostname.source,
              input: payload.value,
              inst,
              continue: !def.abort
            });
          }
        }
        if (def.protocol) {
          def.protocol.lastIndex = 0;
          if (!def.protocol.test(url2.protocol.endsWith(":") ? url2.protocol.slice(0, -1) : url2.protocol)) {
            payload.issues.push({
              code: "invalid_format",
              format: "url",
              note: "Invalid protocol",
              pattern: def.protocol.source,
              input: payload.value,
              inst,
              continue: !def.abort
            });
          }
        }
        if (!orig.endsWith("/") && href.endsWith("/")) {
          payload.value = href.slice(0, -1);
        } else {
          payload.value = href;
        }
        return;
      } catch (_) {
        payload.issues.push({
          code: "invalid_format",
          format: "url",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  const $ZodEmoji = /* @__PURE__ */ $constructor("$ZodEmoji", (inst, def) => {
    def.pattern ?? (def.pattern = emoji());
    $ZodStringFormat.init(inst, def);
  });
  const $ZodNanoID = /* @__PURE__ */ $constructor("$ZodNanoID", (inst, def) => {
    def.pattern ?? (def.pattern = nanoid);
    $ZodStringFormat.init(inst, def);
  });
  const $ZodCUID = /* @__PURE__ */ $constructor("$ZodCUID", (inst, def) => {
    def.pattern ?? (def.pattern = cuid);
    $ZodStringFormat.init(inst, def);
  });
  const $ZodCUID2 = /* @__PURE__ */ $constructor("$ZodCUID2", (inst, def) => {
    def.pattern ?? (def.pattern = cuid2);
    $ZodStringFormat.init(inst, def);
  });
  const $ZodULID = /* @__PURE__ */ $constructor("$ZodULID", (inst, def) => {
    def.pattern ?? (def.pattern = ulid);
    $ZodStringFormat.init(inst, def);
  });
  const $ZodXID = /* @__PURE__ */ $constructor("$ZodXID", (inst, def) => {
    def.pattern ?? (def.pattern = xid);
    $ZodStringFormat.init(inst, def);
  });
  const $ZodKSUID = /* @__PURE__ */ $constructor("$ZodKSUID", (inst, def) => {
    def.pattern ?? (def.pattern = ksuid);
    $ZodStringFormat.init(inst, def);
  });
  const $ZodISODateTime = /* @__PURE__ */ $constructor("$ZodISODateTime", (inst, def) => {
    def.pattern ?? (def.pattern = datetime$1(def));
    $ZodStringFormat.init(inst, def);
  });
  const $ZodISODate = /* @__PURE__ */ $constructor("$ZodISODate", (inst, def) => {
    def.pattern ?? (def.pattern = date$1);
    $ZodStringFormat.init(inst, def);
  });
  const $ZodISOTime = /* @__PURE__ */ $constructor("$ZodISOTime", (inst, def) => {
    def.pattern ?? (def.pattern = time$1(def));
    $ZodStringFormat.init(inst, def);
  });
  const $ZodISODuration = /* @__PURE__ */ $constructor("$ZodISODuration", (inst, def) => {
    def.pattern ?? (def.pattern = duration$1);
    $ZodStringFormat.init(inst, def);
  });
  const $ZodIPv4 = /* @__PURE__ */ $constructor("$ZodIPv4", (inst, def) => {
    def.pattern ?? (def.pattern = ipv4);
    $ZodStringFormat.init(inst, def);
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.format = `ipv4`;
    });
  });
  const $ZodIPv6 = /* @__PURE__ */ $constructor("$ZodIPv6", (inst, def) => {
    def.pattern ?? (def.pattern = ipv6);
    $ZodStringFormat.init(inst, def);
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.format = `ipv6`;
    });
    inst._zod.check = (payload) => {
      try {
        new URL(`http://[${payload.value}]`);
      } catch {
        payload.issues.push({
          code: "invalid_format",
          format: "ipv6",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  const $ZodCIDRv4 = /* @__PURE__ */ $constructor("$ZodCIDRv4", (inst, def) => {
    def.pattern ?? (def.pattern = cidrv4);
    $ZodStringFormat.init(inst, def);
  });
  const $ZodCIDRv6 = /* @__PURE__ */ $constructor("$ZodCIDRv6", (inst, def) => {
    def.pattern ?? (def.pattern = cidrv6);
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      const [address, prefix] = payload.value.split("/");
      try {
        if (!prefix)
          throw new Error();
        const prefixNum = Number(prefix);
        if (`${prefixNum}` !== prefix)
          throw new Error();
        if (prefixNum < 0 || prefixNum > 128)
          throw new Error();
        new URL(`http://[${address}]`);
      } catch {
        payload.issues.push({
          code: "invalid_format",
          format: "cidrv6",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  function isValidBase64(data) {
    if (data === "")
      return true;
    if (data.length % 4 !== 0)
      return false;
    try {
      atob(data);
      return true;
    } catch {
      return false;
    }
  }
  const $ZodBase64 = /* @__PURE__ */ $constructor("$ZodBase64", (inst, def) => {
    def.pattern ?? (def.pattern = base64);
    $ZodStringFormat.init(inst, def);
    inst._zod.onattach.push((inst2) => {
      inst2._zod.bag.contentEncoding = "base64";
    });
    inst._zod.check = (payload) => {
      if (isValidBase64(payload.value))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: "base64",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  function isValidBase64URL(data) {
    if (!base64url.test(data))
      return false;
    const base642 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
    const padded = base642.padEnd(Math.ceil(base642.length / 4) * 4, "=");
    return isValidBase64(padded);
  }
  const $ZodBase64URL = /* @__PURE__ */ $constructor("$ZodBase64URL", (inst, def) => {
    def.pattern ?? (def.pattern = base64url);
    $ZodStringFormat.init(inst, def);
    inst._zod.onattach.push((inst2) => {
      inst2._zod.bag.contentEncoding = "base64url";
    });
    inst._zod.check = (payload) => {
      if (isValidBase64URL(payload.value))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: "base64url",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodE164 = /* @__PURE__ */ $constructor("$ZodE164", (inst, def) => {
    def.pattern ?? (def.pattern = e164);
    $ZodStringFormat.init(inst, def);
  });
  function isValidJWT$1(token, algorithm = null) {
    try {
      const tokensParts = token.split(".");
      if (tokensParts.length !== 3)
        return false;
      const [header] = tokensParts;
      if (!header)
        return false;
      const parsedHeader = JSON.parse(atob(header));
      if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT")
        return false;
      if (!parsedHeader.alg)
        return false;
      if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm))
        return false;
      return true;
    } catch {
      return false;
    }
  }
  const $ZodJWT = /* @__PURE__ */ $constructor("$ZodJWT", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      if (isValidJWT$1(payload.value, def.alg))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: "jwt",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  const $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = inst._zod.bag.pattern ?? number$2;
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce)
        try {
          payload.value = Number(payload.value);
        } catch (_) {
        }
      const input = payload.value;
      if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
        return payload;
      }
      const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : void 0 : void 0;
      payload.issues.push({
        expected: "number",
        code: "invalid_type",
        input,
        inst,
        ...received ? { received } : {}
      });
      return payload;
    };
  });
  const $ZodNumberFormat = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
    $ZodCheckNumberFormat.init(inst, def);
    $ZodNumber.init(inst, def);
  });
  const $ZodBoolean = /* @__PURE__ */ $constructor("$ZodBoolean", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = boolean$1;
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce)
        try {
          payload.value = Boolean(payload.value);
        } catch (_) {
        }
      const input = payload.value;
      if (typeof input === "boolean")
        return payload;
      payload.issues.push({
        expected: "boolean",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    };
  });
  const $ZodNull = /* @__PURE__ */ $constructor("$ZodNull", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = _null$2;
    inst._zod.values = /* @__PURE__ */ new Set([null]);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (input === null)
        return payload;
      payload.issues.push({
        expected: "null",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    };
  });
  const $ZodAny = /* @__PURE__ */ $constructor("$ZodAny", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload) => payload;
  });
  const $ZodUnknown = /* @__PURE__ */ $constructor("$ZodUnknown", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload) => payload;
  });
  const $ZodNever = /* @__PURE__ */ $constructor("$ZodNever", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      payload.issues.push({
        expected: "never",
        code: "invalid_type",
        input: payload.value,
        inst
      });
      return payload;
    };
  });
  function handleArrayResult(result, final, index) {
    if (result.issues.length) {
      final.issues.push(...prefixIssues(index, result.issues));
    }
    final.value[index] = result.value;
  }
  const $ZodArray = /* @__PURE__ */ $constructor("$ZodArray", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!Array.isArray(input)) {
        payload.issues.push({
          expected: "array",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      payload.value = Array(input.length);
      const proms = [];
      for (let i = 0; i < input.length; i++) {
        const item = input[i];
        const result = def.element._zod.run({
          value: item,
          issues: []
        }, ctx);
        if (result instanceof Promise) {
          proms.push(result.then((result2) => handleArrayResult(result2, payload, i)));
        } else {
          handleArrayResult(result, payload, i);
        }
      }
      if (proms.length) {
        return Promise.all(proms).then(() => payload);
      }
      return payload;
    };
  });
  function handleObjectResult(result, final, key) {
    if (result.issues.length) {
      final.issues.push(...prefixIssues(key, result.issues));
    }
    final.value[key] = result.value;
  }
  function handleOptionalObjectResult(result, final, key, input) {
    if (result.issues.length) {
      if (input[key] === void 0) {
        if (key in input) {
          final.value[key] = void 0;
        } else {
          final.value[key] = result.value;
        }
      } else {
        final.issues.push(...prefixIssues(key, result.issues));
      }
    } else if (result.value === void 0) {
      if (key in input)
        final.value[key] = void 0;
    } else {
      final.value[key] = result.value;
    }
  }
  const $ZodObject = /* @__PURE__ */ $constructor("$ZodObject", (inst, def) => {
    $ZodType.init(inst, def);
    const _normalized = cached(() => {
      const keys = Object.keys(def.shape);
      for (const k of keys) {
        if (!(def.shape[k] instanceof $ZodType)) {
          throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
        }
      }
      const okeys = optionalKeys(def.shape);
      return {
        shape: def.shape,
        keys,
        keySet: new Set(keys),
        numKeys: keys.length,
        optionalKeys: new Set(okeys)
      };
    });
    defineLazy(inst._zod, "propValues", () => {
      const shape = def.shape;
      const propValues = {};
      for (const key in shape) {
        const field = shape[key]._zod;
        if (field.values) {
          propValues[key] ?? (propValues[key] = /* @__PURE__ */ new Set());
          for (const v of field.values)
            propValues[key].add(v);
        }
      }
      return propValues;
    });
    const generateFastpass = (shape) => {
      const doc = new Doc(["shape", "payload", "ctx"]);
      const normalized = _normalized.value;
      const parseStr = (key) => {
        const k = esc(key);
        return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
      };
      doc.write(`const input = payload.value;`);
      const ids = /* @__PURE__ */ Object.create(null);
      let counter = 0;
      for (const key of normalized.keys) {
        ids[key] = `key_${counter++}`;
      }
      doc.write(`const newResult = {}`);
      for (const key of normalized.keys) {
        if (normalized.optionalKeys.has(key)) {
          const id2 = ids[key];
          doc.write(`const ${id2} = ${parseStr(key)};`);
          const k = esc(key);
          doc.write(`
        if (${id2}.issues.length) {
          if (input[${k}] === undefined) {
            if (${k} in input) {
              newResult[${k}] = undefined;
            }
          } else {
            payload.issues = payload.issues.concat(
              ${id2}.issues.map((iss) => ({
                ...iss,
                path: iss.path ? [${k}, ...iss.path] : [${k}],
              }))
            );
          }
        } else if (${id2}.value === undefined) {
          if (${k} in input) newResult[${k}] = undefined;
        } else {
          newResult[${k}] = ${id2}.value;
        }
        `);
        } else {
          const id2 = ids[key];
          doc.write(`const ${id2} = ${parseStr(key)};`);
          doc.write(`
          if (${id2}.issues.length) payload.issues = payload.issues.concat(${id2}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${esc(key)}, ...iss.path] : [${esc(key)}]
          })));`);
          doc.write(`newResult[${esc(key)}] = ${id2}.value`);
        }
      }
      doc.write(`payload.value = newResult;`);
      doc.write(`return payload;`);
      const fn = doc.compile();
      return (payload, ctx) => fn(shape, payload, ctx);
    };
    let fastpass;
    const isObject$1 = isObject;
    const jit = !globalConfig.jitless;
    const allowsEval$1 = allowsEval;
    const fastEnabled = jit && allowsEval$1.value;
    const catchall = def.catchall;
    let value;
    inst._zod.parse = (payload, ctx) => {
      value ?? (value = _normalized.value);
      const input = payload.value;
      if (!isObject$1(input)) {
        payload.issues.push({
          expected: "object",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      const proms = [];
      if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
        if (!fastpass)
          fastpass = generateFastpass(def.shape);
        payload = fastpass(payload, ctx);
      } else {
        payload.value = {};
        const shape = value.shape;
        for (const key of value.keys) {
          const el = shape[key];
          const r = el._zod.run({ value: input[key], issues: [] }, ctx);
          const isOptional = el._zod.optin === "optional" && el._zod.optout === "optional";
          if (r instanceof Promise) {
            proms.push(r.then((r2) => isOptional ? handleOptionalObjectResult(r2, payload, key, input) : handleObjectResult(r2, payload, key)));
          } else if (isOptional) {
            handleOptionalObjectResult(r, payload, key, input);
          } else {
            handleObjectResult(r, payload, key);
          }
        }
      }
      if (!catchall) {
        return proms.length ? Promise.all(proms).then(() => payload) : payload;
      }
      const unrecognized = [];
      const keySet = value.keySet;
      const _catchall = catchall._zod;
      const t = _catchall.def.type;
      for (const key of Object.keys(input)) {
        if (keySet.has(key))
          continue;
        if (t === "never") {
          unrecognized.push(key);
          continue;
        }
        const r = _catchall.run({ value: input[key], issues: [] }, ctx);
        if (r instanceof Promise) {
          proms.push(r.then((r2) => handleObjectResult(r2, payload, key)));
        } else {
          handleObjectResult(r, payload, key);
        }
      }
      if (unrecognized.length) {
        payload.issues.push({
          code: "unrecognized_keys",
          keys: unrecognized,
          input,
          inst
        });
      }
      if (!proms.length)
        return payload;
      return Promise.all(proms).then(() => {
        return payload;
      });
    };
  });
  function handleUnionResults(results, final, inst, ctx) {
    for (const result of results) {
      if (result.issues.length === 0) {
        final.value = result.value;
        return final;
      }
    }
    final.issues.push({
      code: "invalid_union",
      input: final.value,
      inst,
      errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
    });
    return final;
  }
  const $ZodUnion = /* @__PURE__ */ $constructor("$ZodUnion", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : void 0);
    defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
    defineLazy(inst._zod, "values", () => {
      if (def.options.every((o) => o._zod.values)) {
        return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
      }
      return void 0;
    });
    defineLazy(inst._zod, "pattern", () => {
      if (def.options.every((o) => o._zod.pattern)) {
        const patterns = def.options.map((o) => o._zod.pattern);
        return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
      }
      return void 0;
    });
    inst._zod.parse = (payload, ctx) => {
      let async = false;
      const results = [];
      for (const option of def.options) {
        const result = option._zod.run({
          value: payload.value,
          issues: []
        }, ctx);
        if (result instanceof Promise) {
          results.push(result);
          async = true;
        } else {
          if (result.issues.length === 0)
            return result;
          results.push(result);
        }
      }
      if (!async)
        return handleUnionResults(results, payload, inst, ctx);
      return Promise.all(results).then((results2) => {
        return handleUnionResults(results2, payload, inst, ctx);
      });
    };
  });
  const $ZodDiscriminatedUnion = /* @__PURE__ */ $constructor("$ZodDiscriminatedUnion", (inst, def) => {
    $ZodUnion.init(inst, def);
    const _super = inst._zod.parse;
    defineLazy(inst._zod, "propValues", () => {
      const propValues = {};
      for (const option of def.options) {
        const pv = option._zod.propValues;
        if (!pv || Object.keys(pv).length === 0)
          throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(option)}"`);
        for (const [k, v] of Object.entries(pv)) {
          if (!propValues[k])
            propValues[k] = /* @__PURE__ */ new Set();
          for (const val of v) {
            propValues[k].add(val);
          }
        }
      }
      return propValues;
    });
    const disc = cached(() => {
      const opts = def.options;
      const map = /* @__PURE__ */ new Map();
      for (const o of opts) {
        const values = o._zod.propValues[def.discriminator];
        if (!values || values.size === 0)
          throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(o)}"`);
        for (const v of values) {
          if (map.has(v)) {
            throw new Error(`Duplicate discriminator value "${String(v)}"`);
          }
          map.set(v, o);
        }
      }
      return map;
    });
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!isObject(input)) {
        payload.issues.push({
          code: "invalid_type",
          expected: "object",
          input,
          inst
        });
        return payload;
      }
      const opt = disc.value.get(input?.[def.discriminator]);
      if (opt) {
        return opt._zod.run(payload, ctx);
      }
      if (def.unionFallback) {
        return _super(payload, ctx);
      }
      payload.issues.push({
        code: "invalid_union",
        errors: [],
        note: "No matching discriminator",
        input,
        path: [def.discriminator],
        inst
      });
      return payload;
    };
  });
  const $ZodIntersection = /* @__PURE__ */ $constructor("$ZodIntersection", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      const left = def.left._zod.run({ value: input, issues: [] }, ctx);
      const right = def.right._zod.run({ value: input, issues: [] }, ctx);
      const async = left instanceof Promise || right instanceof Promise;
      if (async) {
        return Promise.all([left, right]).then(([left2, right2]) => {
          return handleIntersectionResults(payload, left2, right2);
        });
      }
      return handleIntersectionResults(payload, left, right);
    };
  });
  function mergeValues$1(a, b) {
    if (a === b) {
      return { valid: true, data: a };
    }
    if (a instanceof Date && b instanceof Date && +a === +b) {
      return { valid: true, data: a };
    }
    if (isPlainObject$1(a) && isPlainObject$1(b)) {
      const bKeys = Object.keys(b);
      const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
      const newObj = { ...a, ...b };
      for (const key of sharedKeys) {
        const sharedValue = mergeValues$1(a[key], b[key]);
        if (!sharedValue.valid) {
          return {
            valid: false,
            mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
          };
        }
        newObj[key] = sharedValue.data;
      }
      return { valid: true, data: newObj };
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
        return { valid: false, mergeErrorPath: [] };
      }
      const newArray = [];
      for (let index = 0; index < a.length; index++) {
        const itemA = a[index];
        const itemB = b[index];
        const sharedValue = mergeValues$1(itemA, itemB);
        if (!sharedValue.valid) {
          return {
            valid: false,
            mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
          };
        }
        newArray.push(sharedValue.data);
      }
      return { valid: true, data: newArray };
    }
    return { valid: false, mergeErrorPath: [] };
  }
  function handleIntersectionResults(result, left, right) {
    if (left.issues.length) {
      result.issues.push(...left.issues);
    }
    if (right.issues.length) {
      result.issues.push(...right.issues);
    }
    if (aborted(result))
      return result;
    const merged = mergeValues$1(left.value, right.value);
    if (!merged.valid) {
      throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
    }
    result.value = merged.data;
    return result;
  }
  const $ZodRecord = /* @__PURE__ */ $constructor("$ZodRecord", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!isPlainObject$1(input)) {
        payload.issues.push({
          expected: "record",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      const proms = [];
      if (def.keyType._zod.values) {
        const values = def.keyType._zod.values;
        payload.value = {};
        for (const key of values) {
          if (typeof key === "string" || typeof key === "number" || typeof key === "symbol") {
            const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
            if (result instanceof Promise) {
              proms.push(result.then((result2) => {
                if (result2.issues.length) {
                  payload.issues.push(...prefixIssues(key, result2.issues));
                }
                payload.value[key] = result2.value;
              }));
            } else {
              if (result.issues.length) {
                payload.issues.push(...prefixIssues(key, result.issues));
              }
              payload.value[key] = result.value;
            }
          }
        }
        let unrecognized;
        for (const key in input) {
          if (!values.has(key)) {
            unrecognized = unrecognized ?? [];
            unrecognized.push(key);
          }
        }
        if (unrecognized && unrecognized.length > 0) {
          payload.issues.push({
            code: "unrecognized_keys",
            input,
            inst,
            keys: unrecognized
          });
        }
      } else {
        payload.value = {};
        for (const key of Reflect.ownKeys(input)) {
          if (key === "__proto__")
            continue;
          const keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
          if (keyResult instanceof Promise) {
            throw new Error("Async schemas not supported in object keys currently");
          }
          if (keyResult.issues.length) {
            payload.issues.push({
              origin: "record",
              code: "invalid_key",
              issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
              input: key,
              path: [key],
              inst
            });
            payload.value[keyResult.value] = keyResult.value;
            continue;
          }
          const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
          if (result instanceof Promise) {
            proms.push(result.then((result2) => {
              if (result2.issues.length) {
                payload.issues.push(...prefixIssues(key, result2.issues));
              }
              payload.value[keyResult.value] = result2.value;
            }));
          } else {
            if (result.issues.length) {
              payload.issues.push(...prefixIssues(key, result.issues));
            }
            payload.value[keyResult.value] = result.value;
          }
        }
      }
      if (proms.length) {
        return Promise.all(proms).then(() => payload);
      }
      return payload;
    };
  });
  const $ZodEnum = /* @__PURE__ */ $constructor("$ZodEnum", (inst, def) => {
    $ZodType.init(inst, def);
    const values = getEnumValues(def.entries);
    inst._zod.values = new Set(values);
    inst._zod.pattern = new RegExp(`^(${values.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (inst._zod.values.has(input)) {
        return payload;
      }
      payload.issues.push({
        code: "invalid_value",
        values,
        input,
        inst
      });
      return payload;
    };
  });
  const $ZodLiteral = /* @__PURE__ */ $constructor("$ZodLiteral", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.values = new Set(def.values);
    inst._zod.pattern = new RegExp(`^(${def.values.map((o) => typeof o === "string" ? escapeRegex(o) : o ? o.toString() : String(o)).join("|")})$`);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (inst._zod.values.has(input)) {
        return payload;
      }
      payload.issues.push({
        code: "invalid_value",
        values: def.values,
        input,
        inst
      });
      return payload;
    };
  });
  const $ZodTransform = /* @__PURE__ */ $constructor("$ZodTransform", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      const _out = def.transform(payload.value, payload);
      if (_ctx.async) {
        const output = _out instanceof Promise ? _out : Promise.resolve(_out);
        return output.then((output2) => {
          payload.value = output2;
          return payload;
        });
      }
      if (_out instanceof Promise) {
        throw new $ZodAsyncError();
      }
      payload.value = _out;
      return payload;
    };
  });
  const $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    inst._zod.optout = "optional";
    defineLazy(inst._zod, "values", () => {
      return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, void 0]) : void 0;
    });
    defineLazy(inst._zod, "pattern", () => {
      const pattern2 = def.innerType._zod.pattern;
      return pattern2 ? new RegExp(`^(${cleanRegex(pattern2.source)})?$`) : void 0;
    });
    inst._zod.parse = (payload, ctx) => {
      if (def.innerType._zod.optin === "optional") {
        return def.innerType._zod.run(payload, ctx);
      }
      if (payload.value === void 0) {
        return payload;
      }
      return def.innerType._zod.run(payload, ctx);
    };
  });
  const $ZodNullable = /* @__PURE__ */ $constructor("$ZodNullable", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
    defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
    defineLazy(inst._zod, "pattern", () => {
      const pattern2 = def.innerType._zod.pattern;
      return pattern2 ? new RegExp(`^(${cleanRegex(pattern2.source)}|null)$`) : void 0;
    });
    defineLazy(inst._zod, "values", () => {
      return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, null]) : void 0;
    });
    inst._zod.parse = (payload, ctx) => {
      if (payload.value === null)
        return payload;
      return def.innerType._zod.run(payload, ctx);
    };
  });
  const $ZodDefault = /* @__PURE__ */ $constructor("$ZodDefault", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
      if (payload.value === void 0) {
        payload.value = def.defaultValue;
        return payload;
      }
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then((result2) => handleDefaultResult(result2, def));
      }
      return handleDefaultResult(result, def);
    };
  });
  function handleDefaultResult(payload, def) {
    if (payload.value === void 0) {
      payload.value = def.defaultValue;
    }
    return payload;
  }
  const $ZodPrefault = /* @__PURE__ */ $constructor("$ZodPrefault", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
      if (payload.value === void 0) {
        payload.value = def.defaultValue;
      }
      return def.innerType._zod.run(payload, ctx);
    };
  });
  const $ZodNonOptional = /* @__PURE__ */ $constructor("$ZodNonOptional", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "values", () => {
      const v = def.innerType._zod.values;
      return v ? new Set([...v].filter((x) => x !== void 0)) : void 0;
    });
    inst._zod.parse = (payload, ctx) => {
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then((result2) => handleNonOptionalResult(result2, inst));
      }
      return handleNonOptionalResult(result, inst);
    };
  });
  function handleNonOptionalResult(payload, inst) {
    if (!payload.issues.length && payload.value === void 0) {
      payload.issues.push({
        code: "invalid_type",
        expected: "nonoptional",
        input: payload.value,
        inst
      });
    }
    return payload;
  }
  const $ZodCatch = /* @__PURE__ */ $constructor("$ZodCatch", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then((result2) => {
          payload.value = result2.value;
          if (result2.issues.length) {
            payload.value = def.catchValue({
              ...payload,
              error: {
                issues: result2.issues.map((iss) => finalizeIssue(iss, ctx, config()))
              },
              input: payload.value
            });
            payload.issues = [];
          }
          return payload;
        });
      }
      payload.value = result.value;
      if (result.issues.length) {
        payload.value = def.catchValue({
          ...payload,
          error: {
            issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config()))
          },
          input: payload.value
        });
        payload.issues = [];
      }
      return payload;
    };
  });
  const $ZodPipe = /* @__PURE__ */ $constructor("$ZodPipe", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "values", () => def.in._zod.values);
    defineLazy(inst._zod, "optin", () => def.in._zod.optin);
    defineLazy(inst._zod, "optout", () => def.out._zod.optout);
    inst._zod.parse = (payload, ctx) => {
      const left = def.in._zod.run(payload, ctx);
      if (left instanceof Promise) {
        return left.then((left2) => handlePipeResult(left2, def, ctx));
      }
      return handlePipeResult(left, def, ctx);
    };
  });
  function handlePipeResult(left, def, ctx) {
    if (aborted(left)) {
      return left;
    }
    return def.out._zod.run({ value: left.value, issues: left.issues }, ctx);
  }
  const $ZodReadonly = /* @__PURE__ */ $constructor("$ZodReadonly", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
    defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
    inst._zod.parse = (payload, ctx) => {
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then(handleReadonlyResult);
      }
      return handleReadonlyResult(result);
    };
  });
  function handleReadonlyResult(payload) {
    payload.value = Object.freeze(payload.value);
    return payload;
  }
  const $ZodCustom = /* @__PURE__ */ $constructor("$ZodCustom", (inst, def) => {
    $ZodCheck.init(inst, def);
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _) => {
      return payload;
    };
    inst._zod.check = (payload) => {
      const input = payload.value;
      const r = def.fn(input);
      if (r instanceof Promise) {
        return r.then((r2) => handleRefineResult(r2, payload, input, inst));
      }
      handleRefineResult(r, payload, input, inst);
      return;
    };
  });
  function handleRefineResult(result, payload, input, inst) {
    if (!result) {
      const _iss = {
        code: "custom",
        input,
        inst,
        // incorporates params.error into issue reporting
        path: [...inst._zod.def.path ?? []],
        // incorporates params.error into issue reporting
        continue: !inst._zod.def.abort
        // params: inst._zod.def.params,
      };
      if (inst._zod.def.params)
        _iss.params = inst._zod.def.params;
      payload.issues.push(issue(_iss));
    }
  }
  class $ZodRegistry {
    constructor() {
      this._map = /* @__PURE__ */ new Map();
      this._idmap = /* @__PURE__ */ new Map();
    }
    add(schema, ..._meta) {
      const meta = _meta[0];
      this._map.set(schema, meta);
      if (meta && typeof meta === "object" && "id" in meta) {
        if (this._idmap.has(meta.id)) {
          throw new Error(`ID ${meta.id} already exists in the registry`);
        }
        this._idmap.set(meta.id, schema);
      }
      return this;
    }
    clear() {
      this._map = /* @__PURE__ */ new Map();
      this._idmap = /* @__PURE__ */ new Map();
      return this;
    }
    remove(schema) {
      const meta = this._map.get(schema);
      if (meta && typeof meta === "object" && "id" in meta) {
        this._idmap.delete(meta.id);
      }
      this._map.delete(schema);
      return this;
    }
    get(schema) {
      const p = schema._zod.parent;
      if (p) {
        const pm = { ...this.get(p) ?? {} };
        delete pm.id;
        return { ...pm, ...this._map.get(schema) };
      }
      return this._map.get(schema);
    }
    has(schema) {
      return this._map.has(schema);
    }
  }
  function registry() {
    return new $ZodRegistry();
  }
  const globalRegistry = /* @__PURE__ */ registry();
  function _string(Class, params) {
    return new Class({
      type: "string",
      ...normalizeParams(params)
    });
  }
  function _email(Class, params) {
    return new Class({
      type: "string",
      format: "email",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _guid(Class, params) {
    return new Class({
      type: "string",
      format: "guid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _uuid(Class, params) {
    return new Class({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _uuidv4(Class, params) {
    return new Class({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: false,
      version: "v4",
      ...normalizeParams(params)
    });
  }
  function _uuidv6(Class, params) {
    return new Class({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: false,
      version: "v6",
      ...normalizeParams(params)
    });
  }
  function _uuidv7(Class, params) {
    return new Class({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: false,
      version: "v7",
      ...normalizeParams(params)
    });
  }
  function _url$1(Class, params) {
    return new Class({
      type: "string",
      format: "url",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _emoji(Class, params) {
    return new Class({
      type: "string",
      format: "emoji",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _nanoid(Class, params) {
    return new Class({
      type: "string",
      format: "nanoid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _cuid(Class, params) {
    return new Class({
      type: "string",
      format: "cuid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _cuid2(Class, params) {
    return new Class({
      type: "string",
      format: "cuid2",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _ulid(Class, params) {
    return new Class({
      type: "string",
      format: "ulid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _xid(Class, params) {
    return new Class({
      type: "string",
      format: "xid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _ksuid(Class, params) {
    return new Class({
      type: "string",
      format: "ksuid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _ipv4(Class, params) {
    return new Class({
      type: "string",
      format: "ipv4",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _ipv6(Class, params) {
    return new Class({
      type: "string",
      format: "ipv6",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _cidrv4(Class, params) {
    return new Class({
      type: "string",
      format: "cidrv4",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _cidrv6(Class, params) {
    return new Class({
      type: "string",
      format: "cidrv6",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _base64(Class, params) {
    return new Class({
      type: "string",
      format: "base64",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _base64url(Class, params) {
    return new Class({
      type: "string",
      format: "base64url",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _e164(Class, params) {
    return new Class({
      type: "string",
      format: "e164",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _jwt(Class, params) {
    return new Class({
      type: "string",
      format: "jwt",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _isoDateTime(Class, params) {
    return new Class({
      type: "string",
      format: "datetime",
      check: "string_format",
      offset: false,
      local: false,
      precision: null,
      ...normalizeParams(params)
    });
  }
  function _isoDate(Class, params) {
    return new Class({
      type: "string",
      format: "date",
      check: "string_format",
      ...normalizeParams(params)
    });
  }
  function _isoTime(Class, params) {
    return new Class({
      type: "string",
      format: "time",
      check: "string_format",
      precision: null,
      ...normalizeParams(params)
    });
  }
  function _isoDuration(Class, params) {
    return new Class({
      type: "string",
      format: "duration",
      check: "string_format",
      ...normalizeParams(params)
    });
  }
  function _number(Class, params) {
    return new Class({
      type: "number",
      checks: [],
      ...normalizeParams(params)
    });
  }
  function _coercedNumber(Class, params) {
    return new Class({
      type: "number",
      coerce: true,
      checks: [],
      ...normalizeParams(params)
    });
  }
  function _int(Class, params) {
    return new Class({
      type: "number",
      check: "number_format",
      abort: false,
      format: "safeint",
      ...normalizeParams(params)
    });
  }
  function _boolean(Class, params) {
    return new Class({
      type: "boolean",
      ...normalizeParams(params)
    });
  }
  function _null$1(Class, params) {
    return new Class({
      type: "null",
      ...normalizeParams(params)
    });
  }
  function _any(Class) {
    return new Class({
      type: "any"
    });
  }
  function _unknown(Class) {
    return new Class({
      type: "unknown"
    });
  }
  function _never(Class, params) {
    return new Class({
      type: "never",
      ...normalizeParams(params)
    });
  }
  function _lt(value, params) {
    return new $ZodCheckLessThan({
      check: "less_than",
      ...normalizeParams(params),
      value,
      inclusive: false
    });
  }
  function _lte(value, params) {
    return new $ZodCheckLessThan({
      check: "less_than",
      ...normalizeParams(params),
      value,
      inclusive: true
    });
  }
  function _gt(value, params) {
    return new $ZodCheckGreaterThan({
      check: "greater_than",
      ...normalizeParams(params),
      value,
      inclusive: false
    });
  }
  function _gte(value, params) {
    return new $ZodCheckGreaterThan({
      check: "greater_than",
      ...normalizeParams(params),
      value,
      inclusive: true
    });
  }
  function _multipleOf(value, params) {
    return new $ZodCheckMultipleOf({
      check: "multiple_of",
      ...normalizeParams(params),
      value
    });
  }
  function _maxLength(maximum, params) {
    const ch = new $ZodCheckMaxLength({
      check: "max_length",
      ...normalizeParams(params),
      maximum
    });
    return ch;
  }
  function _minLength(minimum, params) {
    return new $ZodCheckMinLength({
      check: "min_length",
      ...normalizeParams(params),
      minimum
    });
  }
  function _length(length, params) {
    return new $ZodCheckLengthEquals({
      check: "length_equals",
      ...normalizeParams(params),
      length
    });
  }
  function _regex(pattern2, params) {
    return new $ZodCheckRegex({
      check: "string_format",
      format: "regex",
      ...normalizeParams(params),
      pattern: pattern2
    });
  }
  function _lowercase(params) {
    return new $ZodCheckLowerCase({
      check: "string_format",
      format: "lowercase",
      ...normalizeParams(params)
    });
  }
  function _uppercase(params) {
    return new $ZodCheckUpperCase({
      check: "string_format",
      format: "uppercase",
      ...normalizeParams(params)
    });
  }
  function _includes(includes, params) {
    return new $ZodCheckIncludes({
      check: "string_format",
      format: "includes",
      ...normalizeParams(params),
      includes
    });
  }
  function _startsWith(prefix, params) {
    return new $ZodCheckStartsWith({
      check: "string_format",
      format: "starts_with",
      ...normalizeParams(params),
      prefix
    });
  }
  function _endsWith(suffix, params) {
    return new $ZodCheckEndsWith({
      check: "string_format",
      format: "ends_with",
      ...normalizeParams(params),
      suffix
    });
  }
  function _overwrite(tx) {
    return new $ZodCheckOverwrite({
      check: "overwrite",
      tx
    });
  }
  function _normalize(form) {
    return _overwrite((input) => input.normalize(form));
  }
  function _trim() {
    return _overwrite((input) => input.trim());
  }
  function _toLowerCase() {
    return _overwrite((input) => input.toLowerCase());
  }
  function _toUpperCase() {
    return _overwrite((input) => input.toUpperCase());
  }
  function _array(Class, element, params) {
    return new Class({
      type: "array",
      element,
      // get element() {
      //   return element;
      // },
      ...normalizeParams(params)
    });
  }
  function _custom(Class, fn, _params) {
    const norm = normalizeParams(_params);
    norm.abort ?? (norm.abort = true);
    const schema = new Class({
      type: "custom",
      check: "custom",
      fn,
      ...norm
    });
    return schema;
  }
  function _refine(Class, fn, _params) {
    const schema = new Class({
      type: "custom",
      check: "custom",
      fn,
      ...normalizeParams(_params)
    });
    return schema;
  }
  class JSONSchemaGenerator {
    constructor(params) {
      this.counter = 0;
      this.metadataRegistry = params?.metadata ?? globalRegistry;
      this.target = params?.target ?? "draft-2020-12";
      this.unrepresentable = params?.unrepresentable ?? "throw";
      this.override = params?.override ?? (() => {
      });
      this.io = params?.io ?? "output";
      this.seen = /* @__PURE__ */ new Map();
    }
    process(schema, _params = { path: [], schemaPath: [] }) {
      var _a;
      const def = schema._zod.def;
      const formatMap = {
        guid: "uuid",
        url: "uri",
        datetime: "date-time",
        json_string: "json-string",
        regex: ""
        // do not set
      };
      const seen = this.seen.get(schema);
      if (seen) {
        seen.count++;
        const isCycle = _params.schemaPath.includes(schema);
        if (isCycle) {
          seen.cycle = _params.path;
        }
        return seen.schema;
      }
      const result = { schema: {}, count: 1, cycle: void 0, path: _params.path };
      this.seen.set(schema, result);
      const overrideSchema = schema._zod.toJSONSchema?.();
      if (overrideSchema) {
        result.schema = overrideSchema;
      } else {
        const params = {
          ..._params,
          schemaPath: [..._params.schemaPath, schema],
          path: _params.path
        };
        const parent = schema._zod.parent;
        if (parent) {
          result.ref = parent;
          this.process(parent, params);
          this.seen.get(parent).isParent = true;
        } else {
          const _json = result.schema;
          switch (def.type) {
            case "string": {
              const json = _json;
              json.type = "string";
              const { minimum, maximum, format: format2, patterns, contentEncoding } = schema._zod.bag;
              if (typeof minimum === "number")
                json.minLength = minimum;
              if (typeof maximum === "number")
                json.maxLength = maximum;
              if (format2) {
                json.format = formatMap[format2] ?? format2;
                if (json.format === "")
                  delete json.format;
              }
              if (contentEncoding)
                json.contentEncoding = contentEncoding;
              if (patterns && patterns.size > 0) {
                const regexes = [...patterns];
                if (regexes.length === 1)
                  json.pattern = regexes[0].source;
                else if (regexes.length > 1) {
                  result.schema.allOf = [
                    ...regexes.map((regex) => ({
                      ...this.target === "draft-7" ? { type: "string" } : {},
                      pattern: regex.source
                    }))
                  ];
                }
              }
              break;
            }
            case "number": {
              const json = _json;
              const { minimum, maximum, format: format2, multipleOf: multipleOf2, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
              if (typeof format2 === "string" && format2.includes("int"))
                json.type = "integer";
              else
                json.type = "number";
              if (typeof exclusiveMinimum === "number")
                json.exclusiveMinimum = exclusiveMinimum;
              if (typeof minimum === "number") {
                json.minimum = minimum;
                if (typeof exclusiveMinimum === "number") {
                  if (exclusiveMinimum >= minimum)
                    delete json.minimum;
                  else
                    delete json.exclusiveMinimum;
                }
              }
              if (typeof exclusiveMaximum === "number")
                json.exclusiveMaximum = exclusiveMaximum;
              if (typeof maximum === "number") {
                json.maximum = maximum;
                if (typeof exclusiveMaximum === "number") {
                  if (exclusiveMaximum <= maximum)
                    delete json.maximum;
                  else
                    delete json.exclusiveMaximum;
                }
              }
              if (typeof multipleOf2 === "number")
                json.multipleOf = multipleOf2;
              break;
            }
            case "boolean": {
              const json = _json;
              json.type = "boolean";
              break;
            }
            case "bigint": {
              if (this.unrepresentable === "throw") {
                throw new Error("BigInt cannot be represented in JSON Schema");
              }
              break;
            }
            case "symbol": {
              if (this.unrepresentable === "throw") {
                throw new Error("Symbols cannot be represented in JSON Schema");
              }
              break;
            }
            case "null": {
              _json.type = "null";
              break;
            }
            case "any": {
              break;
            }
            case "unknown": {
              break;
            }
            case "undefined": {
              if (this.unrepresentable === "throw") {
                throw new Error("Undefined cannot be represented in JSON Schema");
              }
              break;
            }
            case "void": {
              if (this.unrepresentable === "throw") {
                throw new Error("Void cannot be represented in JSON Schema");
              }
              break;
            }
            case "never": {
              _json.not = {};
              break;
            }
            case "date": {
              if (this.unrepresentable === "throw") {
                throw new Error("Date cannot be represented in JSON Schema");
              }
              break;
            }
            case "array": {
              const json = _json;
              const { minimum, maximum } = schema._zod.bag;
              if (typeof minimum === "number")
                json.minItems = minimum;
              if (typeof maximum === "number")
                json.maxItems = maximum;
              json.type = "array";
              json.items = this.process(def.element, { ...params, path: [...params.path, "items"] });
              break;
            }
            case "object": {
              const json = _json;
              json.type = "object";
              json.properties = {};
              const shape = def.shape;
              for (const key in shape) {
                json.properties[key] = this.process(shape[key], {
                  ...params,
                  path: [...params.path, "properties", key]
                });
              }
              const allKeys = new Set(Object.keys(shape));
              const requiredKeys = new Set([...allKeys].filter((key) => {
                const v = def.shape[key]._zod;
                if (this.io === "input") {
                  return v.optin === void 0;
                } else {
                  return v.optout === void 0;
                }
              }));
              if (requiredKeys.size > 0) {
                json.required = Array.from(requiredKeys);
              }
              if (def.catchall?._zod.def.type === "never") {
                json.additionalProperties = false;
              } else if (!def.catchall) {
                if (this.io === "output")
                  json.additionalProperties = false;
              } else if (def.catchall) {
                json.additionalProperties = this.process(def.catchall, {
                  ...params,
                  path: [...params.path, "additionalProperties"]
                });
              }
              break;
            }
            case "union": {
              const json = _json;
              json.anyOf = def.options.map((x, i) => this.process(x, {
                ...params,
                path: [...params.path, "anyOf", i]
              }));
              break;
            }
            case "intersection": {
              const json = _json;
              const a = this.process(def.left, {
                ...params,
                path: [...params.path, "allOf", 0]
              });
              const b = this.process(def.right, {
                ...params,
                path: [...params.path, "allOf", 1]
              });
              const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
              const allOf2 = [
                ...isSimpleIntersection(a) ? a.allOf : [a],
                ...isSimpleIntersection(b) ? b.allOf : [b]
              ];
              json.allOf = allOf2;
              break;
            }
            case "tuple": {
              const json = _json;
              json.type = "array";
              const prefixItems2 = def.items.map((x, i) => this.process(x, { ...params, path: [...params.path, "prefixItems", i] }));
              if (this.target === "draft-2020-12") {
                json.prefixItems = prefixItems2;
              } else {
                json.items = prefixItems2;
              }
              if (def.rest) {
                const rest = this.process(def.rest, {
                  ...params,
                  path: [...params.path, "items"]
                });
                if (this.target === "draft-2020-12") {
                  json.items = rest;
                } else {
                  json.additionalItems = rest;
                }
              }
              if (def.rest) {
                json.items = this.process(def.rest, {
                  ...params,
                  path: [...params.path, "items"]
                });
              }
              const { minimum, maximum } = schema._zod.bag;
              if (typeof minimum === "number")
                json.minItems = minimum;
              if (typeof maximum === "number")
                json.maxItems = maximum;
              break;
            }
            case "record": {
              const json = _json;
              json.type = "object";
              json.propertyNames = this.process(def.keyType, { ...params, path: [...params.path, "propertyNames"] });
              json.additionalProperties = this.process(def.valueType, {
                ...params,
                path: [...params.path, "additionalProperties"]
              });
              break;
            }
            case "map": {
              if (this.unrepresentable === "throw") {
                throw new Error("Map cannot be represented in JSON Schema");
              }
              break;
            }
            case "set": {
              if (this.unrepresentable === "throw") {
                throw new Error("Set cannot be represented in JSON Schema");
              }
              break;
            }
            case "enum": {
              const json = _json;
              const values = getEnumValues(def.entries);
              if (values.every((v) => typeof v === "number"))
                json.type = "number";
              if (values.every((v) => typeof v === "string"))
                json.type = "string";
              json.enum = values;
              break;
            }
            case "literal": {
              const json = _json;
              const vals = [];
              for (const val of def.values) {
                if (val === void 0) {
                  if (this.unrepresentable === "throw") {
                    throw new Error("Literal `undefined` cannot be represented in JSON Schema");
                  }
                } else if (typeof val === "bigint") {
                  if (this.unrepresentable === "throw") {
                    throw new Error("BigInt literals cannot be represented in JSON Schema");
                  } else {
                    vals.push(Number(val));
                  }
                } else {
                  vals.push(val);
                }
              }
              if (vals.length === 0) ;
              else if (vals.length === 1) {
                const val = vals[0];
                json.type = val === null ? "null" : typeof val;
                json.const = val;
              } else {
                if (vals.every((v) => typeof v === "number"))
                  json.type = "number";
                if (vals.every((v) => typeof v === "string"))
                  json.type = "string";
                if (vals.every((v) => typeof v === "boolean"))
                  json.type = "string";
                if (vals.every((v) => v === null))
                  json.type = "null";
                json.enum = vals;
              }
              break;
            }
            case "file": {
              const json = _json;
              const file = {
                type: "string",
                format: "binary",
                contentEncoding: "binary"
              };
              const { minimum, maximum, mime } = schema._zod.bag;
              if (minimum !== void 0)
                file.minLength = minimum;
              if (maximum !== void 0)
                file.maxLength = maximum;
              if (mime) {
                if (mime.length === 1) {
                  file.contentMediaType = mime[0];
                  Object.assign(json, file);
                } else {
                  json.anyOf = mime.map((m) => {
                    const mFile = { ...file, contentMediaType: m };
                    return mFile;
                  });
                }
              } else {
                Object.assign(json, file);
              }
              break;
            }
            case "transform": {
              if (this.unrepresentable === "throw") {
                throw new Error("Transforms cannot be represented in JSON Schema");
              }
              break;
            }
            case "nullable": {
              const inner = this.process(def.innerType, params);
              _json.anyOf = [inner, { type: "null" }];
              break;
            }
            case "nonoptional": {
              this.process(def.innerType, params);
              result.ref = def.innerType;
              break;
            }
            case "success": {
              const json = _json;
              json.type = "boolean";
              break;
            }
            case "default": {
              this.process(def.innerType, params);
              result.ref = def.innerType;
              _json.default = JSON.parse(JSON.stringify(def.defaultValue));
              break;
            }
            case "prefault": {
              this.process(def.innerType, params);
              result.ref = def.innerType;
              if (this.io === "input")
                _json._prefault = JSON.parse(JSON.stringify(def.defaultValue));
              break;
            }
            case "catch": {
              this.process(def.innerType, params);
              result.ref = def.innerType;
              let catchValue;
              try {
                catchValue = def.catchValue(void 0);
              } catch {
                throw new Error("Dynamic catch values are not supported in JSON Schema");
              }
              _json.default = catchValue;
              break;
            }
            case "nan": {
              if (this.unrepresentable === "throw") {
                throw new Error("NaN cannot be represented in JSON Schema");
              }
              break;
            }
            case "template_literal": {
              const json = _json;
              const pattern2 = schema._zod.pattern;
              if (!pattern2)
                throw new Error("Pattern not found in template literal");
              json.type = "string";
              json.pattern = pattern2.source;
              break;
            }
            case "pipe": {
              const innerType = this.io === "input" ? def.in._zod.def.type === "transform" ? def.out : def.in : def.out;
              this.process(innerType, params);
              result.ref = innerType;
              break;
            }
            case "readonly": {
              this.process(def.innerType, params);
              result.ref = def.innerType;
              _json.readOnly = true;
              break;
            }
            // passthrough types
            case "promise": {
              this.process(def.innerType, params);
              result.ref = def.innerType;
              break;
            }
            case "optional": {
              this.process(def.innerType, params);
              result.ref = def.innerType;
              break;
            }
            case "lazy": {
              const innerType = schema._zod.innerType;
              this.process(innerType, params);
              result.ref = innerType;
              break;
            }
            case "custom": {
              if (this.unrepresentable === "throw") {
                throw new Error("Custom types cannot be represented in JSON Schema");
              }
              break;
            }
          }
        }
      }
      const meta = this.metadataRegistry.get(schema);
      if (meta)
        Object.assign(result.schema, meta);
      if (this.io === "input" && isTransforming(schema)) {
        delete result.schema.examples;
        delete result.schema.default;
      }
      if (this.io === "input" && result.schema._prefault)
        (_a = result.schema).default ?? (_a.default = result.schema._prefault);
      delete result.schema._prefault;
      const _result = this.seen.get(schema);
      return _result.schema;
    }
    emit(schema, _params) {
      const params = {
        cycles: _params?.cycles ?? "ref",
        reused: _params?.reused ?? "inline",
        // unrepresentable: _params?.unrepresentable ?? "throw",
        // uri: _params?.uri ?? ((id) => `${id}`),
        external: _params?.external ?? void 0
      };
      const root = this.seen.get(schema);
      if (!root)
        throw new Error("Unprocessed schema. This is a bug in Zod.");
      const makeURI = (entry) => {
        const defsSegment = this.target === "draft-2020-12" ? "$defs" : "definitions";
        if (params.external) {
          const externalId = params.external.registry.get(entry[0])?.id;
          const uriGenerator = params.external.uri ?? ((id3) => id3);
          if (externalId) {
            return { ref: uriGenerator(externalId) };
          }
          const id2 = entry[1].defId ?? entry[1].schema.id ?? `schema${this.counter++}`;
          entry[1].defId = id2;
          return { defId: id2, ref: `${uriGenerator("__shared")}#/${defsSegment}/${id2}` };
        }
        if (entry[1] === root) {
          return { ref: "#" };
        }
        const uriPrefix = `#`;
        const defUriPrefix = `${uriPrefix}/${defsSegment}/`;
        const defId = entry[1].schema.id ?? `__schema${this.counter++}`;
        return { defId, ref: defUriPrefix + defId };
      };
      const extractToDef = (entry) => {
        if (entry[1].schema.$ref) {
          return;
        }
        const seen = entry[1];
        const { ref: ref2, defId } = makeURI(entry);
        seen.def = { ...seen.schema };
        if (defId)
          seen.defId = defId;
        const schema2 = seen.schema;
        for (const key in schema2) {
          delete schema2[key];
        }
        schema2.$ref = ref2;
      };
      if (params.cycles === "throw") {
        for (const entry of this.seen.entries()) {
          const seen = entry[1];
          if (seen.cycle) {
            throw new Error(`Cycle detected: #/${seen.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
          }
        }
      }
      for (const entry of this.seen.entries()) {
        const seen = entry[1];
        if (schema === entry[0]) {
          extractToDef(entry);
          continue;
        }
        if (params.external) {
          const ext = params.external.registry.get(entry[0])?.id;
          if (schema !== entry[0] && ext) {
            extractToDef(entry);
            continue;
          }
        }
        const id2 = this.metadataRegistry.get(entry[0])?.id;
        if (id2) {
          extractToDef(entry);
          continue;
        }
        if (seen.cycle) {
          extractToDef(entry);
          continue;
        }
        if (seen.count > 1) {
          if (params.reused === "ref") {
            extractToDef(entry);
            continue;
          }
        }
      }
      const flattenRef = (zodSchema, params2) => {
        const seen = this.seen.get(zodSchema);
        const schema2 = seen.def ?? seen.schema;
        const _cached = { ...schema2 };
        if (seen.ref === null) {
          return;
        }
        const ref2 = seen.ref;
        seen.ref = null;
        if (ref2) {
          flattenRef(ref2, params2);
          const refSchema = this.seen.get(ref2).schema;
          if (refSchema.$ref && params2.target === "draft-7") {
            schema2.allOf = schema2.allOf ?? [];
            schema2.allOf.push(refSchema);
          } else {
            Object.assign(schema2, refSchema);
            Object.assign(schema2, _cached);
          }
        }
        if (!seen.isParent)
          this.override({
            zodSchema,
            jsonSchema: schema2,
            path: seen.path ?? []
          });
      };
      for (const entry of [...this.seen.entries()].reverse()) {
        flattenRef(entry[0], { target: this.target });
      }
      const result = {};
      if (this.target === "draft-2020-12") {
        result.$schema = "https://json-schema.org/draft/2020-12/schema";
      } else if (this.target === "draft-7") {
        result.$schema = "http://json-schema.org/draft-07/schema#";
      } else {
        console.warn(`Invalid target: ${this.target}`);
      }
      if (params.external?.uri) {
        const id2 = params.external.registry.get(schema)?.id;
        if (!id2)
          throw new Error("Schema is missing an `id` property");
        result.$id = params.external.uri(id2);
      }
      Object.assign(result, root.def);
      const defs = params.external?.defs ?? {};
      for (const entry of this.seen.entries()) {
        const seen = entry[1];
        if (seen.def && seen.defId) {
          defs[seen.defId] = seen.def;
        }
      }
      if (params.external) ;
      else {
        if (Object.keys(defs).length > 0) {
          if (this.target === "draft-2020-12") {
            result.$defs = defs;
          } else {
            result.definitions = defs;
          }
        }
      }
      try {
        return JSON.parse(JSON.stringify(result));
      } catch (_err) {
        throw new Error("Error converting schema to JSON.");
      }
    }
  }
  function toJSONSchema(input, _params) {
    if (input instanceof $ZodRegistry) {
      const gen2 = new JSONSchemaGenerator(_params);
      const defs = {};
      for (const entry of input._idmap.entries()) {
        const [_, schema] = entry;
        gen2.process(schema);
      }
      const schemas = {};
      const external = {
        registry: input,
        uri: _params?.uri,
        defs
      };
      for (const entry of input._idmap.entries()) {
        const [key, schema] = entry;
        schemas[key] = gen2.emit(schema, {
          ..._params,
          external
        });
      }
      if (Object.keys(defs).length > 0) {
        const defsSegment = gen2.target === "draft-2020-12" ? "$defs" : "definitions";
        schemas.__shared = {
          [defsSegment]: defs
        };
      }
      return { schemas };
    }
    const gen = new JSONSchemaGenerator(_params);
    gen.process(input);
    return gen.emit(input, _params);
  }
  function isTransforming(_schema, _ctx) {
    const ctx = _ctx ?? { seen: /* @__PURE__ */ new Set() };
    if (ctx.seen.has(_schema))
      return false;
    ctx.seen.add(_schema);
    const schema = _schema;
    const def = schema._zod.def;
    switch (def.type) {
      case "string":
      case "number":
      case "bigint":
      case "boolean":
      case "date":
      case "symbol":
      case "undefined":
      case "null":
      case "any":
      case "unknown":
      case "never":
      case "void":
      case "literal":
      case "enum":
      case "nan":
      case "file":
      case "template_literal":
        return false;
      case "array": {
        return isTransforming(def.element, ctx);
      }
      case "object": {
        for (const key in def.shape) {
          if (isTransforming(def.shape[key], ctx))
            return true;
        }
        return false;
      }
      case "union": {
        for (const option of def.options) {
          if (isTransforming(option, ctx))
            return true;
        }
        return false;
      }
      case "intersection": {
        return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
      }
      case "tuple": {
        for (const item of def.items) {
          if (isTransforming(item, ctx))
            return true;
        }
        if (def.rest && isTransforming(def.rest, ctx))
          return true;
        return false;
      }
      case "record": {
        return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
      }
      case "map": {
        return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
      }
      case "set": {
        return isTransforming(def.valueType, ctx);
      }
      // inner types
      case "promise":
      case "optional":
      case "nonoptional":
      case "nullable":
      case "readonly":
        return isTransforming(def.innerType, ctx);
      case "lazy":
        return isTransforming(def.getter(), ctx);
      case "default": {
        return isTransforming(def.innerType, ctx);
      }
      case "prefault": {
        return isTransforming(def.innerType, ctx);
      }
      case "custom": {
        return false;
      }
      case "transform": {
        return true;
      }
      case "pipe": {
        return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
      }
      case "success": {
        return false;
      }
      case "catch": {
        return false;
      }
    }
    throw new Error(`Unknown schema type: ${def.type}`);
  }
  const ZodISODateTime = /* @__PURE__ */ $constructor("ZodISODateTime", (inst, def) => {
    $ZodISODateTime.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function datetime(params) {
    return _isoDateTime(ZodISODateTime, params);
  }
  const ZodISODate = /* @__PURE__ */ $constructor("ZodISODate", (inst, def) => {
    $ZodISODate.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function date(params) {
    return _isoDate(ZodISODate, params);
  }
  const ZodISOTime = /* @__PURE__ */ $constructor("ZodISOTime", (inst, def) => {
    $ZodISOTime.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function time(params) {
    return _isoTime(ZodISOTime, params);
  }
  const ZodISODuration = /* @__PURE__ */ $constructor("ZodISODuration", (inst, def) => {
    $ZodISODuration.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function duration(params) {
    return _isoDuration(ZodISODuration, params);
  }
  const initializer = (inst, issues) => {
    $ZodError.init(inst, issues);
    inst.name = "ZodError";
    Object.defineProperties(inst, {
      format: {
        value: (mapper) => formatError(inst, mapper)
        // enumerable: false,
      },
      flatten: {
        value: (mapper) => flattenError$1(inst, mapper)
        // enumerable: false,
      },
      addIssue: {
        value: (issue2) => inst.issues.push(issue2)
        // enumerable: false,
      },
      addIssues: {
        value: (issues2) => inst.issues.push(...issues2)
        // enumerable: false,
      },
      isEmpty: {
        get() {
          return inst.issues.length === 0;
        }
        // enumerable: false,
      }
    });
  };
  const ZodRealError = $constructor("ZodError", initializer, {
    Parent: Error
  });
  const parse = /* @__PURE__ */ _parse(ZodRealError);
  const parseAsync = /* @__PURE__ */ _parseAsync(ZodRealError);
  const safeParse$1 = /* @__PURE__ */ _safeParse(ZodRealError);
  const safeParseAsync$1 = /* @__PURE__ */ _safeParseAsync(ZodRealError);
  const ZodType$1 = /* @__PURE__ */ $constructor("ZodType", (inst, def) => {
    $ZodType.init(inst, def);
    inst.def = def;
    Object.defineProperty(inst, "_def", { value: def });
    inst.check = (...checks) => {
      return inst.clone(
        {
          ...def,
          checks: [
            ...def.checks ?? [],
            ...checks.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch)
          ]
        }
        // { parent: true }
      );
    };
    inst.clone = (def2, params) => clone(inst, def2, params);
    inst.brand = () => inst;
    inst.register = (reg, meta) => {
      reg.add(inst, meta);
      return inst;
    };
    inst.parse = (data, params) => parse(inst, data, params, { callee: inst.parse });
    inst.safeParse = (data, params) => safeParse$1(inst, data, params);
    inst.parseAsync = async (data, params) => parseAsync(inst, data, params, { callee: inst.parseAsync });
    inst.safeParseAsync = async (data, params) => safeParseAsync$1(inst, data, params);
    inst.spa = inst.safeParseAsync;
    inst.refine = (check2, params) => inst.check(refine(check2, params));
    inst.superRefine = (refinement) => inst.check(superRefine(refinement));
    inst.overwrite = (fn) => inst.check(_overwrite(fn));
    inst.optional = () => optional(inst);
    inst.nullable = () => nullable(inst);
    inst.nullish = () => optional(nullable(inst));
    inst.nonoptional = (params) => nonoptional(inst, params);
    inst.array = () => array(inst);
    inst.or = (arg) => union([inst, arg]);
    inst.and = (arg) => intersection(inst, arg);
    inst.transform = (tx) => pipe(inst, transform(tx));
    inst.default = (def2) => _default(inst, def2);
    inst.prefault = (def2) => prefault(inst, def2);
    inst.catch = (params) => _catch(inst, params);
    inst.pipe = (target) => pipe(inst, target);
    inst.readonly = () => readonly(inst);
    inst.describe = (description2) => {
      const cl = inst.clone();
      globalRegistry.add(cl, { description: description2 });
      return cl;
    };
    Object.defineProperty(inst, "description", {
      get() {
        return globalRegistry.get(inst)?.description;
      },
      configurable: true
    });
    inst.meta = (...args) => {
      if (args.length === 0) {
        return globalRegistry.get(inst);
      }
      const cl = inst.clone();
      globalRegistry.add(cl, args[0]);
      return cl;
    };
    inst.isOptional = () => inst.safeParse(void 0).success;
    inst.isNullable = () => inst.safeParse(null).success;
    return inst;
  });
  const _ZodString = /* @__PURE__ */ $constructor("_ZodString", (inst, def) => {
    $ZodString.init(inst, def);
    ZodType$1.init(inst, def);
    const bag = inst._zod.bag;
    inst.format = bag.format ?? null;
    inst.minLength = bag.minimum ?? null;
    inst.maxLength = bag.maximum ?? null;
    inst.regex = (...args) => inst.check(_regex(...args));
    inst.includes = (...args) => inst.check(_includes(...args));
    inst.startsWith = (...args) => inst.check(_startsWith(...args));
    inst.endsWith = (...args) => inst.check(_endsWith(...args));
    inst.min = (...args) => inst.check(_minLength(...args));
    inst.max = (...args) => inst.check(_maxLength(...args));
    inst.length = (...args) => inst.check(_length(...args));
    inst.nonempty = (...args) => inst.check(_minLength(1, ...args));
    inst.lowercase = (params) => inst.check(_lowercase(params));
    inst.uppercase = (params) => inst.check(_uppercase(params));
    inst.trim = () => inst.check(_trim());
    inst.normalize = (...args) => inst.check(_normalize(...args));
    inst.toLowerCase = () => inst.check(_toLowerCase());
    inst.toUpperCase = () => inst.check(_toUpperCase());
  });
  const ZodString$1 = /* @__PURE__ */ $constructor("ZodString", (inst, def) => {
    $ZodString.init(inst, def);
    _ZodString.init(inst, def);
    inst.email = (params) => inst.check(_email(ZodEmail, params));
    inst.url = (params) => inst.check(_url$1(ZodURL, params));
    inst.jwt = (params) => inst.check(_jwt(ZodJWT, params));
    inst.emoji = (params) => inst.check(_emoji(ZodEmoji, params));
    inst.guid = (params) => inst.check(_guid(ZodGUID, params));
    inst.uuid = (params) => inst.check(_uuid(ZodUUID, params));
    inst.uuidv4 = (params) => inst.check(_uuidv4(ZodUUID, params));
    inst.uuidv6 = (params) => inst.check(_uuidv6(ZodUUID, params));
    inst.uuidv7 = (params) => inst.check(_uuidv7(ZodUUID, params));
    inst.nanoid = (params) => inst.check(_nanoid(ZodNanoID, params));
    inst.guid = (params) => inst.check(_guid(ZodGUID, params));
    inst.cuid = (params) => inst.check(_cuid(ZodCUID, params));
    inst.cuid2 = (params) => inst.check(_cuid2(ZodCUID2, params));
    inst.ulid = (params) => inst.check(_ulid(ZodULID, params));
    inst.base64 = (params) => inst.check(_base64(ZodBase64, params));
    inst.base64url = (params) => inst.check(_base64url(ZodBase64URL, params));
    inst.xid = (params) => inst.check(_xid(ZodXID, params));
    inst.ksuid = (params) => inst.check(_ksuid(ZodKSUID, params));
    inst.ipv4 = (params) => inst.check(_ipv4(ZodIPv4, params));
    inst.ipv6 = (params) => inst.check(_ipv6(ZodIPv6, params));
    inst.cidrv4 = (params) => inst.check(_cidrv4(ZodCIDRv4, params));
    inst.cidrv6 = (params) => inst.check(_cidrv6(ZodCIDRv6, params));
    inst.e164 = (params) => inst.check(_e164(ZodE164, params));
    inst.datetime = (params) => inst.check(datetime(params));
    inst.date = (params) => inst.check(date(params));
    inst.time = (params) => inst.check(time(params));
    inst.duration = (params) => inst.check(duration(params));
  });
  function string(params) {
    return _string(ZodString$1, params);
  }
  const ZodStringFormat = /* @__PURE__ */ $constructor("ZodStringFormat", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    _ZodString.init(inst, def);
  });
  const ZodEmail = /* @__PURE__ */ $constructor("ZodEmail", (inst, def) => {
    $ZodEmail.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodGUID = /* @__PURE__ */ $constructor("ZodGUID", (inst, def) => {
    $ZodGUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodUUID = /* @__PURE__ */ $constructor("ZodUUID", (inst, def) => {
    $ZodUUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodURL = /* @__PURE__ */ $constructor("ZodURL", (inst, def) => {
    $ZodURL.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function url(params) {
    return _url$1(ZodURL, params);
  }
  const ZodEmoji = /* @__PURE__ */ $constructor("ZodEmoji", (inst, def) => {
    $ZodEmoji.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodNanoID = /* @__PURE__ */ $constructor("ZodNanoID", (inst, def) => {
    $ZodNanoID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodCUID = /* @__PURE__ */ $constructor("ZodCUID", (inst, def) => {
    $ZodCUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodCUID2 = /* @__PURE__ */ $constructor("ZodCUID2", (inst, def) => {
    $ZodCUID2.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodULID = /* @__PURE__ */ $constructor("ZodULID", (inst, def) => {
    $ZodULID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodXID = /* @__PURE__ */ $constructor("ZodXID", (inst, def) => {
    $ZodXID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodKSUID = /* @__PURE__ */ $constructor("ZodKSUID", (inst, def) => {
    $ZodKSUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodIPv4 = /* @__PURE__ */ $constructor("ZodIPv4", (inst, def) => {
    $ZodIPv4.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodIPv6 = /* @__PURE__ */ $constructor("ZodIPv6", (inst, def) => {
    $ZodIPv6.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodCIDRv4 = /* @__PURE__ */ $constructor("ZodCIDRv4", (inst, def) => {
    $ZodCIDRv4.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodCIDRv6 = /* @__PURE__ */ $constructor("ZodCIDRv6", (inst, def) => {
    $ZodCIDRv6.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodBase64 = /* @__PURE__ */ $constructor("ZodBase64", (inst, def) => {
    $ZodBase64.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodBase64URL = /* @__PURE__ */ $constructor("ZodBase64URL", (inst, def) => {
    $ZodBase64URL.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodE164 = /* @__PURE__ */ $constructor("ZodE164", (inst, def) => {
    $ZodE164.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodJWT = /* @__PURE__ */ $constructor("ZodJWT", (inst, def) => {
    $ZodJWT.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  const ZodNumber$1 = /* @__PURE__ */ $constructor("ZodNumber", (inst, def) => {
    $ZodNumber.init(inst, def);
    ZodType$1.init(inst, def);
    inst.gt = (value, params) => inst.check(_gt(value, params));
    inst.gte = (value, params) => inst.check(_gte(value, params));
    inst.min = (value, params) => inst.check(_gte(value, params));
    inst.lt = (value, params) => inst.check(_lt(value, params));
    inst.lte = (value, params) => inst.check(_lte(value, params));
    inst.max = (value, params) => inst.check(_lte(value, params));
    inst.int = (params) => inst.check(int(params));
    inst.safe = (params) => inst.check(int(params));
    inst.positive = (params) => inst.check(_gt(0, params));
    inst.nonnegative = (params) => inst.check(_gte(0, params));
    inst.negative = (params) => inst.check(_lt(0, params));
    inst.nonpositive = (params) => inst.check(_lte(0, params));
    inst.multipleOf = (value, params) => inst.check(_multipleOf(value, params));
    inst.step = (value, params) => inst.check(_multipleOf(value, params));
    inst.finite = () => inst;
    const bag = inst._zod.bag;
    inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
    inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
    inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? 0.5);
    inst.isFinite = true;
    inst.format = bag.format ?? null;
  });
  function number$1(params) {
    return _number(ZodNumber$1, params);
  }
  const ZodNumberFormat = /* @__PURE__ */ $constructor("ZodNumberFormat", (inst, def) => {
    $ZodNumberFormat.init(inst, def);
    ZodNumber$1.init(inst, def);
  });
  function int(params) {
    return _int(ZodNumberFormat, params);
  }
  const ZodBoolean$1 = /* @__PURE__ */ $constructor("ZodBoolean", (inst, def) => {
    $ZodBoolean.init(inst, def);
    ZodType$1.init(inst, def);
  });
  function boolean(params) {
    return _boolean(ZodBoolean$1, params);
  }
  const ZodNull$1 = /* @__PURE__ */ $constructor("ZodNull", (inst, def) => {
    $ZodNull.init(inst, def);
    ZodType$1.init(inst, def);
  });
  function _null(params) {
    return _null$1(ZodNull$1, params);
  }
  const ZodAny$1 = /* @__PURE__ */ $constructor("ZodAny", (inst, def) => {
    $ZodAny.init(inst, def);
    ZodType$1.init(inst, def);
  });
  function any() {
    return _any(ZodAny$1);
  }
  const ZodUnknown$1 = /* @__PURE__ */ $constructor("ZodUnknown", (inst, def) => {
    $ZodUnknown.init(inst, def);
    ZodType$1.init(inst, def);
  });
  function unknown() {
    return _unknown(ZodUnknown$1);
  }
  const ZodNever$1 = /* @__PURE__ */ $constructor("ZodNever", (inst, def) => {
    $ZodNever.init(inst, def);
    ZodType$1.init(inst, def);
  });
  function never(params) {
    return _never(ZodNever$1, params);
  }
  const ZodArray$1 = /* @__PURE__ */ $constructor("ZodArray", (inst, def) => {
    $ZodArray.init(inst, def);
    ZodType$1.init(inst, def);
    inst.element = def.element;
    inst.min = (minLength, params) => inst.check(_minLength(minLength, params));
    inst.nonempty = (params) => inst.check(_minLength(1, params));
    inst.max = (maxLength, params) => inst.check(_maxLength(maxLength, params));
    inst.length = (len, params) => inst.check(_length(len, params));
    inst.unwrap = () => inst.element;
  });
  function array(element, params) {
    return _array(ZodArray$1, element, params);
  }
  const ZodObject$1 = /* @__PURE__ */ $constructor("ZodObject", (inst, def) => {
    $ZodObject.init(inst, def);
    ZodType$1.init(inst, def);
    defineLazy(inst, "shape", () => def.shape);
    inst.keyof = () => _enum(Object.keys(inst._zod.def.shape));
    inst.catchall = (catchall) => inst.clone({ ...inst._zod.def, catchall });
    inst.passthrough = () => inst.clone({ ...inst._zod.def, catchall: unknown() });
    inst.loose = () => inst.clone({ ...inst._zod.def, catchall: unknown() });
    inst.strict = () => inst.clone({ ...inst._zod.def, catchall: never() });
    inst.strip = () => inst.clone({ ...inst._zod.def, catchall: void 0 });
    inst.extend = (incoming) => {
      return extend(inst, incoming);
    };
    inst.merge = (other) => merge(inst, other);
    inst.pick = (mask) => pick(inst, mask);
    inst.omit = (mask) => omit(inst, mask);
    inst.partial = (...args) => partial(ZodOptional$1, inst, args[0]);
    inst.required = (...args) => required(ZodNonOptional, inst, args[0]);
  });
  function object$1(shape, params) {
    const def = {
      type: "object",
      get shape() {
        assignProp(this, "shape", { ...shape });
        return this.shape;
      },
      ...normalizeParams(params)
    };
    return new ZodObject$1(def);
  }
  function looseObject(shape, params) {
    return new ZodObject$1({
      type: "object",
      get shape() {
        assignProp(this, "shape", { ...shape });
        return this.shape;
      },
      catchall: unknown(),
      ...normalizeParams(params)
    });
  }
  const ZodUnion$1 = /* @__PURE__ */ $constructor("ZodUnion", (inst, def) => {
    $ZodUnion.init(inst, def);
    ZodType$1.init(inst, def);
    inst.options = def.options;
  });
  function union(options, params) {
    return new ZodUnion$1({
      type: "union",
      options,
      ...normalizeParams(params)
    });
  }
  const ZodDiscriminatedUnion$1 = /* @__PURE__ */ $constructor("ZodDiscriminatedUnion", (inst, def) => {
    ZodUnion$1.init(inst, def);
    $ZodDiscriminatedUnion.init(inst, def);
  });
  function discriminatedUnion(discriminator2, options, params) {
    return new ZodDiscriminatedUnion$1({
      type: "union",
      options,
      discriminator: discriminator2,
      ...normalizeParams(params)
    });
  }
  const ZodIntersection$1 = /* @__PURE__ */ $constructor("ZodIntersection", (inst, def) => {
    $ZodIntersection.init(inst, def);
    ZodType$1.init(inst, def);
  });
  function intersection(left, right) {
    return new ZodIntersection$1({
      type: "intersection",
      left,
      right
    });
  }
  const ZodRecord$1 = /* @__PURE__ */ $constructor("ZodRecord", (inst, def) => {
    $ZodRecord.init(inst, def);
    ZodType$1.init(inst, def);
    inst.keyType = def.keyType;
    inst.valueType = def.valueType;
  });
  function record(keyType, valueType, params) {
    return new ZodRecord$1({
      type: "record",
      keyType,
      valueType,
      ...normalizeParams(params)
    });
  }
  const ZodEnum$1 = /* @__PURE__ */ $constructor("ZodEnum", (inst, def) => {
    $ZodEnum.init(inst, def);
    ZodType$1.init(inst, def);
    inst.enum = def.entries;
    inst.options = Object.values(def.entries);
    const keys = new Set(Object.keys(def.entries));
    inst.extract = (values, params) => {
      const newEntries = {};
      for (const value of values) {
        if (keys.has(value)) {
          newEntries[value] = def.entries[value];
        } else
          throw new Error(`Key ${value} not found in enum`);
      }
      return new ZodEnum$1({
        ...def,
        checks: [],
        ...normalizeParams(params),
        entries: newEntries
      });
    };
    inst.exclude = (values, params) => {
      const newEntries = { ...def.entries };
      for (const value of values) {
        if (keys.has(value)) {
          delete newEntries[value];
        } else
          throw new Error(`Key ${value} not found in enum`);
      }
      return new ZodEnum$1({
        ...def,
        checks: [],
        ...normalizeParams(params),
        entries: newEntries
      });
    };
  });
  function _enum(values, params) {
    const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
    return new ZodEnum$1({
      type: "enum",
      entries,
      ...normalizeParams(params)
    });
  }
  const ZodLiteral$1 = /* @__PURE__ */ $constructor("ZodLiteral", (inst, def) => {
    $ZodLiteral.init(inst, def);
    ZodType$1.init(inst, def);
    inst.values = new Set(def.values);
    Object.defineProperty(inst, "value", {
      get() {
        if (def.values.length > 1) {
          throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
        }
        return def.values[0];
      }
    });
  });
  function literal(value, params) {
    return new ZodLiteral$1({
      type: "literal",
      values: Array.isArray(value) ? value : [value],
      ...normalizeParams(params)
    });
  }
  const ZodTransform = /* @__PURE__ */ $constructor("ZodTransform", (inst, def) => {
    $ZodTransform.init(inst, def);
    ZodType$1.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      payload.addIssue = (issue$1) => {
        if (typeof issue$1 === "string") {
          payload.issues.push(issue(issue$1, payload.value, def));
        } else {
          const _issue = issue$1;
          if (_issue.fatal)
            _issue.continue = false;
          _issue.code ?? (_issue.code = "custom");
          _issue.input ?? (_issue.input = payload.value);
          _issue.inst ?? (_issue.inst = inst);
          _issue.continue ?? (_issue.continue = true);
          payload.issues.push(issue(_issue));
        }
      };
      const output = def.transform(payload.value, payload);
      if (output instanceof Promise) {
        return output.then((output2) => {
          payload.value = output2;
          return payload;
        });
      }
      payload.value = output;
      return payload;
    };
  });
  function transform(fn) {
    return new ZodTransform({
      type: "transform",
      transform: fn
    });
  }
  const ZodOptional$1 = /* @__PURE__ */ $constructor("ZodOptional", (inst, def) => {
    $ZodOptional.init(inst, def);
    ZodType$1.init(inst, def);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function optional(innerType) {
    return new ZodOptional$1({
      type: "optional",
      innerType
    });
  }
  const ZodNullable$1 = /* @__PURE__ */ $constructor("ZodNullable", (inst, def) => {
    $ZodNullable.init(inst, def);
    ZodType$1.init(inst, def);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function nullable(innerType) {
    return new ZodNullable$1({
      type: "nullable",
      innerType
    });
  }
  const ZodDefault$1 = /* @__PURE__ */ $constructor("ZodDefault", (inst, def) => {
    $ZodDefault.init(inst, def);
    ZodType$1.init(inst, def);
    inst.unwrap = () => inst._zod.def.innerType;
    inst.removeDefault = inst.unwrap;
  });
  function _default(innerType, defaultValue) {
    return new ZodDefault$1({
      type: "default",
      innerType,
      get defaultValue() {
        return typeof defaultValue === "function" ? defaultValue() : defaultValue;
      }
    });
  }
  const ZodPrefault = /* @__PURE__ */ $constructor("ZodPrefault", (inst, def) => {
    $ZodPrefault.init(inst, def);
    ZodType$1.init(inst, def);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function prefault(innerType, defaultValue) {
    return new ZodPrefault({
      type: "prefault",
      innerType,
      get defaultValue() {
        return typeof defaultValue === "function" ? defaultValue() : defaultValue;
      }
    });
  }
  const ZodNonOptional = /* @__PURE__ */ $constructor("ZodNonOptional", (inst, def) => {
    $ZodNonOptional.init(inst, def);
    ZodType$1.init(inst, def);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function nonoptional(innerType, params) {
    return new ZodNonOptional({
      type: "nonoptional",
      innerType,
      ...normalizeParams(params)
    });
  }
  const ZodCatch$1 = /* @__PURE__ */ $constructor("ZodCatch", (inst, def) => {
    $ZodCatch.init(inst, def);
    ZodType$1.init(inst, def);
    inst.unwrap = () => inst._zod.def.innerType;
    inst.removeCatch = inst.unwrap;
  });
  function _catch(innerType, catchValue) {
    return new ZodCatch$1({
      type: "catch",
      innerType,
      catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
    });
  }
  const ZodPipe = /* @__PURE__ */ $constructor("ZodPipe", (inst, def) => {
    $ZodPipe.init(inst, def);
    ZodType$1.init(inst, def);
    inst.in = def.in;
    inst.out = def.out;
  });
  function pipe(in_, out) {
    return new ZodPipe({
      type: "pipe",
      in: in_,
      out
      // ...util.normalizeParams(params),
    });
  }
  const ZodReadonly$1 = /* @__PURE__ */ $constructor("ZodReadonly", (inst, def) => {
    $ZodReadonly.init(inst, def);
    ZodType$1.init(inst, def);
  });
  function readonly(innerType) {
    return new ZodReadonly$1({
      type: "readonly",
      innerType
    });
  }
  const ZodCustom = /* @__PURE__ */ $constructor("ZodCustom", (inst, def) => {
    $ZodCustom.init(inst, def);
    ZodType$1.init(inst, def);
  });
  function check(fn) {
    const ch = new $ZodCheck({
      check: "custom"
      // ...util.normalizeParams(params),
    });
    ch._zod.check = fn;
    return ch;
  }
  function custom$1(fn, _params) {
    return _custom(ZodCustom, fn ?? (() => true), _params);
  }
  function refine(fn, _params = {}) {
    return _refine(ZodCustom, fn, _params);
  }
  function superRefine(fn) {
    const ch = check((payload) => {
      payload.addIssue = (issue$1) => {
        if (typeof issue$1 === "string") {
          payload.issues.push(issue(issue$1, payload.value, ch._zod.def));
        } else {
          const _issue = issue$1;
          if (_issue.fatal)
            _issue.continue = false;
          _issue.code ?? (_issue.code = "custom");
          _issue.input ?? (_issue.input = payload.value);
          _issue.inst ?? (_issue.inst = ch);
          _issue.continue ?? (_issue.continue = !ch._zod.def.abort);
          payload.issues.push(issue(_issue));
        }
      };
      return fn(payload.value, payload);
    });
    return ch;
  }
  function preprocess(fn, schema) {
    return pipe(transform(fn), schema);
  }
  const ZodIssueCode$1 = {
    custom: "custom"
  };
  function number(params) {
    return _coercedNumber(ZodNumber$1, params);
  }
  const LATEST_PROTOCOL_VERSION = "2025-11-25";
  const SUPPORTED_PROTOCOL_VERSIONS = [LATEST_PROTOCOL_VERSION, "2025-06-18", "2025-03-26", "2024-11-05", "2024-10-07"];
  const RELATED_TASK_META_KEY = "io.modelcontextprotocol/related-task";
  const JSONRPC_VERSION = "2.0";
  const AssertObjectSchema = custom$1((v) => v !== null && (typeof v === "object" || typeof v === "function"));
  const ProgressTokenSchema = union([string(), number$1().int()]);
  const CursorSchema = string();
  const TaskCreationParamsSchema = looseObject({
    /**
     * Time in milliseconds to keep task results available after completion.
     * If null, the task has unlimited lifetime until manually cleaned up.
     */
    ttl: union([number$1(), _null()]).optional(),
    /**
     * Time in milliseconds to wait between task status requests.
     */
    pollInterval: number$1().optional()
  });
  const RelatedTaskMetadataSchema = looseObject({
    taskId: string()
  });
  const RequestMetaSchema = looseObject({
    /**
     * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
     */
    progressToken: ProgressTokenSchema.optional(),
    /**
     * If specified, this request is related to the provided task.
     */
    [RELATED_TASK_META_KEY]: RelatedTaskMetadataSchema.optional()
  });
  const BaseRequestParamsSchema = looseObject({
    /**
     * If specified, the caller is requesting that the receiver create a task to represent the request.
     * Task creation parameters are now at the top level instead of in _meta.
     */
    task: TaskCreationParamsSchema.optional(),
    /**
     * See [General fields: `_meta`](/specification/draft/basic/index#meta) for notes on `_meta` usage.
     */
    _meta: RequestMetaSchema.optional()
  });
  const RequestSchema = object$1({
    method: string(),
    params: BaseRequestParamsSchema.optional()
  });
  const NotificationsParamsSchema = looseObject({
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: object$1({
      /**
       * If specified, this notification is related to the provided task.
       */
      [RELATED_TASK_META_KEY]: optional(RelatedTaskMetadataSchema)
    }).passthrough().optional()
  });
  const NotificationSchema = object$1({
    method: string(),
    params: NotificationsParamsSchema.optional()
  });
  const ResultSchema = looseObject({
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: looseObject({
      /**
       * If specified, this result is related to the provided task.
       */
      [RELATED_TASK_META_KEY]: RelatedTaskMetadataSchema.optional()
    }).optional()
  });
  const RequestIdSchema = union([string(), number$1().int()]);
  const JSONRPCRequestSchema = object$1({
    jsonrpc: literal(JSONRPC_VERSION),
    id: RequestIdSchema,
    ...RequestSchema.shape
  }).strict();
  const isJSONRPCRequest = (value) => JSONRPCRequestSchema.safeParse(value).success;
  const JSONRPCNotificationSchema = object$1({
    jsonrpc: literal(JSONRPC_VERSION),
    ...NotificationSchema.shape
  }).strict();
  const isJSONRPCNotification = (value) => JSONRPCNotificationSchema.safeParse(value).success;
  const JSONRPCResponseSchema = object$1({
    jsonrpc: literal(JSONRPC_VERSION),
    id: RequestIdSchema,
    result: ResultSchema
  }).strict();
  const isJSONRPCResponse = (value) => JSONRPCResponseSchema.safeParse(value).success;
  var ErrorCode;
  (function(ErrorCode2) {
    ErrorCode2[ErrorCode2["ConnectionClosed"] = -32e3] = "ConnectionClosed";
    ErrorCode2[ErrorCode2["RequestTimeout"] = -32001] = "RequestTimeout";
    ErrorCode2[ErrorCode2["ParseError"] = -32700] = "ParseError";
    ErrorCode2[ErrorCode2["InvalidRequest"] = -32600] = "InvalidRequest";
    ErrorCode2[ErrorCode2["MethodNotFound"] = -32601] = "MethodNotFound";
    ErrorCode2[ErrorCode2["InvalidParams"] = -32602] = "InvalidParams";
    ErrorCode2[ErrorCode2["InternalError"] = -32603] = "InternalError";
    ErrorCode2[ErrorCode2["UrlElicitationRequired"] = -32042] = "UrlElicitationRequired";
  })(ErrorCode || (ErrorCode = {}));
  const JSONRPCErrorSchema = object$1({
    jsonrpc: literal(JSONRPC_VERSION),
    id: RequestIdSchema,
    error: object$1({
      /**
       * The error type that occurred.
       */
      code: number$1().int(),
      /**
       * A short description of the error. The message SHOULD be limited to a concise single sentence.
       */
      message: string(),
      /**
       * Additional information about the error. The value of this member is defined by the sender (e.g. detailed error information, nested errors etc.).
       */
      data: optional(unknown())
    })
  }).strict();
  const isJSONRPCError = (value) => JSONRPCErrorSchema.safeParse(value).success;
  const JSONRPCMessageSchema = union([JSONRPCRequestSchema, JSONRPCNotificationSchema, JSONRPCResponseSchema, JSONRPCErrorSchema]);
  const EmptyResultSchema = ResultSchema.strict();
  const CancelledNotificationParamsSchema = NotificationsParamsSchema.extend({
    /**
     * The ID of the request to cancel.
     *
     * This MUST correspond to the ID of a request previously issued in the same direction.
     */
    requestId: RequestIdSchema,
    /**
     * An optional string describing the reason for the cancellation. This MAY be logged or presented to the user.
     */
    reason: string().optional()
  });
  const CancelledNotificationSchema = NotificationSchema.extend({
    method: literal("notifications/cancelled"),
    params: CancelledNotificationParamsSchema
  });
  const IconSchema = object$1({
    /**
     * URL or data URI for the icon.
     */
    src: string(),
    /**
     * Optional MIME type for the icon.
     */
    mimeType: string().optional(),
    /**
     * Optional array of strings that specify sizes at which the icon can be used.
     * Each string should be in WxH format (e.g., `"48x48"`, `"96x96"`) or `"any"` for scalable formats like SVG.
     *
     * If not provided, the client should assume that the icon can be used at any size.
     */
    sizes: array(string()).optional()
  });
  const IconsSchema = object$1({
    /**
     * Optional set of sized icons that the client can display in a user interface.
     *
     * Clients that support rendering icons MUST support at least the following MIME types:
     * - `image/png` - PNG images (safe, universal compatibility)
     * - `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)
     *
     * Clients that support rendering icons SHOULD also support:
     * - `image/svg+xml` - SVG images (scalable but requires security precautions)
     * - `image/webp` - WebP images (modern, efficient format)
     */
    icons: array(IconSchema).optional()
  });
  const BaseMetadataSchema = object$1({
    /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
    name: string(),
    /**
     * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
     * even by those unfamiliar with domain-specific terminology.
     *
     * If not provided, the name should be used for display (except for Tool,
     * where `annotations.title` should be given precedence over using `name`,
     * if present).
     */
    title: string().optional()
  });
  const ImplementationSchema = BaseMetadataSchema.extend({
    ...BaseMetadataSchema.shape,
    ...IconsSchema.shape,
    version: string(),
    /**
     * An optional URL of the website for this implementation.
     */
    websiteUrl: string().optional()
  });
  const FormElicitationCapabilitySchema = intersection(object$1({
    applyDefaults: boolean().optional()
  }), record(string(), unknown()));
  const ElicitationCapabilitySchema = preprocess((value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (Object.keys(value).length === 0) {
        return { form: {} };
      }
    }
    return value;
  }, intersection(object$1({
    form: FormElicitationCapabilitySchema.optional(),
    url: AssertObjectSchema.optional()
  }), record(string(), unknown()).optional()));
  const ClientTasksCapabilitySchema = object$1({
    /**
     * Present if the client supports listing tasks.
     */
    list: optional(object$1({}).passthrough()),
    /**
     * Present if the client supports cancelling tasks.
     */
    cancel: optional(object$1({}).passthrough()),
    /**
     * Capabilities for task creation on specific request types.
     */
    requests: optional(object$1({
      /**
       * Task support for sampling requests.
       */
      sampling: optional(object$1({
        createMessage: optional(object$1({}).passthrough())
      }).passthrough()),
      /**
       * Task support for elicitation requests.
       */
      elicitation: optional(object$1({
        create: optional(object$1({}).passthrough())
      }).passthrough())
    }).passthrough())
  }).passthrough();
  const ServerTasksCapabilitySchema = object$1({
    /**
     * Present if the server supports listing tasks.
     */
    list: optional(object$1({}).passthrough()),
    /**
     * Present if the server supports cancelling tasks.
     */
    cancel: optional(object$1({}).passthrough()),
    /**
     * Capabilities for task creation on specific request types.
     */
    requests: optional(object$1({
      /**
       * Task support for tool requests.
       */
      tools: optional(object$1({
        call: optional(object$1({}).passthrough())
      }).passthrough())
    }).passthrough())
  }).passthrough();
  const ClientCapabilitiesSchema = object$1({
    /**
     * Experimental, non-standard capabilities that the client supports.
     */
    experimental: record(string(), AssertObjectSchema).optional(),
    /**
     * Present if the client supports sampling from an LLM.
     */
    sampling: object$1({
      /**
       * Present if the client supports context inclusion via includeContext parameter.
       * If not declared, servers SHOULD only use `includeContext: "none"` (or omit it).
       */
      context: AssertObjectSchema.optional(),
      /**
       * Present if the client supports tool use via tools and toolChoice parameters.
       */
      tools: AssertObjectSchema.optional()
    }).optional(),
    /**
     * Present if the client supports eliciting user input.
     */
    elicitation: ElicitationCapabilitySchema.optional(),
    /**
     * Present if the client supports listing roots.
     */
    roots: object$1({
      /**
       * Whether the client supports issuing notifications for changes to the roots list.
       */
      listChanged: boolean().optional()
    }).optional(),
    /**
     * Present if the client supports task creation.
     */
    tasks: optional(ClientTasksCapabilitySchema)
  });
  const InitializeRequestParamsSchema = BaseRequestParamsSchema.extend({
    /**
     * The latest version of the Model Context Protocol that the client supports. The client MAY decide to support older versions as well.
     */
    protocolVersion: string(),
    capabilities: ClientCapabilitiesSchema,
    clientInfo: ImplementationSchema
  });
  const InitializeRequestSchema = RequestSchema.extend({
    method: literal("initialize"),
    params: InitializeRequestParamsSchema
  });
  const ServerCapabilitiesSchema = object$1({
    /**
     * Experimental, non-standard capabilities that the server supports.
     */
    experimental: record(string(), AssertObjectSchema).optional(),
    /**
     * Present if the server supports sending log messages to the client.
     */
    logging: AssertObjectSchema.optional(),
    /**
     * Present if the server supports sending completions to the client.
     */
    completions: AssertObjectSchema.optional(),
    /**
     * Present if the server offers any prompt templates.
     */
    prompts: optional(object$1({
      /**
       * Whether this server supports issuing notifications for changes to the prompt list.
       */
      listChanged: optional(boolean())
    })),
    /**
     * Present if the server offers any resources to read.
     */
    resources: object$1({
      /**
       * Whether this server supports clients subscribing to resource updates.
       */
      subscribe: boolean().optional(),
      /**
       * Whether this server supports issuing notifications for changes to the resource list.
       */
      listChanged: boolean().optional()
    }).optional(),
    /**
     * Present if the server offers any tools to call.
     */
    tools: object$1({
      /**
       * Whether this server supports issuing notifications for changes to the tool list.
       */
      listChanged: boolean().optional()
    }).optional(),
    /**
     * Present if the server supports task creation.
     */
    tasks: optional(ServerTasksCapabilitySchema)
  }).passthrough();
  const InitializeResultSchema = ResultSchema.extend({
    /**
     * The version of the Model Context Protocol that the server wants to use. This may not match the version that the client requested. If the client cannot support this version, it MUST disconnect.
     */
    protocolVersion: string(),
    capabilities: ServerCapabilitiesSchema,
    serverInfo: ImplementationSchema,
    /**
     * Instructions describing how to use the server and its features.
     *
     * This can be used by clients to improve the LLM's understanding of available tools, resources, etc. It can be thought of like a "hint" to the model. For example, this information MAY be added to the system prompt.
     */
    instructions: string().optional()
  });
  const InitializedNotificationSchema = NotificationSchema.extend({
    method: literal("notifications/initialized")
  });
  const isInitializedNotification = (value) => InitializedNotificationSchema.safeParse(value).success;
  const PingRequestSchema = RequestSchema.extend({
    method: literal("ping")
  });
  const ProgressSchema = object$1({
    /**
     * The progress thus far. This should increase every time progress is made, even if the total is unknown.
     */
    progress: number$1(),
    /**
     * Total number of items to process (or total progress required), if known.
     */
    total: optional(number$1()),
    /**
     * An optional message describing the current progress.
     */
    message: optional(string())
  });
  const ProgressNotificationParamsSchema = object$1({
    ...NotificationsParamsSchema.shape,
    ...ProgressSchema.shape,
    /**
     * The progress token which was given in the initial request, used to associate this notification with the request that is proceeding.
     */
    progressToken: ProgressTokenSchema
  });
  const ProgressNotificationSchema = NotificationSchema.extend({
    method: literal("notifications/progress"),
    params: ProgressNotificationParamsSchema
  });
  const PaginatedRequestParamsSchema = BaseRequestParamsSchema.extend({
    /**
     * An opaque token representing the current pagination position.
     * If provided, the server should return results starting after this cursor.
     */
    cursor: CursorSchema.optional()
  });
  const PaginatedRequestSchema = RequestSchema.extend({
    params: PaginatedRequestParamsSchema.optional()
  });
  const PaginatedResultSchema = ResultSchema.extend({
    /**
     * An opaque token representing the pagination position after the last returned result.
     * If present, there may be more results available.
     */
    nextCursor: optional(CursorSchema)
  });
  const TaskSchema = object$1({
    taskId: string(),
    status: _enum(["working", "input_required", "completed", "failed", "cancelled"]),
    /**
     * Time in milliseconds to keep task results available after completion.
     * If null, the task has unlimited lifetime until manually cleaned up.
     */
    ttl: union([number$1(), _null()]),
    /**
     * ISO 8601 timestamp when the task was created.
     */
    createdAt: string(),
    /**
     * ISO 8601 timestamp when the task was last updated.
     */
    lastUpdatedAt: string(),
    pollInterval: optional(number$1()),
    /**
     * Optional diagnostic message for failed tasks or other status information.
     */
    statusMessage: optional(string())
  });
  const CreateTaskResultSchema = ResultSchema.extend({
    task: TaskSchema
  });
  const TaskStatusNotificationParamsSchema = NotificationsParamsSchema.merge(TaskSchema);
  const TaskStatusNotificationSchema = NotificationSchema.extend({
    method: literal("notifications/tasks/status"),
    params: TaskStatusNotificationParamsSchema
  });
  const GetTaskRequestSchema = RequestSchema.extend({
    method: literal("tasks/get"),
    params: BaseRequestParamsSchema.extend({
      taskId: string()
    })
  });
  const GetTaskResultSchema = ResultSchema.merge(TaskSchema);
  const GetTaskPayloadRequestSchema = RequestSchema.extend({
    method: literal("tasks/result"),
    params: BaseRequestParamsSchema.extend({
      taskId: string()
    })
  });
  const ListTasksRequestSchema = PaginatedRequestSchema.extend({
    method: literal("tasks/list")
  });
  const ListTasksResultSchema = PaginatedResultSchema.extend({
    tasks: array(TaskSchema)
  });
  const CancelTaskRequestSchema = RequestSchema.extend({
    method: literal("tasks/cancel"),
    params: BaseRequestParamsSchema.extend({
      taskId: string()
    })
  });
  const CancelTaskResultSchema = ResultSchema.merge(TaskSchema);
  const ResourceContentsSchema = object$1({
    /**
     * The URI of this resource.
     */
    uri: string(),
    /**
     * The MIME type of this resource, if known.
     */
    mimeType: optional(string()),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: record(string(), unknown()).optional()
  });
  const TextResourceContentsSchema = ResourceContentsSchema.extend({
    /**
     * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
     */
    text: string()
  });
  const Base64Schema = string().refine((val) => {
    try {
      atob(val);
      return true;
    } catch (_a) {
      return false;
    }
  }, { message: "Invalid Base64 string" });
  const BlobResourceContentsSchema = ResourceContentsSchema.extend({
    /**
     * A base64-encoded string representing the binary data of the item.
     */
    blob: Base64Schema
  });
  const AnnotationsSchema = object$1({
    /**
     * Intended audience(s) for the resource.
     */
    audience: array(_enum(["user", "assistant"])).optional(),
    /**
     * Importance hint for the resource, from 0 (least) to 1 (most).
     */
    priority: number$1().min(0).max(1).optional(),
    /**
     * ISO 8601 timestamp for the most recent modification.
     */
    lastModified: datetime({ offset: true }).optional()
  });
  const ResourceSchema = object$1({
    ...BaseMetadataSchema.shape,
    ...IconsSchema.shape,
    /**
     * The URI of this resource.
     */
    uri: string(),
    /**
     * A description of what this resource represents.
     *
     * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
     */
    description: optional(string()),
    /**
     * The MIME type of this resource, if known.
     */
    mimeType: optional(string()),
    /**
     * Optional annotations for the client.
     */
    annotations: AnnotationsSchema.optional(),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: optional(looseObject({}))
  });
  const ResourceTemplateSchema = object$1({
    ...BaseMetadataSchema.shape,
    ...IconsSchema.shape,
    /**
     * A URI template (according to RFC 6570) that can be used to construct resource URIs.
     */
    uriTemplate: string(),
    /**
     * A description of what this template is for.
     *
     * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
     */
    description: optional(string()),
    /**
     * The MIME type for all resources that match this template. This should only be included if all resources matching this template have the same type.
     */
    mimeType: optional(string()),
    /**
     * Optional annotations for the client.
     */
    annotations: AnnotationsSchema.optional(),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: optional(looseObject({}))
  });
  const ListResourcesRequestSchema = PaginatedRequestSchema.extend({
    method: literal("resources/list")
  });
  const ListResourcesResultSchema = PaginatedResultSchema.extend({
    resources: array(ResourceSchema)
  });
  const ListResourceTemplatesRequestSchema = PaginatedRequestSchema.extend({
    method: literal("resources/templates/list")
  });
  const ListResourceTemplatesResultSchema = PaginatedResultSchema.extend({
    resourceTemplates: array(ResourceTemplateSchema)
  });
  const ResourceRequestParamsSchema = BaseRequestParamsSchema.extend({
    /**
     * The URI of the resource to read. The URI can use any protocol; it is up to the server how to interpret it.
     *
     * @format uri
     */
    uri: string()
  });
  const ReadResourceRequestParamsSchema = ResourceRequestParamsSchema;
  const ReadResourceRequestSchema = RequestSchema.extend({
    method: literal("resources/read"),
    params: ReadResourceRequestParamsSchema
  });
  const ReadResourceResultSchema = ResultSchema.extend({
    contents: array(union([TextResourceContentsSchema, BlobResourceContentsSchema]))
  });
  const ResourceListChangedNotificationSchema = NotificationSchema.extend({
    method: literal("notifications/resources/list_changed")
  });
  const SubscribeRequestParamsSchema = ResourceRequestParamsSchema;
  const SubscribeRequestSchema = RequestSchema.extend({
    method: literal("resources/subscribe"),
    params: SubscribeRequestParamsSchema
  });
  const UnsubscribeRequestParamsSchema = ResourceRequestParamsSchema;
  const UnsubscribeRequestSchema = RequestSchema.extend({
    method: literal("resources/unsubscribe"),
    params: UnsubscribeRequestParamsSchema
  });
  const ResourceUpdatedNotificationParamsSchema = NotificationsParamsSchema.extend({
    /**
     * The URI of the resource that has been updated. This might be a sub-resource of the one that the client actually subscribed to.
     */
    uri: string()
  });
  const ResourceUpdatedNotificationSchema = NotificationSchema.extend({
    method: literal("notifications/resources/updated"),
    params: ResourceUpdatedNotificationParamsSchema
  });
  const PromptArgumentSchema = object$1({
    /**
     * The name of the argument.
     */
    name: string(),
    /**
     * A human-readable description of the argument.
     */
    description: optional(string()),
    /**
     * Whether this argument must be provided.
     */
    required: optional(boolean())
  });
  const PromptSchema = object$1({
    ...BaseMetadataSchema.shape,
    ...IconsSchema.shape,
    /**
     * An optional description of what this prompt provides
     */
    description: optional(string()),
    /**
     * A list of arguments to use for templating the prompt.
     */
    arguments: optional(array(PromptArgumentSchema)),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: optional(looseObject({}))
  });
  const ListPromptsRequestSchema = PaginatedRequestSchema.extend({
    method: literal("prompts/list")
  });
  const ListPromptsResultSchema = PaginatedResultSchema.extend({
    prompts: array(PromptSchema)
  });
  const GetPromptRequestParamsSchema = BaseRequestParamsSchema.extend({
    /**
     * The name of the prompt or prompt template.
     */
    name: string(),
    /**
     * Arguments to use for templating the prompt.
     */
    arguments: record(string(), string()).optional()
  });
  const GetPromptRequestSchema = RequestSchema.extend({
    method: literal("prompts/get"),
    params: GetPromptRequestParamsSchema
  });
  const TextContentSchema = object$1({
    type: literal("text"),
    /**
     * The text content of the message.
     */
    text: string(),
    /**
     * Optional annotations for the client.
     */
    annotations: AnnotationsSchema.optional(),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: record(string(), unknown()).optional()
  });
  const ImageContentSchema = object$1({
    type: literal("image"),
    /**
     * The base64-encoded image data.
     */
    data: Base64Schema,
    /**
     * The MIME type of the image. Different providers may support different image types.
     */
    mimeType: string(),
    /**
     * Optional annotations for the client.
     */
    annotations: AnnotationsSchema.optional(),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: record(string(), unknown()).optional()
  });
  const AudioContentSchema = object$1({
    type: literal("audio"),
    /**
     * The base64-encoded audio data.
     */
    data: Base64Schema,
    /**
     * The MIME type of the audio. Different providers may support different audio types.
     */
    mimeType: string(),
    /**
     * Optional annotations for the client.
     */
    annotations: AnnotationsSchema.optional(),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: record(string(), unknown()).optional()
  });
  const ToolUseContentSchema = object$1({
    type: literal("tool_use"),
    /**
     * The name of the tool to invoke.
     * Must match a tool name from the request's tools array.
     */
    name: string(),
    /**
     * Unique identifier for this tool call.
     * Used to correlate with ToolResultContent in subsequent messages.
     */
    id: string(),
    /**
     * Arguments to pass to the tool.
     * Must conform to the tool's inputSchema.
     */
    input: object$1({}).passthrough(),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: optional(object$1({}).passthrough())
  }).passthrough();
  const EmbeddedResourceSchema = object$1({
    type: literal("resource"),
    resource: union([TextResourceContentsSchema, BlobResourceContentsSchema]),
    /**
     * Optional annotations for the client.
     */
    annotations: AnnotationsSchema.optional(),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: record(string(), unknown()).optional()
  });
  const ResourceLinkSchema = ResourceSchema.extend({
    type: literal("resource_link")
  });
  const ContentBlockSchema = union([
    TextContentSchema,
    ImageContentSchema,
    AudioContentSchema,
    ResourceLinkSchema,
    EmbeddedResourceSchema
  ]);
  const PromptMessageSchema = object$1({
    role: _enum(["user", "assistant"]),
    content: ContentBlockSchema
  });
  const GetPromptResultSchema = ResultSchema.extend({
    /**
     * An optional description for the prompt.
     */
    description: optional(string()),
    messages: array(PromptMessageSchema)
  });
  const PromptListChangedNotificationSchema = NotificationSchema.extend({
    method: literal("notifications/prompts/list_changed")
  });
  const ToolAnnotationsSchema = object$1({
    /**
     * A human-readable title for the tool.
     */
    title: string().optional(),
    /**
     * If true, the tool does not modify its environment.
     *
     * Default: false
     */
    readOnlyHint: boolean().optional(),
    /**
     * If true, the tool may perform destructive updates to its environment.
     * If false, the tool performs only additive updates.
     *
     * (This property is meaningful only when `readOnlyHint == false`)
     *
     * Default: true
     */
    destructiveHint: boolean().optional(),
    /**
     * If true, calling the tool repeatedly with the same arguments
     * will have no additional effect on the its environment.
     *
     * (This property is meaningful only when `readOnlyHint == false`)
     *
     * Default: false
     */
    idempotentHint: boolean().optional(),
    /**
     * If true, this tool may interact with an "open world" of external
     * entities. If false, the tool's domain of interaction is closed.
     * For example, the world of a web search tool is open, whereas that
     * of a memory tool is not.
     *
     * Default: true
     */
    openWorldHint: boolean().optional()
  });
  const ToolExecutionSchema = object$1({
    /**
     * Indicates the tool's preference for task-augmented execution.
     * - "required": Clients MUST invoke the tool as a task
     * - "optional": Clients MAY invoke the tool as a task or normal request
     * - "forbidden": Clients MUST NOT attempt to invoke the tool as a task
     *
     * If not present, defaults to "forbidden".
     */
    taskSupport: _enum(["required", "optional", "forbidden"]).optional()
  });
  const ToolSchema = object$1({
    ...BaseMetadataSchema.shape,
    ...IconsSchema.shape,
    /**
     * A human-readable description of the tool.
     */
    description: string().optional(),
    /**
     * A JSON Schema 2020-12 object defining the expected parameters for the tool.
     * Must have type: 'object' at the root level per MCP spec.
     */
    inputSchema: object$1({
      type: literal("object"),
      properties: record(string(), AssertObjectSchema).optional(),
      required: array(string()).optional()
    }).catchall(unknown()),
    /**
     * An optional JSON Schema 2020-12 object defining the structure of the tool's output
     * returned in the structuredContent field of a CallToolResult.
     * Must have type: 'object' at the root level per MCP spec.
     */
    outputSchema: object$1({
      type: literal("object"),
      properties: record(string(), AssertObjectSchema).optional(),
      required: array(string()).optional()
    }).catchall(unknown()).optional(),
    /**
     * Optional additional tool information.
     */
    annotations: optional(ToolAnnotationsSchema),
    /**
     * Execution-related properties for this tool.
     */
    execution: optional(ToolExecutionSchema),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: record(string(), unknown()).optional()
  });
  const ListToolsRequestSchema = PaginatedRequestSchema.extend({
    method: literal("tools/list")
  });
  const ListToolsResultSchema = PaginatedResultSchema.extend({
    tools: array(ToolSchema)
  });
  const CallToolResultSchema = ResultSchema.extend({
    /**
     * A list of content objects that represent the result of the tool call.
     *
     * If the Tool does not define an outputSchema, this field MUST be present in the result.
     * For backwards compatibility, this field is always present, but it may be empty.
     */
    content: array(ContentBlockSchema).default([]),
    /**
     * An object containing structured tool output.
     *
     * If the Tool defines an outputSchema, this field MUST be present in the result, and contain a JSON object that matches the schema.
     */
    structuredContent: record(string(), unknown()).optional(),
    /**
     * Whether the tool call ended in an error.
     *
     * If not set, this is assumed to be false (the call was successful).
     *
     * Any errors that originate from the tool SHOULD be reported inside the result
     * object, with `isError` set to true, _not_ as an MCP protocol-level error
     * response. Otherwise, the LLM would not be able to see that an error occurred
     * and self-correct.
     *
     * However, any errors in _finding_ the tool, an error indicating that the
     * server does not support tool calls, or any other exceptional conditions,
     * should be reported as an MCP error response.
     */
    isError: optional(boolean())
  });
  CallToolResultSchema.or(ResultSchema.extend({
    toolResult: unknown()
  }));
  const CallToolRequestParamsSchema = BaseRequestParamsSchema.extend({
    /**
     * The name of the tool to call.
     */
    name: string(),
    /**
     * Arguments to pass to the tool.
     */
    arguments: optional(record(string(), unknown()))
  });
  const CallToolRequestSchema = RequestSchema.extend({
    method: literal("tools/call"),
    params: CallToolRequestParamsSchema
  });
  const ToolListChangedNotificationSchema = NotificationSchema.extend({
    method: literal("notifications/tools/list_changed")
  });
  const LoggingLevelSchema = _enum(["debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"]);
  const SetLevelRequestParamsSchema = BaseRequestParamsSchema.extend({
    /**
     * The level of logging that the client wants to receive from the server. The server should send all logs at this level and higher (i.e., more severe) to the client as notifications/logging/message.
     */
    level: LoggingLevelSchema
  });
  const SetLevelRequestSchema = RequestSchema.extend({
    method: literal("logging/setLevel"),
    params: SetLevelRequestParamsSchema
  });
  const LoggingMessageNotificationParamsSchema = NotificationsParamsSchema.extend({
    /**
     * The severity of this log message.
     */
    level: LoggingLevelSchema,
    /**
     * An optional name of the logger issuing this message.
     */
    logger: string().optional(),
    /**
     * The data to be logged, such as a string message or an object. Any JSON serializable type is allowed here.
     */
    data: unknown()
  });
  const LoggingMessageNotificationSchema = NotificationSchema.extend({
    method: literal("notifications/message"),
    params: LoggingMessageNotificationParamsSchema
  });
  const ModelHintSchema = object$1({
    /**
     * A hint for a model name.
     */
    name: string().optional()
  });
  const ModelPreferencesSchema = object$1({
    /**
     * Optional hints to use for model selection.
     */
    hints: optional(array(ModelHintSchema)),
    /**
     * How much to prioritize cost when selecting a model.
     */
    costPriority: optional(number$1().min(0).max(1)),
    /**
     * How much to prioritize sampling speed (latency) when selecting a model.
     */
    speedPriority: optional(number$1().min(0).max(1)),
    /**
     * How much to prioritize intelligence and capabilities when selecting a model.
     */
    intelligencePriority: optional(number$1().min(0).max(1))
  });
  const ToolChoiceSchema = object$1({
    /**
     * Controls when tools are used:
     * - "auto": Model decides whether to use tools (default)
     * - "required": Model MUST use at least one tool before completing
     * - "none": Model MUST NOT use any tools
     */
    mode: optional(_enum(["auto", "required", "none"]))
  });
  const ToolResultContentSchema = object$1({
    type: literal("tool_result"),
    toolUseId: string().describe("The unique identifier for the corresponding tool call."),
    content: array(ContentBlockSchema).default([]),
    structuredContent: object$1({}).passthrough().optional(),
    isError: optional(boolean()),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: optional(object$1({}).passthrough())
  }).passthrough();
  const SamplingContentSchema = discriminatedUnion("type", [TextContentSchema, ImageContentSchema, AudioContentSchema]);
  const SamplingMessageContentBlockSchema = discriminatedUnion("type", [
    TextContentSchema,
    ImageContentSchema,
    AudioContentSchema,
    ToolUseContentSchema,
    ToolResultContentSchema
  ]);
  const SamplingMessageSchema = object$1({
    role: _enum(["user", "assistant"]),
    content: union([SamplingMessageContentBlockSchema, array(SamplingMessageContentBlockSchema)]),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: optional(object$1({}).passthrough())
  }).passthrough();
  const CreateMessageRequestParamsSchema = BaseRequestParamsSchema.extend({
    messages: array(SamplingMessageSchema),
    /**
     * The server's preferences for which model to select. The client MAY modify or omit this request.
     */
    modelPreferences: ModelPreferencesSchema.optional(),
    /**
     * An optional system prompt the server wants to use for sampling. The client MAY modify or omit this prompt.
     */
    systemPrompt: string().optional(),
    /**
     * A request to include context from one or more MCP servers (including the caller), to be attached to the prompt.
     * The client MAY ignore this request.
     *
     * Default is "none". Values "thisServer" and "allServers" are soft-deprecated. Servers SHOULD only use these values if the client
     * declares ClientCapabilities.sampling.context. These values may be removed in future spec releases.
     */
    includeContext: _enum(["none", "thisServer", "allServers"]).optional(),
    temperature: number$1().optional(),
    /**
     * The requested maximum number of tokens to sample (to prevent runaway completions).
     *
     * The client MAY choose to sample fewer tokens than the requested maximum.
     */
    maxTokens: number$1().int(),
    stopSequences: array(string()).optional(),
    /**
     * Optional metadata to pass through to the LLM provider. The format of this metadata is provider-specific.
     */
    metadata: AssertObjectSchema.optional(),
    /**
     * Tools that the model may use during generation.
     * The client MUST return an error if this field is provided but ClientCapabilities.sampling.tools is not declared.
     */
    tools: optional(array(ToolSchema)),
    /**
     * Controls how the model uses tools.
     * The client MUST return an error if this field is provided but ClientCapabilities.sampling.tools is not declared.
     * Default is `{ mode: "auto" }`.
     */
    toolChoice: optional(ToolChoiceSchema)
  });
  const CreateMessageRequestSchema = RequestSchema.extend({
    method: literal("sampling/createMessage"),
    params: CreateMessageRequestParamsSchema
  });
  const CreateMessageResultSchema = ResultSchema.extend({
    /**
     * The name of the model that generated the message.
     */
    model: string(),
    /**
     * The reason why sampling stopped, if known.
     *
     * Standard values:
     * - "endTurn": Natural end of the assistant's turn
     * - "stopSequence": A stop sequence was encountered
     * - "maxTokens": Maximum token limit was reached
     *
     * This field is an open string to allow for provider-specific stop reasons.
     */
    stopReason: optional(_enum(["endTurn", "stopSequence", "maxTokens"]).or(string())),
    role: _enum(["user", "assistant"]),
    /**
     * Response content. Single content block (text, image, or audio).
     */
    content: SamplingContentSchema
  });
  const CreateMessageResultWithToolsSchema = ResultSchema.extend({
    /**
     * The name of the model that generated the message.
     */
    model: string(),
    /**
     * The reason why sampling stopped, if known.
     *
     * Standard values:
     * - "endTurn": Natural end of the assistant's turn
     * - "stopSequence": A stop sequence was encountered
     * - "maxTokens": Maximum token limit was reached
     * - "toolUse": The model wants to use one or more tools
     *
     * This field is an open string to allow for provider-specific stop reasons.
     */
    stopReason: optional(_enum(["endTurn", "stopSequence", "maxTokens", "toolUse"]).or(string())),
    role: _enum(["user", "assistant"]),
    /**
     * Response content. May be a single block or array. May include ToolUseContent if stopReason is "toolUse".
     */
    content: union([SamplingMessageContentBlockSchema, array(SamplingMessageContentBlockSchema)])
  });
  const BooleanSchemaSchema = object$1({
    type: literal("boolean"),
    title: string().optional(),
    description: string().optional(),
    default: boolean().optional()
  });
  const StringSchemaSchema = object$1({
    type: literal("string"),
    title: string().optional(),
    description: string().optional(),
    minLength: number$1().optional(),
    maxLength: number$1().optional(),
    format: _enum(["email", "uri", "date", "date-time"]).optional(),
    default: string().optional()
  });
  const NumberSchemaSchema = object$1({
    type: _enum(["number", "integer"]),
    title: string().optional(),
    description: string().optional(),
    minimum: number$1().optional(),
    maximum: number$1().optional(),
    default: number$1().optional()
  });
  const UntitledSingleSelectEnumSchemaSchema = object$1({
    type: literal("string"),
    title: string().optional(),
    description: string().optional(),
    enum: array(string()),
    default: string().optional()
  });
  const TitledSingleSelectEnumSchemaSchema = object$1({
    type: literal("string"),
    title: string().optional(),
    description: string().optional(),
    oneOf: array(object$1({
      const: string(),
      title: string()
    })),
    default: string().optional()
  });
  const LegacyTitledEnumSchemaSchema = object$1({
    type: literal("string"),
    title: string().optional(),
    description: string().optional(),
    enum: array(string()),
    enumNames: array(string()).optional(),
    default: string().optional()
  });
  const SingleSelectEnumSchemaSchema = union([UntitledSingleSelectEnumSchemaSchema, TitledSingleSelectEnumSchemaSchema]);
  const UntitledMultiSelectEnumSchemaSchema = object$1({
    type: literal("array"),
    title: string().optional(),
    description: string().optional(),
    minItems: number$1().optional(),
    maxItems: number$1().optional(),
    items: object$1({
      type: literal("string"),
      enum: array(string())
    }),
    default: array(string()).optional()
  });
  const TitledMultiSelectEnumSchemaSchema = object$1({
    type: literal("array"),
    title: string().optional(),
    description: string().optional(),
    minItems: number$1().optional(),
    maxItems: number$1().optional(),
    items: object$1({
      anyOf: array(object$1({
        const: string(),
        title: string()
      }))
    }),
    default: array(string()).optional()
  });
  const MultiSelectEnumSchemaSchema = union([UntitledMultiSelectEnumSchemaSchema, TitledMultiSelectEnumSchemaSchema]);
  const EnumSchemaSchema = union([LegacyTitledEnumSchemaSchema, SingleSelectEnumSchemaSchema, MultiSelectEnumSchemaSchema]);
  const PrimitiveSchemaDefinitionSchema = union([EnumSchemaSchema, BooleanSchemaSchema, StringSchemaSchema, NumberSchemaSchema]);
  const ElicitRequestFormParamsSchema = BaseRequestParamsSchema.extend({
    /**
     * The elicitation mode.
     *
     * Optional for backward compatibility. Clients MUST treat missing mode as "form".
     */
    mode: literal("form").optional(),
    /**
     * The message to present to the user describing what information is being requested.
     */
    message: string(),
    /**
     * A restricted subset of JSON Schema.
     * Only top-level properties are allowed, without nesting.
     */
    requestedSchema: object$1({
      type: literal("object"),
      properties: record(string(), PrimitiveSchemaDefinitionSchema),
      required: array(string()).optional()
    })
  });
  const ElicitRequestURLParamsSchema = BaseRequestParamsSchema.extend({
    /**
     * The elicitation mode.
     */
    mode: literal("url"),
    /**
     * The message to present to the user explaining why the interaction is needed.
     */
    message: string(),
    /**
     * The ID of the elicitation, which must be unique within the context of the server.
     * The client MUST treat this ID as an opaque value.
     */
    elicitationId: string(),
    /**
     * The URL that the user should navigate to.
     */
    url: string().url()
  });
  const ElicitRequestParamsSchema = union([ElicitRequestFormParamsSchema, ElicitRequestURLParamsSchema]);
  const ElicitRequestSchema = RequestSchema.extend({
    method: literal("elicitation/create"),
    params: ElicitRequestParamsSchema
  });
  const ElicitationCompleteNotificationParamsSchema = NotificationsParamsSchema.extend({
    /**
     * The ID of the elicitation that completed.
     */
    elicitationId: string()
  });
  const ElicitationCompleteNotificationSchema = NotificationSchema.extend({
    method: literal("notifications/elicitation/complete"),
    params: ElicitationCompleteNotificationParamsSchema
  });
  const ElicitResultSchema = ResultSchema.extend({
    /**
     * The user action in response to the elicitation.
     * - "accept": User submitted the form/confirmed the action
     * - "decline": User explicitly decline the action
     * - "cancel": User dismissed without making an explicit choice
     */
    action: _enum(["accept", "decline", "cancel"]),
    /**
     * The submitted form data, only present when action is "accept".
     * Contains values matching the requested schema.
     * Per MCP spec, content is "typically omitted" for decline/cancel actions.
     * We normalize null to undefined for leniency while maintaining type compatibility.
     */
    content: preprocess((val) => val === null ? void 0 : val, record(string(), union([string(), number$1(), boolean(), array(string())])).optional())
  });
  const ResourceTemplateReferenceSchema = object$1({
    type: literal("ref/resource"),
    /**
     * The URI or URI template of the resource.
     */
    uri: string()
  });
  const PromptReferenceSchema = object$1({
    type: literal("ref/prompt"),
    /**
     * The name of the prompt or prompt template
     */
    name: string()
  });
  const CompleteRequestParamsSchema = BaseRequestParamsSchema.extend({
    ref: union([PromptReferenceSchema, ResourceTemplateReferenceSchema]),
    /**
     * The argument's information
     */
    argument: object$1({
      /**
       * The name of the argument
       */
      name: string(),
      /**
       * The value of the argument to use for completion matching.
       */
      value: string()
    }),
    context: object$1({
      /**
       * Previously-resolved variables in a URI template or prompt.
       */
      arguments: record(string(), string()).optional()
    }).optional()
  });
  const CompleteRequestSchema = RequestSchema.extend({
    method: literal("completion/complete"),
    params: CompleteRequestParamsSchema
  });
  function assertCompleteRequestPrompt(request) {
    if (request.params.ref.type !== "ref/prompt") {
      throw new TypeError(`Expected CompleteRequestPrompt, but got ${request.params.ref.type}`);
    }
  }
  function assertCompleteRequestResourceTemplate(request) {
    if (request.params.ref.type !== "ref/resource") {
      throw new TypeError(`Expected CompleteRequestResourceTemplate, but got ${request.params.ref.type}`);
    }
  }
  const CompleteResultSchema = ResultSchema.extend({
    completion: looseObject({
      /**
       * An array of completion values. Must not exceed 100 items.
       */
      values: array(string()).max(100),
      /**
       * The total number of completion options available. This can exceed the number of values actually sent in the response.
       */
      total: optional(number$1().int()),
      /**
       * Indicates whether there are additional completion options beyond those provided in the current response, even if the exact total is unknown.
       */
      hasMore: optional(boolean())
    })
  });
  const RootSchema = object$1({
    /**
     * The URI identifying the root. This *must* start with file:// for now.
     */
    uri: string().startsWith("file://"),
    /**
     * An optional name for the root.
     */
    name: string().optional(),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: record(string(), unknown()).optional()
  });
  const ListRootsRequestSchema = RequestSchema.extend({
    method: literal("roots/list")
  });
  const ListRootsResultSchema = ResultSchema.extend({
    roots: array(RootSchema)
  });
  const RootsListChangedNotificationSchema = NotificationSchema.extend({
    method: literal("notifications/roots/list_changed")
  });
  union([
    PingRequestSchema,
    InitializeRequestSchema,
    CompleteRequestSchema,
    SetLevelRequestSchema,
    GetPromptRequestSchema,
    ListPromptsRequestSchema,
    ListResourcesRequestSchema,
    ListResourceTemplatesRequestSchema,
    ReadResourceRequestSchema,
    SubscribeRequestSchema,
    UnsubscribeRequestSchema,
    CallToolRequestSchema,
    ListToolsRequestSchema,
    GetTaskRequestSchema,
    GetTaskPayloadRequestSchema,
    ListTasksRequestSchema
  ]);
  union([
    CancelledNotificationSchema,
    ProgressNotificationSchema,
    InitializedNotificationSchema,
    RootsListChangedNotificationSchema,
    TaskStatusNotificationSchema
  ]);
  union([
    EmptyResultSchema,
    CreateMessageResultSchema,
    CreateMessageResultWithToolsSchema,
    ElicitResultSchema,
    ListRootsResultSchema,
    GetTaskResultSchema,
    ListTasksResultSchema,
    CreateTaskResultSchema
  ]);
  union([
    PingRequestSchema,
    CreateMessageRequestSchema,
    ElicitRequestSchema,
    ListRootsRequestSchema,
    GetTaskRequestSchema,
    GetTaskPayloadRequestSchema,
    ListTasksRequestSchema
  ]);
  union([
    CancelledNotificationSchema,
    ProgressNotificationSchema,
    LoggingMessageNotificationSchema,
    ResourceUpdatedNotificationSchema,
    ResourceListChangedNotificationSchema,
    ToolListChangedNotificationSchema,
    PromptListChangedNotificationSchema,
    TaskStatusNotificationSchema,
    ElicitationCompleteNotificationSchema
  ]);
  union([
    EmptyResultSchema,
    InitializeResultSchema,
    CompleteResultSchema,
    GetPromptResultSchema,
    ListPromptsResultSchema,
    ListResourcesResultSchema,
    ListResourceTemplatesResultSchema,
    ReadResourceResultSchema,
    CallToolResultSchema,
    ListToolsResultSchema,
    GetTaskResultSchema,
    ListTasksResultSchema,
    CreateTaskResultSchema
  ]);
  class McpError extends Error {
    constructor(code2, message, data) {
      super(`MCP error ${code2}: ${message}`);
      this.code = code2;
      this.data = data;
      this.name = "McpError";
    }
    /**
     * Factory method to create the appropriate error type based on the error code and data
     */
    static fromError(code2, message, data) {
      if (code2 === ErrorCode.UrlElicitationRequired && data) {
        const errorData = data;
        if (errorData.elicitations) {
          return new UrlElicitationRequiredError(errorData.elicitations, message);
        }
      }
      return new McpError(code2, message, data);
    }
  }
  class UrlElicitationRequiredError extends McpError {
    constructor(elicitations, message = `URL elicitation${elicitations.length > 1 ? "s" : ""} required`) {
      super(ErrorCode.UrlElicitationRequired, message, {
        elicitations
      });
    }
    get elicitations() {
      var _a, _b;
      return (_b = (_a = this.data) === null || _a === void 0 ? void 0 : _a.elicitations) !== null && _b !== void 0 ? _b : [];
    }
  }
  var util;
  (function(util2) {
    util2.assertEqual = (_) => {
    };
    function assertIs(_arg) {
    }
    util2.assertIs = assertIs;
    function assertNever(_x) {
      throw new Error();
    }
    util2.assertNever = assertNever;
    util2.arrayToEnum = (items2) => {
      const obj = {};
      for (const item of items2) {
        obj[item] = item;
      }
      return obj;
    };
    util2.getValidEnumValues = (obj) => {
      const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
      const filtered = {};
      for (const k of validKeys) {
        filtered[k] = obj[k];
      }
      return util2.objectValues(filtered);
    };
    util2.objectValues = (obj) => {
      return util2.objectKeys(obj).map(function(e) {
        return obj[e];
      });
    };
    util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object2) => {
      const keys = [];
      for (const key in object2) {
        if (Object.prototype.hasOwnProperty.call(object2, key)) {
          keys.push(key);
        }
      }
      return keys;
    };
    util2.find = (arr, checker) => {
      for (const item of arr) {
        if (checker(item))
          return item;
      }
      return void 0;
    };
    util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
    function joinValues(array2, separator = " | ") {
      return array2.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
    }
    util2.joinValues = joinValues;
    util2.jsonStringifyReplacer = (_, value) => {
      if (typeof value === "bigint") {
        return value.toString();
      }
      return value;
    };
  })(util || (util = {}));
  var objectUtil;
  (function(objectUtil2) {
    objectUtil2.mergeShapes = (first, second) => {
      return {
        ...first,
        ...second
        // second overwrites first
      };
    };
  })(objectUtil || (objectUtil = {}));
  const ZodParsedType = util.arrayToEnum([
    "string",
    "nan",
    "number",
    "integer",
    "float",
    "boolean",
    "date",
    "bigint",
    "symbol",
    "function",
    "undefined",
    "null",
    "array",
    "object",
    "unknown",
    "promise",
    "void",
    "never",
    "map",
    "set"
  ]);
  const getParsedType = (data) => {
    const t = typeof data;
    switch (t) {
      case "undefined":
        return ZodParsedType.undefined;
      case "string":
        return ZodParsedType.string;
      case "number":
        return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
      case "boolean":
        return ZodParsedType.boolean;
      case "function":
        return ZodParsedType.function;
      case "bigint":
        return ZodParsedType.bigint;
      case "symbol":
        return ZodParsedType.symbol;
      case "object":
        if (Array.isArray(data)) {
          return ZodParsedType.array;
        }
        if (data === null) {
          return ZodParsedType.null;
        }
        if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
          return ZodParsedType.promise;
        }
        if (typeof Map !== "undefined" && data instanceof Map) {
          return ZodParsedType.map;
        }
        if (typeof Set !== "undefined" && data instanceof Set) {
          return ZodParsedType.set;
        }
        if (typeof Date !== "undefined" && data instanceof Date) {
          return ZodParsedType.date;
        }
        return ZodParsedType.object;
      default:
        return ZodParsedType.unknown;
    }
  };
  const ZodIssueCode = util.arrayToEnum([
    "invalid_type",
    "invalid_literal",
    "custom",
    "invalid_union",
    "invalid_union_discriminator",
    "invalid_enum_value",
    "unrecognized_keys",
    "invalid_arguments",
    "invalid_return_type",
    "invalid_date",
    "invalid_string",
    "too_small",
    "too_big",
    "invalid_intersection_types",
    "not_multiple_of",
    "not_finite"
  ]);
  const quotelessJson = (obj) => {
    const json = JSON.stringify(obj, null, 2);
    return json.replace(/"([^"]+)":/g, "$1:");
  };
  class ZodError extends Error {
    get errors() {
      return this.issues;
    }
    constructor(issues) {
      super();
      this.issues = [];
      this.addIssue = (sub) => {
        this.issues = [...this.issues, sub];
      };
      this.addIssues = (subs = []) => {
        this.issues = [...this.issues, ...subs];
      };
      const actualProto = new.target.prototype;
      if (Object.setPrototypeOf) {
        Object.setPrototypeOf(this, actualProto);
      } else {
        this.__proto__ = actualProto;
      }
      this.name = "ZodError";
      this.issues = issues;
    }
    format(_mapper) {
      const mapper = _mapper || function(issue2) {
        return issue2.message;
      };
      const fieldErrors = { _errors: [] };
      const processError = (error) => {
        for (const issue2 of error.issues) {
          if (issue2.code === "invalid_union") {
            issue2.unionErrors.map(processError);
          } else if (issue2.code === "invalid_return_type") {
            processError(issue2.returnTypeError);
          } else if (issue2.code === "invalid_arguments") {
            processError(issue2.argumentsError);
          } else if (issue2.path.length === 0) {
            fieldErrors._errors.push(mapper(issue2));
          } else {
            let curr = fieldErrors;
            let i = 0;
            while (i < issue2.path.length) {
              const el = issue2.path[i];
              const terminal = i === issue2.path.length - 1;
              if (!terminal) {
                curr[el] = curr[el] || { _errors: [] };
              } else {
                curr[el] = curr[el] || { _errors: [] };
                curr[el]._errors.push(mapper(issue2));
              }
              curr = curr[el];
              i++;
            }
          }
        }
      };
      processError(this);
      return fieldErrors;
    }
    static assert(value) {
      if (!(value instanceof ZodError)) {
        throw new Error(`Not a ZodError: ${value}`);
      }
    }
    toString() {
      return this.message;
    }
    get message() {
      return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
    }
    get isEmpty() {
      return this.issues.length === 0;
    }
    flatten(mapper = (issue2) => issue2.message) {
      const fieldErrors = {};
      const formErrors = [];
      for (const sub of this.issues) {
        if (sub.path.length > 0) {
          const firstEl = sub.path[0];
          fieldErrors[firstEl] = fieldErrors[firstEl] || [];
          fieldErrors[firstEl].push(mapper(sub));
        } else {
          formErrors.push(mapper(sub));
        }
      }
      return { formErrors, fieldErrors };
    }
    get formErrors() {
      return this.flatten();
    }
  }
  ZodError.create = (issues) => {
    const error = new ZodError(issues);
    return error;
  };
  const errorMap = (issue2, _ctx) => {
    let message;
    switch (issue2.code) {
      case ZodIssueCode.invalid_type:
        if (issue2.received === ZodParsedType.undefined) {
          message = "Required";
        } else {
          message = `Expected ${issue2.expected}, received ${issue2.received}`;
        }
        break;
      case ZodIssueCode.invalid_literal:
        message = `Invalid literal value, expected ${JSON.stringify(issue2.expected, util.jsonStringifyReplacer)}`;
        break;
      case ZodIssueCode.unrecognized_keys:
        message = `Unrecognized key(s) in object: ${util.joinValues(issue2.keys, ", ")}`;
        break;
      case ZodIssueCode.invalid_union:
        message = `Invalid input`;
        break;
      case ZodIssueCode.invalid_union_discriminator:
        message = `Invalid discriminator value. Expected ${util.joinValues(issue2.options)}`;
        break;
      case ZodIssueCode.invalid_enum_value:
        message = `Invalid enum value. Expected ${util.joinValues(issue2.options)}, received '${issue2.received}'`;
        break;
      case ZodIssueCode.invalid_arguments:
        message = `Invalid function arguments`;
        break;
      case ZodIssueCode.invalid_return_type:
        message = `Invalid function return type`;
        break;
      case ZodIssueCode.invalid_date:
        message = `Invalid date`;
        break;
      case ZodIssueCode.invalid_string:
        if (typeof issue2.validation === "object") {
          if ("includes" in issue2.validation) {
            message = `Invalid input: must include "${issue2.validation.includes}"`;
            if (typeof issue2.validation.position === "number") {
              message = `${message} at one or more positions greater than or equal to ${issue2.validation.position}`;
            }
          } else if ("startsWith" in issue2.validation) {
            message = `Invalid input: must start with "${issue2.validation.startsWith}"`;
          } else if ("endsWith" in issue2.validation) {
            message = `Invalid input: must end with "${issue2.validation.endsWith}"`;
          } else {
            util.assertNever(issue2.validation);
          }
        } else if (issue2.validation !== "regex") {
          message = `Invalid ${issue2.validation}`;
        } else {
          message = "Invalid";
        }
        break;
      case ZodIssueCode.too_small:
        if (issue2.type === "array")
          message = `Array must contain ${issue2.exact ? "exactly" : issue2.inclusive ? `at least` : `more than`} ${issue2.minimum} element(s)`;
        else if (issue2.type === "string")
          message = `String must contain ${issue2.exact ? "exactly" : issue2.inclusive ? `at least` : `over`} ${issue2.minimum} character(s)`;
        else if (issue2.type === "number")
          message = `Number must be ${issue2.exact ? `exactly equal to ` : issue2.inclusive ? `greater than or equal to ` : `greater than `}${issue2.minimum}`;
        else if (issue2.type === "bigint")
          message = `Number must be ${issue2.exact ? `exactly equal to ` : issue2.inclusive ? `greater than or equal to ` : `greater than `}${issue2.minimum}`;
        else if (issue2.type === "date")
          message = `Date must be ${issue2.exact ? `exactly equal to ` : issue2.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue2.minimum))}`;
        else
          message = "Invalid input";
        break;
      case ZodIssueCode.too_big:
        if (issue2.type === "array")
          message = `Array must contain ${issue2.exact ? `exactly` : issue2.inclusive ? `at most` : `less than`} ${issue2.maximum} element(s)`;
        else if (issue2.type === "string")
          message = `String must contain ${issue2.exact ? `exactly` : issue2.inclusive ? `at most` : `under`} ${issue2.maximum} character(s)`;
        else if (issue2.type === "number")
          message = `Number must be ${issue2.exact ? `exactly` : issue2.inclusive ? `less than or equal to` : `less than`} ${issue2.maximum}`;
        else if (issue2.type === "bigint")
          message = `BigInt must be ${issue2.exact ? `exactly` : issue2.inclusive ? `less than or equal to` : `less than`} ${issue2.maximum}`;
        else if (issue2.type === "date")
          message = `Date must be ${issue2.exact ? `exactly` : issue2.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue2.maximum))}`;
        else
          message = "Invalid input";
        break;
      case ZodIssueCode.custom:
        message = `Invalid input`;
        break;
      case ZodIssueCode.invalid_intersection_types:
        message = `Intersection results could not be merged`;
        break;
      case ZodIssueCode.not_multiple_of:
        message = `Number must be a multiple of ${issue2.multipleOf}`;
        break;
      case ZodIssueCode.not_finite:
        message = "Number must be finite";
        break;
      default:
        message = _ctx.defaultError;
        util.assertNever(issue2);
    }
    return { message };
  };
  let overrideErrorMap = errorMap;
  function setErrorMap(map) {
    overrideErrorMap = map;
  }
  function getErrorMap() {
    return overrideErrorMap;
  }
  const makeIssue = (params) => {
    const { data, path, errorMaps, issueData } = params;
    const fullPath = [...path, ...issueData.path || []];
    const fullIssue = {
      ...issueData,
      path: fullPath
    };
    if (issueData.message !== void 0) {
      return {
        ...issueData,
        path: fullPath,
        message: issueData.message
      };
    }
    let errorMessage = "";
    const maps = errorMaps.filter((m) => !!m).slice().reverse();
    for (const map of maps) {
      errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
    }
    return {
      ...issueData,
      path: fullPath,
      message: errorMessage
    };
  };
  const EMPTY_PATH = [];
  function addIssueToContext(ctx, issueData) {
    const overrideMap = getErrorMap();
    const issue2 = makeIssue({
      issueData,
      data: ctx.data,
      path: ctx.path,
      errorMaps: [
        ctx.common.contextualErrorMap,
        // contextual error map is first priority
        ctx.schemaErrorMap,
        // then schema-bound map if available
        overrideMap,
        // then global override map
        overrideMap === errorMap ? void 0 : errorMap
        // then global default map
      ].filter((x) => !!x)
    });
    ctx.common.issues.push(issue2);
  }
  class ParseStatus {
    constructor() {
      this.value = "valid";
    }
    dirty() {
      if (this.value === "valid")
        this.value = "dirty";
    }
    abort() {
      if (this.value !== "aborted")
        this.value = "aborted";
    }
    static mergeArray(status, results) {
      const arrayValue = [];
      for (const s of results) {
        if (s.status === "aborted")
          return INVALID;
        if (s.status === "dirty")
          status.dirty();
        arrayValue.push(s.value);
      }
      return { status: status.value, value: arrayValue };
    }
    static async mergeObjectAsync(status, pairs) {
      const syncPairs = [];
      for (const pair of pairs) {
        const key = await pair.key;
        const value = await pair.value;
        syncPairs.push({
          key,
          value
        });
      }
      return ParseStatus.mergeObjectSync(status, syncPairs);
    }
    static mergeObjectSync(status, pairs) {
      const finalObject = {};
      for (const pair of pairs) {
        const { key, value } = pair;
        if (key.status === "aborted")
          return INVALID;
        if (value.status === "aborted")
          return INVALID;
        if (key.status === "dirty")
          status.dirty();
        if (value.status === "dirty")
          status.dirty();
        if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
          finalObject[key.value] = value.value;
        }
      }
      return { status: status.value, value: finalObject };
    }
  }
  const INVALID = Object.freeze({
    status: "aborted"
  });
  const DIRTY = (value) => ({ status: "dirty", value });
  const OK = (value) => ({ status: "valid", value });
  const isAborted = (x) => x.status === "aborted";
  const isDirty = (x) => x.status === "dirty";
  const isValid = (x) => x.status === "valid";
  const isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;
  var errorUtil;
  (function(errorUtil2) {
    errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
    errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
  })(errorUtil || (errorUtil = {}));
  class ParseInputLazyPath {
    constructor(parent, value, path, key) {
      this._cachedPath = [];
      this.parent = parent;
      this.data = value;
      this._path = path;
      this._key = key;
    }
    get path() {
      if (!this._cachedPath.length) {
        if (Array.isArray(this._key)) {
          this._cachedPath.push(...this._path, ...this._key);
        } else {
          this._cachedPath.push(...this._path, this._key);
        }
      }
      return this._cachedPath;
    }
  }
  const handleResult = (ctx, result) => {
    if (isValid(result)) {
      return { success: true, data: result.value };
    } else {
      if (!ctx.common.issues.length) {
        throw new Error("Validation failed but no issues detected.");
      }
      return {
        success: false,
        get error() {
          if (this._error)
            return this._error;
          const error = new ZodError(ctx.common.issues);
          this._error = error;
          return this._error;
        }
      };
    }
  };
  function processCreateParams(params) {
    if (!params)
      return {};
    const { errorMap: errorMap2, invalid_type_error, required_error, description: description2 } = params;
    if (errorMap2 && (invalid_type_error || required_error)) {
      throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
    }
    if (errorMap2)
      return { errorMap: errorMap2, description: description2 };
    const customMap = (iss, ctx) => {
      const { message } = params;
      if (iss.code === "invalid_enum_value") {
        return { message: message ?? ctx.defaultError };
      }
      if (typeof ctx.data === "undefined") {
        return { message: message ?? required_error ?? ctx.defaultError };
      }
      if (iss.code !== "invalid_type")
        return { message: ctx.defaultError };
      return { message: message ?? invalid_type_error ?? ctx.defaultError };
    };
    return { errorMap: customMap, description: description2 };
  }
  class ZodType {
    get description() {
      return this._def.description;
    }
    _getType(input) {
      return getParsedType(input.data);
    }
    _getOrReturnCtx(input, ctx) {
      return ctx || {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      };
    }
    _processInputParams(input) {
      return {
        status: new ParseStatus(),
        ctx: {
          common: input.parent.common,
          data: input.data,
          parsedType: getParsedType(input.data),
          schemaErrorMap: this._def.errorMap,
          path: input.path,
          parent: input.parent
        }
      };
    }
    _parseSync(input) {
      const result = this._parse(input);
      if (isAsync(result)) {
        throw new Error("Synchronous parse encountered promise.");
      }
      return result;
    }
    _parseAsync(input) {
      const result = this._parse(input);
      return Promise.resolve(result);
    }
    parse(data, params) {
      const result = this.safeParse(data, params);
      if (result.success)
        return result.data;
      throw result.error;
    }
    safeParse(data, params) {
      const ctx = {
        common: {
          issues: [],
          async: params?.async ?? false,
          contextualErrorMap: params?.errorMap
        },
        path: params?.path || [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data,
        parsedType: getParsedType(data)
      };
      const result = this._parseSync({ data, path: ctx.path, parent: ctx });
      return handleResult(ctx, result);
    }
    "~validate"(data) {
      const ctx = {
        common: {
          issues: [],
          async: !!this["~standard"].async
        },
        path: [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data,
        parsedType: getParsedType(data)
      };
      if (!this["~standard"].async) {
        try {
          const result = this._parseSync({ data, path: [], parent: ctx });
          return isValid(result) ? {
            value: result.value
          } : {
            issues: ctx.common.issues
          };
        } catch (err) {
          if (err?.message?.toLowerCase()?.includes("encountered")) {
            this["~standard"].async = true;
          }
          ctx.common = {
            issues: [],
            async: true
          };
        }
      }
      return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
        value: result.value
      } : {
        issues: ctx.common.issues
      });
    }
    async parseAsync(data, params) {
      const result = await this.safeParseAsync(data, params);
      if (result.success)
        return result.data;
      throw result.error;
    }
    async safeParseAsync(data, params) {
      const ctx = {
        common: {
          issues: [],
          contextualErrorMap: params?.errorMap,
          async: true
        },
        path: params?.path || [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data,
        parsedType: getParsedType(data)
      };
      const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
      const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
      return handleResult(ctx, result);
    }
    refine(check2, message) {
      const getIssueProperties = (val) => {
        if (typeof message === "string" || typeof message === "undefined") {
          return { message };
        } else if (typeof message === "function") {
          return message(val);
        } else {
          return message;
        }
      };
      return this._refinement((val, ctx) => {
        const result = check2(val);
        const setError = () => ctx.addIssue({
          code: ZodIssueCode.custom,
          ...getIssueProperties(val)
        });
        if (typeof Promise !== "undefined" && result instanceof Promise) {
          return result.then((data) => {
            if (!data) {
              setError();
              return false;
            } else {
              return true;
            }
          });
        }
        if (!result) {
          setError();
          return false;
        } else {
          return true;
        }
      });
    }
    refinement(check2, refinementData) {
      return this._refinement((val, ctx) => {
        if (!check2(val)) {
          ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
          return false;
        } else {
          return true;
        }
      });
    }
    _refinement(refinement) {
      return new ZodEffects({
        schema: this,
        typeName: ZodFirstPartyTypeKind.ZodEffects,
        effect: { type: "refinement", refinement }
      });
    }
    superRefine(refinement) {
      return this._refinement(refinement);
    }
    constructor(def) {
      this.spa = this.safeParseAsync;
      this._def = def;
      this.parse = this.parse.bind(this);
      this.safeParse = this.safeParse.bind(this);
      this.parseAsync = this.parseAsync.bind(this);
      this.safeParseAsync = this.safeParseAsync.bind(this);
      this.spa = this.spa.bind(this);
      this.refine = this.refine.bind(this);
      this.refinement = this.refinement.bind(this);
      this.superRefine = this.superRefine.bind(this);
      this.optional = this.optional.bind(this);
      this.nullable = this.nullable.bind(this);
      this.nullish = this.nullish.bind(this);
      this.array = this.array.bind(this);
      this.promise = this.promise.bind(this);
      this.or = this.or.bind(this);
      this.and = this.and.bind(this);
      this.transform = this.transform.bind(this);
      this.brand = this.brand.bind(this);
      this.default = this.default.bind(this);
      this.catch = this.catch.bind(this);
      this.describe = this.describe.bind(this);
      this.pipe = this.pipe.bind(this);
      this.readonly = this.readonly.bind(this);
      this.isNullable = this.isNullable.bind(this);
      this.isOptional = this.isOptional.bind(this);
      this["~standard"] = {
        version: 1,
        vendor: "zod",
        validate: (data) => this["~validate"](data)
      };
    }
    optional() {
      return ZodOptional.create(this, this._def);
    }
    nullable() {
      return ZodNullable.create(this, this._def);
    }
    nullish() {
      return this.nullable().optional();
    }
    array() {
      return ZodArray.create(this);
    }
    promise() {
      return ZodPromise.create(this, this._def);
    }
    or(option) {
      return ZodUnion.create([this, option], this._def);
    }
    and(incoming) {
      return ZodIntersection.create(this, incoming, this._def);
    }
    transform(transform2) {
      return new ZodEffects({
        ...processCreateParams(this._def),
        schema: this,
        typeName: ZodFirstPartyTypeKind.ZodEffects,
        effect: { type: "transform", transform: transform2 }
      });
    }
    default(def) {
      const defaultValueFunc = typeof def === "function" ? def : () => def;
      return new ZodDefault({
        ...processCreateParams(this._def),
        innerType: this,
        defaultValue: defaultValueFunc,
        typeName: ZodFirstPartyTypeKind.ZodDefault
      });
    }
    brand() {
      return new ZodBranded({
        typeName: ZodFirstPartyTypeKind.ZodBranded,
        type: this,
        ...processCreateParams(this._def)
      });
    }
    catch(def) {
      const catchValueFunc = typeof def === "function" ? def : () => def;
      return new ZodCatch({
        ...processCreateParams(this._def),
        innerType: this,
        catchValue: catchValueFunc,
        typeName: ZodFirstPartyTypeKind.ZodCatch
      });
    }
    describe(description2) {
      const This = this.constructor;
      return new This({
        ...this._def,
        description: description2
      });
    }
    pipe(target) {
      return ZodPipeline.create(this, target);
    }
    readonly() {
      return ZodReadonly.create(this);
    }
    isOptional() {
      return this.safeParse(void 0).success;
    }
    isNullable() {
      return this.safeParse(null).success;
    }
  }
  const cuidRegex = /^c[^\s-]{8,}$/i;
  const cuid2Regex = /^[0-9a-z]+$/;
  const ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
  const uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
  const nanoidRegex = /^[a-z0-9_-]{21}$/i;
  const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
  const durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
  const emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
  const _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
  let emojiRegex$1;
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
  const ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  const ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
  const base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
  const base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
  const dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
  const dateRegex = new RegExp(`^${dateRegexSource}$`);
  function timeRegexSource(args) {
    let secondsRegexSource = `[0-5]\\d`;
    if (args.precision) {
      secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
    } else if (args.precision == null) {
      secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
    }
    const secondsQuantifier = args.precision ? "+" : "?";
    return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
  }
  function timeRegex(args) {
    return new RegExp(`^${timeRegexSource(args)}$`);
  }
  function datetimeRegex(args) {
    let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
    const opts = [];
    opts.push(args.local ? `Z?` : `Z`);
    if (args.offset)
      opts.push(`([+-]\\d{2}:?\\d{2})`);
    regex = `${regex}(${opts.join("|")})`;
    return new RegExp(`^${regex}$`);
  }
  function isValidIP(ip, version2) {
    if ((version2 === "v4" || !version2) && ipv4Regex.test(ip)) {
      return true;
    }
    if ((version2 === "v6" || !version2) && ipv6Regex.test(ip)) {
      return true;
    }
    return false;
  }
  function isValidJWT(jwt, alg) {
    if (!jwtRegex.test(jwt))
      return false;
    try {
      const [header] = jwt.split(".");
      if (!header)
        return false;
      const base642 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
      const decoded = JSON.parse(atob(base642));
      if (typeof decoded !== "object" || decoded === null)
        return false;
      if ("typ" in decoded && decoded?.typ !== "JWT")
        return false;
      if (!decoded.alg)
        return false;
      if (alg && decoded.alg !== alg)
        return false;
      return true;
    } catch {
      return false;
    }
  }
  function isValidCidr(ip, version2) {
    if ((version2 === "v4" || !version2) && ipv4CidrRegex.test(ip)) {
      return true;
    }
    if ((version2 === "v6" || !version2) && ipv6CidrRegex.test(ip)) {
      return true;
    }
    return false;
  }
  class ZodString extends ZodType {
    _parse(input) {
      if (this._def.coerce) {
        input.data = String(input.data);
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.string) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.string,
          received: ctx2.parsedType
        });
        return INVALID;
      }
      const status = new ParseStatus();
      let ctx = void 0;
      for (const check2 of this._def.checks) {
        if (check2.kind === "min") {
          if (input.data.length < check2.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check2.value,
              type: "string",
              inclusive: true,
              exact: false,
              message: check2.message
            });
            status.dirty();
          }
        } else if (check2.kind === "max") {
          if (input.data.length > check2.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check2.value,
              type: "string",
              inclusive: true,
              exact: false,
              message: check2.message
            });
            status.dirty();
          }
        } else if (check2.kind === "length") {
          const tooBig = input.data.length > check2.value;
          const tooSmall = input.data.length < check2.value;
          if (tooBig || tooSmall) {
            ctx = this._getOrReturnCtx(input, ctx);
            if (tooBig) {
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_big,
                maximum: check2.value,
                type: "string",
                inclusive: true,
                exact: true,
                message: check2.message
              });
            } else if (tooSmall) {
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_small,
                minimum: check2.value,
                type: "string",
                inclusive: true,
                exact: true,
                message: check2.message
              });
            }
            status.dirty();
          }
        } else if (check2.kind === "email") {
          if (!emailRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "email",
              code: ZodIssueCode.invalid_string,
              message: check2.message
            });
            status.dirty();
          }
        } else if (check2.kind === "emoji") {
          if (!emojiRegex$1) {
            emojiRegex$1 = new RegExp(_emojiRegex, "u");
          }
          if (!emojiRegex$1.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "emoji",
              code: ZodIssueCode.invalid_string,
              message: check2.message
            });
            status.dirty();
          }
        } else if (check2.kind === "uuid") {
          if (!uuidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "uuid",
              code: ZodIssueCode.invalid_string,
              message: check2.message
            });
            status.dirty();
          }
        } else if (check2.kind === "nanoid") {
          if (!nanoidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "nanoid",
              code: ZodIssueCode.invalid_string,
              message: check2.message
            });
            status.dirty();
          }
        } else if (check2.kind === "cuid") {
          if (!cuidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "cuid",
              code: ZodIssueCode.invalid_string,
              message: check2.message
            });
            status.dirty();
          }
        } else if (check2.kind === "cuid2") {
          if (!cuid2Regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "cuid2",
              code: ZodIssueCode.invalid_string,
              message: check2.message
            });
            status.dirty();
          }
        } else if (check2.kind === "ulid") {
          if (!ulidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "ulid",
              code: ZodIssueCode.invalid_string,
              message: check2.message
            });
            status.dirty();
          }
        } else if (check2.kind === "url") {
          try {
            new URL(input.data);
          } catch {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "url",
              code: ZodIssueCode.invalid_string,
              message: check2.message
            });
            status.dirty();
          }
        } else if (check2.kind === "regex") {
          check2.regex.lastIndex = 0;
          const testResult = check2.regex.test(input.data);
          if (!testResult) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "regex",
              code: ZodIssueCode.invalid_string,
              message: check2.message
            });
            status.dirty();
          }
        } else if (check2.kind === "trim") {
          input.data = input.data.trim();
        } else if (check2.kind === "includes") {
          if (!input.data.includes(check2.value, check2.position)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: { includes: check2.value, position: check2.position },
              message: check2.message
            });
            status.dirty();
          }
        } else if (check2.kind === "toLowerCase") {
          input.data = input.data.toLowerCase();
        } else if (check2.kind === "toUpperCase") {
          input.data = input.data.toUpperCase();
        } else if (check2.kind === "startsWith") {
          if (!input.data.startsWith(check2.value)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: { startsWith: check2.value },
              message: check2.message
            });
            status.dirty();
          }
        } else if (check2.kind === "endsWith") {
          if (!input.data.endsWith(check2.value)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: { endsWith: check2.value },
              message: check2.message
            });
            status.dirty();
          }
        } else if (check2.kind === "datetime") {
          const regex = datetimeRegex(check2);
          if (!regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: "datetime",
              message: check2.message
            });
            status.dirty();
          }
        } else if (check2.kind === "date") {
          const regex = dateRegex;
          if (!regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: "date",
              message: check2.message
            });
            status.dirty();
          }
        } else if (check2.kind === "time") {
          const regex = timeRegex(check2);
          if (!regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: "time",
              message: check2.message
            });
            status.dirty();
          }
        } else if (check2.kind === "duration") {
          if (!durationRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "duration",
              code: ZodIssueCode.invalid_string,
              message: check2.message
            });
            status.dirty();
          }
        } else if (check2.kind === "ip") {
          if (!isValidIP(input.data, check2.version)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "ip",
              code: ZodIssueCode.invalid_string,
              message: check2.message
            });
            status.dirty();
          }
        } else if (check2.kind === "jwt") {
          if (!isValidJWT(input.data, check2.alg)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "jwt",
              code: ZodIssueCode.invalid_string,
              message: check2.message
            });
            status.dirty();
          }
        } else if (check2.kind === "cidr") {
          if (!isValidCidr(input.data, check2.version)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "cidr",
              code: ZodIssueCode.invalid_string,
              message: check2.message
            });
            status.dirty();
          }
        } else if (check2.kind === "base64") {
          if (!base64Regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "base64",
              code: ZodIssueCode.invalid_string,
              message: check2.message
            });
            status.dirty();
          }
        } else if (check2.kind === "base64url") {
          if (!base64urlRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "base64url",
              code: ZodIssueCode.invalid_string,
              message: check2.message
            });
            status.dirty();
          }
        } else {
          util.assertNever(check2);
        }
      }
      return { status: status.value, value: input.data };
    }
    _regex(regex, validation2, message) {
      return this.refinement((data) => regex.test(data), {
        validation: validation2,
        code: ZodIssueCode.invalid_string,
        ...errorUtil.errToObj(message)
      });
    }
    _addCheck(check2) {
      return new ZodString({
        ...this._def,
        checks: [...this._def.checks, check2]
      });
    }
    email(message) {
      return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
    }
    url(message) {
      return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
    }
    emoji(message) {
      return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
    }
    uuid(message) {
      return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
    }
    nanoid(message) {
      return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
    }
    cuid(message) {
      return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
    }
    cuid2(message) {
      return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
    }
    ulid(message) {
      return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
    }
    base64(message) {
      return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
    }
    base64url(message) {
      return this._addCheck({
        kind: "base64url",
        ...errorUtil.errToObj(message)
      });
    }
    jwt(options) {
      return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
    }
    ip(options) {
      return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
    }
    cidr(options) {
      return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
    }
    datetime(options) {
      if (typeof options === "string") {
        return this._addCheck({
          kind: "datetime",
          precision: null,
          offset: false,
          local: false,
          message: options
        });
      }
      return this._addCheck({
        kind: "datetime",
        precision: typeof options?.precision === "undefined" ? null : options?.precision,
        offset: options?.offset ?? false,
        local: options?.local ?? false,
        ...errorUtil.errToObj(options?.message)
      });
    }
    date(message) {
      return this._addCheck({ kind: "date", message });
    }
    time(options) {
      if (typeof options === "string") {
        return this._addCheck({
          kind: "time",
          precision: null,
          message: options
        });
      }
      return this._addCheck({
        kind: "time",
        precision: typeof options?.precision === "undefined" ? null : options?.precision,
        ...errorUtil.errToObj(options?.message)
      });
    }
    duration(message) {
      return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
    }
    regex(regex, message) {
      return this._addCheck({
        kind: "regex",
        regex,
        ...errorUtil.errToObj(message)
      });
    }
    includes(value, options) {
      return this._addCheck({
        kind: "includes",
        value,
        position: options?.position,
        ...errorUtil.errToObj(options?.message)
      });
    }
    startsWith(value, message) {
      return this._addCheck({
        kind: "startsWith",
        value,
        ...errorUtil.errToObj(message)
      });
    }
    endsWith(value, message) {
      return this._addCheck({
        kind: "endsWith",
        value,
        ...errorUtil.errToObj(message)
      });
    }
    min(minLength, message) {
      return this._addCheck({
        kind: "min",
        value: minLength,
        ...errorUtil.errToObj(message)
      });
    }
    max(maxLength, message) {
      return this._addCheck({
        kind: "max",
        value: maxLength,
        ...errorUtil.errToObj(message)
      });
    }
    length(len, message) {
      return this._addCheck({
        kind: "length",
        value: len,
        ...errorUtil.errToObj(message)
      });
    }
    /**
     * Equivalent to `.min(1)`
     */
    nonempty(message) {
      return this.min(1, errorUtil.errToObj(message));
    }
    trim() {
      return new ZodString({
        ...this._def,
        checks: [...this._def.checks, { kind: "trim" }]
      });
    }
    toLowerCase() {
      return new ZodString({
        ...this._def,
        checks: [...this._def.checks, { kind: "toLowerCase" }]
      });
    }
    toUpperCase() {
      return new ZodString({
        ...this._def,
        checks: [...this._def.checks, { kind: "toUpperCase" }]
      });
    }
    get isDatetime() {
      return !!this._def.checks.find((ch) => ch.kind === "datetime");
    }
    get isDate() {
      return !!this._def.checks.find((ch) => ch.kind === "date");
    }
    get isTime() {
      return !!this._def.checks.find((ch) => ch.kind === "time");
    }
    get isDuration() {
      return !!this._def.checks.find((ch) => ch.kind === "duration");
    }
    get isEmail() {
      return !!this._def.checks.find((ch) => ch.kind === "email");
    }
    get isURL() {
      return !!this._def.checks.find((ch) => ch.kind === "url");
    }
    get isEmoji() {
      return !!this._def.checks.find((ch) => ch.kind === "emoji");
    }
    get isUUID() {
      return !!this._def.checks.find((ch) => ch.kind === "uuid");
    }
    get isNANOID() {
      return !!this._def.checks.find((ch) => ch.kind === "nanoid");
    }
    get isCUID() {
      return !!this._def.checks.find((ch) => ch.kind === "cuid");
    }
    get isCUID2() {
      return !!this._def.checks.find((ch) => ch.kind === "cuid2");
    }
    get isULID() {
      return !!this._def.checks.find((ch) => ch.kind === "ulid");
    }
    get isIP() {
      return !!this._def.checks.find((ch) => ch.kind === "ip");
    }
    get isCIDR() {
      return !!this._def.checks.find((ch) => ch.kind === "cidr");
    }
    get isBase64() {
      return !!this._def.checks.find((ch) => ch.kind === "base64");
    }
    get isBase64url() {
      return !!this._def.checks.find((ch) => ch.kind === "base64url");
    }
    get minLength() {
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        }
      }
      return min;
    }
    get maxLength() {
      let max = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return max;
    }
  }
  ZodString.create = (params) => {
    return new ZodString({
      checks: [],
      typeName: ZodFirstPartyTypeKind.ZodString,
      coerce: params?.coerce ?? false,
      ...processCreateParams(params)
    });
  };
  function floatSafeRemainder(val, step) {
    const valDecCount = (val.toString().split(".")[1] || "").length;
    const stepDecCount = (step.toString().split(".")[1] || "").length;
    const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
    const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
    const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
    return valInt % stepInt / 10 ** decCount;
  }
  class ZodNumber extends ZodType {
    constructor() {
      super(...arguments);
      this.min = this.gte;
      this.max = this.lte;
      this.step = this.multipleOf;
    }
    _parse(input) {
      if (this._def.coerce) {
        input.data = Number(input.data);
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.number) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.number,
          received: ctx2.parsedType
        });
        return INVALID;
      }
      let ctx = void 0;
      const status = new ParseStatus();
      for (const check2 of this._def.checks) {
        if (check2.kind === "int") {
          if (!util.isInteger(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_type,
              expected: "integer",
              received: "float",
              message: check2.message
            });
            status.dirty();
          }
        } else if (check2.kind === "min") {
          const tooSmall = check2.inclusive ? input.data < check2.value : input.data <= check2.value;
          if (tooSmall) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check2.value,
              type: "number",
              inclusive: check2.inclusive,
              exact: false,
              message: check2.message
            });
            status.dirty();
          }
        } else if (check2.kind === "max") {
          const tooBig = check2.inclusive ? input.data > check2.value : input.data >= check2.value;
          if (tooBig) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check2.value,
              type: "number",
              inclusive: check2.inclusive,
              exact: false,
              message: check2.message
            });
            status.dirty();
          }
        } else if (check2.kind === "multipleOf") {
          if (floatSafeRemainder(input.data, check2.value) !== 0) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.not_multiple_of,
              multipleOf: check2.value,
              message: check2.message
            });
            status.dirty();
          }
        } else if (check2.kind === "finite") {
          if (!Number.isFinite(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.not_finite,
              message: check2.message
            });
            status.dirty();
          }
        } else {
          util.assertNever(check2);
        }
      }
      return { status: status.value, value: input.data };
    }
    gte(value, message) {
      return this.setLimit("min", value, true, errorUtil.toString(message));
    }
    gt(value, message) {
      return this.setLimit("min", value, false, errorUtil.toString(message));
    }
    lte(value, message) {
      return this.setLimit("max", value, true, errorUtil.toString(message));
    }
    lt(value, message) {
      return this.setLimit("max", value, false, errorUtil.toString(message));
    }
    setLimit(kind, value, inclusive, message) {
      return new ZodNumber({
        ...this._def,
        checks: [
          ...this._def.checks,
          {
            kind,
            value,
            inclusive,
            message: errorUtil.toString(message)
          }
        ]
      });
    }
    _addCheck(check2) {
      return new ZodNumber({
        ...this._def,
        checks: [...this._def.checks, check2]
      });
    }
    int(message) {
      return this._addCheck({
        kind: "int",
        message: errorUtil.toString(message)
      });
    }
    positive(message) {
      return this._addCheck({
        kind: "min",
        value: 0,
        inclusive: false,
        message: errorUtil.toString(message)
      });
    }
    negative(message) {
      return this._addCheck({
        kind: "max",
        value: 0,
        inclusive: false,
        message: errorUtil.toString(message)
      });
    }
    nonpositive(message) {
      return this._addCheck({
        kind: "max",
        value: 0,
        inclusive: true,
        message: errorUtil.toString(message)
      });
    }
    nonnegative(message) {
      return this._addCheck({
        kind: "min",
        value: 0,
        inclusive: true,
        message: errorUtil.toString(message)
      });
    }
    multipleOf(value, message) {
      return this._addCheck({
        kind: "multipleOf",
        value,
        message: errorUtil.toString(message)
      });
    }
    finite(message) {
      return this._addCheck({
        kind: "finite",
        message: errorUtil.toString(message)
      });
    }
    safe(message) {
      return this._addCheck({
        kind: "min",
        inclusive: true,
        value: Number.MIN_SAFE_INTEGER,
        message: errorUtil.toString(message)
      })._addCheck({
        kind: "max",
        inclusive: true,
        value: Number.MAX_SAFE_INTEGER,
        message: errorUtil.toString(message)
      });
    }
    get minValue() {
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        }
      }
      return min;
    }
    get maxValue() {
      let max = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return max;
    }
    get isInt() {
      return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
    }
    get isFinite() {
      let max = null;
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
          return true;
        } else if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        } else if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return Number.isFinite(min) && Number.isFinite(max);
    }
  }
  ZodNumber.create = (params) => {
    return new ZodNumber({
      checks: [],
      typeName: ZodFirstPartyTypeKind.ZodNumber,
      coerce: params?.coerce || false,
      ...processCreateParams(params)
    });
  };
  class ZodBigInt extends ZodType {
    constructor() {
      super(...arguments);
      this.min = this.gte;
      this.max = this.lte;
    }
    _parse(input) {
      if (this._def.coerce) {
        try {
          input.data = BigInt(input.data);
        } catch {
          return this._getInvalidInput(input);
        }
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.bigint) {
        return this._getInvalidInput(input);
      }
      let ctx = void 0;
      const status = new ParseStatus();
      for (const check2 of this._def.checks) {
        if (check2.kind === "min") {
          const tooSmall = check2.inclusive ? input.data < check2.value : input.data <= check2.value;
          if (tooSmall) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              type: "bigint",
              minimum: check2.value,
              inclusive: check2.inclusive,
              message: check2.message
            });
            status.dirty();
          }
        } else if (check2.kind === "max") {
          const tooBig = check2.inclusive ? input.data > check2.value : input.data >= check2.value;
          if (tooBig) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              type: "bigint",
              maximum: check2.value,
              inclusive: check2.inclusive,
              message: check2.message
            });
            status.dirty();
          }
        } else if (check2.kind === "multipleOf") {
          if (input.data % check2.value !== BigInt(0)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.not_multiple_of,
              multipleOf: check2.value,
              message: check2.message
            });
            status.dirty();
          }
        } else {
          util.assertNever(check2);
        }
      }
      return { status: status.value, value: input.data };
    }
    _getInvalidInput(input) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.bigint,
        received: ctx.parsedType
      });
      return INVALID;
    }
    gte(value, message) {
      return this.setLimit("min", value, true, errorUtil.toString(message));
    }
    gt(value, message) {
      return this.setLimit("min", value, false, errorUtil.toString(message));
    }
    lte(value, message) {
      return this.setLimit("max", value, true, errorUtil.toString(message));
    }
    lt(value, message) {
      return this.setLimit("max", value, false, errorUtil.toString(message));
    }
    setLimit(kind, value, inclusive, message) {
      return new ZodBigInt({
        ...this._def,
        checks: [
          ...this._def.checks,
          {
            kind,
            value,
            inclusive,
            message: errorUtil.toString(message)
          }
        ]
      });
    }
    _addCheck(check2) {
      return new ZodBigInt({
        ...this._def,
        checks: [...this._def.checks, check2]
      });
    }
    positive(message) {
      return this._addCheck({
        kind: "min",
        value: BigInt(0),
        inclusive: false,
        message: errorUtil.toString(message)
      });
    }
    negative(message) {
      return this._addCheck({
        kind: "max",
        value: BigInt(0),
        inclusive: false,
        message: errorUtil.toString(message)
      });
    }
    nonpositive(message) {
      return this._addCheck({
        kind: "max",
        value: BigInt(0),
        inclusive: true,
        message: errorUtil.toString(message)
      });
    }
    nonnegative(message) {
      return this._addCheck({
        kind: "min",
        value: BigInt(0),
        inclusive: true,
        message: errorUtil.toString(message)
      });
    }
    multipleOf(value, message) {
      return this._addCheck({
        kind: "multipleOf",
        value,
        message: errorUtil.toString(message)
      });
    }
    get minValue() {
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        }
      }
      return min;
    }
    get maxValue() {
      let max = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return max;
    }
  }
  ZodBigInt.create = (params) => {
    return new ZodBigInt({
      checks: [],
      typeName: ZodFirstPartyTypeKind.ZodBigInt,
      coerce: params?.coerce ?? false,
      ...processCreateParams(params)
    });
  };
  class ZodBoolean extends ZodType {
    _parse(input) {
      if (this._def.coerce) {
        input.data = Boolean(input.data);
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.boolean) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.boolean,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  }
  ZodBoolean.create = (params) => {
    return new ZodBoolean({
      typeName: ZodFirstPartyTypeKind.ZodBoolean,
      coerce: params?.coerce || false,
      ...processCreateParams(params)
    });
  };
  class ZodDate extends ZodType {
    _parse(input) {
      if (this._def.coerce) {
        input.data = new Date(input.data);
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.date) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.date,
          received: ctx2.parsedType
        });
        return INVALID;
      }
      if (Number.isNaN(input.data.getTime())) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_date
        });
        return INVALID;
      }
      const status = new ParseStatus();
      let ctx = void 0;
      for (const check2 of this._def.checks) {
        if (check2.kind === "min") {
          if (input.data.getTime() < check2.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              message: check2.message,
              inclusive: true,
              exact: false,
              minimum: check2.value,
              type: "date"
            });
            status.dirty();
          }
        } else if (check2.kind === "max") {
          if (input.data.getTime() > check2.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              message: check2.message,
              inclusive: true,
              exact: false,
              maximum: check2.value,
              type: "date"
            });
            status.dirty();
          }
        } else {
          util.assertNever(check2);
        }
      }
      return {
        status: status.value,
        value: new Date(input.data.getTime())
      };
    }
    _addCheck(check2) {
      return new ZodDate({
        ...this._def,
        checks: [...this._def.checks, check2]
      });
    }
    min(minDate, message) {
      return this._addCheck({
        kind: "min",
        value: minDate.getTime(),
        message: errorUtil.toString(message)
      });
    }
    max(maxDate, message) {
      return this._addCheck({
        kind: "max",
        value: maxDate.getTime(),
        message: errorUtil.toString(message)
      });
    }
    get minDate() {
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        }
      }
      return min != null ? new Date(min) : null;
    }
    get maxDate() {
      let max = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return max != null ? new Date(max) : null;
    }
  }
  ZodDate.create = (params) => {
    return new ZodDate({
      checks: [],
      coerce: params?.coerce || false,
      typeName: ZodFirstPartyTypeKind.ZodDate,
      ...processCreateParams(params)
    });
  };
  class ZodSymbol extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.symbol) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.symbol,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  }
  ZodSymbol.create = (params) => {
    return new ZodSymbol({
      typeName: ZodFirstPartyTypeKind.ZodSymbol,
      ...processCreateParams(params)
    });
  };
  class ZodUndefined extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.undefined) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.undefined,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  }
  ZodUndefined.create = (params) => {
    return new ZodUndefined({
      typeName: ZodFirstPartyTypeKind.ZodUndefined,
      ...processCreateParams(params)
    });
  };
  class ZodNull extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.null) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.null,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  }
  ZodNull.create = (params) => {
    return new ZodNull({
      typeName: ZodFirstPartyTypeKind.ZodNull,
      ...processCreateParams(params)
    });
  };
  class ZodAny extends ZodType {
    constructor() {
      super(...arguments);
      this._any = true;
    }
    _parse(input) {
      return OK(input.data);
    }
  }
  ZodAny.create = (params) => {
    return new ZodAny({
      typeName: ZodFirstPartyTypeKind.ZodAny,
      ...processCreateParams(params)
    });
  };
  class ZodUnknown extends ZodType {
    constructor() {
      super(...arguments);
      this._unknown = true;
    }
    _parse(input) {
      return OK(input.data);
    }
  }
  ZodUnknown.create = (params) => {
    return new ZodUnknown({
      typeName: ZodFirstPartyTypeKind.ZodUnknown,
      ...processCreateParams(params)
    });
  };
  class ZodNever extends ZodType {
    _parse(input) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.never,
        received: ctx.parsedType
      });
      return INVALID;
    }
  }
  ZodNever.create = (params) => {
    return new ZodNever({
      typeName: ZodFirstPartyTypeKind.ZodNever,
      ...processCreateParams(params)
    });
  };
  class ZodVoid extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.undefined) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.void,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  }
  ZodVoid.create = (params) => {
    return new ZodVoid({
      typeName: ZodFirstPartyTypeKind.ZodVoid,
      ...processCreateParams(params)
    });
  };
  class ZodArray extends ZodType {
    _parse(input) {
      const { ctx, status } = this._processInputParams(input);
      const def = this._def;
      if (ctx.parsedType !== ZodParsedType.array) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.array,
          received: ctx.parsedType
        });
        return INVALID;
      }
      if (def.exactLength !== null) {
        const tooBig = ctx.data.length > def.exactLength.value;
        const tooSmall = ctx.data.length < def.exactLength.value;
        if (tooBig || tooSmall) {
          addIssueToContext(ctx, {
            code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
            minimum: tooSmall ? def.exactLength.value : void 0,
            maximum: tooBig ? def.exactLength.value : void 0,
            type: "array",
            inclusive: true,
            exact: true,
            message: def.exactLength.message
          });
          status.dirty();
        }
      }
      if (def.minLength !== null) {
        if (ctx.data.length < def.minLength.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: def.minLength.value,
            type: "array",
            inclusive: true,
            exact: false,
            message: def.minLength.message
          });
          status.dirty();
        }
      }
      if (def.maxLength !== null) {
        if (ctx.data.length > def.maxLength.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: def.maxLength.value,
            type: "array",
            inclusive: true,
            exact: false,
            message: def.maxLength.message
          });
          status.dirty();
        }
      }
      if (ctx.common.async) {
        return Promise.all([...ctx.data].map((item, i) => {
          return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
        })).then((result2) => {
          return ParseStatus.mergeArray(status, result2);
        });
      }
      const result = [...ctx.data].map((item, i) => {
        return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      });
      return ParseStatus.mergeArray(status, result);
    }
    get element() {
      return this._def.type;
    }
    min(minLength, message) {
      return new ZodArray({
        ...this._def,
        minLength: { value: minLength, message: errorUtil.toString(message) }
      });
    }
    max(maxLength, message) {
      return new ZodArray({
        ...this._def,
        maxLength: { value: maxLength, message: errorUtil.toString(message) }
      });
    }
    length(len, message) {
      return new ZodArray({
        ...this._def,
        exactLength: { value: len, message: errorUtil.toString(message) }
      });
    }
    nonempty(message) {
      return this.min(1, message);
    }
  }
  ZodArray.create = (schema, params) => {
    return new ZodArray({
      type: schema,
      minLength: null,
      maxLength: null,
      exactLength: null,
      typeName: ZodFirstPartyTypeKind.ZodArray,
      ...processCreateParams(params)
    });
  };
  function deepPartialify(schema) {
    if (schema instanceof ZodObject) {
      const newShape = {};
      for (const key in schema.shape) {
        const fieldSchema = schema.shape[key];
        newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
      }
      return new ZodObject({
        ...schema._def,
        shape: () => newShape
      });
    } else if (schema instanceof ZodArray) {
      return new ZodArray({
        ...schema._def,
        type: deepPartialify(schema.element)
      });
    } else if (schema instanceof ZodOptional) {
      return ZodOptional.create(deepPartialify(schema.unwrap()));
    } else if (schema instanceof ZodNullable) {
      return ZodNullable.create(deepPartialify(schema.unwrap()));
    } else if (schema instanceof ZodTuple) {
      return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
    } else {
      return schema;
    }
  }
  class ZodObject extends ZodType {
    constructor() {
      super(...arguments);
      this._cached = null;
      this.nonstrict = this.passthrough;
      this.augment = this.extend;
    }
    _getCached() {
      if (this._cached !== null)
        return this._cached;
      const shape = this._def.shape();
      const keys = util.objectKeys(shape);
      this._cached = { shape, keys };
      return this._cached;
    }
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.object) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.object,
          received: ctx2.parsedType
        });
        return INVALID;
      }
      const { status, ctx } = this._processInputParams(input);
      const { shape, keys: shapeKeys } = this._getCached();
      const extraKeys = [];
      if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
        for (const key in ctx.data) {
          if (!shapeKeys.includes(key)) {
            extraKeys.push(key);
          }
        }
      }
      const pairs = [];
      for (const key of shapeKeys) {
        const keyValidator = shape[key];
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
          alwaysSet: key in ctx.data
        });
      }
      if (this._def.catchall instanceof ZodNever) {
        const unknownKeys = this._def.unknownKeys;
        if (unknownKeys === "passthrough") {
          for (const key of extraKeys) {
            pairs.push({
              key: { status: "valid", value: key },
              value: { status: "valid", value: ctx.data[key] }
            });
          }
        } else if (unknownKeys === "strict") {
          if (extraKeys.length > 0) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.unrecognized_keys,
              keys: extraKeys
            });
            status.dirty();
          }
        } else if (unknownKeys === "strip") ;
        else {
          throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
        }
      } else {
        const catchall = this._def.catchall;
        for (const key of extraKeys) {
          const value = ctx.data[key];
          pairs.push({
            key: { status: "valid", value: key },
            value: catchall._parse(
              new ParseInputLazyPath(ctx, value, ctx.path, key)
              //, ctx.child(key), value, getParsedType(value)
            ),
            alwaysSet: key in ctx.data
          });
        }
      }
      if (ctx.common.async) {
        return Promise.resolve().then(async () => {
          const syncPairs = [];
          for (const pair of pairs) {
            const key = await pair.key;
            const value = await pair.value;
            syncPairs.push({
              key,
              value,
              alwaysSet: pair.alwaysSet
            });
          }
          return syncPairs;
        }).then((syncPairs) => {
          return ParseStatus.mergeObjectSync(status, syncPairs);
        });
      } else {
        return ParseStatus.mergeObjectSync(status, pairs);
      }
    }
    get shape() {
      return this._def.shape();
    }
    strict(message) {
      errorUtil.errToObj;
      return new ZodObject({
        ...this._def,
        unknownKeys: "strict",
        ...message !== void 0 ? {
          errorMap: (issue2, ctx) => {
            const defaultError = this._def.errorMap?.(issue2, ctx).message ?? ctx.defaultError;
            if (issue2.code === "unrecognized_keys")
              return {
                message: errorUtil.errToObj(message).message ?? defaultError
              };
            return {
              message: defaultError
            };
          }
        } : {}
      });
    }
    strip() {
      return new ZodObject({
        ...this._def,
        unknownKeys: "strip"
      });
    }
    passthrough() {
      return new ZodObject({
        ...this._def,
        unknownKeys: "passthrough"
      });
    }
    // const AugmentFactory =
    //   <Def extends ZodObjectDef>(def: Def) =>
    //   <Augmentation extends ZodRawShape>(
    //     augmentation: Augmentation
    //   ): ZodObject<
    //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
    //     Def["unknownKeys"],
    //     Def["catchall"]
    //   > => {
    //     return new ZodObject({
    //       ...def,
    //       shape: () => ({
    //         ...def.shape(),
    //         ...augmentation,
    //       }),
    //     }) as any;
    //   };
    extend(augmentation) {
      return new ZodObject({
        ...this._def,
        shape: () => ({
          ...this._def.shape(),
          ...augmentation
        })
      });
    }
    /**
     * Prior to zod@1.0.12 there was a bug in the
     * inferred type of merged objects. Please
     * upgrade if you are experiencing issues.
     */
    merge(merging) {
      const merged = new ZodObject({
        unknownKeys: merging._def.unknownKeys,
        catchall: merging._def.catchall,
        shape: () => ({
          ...this._def.shape(),
          ...merging._def.shape()
        }),
        typeName: ZodFirstPartyTypeKind.ZodObject
      });
      return merged;
    }
    // merge<
    //   Incoming extends AnyZodObject,
    //   Augmentation extends Incoming["shape"],
    //   NewOutput extends {
    //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
    //       ? Augmentation[k]["_output"]
    //       : k extends keyof Output
    //       ? Output[k]
    //       : never;
    //   },
    //   NewInput extends {
    //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
    //       ? Augmentation[k]["_input"]
    //       : k extends keyof Input
    //       ? Input[k]
    //       : never;
    //   }
    // >(
    //   merging: Incoming
    // ): ZodObject<
    //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
    //   Incoming["_def"]["unknownKeys"],
    //   Incoming["_def"]["catchall"],
    //   NewOutput,
    //   NewInput
    // > {
    //   const merged: any = new ZodObject({
    //     unknownKeys: merging._def.unknownKeys,
    //     catchall: merging._def.catchall,
    //     shape: () =>
    //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
    //     typeName: ZodFirstPartyTypeKind.ZodObject,
    //   }) as any;
    //   return merged;
    // }
    setKey(key, schema) {
      return this.augment({ [key]: schema });
    }
    // merge<Incoming extends AnyZodObject>(
    //   merging: Incoming
    // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
    // ZodObject<
    //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
    //   Incoming["_def"]["unknownKeys"],
    //   Incoming["_def"]["catchall"]
    // > {
    //   // const mergedShape = objectUtil.mergeShapes(
    //   //   this._def.shape(),
    //   //   merging._def.shape()
    //   // );
    //   const merged: any = new ZodObject({
    //     unknownKeys: merging._def.unknownKeys,
    //     catchall: merging._def.catchall,
    //     shape: () =>
    //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
    //     typeName: ZodFirstPartyTypeKind.ZodObject,
    //   }) as any;
    //   return merged;
    // }
    catchall(index) {
      return new ZodObject({
        ...this._def,
        catchall: index
      });
    }
    pick(mask) {
      const shape = {};
      for (const key of util.objectKeys(mask)) {
        if (mask[key] && this.shape[key]) {
          shape[key] = this.shape[key];
        }
      }
      return new ZodObject({
        ...this._def,
        shape: () => shape
      });
    }
    omit(mask) {
      const shape = {};
      for (const key of util.objectKeys(this.shape)) {
        if (!mask[key]) {
          shape[key] = this.shape[key];
        }
      }
      return new ZodObject({
        ...this._def,
        shape: () => shape
      });
    }
    /**
     * @deprecated
     */
    deepPartial() {
      return deepPartialify(this);
    }
    partial(mask) {
      const newShape = {};
      for (const key of util.objectKeys(this.shape)) {
        const fieldSchema = this.shape[key];
        if (mask && !mask[key]) {
          newShape[key] = fieldSchema;
        } else {
          newShape[key] = fieldSchema.optional();
        }
      }
      return new ZodObject({
        ...this._def,
        shape: () => newShape
      });
    }
    required(mask) {
      const newShape = {};
      for (const key of util.objectKeys(this.shape)) {
        if (mask && !mask[key]) {
          newShape[key] = this.shape[key];
        } else {
          const fieldSchema = this.shape[key];
          let newField = fieldSchema;
          while (newField instanceof ZodOptional) {
            newField = newField._def.innerType;
          }
          newShape[key] = newField;
        }
      }
      return new ZodObject({
        ...this._def,
        shape: () => newShape
      });
    }
    keyof() {
      return createZodEnum(util.objectKeys(this.shape));
    }
  }
  ZodObject.create = (shape, params) => {
    return new ZodObject({
      shape: () => shape,
      unknownKeys: "strip",
      catchall: ZodNever.create(),
      typeName: ZodFirstPartyTypeKind.ZodObject,
      ...processCreateParams(params)
    });
  };
  ZodObject.strictCreate = (shape, params) => {
    return new ZodObject({
      shape: () => shape,
      unknownKeys: "strict",
      catchall: ZodNever.create(),
      typeName: ZodFirstPartyTypeKind.ZodObject,
      ...processCreateParams(params)
    });
  };
  ZodObject.lazycreate = (shape, params) => {
    return new ZodObject({
      shape,
      unknownKeys: "strip",
      catchall: ZodNever.create(),
      typeName: ZodFirstPartyTypeKind.ZodObject,
      ...processCreateParams(params)
    });
  };
  class ZodUnion extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      const options = this._def.options;
      function handleResults(results) {
        for (const result of results) {
          if (result.result.status === "valid") {
            return result.result;
          }
        }
        for (const result of results) {
          if (result.result.status === "dirty") {
            ctx.common.issues.push(...result.ctx.common.issues);
            return result.result;
          }
        }
        const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_union,
          unionErrors
        });
        return INVALID;
      }
      if (ctx.common.async) {
        return Promise.all(options.map(async (option) => {
          const childCtx = {
            ...ctx,
            common: {
              ...ctx.common,
              issues: []
            },
            parent: null
          };
          return {
            result: await option._parseAsync({
              data: ctx.data,
              path: ctx.path,
              parent: childCtx
            }),
            ctx: childCtx
          };
        })).then(handleResults);
      } else {
        let dirty = void 0;
        const issues = [];
        for (const option of options) {
          const childCtx = {
            ...ctx,
            common: {
              ...ctx.common,
              issues: []
            },
            parent: null
          };
          const result = option._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          });
          if (result.status === "valid") {
            return result;
          } else if (result.status === "dirty" && !dirty) {
            dirty = { result, ctx: childCtx };
          }
          if (childCtx.common.issues.length) {
            issues.push(childCtx.common.issues);
          }
        }
        if (dirty) {
          ctx.common.issues.push(...dirty.ctx.common.issues);
          return dirty.result;
        }
        const unionErrors = issues.map((issues2) => new ZodError(issues2));
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_union,
          unionErrors
        });
        return INVALID;
      }
    }
    get options() {
      return this._def.options;
    }
  }
  ZodUnion.create = (types2, params) => {
    return new ZodUnion({
      options: types2,
      typeName: ZodFirstPartyTypeKind.ZodUnion,
      ...processCreateParams(params)
    });
  };
  const getDiscriminator = (type2) => {
    if (type2 instanceof ZodLazy) {
      return getDiscriminator(type2.schema);
    } else if (type2 instanceof ZodEffects) {
      return getDiscriminator(type2.innerType());
    } else if (type2 instanceof ZodLiteral) {
      return [type2.value];
    } else if (type2 instanceof ZodEnum) {
      return type2.options;
    } else if (type2 instanceof ZodNativeEnum) {
      return util.objectValues(type2.enum);
    } else if (type2 instanceof ZodDefault) {
      return getDiscriminator(type2._def.innerType);
    } else if (type2 instanceof ZodUndefined) {
      return [void 0];
    } else if (type2 instanceof ZodNull) {
      return [null];
    } else if (type2 instanceof ZodOptional) {
      return [void 0, ...getDiscriminator(type2.unwrap())];
    } else if (type2 instanceof ZodNullable) {
      return [null, ...getDiscriminator(type2.unwrap())];
    } else if (type2 instanceof ZodBranded) {
      return getDiscriminator(type2.unwrap());
    } else if (type2 instanceof ZodReadonly) {
      return getDiscriminator(type2.unwrap());
    } else if (type2 instanceof ZodCatch) {
      return getDiscriminator(type2._def.innerType);
    } else {
      return [];
    }
  };
  class ZodDiscriminatedUnion extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.object) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.object,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const discriminator2 = this.discriminator;
      const discriminatorValue = ctx.data[discriminator2];
      const option = this.optionsMap.get(discriminatorValue);
      if (!option) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_union_discriminator,
          options: Array.from(this.optionsMap.keys()),
          path: [discriminator2]
        });
        return INVALID;
      }
      if (ctx.common.async) {
        return option._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
      } else {
        return option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
      }
    }
    get discriminator() {
      return this._def.discriminator;
    }
    get options() {
      return this._def.options;
    }
    get optionsMap() {
      return this._def.optionsMap;
    }
    /**
     * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
     * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
     * have a different value for each object in the union.
     * @param discriminator the name of the discriminator property
     * @param types an array of object schemas
     * @param params
     */
    static create(discriminator2, options, params) {
      const optionsMap = /* @__PURE__ */ new Map();
      for (const type2 of options) {
        const discriminatorValues = getDiscriminator(type2.shape[discriminator2]);
        if (!discriminatorValues.length) {
          throw new Error(`A discriminator value for key \`${discriminator2}\` could not be extracted from all schema options`);
        }
        for (const value of discriminatorValues) {
          if (optionsMap.has(value)) {
            throw new Error(`Discriminator property ${String(discriminator2)} has duplicate value ${String(value)}`);
          }
          optionsMap.set(value, type2);
        }
      }
      return new ZodDiscriminatedUnion({
        typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
        discriminator: discriminator2,
        options,
        optionsMap,
        ...processCreateParams(params)
      });
    }
  }
  function mergeValues(a, b) {
    const aType = getParsedType(a);
    const bType = getParsedType(b);
    if (a === b) {
      return { valid: true, data: a };
    } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
      const bKeys = util.objectKeys(b);
      const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
      const newObj = { ...a, ...b };
      for (const key of sharedKeys) {
        const sharedValue = mergeValues(a[key], b[key]);
        if (!sharedValue.valid) {
          return { valid: false };
        }
        newObj[key] = sharedValue.data;
      }
      return { valid: true, data: newObj };
    } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
      if (a.length !== b.length) {
        return { valid: false };
      }
      const newArray = [];
      for (let index = 0; index < a.length; index++) {
        const itemA = a[index];
        const itemB = b[index];
        const sharedValue = mergeValues(itemA, itemB);
        if (!sharedValue.valid) {
          return { valid: false };
        }
        newArray.push(sharedValue.data);
      }
      return { valid: true, data: newArray };
    } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
      return { valid: true, data: a };
    } else {
      return { valid: false };
    }
  }
  class ZodIntersection extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      const handleParsed = (parsedLeft, parsedRight) => {
        if (isAborted(parsedLeft) || isAborted(parsedRight)) {
          return INVALID;
        }
        const merged = mergeValues(parsedLeft.value, parsedRight.value);
        if (!merged.valid) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_intersection_types
          });
          return INVALID;
        }
        if (isDirty(parsedLeft) || isDirty(parsedRight)) {
          status.dirty();
        }
        return { status: status.value, value: merged.data };
      };
      if (ctx.common.async) {
        return Promise.all([
          this._def.left._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          }),
          this._def.right._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          })
        ]).then(([left, right]) => handleParsed(left, right));
      } else {
        return handleParsed(this._def.left._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }), this._def.right._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }));
      }
    }
  }
  ZodIntersection.create = (left, right, params) => {
    return new ZodIntersection({
      left,
      right,
      typeName: ZodFirstPartyTypeKind.ZodIntersection,
      ...processCreateParams(params)
    });
  };
  class ZodTuple extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.array) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.array,
          received: ctx.parsedType
        });
        return INVALID;
      }
      if (ctx.data.length < this._def.items.length) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: this._def.items.length,
          inclusive: true,
          exact: false,
          type: "array"
        });
        return INVALID;
      }
      const rest = this._def.rest;
      if (!rest && ctx.data.length > this._def.items.length) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: this._def.items.length,
          inclusive: true,
          exact: false,
          type: "array"
        });
        status.dirty();
      }
      const items2 = [...ctx.data].map((item, itemIndex) => {
        const schema = this._def.items[itemIndex] || this._def.rest;
        if (!schema)
          return null;
        return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
      }).filter((x) => !!x);
      if (ctx.common.async) {
        return Promise.all(items2).then((results) => {
          return ParseStatus.mergeArray(status, results);
        });
      } else {
        return ParseStatus.mergeArray(status, items2);
      }
    }
    get items() {
      return this._def.items;
    }
    rest(rest) {
      return new ZodTuple({
        ...this._def,
        rest
      });
    }
  }
  ZodTuple.create = (schemas, params) => {
    if (!Array.isArray(schemas)) {
      throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
    }
    return new ZodTuple({
      items: schemas,
      typeName: ZodFirstPartyTypeKind.ZodTuple,
      rest: null,
      ...processCreateParams(params)
    });
  };
  class ZodRecord extends ZodType {
    get keySchema() {
      return this._def.keyType;
    }
    get valueSchema() {
      return this._def.valueType;
    }
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.object) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.object,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const pairs = [];
      const keyType = this._def.keyType;
      const valueType = this._def.valueType;
      for (const key in ctx.data) {
        pairs.push({
          key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
          value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
          alwaysSet: key in ctx.data
        });
      }
      if (ctx.common.async) {
        return ParseStatus.mergeObjectAsync(status, pairs);
      } else {
        return ParseStatus.mergeObjectSync(status, pairs);
      }
    }
    get element() {
      return this._def.valueType;
    }
    static create(first, second, third) {
      if (second instanceof ZodType) {
        return new ZodRecord({
          keyType: first,
          valueType: second,
          typeName: ZodFirstPartyTypeKind.ZodRecord,
          ...processCreateParams(third)
        });
      }
      return new ZodRecord({
        keyType: ZodString.create(),
        valueType: first,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(second)
      });
    }
  }
  class ZodMap extends ZodType {
    get keySchema() {
      return this._def.keyType;
    }
    get valueSchema() {
      return this._def.valueType;
    }
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.map) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.map,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const keyType = this._def.keyType;
      const valueType = this._def.valueType;
      const pairs = [...ctx.data.entries()].map(([key, value], index) => {
        return {
          key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
          value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
        };
      });
      if (ctx.common.async) {
        const finalMap = /* @__PURE__ */ new Map();
        return Promise.resolve().then(async () => {
          for (const pair of pairs) {
            const key = await pair.key;
            const value = await pair.value;
            if (key.status === "aborted" || value.status === "aborted") {
              return INVALID;
            }
            if (key.status === "dirty" || value.status === "dirty") {
              status.dirty();
            }
            finalMap.set(key.value, value.value);
          }
          return { status: status.value, value: finalMap };
        });
      } else {
        const finalMap = /* @__PURE__ */ new Map();
        for (const pair of pairs) {
          const key = pair.key;
          const value = pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      }
    }
  }
  ZodMap.create = (keyType, valueType, params) => {
    return new ZodMap({
      valueType,
      keyType,
      typeName: ZodFirstPartyTypeKind.ZodMap,
      ...processCreateParams(params)
    });
  };
  class ZodSet extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.set) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.set,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const def = this._def;
      if (def.minSize !== null) {
        if (ctx.data.size < def.minSize.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: def.minSize.value,
            type: "set",
            inclusive: true,
            exact: false,
            message: def.minSize.message
          });
          status.dirty();
        }
      }
      if (def.maxSize !== null) {
        if (ctx.data.size > def.maxSize.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: def.maxSize.value,
            type: "set",
            inclusive: true,
            exact: false,
            message: def.maxSize.message
          });
          status.dirty();
        }
      }
      const valueType = this._def.valueType;
      function finalizeSet(elements2) {
        const parsedSet = /* @__PURE__ */ new Set();
        for (const element of elements2) {
          if (element.status === "aborted")
            return INVALID;
          if (element.status === "dirty")
            status.dirty();
          parsedSet.add(element.value);
        }
        return { status: status.value, value: parsedSet };
      }
      const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
      if (ctx.common.async) {
        return Promise.all(elements).then((elements2) => finalizeSet(elements2));
      } else {
        return finalizeSet(elements);
      }
    }
    min(minSize, message) {
      return new ZodSet({
        ...this._def,
        minSize: { value: minSize, message: errorUtil.toString(message) }
      });
    }
    max(maxSize, message) {
      return new ZodSet({
        ...this._def,
        maxSize: { value: maxSize, message: errorUtil.toString(message) }
      });
    }
    size(size, message) {
      return this.min(size, message).max(size, message);
    }
    nonempty(message) {
      return this.min(1, message);
    }
  }
  ZodSet.create = (valueType, params) => {
    return new ZodSet({
      valueType,
      minSize: null,
      maxSize: null,
      typeName: ZodFirstPartyTypeKind.ZodSet,
      ...processCreateParams(params)
    });
  };
  class ZodFunction extends ZodType {
    constructor() {
      super(...arguments);
      this.validate = this.implement;
    }
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.function) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.function,
          received: ctx.parsedType
        });
        return INVALID;
      }
      function makeArgsIssue(args, error) {
        return makeIssue({
          data: args,
          path: ctx.path,
          errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), errorMap].filter((x) => !!x),
          issueData: {
            code: ZodIssueCode.invalid_arguments,
            argumentsError: error
          }
        });
      }
      function makeReturnsIssue(returns, error) {
        return makeIssue({
          data: returns,
          path: ctx.path,
          errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), errorMap].filter((x) => !!x),
          issueData: {
            code: ZodIssueCode.invalid_return_type,
            returnTypeError: error
          }
        });
      }
      const params = { errorMap: ctx.common.contextualErrorMap };
      const fn = ctx.data;
      if (this._def.returns instanceof ZodPromise) {
        const me = this;
        return OK(async function(...args) {
          const error = new ZodError([]);
          const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
            error.addIssue(makeArgsIssue(args, e));
            throw error;
          });
          const result = await Reflect.apply(fn, this, parsedArgs);
          const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
            error.addIssue(makeReturnsIssue(result, e));
            throw error;
          });
          return parsedReturns;
        });
      } else {
        const me = this;
        return OK(function(...args) {
          const parsedArgs = me._def.args.safeParse(args, params);
          if (!parsedArgs.success) {
            throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
          }
          const result = Reflect.apply(fn, this, parsedArgs.data);
          const parsedReturns = me._def.returns.safeParse(result, params);
          if (!parsedReturns.success) {
            throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
          }
          return parsedReturns.data;
        });
      }
    }
    parameters() {
      return this._def.args;
    }
    returnType() {
      return this._def.returns;
    }
    args(...items2) {
      return new ZodFunction({
        ...this._def,
        args: ZodTuple.create(items2).rest(ZodUnknown.create())
      });
    }
    returns(returnType) {
      return new ZodFunction({
        ...this._def,
        returns: returnType
      });
    }
    implement(func) {
      const validatedFunc = this.parse(func);
      return validatedFunc;
    }
    strictImplement(func) {
      const validatedFunc = this.parse(func);
      return validatedFunc;
    }
    static create(args, returns, params) {
      return new ZodFunction({
        args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
        returns: returns || ZodUnknown.create(),
        typeName: ZodFirstPartyTypeKind.ZodFunction,
        ...processCreateParams(params)
      });
    }
  }
  class ZodLazy extends ZodType {
    get schema() {
      return this._def.getter();
    }
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      const lazySchema = this._def.getter();
      return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
    }
  }
  ZodLazy.create = (getter, params) => {
    return new ZodLazy({
      getter,
      typeName: ZodFirstPartyTypeKind.ZodLazy,
      ...processCreateParams(params)
    });
  };
  class ZodLiteral extends ZodType {
    _parse(input) {
      if (input.data !== this._def.value) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          received: ctx.data,
          code: ZodIssueCode.invalid_literal,
          expected: this._def.value
        });
        return INVALID;
      }
      return { status: "valid", value: input.data };
    }
    get value() {
      return this._def.value;
    }
  }
  ZodLiteral.create = (value, params) => {
    return new ZodLiteral({
      value,
      typeName: ZodFirstPartyTypeKind.ZodLiteral,
      ...processCreateParams(params)
    });
  };
  function createZodEnum(values, params) {
    return new ZodEnum({
      values,
      typeName: ZodFirstPartyTypeKind.ZodEnum,
      ...processCreateParams(params)
    });
  }
  class ZodEnum extends ZodType {
    _parse(input) {
      if (typeof input.data !== "string") {
        const ctx = this._getOrReturnCtx(input);
        const expectedValues = this._def.values;
        addIssueToContext(ctx, {
          expected: util.joinValues(expectedValues),
          received: ctx.parsedType,
          code: ZodIssueCode.invalid_type
        });
        return INVALID;
      }
      if (!this._cache) {
        this._cache = new Set(this._def.values);
      }
      if (!this._cache.has(input.data)) {
        const ctx = this._getOrReturnCtx(input);
        const expectedValues = this._def.values;
        addIssueToContext(ctx, {
          received: ctx.data,
          code: ZodIssueCode.invalid_enum_value,
          options: expectedValues
        });
        return INVALID;
      }
      return OK(input.data);
    }
    get options() {
      return this._def.values;
    }
    get enum() {
      const enumValues = {};
      for (const val of this._def.values) {
        enumValues[val] = val;
      }
      return enumValues;
    }
    get Values() {
      const enumValues = {};
      for (const val of this._def.values) {
        enumValues[val] = val;
      }
      return enumValues;
    }
    get Enum() {
      const enumValues = {};
      for (const val of this._def.values) {
        enumValues[val] = val;
      }
      return enumValues;
    }
    extract(values, newDef = this._def) {
      return ZodEnum.create(values, {
        ...this._def,
        ...newDef
      });
    }
    exclude(values, newDef = this._def) {
      return ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
        ...this._def,
        ...newDef
      });
    }
  }
  ZodEnum.create = createZodEnum;
  class ZodNativeEnum extends ZodType {
    _parse(input) {
      const nativeEnumValues = util.getValidEnumValues(this._def.values);
      const ctx = this._getOrReturnCtx(input);
      if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
        const expectedValues = util.objectValues(nativeEnumValues);
        addIssueToContext(ctx, {
          expected: util.joinValues(expectedValues),
          received: ctx.parsedType,
          code: ZodIssueCode.invalid_type
        });
        return INVALID;
      }
      if (!this._cache) {
        this._cache = new Set(util.getValidEnumValues(this._def.values));
      }
      if (!this._cache.has(input.data)) {
        const expectedValues = util.objectValues(nativeEnumValues);
        addIssueToContext(ctx, {
          received: ctx.data,
          code: ZodIssueCode.invalid_enum_value,
          options: expectedValues
        });
        return INVALID;
      }
      return OK(input.data);
    }
    get enum() {
      return this._def.values;
    }
  }
  ZodNativeEnum.create = (values, params) => {
    return new ZodNativeEnum({
      values,
      typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
      ...processCreateParams(params)
    });
  };
  class ZodPromise extends ZodType {
    unwrap() {
      return this._def.type;
    }
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.promise,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
      return OK(promisified.then((data) => {
        return this._def.type.parseAsync(data, {
          path: ctx.path,
          errorMap: ctx.common.contextualErrorMap
        });
      }));
    }
  }
  ZodPromise.create = (schema, params) => {
    return new ZodPromise({
      type: schema,
      typeName: ZodFirstPartyTypeKind.ZodPromise,
      ...processCreateParams(params)
    });
  };
  class ZodEffects extends ZodType {
    innerType() {
      return this._def.schema;
    }
    sourceType() {
      return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
    }
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      const effect = this._def.effect || null;
      const checkCtx = {
        addIssue: (arg) => {
          addIssueToContext(ctx, arg);
          if (arg.fatal) {
            status.abort();
          } else {
            status.dirty();
          }
        },
        get path() {
          return ctx.path;
        }
      };
      checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
      if (effect.type === "preprocess") {
        const processed = effect.transform(ctx.data, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(processed).then(async (processed2) => {
            if (status.value === "aborted")
              return INVALID;
            const result = await this._def.schema._parseAsync({
              data: processed2,
              path: ctx.path,
              parent: ctx
            });
            if (result.status === "aborted")
              return INVALID;
            if (result.status === "dirty")
              return DIRTY(result.value);
            if (status.value === "dirty")
              return DIRTY(result.value);
            return result;
          });
        } else {
          if (status.value === "aborted")
            return INVALID;
          const result = this._def.schema._parseSync({
            data: processed,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        }
      }
      if (effect.type === "refinement") {
        const executeRefinement = (acc) => {
          const result = effect.refinement(acc, checkCtx);
          if (ctx.common.async) {
            return Promise.resolve(result);
          }
          if (result instanceof Promise) {
            throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
          }
          return acc;
        };
        if (ctx.common.async === false) {
          const inner = this._def.schema._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          executeRefinement(inner.value);
          return { status: status.value, value: inner.value };
        } else {
          return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
            if (inner.status === "aborted")
              return INVALID;
            if (inner.status === "dirty")
              status.dirty();
            return executeRefinement(inner.value).then(() => {
              return { status: status.value, value: inner.value };
            });
          });
        }
      }
      if (effect.type === "transform") {
        if (ctx.common.async === false) {
          const base = this._def.schema._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
          if (!isValid(base))
            return INVALID;
          const result = effect.transform(base.value, checkCtx);
          if (result instanceof Promise) {
            throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
          }
          return { status: status.value, value: result };
        } else {
          return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
            if (!isValid(base))
              return INVALID;
            return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
              status: status.value,
              value: result
            }));
          });
        }
      }
      util.assertNever(effect);
    }
  }
  ZodEffects.create = (schema, effect, params) => {
    return new ZodEffects({
      schema,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect,
      ...processCreateParams(params)
    });
  };
  ZodEffects.createWithPreprocess = (preprocess2, schema, params) => {
    return new ZodEffects({
      schema,
      effect: { type: "preprocess", transform: preprocess2 },
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      ...processCreateParams(params)
    });
  };
  class ZodOptional extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType === ZodParsedType.undefined) {
        return OK(void 0);
      }
      return this._def.innerType._parse(input);
    }
    unwrap() {
      return this._def.innerType;
    }
  }
  ZodOptional.create = (type2, params) => {
    return new ZodOptional({
      innerType: type2,
      typeName: ZodFirstPartyTypeKind.ZodOptional,
      ...processCreateParams(params)
    });
  };
  class ZodNullable extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType === ZodParsedType.null) {
        return OK(null);
      }
      return this._def.innerType._parse(input);
    }
    unwrap() {
      return this._def.innerType;
    }
  }
  ZodNullable.create = (type2, params) => {
    return new ZodNullable({
      innerType: type2,
      typeName: ZodFirstPartyTypeKind.ZodNullable,
      ...processCreateParams(params)
    });
  };
  class ZodDefault extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      let data = ctx.data;
      if (ctx.parsedType === ZodParsedType.undefined) {
        data = this._def.defaultValue();
      }
      return this._def.innerType._parse({
        data,
        path: ctx.path,
        parent: ctx
      });
    }
    removeDefault() {
      return this._def.innerType;
    }
  }
  ZodDefault.create = (type2, params) => {
    return new ZodDefault({
      innerType: type2,
      typeName: ZodFirstPartyTypeKind.ZodDefault,
      defaultValue: typeof params.default === "function" ? params.default : () => params.default,
      ...processCreateParams(params)
    });
  };
  class ZodCatch extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      const newCtx = {
        ...ctx,
        common: {
          ...ctx.common,
          issues: []
        }
      };
      const result = this._def.innerType._parse({
        data: newCtx.data,
        path: newCtx.path,
        parent: {
          ...newCtx
        }
      });
      if (isAsync(result)) {
        return result.then((result2) => {
          return {
            status: "valid",
            value: result2.status === "valid" ? result2.value : this._def.catchValue({
              get error() {
                return new ZodError(newCtx.common.issues);
              },
              input: newCtx.data
            })
          };
        });
      } else {
        return {
          status: "valid",
          value: result.status === "valid" ? result.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      }
    }
    removeCatch() {
      return this._def.innerType;
    }
  }
  ZodCatch.create = (type2, params) => {
    return new ZodCatch({
      innerType: type2,
      typeName: ZodFirstPartyTypeKind.ZodCatch,
      catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
      ...processCreateParams(params)
    });
  };
  class ZodNaN extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.nan) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.nan,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return { status: "valid", value: input.data };
    }
  }
  ZodNaN.create = (params) => {
    return new ZodNaN({
      typeName: ZodFirstPartyTypeKind.ZodNaN,
      ...processCreateParams(params)
    });
  };
  const BRAND = Symbol("zod_brand");
  class ZodBranded extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      const data = ctx.data;
      return this._def.type._parse({
        data,
        path: ctx.path,
        parent: ctx
      });
    }
    unwrap() {
      return this._def.type;
    }
  }
  class ZodPipeline extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.common.async) {
        const handleAsync = async () => {
          const inResult = await this._def.in._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
          if (inResult.status === "aborted")
            return INVALID;
          if (inResult.status === "dirty") {
            status.dirty();
            return DIRTY(inResult.value);
          } else {
            return this._def.out._parseAsync({
              data: inResult.value,
              path: ctx.path,
              parent: ctx
            });
          }
        };
        return handleAsync();
      } else {
        const inResult = this._def.in._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return {
            status: "dirty",
            value: inResult.value
          };
        } else {
          return this._def.out._parseSync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      }
    }
    static create(a, b) {
      return new ZodPipeline({
        in: a,
        out: b,
        typeName: ZodFirstPartyTypeKind.ZodPipeline
      });
    }
  }
  class ZodReadonly extends ZodType {
    _parse(input) {
      const result = this._def.innerType._parse(input);
      const freeze = (data) => {
        if (isValid(data)) {
          data.value = Object.freeze(data.value);
        }
        return data;
      };
      return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
    }
    unwrap() {
      return this._def.innerType;
    }
  }
  ZodReadonly.create = (type2, params) => {
    return new ZodReadonly({
      innerType: type2,
      typeName: ZodFirstPartyTypeKind.ZodReadonly,
      ...processCreateParams(params)
    });
  };
  function cleanParams(params, data) {
    const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
    const p2 = typeof p === "string" ? { message: p } : p;
    return p2;
  }
  function custom(check2, _params = {}, fatal) {
    if (check2)
      return ZodAny.create().superRefine((data, ctx) => {
        const r = check2(data);
        if (r instanceof Promise) {
          return r.then((r2) => {
            if (!r2) {
              const params = cleanParams(_params, data);
              const _fatal = params.fatal ?? fatal ?? true;
              ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
            }
          });
        }
        if (!r) {
          const params = cleanParams(_params, data);
          const _fatal = params.fatal ?? fatal ?? true;
          ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
        }
        return;
      });
    return ZodAny.create();
  }
  const late = {
    object: ZodObject.lazycreate
  };
  var ZodFirstPartyTypeKind;
  (function(ZodFirstPartyTypeKind2) {
    ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
    ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
    ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
    ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
    ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
    ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
    ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
    ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
    ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
    ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
    ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
    ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
    ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
    ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
    ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
    ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
    ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
    ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
    ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
    ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
    ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
    ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
    ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
    ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
    ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
    ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
    ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
    ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
    ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
    ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
    ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
    ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
    ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
    ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
    ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
    ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
  })(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
  const instanceOfType = (cls, params = {
    message: `Input not instance of ${cls.name}`
  }) => custom((data) => data instanceof cls, params);
  const stringType = ZodString.create;
  const numberType = ZodNumber.create;
  const nanType = ZodNaN.create;
  const bigIntType = ZodBigInt.create;
  const booleanType = ZodBoolean.create;
  const dateType = ZodDate.create;
  const symbolType = ZodSymbol.create;
  const undefinedType = ZodUndefined.create;
  const nullType = ZodNull.create;
  const anyType = ZodAny.create;
  const unknownType = ZodUnknown.create;
  const neverType = ZodNever.create;
  const voidType = ZodVoid.create;
  const arrayType = ZodArray.create;
  const objectType = ZodObject.create;
  const strictObjectType = ZodObject.strictCreate;
  const unionType = ZodUnion.create;
  const discriminatedUnionType = ZodDiscriminatedUnion.create;
  const intersectionType = ZodIntersection.create;
  const tupleType = ZodTuple.create;
  const recordType = ZodRecord.create;
  const mapType = ZodMap.create;
  const setType = ZodSet.create;
  const functionType = ZodFunction.create;
  const lazyType = ZodLazy.create;
  const literalType = ZodLiteral.create;
  const enumType = ZodEnum.create;
  const nativeEnumType = ZodNativeEnum.create;
  const promiseType = ZodPromise.create;
  const effectsType = ZodEffects.create;
  const optionalType = ZodOptional.create;
  const nullableType = ZodNullable.create;
  const preprocessType = ZodEffects.createWithPreprocess;
  const pipelineType = ZodPipeline.create;
  const ostring = () => stringType().optional();
  const onumber = () => numberType().optional();
  const oboolean = () => booleanType().optional();
  const coerce = {
    string: (arg) => ZodString.create({ ...arg, coerce: true }),
    number: (arg) => ZodNumber.create({ ...arg, coerce: true }),
    boolean: (arg) => ZodBoolean.create({
      ...arg,
      coerce: true
    }),
    bigint: (arg) => ZodBigInt.create({ ...arg, coerce: true }),
    date: (arg) => ZodDate.create({ ...arg, coerce: true })
  };
  const NEVER = INVALID;
  const z = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    BRAND,
    DIRTY,
    EMPTY_PATH,
    INVALID,
    NEVER,
    OK,
    ParseStatus,
    Schema: ZodType,
    ZodAny,
    ZodArray,
    ZodBigInt,
    ZodBoolean,
    ZodBranded,
    ZodCatch,
    ZodDate,
    ZodDefault,
    ZodDiscriminatedUnion,
    ZodEffects,
    ZodEnum,
    ZodError,
    get ZodFirstPartyTypeKind() {
      return ZodFirstPartyTypeKind;
    },
    ZodFunction,
    ZodIntersection,
    ZodIssueCode,
    ZodLazy,
    ZodLiteral,
    ZodMap,
    ZodNaN,
    ZodNativeEnum,
    ZodNever,
    ZodNull,
    ZodNullable,
    ZodNumber,
    ZodObject,
    ZodOptional,
    ZodParsedType,
    ZodPipeline,
    ZodPromise,
    ZodReadonly,
    ZodRecord,
    ZodSchema: ZodType,
    ZodSet,
    ZodString,
    ZodSymbol,
    ZodTransformer: ZodEffects,
    ZodTuple,
    ZodType,
    ZodUndefined,
    ZodUnion,
    ZodUnknown,
    ZodVoid,
    addIssueToContext,
    any: anyType,
    array: arrayType,
    bigint: bigIntType,
    boolean: booleanType,
    coerce,
    custom,
    date: dateType,
    datetimeRegex,
    defaultErrorMap: errorMap,
    discriminatedUnion: discriminatedUnionType,
    effect: effectsType,
    enum: enumType,
    function: functionType,
    getErrorMap,
    getParsedType,
    instanceof: instanceOfType,
    intersection: intersectionType,
    isAborted,
    isAsync,
    isDirty,
    isValid,
    late,
    lazy: lazyType,
    literal: literalType,
    makeIssue,
    map: mapType,
    nan: nanType,
    nativeEnum: nativeEnumType,
    never: neverType,
    null: nullType,
    nullable: nullableType,
    number: numberType,
    object: objectType,
    get objectUtil() {
      return objectUtil;
    },
    oboolean,
    onumber,
    optional: optionalType,
    ostring,
    pipeline: pipelineType,
    preprocess: preprocessType,
    promise: promiseType,
    quotelessJson,
    record: recordType,
    set: setType,
    setErrorMap,
    strictObject: strictObjectType,
    string: stringType,
    symbol: symbolType,
    transformer: effectsType,
    tuple: tupleType,
    undefined: undefinedType,
    union: unionType,
    unknown: unknownType,
    get util() {
      return util;
    },
    void: voidType
  }, Symbol.toStringTag, { value: "Module" }));
  const ZodMiniType = /* @__PURE__ */ $constructor("ZodMiniType", (inst, def) => {
    if (!inst._zod)
      throw new Error("Uninitialized schema in ZodMiniType.");
    $ZodType.init(inst, def);
    inst.def = def;
    inst.parse = (data, params) => parse$1(inst, data, params, { callee: inst.parse });
    inst.safeParse = (data, params) => safeParse$2(inst, data, params);
    inst.parseAsync = async (data, params) => parseAsync$1(inst, data, params, { callee: inst.parseAsync });
    inst.safeParseAsync = async (data, params) => safeParseAsync$2(inst, data, params);
    inst.check = (...checks) => {
      return inst.clone(
        {
          ...def,
          checks: [
            ...def.checks ?? [],
            ...checks.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch)
          ]
        }
        // { parent: true }
      );
    };
    inst.clone = (_def, params) => clone(inst, _def, params);
    inst.brand = () => inst;
    inst.register = (reg, meta) => {
      reg.add(inst, meta);
      return inst;
    };
  });
  const ZodMiniObject = /* @__PURE__ */ $constructor("ZodMiniObject", (inst, def) => {
    $ZodObject.init(inst, def);
    ZodMiniType.init(inst, def);
    defineLazy(inst, "shape", () => def.shape);
  });
  function object(shape, params) {
    const def = {
      type: "object",
      get shape() {
        assignProp(this, "shape", { ...shape });
        return this.shape;
      },
      ...normalizeParams(params)
    };
    return new ZodMiniObject(def);
  }
  function isZ4Schema(s) {
    const schema = s;
    return !!schema._zod;
  }
  function objectFromShape(shape) {
    const values = Object.values(shape);
    if (values.length === 0)
      return object({});
    const allV4 = values.every(isZ4Schema);
    const allV3 = values.every((s) => !isZ4Schema(s));
    if (allV4)
      return object(shape);
    if (allV3)
      return objectType(shape);
    throw new Error("Mixed Zod versions detected in object shape.");
  }
  function safeParse(schema, data) {
    if (isZ4Schema(schema)) {
      const result2 = safeParse$2(schema, data);
      return result2;
    }
    const v3Schema = schema;
    const result = v3Schema.safeParse(data);
    return result;
  }
  async function safeParseAsync(schema, data) {
    if (isZ4Schema(schema)) {
      const result2 = await safeParseAsync$2(schema, data);
      return result2;
    }
    const v3Schema = schema;
    const result = await v3Schema.safeParseAsync(data);
    return result;
  }
  function getObjectShape(schema) {
    var _a, _b;
    if (!schema)
      return void 0;
    let rawShape;
    if (isZ4Schema(schema)) {
      const v4Schema = schema;
      rawShape = (_b = (_a = v4Schema._zod) === null || _a === void 0 ? void 0 : _a.def) === null || _b === void 0 ? void 0 : _b.shape;
    } else {
      const v3Schema = schema;
      rawShape = v3Schema.shape;
    }
    if (!rawShape)
      return void 0;
    if (typeof rawShape === "function") {
      try {
        return rawShape();
      } catch (_c) {
        return void 0;
      }
    }
    return rawShape;
  }
  function normalizeObjectSchema(schema) {
    var _a;
    if (!schema)
      return void 0;
    if (typeof schema === "object") {
      const asV3 = schema;
      const asV4 = schema;
      if (!asV3._def && !asV4._zod) {
        const values = Object.values(schema);
        if (values.length > 0 && values.every((v) => typeof v === "object" && v !== null && (v._def !== void 0 || v._zod !== void 0 || typeof v.parse === "function"))) {
          return objectFromShape(schema);
        }
      }
    }
    if (isZ4Schema(schema)) {
      const v4Schema = schema;
      const def = (_a = v4Schema._zod) === null || _a === void 0 ? void 0 : _a.def;
      if (def && (def.type === "object" || def.shape !== void 0)) {
        return schema;
      }
    } else {
      const v3Schema = schema;
      if (v3Schema.shape !== void 0) {
        return schema;
      }
    }
    return void 0;
  }
  function getParseErrorMessage(error) {
    if (error && typeof error === "object") {
      if ("message" in error && typeof error.message === "string") {
        return error.message;
      }
      if ("issues" in error && Array.isArray(error.issues) && error.issues.length > 0) {
        const firstIssue = error.issues[0];
        if (firstIssue && typeof firstIssue === "object" && "message" in firstIssue) {
          return String(firstIssue.message);
        }
      }
      try {
        return JSON.stringify(error);
      } catch (_a) {
        return String(error);
      }
    }
    return String(error);
  }
  function getSchemaDescription(schema) {
    var _a, _b, _c, _d;
    if (isZ4Schema(schema)) {
      const v4Schema = schema;
      return (_b = (_a = v4Schema._zod) === null || _a === void 0 ? void 0 : _a.def) === null || _b === void 0 ? void 0 : _b.description;
    }
    const v3Schema = schema;
    return (_c = schema.description) !== null && _c !== void 0 ? _c : (_d = v3Schema._def) === null || _d === void 0 ? void 0 : _d.description;
  }
  function isSchemaOptional(schema) {
    var _a, _b, _c;
    if (isZ4Schema(schema)) {
      const v4Schema = schema;
      return ((_b = (_a = v4Schema._zod) === null || _a === void 0 ? void 0 : _a.def) === null || _b === void 0 ? void 0 : _b.type) === "optional";
    }
    const v3Schema = schema;
    if (typeof schema.isOptional === "function") {
      return schema.isOptional();
    }
    return ((_c = v3Schema._def) === null || _c === void 0 ? void 0 : _c.typeName) === "ZodOptional";
  }
  function getLiteralValue(schema) {
    var _a;
    if (isZ4Schema(schema)) {
      const v4Schema = schema;
      const def2 = (_a = v4Schema._zod) === null || _a === void 0 ? void 0 : _a.def;
      if (def2) {
        if (def2.value !== void 0)
          return def2.value;
        if (Array.isArray(def2.values) && def2.values.length > 0) {
          return def2.values[0];
        }
      }
    }
    const v3Schema = schema;
    const def = v3Schema._def;
    if (def) {
      if (def.value !== void 0)
        return def.value;
      if (Array.isArray(def.values) && def.values.length > 0) {
        return def.values[0];
      }
    }
    const directValue = schema.value;
    if (directValue !== void 0)
      return directValue;
    return void 0;
  }
  function isTerminal(status) {
    return status === "completed" || status === "failed" || status === "cancelled";
  }
  const ignoreOverride = Symbol("Let zodToJsonSchema decide on which parser to use");
  const defaultOptions = {
    name: void 0,
    $refStrategy: "root",
    basePath: ["#"],
    effectStrategy: "input",
    pipeStrategy: "all",
    dateStrategy: "format:date-time",
    mapStrategy: "entries",
    removeAdditionalStrategy: "passthrough",
    allowedAdditionalProperties: true,
    rejectedAdditionalProperties: false,
    definitionPath: "definitions",
    target: "jsonSchema7",
    strictUnions: false,
    definitions: {},
    errorMessages: false,
    markdownDescription: false,
    patternStrategy: "escape",
    applyRegexFlags: false,
    emailStrategy: "format:email",
    base64Strategy: "contentEncoding:base64",
    nameStrategy: "ref",
    openAiAnyTypeName: "OpenAiAnyType"
  };
  const getDefaultOptions = (options) => typeof options === "string" ? {
    ...defaultOptions,
    name: options
  } : {
    ...defaultOptions,
    ...options
  };
  const getRefs = (options) => {
    const _options = getDefaultOptions(options);
    const currentPath = _options.name !== void 0 ? [..._options.basePath, _options.definitionPath, _options.name] : _options.basePath;
    return {
      ..._options,
      flags: { hasReferencedOpenAiAnyType: false },
      currentPath,
      propertyPath: void 0,
      seen: new Map(Object.entries(_options.definitions).map(([name, def]) => [
        def._def,
        {
          def: def._def,
          path: [..._options.basePath, _options.definitionPath, name],
          // Resolution of references will be forced even though seen, so it's ok that the schema is undefined here for now.
          jsonSchema: void 0
        }
      ]))
    };
  };
  function addErrorMessage(res, key, errorMessage, refs) {
    if (!refs?.errorMessages)
      return;
    if (errorMessage) {
      res.errorMessage = {
        ...res.errorMessage,
        [key]: errorMessage
      };
    }
  }
  function setResponseValueAndErrors(res, key, value, errorMessage, refs) {
    res[key] = value;
    addErrorMessage(res, key, errorMessage, refs);
  }
  const getRelativePath = (pathA, pathB) => {
    let i = 0;
    for (; i < pathA.length && i < pathB.length; i++) {
      if (pathA[i] !== pathB[i])
        break;
    }
    return [(pathA.length - i).toString(), ...pathB.slice(i)].join("/");
  };
  function parseAnyDef(refs) {
    if (refs.target !== "openAi") {
      return {};
    }
    const anyDefinitionPath = [
      ...refs.basePath,
      refs.definitionPath,
      refs.openAiAnyTypeName
    ];
    refs.flags.hasReferencedOpenAiAnyType = true;
    return {
      $ref: refs.$refStrategy === "relative" ? getRelativePath(anyDefinitionPath, refs.currentPath) : anyDefinitionPath.join("/")
    };
  }
  function parseArrayDef(def, refs) {
    const res = {
      type: "array"
    };
    if (def.type?._def && def.type?._def?.typeName !== ZodFirstPartyTypeKind.ZodAny) {
      res.items = parseDef(def.type._def, {
        ...refs,
        currentPath: [...refs.currentPath, "items"]
      });
    }
    if (def.minLength) {
      setResponseValueAndErrors(res, "minItems", def.minLength.value, def.minLength.message, refs);
    }
    if (def.maxLength) {
      setResponseValueAndErrors(res, "maxItems", def.maxLength.value, def.maxLength.message, refs);
    }
    if (def.exactLength) {
      setResponseValueAndErrors(res, "minItems", def.exactLength.value, def.exactLength.message, refs);
      setResponseValueAndErrors(res, "maxItems", def.exactLength.value, def.exactLength.message, refs);
    }
    return res;
  }
  function parseBigintDef(def, refs) {
    const res = {
      type: "integer",
      format: "int64"
    };
    if (!def.checks)
      return res;
    for (const check2 of def.checks) {
      switch (check2.kind) {
        case "min":
          if (refs.target === "jsonSchema7") {
            if (check2.inclusive) {
              setResponseValueAndErrors(res, "minimum", check2.value, check2.message, refs);
            } else {
              setResponseValueAndErrors(res, "exclusiveMinimum", check2.value, check2.message, refs);
            }
          } else {
            if (!check2.inclusive) {
              res.exclusiveMinimum = true;
            }
            setResponseValueAndErrors(res, "minimum", check2.value, check2.message, refs);
          }
          break;
        case "max":
          if (refs.target === "jsonSchema7") {
            if (check2.inclusive) {
              setResponseValueAndErrors(res, "maximum", check2.value, check2.message, refs);
            } else {
              setResponseValueAndErrors(res, "exclusiveMaximum", check2.value, check2.message, refs);
            }
          } else {
            if (!check2.inclusive) {
              res.exclusiveMaximum = true;
            }
            setResponseValueAndErrors(res, "maximum", check2.value, check2.message, refs);
          }
          break;
        case "multipleOf":
          setResponseValueAndErrors(res, "multipleOf", check2.value, check2.message, refs);
          break;
      }
    }
    return res;
  }
  function parseBooleanDef() {
    return {
      type: "boolean"
    };
  }
  function parseBrandedDef(_def, refs) {
    return parseDef(_def.type._def, refs);
  }
  const parseCatchDef = (def, refs) => {
    return parseDef(def.innerType._def, refs);
  };
  function parseDateDef(def, refs, overrideDateStrategy) {
    const strategy = overrideDateStrategy ?? refs.dateStrategy;
    if (Array.isArray(strategy)) {
      return {
        anyOf: strategy.map((item, i) => parseDateDef(def, refs, item))
      };
    }
    switch (strategy) {
      case "string":
      case "format:date-time":
        return {
          type: "string",
          format: "date-time"
        };
      case "format:date":
        return {
          type: "string",
          format: "date"
        };
      case "integer":
        return integerDateParser(def, refs);
    }
  }
  const integerDateParser = (def, refs) => {
    const res = {
      type: "integer",
      format: "unix-time"
    };
    if (refs.target === "openApi3") {
      return res;
    }
    for (const check2 of def.checks) {
      switch (check2.kind) {
        case "min":
          setResponseValueAndErrors(
            res,
            "minimum",
            check2.value,
            // This is in milliseconds
            check2.message,
            refs
          );
          break;
        case "max":
          setResponseValueAndErrors(
            res,
            "maximum",
            check2.value,
            // This is in milliseconds
            check2.message,
            refs
          );
          break;
      }
    }
    return res;
  };
  function parseDefaultDef(_def, refs) {
    return {
      ...parseDef(_def.innerType._def, refs),
      default: _def.defaultValue()
    };
  }
  function parseEffectsDef(_def, refs) {
    return refs.effectStrategy === "input" ? parseDef(_def.schema._def, refs) : parseAnyDef(refs);
  }
  function parseEnumDef(def) {
    return {
      type: "string",
      enum: Array.from(def.values)
    };
  }
  const isJsonSchema7AllOfType = (type2) => {
    if ("type" in type2 && type2.type === "string")
      return false;
    return "allOf" in type2;
  };
  function parseIntersectionDef(def, refs) {
    const allOf2 = [
      parseDef(def.left._def, {
        ...refs,
        currentPath: [...refs.currentPath, "allOf", "0"]
      }),
      parseDef(def.right._def, {
        ...refs,
        currentPath: [...refs.currentPath, "allOf", "1"]
      })
    ].filter((x) => !!x);
    let unevaluatedProperties = refs.target === "jsonSchema2019-09" ? { unevaluatedProperties: false } : void 0;
    const mergedAllOf = [];
    allOf2.forEach((schema) => {
      if (isJsonSchema7AllOfType(schema)) {
        mergedAllOf.push(...schema.allOf);
        if (schema.unevaluatedProperties === void 0) {
          unevaluatedProperties = void 0;
        }
      } else {
        let nestedSchema = schema;
        if ("additionalProperties" in schema && schema.additionalProperties === false) {
          const { additionalProperties: additionalProperties2, ...rest } = schema;
          nestedSchema = rest;
        } else {
          unevaluatedProperties = void 0;
        }
        mergedAllOf.push(nestedSchema);
      }
    });
    return mergedAllOf.length ? {
      allOf: mergedAllOf,
      ...unevaluatedProperties
    } : void 0;
  }
  function parseLiteralDef(def, refs) {
    const parsedType = typeof def.value;
    if (parsedType !== "bigint" && parsedType !== "number" && parsedType !== "boolean" && parsedType !== "string") {
      return {
        type: Array.isArray(def.value) ? "array" : "object"
      };
    }
    if (refs.target === "openApi3") {
      return {
        type: parsedType === "bigint" ? "integer" : parsedType,
        enum: [def.value]
      };
    }
    return {
      type: parsedType === "bigint" ? "integer" : parsedType,
      const: def.value
    };
  }
  let emojiRegex = void 0;
  const zodPatterns = {
    /**
     * `c` was changed to `[cC]` to replicate /i flag
     */
    cuid: /^[cC][^\s-]{8,}$/,
    cuid2: /^[0-9a-z]+$/,
    ulid: /^[0-9A-HJKMNP-TV-Z]{26}$/,
    /**
     * `a-z` was added to replicate /i flag
     */
    email: /^(?!\.)(?!.*\.\.)([a-zA-Z0-9_'+\-\.]*)[a-zA-Z0-9_+-]@([a-zA-Z0-9][a-zA-Z0-9\-]*\.)+[a-zA-Z]{2,}$/,
    /**
     * Constructed a valid Unicode RegExp
     *
     * Lazily instantiate since this type of regex isn't supported
     * in all envs (e.g. React Native).
     *
     * See:
     * https://github.com/colinhacks/zod/issues/2433
     * Fix in Zod:
     * https://github.com/colinhacks/zod/commit/9340fd51e48576a75adc919bff65dbc4a5d4c99b
     */
    emoji: () => {
      if (emojiRegex === void 0) {
        emojiRegex = RegExp("^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$", "u");
      }
      return emojiRegex;
    },
    /**
     * Unused
     */
    uuid: /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/,
    /**
     * Unused
     */
    ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,
    ipv4Cidr: /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/,
    /**
     * Unused
     */
    ipv6: /^(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))$/,
    ipv6Cidr: /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,
    base64: /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/,
    base64url: /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/,
    nanoid: /^[a-zA-Z0-9_-]{21}$/,
    jwt: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/
  };
  function parseStringDef(def, refs) {
    const res = {
      type: "string"
    };
    if (def.checks) {
      for (const check2 of def.checks) {
        switch (check2.kind) {
          case "min":
            setResponseValueAndErrors(res, "minLength", typeof res.minLength === "number" ? Math.max(res.minLength, check2.value) : check2.value, check2.message, refs);
            break;
          case "max":
            setResponseValueAndErrors(res, "maxLength", typeof res.maxLength === "number" ? Math.min(res.maxLength, check2.value) : check2.value, check2.message, refs);
            break;
          case "email":
            switch (refs.emailStrategy) {
              case "format:email":
                addFormat(res, "email", check2.message, refs);
                break;
              case "format:idn-email":
                addFormat(res, "idn-email", check2.message, refs);
                break;
              case "pattern:zod":
                addPattern(res, zodPatterns.email, check2.message, refs);
                break;
            }
            break;
          case "url":
            addFormat(res, "uri", check2.message, refs);
            break;
          case "uuid":
            addFormat(res, "uuid", check2.message, refs);
            break;
          case "regex":
            addPattern(res, check2.regex, check2.message, refs);
            break;
          case "cuid":
            addPattern(res, zodPatterns.cuid, check2.message, refs);
            break;
          case "cuid2":
            addPattern(res, zodPatterns.cuid2, check2.message, refs);
            break;
          case "startsWith":
            addPattern(res, RegExp(`^${escapeLiteralCheckValue(check2.value, refs)}`), check2.message, refs);
            break;
          case "endsWith":
            addPattern(res, RegExp(`${escapeLiteralCheckValue(check2.value, refs)}$`), check2.message, refs);
            break;
          case "datetime":
            addFormat(res, "date-time", check2.message, refs);
            break;
          case "date":
            addFormat(res, "date", check2.message, refs);
            break;
          case "time":
            addFormat(res, "time", check2.message, refs);
            break;
          case "duration":
            addFormat(res, "duration", check2.message, refs);
            break;
          case "length":
            setResponseValueAndErrors(res, "minLength", typeof res.minLength === "number" ? Math.max(res.minLength, check2.value) : check2.value, check2.message, refs);
            setResponseValueAndErrors(res, "maxLength", typeof res.maxLength === "number" ? Math.min(res.maxLength, check2.value) : check2.value, check2.message, refs);
            break;
          case "includes": {
            addPattern(res, RegExp(escapeLiteralCheckValue(check2.value, refs)), check2.message, refs);
            break;
          }
          case "ip": {
            if (check2.version !== "v6") {
              addFormat(res, "ipv4", check2.message, refs);
            }
            if (check2.version !== "v4") {
              addFormat(res, "ipv6", check2.message, refs);
            }
            break;
          }
          case "base64url":
            addPattern(res, zodPatterns.base64url, check2.message, refs);
            break;
          case "jwt":
            addPattern(res, zodPatterns.jwt, check2.message, refs);
            break;
          case "cidr": {
            if (check2.version !== "v6") {
              addPattern(res, zodPatterns.ipv4Cidr, check2.message, refs);
            }
            if (check2.version !== "v4") {
              addPattern(res, zodPatterns.ipv6Cidr, check2.message, refs);
            }
            break;
          }
          case "emoji":
            addPattern(res, zodPatterns.emoji(), check2.message, refs);
            break;
          case "ulid": {
            addPattern(res, zodPatterns.ulid, check2.message, refs);
            break;
          }
          case "base64": {
            switch (refs.base64Strategy) {
              case "format:binary": {
                addFormat(res, "binary", check2.message, refs);
                break;
              }
              case "contentEncoding:base64": {
                setResponseValueAndErrors(res, "contentEncoding", "base64", check2.message, refs);
                break;
              }
              case "pattern:zod": {
                addPattern(res, zodPatterns.base64, check2.message, refs);
                break;
              }
            }
            break;
          }
          case "nanoid": {
            addPattern(res, zodPatterns.nanoid, check2.message, refs);
          }
        }
      }
    }
    return res;
  }
  function escapeLiteralCheckValue(literal2, refs) {
    return refs.patternStrategy === "escape" ? escapeNonAlphaNumeric(literal2) : literal2;
  }
  const ALPHA_NUMERIC = new Set("ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvxyz0123456789");
  function escapeNonAlphaNumeric(source) {
    let result = "";
    for (let i = 0; i < source.length; i++) {
      if (!ALPHA_NUMERIC.has(source[i])) {
        result += "\\";
      }
      result += source[i];
    }
    return result;
  }
  function addFormat(schema, value, message, refs) {
    if (schema.format || schema.anyOf?.some((x) => x.format)) {
      if (!schema.anyOf) {
        schema.anyOf = [];
      }
      if (schema.format) {
        schema.anyOf.push({
          format: schema.format,
          ...schema.errorMessage && refs.errorMessages && {
            errorMessage: { format: schema.errorMessage.format }
          }
        });
        delete schema.format;
        if (schema.errorMessage) {
          delete schema.errorMessage.format;
          if (Object.keys(schema.errorMessage).length === 0) {
            delete schema.errorMessage;
          }
        }
      }
      schema.anyOf.push({
        format: value,
        ...message && refs.errorMessages && { errorMessage: { format: message } }
      });
    } else {
      setResponseValueAndErrors(schema, "format", value, message, refs);
    }
  }
  function addPattern(schema, regex, message, refs) {
    if (schema.pattern || schema.allOf?.some((x) => x.pattern)) {
      if (!schema.allOf) {
        schema.allOf = [];
      }
      if (schema.pattern) {
        schema.allOf.push({
          pattern: schema.pattern,
          ...schema.errorMessage && refs.errorMessages && {
            errorMessage: { pattern: schema.errorMessage.pattern }
          }
        });
        delete schema.pattern;
        if (schema.errorMessage) {
          delete schema.errorMessage.pattern;
          if (Object.keys(schema.errorMessage).length === 0) {
            delete schema.errorMessage;
          }
        }
      }
      schema.allOf.push({
        pattern: stringifyRegExpWithFlags(regex, refs),
        ...message && refs.errorMessages && { errorMessage: { pattern: message } }
      });
    } else {
      setResponseValueAndErrors(schema, "pattern", stringifyRegExpWithFlags(regex, refs), message, refs);
    }
  }
  function stringifyRegExpWithFlags(regex, refs) {
    if (!refs.applyRegexFlags || !regex.flags) {
      return regex.source;
    }
    const flags = {
      i: regex.flags.includes("i"),
      m: regex.flags.includes("m"),
      s: regex.flags.includes("s")
      // `.` matches newlines
    };
    const source = flags.i ? regex.source.toLowerCase() : regex.source;
    let pattern2 = "";
    let isEscaped = false;
    let inCharGroup = false;
    let inCharRange = false;
    for (let i = 0; i < source.length; i++) {
      if (isEscaped) {
        pattern2 += source[i];
        isEscaped = false;
        continue;
      }
      if (flags.i) {
        if (inCharGroup) {
          if (source[i].match(/[a-z]/)) {
            if (inCharRange) {
              pattern2 += source[i];
              pattern2 += `${source[i - 2]}-${source[i]}`.toUpperCase();
              inCharRange = false;
            } else if (source[i + 1] === "-" && source[i + 2]?.match(/[a-z]/)) {
              pattern2 += source[i];
              inCharRange = true;
            } else {
              pattern2 += `${source[i]}${source[i].toUpperCase()}`;
            }
            continue;
          }
        } else if (source[i].match(/[a-z]/)) {
          pattern2 += `[${source[i]}${source[i].toUpperCase()}]`;
          continue;
        }
      }
      if (flags.m) {
        if (source[i] === "^") {
          pattern2 += `(^|(?<=[\r
]))`;
          continue;
        } else if (source[i] === "$") {
          pattern2 += `($|(?=[\r
]))`;
          continue;
        }
      }
      if (flags.s && source[i] === ".") {
        pattern2 += inCharGroup ? `${source[i]}\r
` : `[${source[i]}\r
]`;
        continue;
      }
      pattern2 += source[i];
      if (source[i] === "\\") {
        isEscaped = true;
      } else if (inCharGroup && source[i] === "]") {
        inCharGroup = false;
      } else if (!inCharGroup && source[i] === "[") {
        inCharGroup = true;
      }
    }
    try {
      new RegExp(pattern2);
    } catch {
      console.warn(`Could not convert regex pattern at ${refs.currentPath.join("/")} to a flag-independent form! Falling back to the flag-ignorant source`);
      return regex.source;
    }
    return pattern2;
  }
  function parseRecordDef(def, refs) {
    if (refs.target === "openAi") {
      console.warn("Warning: OpenAI may not support records in schemas! Try an array of key-value pairs instead.");
    }
    if (refs.target === "openApi3" && def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodEnum) {
      return {
        type: "object",
        required: def.keyType._def.values,
        properties: def.keyType._def.values.reduce((acc, key) => ({
          ...acc,
          [key]: parseDef(def.valueType._def, {
            ...refs,
            currentPath: [...refs.currentPath, "properties", key]
          }) ?? parseAnyDef(refs)
        }), {}),
        additionalProperties: refs.rejectedAdditionalProperties
      };
    }
    const schema = {
      type: "object",
      additionalProperties: parseDef(def.valueType._def, {
        ...refs,
        currentPath: [...refs.currentPath, "additionalProperties"]
      }) ?? refs.allowedAdditionalProperties
    };
    if (refs.target === "openApi3") {
      return schema;
    }
    if (def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodString && def.keyType._def.checks?.length) {
      const { type: type2, ...keyType } = parseStringDef(def.keyType._def, refs);
      return {
        ...schema,
        propertyNames: keyType
      };
    } else if (def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodEnum) {
      return {
        ...schema,
        propertyNames: {
          enum: def.keyType._def.values
        }
      };
    } else if (def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodBranded && def.keyType._def.type._def.typeName === ZodFirstPartyTypeKind.ZodString && def.keyType._def.type._def.checks?.length) {
      const { type: type2, ...keyType } = parseBrandedDef(def.keyType._def, refs);
      return {
        ...schema,
        propertyNames: keyType
      };
    }
    return schema;
  }
  function parseMapDef(def, refs) {
    if (refs.mapStrategy === "record") {
      return parseRecordDef(def, refs);
    }
    const keys = parseDef(def.keyType._def, {
      ...refs,
      currentPath: [...refs.currentPath, "items", "items", "0"]
    }) || parseAnyDef(refs);
    const values = parseDef(def.valueType._def, {
      ...refs,
      currentPath: [...refs.currentPath, "items", "items", "1"]
    }) || parseAnyDef(refs);
    return {
      type: "array",
      maxItems: 125,
      items: {
        type: "array",
        items: [keys, values],
        minItems: 2,
        maxItems: 2
      }
    };
  }
  function parseNativeEnumDef(def) {
    const object2 = def.values;
    const actualKeys = Object.keys(def.values).filter((key) => {
      return typeof object2[object2[key]] !== "number";
    });
    const actualValues = actualKeys.map((key) => object2[key]);
    const parsedTypes = Array.from(new Set(actualValues.map((values) => typeof values)));
    return {
      type: parsedTypes.length === 1 ? parsedTypes[0] === "string" ? "string" : "number" : ["string", "number"],
      enum: actualValues
    };
  }
  function parseNeverDef(refs) {
    return refs.target === "openAi" ? void 0 : {
      not: parseAnyDef({
        ...refs,
        currentPath: [...refs.currentPath, "not"]
      })
    };
  }
  function parseNullDef(refs) {
    return refs.target === "openApi3" ? {
      enum: ["null"],
      nullable: true
    } : {
      type: "null"
    };
  }
  const primitiveMappings = {
    ZodString: "string",
    ZodNumber: "number",
    ZodBigInt: "integer",
    ZodBoolean: "boolean",
    ZodNull: "null"
  };
  function parseUnionDef(def, refs) {
    if (refs.target === "openApi3")
      return asAnyOf(def, refs);
    const options = def.options instanceof Map ? Array.from(def.options.values()) : def.options;
    if (options.every((x) => x._def.typeName in primitiveMappings && (!x._def.checks || !x._def.checks.length))) {
      const types2 = options.reduce((types3, x) => {
        const type2 = primitiveMappings[x._def.typeName];
        return type2 && !types3.includes(type2) ? [...types3, type2] : types3;
      }, []);
      return {
        type: types2.length > 1 ? types2 : types2[0]
      };
    } else if (options.every((x) => x._def.typeName === "ZodLiteral" && !x.description)) {
      const types2 = options.reduce((acc, x) => {
        const type2 = typeof x._def.value;
        switch (type2) {
          case "string":
          case "number":
          case "boolean":
            return [...acc, type2];
          case "bigint":
            return [...acc, "integer"];
          case "object":
            if (x._def.value === null)
              return [...acc, "null"];
          case "symbol":
          case "undefined":
          case "function":
          default:
            return acc;
        }
      }, []);
      if (types2.length === options.length) {
        const uniqueTypes = types2.filter((x, i, a) => a.indexOf(x) === i);
        return {
          type: uniqueTypes.length > 1 ? uniqueTypes : uniqueTypes[0],
          enum: options.reduce((acc, x) => {
            return acc.includes(x._def.value) ? acc : [...acc, x._def.value];
          }, [])
        };
      }
    } else if (options.every((x) => x._def.typeName === "ZodEnum")) {
      return {
        type: "string",
        enum: options.reduce((acc, x) => [
          ...acc,
          ...x._def.values.filter((x2) => !acc.includes(x2))
        ], [])
      };
    }
    return asAnyOf(def, refs);
  }
  const asAnyOf = (def, refs) => {
    const anyOf2 = (def.options instanceof Map ? Array.from(def.options.values()) : def.options).map((x, i) => parseDef(x._def, {
      ...refs,
      currentPath: [...refs.currentPath, "anyOf", `${i}`]
    })).filter((x) => !!x && (!refs.strictUnions || typeof x === "object" && Object.keys(x).length > 0));
    return anyOf2.length ? { anyOf: anyOf2 } : void 0;
  };
  function parseNullableDef(def, refs) {
    if (["ZodString", "ZodNumber", "ZodBigInt", "ZodBoolean", "ZodNull"].includes(def.innerType._def.typeName) && (!def.innerType._def.checks || !def.innerType._def.checks.length)) {
      if (refs.target === "openApi3") {
        return {
          type: primitiveMappings[def.innerType._def.typeName],
          nullable: true
        };
      }
      return {
        type: [
          primitiveMappings[def.innerType._def.typeName],
          "null"
        ]
      };
    }
    if (refs.target === "openApi3") {
      const base2 = parseDef(def.innerType._def, {
        ...refs,
        currentPath: [...refs.currentPath]
      });
      if (base2 && "$ref" in base2)
        return { allOf: [base2], nullable: true };
      return base2 && { ...base2, nullable: true };
    }
    const base = parseDef(def.innerType._def, {
      ...refs,
      currentPath: [...refs.currentPath, "anyOf", "0"]
    });
    return base && { anyOf: [base, { type: "null" }] };
  }
  function parseNumberDef(def, refs) {
    const res = {
      type: "number"
    };
    if (!def.checks)
      return res;
    for (const check2 of def.checks) {
      switch (check2.kind) {
        case "int":
          res.type = "integer";
          addErrorMessage(res, "type", check2.message, refs);
          break;
        case "min":
          if (refs.target === "jsonSchema7") {
            if (check2.inclusive) {
              setResponseValueAndErrors(res, "minimum", check2.value, check2.message, refs);
            } else {
              setResponseValueAndErrors(res, "exclusiveMinimum", check2.value, check2.message, refs);
            }
          } else {
            if (!check2.inclusive) {
              res.exclusiveMinimum = true;
            }
            setResponseValueAndErrors(res, "minimum", check2.value, check2.message, refs);
          }
          break;
        case "max":
          if (refs.target === "jsonSchema7") {
            if (check2.inclusive) {
              setResponseValueAndErrors(res, "maximum", check2.value, check2.message, refs);
            } else {
              setResponseValueAndErrors(res, "exclusiveMaximum", check2.value, check2.message, refs);
            }
          } else {
            if (!check2.inclusive) {
              res.exclusiveMaximum = true;
            }
            setResponseValueAndErrors(res, "maximum", check2.value, check2.message, refs);
          }
          break;
        case "multipleOf":
          setResponseValueAndErrors(res, "multipleOf", check2.value, check2.message, refs);
          break;
      }
    }
    return res;
  }
  function parseObjectDef(def, refs) {
    const forceOptionalIntoNullable = refs.target === "openAi";
    const result = {
      type: "object",
      properties: {}
    };
    const required2 = [];
    const shape = def.shape();
    for (const propName in shape) {
      let propDef = shape[propName];
      if (propDef === void 0 || propDef._def === void 0) {
        continue;
      }
      let propOptional = safeIsOptional(propDef);
      if (propOptional && forceOptionalIntoNullable) {
        if (propDef._def.typeName === "ZodOptional") {
          propDef = propDef._def.innerType;
        }
        if (!propDef.isNullable()) {
          propDef = propDef.nullable();
        }
        propOptional = false;
      }
      const parsedDef = parseDef(propDef._def, {
        ...refs,
        currentPath: [...refs.currentPath, "properties", propName],
        propertyPath: [...refs.currentPath, "properties", propName]
      });
      if (parsedDef === void 0) {
        continue;
      }
      result.properties[propName] = parsedDef;
      if (!propOptional) {
        required2.push(propName);
      }
    }
    if (required2.length) {
      result.required = required2;
    }
    const additionalProperties2 = decideAdditionalProperties(def, refs);
    if (additionalProperties2 !== void 0) {
      result.additionalProperties = additionalProperties2;
    }
    return result;
  }
  function decideAdditionalProperties(def, refs) {
    if (def.catchall._def.typeName !== "ZodNever") {
      return parseDef(def.catchall._def, {
        ...refs,
        currentPath: [...refs.currentPath, "additionalProperties"]
      });
    }
    switch (def.unknownKeys) {
      case "passthrough":
        return refs.allowedAdditionalProperties;
      case "strict":
        return refs.rejectedAdditionalProperties;
      case "strip":
        return refs.removeAdditionalStrategy === "strict" ? refs.allowedAdditionalProperties : refs.rejectedAdditionalProperties;
    }
  }
  function safeIsOptional(schema) {
    try {
      return schema.isOptional();
    } catch {
      return true;
    }
  }
  const parseOptionalDef = (def, refs) => {
    if (refs.currentPath.toString() === refs.propertyPath?.toString()) {
      return parseDef(def.innerType._def, refs);
    }
    const innerSchema = parseDef(def.innerType._def, {
      ...refs,
      currentPath: [...refs.currentPath, "anyOf", "1"]
    });
    return innerSchema ? {
      anyOf: [
        {
          not: parseAnyDef(refs)
        },
        innerSchema
      ]
    } : parseAnyDef(refs);
  };
  const parsePipelineDef = (def, refs) => {
    if (refs.pipeStrategy === "input") {
      return parseDef(def.in._def, refs);
    } else if (refs.pipeStrategy === "output") {
      return parseDef(def.out._def, refs);
    }
    const a = parseDef(def.in._def, {
      ...refs,
      currentPath: [...refs.currentPath, "allOf", "0"]
    });
    const b = parseDef(def.out._def, {
      ...refs,
      currentPath: [...refs.currentPath, "allOf", a ? "1" : "0"]
    });
    return {
      allOf: [a, b].filter((x) => x !== void 0)
    };
  };
  function parsePromiseDef(def, refs) {
    return parseDef(def.type._def, refs);
  }
  function parseSetDef(def, refs) {
    const items2 = parseDef(def.valueType._def, {
      ...refs,
      currentPath: [...refs.currentPath, "items"]
    });
    const schema = {
      type: "array",
      uniqueItems: true,
      items: items2
    };
    if (def.minSize) {
      setResponseValueAndErrors(schema, "minItems", def.minSize.value, def.minSize.message, refs);
    }
    if (def.maxSize) {
      setResponseValueAndErrors(schema, "maxItems", def.maxSize.value, def.maxSize.message, refs);
    }
    return schema;
  }
  function parseTupleDef(def, refs) {
    if (def.rest) {
      return {
        type: "array",
        minItems: def.items.length,
        items: def.items.map((x, i) => parseDef(x._def, {
          ...refs,
          currentPath: [...refs.currentPath, "items", `${i}`]
        })).reduce((acc, x) => x === void 0 ? acc : [...acc, x], []),
        additionalItems: parseDef(def.rest._def, {
          ...refs,
          currentPath: [...refs.currentPath, "additionalItems"]
        })
      };
    } else {
      return {
        type: "array",
        minItems: def.items.length,
        maxItems: def.items.length,
        items: def.items.map((x, i) => parseDef(x._def, {
          ...refs,
          currentPath: [...refs.currentPath, "items", `${i}`]
        })).reduce((acc, x) => x === void 0 ? acc : [...acc, x], [])
      };
    }
  }
  function parseUndefinedDef(refs) {
    return {
      not: parseAnyDef(refs)
    };
  }
  function parseUnknownDef(refs) {
    return parseAnyDef(refs);
  }
  const parseReadonlyDef = (def, refs) => {
    return parseDef(def.innerType._def, refs);
  };
  const selectParser = (def, typeName, refs) => {
    switch (typeName) {
      case ZodFirstPartyTypeKind.ZodString:
        return parseStringDef(def, refs);
      case ZodFirstPartyTypeKind.ZodNumber:
        return parseNumberDef(def, refs);
      case ZodFirstPartyTypeKind.ZodObject:
        return parseObjectDef(def, refs);
      case ZodFirstPartyTypeKind.ZodBigInt:
        return parseBigintDef(def, refs);
      case ZodFirstPartyTypeKind.ZodBoolean:
        return parseBooleanDef();
      case ZodFirstPartyTypeKind.ZodDate:
        return parseDateDef(def, refs);
      case ZodFirstPartyTypeKind.ZodUndefined:
        return parseUndefinedDef(refs);
      case ZodFirstPartyTypeKind.ZodNull:
        return parseNullDef(refs);
      case ZodFirstPartyTypeKind.ZodArray:
        return parseArrayDef(def, refs);
      case ZodFirstPartyTypeKind.ZodUnion:
      case ZodFirstPartyTypeKind.ZodDiscriminatedUnion:
        return parseUnionDef(def, refs);
      case ZodFirstPartyTypeKind.ZodIntersection:
        return parseIntersectionDef(def, refs);
      case ZodFirstPartyTypeKind.ZodTuple:
        return parseTupleDef(def, refs);
      case ZodFirstPartyTypeKind.ZodRecord:
        return parseRecordDef(def, refs);
      case ZodFirstPartyTypeKind.ZodLiteral:
        return parseLiteralDef(def, refs);
      case ZodFirstPartyTypeKind.ZodEnum:
        return parseEnumDef(def);
      case ZodFirstPartyTypeKind.ZodNativeEnum:
        return parseNativeEnumDef(def);
      case ZodFirstPartyTypeKind.ZodNullable:
        return parseNullableDef(def, refs);
      case ZodFirstPartyTypeKind.ZodOptional:
        return parseOptionalDef(def, refs);
      case ZodFirstPartyTypeKind.ZodMap:
        return parseMapDef(def, refs);
      case ZodFirstPartyTypeKind.ZodSet:
        return parseSetDef(def, refs);
      case ZodFirstPartyTypeKind.ZodLazy:
        return () => def.getter()._def;
      case ZodFirstPartyTypeKind.ZodPromise:
        return parsePromiseDef(def, refs);
      case ZodFirstPartyTypeKind.ZodNaN:
      case ZodFirstPartyTypeKind.ZodNever:
        return parseNeverDef(refs);
      case ZodFirstPartyTypeKind.ZodEffects:
        return parseEffectsDef(def, refs);
      case ZodFirstPartyTypeKind.ZodAny:
        return parseAnyDef(refs);
      case ZodFirstPartyTypeKind.ZodUnknown:
        return parseUnknownDef(refs);
      case ZodFirstPartyTypeKind.ZodDefault:
        return parseDefaultDef(def, refs);
      case ZodFirstPartyTypeKind.ZodBranded:
        return parseBrandedDef(def, refs);
      case ZodFirstPartyTypeKind.ZodReadonly:
        return parseReadonlyDef(def, refs);
      case ZodFirstPartyTypeKind.ZodCatch:
        return parseCatchDef(def, refs);
      case ZodFirstPartyTypeKind.ZodPipeline:
        return parsePipelineDef(def, refs);
      case ZodFirstPartyTypeKind.ZodFunction:
      case ZodFirstPartyTypeKind.ZodVoid:
      case ZodFirstPartyTypeKind.ZodSymbol:
        return void 0;
      default:
        return /* @__PURE__ */ ((_) => void 0)();
    }
  };
  function parseDef(def, refs, forceResolution = false) {
    const seenItem = refs.seen.get(def);
    if (refs.override) {
      const overrideResult = refs.override?.(def, refs, seenItem, forceResolution);
      if (overrideResult !== ignoreOverride) {
        return overrideResult;
      }
    }
    if (seenItem && !forceResolution) {
      const seenSchema = get$ref(seenItem, refs);
      if (seenSchema !== void 0) {
        return seenSchema;
      }
    }
    const newItem = { def, path: refs.currentPath, jsonSchema: void 0 };
    refs.seen.set(def, newItem);
    const jsonSchemaOrGetter = selectParser(def, def.typeName, refs);
    const jsonSchema = typeof jsonSchemaOrGetter === "function" ? parseDef(jsonSchemaOrGetter(), refs) : jsonSchemaOrGetter;
    if (jsonSchema) {
      addMeta(def, refs, jsonSchema);
    }
    if (refs.postProcess) {
      const postProcessResult = refs.postProcess(jsonSchema, def, refs);
      newItem.jsonSchema = jsonSchema;
      return postProcessResult;
    }
    newItem.jsonSchema = jsonSchema;
    return jsonSchema;
  }
  const get$ref = (item, refs) => {
    switch (refs.$refStrategy) {
      case "root":
        return { $ref: item.path.join("/") };
      case "relative":
        return { $ref: getRelativePath(refs.currentPath, item.path) };
      case "none":
      case "seen": {
        if (item.path.length < refs.currentPath.length && item.path.every((value, index) => refs.currentPath[index] === value)) {
          console.warn(`Recursive reference detected at ${refs.currentPath.join("/")}! Defaulting to any`);
          return parseAnyDef(refs);
        }
        return refs.$refStrategy === "seen" ? parseAnyDef(refs) : void 0;
      }
    }
  };
  const addMeta = (def, refs, jsonSchema) => {
    if (def.description) {
      jsonSchema.description = def.description;
      if (refs.markdownDescription) {
        jsonSchema.markdownDescription = def.description;
      }
    }
    return jsonSchema;
  };
  const zodToJsonSchema = (schema, options) => {
    const refs = getRefs(options);
    let definitions2 = typeof options === "object" && options.definitions ? Object.entries(options.definitions).reduce((acc, [name2, schema2]) => ({
      ...acc,
      [name2]: parseDef(schema2._def, {
        ...refs,
        currentPath: [...refs.basePath, refs.definitionPath, name2]
      }, true) ?? parseAnyDef(refs)
    }), {}) : void 0;
    const name = typeof options === "string" ? options : options?.nameStrategy === "title" ? void 0 : options?.name;
    const main = parseDef(schema._def, name === void 0 ? refs : {
      ...refs,
      currentPath: [...refs.basePath, refs.definitionPath, name]
    }, false) ?? parseAnyDef(refs);
    const title2 = typeof options === "object" && options.name !== void 0 && options.nameStrategy === "title" ? options.name : void 0;
    if (title2 !== void 0) {
      main.title = title2;
    }
    if (refs.flags.hasReferencedOpenAiAnyType) {
      if (!definitions2) {
        definitions2 = {};
      }
      if (!definitions2[refs.openAiAnyTypeName]) {
        definitions2[refs.openAiAnyTypeName] = {
          // Skipping "object" as no properties can be defined and additionalProperties must be "false"
          type: ["string", "number", "integer", "boolean", "array", "null"],
          items: {
            $ref: refs.$refStrategy === "relative" ? "1" : [
              ...refs.basePath,
              refs.definitionPath,
              refs.openAiAnyTypeName
            ].join("/")
          }
        };
      }
    }
    const combined = name === void 0 ? definitions2 ? {
      ...main,
      [refs.definitionPath]: definitions2
    } : main : {
      $ref: [
        ...refs.$refStrategy === "relative" ? [] : refs.basePath,
        refs.definitionPath,
        name
      ].join("/"),
      [refs.definitionPath]: {
        ...definitions2,
        [name]: main
      }
    };
    if (refs.target === "jsonSchema7") {
      combined.$schema = "http://json-schema.org/draft-07/schema#";
    } else if (refs.target === "jsonSchema2019-09" || refs.target === "openAi") {
      combined.$schema = "https://json-schema.org/draft/2019-09/schema#";
    }
    if (refs.target === "openAi" && ("anyOf" in combined || "oneOf" in combined || "allOf" in combined || "type" in combined && Array.isArray(combined.type))) {
      console.warn("Warning: OpenAI may not support schemas with unions as roots! Try wrapping it in an object property.");
    }
    return combined;
  };
  function mapMiniTarget(t) {
    if (!t)
      return "draft-7";
    if (t === "jsonSchema7" || t === "draft-7")
      return "draft-7";
    if (t === "jsonSchema2019-09" || t === "draft-2020-12")
      return "draft-2020-12";
    return "draft-7";
  }
  function toJsonSchemaCompat(schema, opts) {
    var _a, _b, _c;
    if (isZ4Schema(schema)) {
      return toJSONSchema(schema, {
        target: mapMiniTarget(opts === null || opts === void 0 ? void 0 : opts.target),
        io: (_a = opts === null || opts === void 0 ? void 0 : opts.pipeStrategy) !== null && _a !== void 0 ? _a : "input"
      });
    }
    return zodToJsonSchema(schema, {
      strictUnions: (_b = opts === null || opts === void 0 ? void 0 : opts.strictUnions) !== null && _b !== void 0 ? _b : true,
      pipeStrategy: (_c = opts === null || opts === void 0 ? void 0 : opts.pipeStrategy) !== null && _c !== void 0 ? _c : "input"
    });
  }
  function getMethodLiteral(schema) {
    const shape = getObjectShape(schema);
    const methodSchema = shape === null || shape === void 0 ? void 0 : shape.method;
    if (!methodSchema) {
      throw new Error("Schema is missing a method literal");
    }
    const value = getLiteralValue(methodSchema);
    if (typeof value !== "string") {
      throw new Error("Schema method literal must be a string");
    }
    return value;
  }
  function parseWithCompat(schema, data) {
    const result = safeParse(schema, data);
    if (!result.success) {
      throw result.error;
    }
    return result.data;
  }
  const DEFAULT_REQUEST_TIMEOUT_MSEC = 6e4;
  class Protocol {
    constructor(_options) {
      this._options = _options;
      this._requestMessageId = 0;
      this._requestHandlers = /* @__PURE__ */ new Map();
      this._requestHandlerAbortControllers = /* @__PURE__ */ new Map();
      this._notificationHandlers = /* @__PURE__ */ new Map();
      this._responseHandlers = /* @__PURE__ */ new Map();
      this._progressHandlers = /* @__PURE__ */ new Map();
      this._timeoutInfo = /* @__PURE__ */ new Map();
      this._pendingDebouncedNotifications = /* @__PURE__ */ new Set();
      this._taskProgressTokens = /* @__PURE__ */ new Map();
      this._requestResolvers = /* @__PURE__ */ new Map();
      this.setNotificationHandler(CancelledNotificationSchema, (notification) => {
        this._oncancel(notification);
      });
      this.setNotificationHandler(ProgressNotificationSchema, (notification) => {
        this._onprogress(notification);
      });
      this.setRequestHandler(
        PingRequestSchema,
        // Automatic pong by default.
        (_request) => ({})
      );
      this._taskStore = _options === null || _options === void 0 ? void 0 : _options.taskStore;
      this._taskMessageQueue = _options === null || _options === void 0 ? void 0 : _options.taskMessageQueue;
      if (this._taskStore) {
        this.setRequestHandler(GetTaskRequestSchema, async (request, extra) => {
          const task = await this._taskStore.getTask(request.params.taskId, extra.sessionId);
          if (!task) {
            throw new McpError(ErrorCode.InvalidParams, "Failed to retrieve task: Task not found");
          }
          return {
            ...task
          };
        });
        this.setRequestHandler(GetTaskPayloadRequestSchema, async (request, extra) => {
          const handleTaskResult = async () => {
            var _a;
            const taskId = request.params.taskId;
            if (this._taskMessageQueue) {
              let queuedMessage;
              while (queuedMessage = await this._taskMessageQueue.dequeue(taskId, extra.sessionId)) {
                if (queuedMessage.type === "response" || queuedMessage.type === "error") {
                  const message = queuedMessage.message;
                  const requestId = message.id;
                  const resolver = this._requestResolvers.get(requestId);
                  if (resolver) {
                    this._requestResolvers.delete(requestId);
                    if (queuedMessage.type === "response") {
                      resolver(message);
                    } else {
                      const errorMessage = message;
                      const error = new McpError(errorMessage.error.code, errorMessage.error.message, errorMessage.error.data);
                      resolver(error);
                    }
                  } else {
                    const messageType = queuedMessage.type === "response" ? "Response" : "Error";
                    this._onerror(new Error(`${messageType} handler missing for request ${requestId}`));
                  }
                  continue;
                }
                await ((_a = this._transport) === null || _a === void 0 ? void 0 : _a.send(queuedMessage.message, { relatedRequestId: extra.requestId }));
              }
            }
            const task = await this._taskStore.getTask(taskId, extra.sessionId);
            if (!task) {
              throw new McpError(ErrorCode.InvalidParams, `Task not found: ${taskId}`);
            }
            if (!isTerminal(task.status)) {
              await this._waitForTaskUpdate(taskId, extra.signal);
              return await handleTaskResult();
            }
            if (isTerminal(task.status)) {
              const result = await this._taskStore.getTaskResult(taskId, extra.sessionId);
              this._clearTaskQueue(taskId);
              return {
                ...result,
                _meta: {
                  ...result._meta,
                  [RELATED_TASK_META_KEY]: {
                    taskId
                  }
                }
              };
            }
            return await handleTaskResult();
          };
          return await handleTaskResult();
        });
        this.setRequestHandler(ListTasksRequestSchema, async (request, extra) => {
          var _a;
          try {
            const { tasks, nextCursor } = await this._taskStore.listTasks((_a = request.params) === null || _a === void 0 ? void 0 : _a.cursor, extra.sessionId);
            return {
              tasks,
              nextCursor,
              _meta: {}
            };
          } catch (error) {
            throw new McpError(ErrorCode.InvalidParams, `Failed to list tasks: ${error instanceof Error ? error.message : String(error)}`);
          }
        });
        this.setRequestHandler(CancelTaskRequestSchema, async (request, extra) => {
          try {
            const task = await this._taskStore.getTask(request.params.taskId, extra.sessionId);
            if (!task) {
              throw new McpError(ErrorCode.InvalidParams, `Task not found: ${request.params.taskId}`);
            }
            if (isTerminal(task.status)) {
              throw new McpError(ErrorCode.InvalidParams, `Cannot cancel task in terminal status: ${task.status}`);
            }
            await this._taskStore.updateTaskStatus(request.params.taskId, "cancelled", "Client cancelled task execution.", extra.sessionId);
            this._clearTaskQueue(request.params.taskId);
            const cancelledTask = await this._taskStore.getTask(request.params.taskId, extra.sessionId);
            if (!cancelledTask) {
              throw new McpError(ErrorCode.InvalidParams, `Task not found after cancellation: ${request.params.taskId}`);
            }
            return {
              _meta: {},
              ...cancelledTask
            };
          } catch (error) {
            if (error instanceof McpError) {
              throw error;
            }
            throw new McpError(ErrorCode.InvalidRequest, `Failed to cancel task: ${error instanceof Error ? error.message : String(error)}`);
          }
        });
      }
    }
    async _oncancel(notification) {
      const controller = this._requestHandlerAbortControllers.get(notification.params.requestId);
      controller === null || controller === void 0 ? void 0 : controller.abort(notification.params.reason);
    }
    _setupTimeout(messageId, timeout, maxTotalTimeout, onTimeout, resetTimeoutOnProgress = false) {
      this._timeoutInfo.set(messageId, {
        timeoutId: setTimeout(onTimeout, timeout),
        startTime: Date.now(),
        timeout,
        maxTotalTimeout,
        resetTimeoutOnProgress,
        onTimeout
      });
    }
    _resetTimeout(messageId) {
      const info = this._timeoutInfo.get(messageId);
      if (!info)
        return false;
      const totalElapsed = Date.now() - info.startTime;
      if (info.maxTotalTimeout && totalElapsed >= info.maxTotalTimeout) {
        this._timeoutInfo.delete(messageId);
        throw McpError.fromError(ErrorCode.RequestTimeout, "Maximum total timeout exceeded", {
          maxTotalTimeout: info.maxTotalTimeout,
          totalElapsed
        });
      }
      clearTimeout(info.timeoutId);
      info.timeoutId = setTimeout(info.onTimeout, info.timeout);
      return true;
    }
    _cleanupTimeout(messageId) {
      const info = this._timeoutInfo.get(messageId);
      if (info) {
        clearTimeout(info.timeoutId);
        this._timeoutInfo.delete(messageId);
      }
    }
    /**
     * Attaches to the given transport, starts it, and starts listening for messages.
     *
     * The Protocol object assumes ownership of the Transport, replacing any callbacks that have already been set, and expects that it is the only user of the Transport instance going forward.
     */
    async connect(transport) {
      var _a, _b, _c;
      this._transport = transport;
      const _onclose = (_a = this.transport) === null || _a === void 0 ? void 0 : _a.onclose;
      this._transport.onclose = () => {
        _onclose === null || _onclose === void 0 ? void 0 : _onclose();
        this._onclose();
      };
      const _onerror = (_b = this.transport) === null || _b === void 0 ? void 0 : _b.onerror;
      this._transport.onerror = (error) => {
        _onerror === null || _onerror === void 0 ? void 0 : _onerror(error);
        this._onerror(error);
      };
      const _onmessage = (_c = this._transport) === null || _c === void 0 ? void 0 : _c.onmessage;
      this._transport.onmessage = (message, extra) => {
        _onmessage === null || _onmessage === void 0 ? void 0 : _onmessage(message, extra);
        if (isJSONRPCResponse(message) || isJSONRPCError(message)) {
          this._onresponse(message);
        } else if (isJSONRPCRequest(message)) {
          this._onrequest(message, extra);
        } else if (isJSONRPCNotification(message)) {
          this._onnotification(message);
        } else {
          this._onerror(new Error(`Unknown message type: ${JSON.stringify(message)}`));
        }
      };
      await this._transport.start();
    }
    _onclose() {
      var _a;
      const responseHandlers = this._responseHandlers;
      this._responseHandlers = /* @__PURE__ */ new Map();
      this._progressHandlers.clear();
      this._taskProgressTokens.clear();
      this._pendingDebouncedNotifications.clear();
      const error = McpError.fromError(ErrorCode.ConnectionClosed, "Connection closed");
      this._transport = void 0;
      (_a = this.onclose) === null || _a === void 0 ? void 0 : _a.call(this);
      for (const handler of responseHandlers.values()) {
        handler(error);
      }
    }
    _onerror(error) {
      var _a;
      (_a = this.onerror) === null || _a === void 0 ? void 0 : _a.call(this, error);
    }
    _onnotification(notification) {
      var _a;
      const handler = (_a = this._notificationHandlers.get(notification.method)) !== null && _a !== void 0 ? _a : this.fallbackNotificationHandler;
      if (handler === void 0) {
        return;
      }
      Promise.resolve().then(() => handler(notification)).catch((error) => this._onerror(new Error(`Uncaught error in notification handler: ${error}`)));
    }
    _onrequest(request, extra) {
      var _a, _b, _c, _d, _e, _f;
      const handler = (_a = this._requestHandlers.get(request.method)) !== null && _a !== void 0 ? _a : this.fallbackRequestHandler;
      const capturedTransport = this._transport;
      const relatedTaskId = (_d = (_c = (_b = request.params) === null || _b === void 0 ? void 0 : _b._meta) === null || _c === void 0 ? void 0 : _c[RELATED_TASK_META_KEY]) === null || _d === void 0 ? void 0 : _d.taskId;
      if (handler === void 0) {
        const errorResponse = {
          jsonrpc: "2.0",
          id: request.id,
          error: {
            code: ErrorCode.MethodNotFound,
            message: "Method not found"
          }
        };
        if (relatedTaskId && this._taskMessageQueue) {
          this._enqueueTaskMessage(relatedTaskId, {
            type: "error",
            message: errorResponse,
            timestamp: Date.now()
          }, capturedTransport === null || capturedTransport === void 0 ? void 0 : capturedTransport.sessionId).catch((error) => this._onerror(new Error(`Failed to enqueue error response: ${error}`)));
        } else {
          capturedTransport === null || capturedTransport === void 0 ? void 0 : capturedTransport.send(errorResponse).catch((error) => this._onerror(new Error(`Failed to send an error response: ${error}`)));
        }
        return;
      }
      const abortController = new AbortController();
      this._requestHandlerAbortControllers.set(request.id, abortController);
      const taskCreationParams = (_e = request.params) === null || _e === void 0 ? void 0 : _e.task;
      const taskStore = this._taskStore ? this.requestTaskStore(request, capturedTransport === null || capturedTransport === void 0 ? void 0 : capturedTransport.sessionId) : void 0;
      const fullExtra = {
        signal: abortController.signal,
        sessionId: capturedTransport === null || capturedTransport === void 0 ? void 0 : capturedTransport.sessionId,
        _meta: (_f = request.params) === null || _f === void 0 ? void 0 : _f._meta,
        sendNotification: async (notification) => {
          const notificationOptions = { relatedRequestId: request.id };
          if (relatedTaskId) {
            notificationOptions.relatedTask = { taskId: relatedTaskId };
          }
          await this.notification(notification, notificationOptions);
        },
        sendRequest: async (r, resultSchema, options) => {
          var _a2, _b2;
          const requestOptions = { ...options, relatedRequestId: request.id };
          if (relatedTaskId && !requestOptions.relatedTask) {
            requestOptions.relatedTask = { taskId: relatedTaskId };
          }
          const effectiveTaskId = (_b2 = (_a2 = requestOptions.relatedTask) === null || _a2 === void 0 ? void 0 : _a2.taskId) !== null && _b2 !== void 0 ? _b2 : relatedTaskId;
          if (effectiveTaskId && taskStore) {
            await taskStore.updateTaskStatus(effectiveTaskId, "input_required");
          }
          return await this.request(r, resultSchema, requestOptions);
        },
        authInfo: extra === null || extra === void 0 ? void 0 : extra.authInfo,
        requestId: request.id,
        requestInfo: extra === null || extra === void 0 ? void 0 : extra.requestInfo,
        taskId: relatedTaskId,
        taskStore,
        taskRequestedTtl: taskCreationParams === null || taskCreationParams === void 0 ? void 0 : taskCreationParams.ttl,
        closeSSEStream: extra === null || extra === void 0 ? void 0 : extra.closeSSEStream,
        closeStandaloneSSEStream: extra === null || extra === void 0 ? void 0 : extra.closeStandaloneSSEStream
      };
      Promise.resolve().then(() => {
        if (taskCreationParams) {
          this.assertTaskHandlerCapability(request.method);
        }
      }).then(() => handler(request, fullExtra)).then(async (result) => {
        if (abortController.signal.aborted) {
          return;
        }
        const response = {
          result,
          jsonrpc: "2.0",
          id: request.id
        };
        if (relatedTaskId && this._taskMessageQueue) {
          await this._enqueueTaskMessage(relatedTaskId, {
            type: "response",
            message: response,
            timestamp: Date.now()
          }, capturedTransport === null || capturedTransport === void 0 ? void 0 : capturedTransport.sessionId);
        } else {
          await (capturedTransport === null || capturedTransport === void 0 ? void 0 : capturedTransport.send(response));
        }
      }, async (error) => {
        var _a2;
        if (abortController.signal.aborted) {
          return;
        }
        const errorResponse = {
          jsonrpc: "2.0",
          id: request.id,
          error: {
            code: Number.isSafeInteger(error["code"]) ? error["code"] : ErrorCode.InternalError,
            message: (_a2 = error.message) !== null && _a2 !== void 0 ? _a2 : "Internal error",
            ...error["data"] !== void 0 && { data: error["data"] }
          }
        };
        if (relatedTaskId && this._taskMessageQueue) {
          await this._enqueueTaskMessage(relatedTaskId, {
            type: "error",
            message: errorResponse,
            timestamp: Date.now()
          }, capturedTransport === null || capturedTransport === void 0 ? void 0 : capturedTransport.sessionId);
        } else {
          await (capturedTransport === null || capturedTransport === void 0 ? void 0 : capturedTransport.send(errorResponse));
        }
      }).catch((error) => this._onerror(new Error(`Failed to send response: ${error}`))).finally(() => {
        this._requestHandlerAbortControllers.delete(request.id);
      });
    }
    _onprogress(notification) {
      const { progressToken, ...params } = notification.params;
      const messageId = Number(progressToken);
      const handler = this._progressHandlers.get(messageId);
      if (!handler) {
        this._onerror(new Error(`Received a progress notification for an unknown token: ${JSON.stringify(notification)}`));
        return;
      }
      const responseHandler = this._responseHandlers.get(messageId);
      const timeoutInfo = this._timeoutInfo.get(messageId);
      if (timeoutInfo && responseHandler && timeoutInfo.resetTimeoutOnProgress) {
        try {
          this._resetTimeout(messageId);
        } catch (error) {
          this._responseHandlers.delete(messageId);
          this._progressHandlers.delete(messageId);
          this._cleanupTimeout(messageId);
          responseHandler(error);
          return;
        }
      }
      handler(params);
    }
    _onresponse(response) {
      const messageId = Number(response.id);
      const resolver = this._requestResolvers.get(messageId);
      if (resolver) {
        this._requestResolvers.delete(messageId);
        if (isJSONRPCResponse(response)) {
          resolver(response);
        } else {
          const error = new McpError(response.error.code, response.error.message, response.error.data);
          resolver(error);
        }
        return;
      }
      const handler = this._responseHandlers.get(messageId);
      if (handler === void 0) {
        this._onerror(new Error(`Received a response for an unknown message ID: ${JSON.stringify(response)}`));
        return;
      }
      this._responseHandlers.delete(messageId);
      this._cleanupTimeout(messageId);
      let isTaskResponse = false;
      if (isJSONRPCResponse(response) && response.result && typeof response.result === "object") {
        const result = response.result;
        if (result.task && typeof result.task === "object") {
          const task = result.task;
          if (typeof task.taskId === "string") {
            isTaskResponse = true;
            this._taskProgressTokens.set(task.taskId, messageId);
          }
        }
      }
      if (!isTaskResponse) {
        this._progressHandlers.delete(messageId);
      }
      if (isJSONRPCResponse(response)) {
        handler(response);
      } else {
        const error = McpError.fromError(response.error.code, response.error.message, response.error.data);
        handler(error);
      }
    }
    get transport() {
      return this._transport;
    }
    /**
     * Closes the connection.
     */
    async close() {
      var _a;
      await ((_a = this._transport) === null || _a === void 0 ? void 0 : _a.close());
    }
    /**
     * Sends a request and returns an AsyncGenerator that yields response messages.
     * The generator is guaranteed to end with either a 'result' or 'error' message.
     *
     * @example
     * ```typescript
     * const stream = protocol.requestStream(request, resultSchema, options);
     * for await (const message of stream) {
     *   switch (message.type) {
     *     case 'taskCreated':
     *       console.log('Task created:', message.task.taskId);
     *       break;
     *     case 'taskStatus':
     *       console.log('Task status:', message.task.status);
     *       break;
     *     case 'result':
     *       console.log('Final result:', message.result);
     *       break;
     *     case 'error':
     *       console.error('Error:', message.error);
     *       break;
     *   }
     * }
     * ```
     *
     * @experimental Use `client.experimental.tasks.requestStream()` to access this method.
     */
    async *requestStream(request, resultSchema, options) {
      var _a, _b, _c, _d;
      const { task } = options !== null && options !== void 0 ? options : {};
      if (!task) {
        try {
          const result = await this.request(request, resultSchema, options);
          yield { type: "result", result };
        } catch (error) {
          yield {
            type: "error",
            error: error instanceof McpError ? error : new McpError(ErrorCode.InternalError, String(error))
          };
        }
        return;
      }
      let taskId;
      try {
        const createResult = await this.request(request, CreateTaskResultSchema, options);
        if (createResult.task) {
          taskId = createResult.task.taskId;
          yield { type: "taskCreated", task: createResult.task };
        } else {
          throw new McpError(ErrorCode.InternalError, "Task creation did not return a task");
        }
        while (true) {
          const task2 = await this.getTask({ taskId }, options);
          yield { type: "taskStatus", task: task2 };
          if (isTerminal(task2.status)) {
            if (task2.status === "completed") {
              const result = await this.getTaskResult({ taskId }, resultSchema, options);
              yield { type: "result", result };
            } else if (task2.status === "failed") {
              yield {
                type: "error",
                error: new McpError(ErrorCode.InternalError, `Task ${taskId} failed`)
              };
            } else if (task2.status === "cancelled") {
              yield {
                type: "error",
                error: new McpError(ErrorCode.InternalError, `Task ${taskId} was cancelled`)
              };
            }
            return;
          }
          if (task2.status === "input_required") {
            const result = await this.getTaskResult({ taskId }, resultSchema, options);
            yield { type: "result", result };
            return;
          }
          const pollInterval = (_c = (_a = task2.pollInterval) !== null && _a !== void 0 ? _a : (_b = this._options) === null || _b === void 0 ? void 0 : _b.defaultTaskPollInterval) !== null && _c !== void 0 ? _c : 1e3;
          await new Promise((resolve2) => setTimeout(resolve2, pollInterval));
          (_d = options === null || options === void 0 ? void 0 : options.signal) === null || _d === void 0 ? void 0 : _d.throwIfAborted();
        }
      } catch (error) {
        yield {
          type: "error",
          error: error instanceof McpError ? error : new McpError(ErrorCode.InternalError, String(error))
        };
      }
    }
    /**
     * Sends a request and waits for a response.
     *
     * Do not use this method to emit notifications! Use notification() instead.
     */
    request(request, resultSchema, options) {
      const { relatedRequestId, resumptionToken, onresumptiontoken, task, relatedTask } = options !== null && options !== void 0 ? options : {};
      return new Promise((resolve2, reject) => {
        var _a, _b, _c, _d, _e, _f, _g;
        const earlyReject = (error) => {
          reject(error);
        };
        if (!this._transport) {
          earlyReject(new Error("Not connected"));
          return;
        }
        if (((_a = this._options) === null || _a === void 0 ? void 0 : _a.enforceStrictCapabilities) === true) {
          try {
            this.assertCapabilityForMethod(request.method);
            if (task) {
              this.assertTaskCapability(request.method);
            }
          } catch (e) {
            earlyReject(e);
            return;
          }
        }
        (_b = options === null || options === void 0 ? void 0 : options.signal) === null || _b === void 0 ? void 0 : _b.throwIfAborted();
        const messageId = this._requestMessageId++;
        const jsonrpcRequest = {
          ...request,
          jsonrpc: "2.0",
          id: messageId
        };
        if (options === null || options === void 0 ? void 0 : options.onprogress) {
          this._progressHandlers.set(messageId, options.onprogress);
          jsonrpcRequest.params = {
            ...request.params,
            _meta: {
              ...((_c = request.params) === null || _c === void 0 ? void 0 : _c._meta) || {},
              progressToken: messageId
            }
          };
        }
        if (task) {
          jsonrpcRequest.params = {
            ...jsonrpcRequest.params,
            task
          };
        }
        if (relatedTask) {
          jsonrpcRequest.params = {
            ...jsonrpcRequest.params,
            _meta: {
              ...((_d = jsonrpcRequest.params) === null || _d === void 0 ? void 0 : _d._meta) || {},
              [RELATED_TASK_META_KEY]: relatedTask
            }
          };
        }
        const cancel = (reason) => {
          var _a2;
          this._responseHandlers.delete(messageId);
          this._progressHandlers.delete(messageId);
          this._cleanupTimeout(messageId);
          (_a2 = this._transport) === null || _a2 === void 0 ? void 0 : _a2.send({
            jsonrpc: "2.0",
            method: "notifications/cancelled",
            params: {
              requestId: messageId,
              reason: String(reason)
            }
          }, { relatedRequestId, resumptionToken, onresumptiontoken }).catch((error2) => this._onerror(new Error(`Failed to send cancellation: ${error2}`)));
          const error = reason instanceof McpError ? reason : new McpError(ErrorCode.RequestTimeout, String(reason));
          reject(error);
        };
        this._responseHandlers.set(messageId, (response) => {
          var _a2;
          if ((_a2 = options === null || options === void 0 ? void 0 : options.signal) === null || _a2 === void 0 ? void 0 : _a2.aborted) {
            return;
          }
          if (response instanceof Error) {
            return reject(response);
          }
          try {
            const parseResult = safeParse(resultSchema, response.result);
            if (!parseResult.success) {
              reject(parseResult.error);
            } else {
              resolve2(parseResult.data);
            }
          } catch (error) {
            reject(error);
          }
        });
        (_e = options === null || options === void 0 ? void 0 : options.signal) === null || _e === void 0 ? void 0 : _e.addEventListener("abort", () => {
          var _a2;
          cancel((_a2 = options === null || options === void 0 ? void 0 : options.signal) === null || _a2 === void 0 ? void 0 : _a2.reason);
        });
        const timeout = (_f = options === null || options === void 0 ? void 0 : options.timeout) !== null && _f !== void 0 ? _f : DEFAULT_REQUEST_TIMEOUT_MSEC;
        const timeoutHandler = () => cancel(McpError.fromError(ErrorCode.RequestTimeout, "Request timed out", { timeout }));
        this._setupTimeout(messageId, timeout, options === null || options === void 0 ? void 0 : options.maxTotalTimeout, timeoutHandler, (_g = options === null || options === void 0 ? void 0 : options.resetTimeoutOnProgress) !== null && _g !== void 0 ? _g : false);
        const relatedTaskId = relatedTask === null || relatedTask === void 0 ? void 0 : relatedTask.taskId;
        if (relatedTaskId) {
          const responseResolver = (response) => {
            const handler = this._responseHandlers.get(messageId);
            if (handler) {
              handler(response);
            } else {
              this._onerror(new Error(`Response handler missing for side-channeled request ${messageId}`));
            }
          };
          this._requestResolvers.set(messageId, responseResolver);
          this._enqueueTaskMessage(relatedTaskId, {
            type: "request",
            message: jsonrpcRequest,
            timestamp: Date.now()
          }).catch((error) => {
            this._cleanupTimeout(messageId);
            reject(error);
          });
        } else {
          this._transport.send(jsonrpcRequest, { relatedRequestId, resumptionToken, onresumptiontoken }).catch((error) => {
            this._cleanupTimeout(messageId);
            reject(error);
          });
        }
      });
    }
    /**
     * Gets the current status of a task.
     *
     * @experimental Use `client.experimental.tasks.getTask()` to access this method.
     */
    async getTask(params, options) {
      return this.request({ method: "tasks/get", params }, GetTaskResultSchema, options);
    }
    /**
     * Retrieves the result of a completed task.
     *
     * @experimental Use `client.experimental.tasks.getTaskResult()` to access this method.
     */
    async getTaskResult(params, resultSchema, options) {
      return this.request({ method: "tasks/result", params }, resultSchema, options);
    }
    /**
     * Lists tasks, optionally starting from a pagination cursor.
     *
     * @experimental Use `client.experimental.tasks.listTasks()` to access this method.
     */
    async listTasks(params, options) {
      return this.request({ method: "tasks/list", params }, ListTasksResultSchema, options);
    }
    /**
     * Cancels a specific task.
     *
     * @experimental Use `client.experimental.tasks.cancelTask()` to access this method.
     */
    async cancelTask(params, options) {
      return this.request({ method: "tasks/cancel", params }, CancelTaskResultSchema, options);
    }
    /**
     * Emits a notification, which is a one-way message that does not expect a response.
     */
    async notification(notification, options) {
      var _a, _b, _c, _d, _e;
      if (!this._transport) {
        throw new Error("Not connected");
      }
      this.assertNotificationCapability(notification.method);
      const relatedTaskId = (_a = options === null || options === void 0 ? void 0 : options.relatedTask) === null || _a === void 0 ? void 0 : _a.taskId;
      if (relatedTaskId) {
        const jsonrpcNotification2 = {
          ...notification,
          jsonrpc: "2.0",
          params: {
            ...notification.params,
            _meta: {
              ...((_b = notification.params) === null || _b === void 0 ? void 0 : _b._meta) || {},
              [RELATED_TASK_META_KEY]: options.relatedTask
            }
          }
        };
        await this._enqueueTaskMessage(relatedTaskId, {
          type: "notification",
          message: jsonrpcNotification2,
          timestamp: Date.now()
        });
        return;
      }
      const debouncedMethods = (_d = (_c = this._options) === null || _c === void 0 ? void 0 : _c.debouncedNotificationMethods) !== null && _d !== void 0 ? _d : [];
      const canDebounce = debouncedMethods.includes(notification.method) && !notification.params && !(options === null || options === void 0 ? void 0 : options.relatedRequestId) && !(options === null || options === void 0 ? void 0 : options.relatedTask);
      if (canDebounce) {
        if (this._pendingDebouncedNotifications.has(notification.method)) {
          return;
        }
        this._pendingDebouncedNotifications.add(notification.method);
        Promise.resolve().then(() => {
          var _a2, _b2;
          this._pendingDebouncedNotifications.delete(notification.method);
          if (!this._transport) {
            return;
          }
          let jsonrpcNotification2 = {
            ...notification,
            jsonrpc: "2.0"
          };
          if (options === null || options === void 0 ? void 0 : options.relatedTask) {
            jsonrpcNotification2 = {
              ...jsonrpcNotification2,
              params: {
                ...jsonrpcNotification2.params,
                _meta: {
                  ...((_a2 = jsonrpcNotification2.params) === null || _a2 === void 0 ? void 0 : _a2._meta) || {},
                  [RELATED_TASK_META_KEY]: options.relatedTask
                }
              }
            };
          }
          (_b2 = this._transport) === null || _b2 === void 0 ? void 0 : _b2.send(jsonrpcNotification2, options).catch((error) => this._onerror(error));
        });
        return;
      }
      let jsonrpcNotification = {
        ...notification,
        jsonrpc: "2.0"
      };
      if (options === null || options === void 0 ? void 0 : options.relatedTask) {
        jsonrpcNotification = {
          ...jsonrpcNotification,
          params: {
            ...jsonrpcNotification.params,
            _meta: {
              ...((_e = jsonrpcNotification.params) === null || _e === void 0 ? void 0 : _e._meta) || {},
              [RELATED_TASK_META_KEY]: options.relatedTask
            }
          }
        };
      }
      await this._transport.send(jsonrpcNotification, options);
    }
    /**
     * Registers a handler to invoke when this protocol object receives a request with the given method.
     *
     * Note that this will replace any previous request handler for the same method.
     */
    setRequestHandler(requestSchema, handler) {
      const method = getMethodLiteral(requestSchema);
      this.assertRequestHandlerCapability(method);
      this._requestHandlers.set(method, (request, extra) => {
        const parsed = parseWithCompat(requestSchema, request);
        return Promise.resolve(handler(parsed, extra));
      });
    }
    /**
     * Removes the request handler for the given method.
     */
    removeRequestHandler(method) {
      this._requestHandlers.delete(method);
    }
    /**
     * Asserts that a request handler has not already been set for the given method, in preparation for a new one being automatically installed.
     */
    assertCanSetRequestHandler(method) {
      if (this._requestHandlers.has(method)) {
        throw new Error(`A request handler for ${method} already exists, which would be overridden`);
      }
    }
    /**
     * Registers a handler to invoke when this protocol object receives a notification with the given method.
     *
     * Note that this will replace any previous notification handler for the same method.
     */
    setNotificationHandler(notificationSchema, handler) {
      const method = getMethodLiteral(notificationSchema);
      this._notificationHandlers.set(method, (notification) => {
        const parsed = parseWithCompat(notificationSchema, notification);
        return Promise.resolve(handler(parsed));
      });
    }
    /**
     * Removes the notification handler for the given method.
     */
    removeNotificationHandler(method) {
      this._notificationHandlers.delete(method);
    }
    /**
     * Cleans up the progress handler associated with a task.
     * This should be called when a task reaches a terminal status.
     */
    _cleanupTaskProgressHandler(taskId) {
      const progressToken = this._taskProgressTokens.get(taskId);
      if (progressToken !== void 0) {
        this._progressHandlers.delete(progressToken);
        this._taskProgressTokens.delete(taskId);
      }
    }
    /**
     * Enqueues a task-related message for side-channel delivery via tasks/result.
     * @param taskId The task ID to associate the message with
     * @param message The message to enqueue
     * @param sessionId Optional session ID for binding the operation to a specific session
     * @throws Error if taskStore is not configured or if enqueue fails (e.g., queue overflow)
     *
     * Note: If enqueue fails, it's the TaskMessageQueue implementation's responsibility to handle
     * the error appropriately (e.g., by failing the task, logging, etc.). The Protocol layer
     * simply propagates the error.
     */
    async _enqueueTaskMessage(taskId, message, sessionId) {
      var _a;
      if (!this._taskStore || !this._taskMessageQueue) {
        throw new Error("Cannot enqueue task message: taskStore and taskMessageQueue are not configured");
      }
      const maxQueueSize = (_a = this._options) === null || _a === void 0 ? void 0 : _a.maxTaskQueueSize;
      await this._taskMessageQueue.enqueue(taskId, message, sessionId, maxQueueSize);
    }
    /**
     * Clears the message queue for a task and rejects any pending request resolvers.
     * @param taskId The task ID whose queue should be cleared
     * @param sessionId Optional session ID for binding the operation to a specific session
     */
    async _clearTaskQueue(taskId, sessionId) {
      if (this._taskMessageQueue) {
        const messages = await this._taskMessageQueue.dequeueAll(taskId, sessionId);
        for (const message of messages) {
          if (message.type === "request" && isJSONRPCRequest(message.message)) {
            const requestId = message.message.id;
            const resolver = this._requestResolvers.get(requestId);
            if (resolver) {
              resolver(new McpError(ErrorCode.InternalError, "Task cancelled or completed"));
              this._requestResolvers.delete(requestId);
            } else {
              this._onerror(new Error(`Resolver missing for request ${requestId} during task ${taskId} cleanup`));
            }
          }
        }
      }
    }
    /**
     * Waits for a task update (new messages or status change) with abort signal support.
     * Uses polling to check for updates at the task's configured poll interval.
     * @param taskId The task ID to wait for
     * @param signal Abort signal to cancel the wait
     * @returns Promise that resolves when an update occurs or rejects if aborted
     */
    async _waitForTaskUpdate(taskId, signal) {
      var _a, _b, _c;
      let interval = (_b = (_a = this._options) === null || _a === void 0 ? void 0 : _a.defaultTaskPollInterval) !== null && _b !== void 0 ? _b : 1e3;
      try {
        const task = await ((_c = this._taskStore) === null || _c === void 0 ? void 0 : _c.getTask(taskId));
        if (task === null || task === void 0 ? void 0 : task.pollInterval) {
          interval = task.pollInterval;
        }
      } catch (_d) {
      }
      return new Promise((resolve2, reject) => {
        if (signal.aborted) {
          reject(new McpError(ErrorCode.InvalidRequest, "Request cancelled"));
          return;
        }
        const timeoutId = setTimeout(resolve2, interval);
        signal.addEventListener("abort", () => {
          clearTimeout(timeoutId);
          reject(new McpError(ErrorCode.InvalidRequest, "Request cancelled"));
        }, { once: true });
      });
    }
    requestTaskStore(request, sessionId) {
      const taskStore = this._taskStore;
      if (!taskStore) {
        throw new Error("No task store configured");
      }
      return {
        createTask: async (taskParams) => {
          if (!request) {
            throw new Error("No request provided");
          }
          return await taskStore.createTask(taskParams, request.id, {
            method: request.method,
            params: request.params
          }, sessionId);
        },
        getTask: async (taskId) => {
          const task = await taskStore.getTask(taskId, sessionId);
          if (!task) {
            throw new McpError(ErrorCode.InvalidParams, "Failed to retrieve task: Task not found");
          }
          return task;
        },
        storeTaskResult: async (taskId, status, result) => {
          await taskStore.storeTaskResult(taskId, status, result, sessionId);
          const task = await taskStore.getTask(taskId, sessionId);
          if (task) {
            const notification = TaskStatusNotificationSchema.parse({
              method: "notifications/tasks/status",
              params: task
            });
            await this.notification(notification);
            if (isTerminal(task.status)) {
              this._cleanupTaskProgressHandler(taskId);
            }
          }
        },
        getTaskResult: (taskId) => {
          return taskStore.getTaskResult(taskId, sessionId);
        },
        updateTaskStatus: async (taskId, status, statusMessage) => {
          const task = await taskStore.getTask(taskId, sessionId);
          if (!task) {
            throw new McpError(ErrorCode.InvalidParams, `Task "${taskId}" not found - it may have been cleaned up`);
          }
          if (isTerminal(task.status)) {
            throw new McpError(ErrorCode.InvalidParams, `Cannot update task "${taskId}" from terminal status "${task.status}" to "${status}". Terminal states (completed, failed, cancelled) cannot transition to other states.`);
          }
          await taskStore.updateTaskStatus(taskId, status, statusMessage, sessionId);
          const updatedTask = await taskStore.getTask(taskId, sessionId);
          if (updatedTask) {
            const notification = TaskStatusNotificationSchema.parse({
              method: "notifications/tasks/status",
              params: updatedTask
            });
            await this.notification(notification);
            if (isTerminal(updatedTask.status)) {
              this._cleanupTaskProgressHandler(taskId);
            }
          }
        },
        listTasks: (cursor) => {
          return taskStore.listTasks(cursor, sessionId);
        }
      };
    }
  }
  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }
  function mergeCapabilities(base, additional) {
    const result = { ...base };
    for (const key in additional) {
      const k = key;
      const addValue = additional[k];
      if (addValue === void 0)
        continue;
      const baseValue = result[k];
      if (isPlainObject(baseValue) && isPlainObject(addValue)) {
        result[k] = { ...baseValue, ...addValue };
      } else {
        result[k] = addValue;
      }
    }
    return result;
  }
  var dist = { exports: {} };
  var formats = {};
  var hasRequiredFormats;
  function requireFormats() {
    if (hasRequiredFormats) return formats;
    hasRequiredFormats = 1;
    (function(exports3) {
      Object.defineProperty(exports3, "__esModule", { value: true });
      exports3.formatNames = exports3.fastFormats = exports3.fullFormats = void 0;
      function fmtDef(validate2, compare) {
        return { validate: validate2, compare };
      }
      exports3.fullFormats = {
        // date: http://tools.ietf.org/html/rfc3339#section-5.6
        date: fmtDef(date2, compareDate),
        // date-time: http://tools.ietf.org/html/rfc3339#section-5.6
        time: fmtDef(getTime(true), compareTime),
        "date-time": fmtDef(getDateTime(true), compareDateTime),
        "iso-time": fmtDef(getTime(), compareIsoTime),
        "iso-date-time": fmtDef(getDateTime(), compareIsoDateTime),
        // duration: https://tools.ietf.org/html/rfc3339#appendix-A
        duration: /^P(?!$)((\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?|(\d+W)?)$/,
        uri: uri2,
        "uri-reference": /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i,
        // uri-template: https://tools.ietf.org/html/rfc6570
        "uri-template": /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i,
        // For the source: https://gist.github.com/dperini/729294
        // For test cases: https://mathiasbynens.be/demo/url-regex
        url: /^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)(?:\.(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu,
        email: /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
        hostname: /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i,
        // optimized https://www.safaribooksonline.com/library/view/regular-expressions-cookbook/9780596802837/ch07s16.html
        ipv4: /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/,
        ipv6: /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i,
        regex,
        // uuid: http://tools.ietf.org/html/rfc4122
        uuid: /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,
        // JSON-pointer: https://tools.ietf.org/html/rfc6901
        // uri fragment: https://tools.ietf.org/html/rfc3986#appendix-A
        "json-pointer": /^(?:\/(?:[^~/]|~0|~1)*)*$/,
        "json-pointer-uri-fragment": /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i,
        // relative JSON-pointer: http://tools.ietf.org/html/draft-luff-relative-json-pointer-00
        "relative-json-pointer": /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/,
        // the following formats are used by the openapi specification: https://spec.openapis.org/oas/v3.0.0#data-types
        // byte: https://github.com/miguelmota/is-base64
        byte,
        // signed 32 bit integer
        int32: { type: "number", validate: validateInt32 },
        // signed 64 bit integer
        int64: { type: "number", validate: validateInt64 },
        // C-type float
        float: { type: "number", validate: validateNumber },
        // C-type double
        double: { type: "number", validate: validateNumber },
        // hint to the UI to hide input strings
        password: true,
        // unchecked string payload
        binary: true
      };
      exports3.fastFormats = {
        ...exports3.fullFormats,
        date: fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d$/, compareDate),
        time: fmtDef(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, compareTime),
        "date-time": fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, compareDateTime),
        "iso-time": fmtDef(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, compareIsoTime),
        "iso-date-time": fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, compareIsoDateTime),
        // uri: https://github.com/mafintosh/is-my-json-valid/blob/master/formats.js
        uri: /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i,
        "uri-reference": /^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
        // email (sources from jsen validator):
        // http://stackoverflow.com/questions/201323/using-a-regular-expression-to-validate-an-email-address#answer-8829363
        // http://www.w3.org/TR/html5/forms.html#valid-e-mail-address (search for 'wilful violation')
        email: /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i
      };
      exports3.formatNames = Object.keys(exports3.fullFormats);
      function isLeapYear(year) {
        return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
      }
      const DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
      const DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      function date2(str) {
        const matches = DATE.exec(str);
        if (!matches)
          return false;
        const year = +matches[1];
        const month = +matches[2];
        const day = +matches[3];
        return month >= 1 && month <= 12 && day >= 1 && day <= (month === 2 && isLeapYear(year) ? 29 : DAYS[month]);
      }
      function compareDate(d1, d2) {
        if (!(d1 && d2))
          return void 0;
        if (d1 > d2)
          return 1;
        if (d1 < d2)
          return -1;
        return 0;
      }
      const TIME = /^(\d\d):(\d\d):(\d\d(?:\.\d+)?)(z|([+-])(\d\d)(?::?(\d\d))?)?$/i;
      function getTime(strictTimeZone) {
        return function time2(str) {
          const matches = TIME.exec(str);
          if (!matches)
            return false;
          const hr = +matches[1];
          const min = +matches[2];
          const sec = +matches[3];
          const tz = matches[4];
          const tzSign = matches[5] === "-" ? -1 : 1;
          const tzH = +(matches[6] || 0);
          const tzM = +(matches[7] || 0);
          if (tzH > 23 || tzM > 59 || strictTimeZone && !tz)
            return false;
          if (hr <= 23 && min <= 59 && sec < 60)
            return true;
          const utcMin = min - tzM * tzSign;
          const utcHr = hr - tzH * tzSign - (utcMin < 0 ? 1 : 0);
          return (utcHr === 23 || utcHr === -1) && (utcMin === 59 || utcMin === -1) && sec < 61;
        };
      }
      function compareTime(s1, s2) {
        if (!(s1 && s2))
          return void 0;
        const t1 = (/* @__PURE__ */ new Date("2020-01-01T" + s1)).valueOf();
        const t2 = (/* @__PURE__ */ new Date("2020-01-01T" + s2)).valueOf();
        if (!(t1 && t2))
          return void 0;
        return t1 - t2;
      }
      function compareIsoTime(t1, t2) {
        if (!(t1 && t2))
          return void 0;
        const a1 = TIME.exec(t1);
        const a2 = TIME.exec(t2);
        if (!(a1 && a2))
          return void 0;
        t1 = a1[1] + a1[2] + a1[3];
        t2 = a2[1] + a2[2] + a2[3];
        if (t1 > t2)
          return 1;
        if (t1 < t2)
          return -1;
        return 0;
      }
      const DATE_TIME_SEPARATOR = /t|\s/i;
      function getDateTime(strictTimeZone) {
        const time2 = getTime(strictTimeZone);
        return function date_time(str) {
          const dateTime = str.split(DATE_TIME_SEPARATOR);
          return dateTime.length === 2 && date2(dateTime[0]) && time2(dateTime[1]);
        };
      }
      function compareDateTime(dt1, dt2) {
        if (!(dt1 && dt2))
          return void 0;
        const d1 = new Date(dt1).valueOf();
        const d2 = new Date(dt2).valueOf();
        if (!(d1 && d2))
          return void 0;
        return d1 - d2;
      }
      function compareIsoDateTime(dt1, dt2) {
        if (!(dt1 && dt2))
          return void 0;
        const [d1, t1] = dt1.split(DATE_TIME_SEPARATOR);
        const [d2, t2] = dt2.split(DATE_TIME_SEPARATOR);
        const res = compareDate(d1, d2);
        if (res === void 0)
          return void 0;
        return res || compareTime(t1, t2);
      }
      const NOT_URI_FRAGMENT = /\/|:/;
      const URI = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
      function uri2(str) {
        return NOT_URI_FRAGMENT.test(str) && URI.test(str);
      }
      const BYTE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/gm;
      function byte(str) {
        BYTE.lastIndex = 0;
        return BYTE.test(str);
      }
      const MIN_INT32 = -2147483648;
      const MAX_INT32 = 2 ** 31 - 1;
      function validateInt32(value) {
        return Number.isInteger(value) && value <= MAX_INT32 && value >= MIN_INT32;
      }
      function validateInt64(value) {
        return Number.isInteger(value);
      }
      function validateNumber() {
        return true;
      }
      const Z_ANCHOR = /[^\\]\\Z/;
      function regex(str) {
        if (Z_ANCHOR.test(str))
          return false;
        try {
          new RegExp(str);
          return true;
        } catch (e) {
          return false;
        }
      }
    })(formats);
    return formats;
  }
  var limit = {};
  var hasRequiredLimit;
  function requireLimit() {
    if (hasRequiredLimit) return limit;
    hasRequiredLimit = 1;
    (function(exports3) {
      Object.defineProperty(exports3, "__esModule", { value: true });
      exports3.formatLimitDefinition = void 0;
      const ajv_1 = requireAjv();
      const codegen_1 = requireCodegen();
      const ops = codegen_1.operators;
      const KWDs = {
        formatMaximum: { okStr: "<=", ok: ops.LTE, fail: ops.GT },
        formatMinimum: { okStr: ">=", ok: ops.GTE, fail: ops.LT },
        formatExclusiveMaximum: { okStr: "<", ok: ops.LT, fail: ops.GTE },
        formatExclusiveMinimum: { okStr: ">", ok: ops.GT, fail: ops.LTE }
      };
      const error = {
        message: ({ keyword: keyword2, schemaCode }) => (0, codegen_1.str)`should be ${KWDs[keyword2].okStr} ${schemaCode}`,
        params: ({ keyword: keyword2, schemaCode }) => (0, codegen_1._)`{comparison: ${KWDs[keyword2].okStr}, limit: ${schemaCode}}`
      };
      exports3.formatLimitDefinition = {
        keyword: Object.keys(KWDs),
        type: "string",
        schemaType: "string",
        $data: true,
        error,
        code(cxt) {
          const { gen, data, schemaCode, keyword: keyword2, it } = cxt;
          const { opts, self: self2 } = it;
          if (!opts.validateFormats)
            return;
          const fCxt = new ajv_1.KeywordCxt(it, self2.RULES.all.format.definition, "format");
          if (fCxt.$data)
            validate$DataFormat();
          else
            validateFormat();
          function validate$DataFormat() {
            const fmts = gen.scopeValue("formats", {
              ref: self2.formats,
              code: opts.code.formats
            });
            const fmt = gen.const("fmt", (0, codegen_1._)`${fmts}[${fCxt.schemaCode}]`);
            cxt.fail$data((0, codegen_1.or)((0, codegen_1._)`typeof ${fmt} != "object"`, (0, codegen_1._)`${fmt} instanceof RegExp`, (0, codegen_1._)`typeof ${fmt}.compare != "function"`, compareCode(fmt)));
          }
          function validateFormat() {
            const format2 = fCxt.schema;
            const fmtDef = self2.formats[format2];
            if (!fmtDef || fmtDef === true)
              return;
            if (typeof fmtDef != "object" || fmtDef instanceof RegExp || typeof fmtDef.compare != "function") {
              throw new Error(`"${keyword2}": format "${format2}" does not define "compare" function`);
            }
            const fmt = gen.scopeValue("formats", {
              key: format2,
              ref: fmtDef,
              code: opts.code.formats ? (0, codegen_1._)`${opts.code.formats}${(0, codegen_1.getProperty)(format2)}` : void 0
            });
            cxt.fail$data(compareCode(fmt));
          }
          function compareCode(fmt) {
            return (0, codegen_1._)`${fmt}.compare(${data}, ${schemaCode}) ${KWDs[keyword2].fail} 0`;
          }
        },
        dependencies: ["format"]
      };
      const formatLimitPlugin = (ajv2) => {
        ajv2.addKeyword(exports3.formatLimitDefinition);
        return ajv2;
      };
      exports3.default = formatLimitPlugin;
    })(limit);
    return limit;
  }
  var hasRequiredDist;
  function requireDist() {
    if (hasRequiredDist) return dist.exports;
    hasRequiredDist = 1;
    (function(module2, exports3) {
      Object.defineProperty(exports3, "__esModule", { value: true });
      const formats_1 = requireFormats();
      const limit_1 = requireLimit();
      const codegen_1 = requireCodegen();
      const fullName = new codegen_1.Name("fullFormats");
      const fastName = new codegen_1.Name("fastFormats");
      const formatsPlugin = (ajv2, opts = { keywords: true }) => {
        if (Array.isArray(opts)) {
          addFormats(ajv2, opts, formats_1.fullFormats, fullName);
          return ajv2;
        }
        const [formats2, exportName] = opts.mode === "fast" ? [formats_1.fastFormats, fastName] : [formats_1.fullFormats, fullName];
        const list = opts.formats || formats_1.formatNames;
        addFormats(ajv2, list, formats2, exportName);
        if (opts.keywords)
          (0, limit_1.default)(ajv2);
        return ajv2;
      };
      formatsPlugin.get = (name, mode = "full") => {
        const formats2 = mode === "fast" ? formats_1.fastFormats : formats_1.fullFormats;
        const f = formats2[name];
        if (!f)
          throw new Error(`Unknown format "${name}"`);
        return f;
      };
      function addFormats(ajv2, list, fs, exportName) {
        var _a;
        var _b;
        (_a = (_b = ajv2.opts.code).formats) !== null && _a !== void 0 ? _a : _b.formats = (0, codegen_1._)`require("ajv-formats/dist/formats").${exportName}`;
        for (const f of list)
          ajv2.addFormat(f, fs[f]);
      }
      module2.exports = exports3 = formatsPlugin;
      Object.defineProperty(exports3, "__esModule", { value: true });
      exports3.default = formatsPlugin;
    })(dist, dist.exports);
    return dist.exports;
  }
  var distExports = requireDist();
  const _addFormats = /* @__PURE__ */ getDefaultExportFromCjs(distExports);
  function createDefaultAjvInstance() {
    const ajv2 = new ajvExports.Ajv({
      strict: false,
      validateFormats: true,
      validateSchema: false,
      allErrors: true
    });
    const addFormats = _addFormats;
    addFormats(ajv2);
    return ajv2;
  }
  class AjvJsonSchemaValidator {
    /**
     * Create an AJV validator
     *
     * @param ajv - Optional pre-configured AJV instance. If not provided, a default instance will be created.
     *
     * @example
     * ```typescript
     * // Use default configuration (recommended for most cases)
     * import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv';
     * const validator = new AjvJsonSchemaValidator();
     *
     * // Or provide custom AJV instance for advanced configuration
     * import { Ajv } from 'ajv';
     * import addFormats from 'ajv-formats';
     *
     * const ajv = new Ajv({ validateFormats: true });
     * addFormats(ajv);
     * const validator = new AjvJsonSchemaValidator(ajv);
     * ```
     */
    constructor(ajv2) {
      this._ajv = ajv2 !== null && ajv2 !== void 0 ? ajv2 : createDefaultAjvInstance();
    }
    /**
     * Create a validator for the given JSON Schema
     *
     * The validator is compiled once and can be reused multiple times.
     * If the schema has an $id, it will be cached by AJV automatically.
     *
     * @param schema - Standard JSON Schema object
     * @returns A validator function that validates input data
     */
    getValidator(schema) {
      var _a;
      const ajvValidator = "$id" in schema && typeof schema.$id === "string" ? (_a = this._ajv.getSchema(schema.$id)) !== null && _a !== void 0 ? _a : this._ajv.compile(schema) : this._ajv.compile(schema);
      return (input) => {
        const valid = ajvValidator(input);
        if (valid) {
          return {
            valid: true,
            data: input,
            errorMessage: void 0
          };
        } else {
          return {
            valid: false,
            data: void 0,
            errorMessage: this._ajv.errorsText(ajvValidator.errors)
          };
        }
      };
    }
  }
  class ExperimentalClientTasks {
    constructor(_client) {
      this._client = _client;
    }
    /**
     * Calls a tool and returns an AsyncGenerator that yields response messages.
     * The generator is guaranteed to end with either a 'result' or 'error' message.
     *
     * This method provides streaming access to tool execution, allowing you to
     * observe intermediate task status updates for long-running tool calls.
     * Automatically validates structured output if the tool has an outputSchema.
     *
     * @example
     * ```typescript
     * const stream = client.experimental.tasks.callToolStream({ name: 'myTool', arguments: {} });
     * for await (const message of stream) {
     *   switch (message.type) {
     *     case 'taskCreated':
     *       console.log('Tool execution started:', message.task.taskId);
     *       break;
     *     case 'taskStatus':
     *       console.log('Tool status:', message.task.status);
     *       break;
     *     case 'result':
     *       console.log('Tool result:', message.result);
     *       break;
     *     case 'error':
     *       console.error('Tool error:', message.error);
     *       break;
     *   }
     * }
     * ```
     *
     * @param params - Tool call parameters (name and arguments)
     * @param resultSchema - Zod schema for validating the result (defaults to CallToolResultSchema)
     * @param options - Optional request options (timeout, signal, task creation params, etc.)
     * @returns AsyncGenerator that yields ResponseMessage objects
     *
     * @experimental
     */
    async *callToolStream(params, resultSchema = CallToolResultSchema, options) {
      var _a;
      const clientInternal = this._client;
      const optionsWithTask = {
        ...options,
        // We check if the tool is known to be a task during auto-configuration, but assume
        // the caller knows what they're doing if they pass this explicitly
        task: (_a = options === null || options === void 0 ? void 0 : options.task) !== null && _a !== void 0 ? _a : clientInternal.isToolTask(params.name) ? {} : void 0
      };
      const stream = clientInternal.requestStream({ method: "tools/call", params }, resultSchema, optionsWithTask);
      const validator = clientInternal.getToolOutputValidator(params.name);
      for await (const message of stream) {
        if (message.type === "result" && validator) {
          const result = message.result;
          if (!result.structuredContent && !result.isError) {
            yield {
              type: "error",
              error: new McpError(ErrorCode.InvalidRequest, `Tool ${params.name} has an output schema but did not return structured content`)
            };
            return;
          }
          if (result.structuredContent) {
            try {
              const validationResult = validator(result.structuredContent);
              if (!validationResult.valid) {
                yield {
                  type: "error",
                  error: new McpError(ErrorCode.InvalidParams, `Structured content does not match the tool's output schema: ${validationResult.errorMessage}`)
                };
                return;
              }
            } catch (error) {
              if (error instanceof McpError) {
                yield { type: "error", error };
                return;
              }
              yield {
                type: "error",
                error: new McpError(ErrorCode.InvalidParams, `Failed to validate structured content: ${error instanceof Error ? error.message : String(error)}`)
              };
              return;
            }
          }
        }
        yield message;
      }
    }
    /**
     * Gets the current status of a task.
     *
     * @param taskId - The task identifier
     * @param options - Optional request options
     * @returns The task status
     *
     * @experimental
     */
    async getTask(taskId, options) {
      return this._client.getTask({ taskId }, options);
    }
    /**
     * Retrieves the result of a completed task.
     *
     * @param taskId - The task identifier
     * @param resultSchema - Zod schema for validating the result
     * @param options - Optional request options
     * @returns The task result
     *
     * @experimental
     */
    async getTaskResult(taskId, resultSchema, options) {
      return this._client.getTaskResult({ taskId }, resultSchema, options);
    }
    /**
     * Lists tasks with optional pagination.
     *
     * @param cursor - Optional pagination cursor
     * @param options - Optional request options
     * @returns List of tasks with optional next cursor
     *
     * @experimental
     */
    async listTasks(cursor, options) {
      return this._client.listTasks(cursor ? { cursor } : void 0, options);
    }
    /**
     * Cancels a running task.
     *
     * @param taskId - The task identifier
     * @param options - Optional request options
     *
     * @experimental
     */
    async cancelTask(taskId, options) {
      return this._client.cancelTask({ taskId }, options);
    }
    /**
     * Sends a request and returns an AsyncGenerator that yields response messages.
     * The generator is guaranteed to end with either a 'result' or 'error' message.
     *
     * This method provides streaming access to request processing, allowing you to
     * observe intermediate task status updates for task-augmented requests.
     *
     * @param request - The request to send
     * @param resultSchema - Zod schema for validating the result
     * @param options - Optional request options (timeout, signal, task creation params, etc.)
     * @returns AsyncGenerator that yields ResponseMessage objects
     *
     * @experimental
     */
    requestStream(request, resultSchema, options) {
      return this._client.requestStream(request, resultSchema, options);
    }
  }
  function assertToolsCallTaskCapability(requests, method, entityName) {
    var _a;
    if (!requests) {
      throw new Error(`${entityName} does not support task creation (required for ${method})`);
    }
    switch (method) {
      case "tools/call":
        if (!((_a = requests.tools) === null || _a === void 0 ? void 0 : _a.call)) {
          throw new Error(`${entityName} does not support task creation for tools/call (required for ${method})`);
        }
        break;
    }
  }
  function assertClientRequestTaskCapability(requests, method, entityName) {
    var _a, _b;
    if (!requests) {
      throw new Error(`${entityName} does not support task creation (required for ${method})`);
    }
    switch (method) {
      case "sampling/createMessage":
        if (!((_a = requests.sampling) === null || _a === void 0 ? void 0 : _a.createMessage)) {
          throw new Error(`${entityName} does not support task creation for sampling/createMessage (required for ${method})`);
        }
        break;
      case "elicitation/create":
        if (!((_b = requests.elicitation) === null || _b === void 0 ? void 0 : _b.create)) {
          throw new Error(`${entityName} does not support task creation for elicitation/create (required for ${method})`);
        }
        break;
    }
  }
  function applyElicitationDefaults(schema, data) {
    if (!schema || data === null || typeof data !== "object")
      return;
    if (schema.type === "object" && schema.properties && typeof schema.properties === "object") {
      const obj = data;
      const props = schema.properties;
      for (const key of Object.keys(props)) {
        const propSchema = props[key];
        if (obj[key] === void 0 && Object.prototype.hasOwnProperty.call(propSchema, "default")) {
          obj[key] = propSchema.default;
        }
        if (obj[key] !== void 0) {
          applyElicitationDefaults(propSchema, obj[key]);
        }
      }
    }
    if (Array.isArray(schema.anyOf)) {
      for (const sub of schema.anyOf) {
        applyElicitationDefaults(sub, data);
      }
    }
    if (Array.isArray(schema.oneOf)) {
      for (const sub of schema.oneOf) {
        applyElicitationDefaults(sub, data);
      }
    }
  }
  function getSupportedElicitationModes(capabilities) {
    if (!capabilities) {
      return { supportsFormMode: false, supportsUrlMode: false };
    }
    const hasFormCapability = capabilities.form !== void 0;
    const hasUrlCapability = capabilities.url !== void 0;
    const supportsFormMode = hasFormCapability || !hasFormCapability && !hasUrlCapability;
    const supportsUrlMode = hasUrlCapability;
    return { supportsFormMode, supportsUrlMode };
  }
  class Client extends Protocol {
    /**
     * Initializes this client with the given name and version information.
     */
    constructor(_clientInfo, options) {
      var _a, _b;
      super(options);
      this._clientInfo = _clientInfo;
      this._cachedToolOutputValidators = /* @__PURE__ */ new Map();
      this._cachedKnownTaskTools = /* @__PURE__ */ new Set();
      this._cachedRequiredTaskTools = /* @__PURE__ */ new Set();
      this._capabilities = (_a = options === null || options === void 0 ? void 0 : options.capabilities) !== null && _a !== void 0 ? _a : {};
      this._jsonSchemaValidator = (_b = options === null || options === void 0 ? void 0 : options.jsonSchemaValidator) !== null && _b !== void 0 ? _b : new AjvJsonSchemaValidator();
    }
    /**
     * Access experimental features.
     *
     * WARNING: These APIs are experimental and may change without notice.
     *
     * @experimental
     */
    get experimental() {
      if (!this._experimental) {
        this._experimental = {
          tasks: new ExperimentalClientTasks(this)
        };
      }
      return this._experimental;
    }
    /**
     * Registers new capabilities. This can only be called before connecting to a transport.
     *
     * The new capabilities will be merged with any existing capabilities previously given (e.g., at initialization).
     */
    registerCapabilities(capabilities) {
      if (this.transport) {
        throw new Error("Cannot register capabilities after connecting to transport");
      }
      this._capabilities = mergeCapabilities(this._capabilities, capabilities);
    }
    /**
     * Override request handler registration to enforce client-side validation for elicitation.
     */
    setRequestHandler(requestSchema, handler) {
      var _a, _b, _c;
      const shape = getObjectShape(requestSchema);
      const methodSchema = shape === null || shape === void 0 ? void 0 : shape.method;
      if (!methodSchema) {
        throw new Error("Schema is missing a method literal");
      }
      let methodValue;
      if (isZ4Schema(methodSchema)) {
        const v4Schema = methodSchema;
        const v4Def = (_a = v4Schema._zod) === null || _a === void 0 ? void 0 : _a.def;
        methodValue = (_b = v4Def === null || v4Def === void 0 ? void 0 : v4Def.value) !== null && _b !== void 0 ? _b : v4Schema.value;
      } else {
        const v3Schema = methodSchema;
        const legacyDef = v3Schema._def;
        methodValue = (_c = legacyDef === null || legacyDef === void 0 ? void 0 : legacyDef.value) !== null && _c !== void 0 ? _c : v3Schema.value;
      }
      if (typeof methodValue !== "string") {
        throw new Error("Schema method literal must be a string");
      }
      const method = methodValue;
      if (method === "elicitation/create") {
        const wrappedHandler = async (request, extra) => {
          var _a2, _b2, _c2;
          const validatedRequest = safeParse(ElicitRequestSchema, request);
          if (!validatedRequest.success) {
            const errorMessage = validatedRequest.error instanceof Error ? validatedRequest.error.message : String(validatedRequest.error);
            throw new McpError(ErrorCode.InvalidParams, `Invalid elicitation request: ${errorMessage}`);
          }
          const { params } = validatedRequest.data;
          const mode = (_a2 = params.mode) !== null && _a2 !== void 0 ? _a2 : "form";
          const { supportsFormMode, supportsUrlMode } = getSupportedElicitationModes(this._capabilities.elicitation);
          if (mode === "form" && !supportsFormMode) {
            throw new McpError(ErrorCode.InvalidParams, "Client does not support form-mode elicitation requests");
          }
          if (mode === "url" && !supportsUrlMode) {
            throw new McpError(ErrorCode.InvalidParams, "Client does not support URL-mode elicitation requests");
          }
          const result = await Promise.resolve(handler(request, extra));
          if (params.task) {
            const taskValidationResult = safeParse(CreateTaskResultSchema, result);
            if (!taskValidationResult.success) {
              const errorMessage = taskValidationResult.error instanceof Error ? taskValidationResult.error.message : String(taskValidationResult.error);
              throw new McpError(ErrorCode.InvalidParams, `Invalid task creation result: ${errorMessage}`);
            }
            return taskValidationResult.data;
          }
          const validationResult = safeParse(ElicitResultSchema, result);
          if (!validationResult.success) {
            const errorMessage = validationResult.error instanceof Error ? validationResult.error.message : String(validationResult.error);
            throw new McpError(ErrorCode.InvalidParams, `Invalid elicitation result: ${errorMessage}`);
          }
          const validatedResult = validationResult.data;
          const requestedSchema = mode === "form" ? params.requestedSchema : void 0;
          if (mode === "form" && validatedResult.action === "accept" && validatedResult.content && requestedSchema) {
            if ((_c2 = (_b2 = this._capabilities.elicitation) === null || _b2 === void 0 ? void 0 : _b2.form) === null || _c2 === void 0 ? void 0 : _c2.applyDefaults) {
              try {
                applyElicitationDefaults(requestedSchema, validatedResult.content);
              } catch (_d) {
              }
            }
          }
          return validatedResult;
        };
        return super.setRequestHandler(requestSchema, wrappedHandler);
      }
      if (method === "sampling/createMessage") {
        const wrappedHandler = async (request, extra) => {
          const validatedRequest = safeParse(CreateMessageRequestSchema, request);
          if (!validatedRequest.success) {
            const errorMessage = validatedRequest.error instanceof Error ? validatedRequest.error.message : String(validatedRequest.error);
            throw new McpError(ErrorCode.InvalidParams, `Invalid sampling request: ${errorMessage}`);
          }
          const { params } = validatedRequest.data;
          const result = await Promise.resolve(handler(request, extra));
          if (params.task) {
            const taskValidationResult = safeParse(CreateTaskResultSchema, result);
            if (!taskValidationResult.success) {
              const errorMessage = taskValidationResult.error instanceof Error ? taskValidationResult.error.message : String(taskValidationResult.error);
              throw new McpError(ErrorCode.InvalidParams, `Invalid task creation result: ${errorMessage}`);
            }
            return taskValidationResult.data;
          }
          const validationResult = safeParse(CreateMessageResultSchema, result);
          if (!validationResult.success) {
            const errorMessage = validationResult.error instanceof Error ? validationResult.error.message : String(validationResult.error);
            throw new McpError(ErrorCode.InvalidParams, `Invalid sampling result: ${errorMessage}`);
          }
          return validationResult.data;
        };
        return super.setRequestHandler(requestSchema, wrappedHandler);
      }
      return super.setRequestHandler(requestSchema, handler);
    }
    assertCapability(capability, method) {
      var _a;
      if (!((_a = this._serverCapabilities) === null || _a === void 0 ? void 0 : _a[capability])) {
        throw new Error(`Server does not support ${capability} (required for ${method})`);
      }
    }
    async connect(transport, options) {
      await super.connect(transport);
      if (transport.sessionId !== void 0) {
        return;
      }
      try {
        const result = await this.request({
          method: "initialize",
          params: {
            protocolVersion: LATEST_PROTOCOL_VERSION,
            capabilities: this._capabilities,
            clientInfo: this._clientInfo
          }
        }, InitializeResultSchema, options);
        if (result === void 0) {
          throw new Error(`Server sent invalid initialize result: ${result}`);
        }
        if (!SUPPORTED_PROTOCOL_VERSIONS.includes(result.protocolVersion)) {
          throw new Error(`Server's protocol version is not supported: ${result.protocolVersion}`);
        }
        this._serverCapabilities = result.capabilities;
        this._serverVersion = result.serverInfo;
        if (transport.setProtocolVersion) {
          transport.setProtocolVersion(result.protocolVersion);
        }
        this._instructions = result.instructions;
        await this.notification({
          method: "notifications/initialized"
        });
      } catch (error) {
        void this.close();
        throw error;
      }
    }
    /**
     * After initialization has completed, this will be populated with the server's reported capabilities.
     */
    getServerCapabilities() {
      return this._serverCapabilities;
    }
    /**
     * After initialization has completed, this will be populated with information about the server's name and version.
     */
    getServerVersion() {
      return this._serverVersion;
    }
    /**
     * After initialization has completed, this may be populated with information about the server's instructions.
     */
    getInstructions() {
      return this._instructions;
    }
    assertCapabilityForMethod(method) {
      var _a, _b, _c, _d, _e;
      switch (method) {
        case "logging/setLevel":
          if (!((_a = this._serverCapabilities) === null || _a === void 0 ? void 0 : _a.logging)) {
            throw new Error(`Server does not support logging (required for ${method})`);
          }
          break;
        case "prompts/get":
        case "prompts/list":
          if (!((_b = this._serverCapabilities) === null || _b === void 0 ? void 0 : _b.prompts)) {
            throw new Error(`Server does not support prompts (required for ${method})`);
          }
          break;
        case "resources/list":
        case "resources/templates/list":
        case "resources/read":
        case "resources/subscribe":
        case "resources/unsubscribe":
          if (!((_c = this._serverCapabilities) === null || _c === void 0 ? void 0 : _c.resources)) {
            throw new Error(`Server does not support resources (required for ${method})`);
          }
          if (method === "resources/subscribe" && !this._serverCapabilities.resources.subscribe) {
            throw new Error(`Server does not support resource subscriptions (required for ${method})`);
          }
          break;
        case "tools/call":
        case "tools/list":
          if (!((_d = this._serverCapabilities) === null || _d === void 0 ? void 0 : _d.tools)) {
            throw new Error(`Server does not support tools (required for ${method})`);
          }
          break;
        case "completion/complete":
          if (!((_e = this._serverCapabilities) === null || _e === void 0 ? void 0 : _e.completions)) {
            throw new Error(`Server does not support completions (required for ${method})`);
          }
          break;
      }
    }
    assertNotificationCapability(method) {
      var _a;
      switch (method) {
        case "notifications/roots/list_changed":
          if (!((_a = this._capabilities.roots) === null || _a === void 0 ? void 0 : _a.listChanged)) {
            throw new Error(`Client does not support roots list changed notifications (required for ${method})`);
          }
          break;
      }
    }
    assertRequestHandlerCapability(method) {
      if (!this._capabilities) {
        return;
      }
      switch (method) {
        case "sampling/createMessage":
          if (!this._capabilities.sampling) {
            throw new Error(`Client does not support sampling capability (required for ${method})`);
          }
          break;
        case "elicitation/create":
          if (!this._capabilities.elicitation) {
            throw new Error(`Client does not support elicitation capability (required for ${method})`);
          }
          break;
        case "roots/list":
          if (!this._capabilities.roots) {
            throw new Error(`Client does not support roots capability (required for ${method})`);
          }
          break;
        case "tasks/get":
        case "tasks/list":
        case "tasks/result":
        case "tasks/cancel":
          if (!this._capabilities.tasks) {
            throw new Error(`Client does not support tasks capability (required for ${method})`);
          }
          break;
      }
    }
    assertTaskCapability(method) {
      var _a, _b;
      assertToolsCallTaskCapability((_b = (_a = this._serverCapabilities) === null || _a === void 0 ? void 0 : _a.tasks) === null || _b === void 0 ? void 0 : _b.requests, method, "Server");
    }
    assertTaskHandlerCapability(method) {
      var _a;
      if (!this._capabilities) {
        return;
      }
      assertClientRequestTaskCapability((_a = this._capabilities.tasks) === null || _a === void 0 ? void 0 : _a.requests, method, "Client");
    }
    async ping(options) {
      return this.request({ method: "ping" }, EmptyResultSchema, options);
    }
    async complete(params, options) {
      return this.request({ method: "completion/complete", params }, CompleteResultSchema, options);
    }
    async setLoggingLevel(level, options) {
      return this.request({ method: "logging/setLevel", params: { level } }, EmptyResultSchema, options);
    }
    async getPrompt(params, options) {
      return this.request({ method: "prompts/get", params }, GetPromptResultSchema, options);
    }
    async listPrompts(params, options) {
      return this.request({ method: "prompts/list", params }, ListPromptsResultSchema, options);
    }
    async listResources(params, options) {
      return this.request({ method: "resources/list", params }, ListResourcesResultSchema, options);
    }
    async listResourceTemplates(params, options) {
      return this.request({ method: "resources/templates/list", params }, ListResourceTemplatesResultSchema, options);
    }
    async readResource(params, options) {
      return this.request({ method: "resources/read", params }, ReadResourceResultSchema, options);
    }
    async subscribeResource(params, options) {
      return this.request({ method: "resources/subscribe", params }, EmptyResultSchema, options);
    }
    async unsubscribeResource(params, options) {
      return this.request({ method: "resources/unsubscribe", params }, EmptyResultSchema, options);
    }
    /**
     * Calls a tool and waits for the result. Automatically validates structured output if the tool has an outputSchema.
     *
     * For task-based execution with streaming behavior, use client.experimental.tasks.callToolStream() instead.
     */
    async callTool(params, resultSchema = CallToolResultSchema, options) {
      if (this.isToolTaskRequired(params.name)) {
        throw new McpError(ErrorCode.InvalidRequest, `Tool "${params.name}" requires task-based execution. Use client.experimental.tasks.callToolStream() instead.`);
      }
      const result = await this.request({ method: "tools/call", params }, resultSchema, options);
      const validator = this.getToolOutputValidator(params.name);
      if (validator) {
        if (!result.structuredContent && !result.isError) {
          throw new McpError(ErrorCode.InvalidRequest, `Tool ${params.name} has an output schema but did not return structured content`);
        }
        if (result.structuredContent) {
          try {
            const validationResult = validator(result.structuredContent);
            if (!validationResult.valid) {
              throw new McpError(ErrorCode.InvalidParams, `Structured content does not match the tool's output schema: ${validationResult.errorMessage}`);
            }
          } catch (error) {
            if (error instanceof McpError) {
              throw error;
            }
            throw new McpError(ErrorCode.InvalidParams, `Failed to validate structured content: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
      return result;
    }
    isToolTask(toolName) {
      var _a, _b, _c, _d;
      if (!((_d = (_c = (_b = (_a = this._serverCapabilities) === null || _a === void 0 ? void 0 : _a.tasks) === null || _b === void 0 ? void 0 : _b.requests) === null || _c === void 0 ? void 0 : _c.tools) === null || _d === void 0 ? void 0 : _d.call)) {
        return false;
      }
      return this._cachedKnownTaskTools.has(toolName);
    }
    /**
     * Check if a tool requires task-based execution.
     * Unlike isToolTask which includes 'optional' tools, this only checks for 'required'.
     */
    isToolTaskRequired(toolName) {
      return this._cachedRequiredTaskTools.has(toolName);
    }
    /**
     * Cache validators for tool output schemas.
     * Called after listTools() to pre-compile validators for better performance.
     */
    cacheToolMetadata(tools) {
      var _a;
      this._cachedToolOutputValidators.clear();
      this._cachedKnownTaskTools.clear();
      this._cachedRequiredTaskTools.clear();
      for (const tool of tools) {
        if (tool.outputSchema) {
          const toolValidator = this._jsonSchemaValidator.getValidator(tool.outputSchema);
          this._cachedToolOutputValidators.set(tool.name, toolValidator);
        }
        const taskSupport = (_a = tool.execution) === null || _a === void 0 ? void 0 : _a.taskSupport;
        if (taskSupport === "required" || taskSupport === "optional") {
          this._cachedKnownTaskTools.add(tool.name);
        }
        if (taskSupport === "required") {
          this._cachedRequiredTaskTools.add(tool.name);
        }
      }
    }
    /**
     * Get cached validator for a tool
     */
    getToolOutputValidator(toolName) {
      return this._cachedToolOutputValidators.get(toolName);
    }
    async listTools(params, options) {
      const result = await this.request({ method: "tools/list", params }, ListToolsResultSchema, options);
      this.cacheToolMetadata(result.tools);
      return result;
    }
    async sendRootsListChanged() {
      return this.notification({ method: "notifications/roots/list_changed" });
    }
  }
  class ParseError extends Error {
    constructor(message, options) {
      super(message), this.name = "ParseError", this.type = options.type, this.field = options.field, this.value = options.value, this.line = options.line;
    }
  }
  function noop(_arg) {
  }
  function createParser(callbacks) {
    if (typeof callbacks == "function")
      throw new TypeError(
        "`callbacks` must be an object, got a function instead. Did you mean `{onEvent: fn}`?"
      );
    const { onEvent = noop, onError = noop, onRetry = noop, onComment } = callbacks;
    let incompleteLine = "", isFirstChunk = true, id2, data = "", eventType = "";
    function feed(newChunk) {
      const chunk = isFirstChunk ? newChunk.replace(/^\xEF\xBB\xBF/, "") : newChunk, [complete, incomplete] = splitLines(`${incompleteLine}${chunk}`);
      for (const line of complete)
        parseLine(line);
      incompleteLine = incomplete, isFirstChunk = false;
    }
    function parseLine(line) {
      if (line === "") {
        dispatchEvent();
        return;
      }
      if (line.startsWith(":")) {
        onComment && onComment(line.slice(line.startsWith(": ") ? 2 : 1));
        return;
      }
      const fieldSeparatorIndex = line.indexOf(":");
      if (fieldSeparatorIndex !== -1) {
        const field = line.slice(0, fieldSeparatorIndex), offset = line[fieldSeparatorIndex + 1] === " " ? 2 : 1, value = line.slice(fieldSeparatorIndex + offset);
        processField(field, value, line);
        return;
      }
      processField(line, "", line);
    }
    function processField(field, value, line) {
      switch (field) {
        case "event":
          eventType = value;
          break;
        case "data":
          data = `${data}${value}
`;
          break;
        case "id":
          id2 = value.includes("\0") ? void 0 : value;
          break;
        case "retry":
          /^\d+$/.test(value) ? onRetry(parseInt(value, 10)) : onError(
            new ParseError(`Invalid \`retry\` value: "${value}"`, {
              type: "invalid-retry",
              value,
              line
            })
          );
          break;
        default:
          onError(
            new ParseError(
              `Unknown field "${field.length > 20 ? `${field.slice(0, 20)}…` : field}"`,
              { type: "unknown-field", field, value, line }
            )
          );
          break;
      }
    }
    function dispatchEvent() {
      data.length > 0 && onEvent({
        id: id2,
        event: eventType || void 0,
        // If the data buffer's last character is a U+000A LINE FEED (LF) character,
        // then remove the last character from the data buffer.
        data: data.endsWith(`
`) ? data.slice(0, -1) : data
      }), id2 = void 0, data = "", eventType = "";
    }
    function reset(options = {}) {
      incompleteLine && options.consume && parseLine(incompleteLine), isFirstChunk = true, id2 = void 0, data = "", eventType = "", incompleteLine = "";
    }
    return { feed, reset };
  }
  function splitLines(chunk) {
    const lines = [];
    let incompleteLine = "", searchIndex = 0;
    for (; searchIndex < chunk.length; ) {
      const crIndex = chunk.indexOf("\r", searchIndex), lfIndex = chunk.indexOf(`
`, searchIndex);
      let lineEnd = -1;
      if (crIndex !== -1 && lfIndex !== -1 ? lineEnd = Math.min(crIndex, lfIndex) : crIndex !== -1 ? crIndex === chunk.length - 1 ? lineEnd = -1 : lineEnd = crIndex : lfIndex !== -1 && (lineEnd = lfIndex), lineEnd === -1) {
        incompleteLine = chunk.slice(searchIndex);
        break;
      } else {
        const line = chunk.slice(searchIndex, lineEnd);
        lines.push(line), searchIndex = lineEnd + 1, chunk[searchIndex - 1] === "\r" && chunk[searchIndex] === `
` && searchIndex++;
      }
    }
    return [lines, incompleteLine];
  }
  class ErrorEvent extends Event {
    /**
     * Constructs a new `ErrorEvent` instance. This is typically not called directly,
     * but rather emitted by the `EventSource` object when an error occurs.
     *
     * @param type - The type of the event (should be "error")
     * @param errorEventInitDict - Optional properties to include in the error event
     */
    constructor(type2, errorEventInitDict) {
      var _a, _b;
      super(type2), this.code = (_a = errorEventInitDict == null ? void 0 : errorEventInitDict.code) != null ? _a : void 0, this.message = (_b = errorEventInitDict == null ? void 0 : errorEventInitDict.message) != null ? _b : void 0;
    }
    /**
     * Node.js "hides" the `message` and `code` properties of the `ErrorEvent` instance,
     * when it is `console.log`'ed. This makes it harder to debug errors. To ease debugging,
     * we explicitly include the properties in the `inspect` method.
     *
     * This is automatically called by Node.js when you `console.log` an instance of this class.
     *
     * @param _depth - The current depth
     * @param options - The options passed to `util.inspect`
     * @param inspect - The inspect function to use (prevents having to import it from `util`)
     * @returns A string representation of the error
     */
    [Symbol.for("nodejs.util.inspect.custom")](_depth, options, inspect) {
      return inspect(inspectableError(this), options);
    }
    /**
     * Deno "hides" the `message` and `code` properties of the `ErrorEvent` instance,
     * when it is `console.log`'ed. This makes it harder to debug errors. To ease debugging,
     * we explicitly include the properties in the `inspect` method.
     *
     * This is automatically called by Deno when you `console.log` an instance of this class.
     *
     * @param inspect - The inspect function to use (prevents having to import it from `util`)
     * @param options - The options passed to `Deno.inspect`
     * @returns A string representation of the error
     */
    [Symbol.for("Deno.customInspect")](inspect, options) {
      return inspect(inspectableError(this), options);
    }
  }
  function syntaxError(message) {
    const DomException = globalThis.DOMException;
    return typeof DomException == "function" ? new DomException(message, "SyntaxError") : new SyntaxError(message);
  }
  function flattenError(err) {
    return err instanceof Error ? "errors" in err && Array.isArray(err.errors) ? err.errors.map(flattenError).join(", ") : "cause" in err && err.cause instanceof Error ? `${err}: ${flattenError(err.cause)}` : err.message : `${err}`;
  }
  function inspectableError(err) {
    return {
      type: err.type,
      message: err.message,
      code: err.code,
      defaultPrevented: err.defaultPrevented,
      cancelable: err.cancelable,
      timeStamp: err.timeStamp
    };
  }
  var __typeError = (msg) => {
    throw TypeError(msg);
  }, __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg), __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj)), __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value), __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), member.set(obj, value), value), __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method), _readyState, _url, _redirectUrl, _withCredentials, _fetch, _reconnectInterval, _reconnectTimer, _lastEventId, _controller, _parser, _onError, _onMessage, _onOpen, _EventSource_instances, connect_fn, _onFetchResponse, _onFetchError, getRequestOptions_fn, _onEvent, _onRetryChange, failConnection_fn, scheduleReconnect_fn, _reconnect;
  class EventSource extends EventTarget {
    constructor(url2, eventSourceInitDict) {
      var _a, _b;
      super(), __privateAdd(this, _EventSource_instances), this.CONNECTING = 0, this.OPEN = 1, this.CLOSED = 2, __privateAdd(this, _readyState), __privateAdd(this, _url), __privateAdd(this, _redirectUrl), __privateAdd(this, _withCredentials), __privateAdd(this, _fetch), __privateAdd(this, _reconnectInterval), __privateAdd(this, _reconnectTimer), __privateAdd(this, _lastEventId, null), __privateAdd(this, _controller), __privateAdd(this, _parser), __privateAdd(this, _onError, null), __privateAdd(this, _onMessage, null), __privateAdd(this, _onOpen, null), __privateAdd(this, _onFetchResponse, async (response) => {
        var _a2;
        __privateGet(this, _parser).reset();
        const { body, redirected, status, headers } = response;
        if (status === 204) {
          __privateMethod(this, _EventSource_instances, failConnection_fn).call(this, "Server sent HTTP 204, not reconnecting", 204), this.close();
          return;
        }
        if (redirected ? __privateSet(this, _redirectUrl, new URL(response.url)) : __privateSet(this, _redirectUrl, void 0), status !== 200) {
          __privateMethod(this, _EventSource_instances, failConnection_fn).call(this, `Non-200 status code (${status})`, status);
          return;
        }
        if (!(headers.get("content-type") || "").startsWith("text/event-stream")) {
          __privateMethod(this, _EventSource_instances, failConnection_fn).call(this, 'Invalid content type, expected "text/event-stream"', status);
          return;
        }
        if (__privateGet(this, _readyState) === this.CLOSED)
          return;
        __privateSet(this, _readyState, this.OPEN);
        const openEvent = new Event("open");
        if ((_a2 = __privateGet(this, _onOpen)) == null || _a2.call(this, openEvent), this.dispatchEvent(openEvent), typeof body != "object" || !body || !("getReader" in body)) {
          __privateMethod(this, _EventSource_instances, failConnection_fn).call(this, "Invalid response body, expected a web ReadableStream", status), this.close();
          return;
        }
        const decoder = new TextDecoder(), reader = body.getReader();
        let open = true;
        do {
          const { done, value } = await reader.read();
          value && __privateGet(this, _parser).feed(decoder.decode(value, { stream: !done })), done && (open = false, __privateGet(this, _parser).reset(), __privateMethod(this, _EventSource_instances, scheduleReconnect_fn).call(this));
        } while (open);
      }), __privateAdd(this, _onFetchError, (err) => {
        __privateSet(this, _controller, void 0), !(err.name === "AbortError" || err.type === "aborted") && __privateMethod(this, _EventSource_instances, scheduleReconnect_fn).call(this, flattenError(err));
      }), __privateAdd(this, _onEvent, (event) => {
        typeof event.id == "string" && __privateSet(this, _lastEventId, event.id);
        const messageEvent = new MessageEvent(event.event || "message", {
          data: event.data,
          origin: __privateGet(this, _redirectUrl) ? __privateGet(this, _redirectUrl).origin : __privateGet(this, _url).origin,
          lastEventId: event.id || ""
        });
        __privateGet(this, _onMessage) && (!event.event || event.event === "message") && __privateGet(this, _onMessage).call(this, messageEvent), this.dispatchEvent(messageEvent);
      }), __privateAdd(this, _onRetryChange, (value) => {
        __privateSet(this, _reconnectInterval, value);
      }), __privateAdd(this, _reconnect, () => {
        __privateSet(this, _reconnectTimer, void 0), __privateGet(this, _readyState) === this.CONNECTING && __privateMethod(this, _EventSource_instances, connect_fn).call(this);
      });
      try {
        if (url2 instanceof URL)
          __privateSet(this, _url, url2);
        else if (typeof url2 == "string")
          __privateSet(this, _url, new URL(url2, getBaseURL()));
        else
          throw new Error("Invalid URL");
      } catch {
        throw syntaxError("An invalid or illegal string was specified");
      }
      __privateSet(this, _parser, createParser({
        onEvent: __privateGet(this, _onEvent),
        onRetry: __privateGet(this, _onRetryChange)
      })), __privateSet(this, _readyState, this.CONNECTING), __privateSet(this, _reconnectInterval, 3e3), __privateSet(this, _fetch, (_a = eventSourceInitDict == null ? void 0 : eventSourceInitDict.fetch) != null ? _a : globalThis.fetch), __privateSet(this, _withCredentials, (_b = eventSourceInitDict == null ? void 0 : eventSourceInitDict.withCredentials) != null ? _b : false), __privateMethod(this, _EventSource_instances, connect_fn).call(this);
    }
    /**
     * Returns the state of this EventSource object's connection. It can have the values described below.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/readyState)
     *
     * Note: typed as `number` instead of `0 | 1 | 2` for compatibility with the `EventSource` interface,
     * defined in the TypeScript `dom` library.
     *
     * @public
     */
    get readyState() {
      return __privateGet(this, _readyState);
    }
    /**
     * Returns the URL providing the event stream.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/url)
     *
     * @public
     */
    get url() {
      return __privateGet(this, _url).href;
    }
    /**
     * Returns true if the credentials mode for connection requests to the URL providing the event stream is set to "include", and false otherwise.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/withCredentials)
     */
    get withCredentials() {
      return __privateGet(this, _withCredentials);
    }
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/error_event) */
    get onerror() {
      return __privateGet(this, _onError);
    }
    set onerror(value) {
      __privateSet(this, _onError, value);
    }
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/message_event) */
    get onmessage() {
      return __privateGet(this, _onMessage);
    }
    set onmessage(value) {
      __privateSet(this, _onMessage, value);
    }
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/open_event) */
    get onopen() {
      return __privateGet(this, _onOpen);
    }
    set onopen(value) {
      __privateSet(this, _onOpen, value);
    }
    addEventListener(type2, listener, options) {
      const listen = listener;
      super.addEventListener(type2, listen, options);
    }
    removeEventListener(type2, listener, options) {
      const listen = listener;
      super.removeEventListener(type2, listen, options);
    }
    /**
     * Aborts any instances of the fetch algorithm started for this EventSource object, and sets the readyState attribute to CLOSED.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/close)
     *
     * @public
     */
    close() {
      __privateGet(this, _reconnectTimer) && clearTimeout(__privateGet(this, _reconnectTimer)), __privateGet(this, _readyState) !== this.CLOSED && (__privateGet(this, _controller) && __privateGet(this, _controller).abort(), __privateSet(this, _readyState, this.CLOSED), __privateSet(this, _controller, void 0));
    }
  }
  _readyState = /* @__PURE__ */ new WeakMap(), _url = /* @__PURE__ */ new WeakMap(), _redirectUrl = /* @__PURE__ */ new WeakMap(), _withCredentials = /* @__PURE__ */ new WeakMap(), _fetch = /* @__PURE__ */ new WeakMap(), _reconnectInterval = /* @__PURE__ */ new WeakMap(), _reconnectTimer = /* @__PURE__ */ new WeakMap(), _lastEventId = /* @__PURE__ */ new WeakMap(), _controller = /* @__PURE__ */ new WeakMap(), _parser = /* @__PURE__ */ new WeakMap(), _onError = /* @__PURE__ */ new WeakMap(), _onMessage = /* @__PURE__ */ new WeakMap(), _onOpen = /* @__PURE__ */ new WeakMap(), _EventSource_instances = /* @__PURE__ */ new WeakSet(), /**
  * Connect to the given URL and start receiving events
  *
  * @internal
  */
  connect_fn = function() {
    __privateSet(this, _readyState, this.CONNECTING), __privateSet(this, _controller, new AbortController()), __privateGet(this, _fetch)(__privateGet(this, _url), __privateMethod(this, _EventSource_instances, getRequestOptions_fn).call(this)).then(__privateGet(this, _onFetchResponse)).catch(__privateGet(this, _onFetchError));
  }, _onFetchResponse = /* @__PURE__ */ new WeakMap(), _onFetchError = /* @__PURE__ */ new WeakMap(), /**
  * Get request options for the `fetch()` request
  *
  * @returns The request options
  * @internal
  */
  getRequestOptions_fn = function() {
    var _a;
    const init = {
      // [spec] Let `corsAttributeState` be `Anonymous`…
      // [spec] …will have their mode set to "cors"…
      mode: "cors",
      redirect: "follow",
      headers: { Accept: "text/event-stream", ...__privateGet(this, _lastEventId) ? { "Last-Event-ID": __privateGet(this, _lastEventId) } : void 0 },
      cache: "no-store",
      signal: (_a = __privateGet(this, _controller)) == null ? void 0 : _a.signal
    };
    return "window" in globalThis && (init.credentials = this.withCredentials ? "include" : "same-origin"), init;
  }, _onEvent = /* @__PURE__ */ new WeakMap(), _onRetryChange = /* @__PURE__ */ new WeakMap(), /**
  * Handles the process referred to in the EventSource specification as "failing a connection".
  *
  * @param error - The error causing the connection to fail
  * @param code - The HTTP status code, if available
  * @internal
  */
  failConnection_fn = function(message, code2) {
    var _a;
    __privateGet(this, _readyState) !== this.CLOSED && __privateSet(this, _readyState, this.CLOSED);
    const errorEvent = new ErrorEvent("error", { code: code2, message });
    (_a = __privateGet(this, _onError)) == null || _a.call(this, errorEvent), this.dispatchEvent(errorEvent);
  }, /**
  * Schedules a reconnection attempt against the EventSource endpoint.
  *
  * @param message - The error causing the connection to fail
  * @param code - The HTTP status code, if available
  * @internal
  */
  scheduleReconnect_fn = function(message, code2) {
    var _a;
    if (__privateGet(this, _readyState) === this.CLOSED)
      return;
    __privateSet(this, _readyState, this.CONNECTING);
    const errorEvent = new ErrorEvent("error", { code: code2, message });
    (_a = __privateGet(this, _onError)) == null || _a.call(this, errorEvent), this.dispatchEvent(errorEvent), __privateSet(this, _reconnectTimer, setTimeout(__privateGet(this, _reconnect), __privateGet(this, _reconnectInterval)));
  }, _reconnect = /* @__PURE__ */ new WeakMap(), /**
  * ReadyState representing an EventSource currently trying to connect
  *
  * @public
  */
  EventSource.CONNECTING = 0, /**
  * ReadyState representing an EventSource connection that is open (eg connected)
  *
  * @public
  */
  EventSource.OPEN = 1, /**
  * ReadyState representing an EventSource connection that is closed (eg disconnected)
  *
  * @public
  */
  EventSource.CLOSED = 2;
  function getBaseURL() {
    const doc = "document" in globalThis ? globalThis.document : void 0;
    return doc && typeof doc == "object" && "baseURI" in doc && typeof doc.baseURI == "string" ? doc.baseURI : void 0;
  }
  function normalizeHeaders(headers) {
    if (!headers)
      return {};
    if (headers instanceof Headers) {
      return Object.fromEntries(headers.entries());
    }
    if (Array.isArray(headers)) {
      return Object.fromEntries(headers);
    }
    return { ...headers };
  }
  function createFetchWithInit(baseFetch = fetch, baseInit) {
    if (!baseInit) {
      return baseFetch;
    }
    return async (url2, init) => {
      const mergedInit = {
        ...baseInit,
        ...init,
        // Headers need special handling - merge instead of replace
        headers: (init === null || init === void 0 ? void 0 : init.headers) ? { ...normalizeHeaders(baseInit.headers), ...normalizeHeaders(init.headers) } : baseInit.headers
      };
      return baseFetch(url2, mergedInit);
    };
  }
  let crypto$1;
  crypto$1 = globalThis.crypto;
  async function getRandomValues(size) {
    return (await crypto$1).getRandomValues(new Uint8Array(size));
  }
  async function random(size) {
    const mask = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~";
    let result = "";
    const randomUints = await getRandomValues(size);
    for (let i = 0; i < size; i++) {
      const randomIndex = randomUints[i] % mask.length;
      result += mask[randomIndex];
    }
    return result;
  }
  async function generateVerifier(length) {
    return await random(length);
  }
  async function generateChallenge(code_verifier) {
    const buffer = await (await crypto$1).subtle.digest("SHA-256", new TextEncoder().encode(code_verifier));
    return btoa(String.fromCharCode(...new Uint8Array(buffer))).replace(/\//g, "_").replace(/\+/g, "-").replace(/=/g, "");
  }
  async function pkceChallenge(length) {
    if (!length)
      length = 43;
    if (length < 43 || length > 128) {
      throw `Expected a length between 43 and 128. Received ${length}.`;
    }
    const verifier = await generateVerifier(length);
    const challenge = await generateChallenge(verifier);
    return {
      code_verifier: verifier,
      code_challenge: challenge
    };
  }
  const SafeUrlSchema = url().superRefine((val, ctx) => {
    if (!URL.canParse(val)) {
      ctx.addIssue({
        code: ZodIssueCode$1.custom,
        message: "URL must be parseable",
        fatal: true
      });
      return NEVER$1;
    }
  }).refine((url2) => {
    const u = new URL(url2);
    return u.protocol !== "javascript:" && u.protocol !== "data:" && u.protocol !== "vbscript:";
  }, { message: "URL cannot use javascript:, data:, or vbscript: scheme" });
  const OAuthProtectedResourceMetadataSchema = looseObject({
    resource: string().url(),
    authorization_servers: array(SafeUrlSchema).optional(),
    jwks_uri: string().url().optional(),
    scopes_supported: array(string()).optional(),
    bearer_methods_supported: array(string()).optional(),
    resource_signing_alg_values_supported: array(string()).optional(),
    resource_name: string().optional(),
    resource_documentation: string().optional(),
    resource_policy_uri: string().url().optional(),
    resource_tos_uri: string().url().optional(),
    tls_client_certificate_bound_access_tokens: boolean().optional(),
    authorization_details_types_supported: array(string()).optional(),
    dpop_signing_alg_values_supported: array(string()).optional(),
    dpop_bound_access_tokens_required: boolean().optional()
  });
  const OAuthMetadataSchema = looseObject({
    issuer: string(),
    authorization_endpoint: SafeUrlSchema,
    token_endpoint: SafeUrlSchema,
    registration_endpoint: SafeUrlSchema.optional(),
    scopes_supported: array(string()).optional(),
    response_types_supported: array(string()),
    response_modes_supported: array(string()).optional(),
    grant_types_supported: array(string()).optional(),
    token_endpoint_auth_methods_supported: array(string()).optional(),
    token_endpoint_auth_signing_alg_values_supported: array(string()).optional(),
    service_documentation: SafeUrlSchema.optional(),
    revocation_endpoint: SafeUrlSchema.optional(),
    revocation_endpoint_auth_methods_supported: array(string()).optional(),
    revocation_endpoint_auth_signing_alg_values_supported: array(string()).optional(),
    introspection_endpoint: string().optional(),
    introspection_endpoint_auth_methods_supported: array(string()).optional(),
    introspection_endpoint_auth_signing_alg_values_supported: array(string()).optional(),
    code_challenge_methods_supported: array(string()).optional(),
    client_id_metadata_document_supported: boolean().optional()
  });
  const OpenIdProviderMetadataSchema = looseObject({
    issuer: string(),
    authorization_endpoint: SafeUrlSchema,
    token_endpoint: SafeUrlSchema,
    userinfo_endpoint: SafeUrlSchema.optional(),
    jwks_uri: SafeUrlSchema,
    registration_endpoint: SafeUrlSchema.optional(),
    scopes_supported: array(string()).optional(),
    response_types_supported: array(string()),
    response_modes_supported: array(string()).optional(),
    grant_types_supported: array(string()).optional(),
    acr_values_supported: array(string()).optional(),
    subject_types_supported: array(string()),
    id_token_signing_alg_values_supported: array(string()),
    id_token_encryption_alg_values_supported: array(string()).optional(),
    id_token_encryption_enc_values_supported: array(string()).optional(),
    userinfo_signing_alg_values_supported: array(string()).optional(),
    userinfo_encryption_alg_values_supported: array(string()).optional(),
    userinfo_encryption_enc_values_supported: array(string()).optional(),
    request_object_signing_alg_values_supported: array(string()).optional(),
    request_object_encryption_alg_values_supported: array(string()).optional(),
    request_object_encryption_enc_values_supported: array(string()).optional(),
    token_endpoint_auth_methods_supported: array(string()).optional(),
    token_endpoint_auth_signing_alg_values_supported: array(string()).optional(),
    display_values_supported: array(string()).optional(),
    claim_types_supported: array(string()).optional(),
    claims_supported: array(string()).optional(),
    service_documentation: string().optional(),
    claims_locales_supported: array(string()).optional(),
    ui_locales_supported: array(string()).optional(),
    claims_parameter_supported: boolean().optional(),
    request_parameter_supported: boolean().optional(),
    request_uri_parameter_supported: boolean().optional(),
    require_request_uri_registration: boolean().optional(),
    op_policy_uri: SafeUrlSchema.optional(),
    op_tos_uri: SafeUrlSchema.optional(),
    client_id_metadata_document_supported: boolean().optional()
  });
  const OpenIdProviderDiscoveryMetadataSchema = object$1({
    ...OpenIdProviderMetadataSchema.shape,
    ...OAuthMetadataSchema.pick({
      code_challenge_methods_supported: true
    }).shape
  });
  const OAuthTokensSchema = object$1({
    access_token: string(),
    id_token: string().optional(),
    // Optional for OAuth 2.1, but necessary in OpenID Connect
    token_type: string(),
    expires_in: number().optional(),
    scope: string().optional(),
    refresh_token: string().optional()
  }).strip();
  const OAuthErrorResponseSchema = object$1({
    error: string(),
    error_description: string().optional(),
    error_uri: string().optional()
  });
  const OptionalSafeUrlSchema = SafeUrlSchema.optional().or(literal("").transform(() => void 0));
  const OAuthClientMetadataSchema = object$1({
    redirect_uris: array(SafeUrlSchema),
    token_endpoint_auth_method: string().optional(),
    grant_types: array(string()).optional(),
    response_types: array(string()).optional(),
    client_name: string().optional(),
    client_uri: SafeUrlSchema.optional(),
    logo_uri: OptionalSafeUrlSchema,
    scope: string().optional(),
    contacts: array(string()).optional(),
    tos_uri: OptionalSafeUrlSchema,
    policy_uri: string().optional(),
    jwks_uri: SafeUrlSchema.optional(),
    jwks: any().optional(),
    software_id: string().optional(),
    software_version: string().optional(),
    software_statement: string().optional()
  }).strip();
  const OAuthClientInformationSchema = object$1({
    client_id: string(),
    client_secret: string().optional(),
    client_id_issued_at: number$1().optional(),
    client_secret_expires_at: number$1().optional()
  }).strip();
  const OAuthClientInformationFullSchema = OAuthClientMetadataSchema.merge(OAuthClientInformationSchema);
  object$1({
    error: string(),
    error_description: string().optional()
  }).strip();
  object$1({
    token: string(),
    token_type_hint: string().optional()
  }).strip();
  function resourceUrlFromServerUrl(url2) {
    const resourceURL = typeof url2 === "string" ? new URL(url2) : new URL(url2.href);
    resourceURL.hash = "";
    return resourceURL;
  }
  function checkResourceAllowed({ requestedResource, configuredResource }) {
    const requested = typeof requestedResource === "string" ? new URL(requestedResource) : new URL(requestedResource.href);
    const configured = typeof configuredResource === "string" ? new URL(configuredResource) : new URL(configuredResource.href);
    if (requested.origin !== configured.origin) {
      return false;
    }
    if (requested.pathname.length < configured.pathname.length) {
      return false;
    }
    const requestedPath = requested.pathname.endsWith("/") ? requested.pathname : requested.pathname + "/";
    const configuredPath = configured.pathname.endsWith("/") ? configured.pathname : configured.pathname + "/";
    return requestedPath.startsWith(configuredPath);
  }
  class OAuthError extends Error {
    constructor(message, errorUri) {
      super(message);
      this.errorUri = errorUri;
      this.name = this.constructor.name;
    }
    /**
     * Converts the error to a standard OAuth error response object
     */
    toResponseObject() {
      const response = {
        error: this.errorCode,
        error_description: this.message
      };
      if (this.errorUri) {
        response.error_uri = this.errorUri;
      }
      return response;
    }
    get errorCode() {
      return this.constructor.errorCode;
    }
  }
  class InvalidRequestError extends OAuthError {
  }
  InvalidRequestError.errorCode = "invalid_request";
  class InvalidClientError extends OAuthError {
  }
  InvalidClientError.errorCode = "invalid_client";
  class InvalidGrantError extends OAuthError {
  }
  InvalidGrantError.errorCode = "invalid_grant";
  class UnauthorizedClientError extends OAuthError {
  }
  UnauthorizedClientError.errorCode = "unauthorized_client";
  class UnsupportedGrantTypeError extends OAuthError {
  }
  UnsupportedGrantTypeError.errorCode = "unsupported_grant_type";
  class InvalidScopeError extends OAuthError {
  }
  InvalidScopeError.errorCode = "invalid_scope";
  class AccessDeniedError extends OAuthError {
  }
  AccessDeniedError.errorCode = "access_denied";
  class ServerError extends OAuthError {
  }
  ServerError.errorCode = "server_error";
  class TemporarilyUnavailableError extends OAuthError {
  }
  TemporarilyUnavailableError.errorCode = "temporarily_unavailable";
  class UnsupportedResponseTypeError extends OAuthError {
  }
  UnsupportedResponseTypeError.errorCode = "unsupported_response_type";
  class UnsupportedTokenTypeError extends OAuthError {
  }
  UnsupportedTokenTypeError.errorCode = "unsupported_token_type";
  class InvalidTokenError extends OAuthError {
  }
  InvalidTokenError.errorCode = "invalid_token";
  class MethodNotAllowedError extends OAuthError {
  }
  MethodNotAllowedError.errorCode = "method_not_allowed";
  class TooManyRequestsError extends OAuthError {
  }
  TooManyRequestsError.errorCode = "too_many_requests";
  class InvalidClientMetadataError extends OAuthError {
  }
  InvalidClientMetadataError.errorCode = "invalid_client_metadata";
  class InsufficientScopeError extends OAuthError {
  }
  InsufficientScopeError.errorCode = "insufficient_scope";
  class InvalidTargetError extends OAuthError {
  }
  InvalidTargetError.errorCode = "invalid_target";
  const OAUTH_ERRORS = {
    [InvalidRequestError.errorCode]: InvalidRequestError,
    [InvalidClientError.errorCode]: InvalidClientError,
    [InvalidGrantError.errorCode]: InvalidGrantError,
    [UnauthorizedClientError.errorCode]: UnauthorizedClientError,
    [UnsupportedGrantTypeError.errorCode]: UnsupportedGrantTypeError,
    [InvalidScopeError.errorCode]: InvalidScopeError,
    [AccessDeniedError.errorCode]: AccessDeniedError,
    [ServerError.errorCode]: ServerError,
    [TemporarilyUnavailableError.errorCode]: TemporarilyUnavailableError,
    [UnsupportedResponseTypeError.errorCode]: UnsupportedResponseTypeError,
    [UnsupportedTokenTypeError.errorCode]: UnsupportedTokenTypeError,
    [InvalidTokenError.errorCode]: InvalidTokenError,
    [MethodNotAllowedError.errorCode]: MethodNotAllowedError,
    [TooManyRequestsError.errorCode]: TooManyRequestsError,
    [InvalidClientMetadataError.errorCode]: InvalidClientMetadataError,
    [InsufficientScopeError.errorCode]: InsufficientScopeError,
    [InvalidTargetError.errorCode]: InvalidTargetError
  };
  class UnauthorizedError extends Error {
    constructor(message) {
      super(message !== null && message !== void 0 ? message : "Unauthorized");
    }
  }
  function isClientAuthMethod(method) {
    return ["client_secret_basic", "client_secret_post", "none"].includes(method);
  }
  const AUTHORIZATION_CODE_RESPONSE_TYPE = "code";
  const AUTHORIZATION_CODE_CHALLENGE_METHOD = "S256";
  function selectClientAuthMethod(clientInformation, supportedMethods) {
    const hasClientSecret = clientInformation.client_secret !== void 0;
    if (supportedMethods.length === 0) {
      return hasClientSecret ? "client_secret_post" : "none";
    }
    if ("token_endpoint_auth_method" in clientInformation && clientInformation.token_endpoint_auth_method && isClientAuthMethod(clientInformation.token_endpoint_auth_method) && supportedMethods.includes(clientInformation.token_endpoint_auth_method)) {
      return clientInformation.token_endpoint_auth_method;
    }
    if (hasClientSecret && supportedMethods.includes("client_secret_basic")) {
      return "client_secret_basic";
    }
    if (hasClientSecret && supportedMethods.includes("client_secret_post")) {
      return "client_secret_post";
    }
    if (supportedMethods.includes("none")) {
      return "none";
    }
    return hasClientSecret ? "client_secret_post" : "none";
  }
  function applyClientAuthentication(method, clientInformation, headers, params) {
    const { client_id, client_secret } = clientInformation;
    switch (method) {
      case "client_secret_basic":
        applyBasicAuth(client_id, client_secret, headers);
        return;
      case "client_secret_post":
        applyPostAuth(client_id, client_secret, params);
        return;
      case "none":
        applyPublicAuth(client_id, params);
        return;
      default:
        throw new Error(`Unsupported client authentication method: ${method}`);
    }
  }
  function applyBasicAuth(clientId, clientSecret, headers) {
    if (!clientSecret) {
      throw new Error("client_secret_basic authentication requires a client_secret");
    }
    const credentials = btoa(`${clientId}:${clientSecret}`);
    headers.set("Authorization", `Basic ${credentials}`);
  }
  function applyPostAuth(clientId, clientSecret, params) {
    params.set("client_id", clientId);
    if (clientSecret) {
      params.set("client_secret", clientSecret);
    }
  }
  function applyPublicAuth(clientId, params) {
    params.set("client_id", clientId);
  }
  async function parseErrorResponse(input) {
    const statusCode = input instanceof Response ? input.status : void 0;
    const body = input instanceof Response ? await input.text() : input;
    try {
      const result = OAuthErrorResponseSchema.parse(JSON.parse(body));
      const { error, error_description, error_uri } = result;
      const errorClass = OAUTH_ERRORS[error] || ServerError;
      return new errorClass(error_description || "", error_uri);
    } catch (error) {
      const errorMessage = `${statusCode ? `HTTP ${statusCode}: ` : ""}Invalid OAuth error response: ${error}. Raw body: ${body}`;
      return new ServerError(errorMessage);
    }
  }
  async function auth(provider, options) {
    var _a, _b;
    try {
      return await authInternal(provider, options);
    } catch (error) {
      if (error instanceof InvalidClientError || error instanceof UnauthorizedClientError) {
        await ((_a = provider.invalidateCredentials) === null || _a === void 0 ? void 0 : _a.call(provider, "all"));
        return await authInternal(provider, options);
      } else if (error instanceof InvalidGrantError) {
        await ((_b = provider.invalidateCredentials) === null || _b === void 0 ? void 0 : _b.call(provider, "tokens"));
        return await authInternal(provider, options);
      }
      throw error;
    }
  }
  async function authInternal(provider, { serverUrl, authorizationCode, scope: scope2, resourceMetadataUrl, fetchFn }) {
    var _a, _b;
    let resourceMetadata;
    let authorizationServerUrl;
    try {
      resourceMetadata = await discoverOAuthProtectedResourceMetadata(serverUrl, { resourceMetadataUrl }, fetchFn);
      if (resourceMetadata.authorization_servers && resourceMetadata.authorization_servers.length > 0) {
        authorizationServerUrl = resourceMetadata.authorization_servers[0];
      }
    } catch (_c) {
    }
    if (!authorizationServerUrl) {
      authorizationServerUrl = new URL("/", serverUrl);
    }
    const resource = await selectResourceURL(serverUrl, provider, resourceMetadata);
    const metadata2 = await discoverAuthorizationServerMetadata(authorizationServerUrl, {
      fetchFn
    });
    let clientInformation = await Promise.resolve(provider.clientInformation());
    if (!clientInformation) {
      if (authorizationCode !== void 0) {
        throw new Error("Existing OAuth client information is required when exchanging an authorization code");
      }
      const supportsUrlBasedClientId = (metadata2 === null || metadata2 === void 0 ? void 0 : metadata2.client_id_metadata_document_supported) === true;
      const clientMetadataUrl = provider.clientMetadataUrl;
      if (clientMetadataUrl && !isHttpsUrl(clientMetadataUrl)) {
        throw new InvalidClientMetadataError(`clientMetadataUrl must be a valid HTTPS URL with a non-root pathname, got: ${clientMetadataUrl}`);
      }
      const shouldUseUrlBasedClientId = supportsUrlBasedClientId && clientMetadataUrl;
      if (shouldUseUrlBasedClientId) {
        clientInformation = {
          client_id: clientMetadataUrl
        };
        await ((_a = provider.saveClientInformation) === null || _a === void 0 ? void 0 : _a.call(provider, clientInformation));
      } else {
        if (!provider.saveClientInformation) {
          throw new Error("OAuth client information must be saveable for dynamic registration");
        }
        const fullInformation = await registerClient(authorizationServerUrl, {
          metadata: metadata2,
          clientMetadata: provider.clientMetadata,
          fetchFn
        });
        await provider.saveClientInformation(fullInformation);
        clientInformation = fullInformation;
      }
    }
    const nonInteractiveFlow = !provider.redirectUrl;
    if (authorizationCode !== void 0 || nonInteractiveFlow) {
      const tokens2 = await fetchToken(provider, authorizationServerUrl, {
        metadata: metadata2,
        resource,
        authorizationCode,
        fetchFn
      });
      await provider.saveTokens(tokens2);
      return "AUTHORIZED";
    }
    const tokens = await provider.tokens();
    if (tokens === null || tokens === void 0 ? void 0 : tokens.refresh_token) {
      try {
        const newTokens = await refreshAuthorization(authorizationServerUrl, {
          metadata: metadata2,
          clientInformation,
          refreshToken: tokens.refresh_token,
          resource,
          addClientAuthentication: provider.addClientAuthentication,
          fetchFn
        });
        await provider.saveTokens(newTokens);
        return "AUTHORIZED";
      } catch (error) {
        if (!(error instanceof OAuthError) || error instanceof ServerError) ;
        else {
          throw error;
        }
      }
    }
    const state = provider.state ? await provider.state() : void 0;
    const { authorizationUrl, codeVerifier } = await startAuthorization(authorizationServerUrl, {
      metadata: metadata2,
      clientInformation,
      state,
      redirectUrl: provider.redirectUrl,
      scope: scope2 || ((_b = resourceMetadata === null || resourceMetadata === void 0 ? void 0 : resourceMetadata.scopes_supported) === null || _b === void 0 ? void 0 : _b.join(" ")) || provider.clientMetadata.scope,
      resource
    });
    await provider.saveCodeVerifier(codeVerifier);
    await provider.redirectToAuthorization(authorizationUrl);
    return "REDIRECT";
  }
  function isHttpsUrl(value) {
    if (!value)
      return false;
    try {
      const url2 = new URL(value);
      return url2.protocol === "https:" && url2.pathname !== "/";
    } catch (_a) {
      return false;
    }
  }
  async function selectResourceURL(serverUrl, provider, resourceMetadata) {
    const defaultResource = resourceUrlFromServerUrl(serverUrl);
    if (provider.validateResourceURL) {
      return await provider.validateResourceURL(defaultResource, resourceMetadata === null || resourceMetadata === void 0 ? void 0 : resourceMetadata.resource);
    }
    if (!resourceMetadata) {
      return void 0;
    }
    if (!checkResourceAllowed({ requestedResource: defaultResource, configuredResource: resourceMetadata.resource })) {
      throw new Error(`Protected resource ${resourceMetadata.resource} does not match expected ${defaultResource} (or origin)`);
    }
    return new URL(resourceMetadata.resource);
  }
  function extractWWWAuthenticateParams(res) {
    const authenticateHeader = res.headers.get("WWW-Authenticate");
    if (!authenticateHeader) {
      return {};
    }
    const [type2, scheme] = authenticateHeader.split(" ");
    if (type2.toLowerCase() !== "bearer" || !scheme) {
      return {};
    }
    const resourceMetadataMatch = extractFieldFromWwwAuth(res, "resource_metadata") || void 0;
    let resourceMetadataUrl;
    if (resourceMetadataMatch) {
      try {
        resourceMetadataUrl = new URL(resourceMetadataMatch);
      } catch (_a) {
      }
    }
    const scope2 = extractFieldFromWwwAuth(res, "scope") || void 0;
    const error = extractFieldFromWwwAuth(res, "error") || void 0;
    return {
      resourceMetadataUrl,
      scope: scope2,
      error
    };
  }
  function extractFieldFromWwwAuth(response, fieldName) {
    const wwwAuthHeader = response.headers.get("WWW-Authenticate");
    if (!wwwAuthHeader) {
      return null;
    }
    const pattern2 = new RegExp(`${fieldName}=(?:"([^"]+)"|([^\\s,]+))`);
    const match = wwwAuthHeader.match(pattern2);
    if (match) {
      return match[1] || match[2];
    }
    return null;
  }
  async function discoverOAuthProtectedResourceMetadata(serverUrl, opts, fetchFn = fetch) {
    var _a, _b;
    const response = await discoverMetadataWithFallback(serverUrl, "oauth-protected-resource", fetchFn, {
      protocolVersion: opts === null || opts === void 0 ? void 0 : opts.protocolVersion,
      metadataUrl: opts === null || opts === void 0 ? void 0 : opts.resourceMetadataUrl
    });
    if (!response || response.status === 404) {
      await ((_a = response === null || response === void 0 ? void 0 : response.body) === null || _a === void 0 ? void 0 : _a.cancel());
      throw new Error(`Resource server does not implement OAuth 2.0 Protected Resource Metadata.`);
    }
    if (!response.ok) {
      await ((_b = response.body) === null || _b === void 0 ? void 0 : _b.cancel());
      throw new Error(`HTTP ${response.status} trying to load well-known OAuth protected resource metadata.`);
    }
    return OAuthProtectedResourceMetadataSchema.parse(await response.json());
  }
  async function fetchWithCorsRetry(url2, headers, fetchFn = fetch) {
    try {
      return await fetchFn(url2, { headers });
    } catch (error) {
      if (error instanceof TypeError) {
        if (headers) {
          return fetchWithCorsRetry(url2, void 0, fetchFn);
        } else {
          return void 0;
        }
      }
      throw error;
    }
  }
  function buildWellKnownPath(wellKnownPrefix, pathname = "", options = {}) {
    if (pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    return options.prependPathname ? `${pathname}/.well-known/${wellKnownPrefix}` : `/.well-known/${wellKnownPrefix}${pathname}`;
  }
  async function tryMetadataDiscovery(url2, protocolVersion, fetchFn = fetch) {
    const headers = {
      "MCP-Protocol-Version": protocolVersion
    };
    return await fetchWithCorsRetry(url2, headers, fetchFn);
  }
  function shouldAttemptFallback(response, pathname) {
    return !response || response.status >= 400 && response.status < 500 && pathname !== "/";
  }
  async function discoverMetadataWithFallback(serverUrl, wellKnownType, fetchFn, opts) {
    var _a, _b;
    const issuer = new URL(serverUrl);
    const protocolVersion = (_a = opts === null || opts === void 0 ? void 0 : opts.protocolVersion) !== null && _a !== void 0 ? _a : LATEST_PROTOCOL_VERSION;
    let url2;
    if (opts === null || opts === void 0 ? void 0 : opts.metadataUrl) {
      url2 = new URL(opts.metadataUrl);
    } else {
      const wellKnownPath = buildWellKnownPath(wellKnownType, issuer.pathname);
      url2 = new URL(wellKnownPath, (_b = opts === null || opts === void 0 ? void 0 : opts.metadataServerUrl) !== null && _b !== void 0 ? _b : issuer);
      url2.search = issuer.search;
    }
    let response = await tryMetadataDiscovery(url2, protocolVersion, fetchFn);
    if (!(opts === null || opts === void 0 ? void 0 : opts.metadataUrl) && shouldAttemptFallback(response, issuer.pathname)) {
      const rootUrl = new URL(`/.well-known/${wellKnownType}`, issuer);
      response = await tryMetadataDiscovery(rootUrl, protocolVersion, fetchFn);
    }
    return response;
  }
  function buildDiscoveryUrls(authorizationServerUrl) {
    const url2 = typeof authorizationServerUrl === "string" ? new URL(authorizationServerUrl) : authorizationServerUrl;
    const hasPath = url2.pathname !== "/";
    const urlsToTry = [];
    if (!hasPath) {
      urlsToTry.push({
        url: new URL("/.well-known/oauth-authorization-server", url2.origin),
        type: "oauth"
      });
      urlsToTry.push({
        url: new URL(`/.well-known/openid-configuration`, url2.origin),
        type: "oidc"
      });
      return urlsToTry;
    }
    let pathname = url2.pathname;
    if (pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    urlsToTry.push({
      url: new URL(`/.well-known/oauth-authorization-server${pathname}`, url2.origin),
      type: "oauth"
    });
    urlsToTry.push({
      url: new URL(`/.well-known/openid-configuration${pathname}`, url2.origin),
      type: "oidc"
    });
    urlsToTry.push({
      url: new URL(`${pathname}/.well-known/openid-configuration`, url2.origin),
      type: "oidc"
    });
    return urlsToTry;
  }
  async function discoverAuthorizationServerMetadata(authorizationServerUrl, { fetchFn = fetch, protocolVersion = LATEST_PROTOCOL_VERSION } = {}) {
    var _a;
    const headers = {
      "MCP-Protocol-Version": protocolVersion,
      Accept: "application/json"
    };
    const urlsToTry = buildDiscoveryUrls(authorizationServerUrl);
    for (const { url: endpointUrl, type: type2 } of urlsToTry) {
      const response = await fetchWithCorsRetry(endpointUrl, headers, fetchFn);
      if (!response) {
        continue;
      }
      if (!response.ok) {
        await ((_a = response.body) === null || _a === void 0 ? void 0 : _a.cancel());
        if (response.status >= 400 && response.status < 500) {
          continue;
        }
        throw new Error(`HTTP ${response.status} trying to load ${type2 === "oauth" ? "OAuth" : "OpenID provider"} metadata from ${endpointUrl}`);
      }
      if (type2 === "oauth") {
        return OAuthMetadataSchema.parse(await response.json());
      } else {
        return OpenIdProviderDiscoveryMetadataSchema.parse(await response.json());
      }
    }
    return void 0;
  }
  async function startAuthorization(authorizationServerUrl, { metadata: metadata2, clientInformation, redirectUrl, scope: scope2, state, resource }) {
    let authorizationUrl;
    if (metadata2) {
      authorizationUrl = new URL(metadata2.authorization_endpoint);
      if (!metadata2.response_types_supported.includes(AUTHORIZATION_CODE_RESPONSE_TYPE)) {
        throw new Error(`Incompatible auth server: does not support response type ${AUTHORIZATION_CODE_RESPONSE_TYPE}`);
      }
      if (metadata2.code_challenge_methods_supported && !metadata2.code_challenge_methods_supported.includes(AUTHORIZATION_CODE_CHALLENGE_METHOD)) {
        throw new Error(`Incompatible auth server: does not support code challenge method ${AUTHORIZATION_CODE_CHALLENGE_METHOD}`);
      }
    } else {
      authorizationUrl = new URL("/authorize", authorizationServerUrl);
    }
    const challenge = await pkceChallenge();
    const codeVerifier = challenge.code_verifier;
    const codeChallenge = challenge.code_challenge;
    authorizationUrl.searchParams.set("response_type", AUTHORIZATION_CODE_RESPONSE_TYPE);
    authorizationUrl.searchParams.set("client_id", clientInformation.client_id);
    authorizationUrl.searchParams.set("code_challenge", codeChallenge);
    authorizationUrl.searchParams.set("code_challenge_method", AUTHORIZATION_CODE_CHALLENGE_METHOD);
    authorizationUrl.searchParams.set("redirect_uri", String(redirectUrl));
    if (state) {
      authorizationUrl.searchParams.set("state", state);
    }
    if (scope2) {
      authorizationUrl.searchParams.set("scope", scope2);
    }
    if (scope2 === null || scope2 === void 0 ? void 0 : scope2.includes("offline_access")) {
      authorizationUrl.searchParams.append("prompt", "consent");
    }
    if (resource) {
      authorizationUrl.searchParams.set("resource", resource.href);
    }
    return { authorizationUrl, codeVerifier };
  }
  function prepareAuthorizationCodeRequest(authorizationCode, codeVerifier, redirectUri) {
    return new URLSearchParams({
      grant_type: "authorization_code",
      code: authorizationCode,
      code_verifier: codeVerifier,
      redirect_uri: String(redirectUri)
    });
  }
  async function executeTokenRequest(authorizationServerUrl, { metadata: metadata2, tokenRequestParams, clientInformation, addClientAuthentication, resource, fetchFn }) {
    var _a;
    const tokenUrl = (metadata2 === null || metadata2 === void 0 ? void 0 : metadata2.token_endpoint) ? new URL(metadata2.token_endpoint) : new URL("/token", authorizationServerUrl);
    const headers = new Headers({
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    });
    if (resource) {
      tokenRequestParams.set("resource", resource.href);
    }
    if (addClientAuthentication) {
      await addClientAuthentication(headers, tokenRequestParams, tokenUrl, metadata2);
    } else if (clientInformation) {
      const supportedMethods = (_a = metadata2 === null || metadata2 === void 0 ? void 0 : metadata2.token_endpoint_auth_methods_supported) !== null && _a !== void 0 ? _a : [];
      const authMethod = selectClientAuthMethod(clientInformation, supportedMethods);
      applyClientAuthentication(authMethod, clientInformation, headers, tokenRequestParams);
    }
    const response = await (fetchFn !== null && fetchFn !== void 0 ? fetchFn : fetch)(tokenUrl, {
      method: "POST",
      headers,
      body: tokenRequestParams
    });
    if (!response.ok) {
      throw await parseErrorResponse(response);
    }
    return OAuthTokensSchema.parse(await response.json());
  }
  async function refreshAuthorization(authorizationServerUrl, { metadata: metadata2, clientInformation, refreshToken, resource, addClientAuthentication, fetchFn }) {
    const tokenRequestParams = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken
    });
    const tokens = await executeTokenRequest(authorizationServerUrl, {
      metadata: metadata2,
      tokenRequestParams,
      clientInformation,
      addClientAuthentication,
      resource,
      fetchFn
    });
    return { refresh_token: refreshToken, ...tokens };
  }
  async function fetchToken(provider, authorizationServerUrl, { metadata: metadata2, resource, authorizationCode, fetchFn } = {}) {
    const scope2 = provider.clientMetadata.scope;
    let tokenRequestParams;
    if (provider.prepareTokenRequest) {
      tokenRequestParams = await provider.prepareTokenRequest(scope2);
    }
    if (!tokenRequestParams) {
      if (!authorizationCode) {
        throw new Error("Either provider.prepareTokenRequest() or authorizationCode is required");
      }
      if (!provider.redirectUrl) {
        throw new Error("redirectUrl is required for authorization_code flow");
      }
      const codeVerifier = await provider.codeVerifier();
      tokenRequestParams = prepareAuthorizationCodeRequest(authorizationCode, codeVerifier, provider.redirectUrl);
    }
    const clientInformation = await provider.clientInformation();
    return executeTokenRequest(authorizationServerUrl, {
      metadata: metadata2,
      tokenRequestParams,
      clientInformation: clientInformation !== null && clientInformation !== void 0 ? clientInformation : void 0,
      addClientAuthentication: provider.addClientAuthentication,
      resource,
      fetchFn
    });
  }
  async function registerClient(authorizationServerUrl, { metadata: metadata2, clientMetadata, fetchFn }) {
    let registrationUrl;
    if (metadata2) {
      if (!metadata2.registration_endpoint) {
        throw new Error("Incompatible auth server: does not support dynamic client registration");
      }
      registrationUrl = new URL(metadata2.registration_endpoint);
    } else {
      registrationUrl = new URL("/register", authorizationServerUrl);
    }
    const response = await (fetchFn !== null && fetchFn !== void 0 ? fetchFn : fetch)(registrationUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(clientMetadata)
    });
    if (!response.ok) {
      throw await parseErrorResponse(response);
    }
    return OAuthClientInformationFullSchema.parse(await response.json());
  }
  class SseError extends Error {
    constructor(code2, message, event) {
      super(`SSE error: ${message}`);
      this.code = code2;
      this.event = event;
    }
  }
  class SSEClientTransport {
    constructor(url2, opts) {
      this._url = url2;
      this._resourceMetadataUrl = void 0;
      this._scope = void 0;
      this._eventSourceInit = opts === null || opts === void 0 ? void 0 : opts.eventSourceInit;
      this._requestInit = opts === null || opts === void 0 ? void 0 : opts.requestInit;
      this._authProvider = opts === null || opts === void 0 ? void 0 : opts.authProvider;
      this._fetch = opts === null || opts === void 0 ? void 0 : opts.fetch;
      this._fetchWithInit = createFetchWithInit(opts === null || opts === void 0 ? void 0 : opts.fetch, opts === null || opts === void 0 ? void 0 : opts.requestInit);
    }
    async _authThenStart() {
      var _a;
      if (!this._authProvider) {
        throw new UnauthorizedError("No auth provider");
      }
      let result;
      try {
        result = await auth(this._authProvider, {
          serverUrl: this._url,
          resourceMetadataUrl: this._resourceMetadataUrl,
          scope: this._scope,
          fetchFn: this._fetchWithInit
        });
      } catch (error) {
        (_a = this.onerror) === null || _a === void 0 ? void 0 : _a.call(this, error);
        throw error;
      }
      if (result !== "AUTHORIZED") {
        throw new UnauthorizedError();
      }
      return await this._startOrAuth();
    }
    async _commonHeaders() {
      var _a;
      const headers = {};
      if (this._authProvider) {
        const tokens = await this._authProvider.tokens();
        if (tokens) {
          headers["Authorization"] = `Bearer ${tokens.access_token}`;
        }
      }
      if (this._protocolVersion) {
        headers["mcp-protocol-version"] = this._protocolVersion;
      }
      const extraHeaders = normalizeHeaders((_a = this._requestInit) === null || _a === void 0 ? void 0 : _a.headers);
      return new Headers({
        ...headers,
        ...extraHeaders
      });
    }
    _startOrAuth() {
      var _a, _b, _c;
      const fetchImpl = (_c = (_b = (_a = this === null || this === void 0 ? void 0 : this._eventSourceInit) === null || _a === void 0 ? void 0 : _a.fetch) !== null && _b !== void 0 ? _b : this._fetch) !== null && _c !== void 0 ? _c : fetch;
      return new Promise((resolve2, reject) => {
        this._eventSource = new EventSource(this._url.href, {
          ...this._eventSourceInit,
          fetch: async (url2, init) => {
            const headers = await this._commonHeaders();
            headers.set("Accept", "text/event-stream");
            const response = await fetchImpl(url2, {
              ...init,
              headers
            });
            if (response.status === 401 && response.headers.has("www-authenticate")) {
              const { resourceMetadataUrl, scope: scope2 } = extractWWWAuthenticateParams(response);
              this._resourceMetadataUrl = resourceMetadataUrl;
              this._scope = scope2;
            }
            return response;
          }
        });
        this._abortController = new AbortController();
        this._eventSource.onerror = (event) => {
          var _a2;
          if (event.code === 401 && this._authProvider) {
            this._authThenStart().then(resolve2, reject);
            return;
          }
          const error = new SseError(event.code, event.message, event);
          reject(error);
          (_a2 = this.onerror) === null || _a2 === void 0 ? void 0 : _a2.call(this, error);
        };
        this._eventSource.onopen = () => {
        };
        this._eventSource.addEventListener("endpoint", (event) => {
          var _a2;
          const messageEvent = event;
          try {
            this._endpoint = new URL(messageEvent.data, this._url);
            if (this._endpoint.origin !== this._url.origin) {
              throw new Error(`Endpoint origin does not match connection origin: ${this._endpoint.origin}`);
            }
          } catch (error) {
            reject(error);
            (_a2 = this.onerror) === null || _a2 === void 0 ? void 0 : _a2.call(this, error);
            void this.close();
            return;
          }
          resolve2();
        });
        this._eventSource.onmessage = (event) => {
          var _a2, _b2;
          const messageEvent = event;
          let message;
          try {
            message = JSONRPCMessageSchema.parse(JSON.parse(messageEvent.data));
          } catch (error) {
            (_a2 = this.onerror) === null || _a2 === void 0 ? void 0 : _a2.call(this, error);
            return;
          }
          (_b2 = this.onmessage) === null || _b2 === void 0 ? void 0 : _b2.call(this, message);
        };
      });
    }
    async start() {
      if (this._eventSource) {
        throw new Error("SSEClientTransport already started! If using Client class, note that connect() calls start() automatically.");
      }
      return await this._startOrAuth();
    }
    /**
     * Call this method after the user has finished authorizing via their user agent and is redirected back to the MCP client application. This will exchange the authorization code for an access token, enabling the next connection attempt to successfully auth.
     */
    async finishAuth(authorizationCode) {
      if (!this._authProvider) {
        throw new UnauthorizedError("No auth provider");
      }
      const result = await auth(this._authProvider, {
        serverUrl: this._url,
        authorizationCode,
        resourceMetadataUrl: this._resourceMetadataUrl,
        scope: this._scope,
        fetchFn: this._fetchWithInit
      });
      if (result !== "AUTHORIZED") {
        throw new UnauthorizedError("Failed to authorize");
      }
    }
    async close() {
      var _a, _b, _c;
      (_a = this._abortController) === null || _a === void 0 ? void 0 : _a.abort();
      (_b = this._eventSource) === null || _b === void 0 ? void 0 : _b.close();
      (_c = this.onclose) === null || _c === void 0 ? void 0 : _c.call(this);
    }
    async send(message) {
      var _a, _b, _c, _d;
      if (!this._endpoint) {
        throw new Error("Not connected");
      }
      try {
        const headers = await this._commonHeaders();
        headers.set("content-type", "application/json");
        const init = {
          ...this._requestInit,
          method: "POST",
          headers,
          body: JSON.stringify(message),
          signal: (_a = this._abortController) === null || _a === void 0 ? void 0 : _a.signal
        };
        const response = await ((_b = this._fetch) !== null && _b !== void 0 ? _b : fetch)(this._endpoint, init);
        if (!response.ok) {
          const text = await response.text().catch(() => null);
          if (response.status === 401 && this._authProvider) {
            const { resourceMetadataUrl, scope: scope2 } = extractWWWAuthenticateParams(response);
            this._resourceMetadataUrl = resourceMetadataUrl;
            this._scope = scope2;
            const result = await auth(this._authProvider, {
              serverUrl: this._url,
              resourceMetadataUrl: this._resourceMetadataUrl,
              scope: this._scope,
              fetchFn: this._fetchWithInit
            });
            if (result !== "AUTHORIZED") {
              throw new UnauthorizedError();
            }
            return this.send(message);
          }
          throw new Error(`Error POSTing to endpoint (HTTP ${response.status}): ${text}`);
        }
        await ((_c = response.body) === null || _c === void 0 ? void 0 : _c.cancel());
      } catch (error) {
        (_d = this.onerror) === null || _d === void 0 ? void 0 : _d.call(this, error);
        throw error;
      }
    }
    setProtocolVersion(version2) {
      this._protocolVersion = version2;
    }
  }
  class EventSourceParserStream extends TransformStream {
    constructor({ onError, onRetry, onComment } = {}) {
      let parser;
      super({
        start(controller) {
          parser = createParser({
            onEvent: (event) => {
              controller.enqueue(event);
            },
            onError(error) {
              onError === "terminate" ? controller.error(error) : typeof onError == "function" && onError(error);
            },
            onRetry,
            onComment
          });
        },
        transform(chunk) {
          parser.feed(chunk);
        }
      });
    }
  }
  const DEFAULT_STREAMABLE_HTTP_RECONNECTION_OPTIONS = {
    initialReconnectionDelay: 1e3,
    maxReconnectionDelay: 3e4,
    reconnectionDelayGrowFactor: 1.5,
    maxRetries: 2
  };
  class StreamableHTTPError extends Error {
    constructor(code2, message) {
      super(`Streamable HTTP error: ${message}`);
      this.code = code2;
    }
  }
  class StreamableHTTPClientTransport {
    constructor(url2, opts) {
      var _a;
      this._hasCompletedAuthFlow = false;
      this._url = url2;
      this._resourceMetadataUrl = void 0;
      this._scope = void 0;
      this._requestInit = opts === null || opts === void 0 ? void 0 : opts.requestInit;
      this._authProvider = opts === null || opts === void 0 ? void 0 : opts.authProvider;
      this._fetch = opts === null || opts === void 0 ? void 0 : opts.fetch;
      this._fetchWithInit = createFetchWithInit(opts === null || opts === void 0 ? void 0 : opts.fetch, opts === null || opts === void 0 ? void 0 : opts.requestInit);
      this._sessionId = opts === null || opts === void 0 ? void 0 : opts.sessionId;
      this._reconnectionOptions = (_a = opts === null || opts === void 0 ? void 0 : opts.reconnectionOptions) !== null && _a !== void 0 ? _a : DEFAULT_STREAMABLE_HTTP_RECONNECTION_OPTIONS;
    }
    async _authThenStart() {
      var _a;
      if (!this._authProvider) {
        throw new UnauthorizedError("No auth provider");
      }
      let result;
      try {
        result = await auth(this._authProvider, {
          serverUrl: this._url,
          resourceMetadataUrl: this._resourceMetadataUrl,
          scope: this._scope,
          fetchFn: this._fetchWithInit
        });
      } catch (error) {
        (_a = this.onerror) === null || _a === void 0 ? void 0 : _a.call(this, error);
        throw error;
      }
      if (result !== "AUTHORIZED") {
        throw new UnauthorizedError();
      }
      return await this._startOrAuthSse({ resumptionToken: void 0 });
    }
    async _commonHeaders() {
      var _a;
      const headers = {};
      if (this._authProvider) {
        const tokens = await this._authProvider.tokens();
        if (tokens) {
          headers["Authorization"] = `Bearer ${tokens.access_token}`;
        }
      }
      if (this._sessionId) {
        headers["mcp-session-id"] = this._sessionId;
      }
      if (this._protocolVersion) {
        headers["mcp-protocol-version"] = this._protocolVersion;
      }
      const extraHeaders = normalizeHeaders((_a = this._requestInit) === null || _a === void 0 ? void 0 : _a.headers);
      return new Headers({
        ...headers,
        ...extraHeaders
      });
    }
    async _startOrAuthSse(options) {
      var _a, _b, _c, _d;
      const { resumptionToken } = options;
      try {
        const headers = await this._commonHeaders();
        headers.set("Accept", "text/event-stream");
        if (resumptionToken) {
          headers.set("last-event-id", resumptionToken);
        }
        const response = await ((_a = this._fetch) !== null && _a !== void 0 ? _a : fetch)(this._url, {
          method: "GET",
          headers,
          signal: (_b = this._abortController) === null || _b === void 0 ? void 0 : _b.signal
        });
        if (!response.ok) {
          await ((_c = response.body) === null || _c === void 0 ? void 0 : _c.cancel());
          if (response.status === 401 && this._authProvider) {
            return await this._authThenStart();
          }
          if (response.status === 405) {
            return;
          }
          throw new StreamableHTTPError(response.status, `Failed to open SSE stream: ${response.statusText}`);
        }
        this._handleSseStream(response.body, options, true);
      } catch (error) {
        (_d = this.onerror) === null || _d === void 0 ? void 0 : _d.call(this, error);
        throw error;
      }
    }
    /**
     * Calculates the next reconnection delay using  backoff algorithm
     *
     * @param attempt Current reconnection attempt count for the specific stream
     * @returns Time to wait in milliseconds before next reconnection attempt
     */
    _getNextReconnectionDelay(attempt) {
      if (this._serverRetryMs !== void 0) {
        return this._serverRetryMs;
      }
      const initialDelay = this._reconnectionOptions.initialReconnectionDelay;
      const growFactor = this._reconnectionOptions.reconnectionDelayGrowFactor;
      const maxDelay = this._reconnectionOptions.maxReconnectionDelay;
      return Math.min(initialDelay * Math.pow(growFactor, attempt), maxDelay);
    }
    /**
     * Schedule a reconnection attempt using server-provided retry interval or backoff
     *
     * @param lastEventId The ID of the last received event for resumability
     * @param attemptCount Current reconnection attempt count for this specific stream
     */
    _scheduleReconnection(options, attemptCount = 0) {
      var _a;
      const maxRetries = this._reconnectionOptions.maxRetries;
      if (attemptCount >= maxRetries) {
        (_a = this.onerror) === null || _a === void 0 ? void 0 : _a.call(this, new Error(`Maximum reconnection attempts (${maxRetries}) exceeded.`));
        return;
      }
      const delay = this._getNextReconnectionDelay(attemptCount);
      this._reconnectionTimeout = setTimeout(() => {
        this._startOrAuthSse(options).catch((error) => {
          var _a2;
          (_a2 = this.onerror) === null || _a2 === void 0 ? void 0 : _a2.call(this, new Error(`Failed to reconnect SSE stream: ${error instanceof Error ? error.message : String(error)}`));
          this._scheduleReconnection(options, attemptCount + 1);
        });
      }, delay);
    }
    _handleSseStream(stream, options, isReconnectable) {
      if (!stream) {
        return;
      }
      const { onresumptiontoken, replayMessageId } = options;
      let lastEventId;
      let hasPrimingEvent = false;
      let receivedResponse = false;
      const processStream = async () => {
        var _a, _b, _c, _d;
        try {
          const reader = stream.pipeThrough(new TextDecoderStream()).pipeThrough(new EventSourceParserStream({
            onRetry: (retryMs) => {
              this._serverRetryMs = retryMs;
            }
          })).getReader();
          while (true) {
            const { value: event, done } = await reader.read();
            if (done) {
              break;
            }
            if (event.id) {
              lastEventId = event.id;
              hasPrimingEvent = true;
              onresumptiontoken === null || onresumptiontoken === void 0 ? void 0 : onresumptiontoken(event.id);
            }
            if (!event.data) {
              continue;
            }
            if (!event.event || event.event === "message") {
              try {
                const message = JSONRPCMessageSchema.parse(JSON.parse(event.data));
                if (isJSONRPCResponse(message)) {
                  receivedResponse = true;
                  if (replayMessageId !== void 0) {
                    message.id = replayMessageId;
                  }
                }
                (_a = this.onmessage) === null || _a === void 0 ? void 0 : _a.call(this, message);
              } catch (error) {
                (_b = this.onerror) === null || _b === void 0 ? void 0 : _b.call(this, error);
              }
            }
          }
          const canResume = isReconnectable || hasPrimingEvent;
          const needsReconnect = canResume && !receivedResponse;
          if (needsReconnect && this._abortController && !this._abortController.signal.aborted) {
            this._scheduleReconnection({
              resumptionToken: lastEventId,
              onresumptiontoken,
              replayMessageId
            }, 0);
          }
        } catch (error) {
          (_c = this.onerror) === null || _c === void 0 ? void 0 : _c.call(this, new Error(`SSE stream disconnected: ${error}`));
          const canResume = isReconnectable || hasPrimingEvent;
          const needsReconnect = canResume && !receivedResponse;
          if (needsReconnect && this._abortController && !this._abortController.signal.aborted) {
            try {
              this._scheduleReconnection({
                resumptionToken: lastEventId,
                onresumptiontoken,
                replayMessageId
              }, 0);
            } catch (error2) {
              (_d = this.onerror) === null || _d === void 0 ? void 0 : _d.call(this, new Error(`Failed to reconnect: ${error2 instanceof Error ? error2.message : String(error2)}`));
            }
          }
        }
      };
      processStream();
    }
    async start() {
      if (this._abortController) {
        throw new Error("StreamableHTTPClientTransport already started! If using Client class, note that connect() calls start() automatically.");
      }
      this._abortController = new AbortController();
    }
    /**
     * Call this method after the user has finished authorizing via their user agent and is redirected back to the MCP client application. This will exchange the authorization code for an access token, enabling the next connection attempt to successfully auth.
     */
    async finishAuth(authorizationCode) {
      if (!this._authProvider) {
        throw new UnauthorizedError("No auth provider");
      }
      const result = await auth(this._authProvider, {
        serverUrl: this._url,
        authorizationCode,
        resourceMetadataUrl: this._resourceMetadataUrl,
        scope: this._scope,
        fetchFn: this._fetchWithInit
      });
      if (result !== "AUTHORIZED") {
        throw new UnauthorizedError("Failed to authorize");
      }
    }
    async close() {
      var _a, _b;
      if (this._reconnectionTimeout) {
        clearTimeout(this._reconnectionTimeout);
        this._reconnectionTimeout = void 0;
      }
      (_a = this._abortController) === null || _a === void 0 ? void 0 : _a.abort();
      (_b = this.onclose) === null || _b === void 0 ? void 0 : _b.call(this);
    }
    async send(message, options) {
      var _a, _b, _c, _d, _e, _f, _g;
      try {
        const { resumptionToken, onresumptiontoken } = options || {};
        if (resumptionToken) {
          this._startOrAuthSse({ resumptionToken, replayMessageId: isJSONRPCRequest(message) ? message.id : void 0 }).catch((err) => {
            var _a2;
            return (_a2 = this.onerror) === null || _a2 === void 0 ? void 0 : _a2.call(this, err);
          });
          return;
        }
        const headers = await this._commonHeaders();
        headers.set("content-type", "application/json");
        headers.set("accept", "application/json, text/event-stream");
        const init = {
          ...this._requestInit,
          method: "POST",
          headers,
          body: JSON.stringify(message),
          signal: (_a = this._abortController) === null || _a === void 0 ? void 0 : _a.signal
        };
        const response = await ((_b = this._fetch) !== null && _b !== void 0 ? _b : fetch)(this._url, init);
        const sessionId = response.headers.get("mcp-session-id");
        if (sessionId) {
          this._sessionId = sessionId;
        }
        if (!response.ok) {
          const text = await response.text().catch(() => null);
          if (response.status === 401 && this._authProvider) {
            if (this._hasCompletedAuthFlow) {
              throw new StreamableHTTPError(401, "Server returned 401 after successful authentication");
            }
            const { resourceMetadataUrl, scope: scope2 } = extractWWWAuthenticateParams(response);
            this._resourceMetadataUrl = resourceMetadataUrl;
            this._scope = scope2;
            const result = await auth(this._authProvider, {
              serverUrl: this._url,
              resourceMetadataUrl: this._resourceMetadataUrl,
              scope: this._scope,
              fetchFn: this._fetchWithInit
            });
            if (result !== "AUTHORIZED") {
              throw new UnauthorizedError();
            }
            this._hasCompletedAuthFlow = true;
            return this.send(message);
          }
          if (response.status === 403 && this._authProvider) {
            const { resourceMetadataUrl, scope: scope2, error } = extractWWWAuthenticateParams(response);
            if (error === "insufficient_scope") {
              const wwwAuthHeader = response.headers.get("WWW-Authenticate");
              if (this._lastUpscopingHeader === wwwAuthHeader) {
                throw new StreamableHTTPError(403, "Server returned 403 after trying upscoping");
              }
              if (scope2) {
                this._scope = scope2;
              }
              if (resourceMetadataUrl) {
                this._resourceMetadataUrl = resourceMetadataUrl;
              }
              this._lastUpscopingHeader = wwwAuthHeader !== null && wwwAuthHeader !== void 0 ? wwwAuthHeader : void 0;
              const result = await auth(this._authProvider, {
                serverUrl: this._url,
                resourceMetadataUrl: this._resourceMetadataUrl,
                scope: this._scope,
                fetchFn: this._fetch
              });
              if (result !== "AUTHORIZED") {
                throw new UnauthorizedError();
              }
              return this.send(message);
            }
          }
          throw new StreamableHTTPError(response.status, `Error POSTing to endpoint: ${text}`);
        }
        this._hasCompletedAuthFlow = false;
        this._lastUpscopingHeader = void 0;
        if (response.status === 202) {
          await ((_c = response.body) === null || _c === void 0 ? void 0 : _c.cancel());
          if (isInitializedNotification(message)) {
            this._startOrAuthSse({ resumptionToken: void 0 }).catch((err) => {
              var _a2;
              return (_a2 = this.onerror) === null || _a2 === void 0 ? void 0 : _a2.call(this, err);
            });
          }
          return;
        }
        const messages = Array.isArray(message) ? message : [message];
        const hasRequests = messages.filter((msg) => "method" in msg && "id" in msg && msg.id !== void 0).length > 0;
        const contentType = response.headers.get("content-type");
        if (hasRequests) {
          if (contentType === null || contentType === void 0 ? void 0 : contentType.includes("text/event-stream")) {
            this._handleSseStream(response.body, { onresumptiontoken }, false);
          } else if (contentType === null || contentType === void 0 ? void 0 : contentType.includes("application/json")) {
            const data = await response.json();
            const responseMessages = Array.isArray(data) ? data.map((msg) => JSONRPCMessageSchema.parse(msg)) : [JSONRPCMessageSchema.parse(data)];
            for (const msg of responseMessages) {
              (_d = this.onmessage) === null || _d === void 0 ? void 0 : _d.call(this, msg);
            }
          } else {
            await ((_e = response.body) === null || _e === void 0 ? void 0 : _e.cancel());
            throw new StreamableHTTPError(-1, `Unexpected content type: ${contentType}`);
          }
        } else {
          await ((_f = response.body) === null || _f === void 0 ? void 0 : _f.cancel());
        }
      } catch (error) {
        (_g = this.onerror) === null || _g === void 0 ? void 0 : _g.call(this, error);
        throw error;
      }
    }
    get sessionId() {
      return this._sessionId;
    }
    /**
     * Terminates the current session by sending a DELETE request to the server.
     *
     * Clients that no longer need a particular session
     * (e.g., because the user is leaving the client application) SHOULD send an
     * HTTP DELETE to the MCP endpoint with the Mcp-Session-Id header to explicitly
     * terminate the session.
     *
     * The server MAY respond with HTTP 405 Method Not Allowed, indicating that
     * the server does not allow clients to terminate sessions.
     */
    async terminateSession() {
      var _a, _b, _c, _d;
      if (!this._sessionId) {
        return;
      }
      try {
        const headers = await this._commonHeaders();
        const init = {
          ...this._requestInit,
          method: "DELETE",
          headers,
          signal: (_a = this._abortController) === null || _a === void 0 ? void 0 : _a.signal
        };
        const response = await ((_b = this._fetch) !== null && _b !== void 0 ? _b : fetch)(this._url, init);
        await ((_c = response.body) === null || _c === void 0 ? void 0 : _c.cancel());
        if (!response.ok && response.status !== 405) {
          throw new StreamableHTTPError(response.status, `Failed to terminate session: ${response.statusText}`);
        }
        this._sessionId = void 0;
      } catch (error) {
        (_d = this.onerror) === null || _d === void 0 ? void 0 : _d.call(this, error);
        throw error;
      }
    }
    setProtocolVersion(version2) {
      this._protocolVersion = version2;
    }
    get protocolVersion() {
      return this._protocolVersion;
    }
    /**
     * Resume an SSE stream from a previous event ID.
     * Opens a GET SSE connection with Last-Event-ID header to replay missed events.
     *
     * @param lastEventId The event ID to resume from
     * @param options Optional callback to receive new resumption tokens
     */
    async resumeStream(lastEventId, options) {
      await this._startOrAuthSse({
        resumptionToken: lastEventId,
        onresumptiontoken: options === null || options === void 0 ? void 0 : options.onresumptiontoken
      });
    }
  }
  const SUBPROTOCOL = "mcp";
  class WebSocketClientTransport {
    constructor(url2) {
      this._url = url2;
    }
    start() {
      if (this._socket) {
        throw new Error("WebSocketClientTransport already started! If using Client class, note that connect() calls start() automatically.");
      }
      return new Promise((resolve2, reject) => {
        this._socket = new WebSocket(this._url, SUBPROTOCOL);
        this._socket.onerror = (event) => {
          var _a;
          const error = "error" in event ? event.error : new Error(`WebSocket error: ${JSON.stringify(event)}`);
          reject(error);
          (_a = this.onerror) === null || _a === void 0 ? void 0 : _a.call(this, error);
        };
        this._socket.onopen = () => {
          resolve2();
        };
        this._socket.onclose = () => {
          var _a;
          (_a = this.onclose) === null || _a === void 0 ? void 0 : _a.call(this);
        };
        this._socket.onmessage = (event) => {
          var _a, _b;
          let message;
          try {
            message = JSONRPCMessageSchema.parse(JSON.parse(event.data));
          } catch (error) {
            (_a = this.onerror) === null || _a === void 0 ? void 0 : _a.call(this, error);
            return;
          }
          (_b = this.onmessage) === null || _b === void 0 ? void 0 : _b.call(this, message);
        };
      });
    }
    async close() {
      var _a;
      (_a = this._socket) === null || _a === void 0 ? void 0 : _a.close();
    }
    send(message) {
      return new Promise((resolve2, reject) => {
        var _a;
        if (!this._socket) {
          reject(new Error("Not connected"));
          return;
        }
        (_a = this._socket) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify(message));
        resolve2();
      });
    }
  }
  function _0x425b() {
    const _0x4fe318 = ["224340fQYLJj", "function", "onmessage", "port2", "341XVdnBD", "313767JEBgqL", "950bpstaX", "1354759gUhUbE", "wRKyh", "onclose", "2044SvCTUj", "endpoint", "24msSkHx", "164VuWYGY", "mOWMr", "EkZCC", "addEventListener", "postMessage", "120705iyGzUz", "8878392ivIdKn", "close", "_listen", "3619482FaLQHc", "start", "_endpoint", "kgkem", "bzNYT", "MessageChannel transport error: ", "stringify", "onmessageerror", "HvyCv", "undefined", "Jwyua", "message", "_globalObject", "parse", "authInfo", "thraG", "220pGvxgp", "_port", "EGhzU", "onerror", "data", "MhriV"];
    _0x425b = function() {
      return _0x4fe318;
    };
    return _0x425b();
  }
  (function(_0x3f2143, _0xebf1ca) {
    const _0xf16569 = _0x3c98, _0xf8772f = _0x3c98, _0x12639d = _0x3f2143();
    while (!![]) {
      try {
        const _0x4af7fb = parseInt(_0xf16569(417)) / (511 * 2 + -6 * -249 + -2515) * (parseInt(_0xf16569(421)) / (97 + 8149 + -4 * 2061)) + parseInt(_0xf16569(433)) / (2229 * 3 + 8997 + -15681) + parseInt(_0xf16569(424)) / (6411 + 1390 * -2 + -9 * 403) * (-parseInt(_0xf8772f(429)) / (1 * -6323 + 8277 + 1 * -1949)) + parseInt(_0xf8772f(423)) / (-6512 + 1542 + 4976) * (-parseInt(_0xf8772f(418)) / (-2923 + 27 * 123 + 1 * -391)) + -parseInt(_0xf8772f(430)) / (-255 * -15 + 3 * 1367 + 74 * -107) + -parseInt(_0xf16569(416)) / (164 + 9156 + -9311) * (-parseInt(_0xf16569(405)) / (-6648 + 4 * 1410 + -1018 * -1)) + -parseInt(_0xf16569(415)) / (2131 + 1 * -6940 + 4820) * (-parseInt(_0xf16569(411)) / (7402 + 4294 + -11684));
        if (_0x4af7fb === _0xebf1ca) break;
        else _0x12639d["push"](_0x12639d["shift"]());
      } catch (_0x559f49) {
        _0x12639d["push"](_0x12639d["shift"]());
      }
    }
  })(_0x425b, -311599 + 305798 + 655998);
  const getGlobalObject = () => {
    const _0x3e2316 = _0x3c98, _0x4bbb30 = { "EGhzU": function(_0x43b0af, _0x410c74) {
      return _0x43b0af !== _0x410c74;
    }, "kIrDB": "undefined", "llYQe": function(_0x5e5b4b, _0x29e28d) {
      return _0x5e5b4b !== _0x29e28d;
    }, "PZfJg": function(_0x2df978, _0x2cbe44) {
      return _0x2df978(_0x2cbe44);
    }, "Jwyua": "return this" };
    if (typeof globalThis !== "undefined") return globalThis;
    if (_0x4bbb30[_0x3e2316(407)](typeof window, _0x4bbb30["kIrDB"])) return window;
    if (_0x4bbb30["llYQe"](typeof global, _0x4bbb30["kIrDB"])) return global;
    if (typeof self !== _0x3e2316(398)) return self;
    return _0x4bbb30["PZfJg"](Function, _0x4bbb30[_0x3e2316(399)])();
  }, sendMessage = (_0x3bc450, _0x51a3bf, _0x2954b6) => {
    const _0x5d3b1d = _0x3c98, _0x5c5f72 = _0x3c98, _0x3de493 = {};
    _0x3de493[_0x5d3b1d(410)] = _0x5c5f72(398), _0x3de493["dBkaX"] = function(_0x181821, _0x4dd2e8) {
      return _0x181821 === _0x4dd2e8;
    }, _0x3de493[_0x5c5f72(393)] = "function";
    const _0x4aa378 = _0x3de493;
    if (typeof window !== _0x4aa378[_0x5c5f72(410)]) _0x3bc450["postMessage"](_0x51a3bf, "*", _0x2954b6);
    else _0x5c5f72(428) in _0x3bc450 && _0x4aa378["dBkaX"](typeof _0x3bc450["postMessage"], _0x4aa378[_0x5d3b1d(393)]) && _0x3bc450["postMessage"](_0x51a3bf, _0x2954b6);
  }, setMessageHandler = (_0x432d6a, _0x1cebac) => {
    const _0x4243fa = _0x3c98, _0x4b1b47 = _0x3c98, _0x83e376 = {};
    _0x83e376["MbsGh"] = "addEventListener", _0x83e376["PPniK"] = function(_0x4bc6f6, _0x575566) {
      return _0x4bc6f6 === _0x575566;
    }, _0x83e376[_0x4243fa(419)] = _0x4b1b47(412), _0x83e376[_0x4b1b47(404)] = "onmessage", _0x83e376[_0x4243fa(397)] = "undefined";
    const _0x5b21ac = _0x83e376;
    if (_0x5b21ac["MbsGh"] in _0x432d6a && _0x5b21ac["PPniK"](typeof _0x432d6a[_0x4243fa(427)], _0x5b21ac["wRKyh"])) _0x432d6a[_0x4243fa(427)](_0x4243fa(400), _0x1cebac);
    else _0x5b21ac["thraG"] in _0x432d6a && typeof _0x432d6a[_0x4b1b47(413)] !== _0x5b21ac[_0x4b1b47(397)] && (_0x432d6a["onmessage"] = _0x1cebac);
  };
  class MessageChannelTransport {
    constructor(_0x19f279) {
      const _0x47a6b8 = _0x3c98;
      this[_0x47a6b8(406)] = _0x19f279;
    }
    async ["start"]() {
      const _0x262fc0 = _0x3c98, _0x477225 = _0x3c98;
      if (!this[_0x262fc0(406)]) return;
      this[_0x262fc0(406)][_0x262fc0(413)] = (_0x12f751) => {
        var _a, _b;
        const _0xd637c1 = _0x262fc0, _0x3f2b55 = _0x477225;
        try {
          const _0x288930 = JSONRPCMessageSchema[_0xd637c1(402)](_0x12f751["data"][_0xd637c1(400)]);
          (_a = this[_0xd637c1(413)]) == null ? void 0 : _a.call(this, _0x288930, _0x12f751[_0x3f2b55(409)]["extra"]);
        } catch (_0x199f0) {
          const _0x349a7b = new Error("MessageChannel failed to parse message: " + _0x199f0);
          (_b = this[_0x3f2b55(408)]) == null ? void 0 : _b.call(this, _0x349a7b);
        }
      }, this["_port"][_0x262fc0(396)] = (_0x4dd993) => {
        var _a;
        const _0x120c0e = _0x477225, _0x5758c1 = _0x477225, _0x1701f6 = new Error(_0x120c0e(394) + JSON[_0x5758c1(395)](_0x4dd993));
        (_a = this["onerror"]) == null ? void 0 : _a.call(this, _0x1701f6);
      }, this[_0x262fc0(406)][_0x262fc0(434)]();
    }
    async ["send"](_0x875889, _0x3c2eb4) {
      const _0x231c3e = { "lEyuq": function(_0x44e3da) {
        return _0x44e3da();
      }, "YihNw": function(_0x1a99c7, _0x1da686) {
        return _0x1a99c7(_0x1da686);
      } };
      return new Promise((_0x2c883a, _0x7fbbef) => {
        var _a;
        const _0x1d8acc = _0x3c98, _0x252aac = _0x3c98;
        try {
          const _0x1d9834 = {};
          _0x1d9834[_0x1d8acc(403)] = _0x3c2eb4 == null ? void 0 : _0x3c2eb4[_0x1d8acc(403)];
          const _0x280bd1 = {};
          _0x280bd1[_0x252aac(400)] = _0x875889, _0x280bd1["extra"] = _0x1d9834;
          if (this[_0x252aac(406)]) this[_0x1d8acc(406)]["postMessage"](_0x280bd1);
          _0x231c3e["lEyuq"](_0x2c883a);
        } catch (_0x4fe450) {
          const _0x570003 = _0x4fe450 instanceof Error ? _0x4fe450 : new Error(_0x231c3e["YihNw"](String, _0x4fe450));
          (_a = this[_0x252aac(408)]) == null ? void 0 : _a.call(this, _0x570003), _0x7fbbef(_0x570003);
        }
      });
    }
    async ["close"]() {
      var _a, _b;
      const _0x48e40 = _0x3c98, _0x15c0bc = _0x3c98;
      (_a = this["_port"]) == null ? void 0 : _a[_0x48e40(431)](), this["_port"] = void 0, (_b = this[_0x15c0bc(420)]) == null ? void 0 : _b.call(this);
    }
  }
  class MessageChannelClientTransport extends MessageChannelTransport {
    constructor(_0x597360, _0x528781 = getGlobalObject()) {
      const _0x264b2b = _0x3c98, _0x1bf448 = _0x3c98, _0x34395f = { "EkZCC": function(_0x252e11, _0x32a364, _0x3fa642, _0x313f91) {
        return _0x252e11(_0x32a364, _0x3fa642, _0x313f91);
      } };
      super(), this[_0x264b2b(391)] = _0x597360, this[_0x1bf448(401)] = _0x528781;
      const _0x2395ac = new MessageChannel();
      this[_0x1bf448(406)] = _0x2395ac["port1"], _0x34395f[_0x1bf448(426)](sendMessage, this[_0x264b2b(401)], { "endpoint": this[_0x1bf448(391)] }, [_0x2395ac[_0x1bf448(414)]]);
    }
  }
  class MessageChannelServerTransport extends MessageChannelTransport {
    constructor(_0x43868d, _0x200cbf = getGlobalObject()) {
      const _0x1cf24b = _0x3c98, _0x5f15b5 = { "mOWMr": function(_0x117b52, _0x3755b6) {
        return _0x117b52 === _0x3755b6;
      }, "kgkem": function(_0x263de6, _0x137f7b, _0x35ee9a) {
        return _0x263de6(_0x137f7b, _0x35ee9a);
      } };
      super(), this["_endpoint"] = _0x43868d, this["_globalObject"] = _0x200cbf, this[_0x1cf24b(432)] = new Promise((_0xc5a6a8) => {
        const _0x205b86 = _0x1cf24b, _0x13755a = _0x1cf24b;
        _0x5f15b5[_0x205b86(392)](setMessageHandler, this[_0x13755a(401)], (_0x44b81a) => {
          const _0xd9e0bf = _0x13755a, _0x5f1705 = _0x13755a;
          _0x44b81a["data"] && _0x5f15b5[_0xd9e0bf(425)](_0x44b81a["data"][_0x5f1705(422)], this[_0x5f1705(391)]) && (this[_0x5f1705(406)] = _0x44b81a["ports"][-1 * 4852 + 1 * 1601 + 3251], _0xc5a6a8());
        });
      });
    }
    async ["listen"]() {
      const _0x5cffe3 = _0x3c98;
      return this[_0x5cffe3(432)];
    }
  }
  function _0x3c98(_0x5f3c48, _0x59969d) {
    const _0x29bc72 = _0x425b();
    return _0x3c98 = function(_0x7d5de0, _0x53ddc5) {
      _0x7d5de0 = _0x7d5de0 - (17 * -491 + -669 + 9407);
      let _0x21b3d3 = _0x29bc72[_0x7d5de0];
      return _0x21b3d3;
    }, _0x3c98(_0x5f3c48, _0x59969d);
  }
  const createTransportPair = () => {
    const _0x3ab70f = new MessageChannel();
    return [new MessageChannelTransport(_0x3ab70f["port1"]), new MessageChannelTransport(_0x3ab70f["port2"])];
  };
  (function(_0x34e6b0, _0x35a269) {
    const _0x1d530d = _0x436f, _0x4b1650 = _0x436f, _0x32f138 = _0x34e6b0();
    while (!![]) {
      try {
        const _0x464b19 = parseInt(_0x1d530d(355)) / (-9237 + 21 * -101 + 11359) + -parseInt(_0x1d530d(356)) / (-1 * 393 + -1 * -7768 + -1 * 7373) * (-parseInt(_0x1d530d(373)) / (-705 + -4769 * 2 + -47 * -218)) + -parseInt(_0x1d530d(337)) / (-245 * 15 + 893 * 7 + 1 * -2572) + parseInt(_0x4b1650(357)) / (-240 * 17 + 3192 + 893) + -parseInt(_0x4b1650(389)) / (149 * 44 + 545 * -2 + -5460) * (-parseInt(_0x1d530d(396)) / (-5159 + -276 * -13 + -3 * -526)) + parseInt(_0x4b1650(325)) / (1 * -6978 + -3854 + -8 * -1355) * (parseInt(_0x1d530d(382)) / (-7214 + -2969 + 26 * 392)) + -parseInt(_0x1d530d(366)) / (316 * -5 + 562 * 5 + -61 * 20);
        if (_0x464b19 === _0x35a269) break;
        else _0x32f138["push"](_0x32f138["shift"]());
      } catch (_0x390ed1) {
        _0x32f138["push"](_0x32f138["shift"]());
      }
    }
  })(_0x312b, -763475 + -52067 * 10 + 1724410);
  const forwardServerRequest = async (_0x39b9c9, _0x5af7c1, _0x5dd2f7) => {
    var _a;
    const _0x4d8179 = _0x436f, _0x45d1c8 = _0x436f, _0x259709 = {};
    _0x259709[_0x4d8179(345)] = "tools/list", _0x259709["rqstG"] = "tools/call", _0x259709["WqUnk"] = "resources/list", _0x259709[_0x4d8179(329)] = _0x45d1c8(358), _0x259709[_0x4d8179(365)] = _0x4d8179(335), _0x259709["ookoz"] = "resources/unsubscribe", _0x259709[_0x4d8179(385)] = _0x4d8179(340), _0x259709["VTIWq"] = "prompts/list", _0x259709["SkoRK"] = _0x4d8179(376), _0x259709["QUtUV"] = _0x4d8179(388), _0x259709["XtowM"] = _0x45d1c8(332);
    const _0x386240 = _0x259709, { id: _0x5e3819, method: _0x1e7aac, params: _0xb3b73d } = _0x5dd2f7;
    let _0x1affd2 = {};
    switch (_0x1e7aac) {
      case _0x386240[_0x45d1c8(345)]:
        _0x1affd2 = await _0x5af7c1["listTools"](_0xb3b73d);
        break;
      case _0x386240["rqstG"]:
        _0x1affd2 = await _0x5af7c1["callTool"](_0xb3b73d);
        break;
      case _0x386240[_0x4d8179(334)]:
        _0x1affd2 = await _0x5af7c1[_0x4d8179(350)](_0xb3b73d);
        break;
      case _0x386240[_0x45d1c8(329)]:
        _0x1affd2 = await _0x5af7c1["listResourceTemplates"](_0xb3b73d);
        break;
      case _0x4d8179(372):
        _0x1affd2 = await _0x5af7c1[_0x4d8179(383)](_0xb3b73d);
        break;
      case _0x386240["HgYgW"]:
        _0x1affd2 = await _0x5af7c1["subscribeResource"](_0xb3b73d);
        break;
      case _0x386240["ookoz"]:
        _0x1affd2 = await _0x5af7c1["unsubscribeResource"](_0xb3b73d);
        break;
      case _0x386240[_0x4d8179(385)]:
        _0x1affd2 = await _0x5af7c1["getPrompt"](_0xb3b73d);
        break;
      case _0x386240["VTIWq"]:
        _0x1affd2 = await _0x5af7c1["listPrompts"](_0xb3b73d);
        break;
      case _0x386240[_0x4d8179(344)]:
        _0x1affd2 = await _0x5af7c1[_0x4d8179(376)]();
        break;
      case _0x386240["QUtUV"]:
        _0x1affd2 = await _0x5af7c1["complete"](_0xb3b73d);
        break;
      case _0x4d8179(390):
        _0x1affd2 = await _0x5af7c1[_0x4d8179(336)](_0xb3b73d == null ? void 0 : _0xb3b73d["level"]);
        break;
    }
    const _0x1b9b3c = {};
    _0x1b9b3c[_0x4d8179(361)] = _0x1affd2, _0x1b9b3c[_0x4d8179(394)] = _0x386240[_0x4d8179(364)], _0x1b9b3c["id"] = _0x5e3819, await ((_a = _0x39b9c9 == null ? void 0 : _0x39b9c9["transport"]) == null ? void 0 : _a[_0x4d8179(392)](_0x1b9b3c));
  }, forwardClientRequest = async (_0x28f3d6, _0x4ac89d, _0x1051c9) => {
    var _a;
    const _0x3dda47 = _0x436f, _0x381b7f = _0x436f, _0xd1fdf3 = {};
    _0xd1fdf3["jQBBS"] = "sampling/createMessage", _0xd1fdf3["EZqgC"] = "elicitation/create", _0xd1fdf3[_0x3dda47(370)] = _0x381b7f(376), _0xd1fdf3["aVeaL"] = _0x381b7f(332);
    const _0x49fa5b = _0xd1fdf3, { id: _0x242c62, method: _0x5e5313, params: _0x26f936 } = _0x1051c9;
    let _0x4a0446 = {};
    switch (_0x5e5313) {
      case _0x3dda47(368):
        const _0x5729fc = {};
        _0x5729fc["method"] = _0x5e5313, _0x5729fc[_0x381b7f(367)] = _0x26f936, _0x4a0446 = await _0x4ac89d["request"](_0x5729fc, ListRootsResultSchema);
        break;
      case _0x49fa5b[_0x381b7f(391)]:
        const _0x1a4de5 = {};
        _0x1a4de5["method"] = _0x5e5313, _0x1a4de5[_0x381b7f(367)] = _0x26f936, _0x4a0446 = await _0x4ac89d[_0x381b7f(381)](_0x1a4de5, CreateMessageResultSchema);
        break;
      case _0x49fa5b["EZqgC"]:
        const _0x439309 = {};
        _0x439309["method"] = _0x5e5313, _0x439309["params"] = _0x26f936, _0x4a0446 = await _0x4ac89d["request"](_0x439309, ElicitResultSchema);
        break;
      case _0x49fa5b[_0x381b7f(370)]:
        const _0x26032a = {};
        _0x26032a["method"] = _0x5e5313, _0x4a0446 = await _0x4ac89d[_0x381b7f(381)](_0x26032a, EmptyResultSchema);
        break;
    }
    const _0x1cd5b1 = {};
    return _0x1cd5b1[_0x381b7f(361)] = _0x4a0446, _0x1cd5b1["jsonrpc"] = _0x49fa5b[_0x381b7f(387)], _0x1cd5b1["id"] = _0x242c62, await ((_a = _0x28f3d6 == null ? void 0 : _0x28f3d6[_0x3dda47(371)]) == null ? void 0 : _a["send"](_0x1cd5b1)), _0x4a0446;
  };
  const forwardServerOnRequest = (_0x295fa6, _0x251926) => {
    const _0x1cc476 = _0x436f, _0x23ae0d = { "gXsjT": function(_0x3ae5bb, _0x164ced) {
      return _0x3ae5bb === _0x164ced;
    }, "oegpC": _0x1cc476(351), "lZOUC": function(_0x453ca3, _0x364f6d, _0x56cba4, _0x977d42) {
      return _0x453ca3(_0x364f6d, _0x56cba4, _0x977d42);
    }, "ifIKG": "2.0" }, _0x4bcbe0 = _0x295fa6["_onrequest"];
    _0x295fa6["_onrequest"] = async (_0x19eadb, _0x1be045) => {
      var _a, _b, _c, _d, _e;
      const _0x18b546 = _0x1cc476, _0x2a3fc6 = _0x1cc476, { id: _0x352576, method: _0x55a8de } = _0x19eadb;
      try {
        _0x23ae0d[_0x18b546(333)](_0x55a8de, _0x23ae0d["oegpC"]) ? await _0x4bcbe0[_0x18b546(386)](_0x295fa6, _0x19eadb, _0x1be045) : await _0x23ae0d["lZOUC"](forwardServerRequest, _0x295fa6, _0x251926, _0x19eadb);
      } catch (_0x260152) {
        const { code: _0x109aa0, message: _0x12f9b1, data: _0x2a49eb } = _0x260152;
        try {
          if (_0x109aa0) {
            const _0x33e2da = {};
            _0x33e2da["code"] = _0x109aa0, _0x33e2da["message"] = _0x12f9b1, _0x33e2da["data"] = _0x2a49eb;
            const _0x577f56 = {};
            _0x577f56["error"] = _0x33e2da, _0x577f56[_0x18b546(394)] = _0x23ae0d[_0x2a3fc6(331)], _0x577f56["id"] = _0x352576, await ((_a = _0x295fa6 == null ? void 0 : _0x295fa6["transport"]) == null ? void 0 : _a["send"](_0x577f56));
          } else (_c = (_b = _0x295fa6 == null ? void 0 : _0x295fa6[_0x2a3fc6(371)]) == null ? void 0 : _b["onerror"]) == null ? void 0 : _c.call(_b, _0x260152);
        } catch (_0x31b055) {
          (_e = (_d = _0x295fa6 == null ? void 0 : _0x295fa6[_0x18b546(371)]) == null ? void 0 : _d["onerror"]) == null ? void 0 : _e.call(_d, _0x31b055);
        }
      }
    };
  };
  const forwardServerOnNotification = (_0xbf4216, _0x2c1d64) => {
    const _0x41d9f8 = _0x436f, _0x2f9e6b = _0x436f, _0x1b758a = {};
    _0x1b758a[_0x41d9f8(363)] = function(_0x3941d3, _0x9b010a) {
      return _0x3941d3 !== _0x9b010a;
    }, _0x1b758a[_0x41d9f8(398)] = _0x41d9f8(353), _0x1b758a["hzhyg"] = "notifications/cancelled";
    const _0xbe4b4b = _0x1b758a;
    _0xbf4216["_onnotification"] = async (_0x1da5cb) => {
      var _a, _b;
      const _0x1daf66 = _0x41d9f8, _0x3a44ec = _0x2f9e6b, { method: _0x36956c, params: _0x3bca7c } = _0x1da5cb;
      if (_0xbe4b4b[_0x1daf66(363)](_0x36956c, _0xbe4b4b[_0x3a44ec(398)]) && (_0xbe4b4b[_0x1daf66(363)](_0x36956c, _0xbe4b4b["hzhyg"]) || (_0x3bca7c == null ? void 0 : _0x3bca7c["forward"]))) try {
        await _0x2c1d64["notification"](_0x1da5cb);
      } catch (_0x322fdf) {
        (_b = (_a = _0xbf4216 == null ? void 0 : _0xbf4216["transport"]) == null ? void 0 : _a["onerror"]) == null ? void 0 : _b.call(_a, _0x322fdf);
      }
    };
  };
  const forwardClientOnRequest = (_0x5ba9fc, _0x3c2127) => async (_0x35e391) => {
    var _a, _b, _c, _d, _e;
    const _0x18219 = _0x436f, _0xf7764b = _0x436f, _0x1fe570 = {};
    _0x1fe570["SEmWX"] = _0x18219(332);
    const _0x4db6d5 = _0x1fe570;
    try {
      return await forwardClientRequest(_0x5ba9fc, _0x3c2127, _0x35e391);
    } catch (_0x5475d2) {
      const { code: _0x145668, message: _0x30e917, data: _0x308ae4 } = _0x5475d2;
      try {
        if (_0x145668) {
          const _0x3f0c29 = {};
          _0x3f0c29[_0xf7764b(377)] = _0x145668, _0x3f0c29["message"] = _0x30e917, _0x3f0c29["data"] = _0x308ae4;
          const _0x3e511c = {};
          _0x3e511c[_0xf7764b(348)] = _0x3f0c29, _0x3e511c["jsonrpc"] = _0x4db6d5[_0x18219(338)], _0x3e511c["id"] = _0x35e391["id"], await ((_a = _0x5ba9fc == null ? void 0 : _0x5ba9fc["transport"]) == null ? void 0 : _a[_0xf7764b(392)](_0x3e511c));
        } else (_c = (_b = _0x5ba9fc == null ? void 0 : _0x5ba9fc["transport"]) == null ? void 0 : _b[_0xf7764b(339)]) == null ? void 0 : _c.call(_b, _0x5475d2);
      } catch (_0x44d349) {
        (_e = (_d = _0x5ba9fc == null ? void 0 : _0x5ba9fc[_0x18219(371)]) == null ? void 0 : _d[_0xf7764b(339)]) == null ? void 0 : _e.call(_d, _0x44d349);
      }
    }
  };
  const forwardClientOnNotification = (_0x28d609, _0x4bf7cb) => async (_0x4bc3b1) => {
    var _a, _b, _c;
    const _0x3b3b4a = _0x436f, _0x1002c0 = _0x436f, _0x35ae78 = {};
    _0x35ae78["dtUgZ"] = function(_0x4ee941, _0x184cdc) {
      return _0x4ee941 !== _0x184cdc;
    }, _0x35ae78["jgCIb"] = _0x3b3b4a(353), _0x35ae78["uUjKY"] = "2.0";
    const _0x564be4 = _0x35ae78, { method: _0x4170f4, params: _0x466e2b } = _0x4bc3b1;
    if (_0x564be4["dtUgZ"](_0x4170f4, _0x564be4["jgCIb"]) && (_0x4170f4 !== _0x3b3b4a(400) || (_0x466e2b == null ? void 0 : _0x466e2b["forward"]))) try {
      const _0x2fa139 = { ..._0x4bc3b1 };
      _0x2fa139[_0x3b3b4a(394)] = _0x564be4[_0x1002c0(352)], await ((_a = _0x4bf7cb == null ? void 0 : _0x4bf7cb[_0x3b3b4a(371)]) == null ? void 0 : _a[_0x3b3b4a(392)](_0x2fa139));
    } catch (_0x4981b1) {
      (_c = (_b = _0x28d609 == null ? void 0 : _0x28d609[_0x3b3b4a(371)]) == null ? void 0 : _b[_0x1002c0(339)]) == null ? void 0 : _c.call(_b, _0x4981b1);
    }
  };
  function _0x436f(_0x3eb3da, _0x246fe0) {
    const _0x190ef0 = _0x312b();
    return _0x436f = function(_0x3844a1, _0x22bcbf) {
      _0x3844a1 = _0x3844a1 - (9 * -113 + -1439 * -1 + -97);
      let _0x3446e7 = _0x190ef0[_0x3844a1];
      return _0x3446e7;
    }, _0x436f(_0x3eb3da, _0x246fe0);
  }
  const forwardClientOnResponse = (_0x1e680e, _0x1c8008) => async (_0x525a8d) => {
    var _a, _b, _c, _d, _e, _f;
    const _0x4cc7de = _0x436f, _0x48c146 = _0x436f, _0x15ca71 = {};
    _0x15ca71[_0x4cc7de(401)] = _0x48c146(332);
    const _0x27611c = _0x15ca71;
    try {
      await ((_a = _0x1c8008 == null ? void 0 : _0x1c8008["transport"]) == null ? void 0 : _a["send"](_0x525a8d));
    } catch (_0x4fb145) {
      const { code: _0x42cf0b, message: _0xe29332, data: _0x3919ab } = _0x4fb145;
      try {
        if (_0x42cf0b) {
          const _0x15d8af = {};
          _0x15d8af["code"] = _0x42cf0b, _0x15d8af[_0x4cc7de(399)] = _0xe29332, _0x15d8af["data"] = _0x3919ab;
          const _0x5acd21 = {};
          _0x5acd21[_0x4cc7de(348)] = _0x15d8af, _0x5acd21[_0x4cc7de(394)] = _0x27611c["OhJjz"], _0x5acd21["id"] = _0x525a8d["id"], await ((_b = _0x1e680e == null ? void 0 : _0x1e680e[_0x4cc7de(371)]) == null ? void 0 : _b["send"](_0x5acd21));
        } else (_d = (_c = _0x1e680e == null ? void 0 : _0x1e680e["transport"]) == null ? void 0 : _c[_0x48c146(339)]) == null ? void 0 : _d.call(_c, _0x4fb145);
      } catch (_0x18c5af) {
        (_f = (_e = _0x1e680e == null ? void 0 : _0x1e680e["transport"]) == null ? void 0 : _e["onerror"]) == null ? void 0 : _f.call(_e, _0x18c5af);
      }
    }
  };
  const createHandleListener = () => {
    const _0x584790 = _0x436f, _0xfde4fe = _0x436f, _0x4ea6ca = { "vnkqu": function(_0x403bc5, _0x53bd2e) {
      return _0x403bc5 !== _0x53bd2e;
    }, "wxDWr": function(_0x1c881b, _0x66c10d) {
      return _0x1c881b(_0x66c10d);
    }, "GdkkV": function(_0x9d4748, _0x24b020) {
      return _0x9d4748 === _0x24b020;
    } }, _0x5de2ad = [], _0x1c01fe = (_0x431466, _0x28ccda) => {
      const _0x1d408a = _0x436f, _0x120458 = _0x436f;
      if (_0x28ccda) {
        const _0x1e8724 = [];
        for (const _0x1264b7 of _0x5de2ad) {
          try {
            _0x1e8724["push"](_0x1264b7(_0x431466, _0x28ccda));
          } catch {
          }
        }
        for (const _0x445fc2 of _0x1e8724) {
          if (_0x4ea6ca[_0x1d408a(379)](_0x445fc2, null)) return _0x445fc2;
        }
      } else for (const _0x4637f1 of _0x5de2ad) {
        try {
          _0x4ea6ca[_0x120458(343)](_0x4637f1, _0x431466);
        } catch {
        }
      }
    }, _0x46917c = (_0x2b37ef) => {
      const _0x562515 = _0x436f;
      _0x4ea6ca[_0x562515(384)](typeof _0x2b37ef, _0x562515(369)) && !_0x5de2ad["includes"](_0x2b37ef) && _0x5de2ad["push"](_0x2b37ef);
    }, _0x1187af = (_0x522cb1) => {
      const _0x530b39 = _0x5de2ad["indexOf"](_0x522cb1);
      _0x530b39 !== -1 && _0x5de2ad["splice"](_0x530b39, 1 * -6854 + 8 * -33 + 7119);
    }, _0x21be0c = () => {
      const _0x217721 = _0x436f;
      _0x5de2ad[_0x217721(374)] = 7102 * 1 + 5522 + -526 * 24;
    }, _0x3a7414 = {};
    return _0x3a7414[_0x584790(346)] = _0x1c01fe, _0x3a7414[_0xfde4fe(330)] = _0x46917c, _0x3a7414["removeListener"] = _0x1187af, _0x3a7414[_0x584790(359)] = _0x21be0c, _0x3a7414;
  }, setClientListener = (_0x44ee2c) => {
    const _0x41b7db = _0x436f, _0x543db2 = _0x436f, _0x158fa1 = { "xwPeb": function(_0x2ff8e4) {
      return _0x2ff8e4();
    }, "Mfvzm": function(_0x557d5a) {
      return _0x557d5a();
    } };
    {
      const { handleListener: _0x1d5fdc, addListener: _0x47b60e, removeListener: _0x7a7da6, clearListener: _0x32a47a } = _0x158fa1[_0x41b7db(326)](createHandleListener);
      _0x44ee2c["_onresponse"] = _0x1d5fdc, _0x44ee2c[_0x41b7db(395)] = _0x47b60e, _0x44ee2c["removeResponseListener"] = _0x7a7da6, _0x44ee2c["clearResponseListener"] = _0x32a47a;
    }
    {
      const { handleListener: _0x2a5fe3, addListener: _0x630b07, removeListener: _0xb70f6, clearListener: _0x3e94ce } = _0x158fa1[_0x543db2(326)](createHandleListener);
      _0x44ee2c[_0x543db2(328)] = _0x2a5fe3, _0x44ee2c["addRequestListener"] = _0x630b07, _0x44ee2c[_0x543db2(354)] = _0xb70f6, _0x44ee2c[_0x543db2(341)] = _0x3e94ce;
    }
    {
      const { handleListener: _0x535dd5, addListener: _0x394877, removeListener: _0x253b3b, clearListener: _0x44f208 } = _0x158fa1[_0x41b7db(375)](createHandleListener);
      _0x44ee2c[_0x41b7db(342)] = _0x535dd5, _0x44ee2c[_0x41b7db(327)] = _0x394877, _0x44ee2c["removeNotificationListener"] = _0x253b3b, _0x44ee2c["clearNotificationListener"] = _0x44f208;
    }
  };
  function _0x312b() {
    const _0x10336d = ["uUjKY", "notifications/initialized", "removeRequestListener", "96194JysfjF", "36346SGEWAV", "1357830AJaOeY", "resources/templates/list", "clearListener", "iQqcJ", "result", "tqDZP", "sSeCz", "XtowM", "HgYgW", "3913230mjiatC", "params", "roots/list", "function", "bfmJT", "transport", "resources/read", "27FNuDmk", "length", "Mfvzm", "ping", "code", "_onresponse", "vnkqu", "cjSoZ", "request", "9gIMIPC", "readResource", "GdkkV", "ptMjy", "call", "aVeaL", "completion/complete", "5035122lFbpzR", "logging/setLevel", "jQBBS", "send", "_requestHandlers", "jsonrpc", "addResponseListener", "7SpcenI", "ElOQH", "MDIkN", "message", "notifications/cancelled", "OhJjz", "clear", "672216JzFEyR", "xwPeb", "addNotificationListener", "fallbackRequestHandler", "sYzPD", "addListener", "ifIKG", "2.0", "gXsjT", "WqUnk", "resources/subscribe", "setLoggingLevel", "2491772kFUWFh", "SEmWX", "onerror", "prompts/get", "clearRequestListener", "fallbackNotificationHandler", "wxDWr", "SkoRK", "uTeHc", "handleListener", "Zybtx", "error", "originalOnResponse", "listResources", "initialize"];
    _0x312b = function() {
      return _0x10336d;
    };
    return _0x312b();
  }
  const initClientHandler = (_0x4eae35, { beforeInit: _0x5ede3e, afterInit: _0x392ad7 } = {}) => {
    const _0x39ee68 = _0x436f, _0x2ff689 = _0x436f, _0xef50a3 = { "tqDZP": function(_0x3b46af, _0x42b551) {
      return _0x3b46af === _0x42b551;
    }, "cjSoZ": "function", "iQqcJ": _0x39ee68(378), "Zybtx": function(_0x5e40d5, _0xea2fd6) {
      return _0x5e40d5(_0xea2fd6);
    }, "ElOQH": function(_0x29a1dd) {
      return _0x29a1dd();
    } }, _0x28c085 = new Map(_0x4eae35["_notificationHandlers"]);
    _0x4eae35[_0x39ee68(393)][_0x39ee68(402)](), _0x4eae35["_notificationHandlers"][_0x39ee68(402)](), _0xef50a3["tqDZP"](typeof _0x5ede3e, _0xef50a3[_0x39ee68(380)]) && _0x5ede3e(), _0xef50a3[_0x39ee68(362)](_0x4eae35["_onresponse"]["name"], _0xef50a3[_0x39ee68(360)]) && (_0x4eae35[_0x2ff689(349)] = _0x4eae35["_onresponse"]), _0xef50a3[_0x39ee68(347)](setClientListener, _0x4eae35), _0x4eae35["addResponseListener"]((_0x5b9ccc) => {
      const _0x44116a = _0x2ff689;
      _0x4eae35["originalOnResponse"][_0x44116a(386)](_0x4eae35, _0x5b9ccc);
    }), _0xef50a3["tqDZP"](typeof _0x392ad7, _0xef50a3[_0x2ff689(380)]) && _0xef50a3[_0x39ee68(397)](_0x392ad7), _0x4eae35[_0x2ff689(327)]((_0x4b3e63) => {
      const { method: _0x52cc8d } = _0x4b3e63, _0x1d4650 = _0x28c085["get"](_0x52cc8d);
      _0xef50a3["tqDZP"](typeof _0x1d4650, _0xef50a3["cjSoZ"]) && _0x1d4650(_0x4b3e63);
    });
  };
  const _0x1c80bf = _0x4f47, _0x53d80a = _0x4f47;
  (function(_0x274e6a, _0x42a727) {
    const _0x110d0e = _0x4f47, _0x242f23 = _0x4f47, _0x198664 = _0x274e6a();
    while (!![]) {
      try {
        const _0x571b93 = -parseInt(_0x110d0e(393)) / (7531 + 5849 + -13379) + parseInt(_0x110d0e(397)) / (12 * -615 + -1 * 5783 + 13165) * (-parseInt(_0x110d0e(400)) / (-7435 + 6318 + 1120)) + -parseInt(_0x242f23(398)) / (7 * 545 + 5036 * -1 + -1225 * -1) + parseInt(_0x110d0e(390)) / (-6 * 970 + 7 * -914 + -12223 * -1) * (parseInt(_0x242f23(388)) / (-79 * 78 + 5153 + 1015)) + -parseInt(_0x110d0e(389)) / (1 * -613 + 1 * 9786 + -9166) + -parseInt(_0x110d0e(402)) / (1906 * 4 + -3703 + -7 * 559) * (-parseInt(_0x242f23(395)) / (139 + -3 * -647 + -2071)) + parseInt(_0x242f23(399)) / (1110 + -78 * 79 + 5062 * 1) * (parseInt(_0x242f23(385)) / (-3040 + 1 * 4645 + 2 * -797));
        if (_0x571b93 === _0x42a727) break;
        else _0x198664["push"](_0x198664["shift"]());
      } catch (_0x222798) {
        _0x198664["push"](_0x198664["shift"]());
      }
    }
  })(_0x13a3, -1 * -881393 + 2 * 180895 + 1 * -644809);
  function _0x4f47(_0x5d6b98, _0xbed46d) {
    const _0x7f5b81 = _0x13a3();
    return _0x4f47 = function(_0x98208d, _0x540f7c) {
      _0x98208d = _0x98208d - (-1861 + -499 * 4 + 4241);
      let _0x1f0479 = _0x7f5b81[_0x98208d];
      return _0x1f0479;
    }, _0x4f47(_0x5d6b98, _0xbed46d);
  }
  function _0x13a3() {
    const _0x2dd535 = ["toString", "getRandomValues", "2101mUsYMI", "EQHzo", "padStart", "30UvDAkd", "1609706yzlqYx", "974735GrhZVO", "randomUUID", "REzPF", "562771BvAnoG", "dHTfU", "2047455boiYXf", "randomBytes", "14664qHAdbF", "3772144jLpQch", "52310AkWksx", "318MkjaVb", "from", "40WRwnSc"];
    _0x13a3 = function() {
      return _0x2dd535;
    };
    return _0x13a3();
  }
  const randomUUID$1 = () => {
    const _0x503b55 = _0x4f47, _0x5d1fe2 = _0x4f47, _0x1c89e3 = {};
    _0x1c89e3["REzPF"] = function(_0x36d31b, _0x2b87c4) {
      return _0x36d31b & _0x2b87c4;
    }, _0x1c89e3["suJHI"] = function(_0x341adf, _0x50c362) {
      return _0x341adf === _0x50c362;
    }, _0x1c89e3[_0x503b55(386)] = function(_0x2bd9d4, _0x55e7e8) {
      return _0x2bd9d4 & _0x55e7e8;
    }, _0x1c89e3[_0x5d1fe2(394)] = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
    const _0x2305bc = _0x1c89e3;
    if (_0x2305bc["suJHI"](typeof crypto, "object") && crypto["randomUUID"]) return crypto[_0x5d1fe2(391)]();
    return _0x2305bc["dHTfU"]["replace"](/[xy]/g, (_0x47a253) => {
      const _0xee7adc = _0x503b55, _0x3ebe42 = _0x503b55, _0x3b82cf = _0x2305bc[_0xee7adc(392)](crypto[_0xee7adc(384)](new Uint8Array(-25 * -62 + 7113 + 2 * -4331))[741 * 2 + -1385 * -2 + 4252 * -1], 8648 + -107 * 62 + -1999), _0x5cd225 = _0x2305bc["suJHI"](_0x47a253, "x") ? _0x3b82cf : _0x2305bc[_0x3ebe42(386)](_0x3b82cf, -2516 + -1861 + 4 * 1095) | 5047 + 32 + 461 * -11;
      return _0x5cd225["toString"](9449 + 4 * -461 + -7589);
    });
  }, randomBytes = (_0x2added) => {
    const _0x3977c7 = _0x4f47, _0x2f0d95 = _0x4f47, _0x516c9f = new Uint8Array(_0x2added);
    return crypto["getRandomValues"](_0x516c9f), Array[_0x3977c7(401)](_0x516c9f, (_0x145cf8) => _0x145cf8[_0x2f0d95(403)](-3 * 1739 + -6509 + 2 * 5871)[_0x3977c7(387)](6365 + 9124 + -15487, "0"))["join"]("");
  }, _0xf24c8f = {};
  _0xf24c8f[_0x1c80bf(391)] = randomUUID$1, _0xf24c8f[_0x53d80a(396)] = randomBytes;
  const _0x4b5fcc = _0x47a7;
  (function(_0x564ad7, _0x4857af) {
    const _0x465eed = _0x47a7, _0xa45919 = _0x47a7, _0x1574ce = _0x564ad7();
    while (!![]) {
      try {
        const _0x1a581d = parseInt(_0x465eed(521)) / (-3755 * -2 + -4007 + -3502 * 1) * (parseInt(_0xa45919(499)) / (-521 * 5 + -7998 + 10605)) + parseInt(_0xa45919(543)) / (-35 * 241 + 289 * 13 + 4681) * (parseInt(_0xa45919(514)) / (-2831 + -6 * 664 + 6819)) + parseInt(_0x465eed(502)) / (-2 * -995 + 7808 + -9793) * (parseInt(_0xa45919(539)) / (-5989 + -857 + 571 * 12)) + parseInt(_0x465eed(553)) / (7818 + 1821 + -9632) + parseInt(_0x465eed(516)) / (-1559 + 7309 * -1 + 8876) * (-parseInt(_0x465eed(518)) / (8701 + -227 * 10 + -2 * 3211)) + -parseInt(_0x465eed(531)) / (-2966 + 14 * 74 + 1940) + -parseInt(_0x465eed(545)) / (1465 + -1446 + -8) * (parseInt(_0x465eed(541)) / (1676 + 8779 + -59 * 177));
        if (_0x1a581d === _0x4857af) break;
        else _0x1574ce["push"](_0x1574ce["shift"]());
      } catch (_0x4fe820) {
        _0x1574ce["push"](_0x1574ce["shift"]());
      }
    }
  })(_0x4529, 1472653 * 1 + -2 * -897917 + -2275789);
  const forwardProxyClient = (_0x53de69, _0x17fc54) => {
    const _0x5c6b05 = _0x47a7, _0xe7562f = _0x47a7, _0x473cd6 = { "FyYHt": function(_0x5e7e1e, _0x251ae7, _0x311330) {
      return _0x5e7e1e(_0x251ae7, _0x311330);
    }, "Fxtoq": function(_0x24fdb2, _0x5940e5, _0x4cecbc) {
      return _0x24fdb2(_0x5940e5, _0x4cecbc);
    } };
    forwardServerOnRequest(_0x53de69, _0x17fc54), forwardServerOnNotification(_0x53de69, _0x17fc54);
    const _0x5dd8c7 = forwardClientOnRequest(_0x17fc54, _0x53de69), _0x14e3a4 = _0x473cd6[_0x5c6b05(510)](forwardClientOnResponse, _0x17fc54, _0x53de69), _0x1e8916 = _0x473cd6[_0xe7562f(549)](forwardClientOnNotification, _0x17fc54, _0x53de69);
    _0x17fc54[_0xe7562f(537)](_0x5dd8c7), _0x17fc54[_0x5c6b05(519)](_0x14e3a4), _0x17fc54["addNotificationListener"](_0x1e8916), _0x53de69[_0xe7562f(556)] = () => {
      const _0x6d3192 = _0xe7562f;
      _0x17fc54["removeRequestListener"](_0x5dd8c7), _0x17fc54[_0x6d3192(530)](_0x14e3a4), _0x17fc54[_0x6d3192(529)](_0x1e8916);
    };
  }, initWebClientHandler = (_0xbd06f8, _0x419735, _0x5699a0) => {
    const _0xec4f52 = _0x47a7, _0x441bc3 = { "pMiva": function(_0x356e75, _0x48efdd) {
      return _0x356e75 instanceof _0x48efdd;
    }, "TeTEy": _0xec4f52(546), "fyZbd": function(_0x156fdc, _0x32271d, _0x563255) {
      return _0x156fdc(_0x32271d, _0x563255);
    } }, _0x56df6e = () => {
      var _a;
      const _0x42afa2 = _0xec4f52;
      _0x441bc3["pMiva"](_0x5699a0, SSEClientTransport) && ((_a = _0x5699a0["_eventSource"]) == null ? void 0 : _a["addEventListener"](_0x441bc3[_0x42afa2(547)], () => {
        var _a2;
        const _0xd16fcf = _0x42afa2;
        (_a2 = _0x5699a0[_0xd16fcf(509)]) == null ? void 0 : _a2[_0xd16fcf(546)]();
      })), forwardProxyClient(_0xbd06f8, _0x419735);
    }, _0x56311c = {};
    _0x56311c["afterInit"] = _0x56df6e, _0x441bc3["fyZbd"](initClientHandler, _0x419735, _0x56311c);
  };
  const sseOptions = (_0x4b6179, _0x453b8b = _0xf24c8f["randomUUID"]()) => {
    const _0x43bcb2 = _0x47a7, _0x1925d6 = _0x47a7, _0x180741 = { "OfssH": function(_0x2d9225, _0x537283, _0x2820a8) {
      return _0x2d9225(_0x537283, _0x2820a8);
    } }, _0x3c78b4 = {};
    _0x3c78b4[_0x43bcb2(528)] = _0x453b8b;
    const _0xb9b933 = _0x3c78b4, _0x5263fd = {};
    _0x5263fd[_0x43bcb2(528)] = _0x453b8b;
    const _0x22a05a = {};
    _0x22a05a[_0x1925d6(558)] = _0x5263fd, _0x22a05a[_0x43bcb2(534)] = _0x43bcb2(524);
    const _0x27d38e = { "requestInit": _0x22a05a, "eventSourceInit": { async "fetch"(_0x11e1af, _0x36682f) {
      const _0x3e06e7 = _0x43bcb2, _0x4202d7 = _0x1925d6, _0x54dc09 = new Headers((_0x36682f == null ? void 0 : _0x36682f[_0x3e06e7(558)]) || {});
      Object["entries"](_0xb9b933)[_0x4202d7(498)](([_0x57dbc7, _0x5102e6]) => {
        const _0xef4bbf = _0x4202d7;
        _0x54dc09[_0xef4bbf(527)](_0x57dbc7, _0x5102e6);
      });
      const _0x3f3a97 = { ..._0x36682f };
      return _0x3f3a97[_0x4202d7(558)] = _0x54dc09, _0x180741["OfssH"](fetch, _0x11e1af, _0x3f3a97);
    }, "withCredentials": !![] } };
    return _0x4b6179 && (_0x27d38e["requestInit"][_0x43bcb2(558)]["Authorization"] = _0x43bcb2(533) + _0x4b6179, _0xb9b933["Authorization"] = "Bearer " + _0x4b6179), _0x27d38e;
  };
  const streamOptions = (_0x3c6aa5, _0x4108dd = _0xf24c8f[_0x4b5fcc(517)]()) => {
    const _0x22b3a4 = _0x4b5fcc, _0x471b62 = _0x4b5fcc, _0x10d4da = {};
    _0x10d4da["nwQhY"] = "include";
    const _0x36c773 = _0x10d4da, _0x4a8f59 = {};
    _0x4a8f59["stream-session-id"] = _0x4108dd;
    const _0x287e71 = {};
    _0x287e71["headers"] = _0x4a8f59, _0x287e71["credentials"] = _0x36c773[_0x22b3a4(520)];
    const _0x607b16 = {};
    _0x607b16[_0x22b3a4(544)] = _0x287e71;
    const _0x1bc4b2 = _0x607b16;
    return _0x3c6aa5 && (_0x1bc4b2["requestInit"]["headers"][_0x471b62(552)] = _0x471b62(533) + _0x3c6aa5), _0x1bc4b2;
  };
  const attemptConnection = async (_0x392cef, _0x4e2254, _0x7e37a) => {
    const _0x499695 = _0x4b5fcc, _0x960d30 = _0x4b5fcc, _0x2e99f7 = { "CFfFC": function(_0x2880a3) {
      return _0x2880a3();
    }, "egwVO": function(_0x459eeb, _0x1ba5f4, _0xa79e2d, _0x34b1c9) {
      return _0x459eeb(_0x1ba5f4, _0xa79e2d, _0x34b1c9);
    } }, _0x3109d4 = _0x2e99f7["CFfFC"](_0x7e37a);
    try {
      return await _0x392cef[_0x499695(538)](_0x3109d4), _0x3109d4;
    } catch (_0x2e4c22) {
      if (_0x2e4c22 instanceof UnauthorizedError) {
        const _0x1a7050 = await _0x4e2254();
        return await _0x3109d4[_0x960d30(505)](_0x1a7050), await _0x2e99f7[_0x499695(525)](attemptConnection, _0x392cef, _0x4e2254, _0x7e37a);
      } else throw _0x2e4c22;
    }
  };
  function _0x47a7(_0x31715f, _0x5e9fa0) {
    const _0x26a018 = _0x4529();
    return _0x47a7 = function(_0x257357, _0x2e760b) {
      _0x257357 = _0x257357 - (74 * -67 + -8341 + -73 * -189);
      let _0x1334e3 = _0x26a018[_0x257357];
      return _0x1334e3;
    }, _0x47a7(_0x31715f, _0x5e9fa0);
  }
  const getWaitForOAuthCodeFunction = (_0x3ea3cc, _0x1a8f90) => {
    const _0xae6017 = _0x4b5fcc, _0x3dddee = _0x4b5fcc, _0x11d77d = {};
    _0x11d77d["RsKXs"] = function(_0x35f130, _0x386a12) {
      return _0x35f130 in _0x386a12;
    }, _0x11d77d["PBhps"] = "waitForOAuthCode", _0x11d77d[_0xae6017(535)] = "function", _0x11d77d[_0xae6017(507)] = "waitForOAuthCode need to be provided when authProvider is provided";
    const _0x2562e6 = _0x11d77d;
    if (_0x2562e6["RsKXs"](_0x2562e6[_0x3dddee(551)], _0x3ea3cc)) return _0x3ea3cc[_0x3dddee(523)];
    else {
      if (typeof _0x1a8f90 === _0x2562e6["yTKoP"]) return _0x1a8f90;
    }
    throw new Error(_0x2562e6["RZhOv"]);
  };
  const createSseProxy = async (_0x3a7e67) => {
    const _0x436c50 = _0x4b5fcc, _0x54de6e = _0x4b5fcc, _0x15dc58 = { "TFSRn": function(_0x3d2e7e, _0x561712, _0x2439e9) {
      return _0x3d2e7e(_0x561712, _0x2439e9);
    }, "HwvVa": "mcp-sse-proxy-client", "ufTHS": function(_0x14fa54) {
      return _0x14fa54();
    }, "WIVYl": function(_0x538291, _0x3c8264, _0x52c29b, _0x1d8414) {
      return _0x538291(_0x3c8264, _0x52c29b, _0x1d8414);
    }, "jniGY": "sessionId" }, { client: _0x25d054, url: _0x2828f0, token: _0x367a86, sessionId: _0x397571, authProvider: _0x16a780, requestInit: _0xd2fc7a, eventSourceInit: _0x3321f4, waitForOAuthCode: _0xe2483b } = _0x3a7e67, _0x507895 = {};
    _0x507895["authProvider"] = _0x16a780, _0x507895["requestInit"] = _0xd2fc7a, _0x507895["eventSourceInit"] = _0x3321f4;
    const _0x497c77 = _0x507895, _0x1a290e = _0x397571 || _0xf24c8f["randomUUID"](), _0x3d01da = _0x15dc58[_0x436c50(506)](sseOptions, _0x367a86, _0x1a290e);
    if (_0xd2fc7a) {
      const _0x6e0637 = { ..._0x3d01da["requestInit"], ..._0xd2fc7a };
      _0x6e0637["headers"] = { ..._0x3d01da[_0x436c50(544)]["headers"], ..._0xd2fc7a["headers"] }, _0x497c77["requestInit"] = _0x6e0637;
    } else _0x497c77[_0x54de6e(544)] = _0x3d01da["requestInit"];
    if (_0x3321f4) {
      const _0x143351 = { ..._0x3d01da[_0x436c50(559)], ..._0x3321f4 };
      _0x497c77["eventSourceInit"] = _0x143351;
    } else _0x497c77["eventSourceInit"] = _0x3d01da["eventSourceInit"];
    const _0x4d6715 = {};
    _0x4d6715["listChanged"] = !![];
    const _0x6e6fc2 = {};
    _0x6e6fc2["roots"] = _0x4d6715, _0x6e6fc2["sampling"] = {}, _0x6e6fc2[_0x436c50(511)] = {};
    const _0x4ab62c = _0x6e6fc2, _0x278492 = {};
    _0x278492[_0x54de6e(536)] = _0x15dc58["HwvVa"], _0x278492["version"] = _0x436c50(526);
    const _0x53bd61 = {};
    _0x53bd61["capabilities"] = _0x4ab62c;
    const _0x4512ab = new Client(_0x278492, _0x53bd61), _0x2362cc = () => new SSEClientTransport(new URL(_0x2828f0), _0x497c77);
    let _0x5a6b4b = _0x15dc58[_0x54de6e(504)](_0x2362cc);
    if (_0x16a780) {
      const _0xffec8d = _0x15dc58[_0x436c50(506)](getWaitForOAuthCodeFunction, _0x16a780, _0xe2483b);
      _0x5a6b4b = await _0x15dc58[_0x54de6e(513)](attemptConnection, _0x4512ab, _0xffec8d, _0x2362cc);
    } else await _0x4512ab[_0x436c50(538)](_0x5a6b4b);
    _0x15dc58[_0x54de6e(513)](initWebClientHandler, _0x4512ab, _0x25d054, _0x5a6b4b), _0x5a6b4b[_0x54de6e(557)] = _0x5a6b4b[_0x54de6e(542)]["searchParams"][_0x54de6e(532)](_0x15dc58["jniGY"]);
    const _0x5ba2fa = {};
    return _0x5ba2fa["transport"] = _0x5a6b4b, _0x5ba2fa["sessionId"] = _0x5a6b4b[_0x436c50(557)], _0x5ba2fa;
  };
  function _0x4529() {
    const _0x51eb5a = ["ufTHS", "finishAuth", "TFSRn", "RZhOv", "Vajmx", "_eventSource", "FyYHt", "elicitation", "transport", "WIVYl", "13320uyrBtN", "sampling", "8WTwLJD", "randomUUID", "6438654bkJHij", "addResponseListener", "nwQhY", "11721GVgRMJ", "?sessionId=", "waitForOAuthCode", "include", "egwVO", "1.0.0", "set", "sse-session-id", "removeNotificationListener", "removeResponseListener", "11838520fNkjrV", "get", "Bearer ", "credentials", "yTKoP", "name", "addRequestListener", "connect", "18VhCgQv", "mcp-socket-proxy-client", "2819364JNqkQZ", "_endpoint", "699JyrxCR", "requestInit", "44ofbsvb", "close", "TeTEy", "QgzDy", "Fxtoq", "roots", "PBhps", "Authorization", "11309130xGCFwl", "&token=", "version", "onclose", "sessionId", "headers", "eventSourceInit", "forEach", "62FcOkCa", "mcp-stream-proxy-client", "zXcpO", "1794855cQEXDT", "biJOc"];
    _0x4529 = function() {
      return _0x51eb5a;
    };
    return _0x4529();
  }
  const createStreamProxy = async (_0x251f90) => {
    const _0x12bb64 = _0x4b5fcc, _0x15c0a5 = _0x4b5fcc, _0x4250bb = { "Vajmx": _0x12bb64(500), "biJOc": function(_0x5b7586) {
      return _0x5b7586();
    }, "zXcpO": function(_0x51be96, _0x1bc1c4, _0x15398b) {
      return _0x51be96(_0x1bc1c4, _0x15398b);
    }, "zDnjZ": function(_0x5c8088, _0x59eeb2, _0x1f72fa, _0x3031b6) {
      return _0x5c8088(_0x59eeb2, _0x1f72fa, _0x3031b6);
    }, "FQMAh": function(_0x43d649, _0x7358f7, _0x26214b, _0x209c8f) {
      return _0x43d649(_0x7358f7, _0x26214b, _0x209c8f);
    } }, { client: _0x2334f3, url: _0x20f945, token: _0x48014b, sessionId: _0x46b665, authProvider: _0x20e29a, requestInit: _0x171024, reconnectionOptions: _0x3cef76, waitForOAuthCode: _0x487335 } = _0x251f90, _0x5aeb10 = {};
    _0x5aeb10["authProvider"] = _0x20e29a, _0x5aeb10["requestInit"] = _0x171024, _0x5aeb10["reconnectionOptions"] = _0x3cef76;
    const _0x4e9a89 = _0x5aeb10, _0x49384b = _0x46b665 || _0xf24c8f["randomUUID"](), _0x24b3ae = streamOptions(_0x48014b, _0x49384b);
    if (_0x171024) {
      const _0x15a268 = { ..._0x24b3ae["requestInit"], ..._0x171024 };
      _0x15a268["headers"] = { ..._0x24b3ae["requestInit"]["headers"], ..._0x171024["headers"] }, _0x4e9a89[_0x12bb64(544)] = _0x15a268;
    } else _0x4e9a89["requestInit"] = _0x24b3ae["requestInit"];
    const _0x485d9e = {};
    _0x485d9e["listChanged"] = !![];
    const _0x17fa21 = {};
    _0x17fa21[_0x15c0a5(550)] = _0x485d9e, _0x17fa21["sampling"] = {}, _0x17fa21["elicitation"] = {};
    const _0x1f04a3 = _0x17fa21, _0x1e85db = {};
    _0x1e85db[_0x12bb64(536)] = _0x4250bb[_0x15c0a5(508)], _0x1e85db[_0x12bb64(555)] = "1.0.0";
    const _0x2d6e84 = {};
    _0x2d6e84["capabilities"] = _0x1f04a3;
    const _0x40e04e = new Client(_0x1e85db, _0x2d6e84), _0x4e1361 = () => new StreamableHTTPClientTransport(new URL(_0x20f945), _0x4e9a89);
    let _0x5ae9aa = _0x4250bb[_0x12bb64(503)](_0x4e1361);
    if (_0x20e29a) {
      const _0x3d746a = _0x4250bb[_0x12bb64(501)](getWaitForOAuthCodeFunction, _0x20e29a, _0x487335);
      _0x5ae9aa = await _0x4250bb["zDnjZ"](attemptConnection, _0x40e04e, _0x3d746a, _0x4e1361);
    } else await _0x40e04e["connect"](_0x5ae9aa);
    _0x4250bb["FQMAh"](initWebClientHandler, _0x40e04e, _0x2334f3, _0x5ae9aa);
    const _0x3d688a = {};
    return _0x3d688a["transport"] = _0x5ae9aa, _0x3d688a[_0x15c0a5(557)] = _0x5ae9aa["sessionId"], _0x3d688a;
  };
  const createSocketProxy = async (_0x371158) => {
    const _0x4f4147 = _0x4b5fcc, _0x45162f = _0x4b5fcc, _0x2442c1 = { "QgzDy": _0x4f4147(540), "jkaVB": function(_0x1bdb95, _0x25d320, _0x22f979, _0xb08066) {
      return _0x1bdb95(_0x25d320, _0x22f979, _0xb08066);
    } }, { client: _0x218c80, url: _0x2b1955, token: _0x1b0573, sessionId: _0xb915e1 } = _0x371158, _0x2ef92e = {};
    _0x2ef92e["listChanged"] = !![];
    const _0x296a66 = {};
    _0x296a66[_0x4f4147(550)] = _0x2ef92e, _0x296a66[_0x4f4147(515)] = {}, _0x296a66[_0x45162f(511)] = {};
    const _0x1d78ab = _0x296a66, _0x59044f = {};
    _0x59044f["name"] = _0x2442c1[_0x45162f(548)], _0x59044f[_0x45162f(555)] = _0x45162f(526);
    const _0x287996 = {};
    _0x287996["capabilities"] = _0x1d78ab;
    const _0x4907cb = new Client(_0x59044f, _0x287996), _0x4a1bd2 = _0xb915e1 || _0xf24c8f[_0x45162f(517)](), _0x530686 = new WebSocketClientTransport(new URL(_0x2b1955 + _0x4f4147(522) + _0x4a1bd2 + _0x45162f(554) + _0x1b0573));
    await _0x4907cb["connect"](_0x530686), _0x2442c1["jkaVB"](initWebClientHandler, _0x4907cb, _0x218c80, _0x530686);
    const _0x4940eb = {};
    return _0x4940eb[_0x4f4147(512)] = _0x530686, _0x4940eb[_0x45162f(557)] = _0x4a1bd2, _0x4940eb;
  };
  const _0x125317 = _0x295b, _0x5b1277 = _0x295b;
  function _0x295b(_0x143a1c, _0x560afd) {
    const _0x193076 = _0x19d4();
    return _0x295b = function(_0x3382c8, _0x453e4f) {
      _0x3382c8 = _0x3382c8 - (-7499 + -9262 + 51 * 337);
      let _0x3af06e = _0x193076[_0x3382c8];
      return _0x3af06e;
    }, _0x295b(_0x143a1c, _0x560afd);
  }
  (function(_0x1a8e04, _0x35cb37) {
    const _0x50af36 = _0x295b, _0x4734b7 = _0x295b, _0x5d6f5b = _0x1a8e04();
    while (!![]) {
      try {
        const _0x5d8f75 = -parseInt(_0x50af36(440)) / (-8893 + 7 * 7 + 1769 * 5) + -parseInt(_0x50af36(458)) / (-8 * 123 + -538 + 3 * 508) * (parseInt(_0x50af36(448)) / (3625 + -4072 + 450)) + -parseInt(_0x50af36(451)) / (-9016 + 6489 + 1 * 2531) * (parseInt(_0x4734b7(449)) / (-33 * 121 + 8411 + -4413)) + -parseInt(_0x4734b7(455)) / (6408 + -4012 + -2390) + -parseInt(_0x50af36(427)) / (131 * -55 + -1 * 7666 + 14878) + -parseInt(_0x4734b7(438)) / (-4080 + -3534 * -2 + -2980) * (parseInt(_0x4734b7(459)) / (2556 + -8604 + -673 * -9)) + parseInt(_0x50af36(430)) / (-1010 + -3818 + 2419 * 2) * (parseInt(_0x4734b7(436)) / (-27 * -343 + -922 + 694 * -12));
        if (_0x5d8f75 === _0x35cb37) break;
        else _0x5d6f5b["push"](_0x5d6f5b["shift"]());
      } catch (_0x19fe41) {
        _0x5d6f5b["push"](_0x5d6f5b["shift"]());
      }
    }
  })(_0x19d4, -220880 + 1 * -333337 + -2 * -384996);
  function _0x19d4() {
    const _0x276461 = ["650XPHLhD", "redirectToAuthorization", "10856jPvMVb", "GET", "qcFPW", "_redirectUrl", "2187414WnlGuZ", "resolve", "tokens", "3976YyOqUl", "27ejNHsa", "Content-Type", "waitForOAuthCode", "2903796yvWZFa", "_clientMetadata", "application/x-www-form-urlencoded", "10beEWJk", "json", "code", "_callBackPromise", "reject", "saveClientInformation", "20776349mLNCcF", "_codeVerifier", "629912aTknXq", "_tokens", "52074GwcpRo", "state", "_state", "_redirectCallback", "_clientInformation", "redirect_uris", "Failed to redirect: ", "clientInformation", "381aduWsB"];
    _0x19d4 = function() {
      return _0x276461;
    };
    return _0x19d4();
  }
  const generateStateFunction = () => {
    return _0xf24c8f["randomBytes"](3485 * 1 + -261 + -3184);
  };
  class AuthClientProvider {
    constructor(_0x3ecaba) {
      const _0x16d744 = _0x295b, _0x573fab = _0x295b;
      this["_callBackPromise"] = {};
      const { clientMetadata: _0x2075ee, state: _0x492c9e, redirectCallback: _0x418b2e, getAuthCodeByState: _0x5a6f80, waitForOAuthCode: _0x50de46 } = _0x3ecaba;
      this[_0x16d744(428)] = _0x2075ee, this[_0x16d744(454)] = _0x2075ee[_0x16d744(445)][-186 + -7549 + 7735], this["_state"] = _0x492c9e || generateStateFunction(), this["_redirectCallback"] = _0x418b2e || this["redirectCallbackFunction"], this["_getAuthCodeByState"] = _0x5a6f80 || this["getAuthCodeByStateFunction"], this[_0x573fab(426)] = _0x50de46 || this["waitForOAuthCodeFunction"]();
    }
    async ["redirectCallbackFunction"](_0x182039) {
      var _a, _b, _c, _d, _e, _f;
      const _0x2d7e3c = _0x295b, _0x2a3a87 = _0x295b, _0x3c788d = { "qITTp": function(_0x20812e, _0x1b0a26, _0x3458a1) {
        return _0x20812e(_0x1b0a26, _0x3458a1);
      }, "qcFPW": _0x2d7e3c(452) }, _0x2eeda1 = await _0x3c788d["qITTp"](fetch, _0x182039, { "method": _0x3c788d[_0x2d7e3c(453)] });
      !_0x2eeda1["ok"] && ((_b = (_a = this["_callBackPromise"])["reject"]) == null ? void 0 : _b.call(_a, _0x2a3a87(446) + _0x2eeda1["statusText"]));
      const _0x4cf1ec = await this["_getAuthCodeByState"](this[_0x2a3a87(454)], this[_0x2d7e3c(442)]);
      if (!_0x4cf1ec["ok"]) {
        (_d = (_c = this[_0x2d7e3c(433)])["reject"]) == null ? void 0 : _d.call(_c, "Failed to fetch auth code: " + _0x4cf1ec["statusText"]);
        return;
      }
      const _0x37d882 = await _0x4cf1ec[_0x2d7e3c(431)]();
      (_f = (_e = this[_0x2a3a87(433)])[_0x2d7e3c(456)]) == null ? void 0 : _f.call(_e, _0x37d882[_0x2d7e3c(432)]);
    }
    async ["getAuthCodeByStateFunction"](_0x17f993, _0x1a4325) {
      const _0x3626c4 = _0x295b, _0x5612c4 = _0x295b, _0xc6e3ca = {};
      _0xc6e3ca["tuSmb"] = _0x3626c4(429);
      const _0x28efc2 = _0xc6e3ca, _0x383513 = {};
      _0x383513[_0x3626c4(460)] = _0x28efc2["tuSmb"];
      const _0x9e72f2 = {};
      return _0x9e72f2[_0x5612c4(441)] = _0x1a4325, fetch(_0x17f993, { "method": "POST", "headers": _0x383513, "body": new URLSearchParams(_0x9e72f2) });
    }
    ["waitForOAuthCodeFunction"]() {
      const _0xa710fb = _0x295b, _0x511b52 = this[_0xa710fb(433)];
      return () => new Promise((_0x1edebd, _0x1825a2) => {
        const _0x268a86 = _0xa710fb;
        _0x511b52["resolve"] = _0x1edebd, _0x511b52[_0x268a86(434)] = _0x1825a2;
      });
    }
    get ["redirectUrl"]() {
      const _0x4af006 = _0x295b;
      return this[_0x4af006(454)];
    }
    get ["clientMetadata"]() {
      return this["_clientMetadata"];
    }
    ["state"]() {
      return this["_state"];
    }
    [_0x125317(447)]() {
      const _0x403dc5 = _0x125317;
      return this[_0x403dc5(444)];
    }
    [_0x5b1277(435)](_0x48ae19) {
      const _0x2f8a8e = _0x125317;
      this[_0x2f8a8e(444)] = _0x48ae19;
    }
    [_0x5b1277(457)]() {
      const _0x4f9f20 = _0x5b1277;
      return this[_0x4f9f20(439)];
    }
    ["saveTokens"](_0x23e270) {
      this["_tokens"] = _0x23e270;
    }
    [_0x5b1277(450)](_0x3b8777) {
      const _0x43d6aa = _0x125317;
      this[_0x43d6aa(443)](_0x3b8777);
    }
    ["saveCodeVerifier"](_0x24fa92) {
      this["_codeVerifier"] = _0x24fa92;
    }
    ["codeVerifier"]() {
      const _0x5580e8 = _0x125317;
      if (!this[_0x5580e8(437)]) throw new Error("No code verifier saved");
      return this["_codeVerifier"];
    }
  }
  (function(_0x3eddf7, _0x37edba) {
    var _0x4f4dfb = _0x2d57, _0x26a47e = _0x2d57, _0x455a42 = _0x3eddf7();
    while (!![]) {
      try {
        var _0x352785 = parseInt(_0x4f4dfb(361)) / (-8487 + 3575 + -17 * -289) * (parseInt(_0x26a47e(363)) / (-1 * -8543 + 5 * 233 + -9706)) + -parseInt(_0x4f4dfb(358)) / (-4 * -991 + -4153 * 1 + 192) + parseInt(_0x4f4dfb(359)) / (8411 + -6883 + 381 * -4) * (parseInt(_0x4f4dfb(357)) / (37 * -99 + -553 * -13 + 1 * -3521)) + parseInt(_0x26a47e(354)) / (3127 + 1287 + -4408) * (parseInt(_0x4f4dfb(360)) / (79 * -47 + -6867 + -10587 * -1)) + parseInt(_0x26a47e(362)) / (2879 * -1 + -4327 + 7214 * 1) + parseInt(_0x26a47e(364)) / (-7772 + -1 * -7873 + -92) + -parseInt(_0x26a47e(356)) / (9184 + -6643 + -2531) * (parseInt(_0x4f4dfb(355)) / (1843 + 1 * 9218 + 425 * -26));
        if (_0x352785 === _0x37edba) break;
        else _0x455a42["push"](_0x455a42["shift"]());
      } catch (_0x2a1929) {
        _0x455a42["push"](_0x455a42["shift"]());
      }
    }
  })(_0x59e6, -73523 * -3 + 1 * -407717 + 530518);
  function _0x59e6() {
    var _0x5ee1c4 = ["40ecBYYe", "1095owKKYD", "486870YOVwZy", "5752xWiyTO", "561484biNVMw", "1fWJmxQ", "1866064SPnyhb", "1109522vMiuMX", "1602351pPEGwH", "12sVyMLL", "2573296LTwOhv"];
    _0x59e6 = function() {
      return _0x5ee1c4;
    };
    return _0x59e6();
  }
  function _0x2d57(_0x22a4e9, _0x3c5d7b) {
    var _0x3ed0bb = _0x59e6();
    return _0x2d57 = function(_0x19cb9d, _0x563453) {
      _0x19cb9d = _0x19cb9d - (-1 * -642 + 503 * -5 + 2227);
      var _0x246bca = _0x3ed0bb[_0x19cb9d];
      return _0x246bca;
    }, _0x2d57(_0x22a4e9, _0x3c5d7b);
  }
  class ExperimentalServerTasks {
    constructor(_server) {
      this._server = _server;
    }
    /**
     * Sends a request and returns an AsyncGenerator that yields response messages.
     * The generator is guaranteed to end with either a 'result' or 'error' message.
     *
     * This method provides streaming access to request processing, allowing you to
     * observe intermediate task status updates for task-augmented requests.
     *
     * @param request - The request to send
     * @param resultSchema - Zod schema for validating the result
     * @param options - Optional request options (timeout, signal, task creation params, etc.)
     * @returns AsyncGenerator that yields ResponseMessage objects
     *
     * @experimental
     */
    requestStream(request, resultSchema, options) {
      return this._server.requestStream(request, resultSchema, options);
    }
    /**
     * Gets the current status of a task.
     *
     * @param taskId - The task identifier
     * @param options - Optional request options
     * @returns The task status
     *
     * @experimental
     */
    async getTask(taskId, options) {
      return this._server.getTask({ taskId }, options);
    }
    /**
     * Retrieves the result of a completed task.
     *
     * @param taskId - The task identifier
     * @param resultSchema - Zod schema for validating the result
     * @param options - Optional request options
     * @returns The task result
     *
     * @experimental
     */
    async getTaskResult(taskId, resultSchema, options) {
      return this._server.getTaskResult({ taskId }, resultSchema, options);
    }
    /**
     * Lists tasks with optional pagination.
     *
     * @param cursor - Optional pagination cursor
     * @param options - Optional request options
     * @returns List of tasks with optional next cursor
     *
     * @experimental
     */
    async listTasks(cursor, options) {
      return this._server.listTasks(cursor ? { cursor } : void 0, options);
    }
    /**
     * Cancels a running task.
     *
     * @param taskId - The task identifier
     * @param options - Optional request options
     *
     * @experimental
     */
    async cancelTask(taskId, options) {
      return this._server.cancelTask({ taskId }, options);
    }
  }
  class Server extends Protocol {
    /**
     * Initializes this server with the given name and version information.
     */
    constructor(_serverInfo, options) {
      var _a, _b;
      super(options);
      this._serverInfo = _serverInfo;
      this._loggingLevels = /* @__PURE__ */ new Map();
      this.LOG_LEVEL_SEVERITY = new Map(LoggingLevelSchema.options.map((level, index) => [level, index]));
      this.isMessageIgnored = (level, sessionId) => {
        const currentLevel = this._loggingLevels.get(sessionId);
        return currentLevel ? this.LOG_LEVEL_SEVERITY.get(level) < this.LOG_LEVEL_SEVERITY.get(currentLevel) : false;
      };
      this._capabilities = (_a = options === null || options === void 0 ? void 0 : options.capabilities) !== null && _a !== void 0 ? _a : {};
      this._instructions = options === null || options === void 0 ? void 0 : options.instructions;
      this._jsonSchemaValidator = (_b = options === null || options === void 0 ? void 0 : options.jsonSchemaValidator) !== null && _b !== void 0 ? _b : new AjvJsonSchemaValidator();
      this.setRequestHandler(InitializeRequestSchema, (request) => this._oninitialize(request));
      this.setNotificationHandler(InitializedNotificationSchema, () => {
        var _a2;
        return (_a2 = this.oninitialized) === null || _a2 === void 0 ? void 0 : _a2.call(this);
      });
      if (this._capabilities.logging) {
        this.setRequestHandler(SetLevelRequestSchema, async (request, extra) => {
          var _a2;
          const transportSessionId = extra.sessionId || ((_a2 = extra.requestInfo) === null || _a2 === void 0 ? void 0 : _a2.headers["mcp-session-id"]) || void 0;
          const { level } = request.params;
          const parseResult = LoggingLevelSchema.safeParse(level);
          if (parseResult.success) {
            this._loggingLevels.set(transportSessionId, parseResult.data);
          }
          return {};
        });
      }
    }
    /**
     * Access experimental features.
     *
     * WARNING: These APIs are experimental and may change without notice.
     *
     * @experimental
     */
    get experimental() {
      if (!this._experimental) {
        this._experimental = {
          tasks: new ExperimentalServerTasks(this)
        };
      }
      return this._experimental;
    }
    /**
     * Registers new capabilities. This can only be called before connecting to a transport.
     *
     * The new capabilities will be merged with any existing capabilities previously given (e.g., at initialization).
     */
    registerCapabilities(capabilities) {
      if (this.transport) {
        throw new Error("Cannot register capabilities after connecting to transport");
      }
      this._capabilities = mergeCapabilities(this._capabilities, capabilities);
    }
    /**
     * Override request handler registration to enforce server-side validation for tools/call.
     */
    setRequestHandler(requestSchema, handler) {
      var _a, _b, _c;
      const shape = getObjectShape(requestSchema);
      const methodSchema = shape === null || shape === void 0 ? void 0 : shape.method;
      if (!methodSchema) {
        throw new Error("Schema is missing a method literal");
      }
      let methodValue;
      if (isZ4Schema(methodSchema)) {
        const v4Schema = methodSchema;
        const v4Def = (_a = v4Schema._zod) === null || _a === void 0 ? void 0 : _a.def;
        methodValue = (_b = v4Def === null || v4Def === void 0 ? void 0 : v4Def.value) !== null && _b !== void 0 ? _b : v4Schema.value;
      } else {
        const v3Schema = methodSchema;
        const legacyDef = v3Schema._def;
        methodValue = (_c = legacyDef === null || legacyDef === void 0 ? void 0 : legacyDef.value) !== null && _c !== void 0 ? _c : v3Schema.value;
      }
      if (typeof methodValue !== "string") {
        throw new Error("Schema method literal must be a string");
      }
      const method = methodValue;
      if (method === "tools/call") {
        const wrappedHandler = async (request, extra) => {
          const validatedRequest = safeParse(CallToolRequestSchema, request);
          if (!validatedRequest.success) {
            const errorMessage = validatedRequest.error instanceof Error ? validatedRequest.error.message : String(validatedRequest.error);
            throw new McpError(ErrorCode.InvalidParams, `Invalid tools/call request: ${errorMessage}`);
          }
          const { params } = validatedRequest.data;
          const result = await Promise.resolve(handler(request, extra));
          if (params.task) {
            const taskValidationResult = safeParse(CreateTaskResultSchema, result);
            if (!taskValidationResult.success) {
              const errorMessage = taskValidationResult.error instanceof Error ? taskValidationResult.error.message : String(taskValidationResult.error);
              throw new McpError(ErrorCode.InvalidParams, `Invalid task creation result: ${errorMessage}`);
            }
            return taskValidationResult.data;
          }
          const validationResult = safeParse(CallToolResultSchema, result);
          if (!validationResult.success) {
            const errorMessage = validationResult.error instanceof Error ? validationResult.error.message : String(validationResult.error);
            throw new McpError(ErrorCode.InvalidParams, `Invalid tools/call result: ${errorMessage}`);
          }
          return validationResult.data;
        };
        return super.setRequestHandler(requestSchema, wrappedHandler);
      }
      return super.setRequestHandler(requestSchema, handler);
    }
    assertCapabilityForMethod(method) {
      var _a, _b, _c;
      switch (method) {
        case "sampling/createMessage":
          if (!((_a = this._clientCapabilities) === null || _a === void 0 ? void 0 : _a.sampling)) {
            throw new Error(`Client does not support sampling (required for ${method})`);
          }
          break;
        case "elicitation/create":
          if (!((_b = this._clientCapabilities) === null || _b === void 0 ? void 0 : _b.elicitation)) {
            throw new Error(`Client does not support elicitation (required for ${method})`);
          }
          break;
        case "roots/list":
          if (!((_c = this._clientCapabilities) === null || _c === void 0 ? void 0 : _c.roots)) {
            throw new Error(`Client does not support listing roots (required for ${method})`);
          }
          break;
      }
    }
    assertNotificationCapability(method) {
      var _a, _b;
      switch (method) {
        case "notifications/message":
          if (!this._capabilities.logging) {
            throw new Error(`Server does not support logging (required for ${method})`);
          }
          break;
        case "notifications/resources/updated":
        case "notifications/resources/list_changed":
          if (!this._capabilities.resources) {
            throw new Error(`Server does not support notifying about resources (required for ${method})`);
          }
          break;
        case "notifications/tools/list_changed":
          if (!this._capabilities.tools) {
            throw new Error(`Server does not support notifying of tool list changes (required for ${method})`);
          }
          break;
        case "notifications/prompts/list_changed":
          if (!this._capabilities.prompts) {
            throw new Error(`Server does not support notifying of prompt list changes (required for ${method})`);
          }
          break;
        case "notifications/elicitation/complete":
          if (!((_b = (_a = this._clientCapabilities) === null || _a === void 0 ? void 0 : _a.elicitation) === null || _b === void 0 ? void 0 : _b.url)) {
            throw new Error(`Client does not support URL elicitation (required for ${method})`);
          }
          break;
      }
    }
    assertRequestHandlerCapability(method) {
      if (!this._capabilities) {
        return;
      }
      switch (method) {
        case "completion/complete":
          if (!this._capabilities.completions) {
            throw new Error(`Server does not support completions (required for ${method})`);
          }
          break;
        case "logging/setLevel":
          if (!this._capabilities.logging) {
            throw new Error(`Server does not support logging (required for ${method})`);
          }
          break;
        case "prompts/get":
        case "prompts/list":
          if (!this._capabilities.prompts) {
            throw new Error(`Server does not support prompts (required for ${method})`);
          }
          break;
        case "resources/list":
        case "resources/templates/list":
        case "resources/read":
          if (!this._capabilities.resources) {
            throw new Error(`Server does not support resources (required for ${method})`);
          }
          break;
        case "tools/call":
        case "tools/list":
          if (!this._capabilities.tools) {
            throw new Error(`Server does not support tools (required for ${method})`);
          }
          break;
        case "tasks/get":
        case "tasks/list":
        case "tasks/result":
        case "tasks/cancel":
          if (!this._capabilities.tasks) {
            throw new Error(`Server does not support tasks capability (required for ${method})`);
          }
          break;
      }
    }
    assertTaskCapability(method) {
      var _a, _b;
      assertClientRequestTaskCapability((_b = (_a = this._clientCapabilities) === null || _a === void 0 ? void 0 : _a.tasks) === null || _b === void 0 ? void 0 : _b.requests, method, "Client");
    }
    assertTaskHandlerCapability(method) {
      var _a;
      if (!this._capabilities) {
        return;
      }
      assertToolsCallTaskCapability((_a = this._capabilities.tasks) === null || _a === void 0 ? void 0 : _a.requests, method, "Server");
    }
    async _oninitialize(request) {
      const requestedVersion = request.params.protocolVersion;
      this._clientCapabilities = request.params.capabilities;
      this._clientVersion = request.params.clientInfo;
      const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.includes(requestedVersion) ? requestedVersion : LATEST_PROTOCOL_VERSION;
      return {
        protocolVersion,
        capabilities: this.getCapabilities(),
        serverInfo: this._serverInfo,
        ...this._instructions && { instructions: this._instructions }
      };
    }
    /**
     * After initialization has completed, this will be populated with the client's reported capabilities.
     */
    getClientCapabilities() {
      return this._clientCapabilities;
    }
    /**
     * After initialization has completed, this will be populated with information about the client's name and version.
     */
    getClientVersion() {
      return this._clientVersion;
    }
    getCapabilities() {
      return this._capabilities;
    }
    async ping() {
      return this.request({ method: "ping" }, EmptyResultSchema);
    }
    // Implementation
    async createMessage(params, options) {
      var _a, _b;
      if (params.tools || params.toolChoice) {
        if (!((_b = (_a = this._clientCapabilities) === null || _a === void 0 ? void 0 : _a.sampling) === null || _b === void 0 ? void 0 : _b.tools)) {
          throw new Error("Client does not support sampling tools capability.");
        }
      }
      if (params.messages.length > 0) {
        const lastMessage = params.messages[params.messages.length - 1];
        const lastContent = Array.isArray(lastMessage.content) ? lastMessage.content : [lastMessage.content];
        const hasToolResults = lastContent.some((c) => c.type === "tool_result");
        const previousMessage = params.messages.length > 1 ? params.messages[params.messages.length - 2] : void 0;
        const previousContent = previousMessage ? Array.isArray(previousMessage.content) ? previousMessage.content : [previousMessage.content] : [];
        const hasPreviousToolUse = previousContent.some((c) => c.type === "tool_use");
        if (hasToolResults) {
          if (lastContent.some((c) => c.type !== "tool_result")) {
            throw new Error("The last message must contain only tool_result content if any is present");
          }
          if (!hasPreviousToolUse) {
            throw new Error("tool_result blocks are not matching any tool_use from the previous message");
          }
        }
        if (hasPreviousToolUse) {
          const toolUseIds = new Set(previousContent.filter((c) => c.type === "tool_use").map((c) => c.id));
          const toolResultIds = new Set(lastContent.filter((c) => c.type === "tool_result").map((c) => c.toolUseId));
          if (toolUseIds.size !== toolResultIds.size || ![...toolUseIds].every((id2) => toolResultIds.has(id2))) {
            throw new Error("ids of tool_result blocks and tool_use blocks from previous message do not match");
          }
        }
      }
      if (params.tools) {
        return this.request({ method: "sampling/createMessage", params }, CreateMessageResultWithToolsSchema, options);
      }
      return this.request({ method: "sampling/createMessage", params }, CreateMessageResultSchema, options);
    }
    /**
     * Creates an elicitation request for the given parameters.
     * For backwards compatibility, `mode` may be omitted for form requests and will default to `'form'`.
     * @param params The parameters for the elicitation request.
     * @param options Optional request options.
     * @returns The result of the elicitation request.
     */
    async elicitInput(params, options) {
      var _a, _b, _c, _d, _e;
      const mode = (_a = params.mode) !== null && _a !== void 0 ? _a : "form";
      switch (mode) {
        case "url": {
          if (!((_c = (_b = this._clientCapabilities) === null || _b === void 0 ? void 0 : _b.elicitation) === null || _c === void 0 ? void 0 : _c.url)) {
            throw new Error("Client does not support url elicitation.");
          }
          const urlParams = params;
          return this.request({ method: "elicitation/create", params: urlParams }, ElicitResultSchema, options);
        }
        case "form": {
          if (!((_e = (_d = this._clientCapabilities) === null || _d === void 0 ? void 0 : _d.elicitation) === null || _e === void 0 ? void 0 : _e.form)) {
            throw new Error("Client does not support form elicitation.");
          }
          const formParams = params.mode === "form" ? params : { ...params, mode: "form" };
          const result = await this.request({ method: "elicitation/create", params: formParams }, ElicitResultSchema, options);
          if (result.action === "accept" && result.content && formParams.requestedSchema) {
            try {
              const validator = this._jsonSchemaValidator.getValidator(formParams.requestedSchema);
              const validationResult = validator(result.content);
              if (!validationResult.valid) {
                throw new McpError(ErrorCode.InvalidParams, `Elicitation response content does not match requested schema: ${validationResult.errorMessage}`);
              }
            } catch (error) {
              if (error instanceof McpError) {
                throw error;
              }
              throw new McpError(ErrorCode.InternalError, `Error validating elicitation response: ${error instanceof Error ? error.message : String(error)}`);
            }
          }
          return result;
        }
      }
    }
    /**
     * Creates a reusable callback that, when invoked, will send a `notifications/elicitation/complete`
     * notification for the specified elicitation ID.
     *
     * @param elicitationId The ID of the elicitation to mark as complete.
     * @param options Optional notification options. Useful when the completion notification should be related to a prior request.
     * @returns A function that emits the completion notification when awaited.
     */
    createElicitationCompletionNotifier(elicitationId, options) {
      var _a, _b;
      if (!((_b = (_a = this._clientCapabilities) === null || _a === void 0 ? void 0 : _a.elicitation) === null || _b === void 0 ? void 0 : _b.url)) {
        throw new Error("Client does not support URL elicitation (required for notifications/elicitation/complete)");
      }
      return () => this.notification({
        method: "notifications/elicitation/complete",
        params: {
          elicitationId
        }
      }, options);
    }
    async listRoots(params, options) {
      return this.request({ method: "roots/list", params }, ListRootsResultSchema, options);
    }
    /**
     * Sends a logging message to the client, if connected.
     * Note: You only need to send the parameters object, not the entire JSON RPC message
     * @see LoggingMessageNotification
     * @param params
     * @param sessionId optional for stateless and backward compatibility
     */
    async sendLoggingMessage(params, sessionId) {
      if (this._capabilities.logging) {
        if (!this.isMessageIgnored(params.level, sessionId)) {
          return this.notification({ method: "notifications/message", params });
        }
      }
    }
    async sendResourceUpdated(params) {
      return this.notification({
        method: "notifications/resources/updated",
        params
      });
    }
    async sendResourceListChanged() {
      return this.notification({
        method: "notifications/resources/list_changed"
      });
    }
    async sendToolListChanged() {
      return this.notification({ method: "notifications/tools/list_changed" });
    }
    async sendPromptListChanged() {
      return this.notification({ method: "notifications/prompts/list_changed" });
    }
  }
  const COMPLETABLE_SYMBOL = Symbol.for("mcp.completable");
  function completable(schema, complete) {
    Object.defineProperty(schema, COMPLETABLE_SYMBOL, {
      value: { complete },
      enumerable: false,
      writable: false,
      configurable: false
    });
    return schema;
  }
  function isCompletable(schema) {
    return !!schema && typeof schema === "object" && COMPLETABLE_SYMBOL in schema;
  }
  function getCompleter(schema) {
    const meta = schema[COMPLETABLE_SYMBOL];
    return meta === null || meta === void 0 ? void 0 : meta.complete;
  }
  var McpZodTypeKind;
  (function(McpZodTypeKind2) {
    McpZodTypeKind2["Completable"] = "McpCompletable";
  })(McpZodTypeKind || (McpZodTypeKind = {}));
  const MAX_TEMPLATE_LENGTH = 1e6;
  const MAX_VARIABLE_LENGTH = 1e6;
  const MAX_TEMPLATE_EXPRESSIONS = 1e4;
  const MAX_REGEX_LENGTH = 1e6;
  class UriTemplate {
    /**
     * Returns true if the given string contains any URI template expressions.
     * A template expression is a sequence of characters enclosed in curly braces,
     * like {foo} or {?bar}.
     */
    static isTemplate(str) {
      return /\{[^}\s]+\}/.test(str);
    }
    static validateLength(str, max, context) {
      if (str.length > max) {
        throw new Error(`${context} exceeds maximum length of ${max} characters (got ${str.length})`);
      }
    }
    get variableNames() {
      return this.parts.flatMap((part) => typeof part === "string" ? [] : part.names);
    }
    constructor(template) {
      UriTemplate.validateLength(template, MAX_TEMPLATE_LENGTH, "Template");
      this.template = template;
      this.parts = this.parse(template);
    }
    toString() {
      return this.template;
    }
    parse(template) {
      const parts = [];
      let currentText = "";
      let i = 0;
      let expressionCount = 0;
      while (i < template.length) {
        if (template[i] === "{") {
          if (currentText) {
            parts.push(currentText);
            currentText = "";
          }
          const end = template.indexOf("}", i);
          if (end === -1)
            throw new Error("Unclosed template expression");
          expressionCount++;
          if (expressionCount > MAX_TEMPLATE_EXPRESSIONS) {
            throw new Error(`Template contains too many expressions (max ${MAX_TEMPLATE_EXPRESSIONS})`);
          }
          const expr = template.slice(i + 1, end);
          const operator = this.getOperator(expr);
          const exploded = expr.includes("*");
          const names2 = this.getNames(expr);
          const name = names2[0];
          for (const name2 of names2) {
            UriTemplate.validateLength(name2, MAX_VARIABLE_LENGTH, "Variable name");
          }
          parts.push({ name, operator, names: names2, exploded });
          i = end + 1;
        } else {
          currentText += template[i];
          i++;
        }
      }
      if (currentText) {
        parts.push(currentText);
      }
      return parts;
    }
    getOperator(expr) {
      const operators = ["+", "#", ".", "/", "?", "&"];
      return operators.find((op) => expr.startsWith(op)) || "";
    }
    getNames(expr) {
      const operator = this.getOperator(expr);
      return expr.slice(operator.length).split(",").map((name) => name.replace("*", "").trim()).filter((name) => name.length > 0);
    }
    encodeValue(value, operator) {
      UriTemplate.validateLength(value, MAX_VARIABLE_LENGTH, "Variable value");
      if (operator === "+" || operator === "#") {
        return encodeURI(value);
      }
      return encodeURIComponent(value);
    }
    expandPart(part, variables) {
      if (part.operator === "?" || part.operator === "&") {
        const pairs = part.names.map((name) => {
          const value2 = variables[name];
          if (value2 === void 0)
            return "";
          const encoded2 = Array.isArray(value2) ? value2.map((v) => this.encodeValue(v, part.operator)).join(",") : this.encodeValue(value2.toString(), part.operator);
          return `${name}=${encoded2}`;
        }).filter((pair) => pair.length > 0);
        if (pairs.length === 0)
          return "";
        const separator = part.operator === "?" ? "?" : "&";
        return separator + pairs.join("&");
      }
      if (part.names.length > 1) {
        const values2 = part.names.map((name) => variables[name]).filter((v) => v !== void 0);
        if (values2.length === 0)
          return "";
        return values2.map((v) => Array.isArray(v) ? v[0] : v).join(",");
      }
      const value = variables[part.name];
      if (value === void 0)
        return "";
      const values = Array.isArray(value) ? value : [value];
      const encoded = values.map((v) => this.encodeValue(v, part.operator));
      switch (part.operator) {
        case "":
          return encoded.join(",");
        case "+":
          return encoded.join(",");
        case "#":
          return "#" + encoded.join(",");
        case ".":
          return "." + encoded.join(".");
        case "/":
          return "/" + encoded.join("/");
        default:
          return encoded.join(",");
      }
    }
    expand(variables) {
      let result = "";
      let hasQueryParam = false;
      for (const part of this.parts) {
        if (typeof part === "string") {
          result += part;
          continue;
        }
        const expanded = this.expandPart(part, variables);
        if (!expanded)
          continue;
        if ((part.operator === "?" || part.operator === "&") && hasQueryParam) {
          result += expanded.replace("?", "&");
        } else {
          result += expanded;
        }
        if (part.operator === "?" || part.operator === "&") {
          hasQueryParam = true;
        }
      }
      return result;
    }
    escapeRegExp(str) {
      return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    partToRegExp(part) {
      const patterns = [];
      for (const name2 of part.names) {
        UriTemplate.validateLength(name2, MAX_VARIABLE_LENGTH, "Variable name");
      }
      if (part.operator === "?" || part.operator === "&") {
        for (let i = 0; i < part.names.length; i++) {
          const name2 = part.names[i];
          const prefix = i === 0 ? "\\" + part.operator : "&";
          patterns.push({
            pattern: prefix + this.escapeRegExp(name2) + "=([^&]+)",
            name: name2
          });
        }
        return patterns;
      }
      let pattern2;
      const name = part.name;
      switch (part.operator) {
        case "":
          pattern2 = part.exploded ? "([^/]+(?:,[^/]+)*)" : "([^/,]+)";
          break;
        case "+":
        case "#":
          pattern2 = "(.+)";
          break;
        case ".":
          pattern2 = "\\.([^/,]+)";
          break;
        case "/":
          pattern2 = "/" + (part.exploded ? "([^/]+(?:,[^/]+)*)" : "([^/,]+)");
          break;
        default:
          pattern2 = "([^/]+)";
      }
      patterns.push({ pattern: pattern2, name });
      return patterns;
    }
    match(uri2) {
      UriTemplate.validateLength(uri2, MAX_TEMPLATE_LENGTH, "URI");
      let pattern2 = "^";
      const names2 = [];
      for (const part of this.parts) {
        if (typeof part === "string") {
          pattern2 += this.escapeRegExp(part);
        } else {
          const patterns = this.partToRegExp(part);
          for (const { pattern: partPattern, name } of patterns) {
            pattern2 += partPattern;
            names2.push({ name, exploded: part.exploded });
          }
        }
      }
      pattern2 += "$";
      UriTemplate.validateLength(pattern2, MAX_REGEX_LENGTH, "Generated regex pattern");
      const regex = new RegExp(pattern2);
      const match = uri2.match(regex);
      if (!match)
        return null;
      const result = {};
      for (let i = 0; i < names2.length; i++) {
        const { name, exploded } = names2[i];
        const value = match[i + 1];
        const cleanName = name.replace("*", "");
        if (exploded && value.includes(",")) {
          result[cleanName] = value.split(",");
        } else {
          result[cleanName] = value;
        }
      }
      return result;
    }
  }
  const TOOL_NAME_REGEX = /^[A-Za-z0-9._-]{1,128}$/;
  function validateToolName(name) {
    const warnings = [];
    if (name.length === 0) {
      return {
        isValid: false,
        warnings: ["Tool name cannot be empty"]
      };
    }
    if (name.length > 128) {
      return {
        isValid: false,
        warnings: [`Tool name exceeds maximum length of 128 characters (current: ${name.length})`]
      };
    }
    if (name.includes(" ")) {
      warnings.push("Tool name contains spaces, which may cause parsing issues");
    }
    if (name.includes(",")) {
      warnings.push("Tool name contains commas, which may cause parsing issues");
    }
    if (name.startsWith("-") || name.endsWith("-")) {
      warnings.push("Tool name starts or ends with a dash, which may cause parsing issues in some contexts");
    }
    if (name.startsWith(".") || name.endsWith(".")) {
      warnings.push("Tool name starts or ends with a dot, which may cause parsing issues in some contexts");
    }
    if (!TOOL_NAME_REGEX.test(name)) {
      const invalidChars = name.split("").filter((char) => !/[A-Za-z0-9._-]/.test(char)).filter((char, index, arr) => arr.indexOf(char) === index);
      warnings.push(`Tool name contains invalid characters: ${invalidChars.map((c) => `"${c}"`).join(", ")}`, "Allowed characters are: A-Z, a-z, 0-9, underscore (_), dash (-), and dot (.)");
      return {
        isValid: false,
        warnings
      };
    }
    return {
      isValid: true,
      warnings
    };
  }
  function issueToolNameWarning(name, warnings) {
    if (warnings.length > 0) {
      console.warn(`Tool name validation warning for "${name}":`);
      for (const warning of warnings) {
        console.warn(`  - ${warning}`);
      }
      console.warn("Tool registration will proceed, but this may cause compatibility issues.");
      console.warn("Consider updating the tool name to conform to the MCP tool naming standard.");
      console.warn("See SEP: Specify Format for Tool Names (https://github.com/modelcontextprotocol/modelcontextprotocol/issues/986) for more details.");
    }
  }
  function validateAndWarnToolName(name) {
    const result = validateToolName(name);
    issueToolNameWarning(name, result.warnings);
    return result.isValid;
  }
  class ExperimentalMcpServerTasks {
    constructor(_mcpServer) {
      this._mcpServer = _mcpServer;
    }
    registerToolTask(name, config2, handler) {
      const execution = { taskSupport: "required", ...config2.execution };
      if (execution.taskSupport === "forbidden") {
        throw new Error(`Cannot register task-based tool '${name}' with taskSupport 'forbidden'. Use registerTool() instead.`);
      }
      const mcpServerInternal = this._mcpServer;
      return mcpServerInternal._createRegisteredTool(name, config2.title, config2.description, config2.inputSchema, config2.outputSchema, config2.annotations, execution, config2._meta, handler);
    }
  }
  class McpServer {
    constructor(serverInfo, options) {
      this._registeredResources = {};
      this._registeredResourceTemplates = {};
      this._registeredTools = {};
      this._registeredPrompts = {};
      this._toolHandlersInitialized = false;
      this._completionHandlerInitialized = false;
      this._resourceHandlersInitialized = false;
      this._promptHandlersInitialized = false;
      this.server = new Server(serverInfo, options);
    }
    /**
     * Access experimental features.
     *
     * WARNING: These APIs are experimental and may change without notice.
     *
     * @experimental
     */
    get experimental() {
      if (!this._experimental) {
        this._experimental = {
          tasks: new ExperimentalMcpServerTasks(this)
        };
      }
      return this._experimental;
    }
    /**
     * Attaches to the given transport, starts it, and starts listening for messages.
     *
     * The `server` object assumes ownership of the Transport, replacing any callbacks that have already been set, and expects that it is the only user of the Transport instance going forward.
     */
    async connect(transport) {
      return await this.server.connect(transport);
    }
    /**
     * Closes the connection.
     */
    async close() {
      await this.server.close();
    }
    setToolRequestHandlers() {
      if (this._toolHandlersInitialized) {
        return;
      }
      this.server.assertCanSetRequestHandler(getMethodValue(ListToolsRequestSchema));
      this.server.assertCanSetRequestHandler(getMethodValue(CallToolRequestSchema));
      this.server.registerCapabilities({
        tools: {
          listChanged: true
        }
      });
      this.server.setRequestHandler(ListToolsRequestSchema, () => ({
        tools: Object.entries(this._registeredTools).filter(([, tool]) => tool.enabled).map(([name, tool]) => {
          const toolDefinition = {
            name,
            title: tool.title,
            description: tool.description,
            inputSchema: (() => {
              const obj = normalizeObjectSchema(tool.inputSchema);
              return obj ? toJsonSchemaCompat(obj, {
                strictUnions: true,
                pipeStrategy: "input"
              }) : EMPTY_OBJECT_JSON_SCHEMA;
            })(),
            annotations: tool.annotations,
            execution: tool.execution,
            _meta: tool._meta
          };
          if (tool.outputSchema) {
            const obj = normalizeObjectSchema(tool.outputSchema);
            if (obj) {
              toolDefinition.outputSchema = toJsonSchemaCompat(obj, {
                strictUnions: true,
                pipeStrategy: "output"
              });
            }
          }
          return toolDefinition;
        })
      }));
      this.server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
        var _a;
        try {
          const tool = this._registeredTools[request.params.name];
          if (!tool) {
            throw new McpError(ErrorCode.InvalidParams, `Tool ${request.params.name} not found`);
          }
          if (!tool.enabled) {
            throw new McpError(ErrorCode.InvalidParams, `Tool ${request.params.name} disabled`);
          }
          const isTaskRequest = !!request.params.task;
          const taskSupport = (_a = tool.execution) === null || _a === void 0 ? void 0 : _a.taskSupport;
          const isTaskHandler = "createTask" in tool.handler;
          if ((taskSupport === "required" || taskSupport === "optional") && !isTaskHandler) {
            throw new McpError(ErrorCode.InternalError, `Tool ${request.params.name} has taskSupport '${taskSupport}' but was not registered with registerToolTask`);
          }
          if (taskSupport === "required" && !isTaskRequest) {
            throw new McpError(ErrorCode.MethodNotFound, `Tool ${request.params.name} requires task augmentation (taskSupport: 'required')`);
          }
          if (taskSupport === "optional" && !isTaskRequest && isTaskHandler) {
            return await this.handleAutomaticTaskPolling(tool, request, extra);
          }
          const args = await this.validateToolInput(tool, request.params.arguments, request.params.name);
          const result = await this.executeToolHandler(tool, args, extra);
          if (isTaskRequest) {
            return result;
          }
          await this.validateToolOutput(tool, result, request.params.name);
          return result;
        } catch (error) {
          if (error instanceof McpError) {
            if (error.code === ErrorCode.UrlElicitationRequired) {
              throw error;
            }
          }
          return this.createToolError(error instanceof Error ? error.message : String(error));
        }
      });
      this._toolHandlersInitialized = true;
    }
    /**
     * Creates a tool error result.
     *
     * @param errorMessage - The error message.
     * @returns The tool error result.
     */
    createToolError(errorMessage) {
      return {
        content: [
          {
            type: "text",
            text: errorMessage
          }
        ],
        isError: true
      };
    }
    /**
     * Validates tool input arguments against the tool's input schema.
     */
    async validateToolInput(tool, args, toolName) {
      if (!tool.inputSchema) {
        return void 0;
      }
      const inputObj = normalizeObjectSchema(tool.inputSchema);
      const schemaToParse = inputObj !== null && inputObj !== void 0 ? inputObj : tool.inputSchema;
      const parseResult = await safeParseAsync(schemaToParse, args);
      if (!parseResult.success) {
        const error = "error" in parseResult ? parseResult.error : "Unknown error";
        const errorMessage = getParseErrorMessage(error);
        throw new McpError(ErrorCode.InvalidParams, `Input validation error: Invalid arguments for tool ${toolName}: ${errorMessage}`);
      }
      return parseResult.data;
    }
    /**
     * Validates tool output against the tool's output schema.
     */
    async validateToolOutput(tool, result, toolName) {
      if (!tool.outputSchema) {
        return;
      }
      if (!("content" in result)) {
        return;
      }
      if (result.isError) {
        return;
      }
      if (!result.structuredContent) {
        throw new McpError(ErrorCode.InvalidParams, `Output validation error: Tool ${toolName} has an output schema but no structured content was provided`);
      }
      const outputObj = normalizeObjectSchema(tool.outputSchema);
      const parseResult = await safeParseAsync(outputObj, result.structuredContent);
      if (!parseResult.success) {
        const error = "error" in parseResult ? parseResult.error : "Unknown error";
        const errorMessage = getParseErrorMessage(error);
        throw new McpError(ErrorCode.InvalidParams, `Output validation error: Invalid structured content for tool ${toolName}: ${errorMessage}`);
      }
    }
    /**
     * Executes a tool handler (either regular or task-based).
     */
    async executeToolHandler(tool, args, extra) {
      const handler = tool.handler;
      const isTaskHandler = "createTask" in handler;
      if (isTaskHandler) {
        if (!extra.taskStore) {
          throw new Error("No task store provided.");
        }
        const taskExtra = { ...extra, taskStore: extra.taskStore };
        if (tool.inputSchema) {
          const typedHandler = handler;
          return await Promise.resolve(typedHandler.createTask(args, taskExtra));
        } else {
          const typedHandler = handler;
          return await Promise.resolve(typedHandler.createTask(taskExtra));
        }
      }
      if (tool.inputSchema) {
        const typedHandler = handler;
        return await Promise.resolve(typedHandler(args, extra));
      } else {
        const typedHandler = handler;
        return await Promise.resolve(typedHandler(extra));
      }
    }
    /**
     * Handles automatic task polling for tools with taskSupport 'optional'.
     */
    async handleAutomaticTaskPolling(tool, request, extra) {
      var _a;
      if (!extra.taskStore) {
        throw new Error("No task store provided for task-capable tool.");
      }
      const args = await this.validateToolInput(tool, request.params.arguments, request.params.name);
      const handler = tool.handler;
      const taskExtra = { ...extra, taskStore: extra.taskStore };
      const createTaskResult = args ? await Promise.resolve(handler.createTask(args, taskExtra)) : (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await Promise.resolve(handler.createTask(taskExtra))
      );
      const taskId = createTaskResult.task.taskId;
      let task = createTaskResult.task;
      const pollInterval = (_a = task.pollInterval) !== null && _a !== void 0 ? _a : 5e3;
      while (task.status !== "completed" && task.status !== "failed" && task.status !== "cancelled") {
        await new Promise((resolve2) => setTimeout(resolve2, pollInterval));
        const updatedTask = await extra.taskStore.getTask(taskId);
        if (!updatedTask) {
          throw new McpError(ErrorCode.InternalError, `Task ${taskId} not found during polling`);
        }
        task = updatedTask;
      }
      return await extra.taskStore.getTaskResult(taskId);
    }
    setCompletionRequestHandler() {
      if (this._completionHandlerInitialized) {
        return;
      }
      this.server.assertCanSetRequestHandler(getMethodValue(CompleteRequestSchema));
      this.server.registerCapabilities({
        completions: {}
      });
      this.server.setRequestHandler(CompleteRequestSchema, async (request) => {
        switch (request.params.ref.type) {
          case "ref/prompt":
            assertCompleteRequestPrompt(request);
            return this.handlePromptCompletion(request, request.params.ref);
          case "ref/resource":
            assertCompleteRequestResourceTemplate(request);
            return this.handleResourceCompletion(request, request.params.ref);
          default:
            throw new McpError(ErrorCode.InvalidParams, `Invalid completion reference: ${request.params.ref}`);
        }
      });
      this._completionHandlerInitialized = true;
    }
    async handlePromptCompletion(request, ref2) {
      const prompt = this._registeredPrompts[ref2.name];
      if (!prompt) {
        throw new McpError(ErrorCode.InvalidParams, `Prompt ${ref2.name} not found`);
      }
      if (!prompt.enabled) {
        throw new McpError(ErrorCode.InvalidParams, `Prompt ${ref2.name} disabled`);
      }
      if (!prompt.argsSchema) {
        return EMPTY_COMPLETION_RESULT;
      }
      const promptShape = getObjectShape(prompt.argsSchema);
      const field = promptShape === null || promptShape === void 0 ? void 0 : promptShape[request.params.argument.name];
      if (!isCompletable(field)) {
        return EMPTY_COMPLETION_RESULT;
      }
      const completer = getCompleter(field);
      if (!completer) {
        return EMPTY_COMPLETION_RESULT;
      }
      const suggestions = await completer(request.params.argument.value, request.params.context);
      return createCompletionResult(suggestions);
    }
    async handleResourceCompletion(request, ref2) {
      const template = Object.values(this._registeredResourceTemplates).find((t) => t.resourceTemplate.uriTemplate.toString() === ref2.uri);
      if (!template) {
        if (this._registeredResources[ref2.uri]) {
          return EMPTY_COMPLETION_RESULT;
        }
        throw new McpError(ErrorCode.InvalidParams, `Resource template ${request.params.ref.uri} not found`);
      }
      const completer = template.resourceTemplate.completeCallback(request.params.argument.name);
      if (!completer) {
        return EMPTY_COMPLETION_RESULT;
      }
      const suggestions = await completer(request.params.argument.value, request.params.context);
      return createCompletionResult(suggestions);
    }
    setResourceRequestHandlers() {
      if (this._resourceHandlersInitialized) {
        return;
      }
      this.server.assertCanSetRequestHandler(getMethodValue(ListResourcesRequestSchema));
      this.server.assertCanSetRequestHandler(getMethodValue(ListResourceTemplatesRequestSchema));
      this.server.assertCanSetRequestHandler(getMethodValue(ReadResourceRequestSchema));
      this.server.registerCapabilities({
        resources: {
          listChanged: true
        }
      });
      this.server.setRequestHandler(ListResourcesRequestSchema, async (request, extra) => {
        const resources = Object.entries(this._registeredResources).filter(([_, resource]) => resource.enabled).map(([uri2, resource]) => ({
          uri: uri2,
          name: resource.name,
          ...resource.metadata
        }));
        const templateResources = [];
        for (const template of Object.values(this._registeredResourceTemplates)) {
          if (!template.resourceTemplate.listCallback) {
            continue;
          }
          const result = await template.resourceTemplate.listCallback(extra);
          for (const resource of result.resources) {
            templateResources.push({
              ...template.metadata,
              // the defined resource metadata should override the template metadata if present
              ...resource
            });
          }
        }
        return { resources: [...resources, ...templateResources] };
      });
      this.server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
        const resourceTemplates = Object.entries(this._registeredResourceTemplates).map(([name, template]) => ({
          name,
          uriTemplate: template.resourceTemplate.uriTemplate.toString(),
          ...template.metadata
        }));
        return { resourceTemplates };
      });
      this.server.setRequestHandler(ReadResourceRequestSchema, async (request, extra) => {
        const uri2 = new URL(request.params.uri);
        const resource = this._registeredResources[uri2.toString()];
        if (resource) {
          if (!resource.enabled) {
            throw new McpError(ErrorCode.InvalidParams, `Resource ${uri2} disabled`);
          }
          return resource.readCallback(uri2, extra);
        }
        for (const template of Object.values(this._registeredResourceTemplates)) {
          const variables = template.resourceTemplate.uriTemplate.match(uri2.toString());
          if (variables) {
            return template.readCallback(uri2, variables, extra);
          }
        }
        throw new McpError(ErrorCode.InvalidParams, `Resource ${uri2} not found`);
      });
      this.setCompletionRequestHandler();
      this._resourceHandlersInitialized = true;
    }
    setPromptRequestHandlers() {
      if (this._promptHandlersInitialized) {
        return;
      }
      this.server.assertCanSetRequestHandler(getMethodValue(ListPromptsRequestSchema));
      this.server.assertCanSetRequestHandler(getMethodValue(GetPromptRequestSchema));
      this.server.registerCapabilities({
        prompts: {
          listChanged: true
        }
      });
      this.server.setRequestHandler(ListPromptsRequestSchema, () => ({
        prompts: Object.entries(this._registeredPrompts).filter(([, prompt]) => prompt.enabled).map(([name, prompt]) => {
          return {
            name,
            title: prompt.title,
            description: prompt.description,
            arguments: prompt.argsSchema ? promptArgumentsFromSchema(prompt.argsSchema) : void 0
          };
        })
      }));
      this.server.setRequestHandler(GetPromptRequestSchema, async (request, extra) => {
        const prompt = this._registeredPrompts[request.params.name];
        if (!prompt) {
          throw new McpError(ErrorCode.InvalidParams, `Prompt ${request.params.name} not found`);
        }
        if (!prompt.enabled) {
          throw new McpError(ErrorCode.InvalidParams, `Prompt ${request.params.name} disabled`);
        }
        if (prompt.argsSchema) {
          const argsObj = normalizeObjectSchema(prompt.argsSchema);
          const parseResult = await safeParseAsync(argsObj, request.params.arguments);
          if (!parseResult.success) {
            const error = "error" in parseResult ? parseResult.error : "Unknown error";
            const errorMessage = getParseErrorMessage(error);
            throw new McpError(ErrorCode.InvalidParams, `Invalid arguments for prompt ${request.params.name}: ${errorMessage}`);
          }
          const args = parseResult.data;
          const cb = prompt.callback;
          return await Promise.resolve(cb(args, extra));
        } else {
          const cb = prompt.callback;
          return await Promise.resolve(cb(extra));
        }
      });
      this.setCompletionRequestHandler();
      this._promptHandlersInitialized = true;
    }
    resource(name, uriOrTemplate, ...rest) {
      let metadata2;
      if (typeof rest[0] === "object") {
        metadata2 = rest.shift();
      }
      const readCallback = rest[0];
      if (typeof uriOrTemplate === "string") {
        if (this._registeredResources[uriOrTemplate]) {
          throw new Error(`Resource ${uriOrTemplate} is already registered`);
        }
        const registeredResource = this._createRegisteredResource(name, void 0, uriOrTemplate, metadata2, readCallback);
        this.setResourceRequestHandlers();
        this.sendResourceListChanged();
        return registeredResource;
      } else {
        if (this._registeredResourceTemplates[name]) {
          throw new Error(`Resource template ${name} is already registered`);
        }
        const registeredResourceTemplate = this._createRegisteredResourceTemplate(name, void 0, uriOrTemplate, metadata2, readCallback);
        this.setResourceRequestHandlers();
        this.sendResourceListChanged();
        return registeredResourceTemplate;
      }
    }
    registerResource(name, uriOrTemplate, config2, readCallback) {
      if (typeof uriOrTemplate === "string") {
        if (this._registeredResources[uriOrTemplate]) {
          throw new Error(`Resource ${uriOrTemplate} is already registered`);
        }
        const registeredResource = this._createRegisteredResource(name, config2.title, uriOrTemplate, config2, readCallback);
        this.setResourceRequestHandlers();
        this.sendResourceListChanged();
        return registeredResource;
      } else {
        if (this._registeredResourceTemplates[name]) {
          throw new Error(`Resource template ${name} is already registered`);
        }
        const registeredResourceTemplate = this._createRegisteredResourceTemplate(name, config2.title, uriOrTemplate, config2, readCallback);
        this.setResourceRequestHandlers();
        this.sendResourceListChanged();
        return registeredResourceTemplate;
      }
    }
    _createRegisteredResource(name, title2, uri2, metadata2, readCallback) {
      const registeredResource = {
        name,
        title: title2,
        metadata: metadata2,
        readCallback,
        enabled: true,
        disable: () => registeredResource.update({ enabled: false }),
        enable: () => registeredResource.update({ enabled: true }),
        remove: () => registeredResource.update({ uri: null }),
        update: (updates) => {
          if (typeof updates.uri !== "undefined" && updates.uri !== uri2) {
            delete this._registeredResources[uri2];
            if (updates.uri)
              this._registeredResources[updates.uri] = registeredResource;
          }
          if (typeof updates.name !== "undefined")
            registeredResource.name = updates.name;
          if (typeof updates.title !== "undefined")
            registeredResource.title = updates.title;
          if (typeof updates.metadata !== "undefined")
            registeredResource.metadata = updates.metadata;
          if (typeof updates.callback !== "undefined")
            registeredResource.readCallback = updates.callback;
          if (typeof updates.enabled !== "undefined")
            registeredResource.enabled = updates.enabled;
          this.sendResourceListChanged();
        }
      };
      this._registeredResources[uri2] = registeredResource;
      return registeredResource;
    }
    _createRegisteredResourceTemplate(name, title2, template, metadata2, readCallback) {
      const registeredResourceTemplate = {
        resourceTemplate: template,
        title: title2,
        metadata: metadata2,
        readCallback,
        enabled: true,
        disable: () => registeredResourceTemplate.update({ enabled: false }),
        enable: () => registeredResourceTemplate.update({ enabled: true }),
        remove: () => registeredResourceTemplate.update({ name: null }),
        update: (updates) => {
          if (typeof updates.name !== "undefined" && updates.name !== name) {
            delete this._registeredResourceTemplates[name];
            if (updates.name)
              this._registeredResourceTemplates[updates.name] = registeredResourceTemplate;
          }
          if (typeof updates.title !== "undefined")
            registeredResourceTemplate.title = updates.title;
          if (typeof updates.template !== "undefined")
            registeredResourceTemplate.resourceTemplate = updates.template;
          if (typeof updates.metadata !== "undefined")
            registeredResourceTemplate.metadata = updates.metadata;
          if (typeof updates.callback !== "undefined")
            registeredResourceTemplate.readCallback = updates.callback;
          if (typeof updates.enabled !== "undefined")
            registeredResourceTemplate.enabled = updates.enabled;
          this.sendResourceListChanged();
        }
      };
      this._registeredResourceTemplates[name] = registeredResourceTemplate;
      return registeredResourceTemplate;
    }
    _createRegisteredPrompt(name, title2, description2, argsSchema, callback) {
      const registeredPrompt = {
        title: title2,
        description: description2,
        argsSchema: argsSchema === void 0 ? void 0 : objectFromShape(argsSchema),
        callback,
        enabled: true,
        disable: () => registeredPrompt.update({ enabled: false }),
        enable: () => registeredPrompt.update({ enabled: true }),
        remove: () => registeredPrompt.update({ name: null }),
        update: (updates) => {
          if (typeof updates.name !== "undefined" && updates.name !== name) {
            delete this._registeredPrompts[name];
            if (updates.name)
              this._registeredPrompts[updates.name] = registeredPrompt;
          }
          if (typeof updates.title !== "undefined")
            registeredPrompt.title = updates.title;
          if (typeof updates.description !== "undefined")
            registeredPrompt.description = updates.description;
          if (typeof updates.argsSchema !== "undefined")
            registeredPrompt.argsSchema = objectFromShape(updates.argsSchema);
          if (typeof updates.callback !== "undefined")
            registeredPrompt.callback = updates.callback;
          if (typeof updates.enabled !== "undefined")
            registeredPrompt.enabled = updates.enabled;
          this.sendPromptListChanged();
        }
      };
      this._registeredPrompts[name] = registeredPrompt;
      return registeredPrompt;
    }
    _createRegisteredTool(name, title2, description2, inputSchema, outputSchema, annotations, execution, _meta, handler) {
      validateAndWarnToolName(name);
      const registeredTool = {
        title: title2,
        description: description2,
        inputSchema: getZodSchemaObject(inputSchema),
        outputSchema: getZodSchemaObject(outputSchema),
        annotations,
        execution,
        _meta,
        handler,
        enabled: true,
        disable: () => registeredTool.update({ enabled: false }),
        enable: () => registeredTool.update({ enabled: true }),
        remove: () => registeredTool.update({ name: null }),
        update: (updates) => {
          if (typeof updates.name !== "undefined" && updates.name !== name) {
            if (typeof updates.name === "string") {
              validateAndWarnToolName(updates.name);
            }
            delete this._registeredTools[name];
            if (updates.name)
              this._registeredTools[updates.name] = registeredTool;
          }
          if (typeof updates.title !== "undefined")
            registeredTool.title = updates.title;
          if (typeof updates.description !== "undefined")
            registeredTool.description = updates.description;
          if (typeof updates.paramsSchema !== "undefined")
            registeredTool.inputSchema = objectFromShape(updates.paramsSchema);
          if (typeof updates.callback !== "undefined")
            registeredTool.handler = updates.callback;
          if (typeof updates.annotations !== "undefined")
            registeredTool.annotations = updates.annotations;
          if (typeof updates._meta !== "undefined")
            registeredTool._meta = updates._meta;
          if (typeof updates.enabled !== "undefined")
            registeredTool.enabled = updates.enabled;
          this.sendToolListChanged();
        }
      };
      this._registeredTools[name] = registeredTool;
      this.setToolRequestHandlers();
      this.sendToolListChanged();
      return registeredTool;
    }
    /**
     * tool() implementation. Parses arguments passed to overrides defined above.
     */
    tool(name, ...rest) {
      if (this._registeredTools[name]) {
        throw new Error(`Tool ${name} is already registered`);
      }
      let description2;
      let inputSchema;
      let outputSchema;
      let annotations;
      if (typeof rest[0] === "string") {
        description2 = rest.shift();
      }
      if (rest.length > 1) {
        const firstArg = rest[0];
        if (isZodRawShapeCompat(firstArg)) {
          inputSchema = rest.shift();
          if (rest.length > 1 && typeof rest[0] === "object" && rest[0] !== null && !isZodRawShapeCompat(rest[0])) {
            annotations = rest.shift();
          }
        } else if (typeof firstArg === "object" && firstArg !== null) {
          annotations = rest.shift();
        }
      }
      const callback = rest[0];
      return this._createRegisteredTool(name, void 0, description2, inputSchema, outputSchema, annotations, { taskSupport: "forbidden" }, void 0, callback);
    }
    /**
     * Registers a tool with a config object and callback.
     */
    registerTool(name, config2, cb) {
      if (this._registeredTools[name]) {
        throw new Error(`Tool ${name} is already registered`);
      }
      const { title: title2, description: description2, inputSchema, outputSchema, annotations, _meta } = config2;
      return this._createRegisteredTool(name, title2, description2, inputSchema, outputSchema, annotations, { taskSupport: "forbidden" }, _meta, cb);
    }
    prompt(name, ...rest) {
      if (this._registeredPrompts[name]) {
        throw new Error(`Prompt ${name} is already registered`);
      }
      let description2;
      if (typeof rest[0] === "string") {
        description2 = rest.shift();
      }
      let argsSchema;
      if (rest.length > 1) {
        argsSchema = rest.shift();
      }
      const cb = rest[0];
      const registeredPrompt = this._createRegisteredPrompt(name, void 0, description2, argsSchema, cb);
      this.setPromptRequestHandlers();
      this.sendPromptListChanged();
      return registeredPrompt;
    }
    /**
     * Registers a prompt with a config object and callback.
     */
    registerPrompt(name, config2, cb) {
      if (this._registeredPrompts[name]) {
        throw new Error(`Prompt ${name} is already registered`);
      }
      const { title: title2, description: description2, argsSchema } = config2;
      const registeredPrompt = this._createRegisteredPrompt(name, title2, description2, argsSchema, cb);
      this.setPromptRequestHandlers();
      this.sendPromptListChanged();
      return registeredPrompt;
    }
    /**
     * Checks if the server is connected to a transport.
     * @returns True if the server is connected
     */
    isConnected() {
      return this.server.transport !== void 0;
    }
    /**
     * Sends a logging message to the client, if connected.
     * Note: You only need to send the parameters object, not the entire JSON RPC message
     * @see LoggingMessageNotification
     * @param params
     * @param sessionId optional for stateless and backward compatibility
     */
    async sendLoggingMessage(params, sessionId) {
      return this.server.sendLoggingMessage(params, sessionId);
    }
    /**
     * Sends a resource list changed event to the client, if connected.
     */
    sendResourceListChanged() {
      if (this.isConnected()) {
        this.server.sendResourceListChanged();
      }
    }
    /**
     * Sends a tool list changed event to the client, if connected.
     */
    sendToolListChanged() {
      if (this.isConnected()) {
        this.server.sendToolListChanged();
      }
    }
    /**
     * Sends a prompt list changed event to the client, if connected.
     */
    sendPromptListChanged() {
      if (this.isConnected()) {
        this.server.sendPromptListChanged();
      }
    }
  }
  class ResourceTemplate {
    constructor(uriTemplate, _callbacks) {
      this._callbacks = _callbacks;
      this._uriTemplate = typeof uriTemplate === "string" ? new UriTemplate(uriTemplate) : uriTemplate;
    }
    /**
     * Gets the URI template pattern.
     */
    get uriTemplate() {
      return this._uriTemplate;
    }
    /**
     * Gets the list callback, if one was provided.
     */
    get listCallback() {
      return this._callbacks.list;
    }
    /**
     * Gets the callback for completing a specific URI template variable, if one was provided.
     */
    completeCallback(variable) {
      var _a;
      return (_a = this._callbacks.complete) === null || _a === void 0 ? void 0 : _a[variable];
    }
  }
  const EMPTY_OBJECT_JSON_SCHEMA = {
    type: "object",
    properties: {}
  };
  function isZodTypeLike(value) {
    return value !== null && typeof value === "object" && "parse" in value && typeof value.parse === "function" && "safeParse" in value && typeof value.safeParse === "function";
  }
  function isZodSchemaInstance(obj) {
    return "_def" in obj || "_zod" in obj || isZodTypeLike(obj);
  }
  function isZodRawShapeCompat(obj) {
    if (typeof obj !== "object" || obj === null) {
      return false;
    }
    if (isZodSchemaInstance(obj)) {
      return false;
    }
    if (Object.keys(obj).length === 0) {
      return true;
    }
    return Object.values(obj).some(isZodTypeLike);
  }
  function getZodSchemaObject(schema) {
    if (!schema) {
      return void 0;
    }
    if (isZodRawShapeCompat(schema)) {
      return objectFromShape(schema);
    }
    return schema;
  }
  function promptArgumentsFromSchema(schema) {
    const shape = getObjectShape(schema);
    if (!shape)
      return [];
    return Object.entries(shape).map(([name, field]) => {
      const description2 = getSchemaDescription(field);
      const isOptional = isSchemaOptional(field);
      return {
        name,
        description: description2,
        required: !isOptional
      };
    });
  }
  function getMethodValue(schema) {
    const shape = getObjectShape(schema);
    const methodSchema = shape === null || shape === void 0 ? void 0 : shape.method;
    if (!methodSchema) {
      throw new Error("Schema is missing a method literal");
    }
    const value = getLiteralValue(methodSchema);
    if (typeof value === "string") {
      return value;
    }
    throw new Error("Schema method literal must be a string");
  }
  function createCompletionResult(suggestions) {
    return {
      completion: {
        values: suggestions.slice(0, 100),
        total: suggestions.length,
        hasMore: suggestions.length > 100
      }
    };
  }
  const EMPTY_COMPLETION_RESULT = {
    completion: {
      values: [],
      hasMore: false
    }
  };
  class WebMcpServer {
    constructor(serverInfo, options) {
      const info = {
        name: "web-mcp-server",
        version: "1.0.0"
      };
      const capabilities = {
        prompts: { listChanged: true },
        resources: { subscribe: true, listChanged: true },
        tools: { listChanged: true },
        completions: {},
        logging: {}
      };
      this.server = new McpServer(serverInfo || info, options || { capabilities });
      this.server.server.oninitialized = () => {
        this.oninitialized?.();
      };
      this.server.server.onclose = () => {
        this.onclose?.();
      };
      this.server.server.onerror = (error) => {
        this.onerror?.(error);
      };
      this.server.server.setRequestHandler(SetLevelRequestSchema, async () => {
        return {};
      });
    }
    /**
     * Connects the server to a transport via the specified option.
     */
    async connect(options) {
      if (typeof options["start"] === "function") {
        this.transport = options;
        this.transport.onclose = void 0;
        this.transport.onerror = void 0;
        this.transport.onmessage = void 0;
      } else {
        this.transport = new MessageChannelServerTransport(options);
        await this.transport.listen();
      }
      await this.server.connect(this.transport);
      return this.transport;
    }
    /**
     * Closes the connection.
     */
    async close() {
      await this.server.close();
    }
    /**
     * Registers a tool with a config object and callback.
     */
    registerTool(name, config2, cb) {
      return this.server.registerTool(name, config2, cb);
    }
    /**
     * Registers a prompt with a config object and callback.
     */
    registerPrompt(name, config2, cb) {
      return this.server.registerPrompt(name, config2, cb);
    }
    registerResource(name, uriOrTemplate, config2, readCallback) {
      if (typeof uriOrTemplate === "string") {
        return this.server.registerResource(name, uriOrTemplate, config2, readCallback);
      } else {
        return this.server.registerResource(name, uriOrTemplate, config2, readCallback);
      }
    }
    /**
     * Checks if the server is connected to a transport.
     * @returns True if the server is connected
     */
    isConnected() {
      return this.server.isConnected();
    }
    /**
     * Sends a resource list changed event to the client, if connected.
     */
    sendResourceListChanged() {
      this.server.sendResourceListChanged();
    }
    /**
     * Sends a tool list changed event to the client, if connected.
     */
    sendToolListChanged() {
      this.server.sendToolListChanged();
    }
    /**
     * Sends a prompt list changed event to the client, if connected.
     */
    sendPromptListChanged() {
      this.server.sendPromptListChanged();
    }
    /**
     * After initialization has completed, this will be populated with the client's reported capabilities.
     */
    getClientCapabilities() {
      return this.server.server.getClientCapabilities();
    }
    /**
     * After initialization has completed, this will be populated with information about the client's name and version.
     */
    getClientVersion() {
      return this.server.server.getClientVersion();
    }
    /**
     * Sends a ping to the client to check if it is still connected.
     */
    async ping() {
      return await this.server.server.ping();
    }
    /**
     * Creates a LLM message to be sent to the client.
     */
    async createMessage(params, options) {
      return await this.server.server.createMessage(params, options);
    }
    /**
     * Elicits input from the client, such as a prompt or resource.
     */
    async elicitInput(params, options) {
      return await this.server.server.elicitInput(params, options);
    }
    /**
     * Lists the root resources available to the client.
     */
    async listRoots(params, options) {
      return await this.server.server.listRoots(params, options);
    }
    /**
     * Sends a logging message to the client.
     */
    async sendLoggingMessage(params) {
      return await this.server.server.sendLoggingMessage(params);
    }
    /**
     * Sends a resource updated notification to the client.
     */
    async sendResourceUpdated(params) {
      return await this.server.server.sendResourceUpdated(params);
    }
    /**
     * Sends a request and wait for a response.
     *
     * Do not use this method to emit notifications! Use notification() instead.
     */
    request(request, resultSchema, options) {
      return this.server.server.request(request, resultSchema, options);
    }
    /**
     * Emits a notification, which is a one-way message that does not expect a response.
     */
    async notification(notification, options) {
      return await this.server.server.notification(notification, options);
    }
    /**
     * Registers a handler to invoke when this protocol object receives a request with the given method.
     *
     * Note that this will replace any previous request handler for the same method.
     */
    setRequestHandler(requestSchema, handler) {
      this.server.server.setRequestHandler(requestSchema, handler);
    }
    /**
     * Removes the request handler for the given method.
     */
    removeRequestHandler(method) {
      this.server.server.removeRequestHandler(method);
    }
    /**
     * Registers a handler to invoke when this protocol object receives a notification with the given method.
     *
     * Note that this will replace any previous notification handler for the same method.
     */
    setNotificationHandler(notificationSchema, handler) {
      this.server.server.setNotificationHandler(notificationSchema, handler);
    }
    /**
     * Removes the notification handler for the given method.
     */
    removeNotificationHandler(method) {
      this.server.server.removeNotificationHandler(method);
    }
    /**
     * Registers a handler for the subscribe request.
     */
    onSubscribe(handler) {
      this.server.server.setRequestHandler(SubscribeRequestSchema, handler);
    }
    /**
     * Registers a handler for the unsubscribe request.
     */
    onUnsubscribe(handler) {
      this.server.server.setRequestHandler(UnsubscribeRequestSchema, handler);
    }
    /**
     * Registers a handler for the set log level request.
     */
    onSetLogLevel(handler) {
      this.server.server.setRequestHandler(SetLevelRequestSchema, handler);
    }
    /**
     * Registers a handler for the list tools request.
     */
    onListResources(handler) {
      this.server.server.setRequestHandler(ListResourcesRequestSchema, handler);
    }
    /**
     * Registers a handler for the roots list changed notification.
     */
    onRootsListChanged(handler) {
      this.server.server.setNotificationHandler(RootsListChangedNotificationSchema, handler);
    }
    /**
     * Close the transport for window.addEventListener('pagehide')
     */
    async onPagehide(event) {
      if (event.persisted) {
        return;
      }
      if (this.transport && typeof this.transport["close"] === "function") {
        await this.transport.close();
      }
    }
  }
  const createMessageChannelServerTransport = (endpoint, globalObject) => new MessageChannelServerTransport(endpoint, globalObject);
  const createMessageChannelPairTransport = () => createTransportPair();
  const isMessageChannelServerTransport = (transport) => transport instanceof MessageChannelServerTransport;
  const isMcpServer = (server) => server instanceof McpServer;
  class WebMcpClient {
    constructor(clientInfo, options) {
      const info = {
        name: "web-mcp-client",
        version: "1.0.0"
      };
      const capabilities = {
        roots: { listChanged: true },
        sampling: {},
        elicitation: {}
      };
      this.client = new Client(clientInfo || info, options || { capabilities });
      this.client.onclose = () => {
        this.onclose?.();
      };
      this.client.onerror = (error) => {
        this.onerror?.(error);
      };
    }
    /**
     * Connects the client to a transport via the specified option.
     */
    async connect(options) {
      if (typeof options["start"] === "function") {
        this.transport = options;
        this.transport.onclose = void 0;
        this.transport.onerror = void 0;
        this.transport.onmessage = void 0;
        await this.client.connect(this.transport);
        return { transport: this.transport, sessionId: this.transport.sessionId };
      }
      const { url: url2, token, sessionId, type: type2, agent, onError } = options;
      if (agent === true) {
        const proxyOptions = { client: this.client, url: url2, token, sessionId };
        let response;
        const connectProxy = async () => {
          const { transport: transport2, sessionId: sessionId2 } = type2 === "sse" ? await createSseProxy(proxyOptions) : type2 === "socket" ? await createSocketProxy(proxyOptions) : await createStreamProxy(proxyOptions);
          transport2.onerror = async (error) => {
            onError?.(error);
          };
          response = { transport: transport2, sessionId: sessionId2 };
        };
        await connectProxy();
        return response;
      }
      const endpoint = new URL(url2);
      let transport;
      if (type2 === "channel") {
        transport = new MessageChannelClientTransport(url2);
        await this.client.connect(transport);
      }
      if (type2 === "sse") {
        const opts = sseOptions(token, sessionId);
        transport = new SSEClientTransport(endpoint, opts);
        await this.client.connect(transport);
      }
      if (type2 === "socket") {
        transport = new WebSocketClientTransport(new URL(`${url2}?sessionId=${sessionId}&token=${token}`));
        transport.sessionId = sessionId;
        await this.client.connect(transport);
      }
      if (typeof transport === "undefined") {
        const opts = streamOptions(token, sessionId);
        transport = new StreamableHTTPClientTransport(endpoint, opts);
        await this.client.connect(transport);
      }
      this.transport = transport;
      return { transport: this.transport, sessionId: this.transport.sessionId };
    }
    /**
     * Closes the connection.
     */
    async close() {
      await this.client.close();
    }
    /**
     * After initialization has completed, this will be populated with the server's reported capabilities.
     */
    getServerCapabilities() {
      return this.client.getServerCapabilities();
    }
    /**
     * After initialization has completed, this will be populated with information about the server's name and version.
     */
    getServerVersion() {
      return this.client.getServerVersion();
    }
    /**
     * After initialization has completed, this may be populated with information about the server's instructions.
     */
    getInstructions() {
      return this.client.getInstructions();
    }
    /**
     * Sends a ping to the server to check if it is still connected.
     */
    async ping(options) {
      return await this.client.ping(options);
    }
    /**
     * Sends a completion request to the server.
     */
    async complete(params, options) {
      return await this.client.complete(params, options);
    }
    /**
     * Sends a request for setting the logging level to the server.
     */
    async setLoggingLevel(level, options) {
      return await this.client.setLoggingLevel(level, options);
    }
    /**
     * Gets the prompt with the given params from the server.
     */
    async getPrompt(params, options) {
      return await this.client.getPrompt(params, options);
    }
    /**
     * Lists all prompts available on the server.
     */
    async listPrompts(params, options) {
      return await this.client.listPrompts(params, options);
    }
    /**
     * Lists all resources available on the server.
     */
    async listResources(params, options) {
      return await this.client.listResources(params, options);
    }
    /**
     * Lists all resource templates available on the server.
     */
    async listResourceTemplates(params, options) {
      return await this.client.listResourceTemplates(params, options);
    }
    /**
     * Reads the resource with the given params from the server.
     */
    async readResource(params, options) {
      return await this.client.readResource(params, options);
    }
    /**
     * Subscribes to a resource on the server.
     */
    async subscribeResource(params, options) {
      return await this.client.subscribeResource(params, options);
    }
    /**
     * Unsubscribes from a resource on the server.
     */
    async unsubscribeResource(params, options) {
      return await this.client.unsubscribeResource(params, options);
    }
    /**
     * Calls a tool on the server with the given parameters.
     */
    async callTool(params, options) {
      return await this.client.callTool(params, CallToolResultSchema, options);
    }
    /**
     * Lists all tools available on the server.
     */
    async listTools(params, options) {
      return await this.client.listTools(params, options);
    }
    /**
     * Sends a notification for the roots list changed event to the server.
     */
    async sendRootsListChanged() {
      return await this.client.sendRootsListChanged();
    }
    /**
     * Sends a request and wait for a response.
     *
     * Do not use this method to emit notifications! Use notification() instead.
     */
    request(request, resultSchema, options) {
      return this.client.request(request, resultSchema, options);
    }
    /**
     * Emits a notification, which is a one-way message that does not expect a response.
     */
    async notification(notification, options) {
      return await this.client.notification(notification, options);
    }
    /**
     * Registers a handler to invoke when this protocol object receives a request with the given method.
     *
     * Note that this will replace any previous request handler for the same method.
     */
    setRequestHandler(requestSchema, handler) {
      this.client.setRequestHandler(requestSchema, handler);
    }
    /**
     * Removes the request handler for the given method.
     */
    removeRequestHandler(method) {
      this.client.removeRequestHandler(method);
    }
    /**
     * Registers a handler to invoke when this protocol object receives a notification with the given method.
     *
     * Note that this will replace any previous notification handler for the same method.
     */
    setNotificationHandler(notificationSchema, handler) {
      this.client.setNotificationHandler(notificationSchema, handler);
    }
    /**
     * Removes the notification handler for the given method.
     */
    removeNotificationHandler(method) {
      this.client.removeNotificationHandler(method);
    }
    /**
     * Registers a handler for the elicitation request.
     */
    onElicit(handler) {
      this.client.setRequestHandler(ElicitRequestSchema, handler);
    }
    /**
     * Registers a handler for the create LLM message request.
     */
    onCreateMessage(handler) {
      this.client.setRequestHandler(CreateMessageRequestSchema, handler);
    }
    /**
     * Registers a handler for the list roots request.
     */
    onListRoots(handler) {
      this.client.setRequestHandler(ListRootsRequestSchema, handler);
    }
    /**
     * Registers a handler for the tool list changed notification.
     */
    onToolListChanged(handler) {
      this.client.setNotificationHandler(ToolListChangedNotificationSchema, handler);
    }
    /**
     * Registers a handler for the prompt list changed notification.
     */
    onPromptListChanged(handler) {
      this.client.setNotificationHandler(PromptListChangedNotificationSchema, handler);
    }
    /**
     * Registers a handler for the resource list changed notification.
     */
    onResourceListChanged(handler) {
      this.client.setNotificationHandler(ResourceListChangedNotificationSchema, handler);
    }
    /**
     * Registers a handler for the resource updated notification.
     */
    onResourceUpdated(handler) {
      this.client.setNotificationHandler(ResourceUpdatedNotificationSchema, handler);
    }
    /**
     * Registers a handler for the logging message notification.
     */
    onLoggingMessage(handler) {
      this.client.setNotificationHandler(LoggingMessageNotificationSchema, handler);
    }
    /**
     * Close the transport for window.addEventListener('pagehide')
     */
    async onPagehide(event) {
      if (event.persisted) {
        return;
      }
      if (isStreamableHTTPClientTransport(this.transport)) {
        await this.transport.terminateSession();
      } else if (this.transport && typeof this.transport["close"] === "function") {
        await this.transport.close();
      }
    }
  }
  const createSSEClientTransport = (url2, opts) => new SSEClientTransport(url2, opts);
  const createStreamableHTTPClientTransport = (url2, opts) => new StreamableHTTPClientTransport(url2, opts);
  const createMessageChannelClientTransport = (endpoint, globalObject) => new MessageChannelClientTransport(endpoint, globalObject);
  const isSSEClientTransport = (transport) => transport instanceof SSEClientTransport;
  const isStreamableHTTPClientTransport = (transport) => transport instanceof StreamableHTTPClientTransport;
  const isMessageChannelClientTransport = (transport) => transport instanceof MessageChannelClientTransport;
  const isMcpClient = (client) => client instanceof Client;
  function getDisplayName(metadata2) {
    var _a;
    if (metadata2.title !== void 0 && metadata2.title !== "") {
      return metadata2.title;
    }
    if ("annotations" in metadata2 && ((_a = metadata2.annotations) === null || _a === void 0 ? void 0 : _a.title)) {
      return metadata2.annotations.title;
    }
    return metadata2.name;
  }
  const randomUUID = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  };
  const sendWindowMessage = (type2, data, direction) => {
    window.postMessage({ type: type2, direction, data }, "*");
  };
  const onWindowMessage = (type2, cb, direction) => {
    const handler = async function(event) {
      if (event.source === window && event.data.type === type2 && event.data.direction === direction) {
        await cb(event.data.data);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  };
  class ExtensionPageServerTransport {
    constructor(sessionId = null) {
      this._isStarted = false;
      this._isClosed = false;
      this._lastRegistration = null;
      this.sessionId = sessionId || randomUUID();
      this._messageListener1 = onWindowMessage(
        "sidepanel-ready-to-page",
        () => {
          if (this._lastRegistration && this._isStarted) {
            this.notifyRegistration(this._lastRegistration).catch((error) => {
              console.error("【Page Svr Transport】 notifyRegistration失败:", error);
            });
          }
        },
        "content->page"
      );
      this._messageListener2 = onWindowMessage(
        "mcp-client-to-server-to-page",
        (data) => {
          if (data.sessionId !== this.sessionId) return;
          console.log("【Page Svr Transport】 即将处理 mcpMessage", data.mcpMessage);
          const mcpMessage = JSONRPCMessageSchema.parse(data.mcpMessage);
          this.onmessage?.(mcpMessage);
          const toolName = data.mcpMessage.params?.name;
          if (toolName) {
            sendWindowMessage(
              "update-page-app-message",
              { status: "run", message: data.mcpMessage.params?.name },
              "page->content"
            );
          }
        },
        "content->page"
      );
    }
    // 最后一次注册信息（用于 Sidepanel 刷新后重新注册）
    _throwError(whenFn, message) {
      if (whenFn()) {
        const error = new Error(message);
        console.log(message, error);
        if (this.onerror) {
          this.onerror(error);
        }
        throw error;
      }
    }
    /** 启动 transport，开始监听消息  */
    async start() {
      if (this._isStarted) return;
      if (this._isClosed) throw new Error("【Page Svr Transport】 已关闭，无法重新启动");
      this._isStarted = true;
    }
    /** 发送消息到 MCP Client */
    async send(message, _options) {
      this._throwError(() => !this._isStarted, "【Page Svr Transport】 未启动，无法发送消息");
      this._throwError(() => this._isClosed, "【Page Svr Transport】 已关闭，无法发送消息");
      sendWindowMessage(
        "mcp-server-to-client-from-page",
        {
          sessionId: this.sessionId,
          mcpMessage: message
        },
        "page->content"
      );
      if ("result" in message && message.result?.content) {
        sendWindowMessage(
          "update-page-app-message",
          { status: "ready", message: "" },
          "page->content"
          // 此处应该是 content->content， 但为了和pageServerTransport统一。
        );
      }
    }
    /** 通知 Sidepanel 此 Server 已启动并准备接受连接 */
    async notifyRegistration(serverInfo) {
      this._throwError(() => !this._isStarted, "【Page Svr Transport】 未启动，无法注册消息");
      this._lastRegistration = serverInfo;
      try {
        sendWindowMessage(
          "mcp-server-register-from-page",
          {
            sessionId: this.sessionId,
            serverInfo: {
              ...serverInfo,
              url: window.location.origin,
              title: document.title
            }
          },
          "page->content"
        );
      } catch (error) {
        this._throwError(() => true, "【Page Svr Transport】 注册 server 失败" + String(error));
      }
    }
    /** 关闭 transport */
    async close() {
      if (this._isClosed) return;
      try {
        this._messageListener1 && this._messageListener1();
        this._messageListener2 && this._messageListener2();
        this._isClosed = true;
        this._isStarted = false;
        this.onclose && this.onclose();
      } catch (error) {
        this._throwError(() => true, "【Page Svr Transport】 关闭时发生错误" + String(error));
      }
    }
  }
  exports2.Ajv = ajv;
  exports2.AuthClientProvider = AuthClientProvider;
  exports2.ExtensionPageServerTransport = ExtensionPageServerTransport;
  exports2.ResourceTemplate = ResourceTemplate;
  exports2.UriTemplate = UriTemplate;
  exports2.WebMcpClient = WebMcpClient;
  exports2.WebMcpServer = WebMcpServer;
  exports2.completable = completable;
  exports2.createMessageChannelClientTransport = createMessageChannelClientTransport;
  exports2.createMessageChannelPairTransport = createMessageChannelPairTransport;
  exports2.createMessageChannelServerTransport = createMessageChannelServerTransport;
  exports2.createSSEClientTransport = createSSEClientTransport;
  exports2.createStreamableHTTPClientTransport = createStreamableHTTPClientTransport;
  exports2.getDisplayName = getDisplayName;
  exports2.isMcpClient = isMcpClient;
  exports2.isMcpServer = isMcpServer;
  exports2.isMessageChannelClientTransport = isMessageChannelClientTransport;
  exports2.isMessageChannelServerTransport = isMessageChannelServerTransport;
  exports2.isSSEClientTransport = isSSEClientTransport;
  exports2.isStreamableHTTPClientTransport = isStreamableHTTPClientTransport;
  exports2.z = z;
  Object.defineProperty(exports2, Symbol.toStringTag, { value: "Module" });
});
