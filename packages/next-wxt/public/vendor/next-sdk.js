;(function (global2, factory) {
  typeof exports === 'object' && typeof module !== 'undefined'
    ? factory(exports)
    : typeof define === 'function' && define.amdxx
      ? define(['exports'], factory)
      : ((global2 = typeof globalThis !== 'undefined' ? globalThis : global2 || self), factory((global2.WebMCP = {})))
})(this, function (exports2) {
  'use strict'
  var commonjsGlobal =
    typeof globalThis !== 'undefined'
      ? globalThis
      : typeof window !== 'undefined'
        ? window
        : typeof global !== 'undefined'
          ? global
          : typeof self !== 'undefined'
            ? self
            : {}
  function getDefaultExportFromCjs(x) {
    return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x
  }
  var ajv$2 = { exports: {} }
  var core$2 = {}
  var validate$2 = {}
  var boolSchema = {}
  var errors = {}
  var codegen = {}
  var code$1 = {}
  ;(function (exports3) {
    Object.defineProperty(exports3, '__esModule', { value: true })
    exports3.regexpCode =
      exports3.getEsmExportName =
      exports3.getProperty =
      exports3.safeStringify =
      exports3.stringify =
      exports3.strConcat =
      exports3.addCodeArg =
      exports3.str =
      exports3._ =
      exports3.nil =
      exports3._Code =
      exports3.Name =
      exports3.IDENTIFIER =
      exports3._CodeOrName =
        void 0
    class _CodeOrName {}
    exports3._CodeOrName = _CodeOrName
    exports3.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i
    class Name extends _CodeOrName {
      constructor(s) {
        super()
        if (!exports3.IDENTIFIER.test(s)) throw new Error('CodeGen: name must be a valid identifier')
        this.str = s
      }
      toString() {
        return this.str
      }
      emptyStr() {
        return false
      }
      get names() {
        return { [this.str]: 1 }
      }
    }
    exports3.Name = Name
    class _Code extends _CodeOrName {
      constructor(code2) {
        super()
        this._items = typeof code2 === 'string' ? [code2] : code2
      }
      toString() {
        return this.str
      }
      emptyStr() {
        if (this._items.length > 1) return false
        const item = this._items[0]
        return item === '' || item === '""'
      }
      get str() {
        var _a
        return (_a = this._str) !== null && _a !== void 0
          ? _a
          : (this._str = this._items.reduce((s, c) => `${s}${c}`, ''))
      }
      get names() {
        var _a
        return (_a = this._names) !== null && _a !== void 0
          ? _a
          : (this._names = this._items.reduce((names2, c) => {
              if (c instanceof Name) names2[c.str] = (names2[c.str] || 0) + 1
              return names2
            }, {}))
      }
    }
    exports3._Code = _Code
    exports3.nil = new _Code('')
    function _(strs, ...args) {
      const code2 = [strs[0]]
      let i = 0
      while (i < args.length) {
        addCodeArg(code2, args[i])
        code2.push(strs[++i])
      }
      return new _Code(code2)
    }
    exports3._ = _
    const plus = new _Code('+')
    function str(strs, ...args) {
      const expr = [safeStringify(strs[0])]
      let i = 0
      while (i < args.length) {
        expr.push(plus)
        addCodeArg(expr, args[i])
        expr.push(plus, safeStringify(strs[++i]))
      }
      optimize(expr)
      return new _Code(expr)
    }
    exports3.str = str
    function addCodeArg(code2, arg) {
      if (arg instanceof _Code) code2.push(...arg._items)
      else if (arg instanceof Name) code2.push(arg)
      else code2.push(interpolate(arg))
    }
    exports3.addCodeArg = addCodeArg
    function optimize(expr) {
      let i = 1
      while (i < expr.length - 1) {
        if (expr[i] === plus) {
          const res = mergeExprItems(expr[i - 1], expr[i + 1])
          if (res !== void 0) {
            expr.splice(i - 1, 3, res)
            continue
          }
          expr[i++] = '+'
        }
        i++
      }
    }
    function mergeExprItems(a, b) {
      if (b === '""') return a
      if (a === '""') return b
      if (typeof a == 'string') {
        if (b instanceof Name || a[a.length - 1] !== '"') return
        if (typeof b != 'string') return `${a.slice(0, -1)}${b}"`
        if (b[0] === '"') return a.slice(0, -1) + b.slice(1)
        return
      }
      if (typeof b == 'string' && b[0] === '"' && !(a instanceof Name)) return `"${a}${b.slice(1)}`
      return
    }
    function strConcat(c1, c2) {
      return c2.emptyStr() ? c1 : c1.emptyStr() ? c2 : str`${c1}${c2}`
    }
    exports3.strConcat = strConcat
    function interpolate(x) {
      return typeof x == 'number' || typeof x == 'boolean' || x === null
        ? x
        : safeStringify(Array.isArray(x) ? x.join(',') : x)
    }
    function stringify(x) {
      return new _Code(safeStringify(x))
    }
    exports3.stringify = stringify
    function safeStringify(x) {
      return JSON.stringify(x)
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029')
    }
    exports3.safeStringify = safeStringify
    function getProperty2(key) {
      return typeof key == 'string' && exports3.IDENTIFIER.test(key) ? new _Code(`.${key}`) : _`[${key}]`
    }
    exports3.getProperty = getProperty2
    function getEsmExportName(key) {
      if (typeof key == 'string' && exports3.IDENTIFIER.test(key)) {
        return new _Code(`${key}`)
      }
      throw new Error(`CodeGen: invalid export name: ${key}, use explicit $id name mapping`)
    }
    exports3.getEsmExportName = getEsmExportName
    function regexpCode(rx) {
      return new _Code(rx.toString())
    }
    exports3.regexpCode = regexpCode
  })(code$1)
  var scope = {}
  ;(function (exports3) {
    Object.defineProperty(exports3, '__esModule', { value: true })
    exports3.ValueScope =
      exports3.ValueScopeName =
      exports3.Scope =
      exports3.varKinds =
      exports3.UsedValueState =
        void 0
    const code_12 = code$1
    class ValueError extends Error {
      constructor(name) {
        super(`CodeGen: "code" for ${name} not defined`)
        this.value = name.value
      }
    }
    var UsedValueState
    ;(function (UsedValueState2) {
      UsedValueState2[(UsedValueState2['Started'] = 0)] = 'Started'
      UsedValueState2[(UsedValueState2['Completed'] = 1)] = 'Completed'
    })(UsedValueState || (exports3.UsedValueState = UsedValueState = {}))
    exports3.varKinds = {
      const: new code_12.Name('const'),
      let: new code_12.Name('let'),
      var: new code_12.Name('var')
    }
    class Scope {
      constructor({ prefixes, parent } = {}) {
        this._names = {}
        this._prefixes = prefixes
        this._parent = parent
      }
      toName(nameOrPrefix) {
        return nameOrPrefix instanceof code_12.Name ? nameOrPrefix : this.name(nameOrPrefix)
      }
      name(prefix) {
        return new code_12.Name(this._newName(prefix))
      }
      _newName(prefix) {
        const ng = this._names[prefix] || this._nameGroup(prefix)
        return `${prefix}${ng.index++}`
      }
      _nameGroup(prefix) {
        var _a, _b
        if (
          ((_b = (_a = this._parent) === null || _a === void 0 ? void 0 : _a._prefixes) === null || _b === void 0
            ? void 0
            : _b.has(prefix)) ||
          (this._prefixes && !this._prefixes.has(prefix))
        ) {
          throw new Error(`CodeGen: prefix "${prefix}" is not allowed in this scope`)
        }
        return (this._names[prefix] = { prefix, index: 0 })
      }
    }
    exports3.Scope = Scope
    class ValueScopeName extends code_12.Name {
      constructor(prefix, nameStr) {
        super(nameStr)
        this.prefix = prefix
      }
      setValue(value, { property, itemIndex }) {
        this.value = value
        this.scopePath = (0, code_12._)`.${new code_12.Name(property)}[${itemIndex}]`
      }
    }
    exports3.ValueScopeName = ValueScopeName
    const line = (0, code_12._)`\n`
    class ValueScope extends Scope {
      constructor(opts) {
        super(opts)
        this._values = {}
        this._scope = opts.scope
        this.opts = { ...opts, _n: opts.lines ? line : code_12.nil }
      }
      get() {
        return this._scope
      }
      name(prefix) {
        return new ValueScopeName(prefix, this._newName(prefix))
      }
      value(nameOrPrefix, value) {
        var _a
        if (value.ref === void 0) throw new Error('CodeGen: ref must be passed in value')
        const name = this.toName(nameOrPrefix)
        const { prefix } = name
        const valueKey = (_a = value.key) !== null && _a !== void 0 ? _a : value.ref
        let vs = this._values[prefix]
        if (vs) {
          const _name = vs.get(valueKey)
          if (_name) return _name
        } else {
          vs = this._values[prefix] = /* @__PURE__ */ new Map()
        }
        vs.set(valueKey, name)
        const s = this._scope[prefix] || (this._scope[prefix] = [])
        const itemIndex = s.length
        s[itemIndex] = value.ref
        name.setValue(value, { property: prefix, itemIndex })
        return name
      }
      getValue(prefix, keyOrRef) {
        const vs = this._values[prefix]
        if (!vs) return
        return vs.get(keyOrRef)
      }
      scopeRefs(scopeName, values = this._values) {
        return this._reduceValues(values, (name) => {
          if (name.scopePath === void 0) throw new Error(`CodeGen: name "${name}" has no value`)
          return (0, code_12._)`${scopeName}${name.scopePath}`
        })
      }
      scopeCode(values = this._values, usedValues, getCode) {
        return this._reduceValues(
          values,
          (name) => {
            if (name.value === void 0) throw new Error(`CodeGen: name "${name}" has no value`)
            return name.value.code
          },
          usedValues,
          getCode
        )
      }
      _reduceValues(values, valueCode, usedValues = {}, getCode) {
        let code2 = code_12.nil
        for (const prefix in values) {
          const vs = values[prefix]
          if (!vs) continue
          const nameSet = (usedValues[prefix] = usedValues[prefix] || /* @__PURE__ */ new Map())
          vs.forEach((name) => {
            if (nameSet.has(name)) return
            nameSet.set(name, UsedValueState.Started)
            let c = valueCode(name)
            if (c) {
              const def2 = this.opts.es5 ? exports3.varKinds.var : exports3.varKinds.const
              code2 = (0, code_12._)`${code2}${def2} ${name} = ${c};${this.opts._n}`
            } else if ((c = getCode === null || getCode === void 0 ? void 0 : getCode(name))) {
              code2 = (0, code_12._)`${code2}${c}${this.opts._n}`
            } else {
              throw new ValueError(name)
            }
            nameSet.set(name, UsedValueState.Completed)
          })
        }
        return code2
      }
    }
    exports3.ValueScope = ValueScope
  })(scope)
  ;(function (exports3) {
    Object.defineProperty(exports3, '__esModule', { value: true })
    exports3.or =
      exports3.and =
      exports3.not =
      exports3.CodeGen =
      exports3.operators =
      exports3.varKinds =
      exports3.ValueScopeName =
      exports3.ValueScope =
      exports3.Scope =
      exports3.Name =
      exports3.regexpCode =
      exports3.stringify =
      exports3.getProperty =
      exports3.nil =
      exports3.strConcat =
      exports3.str =
      exports3._ =
        void 0
    const code_12 = code$1
    const scope_1 = scope
    var code_2 = code$1
    Object.defineProperty(exports3, '_', {
      enumerable: true,
      get: function () {
        return code_2._
      }
    })
    Object.defineProperty(exports3, 'str', {
      enumerable: true,
      get: function () {
        return code_2.str
      }
    })
    Object.defineProperty(exports3, 'strConcat', {
      enumerable: true,
      get: function () {
        return code_2.strConcat
      }
    })
    Object.defineProperty(exports3, 'nil', {
      enumerable: true,
      get: function () {
        return code_2.nil
      }
    })
    Object.defineProperty(exports3, 'getProperty', {
      enumerable: true,
      get: function () {
        return code_2.getProperty
      }
    })
    Object.defineProperty(exports3, 'stringify', {
      enumerable: true,
      get: function () {
        return code_2.stringify
      }
    })
    Object.defineProperty(exports3, 'regexpCode', {
      enumerable: true,
      get: function () {
        return code_2.regexpCode
      }
    })
    Object.defineProperty(exports3, 'Name', {
      enumerable: true,
      get: function () {
        return code_2.Name
      }
    })
    var scope_2 = scope
    Object.defineProperty(exports3, 'Scope', {
      enumerable: true,
      get: function () {
        return scope_2.Scope
      }
    })
    Object.defineProperty(exports3, 'ValueScope', {
      enumerable: true,
      get: function () {
        return scope_2.ValueScope
      }
    })
    Object.defineProperty(exports3, 'ValueScopeName', {
      enumerable: true,
      get: function () {
        return scope_2.ValueScopeName
      }
    })
    Object.defineProperty(exports3, 'varKinds', {
      enumerable: true,
      get: function () {
        return scope_2.varKinds
      }
    })
    exports3.operators = {
      GT: new code_12._Code('>'),
      GTE: new code_12._Code('>='),
      LT: new code_12._Code('<'),
      LTE: new code_12._Code('<='),
      EQ: new code_12._Code('==='),
      NEQ: new code_12._Code('!=='),
      NOT: new code_12._Code('!'),
      OR: new code_12._Code('||'),
      AND: new code_12._Code('&&'),
      ADD: new code_12._Code('+')
    }
    class Node {
      optimizeNodes() {
        return this
      }
      optimizeNames(_names, _constants) {
        return this
      }
    }
    class Def extends Node {
      constructor(varKind, name, rhs) {
        super()
        this.varKind = varKind
        this.name = name
        this.rhs = rhs
      }
      render({ es5, _n }) {
        const varKind = es5 ? scope_1.varKinds.var : this.varKind
        const rhs = this.rhs === void 0 ? '' : ` = ${this.rhs}`
        return `${varKind} ${this.name}${rhs};` + _n
      }
      optimizeNames(names2, constants) {
        if (!names2[this.name.str]) return
        if (this.rhs) this.rhs = optimizeExpr(this.rhs, names2, constants)
        return this
      }
      get names() {
        return this.rhs instanceof code_12._CodeOrName ? this.rhs.names : {}
      }
    }
    class Assign extends Node {
      constructor(lhs, rhs, sideEffects) {
        super()
        this.lhs = lhs
        this.rhs = rhs
        this.sideEffects = sideEffects
      }
      render({ _n }) {
        return `${this.lhs} = ${this.rhs};` + _n
      }
      optimizeNames(names2, constants) {
        if (this.lhs instanceof code_12.Name && !names2[this.lhs.str] && !this.sideEffects) return
        this.rhs = optimizeExpr(this.rhs, names2, constants)
        return this
      }
      get names() {
        const names2 = this.lhs instanceof code_12.Name ? {} : { ...this.lhs.names }
        return addExprNames(names2, this.rhs)
      }
    }
    class AssignOp extends Assign {
      constructor(lhs, op, rhs, sideEffects) {
        super(lhs, rhs, sideEffects)
        this.op = op
      }
      render({ _n }) {
        return `${this.lhs} ${this.op}= ${this.rhs};` + _n
      }
    }
    class Label extends Node {
      constructor(label) {
        super()
        this.label = label
        this.names = {}
      }
      render({ _n }) {
        return `${this.label}:` + _n
      }
    }
    class Break extends Node {
      constructor(label) {
        super()
        this.label = label
        this.names = {}
      }
      render({ _n }) {
        const label = this.label ? ` ${this.label}` : ''
        return `break${label};` + _n
      }
    }
    class Throw extends Node {
      constructor(error2) {
        super()
        this.error = error2
      }
      render({ _n }) {
        return `throw ${this.error};` + _n
      }
      get names() {
        return this.error.names
      }
    }
    class AnyCode extends Node {
      constructor(code2) {
        super()
        this.code = code2
      }
      render({ _n }) {
        return `${this.code};` + _n
      }
      optimizeNodes() {
        return `${this.code}` ? this : void 0
      }
      optimizeNames(names2, constants) {
        this.code = optimizeExpr(this.code, names2, constants)
        return this
      }
      get names() {
        return this.code instanceof code_12._CodeOrName ? this.code.names : {}
      }
    }
    class ParentNode extends Node {
      constructor(nodes = []) {
        super()
        this.nodes = nodes
      }
      render(opts) {
        return this.nodes.reduce((code2, n) => code2 + n.render(opts), '')
      }
      optimizeNodes() {
        const { nodes } = this
        let i = nodes.length
        while (i--) {
          const n = nodes[i].optimizeNodes()
          if (Array.isArray(n)) nodes.splice(i, 1, ...n)
          else if (n) nodes[i] = n
          else nodes.splice(i, 1)
        }
        return nodes.length > 0 ? this : void 0
      }
      optimizeNames(names2, constants) {
        const { nodes } = this
        let i = nodes.length
        while (i--) {
          const n = nodes[i]
          if (n.optimizeNames(names2, constants)) continue
          subtractNames(names2, n.names)
          nodes.splice(i, 1)
        }
        return nodes.length > 0 ? this : void 0
      }
      get names() {
        return this.nodes.reduce((names2, n) => addNames(names2, n.names), {})
      }
    }
    class BlockNode extends ParentNode {
      render(opts) {
        return '{' + opts._n + super.render(opts) + '}' + opts._n
      }
    }
    class Root extends ParentNode {}
    class Else extends BlockNode {}
    Else.kind = 'else'
    class If extends BlockNode {
      constructor(condition, nodes) {
        super(nodes)
        this.condition = condition
      }
      render(opts) {
        let code2 = `if(${this.condition})` + super.render(opts)
        if (this.else) code2 += 'else ' + this.else.render(opts)
        return code2
      }
      optimizeNodes() {
        super.optimizeNodes()
        const cond = this.condition
        if (cond === true) return this.nodes
        let e = this.else
        if (e) {
          const ns = e.optimizeNodes()
          e = this.else = Array.isArray(ns) ? new Else(ns) : ns
        }
        if (e) {
          if (cond === false) return e instanceof If ? e : e.nodes
          if (this.nodes.length) return this
          return new If(not2(cond), e instanceof If ? [e] : e.nodes)
        }
        if (cond === false || !this.nodes.length) return void 0
        return this
      }
      optimizeNames(names2, constants) {
        var _a
        this.else = (_a = this.else) === null || _a === void 0 ? void 0 : _a.optimizeNames(names2, constants)
        if (!(super.optimizeNames(names2, constants) || this.else)) return
        this.condition = optimizeExpr(this.condition, names2, constants)
        return this
      }
      get names() {
        const names2 = super.names
        addExprNames(names2, this.condition)
        if (this.else) addNames(names2, this.else.names)
        return names2
      }
    }
    If.kind = 'if'
    class For extends BlockNode {}
    For.kind = 'for'
    class ForLoop extends For {
      constructor(iteration) {
        super()
        this.iteration = iteration
      }
      render(opts) {
        return `for(${this.iteration})` + super.render(opts)
      }
      optimizeNames(names2, constants) {
        if (!super.optimizeNames(names2, constants)) return
        this.iteration = optimizeExpr(this.iteration, names2, constants)
        return this
      }
      get names() {
        return addNames(super.names, this.iteration.names)
      }
    }
    class ForRange extends For {
      constructor(varKind, name, from, to) {
        super()
        this.varKind = varKind
        this.name = name
        this.from = from
        this.to = to
      }
      render(opts) {
        const varKind = opts.es5 ? scope_1.varKinds.var : this.varKind
        const { name, from, to } = this
        return `for(${varKind} ${name}=${from}; ${name}<${to}; ${name}++)` + super.render(opts)
      }
      get names() {
        const names2 = addExprNames(super.names, this.from)
        return addExprNames(names2, this.to)
      }
    }
    class ForIter extends For {
      constructor(loop, varKind, name, iterable) {
        super()
        this.loop = loop
        this.varKind = varKind
        this.name = name
        this.iterable = iterable
      }
      render(opts) {
        return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(opts)
      }
      optimizeNames(names2, constants) {
        if (!super.optimizeNames(names2, constants)) return
        this.iterable = optimizeExpr(this.iterable, names2, constants)
        return this
      }
      get names() {
        return addNames(super.names, this.iterable.names)
      }
    }
    class Func extends BlockNode {
      constructor(name, args, async2) {
        super()
        this.name = name
        this.args = args
        this.async = async2
      }
      render(opts) {
        const _async = this.async ? 'async ' : ''
        return `${_async}function ${this.name}(${this.args})` + super.render(opts)
      }
    }
    Func.kind = 'func'
    class Return extends ParentNode {
      render(opts) {
        return 'return ' + super.render(opts)
      }
    }
    Return.kind = 'return'
    class Try extends BlockNode {
      render(opts) {
        let code2 = 'try' + super.render(opts)
        if (this.catch) code2 += this.catch.render(opts)
        if (this.finally) code2 += this.finally.render(opts)
        return code2
      }
      optimizeNodes() {
        var _a, _b
        super.optimizeNodes()
        ;(_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNodes()
        ;(_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNodes()
        return this
      }
      optimizeNames(names2, constants) {
        var _a, _b
        super.optimizeNames(names2, constants)
        ;(_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNames(names2, constants)
        ;(_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNames(names2, constants)
        return this
      }
      get names() {
        const names2 = super.names
        if (this.catch) addNames(names2, this.catch.names)
        if (this.finally) addNames(names2, this.finally.names)
        return names2
      }
    }
    class Catch extends BlockNode {
      constructor(error2) {
        super()
        this.error = error2
      }
      render(opts) {
        return `catch(${this.error})` + super.render(opts)
      }
    }
    Catch.kind = 'catch'
    class Finally extends BlockNode {
      render(opts) {
        return 'finally' + super.render(opts)
      }
    }
    Finally.kind = 'finally'
    class CodeGen {
      constructor(extScope, opts = {}) {
        this._values = {}
        this._blockStarts = []
        this._constants = {}
        this.opts = { ...opts, _n: opts.lines ? '\n' : '' }
        this._extScope = extScope
        this._scope = new scope_1.Scope({ parent: extScope })
        this._nodes = [new Root()]
      }
      toString() {
        return this._root.render(this.opts)
      }
      // returns unique name in the internal scope
      name(prefix) {
        return this._scope.name(prefix)
      }
      // reserves unique name in the external scope
      scopeName(prefix) {
        return this._extScope.name(prefix)
      }
      // reserves unique name in the external scope and assigns value to it
      scopeValue(prefixOrName, value) {
        const name = this._extScope.value(prefixOrName, value)
        const vs = this._values[name.prefix] || (this._values[name.prefix] = /* @__PURE__ */ new Set())
        vs.add(name)
        return name
      }
      getScopeValue(prefix, keyOrRef) {
        return this._extScope.getValue(prefix, keyOrRef)
      }
      // return code that assigns values in the external scope to the names that are used internally
      // (same names that were returned by gen.scopeName or gen.scopeValue)
      scopeRefs(scopeName) {
        return this._extScope.scopeRefs(scopeName, this._values)
      }
      scopeCode() {
        return this._extScope.scopeCode(this._values)
      }
      _def(varKind, nameOrPrefix, rhs, constant) {
        const name = this._scope.toName(nameOrPrefix)
        if (rhs !== void 0 && constant) this._constants[name.str] = rhs
        this._leafNode(new Def(varKind, name, rhs))
        return name
      }
      // `const` declaration (`var` in es5 mode)
      const(nameOrPrefix, rhs, _constant) {
        return this._def(scope_1.varKinds.const, nameOrPrefix, rhs, _constant)
      }
      // `let` declaration with optional assignment (`var` in es5 mode)
      let(nameOrPrefix, rhs, _constant) {
        return this._def(scope_1.varKinds.let, nameOrPrefix, rhs, _constant)
      }
      // `var` declaration with optional assignment
      var(nameOrPrefix, rhs, _constant) {
        return this._def(scope_1.varKinds.var, nameOrPrefix, rhs, _constant)
      }
      // assignment code
      assign(lhs, rhs, sideEffects) {
        return this._leafNode(new Assign(lhs, rhs, sideEffects))
      }
      // `+=` code
      add(lhs, rhs) {
        return this._leafNode(new AssignOp(lhs, exports3.operators.ADD, rhs))
      }
      // appends passed SafeExpr to code or executes Block
      code(c) {
        if (typeof c == 'function') c()
        else if (c !== code_12.nil) this._leafNode(new AnyCode(c))
        return this
      }
      // returns code for object literal for the passed argument list of key-value pairs
      object(...keyValues) {
        const code2 = ['{']
        for (const [key, value] of keyValues) {
          if (code2.length > 1) code2.push(',')
          code2.push(key)
          if (key !== value || this.opts.es5) {
            code2.push(':')
            ;(0, code_12.addCodeArg)(code2, value)
          }
        }
        code2.push('}')
        return new code_12._Code(code2)
      }
      // `if` clause (or statement if `thenBody` and, optionally, `elseBody` are passed)
      if(condition, thenBody, elseBody) {
        this._blockNode(new If(condition))
        if (thenBody && elseBody) {
          this.code(thenBody).else().code(elseBody).endIf()
        } else if (thenBody) {
          this.code(thenBody).endIf()
        } else if (elseBody) {
          throw new Error('CodeGen: "else" body without "then" body')
        }
        return this
      }
      // `else if` clause - invalid without `if` or after `else` clauses
      elseIf(condition) {
        return this._elseNode(new If(condition))
      }
      // `else` clause - only valid after `if` or `else if` clauses
      else() {
        return this._elseNode(new Else())
      }
      // end `if` statement (needed if gen.if was used only with condition)
      endIf() {
        return this._endBlockNode(If, Else)
      }
      _for(node, forBody) {
        this._blockNode(node)
        if (forBody) this.code(forBody).endFor()
        return this
      }
      // a generic `for` clause (or statement if `forBody` is passed)
      for(iteration, forBody) {
        return this._for(new ForLoop(iteration), forBody)
      }
      // `for` statement for a range of values
      forRange(nameOrPrefix, from, to, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.let) {
        const name = this._scope.toName(nameOrPrefix)
        return this._for(new ForRange(varKind, name, from, to), () => forBody(name))
      }
      // `for-of` statement (in es5 mode replace with a normal for loop)
      forOf(nameOrPrefix, iterable, forBody, varKind = scope_1.varKinds.const) {
        const name = this._scope.toName(nameOrPrefix)
        if (this.opts.es5) {
          const arr = iterable instanceof code_12.Name ? iterable : this.var('_arr', iterable)
          return this.forRange('_i', 0, (0, code_12._)`${arr}.length`, (i) => {
            this.var(name, (0, code_12._)`${arr}[${i}]`)
            forBody(name)
          })
        }
        return this._for(new ForIter('of', varKind, name, iterable), () => forBody(name))
      }
      // `for-in` statement.
      // With option `ownProperties` replaced with a `for-of` loop for object keys
      forIn(nameOrPrefix, obj, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.const) {
        if (this.opts.ownProperties) {
          return this.forOf(nameOrPrefix, (0, code_12._)`Object.keys(${obj})`, forBody)
        }
        const name = this._scope.toName(nameOrPrefix)
        return this._for(new ForIter('in', varKind, name, obj), () => forBody(name))
      }
      // end `for` loop
      endFor() {
        return this._endBlockNode(For)
      }
      // `label` statement
      label(label) {
        return this._leafNode(new Label(label))
      }
      // `break` statement
      break(label) {
        return this._leafNode(new Break(label))
      }
      // `return` statement
      return(value) {
        const node = new Return()
        this._blockNode(node)
        this.code(value)
        if (node.nodes.length !== 1) throw new Error('CodeGen: "return" should have one node')
        return this._endBlockNode(Return)
      }
      // `try` statement
      try(tryBody, catchCode, finallyCode) {
        if (!catchCode && !finallyCode) throw new Error('CodeGen: "try" without "catch" and "finally"')
        const node = new Try()
        this._blockNode(node)
        this.code(tryBody)
        if (catchCode) {
          const error2 = this.name('e')
          this._currNode = node.catch = new Catch(error2)
          catchCode(error2)
        }
        if (finallyCode) {
          this._currNode = node.finally = new Finally()
          this.code(finallyCode)
        }
        return this._endBlockNode(Catch, Finally)
      }
      // `throw` statement
      throw(error2) {
        return this._leafNode(new Throw(error2))
      }
      // start self-balancing block
      block(body, nodeCount) {
        this._blockStarts.push(this._nodes.length)
        if (body) this.code(body).endBlock(nodeCount)
        return this
      }
      // end the current self-balancing block
      endBlock(nodeCount) {
        const len = this._blockStarts.pop()
        if (len === void 0) throw new Error('CodeGen: not in self-balancing block')
        const toClose = this._nodes.length - len
        if (toClose < 0 || (nodeCount !== void 0 && toClose !== nodeCount)) {
          throw new Error(`CodeGen: wrong number of nodes: ${toClose} vs ${nodeCount} expected`)
        }
        this._nodes.length = len
        return this
      }
      // `function` heading (or definition if funcBody is passed)
      func(name, args = code_12.nil, async2, funcBody) {
        this._blockNode(new Func(name, args, async2))
        if (funcBody) this.code(funcBody).endFunc()
        return this
      }
      // end function definition
      endFunc() {
        return this._endBlockNode(Func)
      }
      optimize(n = 1) {
        while (n-- > 0) {
          this._root.optimizeNodes()
          this._root.optimizeNames(this._root.names, this._constants)
        }
      }
      _leafNode(node) {
        this._currNode.nodes.push(node)
        return this
      }
      _blockNode(node) {
        this._currNode.nodes.push(node)
        this._nodes.push(node)
      }
      _endBlockNode(N1, N2) {
        const n = this._currNode
        if (n instanceof N1 || (N2 && n instanceof N2)) {
          this._nodes.pop()
          return this
        }
        throw new Error(`CodeGen: not in block "${N2 ? `${N1.kind}/${N2.kind}` : N1.kind}"`)
      }
      _elseNode(node) {
        const n = this._currNode
        if (!(n instanceof If)) {
          throw new Error('CodeGen: "else" without "if"')
        }
        this._currNode = n.else = node
        return this
      }
      get _root() {
        return this._nodes[0]
      }
      get _currNode() {
        const ns = this._nodes
        return ns[ns.length - 1]
      }
      set _currNode(node) {
        const ns = this._nodes
        ns[ns.length - 1] = node
      }
    }
    exports3.CodeGen = CodeGen
    function addNames(names2, from) {
      for (const n in from) names2[n] = (names2[n] || 0) + (from[n] || 0)
      return names2
    }
    function addExprNames(names2, from) {
      return from instanceof code_12._CodeOrName ? addNames(names2, from.names) : names2
    }
    function optimizeExpr(expr, names2, constants) {
      if (expr instanceof code_12.Name) return replaceName(expr)
      if (!canOptimize(expr)) return expr
      return new code_12._Code(
        expr._items.reduce((items2, c) => {
          if (c instanceof code_12.Name) c = replaceName(c)
          if (c instanceof code_12._Code) items2.push(...c._items)
          else items2.push(c)
          return items2
        }, [])
      )
      function replaceName(n) {
        const c = constants[n.str]
        if (c === void 0 || names2[n.str] !== 1) return n
        delete names2[n.str]
        return c
      }
      function canOptimize(e) {
        return (
          e instanceof code_12._Code &&
          e._items.some((c) => c instanceof code_12.Name && names2[c.str] === 1 && constants[c.str] !== void 0)
        )
      }
    }
    function subtractNames(names2, from) {
      for (const n in from) names2[n] = (names2[n] || 0) - (from[n] || 0)
    }
    function not2(x) {
      return typeof x == 'boolean' || typeof x == 'number' || x === null ? !x : (0, code_12._)`!${par(x)}`
    }
    exports3.not = not2
    const andCode = mappend(exports3.operators.AND)
    function and(...args) {
      return args.reduce(andCode)
    }
    exports3.and = and
    const orCode = mappend(exports3.operators.OR)
    function or(...args) {
      return args.reduce(orCode)
    }
    exports3.or = or
    function mappend(op) {
      return (x, y) => (x === code_12.nil ? y : y === code_12.nil ? x : (0, code_12._)`${par(x)} ${op} ${par(y)}`)
    }
    function par(x) {
      return x instanceof code_12.Name ? x : (0, code_12._)`(${x})`
    }
  })(codegen)
  var util$7 = {}
  Object.defineProperty(util$7, '__esModule', { value: true })
  util$7.checkStrictMode =
    util$7.getErrorPath =
    util$7.Type =
    util$7.useFunc =
    util$7.setEvaluated =
    util$7.evaluatedPropsToName =
    util$7.mergeEvaluated =
    util$7.eachItem =
    util$7.unescapeJsonPointer =
    util$7.escapeJsonPointer =
    util$7.escapeFragment =
    util$7.unescapeFragment =
    util$7.schemaRefOrVal =
    util$7.schemaHasRulesButRef =
    util$7.schemaHasRules =
    util$7.checkUnknownRules =
    util$7.alwaysValidSchema =
    util$7.toHash =
      void 0
  const codegen_1$q = codegen
  const code_1$9 = code$1
  function toHash$2(arr) {
    const hash = {}
    for (const item of arr) hash[item] = true
    return hash
  }
  util$7.toHash = toHash$2
  function alwaysValidSchema(it, schema) {
    if (typeof schema == 'boolean') return schema
    if (Object.keys(schema).length === 0) return true
    checkUnknownRules(it, schema)
    return !schemaHasRules$1(schema, it.self.RULES.all)
  }
  util$7.alwaysValidSchema = alwaysValidSchema
  function checkUnknownRules(it, schema = it.schema) {
    const { opts, self: self2 } = it
    if (!opts.strictSchema) return
    if (typeof schema === 'boolean') return
    const rules2 = self2.RULES.keywords
    for (const key in schema) {
      if (!rules2[key]) checkStrictMode(it, `unknown keyword: "${key}"`)
    }
  }
  util$7.checkUnknownRules = checkUnknownRules
  function schemaHasRules$1(schema, rules2) {
    if (typeof schema == 'boolean') return !schema
    for (const key in schema) if (rules2[key]) return true
    return false
  }
  util$7.schemaHasRules = schemaHasRules$1
  function schemaHasRulesButRef(schema, RULES) {
    if (typeof schema == 'boolean') return !schema
    for (const key in schema) if (key !== '$ref' && RULES.all[key]) return true
    return false
  }
  util$7.schemaHasRulesButRef = schemaHasRulesButRef
  function schemaRefOrVal({ topSchemaRef, schemaPath }, schema, keyword2, $data) {
    if (!$data) {
      if (typeof schema == 'number' || typeof schema == 'boolean') return schema
      if (typeof schema == 'string') return (0, codegen_1$q._)`${schema}`
    }
    return (0, codegen_1$q._)`${topSchemaRef}${schemaPath}${(0, codegen_1$q.getProperty)(keyword2)}`
  }
  util$7.schemaRefOrVal = schemaRefOrVal
  function unescapeFragment$1(str) {
    return unescapeJsonPointer$1(decodeURIComponent(str))
  }
  util$7.unescapeFragment = unescapeFragment$1
  function escapeFragment$1(str) {
    return encodeURIComponent(escapeJsonPointer$1(str))
  }
  util$7.escapeFragment = escapeFragment$1
  function escapeJsonPointer$1(str) {
    if (typeof str == 'number') return `${str}`
    return str.replace(/~/g, '~0').replace(/\//g, '~1')
  }
  util$7.escapeJsonPointer = escapeJsonPointer$1
  function unescapeJsonPointer$1(str) {
    return str.replace(/~1/g, '/').replace(/~0/g, '~')
  }
  util$7.unescapeJsonPointer = unescapeJsonPointer$1
  function eachItem(xs, f) {
    if (Array.isArray(xs)) {
      for (const x of xs) f(x)
    } else {
      f(xs)
    }
  }
  util$7.eachItem = eachItem
  function makeMergeEvaluated({ mergeNames, mergeToName, mergeValues: mergeValues2, resultToName }) {
    return (gen, from, to, toName) => {
      const res =
        to === void 0
          ? from
          : to instanceof codegen_1$q.Name
            ? (from instanceof codegen_1$q.Name ? mergeNames(gen, from, to) : mergeToName(gen, from, to), to)
            : from instanceof codegen_1$q.Name
              ? (mergeToName(gen, to, from), from)
              : mergeValues2(from, to)
      return toName === codegen_1$q.Name && !(res instanceof codegen_1$q.Name) ? resultToName(gen, res) : res
    }
  }
  util$7.mergeEvaluated = {
    props: makeMergeEvaluated({
      mergeNames: (gen, from, to) =>
        gen.if((0, codegen_1$q._)`${to} !== true && ${from} !== undefined`, () => {
          gen.if(
            (0, codegen_1$q._)`${from} === true`,
            () => gen.assign(to, true),
            () =>
              gen.assign(to, (0, codegen_1$q._)`${to} || {}`).code((0, codegen_1$q._)`Object.assign(${to}, ${from})`)
          )
        }),
      mergeToName: (gen, from, to) =>
        gen.if((0, codegen_1$q._)`${to} !== true`, () => {
          if (from === true) {
            gen.assign(to, true)
          } else {
            gen.assign(to, (0, codegen_1$q._)`${to} || {}`)
            setEvaluated(gen, to, from)
          }
        }),
      mergeValues: (from, to) => (from === true ? true : { ...from, ...to }),
      resultToName: evaluatedPropsToName
    }),
    items: makeMergeEvaluated({
      mergeNames: (gen, from, to) =>
        gen.if((0, codegen_1$q._)`${to} !== true && ${from} !== undefined`, () =>
          gen.assign(to, (0, codegen_1$q._)`${from} === true ? true : ${to} > ${from} ? ${to} : ${from}`)
        ),
      mergeToName: (gen, from, to) =>
        gen.if((0, codegen_1$q._)`${to} !== true`, () =>
          gen.assign(to, from === true ? true : (0, codegen_1$q._)`${to} > ${from} ? ${to} : ${from}`)
        ),
      mergeValues: (from, to) => (from === true ? true : Math.max(from, to)),
      resultToName: (gen, items2) => gen.var('items', items2)
    })
  }
  function evaluatedPropsToName(gen, ps) {
    if (ps === true) return gen.var('props', true)
    const props = gen.var('props', (0, codegen_1$q._)`{}`)
    if (ps !== void 0) setEvaluated(gen, props, ps)
    return props
  }
  util$7.evaluatedPropsToName = evaluatedPropsToName
  function setEvaluated(gen, props, ps) {
    Object.keys(ps).forEach((p) => gen.assign((0, codegen_1$q._)`${props}${(0, codegen_1$q.getProperty)(p)}`, true))
  }
  util$7.setEvaluated = setEvaluated
  const snippets = {}
  function useFunc(gen, f) {
    return gen.scopeValue('func', {
      ref: f,
      code: snippets[f.code] || (snippets[f.code] = new code_1$9._Code(f.code))
    })
  }
  util$7.useFunc = useFunc
  var Type
  ;(function (Type2) {
    Type2[(Type2['Num'] = 0)] = 'Num'
    Type2[(Type2['Str'] = 1)] = 'Str'
  })(Type || (util$7.Type = Type = {}))
  function getErrorPath(dataProp, dataPropType, jsPropertySyntax) {
    if (dataProp instanceof codegen_1$q.Name) {
      const isNumber = dataPropType === Type.Num
      return jsPropertySyntax
        ? isNumber
          ? (0, codegen_1$q._)`"[" + ${dataProp} + "]"`
          : (0, codegen_1$q._)`"['" + ${dataProp} + "']"`
        : isNumber
          ? (0, codegen_1$q._)`"/" + ${dataProp}`
          : (0, codegen_1$q._)`"/" + ${dataProp}.replace(/~/g, "~0").replace(/\\//g, "~1")`
    }
    return jsPropertySyntax ? (0, codegen_1$q.getProperty)(dataProp).toString() : '/' + escapeJsonPointer$1(dataProp)
  }
  util$7.getErrorPath = getErrorPath
  function checkStrictMode(it, msg, mode = it.opts.strictSchema) {
    if (!mode) return
    msg = `strict mode: ${msg}`
    if (mode === true) throw new Error(msg)
    it.self.logger.warn(msg)
  }
  util$7.checkStrictMode = checkStrictMode
  var names$1 = {}
  Object.defineProperty(names$1, '__esModule', { value: true })
  const codegen_1$p = codegen
  const names = {
    // validation function arguments
    data: new codegen_1$p.Name('data'),
    // data passed to validation function
    // args passed from referencing schema
    valCxt: new codegen_1$p.Name('valCxt'),
    // validation/data context - should not be used directly, it is destructured to the names below
    instancePath: new codegen_1$p.Name('instancePath'),
    parentData: new codegen_1$p.Name('parentData'),
    parentDataProperty: new codegen_1$p.Name('parentDataProperty'),
    rootData: new codegen_1$p.Name('rootData'),
    // root data - same as the data passed to the first/top validation function
    dynamicAnchors: new codegen_1$p.Name('dynamicAnchors'),
    // used to support recursiveRef and dynamicRef
    // function scoped variables
    vErrors: new codegen_1$p.Name('vErrors'),
    // null or array of validation errors
    errors: new codegen_1$p.Name('errors'),
    // counter of validation errors
    this: new codegen_1$p.Name('this'),
    // "globals"
    self: new codegen_1$p.Name('self'),
    scope: new codegen_1$p.Name('scope'),
    // JTD serialize/parse name for JSON string and position
    json: new codegen_1$p.Name('json'),
    jsonPos: new codegen_1$p.Name('jsonPos'),
    jsonLen: new codegen_1$p.Name('jsonLen'),
    jsonPart: new codegen_1$p.Name('jsonPart')
  }
  names$1.default = names
  ;(function (exports3) {
    Object.defineProperty(exports3, '__esModule', { value: true })
    exports3.extendErrors =
      exports3.resetErrorsCount =
      exports3.reportExtraError =
      exports3.reportError =
      exports3.keyword$DataError =
      exports3.keywordError =
        void 0
    const codegen_12 = codegen
    const util_12 = util$7
    const names_12 = names$1
    exports3.keywordError = {
      message: ({ keyword: keyword2 }) => (0, codegen_12.str)`must pass "${keyword2}" keyword validation`
    }
    exports3.keyword$DataError = {
      message: ({ keyword: keyword2, schemaType }) =>
        schemaType
          ? (0, codegen_12.str)`"${keyword2}" keyword must be ${schemaType} ($data)`
          : (0, codegen_12.str)`"${keyword2}" keyword is invalid ($data)`
    }
    function reportError(cxt, error2 = exports3.keywordError, errorPaths, overrideAllErrors) {
      const { it } = cxt
      const { gen, compositeRule, allErrors } = it
      const errObj = errorObjectCode(cxt, error2, errorPaths)
      if (overrideAllErrors !== null && overrideAllErrors !== void 0 ? overrideAllErrors : compositeRule || allErrors) {
        addError(gen, errObj)
      } else {
        returnErrors(it, (0, codegen_12._)`[${errObj}]`)
      }
    }
    exports3.reportError = reportError
    function reportExtraError(cxt, error2 = exports3.keywordError, errorPaths) {
      const { it } = cxt
      const { gen, compositeRule, allErrors } = it
      const errObj = errorObjectCode(cxt, error2, errorPaths)
      addError(gen, errObj)
      if (!(compositeRule || allErrors)) {
        returnErrors(it, names_12.default.vErrors)
      }
    }
    exports3.reportExtraError = reportExtraError
    function resetErrorsCount(gen, errsCount) {
      gen.assign(names_12.default.errors, errsCount)
      gen.if((0, codegen_12._)`${names_12.default.vErrors} !== null`, () =>
        gen.if(
          errsCount,
          () => gen.assign((0, codegen_12._)`${names_12.default.vErrors}.length`, errsCount),
          () => gen.assign(names_12.default.vErrors, null)
        )
      )
    }
    exports3.resetErrorsCount = resetErrorsCount
    function extendErrors({ gen, keyword: keyword2, schemaValue, data: data2, errsCount, it }) {
      if (errsCount === void 0) throw new Error('ajv implementation error')
      const err = gen.name('err')
      gen.forRange('i', errsCount, names_12.default.errors, (i) => {
        gen.const(err, (0, codegen_12._)`${names_12.default.vErrors}[${i}]`)
        gen.if((0, codegen_12._)`${err}.instancePath === undefined`, () =>
          gen.assign(
            (0, codegen_12._)`${err}.instancePath`,
            (0, codegen_12.strConcat)(names_12.default.instancePath, it.errorPath)
          )
        )
        gen.assign((0, codegen_12._)`${err}.schemaPath`, (0, codegen_12.str)`${it.errSchemaPath}/${keyword2}`)
        if (it.opts.verbose) {
          gen.assign((0, codegen_12._)`${err}.schema`, schemaValue)
          gen.assign((0, codegen_12._)`${err}.data`, data2)
        }
      })
    }
    exports3.extendErrors = extendErrors
    function addError(gen, errObj) {
      const err = gen.const('err', errObj)
      gen.if(
        (0, codegen_12._)`${names_12.default.vErrors} === null`,
        () => gen.assign(names_12.default.vErrors, (0, codegen_12._)`[${err}]`),
        (0, codegen_12._)`${names_12.default.vErrors}.push(${err})`
      )
      gen.code((0, codegen_12._)`${names_12.default.errors}++`)
    }
    function returnErrors(it, errs) {
      const { gen, validateName, schemaEnv } = it
      if (schemaEnv.$async) {
        gen.throw((0, codegen_12._)`new ${it.ValidationError}(${errs})`)
      } else {
        gen.assign((0, codegen_12._)`${validateName}.errors`, errs)
        gen.return(false)
      }
    }
    const E = {
      keyword: new codegen_12.Name('keyword'),
      schemaPath: new codegen_12.Name('schemaPath'),
      // also used in JTD errors
      params: new codegen_12.Name('params'),
      propertyName: new codegen_12.Name('propertyName'),
      message: new codegen_12.Name('message'),
      schema: new codegen_12.Name('schema'),
      parentSchema: new codegen_12.Name('parentSchema')
    }
    function errorObjectCode(cxt, error2, errorPaths) {
      const { createErrors } = cxt.it
      if (createErrors === false) return (0, codegen_12._)`{}`
      return errorObject(cxt, error2, errorPaths)
    }
    function errorObject(cxt, error2, errorPaths = {}) {
      const { gen, it } = cxt
      const keyValues = [errorInstancePath(it, errorPaths), errorSchemaPath(cxt, errorPaths)]
      extraErrorProps(cxt, error2, keyValues)
      return gen.object(...keyValues)
    }
    function errorInstancePath({ errorPath }, { instancePath }) {
      const instPath = instancePath
        ? (0, codegen_12.str)`${errorPath}${(0, util_12.getErrorPath)(instancePath, util_12.Type.Str)}`
        : errorPath
      return [names_12.default.instancePath, (0, codegen_12.strConcat)(names_12.default.instancePath, instPath)]
    }
    function errorSchemaPath({ keyword: keyword2, it: { errSchemaPath } }, { schemaPath, parentSchema }) {
      let schPath = parentSchema ? errSchemaPath : (0, codegen_12.str)`${errSchemaPath}/${keyword2}`
      if (schemaPath) {
        schPath = (0, codegen_12.str)`${schPath}${(0, util_12.getErrorPath)(schemaPath, util_12.Type.Str)}`
      }
      return [E.schemaPath, schPath]
    }
    function extraErrorProps(cxt, { params, message }, keyValues) {
      const { keyword: keyword2, data: data2, schemaValue, it } = cxt
      const { opts, propertyName, topSchemaRef, schemaPath } = it
      keyValues.push(
        [E.keyword, keyword2],
        [E.params, typeof params == 'function' ? params(cxt) : params || (0, codegen_12._)`{}`]
      )
      if (opts.messages) {
        keyValues.push([E.message, typeof message == 'function' ? message(cxt) : message])
      }
      if (opts.verbose) {
        keyValues.push(
          [E.schema, schemaValue],
          [E.parentSchema, (0, codegen_12._)`${topSchemaRef}${schemaPath}`],
          [names_12.default.data, data2]
        )
      }
      if (propertyName) keyValues.push([E.propertyName, propertyName])
    }
  })(errors)
  var hasRequiredBoolSchema
  function requireBoolSchema() {
    if (hasRequiredBoolSchema) return boolSchema
    hasRequiredBoolSchema = 1
    Object.defineProperty(boolSchema, '__esModule', { value: true })
    boolSchema.boolOrEmptySchema = boolSchema.topBoolOrEmptySchema = void 0
    const errors_12 = errors
    const codegen_12 = codegen
    const names_12 = names$1
    const boolError = {
      message: 'boolean schema is false'
    }
    function topBoolOrEmptySchema(it) {
      const { gen, schema, validateName } = it
      if (schema === false) {
        falseSchemaError(it, false)
      } else if (typeof schema == 'object' && schema.$async === true) {
        gen.return(names_12.default.data)
      } else {
        gen.assign((0, codegen_12._)`${validateName}.errors`, null)
        gen.return(true)
      }
    }
    boolSchema.topBoolOrEmptySchema = topBoolOrEmptySchema
    function boolOrEmptySchema(it, valid) {
      const { gen, schema } = it
      if (schema === false) {
        gen.var(valid, false)
        falseSchemaError(it)
      } else {
        gen.var(valid, true)
      }
    }
    boolSchema.boolOrEmptySchema = boolOrEmptySchema
    function falseSchemaError(it, overrideAllErrors) {
      const { gen, data: data2 } = it
      const cxt = {
        gen,
        keyword: 'false schema',
        data: data2,
        schema: false,
        schemaCode: false,
        schemaValue: false,
        params: {},
        it
      }
      ;(0, errors_12.reportError)(cxt, boolError, void 0, overrideAllErrors)
    }
    return boolSchema
  }
  var dataType = {}
  var rules$2 = {}
  Object.defineProperty(rules$2, '__esModule', { value: true })
  rules$2.getRules = rules$2.isJSONType = void 0
  const _jsonTypes = ['string', 'number', 'integer', 'boolean', 'null', 'object', 'array']
  const jsonTypes = new Set(_jsonTypes)
  function isJSONType(x) {
    return typeof x == 'string' && jsonTypes.has(x)
  }
  rules$2.isJSONType = isJSONType
  function getRules() {
    const groups = {
      number: { type: 'number', rules: [] },
      string: { type: 'string', rules: [] },
      array: { type: 'array', rules: [] },
      object: { type: 'object', rules: [] }
    }
    return {
      types: { ...groups, integer: true, boolean: true, null: true },
      rules: [{ rules: [] }, groups.number, groups.string, groups.array, groups.object],
      post: { rules: [] },
      all: {},
      keywords: {}
    }
  }
  rules$2.getRules = getRules
  var applicability = {}
  Object.defineProperty(applicability, '__esModule', { value: true })
  applicability.shouldUseRule = applicability.shouldUseGroup = applicability.schemaHasRulesForType = void 0
  function schemaHasRulesForType({ schema, self: self2 }, type2) {
    const group = self2.RULES.types[type2]
    return group && group !== true && shouldUseGroup(schema, group)
  }
  applicability.schemaHasRulesForType = schemaHasRulesForType
  function shouldUseGroup(schema, group) {
    return group.rules.some((rule) => shouldUseRule(schema, rule))
  }
  applicability.shouldUseGroup = shouldUseGroup
  function shouldUseRule(schema, rule) {
    var _a
    return (
      schema[rule.keyword] !== void 0 ||
      ((_a = rule.definition.implements) === null || _a === void 0 ? void 0 : _a.some((kwd) => schema[kwd] !== void 0))
    )
  }
  applicability.shouldUseRule = shouldUseRule
  Object.defineProperty(dataType, '__esModule', { value: true })
  dataType.reportTypeError =
    dataType.checkDataTypes =
    dataType.checkDataType =
    dataType.coerceAndCheckDataType =
    dataType.getJSONTypes =
    dataType.getSchemaTypes =
    dataType.DataType =
      void 0
  const rules_1 = rules$2
  const applicability_1 = applicability
  const errors_1 = errors
  const codegen_1$o = codegen
  const util_1$n = util$7
  var DataType
  ;(function (DataType2) {
    DataType2[(DataType2['Correct'] = 0)] = 'Correct'
    DataType2[(DataType2['Wrong'] = 1)] = 'Wrong'
  })(DataType || (dataType.DataType = DataType = {}))
  function getSchemaTypes(schema) {
    const types2 = getJSONTypes(schema.type)
    const hasNull = types2.includes('null')
    if (hasNull) {
      if (schema.nullable === false) throw new Error('type: null contradicts nullable: false')
    } else {
      if (!types2.length && schema.nullable !== void 0) {
        throw new Error('"nullable" cannot be used without "type"')
      }
      if (schema.nullable === true) types2.push('null')
    }
    return types2
  }
  dataType.getSchemaTypes = getSchemaTypes
  function getJSONTypes(ts) {
    const types2 = Array.isArray(ts) ? ts : ts ? [ts] : []
    if (types2.every(rules_1.isJSONType)) return types2
    throw new Error('type must be JSONType or JSONType[]: ' + types2.join(','))
  }
  dataType.getJSONTypes = getJSONTypes
  function coerceAndCheckDataType(it, types2) {
    const { gen, data: data2, opts } = it
    const coerceTo = coerceToTypes$1(types2, opts.coerceTypes)
    const checkTypes =
      types2.length > 0 &&
      !(coerceTo.length === 0 && types2.length === 1 && (0, applicability_1.schemaHasRulesForType)(it, types2[0]))
    if (checkTypes) {
      const wrongType = checkDataTypes$1(types2, data2, opts.strictNumbers, DataType.Wrong)
      gen.if(wrongType, () => {
        if (coerceTo.length) coerceData(it, types2, coerceTo)
        else reportTypeError(it)
      })
    }
    return checkTypes
  }
  dataType.coerceAndCheckDataType = coerceAndCheckDataType
  const COERCIBLE = /* @__PURE__ */ new Set(['string', 'number', 'integer', 'boolean', 'null'])
  function coerceToTypes$1(types2, coerceTypes) {
    return coerceTypes ? types2.filter((t) => COERCIBLE.has(t) || (coerceTypes === 'array' && t === 'array')) : []
  }
  function coerceData(it, types2, coerceTo) {
    const { gen, data: data2, opts } = it
    const dataType2 = gen.let('dataType', (0, codegen_1$o._)`typeof ${data2}`)
    const coerced = gen.let('coerced', (0, codegen_1$o._)`undefined`)
    if (opts.coerceTypes === 'array') {
      gen.if((0, codegen_1$o._)`${dataType2} == 'object' && Array.isArray(${data2}) && ${data2}.length == 1`, () =>
        gen
          .assign(data2, (0, codegen_1$o._)`${data2}[0]`)
          .assign(dataType2, (0, codegen_1$o._)`typeof ${data2}`)
          .if(checkDataTypes$1(types2, data2, opts.strictNumbers), () => gen.assign(coerced, data2))
      )
    }
    gen.if((0, codegen_1$o._)`${coerced} !== undefined`)
    for (const t of coerceTo) {
      if (COERCIBLE.has(t) || (t === 'array' && opts.coerceTypes === 'array')) {
        coerceSpecificType(t)
      }
    }
    gen.else()
    reportTypeError(it)
    gen.endIf()
    gen.if((0, codegen_1$o._)`${coerced} !== undefined`, () => {
      gen.assign(data2, coerced)
      assignParentData(it, coerced)
    })
    function coerceSpecificType(t) {
      switch (t) {
        case 'string':
          gen
            .elseIf((0, codegen_1$o._)`${dataType2} == "number" || ${dataType2} == "boolean"`)
            .assign(coerced, (0, codegen_1$o._)`"" + ${data2}`)
            .elseIf((0, codegen_1$o._)`${data2} === null`)
            .assign(coerced, (0, codegen_1$o._)`""`)
          return
        case 'number':
          gen
            .elseIf(
              (0, codegen_1$o._)`${dataType2} == "boolean" || ${data2} === null
              || (${dataType2} == "string" && ${data2} && ${data2} == +${data2})`
            )
            .assign(coerced, (0, codegen_1$o._)`+${data2}`)
          return
        case 'integer':
          gen
            .elseIf(
              (0, codegen_1$o._)`${dataType2} === "boolean" || ${data2} === null
              || (${dataType2} === "string" && ${data2} && ${data2} == +${data2} && !(${data2} % 1))`
            )
            .assign(coerced, (0, codegen_1$o._)`+${data2}`)
          return
        case 'boolean':
          gen
            .elseIf((0, codegen_1$o._)`${data2} === "false" || ${data2} === 0 || ${data2} === null`)
            .assign(coerced, false)
            .elseIf((0, codegen_1$o._)`${data2} === "true" || ${data2} === 1`)
            .assign(coerced, true)
          return
        case 'null':
          gen.elseIf((0, codegen_1$o._)`${data2} === "" || ${data2} === 0 || ${data2} === false`)
          gen.assign(coerced, null)
          return
        case 'array':
          gen
            .elseIf(
              (0, codegen_1$o._)`${dataType2} === "string" || ${dataType2} === "number"
              || ${dataType2} === "boolean" || ${data2} === null`
            )
            .assign(coerced, (0, codegen_1$o._)`[${data2}]`)
      }
    }
  }
  function assignParentData({ gen, parentData, parentDataProperty }, expr) {
    gen.if((0, codegen_1$o._)`${parentData} !== undefined`, () =>
      gen.assign((0, codegen_1$o._)`${parentData}[${parentDataProperty}]`, expr)
    )
  }
  function checkDataType$1(dataType2, data2, strictNums, correct = DataType.Correct) {
    const EQ = correct === DataType.Correct ? codegen_1$o.operators.EQ : codegen_1$o.operators.NEQ
    let cond
    switch (dataType2) {
      case 'null':
        return (0, codegen_1$o._)`${data2} ${EQ} null`
      case 'array':
        cond = (0, codegen_1$o._)`Array.isArray(${data2})`
        break
      case 'object':
        cond = (0, codegen_1$o._)`${data2} && typeof ${data2} == "object" && !Array.isArray(${data2})`
        break
      case 'integer':
        cond = numCond((0, codegen_1$o._)`!(${data2} % 1) && !isNaN(${data2})`)
        break
      case 'number':
        cond = numCond()
        break
      default:
        return (0, codegen_1$o._)`typeof ${data2} ${EQ} ${dataType2}`
    }
    return correct === DataType.Correct ? cond : (0, codegen_1$o.not)(cond)
    function numCond(_cond = codegen_1$o.nil) {
      return (0, codegen_1$o.and)(
        (0, codegen_1$o._)`typeof ${data2} == "number"`,
        _cond,
        strictNums ? (0, codegen_1$o._)`isFinite(${data2})` : codegen_1$o.nil
      )
    }
  }
  dataType.checkDataType = checkDataType$1
  function checkDataTypes$1(dataTypes, data2, strictNums, correct) {
    if (dataTypes.length === 1) {
      return checkDataType$1(dataTypes[0], data2, strictNums, correct)
    }
    let cond
    const types2 = (0, util_1$n.toHash)(dataTypes)
    if (types2.array && types2.object) {
      const notObj = (0, codegen_1$o._)`typeof ${data2} != "object"`
      cond = types2.null ? notObj : (0, codegen_1$o._)`!${data2} || ${notObj}`
      delete types2.null
      delete types2.array
      delete types2.object
    } else {
      cond = codegen_1$o.nil
    }
    if (types2.number) delete types2.integer
    for (const t in types2) cond = (0, codegen_1$o.and)(cond, checkDataType$1(t, data2, strictNums, correct))
    return cond
  }
  dataType.checkDataTypes = checkDataTypes$1
  const typeError = {
    message: ({ schema }) => `must be ${schema}`,
    params: ({ schema, schemaValue }) =>
      typeof schema == 'string' ? (0, codegen_1$o._)`{type: ${schema}}` : (0, codegen_1$o._)`{type: ${schemaValue}}`
  }
  function reportTypeError(it) {
    const cxt = getTypeErrorContext(it)
    ;(0, errors_1.reportError)(cxt, typeError)
  }
  dataType.reportTypeError = reportTypeError
  function getTypeErrorContext(it) {
    const { gen, data: data2, schema } = it
    const schemaCode = (0, util_1$n.schemaRefOrVal)(it, schema, 'type')
    return {
      gen,
      keyword: 'type',
      data: data2,
      schema: schema.type,
      schemaCode,
      schemaValue: schemaCode,
      parentSchema: schema,
      params: {},
      it
    }
  }
  var defaults = {}
  var hasRequiredDefaults
  function requireDefaults() {
    if (hasRequiredDefaults) return defaults
    hasRequiredDefaults = 1
    Object.defineProperty(defaults, '__esModule', { value: true })
    defaults.assignDefaults = void 0
    const codegen_12 = codegen
    const util_12 = util$7
    function assignDefaults(it, ty) {
      const { properties: properties2, items: items2 } = it.schema
      if (ty === 'object' && properties2) {
        for (const key in properties2) {
          assignDefault(it, key, properties2[key].default)
        }
      } else if (ty === 'array' && Array.isArray(items2)) {
        items2.forEach((sch, i) => assignDefault(it, i, sch.default))
      }
    }
    defaults.assignDefaults = assignDefaults
    function assignDefault(it, prop, defaultValue) {
      const { gen, compositeRule, data: data2, opts } = it
      if (defaultValue === void 0) return
      const childData = (0, codegen_12._)`${data2}${(0, codegen_12.getProperty)(prop)}`
      if (compositeRule) {
        ;(0, util_12.checkStrictMode)(it, `default is ignored for: ${childData}`)
        return
      }
      let condition = (0, codegen_12._)`${childData} === undefined`
      if (opts.useDefaults === 'empty') {
        condition = (0, codegen_12._)`${condition} || ${childData} === null || ${childData} === ""`
      }
      gen.if(condition, (0, codegen_12._)`${childData} = ${(0, codegen_12.stringify)(defaultValue)}`)
    }
    return defaults
  }
  var keyword$1 = {}
  var code = {}
  Object.defineProperty(code, '__esModule', { value: true })
  code.validateUnion =
    code.validateArray =
    code.usePattern =
    code.callValidateCode =
    code.schemaProperties =
    code.allSchemaProperties =
    code.noPropertyInData =
    code.propertyInData =
    code.isOwnProperty =
    code.hasPropFunc =
    code.reportMissingProp =
    code.checkMissingProp =
    code.checkReportMissingProp =
      void 0
  const codegen_1$n = codegen
  const util_1$m = util$7
  const names_1$3 = names$1
  const util_2$1 = util$7
  function checkReportMissingProp(cxt, prop) {
    const { gen, data: data2, it } = cxt
    gen.if(noPropertyInData(gen, data2, prop, it.opts.ownProperties), () => {
      cxt.setParams({ missingProperty: (0, codegen_1$n._)`${prop}` }, true)
      cxt.error()
    })
  }
  code.checkReportMissingProp = checkReportMissingProp
  function checkMissingProp({ gen, data: data2, it: { opts } }, properties2, missing) {
    return (0, codegen_1$n.or)(
      ...properties2.map((prop) =>
        (0, codegen_1$n.and)(
          noPropertyInData(gen, data2, prop, opts.ownProperties),
          (0, codegen_1$n._)`${missing} = ${prop}`
        )
      )
    )
  }
  code.checkMissingProp = checkMissingProp
  function reportMissingProp(cxt, missing) {
    cxt.setParams({ missingProperty: missing }, true)
    cxt.error()
  }
  code.reportMissingProp = reportMissingProp
  function hasPropFunc(gen) {
    return gen.scopeValue('func', {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      ref: Object.prototype.hasOwnProperty,
      code: (0, codegen_1$n._)`Object.prototype.hasOwnProperty`
    })
  }
  code.hasPropFunc = hasPropFunc
  function isOwnProperty(gen, data2, property) {
    return (0, codegen_1$n._)`${hasPropFunc(gen)}.call(${data2}, ${property})`
  }
  code.isOwnProperty = isOwnProperty
  function propertyInData(gen, data2, property, ownProperties) {
    const cond = (0, codegen_1$n._)`${data2}${(0, codegen_1$n.getProperty)(property)} !== undefined`
    return ownProperties ? (0, codegen_1$n._)`${cond} && ${isOwnProperty(gen, data2, property)}` : cond
  }
  code.propertyInData = propertyInData
  function noPropertyInData(gen, data2, property, ownProperties) {
    const cond = (0, codegen_1$n._)`${data2}${(0, codegen_1$n.getProperty)(property)} === undefined`
    return ownProperties ? (0, codegen_1$n.or)(cond, (0, codegen_1$n.not)(isOwnProperty(gen, data2, property))) : cond
  }
  code.noPropertyInData = noPropertyInData
  function allSchemaProperties(schemaMap) {
    return schemaMap ? Object.keys(schemaMap).filter((p) => p !== '__proto__') : []
  }
  code.allSchemaProperties = allSchemaProperties
  function schemaProperties(it, schemaMap) {
    return allSchemaProperties(schemaMap).filter((p) => !(0, util_1$m.alwaysValidSchema)(it, schemaMap[p]))
  }
  code.schemaProperties = schemaProperties
  function callValidateCode(
    { schemaCode, data: data2, it: { gen, topSchemaRef, schemaPath, errorPath }, it },
    func,
    context,
    passSchema
  ) {
    const dataAndSchema = passSchema ? (0, codegen_1$n._)`${schemaCode}, ${data2}, ${topSchemaRef}${schemaPath}` : data2
    const valCxt = [
      [names_1$3.default.instancePath, (0, codegen_1$n.strConcat)(names_1$3.default.instancePath, errorPath)],
      [names_1$3.default.parentData, it.parentData],
      [names_1$3.default.parentDataProperty, it.parentDataProperty],
      [names_1$3.default.rootData, names_1$3.default.rootData]
    ]
    if (it.opts.dynamicRef) valCxt.push([names_1$3.default.dynamicAnchors, names_1$3.default.dynamicAnchors])
    const args = (0, codegen_1$n._)`${dataAndSchema}, ${gen.object(...valCxt)}`
    return context !== codegen_1$n.nil
      ? (0, codegen_1$n._)`${func}.call(${context}, ${args})`
      : (0, codegen_1$n._)`${func}(${args})`
  }
  code.callValidateCode = callValidateCode
  const newRegExp = (0, codegen_1$n._)`new RegExp`
  function usePattern({ gen, it: { opts } }, pattern2) {
    const u = opts.unicodeRegExp ? 'u' : ''
    const { regExp } = opts.code
    const rx = regExp(pattern2, u)
    return gen.scopeValue('pattern', {
      key: rx.toString(),
      ref: rx,
      code: (0,
      codegen_1$n._)`${regExp.code === 'new RegExp' ? newRegExp : (0, util_2$1.useFunc)(gen, regExp)}(${pattern2}, ${u})`
    })
  }
  code.usePattern = usePattern
  function validateArray(cxt) {
    const { gen, data: data2, keyword: keyword2, it } = cxt
    const valid = gen.name('valid')
    if (it.allErrors) {
      const validArr = gen.let('valid', true)
      validateItems(() => gen.assign(validArr, false))
      return validArr
    }
    gen.var(valid, true)
    validateItems(() => gen.break())
    return valid
    function validateItems(notValid) {
      const len = gen.const('len', (0, codegen_1$n._)`${data2}.length`)
      gen.forRange('i', 0, len, (i) => {
        cxt.subschema(
          {
            keyword: keyword2,
            dataProp: i,
            dataPropType: util_1$m.Type.Num
          },
          valid
        )
        gen.if((0, codegen_1$n.not)(valid), notValid)
      })
    }
  }
  code.validateArray = validateArray
  function validateUnion(cxt) {
    const { gen, schema, keyword: keyword2, it } = cxt
    if (!Array.isArray(schema)) throw new Error('ajv implementation error')
    const alwaysValid = schema.some((sch) => (0, util_1$m.alwaysValidSchema)(it, sch))
    if (alwaysValid && !it.opts.unevaluated) return
    const valid = gen.let('valid', false)
    const schValid = gen.name('_valid')
    gen.block(() =>
      schema.forEach((_sch, i) => {
        const schCxt = cxt.subschema(
          {
            keyword: keyword2,
            schemaProp: i,
            compositeRule: true
          },
          schValid
        )
        gen.assign(valid, (0, codegen_1$n._)`${valid} || ${schValid}`)
        const merged = cxt.mergeValidEvaluated(schCxt, schValid)
        if (!merged) gen.if((0, codegen_1$n.not)(valid))
      })
    )
    cxt.result(
      valid,
      () => cxt.reset(),
      () => cxt.error(true)
    )
  }
  code.validateUnion = validateUnion
  var hasRequiredKeyword
  function requireKeyword() {
    if (hasRequiredKeyword) return keyword$1
    hasRequiredKeyword = 1
    Object.defineProperty(keyword$1, '__esModule', { value: true })
    keyword$1.validateKeywordUsage =
      keyword$1.validSchemaType =
      keyword$1.funcKeywordCode =
      keyword$1.macroKeywordCode =
        void 0
    const codegen_12 = codegen
    const names_12 = names$1
    const code_12 = code
    const errors_12 = errors
    function macroKeywordCode(cxt, def2) {
      const { gen, keyword: keyword2, schema, parentSchema, it } = cxt
      const macroSchema = def2.macro.call(it.self, schema, parentSchema, it)
      const schemaRef = useKeyword(gen, keyword2, macroSchema)
      if (it.opts.validateSchema !== false) it.self.validateSchema(macroSchema, true)
      const valid = gen.name('valid')
      cxt.subschema(
        {
          schema: macroSchema,
          schemaPath: codegen_12.nil,
          errSchemaPath: `${it.errSchemaPath}/${keyword2}`,
          topSchemaRef: schemaRef,
          compositeRule: true
        },
        valid
      )
      cxt.pass(valid, () => cxt.error(true))
    }
    keyword$1.macroKeywordCode = macroKeywordCode
    function funcKeywordCode(cxt, def2) {
      var _a
      const { gen, keyword: keyword2, schema, parentSchema, $data, it } = cxt
      checkAsyncKeyword(it, def2)
      const validate2 = !$data && def2.compile ? def2.compile.call(it.self, schema, parentSchema, it) : def2.validate
      const validateRef = useKeyword(gen, keyword2, validate2)
      const valid = gen.let('valid')
      cxt.block$data(valid, validateKeyword2)
      cxt.ok((_a = def2.valid) !== null && _a !== void 0 ? _a : valid)
      function validateKeyword2() {
        if (def2.errors === false) {
          assignValid()
          if (def2.modifying) modifyData(cxt)
          reportErrs(() => cxt.error())
        } else {
          const ruleErrs = def2.async ? validateAsync() : validateSync()
          if (def2.modifying) modifyData(cxt)
          reportErrs(() => addErrs(cxt, ruleErrs))
        }
      }
      function validateAsync() {
        const ruleErrs = gen.let('ruleErrs', null)
        gen.try(
          () => assignValid((0, codegen_12._)`await `),
          (e) =>
            gen.assign(valid, false).if(
              (0, codegen_12._)`${e} instanceof ${it.ValidationError}`,
              () => gen.assign(ruleErrs, (0, codegen_12._)`${e}.errors`),
              () => gen.throw(e)
            )
        )
        return ruleErrs
      }
      function validateSync() {
        const validateErrs = (0, codegen_12._)`${validateRef}.errors`
        gen.assign(validateErrs, null)
        assignValid(codegen_12.nil)
        return validateErrs
      }
      function assignValid(_await = def2.async ? (0, codegen_12._)`await ` : codegen_12.nil) {
        const passCxt = it.opts.passContext ? names_12.default.this : names_12.default.self
        const passSchema = !(('compile' in def2 && !$data) || def2.schema === false)
        gen.assign(
          valid,
          (0, codegen_12._)`${_await}${(0, code_12.callValidateCode)(cxt, validateRef, passCxt, passSchema)}`,
          def2.modifying
        )
      }
      function reportErrs(errors2) {
        var _a2
        gen.if((0, codegen_12.not)((_a2 = def2.valid) !== null && _a2 !== void 0 ? _a2 : valid), errors2)
      }
    }
    keyword$1.funcKeywordCode = funcKeywordCode
    function modifyData(cxt) {
      const { gen, data: data2, it } = cxt
      gen.if(it.parentData, () => gen.assign(data2, (0, codegen_12._)`${it.parentData}[${it.parentDataProperty}]`))
    }
    function addErrs(cxt, errs) {
      const { gen } = cxt
      gen.if(
        (0, codegen_12._)`Array.isArray(${errs})`,
        () => {
          gen
            .assign(
              names_12.default.vErrors,
              (0,
              codegen_12._)`${names_12.default.vErrors} === null ? ${errs} : ${names_12.default.vErrors}.concat(${errs})`
            )
            .assign(names_12.default.errors, (0, codegen_12._)`${names_12.default.vErrors}.length`)
          ;(0, errors_12.extendErrors)(cxt)
        },
        () => cxt.error()
      )
    }
    function checkAsyncKeyword({ schemaEnv }, def2) {
      if (def2.async && !schemaEnv.$async) throw new Error('async keyword in sync schema')
    }
    function useKeyword(gen, keyword2, result) {
      if (result === void 0) throw new Error(`keyword "${keyword2}" failed to compile`)
      return gen.scopeValue(
        'keyword',
        typeof result == 'function' ? { ref: result } : { ref: result, code: (0, codegen_12.stringify)(result) }
      )
    }
    function validSchemaType(schema, schemaType, allowUndefined = false) {
      return (
        !schemaType.length ||
        schemaType.some((st) =>
          st === 'array'
            ? Array.isArray(schema)
            : st === 'object'
              ? schema && typeof schema == 'object' && !Array.isArray(schema)
              : typeof schema == st || (allowUndefined && typeof schema == 'undefined')
        )
      )
    }
    keyword$1.validSchemaType = validSchemaType
    function validateKeywordUsage({ schema, opts, self: self2, errSchemaPath }, def2, keyword2) {
      if (Array.isArray(def2.keyword) ? !def2.keyword.includes(keyword2) : def2.keyword !== keyword2) {
        throw new Error('ajv implementation error')
      }
      const deps = def2.dependencies
      if (
        deps === null || deps === void 0
          ? void 0
          : deps.some((kwd) => !Object.prototype.hasOwnProperty.call(schema, kwd))
      ) {
        throw new Error(`parent schema must have dependencies of ${keyword2}: ${deps.join(',')}`)
      }
      if (def2.validateSchema) {
        const valid = def2.validateSchema(schema[keyword2])
        if (!valid) {
          const msg =
            `keyword "${keyword2}" value is invalid at path "${errSchemaPath}": ` +
            self2.errorsText(def2.validateSchema.errors)
          if (opts.validateSchema === 'log') self2.logger.error(msg)
          else throw new Error(msg)
        }
      }
    }
    keyword$1.validateKeywordUsage = validateKeywordUsage
    return keyword$1
  }
  var subschema = {}
  var hasRequiredSubschema
  function requireSubschema() {
    if (hasRequiredSubschema) return subschema
    hasRequiredSubschema = 1
    Object.defineProperty(subschema, '__esModule', { value: true })
    subschema.extendSubschemaMode = subschema.extendSubschemaData = subschema.getSubschema = void 0
    const codegen_12 = codegen
    const util_12 = util$7
    function getSubschema(it, { keyword: keyword2, schemaProp, schema, schemaPath, errSchemaPath, topSchemaRef }) {
      if (keyword2 !== void 0 && schema !== void 0) {
        throw new Error('both "keyword" and "schema" passed, only one allowed')
      }
      if (keyword2 !== void 0) {
        const sch = it.schema[keyword2]
        return schemaProp === void 0
          ? {
              schema: sch,
              schemaPath: (0, codegen_12._)`${it.schemaPath}${(0, codegen_12.getProperty)(keyword2)}`,
              errSchemaPath: `${it.errSchemaPath}/${keyword2}`
            }
          : {
              schema: sch[schemaProp],
              schemaPath: (0,
              codegen_12._)`${it.schemaPath}${(0, codegen_12.getProperty)(keyword2)}${(0, codegen_12.getProperty)(schemaProp)}`,
              errSchemaPath: `${it.errSchemaPath}/${keyword2}/${(0, util_12.escapeFragment)(schemaProp)}`
            }
      }
      if (schema !== void 0) {
        if (schemaPath === void 0 || errSchemaPath === void 0 || topSchemaRef === void 0) {
          throw new Error('"schemaPath", "errSchemaPath" and "topSchemaRef" are required with "schema"')
        }
        return {
          schema,
          schemaPath,
          topSchemaRef,
          errSchemaPath
        }
      }
      throw new Error('either "keyword" or "schema" must be passed')
    }
    subschema.getSubschema = getSubschema
    function extendSubschemaData(
      subschema2,
      it,
      { dataProp, dataPropType: dpType, data: data2, dataTypes, propertyName }
    ) {
      if (data2 !== void 0 && dataProp !== void 0) {
        throw new Error('both "data" and "dataProp" passed, only one allowed')
      }
      const { gen } = it
      if (dataProp !== void 0) {
        const { errorPath, dataPathArr, opts } = it
        const nextData = gen.let('data', (0, codegen_12._)`${it.data}${(0, codegen_12.getProperty)(dataProp)}`, true)
        dataContextProps(nextData)
        subschema2.errorPath = (0,
        codegen_12.str)`${errorPath}${(0, util_12.getErrorPath)(dataProp, dpType, opts.jsPropertySyntax)}`
        subschema2.parentDataProperty = (0, codegen_12._)`${dataProp}`
        subschema2.dataPathArr = [...dataPathArr, subschema2.parentDataProperty]
      }
      if (data2 !== void 0) {
        const nextData = data2 instanceof codegen_12.Name ? data2 : gen.let('data', data2, true)
        dataContextProps(nextData)
        if (propertyName !== void 0) subschema2.propertyName = propertyName
      }
      if (dataTypes) subschema2.dataTypes = dataTypes
      function dataContextProps(_nextData) {
        subschema2.data = _nextData
        subschema2.dataLevel = it.dataLevel + 1
        subschema2.dataTypes = []
        it.definedProperties = /* @__PURE__ */ new Set()
        subschema2.parentData = it.data
        subschema2.dataNames = [...it.dataNames, _nextData]
      }
    }
    subschema.extendSubschemaData = extendSubschemaData
    function extendSubschemaMode(
      subschema2,
      { jtdDiscriminator, jtdMetadata, compositeRule, createErrors, allErrors }
    ) {
      if (compositeRule !== void 0) subschema2.compositeRule = compositeRule
      if (createErrors !== void 0) subschema2.createErrors = createErrors
      if (allErrors !== void 0) subschema2.allErrors = allErrors
      subschema2.jtdDiscriminator = jtdDiscriminator
      subschema2.jtdMetadata = jtdMetadata
    }
    subschema.extendSubschemaMode = extendSubschemaMode
    return subschema
  }
  var resolve$6 = {}
  var fastDeepEqual = function equal2(a, b) {
    if (a === b) return true
    if (a && b && typeof a == 'object' && typeof b == 'object') {
      if (a.constructor !== b.constructor) return false
      var length, i, keys
      if (Array.isArray(a)) {
        length = a.length
        if (length != b.length) return false
        for (i = length; i-- !== 0; ) if (!equal2(a[i], b[i])) return false
        return true
      }
      if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags
      if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf()
      if (a.toString !== Object.prototype.toString) return a.toString() === b.toString()
      keys = Object.keys(a)
      length = keys.length
      if (length !== Object.keys(b).length) return false
      for (i = length; i-- !== 0; ) if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false
      for (i = length; i-- !== 0; ) {
        var key = keys[i]
        if (!equal2(a[key], b[key])) return false
      }
      return true
    }
    return a !== a && b !== b
  }
  var jsonSchemaTraverse$1 = { exports: {} }
  var traverse$3 = (jsonSchemaTraverse$1.exports = function (schema, opts, cb) {
    if (typeof opts == 'function') {
      cb = opts
      opts = {}
    }
    cb = opts.cb || cb
    var pre = typeof cb == 'function' ? cb : cb.pre || function () {}
    var post = cb.post || function () {}
    _traverse$1(opts, pre, post, schema, '', schema)
  })
  traverse$3.keywords = {
    additionalItems: true,
    items: true,
    contains: true,
    additionalProperties: true,
    propertyNames: true,
    not: true,
    if: true,
    then: true,
    else: true
  }
  traverse$3.arrayKeywords = {
    items: true,
    allOf: true,
    anyOf: true,
    oneOf: true
  }
  traverse$3.propsKeywords = {
    $defs: true,
    definitions: true,
    properties: true,
    patternProperties: true,
    dependencies: true
  }
  traverse$3.skipKeywords = {
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
  }
  function _traverse$1(
    opts,
    pre,
    post,
    schema,
    jsonPtr,
    rootSchema,
    parentJsonPtr,
    parentKeyword,
    parentSchema,
    keyIndex
  ) {
    if (schema && typeof schema == 'object' && !Array.isArray(schema)) {
      pre(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex)
      for (var key in schema) {
        var sch = schema[key]
        if (Array.isArray(sch)) {
          if (key in traverse$3.arrayKeywords) {
            for (var i = 0; i < sch.length; i++)
              _traverse$1(opts, pre, post, sch[i], jsonPtr + '/' + key + '/' + i, rootSchema, jsonPtr, key, schema, i)
          }
        } else if (key in traverse$3.propsKeywords) {
          if (sch && typeof sch == 'object') {
            for (var prop in sch)
              _traverse$1(
                opts,
                pre,
                post,
                sch[prop],
                jsonPtr + '/' + key + '/' + escapeJsonPtr$1(prop),
                rootSchema,
                jsonPtr,
                key,
                schema,
                prop
              )
          }
        } else if (key in traverse$3.keywords || (opts.allKeys && !(key in traverse$3.skipKeywords))) {
          _traverse$1(opts, pre, post, sch, jsonPtr + '/' + key, rootSchema, jsonPtr, key, schema)
        }
      }
      post(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex)
    }
  }
  function escapeJsonPtr$1(str) {
    return str.replace(/~/g, '~0').replace(/\//g, '~1')
  }
  var jsonSchemaTraverseExports$1 = jsonSchemaTraverse$1.exports
  Object.defineProperty(resolve$6, '__esModule', { value: true })
  resolve$6.getSchemaRefs =
    resolve$6.resolveUrl =
    resolve$6.normalizeId =
    resolve$6._getFullPath =
    resolve$6.getFullPath =
    resolve$6.inlineRef =
      void 0
  const util_1$l = util$7
  const equal$5 = fastDeepEqual
  const traverse$2 = jsonSchemaTraverseExports$1
  const SIMPLE_INLINED$1 = /* @__PURE__ */ new Set([
    'type',
    'format',
    'pattern',
    'maxLength',
    'minLength',
    'maxProperties',
    'minProperties',
    'maxItems',
    'minItems',
    'maximum',
    'minimum',
    'uniqueItems',
    'multipleOf',
    'required',
    'enum',
    'const'
  ])
  function inlineRef$1(schema, limit = true) {
    if (typeof schema == 'boolean') return true
    if (limit === true) return !hasRef(schema)
    if (!limit) return false
    return countKeys$1(schema) <= limit
  }
  resolve$6.inlineRef = inlineRef$1
  const REF_KEYWORDS = /* @__PURE__ */ new Set([
    '$ref',
    '$recursiveRef',
    '$recursiveAnchor',
    '$dynamicRef',
    '$dynamicAnchor'
  ])
  function hasRef(schema) {
    for (const key in schema) {
      if (REF_KEYWORDS.has(key)) return true
      const sch = schema[key]
      if (Array.isArray(sch) && sch.some(hasRef)) return true
      if (typeof sch == 'object' && hasRef(sch)) return true
    }
    return false
  }
  function countKeys$1(schema) {
    let count = 0
    for (const key in schema) {
      if (key === '$ref') return Infinity
      count++
      if (SIMPLE_INLINED$1.has(key)) continue
      if (typeof schema[key] == 'object') {
        ;(0, util_1$l.eachItem)(schema[key], (sch) => (count += countKeys$1(sch)))
      }
      if (count === Infinity) return Infinity
    }
    return count
  }
  function getFullPath$1(resolver, id2 = '', normalize2) {
    if (normalize2 !== false) id2 = normalizeId$1(id2)
    const p = resolver.parse(id2)
    return _getFullPath$1(resolver, p)
  }
  resolve$6.getFullPath = getFullPath$1
  function _getFullPath$1(resolver, p) {
    const serialized = resolver.serialize(p)
    return serialized.split('#')[0] + '#'
  }
  resolve$6._getFullPath = _getFullPath$1
  const TRAILING_SLASH_HASH$1 = /#\/?$/
  function normalizeId$1(id2) {
    return id2 ? id2.replace(TRAILING_SLASH_HASH$1, '') : ''
  }
  resolve$6.normalizeId = normalizeId$1
  function resolveUrl$1(resolver, baseId, id2) {
    id2 = normalizeId$1(id2)
    return resolver.resolve(baseId, id2)
  }
  resolve$6.resolveUrl = resolveUrl$1
  const ANCHOR = /^[a-z_][-a-z0-9._]*$/i
  function getSchemaRefs(schema, baseId) {
    if (typeof schema == 'boolean') return {}
    const { schemaId, uriResolver } = this.opts
    const schId = normalizeId$1(schema[schemaId] || baseId)
    const baseIds = { '': schId }
    const pathPrefix = getFullPath$1(uriResolver, schId, false)
    const localRefs = {}
    const schemaRefs = /* @__PURE__ */ new Set()
    traverse$2(schema, { allKeys: true }, (sch, jsonPtr, _, parentJsonPtr) => {
      if (parentJsonPtr === void 0) return
      const fullPath = pathPrefix + jsonPtr
      let innerBaseId = baseIds[parentJsonPtr]
      if (typeof sch[schemaId] == 'string') innerBaseId = addRef.call(this, sch[schemaId])
      addAnchor.call(this, sch.$anchor)
      addAnchor.call(this, sch.$dynamicAnchor)
      baseIds[jsonPtr] = innerBaseId
      function addRef(ref2) {
        const _resolve = this.opts.uriResolver.resolve
        ref2 = normalizeId$1(innerBaseId ? _resolve(innerBaseId, ref2) : ref2)
        if (schemaRefs.has(ref2)) throw ambiguos(ref2)
        schemaRefs.add(ref2)
        let schOrRef = this.refs[ref2]
        if (typeof schOrRef == 'string') schOrRef = this.refs[schOrRef]
        if (typeof schOrRef == 'object') {
          checkAmbiguosRef(sch, schOrRef.schema, ref2)
        } else if (ref2 !== normalizeId$1(fullPath)) {
          if (ref2[0] === '#') {
            checkAmbiguosRef(sch, localRefs[ref2], ref2)
            localRefs[ref2] = sch
          } else {
            this.refs[ref2] = fullPath
          }
        }
        return ref2
      }
      function addAnchor(anchor) {
        if (typeof anchor == 'string') {
          if (!ANCHOR.test(anchor)) throw new Error(`invalid anchor "${anchor}"`)
          addRef.call(this, `#${anchor}`)
        }
      }
    })
    return localRefs
    function checkAmbiguosRef(sch1, sch2, ref2) {
      if (sch2 !== void 0 && !equal$5(sch1, sch2)) throw ambiguos(ref2)
    }
    function ambiguos(ref2) {
      return new Error(`reference "${ref2}" resolves to more than one schema`)
    }
  }
  resolve$6.getSchemaRefs = getSchemaRefs
  var hasRequiredValidate
  function requireValidate() {
    if (hasRequiredValidate) return validate$2
    hasRequiredValidate = 1
    Object.defineProperty(validate$2, '__esModule', { value: true })
    validate$2.getData = validate$2.KeywordCxt = validate$2.validateFunctionCode = void 0
    const boolSchema_1 = requireBoolSchema()
    const dataType_12 = dataType
    const applicability_12 = applicability
    const dataType_2 = dataType
    const defaults_1 = requireDefaults()
    const keyword_1 = requireKeyword()
    const subschema_1 = requireSubschema()
    const codegen_12 = codegen
    const names_12 = names$1
    const resolve_12 = resolve$6
    const util_12 = util$7
    const errors_12 = errors
    function validateFunctionCode(it) {
      if (isSchemaObj(it)) {
        checkKeywords(it)
        if (schemaCxtHasRules(it)) {
          topSchemaObjCode(it)
          return
        }
      }
      validateFunction(it, () => (0, boolSchema_1.topBoolOrEmptySchema)(it))
    }
    validate$2.validateFunctionCode = validateFunctionCode
    function validateFunction({ gen, validateName, schema, schemaEnv, opts }, body) {
      if (opts.code.es5) {
        gen.func(
          validateName,
          (0, codegen_12._)`${names_12.default.data}, ${names_12.default.valCxt}`,
          schemaEnv.$async,
          () => {
            gen.code((0, codegen_12._)`"use strict"; ${funcSourceUrl(schema, opts)}`)
            destructureValCxtES5(gen, opts)
            gen.code(body)
          }
        )
      } else {
        gen.func(
          validateName,
          (0, codegen_12._)`${names_12.default.data}, ${destructureValCxt(opts)}`,
          schemaEnv.$async,
          () => gen.code(funcSourceUrl(schema, opts)).code(body)
        )
      }
    }
    function destructureValCxt(opts) {
      return (0,
      codegen_12._)`{${names_12.default.instancePath}="", ${names_12.default.parentData}, ${names_12.default.parentDataProperty}, ${names_12.default.rootData}=${names_12.default.data}${opts.dynamicRef ? (0, codegen_12._)`, ${names_12.default.dynamicAnchors}={}` : codegen_12.nil}}={}`
    }
    function destructureValCxtES5(gen, opts) {
      gen.if(
        names_12.default.valCxt,
        () => {
          gen.var(
            names_12.default.instancePath,
            (0, codegen_12._)`${names_12.default.valCxt}.${names_12.default.instancePath}`
          )
          gen.var(
            names_12.default.parentData,
            (0, codegen_12._)`${names_12.default.valCxt}.${names_12.default.parentData}`
          )
          gen.var(
            names_12.default.parentDataProperty,
            (0, codegen_12._)`${names_12.default.valCxt}.${names_12.default.parentDataProperty}`
          )
          gen.var(names_12.default.rootData, (0, codegen_12._)`${names_12.default.valCxt}.${names_12.default.rootData}`)
          if (opts.dynamicRef)
            gen.var(
              names_12.default.dynamicAnchors,
              (0, codegen_12._)`${names_12.default.valCxt}.${names_12.default.dynamicAnchors}`
            )
        },
        () => {
          gen.var(names_12.default.instancePath, (0, codegen_12._)`""`)
          gen.var(names_12.default.parentData, (0, codegen_12._)`undefined`)
          gen.var(names_12.default.parentDataProperty, (0, codegen_12._)`undefined`)
          gen.var(names_12.default.rootData, names_12.default.data)
          if (opts.dynamicRef) gen.var(names_12.default.dynamicAnchors, (0, codegen_12._)`{}`)
        }
      )
    }
    function topSchemaObjCode(it) {
      const { schema, opts, gen } = it
      validateFunction(it, () => {
        if (opts.$comment && schema.$comment) commentKeyword(it)
        checkNoDefault(it)
        gen.let(names_12.default.vErrors, null)
        gen.let(names_12.default.errors, 0)
        if (opts.unevaluated) resetEvaluated(it)
        typeAndKeywords(it)
        returnResults(it)
      })
      return
    }
    function resetEvaluated(it) {
      const { gen, validateName } = it
      it.evaluated = gen.const('evaluated', (0, codegen_12._)`${validateName}.evaluated`)
      gen.if((0, codegen_12._)`${it.evaluated}.dynamicProps`, () =>
        gen.assign((0, codegen_12._)`${it.evaluated}.props`, (0, codegen_12._)`undefined`)
      )
      gen.if((0, codegen_12._)`${it.evaluated}.dynamicItems`, () =>
        gen.assign((0, codegen_12._)`${it.evaluated}.items`, (0, codegen_12._)`undefined`)
      )
    }
    function funcSourceUrl(schema, opts) {
      const schId = typeof schema == 'object' && schema[opts.schemaId]
      return schId && (opts.code.source || opts.code.process)
        ? (0, codegen_12._)`/*# sourceURL=${schId} */`
        : codegen_12.nil
    }
    function subschemaCode(it, valid) {
      if (isSchemaObj(it)) {
        checkKeywords(it)
        if (schemaCxtHasRules(it)) {
          subSchemaObjCode(it, valid)
          return
        }
      }
      ;(0, boolSchema_1.boolOrEmptySchema)(it, valid)
    }
    function schemaCxtHasRules({ schema, self: self2 }) {
      if (typeof schema == 'boolean') return !schema
      for (const key in schema) if (self2.RULES.all[key]) return true
      return false
    }
    function isSchemaObj(it) {
      return typeof it.schema != 'boolean'
    }
    function subSchemaObjCode(it, valid) {
      const { schema, gen, opts } = it
      if (opts.$comment && schema.$comment) commentKeyword(it)
      updateContext(it)
      checkAsyncSchema(it)
      const errsCount = gen.const('_errs', names_12.default.errors)
      typeAndKeywords(it, errsCount)
      gen.var(valid, (0, codegen_12._)`${errsCount} === ${names_12.default.errors}`)
    }
    function checkKeywords(it) {
      ;(0, util_12.checkUnknownRules)(it)
      checkRefsAndKeywords(it)
    }
    function typeAndKeywords(it, errsCount) {
      if (it.opts.jtd) return schemaKeywords(it, [], false, errsCount)
      const types2 = (0, dataType_12.getSchemaTypes)(it.schema)
      const checkedTypes = (0, dataType_12.coerceAndCheckDataType)(it, types2)
      schemaKeywords(it, types2, !checkedTypes, errsCount)
    }
    function checkRefsAndKeywords(it) {
      const { schema, errSchemaPath, opts, self: self2 } = it
      if (schema.$ref && opts.ignoreKeywordsWithRef && (0, util_12.schemaHasRulesButRef)(schema, self2.RULES)) {
        self2.logger.warn(`$ref: keywords ignored in schema at path "${errSchemaPath}"`)
      }
    }
    function checkNoDefault(it) {
      const { schema, opts } = it
      if (schema.default !== void 0 && opts.useDefaults && opts.strictSchema) {
        ;(0, util_12.checkStrictMode)(it, 'default is ignored in the schema root')
      }
    }
    function updateContext(it) {
      const schId = it.schema[it.opts.schemaId]
      if (schId) it.baseId = (0, resolve_12.resolveUrl)(it.opts.uriResolver, it.baseId, schId)
    }
    function checkAsyncSchema(it) {
      if (it.schema.$async && !it.schemaEnv.$async) throw new Error('async schema in sync schema')
    }
    function commentKeyword({ gen, schemaEnv, schema, errSchemaPath, opts }) {
      const msg = schema.$comment
      if (opts.$comment === true) {
        gen.code((0, codegen_12._)`${names_12.default.self}.logger.log(${msg})`)
      } else if (typeof opts.$comment == 'function') {
        const schemaPath = (0, codegen_12.str)`${errSchemaPath}/$comment`
        const rootName = gen.scopeValue('root', { ref: schemaEnv.root })
        gen.code((0, codegen_12._)`${names_12.default.self}.opts.$comment(${msg}, ${schemaPath}, ${rootName}.schema)`)
      }
    }
    function returnResults(it) {
      const { gen, schemaEnv, validateName, ValidationError: ValidationError2, opts } = it
      if (schemaEnv.$async) {
        gen.if(
          (0, codegen_12._)`${names_12.default.errors} === 0`,
          () => gen.return(names_12.default.data),
          () => gen.throw((0, codegen_12._)`new ${ValidationError2}(${names_12.default.vErrors})`)
        )
      } else {
        gen.assign((0, codegen_12._)`${validateName}.errors`, names_12.default.vErrors)
        if (opts.unevaluated) assignEvaluated(it)
        gen.return((0, codegen_12._)`${names_12.default.errors} === 0`)
      }
    }
    function assignEvaluated({ gen, evaluated, props, items: items2 }) {
      if (props instanceof codegen_12.Name) gen.assign((0, codegen_12._)`${evaluated}.props`, props)
      if (items2 instanceof codegen_12.Name) gen.assign((0, codegen_12._)`${evaluated}.items`, items2)
    }
    function schemaKeywords(it, types2, typeErrors, errsCount) {
      const { gen, schema, data: data2, allErrors, opts, self: self2 } = it
      const { RULES } = self2
      if (schema.$ref && (opts.ignoreKeywordsWithRef || !(0, util_12.schemaHasRulesButRef)(schema, RULES))) {
        gen.block(() => keywordCode(it, '$ref', RULES.all.$ref.definition))
        return
      }
      if (!opts.jtd) checkStrictTypes(it, types2)
      gen.block(() => {
        for (const group of RULES.rules) groupKeywords(group)
        groupKeywords(RULES.post)
      })
      function groupKeywords(group) {
        if (!(0, applicability_12.shouldUseGroup)(schema, group)) return
        if (group.type) {
          gen.if((0, dataType_2.checkDataType)(group.type, data2, opts.strictNumbers))
          iterateKeywords(it, group)
          if (types2.length === 1 && types2[0] === group.type && typeErrors) {
            gen.else()
            ;(0, dataType_2.reportTypeError)(it)
          }
          gen.endIf()
        } else {
          iterateKeywords(it, group)
        }
        if (!allErrors) gen.if((0, codegen_12._)`${names_12.default.errors} === ${errsCount || 0}`)
      }
    }
    function iterateKeywords(it, group) {
      const {
        gen,
        schema,
        opts: { useDefaults }
      } = it
      if (useDefaults) (0, defaults_1.assignDefaults)(it, group.type)
      gen.block(() => {
        for (const rule of group.rules) {
          if ((0, applicability_12.shouldUseRule)(schema, rule)) {
            keywordCode(it, rule.keyword, rule.definition, group.type)
          }
        }
      })
    }
    function checkStrictTypes(it, types2) {
      if (it.schemaEnv.meta || !it.opts.strictTypes) return
      checkContextTypes(it, types2)
      if (!it.opts.allowUnionTypes) checkMultipleTypes(it, types2)
      checkKeywordTypes(it, it.dataTypes)
    }
    function checkContextTypes(it, types2) {
      if (!types2.length) return
      if (!it.dataTypes.length) {
        it.dataTypes = types2
        return
      }
      types2.forEach((t) => {
        if (!includesType(it.dataTypes, t)) {
          strictTypesError(it, `type "${t}" not allowed by context "${it.dataTypes.join(',')}"`)
        }
      })
      narrowSchemaTypes(it, types2)
    }
    function checkMultipleTypes(it, ts) {
      if (ts.length > 1 && !(ts.length === 2 && ts.includes('null'))) {
        strictTypesError(it, 'use allowUnionTypes to allow union type keyword')
      }
    }
    function checkKeywordTypes(it, ts) {
      const rules2 = it.self.RULES.all
      for (const keyword2 in rules2) {
        const rule = rules2[keyword2]
        if (typeof rule == 'object' && (0, applicability_12.shouldUseRule)(it.schema, rule)) {
          const { type: type2 } = rule.definition
          if (type2.length && !type2.some((t) => hasApplicableType(ts, t))) {
            strictTypesError(it, `missing type "${type2.join(',')}" for keyword "${keyword2}"`)
          }
        }
      }
    }
    function hasApplicableType(schTs, kwdT) {
      return schTs.includes(kwdT) || (kwdT === 'number' && schTs.includes('integer'))
    }
    function includesType(ts, t) {
      return ts.includes(t) || (t === 'integer' && ts.includes('number'))
    }
    function narrowSchemaTypes(it, withTypes) {
      const ts = []
      for (const t of it.dataTypes) {
        if (includesType(withTypes, t)) ts.push(t)
        else if (withTypes.includes('integer') && t === 'number') ts.push('integer')
      }
      it.dataTypes = ts
    }
    function strictTypesError(it, msg) {
      const schemaPath = it.schemaEnv.baseId + it.errSchemaPath
      msg += ` at "${schemaPath}" (strictTypes)`
      ;(0, util_12.checkStrictMode)(it, msg, it.opts.strictTypes)
    }
    class KeywordCxt {
      constructor(it, def2, keyword2) {
        ;(0, keyword_1.validateKeywordUsage)(it, def2, keyword2)
        this.gen = it.gen
        this.allErrors = it.allErrors
        this.keyword = keyword2
        this.data = it.data
        this.schema = it.schema[keyword2]
        this.$data = def2.$data && it.opts.$data && this.schema && this.schema.$data
        this.schemaValue = (0, util_12.schemaRefOrVal)(it, this.schema, keyword2, this.$data)
        this.schemaType = def2.schemaType
        this.parentSchema = it.schema
        this.params = {}
        this.it = it
        this.def = def2
        if (this.$data) {
          this.schemaCode = it.gen.const('vSchema', getData2(this.$data, it))
        } else {
          this.schemaCode = this.schemaValue
          if (!(0, keyword_1.validSchemaType)(this.schema, def2.schemaType, def2.allowUndefined)) {
            throw new Error(`${keyword2} value must be ${JSON.stringify(def2.schemaType)}`)
          }
        }
        if ('code' in def2 ? def2.trackErrors : def2.errors !== false) {
          this.errsCount = it.gen.const('_errs', names_12.default.errors)
        }
      }
      result(condition, successAction, failAction) {
        this.failResult((0, codegen_12.not)(condition), successAction, failAction)
      }
      failResult(condition, successAction, failAction) {
        this.gen.if(condition)
        if (failAction) failAction()
        else this.error()
        if (successAction) {
          this.gen.else()
          successAction()
          if (this.allErrors) this.gen.endIf()
        } else {
          if (this.allErrors) this.gen.endIf()
          else this.gen.else()
        }
      }
      pass(condition, failAction) {
        this.failResult((0, codegen_12.not)(condition), void 0, failAction)
      }
      fail(condition) {
        if (condition === void 0) {
          this.error()
          if (!this.allErrors) this.gen.if(false)
          return
        }
        this.gen.if(condition)
        this.error()
        if (this.allErrors) this.gen.endIf()
        else this.gen.else()
      }
      fail$data(condition) {
        if (!this.$data) return this.fail(condition)
        const { schemaCode } = this
        this.fail(
          (0, codegen_12._)`${schemaCode} !== undefined && (${(0, codegen_12.or)(this.invalid$data(), condition)})`
        )
      }
      error(append, errorParams, errorPaths) {
        if (errorParams) {
          this.setParams(errorParams)
          this._error(append, errorPaths)
          this.setParams({})
          return
        }
        this._error(append, errorPaths)
      }
      _error(append, errorPaths) {
        ;(append ? errors_12.reportExtraError : errors_12.reportError)(this, this.def.error, errorPaths)
      }
      $dataError() {
        ;(0, errors_12.reportError)(this, this.def.$dataError || errors_12.keyword$DataError)
      }
      reset() {
        if (this.errsCount === void 0) throw new Error('add "trackErrors" to keyword definition')
        ;(0, errors_12.resetErrorsCount)(this.gen, this.errsCount)
      }
      ok(cond) {
        if (!this.allErrors) this.gen.if(cond)
      }
      setParams(obj, assign) {
        if (assign) Object.assign(this.params, obj)
        else this.params = obj
      }
      block$data(valid, codeBlock, $dataValid = codegen_12.nil) {
        this.gen.block(() => {
          this.check$data(valid, $dataValid)
          codeBlock()
        })
      }
      check$data(valid = codegen_12.nil, $dataValid = codegen_12.nil) {
        if (!this.$data) return
        const { gen, schemaCode, schemaType, def: def2 } = this
        gen.if((0, codegen_12.or)((0, codegen_12._)`${schemaCode} === undefined`, $dataValid))
        if (valid !== codegen_12.nil) gen.assign(valid, true)
        if (schemaType.length || def2.validateSchema) {
          gen.elseIf(this.invalid$data())
          this.$dataError()
          if (valid !== codegen_12.nil) gen.assign(valid, false)
        }
        gen.else()
      }
      invalid$data() {
        const { gen, schemaCode, schemaType, def: def2, it } = this
        return (0, codegen_12.or)(wrong$DataType(), invalid$DataSchema())
        function wrong$DataType() {
          if (schemaType.length) {
            if (!(schemaCode instanceof codegen_12.Name)) throw new Error('ajv implementation error')
            const st = Array.isArray(schemaType) ? schemaType : [schemaType]
            return (0,
            codegen_12._)`${(0, dataType_2.checkDataTypes)(st, schemaCode, it.opts.strictNumbers, dataType_2.DataType.Wrong)}`
          }
          return codegen_12.nil
        }
        function invalid$DataSchema() {
          if (def2.validateSchema) {
            const validateSchemaRef = gen.scopeValue('validate$data', { ref: def2.validateSchema })
            return (0, codegen_12._)`!${validateSchemaRef}(${schemaCode})`
          }
          return codegen_12.nil
        }
      }
      subschema(appl, valid) {
        const subschema2 = (0, subschema_1.getSubschema)(this.it, appl)
        ;(0, subschema_1.extendSubschemaData)(subschema2, this.it, appl)
        ;(0, subschema_1.extendSubschemaMode)(subschema2, appl)
        const nextContext = { ...this.it, ...subschema2, items: void 0, props: void 0 }
        subschemaCode(nextContext, valid)
        return nextContext
      }
      mergeEvaluated(schemaCxt, toName) {
        const { it, gen } = this
        if (!it.opts.unevaluated) return
        if (it.props !== true && schemaCxt.props !== void 0) {
          it.props = util_12.mergeEvaluated.props(gen, schemaCxt.props, it.props, toName)
        }
        if (it.items !== true && schemaCxt.items !== void 0) {
          it.items = util_12.mergeEvaluated.items(gen, schemaCxt.items, it.items, toName)
        }
      }
      mergeValidEvaluated(schemaCxt, valid) {
        const { it, gen } = this
        if (it.opts.unevaluated && (it.props !== true || it.items !== true)) {
          gen.if(valid, () => this.mergeEvaluated(schemaCxt, codegen_12.Name))
          return true
        }
      }
    }
    validate$2.KeywordCxt = KeywordCxt
    function keywordCode(it, keyword2, def2, ruleType) {
      const cxt = new KeywordCxt(it, def2, keyword2)
      if ('code' in def2) {
        def2.code(cxt, ruleType)
      } else if (cxt.$data && def2.validate) {
        ;(0, keyword_1.funcKeywordCode)(cxt, def2)
      } else if ('macro' in def2) {
        ;(0, keyword_1.macroKeywordCode)(cxt, def2)
      } else if (def2.compile || def2.validate) {
        ;(0, keyword_1.funcKeywordCode)(cxt, def2)
      }
    }
    const JSON_POINTER2 = /^\/(?:[^~]|~0|~1)*$/
    const RELATIVE_JSON_POINTER2 = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/
    function getData2($data, { dataLevel, dataNames, dataPathArr }) {
      let jsonPointer
      let data2
      if ($data === '') return names_12.default.rootData
      if ($data[0] === '/') {
        if (!JSON_POINTER2.test($data)) throw new Error(`Invalid JSON-pointer: ${$data}`)
        jsonPointer = $data
        data2 = names_12.default.rootData
      } else {
        const matches = RELATIVE_JSON_POINTER2.exec($data)
        if (!matches) throw new Error(`Invalid JSON-pointer: ${$data}`)
        const up = +matches[1]
        jsonPointer = matches[2]
        if (jsonPointer === '#') {
          if (up >= dataLevel) throw new Error(errorMsg('property/index', up))
          return dataPathArr[dataLevel - up]
        }
        if (up > dataLevel) throw new Error(errorMsg('data', up))
        data2 = dataNames[dataLevel - up]
        if (!jsonPointer) return data2
      }
      let expr = data2
      const segments = jsonPointer.split('/')
      for (const segment of segments) {
        if (segment) {
          data2 = (0, codegen_12._)`${data2}${(0, codegen_12.getProperty)((0, util_12.unescapeJsonPointer)(segment))}`
          expr = (0, codegen_12._)`${expr} && ${data2}`
        }
      }
      return expr
      function errorMsg(pointerType, up) {
        return `Cannot access ${pointerType} ${up} levels up, current level is ${dataLevel}`
      }
    }
    validate$2.getData = getData2
    return validate$2
  }
  var validation_error = {}
  var hasRequiredValidation_error
  function requireValidation_error() {
    if (hasRequiredValidation_error) return validation_error
    hasRequiredValidation_error = 1
    Object.defineProperty(validation_error, '__esModule', { value: true })
    class ValidationError2 extends Error {
      constructor(errors2) {
        super('validation failed')
        this.errors = errors2
        this.ajv = this.validation = true
      }
    }
    validation_error.default = ValidationError2
    return validation_error
  }
  var ref_error = {}
  Object.defineProperty(ref_error, '__esModule', { value: true })
  const resolve_1$2 = resolve$6
  let MissingRefError$2 = class MissingRefError extends Error {
    constructor(resolver, baseId, ref2, msg) {
      super(msg || `can't resolve reference ${ref2} from id ${baseId}`)
      this.missingRef = (0, resolve_1$2.resolveUrl)(resolver, baseId, ref2)
      this.missingSchema = (0, resolve_1$2.normalizeId)((0, resolve_1$2.getFullPath)(resolver, this.missingRef))
    }
  }
  ref_error.default = MissingRefError$2
  var compile$2 = {}
  Object.defineProperty(compile$2, '__esModule', { value: true })
  compile$2.resolveSchema =
    compile$2.getCompilingSchema =
    compile$2.resolveRef =
    compile$2.compileSchema =
    compile$2.SchemaEnv =
      void 0
  const codegen_1$m = codegen
  const validation_error_1 = requireValidation_error()
  const names_1$2 = names$1
  const resolve_1$1 = resolve$6
  const util_1$k = util$7
  const validate_1$1 = requireValidate()
  class SchemaEnv {
    constructor(env) {
      var _a
      this.refs = {}
      this.dynamicAnchors = {}
      let schema
      if (typeof env.schema == 'object') schema = env.schema
      this.schema = env.schema
      this.schemaId = env.schemaId
      this.root = env.root || this
      this.baseId =
        (_a = env.baseId) !== null && _a !== void 0
          ? _a
          : (0, resolve_1$1.normalizeId)(schema === null || schema === void 0 ? void 0 : schema[env.schemaId || '$id'])
      this.schemaPath = env.schemaPath
      this.localRefs = env.localRefs
      this.meta = env.meta
      this.$async = schema === null || schema === void 0 ? void 0 : schema.$async
      this.refs = {}
    }
  }
  compile$2.SchemaEnv = SchemaEnv
  function compileSchema$1(sch) {
    const _sch = getCompilingSchema.call(this, sch)
    if (_sch) return _sch
    const rootId = (0, resolve_1$1.getFullPath)(this.opts.uriResolver, sch.root.baseId)
    const { es5, lines } = this.opts.code
    const { ownProperties } = this.opts
    const gen = new codegen_1$m.CodeGen(this.scope, { es5, lines, ownProperties })
    let _ValidationError
    if (sch.$async) {
      _ValidationError = gen.scopeValue('Error', {
        ref: validation_error_1.default,
        code: (0, codegen_1$m._)`require("ajv/dist/runtime/validation_error").default`
      })
    }
    const validateName = gen.scopeName('validate')
    sch.validateName = validateName
    const schemaCxt = {
      gen,
      allErrors: this.opts.allErrors,
      data: names_1$2.default.data,
      parentData: names_1$2.default.parentData,
      parentDataProperty: names_1$2.default.parentDataProperty,
      dataNames: [names_1$2.default.data],
      dataPathArr: [codegen_1$m.nil],
      // TODO can its length be used as dataLevel if nil is removed?
      dataLevel: 0,
      dataTypes: [],
      definedProperties: /* @__PURE__ */ new Set(),
      topSchemaRef: gen.scopeValue(
        'schema',
        this.opts.code.source === true
          ? { ref: sch.schema, code: (0, codegen_1$m.stringify)(sch.schema) }
          : { ref: sch.schema }
      ),
      validateName,
      ValidationError: _ValidationError,
      schema: sch.schema,
      schemaEnv: sch,
      rootId,
      baseId: sch.baseId || rootId,
      schemaPath: codegen_1$m.nil,
      errSchemaPath: sch.schemaPath || (this.opts.jtd ? '' : '#'),
      errorPath: (0, codegen_1$m._)`""`,
      opts: this.opts,
      self: this
    }
    let sourceCode
    try {
      this._compilations.add(sch)
      ;(0, validate_1$1.validateFunctionCode)(schemaCxt)
      gen.optimize(this.opts.code.optimize)
      const validateCode = gen.toString()
      sourceCode = `${gen.scopeRefs(names_1$2.default.scope)}return ${validateCode}`
      if (this.opts.code.process) sourceCode = this.opts.code.process(sourceCode, sch)
      const makeValidate = new Function(`${names_1$2.default.self}`, `${names_1$2.default.scope}`, sourceCode)
      const validate2 = makeValidate(this, this.scope.get())
      this.scope.value(validateName, { ref: validate2 })
      validate2.errors = null
      validate2.schema = sch.schema
      validate2.schemaEnv = sch
      if (sch.$async) validate2.$async = true
      if (this.opts.code.source === true) {
        validate2.source = { validateName, validateCode, scopeValues: gen._values }
      }
      if (this.opts.unevaluated) {
        const { props, items: items2 } = schemaCxt
        validate2.evaluated = {
          props: props instanceof codegen_1$m.Name ? void 0 : props,
          items: items2 instanceof codegen_1$m.Name ? void 0 : items2,
          dynamicProps: props instanceof codegen_1$m.Name,
          dynamicItems: items2 instanceof codegen_1$m.Name
        }
        if (validate2.source) validate2.source.evaluated = (0, codegen_1$m.stringify)(validate2.evaluated)
      }
      sch.validate = validate2
      return sch
    } catch (e) {
      delete sch.validate
      delete sch.validateName
      if (sourceCode) this.logger.error('Error compiling schema, function code:', sourceCode)
      throw e
    } finally {
      this._compilations.delete(sch)
    }
  }
  compile$2.compileSchema = compileSchema$1
  function resolveRef(root, baseId, ref2) {
    var _a
    ref2 = (0, resolve_1$1.resolveUrl)(this.opts.uriResolver, baseId, ref2)
    const schOrFunc = root.refs[ref2]
    if (schOrFunc) return schOrFunc
    let _sch = resolve$5.call(this, root, ref2)
    if (_sch === void 0) {
      const schema = (_a = root.localRefs) === null || _a === void 0 ? void 0 : _a[ref2]
      const { schemaId } = this.opts
      if (schema) _sch = new SchemaEnv({ schema, schemaId, root, baseId })
    }
    if (_sch === void 0) return
    return (root.refs[ref2] = inlineOrCompile.call(this, _sch))
  }
  compile$2.resolveRef = resolveRef
  function inlineOrCompile(sch) {
    if ((0, resolve_1$1.inlineRef)(sch.schema, this.opts.inlineRefs)) return sch.schema
    return sch.validate ? sch : compileSchema$1.call(this, sch)
  }
  function getCompilingSchema(schEnv) {
    for (const sch of this._compilations) {
      if (sameSchemaEnv(sch, schEnv)) return sch
    }
  }
  compile$2.getCompilingSchema = getCompilingSchema
  function sameSchemaEnv(s1, s2) {
    return s1.schema === s2.schema && s1.root === s2.root && s1.baseId === s2.baseId
  }
  function resolve$5(root, ref2) {
    let sch
    while (typeof (sch = this.refs[ref2]) == 'string') ref2 = sch
    return sch || this.schemas[ref2] || resolveSchema$1.call(this, root, ref2)
  }
  function resolveSchema$1(root, ref2) {
    const p = this.opts.uriResolver.parse(ref2)
    const refPath = (0, resolve_1$1._getFullPath)(this.opts.uriResolver, p)
    let baseId = (0, resolve_1$1.getFullPath)(this.opts.uriResolver, root.baseId, void 0)
    if (Object.keys(root.schema).length > 0 && refPath === baseId) {
      return getJsonPointer$1.call(this, p, root)
    }
    const id2 = (0, resolve_1$1.normalizeId)(refPath)
    const schOrRef = this.refs[id2] || this.schemas[id2]
    if (typeof schOrRef == 'string') {
      const sch = resolveSchema$1.call(this, root, schOrRef)
      if (typeof (sch === null || sch === void 0 ? void 0 : sch.schema) !== 'object') return
      return getJsonPointer$1.call(this, p, sch)
    }
    if (typeof (schOrRef === null || schOrRef === void 0 ? void 0 : schOrRef.schema) !== 'object') return
    if (!schOrRef.validate) compileSchema$1.call(this, schOrRef)
    if (id2 === (0, resolve_1$1.normalizeId)(ref2)) {
      const { schema } = schOrRef
      const { schemaId } = this.opts
      const schId = schema[schemaId]
      if (schId) baseId = (0, resolve_1$1.resolveUrl)(this.opts.uriResolver, baseId, schId)
      return new SchemaEnv({ schema, schemaId, root, baseId })
    }
    return getJsonPointer$1.call(this, p, schOrRef)
  }
  compile$2.resolveSchema = resolveSchema$1
  const PREVENT_SCOPE_CHANGE$1 = /* @__PURE__ */ new Set([
    'properties',
    'patternProperties',
    'enum',
    'dependencies',
    'definitions'
  ])
  function getJsonPointer$1(parsedRef, { baseId, schema, root }) {
    var _a
    if (((_a = parsedRef.fragment) === null || _a === void 0 ? void 0 : _a[0]) !== '/') return
    for (const part of parsedRef.fragment.slice(1).split('/')) {
      if (typeof schema === 'boolean') return
      const partSchema = schema[(0, util_1$k.unescapeFragment)(part)]
      if (partSchema === void 0) return
      schema = partSchema
      const schId = typeof schema === 'object' && schema[this.opts.schemaId]
      if (!PREVENT_SCOPE_CHANGE$1.has(part) && schId) {
        baseId = (0, resolve_1$1.resolveUrl)(this.opts.uriResolver, baseId, schId)
      }
    }
    let env
    if (typeof schema != 'boolean' && schema.$ref && !(0, util_1$k.schemaHasRulesButRef)(schema, this.RULES)) {
      const $ref = (0, resolve_1$1.resolveUrl)(this.opts.uriResolver, baseId, schema.$ref)
      env = resolveSchema$1.call(this, root, $ref)
    }
    const { schemaId } = this.opts
    env = env || new SchemaEnv({ schema, schemaId, root, baseId })
    if (env.schema !== env.root.schema) return env
    return void 0
  }
  const $id$3 = 'https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#'
  const description$1 = 'Meta-schema for $data reference (JSON AnySchema extension proposal)'
  const type$3 = 'object'
  const required$3 = ['$data']
  const properties$5 = {
    $data: {
      type: 'string',
      anyOf: [
        {
          format: 'relative-json-pointer'
        },
        {
          format: 'json-pointer'
        }
      ]
    }
  }
  const additionalProperties$2 = false
  const require$$9 = {
    $id: $id$3,
    description: description$1,
    type: type$3,
    required: required$3,
    properties: properties$5,
    additionalProperties: additionalProperties$2
  }
  var uri$2 = {}
  var fastUri$1 = { exports: {} }
  const HEX$1 = {
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
  }
  var scopedChars = {
    HEX: HEX$1
  }
  const { HEX } = scopedChars
  const IPV4_REG = /^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$/u
  function normalizeIPv4$1(host) {
    if (findToken(host, '.') < 3) {
      return { host, isIPV4: false }
    }
    const matches = host.match(IPV4_REG) || []
    const [address] = matches
    if (address) {
      return { host: stripLeadingZeros(address, '.'), isIPV4: true }
    } else {
      return { host, isIPV4: false }
    }
  }
  function stringArrayToHexStripped(input, keepZero = false) {
    let acc = ''
    let strip = true
    for (const c of input) {
      if (HEX[c] === void 0) return void 0
      if (c !== '0' && strip === true) strip = false
      if (!strip) acc += c
    }
    if (keepZero && acc.length === 0) acc = '0'
    return acc
  }
  function getIPV6(input) {
    let tokenCount = 0
    const output = { error: false, address: '', zone: '' }
    const address = []
    const buffer = []
    let isZone = false
    let endipv6Encountered = false
    let endIpv6 = false
    function consume() {
      if (buffer.length) {
        if (isZone === false) {
          const hex = stringArrayToHexStripped(buffer)
          if (hex !== void 0) {
            address.push(hex)
          } else {
            output.error = true
            return false
          }
        }
        buffer.length = 0
      }
      return true
    }
    for (let i = 0; i < input.length; i++) {
      const cursor = input[i]
      if (cursor === '[' || cursor === ']') {
        continue
      }
      if (cursor === ':') {
        if (endipv6Encountered === true) {
          endIpv6 = true
        }
        if (!consume()) {
          break
        }
        tokenCount++
        address.push(':')
        if (tokenCount > 7) {
          output.error = true
          break
        }
        if (i - 1 >= 0 && input[i - 1] === ':') {
          endipv6Encountered = true
        }
        continue
      } else if (cursor === '%') {
        if (!consume()) {
          break
        }
        isZone = true
      } else {
        buffer.push(cursor)
        continue
      }
    }
    if (buffer.length) {
      if (isZone) {
        output.zone = buffer.join('')
      } else if (endIpv6) {
        address.push(buffer.join(''))
      } else {
        address.push(stringArrayToHexStripped(buffer))
      }
    }
    output.address = address.join('')
    return output
  }
  function normalizeIPv6$1(host) {
    if (findToken(host, ':') < 2) {
      return { host, isIPV6: false }
    }
    const ipv6 = getIPV6(host)
    if (!ipv6.error) {
      let newHost = ipv6.address
      let escapedHost = ipv6.address
      if (ipv6.zone) {
        newHost += '%' + ipv6.zone
        escapedHost += '%25' + ipv6.zone
      }
      return { host: newHost, escapedHost, isIPV6: true }
    } else {
      return { host, isIPV6: false }
    }
  }
  function stripLeadingZeros(str, token) {
    let out = ''
    let skip = true
    const l = str.length
    for (let i = 0; i < l; i++) {
      const c = str[i]
      if (c === '0' && skip) {
        if ((i + 1 <= l && str[i + 1] === token) || i + 1 === l) {
          out += c
          skip = false
        }
      } else {
        if (c === token) {
          skip = true
        } else {
          skip = false
        }
        out += c
      }
    }
    return out
  }
  function findToken(str, token) {
    let ind = 0
    for (let i = 0; i < str.length; i++) {
      if (str[i] === token) ind++
    }
    return ind
  }
  const RDS1 = /^\.\.?\//u
  const RDS2 = /^\/\.(?:\/|$)/u
  const RDS3 = /^\/\.\.(?:\/|$)/u
  const RDS5 = /^\/?(?:.|\n)*?(?=\/|$)/u
  function removeDotSegments$1(input) {
    const output = []
    while (input.length) {
      if (input.match(RDS1)) {
        input = input.replace(RDS1, '')
      } else if (input.match(RDS2)) {
        input = input.replace(RDS2, '/')
      } else if (input.match(RDS3)) {
        input = input.replace(RDS3, '/')
        output.pop()
      } else if (input === '.' || input === '..') {
        input = ''
      } else {
        const im = input.match(RDS5)
        if (im) {
          const s = im[0]
          input = input.slice(s.length)
          output.push(s)
        } else {
          throw new Error('Unexpected dot segment condition')
        }
      }
    }
    return output.join('')
  }
  function normalizeComponentEncoding$1(components, esc) {
    const func = esc !== true ? escape : unescape
    if (components.scheme !== void 0) {
      components.scheme = func(components.scheme)
    }
    if (components.userinfo !== void 0) {
      components.userinfo = func(components.userinfo)
    }
    if (components.host !== void 0) {
      components.host = func(components.host)
    }
    if (components.path !== void 0) {
      components.path = func(components.path)
    }
    if (components.query !== void 0) {
      components.query = func(components.query)
    }
    if (components.fragment !== void 0) {
      components.fragment = func(components.fragment)
    }
    return components
  }
  function recomposeAuthority$1(components) {
    const uriTokens = []
    if (components.userinfo !== void 0) {
      uriTokens.push(components.userinfo)
      uriTokens.push('@')
    }
    if (components.host !== void 0) {
      let host = unescape(components.host)
      const ipV4res = normalizeIPv4$1(host)
      if (ipV4res.isIPV4) {
        host = ipV4res.host
      } else {
        const ipV6res = normalizeIPv6$1(ipV4res.host)
        if (ipV6res.isIPV6 === true) {
          host = `[${ipV6res.escapedHost}]`
        } else {
          host = components.host
        }
      }
      uriTokens.push(host)
    }
    if (typeof components.port === 'number' || typeof components.port === 'string') {
      uriTokens.push(':')
      uriTokens.push(String(components.port))
    }
    return uriTokens.length ? uriTokens.join('') : void 0
  }
  var utils = {
    recomposeAuthority: recomposeAuthority$1,
    normalizeComponentEncoding: normalizeComponentEncoding$1,
    removeDotSegments: removeDotSegments$1,
    normalizeIPv4: normalizeIPv4$1,
    normalizeIPv6: normalizeIPv6$1
  }
  const UUID_REG = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu
  const URN_REG = /([\da-z][\d\-a-z]{0,31}):((?:[\w!$'()*+,\-.:;=@]|%[\da-f]{2})+)/iu
  function isSecure(wsComponents) {
    return typeof wsComponents.secure === 'boolean'
      ? wsComponents.secure
      : String(wsComponents.scheme).toLowerCase() === 'wss'
  }
  function httpParse(components) {
    if (!components.host) {
      components.error = components.error || 'HTTP URIs must have a host.'
    }
    return components
  }
  function httpSerialize(components) {
    const secure = String(components.scheme).toLowerCase() === 'https'
    if (components.port === (secure ? 443 : 80) || components.port === '') {
      components.port = void 0
    }
    if (!components.path) {
      components.path = '/'
    }
    return components
  }
  function wsParse(wsComponents) {
    wsComponents.secure = isSecure(wsComponents)
    wsComponents.resourceName = (wsComponents.path || '/') + (wsComponents.query ? '?' + wsComponents.query : '')
    wsComponents.path = void 0
    wsComponents.query = void 0
    return wsComponents
  }
  function wsSerialize(wsComponents) {
    if (wsComponents.port === (isSecure(wsComponents) ? 443 : 80) || wsComponents.port === '') {
      wsComponents.port = void 0
    }
    if (typeof wsComponents.secure === 'boolean') {
      wsComponents.scheme = wsComponents.secure ? 'wss' : 'ws'
      wsComponents.secure = void 0
    }
    if (wsComponents.resourceName) {
      const [path, query] = wsComponents.resourceName.split('?')
      wsComponents.path = path && path !== '/' ? path : void 0
      wsComponents.query = query
      wsComponents.resourceName = void 0
    }
    wsComponents.fragment = void 0
    return wsComponents
  }
  function urnParse(urnComponents, options) {
    if (!urnComponents.path) {
      urnComponents.error = 'URN can not be parsed'
      return urnComponents
    }
    const matches = urnComponents.path.match(URN_REG)
    if (matches) {
      const scheme = options.scheme || urnComponents.scheme || 'urn'
      urnComponents.nid = matches[1].toLowerCase()
      urnComponents.nss = matches[2]
      const urnScheme = `${scheme}:${options.nid || urnComponents.nid}`
      const schemeHandler = SCHEMES$1[urnScheme]
      urnComponents.path = void 0
      if (schemeHandler) {
        urnComponents = schemeHandler.parse(urnComponents, options)
      }
    } else {
      urnComponents.error = urnComponents.error || 'URN can not be parsed.'
    }
    return urnComponents
  }
  function urnSerialize(urnComponents, options) {
    const scheme = options.scheme || urnComponents.scheme || 'urn'
    const nid = urnComponents.nid.toLowerCase()
    const urnScheme = `${scheme}:${options.nid || nid}`
    const schemeHandler = SCHEMES$1[urnScheme]
    if (schemeHandler) {
      urnComponents = schemeHandler.serialize(urnComponents, options)
    }
    const uriComponents = urnComponents
    const nss = urnComponents.nss
    uriComponents.path = `${nid || options.nid}:${nss}`
    options.skipEscape = true
    return uriComponents
  }
  function urnuuidParse(urnComponents, options) {
    const uuidComponents = urnComponents
    uuidComponents.uuid = uuidComponents.nss
    uuidComponents.nss = void 0
    if (!options.tolerant && (!uuidComponents.uuid || !UUID_REG.test(uuidComponents.uuid))) {
      uuidComponents.error = uuidComponents.error || 'UUID is not valid.'
    }
    return uuidComponents
  }
  function urnuuidSerialize(uuidComponents) {
    const urnComponents = uuidComponents
    urnComponents.nss = (uuidComponents.uuid || '').toLowerCase()
    return urnComponents
  }
  const http = {
    scheme: 'http',
    domainHost: true,
    parse: httpParse,
    serialize: httpSerialize
  }
  const https = {
    scheme: 'https',
    domainHost: http.domainHost,
    parse: httpParse,
    serialize: httpSerialize
  }
  const ws = {
    scheme: 'ws',
    domainHost: true,
    parse: wsParse,
    serialize: wsSerialize
  }
  const wss = {
    scheme: 'wss',
    domainHost: ws.domainHost,
    parse: ws.parse,
    serialize: ws.serialize
  }
  const urn = {
    scheme: 'urn',
    parse: urnParse,
    serialize: urnSerialize,
    skipNormalize: true
  }
  const urnuuid = {
    scheme: 'urn:uuid',
    parse: urnuuidParse,
    serialize: urnuuidSerialize,
    skipNormalize: true
  }
  const SCHEMES$1 = {
    http,
    https,
    ws,
    wss,
    urn,
    'urn:uuid': urnuuid
  }
  var schemes = SCHEMES$1
  const { normalizeIPv6, normalizeIPv4, removeDotSegments, recomposeAuthority, normalizeComponentEncoding } = utils
  const SCHEMES = schemes
  function normalize(uri2, options) {
    if (typeof uri2 === 'string') {
      uri2 = serialize(parse(uri2, options), options)
    } else if (typeof uri2 === 'object') {
      uri2 = parse(serialize(uri2, options), options)
    }
    return uri2
  }
  function resolve$4(baseURI, relativeURI, options) {
    const schemelessOptions = Object.assign({ scheme: 'null' }, options)
    const resolved = resolveComponents(
      parse(baseURI, schemelessOptions),
      parse(relativeURI, schemelessOptions),
      schemelessOptions,
      true
    )
    return serialize(resolved, { ...schemelessOptions, skipEscape: true })
  }
  function resolveComponents(base, relative, options, skipNormalization) {
    const target = {}
    if (!skipNormalization) {
      base = parse(serialize(base, options), options)
      relative = parse(serialize(relative, options), options)
    }
    options = options || {}
    if (!options.tolerant && relative.scheme) {
      target.scheme = relative.scheme
      target.userinfo = relative.userinfo
      target.host = relative.host
      target.port = relative.port
      target.path = removeDotSegments(relative.path || '')
      target.query = relative.query
    } else {
      if (relative.userinfo !== void 0 || relative.host !== void 0 || relative.port !== void 0) {
        target.userinfo = relative.userinfo
        target.host = relative.host
        target.port = relative.port
        target.path = removeDotSegments(relative.path || '')
        target.query = relative.query
      } else {
        if (!relative.path) {
          target.path = base.path
          if (relative.query !== void 0) {
            target.query = relative.query
          } else {
            target.query = base.query
          }
        } else {
          if (relative.path.charAt(0) === '/') {
            target.path = removeDotSegments(relative.path)
          } else {
            if ((base.userinfo !== void 0 || base.host !== void 0 || base.port !== void 0) && !base.path) {
              target.path = '/' + relative.path
            } else if (!base.path) {
              target.path = relative.path
            } else {
              target.path = base.path.slice(0, base.path.lastIndexOf('/') + 1) + relative.path
            }
            target.path = removeDotSegments(target.path)
          }
          target.query = relative.query
        }
        target.userinfo = base.userinfo
        target.host = base.host
        target.port = base.port
      }
      target.scheme = base.scheme
    }
    target.fragment = relative.fragment
    return target
  }
  function equal$4(uriA, uriB, options) {
    if (typeof uriA === 'string') {
      uriA = unescape(uriA)
      uriA = serialize(normalizeComponentEncoding(parse(uriA, options), true), { ...options, skipEscape: true })
    } else if (typeof uriA === 'object') {
      uriA = serialize(normalizeComponentEncoding(uriA, true), { ...options, skipEscape: true })
    }
    if (typeof uriB === 'string') {
      uriB = unescape(uriB)
      uriB = serialize(normalizeComponentEncoding(parse(uriB, options), true), { ...options, skipEscape: true })
    } else if (typeof uriB === 'object') {
      uriB = serialize(normalizeComponentEncoding(uriB, true), { ...options, skipEscape: true })
    }
    return uriA.toLowerCase() === uriB.toLowerCase()
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
      error: ''
    }
    const options = Object.assign({}, opts)
    const uriTokens = []
    const schemeHandler = SCHEMES[(options.scheme || components.scheme || '').toLowerCase()]
    if (schemeHandler && schemeHandler.serialize) schemeHandler.serialize(components, options)
    if (components.path !== void 0) {
      if (!options.skipEscape) {
        components.path = escape(components.path)
        if (components.scheme !== void 0) {
          components.path = components.path.split('%3A').join(':')
        }
      } else {
        components.path = unescape(components.path)
      }
    }
    if (options.reference !== 'suffix' && components.scheme) {
      uriTokens.push(components.scheme, ':')
    }
    const authority = recomposeAuthority(components)
    if (authority !== void 0) {
      if (options.reference !== 'suffix') {
        uriTokens.push('//')
      }
      uriTokens.push(authority)
      if (components.path && components.path.charAt(0) !== '/') {
        uriTokens.push('/')
      }
    }
    if (components.path !== void 0) {
      let s = components.path
      if (!options.absolutePath && (!schemeHandler || !schemeHandler.absolutePath)) {
        s = removeDotSegments(s)
      }
      if (authority === void 0) {
        s = s.replace(/^\/\//u, '/%2F')
      }
      uriTokens.push(s)
    }
    if (components.query !== void 0) {
      uriTokens.push('?', components.query)
    }
    if (components.fragment !== void 0) {
      uriTokens.push('#', components.fragment)
    }
    return uriTokens.join('')
  }
  const hexLookUp = Array.from({ length: 127 }, (_v, k) => /[^!"$&'()*+,\-.;=_`a-z{}~]/u.test(String.fromCharCode(k)))
  function nonSimpleDomain(value) {
    let code2 = 0
    for (let i = 0, len = value.length; i < len; ++i) {
      code2 = value.charCodeAt(i)
      if (code2 > 126 || hexLookUp[code2]) {
        return true
      }
    }
    return false
  }
  const URI_PARSE =
    /^(?:([^#/:?]+):)?(?:\/\/((?:([^#/?@]*)@)?(\[[^#/?\]]+\]|[^#/:?]*)(?::(\d*))?))?([^#?]*)(?:\?([^#]*))?(?:#((?:.|[\n\r])*))?/u
  function parse(uri2, opts) {
    const options = Object.assign({}, opts)
    const parsed = {
      scheme: void 0,
      userinfo: void 0,
      host: '',
      port: void 0,
      path: '',
      query: void 0,
      fragment: void 0
    }
    const gotEncoding = uri2.indexOf('%') !== -1
    let isIP = false
    if (options.reference === 'suffix') uri2 = (options.scheme ? options.scheme + ':' : '') + '//' + uri2
    const matches = uri2.match(URI_PARSE)
    if (matches) {
      parsed.scheme = matches[1]
      parsed.userinfo = matches[3]
      parsed.host = matches[4]
      parsed.port = parseInt(matches[5], 10)
      parsed.path = matches[6] || ''
      parsed.query = matches[7]
      parsed.fragment = matches[8]
      if (isNaN(parsed.port)) {
        parsed.port = matches[5]
      }
      if (parsed.host) {
        const ipv4result = normalizeIPv4(parsed.host)
        if (ipv4result.isIPV4 === false) {
          const ipv6result = normalizeIPv6(ipv4result.host)
          parsed.host = ipv6result.host.toLowerCase()
          isIP = ipv6result.isIPV6
        } else {
          parsed.host = ipv4result.host
          isIP = true
        }
      }
      if (
        parsed.scheme === void 0 &&
        parsed.userinfo === void 0 &&
        parsed.host === void 0 &&
        parsed.port === void 0 &&
        parsed.query === void 0 &&
        !parsed.path
      ) {
        parsed.reference = 'same-document'
      } else if (parsed.scheme === void 0) {
        parsed.reference = 'relative'
      } else if (parsed.fragment === void 0) {
        parsed.reference = 'absolute'
      } else {
        parsed.reference = 'uri'
      }
      if (options.reference && options.reference !== 'suffix' && options.reference !== parsed.reference) {
        parsed.error = parsed.error || 'URI is not a ' + options.reference + ' reference.'
      }
      const schemeHandler = SCHEMES[(options.scheme || parsed.scheme || '').toLowerCase()]
      if (!options.unicodeSupport && (!schemeHandler || !schemeHandler.unicodeSupport)) {
        if (
          parsed.host &&
          (options.domainHost || (schemeHandler && schemeHandler.domainHost)) &&
          isIP === false &&
          nonSimpleDomain(parsed.host)
        ) {
          try {
            parsed.host = URL.domainToASCII(parsed.host.toLowerCase())
          } catch (e) {
            parsed.error = parsed.error || "Host's domain name can not be converted to ASCII: " + e
          }
        }
      }
      if (!schemeHandler || (schemeHandler && !schemeHandler.skipNormalize)) {
        if (gotEncoding && parsed.scheme !== void 0) {
          parsed.scheme = unescape(parsed.scheme)
        }
        if (gotEncoding && parsed.host !== void 0) {
          parsed.host = unescape(parsed.host)
        }
        if (parsed.path) {
          parsed.path = escape(unescape(parsed.path))
        }
        if (parsed.fragment) {
          parsed.fragment = encodeURI(decodeURIComponent(parsed.fragment))
        }
      }
      if (schemeHandler && schemeHandler.parse) {
        schemeHandler.parse(parsed, options)
      }
    } else {
      parsed.error = parsed.error || 'URI can not be parsed.'
    }
    return parsed
  }
  const fastUri = {
    SCHEMES,
    normalize,
    resolve: resolve$4,
    resolveComponents,
    equal: equal$4,
    serialize,
    parse
  }
  fastUri$1.exports = fastUri
  fastUri$1.exports.default = fastUri
  fastUri$1.exports.fastUri = fastUri
  var fastUriExports = fastUri$1.exports
  Object.defineProperty(uri$2, '__esModule', { value: true })
  const uri$1 = fastUriExports
  uri$1.code = 'require("ajv/dist/runtime/uri").default'
  uri$2.default = uri$1
  ;(function (exports3) {
    Object.defineProperty(exports3, '__esModule', { value: true })
    exports3.CodeGen =
      exports3.Name =
      exports3.nil =
      exports3.stringify =
      exports3.str =
      exports3._ =
      exports3.KeywordCxt =
        void 0
    var validate_12 = requireValidate()
    Object.defineProperty(exports3, 'KeywordCxt', {
      enumerable: true,
      get: function () {
        return validate_12.KeywordCxt
      }
    })
    var codegen_12 = codegen
    Object.defineProperty(exports3, '_', {
      enumerable: true,
      get: function () {
        return codegen_12._
      }
    })
    Object.defineProperty(exports3, 'str', {
      enumerable: true,
      get: function () {
        return codegen_12.str
      }
    })
    Object.defineProperty(exports3, 'stringify', {
      enumerable: true,
      get: function () {
        return codegen_12.stringify
      }
    })
    Object.defineProperty(exports3, 'nil', {
      enumerable: true,
      get: function () {
        return codegen_12.nil
      }
    })
    Object.defineProperty(exports3, 'Name', {
      enumerable: true,
      get: function () {
        return codegen_12.Name
      }
    })
    Object.defineProperty(exports3, 'CodeGen', {
      enumerable: true,
      get: function () {
        return codegen_12.CodeGen
      }
    })
    const validation_error_12 = requireValidation_error()
    const ref_error_12 = ref_error
    const rules_12 = rules$2
    const compile_12 = compile$2
    const codegen_2 = codegen
    const resolve_12 = resolve$6
    const dataType_12 = dataType
    const util_12 = util$7
    const $dataRefSchema = require$$9
    const uri_1 = uri$2
    const defaultRegExp = (str, flags) => new RegExp(str, flags)
    defaultRegExp.code = 'new RegExp'
    const META_IGNORE_OPTIONS2 = ['removeAdditional', 'useDefaults', 'coerceTypes']
    const EXT_SCOPE_NAMES = /* @__PURE__ */ new Set([
      'validate',
      'serialize',
      'parse',
      'wrapper',
      'root',
      'schema',
      'keyword',
      'pattern',
      'formats',
      'validate$data',
      'func',
      'obj',
      'Error'
    ])
    const removedOptions = {
      errorDataPath: '',
      format: '`validateFormats: false` can be used instead.',
      nullable: '"nullable" keyword is supported by default.',
      jsonPointers: 'Deprecated jsPropertySyntax can be used instead.',
      extendRefs: 'Deprecated ignoreKeywordsWithRef can be used instead.',
      missingRefs: 'Pass empty schema with $id that should be ignored to ajv.addSchema.',
      processCode: 'Use option `code: {process: (code, schemaEnv: object) => string}`',
      sourceCode: 'Use option `code: {source: true}`',
      strictDefaults: 'It is default now, see option `strict`.',
      strictKeywords: 'It is default now, see option `strict`.',
      uniqueItems: '"uniqueItems" keyword is always validated.',
      unknownFormats: 'Disable strict mode or pass `true` to `ajv.addFormat` (or `formats` option).',
      cache: 'Map is used as cache, schema object as key.',
      serialize: 'Map is used as cache, schema object as key.',
      ajvErrors: 'It is default now.'
    }
    const deprecatedOptions = {
      ignoreKeywordsWithRef: '',
      jsPropertySyntax: '',
      unicode: '"minLength"/"maxLength" account for unicode characters by default.'
    }
    const MAX_EXPRESSION = 200
    function requiredOptions(o) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0
      const s = o.strict
      const _optz = (_a = o.code) === null || _a === void 0 ? void 0 : _a.optimize
      const optimize = _optz === true || _optz === void 0 ? 1 : _optz || 0
      const regExp =
        (_c = (_b = o.code) === null || _b === void 0 ? void 0 : _b.regExp) !== null && _c !== void 0
          ? _c
          : defaultRegExp
      const uriResolver = (_d = o.uriResolver) !== null && _d !== void 0 ? _d : uri_1.default
      return {
        strictSchema:
          (_f = (_e = o.strictSchema) !== null && _e !== void 0 ? _e : s) !== null && _f !== void 0 ? _f : true,
        strictNumbers:
          (_h = (_g = o.strictNumbers) !== null && _g !== void 0 ? _g : s) !== null && _h !== void 0 ? _h : true,
        strictTypes:
          (_k = (_j = o.strictTypes) !== null && _j !== void 0 ? _j : s) !== null && _k !== void 0 ? _k : 'log',
        strictTuples:
          (_m = (_l = o.strictTuples) !== null && _l !== void 0 ? _l : s) !== null && _m !== void 0 ? _m : 'log',
        strictRequired:
          (_p = (_o = o.strictRequired) !== null && _o !== void 0 ? _o : s) !== null && _p !== void 0 ? _p : false,
        code: o.code ? { ...o.code, optimize, regExp } : { optimize, regExp },
        loopRequired: (_q = o.loopRequired) !== null && _q !== void 0 ? _q : MAX_EXPRESSION,
        loopEnum: (_r = o.loopEnum) !== null && _r !== void 0 ? _r : MAX_EXPRESSION,
        meta: (_s = o.meta) !== null && _s !== void 0 ? _s : true,
        messages: (_t = o.messages) !== null && _t !== void 0 ? _t : true,
        inlineRefs: (_u = o.inlineRefs) !== null && _u !== void 0 ? _u : true,
        schemaId: (_v = o.schemaId) !== null && _v !== void 0 ? _v : '$id',
        addUsedSchema: (_w = o.addUsedSchema) !== null && _w !== void 0 ? _w : true,
        validateSchema: (_x = o.validateSchema) !== null && _x !== void 0 ? _x : true,
        validateFormats: (_y = o.validateFormats) !== null && _y !== void 0 ? _y : true,
        unicodeRegExp: (_z = o.unicodeRegExp) !== null && _z !== void 0 ? _z : true,
        int32range: (_0 = o.int32range) !== null && _0 !== void 0 ? _0 : true,
        uriResolver
      }
    }
    class Ajv2 {
      constructor(opts = {}) {
        this.schemas = {}
        this.refs = {}
        this.formats = {}
        this._compilations = /* @__PURE__ */ new Set()
        this._loading = {}
        this._cache = /* @__PURE__ */ new Map()
        opts = this.opts = { ...opts, ...requiredOptions(opts) }
        const { es5, lines } = this.opts.code
        this.scope = new codegen_2.ValueScope({ scope: {}, prefixes: EXT_SCOPE_NAMES, es5, lines })
        this.logger = getLogger(opts.logger)
        const formatOpt = opts.validateFormats
        opts.validateFormats = false
        this.RULES = (0, rules_12.getRules)()
        checkOptions.call(this, removedOptions, opts, 'NOT SUPPORTED')
        checkOptions.call(this, deprecatedOptions, opts, 'DEPRECATED', 'warn')
        this._metaOpts = getMetaSchemaOptions2.call(this)
        if (opts.formats) addInitialFormats2.call(this)
        this._addVocabularies()
        this._addDefaultMetaSchema()
        if (opts.keywords) addInitialKeywords2.call(this, opts.keywords)
        if (typeof opts.meta == 'object') this.addMetaSchema(opts.meta)
        addInitialSchemas2.call(this)
        opts.validateFormats = formatOpt
      }
      _addVocabularies() {
        this.addKeyword('$async')
      }
      _addDefaultMetaSchema() {
        const { $data, meta, schemaId } = this.opts
        let _dataRefSchema = $dataRefSchema
        if (schemaId === 'id') {
          _dataRefSchema = { ...$dataRefSchema }
          _dataRefSchema.id = _dataRefSchema.$id
          delete _dataRefSchema.$id
        }
        if (meta && $data) this.addMetaSchema(_dataRefSchema, _dataRefSchema[schemaId], false)
      }
      defaultMeta() {
        const { meta, schemaId } = this.opts
        return (this.opts.defaultMeta = typeof meta == 'object' ? meta[schemaId] || meta : void 0)
      }
      validate(schemaKeyRef, data2) {
        let v
        if (typeof schemaKeyRef == 'string') {
          v = this.getSchema(schemaKeyRef)
          if (!v) throw new Error(`no schema with key or ref "${schemaKeyRef}"`)
        } else {
          v = this.compile(schemaKeyRef)
        }
        const valid = v(data2)
        if (!('$async' in v)) this.errors = v.errors
        return valid
      }
      compile(schema, _meta) {
        const sch = this._addSchema(schema, _meta)
        return sch.validate || this._compileSchemaEnv(sch)
      }
      compileAsync(schema, meta) {
        if (typeof this.opts.loadSchema != 'function') {
          throw new Error('options.loadSchema should be a function')
        }
        const { loadSchema } = this.opts
        return runCompileAsync.call(this, schema, meta)
        async function runCompileAsync(_schema, _meta) {
          await loadMetaSchema.call(this, _schema.$schema)
          const sch = this._addSchema(_schema, _meta)
          return sch.validate || _compileAsync.call(this, sch)
        }
        async function loadMetaSchema($ref) {
          if ($ref && !this.getSchema($ref)) {
            await runCompileAsync.call(this, { $ref }, true)
          }
        }
        async function _compileAsync(sch) {
          try {
            return this._compileSchemaEnv(sch)
          } catch (e) {
            if (!(e instanceof ref_error_12.default)) throw e
            checkLoaded.call(this, e)
            await loadMissingSchema.call(this, e.missingSchema)
            return _compileAsync.call(this, sch)
          }
        }
        function checkLoaded({ missingSchema: ref2, missingRef }) {
          if (this.refs[ref2]) {
            throw new Error(`AnySchema ${ref2} is loaded but ${missingRef} cannot be resolved`)
          }
        }
        async function loadMissingSchema(ref2) {
          const _schema = await _loadSchema.call(this, ref2)
          if (!this.refs[ref2]) await loadMetaSchema.call(this, _schema.$schema)
          if (!this.refs[ref2]) this.addSchema(_schema, ref2, meta)
        }
        async function _loadSchema(ref2) {
          const p = this._loading[ref2]
          if (p) return p
          try {
            return await (this._loading[ref2] = loadSchema(ref2))
          } finally {
            delete this._loading[ref2]
          }
        }
      }
      // Adds schema to the instance
      addSchema(schema, key, _meta, _validateSchema = this.opts.validateSchema) {
        if (Array.isArray(schema)) {
          for (const sch of schema) this.addSchema(sch, void 0, _meta, _validateSchema)
          return this
        }
        let id2
        if (typeof schema === 'object') {
          const { schemaId } = this.opts
          id2 = schema[schemaId]
          if (id2 !== void 0 && typeof id2 != 'string') {
            throw new Error(`schema ${schemaId} must be string`)
          }
        }
        key = (0, resolve_12.normalizeId)(key || id2)
        this._checkUnique(key)
        this.schemas[key] = this._addSchema(schema, _meta, key, _validateSchema, true)
        return this
      }
      // Add schema that will be used to validate other schemas
      // options in META_IGNORE_OPTIONS are alway set to false
      addMetaSchema(schema, key, _validateSchema = this.opts.validateSchema) {
        this.addSchema(schema, key, true, _validateSchema)
        return this
      }
      //  Validate schema against its meta-schema
      validateSchema(schema, throwOrLogError) {
        if (typeof schema == 'boolean') return true
        let $schema2
        $schema2 = schema.$schema
        if ($schema2 !== void 0 && typeof $schema2 != 'string') {
          throw new Error('$schema must be a string')
        }
        $schema2 = $schema2 || this.opts.defaultMeta || this.defaultMeta()
        if (!$schema2) {
          this.logger.warn('meta-schema not available')
          this.errors = null
          return true
        }
        const valid = this.validate($schema2, schema)
        if (!valid && throwOrLogError) {
          const message = 'schema is invalid: ' + this.errorsText()
          if (this.opts.validateSchema === 'log') this.logger.error(message)
          else throw new Error(message)
        }
        return valid
      }
      // Get compiled schema by `key` or `ref`.
      // (`key` that was passed to `addSchema` or full schema reference - `schema.$id` or resolved id)
      getSchema(keyRef) {
        let sch
        while (typeof (sch = getSchEnv.call(this, keyRef)) == 'string') keyRef = sch
        if (sch === void 0) {
          const { schemaId } = this.opts
          const root = new compile_12.SchemaEnv({ schema: {}, schemaId })
          sch = compile_12.resolveSchema.call(this, root, keyRef)
          if (!sch) return
          this.refs[keyRef] = sch
        }
        return sch.validate || this._compileSchemaEnv(sch)
      }
      // Remove cached schema(s).
      // If no parameter is passed all schemas but meta-schemas are removed.
      // If RegExp is passed all schemas with key/id matching pattern but meta-schemas are removed.
      // Even if schema is referenced by other schemas it still can be removed as other schemas have local references.
      removeSchema(schemaKeyRef) {
        if (schemaKeyRef instanceof RegExp) {
          this._removeAllSchemas(this.schemas, schemaKeyRef)
          this._removeAllSchemas(this.refs, schemaKeyRef)
          return this
        }
        switch (typeof schemaKeyRef) {
          case 'undefined':
            this._removeAllSchemas(this.schemas)
            this._removeAllSchemas(this.refs)
            this._cache.clear()
            return this
          case 'string': {
            const sch = getSchEnv.call(this, schemaKeyRef)
            if (typeof sch == 'object') this._cache.delete(sch.schema)
            delete this.schemas[schemaKeyRef]
            delete this.refs[schemaKeyRef]
            return this
          }
          case 'object': {
            const cacheKey = schemaKeyRef
            this._cache.delete(cacheKey)
            let id2 = schemaKeyRef[this.opts.schemaId]
            if (id2) {
              id2 = (0, resolve_12.normalizeId)(id2)
              delete this.schemas[id2]
              delete this.refs[id2]
            }
            return this
          }
          default:
            throw new Error('ajv.removeSchema: invalid parameter')
        }
      }
      // add "vocabulary" - a collection of keywords
      addVocabulary(definitions2) {
        for (const def2 of definitions2) this.addKeyword(def2)
        return this
      }
      addKeyword(kwdOrDef, def2) {
        let keyword2
        if (typeof kwdOrDef == 'string') {
          keyword2 = kwdOrDef
          if (typeof def2 == 'object') {
            this.logger.warn('these parameters are deprecated, see docs for addKeyword')
            def2.keyword = keyword2
          }
        } else if (typeof kwdOrDef == 'object' && def2 === void 0) {
          def2 = kwdOrDef
          keyword2 = def2.keyword
          if (Array.isArray(keyword2) && !keyword2.length) {
            throw new Error('addKeywords: keyword must be string or non-empty array')
          }
        } else {
          throw new Error('invalid addKeywords parameters')
        }
        checkKeyword.call(this, keyword2, def2)
        if (!def2) {
          ;(0, util_12.eachItem)(keyword2, (kwd) => addRule.call(this, kwd))
          return this
        }
        keywordMetaschema.call(this, def2)
        const definition = {
          ...def2,
          type: (0, dataType_12.getJSONTypes)(def2.type),
          schemaType: (0, dataType_12.getJSONTypes)(def2.schemaType)
        }
        ;(0, util_12.eachItem)(
          keyword2,
          definition.type.length === 0
            ? (k) => addRule.call(this, k, definition)
            : (k) => definition.type.forEach((t) => addRule.call(this, k, definition, t))
        )
        return this
      }
      getKeyword(keyword2) {
        const rule = this.RULES.all[keyword2]
        return typeof rule == 'object' ? rule.definition : !!rule
      }
      // Remove keyword
      removeKeyword(keyword2) {
        const { RULES } = this
        delete RULES.keywords[keyword2]
        delete RULES.all[keyword2]
        for (const group of RULES.rules) {
          const i = group.rules.findIndex((rule) => rule.keyword === keyword2)
          if (i >= 0) group.rules.splice(i, 1)
        }
        return this
      }
      // Add format
      addFormat(name, format2) {
        if (typeof format2 == 'string') format2 = new RegExp(format2)
        this.formats[name] = format2
        return this
      }
      errorsText(errors2 = this.errors, { separator = ', ', dataVar = 'data' } = {}) {
        if (!errors2 || errors2.length === 0) return 'No errors'
        return errors2
          .map((e) => `${dataVar}${e.instancePath} ${e.message}`)
          .reduce((text, msg) => text + separator + msg)
      }
      $dataMetaSchema(metaSchema2, keywordsJsonPointers) {
        const rules2 = this.RULES.all
        metaSchema2 = JSON.parse(JSON.stringify(metaSchema2))
        for (const jsonPointer of keywordsJsonPointers) {
          const segments = jsonPointer.split('/').slice(1)
          let keywords = metaSchema2
          for (const seg of segments) keywords = keywords[seg]
          for (const key in rules2) {
            const rule = rules2[key]
            if (typeof rule != 'object') continue
            const { $data } = rule.definition
            const schema = keywords[key]
            if ($data && schema) keywords[key] = schemaOrData(schema)
          }
        }
        return metaSchema2
      }
      _removeAllSchemas(schemas, regex2) {
        for (const keyRef in schemas) {
          const sch = schemas[keyRef]
          if (!regex2 || regex2.test(keyRef)) {
            if (typeof sch == 'string') {
              delete schemas[keyRef]
            } else if (sch && !sch.meta) {
              this._cache.delete(sch.schema)
              delete schemas[keyRef]
            }
          }
        }
      }
      _addSchema(
        schema,
        meta,
        baseId,
        validateSchema2 = this.opts.validateSchema,
        addSchema2 = this.opts.addUsedSchema
      ) {
        let id2
        const { schemaId } = this.opts
        if (typeof schema == 'object') {
          id2 = schema[schemaId]
        } else {
          if (this.opts.jtd) throw new Error('schema must be object')
          else if (typeof schema != 'boolean') throw new Error('schema must be object or boolean')
        }
        let sch = this._cache.get(schema)
        if (sch !== void 0) return sch
        baseId = (0, resolve_12.normalizeId)(id2 || baseId)
        const localRefs = resolve_12.getSchemaRefs.call(this, schema, baseId)
        sch = new compile_12.SchemaEnv({ schema, schemaId, meta, baseId, localRefs })
        this._cache.set(sch.schema, sch)
        if (addSchema2 && !baseId.startsWith('#')) {
          if (baseId) this._checkUnique(baseId)
          this.refs[baseId] = sch
        }
        if (validateSchema2) this.validateSchema(schema, true)
        return sch
      }
      _checkUnique(id2) {
        if (this.schemas[id2] || this.refs[id2]) {
          throw new Error(`schema with key or id "${id2}" already exists`)
        }
      }
      _compileSchemaEnv(sch) {
        if (sch.meta) this._compileMetaSchema(sch)
        else compile_12.compileSchema.call(this, sch)
        if (!sch.validate) throw new Error('ajv implementation error')
        return sch.validate
      }
      _compileMetaSchema(sch) {
        const currentOpts = this.opts
        this.opts = this._metaOpts
        try {
          compile_12.compileSchema.call(this, sch)
        } finally {
          this.opts = currentOpts
        }
      }
    }
    Ajv2.ValidationError = validation_error_12.default
    Ajv2.MissingRefError = ref_error_12.default
    exports3.default = Ajv2
    function checkOptions(checkOpts, options, msg, log = 'error') {
      for (const key in checkOpts) {
        const opt = key
        if (opt in options) this.logger[log](`${msg}: option ${key}. ${checkOpts[opt]}`)
      }
    }
    function getSchEnv(keyRef) {
      keyRef = (0, resolve_12.normalizeId)(keyRef)
      return this.schemas[keyRef] || this.refs[keyRef]
    }
    function addInitialSchemas2() {
      const optsSchemas = this.opts.schemas
      if (!optsSchemas) return
      if (Array.isArray(optsSchemas)) this.addSchema(optsSchemas)
      else for (const key in optsSchemas) this.addSchema(optsSchemas[key], key)
    }
    function addInitialFormats2() {
      for (const name in this.opts.formats) {
        const format2 = this.opts.formats[name]
        if (format2) this.addFormat(name, format2)
      }
    }
    function addInitialKeywords2(defs) {
      if (Array.isArray(defs)) {
        this.addVocabulary(defs)
        return
      }
      this.logger.warn('keywords option as map is deprecated, pass array')
      for (const keyword2 in defs) {
        const def2 = defs[keyword2]
        if (!def2.keyword) def2.keyword = keyword2
        this.addKeyword(def2)
      }
    }
    function getMetaSchemaOptions2() {
      const metaOpts = { ...this.opts }
      for (const opt of META_IGNORE_OPTIONS2) delete metaOpts[opt]
      return metaOpts
    }
    const noLogs = { log() {}, warn() {}, error() {} }
    function getLogger(logger) {
      if (logger === false) return noLogs
      if (logger === void 0) return console
      if (logger.log && logger.warn && logger.error) return logger
      throw new Error('logger must implement log, warn and error methods')
    }
    const KEYWORD_NAME = /^[a-z_$][a-z0-9_$:-]*$/i
    function checkKeyword(keyword2, def2) {
      const { RULES } = this
      ;(0, util_12.eachItem)(keyword2, (kwd) => {
        if (RULES.keywords[kwd]) throw new Error(`Keyword ${kwd} is already defined`)
        if (!KEYWORD_NAME.test(kwd)) throw new Error(`Keyword ${kwd} has invalid name`)
      })
      if (!def2) return
      if (def2.$data && !('code' in def2 || 'validate' in def2)) {
        throw new Error('$data keyword must have "code" or "validate" function')
      }
    }
    function addRule(keyword2, definition, dataType2) {
      var _a
      const post = definition === null || definition === void 0 ? void 0 : definition.post
      if (dataType2 && post) throw new Error('keyword with "post" flag cannot have "type"')
      const { RULES } = this
      let ruleGroup = post ? RULES.post : RULES.rules.find(({ type: t }) => t === dataType2)
      if (!ruleGroup) {
        ruleGroup = { type: dataType2, rules: [] }
        RULES.rules.push(ruleGroup)
      }
      RULES.keywords[keyword2] = true
      if (!definition) return
      const rule = {
        keyword: keyword2,
        definition: {
          ...definition,
          type: (0, dataType_12.getJSONTypes)(definition.type),
          schemaType: (0, dataType_12.getJSONTypes)(definition.schemaType)
        }
      }
      if (definition.before) addBeforeRule.call(this, ruleGroup, rule, definition.before)
      else ruleGroup.rules.push(rule)
      RULES.all[keyword2] = rule
      ;(_a = definition.implements) === null || _a === void 0 ? void 0 : _a.forEach((kwd) => this.addKeyword(kwd))
    }
    function addBeforeRule(ruleGroup, rule, before) {
      const i = ruleGroup.rules.findIndex((_rule) => _rule.keyword === before)
      if (i >= 0) {
        ruleGroup.rules.splice(i, 0, rule)
      } else {
        ruleGroup.rules.push(rule)
        this.logger.warn(`rule ${before} is not defined`)
      }
    }
    function keywordMetaschema(def2) {
      let { metaSchema: metaSchema2 } = def2
      if (metaSchema2 === void 0) return
      if (def2.$data && this.opts.$data) metaSchema2 = schemaOrData(metaSchema2)
      def2.validateSchema = this.compile(metaSchema2, true)
    }
    const $dataRef = {
      $ref: 'https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#'
    }
    function schemaOrData(schema) {
      return { anyOf: [schema, $dataRef] }
    }
  })(core$2)
  var draft7 = {}
  var core$1 = {}
  var id = {}
  Object.defineProperty(id, '__esModule', { value: true })
  const def$s = {
    keyword: 'id',
    code() {
      throw new Error('NOT SUPPORTED: keyword "id", use "$id" for schema ID')
    }
  }
  id.default = def$s
  var ref$1 = {}
  Object.defineProperty(ref$1, '__esModule', { value: true })
  ref$1.callRef = ref$1.getValidate = void 0
  const ref_error_1$1 = ref_error
  const code_1$8 = code
  const codegen_1$l = codegen
  const names_1$1 = names$1
  const compile_1$2 = compile$2
  const util_1$j = util$7
  const def$r = {
    keyword: '$ref',
    schemaType: 'string',
    code(cxt) {
      const { gen, schema: $ref, it } = cxt
      const { baseId, schemaEnv: env, validateName, opts, self: self2 } = it
      const { root } = env
      if (($ref === '#' || $ref === '#/') && baseId === root.baseId) return callRootRef()
      const schOrEnv = compile_1$2.resolveRef.call(self2, root, baseId, $ref)
      if (schOrEnv === void 0) throw new ref_error_1$1.default(it.opts.uriResolver, baseId, $ref)
      if (schOrEnv instanceof compile_1$2.SchemaEnv) return callValidate(schOrEnv)
      return inlineRefSchema(schOrEnv)
      function callRootRef() {
        if (env === root) return callRef(cxt, validateName, env, env.$async)
        const rootName = gen.scopeValue('root', { ref: root })
        return callRef(cxt, (0, codegen_1$l._)`${rootName}.validate`, root, root.$async)
      }
      function callValidate(sch) {
        const v = getValidate(cxt, sch)
        callRef(cxt, v, sch, sch.$async)
      }
      function inlineRefSchema(sch) {
        const schName = gen.scopeValue(
          'schema',
          opts.code.source === true ? { ref: sch, code: (0, codegen_1$l.stringify)(sch) } : { ref: sch }
        )
        const valid = gen.name('valid')
        const schCxt = cxt.subschema(
          {
            schema: sch,
            dataTypes: [],
            schemaPath: codegen_1$l.nil,
            topSchemaRef: schName,
            errSchemaPath: $ref
          },
          valid
        )
        cxt.mergeEvaluated(schCxt)
        cxt.ok(valid)
      }
    }
  }
  function getValidate(cxt, sch) {
    const { gen } = cxt
    return sch.validate
      ? gen.scopeValue('validate', { ref: sch.validate })
      : (0, codegen_1$l._)`${gen.scopeValue('wrapper', { ref: sch })}.validate`
  }
  ref$1.getValidate = getValidate
  function callRef(cxt, v, sch, $async) {
    const { gen, it } = cxt
    const { allErrors, schemaEnv: env, opts } = it
    const passCxt = opts.passContext ? names_1$1.default.this : codegen_1$l.nil
    if ($async) callAsyncRef()
    else callSyncRef()
    function callAsyncRef() {
      if (!env.$async) throw new Error('async schema referenced by sync schema')
      const valid = gen.let('valid')
      gen.try(
        () => {
          gen.code((0, codegen_1$l._)`await ${(0, code_1$8.callValidateCode)(cxt, v, passCxt)}`)
          addEvaluatedFrom(v)
          if (!allErrors) gen.assign(valid, true)
        },
        (e) => {
          gen.if((0, codegen_1$l._)`!(${e} instanceof ${it.ValidationError})`, () => gen.throw(e))
          addErrorsFrom(e)
          if (!allErrors) gen.assign(valid, false)
        }
      )
      cxt.ok(valid)
    }
    function callSyncRef() {
      cxt.result(
        (0, code_1$8.callValidateCode)(cxt, v, passCxt),
        () => addEvaluatedFrom(v),
        () => addErrorsFrom(v)
      )
    }
    function addErrorsFrom(source) {
      const errs = (0, codegen_1$l._)`${source}.errors`
      gen.assign(
        names_1$1.default.vErrors,
        (0,
        codegen_1$l._)`${names_1$1.default.vErrors} === null ? ${errs} : ${names_1$1.default.vErrors}.concat(${errs})`
      )
      gen.assign(names_1$1.default.errors, (0, codegen_1$l._)`${names_1$1.default.vErrors}.length`)
    }
    function addEvaluatedFrom(source) {
      var _a
      if (!it.opts.unevaluated) return
      const schEvaluated =
        (_a = sch === null || sch === void 0 ? void 0 : sch.validate) === null || _a === void 0 ? void 0 : _a.evaluated
      if (it.props !== true) {
        if (schEvaluated && !schEvaluated.dynamicProps) {
          if (schEvaluated.props !== void 0) {
            it.props = util_1$j.mergeEvaluated.props(gen, schEvaluated.props, it.props)
          }
        } else {
          const props = gen.var('props', (0, codegen_1$l._)`${source}.evaluated.props`)
          it.props = util_1$j.mergeEvaluated.props(gen, props, it.props, codegen_1$l.Name)
        }
      }
      if (it.items !== true) {
        if (schEvaluated && !schEvaluated.dynamicItems) {
          if (schEvaluated.items !== void 0) {
            it.items = util_1$j.mergeEvaluated.items(gen, schEvaluated.items, it.items)
          }
        } else {
          const items2 = gen.var('items', (0, codegen_1$l._)`${source}.evaluated.items`)
          it.items = util_1$j.mergeEvaluated.items(gen, items2, it.items, codegen_1$l.Name)
        }
      }
    }
  }
  ref$1.callRef = callRef
  ref$1.default = def$r
  Object.defineProperty(core$1, '__esModule', { value: true })
  const id_1 = id
  const ref_1 = ref$1
  const core = [
    '$schema',
    '$id',
    '$defs',
    '$vocabulary',
    { keyword: '$comment' },
    'definitions',
    id_1.default,
    ref_1.default
  ]
  core$1.default = core
  var validation$1 = {}
  var limitNumber = {}
  Object.defineProperty(limitNumber, '__esModule', { value: true })
  const codegen_1$k = codegen
  const ops = codegen_1$k.operators
  const KWDs = {
    maximum: { okStr: '<=', ok: ops.LTE, fail: ops.GT },
    minimum: { okStr: '>=', ok: ops.GTE, fail: ops.LT },
    exclusiveMaximum: { okStr: '<', ok: ops.LT, fail: ops.GTE },
    exclusiveMinimum: { okStr: '>', ok: ops.GT, fail: ops.LTE }
  }
  const error$i = {
    message: ({ keyword: keyword2, schemaCode }) => (0, codegen_1$k.str)`must be ${KWDs[keyword2].okStr} ${schemaCode}`,
    params: ({ keyword: keyword2, schemaCode }) =>
      (0, codegen_1$k._)`{comparison: ${KWDs[keyword2].okStr}, limit: ${schemaCode}}`
  }
  const def$q = {
    keyword: Object.keys(KWDs),
    type: 'number',
    schemaType: 'number',
    $data: true,
    error: error$i,
    code(cxt) {
      const { keyword: keyword2, data: data2, schemaCode } = cxt
      cxt.fail$data((0, codegen_1$k._)`${data2} ${KWDs[keyword2].fail} ${schemaCode} || isNaN(${data2})`)
    }
  }
  limitNumber.default = def$q
  var multipleOf$1 = {}
  Object.defineProperty(multipleOf$1, '__esModule', { value: true })
  const codegen_1$j = codegen
  const error$h = {
    message: ({ schemaCode }) => (0, codegen_1$j.str)`must be multiple of ${schemaCode}`,
    params: ({ schemaCode }) => (0, codegen_1$j._)`{multipleOf: ${schemaCode}}`
  }
  const def$p = {
    keyword: 'multipleOf',
    type: 'number',
    schemaType: 'number',
    $data: true,
    error: error$h,
    code(cxt) {
      const { gen, data: data2, schemaCode, it } = cxt
      const prec = it.opts.multipleOfPrecision
      const res = gen.let('res')
      const invalid = prec
        ? (0, codegen_1$j._)`Math.abs(Math.round(${res}) - ${res}) > 1e-${prec}`
        : (0, codegen_1$j._)`${res} !== parseInt(${res})`
      cxt.fail$data((0, codegen_1$j._)`(${schemaCode} === 0 || (${res} = ${data2}/${schemaCode}, ${invalid}))`)
    }
  }
  multipleOf$1.default = def$p
  var limitLength = {}
  var ucs2length$3 = {}
  Object.defineProperty(ucs2length$3, '__esModule', { value: true })
  function ucs2length$2(str) {
    const len = str.length
    let length = 0
    let pos = 0
    let value
    while (pos < len) {
      length++
      value = str.charCodeAt(pos++)
      if (value >= 55296 && value <= 56319 && pos < len) {
        value = str.charCodeAt(pos)
        if ((value & 64512) === 56320) pos++
      }
    }
    return length
  }
  ucs2length$3.default = ucs2length$2
  ucs2length$2.code = 'require("ajv/dist/runtime/ucs2length").default'
  Object.defineProperty(limitLength, '__esModule', { value: true })
  const codegen_1$i = codegen
  const util_1$i = util$7
  const ucs2length_1 = ucs2length$3
  const error$g = {
    message({ keyword: keyword2, schemaCode }) {
      const comp = keyword2 === 'maxLength' ? 'more' : 'fewer'
      return (0, codegen_1$i.str)`must NOT have ${comp} than ${schemaCode} characters`
    },
    params: ({ schemaCode }) => (0, codegen_1$i._)`{limit: ${schemaCode}}`
  }
  const def$o = {
    keyword: ['maxLength', 'minLength'],
    type: 'string',
    schemaType: 'number',
    $data: true,
    error: error$g,
    code(cxt) {
      const { keyword: keyword2, data: data2, schemaCode, it } = cxt
      const op = keyword2 === 'maxLength' ? codegen_1$i.operators.GT : codegen_1$i.operators.LT
      const len =
        it.opts.unicode === false
          ? (0, codegen_1$i._)`${data2}.length`
          : (0, codegen_1$i._)`${(0, util_1$i.useFunc)(cxt.gen, ucs2length_1.default)}(${data2})`
      cxt.fail$data((0, codegen_1$i._)`${len} ${op} ${schemaCode}`)
    }
  }
  limitLength.default = def$o
  var pattern$1 = {}
  Object.defineProperty(pattern$1, '__esModule', { value: true })
  const code_1$7 = code
  const codegen_1$h = codegen
  const error$f = {
    message: ({ schemaCode }) => (0, codegen_1$h.str)`must match pattern "${schemaCode}"`,
    params: ({ schemaCode }) => (0, codegen_1$h._)`{pattern: ${schemaCode}}`
  }
  const def$n = {
    keyword: 'pattern',
    type: 'string',
    schemaType: 'string',
    $data: true,
    error: error$f,
    code(cxt) {
      const { data: data2, $data, schema, schemaCode, it } = cxt
      const u = it.opts.unicodeRegExp ? 'u' : ''
      const regExp = $data
        ? (0, codegen_1$h._)`(new RegExp(${schemaCode}, ${u}))`
        : (0, code_1$7.usePattern)(cxt, schema)
      cxt.fail$data((0, codegen_1$h._)`!${regExp}.test(${data2})`)
    }
  }
  pattern$1.default = def$n
  var limitProperties = {}
  Object.defineProperty(limitProperties, '__esModule', { value: true })
  const codegen_1$g = codegen
  const error$e = {
    message({ keyword: keyword2, schemaCode }) {
      const comp = keyword2 === 'maxProperties' ? 'more' : 'fewer'
      return (0, codegen_1$g.str)`must NOT have ${comp} than ${schemaCode} properties`
    },
    params: ({ schemaCode }) => (0, codegen_1$g._)`{limit: ${schemaCode}}`
  }
  const def$m = {
    keyword: ['maxProperties', 'minProperties'],
    type: 'object',
    schemaType: 'number',
    $data: true,
    error: error$e,
    code(cxt) {
      const { keyword: keyword2, data: data2, schemaCode } = cxt
      const op = keyword2 === 'maxProperties' ? codegen_1$g.operators.GT : codegen_1$g.operators.LT
      cxt.fail$data((0, codegen_1$g._)`Object.keys(${data2}).length ${op} ${schemaCode}`)
    }
  }
  limitProperties.default = def$m
  var required$2 = {}
  Object.defineProperty(required$2, '__esModule', { value: true })
  const code_1$6 = code
  const codegen_1$f = codegen
  const util_1$h = util$7
  const error$d = {
    message: ({ params: { missingProperty } }) =>
      (0, codegen_1$f.str)`must have required property '${missingProperty}'`,
    params: ({ params: { missingProperty } }) => (0, codegen_1$f._)`{missingProperty: ${missingProperty}}`
  }
  const def$l = {
    keyword: 'required',
    type: 'object',
    schemaType: 'array',
    $data: true,
    error: error$d,
    code(cxt) {
      const { gen, schema, schemaCode, data: data2, $data, it } = cxt
      const { opts } = it
      if (!$data && schema.length === 0) return
      const useLoop = schema.length >= opts.loopRequired
      if (it.allErrors) allErrorsMode()
      else exitOnErrorMode()
      if (opts.strictRequired) {
        const props = cxt.parentSchema.properties
        const { definedProperties } = cxt.it
        for (const requiredKey of schema) {
          if (
            (props === null || props === void 0 ? void 0 : props[requiredKey]) === void 0 &&
            !definedProperties.has(requiredKey)
          ) {
            const schemaPath = it.schemaEnv.baseId + it.errSchemaPath
            const msg = `required property "${requiredKey}" is not defined at "${schemaPath}" (strictRequired)`
            ;(0, util_1$h.checkStrictMode)(it, msg, it.opts.strictRequired)
          }
        }
      }
      function allErrorsMode() {
        if (useLoop || $data) {
          cxt.block$data(codegen_1$f.nil, loopAllRequired)
        } else {
          for (const prop of schema) {
            ;(0, code_1$6.checkReportMissingProp)(cxt, prop)
          }
        }
      }
      function exitOnErrorMode() {
        const missing = gen.let('missing')
        if (useLoop || $data) {
          const valid = gen.let('valid', true)
          cxt.block$data(valid, () => loopUntilMissing(missing, valid))
          cxt.ok(valid)
        } else {
          gen.if((0, code_1$6.checkMissingProp)(cxt, schema, missing))
          ;(0, code_1$6.reportMissingProp)(cxt, missing)
          gen.else()
        }
      }
      function loopAllRequired() {
        gen.forOf('prop', schemaCode, (prop) => {
          cxt.setParams({ missingProperty: prop })
          gen.if((0, code_1$6.noPropertyInData)(gen, data2, prop, opts.ownProperties), () => cxt.error())
        })
      }
      function loopUntilMissing(missing, valid) {
        cxt.setParams({ missingProperty: missing })
        gen.forOf(
          missing,
          schemaCode,
          () => {
            gen.assign(valid, (0, code_1$6.propertyInData)(gen, data2, missing, opts.ownProperties))
            gen.if((0, codegen_1$f.not)(valid), () => {
              cxt.error()
              gen.break()
            })
          },
          codegen_1$f.nil
        )
      }
    }
  }
  required$2.default = def$l
  var limitItems = {}
  Object.defineProperty(limitItems, '__esModule', { value: true })
  const codegen_1$e = codegen
  const error$c = {
    message({ keyword: keyword2, schemaCode }) {
      const comp = keyword2 === 'maxItems' ? 'more' : 'fewer'
      return (0, codegen_1$e.str)`must NOT have ${comp} than ${schemaCode} items`
    },
    params: ({ schemaCode }) => (0, codegen_1$e._)`{limit: ${schemaCode}}`
  }
  const def$k = {
    keyword: ['maxItems', 'minItems'],
    type: 'array',
    schemaType: 'number',
    $data: true,
    error: error$c,
    code(cxt) {
      const { keyword: keyword2, data: data2, schemaCode } = cxt
      const op = keyword2 === 'maxItems' ? codegen_1$e.operators.GT : codegen_1$e.operators.LT
      cxt.fail$data((0, codegen_1$e._)`${data2}.length ${op} ${schemaCode}`)
    }
  }
  limitItems.default = def$k
  var uniqueItems$1 = {}
  var equal$3 = {}
  Object.defineProperty(equal$3, '__esModule', { value: true })
  const equal$2 = fastDeepEqual
  equal$2.code = 'require("ajv/dist/runtime/equal").default'
  equal$3.default = equal$2
  Object.defineProperty(uniqueItems$1, '__esModule', { value: true })
  const dataType_1 = dataType
  const codegen_1$d = codegen
  const util_1$g = util$7
  const equal_1$2 = equal$3
  const error$b = {
    message: ({ params: { i, j } }) =>
      (0, codegen_1$d.str)`must NOT have duplicate items (items ## ${j} and ${i} are identical)`,
    params: ({ params: { i, j } }) => (0, codegen_1$d._)`{i: ${i}, j: ${j}}`
  }
  const def$j = {
    keyword: 'uniqueItems',
    type: 'array',
    schemaType: 'boolean',
    $data: true,
    error: error$b,
    code(cxt) {
      const { gen, data: data2, $data, schema, parentSchema, schemaCode, it } = cxt
      if (!$data && !schema) return
      const valid = gen.let('valid')
      const itemTypes = parentSchema.items ? (0, dataType_1.getSchemaTypes)(parentSchema.items) : []
      cxt.block$data(valid, validateUniqueItems, (0, codegen_1$d._)`${schemaCode} === false`)
      cxt.ok(valid)
      function validateUniqueItems() {
        const i = gen.let('i', (0, codegen_1$d._)`${data2}.length`)
        const j = gen.let('j')
        cxt.setParams({ i, j })
        gen.assign(valid, true)
        gen.if((0, codegen_1$d._)`${i} > 1`, () => (canOptimize() ? loopN : loopN2)(i, j))
      }
      function canOptimize() {
        return itemTypes.length > 0 && !itemTypes.some((t) => t === 'object' || t === 'array')
      }
      function loopN(i, j) {
        const item = gen.name('item')
        const wrongType = (0, dataType_1.checkDataTypes)(
          itemTypes,
          item,
          it.opts.strictNumbers,
          dataType_1.DataType.Wrong
        )
        const indices = gen.const('indices', (0, codegen_1$d._)`{}`)
        gen.for((0, codegen_1$d._)`;${i}--;`, () => {
          gen.let(item, (0, codegen_1$d._)`${data2}[${i}]`)
          gen.if(wrongType, (0, codegen_1$d._)`continue`)
          if (itemTypes.length > 1)
            gen.if((0, codegen_1$d._)`typeof ${item} == "string"`, (0, codegen_1$d._)`${item} += "_"`)
          gen
            .if((0, codegen_1$d._)`typeof ${indices}[${item}] == "number"`, () => {
              gen.assign(j, (0, codegen_1$d._)`${indices}[${item}]`)
              cxt.error()
              gen.assign(valid, false).break()
            })
            .code((0, codegen_1$d._)`${indices}[${item}] = ${i}`)
        })
      }
      function loopN2(i, j) {
        const eql = (0, util_1$g.useFunc)(gen, equal_1$2.default)
        const outer = gen.name('outer')
        gen.label(outer).for((0, codegen_1$d._)`;${i}--;`, () =>
          gen.for((0, codegen_1$d._)`${j} = ${i}; ${j}--;`, () =>
            gen.if((0, codegen_1$d._)`${eql}(${data2}[${i}], ${data2}[${j}])`, () => {
              cxt.error()
              gen.assign(valid, false).break(outer)
            })
          )
        )
      }
    }
  }
  uniqueItems$1.default = def$j
  var _const$1 = {}
  Object.defineProperty(_const$1, '__esModule', { value: true })
  const codegen_1$c = codegen
  const util_1$f = util$7
  const equal_1$1 = equal$3
  const error$a = {
    message: 'must be equal to constant',
    params: ({ schemaCode }) => (0, codegen_1$c._)`{allowedValue: ${schemaCode}}`
  }
  const def$i = {
    keyword: 'const',
    $data: true,
    error: error$a,
    code(cxt) {
      const { gen, data: data2, $data, schemaCode, schema } = cxt
      if ($data || (schema && typeof schema == 'object')) {
        cxt.fail$data((0, codegen_1$c._)`!${(0, util_1$f.useFunc)(gen, equal_1$1.default)}(${data2}, ${schemaCode})`)
      } else {
        cxt.fail((0, codegen_1$c._)`${schema} !== ${data2}`)
      }
    }
  }
  _const$1.default = def$i
  var _enum$1 = {}
  Object.defineProperty(_enum$1, '__esModule', { value: true })
  const codegen_1$b = codegen
  const util_1$e = util$7
  const equal_1 = equal$3
  const error$9 = {
    message: 'must be equal to one of the allowed values',
    params: ({ schemaCode }) => (0, codegen_1$b._)`{allowedValues: ${schemaCode}}`
  }
  const def$h = {
    keyword: 'enum',
    schemaType: 'array',
    $data: true,
    error: error$9,
    code(cxt) {
      const { gen, data: data2, $data, schema, schemaCode, it } = cxt
      if (!$data && schema.length === 0) throw new Error('enum must have non-empty array')
      const useLoop = schema.length >= it.opts.loopEnum
      let eql
      const getEql = () => (eql !== null && eql !== void 0 ? eql : (eql = (0, util_1$e.useFunc)(gen, equal_1.default)))
      let valid
      if (useLoop || $data) {
        valid = gen.let('valid')
        cxt.block$data(valid, loopEnum)
      } else {
        if (!Array.isArray(schema)) throw new Error('ajv implementation error')
        const vSchema = gen.const('vSchema', schemaCode)
        valid = (0, codegen_1$b.or)(...schema.map((_x, i) => equalCode(vSchema, i)))
      }
      cxt.pass(valid)
      function loopEnum() {
        gen.assign(valid, false)
        gen.forOf('v', schemaCode, (v) =>
          gen.if((0, codegen_1$b._)`${getEql()}(${data2}, ${v})`, () => gen.assign(valid, true).break())
        )
      }
      function equalCode(vSchema, i) {
        const sch = schema[i]
        return typeof sch === 'object' && sch !== null
          ? (0, codegen_1$b._)`${getEql()}(${data2}, ${vSchema}[${i}])`
          : (0, codegen_1$b._)`${data2} === ${sch}`
      }
    }
  }
  _enum$1.default = def$h
  Object.defineProperty(validation$1, '__esModule', { value: true })
  const limitNumber_1 = limitNumber
  const multipleOf_1 = multipleOf$1
  const limitLength_1 = limitLength
  const pattern_1 = pattern$1
  const limitProperties_1 = limitProperties
  const required_1 = required$2
  const limitItems_1 = limitItems
  const uniqueItems_1 = uniqueItems$1
  const const_1 = _const$1
  const enum_1 = _enum$1
  const validation = [
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
    { keyword: 'type', schemaType: ['string', 'array'] },
    { keyword: 'nullable', schemaType: 'boolean' },
    const_1.default,
    enum_1.default
  ]
  validation$1.default = validation
  var applicator = {}
  var additionalItems = {}
  Object.defineProperty(additionalItems, '__esModule', { value: true })
  additionalItems.validateAdditionalItems = void 0
  const codegen_1$a = codegen
  const util_1$d = util$7
  const error$8 = {
    message: ({ params: { len } }) => (0, codegen_1$a.str)`must NOT have more than ${len} items`,
    params: ({ params: { len } }) => (0, codegen_1$a._)`{limit: ${len}}`
  }
  const def$g = {
    keyword: 'additionalItems',
    type: 'array',
    schemaType: ['boolean', 'object'],
    before: 'uniqueItems',
    error: error$8,
    code(cxt) {
      const { parentSchema, it } = cxt
      const { items: items2 } = parentSchema
      if (!Array.isArray(items2)) {
        ;(0, util_1$d.checkStrictMode)(it, '"additionalItems" is ignored when "items" is not an array of schemas')
        return
      }
      validateAdditionalItems(cxt, items2)
    }
  }
  function validateAdditionalItems(cxt, items2) {
    const { gen, schema, data: data2, keyword: keyword2, it } = cxt
    it.items = true
    const len = gen.const('len', (0, codegen_1$a._)`${data2}.length`)
    if (schema === false) {
      cxt.setParams({ len: items2.length })
      cxt.pass((0, codegen_1$a._)`${len} <= ${items2.length}`)
    } else if (typeof schema == 'object' && !(0, util_1$d.alwaysValidSchema)(it, schema)) {
      const valid = gen.var('valid', (0, codegen_1$a._)`${len} <= ${items2.length}`)
      gen.if((0, codegen_1$a.not)(valid), () => validateItems(valid))
      cxt.ok(valid)
    }
    function validateItems(valid) {
      gen.forRange('i', items2.length, len, (i) => {
        cxt.subschema({ keyword: keyword2, dataProp: i, dataPropType: util_1$d.Type.Num }, valid)
        if (!it.allErrors) gen.if((0, codegen_1$a.not)(valid), () => gen.break())
      })
    }
  }
  additionalItems.validateAdditionalItems = validateAdditionalItems
  additionalItems.default = def$g
  var prefixItems = {}
  var items$1 = {}
  Object.defineProperty(items$1, '__esModule', { value: true })
  items$1.validateTuple = void 0
  const codegen_1$9 = codegen
  const util_1$c = util$7
  const code_1$5 = code
  const def$f = {
    keyword: 'items',
    type: 'array',
    schemaType: ['object', 'array', 'boolean'],
    before: 'uniqueItems',
    code(cxt) {
      const { schema, it } = cxt
      if (Array.isArray(schema)) return validateTuple(cxt, 'additionalItems', schema)
      it.items = true
      if ((0, util_1$c.alwaysValidSchema)(it, schema)) return
      cxt.ok((0, code_1$5.validateArray)(cxt))
    }
  }
  function validateTuple(cxt, extraItems, schArr = cxt.schema) {
    const { gen, parentSchema, data: data2, keyword: keyword2, it } = cxt
    checkStrictTuple(parentSchema)
    if (it.opts.unevaluated && schArr.length && it.items !== true) {
      it.items = util_1$c.mergeEvaluated.items(gen, schArr.length, it.items)
    }
    const valid = gen.name('valid')
    const len = gen.const('len', (0, codegen_1$9._)`${data2}.length`)
    schArr.forEach((sch, i) => {
      if ((0, util_1$c.alwaysValidSchema)(it, sch)) return
      gen.if((0, codegen_1$9._)`${len} > ${i}`, () =>
        cxt.subschema(
          {
            keyword: keyword2,
            schemaProp: i,
            dataProp: i
          },
          valid
        )
      )
      cxt.ok(valid)
    })
    function checkStrictTuple(sch) {
      const { opts, errSchemaPath } = it
      const l = schArr.length
      const fullTuple = l === sch.minItems && (l === sch.maxItems || sch[extraItems] === false)
      if (opts.strictTuples && !fullTuple) {
        const msg = `"${keyword2}" is ${l}-tuple, but minItems or maxItems/${extraItems} are not specified or different at path "${errSchemaPath}"`
        ;(0, util_1$c.checkStrictMode)(it, msg, opts.strictTuples)
      }
    }
  }
  items$1.validateTuple = validateTuple
  items$1.default = def$f
  Object.defineProperty(prefixItems, '__esModule', { value: true })
  const items_1$1 = items$1
  const def$e = {
    keyword: 'prefixItems',
    type: 'array',
    schemaType: ['array'],
    before: 'uniqueItems',
    code: (cxt) => (0, items_1$1.validateTuple)(cxt, 'items')
  }
  prefixItems.default = def$e
  var items2020 = {}
  Object.defineProperty(items2020, '__esModule', { value: true })
  const codegen_1$8 = codegen
  const util_1$b = util$7
  const code_1$4 = code
  const additionalItems_1$1 = additionalItems
  const error$7 = {
    message: ({ params: { len } }) => (0, codegen_1$8.str)`must NOT have more than ${len} items`,
    params: ({ params: { len } }) => (0, codegen_1$8._)`{limit: ${len}}`
  }
  const def$d = {
    keyword: 'items',
    type: 'array',
    schemaType: ['object', 'boolean'],
    before: 'uniqueItems',
    error: error$7,
    code(cxt) {
      const { schema, parentSchema, it } = cxt
      const { prefixItems: prefixItems2 } = parentSchema
      it.items = true
      if ((0, util_1$b.alwaysValidSchema)(it, schema)) return
      if (prefixItems2) (0, additionalItems_1$1.validateAdditionalItems)(cxt, prefixItems2)
      else cxt.ok((0, code_1$4.validateArray)(cxt))
    }
  }
  items2020.default = def$d
  var contains$1 = {}
  Object.defineProperty(contains$1, '__esModule', { value: true })
  const codegen_1$7 = codegen
  const util_1$a = util$7
  const error$6 = {
    message: ({ params: { min, max } }) =>
      max === void 0
        ? (0, codegen_1$7.str)`must contain at least ${min} valid item(s)`
        : (0, codegen_1$7.str)`must contain at least ${min} and no more than ${max} valid item(s)`,
    params: ({ params: { min, max } }) =>
      max === void 0
        ? (0, codegen_1$7._)`{minContains: ${min}}`
        : (0, codegen_1$7._)`{minContains: ${min}, maxContains: ${max}}`
  }
  const def$c = {
    keyword: 'contains',
    type: 'array',
    schemaType: ['object', 'boolean'],
    before: 'uniqueItems',
    trackErrors: true,
    error: error$6,
    code(cxt) {
      const { gen, schema, parentSchema, data: data2, it } = cxt
      let min
      let max
      const { minContains, maxContains } = parentSchema
      if (it.opts.next) {
        min = minContains === void 0 ? 1 : minContains
        max = maxContains
      } else {
        min = 1
      }
      const len = gen.const('len', (0, codegen_1$7._)`${data2}.length`)
      cxt.setParams({ min, max })
      if (max === void 0 && min === 0) {
        ;(0, util_1$a.checkStrictMode)(it, `"minContains" == 0 without "maxContains": "contains" keyword ignored`)
        return
      }
      if (max !== void 0 && min > max) {
        ;(0, util_1$a.checkStrictMode)(it, `"minContains" > "maxContains" is always invalid`)
        cxt.fail()
        return
      }
      if ((0, util_1$a.alwaysValidSchema)(it, schema)) {
        let cond = (0, codegen_1$7._)`${len} >= ${min}`
        if (max !== void 0) cond = (0, codegen_1$7._)`${cond} && ${len} <= ${max}`
        cxt.pass(cond)
        return
      }
      it.items = true
      const valid = gen.name('valid')
      if (max === void 0 && min === 1) {
        validateItems(valid, () => gen.if(valid, () => gen.break()))
      } else if (min === 0) {
        gen.let(valid, true)
        if (max !== void 0) gen.if((0, codegen_1$7._)`${data2}.length > 0`, validateItemsWithCount)
      } else {
        gen.let(valid, false)
        validateItemsWithCount()
      }
      cxt.result(valid, () => cxt.reset())
      function validateItemsWithCount() {
        const schValid = gen.name('_valid')
        const count = gen.let('count', 0)
        validateItems(schValid, () => gen.if(schValid, () => checkLimits(count)))
      }
      function validateItems(_valid, block) {
        gen.forRange('i', 0, len, (i) => {
          cxt.subschema(
            {
              keyword: 'contains',
              dataProp: i,
              dataPropType: util_1$a.Type.Num,
              compositeRule: true
            },
            _valid
          )
          block()
        })
      }
      function checkLimits(count) {
        gen.code((0, codegen_1$7._)`${count}++`)
        if (max === void 0) {
          gen.if((0, codegen_1$7._)`${count} >= ${min}`, () => gen.assign(valid, true).break())
        } else {
          gen.if((0, codegen_1$7._)`${count} > ${max}`, () => gen.assign(valid, false).break())
          if (min === 1) gen.assign(valid, true)
          else gen.if((0, codegen_1$7._)`${count} >= ${min}`, () => gen.assign(valid, true))
        }
      }
    }
  }
  contains$1.default = def$c
  var dependencies$1 = {}
  ;(function (exports3) {
    Object.defineProperty(exports3, '__esModule', { value: true })
    exports3.validateSchemaDeps = exports3.validatePropertyDeps = exports3.error = void 0
    const codegen_12 = codegen
    const util_12 = util$7
    const code_12 = code
    exports3.error = {
      message: ({ params: { property, depsCount, deps } }) => {
        const property_ies = depsCount === 1 ? 'property' : 'properties'
        return (0, codegen_12.str)`must have ${property_ies} ${deps} when property ${property} is present`
      },
      params: ({ params: { property, depsCount, deps, missingProperty } }) => (0, codegen_12._)`{property: ${property},
    missingProperty: ${missingProperty},
    depsCount: ${depsCount},
    deps: ${deps}}`
      // TODO change to reference
    }
    const def2 = {
      keyword: 'dependencies',
      type: 'object',
      schemaType: 'object',
      error: exports3.error,
      code(cxt) {
        const [propDeps, schDeps] = splitDependencies(cxt)
        validatePropertyDeps(cxt, propDeps)
        validateSchemaDeps(cxt, schDeps)
      }
    }
    function splitDependencies({ schema }) {
      const propertyDeps = {}
      const schemaDeps = {}
      for (const key in schema) {
        if (key === '__proto__') continue
        const deps = Array.isArray(schema[key]) ? propertyDeps : schemaDeps
        deps[key] = schema[key]
      }
      return [propertyDeps, schemaDeps]
    }
    function validatePropertyDeps(cxt, propertyDeps = cxt.schema) {
      const { gen, data: data2, it } = cxt
      if (Object.keys(propertyDeps).length === 0) return
      const missing = gen.let('missing')
      for (const prop in propertyDeps) {
        const deps = propertyDeps[prop]
        if (deps.length === 0) continue
        const hasProperty = (0, code_12.propertyInData)(gen, data2, prop, it.opts.ownProperties)
        cxt.setParams({
          property: prop,
          depsCount: deps.length,
          deps: deps.join(', ')
        })
        if (it.allErrors) {
          gen.if(hasProperty, () => {
            for (const depProp of deps) {
              ;(0, code_12.checkReportMissingProp)(cxt, depProp)
            }
          })
        } else {
          gen.if((0, codegen_12._)`${hasProperty} && (${(0, code_12.checkMissingProp)(cxt, deps, missing)})`)
          ;(0, code_12.reportMissingProp)(cxt, missing)
          gen.else()
        }
      }
    }
    exports3.validatePropertyDeps = validatePropertyDeps
    function validateSchemaDeps(cxt, schemaDeps = cxt.schema) {
      const { gen, data: data2, keyword: keyword2, it } = cxt
      const valid = gen.name('valid')
      for (const prop in schemaDeps) {
        if ((0, util_12.alwaysValidSchema)(it, schemaDeps[prop])) continue
        gen.if(
          (0, code_12.propertyInData)(gen, data2, prop, it.opts.ownProperties),
          () => {
            const schCxt = cxt.subschema({ keyword: keyword2, schemaProp: prop }, valid)
            cxt.mergeValidEvaluated(schCxt, valid)
          },
          () => gen.var(valid, true)
          // TODO var
        )
        cxt.ok(valid)
      }
    }
    exports3.validateSchemaDeps = validateSchemaDeps
    exports3.default = def2
  })(dependencies$1)
  var propertyNames$1 = {}
  Object.defineProperty(propertyNames$1, '__esModule', { value: true })
  const codegen_1$6 = codegen
  const util_1$9 = util$7
  const error$5 = {
    message: 'property name must be valid',
    params: ({ params }) => (0, codegen_1$6._)`{propertyName: ${params.propertyName}}`
  }
  const def$b = {
    keyword: 'propertyNames',
    type: 'object',
    schemaType: ['object', 'boolean'],
    error: error$5,
    code(cxt) {
      const { gen, schema, data: data2, it } = cxt
      if ((0, util_1$9.alwaysValidSchema)(it, schema)) return
      const valid = gen.name('valid')
      gen.forIn('key', data2, (key) => {
        cxt.setParams({ propertyName: key })
        cxt.subschema(
          {
            keyword: 'propertyNames',
            data: key,
            dataTypes: ['string'],
            propertyName: key,
            compositeRule: true
          },
          valid
        )
        gen.if((0, codegen_1$6.not)(valid), () => {
          cxt.error(true)
          if (!it.allErrors) gen.break()
        })
      })
      cxt.ok(valid)
    }
  }
  propertyNames$1.default = def$b
  var additionalProperties$1 = {}
  Object.defineProperty(additionalProperties$1, '__esModule', { value: true })
  const code_1$3 = code
  const codegen_1$5 = codegen
  const names_1 = names$1
  const util_1$8 = util$7
  const error$4 = {
    message: 'must NOT have additional properties',
    params: ({ params }) => (0, codegen_1$5._)`{additionalProperty: ${params.additionalProperty}}`
  }
  const def$a = {
    keyword: 'additionalProperties',
    type: ['object'],
    schemaType: ['boolean', 'object'],
    allowUndefined: true,
    trackErrors: true,
    error: error$4,
    code(cxt) {
      const { gen, schema, parentSchema, data: data2, errsCount, it } = cxt
      if (!errsCount) throw new Error('ajv implementation error')
      const { allErrors, opts } = it
      it.props = true
      if (opts.removeAdditional !== 'all' && (0, util_1$8.alwaysValidSchema)(it, schema)) return
      const props = (0, code_1$3.allSchemaProperties)(parentSchema.properties)
      const patProps = (0, code_1$3.allSchemaProperties)(parentSchema.patternProperties)
      checkAdditionalProperties()
      cxt.ok((0, codegen_1$5._)`${errsCount} === ${names_1.default.errors}`)
      function checkAdditionalProperties() {
        gen.forIn('key', data2, (key) => {
          if (!props.length && !patProps.length) additionalPropertyCode(key)
          else gen.if(isAdditional(key), () => additionalPropertyCode(key))
        })
      }
      function isAdditional(key) {
        let definedProp
        if (props.length > 8) {
          const propsSchema = (0, util_1$8.schemaRefOrVal)(it, parentSchema.properties, 'properties')
          definedProp = (0, code_1$3.isOwnProperty)(gen, propsSchema, key)
        } else if (props.length) {
          definedProp = (0, codegen_1$5.or)(...props.map((p) => (0, codegen_1$5._)`${key} === ${p}`))
        } else {
          definedProp = codegen_1$5.nil
        }
        if (patProps.length) {
          definedProp = (0, codegen_1$5.or)(
            definedProp,
            ...patProps.map((p) => (0, codegen_1$5._)`${(0, code_1$3.usePattern)(cxt, p)}.test(${key})`)
          )
        }
        return (0, codegen_1$5.not)(definedProp)
      }
      function deleteAdditional(key) {
        gen.code((0, codegen_1$5._)`delete ${data2}[${key}]`)
      }
      function additionalPropertyCode(key) {
        if (opts.removeAdditional === 'all' || (opts.removeAdditional && schema === false)) {
          deleteAdditional(key)
          return
        }
        if (schema === false) {
          cxt.setParams({ additionalProperty: key })
          cxt.error()
          if (!allErrors) gen.break()
          return
        }
        if (typeof schema == 'object' && !(0, util_1$8.alwaysValidSchema)(it, schema)) {
          const valid = gen.name('valid')
          if (opts.removeAdditional === 'failing') {
            applyAdditionalSchema(key, valid, false)
            gen.if((0, codegen_1$5.not)(valid), () => {
              cxt.reset()
              deleteAdditional(key)
            })
          } else {
            applyAdditionalSchema(key, valid)
            if (!allErrors) gen.if((0, codegen_1$5.not)(valid), () => gen.break())
          }
        }
      }
      function applyAdditionalSchema(key, valid, errors2) {
        const subschema2 = {
          keyword: 'additionalProperties',
          dataProp: key,
          dataPropType: util_1$8.Type.Str
        }
        if (errors2 === false) {
          Object.assign(subschema2, {
            compositeRule: true,
            createErrors: false,
            allErrors: false
          })
        }
        cxt.subschema(subschema2, valid)
      }
    }
  }
  additionalProperties$1.default = def$a
  var properties$4 = {}
  Object.defineProperty(properties$4, '__esModule', { value: true })
  const validate_1 = requireValidate()
  const code_1$2 = code
  const util_1$7 = util$7
  const additionalProperties_1$1 = additionalProperties$1
  const def$9 = {
    keyword: 'properties',
    type: 'object',
    schemaType: 'object',
    code(cxt) {
      const { gen, schema, parentSchema, data: data2, it } = cxt
      if (it.opts.removeAdditional === 'all' && parentSchema.additionalProperties === void 0) {
        additionalProperties_1$1.default.code(
          new validate_1.KeywordCxt(it, additionalProperties_1$1.default, 'additionalProperties')
        )
      }
      const allProps = (0, code_1$2.allSchemaProperties)(schema)
      for (const prop of allProps) {
        it.definedProperties.add(prop)
      }
      if (it.opts.unevaluated && allProps.length && it.props !== true) {
        it.props = util_1$7.mergeEvaluated.props(gen, (0, util_1$7.toHash)(allProps), it.props)
      }
      const properties2 = allProps.filter((p) => !(0, util_1$7.alwaysValidSchema)(it, schema[p]))
      if (properties2.length === 0) return
      const valid = gen.name('valid')
      for (const prop of properties2) {
        if (hasDefault(prop)) {
          applyPropertySchema(prop)
        } else {
          gen.if((0, code_1$2.propertyInData)(gen, data2, prop, it.opts.ownProperties))
          applyPropertySchema(prop)
          if (!it.allErrors) gen.else().var(valid, true)
          gen.endIf()
        }
        cxt.it.definedProperties.add(prop)
        cxt.ok(valid)
      }
      function hasDefault(prop) {
        return it.opts.useDefaults && !it.compositeRule && schema[prop].default !== void 0
      }
      function applyPropertySchema(prop) {
        cxt.subschema(
          {
            keyword: 'properties',
            schemaProp: prop,
            dataProp: prop
          },
          valid
        )
      }
    }
  }
  properties$4.default = def$9
  var patternProperties = {}
  Object.defineProperty(patternProperties, '__esModule', { value: true })
  const code_1$1 = code
  const codegen_1$4 = codegen
  const util_1$6 = util$7
  const util_2 = util$7
  const def$8 = {
    keyword: 'patternProperties',
    type: 'object',
    schemaType: 'object',
    code(cxt) {
      const { gen, schema, data: data2, parentSchema, it } = cxt
      const { opts } = it
      const patterns = (0, code_1$1.allSchemaProperties)(schema)
      const alwaysValidPatterns = patterns.filter((p) => (0, util_1$6.alwaysValidSchema)(it, schema[p]))
      if (
        patterns.length === 0 ||
        (alwaysValidPatterns.length === patterns.length && (!it.opts.unevaluated || it.props === true))
      ) {
        return
      }
      const checkProperties = opts.strictSchema && !opts.allowMatchingProperties && parentSchema.properties
      const valid = gen.name('valid')
      if (it.props !== true && !(it.props instanceof codegen_1$4.Name)) {
        it.props = (0, util_2.evaluatedPropsToName)(gen, it.props)
      }
      const { props } = it
      validatePatternProperties()
      function validatePatternProperties() {
        for (const pat of patterns) {
          if (checkProperties) checkMatchingProperties(pat)
          if (it.allErrors) {
            validateProperties(pat)
          } else {
            gen.var(valid, true)
            validateProperties(pat)
            gen.if(valid)
          }
        }
      }
      function checkMatchingProperties(pat) {
        for (const prop in checkProperties) {
          if (new RegExp(pat).test(prop)) {
            ;(0, util_1$6.checkStrictMode)(it, `property ${prop} matches pattern ${pat} (use allowMatchingProperties)`)
          }
        }
      }
      function validateProperties(pat) {
        gen.forIn('key', data2, (key) => {
          gen.if((0, codegen_1$4._)`${(0, code_1$1.usePattern)(cxt, pat)}.test(${key})`, () => {
            const alwaysValid = alwaysValidPatterns.includes(pat)
            if (!alwaysValid) {
              cxt.subschema(
                {
                  keyword: 'patternProperties',
                  schemaProp: pat,
                  dataProp: key,
                  dataPropType: util_2.Type.Str
                },
                valid
              )
            }
            if (it.opts.unevaluated && props !== true) {
              gen.assign((0, codegen_1$4._)`${props}[${key}]`, true)
            } else if (!alwaysValid && !it.allErrors) {
              gen.if((0, codegen_1$4.not)(valid), () => gen.break())
            }
          })
        })
      }
    }
  }
  patternProperties.default = def$8
  var not$1 = {}
  Object.defineProperty(not$1, '__esModule', { value: true })
  const util_1$5 = util$7
  const def$7 = {
    keyword: 'not',
    schemaType: ['object', 'boolean'],
    trackErrors: true,
    code(cxt) {
      const { gen, schema, it } = cxt
      if ((0, util_1$5.alwaysValidSchema)(it, schema)) {
        cxt.fail()
        return
      }
      const valid = gen.name('valid')
      cxt.subschema(
        {
          keyword: 'not',
          compositeRule: true,
          createErrors: false,
          allErrors: false
        },
        valid
      )
      cxt.failResult(
        valid,
        () => cxt.reset(),
        () => cxt.error()
      )
    },
    error: { message: 'must NOT be valid' }
  }
  not$1.default = def$7
  var anyOf$1 = {}
  Object.defineProperty(anyOf$1, '__esModule', { value: true })
  const code_1 = code
  const def$6 = {
    keyword: 'anyOf',
    schemaType: 'array',
    trackErrors: true,
    code: code_1.validateUnion,
    error: { message: 'must match a schema in anyOf' }
  }
  anyOf$1.default = def$6
  var oneOf$1 = {}
  Object.defineProperty(oneOf$1, '__esModule', { value: true })
  const codegen_1$3 = codegen
  const util_1$4 = util$7
  const error$3 = {
    message: 'must match exactly one schema in oneOf',
    params: ({ params }) => (0, codegen_1$3._)`{passingSchemas: ${params.passing}}`
  }
  const def$5 = {
    keyword: 'oneOf',
    schemaType: 'array',
    trackErrors: true,
    error: error$3,
    code(cxt) {
      const { gen, schema, parentSchema, it } = cxt
      if (!Array.isArray(schema)) throw new Error('ajv implementation error')
      if (it.opts.discriminator && parentSchema.discriminator) return
      const schArr = schema
      const valid = gen.let('valid', false)
      const passing = gen.let('passing', null)
      const schValid = gen.name('_valid')
      cxt.setParams({ passing })
      gen.block(validateOneOf)
      cxt.result(
        valid,
        () => cxt.reset(),
        () => cxt.error(true)
      )
      function validateOneOf() {
        schArr.forEach((sch, i) => {
          let schCxt
          if ((0, util_1$4.alwaysValidSchema)(it, sch)) {
            gen.var(schValid, true)
          } else {
            schCxt = cxt.subschema(
              {
                keyword: 'oneOf',
                schemaProp: i,
                compositeRule: true
              },
              schValid
            )
          }
          if (i > 0) {
            gen
              .if((0, codegen_1$3._)`${schValid} && ${valid}`)
              .assign(valid, false)
              .assign(passing, (0, codegen_1$3._)`[${passing}, ${i}]`)
              .else()
          }
          gen.if(schValid, () => {
            gen.assign(valid, true)
            gen.assign(passing, i)
            if (schCxt) cxt.mergeEvaluated(schCxt, codegen_1$3.Name)
          })
        })
      }
    }
  }
  oneOf$1.default = def$5
  var allOf$1 = {}
  Object.defineProperty(allOf$1, '__esModule', { value: true })
  const util_1$3 = util$7
  const def$4 = {
    keyword: 'allOf',
    schemaType: 'array',
    code(cxt) {
      const { gen, schema, it } = cxt
      if (!Array.isArray(schema)) throw new Error('ajv implementation error')
      const valid = gen.name('valid')
      schema.forEach((sch, i) => {
        if ((0, util_1$3.alwaysValidSchema)(it, sch)) return
        const schCxt = cxt.subschema({ keyword: 'allOf', schemaProp: i }, valid)
        cxt.ok(valid)
        cxt.mergeEvaluated(schCxt)
      })
    }
  }
  allOf$1.default = def$4
  var _if$1 = {}
  Object.defineProperty(_if$1, '__esModule', { value: true })
  const codegen_1$2 = codegen
  const util_1$2 = util$7
  const error$2 = {
    message: ({ params }) => (0, codegen_1$2.str)`must match "${params.ifClause}" schema`,
    params: ({ params }) => (0, codegen_1$2._)`{failingKeyword: ${params.ifClause}}`
  }
  const def$3 = {
    keyword: 'if',
    schemaType: ['object', 'boolean'],
    trackErrors: true,
    error: error$2,
    code(cxt) {
      const { gen, parentSchema, it } = cxt
      if (parentSchema.then === void 0 && parentSchema.else === void 0) {
        ;(0, util_1$2.checkStrictMode)(it, '"if" without "then" and "else" is ignored')
      }
      const hasThen = hasSchema(it, 'then')
      const hasElse = hasSchema(it, 'else')
      if (!hasThen && !hasElse) return
      const valid = gen.let('valid', true)
      const schValid = gen.name('_valid')
      validateIf()
      cxt.reset()
      if (hasThen && hasElse) {
        const ifClause = gen.let('ifClause')
        cxt.setParams({ ifClause })
        gen.if(schValid, validateClause('then', ifClause), validateClause('else', ifClause))
      } else if (hasThen) {
        gen.if(schValid, validateClause('then'))
      } else {
        gen.if((0, codegen_1$2.not)(schValid), validateClause('else'))
      }
      cxt.pass(valid, () => cxt.error(true))
      function validateIf() {
        const schCxt = cxt.subschema(
          {
            keyword: 'if',
            compositeRule: true,
            createErrors: false,
            allErrors: false
          },
          schValid
        )
        cxt.mergeEvaluated(schCxt)
      }
      function validateClause(keyword2, ifClause) {
        return () => {
          const schCxt = cxt.subschema({ keyword: keyword2 }, schValid)
          gen.assign(valid, schValid)
          cxt.mergeValidEvaluated(schCxt, valid)
          if (ifClause) gen.assign(ifClause, (0, codegen_1$2._)`${keyword2}`)
          else cxt.setParams({ ifClause: keyword2 })
        }
      }
    }
  }
  function hasSchema(it, keyword2) {
    const schema = it.schema[keyword2]
    return schema !== void 0 && !(0, util_1$2.alwaysValidSchema)(it, schema)
  }
  _if$1.default = def$3
  var thenElse = {}
  Object.defineProperty(thenElse, '__esModule', { value: true })
  const util_1$1 = util$7
  const def$2 = {
    keyword: ['then', 'else'],
    schemaType: ['object', 'boolean'],
    code({ keyword: keyword2, parentSchema, it }) {
      if (parentSchema.if === void 0) (0, util_1$1.checkStrictMode)(it, `"${keyword2}" without "if" is ignored`)
    }
  }
  thenElse.default = def$2
  Object.defineProperty(applicator, '__esModule', { value: true })
  const additionalItems_1 = additionalItems
  const prefixItems_1 = prefixItems
  const items_1 = items$1
  const items2020_1 = items2020
  const contains_1 = contains$1
  const dependencies_1 = dependencies$1
  const propertyNames_1 = propertyNames$1
  const additionalProperties_1 = additionalProperties$1
  const properties_1 = properties$4
  const patternProperties_1 = patternProperties
  const not_1 = not$1
  const anyOf_1 = anyOf$1
  const oneOf_1 = oneOf$1
  const allOf_1 = allOf$1
  const if_1 = _if$1
  const thenElse_1 = thenElse
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
    ]
    if (draft2020) applicator2.push(prefixItems_1.default, items2020_1.default)
    else applicator2.push(additionalItems_1.default, items_1.default)
    applicator2.push(contains_1.default)
    return applicator2
  }
  applicator.default = getApplicator
  var format$3 = {}
  var format$2 = {}
  Object.defineProperty(format$2, '__esModule', { value: true })
  const codegen_1$1 = codegen
  const error$1 = {
    message: ({ schemaCode }) => (0, codegen_1$1.str)`must match format "${schemaCode}"`,
    params: ({ schemaCode }) => (0, codegen_1$1._)`{format: ${schemaCode}}`
  }
  const def$1 = {
    keyword: 'format',
    type: ['number', 'string'],
    schemaType: 'string',
    $data: true,
    error: error$1,
    code(cxt, ruleType) {
      const { gen, data: data2, $data, schema, schemaCode, it } = cxt
      const { opts, errSchemaPath, schemaEnv, self: self2 } = it
      if (!opts.validateFormats) return
      if ($data) validate$DataFormat()
      else validateFormat()
      function validate$DataFormat() {
        const fmts = gen.scopeValue('formats', {
          ref: self2.formats,
          code: opts.code.formats
        })
        const fDef = gen.const('fDef', (0, codegen_1$1._)`${fmts}[${schemaCode}]`)
        const fType = gen.let('fType')
        const format2 = gen.let('format')
        gen.if(
          (0, codegen_1$1._)`typeof ${fDef} == "object" && !(${fDef} instanceof RegExp)`,
          () =>
            gen
              .assign(fType, (0, codegen_1$1._)`${fDef}.type || "string"`)
              .assign(format2, (0, codegen_1$1._)`${fDef}.validate`),
          () => gen.assign(fType, (0, codegen_1$1._)`"string"`).assign(format2, fDef)
        )
        cxt.fail$data((0, codegen_1$1.or)(unknownFmt(), invalidFmt()))
        function unknownFmt() {
          if (opts.strictSchema === false) return codegen_1$1.nil
          return (0, codegen_1$1._)`${schemaCode} && !${format2}`
        }
        function invalidFmt() {
          const callFormat = schemaEnv.$async
            ? (0, codegen_1$1._)`(${fDef}.async ? await ${format2}(${data2}) : ${format2}(${data2}))`
            : (0, codegen_1$1._)`${format2}(${data2})`
          const validData = (0,
          codegen_1$1._)`(typeof ${format2} == "function" ? ${callFormat} : ${format2}.test(${data2}))`
          return (0, codegen_1$1._)`${format2} && ${format2} !== true && ${fType} === ${ruleType} && !${validData}`
        }
      }
      function validateFormat() {
        const formatDef = self2.formats[schema]
        if (!formatDef) {
          unknownFormat()
          return
        }
        if (formatDef === true) return
        const [fmtType, format2, fmtRef] = getFormat(formatDef)
        if (fmtType === ruleType) cxt.pass(validCondition())
        function unknownFormat() {
          if (opts.strictSchema === false) {
            self2.logger.warn(unknownMsg())
            return
          }
          throw new Error(unknownMsg())
          function unknownMsg() {
            return `unknown format "${schema}" ignored in schema at path "${errSchemaPath}"`
          }
        }
        function getFormat(fmtDef) {
          const code2 =
            fmtDef instanceof RegExp
              ? (0, codegen_1$1.regexpCode)(fmtDef)
              : opts.code.formats
                ? (0, codegen_1$1._)`${opts.code.formats}${(0, codegen_1$1.getProperty)(schema)}`
                : void 0
          const fmt = gen.scopeValue('formats', { key: schema, ref: fmtDef, code: code2 })
          if (typeof fmtDef == 'object' && !(fmtDef instanceof RegExp)) {
            return [fmtDef.type || 'string', fmtDef.validate, (0, codegen_1$1._)`${fmt}.validate`]
          }
          return ['string', fmtDef, fmt]
        }
        function validCondition() {
          if (typeof formatDef == 'object' && !(formatDef instanceof RegExp) && formatDef.async) {
            if (!schemaEnv.$async) throw new Error('async format in sync schema')
            return (0, codegen_1$1._)`await ${fmtRef}(${data2})`
          }
          return typeof format2 == 'function'
            ? (0, codegen_1$1._)`${fmtRef}(${data2})`
            : (0, codegen_1$1._)`${fmtRef}.test(${data2})`
        }
      }
    }
  }
  format$2.default = def$1
  Object.defineProperty(format$3, '__esModule', { value: true })
  const format_1$1 = format$2
  const format$1 = [format_1$1.default]
  format$3.default = format$1
  var metadata = {}
  Object.defineProperty(metadata, '__esModule', { value: true })
  metadata.contentVocabulary = metadata.metadataVocabulary = void 0
  metadata.metadataVocabulary = ['title', 'description', 'default', 'deprecated', 'readOnly', 'writeOnly', 'examples']
  metadata.contentVocabulary = ['contentMediaType', 'contentEncoding', 'contentSchema']
  Object.defineProperty(draft7, '__esModule', { value: true })
  const core_1 = core$1
  const validation_1 = validation$1
  const applicator_1 = applicator
  const format_1 = format$3
  const metadata_1 = metadata
  const draft7Vocabularies = [
    core_1.default,
    validation_1.default,
    (0, applicator_1.default)(),
    format_1.default,
    metadata_1.metadataVocabulary,
    metadata_1.contentVocabulary
  ]
  draft7.default = draft7Vocabularies
  var discriminator = {}
  var types = {}
  Object.defineProperty(types, '__esModule', { value: true })
  types.DiscrError = void 0
  var DiscrError
  ;(function (DiscrError2) {
    DiscrError2['Tag'] = 'tag'
    DiscrError2['Mapping'] = 'mapping'
  })(DiscrError || (types.DiscrError = DiscrError = {}))
  Object.defineProperty(discriminator, '__esModule', { value: true })
  const codegen_1 = codegen
  const types_1 = types
  const compile_1$1 = compile$2
  const ref_error_1 = ref_error
  const util_1 = util$7
  const error = {
    message: ({ params: { discrError, tagName } }) =>
      discrError === types_1.DiscrError.Tag
        ? `tag "${tagName}" must be string`
        : `value of tag "${tagName}" must be in oneOf`,
    params: ({ params: { discrError, tag, tagName } }) =>
      (0, codegen_1._)`{error: ${discrError}, tag: ${tagName}, tagValue: ${tag}}`
  }
  const def = {
    keyword: 'discriminator',
    type: 'object',
    schemaType: 'object',
    error,
    code(cxt) {
      const { gen, data: data2, schema, parentSchema, it } = cxt
      const { oneOf: oneOf2 } = parentSchema
      if (!it.opts.discriminator) {
        throw new Error('discriminator: requires discriminator option')
      }
      const tagName = schema.propertyName
      if (typeof tagName != 'string') throw new Error('discriminator: requires propertyName')
      if (schema.mapping) throw new Error('discriminator: mapping is not supported')
      if (!oneOf2) throw new Error('discriminator: requires oneOf keyword')
      const valid = gen.let('valid', false)
      const tag = gen.const('tag', (0, codegen_1._)`${data2}${(0, codegen_1.getProperty)(tagName)}`)
      gen.if(
        (0, codegen_1._)`typeof ${tag} == "string"`,
        () => validateMapping(),
        () => cxt.error(false, { discrError: types_1.DiscrError.Tag, tag, tagName })
      )
      cxt.ok(valid)
      function validateMapping() {
        const mapping = getMapping()
        gen.if(false)
        for (const tagValue in mapping) {
          gen.elseIf((0, codegen_1._)`${tag} === ${tagValue}`)
          gen.assign(valid, applyTagSchema(mapping[tagValue]))
        }
        gen.else()
        cxt.error(false, { discrError: types_1.DiscrError.Mapping, tag, tagName })
        gen.endIf()
      }
      function applyTagSchema(schemaProp) {
        const _valid = gen.name('valid')
        const schCxt = cxt.subschema({ keyword: 'oneOf', schemaProp }, _valid)
        cxt.mergeEvaluated(schCxt, codegen_1.Name)
        return _valid
      }
      function getMapping() {
        var _a
        const oneOfMapping = {}
        const topRequired = hasRequired(parentSchema)
        let tagRequired = true
        for (let i = 0; i < oneOf2.length; i++) {
          let sch = oneOf2[i]
          if (
            (sch === null || sch === void 0 ? void 0 : sch.$ref) &&
            !(0, util_1.schemaHasRulesButRef)(sch, it.self.RULES)
          ) {
            const ref2 = sch.$ref
            sch = compile_1$1.resolveRef.call(it.self, it.schemaEnv.root, it.baseId, ref2)
            if (sch instanceof compile_1$1.SchemaEnv) sch = sch.schema
            if (sch === void 0) throw new ref_error_1.default(it.opts.uriResolver, it.baseId, ref2)
          }
          const propSch =
            (_a = sch === null || sch === void 0 ? void 0 : sch.properties) === null || _a === void 0
              ? void 0
              : _a[tagName]
          if (typeof propSch != 'object') {
            throw new Error(`discriminator: oneOf subschemas (or referenced schemas) must have "properties/${tagName}"`)
          }
          tagRequired = tagRequired && (topRequired || hasRequired(sch))
          addMappings(propSch, i)
        }
        if (!tagRequired) throw new Error(`discriminator: "${tagName}" must be required`)
        return oneOfMapping
        function hasRequired({ required: required2 }) {
          return Array.isArray(required2) && required2.includes(tagName)
        }
        function addMappings(sch, i) {
          if (sch.const) {
            addMapping(sch.const, i)
          } else if (sch.enum) {
            for (const tagValue of sch.enum) {
              addMapping(tagValue, i)
            }
          } else {
            throw new Error(`discriminator: "properties/${tagName}" must have "const" or "enum"`)
          }
        }
        function addMapping(tagValue, i) {
          if (typeof tagValue != 'string' || tagValue in oneOfMapping) {
            throw new Error(`discriminator: "${tagName}" values must be unique strings`)
          }
          oneOfMapping[tagValue] = i
        }
      }
    }
  }
  discriminator.default = def
  const $schema$2 = 'http://json-schema.org/draft-07/schema#'
  const $id$2 = 'http://json-schema.org/draft-07/schema#'
  const title$1 = 'Core schema meta-schema'
  const definitions$1 = {
    schemaArray: {
      type: 'array',
      minItems: 1,
      items: {
        $ref: '#'
      }
    },
    nonNegativeInteger: {
      type: 'integer',
      minimum: 0
    },
    nonNegativeIntegerDefault0: {
      allOf: [
        {
          $ref: '#/definitions/nonNegativeInteger'
        },
        {
          'default': 0
        }
      ]
    },
    simpleTypes: {
      'enum': ['array', 'boolean', 'integer', 'null', 'number', 'object', 'string']
    },
    stringArray: {
      type: 'array',
      items: {
        type: 'string'
      },
      uniqueItems: true,
      'default': []
    }
  }
  const type$2 = ['object', 'boolean']
  const properties$3 = {
    $id: {
      type: 'string',
      format: 'uri-reference'
    },
    $schema: {
      type: 'string',
      format: 'uri'
    },
    $ref: {
      type: 'string',
      format: 'uri-reference'
    },
    $comment: {
      type: 'string'
    },
    title: {
      type: 'string'
    },
    description: {
      type: 'string'
    },
    'default': true,
    readOnly: {
      type: 'boolean',
      'default': false
    },
    examples: {
      type: 'array',
      items: true
    },
    multipleOf: {
      type: 'number',
      exclusiveMinimum: 0
    },
    maximum: {
      type: 'number'
    },
    exclusiveMaximum: {
      type: 'number'
    },
    minimum: {
      type: 'number'
    },
    exclusiveMinimum: {
      type: 'number'
    },
    maxLength: {
      $ref: '#/definitions/nonNegativeInteger'
    },
    minLength: {
      $ref: '#/definitions/nonNegativeIntegerDefault0'
    },
    pattern: {
      type: 'string',
      format: 'regex'
    },
    additionalItems: {
      $ref: '#'
    },
    items: {
      anyOf: [
        {
          $ref: '#'
        },
        {
          $ref: '#/definitions/schemaArray'
        }
      ],
      'default': true
    },
    maxItems: {
      $ref: '#/definitions/nonNegativeInteger'
    },
    minItems: {
      $ref: '#/definitions/nonNegativeIntegerDefault0'
    },
    uniqueItems: {
      type: 'boolean',
      'default': false
    },
    contains: {
      $ref: '#'
    },
    maxProperties: {
      $ref: '#/definitions/nonNegativeInteger'
    },
    minProperties: {
      $ref: '#/definitions/nonNegativeIntegerDefault0'
    },
    required: {
      $ref: '#/definitions/stringArray'
    },
    additionalProperties: {
      $ref: '#'
    },
    definitions: {
      type: 'object',
      additionalProperties: {
        $ref: '#'
      },
      'default': {}
    },
    properties: {
      type: 'object',
      additionalProperties: {
        $ref: '#'
      },
      'default': {}
    },
    patternProperties: {
      type: 'object',
      additionalProperties: {
        $ref: '#'
      },
      propertyNames: {
        format: 'regex'
      },
      'default': {}
    },
    dependencies: {
      type: 'object',
      additionalProperties: {
        anyOf: [
          {
            $ref: '#'
          },
          {
            $ref: '#/definitions/stringArray'
          }
        ]
      }
    },
    propertyNames: {
      $ref: '#'
    },
    'const': true,
    'enum': {
      type: 'array',
      items: true,
      minItems: 1,
      uniqueItems: true
    },
    type: {
      anyOf: [
        {
          $ref: '#/definitions/simpleTypes'
        },
        {
          type: 'array',
          items: {
            $ref: '#/definitions/simpleTypes'
          },
          minItems: 1,
          uniqueItems: true
        }
      ]
    },
    format: {
      type: 'string'
    },
    contentMediaType: {
      type: 'string'
    },
    contentEncoding: {
      type: 'string'
    },
    'if': {
      $ref: '#'
    },
    then: {
      $ref: '#'
    },
    'else': {
      $ref: '#'
    },
    allOf: {
      $ref: '#/definitions/schemaArray'
    },
    anyOf: {
      $ref: '#/definitions/schemaArray'
    },
    oneOf: {
      $ref: '#/definitions/schemaArray'
    },
    not: {
      $ref: '#'
    }
  }
  const require$$3 = {
    $schema: $schema$2,
    $id: $id$2,
    title: title$1,
    definitions: definitions$1,
    type: type$2,
    properties: properties$3,
    'default': true
  }
  ;(function (module2, exports3) {
    Object.defineProperty(exports3, '__esModule', { value: true })
    exports3.MissingRefError =
      exports3.ValidationError =
      exports3.CodeGen =
      exports3.Name =
      exports3.nil =
      exports3.stringify =
      exports3.str =
      exports3._ =
      exports3.KeywordCxt =
      exports3.Ajv =
        void 0
    const core_12 = core$2
    const draft7_1 = draft7
    const discriminator_1 = discriminator
    const draft7MetaSchema = require$$3
    const META_SUPPORT_DATA2 = ['/properties']
    const META_SCHEMA_ID2 = 'http://json-schema.org/draft-07/schema'
    class Ajv2 extends core_12.default {
      _addVocabularies() {
        super._addVocabularies()
        draft7_1.default.forEach((v) => this.addVocabulary(v))
        if (this.opts.discriminator) this.addKeyword(discriminator_1.default)
      }
      _addDefaultMetaSchema() {
        super._addDefaultMetaSchema()
        if (!this.opts.meta) return
        const metaSchema2 = this.opts.$data
          ? this.$dataMetaSchema(draft7MetaSchema, META_SUPPORT_DATA2)
          : draft7MetaSchema
        this.addMetaSchema(metaSchema2, META_SCHEMA_ID2, false)
        this.refs['http://json-schema.org/schema'] = META_SCHEMA_ID2
      }
      defaultMeta() {
        return (this.opts.defaultMeta =
          super.defaultMeta() || (this.getSchema(META_SCHEMA_ID2) ? META_SCHEMA_ID2 : void 0))
      }
    }
    exports3.Ajv = Ajv2
    module2.exports = exports3 = Ajv2
    module2.exports.Ajv = Ajv2
    Object.defineProperty(exports3, '__esModule', { value: true })
    exports3.default = Ajv2
    var validate_12 = requireValidate()
    Object.defineProperty(exports3, 'KeywordCxt', {
      enumerable: true,
      get: function () {
        return validate_12.KeywordCxt
      }
    })
    var codegen_12 = codegen
    Object.defineProperty(exports3, '_', {
      enumerable: true,
      get: function () {
        return codegen_12._
      }
    })
    Object.defineProperty(exports3, 'str', {
      enumerable: true,
      get: function () {
        return codegen_12.str
      }
    })
    Object.defineProperty(exports3, 'stringify', {
      enumerable: true,
      get: function () {
        return codegen_12.stringify
      }
    })
    Object.defineProperty(exports3, 'nil', {
      enumerable: true,
      get: function () {
        return codegen_12.nil
      }
    })
    Object.defineProperty(exports3, 'Name', {
      enumerable: true,
      get: function () {
        return codegen_12.Name
      }
    })
    Object.defineProperty(exports3, 'CodeGen', {
      enumerable: true,
      get: function () {
        return codegen_12.CodeGen
      }
    })
    var validation_error_12 = requireValidation_error()
    Object.defineProperty(exports3, 'ValidationError', {
      enumerable: true,
      get: function () {
        return validation_error_12.default
      }
    })
    var ref_error_12 = ref_error
    Object.defineProperty(exports3, 'MissingRefError', {
      enumerable: true,
      get: function () {
        return ref_error_12.default
      }
    })
  })(ajv$2, ajv$2.exports)
  var ajvExports = ajv$2.exports
  const ajv$1 = /* @__PURE__ */ getDefaultExportFromCjs(ajvExports)
  var util$6
  ;(function (util2) {
    util2.assertEqual = (_) => {}
    function assertIs(_arg) {}
    util2.assertIs = assertIs
    function assertNever(_x) {
      throw new Error()
    }
    util2.assertNever = assertNever
    util2.arrayToEnum = (items2) => {
      const obj = {}
      for (const item of items2) {
        obj[item] = item
      }
      return obj
    }
    util2.getValidEnumValues = (obj) => {
      const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== 'number')
      const filtered = {}
      for (const k of validKeys) {
        filtered[k] = obj[k]
      }
      return util2.objectValues(filtered)
    }
    util2.objectValues = (obj) => {
      return util2.objectKeys(obj).map(function (e) {
        return obj[e]
      })
    }
    util2.objectKeys =
      typeof Object.keys === 'function'
        ? (obj) => Object.keys(obj)
        : (object) => {
            const keys = []
            for (const key in object) {
              if (Object.prototype.hasOwnProperty.call(object, key)) {
                keys.push(key)
              }
            }
            return keys
          }
    util2.find = (arr, checker) => {
      for (const item of arr) {
        if (checker(item)) return item
      }
      return void 0
    }
    util2.isInteger =
      typeof Number.isInteger === 'function'
        ? (val) => Number.isInteger(val)
        : (val) => typeof val === 'number' && Number.isFinite(val) && Math.floor(val) === val
    function joinValues(array, separator = ' | ') {
      return array.map((val) => (typeof val === 'string' ? `'${val}'` : val)).join(separator)
    }
    util2.joinValues = joinValues
    util2.jsonStringifyReplacer = (_, value) => {
      if (typeof value === 'bigint') {
        return value.toString()
      }
      return value
    }
  })(util$6 || (util$6 = {}))
  var objectUtil
  ;(function (objectUtil2) {
    objectUtil2.mergeShapes = (first, second) => {
      return {
        ...first,
        ...second
        // second overwrites first
      }
    }
  })(objectUtil || (objectUtil = {}))
  const ZodParsedType = util$6.arrayToEnum([
    'string',
    'nan',
    'number',
    'integer',
    'float',
    'boolean',
    'date',
    'bigint',
    'symbol',
    'function',
    'undefined',
    'null',
    'array',
    'object',
    'unknown',
    'promise',
    'void',
    'never',
    'map',
    'set'
  ])
  const getParsedType = (data2) => {
    const t = typeof data2
    switch (t) {
      case 'undefined':
        return ZodParsedType.undefined
      case 'string':
        return ZodParsedType.string
      case 'number':
        return Number.isNaN(data2) ? ZodParsedType.nan : ZodParsedType.number
      case 'boolean':
        return ZodParsedType.boolean
      case 'function':
        return ZodParsedType.function
      case 'bigint':
        return ZodParsedType.bigint
      case 'symbol':
        return ZodParsedType.symbol
      case 'object':
        if (Array.isArray(data2)) {
          return ZodParsedType.array
        }
        if (data2 === null) {
          return ZodParsedType.null
        }
        if (data2.then && typeof data2.then === 'function' && data2.catch && typeof data2.catch === 'function') {
          return ZodParsedType.promise
        }
        if (typeof Map !== 'undefined' && data2 instanceof Map) {
          return ZodParsedType.map
        }
        if (typeof Set !== 'undefined' && data2 instanceof Set) {
          return ZodParsedType.set
        }
        if (typeof Date !== 'undefined' && data2 instanceof Date) {
          return ZodParsedType.date
        }
        return ZodParsedType.object
      default:
        return ZodParsedType.unknown
    }
  }
  const ZodIssueCode = util$6.arrayToEnum([
    'invalid_type',
    'invalid_literal',
    'custom',
    'invalid_union',
    'invalid_union_discriminator',
    'invalid_enum_value',
    'unrecognized_keys',
    'invalid_arguments',
    'invalid_return_type',
    'invalid_date',
    'invalid_string',
    'too_small',
    'too_big',
    'invalid_intersection_types',
    'not_multiple_of',
    'not_finite'
  ])
  const quotelessJson = (obj) => {
    const json = JSON.stringify(obj, null, 2)
    return json.replace(/"([^"]+)":/g, '$1:')
  }
  class ZodError extends Error {
    get errors() {
      return this.issues
    }
    constructor(issues) {
      super()
      this.issues = []
      this.addIssue = (sub) => {
        this.issues = [...this.issues, sub]
      }
      this.addIssues = (subs = []) => {
        this.issues = [...this.issues, ...subs]
      }
      const actualProto = new.target.prototype
      if (Object.setPrototypeOf) {
        Object.setPrototypeOf(this, actualProto)
      } else {
        this.__proto__ = actualProto
      }
      this.name = 'ZodError'
      this.issues = issues
    }
    format(_mapper) {
      const mapper =
        _mapper ||
        function (issue) {
          return issue.message
        }
      const fieldErrors = { _errors: [] }
      const processError = (error2) => {
        for (const issue of error2.issues) {
          if (issue.code === 'invalid_union') {
            issue.unionErrors.map(processError)
          } else if (issue.code === 'invalid_return_type') {
            processError(issue.returnTypeError)
          } else if (issue.code === 'invalid_arguments') {
            processError(issue.argumentsError)
          } else if (issue.path.length === 0) {
            fieldErrors._errors.push(mapper(issue))
          } else {
            let curr = fieldErrors
            let i = 0
            while (i < issue.path.length) {
              const el = issue.path[i]
              const terminal = i === issue.path.length - 1
              if (!terminal) {
                curr[el] = curr[el] || { _errors: [] }
              } else {
                curr[el] = curr[el] || { _errors: [] }
                curr[el]._errors.push(mapper(issue))
              }
              curr = curr[el]
              i++
            }
          }
        }
      }
      processError(this)
      return fieldErrors
    }
    static assert(value) {
      if (!(value instanceof ZodError)) {
        throw new Error(`Not a ZodError: ${value}`)
      }
    }
    toString() {
      return this.message
    }
    get message() {
      return JSON.stringify(this.issues, util$6.jsonStringifyReplacer, 2)
    }
    get isEmpty() {
      return this.issues.length === 0
    }
    flatten(mapper = (issue) => issue.message) {
      const fieldErrors = {}
      const formErrors = []
      for (const sub of this.issues) {
        if (sub.path.length > 0) {
          const firstEl = sub.path[0]
          fieldErrors[firstEl] = fieldErrors[firstEl] || []
          fieldErrors[firstEl].push(mapper(sub))
        } else {
          formErrors.push(mapper(sub))
        }
      }
      return { formErrors, fieldErrors }
    }
    get formErrors() {
      return this.flatten()
    }
  }
  ZodError.create = (issues) => {
    const error2 = new ZodError(issues)
    return error2
  }
  const errorMap = (issue, _ctx) => {
    let message
    switch (issue.code) {
      case ZodIssueCode.invalid_type:
        if (issue.received === ZodParsedType.undefined) {
          message = 'Required'
        } else {
          message = `Expected ${issue.expected}, received ${issue.received}`
        }
        break
      case ZodIssueCode.invalid_literal:
        message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util$6.jsonStringifyReplacer)}`
        break
      case ZodIssueCode.unrecognized_keys:
        message = `Unrecognized key(s) in object: ${util$6.joinValues(issue.keys, ', ')}`
        break
      case ZodIssueCode.invalid_union:
        message = `Invalid input`
        break
      case ZodIssueCode.invalid_union_discriminator:
        message = `Invalid discriminator value. Expected ${util$6.joinValues(issue.options)}`
        break
      case ZodIssueCode.invalid_enum_value:
        message = `Invalid enum value. Expected ${util$6.joinValues(issue.options)}, received '${issue.received}'`
        break
      case ZodIssueCode.invalid_arguments:
        message = `Invalid function arguments`
        break
      case ZodIssueCode.invalid_return_type:
        message = `Invalid function return type`
        break
      case ZodIssueCode.invalid_date:
        message = `Invalid date`
        break
      case ZodIssueCode.invalid_string:
        if (typeof issue.validation === 'object') {
          if ('includes' in issue.validation) {
            message = `Invalid input: must include "${issue.validation.includes}"`
            if (typeof issue.validation.position === 'number') {
              message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`
            }
          } else if ('startsWith' in issue.validation) {
            message = `Invalid input: must start with "${issue.validation.startsWith}"`
          } else if ('endsWith' in issue.validation) {
            message = `Invalid input: must end with "${issue.validation.endsWith}"`
          } else {
            util$6.assertNever(issue.validation)
          }
        } else if (issue.validation !== 'regex') {
          message = `Invalid ${issue.validation}`
        } else {
          message = 'Invalid'
        }
        break
      case ZodIssueCode.too_small:
        if (issue.type === 'array')
          message = `Array must contain ${issue.exact ? 'exactly' : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`
        else if (issue.type === 'string')
          message = `String must contain ${issue.exact ? 'exactly' : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`
        else if (issue.type === 'number')
          message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`
        else if (issue.type === 'bigint')
          message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`
        else if (issue.type === 'date')
          message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`
        else message = 'Invalid input'
        break
      case ZodIssueCode.too_big:
        if (issue.type === 'array')
          message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`
        else if (issue.type === 'string')
          message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`
        else if (issue.type === 'number')
          message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`
        else if (issue.type === 'bigint')
          message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`
        else if (issue.type === 'date')
          message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`
        else message = 'Invalid input'
        break
      case ZodIssueCode.custom:
        message = `Invalid input`
        break
      case ZodIssueCode.invalid_intersection_types:
        message = `Intersection results could not be merged`
        break
      case ZodIssueCode.not_multiple_of:
        message = `Number must be a multiple of ${issue.multipleOf}`
        break
      case ZodIssueCode.not_finite:
        message = 'Number must be finite'
        break
      default:
        message = _ctx.defaultError
        util$6.assertNever(issue)
    }
    return { message }
  }
  let overrideErrorMap = errorMap
  function setErrorMap(map) {
    overrideErrorMap = map
  }
  function getErrorMap() {
    return overrideErrorMap
  }
  const makeIssue = (params) => {
    const { data: data2, path, errorMaps, issueData } = params
    const fullPath = [...path, ...(issueData.path || [])]
    const fullIssue = {
      ...issueData,
      path: fullPath
    }
    if (issueData.message !== void 0) {
      return {
        ...issueData,
        path: fullPath,
        message: issueData.message
      }
    }
    let errorMessage = ''
    const maps = errorMaps
      .filter((m) => !!m)
      .slice()
      .reverse()
    for (const map of maps) {
      errorMessage = map(fullIssue, { data: data2, defaultError: errorMessage }).message
    }
    return {
      ...issueData,
      path: fullPath,
      message: errorMessage
    }
  }
  const EMPTY_PATH = []
  function addIssueToContext(ctx, issueData) {
    const overrideMap = getErrorMap()
    const issue = makeIssue({
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
    })
    ctx.common.issues.push(issue)
  }
  class ParseStatus {
    constructor() {
      this.value = 'valid'
    }
    dirty() {
      if (this.value === 'valid') this.value = 'dirty'
    }
    abort() {
      if (this.value !== 'aborted') this.value = 'aborted'
    }
    static mergeArray(status, results) {
      const arrayValue = []
      for (const s of results) {
        if (s.status === 'aborted') return INVALID
        if (s.status === 'dirty') status.dirty()
        arrayValue.push(s.value)
      }
      return { status: status.value, value: arrayValue }
    }
    static async mergeObjectAsync(status, pairs) {
      const syncPairs = []
      for (const pair of pairs) {
        const key = await pair.key
        const value = await pair.value
        syncPairs.push({
          key,
          value
        })
      }
      return ParseStatus.mergeObjectSync(status, syncPairs)
    }
    static mergeObjectSync(status, pairs) {
      const finalObject = {}
      for (const pair of pairs) {
        const { key, value } = pair
        if (key.status === 'aborted') return INVALID
        if (value.status === 'aborted') return INVALID
        if (key.status === 'dirty') status.dirty()
        if (value.status === 'dirty') status.dirty()
        if (key.value !== '__proto__' && (typeof value.value !== 'undefined' || pair.alwaysSet)) {
          finalObject[key.value] = value.value
        }
      }
      return { status: status.value, value: finalObject }
    }
  }
  const INVALID = Object.freeze({
    status: 'aborted'
  })
  const DIRTY = (value) => ({ status: 'dirty', value })
  const OK = (value) => ({ status: 'valid', value })
  const isAborted = (x) => x.status === 'aborted'
  const isDirty = (x) => x.status === 'dirty'
  const isValid = (x) => x.status === 'valid'
  const isAsync = (x) => typeof Promise !== 'undefined' && x instanceof Promise
  var errorUtil
  ;(function (errorUtil2) {
    errorUtil2.errToObj = (message) => (typeof message === 'string' ? { message } : message || {})
    errorUtil2.toString = (message) =>
      typeof message === 'string' ? message : message == null ? void 0 : message.message
  })(errorUtil || (errorUtil = {}))
  class ParseInputLazyPath {
    constructor(parent, value, path, key) {
      this._cachedPath = []
      this.parent = parent
      this.data = value
      this._path = path
      this._key = key
    }
    get path() {
      if (!this._cachedPath.length) {
        if (Array.isArray(this._key)) {
          this._cachedPath.push(...this._path, ...this._key)
        } else {
          this._cachedPath.push(...this._path, this._key)
        }
      }
      return this._cachedPath
    }
  }
  const handleResult = (ctx, result) => {
    if (isValid(result)) {
      return { success: true, data: result.value }
    } else {
      if (!ctx.common.issues.length) {
        throw new Error('Validation failed but no issues detected.')
      }
      return {
        success: false,
        get error() {
          if (this._error) return this._error
          const error2 = new ZodError(ctx.common.issues)
          this._error = error2
          return this._error
        }
      }
    }
  }
  function processCreateParams$1(params) {
    if (!params) return {}
    const { errorMap: errorMap2, invalid_type_error, required_error, description: description2 } = params
    if (errorMap2 && (invalid_type_error || required_error)) {
      throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`)
    }
    if (errorMap2) return { errorMap: errorMap2, description: description2 }
    const customMap = (iss, ctx) => {
      const { message } = params
      if (iss.code === 'invalid_enum_value') {
        return { message: message ?? ctx.defaultError }
      }
      if (typeof ctx.data === 'undefined') {
        return { message: message ?? required_error ?? ctx.defaultError }
      }
      if (iss.code !== 'invalid_type') return { message: ctx.defaultError }
      return { message: message ?? invalid_type_error ?? ctx.defaultError }
    }
    return { errorMap: customMap, description: description2 }
  }
  class ZodType {
    get description() {
      return this._def.description
    }
    _getType(input) {
      return getParsedType(input.data)
    }
    _getOrReturnCtx(input, ctx) {
      return (
        ctx || {
          common: input.parent.common,
          data: input.data,
          parsedType: getParsedType(input.data),
          schemaErrorMap: this._def.errorMap,
          path: input.path,
          parent: input.parent
        }
      )
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
      }
    }
    _parseSync(input) {
      const result = this._parse(input)
      if (isAsync(result)) {
        throw new Error('Synchronous parse encountered promise.')
      }
      return result
    }
    _parseAsync(input) {
      const result = this._parse(input)
      return Promise.resolve(result)
    }
    parse(data2, params) {
      const result = this.safeParse(data2, params)
      if (result.success) return result.data
      throw result.error
    }
    safeParse(data2, params) {
      const ctx = {
        common: {
          issues: [],
          async: (params == null ? void 0 : params.async) ?? false,
          contextualErrorMap: params == null ? void 0 : params.errorMap
        },
        path: (params == null ? void 0 : params.path) || [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data: data2,
        parsedType: getParsedType(data2)
      }
      const result = this._parseSync({ data: data2, path: ctx.path, parent: ctx })
      return handleResult(ctx, result)
    }
    '~validate'(data2) {
      var _a, _b
      const ctx = {
        common: {
          issues: [],
          async: !!this['~standard'].async
        },
        path: [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data: data2,
        parsedType: getParsedType(data2)
      }
      if (!this['~standard'].async) {
        try {
          const result = this._parseSync({ data: data2, path: [], parent: ctx })
          return isValid(result)
            ? {
                value: result.value
              }
            : {
                issues: ctx.common.issues
              }
        } catch (err) {
          if (
            (_b = (_a = err == null ? void 0 : err.message) == null ? void 0 : _a.toLowerCase()) == null
              ? void 0
              : _b.includes('encountered')
          ) {
            this['~standard'].async = true
          }
          ctx.common = {
            issues: [],
            async: true
          }
        }
      }
      return this._parseAsync({ data: data2, path: [], parent: ctx }).then((result) =>
        isValid(result)
          ? {
              value: result.value
            }
          : {
              issues: ctx.common.issues
            }
      )
    }
    async parseAsync(data2, params) {
      const result = await this.safeParseAsync(data2, params)
      if (result.success) return result.data
      throw result.error
    }
    async safeParseAsync(data2, params) {
      const ctx = {
        common: {
          issues: [],
          contextualErrorMap: params == null ? void 0 : params.errorMap,
          async: true
        },
        path: (params == null ? void 0 : params.path) || [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data: data2,
        parsedType: getParsedType(data2)
      }
      const maybeAsyncResult = this._parse({ data: data2, path: ctx.path, parent: ctx })
      const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult))
      return handleResult(ctx, result)
    }
    refine(check, message) {
      const getIssueProperties = (val) => {
        if (typeof message === 'string' || typeof message === 'undefined') {
          return { message }
        } else if (typeof message === 'function') {
          return message(val)
        } else {
          return message
        }
      }
      return this._refinement((val, ctx) => {
        const result = check(val)
        const setError = () =>
          ctx.addIssue({
            code: ZodIssueCode.custom,
            ...getIssueProperties(val)
          })
        if (typeof Promise !== 'undefined' && result instanceof Promise) {
          return result.then((data2) => {
            if (!data2) {
              setError()
              return false
            } else {
              return true
            }
          })
        }
        if (!result) {
          setError()
          return false
        } else {
          return true
        }
      })
    }
    refinement(check, refinementData) {
      return this._refinement((val, ctx) => {
        if (!check(val)) {
          ctx.addIssue(typeof refinementData === 'function' ? refinementData(val, ctx) : refinementData)
          return false
        } else {
          return true
        }
      })
    }
    _refinement(refinement) {
      return new ZodEffects({
        schema: this,
        typeName: ZodFirstPartyTypeKind.ZodEffects,
        effect: { type: 'refinement', refinement }
      })
    }
    superRefine(refinement) {
      return this._refinement(refinement)
    }
    constructor(def2) {
      this.spa = this.safeParseAsync
      this._def = def2
      this.parse = this.parse.bind(this)
      this.safeParse = this.safeParse.bind(this)
      this.parseAsync = this.parseAsync.bind(this)
      this.safeParseAsync = this.safeParseAsync.bind(this)
      this.spa = this.spa.bind(this)
      this.refine = this.refine.bind(this)
      this.refinement = this.refinement.bind(this)
      this.superRefine = this.superRefine.bind(this)
      this.optional = this.optional.bind(this)
      this.nullable = this.nullable.bind(this)
      this.nullish = this.nullish.bind(this)
      this.array = this.array.bind(this)
      this.promise = this.promise.bind(this)
      this.or = this.or.bind(this)
      this.and = this.and.bind(this)
      this.transform = this.transform.bind(this)
      this.brand = this.brand.bind(this)
      this.default = this.default.bind(this)
      this.catch = this.catch.bind(this)
      this.describe = this.describe.bind(this)
      this.pipe = this.pipe.bind(this)
      this.readonly = this.readonly.bind(this)
      this.isNullable = this.isNullable.bind(this)
      this.isOptional = this.isOptional.bind(this)
      this['~standard'] = {
        version: 1,
        vendor: 'zod',
        validate: (data2) => this['~validate'](data2)
      }
    }
    optional() {
      return ZodOptional.create(this, this._def)
    }
    nullable() {
      return ZodNullable.create(this, this._def)
    }
    nullish() {
      return this.nullable().optional()
    }
    array() {
      return ZodArray.create(this)
    }
    promise() {
      return ZodPromise.create(this, this._def)
    }
    or(option) {
      return ZodUnion.create([this, option], this._def)
    }
    and(incoming) {
      return ZodIntersection.create(this, incoming, this._def)
    }
    transform(transform) {
      return new ZodEffects({
        ...processCreateParams$1(this._def),
        schema: this,
        typeName: ZodFirstPartyTypeKind.ZodEffects,
        effect: { type: 'transform', transform }
      })
    }
    default(def2) {
      const defaultValueFunc = typeof def2 === 'function' ? def2 : () => def2
      return new ZodDefault({
        ...processCreateParams$1(this._def),
        innerType: this,
        defaultValue: defaultValueFunc,
        typeName: ZodFirstPartyTypeKind.ZodDefault
      })
    }
    brand() {
      return new ZodBranded({
        typeName: ZodFirstPartyTypeKind.ZodBranded,
        type: this,
        ...processCreateParams$1(this._def)
      })
    }
    catch(def2) {
      const catchValueFunc = typeof def2 === 'function' ? def2 : () => def2
      return new ZodCatch({
        ...processCreateParams$1(this._def),
        innerType: this,
        catchValue: catchValueFunc,
        typeName: ZodFirstPartyTypeKind.ZodCatch
      })
    }
    describe(description2) {
      const This = this.constructor
      return new This({
        ...this._def,
        description: description2
      })
    }
    pipe(target) {
      return ZodPipeline.create(this, target)
    }
    readonly() {
      return ZodReadonly.create(this)
    }
    isOptional() {
      return this.safeParse(void 0).success
    }
    isNullable() {
      return this.safeParse(null).success
    }
  }
  const cuidRegex = /^c[^\s-]{8,}$/i
  const cuid2Regex = /^[0-9a-z]+$/
  const ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i
  const uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i
  const nanoidRegex = /^[a-z0-9_-]{21}$/i
  const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/
  const durationRegex =
    /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/
  const emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i
  const _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`
  let emojiRegex$1
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/
  const ipv4CidrRegex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/
  const ipv6Regex =
    /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/
  const ipv6CidrRegex =
    /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/
  const base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/
  const base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/
  const dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`
  const dateRegex = new RegExp(`^${dateRegexSource}$`)
  function timeRegexSource(args) {
    let secondsRegexSource = `[0-5]\\d`
    if (args.precision) {
      secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`
    } else if (args.precision == null) {
      secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`
    }
    const secondsQuantifier = args.precision ? '+' : '?'
    return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`
  }
  function timeRegex(args) {
    return new RegExp(`^${timeRegexSource(args)}$`)
  }
  function datetimeRegex(args) {
    let regex2 = `${dateRegexSource}T${timeRegexSource(args)}`
    const opts = []
    opts.push(args.local ? `Z?` : `Z`)
    if (args.offset) opts.push(`([+-]\\d{2}:?\\d{2})`)
    regex2 = `${regex2}(${opts.join('|')})`
    return new RegExp(`^${regex2}$`)
  }
  function isValidIP(ip, version) {
    if ((version === 'v4' || !version) && ipv4Regex.test(ip)) {
      return true
    }
    if ((version === 'v6' || !version) && ipv6Regex.test(ip)) {
      return true
    }
    return false
  }
  function isValidJWT(jwt, alg) {
    if (!jwtRegex.test(jwt)) return false
    try {
      const [header] = jwt.split('.')
      if (!header) return false
      const base64 = header
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(header.length + ((4 - (header.length % 4)) % 4), '=')
      const decoded = JSON.parse(atob(base64))
      if (typeof decoded !== 'object' || decoded === null) return false
      if ('typ' in decoded && (decoded == null ? void 0 : decoded.typ) !== 'JWT') return false
      if (!decoded.alg) return false
      if (alg && decoded.alg !== alg) return false
      return true
    } catch {
      return false
    }
  }
  function isValidCidr(ip, version) {
    if ((version === 'v4' || !version) && ipv4CidrRegex.test(ip)) {
      return true
    }
    if ((version === 'v6' || !version) && ipv6CidrRegex.test(ip)) {
      return true
    }
    return false
  }
  class ZodString extends ZodType {
    _parse(input) {
      if (this._def.coerce) {
        input.data = String(input.data)
      }
      const parsedType = this._getType(input)
      if (parsedType !== ZodParsedType.string) {
        const ctx2 = this._getOrReturnCtx(input)
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.string,
          received: ctx2.parsedType
        })
        return INVALID
      }
      const status = new ParseStatus()
      let ctx = void 0
      for (const check of this._def.checks) {
        if (check.kind === 'min') {
          if (input.data.length < check.value) {
            ctx = this._getOrReturnCtx(input, ctx)
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: 'string',
              inclusive: true,
              exact: false,
              message: check.message
            })
            status.dirty()
          }
        } else if (check.kind === 'max') {
          if (input.data.length > check.value) {
            ctx = this._getOrReturnCtx(input, ctx)
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: 'string',
              inclusive: true,
              exact: false,
              message: check.message
            })
            status.dirty()
          }
        } else if (check.kind === 'length') {
          const tooBig = input.data.length > check.value
          const tooSmall = input.data.length < check.value
          if (tooBig || tooSmall) {
            ctx = this._getOrReturnCtx(input, ctx)
            if (tooBig) {
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_big,
                maximum: check.value,
                type: 'string',
                inclusive: true,
                exact: true,
                message: check.message
              })
            } else if (tooSmall) {
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_small,
                minimum: check.value,
                type: 'string',
                inclusive: true,
                exact: true,
                message: check.message
              })
            }
            status.dirty()
          }
        } else if (check.kind === 'email') {
          if (!emailRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx)
            addIssueToContext(ctx, {
              validation: 'email',
              code: ZodIssueCode.invalid_string,
              message: check.message
            })
            status.dirty()
          }
        } else if (check.kind === 'emoji') {
          if (!emojiRegex$1) {
            emojiRegex$1 = new RegExp(_emojiRegex, 'u')
          }
          if (!emojiRegex$1.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx)
            addIssueToContext(ctx, {
              validation: 'emoji',
              code: ZodIssueCode.invalid_string,
              message: check.message
            })
            status.dirty()
          }
        } else if (check.kind === 'uuid') {
          if (!uuidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx)
            addIssueToContext(ctx, {
              validation: 'uuid',
              code: ZodIssueCode.invalid_string,
              message: check.message
            })
            status.dirty()
          }
        } else if (check.kind === 'nanoid') {
          if (!nanoidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx)
            addIssueToContext(ctx, {
              validation: 'nanoid',
              code: ZodIssueCode.invalid_string,
              message: check.message
            })
            status.dirty()
          }
        } else if (check.kind === 'cuid') {
          if (!cuidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx)
            addIssueToContext(ctx, {
              validation: 'cuid',
              code: ZodIssueCode.invalid_string,
              message: check.message
            })
            status.dirty()
          }
        } else if (check.kind === 'cuid2') {
          if (!cuid2Regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx)
            addIssueToContext(ctx, {
              validation: 'cuid2',
              code: ZodIssueCode.invalid_string,
              message: check.message
            })
            status.dirty()
          }
        } else if (check.kind === 'ulid') {
          if (!ulidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx)
            addIssueToContext(ctx, {
              validation: 'ulid',
              code: ZodIssueCode.invalid_string,
              message: check.message
            })
            status.dirty()
          }
        } else if (check.kind === 'url') {
          try {
            new URL(input.data)
          } catch {
            ctx = this._getOrReturnCtx(input, ctx)
            addIssueToContext(ctx, {
              validation: 'url',
              code: ZodIssueCode.invalid_string,
              message: check.message
            })
            status.dirty()
          }
        } else if (check.kind === 'regex') {
          check.regex.lastIndex = 0
          const testResult = check.regex.test(input.data)
          if (!testResult) {
            ctx = this._getOrReturnCtx(input, ctx)
            addIssueToContext(ctx, {
              validation: 'regex',
              code: ZodIssueCode.invalid_string,
              message: check.message
            })
            status.dirty()
          }
        } else if (check.kind === 'trim') {
          input.data = input.data.trim()
        } else if (check.kind === 'includes') {
          if (!input.data.includes(check.value, check.position)) {
            ctx = this._getOrReturnCtx(input, ctx)
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: { includes: check.value, position: check.position },
              message: check.message
            })
            status.dirty()
          }
        } else if (check.kind === 'toLowerCase') {
          input.data = input.data.toLowerCase()
        } else if (check.kind === 'toUpperCase') {
          input.data = input.data.toUpperCase()
        } else if (check.kind === 'startsWith') {
          if (!input.data.startsWith(check.value)) {
            ctx = this._getOrReturnCtx(input, ctx)
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: { startsWith: check.value },
              message: check.message
            })
            status.dirty()
          }
        } else if (check.kind === 'endsWith') {
          if (!input.data.endsWith(check.value)) {
            ctx = this._getOrReturnCtx(input, ctx)
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: { endsWith: check.value },
              message: check.message
            })
            status.dirty()
          }
        } else if (check.kind === 'datetime') {
          const regex2 = datetimeRegex(check)
          if (!regex2.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx)
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: 'datetime',
              message: check.message
            })
            status.dirty()
          }
        } else if (check.kind === 'date') {
          const regex2 = dateRegex
          if (!regex2.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx)
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: 'date',
              message: check.message
            })
            status.dirty()
          }
        } else if (check.kind === 'time') {
          const regex2 = timeRegex(check)
          if (!regex2.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx)
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: 'time',
              message: check.message
            })
            status.dirty()
          }
        } else if (check.kind === 'duration') {
          if (!durationRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx)
            addIssueToContext(ctx, {
              validation: 'duration',
              code: ZodIssueCode.invalid_string,
              message: check.message
            })
            status.dirty()
          }
        } else if (check.kind === 'ip') {
          if (!isValidIP(input.data, check.version)) {
            ctx = this._getOrReturnCtx(input, ctx)
            addIssueToContext(ctx, {
              validation: 'ip',
              code: ZodIssueCode.invalid_string,
              message: check.message
            })
            status.dirty()
          }
        } else if (check.kind === 'jwt') {
          if (!isValidJWT(input.data, check.alg)) {
            ctx = this._getOrReturnCtx(input, ctx)
            addIssueToContext(ctx, {
              validation: 'jwt',
              code: ZodIssueCode.invalid_string,
              message: check.message
            })
            status.dirty()
          }
        } else if (check.kind === 'cidr') {
          if (!isValidCidr(input.data, check.version)) {
            ctx = this._getOrReturnCtx(input, ctx)
            addIssueToContext(ctx, {
              validation: 'cidr',
              code: ZodIssueCode.invalid_string,
              message: check.message
            })
            status.dirty()
          }
        } else if (check.kind === 'base64') {
          if (!base64Regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx)
            addIssueToContext(ctx, {
              validation: 'base64',
              code: ZodIssueCode.invalid_string,
              message: check.message
            })
            status.dirty()
          }
        } else if (check.kind === 'base64url') {
          if (!base64urlRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx)
            addIssueToContext(ctx, {
              validation: 'base64url',
              code: ZodIssueCode.invalid_string,
              message: check.message
            })
            status.dirty()
          }
        } else {
          util$6.assertNever(check)
        }
      }
      return { status: status.value, value: input.data }
    }
    _regex(regex2, validation2, message) {
      return this.refinement((data2) => regex2.test(data2), {
        validation: validation2,
        code: ZodIssueCode.invalid_string,
        ...errorUtil.errToObj(message)
      })
    }
    _addCheck(check) {
      return new ZodString({
        ...this._def,
        checks: [...this._def.checks, check]
      })
    }
    email(message) {
      return this._addCheck({ kind: 'email', ...errorUtil.errToObj(message) })
    }
    url(message) {
      return this._addCheck({ kind: 'url', ...errorUtil.errToObj(message) })
    }
    emoji(message) {
      return this._addCheck({ kind: 'emoji', ...errorUtil.errToObj(message) })
    }
    uuid(message) {
      return this._addCheck({ kind: 'uuid', ...errorUtil.errToObj(message) })
    }
    nanoid(message) {
      return this._addCheck({ kind: 'nanoid', ...errorUtil.errToObj(message) })
    }
    cuid(message) {
      return this._addCheck({ kind: 'cuid', ...errorUtil.errToObj(message) })
    }
    cuid2(message) {
      return this._addCheck({ kind: 'cuid2', ...errorUtil.errToObj(message) })
    }
    ulid(message) {
      return this._addCheck({ kind: 'ulid', ...errorUtil.errToObj(message) })
    }
    base64(message) {
      return this._addCheck({ kind: 'base64', ...errorUtil.errToObj(message) })
    }
    base64url(message) {
      return this._addCheck({
        kind: 'base64url',
        ...errorUtil.errToObj(message)
      })
    }
    jwt(options) {
      return this._addCheck({ kind: 'jwt', ...errorUtil.errToObj(options) })
    }
    ip(options) {
      return this._addCheck({ kind: 'ip', ...errorUtil.errToObj(options) })
    }
    cidr(options) {
      return this._addCheck({ kind: 'cidr', ...errorUtil.errToObj(options) })
    }
    datetime(options) {
      if (typeof options === 'string') {
        return this._addCheck({
          kind: 'datetime',
          precision: null,
          offset: false,
          local: false,
          message: options
        })
      }
      return this._addCheck({
        kind: 'datetime',
        precision:
          typeof (options == null ? void 0 : options.precision) === 'undefined'
            ? null
            : options == null
              ? void 0
              : options.precision,
        offset: (options == null ? void 0 : options.offset) ?? false,
        local: (options == null ? void 0 : options.local) ?? false,
        ...errorUtil.errToObj(options == null ? void 0 : options.message)
      })
    }
    date(message) {
      return this._addCheck({ kind: 'date', message })
    }
    time(options) {
      if (typeof options === 'string') {
        return this._addCheck({
          kind: 'time',
          precision: null,
          message: options
        })
      }
      return this._addCheck({
        kind: 'time',
        precision:
          typeof (options == null ? void 0 : options.precision) === 'undefined'
            ? null
            : options == null
              ? void 0
              : options.precision,
        ...errorUtil.errToObj(options == null ? void 0 : options.message)
      })
    }
    duration(message) {
      return this._addCheck({ kind: 'duration', ...errorUtil.errToObj(message) })
    }
    regex(regex2, message) {
      return this._addCheck({
        kind: 'regex',
        regex: regex2,
        ...errorUtil.errToObj(message)
      })
    }
    includes(value, options) {
      return this._addCheck({
        kind: 'includes',
        value,
        position: options == null ? void 0 : options.position,
        ...errorUtil.errToObj(options == null ? void 0 : options.message)
      })
    }
    startsWith(value, message) {
      return this._addCheck({
        kind: 'startsWith',
        value,
        ...errorUtil.errToObj(message)
      })
    }
    endsWith(value, message) {
      return this._addCheck({
        kind: 'endsWith',
        value,
        ...errorUtil.errToObj(message)
      })
    }
    min(minLength, message) {
      return this._addCheck({
        kind: 'min',
        value: minLength,
        ...errorUtil.errToObj(message)
      })
    }
    max(maxLength, message) {
      return this._addCheck({
        kind: 'max',
        value: maxLength,
        ...errorUtil.errToObj(message)
      })
    }
    length(len, message) {
      return this._addCheck({
        kind: 'length',
        value: len,
        ...errorUtil.errToObj(message)
      })
    }
    /**
     * Equivalent to `.min(1)`
     */
    nonempty(message) {
      return this.min(1, errorUtil.errToObj(message))
    }
    trim() {
      return new ZodString({
        ...this._def,
        checks: [...this._def.checks, { kind: 'trim' }]
      })
    }
    toLowerCase() {
      return new ZodString({
        ...this._def,
        checks: [...this._def.checks, { kind: 'toLowerCase' }]
      })
    }
    toUpperCase() {
      return new ZodString({
        ...this._def,
        checks: [...this._def.checks, { kind: 'toUpperCase' }]
      })
    }
    get isDatetime() {
      return !!this._def.checks.find((ch) => ch.kind === 'datetime')
    }
    get isDate() {
      return !!this._def.checks.find((ch) => ch.kind === 'date')
    }
    get isTime() {
      return !!this._def.checks.find((ch) => ch.kind === 'time')
    }
    get isDuration() {
      return !!this._def.checks.find((ch) => ch.kind === 'duration')
    }
    get isEmail() {
      return !!this._def.checks.find((ch) => ch.kind === 'email')
    }
    get isURL() {
      return !!this._def.checks.find((ch) => ch.kind === 'url')
    }
    get isEmoji() {
      return !!this._def.checks.find((ch) => ch.kind === 'emoji')
    }
    get isUUID() {
      return !!this._def.checks.find((ch) => ch.kind === 'uuid')
    }
    get isNANOID() {
      return !!this._def.checks.find((ch) => ch.kind === 'nanoid')
    }
    get isCUID() {
      return !!this._def.checks.find((ch) => ch.kind === 'cuid')
    }
    get isCUID2() {
      return !!this._def.checks.find((ch) => ch.kind === 'cuid2')
    }
    get isULID() {
      return !!this._def.checks.find((ch) => ch.kind === 'ulid')
    }
    get isIP() {
      return !!this._def.checks.find((ch) => ch.kind === 'ip')
    }
    get isCIDR() {
      return !!this._def.checks.find((ch) => ch.kind === 'cidr')
    }
    get isBase64() {
      return !!this._def.checks.find((ch) => ch.kind === 'base64')
    }
    get isBase64url() {
      return !!this._def.checks.find((ch) => ch.kind === 'base64url')
    }
    get minLength() {
      let min = null
      for (const ch of this._def.checks) {
        if (ch.kind === 'min') {
          if (min === null || ch.value > min) min = ch.value
        }
      }
      return min
    }
    get maxLength() {
      let max = null
      for (const ch of this._def.checks) {
        if (ch.kind === 'max') {
          if (max === null || ch.value < max) max = ch.value
        }
      }
      return max
    }
  }
  ZodString.create = (params) => {
    return new ZodString({
      checks: [],
      typeName: ZodFirstPartyTypeKind.ZodString,
      coerce: (params == null ? void 0 : params.coerce) ?? false,
      ...processCreateParams$1(params)
    })
  }
  function floatSafeRemainder(val, step) {
    const valDecCount = (val.toString().split('.')[1] || '').length
    const stepDecCount = (step.toString().split('.')[1] || '').length
    const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount
    const valInt = Number.parseInt(val.toFixed(decCount).replace('.', ''))
    const stepInt = Number.parseInt(step.toFixed(decCount).replace('.', ''))
    return (valInt % stepInt) / 10 ** decCount
  }
  class ZodNumber extends ZodType {
    constructor() {
      super(...arguments)
      this.min = this.gte
      this.max = this.lte
      this.step = this.multipleOf
    }
    _parse(input) {
      if (this._def.coerce) {
        input.data = Number(input.data)
      }
      const parsedType = this._getType(input)
      if (parsedType !== ZodParsedType.number) {
        const ctx2 = this._getOrReturnCtx(input)
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.number,
          received: ctx2.parsedType
        })
        return INVALID
      }
      let ctx = void 0
      const status = new ParseStatus()
      for (const check of this._def.checks) {
        if (check.kind === 'int') {
          if (!util$6.isInteger(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx)
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_type,
              expected: 'integer',
              received: 'float',
              message: check.message
            })
            status.dirty()
          }
        } else if (check.kind === 'min') {
          const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value
          if (tooSmall) {
            ctx = this._getOrReturnCtx(input, ctx)
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: 'number',
              inclusive: check.inclusive,
              exact: false,
              message: check.message
            })
            status.dirty()
          }
        } else if (check.kind === 'max') {
          const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value
          if (tooBig) {
            ctx = this._getOrReturnCtx(input, ctx)
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: 'number',
              inclusive: check.inclusive,
              exact: false,
              message: check.message
            })
            status.dirty()
          }
        } else if (check.kind === 'multipleOf') {
          if (floatSafeRemainder(input.data, check.value) !== 0) {
            ctx = this._getOrReturnCtx(input, ctx)
            addIssueToContext(ctx, {
              code: ZodIssueCode.not_multiple_of,
              multipleOf: check.value,
              message: check.message
            })
            status.dirty()
          }
        } else if (check.kind === 'finite') {
          if (!Number.isFinite(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx)
            addIssueToContext(ctx, {
              code: ZodIssueCode.not_finite,
              message: check.message
            })
            status.dirty()
          }
        } else {
          util$6.assertNever(check)
        }
      }
      return { status: status.value, value: input.data }
    }
    gte(value, message) {
      return this.setLimit('min', value, true, errorUtil.toString(message))
    }
    gt(value, message) {
      return this.setLimit('min', value, false, errorUtil.toString(message))
    }
    lte(value, message) {
      return this.setLimit('max', value, true, errorUtil.toString(message))
    }
    lt(value, message) {
      return this.setLimit('max', value, false, errorUtil.toString(message))
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
      })
    }
    _addCheck(check) {
      return new ZodNumber({
        ...this._def,
        checks: [...this._def.checks, check]
      })
    }
    int(message) {
      return this._addCheck({
        kind: 'int',
        message: errorUtil.toString(message)
      })
    }
    positive(message) {
      return this._addCheck({
        kind: 'min',
        value: 0,
        inclusive: false,
        message: errorUtil.toString(message)
      })
    }
    negative(message) {
      return this._addCheck({
        kind: 'max',
        value: 0,
        inclusive: false,
        message: errorUtil.toString(message)
      })
    }
    nonpositive(message) {
      return this._addCheck({
        kind: 'max',
        value: 0,
        inclusive: true,
        message: errorUtil.toString(message)
      })
    }
    nonnegative(message) {
      return this._addCheck({
        kind: 'min',
        value: 0,
        inclusive: true,
        message: errorUtil.toString(message)
      })
    }
    multipleOf(value, message) {
      return this._addCheck({
        kind: 'multipleOf',
        value,
        message: errorUtil.toString(message)
      })
    }
    finite(message) {
      return this._addCheck({
        kind: 'finite',
        message: errorUtil.toString(message)
      })
    }
    safe(message) {
      return this._addCheck({
        kind: 'min',
        inclusive: true,
        value: Number.MIN_SAFE_INTEGER,
        message: errorUtil.toString(message)
      })._addCheck({
        kind: 'max',
        inclusive: true,
        value: Number.MAX_SAFE_INTEGER,
        message: errorUtil.toString(message)
      })
    }
    get minValue() {
      let min = null
      for (const ch of this._def.checks) {
        if (ch.kind === 'min') {
          if (min === null || ch.value > min) min = ch.value
        }
      }
      return min
    }
    get maxValue() {
      let max = null
      for (const ch of this._def.checks) {
        if (ch.kind === 'max') {
          if (max === null || ch.value < max) max = ch.value
        }
      }
      return max
    }
    get isInt() {
      return !!this._def.checks.find(
        (ch) => ch.kind === 'int' || (ch.kind === 'multipleOf' && util$6.isInteger(ch.value))
      )
    }
    get isFinite() {
      let max = null
      let min = null
      for (const ch of this._def.checks) {
        if (ch.kind === 'finite' || ch.kind === 'int' || ch.kind === 'multipleOf') {
          return true
        } else if (ch.kind === 'min') {
          if (min === null || ch.value > min) min = ch.value
        } else if (ch.kind === 'max') {
          if (max === null || ch.value < max) max = ch.value
        }
      }
      return Number.isFinite(min) && Number.isFinite(max)
    }
  }
  ZodNumber.create = (params) => {
    return new ZodNumber({
      checks: [],
      typeName: ZodFirstPartyTypeKind.ZodNumber,
      coerce: (params == null ? void 0 : params.coerce) || false,
      ...processCreateParams$1(params)
    })
  }
  class ZodBigInt extends ZodType {
    constructor() {
      super(...arguments)
      this.min = this.gte
      this.max = this.lte
    }
    _parse(input) {
      if (this._def.coerce) {
        try {
          input.data = BigInt(input.data)
        } catch {
          return this._getInvalidInput(input)
        }
      }
      const parsedType = this._getType(input)
      if (parsedType !== ZodParsedType.bigint) {
        return this._getInvalidInput(input)
      }
      let ctx = void 0
      const status = new ParseStatus()
      for (const check of this._def.checks) {
        if (check.kind === 'min') {
          const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value
          if (tooSmall) {
            ctx = this._getOrReturnCtx(input, ctx)
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              type: 'bigint',
              minimum: check.value,
              inclusive: check.inclusive,
              message: check.message
            })
            status.dirty()
          }
        } else if (check.kind === 'max') {
          const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value
          if (tooBig) {
            ctx = this._getOrReturnCtx(input, ctx)
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              type: 'bigint',
              maximum: check.value,
              inclusive: check.inclusive,
              message: check.message
            })
            status.dirty()
          }
        } else if (check.kind === 'multipleOf') {
          if (input.data % check.value !== BigInt(0)) {
            ctx = this._getOrReturnCtx(input, ctx)
            addIssueToContext(ctx, {
              code: ZodIssueCode.not_multiple_of,
              multipleOf: check.value,
              message: check.message
            })
            status.dirty()
          }
        } else {
          util$6.assertNever(check)
        }
      }
      return { status: status.value, value: input.data }
    }
    _getInvalidInput(input) {
      const ctx = this._getOrReturnCtx(input)
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.bigint,
        received: ctx.parsedType
      })
      return INVALID
    }
    gte(value, message) {
      return this.setLimit('min', value, true, errorUtil.toString(message))
    }
    gt(value, message) {
      return this.setLimit('min', value, false, errorUtil.toString(message))
    }
    lte(value, message) {
      return this.setLimit('max', value, true, errorUtil.toString(message))
    }
    lt(value, message) {
      return this.setLimit('max', value, false, errorUtil.toString(message))
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
      })
    }
    _addCheck(check) {
      return new ZodBigInt({
        ...this._def,
        checks: [...this._def.checks, check]
      })
    }
    positive(message) {
      return this._addCheck({
        kind: 'min',
        value: BigInt(0),
        inclusive: false,
        message: errorUtil.toString(message)
      })
    }
    negative(message) {
      return this._addCheck({
        kind: 'max',
        value: BigInt(0),
        inclusive: false,
        message: errorUtil.toString(message)
      })
    }
    nonpositive(message) {
      return this._addCheck({
        kind: 'max',
        value: BigInt(0),
        inclusive: true,
        message: errorUtil.toString(message)
      })
    }
    nonnegative(message) {
      return this._addCheck({
        kind: 'min',
        value: BigInt(0),
        inclusive: true,
        message: errorUtil.toString(message)
      })
    }
    multipleOf(value, message) {
      return this._addCheck({
        kind: 'multipleOf',
        value,
        message: errorUtil.toString(message)
      })
    }
    get minValue() {
      let min = null
      for (const ch of this._def.checks) {
        if (ch.kind === 'min') {
          if (min === null || ch.value > min) min = ch.value
        }
      }
      return min
    }
    get maxValue() {
      let max = null
      for (const ch of this._def.checks) {
        if (ch.kind === 'max') {
          if (max === null || ch.value < max) max = ch.value
        }
      }
      return max
    }
  }
  ZodBigInt.create = (params) => {
    return new ZodBigInt({
      checks: [],
      typeName: ZodFirstPartyTypeKind.ZodBigInt,
      coerce: (params == null ? void 0 : params.coerce) ?? false,
      ...processCreateParams$1(params)
    })
  }
  class ZodBoolean extends ZodType {
    _parse(input) {
      if (this._def.coerce) {
        input.data = Boolean(input.data)
      }
      const parsedType = this._getType(input)
      if (parsedType !== ZodParsedType.boolean) {
        const ctx = this._getOrReturnCtx(input)
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.boolean,
          received: ctx.parsedType
        })
        return INVALID
      }
      return OK(input.data)
    }
  }
  ZodBoolean.create = (params) => {
    return new ZodBoolean({
      typeName: ZodFirstPartyTypeKind.ZodBoolean,
      coerce: (params == null ? void 0 : params.coerce) || false,
      ...processCreateParams$1(params)
    })
  }
  class ZodDate extends ZodType {
    _parse(input) {
      if (this._def.coerce) {
        input.data = new Date(input.data)
      }
      const parsedType = this._getType(input)
      if (parsedType !== ZodParsedType.date) {
        const ctx2 = this._getOrReturnCtx(input)
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.date,
          received: ctx2.parsedType
        })
        return INVALID
      }
      if (Number.isNaN(input.data.getTime())) {
        const ctx2 = this._getOrReturnCtx(input)
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_date
        })
        return INVALID
      }
      const status = new ParseStatus()
      let ctx = void 0
      for (const check of this._def.checks) {
        if (check.kind === 'min') {
          if (input.data.getTime() < check.value) {
            ctx = this._getOrReturnCtx(input, ctx)
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              message: check.message,
              inclusive: true,
              exact: false,
              minimum: check.value,
              type: 'date'
            })
            status.dirty()
          }
        } else if (check.kind === 'max') {
          if (input.data.getTime() > check.value) {
            ctx = this._getOrReturnCtx(input, ctx)
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              message: check.message,
              inclusive: true,
              exact: false,
              maximum: check.value,
              type: 'date'
            })
            status.dirty()
          }
        } else {
          util$6.assertNever(check)
        }
      }
      return {
        status: status.value,
        value: new Date(input.data.getTime())
      }
    }
    _addCheck(check) {
      return new ZodDate({
        ...this._def,
        checks: [...this._def.checks, check]
      })
    }
    min(minDate, message) {
      return this._addCheck({
        kind: 'min',
        value: minDate.getTime(),
        message: errorUtil.toString(message)
      })
    }
    max(maxDate, message) {
      return this._addCheck({
        kind: 'max',
        value: maxDate.getTime(),
        message: errorUtil.toString(message)
      })
    }
    get minDate() {
      let min = null
      for (const ch of this._def.checks) {
        if (ch.kind === 'min') {
          if (min === null || ch.value > min) min = ch.value
        }
      }
      return min != null ? new Date(min) : null
    }
    get maxDate() {
      let max = null
      for (const ch of this._def.checks) {
        if (ch.kind === 'max') {
          if (max === null || ch.value < max) max = ch.value
        }
      }
      return max != null ? new Date(max) : null
    }
  }
  ZodDate.create = (params) => {
    return new ZodDate({
      checks: [],
      coerce: (params == null ? void 0 : params.coerce) || false,
      typeName: ZodFirstPartyTypeKind.ZodDate,
      ...processCreateParams$1(params)
    })
  }
  class ZodSymbol extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input)
      if (parsedType !== ZodParsedType.symbol) {
        const ctx = this._getOrReturnCtx(input)
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.symbol,
          received: ctx.parsedType
        })
        return INVALID
      }
      return OK(input.data)
    }
  }
  ZodSymbol.create = (params) => {
    return new ZodSymbol({
      typeName: ZodFirstPartyTypeKind.ZodSymbol,
      ...processCreateParams$1(params)
    })
  }
  class ZodUndefined extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input)
      if (parsedType !== ZodParsedType.undefined) {
        const ctx = this._getOrReturnCtx(input)
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.undefined,
          received: ctx.parsedType
        })
        return INVALID
      }
      return OK(input.data)
    }
  }
  ZodUndefined.create = (params) => {
    return new ZodUndefined({
      typeName: ZodFirstPartyTypeKind.ZodUndefined,
      ...processCreateParams$1(params)
    })
  }
  class ZodNull extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input)
      if (parsedType !== ZodParsedType.null) {
        const ctx = this._getOrReturnCtx(input)
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.null,
          received: ctx.parsedType
        })
        return INVALID
      }
      return OK(input.data)
    }
  }
  ZodNull.create = (params) => {
    return new ZodNull({
      typeName: ZodFirstPartyTypeKind.ZodNull,
      ...processCreateParams$1(params)
    })
  }
  class ZodAny extends ZodType {
    constructor() {
      super(...arguments)
      this._any = true
    }
    _parse(input) {
      return OK(input.data)
    }
  }
  ZodAny.create = (params) => {
    return new ZodAny({
      typeName: ZodFirstPartyTypeKind.ZodAny,
      ...processCreateParams$1(params)
    })
  }
  class ZodUnknown extends ZodType {
    constructor() {
      super(...arguments)
      this._unknown = true
    }
    _parse(input) {
      return OK(input.data)
    }
  }
  ZodUnknown.create = (params) => {
    return new ZodUnknown({
      typeName: ZodFirstPartyTypeKind.ZodUnknown,
      ...processCreateParams$1(params)
    })
  }
  class ZodNever extends ZodType {
    _parse(input) {
      const ctx = this._getOrReturnCtx(input)
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.never,
        received: ctx.parsedType
      })
      return INVALID
    }
  }
  ZodNever.create = (params) => {
    return new ZodNever({
      typeName: ZodFirstPartyTypeKind.ZodNever,
      ...processCreateParams$1(params)
    })
  }
  class ZodVoid extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input)
      if (parsedType !== ZodParsedType.undefined) {
        const ctx = this._getOrReturnCtx(input)
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.void,
          received: ctx.parsedType
        })
        return INVALID
      }
      return OK(input.data)
    }
  }
  ZodVoid.create = (params) => {
    return new ZodVoid({
      typeName: ZodFirstPartyTypeKind.ZodVoid,
      ...processCreateParams$1(params)
    })
  }
  class ZodArray extends ZodType {
    _parse(input) {
      const { ctx, status } = this._processInputParams(input)
      const def2 = this._def
      if (ctx.parsedType !== ZodParsedType.array) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.array,
          received: ctx.parsedType
        })
        return INVALID
      }
      if (def2.exactLength !== null) {
        const tooBig = ctx.data.length > def2.exactLength.value
        const tooSmall = ctx.data.length < def2.exactLength.value
        if (tooBig || tooSmall) {
          addIssueToContext(ctx, {
            code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
            minimum: tooSmall ? def2.exactLength.value : void 0,
            maximum: tooBig ? def2.exactLength.value : void 0,
            type: 'array',
            inclusive: true,
            exact: true,
            message: def2.exactLength.message
          })
          status.dirty()
        }
      }
      if (def2.minLength !== null) {
        if (ctx.data.length < def2.minLength.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: def2.minLength.value,
            type: 'array',
            inclusive: true,
            exact: false,
            message: def2.minLength.message
          })
          status.dirty()
        }
      }
      if (def2.maxLength !== null) {
        if (ctx.data.length > def2.maxLength.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: def2.maxLength.value,
            type: 'array',
            inclusive: true,
            exact: false,
            message: def2.maxLength.message
          })
          status.dirty()
        }
      }
      if (ctx.common.async) {
        return Promise.all(
          [...ctx.data].map((item, i) => {
            return def2.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i))
          })
        ).then((result2) => {
          return ParseStatus.mergeArray(status, result2)
        })
      }
      const result = [...ctx.data].map((item, i) => {
        return def2.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i))
      })
      return ParseStatus.mergeArray(status, result)
    }
    get element() {
      return this._def.type
    }
    min(minLength, message) {
      return new ZodArray({
        ...this._def,
        minLength: { value: minLength, message: errorUtil.toString(message) }
      })
    }
    max(maxLength, message) {
      return new ZodArray({
        ...this._def,
        maxLength: { value: maxLength, message: errorUtil.toString(message) }
      })
    }
    length(len, message) {
      return new ZodArray({
        ...this._def,
        exactLength: { value: len, message: errorUtil.toString(message) }
      })
    }
    nonempty(message) {
      return this.min(1, message)
    }
  }
  ZodArray.create = (schema, params) => {
    return new ZodArray({
      type: schema,
      minLength: null,
      maxLength: null,
      exactLength: null,
      typeName: ZodFirstPartyTypeKind.ZodArray,
      ...processCreateParams$1(params)
    })
  }
  function deepPartialify(schema) {
    if (schema instanceof ZodObject) {
      const newShape = {}
      for (const key in schema.shape) {
        const fieldSchema = schema.shape[key]
        newShape[key] = ZodOptional.create(deepPartialify(fieldSchema))
      }
      return new ZodObject({
        ...schema._def,
        shape: () => newShape
      })
    } else if (schema instanceof ZodArray) {
      return new ZodArray({
        ...schema._def,
        type: deepPartialify(schema.element)
      })
    } else if (schema instanceof ZodOptional) {
      return ZodOptional.create(deepPartialify(schema.unwrap()))
    } else if (schema instanceof ZodNullable) {
      return ZodNullable.create(deepPartialify(schema.unwrap()))
    } else if (schema instanceof ZodTuple) {
      return ZodTuple.create(schema.items.map((item) => deepPartialify(item)))
    } else {
      return schema
    }
  }
  class ZodObject extends ZodType {
    constructor() {
      super(...arguments)
      this._cached = null
      this.nonstrict = this.passthrough
      this.augment = this.extend
    }
    _getCached() {
      if (this._cached !== null) return this._cached
      const shape = this._def.shape()
      const keys = util$6.objectKeys(shape)
      this._cached = { shape, keys }
      return this._cached
    }
    _parse(input) {
      const parsedType = this._getType(input)
      if (parsedType !== ZodParsedType.object) {
        const ctx2 = this._getOrReturnCtx(input)
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.object,
          received: ctx2.parsedType
        })
        return INVALID
      }
      const { status, ctx } = this._processInputParams(input)
      const { shape, keys: shapeKeys } = this._getCached()
      const extraKeys = []
      if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === 'strip')) {
        for (const key in ctx.data) {
          if (!shapeKeys.includes(key)) {
            extraKeys.push(key)
          }
        }
      }
      const pairs = []
      for (const key of shapeKeys) {
        const keyValidator = shape[key]
        const value = ctx.data[key]
        pairs.push({
          key: { status: 'valid', value: key },
          value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
          alwaysSet: key in ctx.data
        })
      }
      if (this._def.catchall instanceof ZodNever) {
        const unknownKeys = this._def.unknownKeys
        if (unknownKeys === 'passthrough') {
          for (const key of extraKeys) {
            pairs.push({
              key: { status: 'valid', value: key },
              value: { status: 'valid', value: ctx.data[key] }
            })
          }
        } else if (unknownKeys === 'strict') {
          if (extraKeys.length > 0) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.unrecognized_keys,
              keys: extraKeys
            })
            status.dirty()
          }
        } else if (unknownKeys === 'strip');
        else {
          throw new Error(`Internal ZodObject error: invalid unknownKeys value.`)
        }
      } else {
        const catchall = this._def.catchall
        for (const key of extraKeys) {
          const value = ctx.data[key]
          pairs.push({
            key: { status: 'valid', value: key },
            value: catchall._parse(
              new ParseInputLazyPath(ctx, value, ctx.path, key)
              //, ctx.child(key), value, getParsedType(value)
            ),
            alwaysSet: key in ctx.data
          })
        }
      }
      if (ctx.common.async) {
        return Promise.resolve()
          .then(async () => {
            const syncPairs = []
            for (const pair of pairs) {
              const key = await pair.key
              const value = await pair.value
              syncPairs.push({
                key,
                value,
                alwaysSet: pair.alwaysSet
              })
            }
            return syncPairs
          })
          .then((syncPairs) => {
            return ParseStatus.mergeObjectSync(status, syncPairs)
          })
      } else {
        return ParseStatus.mergeObjectSync(status, pairs)
      }
    }
    get shape() {
      return this._def.shape()
    }
    strict(message) {
      errorUtil.errToObj
      return new ZodObject({
        ...this._def,
        unknownKeys: 'strict',
        ...(message !== void 0
          ? {
              errorMap: (issue, ctx) => {
                var _a, _b
                const defaultError =
                  ((_b = (_a = this._def).errorMap) == null ? void 0 : _b.call(_a, issue, ctx).message) ??
                  ctx.defaultError
                if (issue.code === 'unrecognized_keys')
                  return {
                    message: errorUtil.errToObj(message).message ?? defaultError
                  }
                return {
                  message: defaultError
                }
              }
            }
          : {})
      })
    }
    strip() {
      return new ZodObject({
        ...this._def,
        unknownKeys: 'strip'
      })
    }
    passthrough() {
      return new ZodObject({
        ...this._def,
        unknownKeys: 'passthrough'
      })
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
      })
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
      })
      return merged
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
      return this.augment({ [key]: schema })
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
      })
    }
    pick(mask) {
      const shape = {}
      for (const key of util$6.objectKeys(mask)) {
        if (mask[key] && this.shape[key]) {
          shape[key] = this.shape[key]
        }
      }
      return new ZodObject({
        ...this._def,
        shape: () => shape
      })
    }
    omit(mask) {
      const shape = {}
      for (const key of util$6.objectKeys(this.shape)) {
        if (!mask[key]) {
          shape[key] = this.shape[key]
        }
      }
      return new ZodObject({
        ...this._def,
        shape: () => shape
      })
    }
    /**
     * @deprecated
     */
    deepPartial() {
      return deepPartialify(this)
    }
    partial(mask) {
      const newShape = {}
      for (const key of util$6.objectKeys(this.shape)) {
        const fieldSchema = this.shape[key]
        if (mask && !mask[key]) {
          newShape[key] = fieldSchema
        } else {
          newShape[key] = fieldSchema.optional()
        }
      }
      return new ZodObject({
        ...this._def,
        shape: () => newShape
      })
    }
    required(mask) {
      const newShape = {}
      for (const key of util$6.objectKeys(this.shape)) {
        if (mask && !mask[key]) {
          newShape[key] = this.shape[key]
        } else {
          const fieldSchema = this.shape[key]
          let newField = fieldSchema
          while (newField instanceof ZodOptional) {
            newField = newField._def.innerType
          }
          newShape[key] = newField
        }
      }
      return new ZodObject({
        ...this._def,
        shape: () => newShape
      })
    }
    keyof() {
      return createZodEnum(util$6.objectKeys(this.shape))
    }
  }
  ZodObject.create = (shape, params) => {
    return new ZodObject({
      shape: () => shape,
      unknownKeys: 'strip',
      catchall: ZodNever.create(),
      typeName: ZodFirstPartyTypeKind.ZodObject,
      ...processCreateParams$1(params)
    })
  }
  ZodObject.strictCreate = (shape, params) => {
    return new ZodObject({
      shape: () => shape,
      unknownKeys: 'strict',
      catchall: ZodNever.create(),
      typeName: ZodFirstPartyTypeKind.ZodObject,
      ...processCreateParams$1(params)
    })
  }
  ZodObject.lazycreate = (shape, params) => {
    return new ZodObject({
      shape,
      unknownKeys: 'strip',
      catchall: ZodNever.create(),
      typeName: ZodFirstPartyTypeKind.ZodObject,
      ...processCreateParams$1(params)
    })
  }
  class ZodUnion extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input)
      const options = this._def.options
      function handleResults(results) {
        for (const result of results) {
          if (result.result.status === 'valid') {
            return result.result
          }
        }
        for (const result of results) {
          if (result.result.status === 'dirty') {
            ctx.common.issues.push(...result.ctx.common.issues)
            return result.result
          }
        }
        const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues))
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_union,
          unionErrors
        })
        return INVALID
      }
      if (ctx.common.async) {
        return Promise.all(
          options.map(async (option) => {
            const childCtx = {
              ...ctx,
              common: {
                ...ctx.common,
                issues: []
              },
              parent: null
            }
            return {
              result: await option._parseAsync({
                data: ctx.data,
                path: ctx.path,
                parent: childCtx
              }),
              ctx: childCtx
            }
          })
        ).then(handleResults)
      } else {
        let dirty = void 0
        const issues = []
        for (const option of options) {
          const childCtx = {
            ...ctx,
            common: {
              ...ctx.common,
              issues: []
            },
            parent: null
          }
          const result = option._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          })
          if (result.status === 'valid') {
            return result
          } else if (result.status === 'dirty' && !dirty) {
            dirty = { result, ctx: childCtx }
          }
          if (childCtx.common.issues.length) {
            issues.push(childCtx.common.issues)
          }
        }
        if (dirty) {
          ctx.common.issues.push(...dirty.ctx.common.issues)
          return dirty.result
        }
        const unionErrors = issues.map((issues2) => new ZodError(issues2))
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_union,
          unionErrors
        })
        return INVALID
      }
    }
    get options() {
      return this._def.options
    }
  }
  ZodUnion.create = (types2, params) => {
    return new ZodUnion({
      options: types2,
      typeName: ZodFirstPartyTypeKind.ZodUnion,
      ...processCreateParams$1(params)
    })
  }
  const getDiscriminator = (type2) => {
    if (type2 instanceof ZodLazy) {
      return getDiscriminator(type2.schema)
    } else if (type2 instanceof ZodEffects) {
      return getDiscriminator(type2.innerType())
    } else if (type2 instanceof ZodLiteral) {
      return [type2.value]
    } else if (type2 instanceof ZodEnum) {
      return type2.options
    } else if (type2 instanceof ZodNativeEnum) {
      return util$6.objectValues(type2.enum)
    } else if (type2 instanceof ZodDefault) {
      return getDiscriminator(type2._def.innerType)
    } else if (type2 instanceof ZodUndefined) {
      return [void 0]
    } else if (type2 instanceof ZodNull) {
      return [null]
    } else if (type2 instanceof ZodOptional) {
      return [void 0, ...getDiscriminator(type2.unwrap())]
    } else if (type2 instanceof ZodNullable) {
      return [null, ...getDiscriminator(type2.unwrap())]
    } else if (type2 instanceof ZodBranded) {
      return getDiscriminator(type2.unwrap())
    } else if (type2 instanceof ZodReadonly) {
      return getDiscriminator(type2.unwrap())
    } else if (type2 instanceof ZodCatch) {
      return getDiscriminator(type2._def.innerType)
    } else {
      return []
    }
  }
  class ZodDiscriminatedUnion extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input)
      if (ctx.parsedType !== ZodParsedType.object) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.object,
          received: ctx.parsedType
        })
        return INVALID
      }
      const discriminator2 = this.discriminator
      const discriminatorValue = ctx.data[discriminator2]
      const option = this.optionsMap.get(discriminatorValue)
      if (!option) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_union_discriminator,
          options: Array.from(this.optionsMap.keys()),
          path: [discriminator2]
        })
        return INVALID
      }
      if (ctx.common.async) {
        return option._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      } else {
        return option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      }
    }
    get discriminator() {
      return this._def.discriminator
    }
    get options() {
      return this._def.options
    }
    get optionsMap() {
      return this._def.optionsMap
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
      const optionsMap = /* @__PURE__ */ new Map()
      for (const type2 of options) {
        const discriminatorValues = getDiscriminator(type2.shape[discriminator2])
        if (!discriminatorValues.length) {
          throw new Error(
            `A discriminator value for key \`${discriminator2}\` could not be extracted from all schema options`
          )
        }
        for (const value of discriminatorValues) {
          if (optionsMap.has(value)) {
            throw new Error(`Discriminator property ${String(discriminator2)} has duplicate value ${String(value)}`)
          }
          optionsMap.set(value, type2)
        }
      }
      return new ZodDiscriminatedUnion({
        typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
        discriminator: discriminator2,
        options,
        optionsMap,
        ...processCreateParams$1(params)
      })
    }
  }
  function mergeValues(a, b) {
    const aType = getParsedType(a)
    const bType = getParsedType(b)
    if (a === b) {
      return { valid: true, data: a }
    } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
      const bKeys = util$6.objectKeys(b)
      const sharedKeys = util$6.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1)
      const newObj = { ...a, ...b }
      for (const key of sharedKeys) {
        const sharedValue = mergeValues(a[key], b[key])
        if (!sharedValue.valid) {
          return { valid: false }
        }
        newObj[key] = sharedValue.data
      }
      return { valid: true, data: newObj }
    } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
      if (a.length !== b.length) {
        return { valid: false }
      }
      const newArray = []
      for (let index = 0; index < a.length; index++) {
        const itemA = a[index]
        const itemB = b[index]
        const sharedValue = mergeValues(itemA, itemB)
        if (!sharedValue.valid) {
          return { valid: false }
        }
        newArray.push(sharedValue.data)
      }
      return { valid: true, data: newArray }
    } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
      return { valid: true, data: a }
    } else {
      return { valid: false }
    }
  }
  class ZodIntersection extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input)
      const handleParsed = (parsedLeft, parsedRight) => {
        if (isAborted(parsedLeft) || isAborted(parsedRight)) {
          return INVALID
        }
        const merged = mergeValues(parsedLeft.value, parsedRight.value)
        if (!merged.valid) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_intersection_types
          })
          return INVALID
        }
        if (isDirty(parsedLeft) || isDirty(parsedRight)) {
          status.dirty()
        }
        return { status: status.value, value: merged.data }
      }
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
        ]).then(([left, right]) => handleParsed(left, right))
      } else {
        return handleParsed(
          this._def.left._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          }),
          this._def.right._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          })
        )
      }
    }
  }
  ZodIntersection.create = (left, right, params) => {
    return new ZodIntersection({
      left,
      right,
      typeName: ZodFirstPartyTypeKind.ZodIntersection,
      ...processCreateParams$1(params)
    })
  }
  class ZodTuple extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input)
      if (ctx.parsedType !== ZodParsedType.array) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.array,
          received: ctx.parsedType
        })
        return INVALID
      }
      if (ctx.data.length < this._def.items.length) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: this._def.items.length,
          inclusive: true,
          exact: false,
          type: 'array'
        })
        return INVALID
      }
      const rest = this._def.rest
      if (!rest && ctx.data.length > this._def.items.length) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: this._def.items.length,
          inclusive: true,
          exact: false,
          type: 'array'
        })
        status.dirty()
      }
      const items2 = [...ctx.data]
        .map((item, itemIndex) => {
          const schema = this._def.items[itemIndex] || this._def.rest
          if (!schema) return null
          return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex))
        })
        .filter((x) => !!x)
      if (ctx.common.async) {
        return Promise.all(items2).then((results) => {
          return ParseStatus.mergeArray(status, results)
        })
      } else {
        return ParseStatus.mergeArray(status, items2)
      }
    }
    get items() {
      return this._def.items
    }
    rest(rest) {
      return new ZodTuple({
        ...this._def,
        rest
      })
    }
  }
  ZodTuple.create = (schemas, params) => {
    if (!Array.isArray(schemas)) {
      throw new Error('You must pass an array of schemas to z.tuple([ ... ])')
    }
    return new ZodTuple({
      items: schemas,
      typeName: ZodFirstPartyTypeKind.ZodTuple,
      rest: null,
      ...processCreateParams$1(params)
    })
  }
  class ZodRecord extends ZodType {
    get keySchema() {
      return this._def.keyType
    }
    get valueSchema() {
      return this._def.valueType
    }
    _parse(input) {
      const { status, ctx } = this._processInputParams(input)
      if (ctx.parsedType !== ZodParsedType.object) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.object,
          received: ctx.parsedType
        })
        return INVALID
      }
      const pairs = []
      const keyType = this._def.keyType
      const valueType = this._def.valueType
      for (const key in ctx.data) {
        pairs.push({
          key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
          value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
          alwaysSet: key in ctx.data
        })
      }
      if (ctx.common.async) {
        return ParseStatus.mergeObjectAsync(status, pairs)
      } else {
        return ParseStatus.mergeObjectSync(status, pairs)
      }
    }
    get element() {
      return this._def.valueType
    }
    static create(first, second, third) {
      if (second instanceof ZodType) {
        return new ZodRecord({
          keyType: first,
          valueType: second,
          typeName: ZodFirstPartyTypeKind.ZodRecord,
          ...processCreateParams$1(third)
        })
      }
      return new ZodRecord({
        keyType: ZodString.create(),
        valueType: first,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams$1(second)
      })
    }
  }
  class ZodMap extends ZodType {
    get keySchema() {
      return this._def.keyType
    }
    get valueSchema() {
      return this._def.valueType
    }
    _parse(input) {
      const { status, ctx } = this._processInputParams(input)
      if (ctx.parsedType !== ZodParsedType.map) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.map,
          received: ctx.parsedType
        })
        return INVALID
      }
      const keyType = this._def.keyType
      const valueType = this._def.valueType
      const pairs = [...ctx.data.entries()].map(([key, value], index) => {
        return {
          key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, 'key'])),
          value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, 'value']))
        }
      })
      if (ctx.common.async) {
        const finalMap = /* @__PURE__ */ new Map()
        return Promise.resolve().then(async () => {
          for (const pair of pairs) {
            const key = await pair.key
            const value = await pair.value
            if (key.status === 'aborted' || value.status === 'aborted') {
              return INVALID
            }
            if (key.status === 'dirty' || value.status === 'dirty') {
              status.dirty()
            }
            finalMap.set(key.value, value.value)
          }
          return { status: status.value, value: finalMap }
        })
      } else {
        const finalMap = /* @__PURE__ */ new Map()
        for (const pair of pairs) {
          const key = pair.key
          const value = pair.value
          if (key.status === 'aborted' || value.status === 'aborted') {
            return INVALID
          }
          if (key.status === 'dirty' || value.status === 'dirty') {
            status.dirty()
          }
          finalMap.set(key.value, value.value)
        }
        return { status: status.value, value: finalMap }
      }
    }
  }
  ZodMap.create = (keyType, valueType, params) => {
    return new ZodMap({
      valueType,
      keyType,
      typeName: ZodFirstPartyTypeKind.ZodMap,
      ...processCreateParams$1(params)
    })
  }
  class ZodSet extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input)
      if (ctx.parsedType !== ZodParsedType.set) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.set,
          received: ctx.parsedType
        })
        return INVALID
      }
      const def2 = this._def
      if (def2.minSize !== null) {
        if (ctx.data.size < def2.minSize.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: def2.minSize.value,
            type: 'set',
            inclusive: true,
            exact: false,
            message: def2.minSize.message
          })
          status.dirty()
        }
      }
      if (def2.maxSize !== null) {
        if (ctx.data.size > def2.maxSize.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: def2.maxSize.value,
            type: 'set',
            inclusive: true,
            exact: false,
            message: def2.maxSize.message
          })
          status.dirty()
        }
      }
      const valueType = this._def.valueType
      function finalizeSet(elements2) {
        const parsedSet = /* @__PURE__ */ new Set()
        for (const element of elements2) {
          if (element.status === 'aborted') return INVALID
          if (element.status === 'dirty') status.dirty()
          parsedSet.add(element.value)
        }
        return { status: status.value, value: parsedSet }
      }
      const elements = [...ctx.data.values()].map((item, i) =>
        valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i))
      )
      if (ctx.common.async) {
        return Promise.all(elements).then((elements2) => finalizeSet(elements2))
      } else {
        return finalizeSet(elements)
      }
    }
    min(minSize, message) {
      return new ZodSet({
        ...this._def,
        minSize: { value: minSize, message: errorUtil.toString(message) }
      })
    }
    max(maxSize, message) {
      return new ZodSet({
        ...this._def,
        maxSize: { value: maxSize, message: errorUtil.toString(message) }
      })
    }
    size(size, message) {
      return this.min(size, message).max(size, message)
    }
    nonempty(message) {
      return this.min(1, message)
    }
  }
  ZodSet.create = (valueType, params) => {
    return new ZodSet({
      valueType,
      minSize: null,
      maxSize: null,
      typeName: ZodFirstPartyTypeKind.ZodSet,
      ...processCreateParams$1(params)
    })
  }
  class ZodFunction extends ZodType {
    constructor() {
      super(...arguments)
      this.validate = this.implement
    }
    _parse(input) {
      const { ctx } = this._processInputParams(input)
      if (ctx.parsedType !== ZodParsedType.function) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.function,
          received: ctx.parsedType
        })
        return INVALID
      }
      function makeArgsIssue(args, error2) {
        return makeIssue({
          data: args,
          path: ctx.path,
          errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), errorMap].filter((x) => !!x),
          issueData: {
            code: ZodIssueCode.invalid_arguments,
            argumentsError: error2
          }
        })
      }
      function makeReturnsIssue(returns, error2) {
        return makeIssue({
          data: returns,
          path: ctx.path,
          errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), errorMap].filter((x) => !!x),
          issueData: {
            code: ZodIssueCode.invalid_return_type,
            returnTypeError: error2
          }
        })
      }
      const params = { errorMap: ctx.common.contextualErrorMap }
      const fn = ctx.data
      if (this._def.returns instanceof ZodPromise) {
        const me = this
        return OK(async function (...args) {
          const error2 = new ZodError([])
          const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
            error2.addIssue(makeArgsIssue(args, e))
            throw error2
          })
          const result = await Reflect.apply(fn, this, parsedArgs)
          const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
            error2.addIssue(makeReturnsIssue(result, e))
            throw error2
          })
          return parsedReturns
        })
      } else {
        const me = this
        return OK(function (...args) {
          const parsedArgs = me._def.args.safeParse(args, params)
          if (!parsedArgs.success) {
            throw new ZodError([makeArgsIssue(args, parsedArgs.error)])
          }
          const result = Reflect.apply(fn, this, parsedArgs.data)
          const parsedReturns = me._def.returns.safeParse(result, params)
          if (!parsedReturns.success) {
            throw new ZodError([makeReturnsIssue(result, parsedReturns.error)])
          }
          return parsedReturns.data
        })
      }
    }
    parameters() {
      return this._def.args
    }
    returnType() {
      return this._def.returns
    }
    args(...items2) {
      return new ZodFunction({
        ...this._def,
        args: ZodTuple.create(items2).rest(ZodUnknown.create())
      })
    }
    returns(returnType) {
      return new ZodFunction({
        ...this._def,
        returns: returnType
      })
    }
    implement(func) {
      const validatedFunc = this.parse(func)
      return validatedFunc
    }
    strictImplement(func) {
      const validatedFunc = this.parse(func)
      return validatedFunc
    }
    static create(args, returns, params) {
      return new ZodFunction({
        args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
        returns: returns || ZodUnknown.create(),
        typeName: ZodFirstPartyTypeKind.ZodFunction,
        ...processCreateParams$1(params)
      })
    }
  }
  class ZodLazy extends ZodType {
    get schema() {
      return this._def.getter()
    }
    _parse(input) {
      const { ctx } = this._processInputParams(input)
      const lazySchema = this._def.getter()
      return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx })
    }
  }
  ZodLazy.create = (getter, params) => {
    return new ZodLazy({
      getter,
      typeName: ZodFirstPartyTypeKind.ZodLazy,
      ...processCreateParams$1(params)
    })
  }
  class ZodLiteral extends ZodType {
    _parse(input) {
      if (input.data !== this._def.value) {
        const ctx = this._getOrReturnCtx(input)
        addIssueToContext(ctx, {
          received: ctx.data,
          code: ZodIssueCode.invalid_literal,
          expected: this._def.value
        })
        return INVALID
      }
      return { status: 'valid', value: input.data }
    }
    get value() {
      return this._def.value
    }
  }
  ZodLiteral.create = (value, params) => {
    return new ZodLiteral({
      value,
      typeName: ZodFirstPartyTypeKind.ZodLiteral,
      ...processCreateParams$1(params)
    })
  }
  function createZodEnum(values, params) {
    return new ZodEnum({
      values,
      typeName: ZodFirstPartyTypeKind.ZodEnum,
      ...processCreateParams$1(params)
    })
  }
  class ZodEnum extends ZodType {
    _parse(input) {
      if (typeof input.data !== 'string') {
        const ctx = this._getOrReturnCtx(input)
        const expectedValues = this._def.values
        addIssueToContext(ctx, {
          expected: util$6.joinValues(expectedValues),
          received: ctx.parsedType,
          code: ZodIssueCode.invalid_type
        })
        return INVALID
      }
      if (!this._cache) {
        this._cache = new Set(this._def.values)
      }
      if (!this._cache.has(input.data)) {
        const ctx = this._getOrReturnCtx(input)
        const expectedValues = this._def.values
        addIssueToContext(ctx, {
          received: ctx.data,
          code: ZodIssueCode.invalid_enum_value,
          options: expectedValues
        })
        return INVALID
      }
      return OK(input.data)
    }
    get options() {
      return this._def.values
    }
    get enum() {
      const enumValues = {}
      for (const val of this._def.values) {
        enumValues[val] = val
      }
      return enumValues
    }
    get Values() {
      const enumValues = {}
      for (const val of this._def.values) {
        enumValues[val] = val
      }
      return enumValues
    }
    get Enum() {
      const enumValues = {}
      for (const val of this._def.values) {
        enumValues[val] = val
      }
      return enumValues
    }
    extract(values, newDef = this._def) {
      return ZodEnum.create(values, {
        ...this._def,
        ...newDef
      })
    }
    exclude(values, newDef = this._def) {
      return ZodEnum.create(
        this.options.filter((opt) => !values.includes(opt)),
        {
          ...this._def,
          ...newDef
        }
      )
    }
  }
  ZodEnum.create = createZodEnum
  class ZodNativeEnum extends ZodType {
    _parse(input) {
      const nativeEnumValues = util$6.getValidEnumValues(this._def.values)
      const ctx = this._getOrReturnCtx(input)
      if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
        const expectedValues = util$6.objectValues(nativeEnumValues)
        addIssueToContext(ctx, {
          expected: util$6.joinValues(expectedValues),
          received: ctx.parsedType,
          code: ZodIssueCode.invalid_type
        })
        return INVALID
      }
      if (!this._cache) {
        this._cache = new Set(util$6.getValidEnumValues(this._def.values))
      }
      if (!this._cache.has(input.data)) {
        const expectedValues = util$6.objectValues(nativeEnumValues)
        addIssueToContext(ctx, {
          received: ctx.data,
          code: ZodIssueCode.invalid_enum_value,
          options: expectedValues
        })
        return INVALID
      }
      return OK(input.data)
    }
    get enum() {
      return this._def.values
    }
  }
  ZodNativeEnum.create = (values, params) => {
    return new ZodNativeEnum({
      values,
      typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
      ...processCreateParams$1(params)
    })
  }
  class ZodPromise extends ZodType {
    unwrap() {
      return this._def.type
    }
    _parse(input) {
      const { ctx } = this._processInputParams(input)
      if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.promise,
          received: ctx.parsedType
        })
        return INVALID
      }
      const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data)
      return OK(
        promisified.then((data2) => {
          return this._def.type.parseAsync(data2, {
            path: ctx.path,
            errorMap: ctx.common.contextualErrorMap
          })
        })
      )
    }
  }
  ZodPromise.create = (schema, params) => {
    return new ZodPromise({
      type: schema,
      typeName: ZodFirstPartyTypeKind.ZodPromise,
      ...processCreateParams$1(params)
    })
  }
  class ZodEffects extends ZodType {
    innerType() {
      return this._def.schema
    }
    sourceType() {
      return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects
        ? this._def.schema.sourceType()
        : this._def.schema
    }
    _parse(input) {
      const { status, ctx } = this._processInputParams(input)
      const effect = this._def.effect || null
      const checkCtx = {
        addIssue: (arg) => {
          addIssueToContext(ctx, arg)
          if (arg.fatal) {
            status.abort()
          } else {
            status.dirty()
          }
        },
        get path() {
          return ctx.path
        }
      }
      checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx)
      if (effect.type === 'preprocess') {
        const processed = effect.transform(ctx.data, checkCtx)
        if (ctx.common.async) {
          return Promise.resolve(processed).then(async (processed2) => {
            if (status.value === 'aborted') return INVALID
            const result = await this._def.schema._parseAsync({
              data: processed2,
              path: ctx.path,
              parent: ctx
            })
            if (result.status === 'aborted') return INVALID
            if (result.status === 'dirty') return DIRTY(result.value)
            if (status.value === 'dirty') return DIRTY(result.value)
            return result
          })
        } else {
          if (status.value === 'aborted') return INVALID
          const result = this._def.schema._parseSync({
            data: processed,
            path: ctx.path,
            parent: ctx
          })
          if (result.status === 'aborted') return INVALID
          if (result.status === 'dirty') return DIRTY(result.value)
          if (status.value === 'dirty') return DIRTY(result.value)
          return result
        }
      }
      if (effect.type === 'refinement') {
        const executeRefinement = (acc) => {
          const result = effect.refinement(acc, checkCtx)
          if (ctx.common.async) {
            return Promise.resolve(result)
          }
          if (result instanceof Promise) {
            throw new Error('Async refinement encountered during synchronous parse operation. Use .parseAsync instead.')
          }
          return acc
        }
        if (ctx.common.async === false) {
          const inner = this._def.schema._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          })
          if (inner.status === 'aborted') return INVALID
          if (inner.status === 'dirty') status.dirty()
          executeRefinement(inner.value)
          return { status: status.value, value: inner.value }
        } else {
          return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
            if (inner.status === 'aborted') return INVALID
            if (inner.status === 'dirty') status.dirty()
            return executeRefinement(inner.value).then(() => {
              return { status: status.value, value: inner.value }
            })
          })
        }
      }
      if (effect.type === 'transform') {
        if (ctx.common.async === false) {
          const base = this._def.schema._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          })
          if (!isValid(base)) return INVALID
          const result = effect.transform(base.value, checkCtx)
          if (result instanceof Promise) {
            throw new Error(
              `Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`
            )
          }
          return { status: status.value, value: result }
        } else {
          return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
            if (!isValid(base)) return INVALID
            return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
              status: status.value,
              value: result
            }))
          })
        }
      }
      util$6.assertNever(effect)
    }
  }
  ZodEffects.create = (schema, effect, params) => {
    return new ZodEffects({
      schema,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect,
      ...processCreateParams$1(params)
    })
  }
  ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
    return new ZodEffects({
      schema,
      effect: { type: 'preprocess', transform: preprocess },
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      ...processCreateParams$1(params)
    })
  }
  class ZodOptional extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input)
      if (parsedType === ZodParsedType.undefined) {
        return OK(void 0)
      }
      return this._def.innerType._parse(input)
    }
    unwrap() {
      return this._def.innerType
    }
  }
  ZodOptional.create = (type2, params) => {
    return new ZodOptional({
      innerType: type2,
      typeName: ZodFirstPartyTypeKind.ZodOptional,
      ...processCreateParams$1(params)
    })
  }
  class ZodNullable extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input)
      if (parsedType === ZodParsedType.null) {
        return OK(null)
      }
      return this._def.innerType._parse(input)
    }
    unwrap() {
      return this._def.innerType
    }
  }
  ZodNullable.create = (type2, params) => {
    return new ZodNullable({
      innerType: type2,
      typeName: ZodFirstPartyTypeKind.ZodNullable,
      ...processCreateParams$1(params)
    })
  }
  class ZodDefault extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input)
      let data2 = ctx.data
      if (ctx.parsedType === ZodParsedType.undefined) {
        data2 = this._def.defaultValue()
      }
      return this._def.innerType._parse({
        data: data2,
        path: ctx.path,
        parent: ctx
      })
    }
    removeDefault() {
      return this._def.innerType
    }
  }
  ZodDefault.create = (type2, params) => {
    return new ZodDefault({
      innerType: type2,
      typeName: ZodFirstPartyTypeKind.ZodDefault,
      defaultValue: typeof params.default === 'function' ? params.default : () => params.default,
      ...processCreateParams$1(params)
    })
  }
  class ZodCatch extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input)
      const newCtx = {
        ...ctx,
        common: {
          ...ctx.common,
          issues: []
        }
      }
      const result = this._def.innerType._parse({
        data: newCtx.data,
        path: newCtx.path,
        parent: {
          ...newCtx
        }
      })
      if (isAsync(result)) {
        return result.then((result2) => {
          return {
            status: 'valid',
            value:
              result2.status === 'valid'
                ? result2.value
                : this._def.catchValue({
                    get error() {
                      return new ZodError(newCtx.common.issues)
                    },
                    input: newCtx.data
                  })
          }
        })
      } else {
        return {
          status: 'valid',
          value:
            result.status === 'valid'
              ? result.value
              : this._def.catchValue({
                  get error() {
                    return new ZodError(newCtx.common.issues)
                  },
                  input: newCtx.data
                })
        }
      }
    }
    removeCatch() {
      return this._def.innerType
    }
  }
  ZodCatch.create = (type2, params) => {
    return new ZodCatch({
      innerType: type2,
      typeName: ZodFirstPartyTypeKind.ZodCatch,
      catchValue: typeof params.catch === 'function' ? params.catch : () => params.catch,
      ...processCreateParams$1(params)
    })
  }
  class ZodNaN extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input)
      if (parsedType !== ZodParsedType.nan) {
        const ctx = this._getOrReturnCtx(input)
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.nan,
          received: ctx.parsedType
        })
        return INVALID
      }
      return { status: 'valid', value: input.data }
    }
  }
  ZodNaN.create = (params) => {
    return new ZodNaN({
      typeName: ZodFirstPartyTypeKind.ZodNaN,
      ...processCreateParams$1(params)
    })
  }
  const BRAND = Symbol('zod_brand')
  class ZodBranded extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input)
      const data2 = ctx.data
      return this._def.type._parse({
        data: data2,
        path: ctx.path,
        parent: ctx
      })
    }
    unwrap() {
      return this._def.type
    }
  }
  class ZodPipeline extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input)
      if (ctx.common.async) {
        const handleAsync = async () => {
          const inResult = await this._def.in._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          })
          if (inResult.status === 'aborted') return INVALID
          if (inResult.status === 'dirty') {
            status.dirty()
            return DIRTY(inResult.value)
          } else {
            return this._def.out._parseAsync({
              data: inResult.value,
              path: ctx.path,
              parent: ctx
            })
          }
        }
        return handleAsync()
      } else {
        const inResult = this._def.in._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
        if (inResult.status === 'aborted') return INVALID
        if (inResult.status === 'dirty') {
          status.dirty()
          return {
            status: 'dirty',
            value: inResult.value
          }
        } else {
          return this._def.out._parseSync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          })
        }
      }
    }
    static create(a, b) {
      return new ZodPipeline({
        in: a,
        out: b,
        typeName: ZodFirstPartyTypeKind.ZodPipeline
      })
    }
  }
  class ZodReadonly extends ZodType {
    _parse(input) {
      const result = this._def.innerType._parse(input)
      const freeze = (data2) => {
        if (isValid(data2)) {
          data2.value = Object.freeze(data2.value)
        }
        return data2
      }
      return isAsync(result) ? result.then((data2) => freeze(data2)) : freeze(result)
    }
    unwrap() {
      return this._def.innerType
    }
  }
  ZodReadonly.create = (type2, params) => {
    return new ZodReadonly({
      innerType: type2,
      typeName: ZodFirstPartyTypeKind.ZodReadonly,
      ...processCreateParams$1(params)
    })
  }
  function cleanParams(params, data2) {
    const p = typeof params === 'function' ? params(data2) : typeof params === 'string' ? { message: params } : params
    const p2 = typeof p === 'string' ? { message: p } : p
    return p2
  }
  function custom$1(check, _params = {}, fatal) {
    if (check)
      return ZodAny.create().superRefine((data2, ctx) => {
        const r = check(data2)
        if (r instanceof Promise) {
          return r.then((r2) => {
            if (!r2) {
              const params = cleanParams(_params, data2)
              const _fatal = params.fatal ?? fatal ?? true
              ctx.addIssue({ code: 'custom', ...params, fatal: _fatal })
            }
          })
        }
        if (!r) {
          const params = cleanParams(_params, data2)
          const _fatal = params.fatal ?? fatal ?? true
          ctx.addIssue({ code: 'custom', ...params, fatal: _fatal })
        }
        return
      })
    return ZodAny.create()
  }
  const late = {
    object: ZodObject.lazycreate
  }
  var ZodFirstPartyTypeKind
  ;(function (ZodFirstPartyTypeKind2) {
    ZodFirstPartyTypeKind2['ZodString'] = 'ZodString'
    ZodFirstPartyTypeKind2['ZodNumber'] = 'ZodNumber'
    ZodFirstPartyTypeKind2['ZodNaN'] = 'ZodNaN'
    ZodFirstPartyTypeKind2['ZodBigInt'] = 'ZodBigInt'
    ZodFirstPartyTypeKind2['ZodBoolean'] = 'ZodBoolean'
    ZodFirstPartyTypeKind2['ZodDate'] = 'ZodDate'
    ZodFirstPartyTypeKind2['ZodSymbol'] = 'ZodSymbol'
    ZodFirstPartyTypeKind2['ZodUndefined'] = 'ZodUndefined'
    ZodFirstPartyTypeKind2['ZodNull'] = 'ZodNull'
    ZodFirstPartyTypeKind2['ZodAny'] = 'ZodAny'
    ZodFirstPartyTypeKind2['ZodUnknown'] = 'ZodUnknown'
    ZodFirstPartyTypeKind2['ZodNever'] = 'ZodNever'
    ZodFirstPartyTypeKind2['ZodVoid'] = 'ZodVoid'
    ZodFirstPartyTypeKind2['ZodArray'] = 'ZodArray'
    ZodFirstPartyTypeKind2['ZodObject'] = 'ZodObject'
    ZodFirstPartyTypeKind2['ZodUnion'] = 'ZodUnion'
    ZodFirstPartyTypeKind2['ZodDiscriminatedUnion'] = 'ZodDiscriminatedUnion'
    ZodFirstPartyTypeKind2['ZodIntersection'] = 'ZodIntersection'
    ZodFirstPartyTypeKind2['ZodTuple'] = 'ZodTuple'
    ZodFirstPartyTypeKind2['ZodRecord'] = 'ZodRecord'
    ZodFirstPartyTypeKind2['ZodMap'] = 'ZodMap'
    ZodFirstPartyTypeKind2['ZodSet'] = 'ZodSet'
    ZodFirstPartyTypeKind2['ZodFunction'] = 'ZodFunction'
    ZodFirstPartyTypeKind2['ZodLazy'] = 'ZodLazy'
    ZodFirstPartyTypeKind2['ZodLiteral'] = 'ZodLiteral'
    ZodFirstPartyTypeKind2['ZodEnum'] = 'ZodEnum'
    ZodFirstPartyTypeKind2['ZodEffects'] = 'ZodEffects'
    ZodFirstPartyTypeKind2['ZodNativeEnum'] = 'ZodNativeEnum'
    ZodFirstPartyTypeKind2['ZodOptional'] = 'ZodOptional'
    ZodFirstPartyTypeKind2['ZodNullable'] = 'ZodNullable'
    ZodFirstPartyTypeKind2['ZodDefault'] = 'ZodDefault'
    ZodFirstPartyTypeKind2['ZodCatch'] = 'ZodCatch'
    ZodFirstPartyTypeKind2['ZodPromise'] = 'ZodPromise'
    ZodFirstPartyTypeKind2['ZodBranded'] = 'ZodBranded'
    ZodFirstPartyTypeKind2['ZodPipeline'] = 'ZodPipeline'
    ZodFirstPartyTypeKind2['ZodReadonly'] = 'ZodReadonly'
  })(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}))
  const instanceOfType = (
    cls,
    params = {
      message: `Input not instance of ${cls.name}`
    }
  ) => custom$1((data2) => data2 instanceof cls, params)
  const stringType = ZodString.create
  const numberType = ZodNumber.create
  const nanType = ZodNaN.create
  const bigIntType = ZodBigInt.create
  const booleanType = ZodBoolean.create
  const dateType = ZodDate.create
  const symbolType = ZodSymbol.create
  const undefinedType = ZodUndefined.create
  const nullType = ZodNull.create
  const anyType = ZodAny.create
  const unknownType = ZodUnknown.create
  const neverType = ZodNever.create
  const voidType = ZodVoid.create
  const arrayType = ZodArray.create
  const objectType = ZodObject.create
  const strictObjectType = ZodObject.strictCreate
  const unionType = ZodUnion.create
  const discriminatedUnionType = ZodDiscriminatedUnion.create
  const intersectionType = ZodIntersection.create
  const tupleType = ZodTuple.create
  const recordType = ZodRecord.create
  const mapType = ZodMap.create
  const setType = ZodSet.create
  const functionType = ZodFunction.create
  const lazyType = ZodLazy.create
  const literalType = ZodLiteral.create
  const enumType = ZodEnum.create
  const nativeEnumType = ZodNativeEnum.create
  const promiseType = ZodPromise.create
  const effectsType = ZodEffects.create
  const optionalType = ZodOptional.create
  const nullableType = ZodNullable.create
  const preprocessType = ZodEffects.createWithPreprocess
  const pipelineType = ZodPipeline.create
  const ostring = () => stringType().optional()
  const onumber = () => numberType().optional()
  const oboolean = () => booleanType().optional()
  const coerce = {
    string: (arg) => ZodString.create({ ...arg, coerce: true }),
    number: (arg) => ZodNumber.create({ ...arg, coerce: true }),
    boolean: (arg) =>
      ZodBoolean.create({
        ...arg,
        coerce: true
      }),
    bigint: (arg) => ZodBigInt.create({ ...arg, coerce: true }),
    date: (arg) => ZodDate.create({ ...arg, coerce: true })
  }
  const NEVER = INVALID
  const z = /* @__PURE__ */ Object.freeze(
    /* @__PURE__ */ Object.defineProperty(
      {
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
          return ZodFirstPartyTypeKind
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
        custom: custom$1,
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
          return objectUtil
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
          return util$6
        },
        void: voidType
      },
      Symbol.toStringTag,
      { value: 'Module' }
    )
  )
  const LATEST_PROTOCOL_VERSION = '2025-06-18'
  const SUPPORTED_PROTOCOL_VERSIONS = [LATEST_PROTOCOL_VERSION, '2025-03-26', '2024-11-05', '2024-10-07']
  const JSONRPC_VERSION = '2.0'
  const ProgressTokenSchema = unionType([stringType(), numberType().int()])
  const CursorSchema = stringType()
  const RequestMetaSchema = objectType({
    /**
     * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
     */
    progressToken: optionalType(ProgressTokenSchema)
  }).passthrough()
  const BaseRequestParamsSchema = objectType({
    _meta: optionalType(RequestMetaSchema)
  }).passthrough()
  const RequestSchema = objectType({
    method: stringType(),
    params: optionalType(BaseRequestParamsSchema)
  })
  const BaseNotificationParamsSchema = objectType({
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: optionalType(objectType({}).passthrough())
  }).passthrough()
  const NotificationSchema = objectType({
    method: stringType(),
    params: optionalType(BaseNotificationParamsSchema)
  })
  const ResultSchema = objectType({
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: optionalType(objectType({}).passthrough())
  }).passthrough()
  const RequestIdSchema = unionType([stringType(), numberType().int()])
  const JSONRPCRequestSchema = objectType({
    jsonrpc: literalType(JSONRPC_VERSION),
    id: RequestIdSchema
  })
    .merge(RequestSchema)
    .strict()
  const isJSONRPCRequest = (value) => JSONRPCRequestSchema.safeParse(value).success
  const JSONRPCNotificationSchema = objectType({
    jsonrpc: literalType(JSONRPC_VERSION)
  })
    .merge(NotificationSchema)
    .strict()
  const isJSONRPCNotification = (value) => JSONRPCNotificationSchema.safeParse(value).success
  const JSONRPCResponseSchema = objectType({
    jsonrpc: literalType(JSONRPC_VERSION),
    id: RequestIdSchema,
    result: ResultSchema
  }).strict()
  const isJSONRPCResponse = (value) => JSONRPCResponseSchema.safeParse(value).success
  var ErrorCode
  ;(function (ErrorCode2) {
    ErrorCode2[(ErrorCode2['ConnectionClosed'] = -32e3)] = 'ConnectionClosed'
    ErrorCode2[(ErrorCode2['RequestTimeout'] = -32001)] = 'RequestTimeout'
    ErrorCode2[(ErrorCode2['ParseError'] = -32700)] = 'ParseError'
    ErrorCode2[(ErrorCode2['InvalidRequest'] = -32600)] = 'InvalidRequest'
    ErrorCode2[(ErrorCode2['MethodNotFound'] = -32601)] = 'MethodNotFound'
    ErrorCode2[(ErrorCode2['InvalidParams'] = -32602)] = 'InvalidParams'
    ErrorCode2[(ErrorCode2['InternalError'] = -32603)] = 'InternalError'
  })(ErrorCode || (ErrorCode = {}))
  const JSONRPCErrorSchema = objectType({
    jsonrpc: literalType(JSONRPC_VERSION),
    id: RequestIdSchema,
    error: objectType({
      /**
       * The error type that occurred.
       */
      code: numberType().int(),
      /**
       * A short description of the error. The message SHOULD be limited to a concise single sentence.
       */
      message: stringType(),
      /**
       * Additional information about the error. The value of this member is defined by the sender (e.g. detailed error information, nested errors etc.).
       */
      data: optionalType(unknownType())
    })
  }).strict()
  const isJSONRPCError = (value) => JSONRPCErrorSchema.safeParse(value).success
  const JSONRPCMessageSchema = unionType([
    JSONRPCRequestSchema,
    JSONRPCNotificationSchema,
    JSONRPCResponseSchema,
    JSONRPCErrorSchema
  ])
  const EmptyResultSchema = ResultSchema.strict()
  const CancelledNotificationSchema = NotificationSchema.extend({
    method: literalType('notifications/cancelled'),
    params: BaseNotificationParamsSchema.extend({
      /**
       * The ID of the request to cancel.
       *
       * This MUST correspond to the ID of a request previously issued in the same direction.
       */
      requestId: RequestIdSchema,
      /**
       * An optional string describing the reason for the cancellation. This MAY be logged or presented to the user.
       */
      reason: stringType().optional()
    })
  })
  const BaseMetadataSchema = objectType({
    /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
    name: stringType(),
    /**
     * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
     * even by those unfamiliar with domain-specific terminology.
     *
     * If not provided, the name should be used for display (except for Tool,
     * where `annotations.title` should be given precedence over using `name`,
     * if present).
     */
    title: optionalType(stringType())
  }).passthrough()
  const ImplementationSchema = BaseMetadataSchema.extend({
    version: stringType()
  })
  const ClientCapabilitiesSchema = objectType({
    /**
     * Experimental, non-standard capabilities that the client supports.
     */
    experimental: optionalType(objectType({}).passthrough()),
    /**
     * Present if the client supports sampling from an LLM.
     */
    sampling: optionalType(objectType({}).passthrough()),
    /**
     * Present if the client supports eliciting user input.
     */
    elicitation: optionalType(objectType({}).passthrough()),
    /**
     * Present if the client supports listing roots.
     */
    roots: optionalType(
      objectType({
        /**
         * Whether the client supports issuing notifications for changes to the roots list.
         */
        listChanged: optionalType(booleanType())
      }).passthrough()
    )
  }).passthrough()
  const InitializeRequestSchema = RequestSchema.extend({
    method: literalType('initialize'),
    params: BaseRequestParamsSchema.extend({
      /**
       * The latest version of the Model Context Protocol that the client supports. The client MAY decide to support older versions as well.
       */
      protocolVersion: stringType(),
      capabilities: ClientCapabilitiesSchema,
      clientInfo: ImplementationSchema
    })
  })
  const ServerCapabilitiesSchema = objectType({
    /**
     * Experimental, non-standard capabilities that the server supports.
     */
    experimental: optionalType(objectType({}).passthrough()),
    /**
     * Present if the server supports sending log messages to the client.
     */
    logging: optionalType(objectType({}).passthrough()),
    /**
     * Present if the server supports sending completions to the client.
     */
    completions: optionalType(objectType({}).passthrough()),
    /**
     * Present if the server offers any prompt templates.
     */
    prompts: optionalType(
      objectType({
        /**
         * Whether this server supports issuing notifications for changes to the prompt list.
         */
        listChanged: optionalType(booleanType())
      }).passthrough()
    ),
    /**
     * Present if the server offers any resources to read.
     */
    resources: optionalType(
      objectType({
        /**
         * Whether this server supports clients subscribing to resource updates.
         */
        subscribe: optionalType(booleanType()),
        /**
         * Whether this server supports issuing notifications for changes to the resource list.
         */
        listChanged: optionalType(booleanType())
      }).passthrough()
    ),
    /**
     * Present if the server offers any tools to call.
     */
    tools: optionalType(
      objectType({
        /**
         * Whether this server supports issuing notifications for changes to the tool list.
         */
        listChanged: optionalType(booleanType())
      }).passthrough()
    )
  }).passthrough()
  const InitializeResultSchema = ResultSchema.extend({
    /**
     * The version of the Model Context Protocol that the server wants to use. This may not match the version that the client requested. If the client cannot support this version, it MUST disconnect.
     */
    protocolVersion: stringType(),
    capabilities: ServerCapabilitiesSchema,
    serverInfo: ImplementationSchema,
    /**
     * Instructions describing how to use the server and its features.
     *
     * This can be used by clients to improve the LLM's understanding of available tools, resources, etc. It can be thought of like a "hint" to the model. For example, this information MAY be added to the system prompt.
     */
    instructions: optionalType(stringType())
  })
  const InitializedNotificationSchema = NotificationSchema.extend({
    method: literalType('notifications/initialized')
  })
  const isInitializedNotification = (value) => InitializedNotificationSchema.safeParse(value).success
  const PingRequestSchema = RequestSchema.extend({
    method: literalType('ping')
  })
  const ProgressSchema = objectType({
    /**
     * The progress thus far. This should increase every time progress is made, even if the total is unknown.
     */
    progress: numberType(),
    /**
     * Total number of items to process (or total progress required), if known.
     */
    total: optionalType(numberType()),
    /**
     * An optional message describing the current progress.
     */
    message: optionalType(stringType())
  }).passthrough()
  const ProgressNotificationSchema = NotificationSchema.extend({
    method: literalType('notifications/progress'),
    params: BaseNotificationParamsSchema.merge(ProgressSchema).extend({
      /**
       * The progress token which was given in the initial request, used to associate this notification with the request that is proceeding.
       */
      progressToken: ProgressTokenSchema
    })
  })
  const PaginatedRequestSchema = RequestSchema.extend({
    params: BaseRequestParamsSchema.extend({
      /**
       * An opaque token representing the current pagination position.
       * If provided, the server should return results starting after this cursor.
       */
      cursor: optionalType(CursorSchema)
    }).optional()
  })
  const PaginatedResultSchema = ResultSchema.extend({
    /**
     * An opaque token representing the pagination position after the last returned result.
     * If present, there may be more results available.
     */
    nextCursor: optionalType(CursorSchema)
  })
  const ResourceContentsSchema = objectType({
    /**
     * The URI of this resource.
     */
    uri: stringType(),
    /**
     * The MIME type of this resource, if known.
     */
    mimeType: optionalType(stringType()),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: optionalType(objectType({}).passthrough())
  }).passthrough()
  const TextResourceContentsSchema = ResourceContentsSchema.extend({
    /**
     * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
     */
    text: stringType()
  })
  const Base64Schema = stringType().refine(
    (val) => {
      try {
        atob(val)
        return true
      } catch (_a) {
        return false
      }
    },
    { message: 'Invalid Base64 string' }
  )
  const BlobResourceContentsSchema = ResourceContentsSchema.extend({
    /**
     * A base64-encoded string representing the binary data of the item.
     */
    blob: Base64Schema
  })
  const ResourceSchema = BaseMetadataSchema.extend({
    /**
     * The URI of this resource.
     */
    uri: stringType(),
    /**
     * A description of what this resource represents.
     *
     * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
     */
    description: optionalType(stringType()),
    /**
     * The MIME type of this resource, if known.
     */
    mimeType: optionalType(stringType()),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: optionalType(objectType({}).passthrough())
  })
  const ResourceTemplateSchema = BaseMetadataSchema.extend({
    /**
     * A URI template (according to RFC 6570) that can be used to construct resource URIs.
     */
    uriTemplate: stringType(),
    /**
     * A description of what this template is for.
     *
     * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
     */
    description: optionalType(stringType()),
    /**
     * The MIME type for all resources that match this template. This should only be included if all resources matching this template have the same type.
     */
    mimeType: optionalType(stringType()),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: optionalType(objectType({}).passthrough())
  })
  const ListResourcesRequestSchema = PaginatedRequestSchema.extend({
    method: literalType('resources/list')
  })
  const ListResourcesResultSchema = PaginatedResultSchema.extend({
    resources: arrayType(ResourceSchema)
  })
  const ListResourceTemplatesRequestSchema = PaginatedRequestSchema.extend({
    method: literalType('resources/templates/list')
  })
  const ListResourceTemplatesResultSchema = PaginatedResultSchema.extend({
    resourceTemplates: arrayType(ResourceTemplateSchema)
  })
  const ReadResourceRequestSchema = RequestSchema.extend({
    method: literalType('resources/read'),
    params: BaseRequestParamsSchema.extend({
      /**
       * The URI of the resource to read. The URI can use any protocol; it is up to the server how to interpret it.
       */
      uri: stringType()
    })
  })
  const ReadResourceResultSchema = ResultSchema.extend({
    contents: arrayType(unionType([TextResourceContentsSchema, BlobResourceContentsSchema]))
  })
  const ResourceListChangedNotificationSchema = NotificationSchema.extend({
    method: literalType('notifications/resources/list_changed')
  })
  const SubscribeRequestSchema = RequestSchema.extend({
    method: literalType('resources/subscribe'),
    params: BaseRequestParamsSchema.extend({
      /**
       * The URI of the resource to subscribe to. The URI can use any protocol; it is up to the server how to interpret it.
       */
      uri: stringType()
    })
  })
  const UnsubscribeRequestSchema = RequestSchema.extend({
    method: literalType('resources/unsubscribe'),
    params: BaseRequestParamsSchema.extend({
      /**
       * The URI of the resource to unsubscribe from.
       */
      uri: stringType()
    })
  })
  const ResourceUpdatedNotificationSchema = NotificationSchema.extend({
    method: literalType('notifications/resources/updated'),
    params: BaseNotificationParamsSchema.extend({
      /**
       * The URI of the resource that has been updated. This might be a sub-resource of the one that the client actually subscribed to.
       */
      uri: stringType()
    })
  })
  const PromptArgumentSchema = objectType({
    /**
     * The name of the argument.
     */
    name: stringType(),
    /**
     * A human-readable description of the argument.
     */
    description: optionalType(stringType()),
    /**
     * Whether this argument must be provided.
     */
    required: optionalType(booleanType())
  }).passthrough()
  const PromptSchema = BaseMetadataSchema.extend({
    /**
     * An optional description of what this prompt provides
     */
    description: optionalType(stringType()),
    /**
     * A list of arguments to use for templating the prompt.
     */
    arguments: optionalType(arrayType(PromptArgumentSchema)),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: optionalType(objectType({}).passthrough())
  })
  const ListPromptsRequestSchema = PaginatedRequestSchema.extend({
    method: literalType('prompts/list')
  })
  const ListPromptsResultSchema = PaginatedResultSchema.extend({
    prompts: arrayType(PromptSchema)
  })
  const GetPromptRequestSchema = RequestSchema.extend({
    method: literalType('prompts/get'),
    params: BaseRequestParamsSchema.extend({
      /**
       * The name of the prompt or prompt template.
       */
      name: stringType(),
      /**
       * Arguments to use for templating the prompt.
       */
      arguments: optionalType(recordType(stringType()))
    })
  })
  const TextContentSchema = objectType({
    type: literalType('text'),
    /**
     * The text content of the message.
     */
    text: stringType(),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: optionalType(objectType({}).passthrough())
  }).passthrough()
  const ImageContentSchema = objectType({
    type: literalType('image'),
    /**
     * The base64-encoded image data.
     */
    data: Base64Schema,
    /**
     * The MIME type of the image. Different providers may support different image types.
     */
    mimeType: stringType(),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: optionalType(objectType({}).passthrough())
  }).passthrough()
  const AudioContentSchema = objectType({
    type: literalType('audio'),
    /**
     * The base64-encoded audio data.
     */
    data: Base64Schema,
    /**
     * The MIME type of the audio. Different providers may support different audio types.
     */
    mimeType: stringType(),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: optionalType(objectType({}).passthrough())
  }).passthrough()
  const EmbeddedResourceSchema = objectType({
    type: literalType('resource'),
    resource: unionType([TextResourceContentsSchema, BlobResourceContentsSchema]),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: optionalType(objectType({}).passthrough())
  }).passthrough()
  const ResourceLinkSchema = ResourceSchema.extend({
    type: literalType('resource_link')
  })
  const ContentBlockSchema = unionType([
    TextContentSchema,
    ImageContentSchema,
    AudioContentSchema,
    ResourceLinkSchema,
    EmbeddedResourceSchema
  ])
  const PromptMessageSchema = objectType({
    role: enumType(['user', 'assistant']),
    content: ContentBlockSchema
  }).passthrough()
  const GetPromptResultSchema = ResultSchema.extend({
    /**
     * An optional description for the prompt.
     */
    description: optionalType(stringType()),
    messages: arrayType(PromptMessageSchema)
  })
  const PromptListChangedNotificationSchema = NotificationSchema.extend({
    method: literalType('notifications/prompts/list_changed')
  })
  const ToolAnnotationsSchema = objectType({
    /**
     * A human-readable title for the tool.
     */
    title: optionalType(stringType()),
    /**
     * If true, the tool does not modify its environment.
     *
     * Default: false
     */
    readOnlyHint: optionalType(booleanType()),
    /**
     * If true, the tool may perform destructive updates to its environment.
     * If false, the tool performs only additive updates.
     *
     * (This property is meaningful only when `readOnlyHint == false`)
     *
     * Default: true
     */
    destructiveHint: optionalType(booleanType()),
    /**
     * If true, calling the tool repeatedly with the same arguments
     * will have no additional effect on the its environment.
     *
     * (This property is meaningful only when `readOnlyHint == false`)
     *
     * Default: false
     */
    idempotentHint: optionalType(booleanType()),
    /**
     * If true, this tool may interact with an "open world" of external
     * entities. If false, the tool's domain of interaction is closed.
     * For example, the world of a web search tool is open, whereas that
     * of a memory tool is not.
     *
     * Default: true
     */
    openWorldHint: optionalType(booleanType())
  }).passthrough()
  const ToolSchema = BaseMetadataSchema.extend({
    /**
     * A human-readable description of the tool.
     */
    description: optionalType(stringType()),
    /**
     * A JSON Schema object defining the expected parameters for the tool.
     */
    inputSchema: objectType({
      type: literalType('object'),
      properties: optionalType(objectType({}).passthrough()),
      required: optionalType(arrayType(stringType()))
    }).passthrough(),
    /**
     * An optional JSON Schema object defining the structure of the tool's output returned in
     * the structuredContent field of a CallToolResult.
     */
    outputSchema: optionalType(
      objectType({
        type: literalType('object'),
        properties: optionalType(objectType({}).passthrough()),
        required: optionalType(arrayType(stringType()))
      }).passthrough()
    ),
    /**
     * Optional additional tool information.
     */
    annotations: optionalType(ToolAnnotationsSchema),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: optionalType(objectType({}).passthrough())
  })
  const ListToolsRequestSchema = PaginatedRequestSchema.extend({
    method: literalType('tools/list')
  })
  const ListToolsResultSchema = PaginatedResultSchema.extend({
    tools: arrayType(ToolSchema)
  })
  const CallToolResultSchema = ResultSchema.extend({
    /**
     * A list of content objects that represent the result of the tool call.
     *
     * If the Tool does not define an outputSchema, this field MUST be present in the result.
     * For backwards compatibility, this field is always present, but it may be empty.
     */
    content: arrayType(ContentBlockSchema).default([]),
    /**
     * An object containing structured tool output.
     *
     * If the Tool defines an outputSchema, this field MUST be present in the result, and contain a JSON object that matches the schema.
     */
    structuredContent: objectType({}).passthrough().optional(),
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
    isError: optionalType(booleanType())
  })
  CallToolResultSchema.or(
    ResultSchema.extend({
      toolResult: unknownType()
    })
  )
  const CallToolRequestSchema = RequestSchema.extend({
    method: literalType('tools/call'),
    params: BaseRequestParamsSchema.extend({
      name: stringType(),
      arguments: optionalType(recordType(unknownType()))
    })
  })
  const ToolListChangedNotificationSchema = NotificationSchema.extend({
    method: literalType('notifications/tools/list_changed')
  })
  const LoggingLevelSchema = enumType(['debug', 'info', 'notice', 'warning', 'error', 'critical', 'alert', 'emergency'])
  const SetLevelRequestSchema = RequestSchema.extend({
    method: literalType('logging/setLevel'),
    params: BaseRequestParamsSchema.extend({
      /**
       * The level of logging that the client wants to receive from the server. The server should send all logs at this level and higher (i.e., more severe) to the client as notifications/logging/message.
       */
      level: LoggingLevelSchema
    })
  })
  const LoggingMessageNotificationSchema = NotificationSchema.extend({
    method: literalType('notifications/message'),
    params: BaseNotificationParamsSchema.extend({
      /**
       * The severity of this log message.
       */
      level: LoggingLevelSchema,
      /**
       * An optional name of the logger issuing this message.
       */
      logger: optionalType(stringType()),
      /**
       * The data to be logged, such as a string message or an object. Any JSON serializable type is allowed here.
       */
      data: unknownType()
    })
  })
  const ModelHintSchema = objectType({
    /**
     * A hint for a model name.
     */
    name: stringType().optional()
  }).passthrough()
  const ModelPreferencesSchema = objectType({
    /**
     * Optional hints to use for model selection.
     */
    hints: optionalType(arrayType(ModelHintSchema)),
    /**
     * How much to prioritize cost when selecting a model.
     */
    costPriority: optionalType(numberType().min(0).max(1)),
    /**
     * How much to prioritize sampling speed (latency) when selecting a model.
     */
    speedPriority: optionalType(numberType().min(0).max(1)),
    /**
     * How much to prioritize intelligence and capabilities when selecting a model.
     */
    intelligencePriority: optionalType(numberType().min(0).max(1))
  }).passthrough()
  const SamplingMessageSchema = objectType({
    role: enumType(['user', 'assistant']),
    content: unionType([TextContentSchema, ImageContentSchema, AudioContentSchema])
  }).passthrough()
  const CreateMessageRequestSchema = RequestSchema.extend({
    method: literalType('sampling/createMessage'),
    params: BaseRequestParamsSchema.extend({
      messages: arrayType(SamplingMessageSchema),
      /**
       * An optional system prompt the server wants to use for sampling. The client MAY modify or omit this prompt.
       */
      systemPrompt: optionalType(stringType()),
      /**
       * A request to include context from one or more MCP servers (including the caller), to be attached to the prompt. The client MAY ignore this request.
       */
      includeContext: optionalType(enumType(['none', 'thisServer', 'allServers'])),
      temperature: optionalType(numberType()),
      /**
       * The maximum number of tokens to sample, as requested by the server. The client MAY choose to sample fewer tokens than requested.
       */
      maxTokens: numberType().int(),
      stopSequences: optionalType(arrayType(stringType())),
      /**
       * Optional metadata to pass through to the LLM provider. The format of this metadata is provider-specific.
       */
      metadata: optionalType(objectType({}).passthrough()),
      /**
       * The server's preferences for which model to select.
       */
      modelPreferences: optionalType(ModelPreferencesSchema)
    })
  })
  const CreateMessageResultSchema = ResultSchema.extend({
    /**
     * The name of the model that generated the message.
     */
    model: stringType(),
    /**
     * The reason why sampling stopped.
     */
    stopReason: optionalType(enumType(['endTurn', 'stopSequence', 'maxTokens']).or(stringType())),
    role: enumType(['user', 'assistant']),
    content: discriminatedUnionType('type', [TextContentSchema, ImageContentSchema, AudioContentSchema])
  })
  const BooleanSchemaSchema = objectType({
    type: literalType('boolean'),
    title: optionalType(stringType()),
    description: optionalType(stringType()),
    default: optionalType(booleanType())
  }).passthrough()
  const StringSchemaSchema = objectType({
    type: literalType('string'),
    title: optionalType(stringType()),
    description: optionalType(stringType()),
    minLength: optionalType(numberType()),
    maxLength: optionalType(numberType()),
    format: optionalType(enumType(['email', 'uri', 'date', 'date-time']))
  }).passthrough()
  const NumberSchemaSchema = objectType({
    type: enumType(['number', 'integer']),
    title: optionalType(stringType()),
    description: optionalType(stringType()),
    minimum: optionalType(numberType()),
    maximum: optionalType(numberType())
  }).passthrough()
  const EnumSchemaSchema = objectType({
    type: literalType('string'),
    title: optionalType(stringType()),
    description: optionalType(stringType()),
    enum: arrayType(stringType()),
    enumNames: optionalType(arrayType(stringType()))
  }).passthrough()
  const PrimitiveSchemaDefinitionSchema = unionType([
    BooleanSchemaSchema,
    StringSchemaSchema,
    NumberSchemaSchema,
    EnumSchemaSchema
  ])
  const ElicitRequestSchema = RequestSchema.extend({
    method: literalType('elicitation/create'),
    params: BaseRequestParamsSchema.extend({
      /**
       * The message to present to the user.
       */
      message: stringType(),
      /**
       * The schema for the requested user input.
       */
      requestedSchema: objectType({
        type: literalType('object'),
        properties: recordType(stringType(), PrimitiveSchemaDefinitionSchema),
        required: optionalType(arrayType(stringType()))
      }).passthrough()
    })
  })
  const ElicitResultSchema = ResultSchema.extend({
    /**
     * The user's response action.
     */
    action: enumType(['accept', 'decline', 'cancel']),
    /**
     * The collected user input content (only present if action is "accept").
     */
    content: optionalType(recordType(stringType(), unknownType()))
  })
  const ResourceTemplateReferenceSchema = objectType({
    type: literalType('ref/resource'),
    /**
     * The URI or URI template of the resource.
     */
    uri: stringType()
  }).passthrough()
  const PromptReferenceSchema = objectType({
    type: literalType('ref/prompt'),
    /**
     * The name of the prompt or prompt template
     */
    name: stringType()
  }).passthrough()
  const CompleteRequestSchema = RequestSchema.extend({
    method: literalType('completion/complete'),
    params: BaseRequestParamsSchema.extend({
      ref: unionType([PromptReferenceSchema, ResourceTemplateReferenceSchema]),
      /**
       * The argument's information
       */
      argument: objectType({
        /**
         * The name of the argument
         */
        name: stringType(),
        /**
         * The value of the argument to use for completion matching.
         */
        value: stringType()
      }).passthrough(),
      context: optionalType(
        objectType({
          /**
           * Previously-resolved variables in a URI template or prompt.
           */
          arguments: optionalType(recordType(stringType(), stringType()))
        })
      )
    })
  })
  const CompleteResultSchema = ResultSchema.extend({
    completion: objectType({
      /**
       * An array of completion values. Must not exceed 100 items.
       */
      values: arrayType(stringType()).max(100),
      /**
       * The total number of completion options available. This can exceed the number of values actually sent in the response.
       */
      total: optionalType(numberType().int()),
      /**
       * Indicates whether there are additional completion options beyond those provided in the current response, even if the exact total is unknown.
       */
      hasMore: optionalType(booleanType())
    }).passthrough()
  })
  const RootSchema = objectType({
    /**
     * The URI identifying the root. This *must* start with file:// for now.
     */
    uri: stringType().startsWith('file://'),
    /**
     * An optional name for the root.
     */
    name: optionalType(stringType()),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: optionalType(objectType({}).passthrough())
  }).passthrough()
  const ListRootsRequestSchema = RequestSchema.extend({
    method: literalType('roots/list')
  })
  const ListRootsResultSchema = ResultSchema.extend({
    roots: arrayType(RootSchema)
  })
  const RootsListChangedNotificationSchema = NotificationSchema.extend({
    method: literalType('notifications/roots/list_changed')
  })
  unionType([
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
    ListToolsRequestSchema
  ])
  unionType([
    CancelledNotificationSchema,
    ProgressNotificationSchema,
    InitializedNotificationSchema,
    RootsListChangedNotificationSchema
  ])
  unionType([EmptyResultSchema, CreateMessageResultSchema, ElicitResultSchema, ListRootsResultSchema])
  unionType([PingRequestSchema, CreateMessageRequestSchema, ElicitRequestSchema, ListRootsRequestSchema])
  unionType([
    CancelledNotificationSchema,
    ProgressNotificationSchema,
    LoggingMessageNotificationSchema,
    ResourceUpdatedNotificationSchema,
    ResourceListChangedNotificationSchema,
    ToolListChangedNotificationSchema,
    PromptListChangedNotificationSchema
  ])
  unionType([
    EmptyResultSchema,
    InitializeResultSchema,
    CompleteResultSchema,
    GetPromptResultSchema,
    ListPromptsResultSchema,
    ListResourcesResultSchema,
    ListResourceTemplatesResultSchema,
    ReadResourceResultSchema,
    CallToolResultSchema,
    ListToolsResultSchema
  ])
  class McpError extends Error {
    constructor(code2, message, data2) {
      super(`MCP error ${code2}: ${message}`)
      this.code = code2
      this.data = data2
      this.name = 'McpError'
    }
  }
  const DEFAULT_REQUEST_TIMEOUT_MSEC = 6e4
  class Protocol {
    constructor(_options) {
      this._options = _options
      this._requestMessageId = 0
      this._requestHandlers = /* @__PURE__ */ new Map()
      this._requestHandlerAbortControllers = /* @__PURE__ */ new Map()
      this._notificationHandlers = /* @__PURE__ */ new Map()
      this._responseHandlers = /* @__PURE__ */ new Map()
      this._progressHandlers = /* @__PURE__ */ new Map()
      this._timeoutInfo = /* @__PURE__ */ new Map()
      this._pendingDebouncedNotifications = /* @__PURE__ */ new Set()
      this.setNotificationHandler(CancelledNotificationSchema, (notification) => {
        const controller = this._requestHandlerAbortControllers.get(notification.params.requestId)
        controller === null || controller === void 0 ? void 0 : controller.abort(notification.params.reason)
      })
      this.setNotificationHandler(ProgressNotificationSchema, (notification) => {
        this._onprogress(notification)
      })
      this.setRequestHandler(
        PingRequestSchema,
        // Automatic pong by default.
        (_request) => ({})
      )
    }
    _setupTimeout(messageId, timeout, maxTotalTimeout, onTimeout, resetTimeoutOnProgress = false) {
      this._timeoutInfo.set(messageId, {
        timeoutId: setTimeout(onTimeout, timeout),
        startTime: Date.now(),
        timeout,
        maxTotalTimeout,
        resetTimeoutOnProgress,
        onTimeout
      })
    }
    _resetTimeout(messageId) {
      const info = this._timeoutInfo.get(messageId)
      if (!info) return false
      const totalElapsed = Date.now() - info.startTime
      if (info.maxTotalTimeout && totalElapsed >= info.maxTotalTimeout) {
        this._timeoutInfo.delete(messageId)
        throw new McpError(ErrorCode.RequestTimeout, 'Maximum total timeout exceeded', {
          maxTotalTimeout: info.maxTotalTimeout,
          totalElapsed
        })
      }
      clearTimeout(info.timeoutId)
      info.timeoutId = setTimeout(info.onTimeout, info.timeout)
      return true
    }
    _cleanupTimeout(messageId) {
      const info = this._timeoutInfo.get(messageId)
      if (info) {
        clearTimeout(info.timeoutId)
        this._timeoutInfo.delete(messageId)
      }
    }
    /**
     * Attaches to the given transport, starts it, and starts listening for messages.
     *
     * The Protocol object assumes ownership of the Transport, replacing any callbacks that have already been set, and expects that it is the only user of the Transport instance going forward.
     */
    async connect(transport) {
      var _a, _b, _c
      this._transport = transport
      const _onclose = (_a = this.transport) === null || _a === void 0 ? void 0 : _a.onclose
      this._transport.onclose = () => {
        _onclose === null || _onclose === void 0 ? void 0 : _onclose()
        this._onclose()
      }
      const _onerror = (_b = this.transport) === null || _b === void 0 ? void 0 : _b.onerror
      this._transport.onerror = (error2) => {
        _onerror === null || _onerror === void 0 ? void 0 : _onerror(error2)
        this._onerror(error2)
      }
      const _onmessage = (_c = this._transport) === null || _c === void 0 ? void 0 : _c.onmessage
      this._transport.onmessage = (message, extra) => {
        _onmessage === null || _onmessage === void 0 ? void 0 : _onmessage(message, extra)
        if (isJSONRPCResponse(message) || isJSONRPCError(message)) {
          this._onresponse(message)
        } else if (isJSONRPCRequest(message)) {
          this._onrequest(message, extra)
        } else if (isJSONRPCNotification(message)) {
          this._onnotification(message)
        } else {
          this._onerror(new Error(`Unknown message type: ${JSON.stringify(message)}`))
        }
      }
      await this._transport.start()
    }
    _onclose() {
      var _a
      const responseHandlers = this._responseHandlers
      this._responseHandlers = /* @__PURE__ */ new Map()
      this._progressHandlers.clear()
      this._pendingDebouncedNotifications.clear()
      this._transport = void 0
      ;(_a = this.onclose) === null || _a === void 0 ? void 0 : _a.call(this)
      const error2 = new McpError(ErrorCode.ConnectionClosed, 'Connection closed')
      for (const handler of responseHandlers.values()) {
        handler(error2)
      }
    }
    _onerror(error2) {
      var _a
      ;(_a = this.onerror) === null || _a === void 0 ? void 0 : _a.call(this, error2)
    }
    _onnotification(notification) {
      var _a
      const handler =
        (_a = this._notificationHandlers.get(notification.method)) !== null && _a !== void 0
          ? _a
          : this.fallbackNotificationHandler
      if (handler === void 0) {
        return
      }
      Promise.resolve()
        .then(() => handler(notification))
        .catch((error2) => this._onerror(new Error(`Uncaught error in notification handler: ${error2}`)))
    }
    _onrequest(request, extra) {
      var _a, _b, _c, _d
      const handler =
        (_a = this._requestHandlers.get(request.method)) !== null && _a !== void 0 ? _a : this.fallbackRequestHandler
      if (handler === void 0) {
        ;(_b = this._transport) === null || _b === void 0
          ? void 0
          : _b
              .send({
                jsonrpc: '2.0',
                id: request.id,
                error: {
                  code: ErrorCode.MethodNotFound,
                  message: 'Method not found'
                }
              })
              .catch((error2) => this._onerror(new Error(`Failed to send an error response: ${error2}`)))
        return
      }
      const abortController = new AbortController()
      this._requestHandlerAbortControllers.set(request.id, abortController)
      const fullExtra = {
        signal: abortController.signal,
        sessionId: (_c = this._transport) === null || _c === void 0 ? void 0 : _c.sessionId,
        _meta: (_d = request.params) === null || _d === void 0 ? void 0 : _d._meta,
        sendNotification: (notification) => this.notification(notification, { relatedRequestId: request.id }),
        sendRequest: (r, resultSchema, options) =>
          this.request(r, resultSchema, { ...options, relatedRequestId: request.id }),
        authInfo: extra === null || extra === void 0 ? void 0 : extra.authInfo,
        requestId: request.id,
        requestInfo: extra === null || extra === void 0 ? void 0 : extra.requestInfo
      }
      Promise.resolve()
        .then(() => handler(request, fullExtra))
        .then(
          (result) => {
            var _a2
            if (abortController.signal.aborted) {
              return
            }
            return (_a2 = this._transport) === null || _a2 === void 0
              ? void 0
              : _a2.send({
                  result,
                  jsonrpc: '2.0',
                  id: request.id
                })
          },
          (error2) => {
            var _a2, _b2
            if (abortController.signal.aborted) {
              return
            }
            return (_a2 = this._transport) === null || _a2 === void 0
              ? void 0
              : _a2.send({
                  jsonrpc: '2.0',
                  id: request.id,
                  error: {
                    code: Number.isSafeInteger(error2['code']) ? error2['code'] : ErrorCode.InternalError,
                    message: (_b2 = error2.message) !== null && _b2 !== void 0 ? _b2 : 'Internal error'
                  }
                })
          }
        )
        .catch((error2) => this._onerror(new Error(`Failed to send response: ${error2}`)))
        .finally(() => {
          this._requestHandlerAbortControllers.delete(request.id)
        })
    }
    _onprogress(notification) {
      const { progressToken, ...params } = notification.params
      const messageId = Number(progressToken)
      const handler = this._progressHandlers.get(messageId)
      if (!handler) {
        this._onerror(
          new Error(`Received a progress notification for an unknown token: ${JSON.stringify(notification)}`)
        )
        return
      }
      const responseHandler = this._responseHandlers.get(messageId)
      const timeoutInfo = this._timeoutInfo.get(messageId)
      if (timeoutInfo && responseHandler && timeoutInfo.resetTimeoutOnProgress) {
        try {
          this._resetTimeout(messageId)
        } catch (error2) {
          responseHandler(error2)
          return
        }
      }
      handler(params)
    }
    _onresponse(response) {
      const messageId = Number(response.id)
      const handler = this._responseHandlers.get(messageId)
      if (handler === void 0) {
        this._onerror(new Error(`Received a response for an unknown message ID: ${JSON.stringify(response)}`))
        return
      }
      this._responseHandlers.delete(messageId)
      this._progressHandlers.delete(messageId)
      this._cleanupTimeout(messageId)
      if (isJSONRPCResponse(response)) {
        handler(response)
      } else {
        const error2 = new McpError(response.error.code, response.error.message, response.error.data)
        handler(error2)
      }
    }
    get transport() {
      return this._transport
    }
    /**
     * Closes the connection.
     */
    async close() {
      var _a
      await ((_a = this._transport) === null || _a === void 0 ? void 0 : _a.close())
    }
    /**
     * Sends a request and wait for a response.
     *
     * Do not use this method to emit notifications! Use notification() instead.
     */
    request(request, resultSchema, options) {
      const { relatedRequestId, resumptionToken, onresumptiontoken } =
        options !== null && options !== void 0 ? options : {}
      return new Promise((resolve2, reject) => {
        var _a, _b, _c, _d, _e, _f
        if (!this._transport) {
          reject(new Error('Not connected'))
          return
        }
        if (((_a = this._options) === null || _a === void 0 ? void 0 : _a.enforceStrictCapabilities) === true) {
          this.assertCapabilityForMethod(request.method)
        }
        ;(_b = options === null || options === void 0 ? void 0 : options.signal) === null || _b === void 0
          ? void 0
          : _b.throwIfAborted()
        const messageId = this._requestMessageId++
        const jsonrpcRequest = {
          ...request,
          jsonrpc: '2.0',
          id: messageId
        }
        if (options === null || options === void 0 ? void 0 : options.onprogress) {
          this._progressHandlers.set(messageId, options.onprogress)
          jsonrpcRequest.params = {
            ...request.params,
            _meta: {
              ...(((_c = request.params) === null || _c === void 0 ? void 0 : _c._meta) || {}),
              progressToken: messageId
            }
          }
        }
        const cancel = (reason) => {
          var _a2
          this._responseHandlers.delete(messageId)
          this._progressHandlers.delete(messageId)
          this._cleanupTimeout(messageId)
          ;(_a2 = this._transport) === null || _a2 === void 0
            ? void 0
            : _a2
                .send(
                  {
                    jsonrpc: '2.0',
                    method: 'notifications/cancelled',
                    params: {
                      requestId: messageId,
                      reason: String(reason)
                    }
                  },
                  { relatedRequestId, resumptionToken, onresumptiontoken }
                )
                .catch((error2) => this._onerror(new Error(`Failed to send cancellation: ${error2}`)))
          reject(reason)
        }
        this._responseHandlers.set(messageId, (response) => {
          var _a2
          if (
            (_a2 = options === null || options === void 0 ? void 0 : options.signal) === null || _a2 === void 0
              ? void 0
              : _a2.aborted
          ) {
            return
          }
          if (response instanceof Error) {
            return reject(response)
          }
          try {
            const result = resultSchema.parse(response.result)
            resolve2(result)
          } catch (error2) {
            reject(error2)
          }
        })
        ;(_d = options === null || options === void 0 ? void 0 : options.signal) === null || _d === void 0
          ? void 0
          : _d.addEventListener('abort', () => {
              var _a2
              cancel(
                (_a2 = options === null || options === void 0 ? void 0 : options.signal) === null || _a2 === void 0
                  ? void 0
                  : _a2.reason
              )
            })
        const timeout =
          (_e = options === null || options === void 0 ? void 0 : options.timeout) !== null && _e !== void 0
            ? _e
            : DEFAULT_REQUEST_TIMEOUT_MSEC
        const timeoutHandler = () => cancel(new McpError(ErrorCode.RequestTimeout, 'Request timed out', { timeout }))
        this._setupTimeout(
          messageId,
          timeout,
          options === null || options === void 0 ? void 0 : options.maxTotalTimeout,
          timeoutHandler,
          (_f = options === null || options === void 0 ? void 0 : options.resetTimeoutOnProgress) !== null &&
            _f !== void 0
            ? _f
            : false
        )
        this._transport
          .send(jsonrpcRequest, { relatedRequestId, resumptionToken, onresumptiontoken })
          .catch((error2) => {
            this._cleanupTimeout(messageId)
            reject(error2)
          })
      })
    }
    /**
     * Emits a notification, which is a one-way message that does not expect a response.
     */
    async notification(notification, options) {
      var _a, _b
      if (!this._transport) {
        throw new Error('Not connected')
      }
      this.assertNotificationCapability(notification.method)
      const debouncedMethods =
        (_b = (_a = this._options) === null || _a === void 0 ? void 0 : _a.debouncedNotificationMethods) !== null &&
        _b !== void 0
          ? _b
          : []
      const canDebounce =
        debouncedMethods.includes(notification.method) &&
        !notification.params &&
        !(options === null || options === void 0 ? void 0 : options.relatedRequestId)
      if (canDebounce) {
        if (this._pendingDebouncedNotifications.has(notification.method)) {
          return
        }
        this._pendingDebouncedNotifications.add(notification.method)
        Promise.resolve().then(() => {
          var _a2
          this._pendingDebouncedNotifications.delete(notification.method)
          if (!this._transport) {
            return
          }
          const jsonrpcNotification2 = {
            ...notification,
            jsonrpc: '2.0'
          }
          ;(_a2 = this._transport) === null || _a2 === void 0
            ? void 0
            : _a2.send(jsonrpcNotification2, options).catch((error2) => this._onerror(error2))
        })
        return
      }
      const jsonrpcNotification = {
        ...notification,
        jsonrpc: '2.0'
      }
      await this._transport.send(jsonrpcNotification, options)
    }
    /**
     * Registers a handler to invoke when this protocol object receives a request with the given method.
     *
     * Note that this will replace any previous request handler for the same method.
     */
    setRequestHandler(requestSchema, handler) {
      const method = requestSchema.shape.method.value
      this.assertRequestHandlerCapability(method)
      this._requestHandlers.set(method, (request, extra) => {
        return Promise.resolve(handler(requestSchema.parse(request), extra))
      })
    }
    /**
     * Removes the request handler for the given method.
     */
    removeRequestHandler(method) {
      this._requestHandlers.delete(method)
    }
    /**
     * Asserts that a request handler has not already been set for the given method, in preparation for a new one being automatically installed.
     */
    assertCanSetRequestHandler(method) {
      if (this._requestHandlers.has(method)) {
        throw new Error(`A request handler for ${method} already exists, which would be overridden`)
      }
    }
    /**
     * Registers a handler to invoke when this protocol object receives a notification with the given method.
     *
     * Note that this will replace any previous notification handler for the same method.
     */
    setNotificationHandler(notificationSchema, handler) {
      this._notificationHandlers.set(notificationSchema.shape.method.value, (notification) =>
        Promise.resolve(handler(notificationSchema.parse(notification)))
      )
    }
    /**
     * Removes the notification handler for the given method.
     */
    removeNotificationHandler(method) {
      this._notificationHandlers.delete(method)
    }
  }
  function mergeCapabilities(base, additional) {
    return Object.entries(additional).reduce(
      (acc, [key, value]) => {
        if (value && typeof value === 'object') {
          acc[key] = acc[key] ? { ...acc[key], ...value } : value
        } else {
          acc[key] = value
        }
        return acc
      },
      { ...base }
    )
  }
  var uri_all = { exports: {} }
  /** @license URI.js v4.4.1 (c) 2011 Gary Court. License: http://github.com/garycourt/uri-js */
  ;(function (module2, exports3) {
    ;(function (global2, factory) {
      factory(exports3)
    })(commonjsGlobal, function (exports4) {
      function merge() {
        for (var _len = arguments.length, sets = Array(_len), _key = 0; _key < _len; _key++) {
          sets[_key] = arguments[_key]
        }
        if (sets.length > 1) {
          sets[0] = sets[0].slice(0, -1)
          var xl = sets.length - 1
          for (var x = 1; x < xl; ++x) {
            sets[x] = sets[x].slice(1, -1)
          }
          sets[xl] = sets[xl].slice(1)
          return sets.join('')
        } else {
          return sets[0]
        }
      }
      function subexp(str) {
        return '(?:' + str + ')'
      }
      function typeOf(o) {
        return o === void 0
          ? 'undefined'
          : o === null
            ? 'null'
            : Object.prototype.toString.call(o).split(' ').pop().split(']').shift().toLowerCase()
      }
      function toUpperCase(str) {
        return str.toUpperCase()
      }
      function toArray(obj) {
        return obj !== void 0 && obj !== null
          ? obj instanceof Array
            ? obj
            : typeof obj.length !== 'number' || obj.split || obj.setInterval || obj.call
              ? [obj]
              : Array.prototype.slice.call(obj)
          : []
      }
      function assign(target, source) {
        var obj = target
        if (source) {
          for (var key in source) {
            obj[key] = source[key]
          }
        }
        return obj
      }
      function buildExps(isIRI) {
        var ALPHA$$ = '[A-Za-z]',
          DIGIT$$ = '[0-9]',
          HEXDIG$$2 = merge(DIGIT$$, '[A-Fa-f]'),
          PCT_ENCODED$2 = subexp(
            subexp('%[EFef]' + HEXDIG$$2 + '%' + HEXDIG$$2 + HEXDIG$$2 + '%' + HEXDIG$$2 + HEXDIG$$2) +
              '|' +
              subexp('%[89A-Fa-f]' + HEXDIG$$2 + '%' + HEXDIG$$2 + HEXDIG$$2) +
              '|' +
              subexp('%' + HEXDIG$$2 + HEXDIG$$2)
          ),
          GEN_DELIMS$$ = '[\\:\\/\\?\\#\\[\\]\\@]',
          SUB_DELIMS$$ = "[\\!\\$\\&\\'\\(\\)\\*\\+\\,\\;\\=]",
          RESERVED$$ = merge(GEN_DELIMS$$, SUB_DELIMS$$),
          UCSCHAR$$ = isIRI ? '[\\xA0-\\u200D\\u2010-\\u2029\\u202F-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF]' : '[]',
          IPRIVATE$$ = isIRI ? '[\\uE000-\\uF8FF]' : '[]',
          UNRESERVED$$2 = merge(ALPHA$$, DIGIT$$, '[\\-\\.\\_\\~]', UCSCHAR$$)
        subexp(ALPHA$$ + merge(ALPHA$$, DIGIT$$, '[\\+\\-\\.]') + '*')
        subexp(subexp(PCT_ENCODED$2 + '|' + merge(UNRESERVED$$2, SUB_DELIMS$$, '[\\:]')) + '*')
        var DEC_OCTET_RELAXED$ = subexp(
            subexp('25[0-5]') +
              '|' +
              subexp('2[0-4]' + DIGIT$$) +
              '|' +
              subexp('1' + DIGIT$$ + DIGIT$$) +
              '|' +
              subexp('0?[1-9]' + DIGIT$$) +
              '|0?0?' +
              DIGIT$$
          ),
          IPV4ADDRESS$ = subexp(
            DEC_OCTET_RELAXED$ + '\\.' + DEC_OCTET_RELAXED$ + '\\.' + DEC_OCTET_RELAXED$ + '\\.' + DEC_OCTET_RELAXED$
          ),
          H16$ = subexp(HEXDIG$$2 + '{1,4}'),
          LS32$ = subexp(subexp(H16$ + '\\:' + H16$) + '|' + IPV4ADDRESS$),
          IPV6ADDRESS1$ = subexp(subexp(H16$ + '\\:') + '{6}' + LS32$),
          IPV6ADDRESS2$ = subexp('\\:\\:' + subexp(H16$ + '\\:') + '{5}' + LS32$),
          IPV6ADDRESS3$ = subexp(subexp(H16$) + '?\\:\\:' + subexp(H16$ + '\\:') + '{4}' + LS32$),
          IPV6ADDRESS4$ = subexp(
            subexp(subexp(H16$ + '\\:') + '{0,1}' + H16$) + '?\\:\\:' + subexp(H16$ + '\\:') + '{3}' + LS32$
          ),
          IPV6ADDRESS5$ = subexp(
            subexp(subexp(H16$ + '\\:') + '{0,2}' + H16$) + '?\\:\\:' + subexp(H16$ + '\\:') + '{2}' + LS32$
          ),
          IPV6ADDRESS6$ = subexp(subexp(subexp(H16$ + '\\:') + '{0,3}' + H16$) + '?\\:\\:' + H16$ + '\\:' + LS32$),
          IPV6ADDRESS7$ = subexp(subexp(subexp(H16$ + '\\:') + '{0,4}' + H16$) + '?\\:\\:' + LS32$),
          IPV6ADDRESS8$ = subexp(subexp(subexp(H16$ + '\\:') + '{0,5}' + H16$) + '?\\:\\:' + H16$),
          IPV6ADDRESS9$ = subexp(subexp(subexp(H16$ + '\\:') + '{0,6}' + H16$) + '?\\:\\:'),
          IPV6ADDRESS$ = subexp(
            [
              IPV6ADDRESS1$,
              IPV6ADDRESS2$,
              IPV6ADDRESS3$,
              IPV6ADDRESS4$,
              IPV6ADDRESS5$,
              IPV6ADDRESS6$,
              IPV6ADDRESS7$,
              IPV6ADDRESS8$,
              IPV6ADDRESS9$
            ].join('|')
          ),
          ZONEID$ = subexp(subexp(UNRESERVED$$2 + '|' + PCT_ENCODED$2) + '+')
        subexp('[vV]' + HEXDIG$$2 + '+\\.' + merge(UNRESERVED$$2, SUB_DELIMS$$, '[\\:]') + '+')
        subexp(subexp(PCT_ENCODED$2 + '|' + merge(UNRESERVED$$2, SUB_DELIMS$$)) + '*')
        var PCHAR$ = subexp(PCT_ENCODED$2 + '|' + merge(UNRESERVED$$2, SUB_DELIMS$$, '[\\:\\@]'))
        subexp(subexp(PCT_ENCODED$2 + '|' + merge(UNRESERVED$$2, SUB_DELIMS$$, '[\\@]')) + '+')
        subexp(subexp(PCHAR$ + '|' + merge('[\\/\\?]', IPRIVATE$$)) + '*')
        return {
          NOT_SCHEME: new RegExp(merge('[^]', ALPHA$$, DIGIT$$, '[\\+\\-\\.]'), 'g'),
          NOT_USERINFO: new RegExp(merge('[^\\%\\:]', UNRESERVED$$2, SUB_DELIMS$$), 'g'),
          NOT_HOST: new RegExp(merge('[^\\%\\[\\]\\:]', UNRESERVED$$2, SUB_DELIMS$$), 'g'),
          NOT_PATH: new RegExp(merge('[^\\%\\/\\:\\@]', UNRESERVED$$2, SUB_DELIMS$$), 'g'),
          NOT_PATH_NOSCHEME: new RegExp(merge('[^\\%\\/\\@]', UNRESERVED$$2, SUB_DELIMS$$), 'g'),
          NOT_QUERY: new RegExp(merge('[^\\%]', UNRESERVED$$2, SUB_DELIMS$$, '[\\:\\@\\/\\?]', IPRIVATE$$), 'g'),
          NOT_FRAGMENT: new RegExp(merge('[^\\%]', UNRESERVED$$2, SUB_DELIMS$$, '[\\:\\@\\/\\?]'), 'g'),
          ESCAPE: new RegExp(merge('[^]', UNRESERVED$$2, SUB_DELIMS$$), 'g'),
          UNRESERVED: new RegExp(UNRESERVED$$2, 'g'),
          OTHER_CHARS: new RegExp(merge('[^\\%]', UNRESERVED$$2, RESERVED$$), 'g'),
          PCT_ENCODED: new RegExp(PCT_ENCODED$2, 'g'),
          IPV4ADDRESS: new RegExp('^(' + IPV4ADDRESS$ + ')$'),
          IPV6ADDRESS: new RegExp(
            '^\\[?(' +
              IPV6ADDRESS$ +
              ')' +
              subexp(subexp('\\%25|\\%(?!' + HEXDIG$$2 + '{2})') + '(' + ZONEID$ + ')') +
              '?\\]?$'
          )
          //RFC 6874, with relaxed parsing rules
        }
      }
      var URI_PROTOCOL = buildExps(false)
      var IRI_PROTOCOL = buildExps(true)
      var slicedToArray = /* @__PURE__ */ (function () {
        function sliceIterator(arr, i) {
          var _arr = []
          var _n = true
          var _d = false
          var _e = void 0
          try {
            for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
              _arr.push(_s.value)
              if (i && _arr.length === i) break
            }
          } catch (err) {
            _d = true
            _e = err
          } finally {
            try {
              if (!_n && _i['return']) _i['return']()
            } finally {
              if (_d) throw _e
            }
          }
          return _arr
        }
        return function (arr, i) {
          if (Array.isArray(arr)) {
            return arr
          } else if (Symbol.iterator in Object(arr)) {
            return sliceIterator(arr, i)
          } else {
            throw new TypeError('Invalid attempt to destructure non-iterable instance')
          }
        }
      })()
      var toConsumableArray = function (arr) {
        if (Array.isArray(arr)) {
          for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]
          return arr2
        } else {
          return Array.from(arr)
        }
      }
      var maxInt = 2147483647
      var base = 36
      var tMin = 1
      var tMax = 26
      var skew = 38
      var damp = 700
      var initialBias = 72
      var initialN = 128
      var delimiter = '-'
      var regexPunycode = /^xn--/
      var regexNonASCII = /[^\0-\x7E]/
      var regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g
      var errors2 = {
        'overflow': 'Overflow: input needs wider integers to process',
        'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
        'invalid-input': 'Invalid input'
      }
      var baseMinusTMin = base - tMin
      var floor = Math.floor
      var stringFromCharCode = String.fromCharCode
      function error$12(type2) {
        throw new RangeError(errors2[type2])
      }
      function map(array, fn) {
        var result = []
        var length = array.length
        while (length--) {
          result[length] = fn(array[length])
        }
        return result
      }
      function mapDomain(string, fn) {
        var parts = string.split('@')
        var result = ''
        if (parts.length > 1) {
          result = parts[0] + '@'
          string = parts[1]
        }
        string = string.replace(regexSeparators, '.')
        var labels = string.split('.')
        var encoded = map(labels, fn).join('.')
        return result + encoded
      }
      function ucs2decode(string) {
        var output = []
        var counter = 0
        var length = string.length
        while (counter < length) {
          var value = string.charCodeAt(counter++)
          if (value >= 55296 && value <= 56319 && counter < length) {
            var extra = string.charCodeAt(counter++)
            if ((extra & 64512) == 56320) {
              output.push(((value & 1023) << 10) + (extra & 1023) + 65536)
            } else {
              output.push(value)
              counter--
            }
          } else {
            output.push(value)
          }
        }
        return output
      }
      var ucs2encode = function ucs2encode2(array) {
        return String.fromCodePoint.apply(String, toConsumableArray(array))
      }
      var basicToDigit = function basicToDigit2(codePoint) {
        if (codePoint - 48 < 10) {
          return codePoint - 22
        }
        if (codePoint - 65 < 26) {
          return codePoint - 65
        }
        if (codePoint - 97 < 26) {
          return codePoint - 97
        }
        return base
      }
      var digitToBasic = function digitToBasic2(digit, flag) {
        return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5)
      }
      var adapt = function adapt2(delta, numPoints, firstTime) {
        var k = 0
        delta = firstTime ? floor(delta / damp) : delta >> 1
        delta += floor(delta / numPoints)
        for (
          ;
          /* no initialization */
          delta > (baseMinusTMin * tMax) >> 1;
          k += base
        ) {
          delta = floor(delta / baseMinusTMin)
        }
        return floor(k + ((baseMinusTMin + 1) * delta) / (delta + skew))
      }
      var decode = function decode2(input) {
        var output = []
        var inputLength = input.length
        var i = 0
        var n = initialN
        var bias = initialBias
        var basic = input.lastIndexOf(delimiter)
        if (basic < 0) {
          basic = 0
        }
        for (var j = 0; j < basic; ++j) {
          if (input.charCodeAt(j) >= 128) {
            error$12('not-basic')
          }
          output.push(input.charCodeAt(j))
        }
        for (var index = basic > 0 ? basic + 1 : 0; index < inputLength; ) {
          var oldi = i
          for (
            var w = 1, k = base;
            ;
            /* no condition */
            k += base
          ) {
            if (index >= inputLength) {
              error$12('invalid-input')
            }
            var digit = basicToDigit(input.charCodeAt(index++))
            if (digit >= base || digit > floor((maxInt - i) / w)) {
              error$12('overflow')
            }
            i += digit * w
            var t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias
            if (digit < t) {
              break
            }
            var baseMinusT = base - t
            if (w > floor(maxInt / baseMinusT)) {
              error$12('overflow')
            }
            w *= baseMinusT
          }
          var out = output.length + 1
          bias = adapt(i - oldi, out, oldi == 0)
          if (floor(i / out) > maxInt - n) {
            error$12('overflow')
          }
          n += floor(i / out)
          i %= out
          output.splice(i++, 0, n)
        }
        return String.fromCodePoint.apply(String, output)
      }
      var encode = function encode2(input) {
        var output = []
        input = ucs2decode(input)
        var inputLength = input.length
        var n = initialN
        var delta = 0
        var bias = initialBias
        var _iteratorNormalCompletion = true
        var _didIteratorError = false
        var _iteratorError = void 0
        try {
          for (
            var _iterator = input[Symbol.iterator](), _step;
            !(_iteratorNormalCompletion = (_step = _iterator.next()).done);
            _iteratorNormalCompletion = true
          ) {
            var _currentValue2 = _step.value
            if (_currentValue2 < 128) {
              output.push(stringFromCharCode(_currentValue2))
            }
          }
        } catch (err) {
          _didIteratorError = true
          _iteratorError = err
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return()
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError
            }
          }
        }
        var basicLength = output.length
        var handledCPCount = basicLength
        if (basicLength) {
          output.push(delimiter)
        }
        while (handledCPCount < inputLength) {
          var m = maxInt
          var _iteratorNormalCompletion2 = true
          var _didIteratorError2 = false
          var _iteratorError2 = void 0
          try {
            for (
              var _iterator2 = input[Symbol.iterator](), _step2;
              !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done);
              _iteratorNormalCompletion2 = true
            ) {
              var currentValue = _step2.value
              if (currentValue >= n && currentValue < m) {
                m = currentValue
              }
            }
          } catch (err) {
            _didIteratorError2 = true
            _iteratorError2 = err
          } finally {
            try {
              if (!_iteratorNormalCompletion2 && _iterator2.return) {
                _iterator2.return()
              }
            } finally {
              if (_didIteratorError2) {
                throw _iteratorError2
              }
            }
          }
          var handledCPCountPlusOne = handledCPCount + 1
          if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
            error$12('overflow')
          }
          delta += (m - n) * handledCPCountPlusOne
          n = m
          var _iteratorNormalCompletion3 = true
          var _didIteratorError3 = false
          var _iteratorError3 = void 0
          try {
            for (
              var _iterator3 = input[Symbol.iterator](), _step3;
              !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done);
              _iteratorNormalCompletion3 = true
            ) {
              var _currentValue = _step3.value
              if (_currentValue < n && ++delta > maxInt) {
                error$12('overflow')
              }
              if (_currentValue == n) {
                var q = delta
                for (
                  var k = base;
                  ;
                  /* no condition */
                  k += base
                ) {
                  var t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias
                  if (q < t) {
                    break
                  }
                  var qMinusT = q - t
                  var baseMinusT = base - t
                  output.push(stringFromCharCode(digitToBasic(t + (qMinusT % baseMinusT), 0)))
                  q = floor(qMinusT / baseMinusT)
                }
                output.push(stringFromCharCode(digitToBasic(q, 0)))
                bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength)
                delta = 0
                ++handledCPCount
              }
            }
          } catch (err) {
            _didIteratorError3 = true
            _iteratorError3 = err
          } finally {
            try {
              if (!_iteratorNormalCompletion3 && _iterator3.return) {
                _iterator3.return()
              }
            } finally {
              if (_didIteratorError3) {
                throw _iteratorError3
              }
            }
          }
          ++delta
          ++n
        }
        return output.join('')
      }
      var toUnicode = function toUnicode2(input) {
        return mapDomain(input, function (string) {
          return regexPunycode.test(string) ? decode(string.slice(4).toLowerCase()) : string
        })
      }
      var toASCII = function toASCII2(input) {
        return mapDomain(input, function (string) {
          return regexNonASCII.test(string) ? 'xn--' + encode(string) : string
        })
      }
      var punycode = {
        /**
         * A string representing the current Punycode.js version number.
         * @memberOf punycode
         * @type String
         */
        'version': '2.1.0',
        /**
         * An object of methods to convert from JavaScript's internal character
         * representation (UCS-2) to Unicode code points, and back.
         * @see <https://mathiasbynens.be/notes/javascript-encoding>
         * @memberOf punycode
         * @type Object
         */
        'ucs2': {
          'decode': ucs2decode,
          'encode': ucs2encode
        },
        'decode': decode,
        'encode': encode,
        'toASCII': toASCII,
        'toUnicode': toUnicode
      }
      var SCHEMES2 = {}
      function pctEncChar(chr) {
        var c = chr.charCodeAt(0)
        var e = void 0
        if (c < 16) e = '%0' + c.toString(16).toUpperCase()
        else if (c < 128) e = '%' + c.toString(16).toUpperCase()
        else if (c < 2048)
          e = '%' + ((c >> 6) | 192).toString(16).toUpperCase() + '%' + ((c & 63) | 128).toString(16).toUpperCase()
        else
          e =
            '%' +
            ((c >> 12) | 224).toString(16).toUpperCase() +
            '%' +
            (((c >> 6) & 63) | 128).toString(16).toUpperCase() +
            '%' +
            ((c & 63) | 128).toString(16).toUpperCase()
        return e
      }
      function pctDecChars(str) {
        var newStr = ''
        var i = 0
        var il = str.length
        while (i < il) {
          var c = parseInt(str.substr(i + 1, 2), 16)
          if (c < 128) {
            newStr += String.fromCharCode(c)
            i += 3
          } else if (c >= 194 && c < 224) {
            if (il - i >= 6) {
              var c2 = parseInt(str.substr(i + 4, 2), 16)
              newStr += String.fromCharCode(((c & 31) << 6) | (c2 & 63))
            } else {
              newStr += str.substr(i, 6)
            }
            i += 6
          } else if (c >= 224) {
            if (il - i >= 9) {
              var _c = parseInt(str.substr(i + 4, 2), 16)
              var c3 = parseInt(str.substr(i + 7, 2), 16)
              newStr += String.fromCharCode(((c & 15) << 12) | ((_c & 63) << 6) | (c3 & 63))
            } else {
              newStr += str.substr(i, 9)
            }
            i += 9
          } else {
            newStr += str.substr(i, 3)
            i += 3
          }
        }
        return newStr
      }
      function _normalizeComponentEncoding(components, protocol) {
        function decodeUnreserved2(str) {
          var decStr = pctDecChars(str)
          return !decStr.match(protocol.UNRESERVED) ? str : decStr
        }
        if (components.scheme)
          components.scheme = String(components.scheme)
            .replace(protocol.PCT_ENCODED, decodeUnreserved2)
            .toLowerCase()
            .replace(protocol.NOT_SCHEME, '')
        if (components.userinfo !== void 0)
          components.userinfo = String(components.userinfo)
            .replace(protocol.PCT_ENCODED, decodeUnreserved2)
            .replace(protocol.NOT_USERINFO, pctEncChar)
            .replace(protocol.PCT_ENCODED, toUpperCase)
        if (components.host !== void 0)
          components.host = String(components.host)
            .replace(protocol.PCT_ENCODED, decodeUnreserved2)
            .toLowerCase()
            .replace(protocol.NOT_HOST, pctEncChar)
            .replace(protocol.PCT_ENCODED, toUpperCase)
        if (components.path !== void 0)
          components.path = String(components.path)
            .replace(protocol.PCT_ENCODED, decodeUnreserved2)
            .replace(components.scheme ? protocol.NOT_PATH : protocol.NOT_PATH_NOSCHEME, pctEncChar)
            .replace(protocol.PCT_ENCODED, toUpperCase)
        if (components.query !== void 0)
          components.query = String(components.query)
            .replace(protocol.PCT_ENCODED, decodeUnreserved2)
            .replace(protocol.NOT_QUERY, pctEncChar)
            .replace(protocol.PCT_ENCODED, toUpperCase)
        if (components.fragment !== void 0)
          components.fragment = String(components.fragment)
            .replace(protocol.PCT_ENCODED, decodeUnreserved2)
            .replace(protocol.NOT_FRAGMENT, pctEncChar)
            .replace(protocol.PCT_ENCODED, toUpperCase)
        return components
      }
      function _stripLeadingZeros(str) {
        return str.replace(/^0*(.*)/, '$1') || '0'
      }
      function _normalizeIPv4(host, protocol) {
        var matches = host.match(protocol.IPV4ADDRESS) || []
        var _matches = slicedToArray(matches, 2),
          address = _matches[1]
        if (address) {
          return address.split('.').map(_stripLeadingZeros).join('.')
        } else {
          return host
        }
      }
      function _normalizeIPv6(host, protocol) {
        var matches = host.match(protocol.IPV6ADDRESS) || []
        var _matches2 = slicedToArray(matches, 3),
          address = _matches2[1],
          zone = _matches2[2]
        if (address) {
          var _address$toLowerCase$ = address.toLowerCase().split('::').reverse(),
            _address$toLowerCase$2 = slicedToArray(_address$toLowerCase$, 2),
            last = _address$toLowerCase$2[0],
            first = _address$toLowerCase$2[1]
          var firstFields = first ? first.split(':').map(_stripLeadingZeros) : []
          var lastFields = last.split(':').map(_stripLeadingZeros)
          var isLastFieldIPv4Address = protocol.IPV4ADDRESS.test(lastFields[lastFields.length - 1])
          var fieldCount = isLastFieldIPv4Address ? 7 : 8
          var lastFieldsStart = lastFields.length - fieldCount
          var fields = Array(fieldCount)
          for (var x = 0; x < fieldCount; ++x) {
            fields[x] = firstFields[x] || lastFields[lastFieldsStart + x] || ''
          }
          if (isLastFieldIPv4Address) {
            fields[fieldCount - 1] = _normalizeIPv4(fields[fieldCount - 1], protocol)
          }
          var allZeroFields = fields.reduce(function (acc, field, index) {
            if (!field || field === '0') {
              var lastLongest = acc[acc.length - 1]
              if (lastLongest && lastLongest.index + lastLongest.length === index) {
                lastLongest.length++
              } else {
                acc.push({ index, length: 1 })
              }
            }
            return acc
          }, [])
          var longestZeroFields = allZeroFields.sort(function (a, b) {
            return b.length - a.length
          })[0]
          var newHost = void 0
          if (longestZeroFields && longestZeroFields.length > 1) {
            var newFirst = fields.slice(0, longestZeroFields.index)
            var newLast = fields.slice(longestZeroFields.index + longestZeroFields.length)
            newHost = newFirst.join(':') + '::' + newLast.join(':')
          } else {
            newHost = fields.join(':')
          }
          if (zone) {
            newHost += '%' + zone
          }
          return newHost
        } else {
          return host
        }
      }
      var URI_PARSE2 =
        /^(?:([^:\/?#]+):)?(?:\/\/((?:([^\/?#@]*)@)?(\[[^\/?#\]]+\]|[^\/?#:]*)(?:\:(\d*))?))?([^?#]*)(?:\?([^#]*))?(?:#((?:.|\n|\r)*))?/i
      var NO_MATCH_IS_UNDEFINED = ''.match(/(){0}/)[1] === void 0
      function parse2(uriString) {
        var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}
        var components = {}
        var protocol = options.iri !== false ? IRI_PROTOCOL : URI_PROTOCOL
        if (options.reference === 'suffix') uriString = (options.scheme ? options.scheme + ':' : '') + '//' + uriString
        var matches = uriString.match(URI_PARSE2)
        if (matches) {
          if (NO_MATCH_IS_UNDEFINED) {
            components.scheme = matches[1]
            components.userinfo = matches[3]
            components.host = matches[4]
            components.port = parseInt(matches[5], 10)
            components.path = matches[6] || ''
            components.query = matches[7]
            components.fragment = matches[8]
            if (isNaN(components.port)) {
              components.port = matches[5]
            }
          } else {
            components.scheme = matches[1] || void 0
            components.userinfo = uriString.indexOf('@') !== -1 ? matches[3] : void 0
            components.host = uriString.indexOf('//') !== -1 ? matches[4] : void 0
            components.port = parseInt(matches[5], 10)
            components.path = matches[6] || ''
            components.query = uriString.indexOf('?') !== -1 ? matches[7] : void 0
            components.fragment = uriString.indexOf('#') !== -1 ? matches[8] : void 0
            if (isNaN(components.port)) {
              components.port = uriString.match(/\/\/(?:.|\n)*\:(?:\/|\?|\#|$)/) ? matches[4] : void 0
            }
          }
          if (components.host) {
            components.host = _normalizeIPv6(_normalizeIPv4(components.host, protocol), protocol)
          }
          if (
            components.scheme === void 0 &&
            components.userinfo === void 0 &&
            components.host === void 0 &&
            components.port === void 0 &&
            !components.path &&
            components.query === void 0
          ) {
            components.reference = 'same-document'
          } else if (components.scheme === void 0) {
            components.reference = 'relative'
          } else if (components.fragment === void 0) {
            components.reference = 'absolute'
          } else {
            components.reference = 'uri'
          }
          if (options.reference && options.reference !== 'suffix' && options.reference !== components.reference) {
            components.error = components.error || 'URI is not a ' + options.reference + ' reference.'
          }
          var schemeHandler = SCHEMES2[(options.scheme || components.scheme || '').toLowerCase()]
          if (!options.unicodeSupport && (!schemeHandler || !schemeHandler.unicodeSupport)) {
            if (components.host && (options.domainHost || (schemeHandler && schemeHandler.domainHost))) {
              try {
                components.host = punycode.toASCII(
                  components.host.replace(protocol.PCT_ENCODED, pctDecChars).toLowerCase()
                )
              } catch (e) {
                components.error =
                  components.error || "Host's domain name can not be converted to ASCII via punycode: " + e
              }
            }
            _normalizeComponentEncoding(components, URI_PROTOCOL)
          } else {
            _normalizeComponentEncoding(components, protocol)
          }
          if (schemeHandler && schemeHandler.parse) {
            schemeHandler.parse(components, options)
          }
        } else {
          components.error = components.error || 'URI can not be parsed.'
        }
        return components
      }
      function _recomposeAuthority(components, options) {
        var protocol = options.iri !== false ? IRI_PROTOCOL : URI_PROTOCOL
        var uriTokens = []
        if (components.userinfo !== void 0) {
          uriTokens.push(components.userinfo)
          uriTokens.push('@')
        }
        if (components.host !== void 0) {
          uriTokens.push(
            _normalizeIPv6(_normalizeIPv4(String(components.host), protocol), protocol).replace(
              protocol.IPV6ADDRESS,
              function (_, $1, $2) {
                return '[' + $1 + ($2 ? '%25' + $2 : '') + ']'
              }
            )
          )
        }
        if (typeof components.port === 'number' || typeof components.port === 'string') {
          uriTokens.push(':')
          uriTokens.push(String(components.port))
        }
        return uriTokens.length ? uriTokens.join('') : void 0
      }
      var RDS12 = /^\.\.?\//
      var RDS22 = /^\/\.(\/|$)/
      var RDS32 = /^\/\.\.(\/|$)/
      var RDS52 = /^\/?(?:.|\n)*?(?=\/|$)/
      function removeDotSegments2(input) {
        var output = []
        while (input.length) {
          if (input.match(RDS12)) {
            input = input.replace(RDS12, '')
          } else if (input.match(RDS22)) {
            input = input.replace(RDS22, '/')
          } else if (input.match(RDS32)) {
            input = input.replace(RDS32, '/')
            output.pop()
          } else if (input === '.' || input === '..') {
            input = ''
          } else {
            var im = input.match(RDS52)
            if (im) {
              var s = im[0]
              input = input.slice(s.length)
              output.push(s)
            } else {
              throw new Error('Unexpected dot segment condition')
            }
          }
        }
        return output.join('')
      }
      function serialize2(components) {
        var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}
        var protocol = options.iri ? IRI_PROTOCOL : URI_PROTOCOL
        var uriTokens = []
        var schemeHandler = SCHEMES2[(options.scheme || components.scheme || '').toLowerCase()]
        if (schemeHandler && schemeHandler.serialize) schemeHandler.serialize(components, options)
        if (components.host) {
          if (protocol.IPV6ADDRESS.test(components.host));
          else if (options.domainHost || (schemeHandler && schemeHandler.domainHost)) {
            try {
              components.host = !options.iri
                ? punycode.toASCII(components.host.replace(protocol.PCT_ENCODED, pctDecChars).toLowerCase())
                : punycode.toUnicode(components.host)
            } catch (e) {
              components.error =
                components.error ||
                "Host's domain name can not be converted to " +
                  (!options.iri ? 'ASCII' : 'Unicode') +
                  ' via punycode: ' +
                  e
            }
          }
        }
        _normalizeComponentEncoding(components, protocol)
        if (options.reference !== 'suffix' && components.scheme) {
          uriTokens.push(components.scheme)
          uriTokens.push(':')
        }
        var authority = _recomposeAuthority(components, options)
        if (authority !== void 0) {
          if (options.reference !== 'suffix') {
            uriTokens.push('//')
          }
          uriTokens.push(authority)
          if (components.path && components.path.charAt(0) !== '/') {
            uriTokens.push('/')
          }
        }
        if (components.path !== void 0) {
          var s = components.path
          if (!options.absolutePath && (!schemeHandler || !schemeHandler.absolutePath)) {
            s = removeDotSegments2(s)
          }
          if (authority === void 0) {
            s = s.replace(/^\/\//, '/%2F')
          }
          uriTokens.push(s)
        }
        if (components.query !== void 0) {
          uriTokens.push('?')
          uriTokens.push(components.query)
        }
        if (components.fragment !== void 0) {
          uriTokens.push('#')
          uriTokens.push(components.fragment)
        }
        return uriTokens.join('')
      }
      function resolveComponents2(base2, relative) {
        var options = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}
        var skipNormalization = arguments[3]
        var target = {}
        if (!skipNormalization) {
          base2 = parse2(serialize2(base2, options), options)
          relative = parse2(serialize2(relative, options), options)
        }
        options = options || {}
        if (!options.tolerant && relative.scheme) {
          target.scheme = relative.scheme
          target.userinfo = relative.userinfo
          target.host = relative.host
          target.port = relative.port
          target.path = removeDotSegments2(relative.path || '')
          target.query = relative.query
        } else {
          if (relative.userinfo !== void 0 || relative.host !== void 0 || relative.port !== void 0) {
            target.userinfo = relative.userinfo
            target.host = relative.host
            target.port = relative.port
            target.path = removeDotSegments2(relative.path || '')
            target.query = relative.query
          } else {
            if (!relative.path) {
              target.path = base2.path
              if (relative.query !== void 0) {
                target.query = relative.query
              } else {
                target.query = base2.query
              }
            } else {
              if (relative.path.charAt(0) === '/') {
                target.path = removeDotSegments2(relative.path)
              } else {
                if ((base2.userinfo !== void 0 || base2.host !== void 0 || base2.port !== void 0) && !base2.path) {
                  target.path = '/' + relative.path
                } else if (!base2.path) {
                  target.path = relative.path
                } else {
                  target.path = base2.path.slice(0, base2.path.lastIndexOf('/') + 1) + relative.path
                }
                target.path = removeDotSegments2(target.path)
              }
              target.query = relative.query
            }
            target.userinfo = base2.userinfo
            target.host = base2.host
            target.port = base2.port
          }
          target.scheme = base2.scheme
        }
        target.fragment = relative.fragment
        return target
      }
      function resolve2(baseURI, relativeURI, options) {
        var schemelessOptions = assign({ scheme: 'null' }, options)
        return serialize2(
          resolveComponents2(
            parse2(baseURI, schemelessOptions),
            parse2(relativeURI, schemelessOptions),
            schemelessOptions,
            true
          ),
          schemelessOptions
        )
      }
      function normalize2(uri2, options) {
        if (typeof uri2 === 'string') {
          uri2 = serialize2(parse2(uri2, options), options)
        } else if (typeOf(uri2) === 'object') {
          uri2 = parse2(serialize2(uri2, options), options)
        }
        return uri2
      }
      function equal2(uriA, uriB, options) {
        if (typeof uriA === 'string') {
          uriA = serialize2(parse2(uriA, options), options)
        } else if (typeOf(uriA) === 'object') {
          uriA = serialize2(uriA, options)
        }
        if (typeof uriB === 'string') {
          uriB = serialize2(parse2(uriB, options), options)
        } else if (typeOf(uriB) === 'object') {
          uriB = serialize2(uriB, options)
        }
        return uriA === uriB
      }
      function escapeComponent(str, options) {
        return (
          str &&
          str.toString().replace(!options || !options.iri ? URI_PROTOCOL.ESCAPE : IRI_PROTOCOL.ESCAPE, pctEncChar)
        )
      }
      function unescapeComponent(str, options) {
        return (
          str &&
          str
            .toString()
            .replace(!options || !options.iri ? URI_PROTOCOL.PCT_ENCODED : IRI_PROTOCOL.PCT_ENCODED, pctDecChars)
        )
      }
      var handler = {
        scheme: 'http',
        domainHost: true,
        parse: function parse3(components, options) {
          if (!components.host) {
            components.error = components.error || 'HTTP URIs must have a host.'
          }
          return components
        },
        serialize: function serialize3(components, options) {
          var secure = String(components.scheme).toLowerCase() === 'https'
          if (components.port === (secure ? 443 : 80) || components.port === '') {
            components.port = void 0
          }
          if (!components.path) {
            components.path = '/'
          }
          return components
        }
      }
      var handler$1 = {
        scheme: 'https',
        domainHost: handler.domainHost,
        parse: handler.parse,
        serialize: handler.serialize
      }
      function isSecure2(wsComponents) {
        return typeof wsComponents.secure === 'boolean'
          ? wsComponents.secure
          : String(wsComponents.scheme).toLowerCase() === 'wss'
      }
      var handler$2 = {
        scheme: 'ws',
        domainHost: true,
        parse: function parse3(components, options) {
          var wsComponents = components
          wsComponents.secure = isSecure2(wsComponents)
          wsComponents.resourceName = (wsComponents.path || '/') + (wsComponents.query ? '?' + wsComponents.query : '')
          wsComponents.path = void 0
          wsComponents.query = void 0
          return wsComponents
        },
        serialize: function serialize3(wsComponents, options) {
          if (wsComponents.port === (isSecure2(wsComponents) ? 443 : 80) || wsComponents.port === '') {
            wsComponents.port = void 0
          }
          if (typeof wsComponents.secure === 'boolean') {
            wsComponents.scheme = wsComponents.secure ? 'wss' : 'ws'
            wsComponents.secure = void 0
          }
          if (wsComponents.resourceName) {
            var _wsComponents$resourc = wsComponents.resourceName.split('?'),
              _wsComponents$resourc2 = slicedToArray(_wsComponents$resourc, 2),
              path = _wsComponents$resourc2[0],
              query = _wsComponents$resourc2[1]
            wsComponents.path = path && path !== '/' ? path : void 0
            wsComponents.query = query
            wsComponents.resourceName = void 0
          }
          wsComponents.fragment = void 0
          return wsComponents
        }
      }
      var handler$3 = {
        scheme: 'wss',
        domainHost: handler$2.domainHost,
        parse: handler$2.parse,
        serialize: handler$2.serialize
      }
      var O = {}
      var UNRESERVED$$ =
        '[A-Za-z0-9\\-\\.\\_\\~\\xA0-\\u200D\\u2010-\\u2029\\u202F-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF]'
      var HEXDIG$$ = '[0-9A-Fa-f]'
      var PCT_ENCODED$ = subexp(
        subexp('%[EFef]' + HEXDIG$$ + '%' + HEXDIG$$ + HEXDIG$$ + '%' + HEXDIG$$ + HEXDIG$$) +
          '|' +
          subexp('%[89A-Fa-f]' + HEXDIG$$ + '%' + HEXDIG$$ + HEXDIG$$) +
          '|' +
          subexp('%' + HEXDIG$$ + HEXDIG$$)
      )
      var ATEXT$$ = "[A-Za-z0-9\\!\\$\\%\\'\\*\\+\\-\\^\\_\\`\\{\\|\\}\\~]"
      var QTEXT$$ = "[\\!\\$\\%\\'\\(\\)\\*\\+\\,\\-\\.0-9\\<\\>A-Z\\x5E-\\x7E]"
      var VCHAR$$ = merge(QTEXT$$, '[\\"\\\\]')
      var SOME_DELIMS$$ = "[\\!\\$\\'\\(\\)\\*\\+\\,\\;\\:\\@]"
      var UNRESERVED = new RegExp(UNRESERVED$$, 'g')
      var PCT_ENCODED = new RegExp(PCT_ENCODED$, 'g')
      var NOT_LOCAL_PART = new RegExp(merge('[^]', ATEXT$$, '[\\.]', '[\\"]', VCHAR$$), 'g')
      var NOT_HFNAME = new RegExp(merge('[^]', UNRESERVED$$, SOME_DELIMS$$), 'g')
      var NOT_HFVALUE = NOT_HFNAME
      function decodeUnreserved(str) {
        var decStr = pctDecChars(str)
        return !decStr.match(UNRESERVED) ? str : decStr
      }
      var handler$4 = {
        scheme: 'mailto',
        parse: function parse$$1(components, options) {
          var mailtoComponents = components
          var to = (mailtoComponents.to = mailtoComponents.path ? mailtoComponents.path.split(',') : [])
          mailtoComponents.path = void 0
          if (mailtoComponents.query) {
            var unknownHeaders = false
            var headers = {}
            var hfields = mailtoComponents.query.split('&')
            for (var x = 0, xl = hfields.length; x < xl; ++x) {
              var hfield = hfields[x].split('=')
              switch (hfield[0]) {
                case 'to':
                  var toAddrs = hfield[1].split(',')
                  for (var _x = 0, _xl = toAddrs.length; _x < _xl; ++_x) {
                    to.push(toAddrs[_x])
                  }
                  break
                case 'subject':
                  mailtoComponents.subject = unescapeComponent(hfield[1], options)
                  break
                case 'body':
                  mailtoComponents.body = unescapeComponent(hfield[1], options)
                  break
                default:
                  unknownHeaders = true
                  headers[unescapeComponent(hfield[0], options)] = unescapeComponent(hfield[1], options)
                  break
              }
            }
            if (unknownHeaders) mailtoComponents.headers = headers
          }
          mailtoComponents.query = void 0
          for (var _x2 = 0, _xl2 = to.length; _x2 < _xl2; ++_x2) {
            var addr = to[_x2].split('@')
            addr[0] = unescapeComponent(addr[0])
            if (!options.unicodeSupport) {
              try {
                addr[1] = punycode.toASCII(unescapeComponent(addr[1], options).toLowerCase())
              } catch (e) {
                mailtoComponents.error =
                  mailtoComponents.error ||
                  "Email address's domain name can not be converted to ASCII via punycode: " + e
              }
            } else {
              addr[1] = unescapeComponent(addr[1], options).toLowerCase()
            }
            to[_x2] = addr.join('@')
          }
          return mailtoComponents
        },
        serialize: function serialize$$1(mailtoComponents, options) {
          var components = mailtoComponents
          var to = toArray(mailtoComponents.to)
          if (to) {
            for (var x = 0, xl = to.length; x < xl; ++x) {
              var toAddr = String(to[x])
              var atIdx = toAddr.lastIndexOf('@')
              var localPart = toAddr
                .slice(0, atIdx)
                .replace(PCT_ENCODED, decodeUnreserved)
                .replace(PCT_ENCODED, toUpperCase)
                .replace(NOT_LOCAL_PART, pctEncChar)
              var domain = toAddr.slice(atIdx + 1)
              try {
                domain = !options.iri
                  ? punycode.toASCII(unescapeComponent(domain, options).toLowerCase())
                  : punycode.toUnicode(domain)
              } catch (e) {
                components.error =
                  components.error ||
                  "Email address's domain name can not be converted to " +
                    (!options.iri ? 'ASCII' : 'Unicode') +
                    ' via punycode: ' +
                    e
              }
              to[x] = localPart + '@' + domain
            }
            components.path = to.join(',')
          }
          var headers = (mailtoComponents.headers = mailtoComponents.headers || {})
          if (mailtoComponents.subject) headers['subject'] = mailtoComponents.subject
          if (mailtoComponents.body) headers['body'] = mailtoComponents.body
          var fields = []
          for (var name in headers) {
            if (headers[name] !== O[name]) {
              fields.push(
                name
                  .replace(PCT_ENCODED, decodeUnreserved)
                  .replace(PCT_ENCODED, toUpperCase)
                  .replace(NOT_HFNAME, pctEncChar) +
                  '=' +
                  headers[name]
                    .replace(PCT_ENCODED, decodeUnreserved)
                    .replace(PCT_ENCODED, toUpperCase)
                    .replace(NOT_HFVALUE, pctEncChar)
              )
            }
          }
          if (fields.length) {
            components.query = fields.join('&')
          }
          return components
        }
      }
      var URN_PARSE = /^([^\:]+)\:(.*)/
      var handler$5 = {
        scheme: 'urn',
        parse: function parse$$1(components, options) {
          var matches = components.path && components.path.match(URN_PARSE)
          var urnComponents = components
          if (matches) {
            var scheme = options.scheme || urnComponents.scheme || 'urn'
            var nid = matches[1].toLowerCase()
            var nss = matches[2]
            var urnScheme = scheme + ':' + (options.nid || nid)
            var schemeHandler = SCHEMES2[urnScheme]
            urnComponents.nid = nid
            urnComponents.nss = nss
            urnComponents.path = void 0
            if (schemeHandler) {
              urnComponents = schemeHandler.parse(urnComponents, options)
            }
          } else {
            urnComponents.error = urnComponents.error || 'URN can not be parsed.'
          }
          return urnComponents
        },
        serialize: function serialize$$1(urnComponents, options) {
          var scheme = options.scheme || urnComponents.scheme || 'urn'
          var nid = urnComponents.nid
          var urnScheme = scheme + ':' + (options.nid || nid)
          var schemeHandler = SCHEMES2[urnScheme]
          if (schemeHandler) {
            urnComponents = schemeHandler.serialize(urnComponents, options)
          }
          var uriComponents = urnComponents
          var nss = urnComponents.nss
          uriComponents.path = (nid || options.nid) + ':' + nss
          return uriComponents
        }
      }
      var UUID2 = /^[0-9A-Fa-f]{8}(?:\-[0-9A-Fa-f]{4}){3}\-[0-9A-Fa-f]{12}$/
      var handler$6 = {
        scheme: 'urn:uuid',
        parse: function parse3(urnComponents, options) {
          var uuidComponents = urnComponents
          uuidComponents.uuid = uuidComponents.nss
          uuidComponents.nss = void 0
          if (!options.tolerant && (!uuidComponents.uuid || !uuidComponents.uuid.match(UUID2))) {
            uuidComponents.error = uuidComponents.error || 'UUID is not valid.'
          }
          return uuidComponents
        },
        serialize: function serialize3(uuidComponents, options) {
          var urnComponents = uuidComponents
          urnComponents.nss = (uuidComponents.uuid || '').toLowerCase()
          return urnComponents
        }
      }
      SCHEMES2[handler.scheme] = handler
      SCHEMES2[handler$1.scheme] = handler$1
      SCHEMES2[handler$2.scheme] = handler$2
      SCHEMES2[handler$3.scheme] = handler$3
      SCHEMES2[handler$4.scheme] = handler$4
      SCHEMES2[handler$5.scheme] = handler$5
      SCHEMES2[handler$6.scheme] = handler$6
      exports4.SCHEMES = SCHEMES2
      exports4.pctEncChar = pctEncChar
      exports4.pctDecChars = pctDecChars
      exports4.parse = parse2
      exports4.removeDotSegments = removeDotSegments2
      exports4.serialize = serialize2
      exports4.resolveComponents = resolveComponents2
      exports4.resolve = resolve2
      exports4.normalize = normalize2
      exports4.equal = equal2
      exports4.escapeComponent = escapeComponent
      exports4.unescapeComponent = unescapeComponent
      Object.defineProperty(exports4, '__esModule', { value: true })
    })
  })(uri_all, uri_all.exports)
  var uri_allExports = uri_all.exports
  var ucs2length$1 = function ucs2length2(str) {
    var length = 0,
      len = str.length,
      pos = 0,
      value
    while (pos < len) {
      length++
      value = str.charCodeAt(pos++)
      if (value >= 55296 && value <= 56319 && pos < len) {
        value = str.charCodeAt(pos)
        if ((value & 64512) == 56320) pos++
      }
    }
    return length
  }
  var util$5 = {
    copy,
    checkDataType,
    checkDataTypes,
    coerceToTypes,
    toHash: toHash$1,
    getProperty,
    escapeQuotes,
    equal: fastDeepEqual,
    ucs2length: ucs2length$1,
    varOccurences,
    varReplace,
    schemaHasRules,
    schemaHasRulesExcept,
    schemaUnknownRules,
    toQuotedString,
    getPathExpr,
    getPath,
    getData,
    unescapeFragment,
    unescapeJsonPointer,
    escapeFragment,
    escapeJsonPointer
  }
  function copy(o, to) {
    to = to || {}
    for (var key in o) to[key] = o[key]
    return to
  }
  function checkDataType(dataType2, data2, strictNumbers, negate) {
    var EQUAL = negate ? ' !== ' : ' === ',
      AND = negate ? ' || ' : ' && ',
      OK2 = negate ? '!' : '',
      NOT = negate ? '' : '!'
    switch (dataType2) {
      case 'null':
        return data2 + EQUAL + 'null'
      case 'array':
        return OK2 + 'Array.isArray(' + data2 + ')'
      case 'object':
        return (
          '(' + OK2 + data2 + AND + 'typeof ' + data2 + EQUAL + '"object"' + AND + NOT + 'Array.isArray(' + data2 + '))'
        )
      case 'integer':
        return (
          '(typeof ' +
          data2 +
          EQUAL +
          '"number"' +
          AND +
          NOT +
          '(' +
          data2 +
          ' % 1)' +
          AND +
          data2 +
          EQUAL +
          data2 +
          (strictNumbers ? AND + OK2 + 'isFinite(' + data2 + ')' : '') +
          ')'
        )
      case 'number':
        return (
          '(typeof ' +
          data2 +
          EQUAL +
          '"' +
          dataType2 +
          '"' +
          (strictNumbers ? AND + OK2 + 'isFinite(' + data2 + ')' : '') +
          ')'
        )
      default:
        return 'typeof ' + data2 + EQUAL + '"' + dataType2 + '"'
    }
  }
  function checkDataTypes(dataTypes, data2, strictNumbers) {
    switch (dataTypes.length) {
      case 1:
        return checkDataType(dataTypes[0], data2, strictNumbers, true)
      default:
        var code2 = ''
        var types2 = toHash$1(dataTypes)
        if (types2.array && types2.object) {
          code2 = types2.null ? '(' : '(!' + data2 + ' || '
          code2 += 'typeof ' + data2 + ' !== "object")'
          delete types2.null
          delete types2.array
          delete types2.object
        }
        if (types2.number) delete types2.integer
        for (var t in types2) code2 += (code2 ? ' && ' : '') + checkDataType(t, data2, strictNumbers, true)
        return code2
    }
  }
  var COERCE_TO_TYPES = toHash$1(['string', 'number', 'integer', 'boolean', 'null'])
  function coerceToTypes(optionCoerceTypes, dataTypes) {
    if (Array.isArray(dataTypes)) {
      var types2 = []
      for (var i = 0; i < dataTypes.length; i++) {
        var t = dataTypes[i]
        if (COERCE_TO_TYPES[t]) types2[types2.length] = t
        else if (optionCoerceTypes === 'array' && t === 'array') types2[types2.length] = t
      }
      if (types2.length) return types2
    } else if (COERCE_TO_TYPES[dataTypes]) {
      return [dataTypes]
    } else if (optionCoerceTypes === 'array' && dataTypes === 'array') {
      return ['array']
    }
  }
  function toHash$1(arr) {
    var hash = {}
    for (var i = 0; i < arr.length; i++) hash[arr[i]] = true
    return hash
  }
  var IDENTIFIER$1 = /^[a-z$_][a-z$_0-9]*$/i
  var SINGLE_QUOTE = /'|\\/g
  function getProperty(key) {
    return typeof key == 'number'
      ? '[' + key + ']'
      : IDENTIFIER$1.test(key)
        ? '.' + key
        : "['" + escapeQuotes(key) + "']"
  }
  function escapeQuotes(str) {
    return str
      .replace(SINGLE_QUOTE, '\\$&')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\f/g, '\\f')
      .replace(/\t/g, '\\t')
  }
  function varOccurences(str, dataVar) {
    dataVar += '[^0-9]'
    var matches = str.match(new RegExp(dataVar, 'g'))
    return matches ? matches.length : 0
  }
  function varReplace(str, dataVar, expr) {
    dataVar += '([^0-9])'
    expr = expr.replace(/\$/g, '$$$$')
    return str.replace(new RegExp(dataVar, 'g'), expr + '$1')
  }
  function schemaHasRules(schema, rules2) {
    if (typeof schema == 'boolean') return !schema
    for (var key in schema) if (rules2[key]) return true
  }
  function schemaHasRulesExcept(schema, rules2, exceptKeyword) {
    if (typeof schema == 'boolean') return !schema && exceptKeyword != 'not'
    for (var key in schema) if (key != exceptKeyword && rules2[key]) return true
  }
  function schemaUnknownRules(schema, rules2) {
    if (typeof schema == 'boolean') return
    for (var key in schema) if (!rules2[key]) return key
  }
  function toQuotedString(str) {
    return "'" + escapeQuotes(str) + "'"
  }
  function getPathExpr(currentPath, expr, jsonPointers, isNumber) {
    var path = jsonPointers
      ? "'/' + " + expr + (isNumber ? '' : ".replace(/~/g, '~0').replace(/\\//g, '~1')")
      : isNumber
        ? "'[' + " + expr + " + ']'"
        : "'[\\'' + " + expr + " + '\\']'"
    return joinPaths(currentPath, path)
  }
  function getPath(currentPath, prop, jsonPointers) {
    var path = jsonPointers ? toQuotedString('/' + escapeJsonPointer(prop)) : toQuotedString(getProperty(prop))
    return joinPaths(currentPath, path)
  }
  var JSON_POINTER$1 = /^\/(?:[^~]|~0|~1)*$/
  var RELATIVE_JSON_POINTER$1 = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/
  function getData($data, lvl, paths) {
    var up, jsonPointer, data2, matches
    if ($data === '') return 'rootData'
    if ($data[0] == '/') {
      if (!JSON_POINTER$1.test($data)) throw new Error('Invalid JSON-pointer: ' + $data)
      jsonPointer = $data
      data2 = 'rootData'
    } else {
      matches = $data.match(RELATIVE_JSON_POINTER$1)
      if (!matches) throw new Error('Invalid JSON-pointer: ' + $data)
      up = +matches[1]
      jsonPointer = matches[2]
      if (jsonPointer == '#') {
        if (up >= lvl) throw new Error('Cannot access property/index ' + up + ' levels up, current level is ' + lvl)
        return paths[lvl - up]
      }
      if (up > lvl) throw new Error('Cannot access data ' + up + ' levels up, current level is ' + lvl)
      data2 = 'data' + (lvl - up || '')
      if (!jsonPointer) return data2
    }
    var expr = data2
    var segments = jsonPointer.split('/')
    for (var i = 0; i < segments.length; i++) {
      var segment = segments[i]
      if (segment) {
        data2 += getProperty(unescapeJsonPointer(segment))
        expr += ' && ' + data2
      }
    }
    return expr
  }
  function joinPaths(a, b) {
    if (a == '""') return b
    return (a + ' + ' + b).replace(/([^\\])' \+ '/g, '$1')
  }
  function unescapeFragment(str) {
    return unescapeJsonPointer(decodeURIComponent(str))
  }
  function escapeFragment(str) {
    return encodeURIComponent(escapeJsonPointer(str))
  }
  function escapeJsonPointer(str) {
    return str.replace(/~/g, '~0').replace(/\//g, '~1')
  }
  function unescapeJsonPointer(str) {
    return str.replace(/~1/g, '/').replace(/~0/g, '~')
  }
  var util$4 = util$5
  var schema_obj = SchemaObject$2
  function SchemaObject$2(obj) {
    util$4.copy(obj, this)
  }
  var jsonSchemaTraverse = { exports: {} }
  var traverse$1 = (jsonSchemaTraverse.exports = function (schema, opts, cb) {
    if (typeof opts == 'function') {
      cb = opts
      opts = {}
    }
    cb = opts.cb || cb
    var pre = typeof cb == 'function' ? cb : cb.pre || function () {}
    var post = cb.post || function () {}
    _traverse(opts, pre, post, schema, '', schema)
  })
  traverse$1.keywords = {
    additionalItems: true,
    items: true,
    contains: true,
    additionalProperties: true,
    propertyNames: true,
    not: true
  }
  traverse$1.arrayKeywords = {
    items: true,
    allOf: true,
    anyOf: true,
    oneOf: true
  }
  traverse$1.propsKeywords = {
    definitions: true,
    properties: true,
    patternProperties: true,
    dependencies: true
  }
  traverse$1.skipKeywords = {
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
  }
  function _traverse(
    opts,
    pre,
    post,
    schema,
    jsonPtr,
    rootSchema,
    parentJsonPtr,
    parentKeyword,
    parentSchema,
    keyIndex
  ) {
    if (schema && typeof schema == 'object' && !Array.isArray(schema)) {
      pre(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex)
      for (var key in schema) {
        var sch = schema[key]
        if (Array.isArray(sch)) {
          if (key in traverse$1.arrayKeywords) {
            for (var i = 0; i < sch.length; i++)
              _traverse(opts, pre, post, sch[i], jsonPtr + '/' + key + '/' + i, rootSchema, jsonPtr, key, schema, i)
          }
        } else if (key in traverse$1.propsKeywords) {
          if (sch && typeof sch == 'object') {
            for (var prop in sch)
              _traverse(
                opts,
                pre,
                post,
                sch[prop],
                jsonPtr + '/' + key + '/' + escapeJsonPtr(prop),
                rootSchema,
                jsonPtr,
                key,
                schema,
                prop
              )
          }
        } else if (key in traverse$1.keywords || (opts.allKeys && !(key in traverse$1.skipKeywords))) {
          _traverse(opts, pre, post, sch, jsonPtr + '/' + key, rootSchema, jsonPtr, key, schema)
        }
      }
      post(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex)
    }
  }
  function escapeJsonPtr(str) {
    return str.replace(/~/g, '~0').replace(/\//g, '~1')
  }
  var jsonSchemaTraverseExports = jsonSchemaTraverse.exports
  var URI$1 = uri_allExports,
    equal$1 = fastDeepEqual,
    util$3 = util$5,
    SchemaObject$1 = schema_obj,
    traverse = jsonSchemaTraverseExports
  var resolve_1 = resolve$3
  resolve$3.normalizeId = normalizeId
  resolve$3.fullPath = getFullPath
  resolve$3.url = resolveUrl
  resolve$3.ids = resolveIds
  resolve$3.inlineRef = inlineRef
  resolve$3.schema = resolveSchema
  function resolve$3(compile2, root, ref2) {
    var refVal = this._refs[ref2]
    if (typeof refVal == 'string') {
      if (this._refs[refVal]) refVal = this._refs[refVal]
      else return resolve$3.call(this, compile2, root, refVal)
    }
    refVal = refVal || this._schemas[ref2]
    if (refVal instanceof SchemaObject$1) {
      return inlineRef(refVal.schema, this._opts.inlineRefs) ? refVal.schema : refVal.validate || this._compile(refVal)
    }
    var res = resolveSchema.call(this, root, ref2)
    var schema, v, baseId
    if (res) {
      schema = res.schema
      root = res.root
      baseId = res.baseId
    }
    if (schema instanceof SchemaObject$1) {
      v = schema.validate || compile2.call(this, schema.schema, root, void 0, baseId)
    } else if (schema !== void 0) {
      v = inlineRef(schema, this._opts.inlineRefs) ? schema : compile2.call(this, schema, root, void 0, baseId)
    }
    return v
  }
  function resolveSchema(root, ref2) {
    var p = URI$1.parse(ref2),
      refPath = _getFullPath(p),
      baseId = getFullPath(this._getId(root.schema))
    if (Object.keys(root.schema).length === 0 || refPath !== baseId) {
      var id2 = normalizeId(refPath)
      var refVal = this._refs[id2]
      if (typeof refVal == 'string') {
        return resolveRecursive.call(this, root, refVal, p)
      } else if (refVal instanceof SchemaObject$1) {
        if (!refVal.validate) this._compile(refVal)
        root = refVal
      } else {
        refVal = this._schemas[id2]
        if (refVal instanceof SchemaObject$1) {
          if (!refVal.validate) this._compile(refVal)
          if (id2 == normalizeId(ref2)) return { schema: refVal, root, baseId }
          root = refVal
        } else {
          return
        }
      }
      if (!root.schema) return
      baseId = getFullPath(this._getId(root.schema))
    }
    return getJsonPointer.call(this, p, baseId, root.schema, root)
  }
  function resolveRecursive(root, ref2, parsedRef) {
    var res = resolveSchema.call(this, root, ref2)
    if (res) {
      var schema = res.schema
      var baseId = res.baseId
      root = res.root
      var id2 = this._getId(schema)
      if (id2) baseId = resolveUrl(baseId, id2)
      return getJsonPointer.call(this, parsedRef, baseId, schema, root)
    }
  }
  var PREVENT_SCOPE_CHANGE = util$3.toHash(['properties', 'patternProperties', 'enum', 'dependencies', 'definitions'])
  function getJsonPointer(parsedRef, baseId, schema, root) {
    parsedRef.fragment = parsedRef.fragment || ''
    if (parsedRef.fragment.slice(0, 1) != '/') return
    var parts = parsedRef.fragment.split('/')
    for (var i = 1; i < parts.length; i++) {
      var part = parts[i]
      if (part) {
        part = util$3.unescapeFragment(part)
        schema = schema[part]
        if (schema === void 0) break
        var id2
        if (!PREVENT_SCOPE_CHANGE[part]) {
          id2 = this._getId(schema)
          if (id2) baseId = resolveUrl(baseId, id2)
          if (schema.$ref) {
            var $ref = resolveUrl(baseId, schema.$ref)
            var res = resolveSchema.call(this, root, $ref)
            if (res) {
              schema = res.schema
              root = res.root
              baseId = res.baseId
            }
          }
        }
      }
    }
    if (schema !== void 0 && schema !== root.schema) return { schema, root, baseId }
  }
  var SIMPLE_INLINED = util$3.toHash([
    'type',
    'format',
    'pattern',
    'maxLength',
    'minLength',
    'maxProperties',
    'minProperties',
    'maxItems',
    'minItems',
    'maximum',
    'minimum',
    'uniqueItems',
    'multipleOf',
    'required',
    'enum'
  ])
  function inlineRef(schema, limit) {
    if (limit === false) return false
    if (limit === void 0 || limit === true) return checkNoRef(schema)
    else if (limit) return countKeys(schema) <= limit
  }
  function checkNoRef(schema) {
    var item
    if (Array.isArray(schema)) {
      for (var i = 0; i < schema.length; i++) {
        item = schema[i]
        if (typeof item == 'object' && !checkNoRef(item)) return false
      }
    } else {
      for (var key in schema) {
        if (key == '$ref') return false
        item = schema[key]
        if (typeof item == 'object' && !checkNoRef(item)) return false
      }
    }
    return true
  }
  function countKeys(schema) {
    var count = 0,
      item
    if (Array.isArray(schema)) {
      for (var i = 0; i < schema.length; i++) {
        item = schema[i]
        if (typeof item == 'object') count += countKeys(item)
        if (count == Infinity) return Infinity
      }
    } else {
      for (var key in schema) {
        if (key == '$ref') return Infinity
        if (SIMPLE_INLINED[key]) {
          count++
        } else {
          item = schema[key]
          if (typeof item == 'object') count += countKeys(item) + 1
          if (count == Infinity) return Infinity
        }
      }
    }
    return count
  }
  function getFullPath(id2, normalize2) {
    if (normalize2 !== false) id2 = normalizeId(id2)
    var p = URI$1.parse(id2)
    return _getFullPath(p)
  }
  function _getFullPath(p) {
    return URI$1.serialize(p).split('#')[0] + '#'
  }
  var TRAILING_SLASH_HASH = /#\/?$/
  function normalizeId(id2) {
    return id2 ? id2.replace(TRAILING_SLASH_HASH, '') : ''
  }
  function resolveUrl(baseId, id2) {
    id2 = normalizeId(id2)
    return URI$1.resolve(baseId, id2)
  }
  function resolveIds(schema) {
    var schemaId = normalizeId(this._getId(schema))
    var baseIds = { '': schemaId }
    var fullPaths = { '': getFullPath(schemaId, false) }
    var localRefs = {}
    var self2 = this
    traverse(
      schema,
      { allKeys: true },
      function (sch, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex) {
        if (jsonPtr === '') return
        var id2 = self2._getId(sch)
        var baseId = baseIds[parentJsonPtr]
        var fullPath = fullPaths[parentJsonPtr] + '/' + parentKeyword
        if (keyIndex !== void 0)
          fullPath += '/' + (typeof keyIndex == 'number' ? keyIndex : util$3.escapeFragment(keyIndex))
        if (typeof id2 == 'string') {
          id2 = baseId = normalizeId(baseId ? URI$1.resolve(baseId, id2) : id2)
          var refVal = self2._refs[id2]
          if (typeof refVal == 'string') refVal = self2._refs[refVal]
          if (refVal && refVal.schema) {
            if (!equal$1(sch, refVal.schema)) throw new Error('id "' + id2 + '" resolves to more than one schema')
          } else if (id2 != normalizeId(fullPath)) {
            if (id2[0] == '#') {
              if (localRefs[id2] && !equal$1(sch, localRefs[id2]))
                throw new Error('id "' + id2 + '" resolves to more than one schema')
              localRefs[id2] = sch
            } else {
              self2._refs[id2] = fullPath
            }
          }
        }
        baseIds[jsonPtr] = baseId
        fullPaths[jsonPtr] = fullPath
      }
    )
    return localRefs
  }
  var resolve$2 = resolve_1
  var error_classes = {
    Validation: errorSubclass(ValidationError$1),
    MissingRef: errorSubclass(MissingRefError$1)
  }
  function ValidationError$1(errors2) {
    this.message = 'validation failed'
    this.errors = errors2
    this.ajv = this.validation = true
  }
  MissingRefError$1.message = function (baseId, ref2) {
    return "can't resolve reference " + ref2 + ' from id ' + baseId
  }
  function MissingRefError$1(baseId, ref2, message) {
    this.message = message || MissingRefError$1.message(baseId, ref2)
    this.missingRef = resolve$2.url(baseId, ref2)
    this.missingSchema = resolve$2.normalizeId(resolve$2.fullPath(this.missingRef))
  }
  function errorSubclass(Subclass) {
    Subclass.prototype = Object.create(Error.prototype)
    Subclass.prototype.constructor = Subclass
    return Subclass
  }
  var fastJsonStableStringify = function (data2, opts) {
    if (!opts) opts = {}
    if (typeof opts === 'function') opts = { cmp: opts }
    var cycles = typeof opts.cycles === 'boolean' ? opts.cycles : false
    var cmp =
      opts.cmp &&
      /* @__PURE__ */ (function (f) {
        return function (node) {
          return function (a, b) {
            var aobj = { key: a, value: node[a] }
            var bobj = { key: b, value: node[b] }
            return f(aobj, bobj)
          }
        }
      })(opts.cmp)
    var seen = []
    return (function stringify(node) {
      if (node && node.toJSON && typeof node.toJSON === 'function') {
        node = node.toJSON()
      }
      if (node === void 0) return
      if (typeof node == 'number') return isFinite(node) ? '' + node : 'null'
      if (typeof node !== 'object') return JSON.stringify(node)
      var i, out
      if (Array.isArray(node)) {
        out = '['
        for (i = 0; i < node.length; i++) {
          if (i) out += ','
          out += stringify(node[i]) || 'null'
        }
        return out + ']'
      }
      if (node === null) return 'null'
      if (seen.indexOf(node) !== -1) {
        if (cycles) return JSON.stringify('__cycle__')
        throw new TypeError('Converting circular structure to JSON')
      }
      var seenIndex = seen.push(node) - 1
      var keys = Object.keys(node).sort(cmp && cmp(node))
      out = ''
      for (i = 0; i < keys.length; i++) {
        var key = keys[i]
        var value = stringify(node[key])
        if (!value) continue
        if (out) out += ','
        out += JSON.stringify(key) + ':' + value
      }
      seen.splice(seenIndex, 1)
      return '{' + out + '}'
    })(data2)
  }
  var validate$1 = function generate_validate(it, $keyword, $ruleType) {
    var out = ''
    var $async = it.schema.$async === true,
      $refKeywords = it.util.schemaHasRulesExcept(it.schema, it.RULES.all, '$ref'),
      $id2 = it.self._getId(it.schema)
    if (it.opts.strictKeywords) {
      var $unknownKwd = it.util.schemaUnknownRules(it.schema, it.RULES.keywords)
      if ($unknownKwd) {
        var $keywordsMsg = 'unknown keyword: ' + $unknownKwd
        if (it.opts.strictKeywords === 'log') it.logger.warn($keywordsMsg)
        else throw new Error($keywordsMsg)
      }
    }
    if (it.isTop) {
      out += ' var validate = '
      if ($async) {
        it.async = true
        out += 'async '
      }
      out += "function(data, dataPath, parentData, parentDataProperty, rootData) { 'use strict'; "
      if ($id2 && (it.opts.sourceCode || it.opts.processCode)) {
        out += ' ' + ('/*# sourceURL=' + $id2 + ' */') + ' '
      }
    }
    if (typeof it.schema == 'boolean' || !($refKeywords || it.schema.$ref)) {
      var $keyword = 'false schema'
      var $lvl = it.level
      var $dataLvl = it.dataLevel
      var $schema2 = it.schema[$keyword]
      var $schemaPath = it.schemaPath + it.util.getProperty($keyword)
      var $errSchemaPath = it.errSchemaPath + '/' + $keyword
      var $breakOnError = !it.opts.allErrors
      var $errorKeyword
      var $data = 'data' + ($dataLvl || '')
      var $valid = 'valid' + $lvl
      if (it.schema === false) {
        if (it.isTop) {
          $breakOnError = true
        } else {
          out += ' var ' + $valid + ' = false; '
        }
        var $$outStack = $$outStack || []
        $$outStack.push(out)
        out = ''
        if (it.createErrors !== false) {
          out +=
            " { keyword: '" +
            ($errorKeyword || 'false schema') +
            "' , dataPath: (dataPath || '') + " +
            it.errorPath +
            ' , schemaPath: ' +
            it.util.toQuotedString($errSchemaPath) +
            ' , params: {} '
          if (it.opts.messages !== false) {
            out += " , message: 'boolean schema is false' "
          }
          if (it.opts.verbose) {
            out += ' , schema: false , parentSchema: validate.schema' + it.schemaPath + ' , data: ' + $data + ' '
          }
          out += ' } '
        } else {
          out += ' {} '
        }
        var __err = out
        out = $$outStack.pop()
        if (!it.compositeRule && $breakOnError) {
          if (it.async) {
            out += ' throw new ValidationError([' + __err + ']); '
          } else {
            out += ' validate.errors = [' + __err + ']; return false; '
          }
        } else {
          out += ' var err = ' + __err + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; '
        }
      } else {
        if (it.isTop) {
          if ($async) {
            out += ' return data; '
          } else {
            out += ' validate.errors = null; return true; '
          }
        } else {
          out += ' var ' + $valid + ' = true; '
        }
      }
      if (it.isTop) {
        out += ' }; return validate; '
      }
      return out
    }
    if (it.isTop) {
      var $top = it.isTop,
        $lvl = (it.level = 0),
        $dataLvl = (it.dataLevel = 0),
        $data = 'data'
      it.rootId = it.resolve.fullPath(it.self._getId(it.root.schema))
      it.baseId = it.baseId || it.rootId
      delete it.isTop
      it.dataPathArr = ['']
      if (it.schema.default !== void 0 && it.opts.useDefaults && it.opts.strictDefaults) {
        var $defaultMsg = 'default is ignored in the schema root'
        if (it.opts.strictDefaults === 'log') it.logger.warn($defaultMsg)
        else throw new Error($defaultMsg)
      }
      out += ' var vErrors = null; '
      out += ' var errors = 0;     '
      out += ' if (rootData === undefined) rootData = data; '
    } else {
      var $lvl = it.level,
        $dataLvl = it.dataLevel,
        $data = 'data' + ($dataLvl || '')
      if ($id2) it.baseId = it.resolve.url(it.baseId, $id2)
      if ($async && !it.async) throw new Error('async schema in sync schema')
      out += ' var errs_' + $lvl + ' = errors;'
    }
    var $valid = 'valid' + $lvl,
      $breakOnError = !it.opts.allErrors,
      $closingBraces1 = '',
      $closingBraces2 = ''
    var $errorKeyword
    var $typeSchema = it.schema.type,
      $typeIsArray = Array.isArray($typeSchema)
    if ($typeSchema && it.opts.nullable && it.schema.nullable === true) {
      if ($typeIsArray) {
        if ($typeSchema.indexOf('null') == -1) $typeSchema = $typeSchema.concat('null')
      } else if ($typeSchema != 'null') {
        $typeSchema = [$typeSchema, 'null']
        $typeIsArray = true
      }
    }
    if ($typeIsArray && $typeSchema.length == 1) {
      $typeSchema = $typeSchema[0]
      $typeIsArray = false
    }
    if (it.schema.$ref && $refKeywords) {
      if (it.opts.extendRefs == 'fail') {
        throw new Error(
          '$ref: validation keywords used in schema at path "' + it.errSchemaPath + '" (see option extendRefs)'
        )
      } else if (it.opts.extendRefs !== true) {
        $refKeywords = false
        it.logger.warn('$ref: keywords ignored in schema at path "' + it.errSchemaPath + '"')
      }
    }
    if (it.schema.$comment && it.opts.$comment) {
      out += ' ' + it.RULES.all.$comment.code(it, '$comment')
    }
    if ($typeSchema) {
      if (it.opts.coerceTypes) {
        var $coerceToTypes = it.util.coerceToTypes(it.opts.coerceTypes, $typeSchema)
      }
      var $rulesGroup = it.RULES.types[$typeSchema]
      if ($coerceToTypes || $typeIsArray || $rulesGroup === true || ($rulesGroup && !$shouldUseGroup($rulesGroup))) {
        var $schemaPath = it.schemaPath + '.type',
          $errSchemaPath = it.errSchemaPath + '/type'
        var $schemaPath = it.schemaPath + '.type',
          $errSchemaPath = it.errSchemaPath + '/type',
          $method = $typeIsArray ? 'checkDataTypes' : 'checkDataType'
        out += ' if (' + it.util[$method]($typeSchema, $data, it.opts.strictNumbers, true) + ') { '
        if ($coerceToTypes) {
          var $dataType = 'dataType' + $lvl,
            $coerced = 'coerced' + $lvl
          out += ' var ' + $dataType + ' = typeof ' + $data + '; var ' + $coerced + ' = undefined; '
          if (it.opts.coerceTypes == 'array') {
            out +=
              ' if (' +
              $dataType +
              " == 'object' && Array.isArray(" +
              $data +
              ') && ' +
              $data +
              '.length == 1) { ' +
              $data +
              ' = ' +
              $data +
              '[0]; ' +
              $dataType +
              ' = typeof ' +
              $data +
              '; if (' +
              it.util.checkDataType(it.schema.type, $data, it.opts.strictNumbers) +
              ') ' +
              $coerced +
              ' = ' +
              $data +
              '; } '
          }
          out += ' if (' + $coerced + ' !== undefined) ; '
          var arr1 = $coerceToTypes
          if (arr1) {
            var $type,
              $i = -1,
              l1 = arr1.length - 1
            while ($i < l1) {
              $type = arr1[($i += 1)]
              if ($type == 'string') {
                out +=
                  ' else if (' +
                  $dataType +
                  " == 'number' || " +
                  $dataType +
                  " == 'boolean') " +
                  $coerced +
                  " = '' + " +
                  $data +
                  '; else if (' +
                  $data +
                  ' === null) ' +
                  $coerced +
                  " = ''; "
              } else if ($type == 'number' || $type == 'integer') {
                out +=
                  ' else if (' +
                  $dataType +
                  " == 'boolean' || " +
                  $data +
                  ' === null || (' +
                  $dataType +
                  " == 'string' && " +
                  $data +
                  ' && ' +
                  $data +
                  ' == +' +
                  $data +
                  ' '
                if ($type == 'integer') {
                  out += ' && !(' + $data + ' % 1)'
                }
                out += ')) ' + $coerced + ' = +' + $data + '; '
              } else if ($type == 'boolean') {
                out +=
                  ' else if (' +
                  $data +
                  " === 'false' || " +
                  $data +
                  ' === 0 || ' +
                  $data +
                  ' === null) ' +
                  $coerced +
                  ' = false; else if (' +
                  $data +
                  " === 'true' || " +
                  $data +
                  ' === 1) ' +
                  $coerced +
                  ' = true; '
              } else if ($type == 'null') {
                out +=
                  ' else if (' +
                  $data +
                  " === '' || " +
                  $data +
                  ' === 0 || ' +
                  $data +
                  ' === false) ' +
                  $coerced +
                  ' = null; '
              } else if (it.opts.coerceTypes == 'array' && $type == 'array') {
                out +=
                  ' else if (' +
                  $dataType +
                  " == 'string' || " +
                  $dataType +
                  " == 'number' || " +
                  $dataType +
                  " == 'boolean' || " +
                  $data +
                  ' == null) ' +
                  $coerced +
                  ' = [' +
                  $data +
                  ']; '
              }
            }
          }
          out += ' else {   '
          var $$outStack = $$outStack || []
          $$outStack.push(out)
          out = ''
          if (it.createErrors !== false) {
            out +=
              " { keyword: '" +
              ($errorKeyword || 'type') +
              "' , dataPath: (dataPath || '') + " +
              it.errorPath +
              ' , schemaPath: ' +
              it.util.toQuotedString($errSchemaPath) +
              " , params: { type: '"
            if ($typeIsArray) {
              out += '' + $typeSchema.join(',')
            } else {
              out += '' + $typeSchema
            }
            out += "' } "
            if (it.opts.messages !== false) {
              out += " , message: 'should be "
              if ($typeIsArray) {
                out += '' + $typeSchema.join(',')
              } else {
                out += '' + $typeSchema
              }
              out += "' "
            }
            if (it.opts.verbose) {
              out +=
                ' , schema: validate.schema' +
                $schemaPath +
                ' , parentSchema: validate.schema' +
                it.schemaPath +
                ' , data: ' +
                $data +
                ' '
            }
            out += ' } '
          } else {
            out += ' {} '
          }
          var __err = out
          out = $$outStack.pop()
          if (!it.compositeRule && $breakOnError) {
            if (it.async) {
              out += ' throw new ValidationError([' + __err + ']); '
            } else {
              out += ' validate.errors = [' + __err + ']; return false; '
            }
          } else {
            out +=
              ' var err = ' + __err + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; '
          }
          out += ' } if (' + $coerced + ' !== undefined) {  '
          var $parentData = $dataLvl ? 'data' + ($dataLvl - 1 || '') : 'parentData',
            $parentDataProperty = $dataLvl ? it.dataPathArr[$dataLvl] : 'parentDataProperty'
          out += ' ' + $data + ' = ' + $coerced + '; '
          if (!$dataLvl) {
            out += 'if (' + $parentData + ' !== undefined)'
          }
          out += ' ' + $parentData + '[' + $parentDataProperty + '] = ' + $coerced + '; } '
        } else {
          var $$outStack = $$outStack || []
          $$outStack.push(out)
          out = ''
          if (it.createErrors !== false) {
            out +=
              " { keyword: '" +
              ($errorKeyword || 'type') +
              "' , dataPath: (dataPath || '') + " +
              it.errorPath +
              ' , schemaPath: ' +
              it.util.toQuotedString($errSchemaPath) +
              " , params: { type: '"
            if ($typeIsArray) {
              out += '' + $typeSchema.join(',')
            } else {
              out += '' + $typeSchema
            }
            out += "' } "
            if (it.opts.messages !== false) {
              out += " , message: 'should be "
              if ($typeIsArray) {
                out += '' + $typeSchema.join(',')
              } else {
                out += '' + $typeSchema
              }
              out += "' "
            }
            if (it.opts.verbose) {
              out +=
                ' , schema: validate.schema' +
                $schemaPath +
                ' , parentSchema: validate.schema' +
                it.schemaPath +
                ' , data: ' +
                $data +
                ' '
            }
            out += ' } '
          } else {
            out += ' {} '
          }
          var __err = out
          out = $$outStack.pop()
          if (!it.compositeRule && $breakOnError) {
            if (it.async) {
              out += ' throw new ValidationError([' + __err + ']); '
            } else {
              out += ' validate.errors = [' + __err + ']; return false; '
            }
          } else {
            out +=
              ' var err = ' + __err + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; '
          }
        }
        out += ' } '
      }
    }
    if (it.schema.$ref && !$refKeywords) {
      out += ' ' + it.RULES.all.$ref.code(it, '$ref') + ' '
      if ($breakOnError) {
        out += ' } if (errors === '
        if ($top) {
          out += '0'
        } else {
          out += 'errs_' + $lvl
        }
        out += ') { '
        $closingBraces2 += '}'
      }
    } else {
      var arr2 = it.RULES
      if (arr2) {
        var $rulesGroup,
          i2 = -1,
          l2 = arr2.length - 1
        while (i2 < l2) {
          $rulesGroup = arr2[(i2 += 1)]
          if ($shouldUseGroup($rulesGroup)) {
            if ($rulesGroup.type) {
              out += ' if (' + it.util.checkDataType($rulesGroup.type, $data, it.opts.strictNumbers) + ') { '
            }
            if (it.opts.useDefaults) {
              if ($rulesGroup.type == 'object' && it.schema.properties) {
                var $schema2 = it.schema.properties,
                  $schemaKeys = Object.keys($schema2)
                var arr3 = $schemaKeys
                if (arr3) {
                  var $propertyKey,
                    i3 = -1,
                    l3 = arr3.length - 1
                  while (i3 < l3) {
                    $propertyKey = arr3[(i3 += 1)]
                    var $sch = $schema2[$propertyKey]
                    if ($sch.default !== void 0) {
                      var $passData = $data + it.util.getProperty($propertyKey)
                      if (it.compositeRule) {
                        if (it.opts.strictDefaults) {
                          var $defaultMsg = 'default is ignored for: ' + $passData
                          if (it.opts.strictDefaults === 'log') it.logger.warn($defaultMsg)
                          else throw new Error($defaultMsg)
                        }
                      } else {
                        out += ' if (' + $passData + ' === undefined '
                        if (it.opts.useDefaults == 'empty') {
                          out += ' || ' + $passData + ' === null || ' + $passData + " === '' "
                        }
                        out += ' ) ' + $passData + ' = '
                        if (it.opts.useDefaults == 'shared') {
                          out += ' ' + it.useDefault($sch.default) + ' '
                        } else {
                          out += ' ' + JSON.stringify($sch.default) + ' '
                        }
                        out += '; '
                      }
                    }
                  }
                }
              } else if ($rulesGroup.type == 'array' && Array.isArray(it.schema.items)) {
                var arr4 = it.schema.items
                if (arr4) {
                  var $sch,
                    $i = -1,
                    l4 = arr4.length - 1
                  while ($i < l4) {
                    $sch = arr4[($i += 1)]
                    if ($sch.default !== void 0) {
                      var $passData = $data + '[' + $i + ']'
                      if (it.compositeRule) {
                        if (it.opts.strictDefaults) {
                          var $defaultMsg = 'default is ignored for: ' + $passData
                          if (it.opts.strictDefaults === 'log') it.logger.warn($defaultMsg)
                          else throw new Error($defaultMsg)
                        }
                      } else {
                        out += ' if (' + $passData + ' === undefined '
                        if (it.opts.useDefaults == 'empty') {
                          out += ' || ' + $passData + ' === null || ' + $passData + " === '' "
                        }
                        out += ' ) ' + $passData + ' = '
                        if (it.opts.useDefaults == 'shared') {
                          out += ' ' + it.useDefault($sch.default) + ' '
                        } else {
                          out += ' ' + JSON.stringify($sch.default) + ' '
                        }
                        out += '; '
                      }
                    }
                  }
                }
              }
            }
            var arr5 = $rulesGroup.rules
            if (arr5) {
              var $rule,
                i5 = -1,
                l5 = arr5.length - 1
              while (i5 < l5) {
                $rule = arr5[(i5 += 1)]
                if ($shouldUseRule($rule)) {
                  var $code = $rule.code(it, $rule.keyword, $rulesGroup.type)
                  if ($code) {
                    out += ' ' + $code + ' '
                    if ($breakOnError) {
                      $closingBraces1 += '}'
                    }
                  }
                }
              }
            }
            if ($breakOnError) {
              out += ' ' + $closingBraces1 + ' '
              $closingBraces1 = ''
            }
            if ($rulesGroup.type) {
              out += ' } '
              if ($typeSchema && $typeSchema === $rulesGroup.type && !$coerceToTypes) {
                out += ' else { '
                var $schemaPath = it.schemaPath + '.type',
                  $errSchemaPath = it.errSchemaPath + '/type'
                var $$outStack = $$outStack || []
                $$outStack.push(out)
                out = ''
                if (it.createErrors !== false) {
                  out +=
                    " { keyword: '" +
                    ($errorKeyword || 'type') +
                    "' , dataPath: (dataPath || '') + " +
                    it.errorPath +
                    ' , schemaPath: ' +
                    it.util.toQuotedString($errSchemaPath) +
                    " , params: { type: '"
                  if ($typeIsArray) {
                    out += '' + $typeSchema.join(',')
                  } else {
                    out += '' + $typeSchema
                  }
                  out += "' } "
                  if (it.opts.messages !== false) {
                    out += " , message: 'should be "
                    if ($typeIsArray) {
                      out += '' + $typeSchema.join(',')
                    } else {
                      out += '' + $typeSchema
                    }
                    out += "' "
                  }
                  if (it.opts.verbose) {
                    out +=
                      ' , schema: validate.schema' +
                      $schemaPath +
                      ' , parentSchema: validate.schema' +
                      it.schemaPath +
                      ' , data: ' +
                      $data +
                      ' '
                  }
                  out += ' } '
                } else {
                  out += ' {} '
                }
                var __err = out
                out = $$outStack.pop()
                if (!it.compositeRule && $breakOnError) {
                  if (it.async) {
                    out += ' throw new ValidationError([' + __err + ']); '
                  } else {
                    out += ' validate.errors = [' + __err + ']; return false; '
                  }
                } else {
                  out +=
                    ' var err = ' +
                    __err +
                    ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; '
                }
                out += ' } '
              }
            }
            if ($breakOnError) {
              out += ' if (errors === '
              if ($top) {
                out += '0'
              } else {
                out += 'errs_' + $lvl
              }
              out += ') { '
              $closingBraces2 += '}'
            }
          }
        }
      }
    }
    if ($breakOnError) {
      out += ' ' + $closingBraces2 + ' '
    }
    if ($top) {
      if ($async) {
        out += ' if (errors === 0) return data;           '
        out += ' else throw new ValidationError(vErrors); '
      } else {
        out += ' validate.errors = vErrors; '
        out += ' return errors === 0;       '
      }
      out += ' }; return validate;'
    } else {
      out += ' var ' + $valid + ' = errors === errs_' + $lvl + ';'
    }
    function $shouldUseGroup($rulesGroup2) {
      var rules2 = $rulesGroup2.rules
      for (var i = 0; i < rules2.length; i++) if ($shouldUseRule(rules2[i])) return true
    }
    function $shouldUseRule($rule2) {
      return it.schema[$rule2.keyword] !== void 0 || ($rule2.implements && $ruleImplementsSomeKeyword($rule2))
    }
    function $ruleImplementsSomeKeyword($rule2) {
      var impl = $rule2.implements
      for (var i = 0; i < impl.length; i++) if (it.schema[impl[i]] !== void 0) return true
    }
    return out
  }
  var resolve$1 = resolve_1,
    util$2 = util$5,
    errorClasses$1 = error_classes,
    stableStringify$1 = fastJsonStableStringify
  var validateGenerator = validate$1
  var ucs2length = util$2.ucs2length
  var equal = fastDeepEqual
  var ValidationError = errorClasses$1.Validation
  var compile_1 = compile$1
  function compile$1(schema, root, localRefs, baseId) {
    var self2 = this,
      opts = this._opts,
      refVal = [void 0],
      refs = {},
      patterns = [],
      patternsHash = {},
      defaults2 = [],
      defaultsHash = {},
      customRules = []
    root = root || { schema, refVal, refs }
    var c = checkCompiling.call(this, schema, root, baseId)
    var compilation = this._compilations[c.index]
    if (c.compiling) return (compilation.callValidate = callValidate)
    var formats2 = this._formats
    var RULES = this.RULES
    try {
      var v = localCompile(schema, root, localRefs, baseId)
      compilation.validate = v
      var cv = compilation.callValidate
      if (cv) {
        cv.schema = v.schema
        cv.errors = null
        cv.refs = v.refs
        cv.refVal = v.refVal
        cv.root = v.root
        cv.$async = v.$async
        if (opts.sourceCode) cv.source = v.source
      }
      return v
    } finally {
      endCompiling.call(this, schema, root, baseId)
    }
    function callValidate() {
      var validate2 = compilation.validate
      var result = validate2.apply(this, arguments)
      callValidate.errors = validate2.errors
      return result
    }
    function localCompile(_schema, _root, localRefs2, baseId2) {
      var isRoot = !_root || (_root && _root.schema == _schema)
      if (_root.schema != root.schema) return compile$1.call(self2, _schema, _root, localRefs2, baseId2)
      var $async = _schema.$async === true
      var sourceCode = validateGenerator({
        isTop: true,
        schema: _schema,
        isRoot,
        baseId: baseId2,
        root: _root,
        schemaPath: '',
        errSchemaPath: '#',
        errorPath: '""',
        MissingRefError: errorClasses$1.MissingRef,
        RULES,
        validate: validateGenerator,
        util: util$2,
        resolve: resolve$1,
        resolveRef: resolveRef2,
        usePattern: usePattern2,
        useDefault,
        useCustomRule,
        opts,
        formats: formats2,
        logger: self2.logger,
        self: self2
      })
      sourceCode =
        vars(refVal, refValCode) +
        vars(patterns, patternCode) +
        vars(defaults2, defaultCode) +
        vars(customRules, customRuleCode$1) +
        sourceCode
      if (opts.processCode) sourceCode = opts.processCode(sourceCode, _schema)
      var validate2
      try {
        var makeValidate = new Function(
          'self',
          'RULES',
          'formats',
          'root',
          'refVal',
          'defaults',
          'customRules',
          'equal',
          'ucs2length',
          'ValidationError',
          sourceCode
        )
        validate2 = makeValidate(
          self2,
          RULES,
          formats2,
          root,
          refVal,
          defaults2,
          customRules,
          equal,
          ucs2length,
          ValidationError
        )
        refVal[0] = validate2
      } catch (e) {
        self2.logger.error('Error compiling schema, function code:', sourceCode)
        throw e
      }
      validate2.schema = _schema
      validate2.errors = null
      validate2.refs = refs
      validate2.refVal = refVal
      validate2.root = isRoot ? validate2 : _root
      if ($async) validate2.$async = true
      if (opts.sourceCode === true) {
        validate2.source = {
          code: sourceCode,
          patterns,
          defaults: defaults2
        }
      }
      return validate2
    }
    function resolveRef2(baseId2, ref2, isRoot) {
      ref2 = resolve$1.url(baseId2, ref2)
      var refIndex = refs[ref2]
      var _refVal, refCode
      if (refIndex !== void 0) {
        _refVal = refVal[refIndex]
        refCode = 'refVal[' + refIndex + ']'
        return resolvedRef(_refVal, refCode)
      }
      if (!isRoot && root.refs) {
        var rootRefId = root.refs[ref2]
        if (rootRefId !== void 0) {
          _refVal = root.refVal[rootRefId]
          refCode = addLocalRef(ref2, _refVal)
          return resolvedRef(_refVal, refCode)
        }
      }
      refCode = addLocalRef(ref2)
      var v2 = resolve$1.call(self2, localCompile, root, ref2)
      if (v2 === void 0) {
        var localSchema = localRefs && localRefs[ref2]
        if (localSchema) {
          v2 = resolve$1.inlineRef(localSchema, opts.inlineRefs)
            ? localSchema
            : compile$1.call(self2, localSchema, root, localRefs, baseId2)
        }
      }
      if (v2 === void 0) {
        removeLocalRef(ref2)
      } else {
        replaceLocalRef(ref2, v2)
        return resolvedRef(v2, refCode)
      }
    }
    function addLocalRef(ref2, v2) {
      var refId = refVal.length
      refVal[refId] = v2
      refs[ref2] = refId
      return 'refVal' + refId
    }
    function removeLocalRef(ref2) {
      delete refs[ref2]
    }
    function replaceLocalRef(ref2, v2) {
      var refId = refs[ref2]
      refVal[refId] = v2
    }
    function resolvedRef(refVal2, code2) {
      return typeof refVal2 == 'object' || typeof refVal2 == 'boolean'
        ? { code: code2, schema: refVal2, inline: true }
        : { code: code2, $async: refVal2 && !!refVal2.$async }
    }
    function usePattern2(regexStr) {
      var index = patternsHash[regexStr]
      if (index === void 0) {
        index = patternsHash[regexStr] = patterns.length
        patterns[index] = regexStr
      }
      return 'pattern' + index
    }
    function useDefault(value) {
      switch (typeof value) {
        case 'boolean':
        case 'number':
          return '' + value
        case 'string':
          return util$2.toQuotedString(value)
        case 'object':
          if (value === null) return 'null'
          var valueStr = stableStringify$1(value)
          var index = defaultsHash[valueStr]
          if (index === void 0) {
            index = defaultsHash[valueStr] = defaults2.length
            defaults2[index] = value
          }
          return 'default' + index
      }
    }
    function useCustomRule(rule, schema2, parentSchema, it) {
      if (self2._opts.validateSchema !== false) {
        var deps = rule.definition.dependencies
        if (
          deps &&
          !deps.every(function (keyword2) {
            return Object.prototype.hasOwnProperty.call(parentSchema, keyword2)
          })
        )
          throw new Error('parent schema must have all required keywords: ' + deps.join(','))
        var validateSchema2 = rule.definition.validateSchema
        if (validateSchema2) {
          var valid = validateSchema2(schema2)
          if (!valid) {
            var message = 'keyword schema is invalid: ' + self2.errorsText(validateSchema2.errors)
            if (self2._opts.validateSchema == 'log') self2.logger.error(message)
            else throw new Error(message)
          }
        }
      }
      var compile2 = rule.definition.compile,
        inline = rule.definition.inline,
        macro = rule.definition.macro
      var validate2
      if (compile2) {
        validate2 = compile2.call(self2, schema2, parentSchema, it)
      } else if (macro) {
        validate2 = macro.call(self2, schema2, parentSchema, it)
        if (opts.validateSchema !== false) self2.validateSchema(validate2, true)
      } else if (inline) {
        validate2 = inline.call(self2, it, rule.keyword, schema2, parentSchema)
      } else {
        validate2 = rule.definition.validate
        if (!validate2) return
      }
      if (validate2 === void 0) throw new Error('custom keyword "' + rule.keyword + '"failed to compile')
      var index = customRules.length
      customRules[index] = validate2
      return {
        code: 'customRule' + index,
        validate: validate2
      }
    }
  }
  function checkCompiling(schema, root, baseId) {
    var index = compIndex.call(this, schema, root, baseId)
    if (index >= 0) return { index, compiling: true }
    index = this._compilations.length
    this._compilations[index] = {
      schema,
      root,
      baseId
    }
    return { index, compiling: false }
  }
  function endCompiling(schema, root, baseId) {
    var i = compIndex.call(this, schema, root, baseId)
    if (i >= 0) this._compilations.splice(i, 1)
  }
  function compIndex(schema, root, baseId) {
    for (var i = 0; i < this._compilations.length; i++) {
      var c = this._compilations[i]
      if (c.schema == schema && c.root == root && c.baseId == baseId) return i
    }
    return -1
  }
  function patternCode(i, patterns) {
    return 'var pattern' + i + ' = new RegExp(' + util$2.toQuotedString(patterns[i]) + ');'
  }
  function defaultCode(i) {
    return 'var default' + i + ' = defaults[' + i + '];'
  }
  function refValCode(i, refVal) {
    return refVal[i] === void 0 ? '' : 'var refVal' + i + ' = refVal[' + i + '];'
  }
  function customRuleCode$1(i) {
    return 'var customRule' + i + ' = customRules[' + i + '];'
  }
  function vars(arr, statement) {
    if (!arr.length) return ''
    var code2 = ''
    for (var i = 0; i < arr.length; i++) code2 += statement(i, arr)
    return code2
  }
  var cache = { exports: {} }
  var Cache$1 = (cache.exports = function Cache2() {
    this._cache = {}
  })
  Cache$1.prototype.put = function Cache_put(key, value) {
    this._cache[key] = value
  }
  Cache$1.prototype.get = function Cache_get(key) {
    return this._cache[key]
  }
  Cache$1.prototype.del = function Cache_del(key) {
    delete this._cache[key]
  }
  Cache$1.prototype.clear = function Cache_clear() {
    this._cache = {}
  }
  var cacheExports = cache.exports
  var util$1 = util$5
  var DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/
  var DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  var TIME = /^(\d\d):(\d\d):(\d\d)(\.\d+)?(z|[+-]\d\d(?::?\d\d)?)?$/i
  var HOSTNAME = /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i
  var URI =
    /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i
  var URIREF =
    /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i
  var URITEMPLATE =
    /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i
  var URL$1 =
    /^(?:(?:http[s\u017F]?|ftp):\/\/)(?:(?:[\0-\x08\x0E-\x1F!-\x9F\xA1-\u167F\u1681-\u1FFF\u200B-\u2027\u202A-\u202E\u2030-\u205E\u2060-\u2FFF\u3001-\uD7FF\uE000-\uFEFE\uFF00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+(?::(?:[\0-\x08\x0E-\x1F!-\x9F\xA1-\u167F\u1681-\u1FFF\u200B-\u2027\u202A-\u202E\u2030-\u205E\u2060-\u2FFF\u3001-\uD7FF\uE000-\uFEFE\uFF00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])*)?@)?(?:(?!10(?:\.[0-9]{1,3}){3})(?!127(?:\.[0-9]{1,3}){3})(?!169\.254(?:\.[0-9]{1,3}){2})(?!192\.168(?:\.[0-9]{1,3}){2})(?!172\.(?:1[6-9]|2[0-9]|3[01])(?:\.[0-9]{1,3}){2})(?:[1-9][0-9]?|1[0-9][0-9]|2[01][0-9]|22[0-3])(?:\.(?:1?[0-9]{1,2}|2[0-4][0-9]|25[0-5])){2}(?:\.(?:[1-9][0-9]?|1[0-9][0-9]|2[0-4][0-9]|25[0-4]))|(?:(?:(?:[0-9a-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+-)*(?:[0-9a-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+)(?:\.(?:(?:[0-9a-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+-)*(?:[0-9a-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+)*(?:\.(?:(?:[a-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]){2,})))(?::[0-9]{2,5})?(?:\/(?:[\0-\x08\x0E-\x1F!-\x9F\xA1-\u167F\u1681-\u1FFF\u200B-\u2027\u202A-\u202E\u2030-\u205E\u2060-\u2FFF\u3001-\uD7FF\uE000-\uFEFE\uFF00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])*)?$/i
  var UUID = /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i
  var JSON_POINTER = /^(?:\/(?:[^~/]|~0|~1)*)*$/
  var JSON_POINTER_URI_FRAGMENT = /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i
  var RELATIVE_JSON_POINTER = /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/
  var formats_1 = formats$1
  function formats$1(mode) {
    mode = mode == 'full' ? 'full' : 'fast'
    return util$1.copy(formats$1[mode])
  }
  formats$1.fast = {
    // date: http://tools.ietf.org/html/rfc3339#section-5.6
    date: /^\d\d\d\d-[0-1]\d-[0-3]\d$/,
    // date-time: http://tools.ietf.org/html/rfc3339#section-5.6
    time: /^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i,
    'date-time':
      /^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i,
    // uri: https://github.com/mafintosh/is-my-json-valid/blob/master/formats.js
    uri: /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i,
    'uri-reference': /^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
    'uri-template': URITEMPLATE,
    url: URL$1,
    // email (sources from jsen validator):
    // http://stackoverflow.com/questions/201323/using-a-regular-expression-to-validate-an-email-address#answer-8829363
    // http://www.w3.org/TR/html5/forms.html#valid-e-mail-address (search for 'willful violation')
    email:
      /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i,
    hostname: HOSTNAME,
    // optimized https://www.safaribooksonline.com/library/view/regular-expressions-cookbook/9780596802837/ch07s16.html
    ipv4: /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
    // optimized http://stackoverflow.com/questions/53497/regular-expression-that-matches-valid-ipv6-addresses
    ipv6: /^\s*(?:(?:(?:[0-9a-f]{1,4}:){7}(?:[0-9a-f]{1,4}|:))|(?:(?:[0-9a-f]{1,4}:){6}(?::[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(?:(?:[0-9a-f]{1,4}:){5}(?:(?:(?::[0-9a-f]{1,4}){1,2})|:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(?:(?:[0-9a-f]{1,4}:){4}(?:(?:(?::[0-9a-f]{1,4}){1,3})|(?:(?::[0-9a-f]{1,4})?:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){3}(?:(?:(?::[0-9a-f]{1,4}){1,4})|(?:(?::[0-9a-f]{1,4}){0,2}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){2}(?:(?:(?::[0-9a-f]{1,4}){1,5})|(?:(?::[0-9a-f]{1,4}){0,3}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){1}(?:(?:(?::[0-9a-f]{1,4}){1,6})|(?:(?::[0-9a-f]{1,4}){0,4}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?::(?:(?:(?::[0-9a-f]{1,4}){1,7})|(?:(?::[0-9a-f]{1,4}){0,5}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(?:%.+)?\s*$/i,
    regex,
    // uuid: http://tools.ietf.org/html/rfc4122
    uuid: UUID,
    // JSON-pointer: https://tools.ietf.org/html/rfc6901
    // uri fragment: https://tools.ietf.org/html/rfc3986#appendix-A
    'json-pointer': JSON_POINTER,
    'json-pointer-uri-fragment': JSON_POINTER_URI_FRAGMENT,
    // relative JSON-pointer: http://tools.ietf.org/html/draft-luff-relative-json-pointer-00
    'relative-json-pointer': RELATIVE_JSON_POINTER
  }
  formats$1.full = {
    date,
    time,
    'date-time': date_time,
    uri,
    'uri-reference': URIREF,
    'uri-template': URITEMPLATE,
    url: URL$1,
    email:
      /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
    hostname: HOSTNAME,
    ipv4: /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
    ipv6: /^\s*(?:(?:(?:[0-9a-f]{1,4}:){7}(?:[0-9a-f]{1,4}|:))|(?:(?:[0-9a-f]{1,4}:){6}(?::[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(?:(?:[0-9a-f]{1,4}:){5}(?:(?:(?::[0-9a-f]{1,4}){1,2})|:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(?:(?:[0-9a-f]{1,4}:){4}(?:(?:(?::[0-9a-f]{1,4}){1,3})|(?:(?::[0-9a-f]{1,4})?:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){3}(?:(?:(?::[0-9a-f]{1,4}){1,4})|(?:(?::[0-9a-f]{1,4}){0,2}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){2}(?:(?:(?::[0-9a-f]{1,4}){1,5})|(?:(?::[0-9a-f]{1,4}){0,3}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){1}(?:(?:(?::[0-9a-f]{1,4}){1,6})|(?:(?::[0-9a-f]{1,4}){0,4}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?::(?:(?:(?::[0-9a-f]{1,4}){1,7})|(?:(?::[0-9a-f]{1,4}){0,5}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(?:%.+)?\s*$/i,
    regex,
    uuid: UUID,
    'json-pointer': JSON_POINTER,
    'json-pointer-uri-fragment': JSON_POINTER_URI_FRAGMENT,
    'relative-json-pointer': RELATIVE_JSON_POINTER
  }
  function isLeapYear(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  }
  function date(str) {
    var matches = str.match(DATE)
    if (!matches) return false
    var year = +matches[1]
    var month = +matches[2]
    var day = +matches[3]
    return month >= 1 && month <= 12 && day >= 1 && day <= (month == 2 && isLeapYear(year) ? 29 : DAYS[month])
  }
  function time(str, full) {
    var matches = str.match(TIME)
    if (!matches) return false
    var hour = matches[1]
    var minute = matches[2]
    var second = matches[3]
    var timeZone = matches[5]
    return (
      ((hour <= 23 && minute <= 59 && second <= 59) || (hour == 23 && minute == 59 && second == 60)) &&
      (!full || timeZone)
    )
  }
  var DATE_TIME_SEPARATOR = /t|\s/i
  function date_time(str) {
    var dateTime = str.split(DATE_TIME_SEPARATOR)
    return dateTime.length == 2 && date(dateTime[0]) && time(dateTime[1], true)
  }
  var NOT_URI_FRAGMENT = /\/|:/
  function uri(str) {
    return NOT_URI_FRAGMENT.test(str) && URI.test(str)
  }
  var Z_ANCHOR = /[^\\]\\Z/
  function regex(str) {
    if (Z_ANCHOR.test(str)) return false
    try {
      new RegExp(str)
      return true
    } catch (e) {
      return false
    }
  }
  var ref = function generate_ref(it, $keyword, $ruleType) {
    var out = ' '
    var $lvl = it.level
    var $dataLvl = it.dataLevel
    var $schema2 = it.schema[$keyword]
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword
    var $breakOnError = !it.opts.allErrors
    var $data = 'data' + ($dataLvl || '')
    var $valid = 'valid' + $lvl
    var $async, $refCode
    if ($schema2 == '#' || $schema2 == '#/') {
      if (it.isRoot) {
        $async = it.async
        $refCode = 'validate'
      } else {
        $async = it.root.schema.$async === true
        $refCode = 'root.refVal[0]'
      }
    } else {
      var $refVal = it.resolveRef(it.baseId, $schema2, it.isRoot)
      if ($refVal === void 0) {
        var $message = it.MissingRefError.message(it.baseId, $schema2)
        if (it.opts.missingRefs == 'fail') {
          it.logger.error($message)
          var $$outStack = $$outStack || []
          $$outStack.push(out)
          out = ''
          if (it.createErrors !== false) {
            out +=
              " { keyword: '$ref' , dataPath: (dataPath || '') + " +
              it.errorPath +
              ' , schemaPath: ' +
              it.util.toQuotedString($errSchemaPath) +
              " , params: { ref: '" +
              it.util.escapeQuotes($schema2) +
              "' } "
            if (it.opts.messages !== false) {
              out += " , message: 'can\\'t resolve reference " + it.util.escapeQuotes($schema2) + "' "
            }
            if (it.opts.verbose) {
              out +=
                ' , schema: ' +
                it.util.toQuotedString($schema2) +
                ' , parentSchema: validate.schema' +
                it.schemaPath +
                ' , data: ' +
                $data +
                ' '
            }
            out += ' } '
          } else {
            out += ' {} '
          }
          var __err = out
          out = $$outStack.pop()
          if (!it.compositeRule && $breakOnError) {
            if (it.async) {
              out += ' throw new ValidationError([' + __err + ']); '
            } else {
              out += ' validate.errors = [' + __err + ']; return false; '
            }
          } else {
            out +=
              ' var err = ' + __err + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; '
          }
          if ($breakOnError) {
            out += ' if (false) { '
          }
        } else if (it.opts.missingRefs == 'ignore') {
          it.logger.warn($message)
          if ($breakOnError) {
            out += ' if (true) { '
          }
        } else {
          throw new it.MissingRefError(it.baseId, $schema2, $message)
        }
      } else if ($refVal.inline) {
        var $it = it.util.copy(it)
        $it.level++
        var $nextValid = 'valid' + $it.level
        $it.schema = $refVal.schema
        $it.schemaPath = ''
        $it.errSchemaPath = $schema2
        var $code = it.validate($it).replace(/validate\.schema/g, $refVal.code)
        out += ' ' + $code + ' '
        if ($breakOnError) {
          out += ' if (' + $nextValid + ') { '
        }
      } else {
        $async = $refVal.$async === true || (it.async && $refVal.$async !== false)
        $refCode = $refVal.code
      }
    }
    if ($refCode) {
      var $$outStack = $$outStack || []
      $$outStack.push(out)
      out = ''
      if (it.opts.passContext) {
        out += ' ' + $refCode + '.call(this, '
      } else {
        out += ' ' + $refCode + '( '
      }
      out += ' ' + $data + ", (dataPath || '')"
      if (it.errorPath != '""') {
        out += ' + ' + it.errorPath
      }
      var $parentData = $dataLvl ? 'data' + ($dataLvl - 1 || '') : 'parentData',
        $parentDataProperty = $dataLvl ? it.dataPathArr[$dataLvl] : 'parentDataProperty'
      out += ' , ' + $parentData + ' , ' + $parentDataProperty + ', rootData)  '
      var __callValidate = out
      out = $$outStack.pop()
      if ($async) {
        if (!it.async) throw new Error('async schema referenced by sync schema')
        if ($breakOnError) {
          out += ' var ' + $valid + '; '
        }
        out += ' try { await ' + __callValidate + '; '
        if ($breakOnError) {
          out += ' ' + $valid + ' = true; '
        }
        out +=
          ' } catch (e) { if (!(e instanceof ValidationError)) throw e; if (vErrors === null) vErrors = e.errors; else vErrors = vErrors.concat(e.errors); errors = vErrors.length; '
        if ($breakOnError) {
          out += ' ' + $valid + ' = false; '
        }
        out += ' } '
        if ($breakOnError) {
          out += ' if (' + $valid + ') { '
        }
      } else {
        out +=
          ' if (!' +
          __callValidate +
          ') { if (vErrors === null) vErrors = ' +
          $refCode +
          '.errors; else vErrors = vErrors.concat(' +
          $refCode +
          '.errors); errors = vErrors.length; } '
        if ($breakOnError) {
          out += ' else { '
        }
      }
    }
    return out
  }
  var allOf = function generate_allOf(it, $keyword, $ruleType) {
    var out = ' '
    var $schema2 = it.schema[$keyword]
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword)
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword
    var $breakOnError = !it.opts.allErrors
    var $it = it.util.copy(it)
    var $closingBraces = ''
    $it.level++
    var $nextValid = 'valid' + $it.level
    var $currentBaseId = $it.baseId,
      $allSchemasEmpty = true
    var arr1 = $schema2
    if (arr1) {
      var $sch,
        $i = -1,
        l1 = arr1.length - 1
      while ($i < l1) {
        $sch = arr1[($i += 1)]
        if (
          it.opts.strictKeywords
            ? (typeof $sch == 'object' && Object.keys($sch).length > 0) || $sch === false
            : it.util.schemaHasRules($sch, it.RULES.all)
        ) {
          $allSchemasEmpty = false
          $it.schema = $sch
          $it.schemaPath = $schemaPath + '[' + $i + ']'
          $it.errSchemaPath = $errSchemaPath + '/' + $i
          out += '  ' + it.validate($it) + ' '
          $it.baseId = $currentBaseId
          if ($breakOnError) {
            out += ' if (' + $nextValid + ') { '
            $closingBraces += '}'
          }
        }
      }
    }
    if ($breakOnError) {
      if ($allSchemasEmpty) {
        out += ' if (true) { '
      } else {
        out += ' ' + $closingBraces.slice(0, -1) + ' '
      }
    }
    return out
  }
  var anyOf = function generate_anyOf(it, $keyword, $ruleType) {
    var out = ' '
    var $lvl = it.level
    var $dataLvl = it.dataLevel
    var $schema2 = it.schema[$keyword]
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword)
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword
    var $breakOnError = !it.opts.allErrors
    var $data = 'data' + ($dataLvl || '')
    var $valid = 'valid' + $lvl
    var $errs = 'errs__' + $lvl
    var $it = it.util.copy(it)
    var $closingBraces = ''
    $it.level++
    var $nextValid = 'valid' + $it.level
    var $noEmptySchema = $schema2.every(function ($sch2) {
      return it.opts.strictKeywords
        ? (typeof $sch2 == 'object' && Object.keys($sch2).length > 0) || $sch2 === false
        : it.util.schemaHasRules($sch2, it.RULES.all)
    })
    if ($noEmptySchema) {
      var $currentBaseId = $it.baseId
      out += ' var ' + $errs + ' = errors; var ' + $valid + ' = false;  '
      var $wasComposite = it.compositeRule
      it.compositeRule = $it.compositeRule = true
      var arr1 = $schema2
      if (arr1) {
        var $sch,
          $i = -1,
          l1 = arr1.length - 1
        while ($i < l1) {
          $sch = arr1[($i += 1)]
          $it.schema = $sch
          $it.schemaPath = $schemaPath + '[' + $i + ']'
          $it.errSchemaPath = $errSchemaPath + '/' + $i
          out += '  ' + it.validate($it) + ' '
          $it.baseId = $currentBaseId
          out += ' ' + $valid + ' = ' + $valid + ' || ' + $nextValid + '; if (!' + $valid + ') { '
          $closingBraces += '}'
        }
      }
      it.compositeRule = $it.compositeRule = $wasComposite
      out += ' ' + $closingBraces + ' if (!' + $valid + ') {   var err =   '
      if (it.createErrors !== false) {
        out +=
          " { keyword: 'anyOf' , dataPath: (dataPath || '') + " +
          it.errorPath +
          ' , schemaPath: ' +
          it.util.toQuotedString($errSchemaPath) +
          ' , params: {} '
        if (it.opts.messages !== false) {
          out += " , message: 'should match some schema in anyOf' "
        }
        if (it.opts.verbose) {
          out +=
            ' , schema: validate.schema' +
            $schemaPath +
            ' , parentSchema: validate.schema' +
            it.schemaPath +
            ' , data: ' +
            $data +
            ' '
        }
        out += ' } '
      } else {
        out += ' {} '
      }
      out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; '
      if (!it.compositeRule && $breakOnError) {
        if (it.async) {
          out += ' throw new ValidationError(vErrors); '
        } else {
          out += ' validate.errors = vErrors; return false; '
        }
      }
      out +=
        ' } else {  errors = ' +
        $errs +
        '; if (vErrors !== null) { if (' +
        $errs +
        ') vErrors.length = ' +
        $errs +
        '; else vErrors = null; } '
      if (it.opts.allErrors) {
        out += ' } '
      }
    } else {
      if ($breakOnError) {
        out += ' if (true) { '
      }
    }
    return out
  }
  var comment = function generate_comment(it, $keyword, $ruleType) {
    var out = ' '
    var $schema2 = it.schema[$keyword]
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword
    !it.opts.allErrors
    var $comment = it.util.toQuotedString($schema2)
    if (it.opts.$comment === true) {
      out += ' console.log(' + $comment + ');'
    } else if (typeof it.opts.$comment == 'function') {
      out +=
        ' self._opts.$comment(' + $comment + ', ' + it.util.toQuotedString($errSchemaPath) + ', validate.root.schema);'
    }
    return out
  }
  var _const = function generate_const(it, $keyword, $ruleType) {
    var out = ' '
    var $lvl = it.level
    var $dataLvl = it.dataLevel
    var $schema2 = it.schema[$keyword]
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword)
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword
    var $breakOnError = !it.opts.allErrors
    var $data = 'data' + ($dataLvl || '')
    var $valid = 'valid' + $lvl
    var $isData = it.opts.$data && $schema2 && $schema2.$data
    if ($isData) {
      out += ' var schema' + $lvl + ' = ' + it.util.getData($schema2.$data, $dataLvl, it.dataPathArr) + '; '
    }
    if (!$isData) {
      out += ' var schema' + $lvl + ' = validate.schema' + $schemaPath + ';'
    }
    out += 'var ' + $valid + ' = equal(' + $data + ', schema' + $lvl + '); if (!' + $valid + ') {   '
    var $$outStack = $$outStack || []
    $$outStack.push(out)
    out = ''
    if (it.createErrors !== false) {
      out +=
        " { keyword: 'const' , dataPath: (dataPath || '') + " +
        it.errorPath +
        ' , schemaPath: ' +
        it.util.toQuotedString($errSchemaPath) +
        ' , params: { allowedValue: schema' +
        $lvl +
        ' } '
      if (it.opts.messages !== false) {
        out += " , message: 'should be equal to constant' "
      }
      if (it.opts.verbose) {
        out +=
          ' , schema: validate.schema' +
          $schemaPath +
          ' , parentSchema: validate.schema' +
          it.schemaPath +
          ' , data: ' +
          $data +
          ' '
      }
      out += ' } '
    } else {
      out += ' {} '
    }
    var __err = out
    out = $$outStack.pop()
    if (!it.compositeRule && $breakOnError) {
      if (it.async) {
        out += ' throw new ValidationError([' + __err + ']); '
      } else {
        out += ' validate.errors = [' + __err + ']; return false; '
      }
    } else {
      out += ' var err = ' + __err + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; '
    }
    out += ' }'
    if ($breakOnError) {
      out += ' else { '
    }
    return out
  }
  var contains = function generate_contains(it, $keyword, $ruleType) {
    var out = ' '
    var $lvl = it.level
    var $dataLvl = it.dataLevel
    var $schema2 = it.schema[$keyword]
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword)
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword
    var $breakOnError = !it.opts.allErrors
    var $data = 'data' + ($dataLvl || '')
    var $valid = 'valid' + $lvl
    var $errs = 'errs__' + $lvl
    var $it = it.util.copy(it)
    var $closingBraces = ''
    $it.level++
    var $nextValid = 'valid' + $it.level
    var $idx = 'i' + $lvl,
      $dataNxt = ($it.dataLevel = it.dataLevel + 1),
      $nextData = 'data' + $dataNxt,
      $currentBaseId = it.baseId,
      $nonEmptySchema = it.opts.strictKeywords
        ? (typeof $schema2 == 'object' && Object.keys($schema2).length > 0) || $schema2 === false
        : it.util.schemaHasRules($schema2, it.RULES.all)
    out += 'var ' + $errs + ' = errors;var ' + $valid + ';'
    if ($nonEmptySchema) {
      var $wasComposite = it.compositeRule
      it.compositeRule = $it.compositeRule = true
      $it.schema = $schema2
      $it.schemaPath = $schemaPath
      $it.errSchemaPath = $errSchemaPath
      out +=
        ' var ' +
        $nextValid +
        ' = false; for (var ' +
        $idx +
        ' = 0; ' +
        $idx +
        ' < ' +
        $data +
        '.length; ' +
        $idx +
        '++) { '
      $it.errorPath = it.util.getPathExpr(it.errorPath, $idx, it.opts.jsonPointers, true)
      var $passData = $data + '[' + $idx + ']'
      $it.dataPathArr[$dataNxt] = $idx
      var $code = it.validate($it)
      $it.baseId = $currentBaseId
      if (it.util.varOccurences($code, $nextData) < 2) {
        out += ' ' + it.util.varReplace($code, $nextData, $passData) + ' '
      } else {
        out += ' var ' + $nextData + ' = ' + $passData + '; ' + $code + ' '
      }
      out += ' if (' + $nextValid + ') break; }  '
      it.compositeRule = $it.compositeRule = $wasComposite
      out += ' ' + $closingBraces + ' if (!' + $nextValid + ') {'
    } else {
      out += ' if (' + $data + '.length == 0) {'
    }
    var $$outStack = $$outStack || []
    $$outStack.push(out)
    out = ''
    if (it.createErrors !== false) {
      out +=
        " { keyword: 'contains' , dataPath: (dataPath || '') + " +
        it.errorPath +
        ' , schemaPath: ' +
        it.util.toQuotedString($errSchemaPath) +
        ' , params: {} '
      if (it.opts.messages !== false) {
        out += " , message: 'should contain a valid item' "
      }
      if (it.opts.verbose) {
        out +=
          ' , schema: validate.schema' +
          $schemaPath +
          ' , parentSchema: validate.schema' +
          it.schemaPath +
          ' , data: ' +
          $data +
          ' '
      }
      out += ' } '
    } else {
      out += ' {} '
    }
    var __err = out
    out = $$outStack.pop()
    if (!it.compositeRule && $breakOnError) {
      if (it.async) {
        out += ' throw new ValidationError([' + __err + ']); '
      } else {
        out += ' validate.errors = [' + __err + ']; return false; '
      }
    } else {
      out += ' var err = ' + __err + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; '
    }
    out += ' } else { '
    if ($nonEmptySchema) {
      out +=
        '  errors = ' +
        $errs +
        '; if (vErrors !== null) { if (' +
        $errs +
        ') vErrors.length = ' +
        $errs +
        '; else vErrors = null; } '
    }
    if (it.opts.allErrors) {
      out += ' } '
    }
    return out
  }
  var dependencies = function generate_dependencies(it, $keyword, $ruleType) {
    var out = ' '
    var $lvl = it.level
    var $dataLvl = it.dataLevel
    var $schema2 = it.schema[$keyword]
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword)
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword
    var $breakOnError = !it.opts.allErrors
    var $data = 'data' + ($dataLvl || '')
    var $errs = 'errs__' + $lvl
    var $it = it.util.copy(it)
    var $closingBraces = ''
    $it.level++
    var $nextValid = 'valid' + $it.level
    var $schemaDeps = {},
      $propertyDeps = {},
      $ownProperties = it.opts.ownProperties
    for ($property in $schema2) {
      if ($property == '__proto__') continue
      var $sch = $schema2[$property]
      var $deps = Array.isArray($sch) ? $propertyDeps : $schemaDeps
      $deps[$property] = $sch
    }
    out += 'var ' + $errs + ' = errors;'
    var $currentErrorPath = it.errorPath
    out += 'var missing' + $lvl + ';'
    for (var $property in $propertyDeps) {
      $deps = $propertyDeps[$property]
      if ($deps.length) {
        out += ' if ( ' + $data + it.util.getProperty($property) + ' !== undefined '
        if ($ownProperties) {
          out += ' && Object.prototype.hasOwnProperty.call(' + $data + ", '" + it.util.escapeQuotes($property) + "') "
        }
        if ($breakOnError) {
          out += ' && ( '
          var arr1 = $deps
          if (arr1) {
            var $propertyKey,
              $i = -1,
              l1 = arr1.length - 1
            while ($i < l1) {
              $propertyKey = arr1[($i += 1)]
              if ($i) {
                out += ' || '
              }
              var $prop = it.util.getProperty($propertyKey),
                $useData = $data + $prop
              out += ' ( ( ' + $useData + ' === undefined '
              if ($ownProperties) {
                out +=
                  ' || ! Object.prototype.hasOwnProperty.call(' +
                  $data +
                  ", '" +
                  it.util.escapeQuotes($propertyKey) +
                  "') "
              }
              out +=
                ') && (missing' +
                $lvl +
                ' = ' +
                it.util.toQuotedString(it.opts.jsonPointers ? $propertyKey : $prop) +
                ') ) '
            }
          }
          out += ')) {  '
          var $propertyPath = 'missing' + $lvl,
            $missingProperty = "' + " + $propertyPath + " + '"
          if (it.opts._errorDataPathProperty) {
            it.errorPath = it.opts.jsonPointers
              ? it.util.getPathExpr($currentErrorPath, $propertyPath, true)
              : $currentErrorPath + ' + ' + $propertyPath
          }
          var $$outStack = $$outStack || []
          $$outStack.push(out)
          out = ''
          if (it.createErrors !== false) {
            out +=
              " { keyword: 'dependencies' , dataPath: (dataPath || '') + " +
              it.errorPath +
              ' , schemaPath: ' +
              it.util.toQuotedString($errSchemaPath) +
              " , params: { property: '" +
              it.util.escapeQuotes($property) +
              "', missingProperty: '" +
              $missingProperty +
              "', depsCount: " +
              $deps.length +
              ", deps: '" +
              it.util.escapeQuotes($deps.length == 1 ? $deps[0] : $deps.join(', ')) +
              "' } "
            if (it.opts.messages !== false) {
              out += " , message: 'should have "
              if ($deps.length == 1) {
                out += 'property ' + it.util.escapeQuotes($deps[0])
              } else {
                out += 'properties ' + it.util.escapeQuotes($deps.join(', '))
              }
              out += ' when property ' + it.util.escapeQuotes($property) + " is present' "
            }
            if (it.opts.verbose) {
              out +=
                ' , schema: validate.schema' +
                $schemaPath +
                ' , parentSchema: validate.schema' +
                it.schemaPath +
                ' , data: ' +
                $data +
                ' '
            }
            out += ' } '
          } else {
            out += ' {} '
          }
          var __err = out
          out = $$outStack.pop()
          if (!it.compositeRule && $breakOnError) {
            if (it.async) {
              out += ' throw new ValidationError([' + __err + ']); '
            } else {
              out += ' validate.errors = [' + __err + ']; return false; '
            }
          } else {
            out +=
              ' var err = ' + __err + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; '
          }
        } else {
          out += ' ) { '
          var arr2 = $deps
          if (arr2) {
            var $propertyKey,
              i2 = -1,
              l2 = arr2.length - 1
            while (i2 < l2) {
              $propertyKey = arr2[(i2 += 1)]
              var $prop = it.util.getProperty($propertyKey),
                $missingProperty = it.util.escapeQuotes($propertyKey),
                $useData = $data + $prop
              if (it.opts._errorDataPathProperty) {
                it.errorPath = it.util.getPath($currentErrorPath, $propertyKey, it.opts.jsonPointers)
              }
              out += ' if ( ' + $useData + ' === undefined '
              if ($ownProperties) {
                out +=
                  ' || ! Object.prototype.hasOwnProperty.call(' +
                  $data +
                  ", '" +
                  it.util.escapeQuotes($propertyKey) +
                  "') "
              }
              out += ') {  var err =   '
              if (it.createErrors !== false) {
                out +=
                  " { keyword: 'dependencies' , dataPath: (dataPath || '') + " +
                  it.errorPath +
                  ' , schemaPath: ' +
                  it.util.toQuotedString($errSchemaPath) +
                  " , params: { property: '" +
                  it.util.escapeQuotes($property) +
                  "', missingProperty: '" +
                  $missingProperty +
                  "', depsCount: " +
                  $deps.length +
                  ", deps: '" +
                  it.util.escapeQuotes($deps.length == 1 ? $deps[0] : $deps.join(', ')) +
                  "' } "
                if (it.opts.messages !== false) {
                  out += " , message: 'should have "
                  if ($deps.length == 1) {
                    out += 'property ' + it.util.escapeQuotes($deps[0])
                  } else {
                    out += 'properties ' + it.util.escapeQuotes($deps.join(', '))
                  }
                  out += ' when property ' + it.util.escapeQuotes($property) + " is present' "
                }
                if (it.opts.verbose) {
                  out +=
                    ' , schema: validate.schema' +
                    $schemaPath +
                    ' , parentSchema: validate.schema' +
                    it.schemaPath +
                    ' , data: ' +
                    $data +
                    ' '
                }
                out += ' } '
              } else {
                out += ' {} '
              }
              out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; } '
            }
          }
        }
        out += ' }   '
        if ($breakOnError) {
          $closingBraces += '}'
          out += ' else { '
        }
      }
    }
    it.errorPath = $currentErrorPath
    var $currentBaseId = $it.baseId
    for (var $property in $schemaDeps) {
      var $sch = $schemaDeps[$property]
      if (
        it.opts.strictKeywords
          ? (typeof $sch == 'object' && Object.keys($sch).length > 0) || $sch === false
          : it.util.schemaHasRules($sch, it.RULES.all)
      ) {
        out += ' ' + $nextValid + ' = true; if ( ' + $data + it.util.getProperty($property) + ' !== undefined '
        if ($ownProperties) {
          out += ' && Object.prototype.hasOwnProperty.call(' + $data + ", '" + it.util.escapeQuotes($property) + "') "
        }
        out += ') { '
        $it.schema = $sch
        $it.schemaPath = $schemaPath + it.util.getProperty($property)
        $it.errSchemaPath = $errSchemaPath + '/' + it.util.escapeFragment($property)
        out += '  ' + it.validate($it) + ' '
        $it.baseId = $currentBaseId
        out += ' }  '
        if ($breakOnError) {
          out += ' if (' + $nextValid + ') { '
          $closingBraces += '}'
        }
      }
    }
    if ($breakOnError) {
      out += '   ' + $closingBraces + ' if (' + $errs + ' == errors) {'
    }
    return out
  }
  var _enum = function generate_enum(it, $keyword, $ruleType) {
    var out = ' '
    var $lvl = it.level
    var $dataLvl = it.dataLevel
    var $schema2 = it.schema[$keyword]
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword)
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword
    var $breakOnError = !it.opts.allErrors
    var $data = 'data' + ($dataLvl || '')
    var $valid = 'valid' + $lvl
    var $isData = it.opts.$data && $schema2 && $schema2.$data
    if ($isData) {
      out += ' var schema' + $lvl + ' = ' + it.util.getData($schema2.$data, $dataLvl, it.dataPathArr) + '; '
    }
    var $i = 'i' + $lvl,
      $vSchema = 'schema' + $lvl
    if (!$isData) {
      out += ' var ' + $vSchema + ' = validate.schema' + $schemaPath + ';'
    }
    out += 'var ' + $valid + ';'
    if ($isData) {
      out +=
        ' if (schema' +
        $lvl +
        ' === undefined) ' +
        $valid +
        ' = true; else if (!Array.isArray(schema' +
        $lvl +
        ')) ' +
        $valid +
        ' = false; else {'
    }
    out +=
      '' +
      $valid +
      ' = false;for (var ' +
      $i +
      '=0; ' +
      $i +
      '<' +
      $vSchema +
      '.length; ' +
      $i +
      '++) if (equal(' +
      $data +
      ', ' +
      $vSchema +
      '[' +
      $i +
      '])) { ' +
      $valid +
      ' = true; break; }'
    if ($isData) {
      out += '  }  '
    }
    out += ' if (!' + $valid + ') {   '
    var $$outStack = $$outStack || []
    $$outStack.push(out)
    out = ''
    if (it.createErrors !== false) {
      out +=
        " { keyword: 'enum' , dataPath: (dataPath || '') + " +
        it.errorPath +
        ' , schemaPath: ' +
        it.util.toQuotedString($errSchemaPath) +
        ' , params: { allowedValues: schema' +
        $lvl +
        ' } '
      if (it.opts.messages !== false) {
        out += " , message: 'should be equal to one of the allowed values' "
      }
      if (it.opts.verbose) {
        out +=
          ' , schema: validate.schema' +
          $schemaPath +
          ' , parentSchema: validate.schema' +
          it.schemaPath +
          ' , data: ' +
          $data +
          ' '
      }
      out += ' } '
    } else {
      out += ' {} '
    }
    var __err = out
    out = $$outStack.pop()
    if (!it.compositeRule && $breakOnError) {
      if (it.async) {
        out += ' throw new ValidationError([' + __err + ']); '
      } else {
        out += ' validate.errors = [' + __err + ']; return false; '
      }
    } else {
      out += ' var err = ' + __err + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; '
    }
    out += ' }'
    if ($breakOnError) {
      out += ' else { '
    }
    return out
  }
  var format = function generate_format(it, $keyword, $ruleType) {
    var out = ' '
    var $lvl = it.level
    var $dataLvl = it.dataLevel
    var $schema2 = it.schema[$keyword]
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword)
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword
    var $breakOnError = !it.opts.allErrors
    var $data = 'data' + ($dataLvl || '')
    if (it.opts.format === false) {
      if ($breakOnError) {
        out += ' if (true) { '
      }
      return out
    }
    var $isData = it.opts.$data && $schema2 && $schema2.$data,
      $schemaValue
    if ($isData) {
      out += ' var schema' + $lvl + ' = ' + it.util.getData($schema2.$data, $dataLvl, it.dataPathArr) + '; '
      $schemaValue = 'schema' + $lvl
    } else {
      $schemaValue = $schema2
    }
    var $unknownFormats = it.opts.unknownFormats,
      $allowUnknown = Array.isArray($unknownFormats)
    if ($isData) {
      var $format = 'format' + $lvl,
        $isObject = 'isObject' + $lvl,
        $formatType = 'formatType' + $lvl
      out +=
        ' var ' +
        $format +
        ' = formats[' +
        $schemaValue +
        ']; var ' +
        $isObject +
        ' = typeof ' +
        $format +
        " == 'object' && !(" +
        $format +
        ' instanceof RegExp) && ' +
        $format +
        '.validate; var ' +
        $formatType +
        ' = ' +
        $isObject +
        ' && ' +
        $format +
        ".type || 'string'; if (" +
        $isObject +
        ') { '
      if (it.async) {
        out += ' var async' + $lvl + ' = ' + $format + '.async; '
      }
      out += ' ' + $format + ' = ' + $format + '.validate; } if (  '
      if ($isData) {
        out += ' (' + $schemaValue + ' !== undefined && typeof ' + $schemaValue + " != 'string') || "
      }
      out += ' ('
      if ($unknownFormats != 'ignore') {
        out += ' (' + $schemaValue + ' && !' + $format + ' '
        if ($allowUnknown) {
          out += ' && self._opts.unknownFormats.indexOf(' + $schemaValue + ') == -1 '
        }
        out += ') || '
      }
      out +=
        ' (' + $format + ' && ' + $formatType + " == '" + $ruleType + "' && !(typeof " + $format + " == 'function' ? "
      if (it.async) {
        out += ' (async' + $lvl + ' ? await ' + $format + '(' + $data + ') : ' + $format + '(' + $data + ')) '
      } else {
        out += ' ' + $format + '(' + $data + ') '
      }
      out += ' : ' + $format + '.test(' + $data + '))))) {'
    } else {
      var $format = it.formats[$schema2]
      if (!$format) {
        if ($unknownFormats == 'ignore') {
          it.logger.warn('unknown format "' + $schema2 + '" ignored in schema at path "' + it.errSchemaPath + '"')
          if ($breakOnError) {
            out += ' if (true) { '
          }
          return out
        } else if ($allowUnknown && $unknownFormats.indexOf($schema2) >= 0) {
          if ($breakOnError) {
            out += ' if (true) { '
          }
          return out
        } else {
          throw new Error('unknown format "' + $schema2 + '" is used in schema at path "' + it.errSchemaPath + '"')
        }
      }
      var $isObject = typeof $format == 'object' && !($format instanceof RegExp) && $format.validate
      var $formatType = ($isObject && $format.type) || 'string'
      if ($isObject) {
        var $async = $format.async === true
        $format = $format.validate
      }
      if ($formatType != $ruleType) {
        if ($breakOnError) {
          out += ' if (true) { '
        }
        return out
      }
      if ($async) {
        if (!it.async) throw new Error('async format in sync schema')
        var $formatRef = 'formats' + it.util.getProperty($schema2) + '.validate'
        out += ' if (!(await ' + $formatRef + '(' + $data + '))) { '
      } else {
        out += ' if (! '
        var $formatRef = 'formats' + it.util.getProperty($schema2)
        if ($isObject) $formatRef += '.validate'
        if (typeof $format == 'function') {
          out += ' ' + $formatRef + '(' + $data + ') '
        } else {
          out += ' ' + $formatRef + '.test(' + $data + ') '
        }
        out += ') { '
      }
    }
    var $$outStack = $$outStack || []
    $$outStack.push(out)
    out = ''
    if (it.createErrors !== false) {
      out +=
        " { keyword: 'format' , dataPath: (dataPath || '') + " +
        it.errorPath +
        ' , schemaPath: ' +
        it.util.toQuotedString($errSchemaPath) +
        ' , params: { format:  '
      if ($isData) {
        out += '' + $schemaValue
      } else {
        out += '' + it.util.toQuotedString($schema2)
      }
      out += '  } '
      if (it.opts.messages !== false) {
        out += ` , message: 'should match format "`
        if ($isData) {
          out += "' + " + $schemaValue + " + '"
        } else {
          out += '' + it.util.escapeQuotes($schema2)
        }
        out += `"' `
      }
      if (it.opts.verbose) {
        out += ' , schema:  '
        if ($isData) {
          out += 'validate.schema' + $schemaPath
        } else {
          out += '' + it.util.toQuotedString($schema2)
        }
        out += '         , parentSchema: validate.schema' + it.schemaPath + ' , data: ' + $data + ' '
      }
      out += ' } '
    } else {
      out += ' {} '
    }
    var __err = out
    out = $$outStack.pop()
    if (!it.compositeRule && $breakOnError) {
      if (it.async) {
        out += ' throw new ValidationError([' + __err + ']); '
      } else {
        out += ' validate.errors = [' + __err + ']; return false; '
      }
    } else {
      out += ' var err = ' + __err + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; '
    }
    out += ' } '
    if ($breakOnError) {
      out += ' else { '
    }
    return out
  }
  var _if = function generate_if(it, $keyword, $ruleType) {
    var out = ' '
    var $lvl = it.level
    var $dataLvl = it.dataLevel
    var $schema2 = it.schema[$keyword]
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword)
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword
    var $breakOnError = !it.opts.allErrors
    var $data = 'data' + ($dataLvl || '')
    var $valid = 'valid' + $lvl
    var $errs = 'errs__' + $lvl
    var $it = it.util.copy(it)
    $it.level++
    var $nextValid = 'valid' + $it.level
    var $thenSch = it.schema['then'],
      $elseSch = it.schema['else'],
      $thenPresent =
        $thenSch !== void 0 &&
        (it.opts.strictKeywords
          ? (typeof $thenSch == 'object' && Object.keys($thenSch).length > 0) || $thenSch === false
          : it.util.schemaHasRules($thenSch, it.RULES.all)),
      $elsePresent =
        $elseSch !== void 0 &&
        (it.opts.strictKeywords
          ? (typeof $elseSch == 'object' && Object.keys($elseSch).length > 0) || $elseSch === false
          : it.util.schemaHasRules($elseSch, it.RULES.all)),
      $currentBaseId = $it.baseId
    if ($thenPresent || $elsePresent) {
      var $ifClause
      $it.createErrors = false
      $it.schema = $schema2
      $it.schemaPath = $schemaPath
      $it.errSchemaPath = $errSchemaPath
      out += ' var ' + $errs + ' = errors; var ' + $valid + ' = true;  '
      var $wasComposite = it.compositeRule
      it.compositeRule = $it.compositeRule = true
      out += '  ' + it.validate($it) + ' '
      $it.baseId = $currentBaseId
      $it.createErrors = true
      out +=
        '  errors = ' +
        $errs +
        '; if (vErrors !== null) { if (' +
        $errs +
        ') vErrors.length = ' +
        $errs +
        '; else vErrors = null; }  '
      it.compositeRule = $it.compositeRule = $wasComposite
      if ($thenPresent) {
        out += ' if (' + $nextValid + ') {  '
        $it.schema = it.schema['then']
        $it.schemaPath = it.schemaPath + '.then'
        $it.errSchemaPath = it.errSchemaPath + '/then'
        out += '  ' + it.validate($it) + ' '
        $it.baseId = $currentBaseId
        out += ' ' + $valid + ' = ' + $nextValid + '; '
        if ($thenPresent && $elsePresent) {
          $ifClause = 'ifClause' + $lvl
          out += ' var ' + $ifClause + " = 'then'; "
        } else {
          $ifClause = "'then'"
        }
        out += ' } '
        if ($elsePresent) {
          out += ' else { '
        }
      } else {
        out += ' if (!' + $nextValid + ') { '
      }
      if ($elsePresent) {
        $it.schema = it.schema['else']
        $it.schemaPath = it.schemaPath + '.else'
        $it.errSchemaPath = it.errSchemaPath + '/else'
        out += '  ' + it.validate($it) + ' '
        $it.baseId = $currentBaseId
        out += ' ' + $valid + ' = ' + $nextValid + '; '
        if ($thenPresent && $elsePresent) {
          $ifClause = 'ifClause' + $lvl
          out += ' var ' + $ifClause + " = 'else'; "
        } else {
          $ifClause = "'else'"
        }
        out += ' } '
      }
      out += ' if (!' + $valid + ') {   var err =   '
      if (it.createErrors !== false) {
        out +=
          " { keyword: 'if' , dataPath: (dataPath || '') + " +
          it.errorPath +
          ' , schemaPath: ' +
          it.util.toQuotedString($errSchemaPath) +
          ' , params: { failingKeyword: ' +
          $ifClause +
          ' } '
        if (it.opts.messages !== false) {
          out += ` , message: 'should match "' + ` + $ifClause + ` + '" schema' `
        }
        if (it.opts.verbose) {
          out +=
            ' , schema: validate.schema' +
            $schemaPath +
            ' , parentSchema: validate.schema' +
            it.schemaPath +
            ' , data: ' +
            $data +
            ' '
        }
        out += ' } '
      } else {
        out += ' {} '
      }
      out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; '
      if (!it.compositeRule && $breakOnError) {
        if (it.async) {
          out += ' throw new ValidationError(vErrors); '
        } else {
          out += ' validate.errors = vErrors; return false; '
        }
      }
      out += ' }   '
      if ($breakOnError) {
        out += ' else { '
      }
    } else {
      if ($breakOnError) {
        out += ' if (true) { '
      }
    }
    return out
  }
  var items = function generate_items(it, $keyword, $ruleType) {
    var out = ' '
    var $lvl = it.level
    var $dataLvl = it.dataLevel
    var $schema2 = it.schema[$keyword]
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword)
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword
    var $breakOnError = !it.opts.allErrors
    var $data = 'data' + ($dataLvl || '')
    var $valid = 'valid' + $lvl
    var $errs = 'errs__' + $lvl
    var $it = it.util.copy(it)
    var $closingBraces = ''
    $it.level++
    var $nextValid = 'valid' + $it.level
    var $idx = 'i' + $lvl,
      $dataNxt = ($it.dataLevel = it.dataLevel + 1),
      $nextData = 'data' + $dataNxt,
      $currentBaseId = it.baseId
    out += 'var ' + $errs + ' = errors;var ' + $valid + ';'
    if (Array.isArray($schema2)) {
      var $additionalItems = it.schema.additionalItems
      if ($additionalItems === false) {
        out += ' ' + $valid + ' = ' + $data + '.length <= ' + $schema2.length + '; '
        var $currErrSchemaPath = $errSchemaPath
        $errSchemaPath = it.errSchemaPath + '/additionalItems'
        out += '  if (!' + $valid + ') {   '
        var $$outStack = $$outStack || []
        $$outStack.push(out)
        out = ''
        if (it.createErrors !== false) {
          out +=
            " { keyword: 'additionalItems' , dataPath: (dataPath || '') + " +
            it.errorPath +
            ' , schemaPath: ' +
            it.util.toQuotedString($errSchemaPath) +
            ' , params: { limit: ' +
            $schema2.length +
            ' } '
          if (it.opts.messages !== false) {
            out += " , message: 'should NOT have more than " + $schema2.length + " items' "
          }
          if (it.opts.verbose) {
            out += ' , schema: false , parentSchema: validate.schema' + it.schemaPath + ' , data: ' + $data + ' '
          }
          out += ' } '
        } else {
          out += ' {} '
        }
        var __err = out
        out = $$outStack.pop()
        if (!it.compositeRule && $breakOnError) {
          if (it.async) {
            out += ' throw new ValidationError([' + __err + ']); '
          } else {
            out += ' validate.errors = [' + __err + ']; return false; '
          }
        } else {
          out += ' var err = ' + __err + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; '
        }
        out += ' } '
        $errSchemaPath = $currErrSchemaPath
        if ($breakOnError) {
          $closingBraces += '}'
          out += ' else { '
        }
      }
      var arr1 = $schema2
      if (arr1) {
        var $sch,
          $i = -1,
          l1 = arr1.length - 1
        while ($i < l1) {
          $sch = arr1[($i += 1)]
          if (
            it.opts.strictKeywords
              ? (typeof $sch == 'object' && Object.keys($sch).length > 0) || $sch === false
              : it.util.schemaHasRules($sch, it.RULES.all)
          ) {
            out += ' ' + $nextValid + ' = true; if (' + $data + '.length > ' + $i + ') { '
            var $passData = $data + '[' + $i + ']'
            $it.schema = $sch
            $it.schemaPath = $schemaPath + '[' + $i + ']'
            $it.errSchemaPath = $errSchemaPath + '/' + $i
            $it.errorPath = it.util.getPathExpr(it.errorPath, $i, it.opts.jsonPointers, true)
            $it.dataPathArr[$dataNxt] = $i
            var $code = it.validate($it)
            $it.baseId = $currentBaseId
            if (it.util.varOccurences($code, $nextData) < 2) {
              out += ' ' + it.util.varReplace($code, $nextData, $passData) + ' '
            } else {
              out += ' var ' + $nextData + ' = ' + $passData + '; ' + $code + ' '
            }
            out += ' }  '
            if ($breakOnError) {
              out += ' if (' + $nextValid + ') { '
              $closingBraces += '}'
            }
          }
        }
      }
      if (
        typeof $additionalItems == 'object' &&
        (it.opts.strictKeywords
          ? (typeof $additionalItems == 'object' && Object.keys($additionalItems).length > 0) ||
            $additionalItems === false
          : it.util.schemaHasRules($additionalItems, it.RULES.all))
      ) {
        $it.schema = $additionalItems
        $it.schemaPath = it.schemaPath + '.additionalItems'
        $it.errSchemaPath = it.errSchemaPath + '/additionalItems'
        out +=
          ' ' +
          $nextValid +
          ' = true; if (' +
          $data +
          '.length > ' +
          $schema2.length +
          ') {  for (var ' +
          $idx +
          ' = ' +
          $schema2.length +
          '; ' +
          $idx +
          ' < ' +
          $data +
          '.length; ' +
          $idx +
          '++) { '
        $it.errorPath = it.util.getPathExpr(it.errorPath, $idx, it.opts.jsonPointers, true)
        var $passData = $data + '[' + $idx + ']'
        $it.dataPathArr[$dataNxt] = $idx
        var $code = it.validate($it)
        $it.baseId = $currentBaseId
        if (it.util.varOccurences($code, $nextData) < 2) {
          out += ' ' + it.util.varReplace($code, $nextData, $passData) + ' '
        } else {
          out += ' var ' + $nextData + ' = ' + $passData + '; ' + $code + ' '
        }
        if ($breakOnError) {
          out += ' if (!' + $nextValid + ') break; '
        }
        out += ' } }  '
        if ($breakOnError) {
          out += ' if (' + $nextValid + ') { '
          $closingBraces += '}'
        }
      }
    } else if (
      it.opts.strictKeywords
        ? (typeof $schema2 == 'object' && Object.keys($schema2).length > 0) || $schema2 === false
        : it.util.schemaHasRules($schema2, it.RULES.all)
    ) {
      $it.schema = $schema2
      $it.schemaPath = $schemaPath
      $it.errSchemaPath = $errSchemaPath
      out += '  for (var ' + $idx + ' = 0; ' + $idx + ' < ' + $data + '.length; ' + $idx + '++) { '
      $it.errorPath = it.util.getPathExpr(it.errorPath, $idx, it.opts.jsonPointers, true)
      var $passData = $data + '[' + $idx + ']'
      $it.dataPathArr[$dataNxt] = $idx
      var $code = it.validate($it)
      $it.baseId = $currentBaseId
      if (it.util.varOccurences($code, $nextData) < 2) {
        out += ' ' + it.util.varReplace($code, $nextData, $passData) + ' '
      } else {
        out += ' var ' + $nextData + ' = ' + $passData + '; ' + $code + ' '
      }
      if ($breakOnError) {
        out += ' if (!' + $nextValid + ') break; '
      }
      out += ' }'
    }
    if ($breakOnError) {
      out += ' ' + $closingBraces + ' if (' + $errs + ' == errors) {'
    }
    return out
  }
  var _limit = function generate__limit(it, $keyword, $ruleType) {
    var out = ' '
    var $lvl = it.level
    var $dataLvl = it.dataLevel
    var $schema2 = it.schema[$keyword]
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword)
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword
    var $breakOnError = !it.opts.allErrors
    var $errorKeyword
    var $data = 'data' + ($dataLvl || '')
    var $isData = it.opts.$data && $schema2 && $schema2.$data,
      $schemaValue
    if ($isData) {
      out += ' var schema' + $lvl + ' = ' + it.util.getData($schema2.$data, $dataLvl, it.dataPathArr) + '; '
      $schemaValue = 'schema' + $lvl
    } else {
      $schemaValue = $schema2
    }
    var $isMax = $keyword == 'maximum',
      $exclusiveKeyword = $isMax ? 'exclusiveMaximum' : 'exclusiveMinimum',
      $schemaExcl = it.schema[$exclusiveKeyword],
      $isDataExcl = it.opts.$data && $schemaExcl && $schemaExcl.$data,
      $op = $isMax ? '<' : '>',
      $notOp = $isMax ? '>' : '<',
      $errorKeyword = void 0
    if (!($isData || typeof $schema2 == 'number' || $schema2 === void 0)) {
      throw new Error($keyword + ' must be number')
    }
    if (!($isDataExcl || $schemaExcl === void 0 || typeof $schemaExcl == 'number' || typeof $schemaExcl == 'boolean')) {
      throw new Error($exclusiveKeyword + ' must be number or boolean')
    }
    if ($isDataExcl) {
      var $schemaValueExcl = it.util.getData($schemaExcl.$data, $dataLvl, it.dataPathArr),
        $exclusive = 'exclusive' + $lvl,
        $exclType = 'exclType' + $lvl,
        $exclIsNumber = 'exclIsNumber' + $lvl,
        $opExpr = 'op' + $lvl,
        $opStr = "' + " + $opExpr + " + '"
      out += ' var schemaExcl' + $lvl + ' = ' + $schemaValueExcl + '; '
      $schemaValueExcl = 'schemaExcl' + $lvl
      out +=
        ' var ' +
        $exclusive +
        '; var ' +
        $exclType +
        ' = typeof ' +
        $schemaValueExcl +
        '; if (' +
        $exclType +
        " != 'boolean' && " +
        $exclType +
        " != 'undefined' && " +
        $exclType +
        " != 'number') { "
      var $errorKeyword = $exclusiveKeyword
      var $$outStack = $$outStack || []
      $$outStack.push(out)
      out = ''
      if (it.createErrors !== false) {
        out +=
          " { keyword: '" +
          ($errorKeyword || '_exclusiveLimit') +
          "' , dataPath: (dataPath || '') + " +
          it.errorPath +
          ' , schemaPath: ' +
          it.util.toQuotedString($errSchemaPath) +
          ' , params: {} '
        if (it.opts.messages !== false) {
          out += " , message: '" + $exclusiveKeyword + " should be boolean' "
        }
        if (it.opts.verbose) {
          out +=
            ' , schema: validate.schema' +
            $schemaPath +
            ' , parentSchema: validate.schema' +
            it.schemaPath +
            ' , data: ' +
            $data +
            ' '
        }
        out += ' } '
      } else {
        out += ' {} '
      }
      var __err = out
      out = $$outStack.pop()
      if (!it.compositeRule && $breakOnError) {
        if (it.async) {
          out += ' throw new ValidationError([' + __err + ']); '
        } else {
          out += ' validate.errors = [' + __err + ']; return false; '
        }
      } else {
        out += ' var err = ' + __err + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; '
      }
      out += ' } else if ( '
      if ($isData) {
        out += ' (' + $schemaValue + ' !== undefined && typeof ' + $schemaValue + " != 'number') || "
      }
      out +=
        ' ' +
        $exclType +
        " == 'number' ? ( (" +
        $exclusive +
        ' = ' +
        $schemaValue +
        ' === undefined || ' +
        $schemaValueExcl +
        ' ' +
        $op +
        '= ' +
        $schemaValue +
        ') ? ' +
        $data +
        ' ' +
        $notOp +
        '= ' +
        $schemaValueExcl +
        ' : ' +
        $data +
        ' ' +
        $notOp +
        ' ' +
        $schemaValue +
        ' ) : ( (' +
        $exclusive +
        ' = ' +
        $schemaValueExcl +
        ' === true) ? ' +
        $data +
        ' ' +
        $notOp +
        '= ' +
        $schemaValue +
        ' : ' +
        $data +
        ' ' +
        $notOp +
        ' ' +
        $schemaValue +
        ' ) || ' +
        $data +
        ' !== ' +
        $data +
        ') { var op' +
        $lvl +
        ' = ' +
        $exclusive +
        " ? '" +
        $op +
        "' : '" +
        $op +
        "='; "
      if ($schema2 === void 0) {
        $errorKeyword = $exclusiveKeyword
        $errSchemaPath = it.errSchemaPath + '/' + $exclusiveKeyword
        $schemaValue = $schemaValueExcl
        $isData = $isDataExcl
      }
    } else {
      var $exclIsNumber = typeof $schemaExcl == 'number',
        $opStr = $op
      if ($exclIsNumber && $isData) {
        var $opExpr = "'" + $opStr + "'"
        out += ' if ( '
        if ($isData) {
          out += ' (' + $schemaValue + ' !== undefined && typeof ' + $schemaValue + " != 'number') || "
        }
        out +=
          ' ( ' +
          $schemaValue +
          ' === undefined || ' +
          $schemaExcl +
          ' ' +
          $op +
          '= ' +
          $schemaValue +
          ' ? ' +
          $data +
          ' ' +
          $notOp +
          '= ' +
          $schemaExcl +
          ' : ' +
          $data +
          ' ' +
          $notOp +
          ' ' +
          $schemaValue +
          ' ) || ' +
          $data +
          ' !== ' +
          $data +
          ') { '
      } else {
        if ($exclIsNumber && $schema2 === void 0) {
          $exclusive = true
          $errorKeyword = $exclusiveKeyword
          $errSchemaPath = it.errSchemaPath + '/' + $exclusiveKeyword
          $schemaValue = $schemaExcl
          $notOp += '='
        } else {
          if ($exclIsNumber) $schemaValue = Math[$isMax ? 'min' : 'max']($schemaExcl, $schema2)
          if ($schemaExcl === ($exclIsNumber ? $schemaValue : true)) {
            $exclusive = true
            $errorKeyword = $exclusiveKeyword
            $errSchemaPath = it.errSchemaPath + '/' + $exclusiveKeyword
            $notOp += '='
          } else {
            $exclusive = false
            $opStr += '='
          }
        }
        var $opExpr = "'" + $opStr + "'"
        out += ' if ( '
        if ($isData) {
          out += ' (' + $schemaValue + ' !== undefined && typeof ' + $schemaValue + " != 'number') || "
        }
        out += ' ' + $data + ' ' + $notOp + ' ' + $schemaValue + ' || ' + $data + ' !== ' + $data + ') { '
      }
    }
    $errorKeyword = $errorKeyword || $keyword
    var $$outStack = $$outStack || []
    $$outStack.push(out)
    out = ''
    if (it.createErrors !== false) {
      out +=
        " { keyword: '" +
        ($errorKeyword || '_limit') +
        "' , dataPath: (dataPath || '') + " +
        it.errorPath +
        ' , schemaPath: ' +
        it.util.toQuotedString($errSchemaPath) +
        ' , params: { comparison: ' +
        $opExpr +
        ', limit: ' +
        $schemaValue +
        ', exclusive: ' +
        $exclusive +
        ' } '
      if (it.opts.messages !== false) {
        out += " , message: 'should be " + $opStr + ' '
        if ($isData) {
          out += "' + " + $schemaValue
        } else {
          out += '' + $schemaValue + "'"
        }
      }
      if (it.opts.verbose) {
        out += ' , schema:  '
        if ($isData) {
          out += 'validate.schema' + $schemaPath
        } else {
          out += '' + $schema2
        }
        out += '         , parentSchema: validate.schema' + it.schemaPath + ' , data: ' + $data + ' '
      }
      out += ' } '
    } else {
      out += ' {} '
    }
    var __err = out
    out = $$outStack.pop()
    if (!it.compositeRule && $breakOnError) {
      if (it.async) {
        out += ' throw new ValidationError([' + __err + ']); '
      } else {
        out += ' validate.errors = [' + __err + ']; return false; '
      }
    } else {
      out += ' var err = ' + __err + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; '
    }
    out += ' } '
    if ($breakOnError) {
      out += ' else { '
    }
    return out
  }
  var _limitItems = function generate__limitItems(it, $keyword, $ruleType) {
    var out = ' '
    var $lvl = it.level
    var $dataLvl = it.dataLevel
    var $schema2 = it.schema[$keyword]
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword)
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword
    var $breakOnError = !it.opts.allErrors
    var $errorKeyword
    var $data = 'data' + ($dataLvl || '')
    var $isData = it.opts.$data && $schema2 && $schema2.$data,
      $schemaValue
    if ($isData) {
      out += ' var schema' + $lvl + ' = ' + it.util.getData($schema2.$data, $dataLvl, it.dataPathArr) + '; '
      $schemaValue = 'schema' + $lvl
    } else {
      $schemaValue = $schema2
    }
    if (!($isData || typeof $schema2 == 'number')) {
      throw new Error($keyword + ' must be number')
    }
    var $op = $keyword == 'maxItems' ? '>' : '<'
    out += 'if ( '
    if ($isData) {
      out += ' (' + $schemaValue + ' !== undefined && typeof ' + $schemaValue + " != 'number') || "
    }
    out += ' ' + $data + '.length ' + $op + ' ' + $schemaValue + ') { '
    var $errorKeyword = $keyword
    var $$outStack = $$outStack || []
    $$outStack.push(out)
    out = ''
    if (it.createErrors !== false) {
      out +=
        " { keyword: '" +
        ($errorKeyword || '_limitItems') +
        "' , dataPath: (dataPath || '') + " +
        it.errorPath +
        ' , schemaPath: ' +
        it.util.toQuotedString($errSchemaPath) +
        ' , params: { limit: ' +
        $schemaValue +
        ' } '
      if (it.opts.messages !== false) {
        out += " , message: 'should NOT have "
        if ($keyword == 'maxItems') {
          out += 'more'
        } else {
          out += 'fewer'
        }
        out += ' than '
        if ($isData) {
          out += "' + " + $schemaValue + " + '"
        } else {
          out += '' + $schema2
        }
        out += " items' "
      }
      if (it.opts.verbose) {
        out += ' , schema:  '
        if ($isData) {
          out += 'validate.schema' + $schemaPath
        } else {
          out += '' + $schema2
        }
        out += '         , parentSchema: validate.schema' + it.schemaPath + ' , data: ' + $data + ' '
      }
      out += ' } '
    } else {
      out += ' {} '
    }
    var __err = out
    out = $$outStack.pop()
    if (!it.compositeRule && $breakOnError) {
      if (it.async) {
        out += ' throw new ValidationError([' + __err + ']); '
      } else {
        out += ' validate.errors = [' + __err + ']; return false; '
      }
    } else {
      out += ' var err = ' + __err + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; '
    }
    out += '} '
    if ($breakOnError) {
      out += ' else { '
    }
    return out
  }
  var _limitLength = function generate__limitLength(it, $keyword, $ruleType) {
    var out = ' '
    var $lvl = it.level
    var $dataLvl = it.dataLevel
    var $schema2 = it.schema[$keyword]
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword)
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword
    var $breakOnError = !it.opts.allErrors
    var $errorKeyword
    var $data = 'data' + ($dataLvl || '')
    var $isData = it.opts.$data && $schema2 && $schema2.$data,
      $schemaValue
    if ($isData) {
      out += ' var schema' + $lvl + ' = ' + it.util.getData($schema2.$data, $dataLvl, it.dataPathArr) + '; '
      $schemaValue = 'schema' + $lvl
    } else {
      $schemaValue = $schema2
    }
    if (!($isData || typeof $schema2 == 'number')) {
      throw new Error($keyword + ' must be number')
    }
    var $op = $keyword == 'maxLength' ? '>' : '<'
    out += 'if ( '
    if ($isData) {
      out += ' (' + $schemaValue + ' !== undefined && typeof ' + $schemaValue + " != 'number') || "
    }
    if (it.opts.unicode === false) {
      out += ' ' + $data + '.length '
    } else {
      out += ' ucs2length(' + $data + ') '
    }
    out += ' ' + $op + ' ' + $schemaValue + ') { '
    var $errorKeyword = $keyword
    var $$outStack = $$outStack || []
    $$outStack.push(out)
    out = ''
    if (it.createErrors !== false) {
      out +=
        " { keyword: '" +
        ($errorKeyword || '_limitLength') +
        "' , dataPath: (dataPath || '') + " +
        it.errorPath +
        ' , schemaPath: ' +
        it.util.toQuotedString($errSchemaPath) +
        ' , params: { limit: ' +
        $schemaValue +
        ' } '
      if (it.opts.messages !== false) {
        out += " , message: 'should NOT be "
        if ($keyword == 'maxLength') {
          out += 'longer'
        } else {
          out += 'shorter'
        }
        out += ' than '
        if ($isData) {
          out += "' + " + $schemaValue + " + '"
        } else {
          out += '' + $schema2
        }
        out += " characters' "
      }
      if (it.opts.verbose) {
        out += ' , schema:  '
        if ($isData) {
          out += 'validate.schema' + $schemaPath
        } else {
          out += '' + $schema2
        }
        out += '         , parentSchema: validate.schema' + it.schemaPath + ' , data: ' + $data + ' '
      }
      out += ' } '
    } else {
      out += ' {} '
    }
    var __err = out
    out = $$outStack.pop()
    if (!it.compositeRule && $breakOnError) {
      if (it.async) {
        out += ' throw new ValidationError([' + __err + ']); '
      } else {
        out += ' validate.errors = [' + __err + ']; return false; '
      }
    } else {
      out += ' var err = ' + __err + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; '
    }
    out += '} '
    if ($breakOnError) {
      out += ' else { '
    }
    return out
  }
  var _limitProperties = function generate__limitProperties(it, $keyword, $ruleType) {
    var out = ' '
    var $lvl = it.level
    var $dataLvl = it.dataLevel
    var $schema2 = it.schema[$keyword]
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword)
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword
    var $breakOnError = !it.opts.allErrors
    var $errorKeyword
    var $data = 'data' + ($dataLvl || '')
    var $isData = it.opts.$data && $schema2 && $schema2.$data,
      $schemaValue
    if ($isData) {
      out += ' var schema' + $lvl + ' = ' + it.util.getData($schema2.$data, $dataLvl, it.dataPathArr) + '; '
      $schemaValue = 'schema' + $lvl
    } else {
      $schemaValue = $schema2
    }
    if (!($isData || typeof $schema2 == 'number')) {
      throw new Error($keyword + ' must be number')
    }
    var $op = $keyword == 'maxProperties' ? '>' : '<'
    out += 'if ( '
    if ($isData) {
      out += ' (' + $schemaValue + ' !== undefined && typeof ' + $schemaValue + " != 'number') || "
    }
    out += ' Object.keys(' + $data + ').length ' + $op + ' ' + $schemaValue + ') { '
    var $errorKeyword = $keyword
    var $$outStack = $$outStack || []
    $$outStack.push(out)
    out = ''
    if (it.createErrors !== false) {
      out +=
        " { keyword: '" +
        ($errorKeyword || '_limitProperties') +
        "' , dataPath: (dataPath || '') + " +
        it.errorPath +
        ' , schemaPath: ' +
        it.util.toQuotedString($errSchemaPath) +
        ' , params: { limit: ' +
        $schemaValue +
        ' } '
      if (it.opts.messages !== false) {
        out += " , message: 'should NOT have "
        if ($keyword == 'maxProperties') {
          out += 'more'
        } else {
          out += 'fewer'
        }
        out += ' than '
        if ($isData) {
          out += "' + " + $schemaValue + " + '"
        } else {
          out += '' + $schema2
        }
        out += " properties' "
      }
      if (it.opts.verbose) {
        out += ' , schema:  '
        if ($isData) {
          out += 'validate.schema' + $schemaPath
        } else {
          out += '' + $schema2
        }
        out += '         , parentSchema: validate.schema' + it.schemaPath + ' , data: ' + $data + ' '
      }
      out += ' } '
    } else {
      out += ' {} '
    }
    var __err = out
    out = $$outStack.pop()
    if (!it.compositeRule && $breakOnError) {
      if (it.async) {
        out += ' throw new ValidationError([' + __err + ']); '
      } else {
        out += ' validate.errors = [' + __err + ']; return false; '
      }
    } else {
      out += ' var err = ' + __err + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; '
    }
    out += '} '
    if ($breakOnError) {
      out += ' else { '
    }
    return out
  }
  var multipleOf = function generate_multipleOf(it, $keyword, $ruleType) {
    var out = ' '
    var $lvl = it.level
    var $dataLvl = it.dataLevel
    var $schema2 = it.schema[$keyword]
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword)
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword
    var $breakOnError = !it.opts.allErrors
    var $data = 'data' + ($dataLvl || '')
    var $isData = it.opts.$data && $schema2 && $schema2.$data,
      $schemaValue
    if ($isData) {
      out += ' var schema' + $lvl + ' = ' + it.util.getData($schema2.$data, $dataLvl, it.dataPathArr) + '; '
      $schemaValue = 'schema' + $lvl
    } else {
      $schemaValue = $schema2
    }
    if (!($isData || typeof $schema2 == 'number')) {
      throw new Error($keyword + ' must be number')
    }
    out += 'var division' + $lvl + ';if ('
    if ($isData) {
      out += ' ' + $schemaValue + ' !== undefined && ( typeof ' + $schemaValue + " != 'number' || "
    }
    out += ' (division' + $lvl + ' = ' + $data + ' / ' + $schemaValue + ', '
    if (it.opts.multipleOfPrecision) {
      out +=
        ' Math.abs(Math.round(division' + $lvl + ') - division' + $lvl + ') > 1e-' + it.opts.multipleOfPrecision + ' '
    } else {
      out += ' division' + $lvl + ' !== parseInt(division' + $lvl + ') '
    }
    out += ' ) '
    if ($isData) {
      out += '  )  '
    }
    out += ' ) {   '
    var $$outStack = $$outStack || []
    $$outStack.push(out)
    out = ''
    if (it.createErrors !== false) {
      out +=
        " { keyword: 'multipleOf' , dataPath: (dataPath || '') + " +
        it.errorPath +
        ' , schemaPath: ' +
        it.util.toQuotedString($errSchemaPath) +
        ' , params: { multipleOf: ' +
        $schemaValue +
        ' } '
      if (it.opts.messages !== false) {
        out += " , message: 'should be multiple of "
        if ($isData) {
          out += "' + " + $schemaValue
        } else {
          out += '' + $schemaValue + "'"
        }
      }
      if (it.opts.verbose) {
        out += ' , schema:  '
        if ($isData) {
          out += 'validate.schema' + $schemaPath
        } else {
          out += '' + $schema2
        }
        out += '         , parentSchema: validate.schema' + it.schemaPath + ' , data: ' + $data + ' '
      }
      out += ' } '
    } else {
      out += ' {} '
    }
    var __err = out
    out = $$outStack.pop()
    if (!it.compositeRule && $breakOnError) {
      if (it.async) {
        out += ' throw new ValidationError([' + __err + ']); '
      } else {
        out += ' validate.errors = [' + __err + ']; return false; '
      }
    } else {
      out += ' var err = ' + __err + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; '
    }
    out += '} '
    if ($breakOnError) {
      out += ' else { '
    }
    return out
  }
  var not = function generate_not(it, $keyword, $ruleType) {
    var out = ' '
    var $lvl = it.level
    var $dataLvl = it.dataLevel
    var $schema2 = it.schema[$keyword]
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword)
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword
    var $breakOnError = !it.opts.allErrors
    var $data = 'data' + ($dataLvl || '')
    var $errs = 'errs__' + $lvl
    var $it = it.util.copy(it)
    $it.level++
    var $nextValid = 'valid' + $it.level
    if (
      it.opts.strictKeywords
        ? (typeof $schema2 == 'object' && Object.keys($schema2).length > 0) || $schema2 === false
        : it.util.schemaHasRules($schema2, it.RULES.all)
    ) {
      $it.schema = $schema2
      $it.schemaPath = $schemaPath
      $it.errSchemaPath = $errSchemaPath
      out += ' var ' + $errs + ' = errors;  '
      var $wasComposite = it.compositeRule
      it.compositeRule = $it.compositeRule = true
      $it.createErrors = false
      var $allErrorsOption
      if ($it.opts.allErrors) {
        $allErrorsOption = $it.opts.allErrors
        $it.opts.allErrors = false
      }
      out += ' ' + it.validate($it) + ' '
      $it.createErrors = true
      if ($allErrorsOption) $it.opts.allErrors = $allErrorsOption
      it.compositeRule = $it.compositeRule = $wasComposite
      out += ' if (' + $nextValid + ') {   '
      var $$outStack = $$outStack || []
      $$outStack.push(out)
      out = ''
      if (it.createErrors !== false) {
        out +=
          " { keyword: 'not' , dataPath: (dataPath || '') + " +
          it.errorPath +
          ' , schemaPath: ' +
          it.util.toQuotedString($errSchemaPath) +
          ' , params: {} '
        if (it.opts.messages !== false) {
          out += " , message: 'should NOT be valid' "
        }
        if (it.opts.verbose) {
          out +=
            ' , schema: validate.schema' +
            $schemaPath +
            ' , parentSchema: validate.schema' +
            it.schemaPath +
            ' , data: ' +
            $data +
            ' '
        }
        out += ' } '
      } else {
        out += ' {} '
      }
      var __err = out
      out = $$outStack.pop()
      if (!it.compositeRule && $breakOnError) {
        if (it.async) {
          out += ' throw new ValidationError([' + __err + ']); '
        } else {
          out += ' validate.errors = [' + __err + ']; return false; '
        }
      } else {
        out += ' var err = ' + __err + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; '
      }
      out +=
        ' } else {  errors = ' +
        $errs +
        '; if (vErrors !== null) { if (' +
        $errs +
        ') vErrors.length = ' +
        $errs +
        '; else vErrors = null; } '
      if (it.opts.allErrors) {
        out += ' } '
      }
    } else {
      out += '  var err =   '
      if (it.createErrors !== false) {
        out +=
          " { keyword: 'not' , dataPath: (dataPath || '') + " +
          it.errorPath +
          ' , schemaPath: ' +
          it.util.toQuotedString($errSchemaPath) +
          ' , params: {} '
        if (it.opts.messages !== false) {
          out += " , message: 'should NOT be valid' "
        }
        if (it.opts.verbose) {
          out +=
            ' , schema: validate.schema' +
            $schemaPath +
            ' , parentSchema: validate.schema' +
            it.schemaPath +
            ' , data: ' +
            $data +
            ' '
        }
        out += ' } '
      } else {
        out += ' {} '
      }
      out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; '
      if ($breakOnError) {
        out += ' if (false) { '
      }
    }
    return out
  }
  var oneOf = function generate_oneOf(it, $keyword, $ruleType) {
    var out = ' '
    var $lvl = it.level
    var $dataLvl = it.dataLevel
    var $schema2 = it.schema[$keyword]
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword)
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword
    var $breakOnError = !it.opts.allErrors
    var $data = 'data' + ($dataLvl || '')
    var $valid = 'valid' + $lvl
    var $errs = 'errs__' + $lvl
    var $it = it.util.copy(it)
    var $closingBraces = ''
    $it.level++
    var $nextValid = 'valid' + $it.level
    var $currentBaseId = $it.baseId,
      $prevValid = 'prevValid' + $lvl,
      $passingSchemas = 'passingSchemas' + $lvl
    out +=
      'var ' +
      $errs +
      ' = errors , ' +
      $prevValid +
      ' = false , ' +
      $valid +
      ' = false , ' +
      $passingSchemas +
      ' = null; '
    var $wasComposite = it.compositeRule
    it.compositeRule = $it.compositeRule = true
    var arr1 = $schema2
    if (arr1) {
      var $sch,
        $i = -1,
        l1 = arr1.length - 1
      while ($i < l1) {
        $sch = arr1[($i += 1)]
        if (
          it.opts.strictKeywords
            ? (typeof $sch == 'object' && Object.keys($sch).length > 0) || $sch === false
            : it.util.schemaHasRules($sch, it.RULES.all)
        ) {
          $it.schema = $sch
          $it.schemaPath = $schemaPath + '[' + $i + ']'
          $it.errSchemaPath = $errSchemaPath + '/' + $i
          out += '  ' + it.validate($it) + ' '
          $it.baseId = $currentBaseId
        } else {
          out += ' var ' + $nextValid + ' = true; '
        }
        if ($i) {
          out +=
            ' if (' +
            $nextValid +
            ' && ' +
            $prevValid +
            ') { ' +
            $valid +
            ' = false; ' +
            $passingSchemas +
            ' = [' +
            $passingSchemas +
            ', ' +
            $i +
            ']; } else { '
          $closingBraces += '}'
        }
        out +=
          ' if (' +
          $nextValid +
          ') { ' +
          $valid +
          ' = ' +
          $prevValid +
          ' = true; ' +
          $passingSchemas +
          ' = ' +
          $i +
          '; }'
      }
    }
    it.compositeRule = $it.compositeRule = $wasComposite
    out += '' + $closingBraces + 'if (!' + $valid + ') {   var err =   '
    if (it.createErrors !== false) {
      out +=
        " { keyword: 'oneOf' , dataPath: (dataPath || '') + " +
        it.errorPath +
        ' , schemaPath: ' +
        it.util.toQuotedString($errSchemaPath) +
        ' , params: { passingSchemas: ' +
        $passingSchemas +
        ' } '
      if (it.opts.messages !== false) {
        out += " , message: 'should match exactly one schema in oneOf' "
      }
      if (it.opts.verbose) {
        out +=
          ' , schema: validate.schema' +
          $schemaPath +
          ' , parentSchema: validate.schema' +
          it.schemaPath +
          ' , data: ' +
          $data +
          ' '
      }
      out += ' } '
    } else {
      out += ' {} '
    }
    out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; '
    if (!it.compositeRule && $breakOnError) {
      if (it.async) {
        out += ' throw new ValidationError(vErrors); '
      } else {
        out += ' validate.errors = vErrors; return false; '
      }
    }
    out +=
      '} else {  errors = ' +
      $errs +
      '; if (vErrors !== null) { if (' +
      $errs +
      ') vErrors.length = ' +
      $errs +
      '; else vErrors = null; }'
    if (it.opts.allErrors) {
      out += ' } '
    }
    return out
  }
  var pattern = function generate_pattern(it, $keyword, $ruleType) {
    var out = ' '
    var $lvl = it.level
    var $dataLvl = it.dataLevel
    var $schema2 = it.schema[$keyword]
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword)
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword
    var $breakOnError = !it.opts.allErrors
    var $data = 'data' + ($dataLvl || '')
    var $isData = it.opts.$data && $schema2 && $schema2.$data,
      $schemaValue
    if ($isData) {
      out += ' var schema' + $lvl + ' = ' + it.util.getData($schema2.$data, $dataLvl, it.dataPathArr) + '; '
      $schemaValue = 'schema' + $lvl
    } else {
      $schemaValue = $schema2
    }
    var $regexp = $isData ? '(new RegExp(' + $schemaValue + '))' : it.usePattern($schema2)
    out += 'if ( '
    if ($isData) {
      out += ' (' + $schemaValue + ' !== undefined && typeof ' + $schemaValue + " != 'string') || "
    }
    out += ' !' + $regexp + '.test(' + $data + ') ) {   '
    var $$outStack = $$outStack || []
    $$outStack.push(out)
    out = ''
    if (it.createErrors !== false) {
      out +=
        " { keyword: 'pattern' , dataPath: (dataPath || '') + " +
        it.errorPath +
        ' , schemaPath: ' +
        it.util.toQuotedString($errSchemaPath) +
        ' , params: { pattern:  '
      if ($isData) {
        out += '' + $schemaValue
      } else {
        out += '' + it.util.toQuotedString($schema2)
      }
      out += '  } '
      if (it.opts.messages !== false) {
        out += ` , message: 'should match pattern "`
        if ($isData) {
          out += "' + " + $schemaValue + " + '"
        } else {
          out += '' + it.util.escapeQuotes($schema2)
        }
        out += `"' `
      }
      if (it.opts.verbose) {
        out += ' , schema:  '
        if ($isData) {
          out += 'validate.schema' + $schemaPath
        } else {
          out += '' + it.util.toQuotedString($schema2)
        }
        out += '         , parentSchema: validate.schema' + it.schemaPath + ' , data: ' + $data + ' '
      }
      out += ' } '
    } else {
      out += ' {} '
    }
    var __err = out
    out = $$outStack.pop()
    if (!it.compositeRule && $breakOnError) {
      if (it.async) {
        out += ' throw new ValidationError([' + __err + ']); '
      } else {
        out += ' validate.errors = [' + __err + ']; return false; '
      }
    } else {
      out += ' var err = ' + __err + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; '
    }
    out += '} '
    if ($breakOnError) {
      out += ' else { '
    }
    return out
  }
  var properties$2 = function generate_properties(it, $keyword, $ruleType) {
    var out = ' '
    var $lvl = it.level
    var $dataLvl = it.dataLevel
    var $schema2 = it.schema[$keyword]
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword)
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword
    var $breakOnError = !it.opts.allErrors
    var $data = 'data' + ($dataLvl || '')
    var $errs = 'errs__' + $lvl
    var $it = it.util.copy(it)
    var $closingBraces = ''
    $it.level++
    var $nextValid = 'valid' + $it.level
    var $key = 'key' + $lvl,
      $idx = 'idx' + $lvl,
      $dataNxt = ($it.dataLevel = it.dataLevel + 1),
      $nextData = 'data' + $dataNxt,
      $dataProperties = 'dataProperties' + $lvl
    var $schemaKeys = Object.keys($schema2 || {}).filter(notProto),
      $pProperties = it.schema.patternProperties || {},
      $pPropertyKeys = Object.keys($pProperties).filter(notProto),
      $aProperties = it.schema.additionalProperties,
      $someProperties = $schemaKeys.length || $pPropertyKeys.length,
      $noAdditional = $aProperties === false,
      $additionalIsSchema = typeof $aProperties == 'object' && Object.keys($aProperties).length,
      $removeAdditional = it.opts.removeAdditional,
      $checkAdditional = $noAdditional || $additionalIsSchema || $removeAdditional,
      $ownProperties = it.opts.ownProperties,
      $currentBaseId = it.baseId
    var $required = it.schema.required
    if ($required && !(it.opts.$data && $required.$data) && $required.length < it.opts.loopRequired) {
      var $requiredHash = it.util.toHash($required)
    }
    function notProto(p) {
      return p !== '__proto__'
    }
    out += 'var ' + $errs + ' = errors;var ' + $nextValid + ' = true;'
    if ($ownProperties) {
      out += ' var ' + $dataProperties + ' = undefined;'
    }
    if ($checkAdditional) {
      if ($ownProperties) {
        out +=
          ' ' +
          $dataProperties +
          ' = ' +
          $dataProperties +
          ' || Object.keys(' +
          $data +
          '); for (var ' +
          $idx +
          '=0; ' +
          $idx +
          '<' +
          $dataProperties +
          '.length; ' +
          $idx +
          '++) { var ' +
          $key +
          ' = ' +
          $dataProperties +
          '[' +
          $idx +
          ']; '
      } else {
        out += ' for (var ' + $key + ' in ' + $data + ') { '
      }
      if ($someProperties) {
        out += ' var isAdditional' + $lvl + ' = !(false '
        if ($schemaKeys.length) {
          if ($schemaKeys.length > 8) {
            out += ' || validate.schema' + $schemaPath + '.hasOwnProperty(' + $key + ') '
          } else {
            var arr1 = $schemaKeys
            if (arr1) {
              var $propertyKey,
                i1 = -1,
                l1 = arr1.length - 1
              while (i1 < l1) {
                $propertyKey = arr1[(i1 += 1)]
                out += ' || ' + $key + ' == ' + it.util.toQuotedString($propertyKey) + ' '
              }
            }
          }
        }
        if ($pPropertyKeys.length) {
          var arr2 = $pPropertyKeys
          if (arr2) {
            var $pProperty,
              $i = -1,
              l2 = arr2.length - 1
            while ($i < l2) {
              $pProperty = arr2[($i += 1)]
              out += ' || ' + it.usePattern($pProperty) + '.test(' + $key + ') '
            }
          }
        }
        out += ' ); if (isAdditional' + $lvl + ') { '
      }
      if ($removeAdditional == 'all') {
        out += ' delete ' + $data + '[' + $key + ']; '
      } else {
        var $currentErrorPath = it.errorPath
        var $additionalProperty = "' + " + $key + " + '"
        if (it.opts._errorDataPathProperty) {
          it.errorPath = it.util.getPathExpr(it.errorPath, $key, it.opts.jsonPointers)
        }
        if ($noAdditional) {
          if ($removeAdditional) {
            out += ' delete ' + $data + '[' + $key + ']; '
          } else {
            out += ' ' + $nextValid + ' = false; '
            var $currErrSchemaPath = $errSchemaPath
            $errSchemaPath = it.errSchemaPath + '/additionalProperties'
            var $$outStack = $$outStack || []
            $$outStack.push(out)
            out = ''
            if (it.createErrors !== false) {
              out +=
                " { keyword: 'additionalProperties' , dataPath: (dataPath || '') + " +
                it.errorPath +
                ' , schemaPath: ' +
                it.util.toQuotedString($errSchemaPath) +
                " , params: { additionalProperty: '" +
                $additionalProperty +
                "' } "
              if (it.opts.messages !== false) {
                out += " , message: '"
                if (it.opts._errorDataPathProperty) {
                  out += 'is an invalid additional property'
                } else {
                  out += 'should NOT have additional properties'
                }
                out += "' "
              }
              if (it.opts.verbose) {
                out += ' , schema: false , parentSchema: validate.schema' + it.schemaPath + ' , data: ' + $data + ' '
              }
              out += ' } '
            } else {
              out += ' {} '
            }
            var __err = out
            out = $$outStack.pop()
            if (!it.compositeRule && $breakOnError) {
              if (it.async) {
                out += ' throw new ValidationError([' + __err + ']); '
              } else {
                out += ' validate.errors = [' + __err + ']; return false; '
              }
            } else {
              out +=
                ' var err = ' + __err + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; '
            }
            $errSchemaPath = $currErrSchemaPath
            if ($breakOnError) {
              out += ' break; '
            }
          }
        } else if ($additionalIsSchema) {
          if ($removeAdditional == 'failing') {
            out += ' var ' + $errs + ' = errors;  '
            var $wasComposite = it.compositeRule
            it.compositeRule = $it.compositeRule = true
            $it.schema = $aProperties
            $it.schemaPath = it.schemaPath + '.additionalProperties'
            $it.errSchemaPath = it.errSchemaPath + '/additionalProperties'
            $it.errorPath = it.opts._errorDataPathProperty
              ? it.errorPath
              : it.util.getPathExpr(it.errorPath, $key, it.opts.jsonPointers)
            var $passData = $data + '[' + $key + ']'
            $it.dataPathArr[$dataNxt] = $key
            var $code = it.validate($it)
            $it.baseId = $currentBaseId
            if (it.util.varOccurences($code, $nextData) < 2) {
              out += ' ' + it.util.varReplace($code, $nextData, $passData) + ' '
            } else {
              out += ' var ' + $nextData + ' = ' + $passData + '; ' + $code + ' '
            }
            out +=
              ' if (!' +
              $nextValid +
              ') { errors = ' +
              $errs +
              '; if (validate.errors !== null) { if (errors) validate.errors.length = errors; else validate.errors = null; } delete ' +
              $data +
              '[' +
              $key +
              ']; }  '
            it.compositeRule = $it.compositeRule = $wasComposite
          } else {
            $it.schema = $aProperties
            $it.schemaPath = it.schemaPath + '.additionalProperties'
            $it.errSchemaPath = it.errSchemaPath + '/additionalProperties'
            $it.errorPath = it.opts._errorDataPathProperty
              ? it.errorPath
              : it.util.getPathExpr(it.errorPath, $key, it.opts.jsonPointers)
            var $passData = $data + '[' + $key + ']'
            $it.dataPathArr[$dataNxt] = $key
            var $code = it.validate($it)
            $it.baseId = $currentBaseId
            if (it.util.varOccurences($code, $nextData) < 2) {
              out += ' ' + it.util.varReplace($code, $nextData, $passData) + ' '
            } else {
              out += ' var ' + $nextData + ' = ' + $passData + '; ' + $code + ' '
            }
            if ($breakOnError) {
              out += ' if (!' + $nextValid + ') break; '
            }
          }
        }
        it.errorPath = $currentErrorPath
      }
      if ($someProperties) {
        out += ' } '
      }
      out += ' }  '
      if ($breakOnError) {
        out += ' if (' + $nextValid + ') { '
        $closingBraces += '}'
      }
    }
    var $useDefaults = it.opts.useDefaults && !it.compositeRule
    if ($schemaKeys.length) {
      var arr3 = $schemaKeys
      if (arr3) {
        var $propertyKey,
          i3 = -1,
          l3 = arr3.length - 1
        while (i3 < l3) {
          $propertyKey = arr3[(i3 += 1)]
          var $sch = $schema2[$propertyKey]
          if (
            it.opts.strictKeywords
              ? (typeof $sch == 'object' && Object.keys($sch).length > 0) || $sch === false
              : it.util.schemaHasRules($sch, it.RULES.all)
          ) {
            var $prop = it.util.getProperty($propertyKey),
              $passData = $data + $prop,
              $hasDefault = $useDefaults && $sch.default !== void 0
            $it.schema = $sch
            $it.schemaPath = $schemaPath + $prop
            $it.errSchemaPath = $errSchemaPath + '/' + it.util.escapeFragment($propertyKey)
            $it.errorPath = it.util.getPath(it.errorPath, $propertyKey, it.opts.jsonPointers)
            $it.dataPathArr[$dataNxt] = it.util.toQuotedString($propertyKey)
            var $code = it.validate($it)
            $it.baseId = $currentBaseId
            if (it.util.varOccurences($code, $nextData) < 2) {
              $code = it.util.varReplace($code, $nextData, $passData)
              var $useData = $passData
            } else {
              var $useData = $nextData
              out += ' var ' + $nextData + ' = ' + $passData + '; '
            }
            if ($hasDefault) {
              out += ' ' + $code + ' '
            } else {
              if ($requiredHash && $requiredHash[$propertyKey]) {
                out += ' if ( ' + $useData + ' === undefined '
                if ($ownProperties) {
                  out +=
                    ' || ! Object.prototype.hasOwnProperty.call(' +
                    $data +
                    ", '" +
                    it.util.escapeQuotes($propertyKey) +
                    "') "
                }
                out += ') { ' + $nextValid + ' = false; '
                var $currentErrorPath = it.errorPath,
                  $currErrSchemaPath = $errSchemaPath,
                  $missingProperty = it.util.escapeQuotes($propertyKey)
                if (it.opts._errorDataPathProperty) {
                  it.errorPath = it.util.getPath($currentErrorPath, $propertyKey, it.opts.jsonPointers)
                }
                $errSchemaPath = it.errSchemaPath + '/required'
                var $$outStack = $$outStack || []
                $$outStack.push(out)
                out = ''
                if (it.createErrors !== false) {
                  out +=
                    " { keyword: 'required' , dataPath: (dataPath || '') + " +
                    it.errorPath +
                    ' , schemaPath: ' +
                    it.util.toQuotedString($errSchemaPath) +
                    " , params: { missingProperty: '" +
                    $missingProperty +
                    "' } "
                  if (it.opts.messages !== false) {
                    out += " , message: '"
                    if (it.opts._errorDataPathProperty) {
                      out += 'is a required property'
                    } else {
                      out += "should have required property \\'" + $missingProperty + "\\'"
                    }
                    out += "' "
                  }
                  if (it.opts.verbose) {
                    out +=
                      ' , schema: validate.schema' +
                      $schemaPath +
                      ' , parentSchema: validate.schema' +
                      it.schemaPath +
                      ' , data: ' +
                      $data +
                      ' '
                  }
                  out += ' } '
                } else {
                  out += ' {} '
                }
                var __err = out
                out = $$outStack.pop()
                if (!it.compositeRule && $breakOnError) {
                  if (it.async) {
                    out += ' throw new ValidationError([' + __err + ']); '
                  } else {
                    out += ' validate.errors = [' + __err + ']; return false; '
                  }
                } else {
                  out +=
                    ' var err = ' +
                    __err +
                    ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; '
                }
                $errSchemaPath = $currErrSchemaPath
                it.errorPath = $currentErrorPath
                out += ' } else { '
              } else {
                if ($breakOnError) {
                  out += ' if ( ' + $useData + ' === undefined '
                  if ($ownProperties) {
                    out +=
                      ' || ! Object.prototype.hasOwnProperty.call(' +
                      $data +
                      ", '" +
                      it.util.escapeQuotes($propertyKey) +
                      "') "
                  }
                  out += ') { ' + $nextValid + ' = true; } else { '
                } else {
                  out += ' if (' + $useData + ' !== undefined '
                  if ($ownProperties) {
                    out +=
                      ' &&   Object.prototype.hasOwnProperty.call(' +
                      $data +
                      ", '" +
                      it.util.escapeQuotes($propertyKey) +
                      "') "
                  }
                  out += ' ) { '
                }
              }
              out += ' ' + $code + ' } '
            }
          }
          if ($breakOnError) {
            out += ' if (' + $nextValid + ') { '
            $closingBraces += '}'
          }
        }
      }
    }
    if ($pPropertyKeys.length) {
      var arr4 = $pPropertyKeys
      if (arr4) {
        var $pProperty,
          i4 = -1,
          l4 = arr4.length - 1
        while (i4 < l4) {
          $pProperty = arr4[(i4 += 1)]
          var $sch = $pProperties[$pProperty]
          if (
            it.opts.strictKeywords
              ? (typeof $sch == 'object' && Object.keys($sch).length > 0) || $sch === false
              : it.util.schemaHasRules($sch, it.RULES.all)
          ) {
            $it.schema = $sch
            $it.schemaPath = it.schemaPath + '.patternProperties' + it.util.getProperty($pProperty)
            $it.errSchemaPath = it.errSchemaPath + '/patternProperties/' + it.util.escapeFragment($pProperty)
            if ($ownProperties) {
              out +=
                ' ' +
                $dataProperties +
                ' = ' +
                $dataProperties +
                ' || Object.keys(' +
                $data +
                '); for (var ' +
                $idx +
                '=0; ' +
                $idx +
                '<' +
                $dataProperties +
                '.length; ' +
                $idx +
                '++) { var ' +
                $key +
                ' = ' +
                $dataProperties +
                '[' +
                $idx +
                ']; '
            } else {
              out += ' for (var ' + $key + ' in ' + $data + ') { '
            }
            out += ' if (' + it.usePattern($pProperty) + '.test(' + $key + ')) { '
            $it.errorPath = it.util.getPathExpr(it.errorPath, $key, it.opts.jsonPointers)
            var $passData = $data + '[' + $key + ']'
            $it.dataPathArr[$dataNxt] = $key
            var $code = it.validate($it)
            $it.baseId = $currentBaseId
            if (it.util.varOccurences($code, $nextData) < 2) {
              out += ' ' + it.util.varReplace($code, $nextData, $passData) + ' '
            } else {
              out += ' var ' + $nextData + ' = ' + $passData + '; ' + $code + ' '
            }
            if ($breakOnError) {
              out += ' if (!' + $nextValid + ') break; '
            }
            out += ' } '
            if ($breakOnError) {
              out += ' else ' + $nextValid + ' = true; '
            }
            out += ' }  '
            if ($breakOnError) {
              out += ' if (' + $nextValid + ') { '
              $closingBraces += '}'
            }
          }
        }
      }
    }
    if ($breakOnError) {
      out += ' ' + $closingBraces + ' if (' + $errs + ' == errors) {'
    }
    return out
  }
  var propertyNames = function generate_propertyNames(it, $keyword, $ruleType) {
    var out = ' '
    var $lvl = it.level
    var $dataLvl = it.dataLevel
    var $schema2 = it.schema[$keyword]
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword)
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword
    var $breakOnError = !it.opts.allErrors
    var $data = 'data' + ($dataLvl || '')
    var $errs = 'errs__' + $lvl
    var $it = it.util.copy(it)
    var $closingBraces = ''
    $it.level++
    var $nextValid = 'valid' + $it.level
    out += 'var ' + $errs + ' = errors;'
    if (
      it.opts.strictKeywords
        ? (typeof $schema2 == 'object' && Object.keys($schema2).length > 0) || $schema2 === false
        : it.util.schemaHasRules($schema2, it.RULES.all)
    ) {
      $it.schema = $schema2
      $it.schemaPath = $schemaPath
      $it.errSchemaPath = $errSchemaPath
      var $key = 'key' + $lvl,
        $idx = 'idx' + $lvl,
        $i = 'i' + $lvl,
        $invalidName = "' + " + $key + " + '",
        $dataNxt = ($it.dataLevel = it.dataLevel + 1),
        $nextData = 'data' + $dataNxt,
        $dataProperties = 'dataProperties' + $lvl,
        $ownProperties = it.opts.ownProperties,
        $currentBaseId = it.baseId
      if ($ownProperties) {
        out += ' var ' + $dataProperties + ' = undefined; '
      }
      if ($ownProperties) {
        out +=
          ' ' +
          $dataProperties +
          ' = ' +
          $dataProperties +
          ' || Object.keys(' +
          $data +
          '); for (var ' +
          $idx +
          '=0; ' +
          $idx +
          '<' +
          $dataProperties +
          '.length; ' +
          $idx +
          '++) { var ' +
          $key +
          ' = ' +
          $dataProperties +
          '[' +
          $idx +
          ']; '
      } else {
        out += ' for (var ' + $key + ' in ' + $data + ') { '
      }
      out += ' var startErrs' + $lvl + ' = errors; '
      var $passData = $key
      var $wasComposite = it.compositeRule
      it.compositeRule = $it.compositeRule = true
      var $code = it.validate($it)
      $it.baseId = $currentBaseId
      if (it.util.varOccurences($code, $nextData) < 2) {
        out += ' ' + it.util.varReplace($code, $nextData, $passData) + ' '
      } else {
        out += ' var ' + $nextData + ' = ' + $passData + '; ' + $code + ' '
      }
      it.compositeRule = $it.compositeRule = $wasComposite
      out +=
        ' if (!' +
        $nextValid +
        ') { for (var ' +
        $i +
        '=startErrs' +
        $lvl +
        '; ' +
        $i +
        '<errors; ' +
        $i +
        '++) { vErrors[' +
        $i +
        '].propertyName = ' +
        $key +
        '; }   var err =   '
      if (it.createErrors !== false) {
        out +=
          " { keyword: 'propertyNames' , dataPath: (dataPath || '') + " +
          it.errorPath +
          ' , schemaPath: ' +
          it.util.toQuotedString($errSchemaPath) +
          " , params: { propertyName: '" +
          $invalidName +
          "' } "
        if (it.opts.messages !== false) {
          out += " , message: 'property name \\'" + $invalidName + "\\' is invalid' "
        }
        if (it.opts.verbose) {
          out +=
            ' , schema: validate.schema' +
            $schemaPath +
            ' , parentSchema: validate.schema' +
            it.schemaPath +
            ' , data: ' +
            $data +
            ' '
        }
        out += ' } '
      } else {
        out += ' {} '
      }
      out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; '
      if (!it.compositeRule && $breakOnError) {
        if (it.async) {
          out += ' throw new ValidationError(vErrors); '
        } else {
          out += ' validate.errors = vErrors; return false; '
        }
      }
      if ($breakOnError) {
        out += ' break; '
      }
      out += ' } }'
    }
    if ($breakOnError) {
      out += ' ' + $closingBraces + ' if (' + $errs + ' == errors) {'
    }
    return out
  }
  var required$1 = function generate_required(it, $keyword, $ruleType) {
    var out = ' '
    var $lvl = it.level
    var $dataLvl = it.dataLevel
    var $schema2 = it.schema[$keyword]
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword)
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword
    var $breakOnError = !it.opts.allErrors
    var $data = 'data' + ($dataLvl || '')
    var $valid = 'valid' + $lvl
    var $isData = it.opts.$data && $schema2 && $schema2.$data
    if ($isData) {
      out += ' var schema' + $lvl + ' = ' + it.util.getData($schema2.$data, $dataLvl, it.dataPathArr) + '; '
    }
    var $vSchema = 'schema' + $lvl
    if (!$isData) {
      if ($schema2.length < it.opts.loopRequired && it.schema.properties && Object.keys(it.schema.properties).length) {
        var $required = []
        var arr1 = $schema2
        if (arr1) {
          var $property,
            i1 = -1,
            l1 = arr1.length - 1
          while (i1 < l1) {
            $property = arr1[(i1 += 1)]
            var $propertySch = it.schema.properties[$property]
            if (
              !(
                $propertySch &&
                (it.opts.strictKeywords
                  ? (typeof $propertySch == 'object' && Object.keys($propertySch).length > 0) || $propertySch === false
                  : it.util.schemaHasRules($propertySch, it.RULES.all))
              )
            ) {
              $required[$required.length] = $property
            }
          }
        }
      } else {
        var $required = $schema2
      }
    }
    if ($isData || $required.length) {
      var $currentErrorPath = it.errorPath,
        $loopRequired = $isData || $required.length >= it.opts.loopRequired,
        $ownProperties = it.opts.ownProperties
      if ($breakOnError) {
        out += ' var missing' + $lvl + '; '
        if ($loopRequired) {
          if (!$isData) {
            out += ' var ' + $vSchema + ' = validate.schema' + $schemaPath + '; '
          }
          var $i = 'i' + $lvl,
            $propertyPath = 'schema' + $lvl + '[' + $i + ']',
            $missingProperty = "' + " + $propertyPath + " + '"
          if (it.opts._errorDataPathProperty) {
            it.errorPath = it.util.getPathExpr($currentErrorPath, $propertyPath, it.opts.jsonPointers)
          }
          out += ' var ' + $valid + ' = true; '
          if ($isData) {
            out +=
              ' if (schema' +
              $lvl +
              ' === undefined) ' +
              $valid +
              ' = true; else if (!Array.isArray(schema' +
              $lvl +
              ')) ' +
              $valid +
              ' = false; else {'
          }
          out +=
            ' for (var ' +
            $i +
            ' = 0; ' +
            $i +
            ' < ' +
            $vSchema +
            '.length; ' +
            $i +
            '++) { ' +
            $valid +
            ' = ' +
            $data +
            '[' +
            $vSchema +
            '[' +
            $i +
            ']] !== undefined '
          if ($ownProperties) {
            out += ' &&   Object.prototype.hasOwnProperty.call(' + $data + ', ' + $vSchema + '[' + $i + ']) '
          }
          out += '; if (!' + $valid + ') break; } '
          if ($isData) {
            out += '  }  '
          }
          out += '  if (!' + $valid + ') {   '
          var $$outStack = $$outStack || []
          $$outStack.push(out)
          out = ''
          if (it.createErrors !== false) {
            out +=
              " { keyword: 'required' , dataPath: (dataPath || '') + " +
              it.errorPath +
              ' , schemaPath: ' +
              it.util.toQuotedString($errSchemaPath) +
              " , params: { missingProperty: '" +
              $missingProperty +
              "' } "
            if (it.opts.messages !== false) {
              out += " , message: '"
              if (it.opts._errorDataPathProperty) {
                out += 'is a required property'
              } else {
                out += "should have required property \\'" + $missingProperty + "\\'"
              }
              out += "' "
            }
            if (it.opts.verbose) {
              out +=
                ' , schema: validate.schema' +
                $schemaPath +
                ' , parentSchema: validate.schema' +
                it.schemaPath +
                ' , data: ' +
                $data +
                ' '
            }
            out += ' } '
          } else {
            out += ' {} '
          }
          var __err = out
          out = $$outStack.pop()
          if (!it.compositeRule && $breakOnError) {
            if (it.async) {
              out += ' throw new ValidationError([' + __err + ']); '
            } else {
              out += ' validate.errors = [' + __err + ']; return false; '
            }
          } else {
            out +=
              ' var err = ' + __err + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; '
          }
          out += ' } else { '
        } else {
          out += ' if ( '
          var arr2 = $required
          if (arr2) {
            var $propertyKey,
              $i = -1,
              l2 = arr2.length - 1
            while ($i < l2) {
              $propertyKey = arr2[($i += 1)]
              if ($i) {
                out += ' || '
              }
              var $prop = it.util.getProperty($propertyKey),
                $useData = $data + $prop
              out += ' ( ( ' + $useData + ' === undefined '
              if ($ownProperties) {
                out +=
                  ' || ! Object.prototype.hasOwnProperty.call(' +
                  $data +
                  ", '" +
                  it.util.escapeQuotes($propertyKey) +
                  "') "
              }
              out +=
                ') && (missing' +
                $lvl +
                ' = ' +
                it.util.toQuotedString(it.opts.jsonPointers ? $propertyKey : $prop) +
                ') ) '
            }
          }
          out += ') {  '
          var $propertyPath = 'missing' + $lvl,
            $missingProperty = "' + " + $propertyPath + " + '"
          if (it.opts._errorDataPathProperty) {
            it.errorPath = it.opts.jsonPointers
              ? it.util.getPathExpr($currentErrorPath, $propertyPath, true)
              : $currentErrorPath + ' + ' + $propertyPath
          }
          var $$outStack = $$outStack || []
          $$outStack.push(out)
          out = ''
          if (it.createErrors !== false) {
            out +=
              " { keyword: 'required' , dataPath: (dataPath || '') + " +
              it.errorPath +
              ' , schemaPath: ' +
              it.util.toQuotedString($errSchemaPath) +
              " , params: { missingProperty: '" +
              $missingProperty +
              "' } "
            if (it.opts.messages !== false) {
              out += " , message: '"
              if (it.opts._errorDataPathProperty) {
                out += 'is a required property'
              } else {
                out += "should have required property \\'" + $missingProperty + "\\'"
              }
              out += "' "
            }
            if (it.opts.verbose) {
              out +=
                ' , schema: validate.schema' +
                $schemaPath +
                ' , parentSchema: validate.schema' +
                it.schemaPath +
                ' , data: ' +
                $data +
                ' '
            }
            out += ' } '
          } else {
            out += ' {} '
          }
          var __err = out
          out = $$outStack.pop()
          if (!it.compositeRule && $breakOnError) {
            if (it.async) {
              out += ' throw new ValidationError([' + __err + ']); '
            } else {
              out += ' validate.errors = [' + __err + ']; return false; '
            }
          } else {
            out +=
              ' var err = ' + __err + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; '
          }
          out += ' } else { '
        }
      } else {
        if ($loopRequired) {
          if (!$isData) {
            out += ' var ' + $vSchema + ' = validate.schema' + $schemaPath + '; '
          }
          var $i = 'i' + $lvl,
            $propertyPath = 'schema' + $lvl + '[' + $i + ']',
            $missingProperty = "' + " + $propertyPath + " + '"
          if (it.opts._errorDataPathProperty) {
            it.errorPath = it.util.getPathExpr($currentErrorPath, $propertyPath, it.opts.jsonPointers)
          }
          if ($isData) {
            out += ' if (' + $vSchema + ' && !Array.isArray(' + $vSchema + ')) {  var err =   '
            if (it.createErrors !== false) {
              out +=
                " { keyword: 'required' , dataPath: (dataPath || '') + " +
                it.errorPath +
                ' , schemaPath: ' +
                it.util.toQuotedString($errSchemaPath) +
                " , params: { missingProperty: '" +
                $missingProperty +
                "' } "
              if (it.opts.messages !== false) {
                out += " , message: '"
                if (it.opts._errorDataPathProperty) {
                  out += 'is a required property'
                } else {
                  out += "should have required property \\'" + $missingProperty + "\\'"
                }
                out += "' "
              }
              if (it.opts.verbose) {
                out +=
                  ' , schema: validate.schema' +
                  $schemaPath +
                  ' , parentSchema: validate.schema' +
                  it.schemaPath +
                  ' , data: ' +
                  $data +
                  ' '
              }
              out += ' } '
            } else {
              out += ' {} '
            }
            out +=
              ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; } else if (' +
              $vSchema +
              ' !== undefined) { '
          }
          out +=
            ' for (var ' +
            $i +
            ' = 0; ' +
            $i +
            ' < ' +
            $vSchema +
            '.length; ' +
            $i +
            '++) { if (' +
            $data +
            '[' +
            $vSchema +
            '[' +
            $i +
            ']] === undefined '
          if ($ownProperties) {
            out += ' || ! Object.prototype.hasOwnProperty.call(' + $data + ', ' + $vSchema + '[' + $i + ']) '
          }
          out += ') {  var err =   '
          if (it.createErrors !== false) {
            out +=
              " { keyword: 'required' , dataPath: (dataPath || '') + " +
              it.errorPath +
              ' , schemaPath: ' +
              it.util.toQuotedString($errSchemaPath) +
              " , params: { missingProperty: '" +
              $missingProperty +
              "' } "
            if (it.opts.messages !== false) {
              out += " , message: '"
              if (it.opts._errorDataPathProperty) {
                out += 'is a required property'
              } else {
                out += "should have required property \\'" + $missingProperty + "\\'"
              }
              out += "' "
            }
            if (it.opts.verbose) {
              out +=
                ' , schema: validate.schema' +
                $schemaPath +
                ' , parentSchema: validate.schema' +
                it.schemaPath +
                ' , data: ' +
                $data +
                ' '
            }
            out += ' } '
          } else {
            out += ' {} '
          }
          out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; } } '
          if ($isData) {
            out += '  }  '
          }
        } else {
          var arr3 = $required
          if (arr3) {
            var $propertyKey,
              i3 = -1,
              l3 = arr3.length - 1
            while (i3 < l3) {
              $propertyKey = arr3[(i3 += 1)]
              var $prop = it.util.getProperty($propertyKey),
                $missingProperty = it.util.escapeQuotes($propertyKey),
                $useData = $data + $prop
              if (it.opts._errorDataPathProperty) {
                it.errorPath = it.util.getPath($currentErrorPath, $propertyKey, it.opts.jsonPointers)
              }
              out += ' if ( ' + $useData + ' === undefined '
              if ($ownProperties) {
                out +=
                  ' || ! Object.prototype.hasOwnProperty.call(' +
                  $data +
                  ", '" +
                  it.util.escapeQuotes($propertyKey) +
                  "') "
              }
              out += ') {  var err =   '
              if (it.createErrors !== false) {
                out +=
                  " { keyword: 'required' , dataPath: (dataPath || '') + " +
                  it.errorPath +
                  ' , schemaPath: ' +
                  it.util.toQuotedString($errSchemaPath) +
                  " , params: { missingProperty: '" +
                  $missingProperty +
                  "' } "
                if (it.opts.messages !== false) {
                  out += " , message: '"
                  if (it.opts._errorDataPathProperty) {
                    out += 'is a required property'
                  } else {
                    out += "should have required property \\'" + $missingProperty + "\\'"
                  }
                  out += "' "
                }
                if (it.opts.verbose) {
                  out +=
                    ' , schema: validate.schema' +
                    $schemaPath +
                    ' , parentSchema: validate.schema' +
                    it.schemaPath +
                    ' , data: ' +
                    $data +
                    ' '
                }
                out += ' } '
              } else {
                out += ' {} '
              }
              out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; } '
            }
          }
        }
      }
      it.errorPath = $currentErrorPath
    } else if ($breakOnError) {
      out += ' if (true) {'
    }
    return out
  }
  var uniqueItems = function generate_uniqueItems(it, $keyword, $ruleType) {
    var out = ' '
    var $lvl = it.level
    var $dataLvl = it.dataLevel
    var $schema2 = it.schema[$keyword]
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword)
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword
    var $breakOnError = !it.opts.allErrors
    var $data = 'data' + ($dataLvl || '')
    var $valid = 'valid' + $lvl
    var $isData = it.opts.$data && $schema2 && $schema2.$data,
      $schemaValue
    if ($isData) {
      out += ' var schema' + $lvl + ' = ' + it.util.getData($schema2.$data, $dataLvl, it.dataPathArr) + '; '
      $schemaValue = 'schema' + $lvl
    } else {
      $schemaValue = $schema2
    }
    if (($schema2 || $isData) && it.opts.uniqueItems !== false) {
      if ($isData) {
        out +=
          ' var ' +
          $valid +
          '; if (' +
          $schemaValue +
          ' === false || ' +
          $schemaValue +
          ' === undefined) ' +
          $valid +
          ' = true; else if (typeof ' +
          $schemaValue +
          " != 'boolean') " +
          $valid +
          ' = false; else { '
      }
      out += ' var i = ' + $data + '.length , ' + $valid + ' = true , j; if (i > 1) { '
      var $itemType = it.schema.items && it.schema.items.type,
        $typeIsArray = Array.isArray($itemType)
      if (
        !$itemType ||
        $itemType == 'object' ||
        $itemType == 'array' ||
        ($typeIsArray && ($itemType.indexOf('object') >= 0 || $itemType.indexOf('array') >= 0))
      ) {
        out +=
          ' outer: for (;i--;) { for (j = i; j--;) { if (equal(' +
          $data +
          '[i], ' +
          $data +
          '[j])) { ' +
          $valid +
          ' = false; break outer; } } } '
      } else {
        out += ' var itemIndices = {}, item; for (;i--;) { var item = ' + $data + '[i]; '
        var $method = 'checkDataType' + ($typeIsArray ? 's' : '')
        out += ' if (' + it.util[$method]($itemType, 'item', it.opts.strictNumbers, true) + ') continue; '
        if ($typeIsArray) {
          out += ` if (typeof item == 'string') item = '"' + item; `
        }
        out +=
          " if (typeof itemIndices[item] == 'number') { " +
          $valid +
          ' = false; j = itemIndices[item]; break; } itemIndices[item] = i; } '
      }
      out += ' } '
      if ($isData) {
        out += '  }  '
      }
      out += ' if (!' + $valid + ') {   '
      var $$outStack = $$outStack || []
      $$outStack.push(out)
      out = ''
      if (it.createErrors !== false) {
        out +=
          " { keyword: 'uniqueItems' , dataPath: (dataPath || '') + " +
          it.errorPath +
          ' , schemaPath: ' +
          it.util.toQuotedString($errSchemaPath) +
          ' , params: { i: i, j: j } '
        if (it.opts.messages !== false) {
          out += " , message: 'should NOT have duplicate items (items ## ' + j + ' and ' + i + ' are identical)' "
        }
        if (it.opts.verbose) {
          out += ' , schema:  '
          if ($isData) {
            out += 'validate.schema' + $schemaPath
          } else {
            out += '' + $schema2
          }
          out += '         , parentSchema: validate.schema' + it.schemaPath + ' , data: ' + $data + ' '
        }
        out += ' } '
      } else {
        out += ' {} '
      }
      var __err = out
      out = $$outStack.pop()
      if (!it.compositeRule && $breakOnError) {
        if (it.async) {
          out += ' throw new ValidationError([' + __err + ']); '
        } else {
          out += ' validate.errors = [' + __err + ']; return false; '
        }
      } else {
        out += ' var err = ' + __err + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; '
      }
      out += ' } '
      if ($breakOnError) {
        out += ' else { '
      }
    } else {
      if ($breakOnError) {
        out += ' if (true) { '
      }
    }
    return out
  }
  var dotjs = {
    '$ref': ref,
    allOf,
    anyOf,
    '$comment': comment,
    const: _const,
    contains,
    dependencies,
    'enum': _enum,
    format,
    'if': _if,
    items,
    maximum: _limit,
    minimum: _limit,
    maxItems: _limitItems,
    minItems: _limitItems,
    maxLength: _limitLength,
    minLength: _limitLength,
    maxProperties: _limitProperties,
    minProperties: _limitProperties,
    multipleOf,
    not,
    oneOf,
    pattern,
    properties: properties$2,
    propertyNames,
    required: required$1,
    uniqueItems,
    validate: validate$1
  }
  var ruleModules = dotjs,
    toHash = util$5.toHash
  var rules$1 = function rules2() {
    var RULES = [
      {
        type: 'number',
        rules: [{ 'maximum': ['exclusiveMaximum'] }, { 'minimum': ['exclusiveMinimum'] }, 'multipleOf', 'format']
      },
      {
        type: 'string',
        rules: ['maxLength', 'minLength', 'pattern', 'format']
      },
      {
        type: 'array',
        rules: ['maxItems', 'minItems', 'items', 'contains', 'uniqueItems']
      },
      {
        type: 'object',
        rules: [
          'maxProperties',
          'minProperties',
          'required',
          'dependencies',
          'propertyNames',
          { 'properties': ['additionalProperties', 'patternProperties'] }
        ]
      },
      { rules: ['$ref', 'const', 'enum', 'not', 'anyOf', 'oneOf', 'allOf', 'if'] }
    ]
    var ALL = ['type', '$comment']
    var KEYWORDS2 = [
      '$schema',
      '$id',
      'id',
      '$data',
      '$async',
      'title',
      'description',
      'default',
      'definitions',
      'examples',
      'readOnly',
      'writeOnly',
      'contentMediaType',
      'contentEncoding',
      'additionalItems',
      'then',
      'else'
    ]
    var TYPES = ['number', 'integer', 'string', 'array', 'object', 'boolean', 'null']
    RULES.all = toHash(ALL)
    RULES.types = toHash(TYPES)
    RULES.forEach(function (group) {
      group.rules = group.rules.map(function (keyword2) {
        var implKeywords
        if (typeof keyword2 == 'object') {
          var key = Object.keys(keyword2)[0]
          implKeywords = keyword2[key]
          keyword2 = key
          implKeywords.forEach(function (k) {
            ALL.push(k)
            RULES.all[k] = true
          })
        }
        ALL.push(keyword2)
        var rule = (RULES.all[keyword2] = {
          keyword: keyword2,
          code: ruleModules[keyword2],
          implements: implKeywords
        })
        return rule
      })
      RULES.all.$comment = {
        keyword: '$comment',
        code: ruleModules.$comment
      }
      if (group.type) RULES.types[group.type] = group
    })
    RULES.keywords = toHash(ALL.concat(KEYWORDS2))
    RULES.custom = {}
    return RULES
  }
  var KEYWORDS = [
    'multipleOf',
    'maximum',
    'exclusiveMaximum',
    'minimum',
    'exclusiveMinimum',
    'maxLength',
    'minLength',
    'pattern',
    'additionalItems',
    'maxItems',
    'minItems',
    'uniqueItems',
    'maxProperties',
    'minProperties',
    'required',
    'additionalProperties',
    'enum',
    'format',
    'const'
  ]
  var data = function (metaSchema2, keywordsJsonPointers) {
    for (var i = 0; i < keywordsJsonPointers.length; i++) {
      metaSchema2 = JSON.parse(JSON.stringify(metaSchema2))
      var segments = keywordsJsonPointers[i].split('/')
      var keywords = metaSchema2
      var j
      for (j = 1; j < segments.length; j++) keywords = keywords[segments[j]]
      for (j = 0; j < KEYWORDS.length; j++) {
        var key = KEYWORDS[j]
        var schema = keywords[key]
        if (schema) {
          keywords[key] = {
            anyOf: [schema, { $ref: 'https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#' }]
          }
        }
      }
    }
    return metaSchema2
  }
  var MissingRefError = error_classes.MissingRef
  var async = compileAsync
  function compileAsync(schema, meta, callback) {
    var self2 = this
    if (typeof this._opts.loadSchema != 'function') throw new Error('options.loadSchema should be a function')
    if (typeof meta == 'function') {
      callback = meta
      meta = void 0
    }
    var p = loadMetaSchemaOf(schema).then(function () {
      var schemaObj = self2._addSchema(schema, void 0, meta)
      return schemaObj.validate || _compileAsync(schemaObj)
    })
    if (callback) {
      p.then(function (v) {
        callback(null, v)
      }, callback)
    }
    return p
    function loadMetaSchemaOf(sch) {
      var $schema2 = sch.$schema
      return $schema2 && !self2.getSchema($schema2)
        ? compileAsync.call(self2, { $ref: $schema2 }, true)
        : Promise.resolve()
    }
    function _compileAsync(schemaObj) {
      try {
        return self2._compile(schemaObj)
      } catch (e) {
        if (e instanceof MissingRefError) return loadMissingSchema(e)
        throw e
      }
      function loadMissingSchema(e) {
        var ref2 = e.missingSchema
        if (added(ref2)) throw new Error('Schema ' + ref2 + ' is loaded but ' + e.missingRef + ' cannot be resolved')
        var schemaPromise = self2._loadingSchemas[ref2]
        if (!schemaPromise) {
          schemaPromise = self2._loadingSchemas[ref2] = self2._opts.loadSchema(ref2)
          schemaPromise.then(removePromise, removePromise)
        }
        return schemaPromise
          .then(function (sch) {
            if (!added(ref2)) {
              return loadMetaSchemaOf(sch).then(function () {
                if (!added(ref2)) self2.addSchema(sch, ref2, void 0, meta)
              })
            }
          })
          .then(function () {
            return _compileAsync(schemaObj)
          })
        function removePromise() {
          delete self2._loadingSchemas[ref2]
        }
        function added(ref3) {
          return self2._refs[ref3] || self2._schemas[ref3]
        }
      }
    }
  }
  var custom = function generate_custom(it, $keyword, $ruleType) {
    var out = ' '
    var $lvl = it.level
    var $dataLvl = it.dataLevel
    var $schema2 = it.schema[$keyword]
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword)
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword
    var $breakOnError = !it.opts.allErrors
    var $errorKeyword
    var $data = 'data' + ($dataLvl || '')
    var $valid = 'valid' + $lvl
    var $errs = 'errs__' + $lvl
    var $isData = it.opts.$data && $schema2 && $schema2.$data,
      $schemaValue
    if ($isData) {
      out += ' var schema' + $lvl + ' = ' + it.util.getData($schema2.$data, $dataLvl, it.dataPathArr) + '; '
      $schemaValue = 'schema' + $lvl
    } else {
      $schemaValue = $schema2
    }
    var $rule = this,
      $definition = 'definition' + $lvl,
      $rDef = $rule.definition,
      $closingBraces = ''
    var $compile, $inline, $macro, $ruleValidate, $validateCode
    if ($isData && $rDef.$data) {
      $validateCode = 'keywordValidate' + $lvl
      var $validateSchema = $rDef.validateSchema
      out +=
        ' var ' +
        $definition +
        " = RULES.custom['" +
        $keyword +
        "'].definition; var " +
        $validateCode +
        ' = ' +
        $definition +
        '.validate;'
    } else {
      $ruleValidate = it.useCustomRule($rule, $schema2, it.schema, it)
      if (!$ruleValidate) return
      $schemaValue = 'validate.schema' + $schemaPath
      $validateCode = $ruleValidate.code
      $compile = $rDef.compile
      $inline = $rDef.inline
      $macro = $rDef.macro
    }
    var $ruleErrs = $validateCode + '.errors',
      $i = 'i' + $lvl,
      $ruleErr = 'ruleErr' + $lvl,
      $asyncKeyword = $rDef.async
    if ($asyncKeyword && !it.async) throw new Error('async keyword in sync schema')
    if (!($inline || $macro)) {
      out += '' + $ruleErrs + ' = null;'
    }
    out += 'var ' + $errs + ' = errors;var ' + $valid + ';'
    if ($isData && $rDef.$data) {
      $closingBraces += '}'
      out += ' if (' + $schemaValue + ' === undefined) { ' + $valid + ' = true; } else { '
      if ($validateSchema) {
        $closingBraces += '}'
        out += ' ' + $valid + ' = ' + $definition + '.validateSchema(' + $schemaValue + '); if (' + $valid + ') { '
      }
    }
    if ($inline) {
      if ($rDef.statements) {
        out += ' ' + $ruleValidate.validate + ' '
      } else {
        out += ' ' + $valid + ' = ' + $ruleValidate.validate + '; '
      }
    } else if ($macro) {
      var $it = it.util.copy(it)
      var $closingBraces = ''
      $it.level++
      var $nextValid = 'valid' + $it.level
      $it.schema = $ruleValidate.validate
      $it.schemaPath = ''
      var $wasComposite = it.compositeRule
      it.compositeRule = $it.compositeRule = true
      var $code = it.validate($it).replace(/validate\.schema/g, $validateCode)
      it.compositeRule = $it.compositeRule = $wasComposite
      out += ' ' + $code
    } else {
      var $$outStack = $$outStack || []
      $$outStack.push(out)
      out = ''
      out += '  ' + $validateCode + '.call( '
      if (it.opts.passContext) {
        out += 'this'
      } else {
        out += 'self'
      }
      if ($compile || $rDef.schema === false) {
        out += ' , ' + $data + ' '
      } else {
        out += ' , ' + $schemaValue + ' , ' + $data + ' , validate.schema' + it.schemaPath + ' '
      }
      out += " , (dataPath || '')"
      if (it.errorPath != '""') {
        out += ' + ' + it.errorPath
      }
      var $parentData = $dataLvl ? 'data' + ($dataLvl - 1 || '') : 'parentData',
        $parentDataProperty = $dataLvl ? it.dataPathArr[$dataLvl] : 'parentDataProperty'
      out += ' , ' + $parentData + ' , ' + $parentDataProperty + ' , rootData )  '
      var def_callRuleValidate = out
      out = $$outStack.pop()
      if ($rDef.errors === false) {
        out += ' ' + $valid + ' = '
        if ($asyncKeyword) {
          out += 'await '
        }
        out += '' + def_callRuleValidate + '; '
      } else {
        if ($asyncKeyword) {
          $ruleErrs = 'customErrors' + $lvl
          out +=
            ' var ' +
            $ruleErrs +
            ' = null; try { ' +
            $valid +
            ' = await ' +
            def_callRuleValidate +
            '; } catch (e) { ' +
            $valid +
            ' = false; if (e instanceof ValidationError) ' +
            $ruleErrs +
            ' = e.errors; else throw e; } '
        } else {
          out += ' ' + $ruleErrs + ' = null; ' + $valid + ' = ' + def_callRuleValidate + '; '
        }
      }
    }
    if ($rDef.modifying) {
      out += ' if (' + $parentData + ') ' + $data + ' = ' + $parentData + '[' + $parentDataProperty + '];'
    }
    out += '' + $closingBraces
    if ($rDef.valid) {
      if ($breakOnError) {
        out += ' if (true) { '
      }
    } else {
      out += ' if ( '
      if ($rDef.valid === void 0) {
        out += ' !'
        if ($macro) {
          out += '' + $nextValid
        } else {
          out += '' + $valid
        }
      } else {
        out += ' ' + !$rDef.valid + ' '
      }
      out += ') { '
      $errorKeyword = $rule.keyword
      var $$outStack = $$outStack || []
      $$outStack.push(out)
      out = ''
      var $$outStack = $$outStack || []
      $$outStack.push(out)
      out = ''
      if (it.createErrors !== false) {
        out +=
          " { keyword: '" +
          ($errorKeyword || 'custom') +
          "' , dataPath: (dataPath || '') + " +
          it.errorPath +
          ' , schemaPath: ' +
          it.util.toQuotedString($errSchemaPath) +
          " , params: { keyword: '" +
          $rule.keyword +
          "' } "
        if (it.opts.messages !== false) {
          out += ` , message: 'should pass "` + $rule.keyword + `" keyword validation' `
        }
        if (it.opts.verbose) {
          out +=
            ' , schema: validate.schema' +
            $schemaPath +
            ' , parentSchema: validate.schema' +
            it.schemaPath +
            ' , data: ' +
            $data +
            ' '
        }
        out += ' } '
      } else {
        out += ' {} '
      }
      var __err = out
      out = $$outStack.pop()
      if (!it.compositeRule && $breakOnError) {
        if (it.async) {
          out += ' throw new ValidationError([' + __err + ']); '
        } else {
          out += ' validate.errors = [' + __err + ']; return false; '
        }
      } else {
        out += ' var err = ' + __err + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; '
      }
      var def_customError = out
      out = $$outStack.pop()
      if ($inline) {
        if ($rDef.errors) {
          if ($rDef.errors != 'full') {
            out +=
              '  for (var ' +
              $i +
              '=' +
              $errs +
              '; ' +
              $i +
              '<errors; ' +
              $i +
              '++) { var ' +
              $ruleErr +
              ' = vErrors[' +
              $i +
              ']; if (' +
              $ruleErr +
              '.dataPath === undefined) ' +
              $ruleErr +
              ".dataPath = (dataPath || '') + " +
              it.errorPath +
              '; if (' +
              $ruleErr +
              '.schemaPath === undefined) { ' +
              $ruleErr +
              '.schemaPath = "' +
              $errSchemaPath +
              '"; } '
            if (it.opts.verbose) {
              out += ' ' + $ruleErr + '.schema = ' + $schemaValue + '; ' + $ruleErr + '.data = ' + $data + '; '
            }
            out += ' } '
          }
        } else {
          if ($rDef.errors === false) {
            out += ' ' + def_customError + ' '
          } else {
            out +=
              ' if (' +
              $errs +
              ' == errors) { ' +
              def_customError +
              ' } else {  for (var ' +
              $i +
              '=' +
              $errs +
              '; ' +
              $i +
              '<errors; ' +
              $i +
              '++) { var ' +
              $ruleErr +
              ' = vErrors[' +
              $i +
              ']; if (' +
              $ruleErr +
              '.dataPath === undefined) ' +
              $ruleErr +
              ".dataPath = (dataPath || '') + " +
              it.errorPath +
              '; if (' +
              $ruleErr +
              '.schemaPath === undefined) { ' +
              $ruleErr +
              '.schemaPath = "' +
              $errSchemaPath +
              '"; } '
            if (it.opts.verbose) {
              out += ' ' + $ruleErr + '.schema = ' + $schemaValue + '; ' + $ruleErr + '.data = ' + $data + '; '
            }
            out += ' } } '
          }
        }
      } else if ($macro) {
        out += '   var err =   '
        if (it.createErrors !== false) {
          out +=
            " { keyword: '" +
            ($errorKeyword || 'custom') +
            "' , dataPath: (dataPath || '') + " +
            it.errorPath +
            ' , schemaPath: ' +
            it.util.toQuotedString($errSchemaPath) +
            " , params: { keyword: '" +
            $rule.keyword +
            "' } "
          if (it.opts.messages !== false) {
            out += ` , message: 'should pass "` + $rule.keyword + `" keyword validation' `
          }
          if (it.opts.verbose) {
            out +=
              ' , schema: validate.schema' +
              $schemaPath +
              ' , parentSchema: validate.schema' +
              it.schemaPath +
              ' , data: ' +
              $data +
              ' '
          }
          out += ' } '
        } else {
          out += ' {} '
        }
        out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; '
        if (!it.compositeRule && $breakOnError) {
          if (it.async) {
            out += ' throw new ValidationError(vErrors); '
          } else {
            out += ' validate.errors = vErrors; return false; '
          }
        }
      } else {
        if ($rDef.errors === false) {
          out += ' ' + def_customError + ' '
        } else {
          out +=
            ' if (Array.isArray(' +
            $ruleErrs +
            ')) { if (vErrors === null) vErrors = ' +
            $ruleErrs +
            '; else vErrors = vErrors.concat(' +
            $ruleErrs +
            '); errors = vErrors.length;  for (var ' +
            $i +
            '=' +
            $errs +
            '; ' +
            $i +
            '<errors; ' +
            $i +
            '++) { var ' +
            $ruleErr +
            ' = vErrors[' +
            $i +
            ']; if (' +
            $ruleErr +
            '.dataPath === undefined) ' +
            $ruleErr +
            ".dataPath = (dataPath || '') + " +
            it.errorPath +
            ';  ' +
            $ruleErr +
            '.schemaPath = "' +
            $errSchemaPath +
            '";  '
          if (it.opts.verbose) {
            out += ' ' + $ruleErr + '.schema = ' + $schemaValue + '; ' + $ruleErr + '.data = ' + $data + '; '
          }
          out += ' } } else { ' + def_customError + ' } '
        }
      }
      out += ' } '
      if ($breakOnError) {
        out += ' else { '
      }
    }
    return out
  }
  const $schema$1 = 'http://json-schema.org/draft-07/schema#'
  const $id$1 = 'http://json-schema.org/draft-07/schema#'
  const title = 'Core schema meta-schema'
  const definitions = {
    schemaArray: {
      type: 'array',
      minItems: 1,
      items: {
        $ref: '#'
      }
    },
    nonNegativeInteger: {
      type: 'integer',
      minimum: 0
    },
    nonNegativeIntegerDefault0: {
      allOf: [
        {
          $ref: '#/definitions/nonNegativeInteger'
        },
        {
          'default': 0
        }
      ]
    },
    simpleTypes: {
      'enum': ['array', 'boolean', 'integer', 'null', 'number', 'object', 'string']
    },
    stringArray: {
      type: 'array',
      items: {
        type: 'string'
      },
      uniqueItems: true,
      'default': []
    }
  }
  const type$1 = ['object', 'boolean']
  const properties$1 = {
    $id: {
      type: 'string',
      format: 'uri-reference'
    },
    $schema: {
      type: 'string',
      format: 'uri'
    },
    $ref: {
      type: 'string',
      format: 'uri-reference'
    },
    $comment: {
      type: 'string'
    },
    title: {
      type: 'string'
    },
    description: {
      type: 'string'
    },
    'default': true,
    readOnly: {
      type: 'boolean',
      'default': false
    },
    examples: {
      type: 'array',
      items: true
    },
    multipleOf: {
      type: 'number',
      exclusiveMinimum: 0
    },
    maximum: {
      type: 'number'
    },
    exclusiveMaximum: {
      type: 'number'
    },
    minimum: {
      type: 'number'
    },
    exclusiveMinimum: {
      type: 'number'
    },
    maxLength: {
      $ref: '#/definitions/nonNegativeInteger'
    },
    minLength: {
      $ref: '#/definitions/nonNegativeIntegerDefault0'
    },
    pattern: {
      type: 'string',
      format: 'regex'
    },
    additionalItems: {
      $ref: '#'
    },
    items: {
      anyOf: [
        {
          $ref: '#'
        },
        {
          $ref: '#/definitions/schemaArray'
        }
      ],
      'default': true
    },
    maxItems: {
      $ref: '#/definitions/nonNegativeInteger'
    },
    minItems: {
      $ref: '#/definitions/nonNegativeIntegerDefault0'
    },
    uniqueItems: {
      type: 'boolean',
      'default': false
    },
    contains: {
      $ref: '#'
    },
    maxProperties: {
      $ref: '#/definitions/nonNegativeInteger'
    },
    minProperties: {
      $ref: '#/definitions/nonNegativeIntegerDefault0'
    },
    required: {
      $ref: '#/definitions/stringArray'
    },
    additionalProperties: {
      $ref: '#'
    },
    definitions: {
      type: 'object',
      additionalProperties: {
        $ref: '#'
      },
      'default': {}
    },
    properties: {
      type: 'object',
      additionalProperties: {
        $ref: '#'
      },
      'default': {}
    },
    patternProperties: {
      type: 'object',
      additionalProperties: {
        $ref: '#'
      },
      propertyNames: {
        format: 'regex'
      },
      'default': {}
    },
    dependencies: {
      type: 'object',
      additionalProperties: {
        anyOf: [
          {
            $ref: '#'
          },
          {
            $ref: '#/definitions/stringArray'
          }
        ]
      }
    },
    propertyNames: {
      $ref: '#'
    },
    'const': true,
    'enum': {
      type: 'array',
      items: true,
      minItems: 1,
      uniqueItems: true
    },
    type: {
      anyOf: [
        {
          $ref: '#/definitions/simpleTypes'
        },
        {
          type: 'array',
          items: {
            $ref: '#/definitions/simpleTypes'
          },
          minItems: 1,
          uniqueItems: true
        }
      ]
    },
    format: {
      type: 'string'
    },
    contentMediaType: {
      type: 'string'
    },
    contentEncoding: {
      type: 'string'
    },
    'if': {
      $ref: '#'
    },
    then: {
      $ref: '#'
    },
    'else': {
      $ref: '#'
    },
    allOf: {
      $ref: '#/definitions/schemaArray'
    },
    anyOf: {
      $ref: '#/definitions/schemaArray'
    },
    oneOf: {
      $ref: '#/definitions/schemaArray'
    },
    not: {
      $ref: '#'
    }
  }
  const require$$13 = {
    $schema: $schema$1,
    $id: $id$1,
    title,
    definitions,
    type: type$1,
    properties: properties$1,
    'default': true
  }
  var metaSchema = require$$13
  var definition_schema = {
    $id: 'https://github.com/ajv-validator/ajv/blob/master/lib/definition_schema.js',
    definitions: {
      simpleTypes: metaSchema.definitions.simpleTypes
    },
    type: 'object',
    dependencies: {
      schema: ['validate'],
      $data: ['validate'],
      statements: ['inline'],
      valid: { not: { required: ['macro'] } }
    },
    properties: {
      type: metaSchema.properties.type,
      schema: { type: 'boolean' },
      statements: { type: 'boolean' },
      dependencies: {
        type: 'array',
        items: { type: 'string' }
      },
      metaSchema: { type: 'object' },
      modifying: { type: 'boolean' },
      valid: { type: 'boolean' },
      $data: { type: 'boolean' },
      async: { type: 'boolean' },
      errors: {
        anyOf: [{ type: 'boolean' }, { const: 'full' }]
      }
    }
  }
  var IDENTIFIER = /^[a-z_$][a-z0-9_$-]*$/i
  var customRuleCode = custom
  var definitionSchema = definition_schema
  var keyword = {
    add: addKeyword,
    get: getKeyword,
    remove: removeKeyword,
    validate: validateKeyword
  }
  function addKeyword(keyword2, definition) {
    var RULES = this.RULES
    if (RULES.keywords[keyword2]) throw new Error('Keyword ' + keyword2 + ' is already defined')
    if (!IDENTIFIER.test(keyword2)) throw new Error('Keyword ' + keyword2 + ' is not a valid identifier')
    if (definition) {
      this.validateKeyword(definition, true)
      var dataType2 = definition.type
      if (Array.isArray(dataType2)) {
        for (var i = 0; i < dataType2.length; i++) _addRule(keyword2, dataType2[i], definition)
      } else {
        _addRule(keyword2, dataType2, definition)
      }
      var metaSchema2 = definition.metaSchema
      if (metaSchema2) {
        if (definition.$data && this._opts.$data) {
          metaSchema2 = {
            anyOf: [
              metaSchema2,
              { '$ref': 'https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#' }
            ]
          }
        }
        definition.validateSchema = this.compile(metaSchema2, true)
      }
    }
    RULES.keywords[keyword2] = RULES.all[keyword2] = true
    function _addRule(keyword3, dataType3, definition2) {
      var ruleGroup
      for (var i2 = 0; i2 < RULES.length; i2++) {
        var rg = RULES[i2]
        if (rg.type == dataType3) {
          ruleGroup = rg
          break
        }
      }
      if (!ruleGroup) {
        ruleGroup = { type: dataType3, rules: [] }
        RULES.push(ruleGroup)
      }
      var rule = {
        keyword: keyword3,
        definition: definition2,
        custom: true,
        code: customRuleCode,
        implements: definition2.implements
      }
      ruleGroup.rules.push(rule)
      RULES.custom[keyword3] = rule
    }
    return this
  }
  function getKeyword(keyword2) {
    var rule = this.RULES.custom[keyword2]
    return rule ? rule.definition : this.RULES.keywords[keyword2] || false
  }
  function removeKeyword(keyword2) {
    var RULES = this.RULES
    delete RULES.keywords[keyword2]
    delete RULES.all[keyword2]
    delete RULES.custom[keyword2]
    for (var i = 0; i < RULES.length; i++) {
      var rules2 = RULES[i].rules
      for (var j = 0; j < rules2.length; j++) {
        if (rules2[j].keyword == keyword2) {
          rules2.splice(j, 1)
          break
        }
      }
    }
    return this
  }
  function validateKeyword(definition, throwError) {
    validateKeyword.errors = null
    var v = (this._validateKeyword = this._validateKeyword || this.compile(definitionSchema, true))
    if (v(definition)) return true
    validateKeyword.errors = v.errors
    if (throwError) throw new Error('custom keyword definition is invalid: ' + this.errorsText(v.errors))
    else return false
  }
  const $schema = 'http://json-schema.org/draft-07/schema#'
  const $id = 'https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#'
  const description = 'Meta-schema for $data reference (JSON Schema extension proposal)'
  const type = 'object'
  const required = ['$data']
  const properties = {
    $data: {
      type: 'string',
      anyOf: [
        {
          format: 'relative-json-pointer'
        },
        {
          format: 'json-pointer'
        }
      ]
    }
  }
  const additionalProperties = false
  const require$$12 = {
    $schema,
    $id,
    description,
    type,
    required,
    properties,
    additionalProperties
  }
  var compileSchema = compile_1,
    resolve = resolve_1,
    Cache = cacheExports,
    SchemaObject = schema_obj,
    stableStringify = fastJsonStableStringify,
    formats = formats_1,
    rules = rules$1,
    $dataMetaSchema = data,
    util = util$5
  var ajv = Ajv
  Ajv.prototype.validate = validate
  Ajv.prototype.compile = compile
  Ajv.prototype.addSchema = addSchema
  Ajv.prototype.addMetaSchema = addMetaSchema
  Ajv.prototype.validateSchema = validateSchema
  Ajv.prototype.getSchema = getSchema
  Ajv.prototype.removeSchema = removeSchema
  Ajv.prototype.addFormat = addFormat$1
  Ajv.prototype.errorsText = errorsText
  Ajv.prototype._addSchema = _addSchema
  Ajv.prototype._compile = _compile
  Ajv.prototype.compileAsync = async
  var customKeyword = keyword
  Ajv.prototype.addKeyword = customKeyword.add
  Ajv.prototype.getKeyword = customKeyword.get
  Ajv.prototype.removeKeyword = customKeyword.remove
  Ajv.prototype.validateKeyword = customKeyword.validate
  var errorClasses = error_classes
  Ajv.ValidationError = errorClasses.Validation
  Ajv.MissingRefError = errorClasses.MissingRef
  Ajv.$dataMetaSchema = $dataMetaSchema
  var META_SCHEMA_ID = 'http://json-schema.org/draft-07/schema'
  var META_IGNORE_OPTIONS = ['removeAdditional', 'useDefaults', 'coerceTypes', 'strictDefaults']
  var META_SUPPORT_DATA = ['/properties']
  function Ajv(opts) {
    if (!(this instanceof Ajv)) return new Ajv(opts)
    opts = this._opts = util.copy(opts) || {}
    setLogger(this)
    this._schemas = {}
    this._refs = {}
    this._fragments = {}
    this._formats = formats(opts.format)
    this._cache = opts.cache || new Cache()
    this._loadingSchemas = {}
    this._compilations = []
    this.RULES = rules()
    this._getId = chooseGetId(opts)
    opts.loopRequired = opts.loopRequired || Infinity
    if (opts.errorDataPath == 'property') opts._errorDataPathProperty = true
    if (opts.serialize === void 0) opts.serialize = stableStringify
    this._metaOpts = getMetaSchemaOptions(this)
    if (opts.formats) addInitialFormats(this)
    if (opts.keywords) addInitialKeywords(this)
    addDefaultMetaSchema(this)
    if (typeof opts.meta == 'object') this.addMetaSchema(opts.meta)
    if (opts.nullable) this.addKeyword('nullable', { metaSchema: { type: 'boolean' } })
    addInitialSchemas(this)
  }
  function validate(schemaKeyRef, data2) {
    var v
    if (typeof schemaKeyRef == 'string') {
      v = this.getSchema(schemaKeyRef)
      if (!v) throw new Error('no schema with key or ref "' + schemaKeyRef + '"')
    } else {
      var schemaObj = this._addSchema(schemaKeyRef)
      v = schemaObj.validate || this._compile(schemaObj)
    }
    var valid = v(data2)
    if (v.$async !== true) this.errors = v.errors
    return valid
  }
  function compile(schema, _meta) {
    var schemaObj = this._addSchema(schema, void 0, _meta)
    return schemaObj.validate || this._compile(schemaObj)
  }
  function addSchema(schema, key, _skipValidation, _meta) {
    if (Array.isArray(schema)) {
      for (var i = 0; i < schema.length; i++) this.addSchema(schema[i], void 0, _skipValidation, _meta)
      return this
    }
    var id2 = this._getId(schema)
    if (id2 !== void 0 && typeof id2 != 'string') throw new Error('schema id must be string')
    key = resolve.normalizeId(key || id2)
    checkUnique(this, key)
    this._schemas[key] = this._addSchema(schema, _skipValidation, _meta, true)
    return this
  }
  function addMetaSchema(schema, key, skipValidation) {
    this.addSchema(schema, key, skipValidation, true)
    return this
  }
  function validateSchema(schema, throwOrLogError) {
    var $schema2 = schema.$schema
    if ($schema2 !== void 0 && typeof $schema2 != 'string') throw new Error('$schema must be a string')
    $schema2 = $schema2 || this._opts.defaultMeta || defaultMeta(this)
    if (!$schema2) {
      this.logger.warn('meta-schema not available')
      this.errors = null
      return true
    }
    var valid = this.validate($schema2, schema)
    if (!valid && throwOrLogError) {
      var message = 'schema is invalid: ' + this.errorsText()
      if (this._opts.validateSchema == 'log') this.logger.error(message)
      else throw new Error(message)
    }
    return valid
  }
  function defaultMeta(self2) {
    var meta = self2._opts.meta
    self2._opts.defaultMeta =
      typeof meta == 'object' ? self2._getId(meta) || meta : self2.getSchema(META_SCHEMA_ID) ? META_SCHEMA_ID : void 0
    return self2._opts.defaultMeta
  }
  function getSchema(keyRef) {
    var schemaObj = _getSchemaObj(this, keyRef)
    switch (typeof schemaObj) {
      case 'object':
        return schemaObj.validate || this._compile(schemaObj)
      case 'string':
        return this.getSchema(schemaObj)
      case 'undefined':
        return _getSchemaFragment(this, keyRef)
    }
  }
  function _getSchemaFragment(self2, ref2) {
    var res = resolve.schema.call(self2, { schema: {} }, ref2)
    if (res) {
      var schema = res.schema,
        root = res.root,
        baseId = res.baseId
      var v = compileSchema.call(self2, schema, root, void 0, baseId)
      self2._fragments[ref2] = new SchemaObject({
        ref: ref2,
        fragment: true,
        schema,
        root,
        baseId,
        validate: v
      })
      return v
    }
  }
  function _getSchemaObj(self2, keyRef) {
    keyRef = resolve.normalizeId(keyRef)
    return self2._schemas[keyRef] || self2._refs[keyRef] || self2._fragments[keyRef]
  }
  function removeSchema(schemaKeyRef) {
    if (schemaKeyRef instanceof RegExp) {
      _removeAllSchemas(this, this._schemas, schemaKeyRef)
      _removeAllSchemas(this, this._refs, schemaKeyRef)
      return this
    }
    switch (typeof schemaKeyRef) {
      case 'undefined':
        _removeAllSchemas(this, this._schemas)
        _removeAllSchemas(this, this._refs)
        this._cache.clear()
        return this
      case 'string':
        var schemaObj = _getSchemaObj(this, schemaKeyRef)
        if (schemaObj) this._cache.del(schemaObj.cacheKey)
        delete this._schemas[schemaKeyRef]
        delete this._refs[schemaKeyRef]
        return this
      case 'object':
        var serialize2 = this._opts.serialize
        var cacheKey = serialize2 ? serialize2(schemaKeyRef) : schemaKeyRef
        this._cache.del(cacheKey)
        var id2 = this._getId(schemaKeyRef)
        if (id2) {
          id2 = resolve.normalizeId(id2)
          delete this._schemas[id2]
          delete this._refs[id2]
        }
    }
    return this
  }
  function _removeAllSchemas(self2, schemas, regex2) {
    for (var keyRef in schemas) {
      var schemaObj = schemas[keyRef]
      if (!schemaObj.meta && (!regex2 || regex2.test(keyRef))) {
        self2._cache.del(schemaObj.cacheKey)
        delete schemas[keyRef]
      }
    }
  }
  function _addSchema(schema, skipValidation, meta, shouldAddSchema) {
    if (typeof schema != 'object' && typeof schema != 'boolean') throw new Error('schema should be object or boolean')
    var serialize2 = this._opts.serialize
    var cacheKey = serialize2 ? serialize2(schema) : schema
    var cached = this._cache.get(cacheKey)
    if (cached) return cached
    shouldAddSchema = shouldAddSchema || this._opts.addUsedSchema !== false
    var id2 = resolve.normalizeId(this._getId(schema))
    if (id2 && shouldAddSchema) checkUnique(this, id2)
    var willValidate = this._opts.validateSchema !== false && !skipValidation
    var recursiveMeta
    if (willValidate && !(recursiveMeta = id2 && id2 == resolve.normalizeId(schema.$schema)))
      this.validateSchema(schema, true)
    var localRefs = resolve.ids.call(this, schema)
    var schemaObj = new SchemaObject({
      id: id2,
      schema,
      localRefs,
      cacheKey,
      meta
    })
    if (id2[0] != '#' && shouldAddSchema) this._refs[id2] = schemaObj
    this._cache.put(cacheKey, schemaObj)
    if (willValidate && recursiveMeta) this.validateSchema(schema, true)
    return schemaObj
  }
  function _compile(schemaObj, root) {
    if (schemaObj.compiling) {
      schemaObj.validate = callValidate
      callValidate.schema = schemaObj.schema
      callValidate.errors = null
      callValidate.root = root ? root : callValidate
      if (schemaObj.schema.$async === true) callValidate.$async = true
      return callValidate
    }
    schemaObj.compiling = true
    var currentOpts
    if (schemaObj.meta) {
      currentOpts = this._opts
      this._opts = this._metaOpts
    }
    var v
    try {
      v = compileSchema.call(this, schemaObj.schema, root, schemaObj.localRefs)
    } catch (e) {
      delete schemaObj.validate
      throw e
    } finally {
      schemaObj.compiling = false
      if (schemaObj.meta) this._opts = currentOpts
    }
    schemaObj.validate = v
    schemaObj.refs = v.refs
    schemaObj.refVal = v.refVal
    schemaObj.root = v.root
    return v
    function callValidate() {
      var _validate = schemaObj.validate
      var result = _validate.apply(this, arguments)
      callValidate.errors = _validate.errors
      return result
    }
  }
  function chooseGetId(opts) {
    switch (opts.schemaId) {
      case 'auto':
        return _get$IdOrId
      case 'id':
        return _getId
      default:
        return _get$Id
    }
  }
  function _getId(schema) {
    if (schema.$id) this.logger.warn('schema $id ignored', schema.$id)
    return schema.id
  }
  function _get$Id(schema) {
    if (schema.id) this.logger.warn('schema id ignored', schema.id)
    return schema.$id
  }
  function _get$IdOrId(schema) {
    if (schema.$id && schema.id && schema.$id != schema.id) throw new Error('schema $id is different from id')
    return schema.$id || schema.id
  }
  function errorsText(errors2, options) {
    errors2 = errors2 || this.errors
    if (!errors2) return 'No errors'
    options = options || {}
    var separator = options.separator === void 0 ? ', ' : options.separator
    var dataVar = options.dataVar === void 0 ? 'data' : options.dataVar
    var text = ''
    for (var i = 0; i < errors2.length; i++) {
      var e = errors2[i]
      if (e) text += dataVar + e.dataPath + ' ' + e.message + separator
    }
    return text.slice(0, -separator.length)
  }
  function addFormat$1(name, format2) {
    if (typeof format2 == 'string') format2 = new RegExp(format2)
    this._formats[name] = format2
    return this
  }
  function addDefaultMetaSchema(self2) {
    var $dataSchema
    if (self2._opts.$data) {
      $dataSchema = require$$12
      self2.addMetaSchema($dataSchema, $dataSchema.$id, true)
    }
    if (self2._opts.meta === false) return
    var metaSchema2 = require$$13
    if (self2._opts.$data) metaSchema2 = $dataMetaSchema(metaSchema2, META_SUPPORT_DATA)
    self2.addMetaSchema(metaSchema2, META_SCHEMA_ID, true)
    self2._refs['http://json-schema.org/schema'] = META_SCHEMA_ID
  }
  function addInitialSchemas(self2) {
    var optsSchemas = self2._opts.schemas
    if (!optsSchemas) return
    if (Array.isArray(optsSchemas)) self2.addSchema(optsSchemas)
    else for (var key in optsSchemas) self2.addSchema(optsSchemas[key], key)
  }
  function addInitialFormats(self2) {
    for (var name in self2._opts.formats) {
      var format2 = self2._opts.formats[name]
      self2.addFormat(name, format2)
    }
  }
  function addInitialKeywords(self2) {
    for (var name in self2._opts.keywords) {
      var keyword2 = self2._opts.keywords[name]
      self2.addKeyword(name, keyword2)
    }
  }
  function checkUnique(self2, id2) {
    if (self2._schemas[id2] || self2._refs[id2]) throw new Error('schema with key or id "' + id2 + '" already exists')
  }
  function getMetaSchemaOptions(self2) {
    var metaOpts = util.copy(self2._opts)
    for (var i = 0; i < META_IGNORE_OPTIONS.length; i++) delete metaOpts[META_IGNORE_OPTIONS[i]]
    return metaOpts
  }
  function setLogger(self2) {
    var logger = self2._opts.logger
    if (logger === false) {
      self2.logger = { log: noop$1, warn: noop$1, error: noop$1 }
    } else {
      if (logger === void 0) logger = console
      if (!(typeof logger == 'object' && logger.log && logger.warn && logger.error))
        throw new Error('logger must implement log, warn and error methods')
      self2.logger = logger
    }
  }
  function noop$1() {}
  const Ajv$1 = /* @__PURE__ */ getDefaultExportFromCjs(ajv)
  class Client extends Protocol {
    /**
     * Initializes this client with the given name and version information.
     */
    constructor(_clientInfo, options) {
      var _a
      super(options)
      this._clientInfo = _clientInfo
      this._cachedToolOutputValidators = /* @__PURE__ */ new Map()
      this._capabilities =
        (_a = options === null || options === void 0 ? void 0 : options.capabilities) !== null && _a !== void 0
          ? _a
          : {}
      this._ajv = new Ajv$1()
    }
    /**
     * Registers new capabilities. This can only be called before connecting to a transport.
     *
     * The new capabilities will be merged with any existing capabilities previously given (e.g., at initialization).
     */
    registerCapabilities(capabilities) {
      if (this.transport) {
        throw new Error('Cannot register capabilities after connecting to transport')
      }
      this._capabilities = mergeCapabilities(this._capabilities, capabilities)
    }
    assertCapability(capability, method) {
      var _a
      if (!((_a = this._serverCapabilities) === null || _a === void 0 ? void 0 : _a[capability])) {
        throw new Error(`Server does not support ${capability} (required for ${method})`)
      }
    }
    async connect(transport, options) {
      await super.connect(transport)
      if (transport.sessionId !== void 0) {
        return
      }
      try {
        const result = await this.request(
          {
            method: 'initialize',
            params: {
              protocolVersion: LATEST_PROTOCOL_VERSION,
              capabilities: this._capabilities,
              clientInfo: this._clientInfo
            }
          },
          InitializeResultSchema,
          options
        )
        if (result === void 0) {
          throw new Error(`Server sent invalid initialize result: ${result}`)
        }
        if (!SUPPORTED_PROTOCOL_VERSIONS.includes(result.protocolVersion)) {
          throw new Error(`Server's protocol version is not supported: ${result.protocolVersion}`)
        }
        this._serverCapabilities = result.capabilities
        this._serverVersion = result.serverInfo
        if (transport.setProtocolVersion) {
          transport.setProtocolVersion(result.protocolVersion)
        }
        this._instructions = result.instructions
        await this.notification({
          method: 'notifications/initialized'
        })
      } catch (error2) {
        void this.close()
        throw error2
      }
    }
    /**
     * After initialization has completed, this will be populated with the server's reported capabilities.
     */
    getServerCapabilities() {
      return this._serverCapabilities
    }
    /**
     * After initialization has completed, this will be populated with information about the server's name and version.
     */
    getServerVersion() {
      return this._serverVersion
    }
    /**
     * After initialization has completed, this may be populated with information about the server's instructions.
     */
    getInstructions() {
      return this._instructions
    }
    assertCapabilityForMethod(method) {
      var _a, _b, _c, _d, _e
      switch (method) {
        case 'logging/setLevel':
          if (!((_a = this._serverCapabilities) === null || _a === void 0 ? void 0 : _a.logging)) {
            throw new Error(`Server does not support logging (required for ${method})`)
          }
          break
        case 'prompts/get':
        case 'prompts/list':
          if (!((_b = this._serverCapabilities) === null || _b === void 0 ? void 0 : _b.prompts)) {
            throw new Error(`Server does not support prompts (required for ${method})`)
          }
          break
        case 'resources/list':
        case 'resources/templates/list':
        case 'resources/read':
        case 'resources/subscribe':
        case 'resources/unsubscribe':
          if (!((_c = this._serverCapabilities) === null || _c === void 0 ? void 0 : _c.resources)) {
            throw new Error(`Server does not support resources (required for ${method})`)
          }
          if (method === 'resources/subscribe' && !this._serverCapabilities.resources.subscribe) {
            throw new Error(`Server does not support resource subscriptions (required for ${method})`)
          }
          break
        case 'tools/call':
        case 'tools/list':
          if (!((_d = this._serverCapabilities) === null || _d === void 0 ? void 0 : _d.tools)) {
            throw new Error(`Server does not support tools (required for ${method})`)
          }
          break
        case 'completion/complete':
          if (!((_e = this._serverCapabilities) === null || _e === void 0 ? void 0 : _e.completions)) {
            throw new Error(`Server does not support completions (required for ${method})`)
          }
          break
      }
    }
    assertNotificationCapability(method) {
      var _a
      switch (method) {
        case 'notifications/roots/list_changed':
          if (!((_a = this._capabilities.roots) === null || _a === void 0 ? void 0 : _a.listChanged)) {
            throw new Error(`Client does not support roots list changed notifications (required for ${method})`)
          }
          break
      }
    }
    assertRequestHandlerCapability(method) {
      switch (method) {
        case 'sampling/createMessage':
          if (!this._capabilities.sampling) {
            throw new Error(`Client does not support sampling capability (required for ${method})`)
          }
          break
        case 'elicitation/create':
          if (!this._capabilities.elicitation) {
            throw new Error(`Client does not support elicitation capability (required for ${method})`)
          }
          break
        case 'roots/list':
          if (!this._capabilities.roots) {
            throw new Error(`Client does not support roots capability (required for ${method})`)
          }
          break
      }
    }
    async ping(options) {
      return this.request({ method: 'ping' }, EmptyResultSchema, options)
    }
    async complete(params, options) {
      return this.request({ method: 'completion/complete', params }, CompleteResultSchema, options)
    }
    async setLoggingLevel(level, options) {
      return this.request({ method: 'logging/setLevel', params: { level } }, EmptyResultSchema, options)
    }
    async getPrompt(params, options) {
      return this.request({ method: 'prompts/get', params }, GetPromptResultSchema, options)
    }
    async listPrompts(params, options) {
      return this.request({ method: 'prompts/list', params }, ListPromptsResultSchema, options)
    }
    async listResources(params, options) {
      return this.request({ method: 'resources/list', params }, ListResourcesResultSchema, options)
    }
    async listResourceTemplates(params, options) {
      return this.request({ method: 'resources/templates/list', params }, ListResourceTemplatesResultSchema, options)
    }
    async readResource(params, options) {
      return this.request({ method: 'resources/read', params }, ReadResourceResultSchema, options)
    }
    async subscribeResource(params, options) {
      return this.request({ method: 'resources/subscribe', params }, EmptyResultSchema, options)
    }
    async unsubscribeResource(params, options) {
      return this.request({ method: 'resources/unsubscribe', params }, EmptyResultSchema, options)
    }
    async callTool(params, resultSchema = CallToolResultSchema, options) {
      const result = await this.request({ method: 'tools/call', params }, resultSchema, options)
      const validator = this.getToolOutputValidator(params.name)
      if (validator) {
        if (!result.structuredContent && !result.isError) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Tool ${params.name} has an output schema but did not return structured content`
          )
        }
        if (result.structuredContent) {
          try {
            const isValid2 = validator(result.structuredContent)
            if (!isValid2) {
              throw new McpError(
                ErrorCode.InvalidParams,
                `Structured content does not match the tool's output schema: ${this._ajv.errorsText(validator.errors)}`
              )
            }
          } catch (error2) {
            if (error2 instanceof McpError) {
              throw error2
            }
            throw new McpError(
              ErrorCode.InvalidParams,
              `Failed to validate structured content: ${error2 instanceof Error ? error2.message : String(error2)}`
            )
          }
        }
      }
      return result
    }
    cacheToolOutputSchemas(tools) {
      this._cachedToolOutputValidators.clear()
      for (const tool of tools) {
        if (tool.outputSchema) {
          try {
            const validator = this._ajv.compile(tool.outputSchema)
            this._cachedToolOutputValidators.set(tool.name, validator)
          } catch (_a) {}
        }
      }
    }
    getToolOutputValidator(toolName) {
      return this._cachedToolOutputValidators.get(toolName)
    }
    async listTools(params, options) {
      const result = await this.request({ method: 'tools/list', params }, ListToolsResultSchema, options)
      this.cacheToolOutputSchemas(result.tools)
      return result
    }
    async sendRootsListChanged() {
      return this.notification({ method: 'notifications/roots/list_changed' })
    }
  }
  class ParseError extends Error {
    constructor(message, options) {
      ;(super(message),
        (this.name = 'ParseError'),
        (this.type = options.type),
        (this.field = options.field),
        (this.value = options.value),
        (this.line = options.line))
    }
  }
  function noop(_arg) {}
  function createParser(callbacks) {
    if (typeof callbacks == 'function')
      throw new TypeError('`callbacks` must be an object, got a function instead. Did you mean `{onEvent: fn}`?')
    const { onEvent = noop, onError = noop, onRetry = noop, onComment } = callbacks
    let incompleteLine = '',
      isFirstChunk = true,
      id2,
      data2 = '',
      eventType = ''
    function feed(newChunk) {
      const chunk = isFirstChunk ? newChunk.replace(/^\xEF\xBB\xBF/, '') : newChunk,
        [complete, incomplete] = splitLines(`${incompleteLine}${chunk}`)
      for (const line of complete) parseLine(line)
      ;((incompleteLine = incomplete), (isFirstChunk = false))
    }
    function parseLine(line) {
      if (line === '') {
        dispatchEvent()
        return
      }
      if (line.startsWith(':')) {
        onComment && onComment(line.slice(line.startsWith(': ') ? 2 : 1))
        return
      }
      const fieldSeparatorIndex = line.indexOf(':')
      if (fieldSeparatorIndex !== -1) {
        const field = line.slice(0, fieldSeparatorIndex),
          offset = line[fieldSeparatorIndex + 1] === ' ' ? 2 : 1,
          value = line.slice(fieldSeparatorIndex + offset)
        processField(field, value, line)
        return
      }
      processField(line, '', line)
    }
    function processField(field, value, line) {
      switch (field) {
        case 'event':
          eventType = value
          break
        case 'data':
          data2 = `${data2}${value}
`
          break
        case 'id':
          id2 = value.includes('\0') ? void 0 : value
          break
        case 'retry':
          ;/^\d+$/.test(value)
            ? onRetry(parseInt(value, 10))
            : onError(
                new ParseError(`Invalid \`retry\` value: "${value}"`, {
                  type: 'invalid-retry',
                  value,
                  line
                })
              )
          break
        default:
          onError(
            new ParseError(`Unknown field "${field.length > 20 ? `${field.slice(0, 20)}…` : field}"`, {
              type: 'unknown-field',
              field,
              value,
              line
            })
          )
          break
      }
    }
    function dispatchEvent() {
      ;(data2.length > 0 &&
        onEvent({
          id: id2,
          event: eventType || void 0,
          // If the data buffer's last character is a U+000A LINE FEED (LF) character,
          // then remove the last character from the data buffer.
          data: data2.endsWith(`
`)
            ? data2.slice(0, -1)
            : data2
        }),
        (id2 = void 0),
        (data2 = ''),
        (eventType = ''))
    }
    function reset(options = {}) {
      ;(incompleteLine && options.consume && parseLine(incompleteLine),
        (isFirstChunk = true),
        (id2 = void 0),
        (data2 = ''),
        (eventType = ''),
        (incompleteLine = ''))
    }
    return { feed, reset }
  }
  function splitLines(chunk) {
    const lines = []
    let incompleteLine = '',
      searchIndex = 0
    for (; searchIndex < chunk.length; ) {
      const crIndex = chunk.indexOf('\r', searchIndex),
        lfIndex = chunk.indexOf(
          `
`,
          searchIndex
        )
      let lineEnd = -1
      if (
        (crIndex !== -1 && lfIndex !== -1
          ? (lineEnd = Math.min(crIndex, lfIndex))
          : crIndex !== -1
            ? (lineEnd = crIndex)
            : lfIndex !== -1 && (lineEnd = lfIndex),
        lineEnd === -1)
      ) {
        incompleteLine = chunk.slice(searchIndex)
        break
      } else {
        const line = chunk.slice(searchIndex, lineEnd)
        ;(lines.push(line),
          (searchIndex = lineEnd + 1),
          chunk[searchIndex - 1] === '\r' &&
            chunk[searchIndex] ===
              `
` &&
            searchIndex++)
      }
    }
    return [lines, incompleteLine]
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
      var _a, _b
      ;(super(type2),
        (this.code = (_a = errorEventInitDict == null ? void 0 : errorEventInitDict.code) != null ? _a : void 0),
        (this.message = (_b = errorEventInitDict == null ? void 0 : errorEventInitDict.message) != null ? _b : void 0))
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
    [Symbol.for('nodejs.util.inspect.custom')](_depth, options, inspect) {
      return inspect(inspectableError(this), options)
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
    [Symbol.for('Deno.customInspect')](inspect, options) {
      return inspect(inspectableError(this), options)
    }
  }
  function syntaxError(message) {
    const DomException = globalThis.DOMException
    return typeof DomException == 'function' ? new DomException(message, 'SyntaxError') : new SyntaxError(message)
  }
  function flattenError(err) {
    return err instanceof Error
      ? 'errors' in err && Array.isArray(err.errors)
        ? err.errors.map(flattenError).join(', ')
        : 'cause' in err && err.cause instanceof Error
          ? `${err}: ${flattenError(err.cause)}`
          : err.message
      : `${err}`
  }
  function inspectableError(err) {
    return {
      type: err.type,
      message: err.message,
      code: err.code,
      defaultPrevented: err.defaultPrevented,
      cancelable: err.cancelable,
      timeStamp: err.timeStamp
    }
  }
  var __typeError = (msg) => {
      throw TypeError(msg)
    },
    __accessCheck = (obj, member, msg) => member.has(obj) || __typeError('Cannot ' + msg),
    __privateGet = (obj, member, getter) => (
      __accessCheck(obj, member, 'read from private field'),
      getter ? getter.call(obj) : member.get(obj)
    ),
    __privateAdd = (obj, member, value) =>
      member.has(obj)
        ? __typeError('Cannot add the same private member more than once')
        : member instanceof WeakSet
          ? member.add(obj)
          : member.set(obj, value),
    __privateSet = (obj, member, value, setter) => (
      __accessCheck(obj, member, 'write to private field'),
      member.set(obj, value),
      value
    ),
    __privateMethod = (obj, member, method) => (__accessCheck(obj, member, 'access private method'), method),
    _readyState,
    _url,
    _redirectUrl,
    _withCredentials,
    _fetch,
    _reconnectInterval,
    _reconnectTimer,
    _lastEventId,
    _controller,
    _parser,
    _onError,
    _onMessage,
    _onOpen,
    _EventSource_instances,
    connect_fn,
    _onFetchResponse,
    _onFetchError,
    getRequestOptions_fn,
    _onEvent,
    _onRetryChange,
    failConnection_fn,
    scheduleReconnect_fn,
    _reconnect
  class EventSource extends EventTarget {
    constructor(url, eventSourceInitDict) {
      var _a, _b
      ;(super(),
        __privateAdd(this, _EventSource_instances),
        (this.CONNECTING = 0),
        (this.OPEN = 1),
        (this.CLOSED = 2),
        __privateAdd(this, _readyState),
        __privateAdd(this, _url),
        __privateAdd(this, _redirectUrl),
        __privateAdd(this, _withCredentials),
        __privateAdd(this, _fetch),
        __privateAdd(this, _reconnectInterval),
        __privateAdd(this, _reconnectTimer),
        __privateAdd(this, _lastEventId, null),
        __privateAdd(this, _controller),
        __privateAdd(this, _parser),
        __privateAdd(this, _onError, null),
        __privateAdd(this, _onMessage, null),
        __privateAdd(this, _onOpen, null),
        __privateAdd(this, _onFetchResponse, async (response) => {
          var _a2
          __privateGet(this, _parser).reset()
          const { body, redirected, status, headers } = response
          if (status === 204) {
            ;(__privateMethod(this, _EventSource_instances, failConnection_fn).call(
              this,
              'Server sent HTTP 204, not reconnecting',
              204
            ),
              this.close())
            return
          }
          if (
            (redirected
              ? __privateSet(this, _redirectUrl, new URL(response.url))
              : __privateSet(this, _redirectUrl, void 0),
            status !== 200)
          ) {
            __privateMethod(this, _EventSource_instances, failConnection_fn).call(
              this,
              `Non-200 status code (${status})`,
              status
            )
            return
          }
          if (!(headers.get('content-type') || '').startsWith('text/event-stream')) {
            __privateMethod(this, _EventSource_instances, failConnection_fn).call(
              this,
              'Invalid content type, expected "text/event-stream"',
              status
            )
            return
          }
          if (__privateGet(this, _readyState) === this.CLOSED) return
          __privateSet(this, _readyState, this.OPEN)
          const openEvent = new Event('open')
          if (
            ((_a2 = __privateGet(this, _onOpen)) == null || _a2.call(this, openEvent),
            this.dispatchEvent(openEvent),
            typeof body != 'object' || !body || !('getReader' in body))
          ) {
            ;(__privateMethod(this, _EventSource_instances, failConnection_fn).call(
              this,
              'Invalid response body, expected a web ReadableStream',
              status
            ),
              this.close())
            return
          }
          const decoder = new TextDecoder(),
            reader = body.getReader()
          let open = true
          do {
            const { done, value } = await reader.read()
            ;(value && __privateGet(this, _parser).feed(decoder.decode(value, { stream: !done })),
              done &&
                ((open = false),
                __privateGet(this, _parser).reset(),
                __privateMethod(this, _EventSource_instances, scheduleReconnect_fn).call(this)))
          } while (open)
        }),
        __privateAdd(this, _onFetchError, (err) => {
          ;(__privateSet(this, _controller, void 0),
            !(err.name === 'AbortError' || err.type === 'aborted') &&
              __privateMethod(this, _EventSource_instances, scheduleReconnect_fn).call(this, flattenError(err)))
        }),
        __privateAdd(this, _onEvent, (event) => {
          typeof event.id == 'string' && __privateSet(this, _lastEventId, event.id)
          const messageEvent = new MessageEvent(event.event || 'message', {
            data: event.data,
            origin: __privateGet(this, _redirectUrl)
              ? __privateGet(this, _redirectUrl).origin
              : __privateGet(this, _url).origin,
            lastEventId: event.id || ''
          })
          ;(__privateGet(this, _onMessage) &&
            (!event.event || event.event === 'message') &&
            __privateGet(this, _onMessage).call(this, messageEvent),
            this.dispatchEvent(messageEvent))
        }),
        __privateAdd(this, _onRetryChange, (value) => {
          __privateSet(this, _reconnectInterval, value)
        }),
        __privateAdd(this, _reconnect, () => {
          ;(__privateSet(this, _reconnectTimer, void 0),
            __privateGet(this, _readyState) === this.CONNECTING &&
              __privateMethod(this, _EventSource_instances, connect_fn).call(this))
        }))
      try {
        if (url instanceof URL) __privateSet(this, _url, url)
        else if (typeof url == 'string') __privateSet(this, _url, new URL(url, getBaseURL()))
        else throw new Error('Invalid URL')
      } catch {
        throw syntaxError('An invalid or illegal string was specified')
      }
      ;(__privateSet(
        this,
        _parser,
        createParser({
          onEvent: __privateGet(this, _onEvent),
          onRetry: __privateGet(this, _onRetryChange)
        })
      ),
        __privateSet(this, _readyState, this.CONNECTING),
        __privateSet(this, _reconnectInterval, 3e3),
        __privateSet(
          this,
          _fetch,
          (_a = eventSourceInitDict == null ? void 0 : eventSourceInitDict.fetch) != null ? _a : globalThis.fetch
        ),
        __privateSet(
          this,
          _withCredentials,
          (_b = eventSourceInitDict == null ? void 0 : eventSourceInitDict.withCredentials) != null ? _b : false
        ),
        __privateMethod(this, _EventSource_instances, connect_fn).call(this))
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
      return __privateGet(this, _readyState)
    }
    /**
     * Returns the URL providing the event stream.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/url)
     *
     * @public
     */
    get url() {
      return __privateGet(this, _url).href
    }
    /**
     * Returns true if the credentials mode for connection requests to the URL providing the event stream is set to "include", and false otherwise.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/withCredentials)
     */
    get withCredentials() {
      return __privateGet(this, _withCredentials)
    }
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/error_event) */
    get onerror() {
      return __privateGet(this, _onError)
    }
    set onerror(value) {
      __privateSet(this, _onError, value)
    }
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/message_event) */
    get onmessage() {
      return __privateGet(this, _onMessage)
    }
    set onmessage(value) {
      __privateSet(this, _onMessage, value)
    }
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/open_event) */
    get onopen() {
      return __privateGet(this, _onOpen)
    }
    set onopen(value) {
      __privateSet(this, _onOpen, value)
    }
    addEventListener(type2, listener, options) {
      const listen = listener
      super.addEventListener(type2, listen, options)
    }
    removeEventListener(type2, listener, options) {
      const listen = listener
      super.removeEventListener(type2, listen, options)
    }
    /**
     * Aborts any instances of the fetch algorithm started for this EventSource object, and sets the readyState attribute to CLOSED.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/close)
     *
     * @public
     */
    close() {
      ;(__privateGet(this, _reconnectTimer) && clearTimeout(__privateGet(this, _reconnectTimer)),
        __privateGet(this, _readyState) !== this.CLOSED &&
          (__privateGet(this, _controller) && __privateGet(this, _controller).abort(),
          __privateSet(this, _readyState, this.CLOSED),
          __privateSet(this, _controller, void 0)))
    }
  }
  ;((_readyState = /* @__PURE__ */ new WeakMap()),
    (_url = /* @__PURE__ */ new WeakMap()),
    (_redirectUrl = /* @__PURE__ */ new WeakMap()),
    (_withCredentials = /* @__PURE__ */ new WeakMap()),
    (_fetch = /* @__PURE__ */ new WeakMap()),
    (_reconnectInterval = /* @__PURE__ */ new WeakMap()),
    (_reconnectTimer = /* @__PURE__ */ new WeakMap()),
    (_lastEventId = /* @__PURE__ */ new WeakMap()),
    (_controller = /* @__PURE__ */ new WeakMap()),
    (_parser = /* @__PURE__ */ new WeakMap()),
    (_onError = /* @__PURE__ */ new WeakMap()),
    (_onMessage = /* @__PURE__ */ new WeakMap()),
    (_onOpen = /* @__PURE__ */ new WeakMap()),
    (_EventSource_instances = /* @__PURE__ */ new WeakSet()) /**
     * Connect to the given URL and start receiving events
     *
     * @internal
     */,
    (connect_fn = function () {
      ;(__privateSet(this, _readyState, this.CONNECTING),
        __privateSet(this, _controller, new AbortController()),
        __privateGet(this, _fetch)(
          __privateGet(this, _url),
          __privateMethod(this, _EventSource_instances, getRequestOptions_fn).call(this)
        )
          .then(__privateGet(this, _onFetchResponse))
          .catch(__privateGet(this, _onFetchError)))
    }),
    (_onFetchResponse = /* @__PURE__ */ new WeakMap()),
    (_onFetchError = /* @__PURE__ */ new WeakMap()) /**
     * Get request options for the `fetch()` request
     *
     * @returns The request options
     * @internal
     */,
    (getRequestOptions_fn = function () {
      var _a
      const init = {
        // [spec] Let `corsAttributeState` be `Anonymous`…
        // [spec] …will have their mode set to "cors"…
        mode: 'cors',
        redirect: 'follow',
        headers: {
          Accept: 'text/event-stream',
          ...(__privateGet(this, _lastEventId) ? { 'Last-Event-ID': __privateGet(this, _lastEventId) } : void 0)
        },
        cache: 'no-store',
        signal: (_a = __privateGet(this, _controller)) == null ? void 0 : _a.signal
      }
      return ('window' in globalThis && (init.credentials = this.withCredentials ? 'include' : 'same-origin'), init)
    }),
    (_onEvent = /* @__PURE__ */ new WeakMap()),
    (_onRetryChange = /* @__PURE__ */ new WeakMap()) /**
     * Handles the process referred to in the EventSource specification as "failing a connection".
     *
     * @param error - The error causing the connection to fail
     * @param code - The HTTP status code, if available
     * @internal
     */,
    (failConnection_fn = function (message, code2) {
      var _a
      __privateGet(this, _readyState) !== this.CLOSED && __privateSet(this, _readyState, this.CLOSED)
      const errorEvent = new ErrorEvent('error', { code: code2, message })
      ;((_a = __privateGet(this, _onError)) == null || _a.call(this, errorEvent), this.dispatchEvent(errorEvent))
    }) /**
     * Schedules a reconnection attempt against the EventSource endpoint.
     *
     * @param message - The error causing the connection to fail
     * @param code - The HTTP status code, if available
     * @internal
     */,
    (scheduleReconnect_fn = function (message, code2) {
      var _a
      if (__privateGet(this, _readyState) === this.CLOSED) return
      __privateSet(this, _readyState, this.CONNECTING)
      const errorEvent = new ErrorEvent('error', { code: code2, message })
      ;((_a = __privateGet(this, _onError)) == null || _a.call(this, errorEvent),
        this.dispatchEvent(errorEvent),
        __privateSet(
          this,
          _reconnectTimer,
          setTimeout(__privateGet(this, _reconnect), __privateGet(this, _reconnectInterval))
        ))
    }),
    (_reconnect = /* @__PURE__ */ new WeakMap()) /**
     * ReadyState representing an EventSource currently trying to connect
     *
     * @public
     */,
    (EventSource.CONNECTING = 0) /**
     * ReadyState representing an EventSource connection that is open (eg connected)
     *
     * @public
     */,
    (EventSource.OPEN = 1) /**
     * ReadyState representing an EventSource connection that is closed (eg disconnected)
     *
     * @public
     */,
    (EventSource.CLOSED = 2))
  function getBaseURL() {
    const doc = 'document' in globalThis ? globalThis.document : void 0
    return doc && typeof doc == 'object' && 'baseURI' in doc && typeof doc.baseURI == 'string' ? doc.baseURI : void 0
  }
  let crypto$1
  crypto$1 = globalThis.crypto
  async function getRandomValues$1(size) {
    return (await crypto$1).getRandomValues(new Uint8Array(size))
  }
  async function random(size) {
    const mask = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~'
    let result = ''
    const randomUints = await getRandomValues$1(size)
    for (let i = 0; i < size; i++) {
      const randomIndex = randomUints[i] % mask.length
      result += mask[randomIndex]
    }
    return result
  }
  async function generateVerifier(length) {
    return await random(length)
  }
  async function generateChallenge(code_verifier) {
    const buffer = await (await crypto$1).subtle.digest('SHA-256', new TextEncoder().encode(code_verifier))
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
      .replace(/\//g, '_')
      .replace(/\+/g, '-')
      .replace(/=/g, '')
  }
  async function pkceChallenge(length) {
    if (!length) length = 43
    if (length < 43 || length > 128) {
      throw `Expected a length between 43 and 128. Received ${length}.`
    }
    const verifier = await generateVerifier(length)
    const challenge = await generateChallenge(verifier)
    return {
      code_verifier: verifier,
      code_challenge: challenge
    }
  }
  const OAuthProtectedResourceMetadataSchema = objectType({
    resource: stringType().url(),
    authorization_servers: arrayType(stringType().url()).optional(),
    jwks_uri: stringType().url().optional(),
    scopes_supported: arrayType(stringType()).optional(),
    bearer_methods_supported: arrayType(stringType()).optional(),
    resource_signing_alg_values_supported: arrayType(stringType()).optional(),
    resource_name: stringType().optional(),
    resource_documentation: stringType().optional(),
    resource_policy_uri: stringType().url().optional(),
    resource_tos_uri: stringType().url().optional(),
    tls_client_certificate_bound_access_tokens: booleanType().optional(),
    authorization_details_types_supported: arrayType(stringType()).optional(),
    dpop_signing_alg_values_supported: arrayType(stringType()).optional(),
    dpop_bound_access_tokens_required: booleanType().optional()
  }).passthrough()
  const OAuthMetadataSchema = objectType({
    issuer: stringType(),
    authorization_endpoint: stringType(),
    token_endpoint: stringType(),
    registration_endpoint: stringType().optional(),
    scopes_supported: arrayType(stringType()).optional(),
    response_types_supported: arrayType(stringType()),
    response_modes_supported: arrayType(stringType()).optional(),
    grant_types_supported: arrayType(stringType()).optional(),
    token_endpoint_auth_methods_supported: arrayType(stringType()).optional(),
    token_endpoint_auth_signing_alg_values_supported: arrayType(stringType()).optional(),
    service_documentation: stringType().optional(),
    revocation_endpoint: stringType().optional(),
    revocation_endpoint_auth_methods_supported: arrayType(stringType()).optional(),
    revocation_endpoint_auth_signing_alg_values_supported: arrayType(stringType()).optional(),
    introspection_endpoint: stringType().optional(),
    introspection_endpoint_auth_methods_supported: arrayType(stringType()).optional(),
    introspection_endpoint_auth_signing_alg_values_supported: arrayType(stringType()).optional(),
    code_challenge_methods_supported: arrayType(stringType()).optional()
  }).passthrough()
  const OpenIdProviderMetadataSchema = objectType({
    issuer: stringType(),
    authorization_endpoint: stringType(),
    token_endpoint: stringType(),
    userinfo_endpoint: stringType().optional(),
    jwks_uri: stringType(),
    registration_endpoint: stringType().optional(),
    scopes_supported: arrayType(stringType()).optional(),
    response_types_supported: arrayType(stringType()),
    response_modes_supported: arrayType(stringType()).optional(),
    grant_types_supported: arrayType(stringType()).optional(),
    acr_values_supported: arrayType(stringType()).optional(),
    subject_types_supported: arrayType(stringType()),
    id_token_signing_alg_values_supported: arrayType(stringType()),
    id_token_encryption_alg_values_supported: arrayType(stringType()).optional(),
    id_token_encryption_enc_values_supported: arrayType(stringType()).optional(),
    userinfo_signing_alg_values_supported: arrayType(stringType()).optional(),
    userinfo_encryption_alg_values_supported: arrayType(stringType()).optional(),
    userinfo_encryption_enc_values_supported: arrayType(stringType()).optional(),
    request_object_signing_alg_values_supported: arrayType(stringType()).optional(),
    request_object_encryption_alg_values_supported: arrayType(stringType()).optional(),
    request_object_encryption_enc_values_supported: arrayType(stringType()).optional(),
    token_endpoint_auth_methods_supported: arrayType(stringType()).optional(),
    token_endpoint_auth_signing_alg_values_supported: arrayType(stringType()).optional(),
    display_values_supported: arrayType(stringType()).optional(),
    claim_types_supported: arrayType(stringType()).optional(),
    claims_supported: arrayType(stringType()).optional(),
    service_documentation: stringType().optional(),
    claims_locales_supported: arrayType(stringType()).optional(),
    ui_locales_supported: arrayType(stringType()).optional(),
    claims_parameter_supported: booleanType().optional(),
    request_parameter_supported: booleanType().optional(),
    request_uri_parameter_supported: booleanType().optional(),
    require_request_uri_registration: booleanType().optional(),
    op_policy_uri: stringType().optional(),
    op_tos_uri: stringType().optional()
  }).passthrough()
  const OpenIdProviderDiscoveryMetadataSchema = OpenIdProviderMetadataSchema.merge(
    OAuthMetadataSchema.pick({
      code_challenge_methods_supported: true
    })
  )
  const OAuthTokensSchema = objectType({
    access_token: stringType(),
    id_token: stringType().optional(),
    // Optional for OAuth 2.1, but necessary in OpenID Connect
    token_type: stringType(),
    expires_in: numberType().optional(),
    scope: stringType().optional(),
    refresh_token: stringType().optional()
  }).strip()
  const OAuthErrorResponseSchema = objectType({
    error: stringType(),
    error_description: stringType().optional(),
    error_uri: stringType().optional()
  })
  const OAuthClientMetadataSchema = objectType({
    redirect_uris: arrayType(stringType()).refine((uris) => uris.every((uri2) => URL.canParse(uri2)), {
      message: 'redirect_uris must contain valid URLs'
    }),
    token_endpoint_auth_method: stringType().optional(),
    grant_types: arrayType(stringType()).optional(),
    response_types: arrayType(stringType()).optional(),
    client_name: stringType().optional(),
    client_uri: stringType().optional(),
    logo_uri: stringType().optional(),
    scope: stringType().optional(),
    contacts: arrayType(stringType()).optional(),
    tos_uri: stringType().optional(),
    policy_uri: stringType().optional(),
    jwks_uri: stringType().optional(),
    jwks: anyType().optional(),
    software_id: stringType().optional(),
    software_version: stringType().optional(),
    software_statement: stringType().optional()
  }).strip()
  const OAuthClientInformationSchema = objectType({
    client_id: stringType(),
    client_secret: stringType().optional(),
    client_id_issued_at: numberType().optional(),
    client_secret_expires_at: numberType().optional()
  }).strip()
  const OAuthClientInformationFullSchema = OAuthClientMetadataSchema.merge(OAuthClientInformationSchema)
  objectType({
    error: stringType(),
    error_description: stringType().optional()
  }).strip()
  objectType({
    token: stringType(),
    token_type_hint: stringType().optional()
  }).strip()
  function resourceUrlFromServerUrl(url) {
    const resourceURL = typeof url === 'string' ? new URL(url) : new URL(url.href)
    resourceURL.hash = ''
    return resourceURL
  }
  function checkResourceAllowed({ requestedResource, configuredResource }) {
    const requested =
      typeof requestedResource === 'string' ? new URL(requestedResource) : new URL(requestedResource.href)
    const configured =
      typeof configuredResource === 'string' ? new URL(configuredResource) : new URL(configuredResource.href)
    if (requested.origin !== configured.origin) {
      return false
    }
    if (requested.pathname.length < configured.pathname.length) {
      return false
    }
    const requestedPath = requested.pathname.endsWith('/') ? requested.pathname : requested.pathname + '/'
    const configuredPath = configured.pathname.endsWith('/') ? configured.pathname : configured.pathname + '/'
    return requestedPath.startsWith(configuredPath)
  }
  class OAuthError extends Error {
    constructor(message, errorUri) {
      super(message)
      this.errorUri = errorUri
      this.name = this.constructor.name
    }
    /**
     * Converts the error to a standard OAuth error response object
     */
    toResponseObject() {
      const response = {
        error: this.errorCode,
        error_description: this.message
      }
      if (this.errorUri) {
        response.error_uri = this.errorUri
      }
      return response
    }
    get errorCode() {
      return this.constructor.errorCode
    }
  }
  class InvalidRequestError extends OAuthError {}
  InvalidRequestError.errorCode = 'invalid_request'
  class InvalidClientError extends OAuthError {}
  InvalidClientError.errorCode = 'invalid_client'
  class InvalidGrantError extends OAuthError {}
  InvalidGrantError.errorCode = 'invalid_grant'
  class UnauthorizedClientError extends OAuthError {}
  UnauthorizedClientError.errorCode = 'unauthorized_client'
  class UnsupportedGrantTypeError extends OAuthError {}
  UnsupportedGrantTypeError.errorCode = 'unsupported_grant_type'
  class InvalidScopeError extends OAuthError {}
  InvalidScopeError.errorCode = 'invalid_scope'
  class AccessDeniedError extends OAuthError {}
  AccessDeniedError.errorCode = 'access_denied'
  class ServerError extends OAuthError {}
  ServerError.errorCode = 'server_error'
  class TemporarilyUnavailableError extends OAuthError {}
  TemporarilyUnavailableError.errorCode = 'temporarily_unavailable'
  class UnsupportedResponseTypeError extends OAuthError {}
  UnsupportedResponseTypeError.errorCode = 'unsupported_response_type'
  class UnsupportedTokenTypeError extends OAuthError {}
  UnsupportedTokenTypeError.errorCode = 'unsupported_token_type'
  class InvalidTokenError extends OAuthError {}
  InvalidTokenError.errorCode = 'invalid_token'
  class MethodNotAllowedError extends OAuthError {}
  MethodNotAllowedError.errorCode = 'method_not_allowed'
  class TooManyRequestsError extends OAuthError {}
  TooManyRequestsError.errorCode = 'too_many_requests'
  class InvalidClientMetadataError extends OAuthError {}
  InvalidClientMetadataError.errorCode = 'invalid_client_metadata'
  class InsufficientScopeError extends OAuthError {}
  InsufficientScopeError.errorCode = 'insufficient_scope'
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
    [InsufficientScopeError.errorCode]: InsufficientScopeError
  }
  class UnauthorizedError extends Error {
    constructor(message) {
      super(message !== null && message !== void 0 ? message : 'Unauthorized')
    }
  }
  function selectClientAuthMethod(clientInformation, supportedMethods) {
    const hasClientSecret = clientInformation.client_secret !== void 0
    if (supportedMethods.length === 0) {
      return hasClientSecret ? 'client_secret_post' : 'none'
    }
    if (hasClientSecret && supportedMethods.includes('client_secret_basic')) {
      return 'client_secret_basic'
    }
    if (hasClientSecret && supportedMethods.includes('client_secret_post')) {
      return 'client_secret_post'
    }
    if (supportedMethods.includes('none')) {
      return 'none'
    }
    return hasClientSecret ? 'client_secret_post' : 'none'
  }
  function applyClientAuthentication(method, clientInformation, headers, params) {
    const { client_id, client_secret } = clientInformation
    switch (method) {
      case 'client_secret_basic':
        applyBasicAuth(client_id, client_secret, headers)
        return
      case 'client_secret_post':
        applyPostAuth(client_id, client_secret, params)
        return
      case 'none':
        applyPublicAuth(client_id, params)
        return
      default:
        throw new Error(`Unsupported client authentication method: ${method}`)
    }
  }
  function applyBasicAuth(clientId, clientSecret, headers) {
    if (!clientSecret) {
      throw new Error('client_secret_basic authentication requires a client_secret')
    }
    const credentials = btoa(`${clientId}:${clientSecret}`)
    headers.set('Authorization', `Basic ${credentials}`)
  }
  function applyPostAuth(clientId, clientSecret, params) {
    params.set('client_id', clientId)
    if (clientSecret) {
      params.set('client_secret', clientSecret)
    }
  }
  function applyPublicAuth(clientId, params) {
    params.set('client_id', clientId)
  }
  async function parseErrorResponse(input) {
    const statusCode = input instanceof Response ? input.status : void 0
    const body = input instanceof Response ? await input.text() : input
    try {
      const result = OAuthErrorResponseSchema.parse(JSON.parse(body))
      const { error: error2, error_description, error_uri } = result
      const errorClass = OAUTH_ERRORS[error2] || ServerError
      return new errorClass(error_description || '', error_uri)
    } catch (error2) {
      const errorMessage = `${statusCode ? `HTTP ${statusCode}: ` : ''}Invalid OAuth error response: ${error2}. Raw body: ${body}`
      return new ServerError(errorMessage)
    }
  }
  async function auth(provider, options) {
    var _a, _b
    try {
      return await authInternal(provider, options)
    } catch (error2) {
      if (error2 instanceof InvalidClientError || error2 instanceof UnauthorizedClientError) {
        await ((_a = provider.invalidateCredentials) === null || _a === void 0 ? void 0 : _a.call(provider, 'all'))
        return await authInternal(provider, options)
      } else if (error2 instanceof InvalidGrantError) {
        await ((_b = provider.invalidateCredentials) === null || _b === void 0 ? void 0 : _b.call(provider, 'tokens'))
        return await authInternal(provider, options)
      }
      throw error2
    }
  }
  async function authInternal(provider, { serverUrl, authorizationCode, scope: scope2, resourceMetadataUrl, fetchFn }) {
    let resourceMetadata
    let authorizationServerUrl
    try {
      resourceMetadata = await discoverOAuthProtectedResourceMetadata(serverUrl, { resourceMetadataUrl }, fetchFn)
      if (resourceMetadata.authorization_servers && resourceMetadata.authorization_servers.length > 0) {
        authorizationServerUrl = resourceMetadata.authorization_servers[0]
      }
    } catch (_a) {}
    if (!authorizationServerUrl) {
      authorizationServerUrl = serverUrl
    }
    const resource = await selectResourceURL(serverUrl, provider, resourceMetadata)
    const metadata2 = await discoverAuthorizationServerMetadata(authorizationServerUrl, {
      fetchFn
    })
    let clientInformation = await Promise.resolve(provider.clientInformation())
    if (!clientInformation) {
      if (authorizationCode !== void 0) {
        throw new Error('Existing OAuth client information is required when exchanging an authorization code')
      }
      if (!provider.saveClientInformation) {
        throw new Error('OAuth client information must be saveable for dynamic registration')
      }
      const fullInformation = await registerClient(authorizationServerUrl, {
        metadata: metadata2,
        clientMetadata: provider.clientMetadata
      })
      await provider.saveClientInformation(fullInformation)
      clientInformation = fullInformation
    }
    if (authorizationCode !== void 0) {
      const codeVerifier2 = await provider.codeVerifier()
      const tokens2 = await exchangeAuthorization(authorizationServerUrl, {
        metadata: metadata2,
        clientInformation,
        authorizationCode,
        codeVerifier: codeVerifier2,
        redirectUri: provider.redirectUrl,
        resource,
        addClientAuthentication: provider.addClientAuthentication,
        fetchFn
      })
      await provider.saveTokens(tokens2)
      return 'AUTHORIZED'
    }
    const tokens = await provider.tokens()
    if (tokens === null || tokens === void 0 ? void 0 : tokens.refresh_token) {
      try {
        const newTokens = await refreshAuthorization(authorizationServerUrl, {
          metadata: metadata2,
          clientInformation,
          refreshToken: tokens.refresh_token,
          resource,
          addClientAuthentication: provider.addClientAuthentication
        })
        await provider.saveTokens(newTokens)
        return 'AUTHORIZED'
      } catch (error2) {
        if (!(error2 instanceof OAuthError) || error2 instanceof ServerError);
        else {
          throw error2
        }
      }
    }
    const state = provider.state ? await provider.state() : void 0
    const { authorizationUrl, codeVerifier } = await startAuthorization(authorizationServerUrl, {
      metadata: metadata2,
      clientInformation,
      state,
      redirectUrl: provider.redirectUrl,
      scope: scope2 || provider.clientMetadata.scope,
      resource
    })
    await provider.saveCodeVerifier(codeVerifier)
    await provider.redirectToAuthorization(authorizationUrl)
    return 'REDIRECT'
  }
  async function selectResourceURL(serverUrl, provider, resourceMetadata) {
    const defaultResource = resourceUrlFromServerUrl(serverUrl)
    if (provider.validateResourceURL) {
      return await provider.validateResourceURL(
        defaultResource,
        resourceMetadata === null || resourceMetadata === void 0 ? void 0 : resourceMetadata.resource
      )
    }
    if (!resourceMetadata) {
      return void 0
    }
    if (!checkResourceAllowed({ requestedResource: defaultResource, configuredResource: resourceMetadata.resource })) {
      throw new Error(
        `Protected resource ${resourceMetadata.resource} does not match expected ${defaultResource} (or origin)`
      )
    }
    return new URL(resourceMetadata.resource)
  }
  function extractResourceMetadataUrl(res) {
    const authenticateHeader = res.headers.get('WWW-Authenticate')
    if (!authenticateHeader) {
      return void 0
    }
    const [type2, scheme] = authenticateHeader.split(' ')
    if (type2.toLowerCase() !== 'bearer' || !scheme) {
      return void 0
    }
    const regex2 = /resource_metadata="([^"]*)"/
    const match = regex2.exec(authenticateHeader)
    if (!match) {
      return void 0
    }
    try {
      return new URL(match[1])
    } catch (_a) {
      return void 0
    }
  }
  async function discoverOAuthProtectedResourceMetadata(serverUrl, opts, fetchFn = fetch) {
    const response = await discoverMetadataWithFallback(serverUrl, 'oauth-protected-resource', fetchFn, {
      protocolVersion: opts === null || opts === void 0 ? void 0 : opts.protocolVersion,
      metadataUrl: opts === null || opts === void 0 ? void 0 : opts.resourceMetadataUrl
    })
    if (!response || response.status === 404) {
      throw new Error(`Resource server does not implement OAuth 2.0 Protected Resource Metadata.`)
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} trying to load well-known OAuth protected resource metadata.`)
    }
    return OAuthProtectedResourceMetadataSchema.parse(await response.json())
  }
  async function fetchWithCorsRetry(url, headers, fetchFn = fetch) {
    try {
      return await fetchFn(url, { headers })
    } catch (error2) {
      if (error2 instanceof TypeError) {
        if (headers) {
          return fetchWithCorsRetry(url, void 0, fetchFn)
        } else {
          return void 0
        }
      }
      throw error2
    }
  }
  function buildWellKnownPath(wellKnownPrefix, pathname = '', options = {}) {
    if (pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1)
    }
    return options.prependPathname
      ? `${pathname}/.well-known/${wellKnownPrefix}`
      : `/.well-known/${wellKnownPrefix}${pathname}`
  }
  async function tryMetadataDiscovery(url, protocolVersion, fetchFn = fetch) {
    const headers = {
      'MCP-Protocol-Version': protocolVersion
    }
    return await fetchWithCorsRetry(url, headers, fetchFn)
  }
  function shouldAttemptFallback(response, pathname) {
    return !response || (response.status === 404 && pathname !== '/')
  }
  async function discoverMetadataWithFallback(serverUrl, wellKnownType, fetchFn, opts) {
    var _a, _b
    const issuer = new URL(serverUrl)
    const protocolVersion =
      (_a = opts === null || opts === void 0 ? void 0 : opts.protocolVersion) !== null && _a !== void 0
        ? _a
        : LATEST_PROTOCOL_VERSION
    let url
    if (opts === null || opts === void 0 ? void 0 : opts.metadataUrl) {
      url = new URL(opts.metadataUrl)
    } else {
      const wellKnownPath = buildWellKnownPath(wellKnownType, issuer.pathname)
      url = new URL(
        wellKnownPath,
        (_b = opts === null || opts === void 0 ? void 0 : opts.metadataServerUrl) !== null && _b !== void 0
          ? _b
          : issuer
      )
      url.search = issuer.search
    }
    let response = await tryMetadataDiscovery(url, protocolVersion, fetchFn)
    if (
      !(opts === null || opts === void 0 ? void 0 : opts.metadataUrl) &&
      shouldAttemptFallback(response, issuer.pathname)
    ) {
      const rootUrl = new URL(`/.well-known/${wellKnownType}`, issuer)
      response = await tryMetadataDiscovery(rootUrl, protocolVersion, fetchFn)
    }
    return response
  }
  function buildDiscoveryUrls(authorizationServerUrl) {
    const url = typeof authorizationServerUrl === 'string' ? new URL(authorizationServerUrl) : authorizationServerUrl
    const hasPath = url.pathname !== '/'
    const urlsToTry = []
    if (!hasPath) {
      urlsToTry.push({
        url: new URL('/.well-known/oauth-authorization-server', url.origin),
        type: 'oauth'
      })
      urlsToTry.push({
        url: new URL(`/.well-known/openid-configuration`, url.origin),
        type: 'oidc'
      })
      return urlsToTry
    }
    let pathname = url.pathname
    if (pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1)
    }
    urlsToTry.push({
      url: new URL(`/.well-known/oauth-authorization-server${pathname}`, url.origin),
      type: 'oauth'
    })
    urlsToTry.push({
      url: new URL('/.well-known/oauth-authorization-server', url.origin),
      type: 'oauth'
    })
    urlsToTry.push({
      url: new URL(`/.well-known/openid-configuration${pathname}`, url.origin),
      type: 'oidc'
    })
    urlsToTry.push({
      url: new URL(`${pathname}/.well-known/openid-configuration`, url.origin),
      type: 'oidc'
    })
    return urlsToTry
  }
  async function discoverAuthorizationServerMetadata(
    authorizationServerUrl,
    { fetchFn = fetch, protocolVersion = LATEST_PROTOCOL_VERSION } = {}
  ) {
    var _a
    const headers = { 'MCP-Protocol-Version': protocolVersion }
    const urlsToTry = buildDiscoveryUrls(authorizationServerUrl)
    for (const { url: endpointUrl, type: type2 } of urlsToTry) {
      const response = await fetchWithCorsRetry(endpointUrl, headers, fetchFn)
      if (!response) {
        throw new Error(
          `CORS error trying to load ${type2 === 'oauth' ? 'OAuth' : 'OpenID provider'} metadata from ${endpointUrl}`
        )
      }
      if (!response.ok) {
        if (response.status >= 400 && response.status < 500) {
          continue
        }
        throw new Error(
          `HTTP ${response.status} trying to load ${type2 === 'oauth' ? 'OAuth' : 'OpenID provider'} metadata from ${endpointUrl}`
        )
      }
      if (type2 === 'oauth') {
        return OAuthMetadataSchema.parse(await response.json())
      } else {
        const metadata2 = OpenIdProviderDiscoveryMetadataSchema.parse(await response.json())
        if (
          !((_a = metadata2.code_challenge_methods_supported) === null || _a === void 0 ? void 0 : _a.includes('S256'))
        ) {
          throw new Error(
            `Incompatible OIDC provider at ${endpointUrl}: does not support S256 code challenge method required by MCP specification`
          )
        }
        return metadata2
      }
    }
    return void 0
  }
  async function startAuthorization(
    authorizationServerUrl,
    { metadata: metadata2, clientInformation, redirectUrl, scope: scope2, state, resource }
  ) {
    const responseType = 'code'
    const codeChallengeMethod = 'S256'
    let authorizationUrl
    if (metadata2) {
      authorizationUrl = new URL(metadata2.authorization_endpoint)
      if (!metadata2.response_types_supported.includes(responseType)) {
        throw new Error(`Incompatible auth server: does not support response type ${responseType}`)
      }
      if (
        !metadata2.code_challenge_methods_supported ||
        !metadata2.code_challenge_methods_supported.includes(codeChallengeMethod)
      ) {
        throw new Error(`Incompatible auth server: does not support code challenge method ${codeChallengeMethod}`)
      }
    } else {
      authorizationUrl = new URL('/authorize', authorizationServerUrl)
    }
    const challenge = await pkceChallenge()
    const codeVerifier = challenge.code_verifier
    const codeChallenge = challenge.code_challenge
    authorizationUrl.searchParams.set('response_type', responseType)
    authorizationUrl.searchParams.set('client_id', clientInformation.client_id)
    authorizationUrl.searchParams.set('code_challenge', codeChallenge)
    authorizationUrl.searchParams.set('code_challenge_method', codeChallengeMethod)
    authorizationUrl.searchParams.set('redirect_uri', String(redirectUrl))
    if (state) {
      authorizationUrl.searchParams.set('state', state)
    }
    if (scope2) {
      authorizationUrl.searchParams.set('scope', scope2)
    }
    if (scope2 === null || scope2 === void 0 ? void 0 : scope2.includes('offline_access')) {
      authorizationUrl.searchParams.append('prompt', 'consent')
    }
    if (resource) {
      authorizationUrl.searchParams.set('resource', resource.href)
    }
    return { authorizationUrl, codeVerifier }
  }
  async function exchangeAuthorization(
    authorizationServerUrl,
    {
      metadata: metadata2,
      clientInformation,
      authorizationCode,
      codeVerifier,
      redirectUri,
      resource,
      addClientAuthentication,
      fetchFn
    }
  ) {
    var _a
    const grantType = 'authorization_code'
    const tokenUrl = (metadata2 === null || metadata2 === void 0 ? void 0 : metadata2.token_endpoint)
      ? new URL(metadata2.token_endpoint)
      : new URL('/token', authorizationServerUrl)
    if (
      (metadata2 === null || metadata2 === void 0 ? void 0 : metadata2.grant_types_supported) &&
      !metadata2.grant_types_supported.includes(grantType)
    ) {
      throw new Error(`Incompatible auth server: does not support grant type ${grantType}`)
    }
    const headers = new Headers({
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    })
    const params = new URLSearchParams({
      grant_type: grantType,
      code: authorizationCode,
      code_verifier: codeVerifier,
      redirect_uri: String(redirectUri)
    })
    if (addClientAuthentication) {
      addClientAuthentication(headers, params, authorizationServerUrl, metadata2)
    } else {
      const supportedMethods =
        (_a = metadata2 === null || metadata2 === void 0 ? void 0 : metadata2.token_endpoint_auth_methods_supported) !==
          null && _a !== void 0
          ? _a
          : []
      const authMethod = selectClientAuthMethod(clientInformation, supportedMethods)
      applyClientAuthentication(authMethod, clientInformation, headers, params)
    }
    if (resource) {
      params.set('resource', resource.href)
    }
    const response = await (fetchFn !== null && fetchFn !== void 0 ? fetchFn : fetch)(tokenUrl, {
      method: 'POST',
      headers,
      body: params
    })
    if (!response.ok) {
      throw await parseErrorResponse(response)
    }
    return OAuthTokensSchema.parse(await response.json())
  }
  async function refreshAuthorization(
    authorizationServerUrl,
    { metadata: metadata2, clientInformation, refreshToken, resource, addClientAuthentication, fetchFn }
  ) {
    var _a
    const grantType = 'refresh_token'
    let tokenUrl
    if (metadata2) {
      tokenUrl = new URL(metadata2.token_endpoint)
      if (metadata2.grant_types_supported && !metadata2.grant_types_supported.includes(grantType)) {
        throw new Error(`Incompatible auth server: does not support grant type ${grantType}`)
      }
    } else {
      tokenUrl = new URL('/token', authorizationServerUrl)
    }
    const headers = new Headers({
      'Content-Type': 'application/x-www-form-urlencoded'
    })
    const params = new URLSearchParams({
      grant_type: grantType,
      refresh_token: refreshToken
    })
    if (addClientAuthentication) {
      addClientAuthentication(headers, params, authorizationServerUrl, metadata2)
    } else {
      const supportedMethods =
        (_a = metadata2 === null || metadata2 === void 0 ? void 0 : metadata2.token_endpoint_auth_methods_supported) !==
          null && _a !== void 0
          ? _a
          : []
      const authMethod = selectClientAuthMethod(clientInformation, supportedMethods)
      applyClientAuthentication(authMethod, clientInformation, headers, params)
    }
    if (resource) {
      params.set('resource', resource.href)
    }
    const response = await (fetchFn !== null && fetchFn !== void 0 ? fetchFn : fetch)(tokenUrl, {
      method: 'POST',
      headers,
      body: params
    })
    if (!response.ok) {
      throw await parseErrorResponse(response)
    }
    return OAuthTokensSchema.parse({ refresh_token: refreshToken, ...(await response.json()) })
  }
  async function registerClient(authorizationServerUrl, { metadata: metadata2, clientMetadata, fetchFn }) {
    let registrationUrl
    if (metadata2) {
      if (!metadata2.registration_endpoint) {
        throw new Error('Incompatible auth server: does not support dynamic client registration')
      }
      registrationUrl = new URL(metadata2.registration_endpoint)
    } else {
      registrationUrl = new URL('/register', authorizationServerUrl)
    }
    const response = await (fetchFn !== null && fetchFn !== void 0 ? fetchFn : fetch)(registrationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(clientMetadata)
    })
    if (!response.ok) {
      throw await parseErrorResponse(response)
    }
    return OAuthClientInformationFullSchema.parse(await response.json())
  }
  class SseError extends Error {
    constructor(code2, message, event) {
      super(`SSE error: ${message}`)
      this.code = code2
      this.event = event
    }
  }
  class SSEClientTransport {
    constructor(url, opts) {
      this._url = url
      this._resourceMetadataUrl = void 0
      this._eventSourceInit = opts === null || opts === void 0 ? void 0 : opts.eventSourceInit
      this._requestInit = opts === null || opts === void 0 ? void 0 : opts.requestInit
      this._authProvider = opts === null || opts === void 0 ? void 0 : opts.authProvider
      this._fetch = opts === null || opts === void 0 ? void 0 : opts.fetch
    }
    async _authThenStart() {
      var _a
      if (!this._authProvider) {
        throw new UnauthorizedError('No auth provider')
      }
      let result
      try {
        result = await auth(this._authProvider, {
          serverUrl: this._url,
          resourceMetadataUrl: this._resourceMetadataUrl,
          fetchFn: this._fetch
        })
      } catch (error2) {
        ;(_a = this.onerror) === null || _a === void 0 ? void 0 : _a.call(this, error2)
        throw error2
      }
      if (result !== 'AUTHORIZED') {
        throw new UnauthorizedError()
      }
      return await this._startOrAuth()
    }
    async _commonHeaders() {
      var _a
      const headers = {}
      if (this._authProvider) {
        const tokens = await this._authProvider.tokens()
        if (tokens) {
          headers['Authorization'] = `Bearer ${tokens.access_token}`
        }
      }
      if (this._protocolVersion) {
        headers['mcp-protocol-version'] = this._protocolVersion
      }
      return new Headers({ ...headers, ...((_a = this._requestInit) === null || _a === void 0 ? void 0 : _a.headers) })
    }
    _startOrAuth() {
      var _a, _b, _c
      const fetchImpl =
        (_c =
          (_b =
            (_a = this === null || this === void 0 ? void 0 : this._eventSourceInit) === null || _a === void 0
              ? void 0
              : _a.fetch) !== null && _b !== void 0
            ? _b
            : this._fetch) !== null && _c !== void 0
          ? _c
          : fetch
      return new Promise((resolve2, reject) => {
        this._eventSource = new EventSource(this._url.href, {
          ...this._eventSourceInit,
          fetch: async (url, init) => {
            const headers = await this._commonHeaders()
            headers.set('Accept', 'text/event-stream')
            const response = await fetchImpl(url, {
              ...init,
              headers
            })
            if (response.status === 401 && response.headers.has('www-authenticate')) {
              this._resourceMetadataUrl = extractResourceMetadataUrl(response)
            }
            return response
          }
        })
        this._abortController = new AbortController()
        this._eventSource.onerror = (event) => {
          var _a2
          if (event.code === 401 && this._authProvider) {
            this._authThenStart().then(resolve2, reject)
            return
          }
          const error2 = new SseError(event.code, event.message, event)
          reject(error2)
          ;(_a2 = this.onerror) === null || _a2 === void 0 ? void 0 : _a2.call(this, error2)
        }
        this._eventSource.onopen = () => {}
        this._eventSource.addEventListener('endpoint', (event) => {
          var _a2
          const messageEvent = event
          try {
            this._endpoint = new URL(messageEvent.data, this._url)
            if (this._endpoint.origin !== this._url.origin) {
              throw new Error(`Endpoint origin does not match connection origin: ${this._endpoint.origin}`)
            }
          } catch (error2) {
            reject(error2)
            ;(_a2 = this.onerror) === null || _a2 === void 0 ? void 0 : _a2.call(this, error2)
            void this.close()
            return
          }
          resolve2()
        })
        this._eventSource.onmessage = (event) => {
          var _a2, _b2
          const messageEvent = event
          let message
          try {
            message = JSONRPCMessageSchema.parse(JSON.parse(messageEvent.data))
          } catch (error2) {
            ;(_a2 = this.onerror) === null || _a2 === void 0 ? void 0 : _a2.call(this, error2)
            return
          }
          ;(_b2 = this.onmessage) === null || _b2 === void 0 ? void 0 : _b2.call(this, message)
        }
      })
    }
    async start() {
      if (this._eventSource) {
        throw new Error(
          'SSEClientTransport already started! If using Client class, note that connect() calls start() automatically.'
        )
      }
      return await this._startOrAuth()
    }
    /**
     * Call this method after the user has finished authorizing via their user agent and is redirected back to the MCP client application. This will exchange the authorization code for an access token, enabling the next connection attempt to successfully auth.
     */
    async finishAuth(authorizationCode) {
      if (!this._authProvider) {
        throw new UnauthorizedError('No auth provider')
      }
      const result = await auth(this._authProvider, {
        serverUrl: this._url,
        authorizationCode,
        resourceMetadataUrl: this._resourceMetadataUrl,
        fetchFn: this._fetch
      })
      if (result !== 'AUTHORIZED') {
        throw new UnauthorizedError('Failed to authorize')
      }
    }
    async close() {
      var _a, _b, _c
      ;(_a = this._abortController) === null || _a === void 0 ? void 0 : _a.abort()
      ;(_b = this._eventSource) === null || _b === void 0 ? void 0 : _b.close()
      ;(_c = this.onclose) === null || _c === void 0 ? void 0 : _c.call(this)
    }
    async send(message) {
      var _a, _b, _c
      if (!this._endpoint) {
        throw new Error('Not connected')
      }
      try {
        const headers = await this._commonHeaders()
        headers.set('content-type', 'application/json')
        const init = {
          ...this._requestInit,
          method: 'POST',
          headers,
          body: JSON.stringify(message),
          signal: (_a = this._abortController) === null || _a === void 0 ? void 0 : _a.signal
        }
        const response = await ((_b = this._fetch) !== null && _b !== void 0 ? _b : fetch)(this._endpoint, init)
        if (!response.ok) {
          if (response.status === 401 && this._authProvider) {
            this._resourceMetadataUrl = extractResourceMetadataUrl(response)
            const result = await auth(this._authProvider, {
              serverUrl: this._url,
              resourceMetadataUrl: this._resourceMetadataUrl,
              fetchFn: this._fetch
            })
            if (result !== 'AUTHORIZED') {
              throw new UnauthorizedError()
            }
            return this.send(message)
          }
          const text = await response.text().catch(() => null)
          throw new Error(`Error POSTing to endpoint (HTTP ${response.status}): ${text}`)
        }
      } catch (error2) {
        ;(_c = this.onerror) === null || _c === void 0 ? void 0 : _c.call(this, error2)
        throw error2
      }
    }
    setProtocolVersion(version) {
      this._protocolVersion = version
    }
  }
  class EventSourceParserStream extends TransformStream {
    constructor({ onError, onRetry, onComment } = {}) {
      let parser
      super({
        start(controller) {
          parser = createParser({
            onEvent: (event) => {
              controller.enqueue(event)
            },
            onError(error2) {
              onError === 'terminate' ? controller.error(error2) : typeof onError == 'function' && onError(error2)
            },
            onRetry,
            onComment
          })
        },
        transform(chunk) {
          parser.feed(chunk)
        }
      })
    }
  }
  const DEFAULT_STREAMABLE_HTTP_RECONNECTION_OPTIONS = {
    initialReconnectionDelay: 1e3,
    maxReconnectionDelay: 3e4,
    reconnectionDelayGrowFactor: 1.5,
    maxRetries: 2
  }
  class StreamableHTTPError extends Error {
    constructor(code2, message) {
      super(`Streamable HTTP error: ${message}`)
      this.code = code2
    }
  }
  class StreamableHTTPClientTransport {
    constructor(url, opts) {
      var _a
      this._url = url
      this._resourceMetadataUrl = void 0
      this._requestInit = opts === null || opts === void 0 ? void 0 : opts.requestInit
      this._authProvider = opts === null || opts === void 0 ? void 0 : opts.authProvider
      this._fetch = opts === null || opts === void 0 ? void 0 : opts.fetch
      this._sessionId = opts === null || opts === void 0 ? void 0 : opts.sessionId
      this._reconnectionOptions =
        (_a = opts === null || opts === void 0 ? void 0 : opts.reconnectionOptions) !== null && _a !== void 0
          ? _a
          : DEFAULT_STREAMABLE_HTTP_RECONNECTION_OPTIONS
    }
    async _authThenStart() {
      var _a
      if (!this._authProvider) {
        throw new UnauthorizedError('No auth provider')
      }
      let result
      try {
        result = await auth(this._authProvider, {
          serverUrl: this._url,
          resourceMetadataUrl: this._resourceMetadataUrl,
          fetchFn: this._fetch
        })
      } catch (error2) {
        ;(_a = this.onerror) === null || _a === void 0 ? void 0 : _a.call(this, error2)
        throw error2
      }
      if (result !== 'AUTHORIZED') {
        throw new UnauthorizedError()
      }
      return await this._startOrAuthSse({ resumptionToken: void 0 })
    }
    async _commonHeaders() {
      var _a
      const headers = {}
      if (this._authProvider) {
        const tokens = await this._authProvider.tokens()
        if (tokens) {
          headers['Authorization'] = `Bearer ${tokens.access_token}`
        }
      }
      if (this._sessionId) {
        headers['mcp-session-id'] = this._sessionId
      }
      if (this._protocolVersion) {
        headers['mcp-protocol-version'] = this._protocolVersion
      }
      const extraHeaders = this._normalizeHeaders(
        (_a = this._requestInit) === null || _a === void 0 ? void 0 : _a.headers
      )
      return new Headers({
        ...headers,
        ...extraHeaders
      })
    }
    async _startOrAuthSse(options) {
      var _a, _b, _c
      const { resumptionToken } = options
      try {
        const headers = await this._commonHeaders()
        headers.set('Accept', 'text/event-stream')
        if (resumptionToken) {
          headers.set('last-event-id', resumptionToken)
        }
        const response = await ((_a = this._fetch) !== null && _a !== void 0 ? _a : fetch)(this._url, {
          method: 'GET',
          headers,
          signal: (_b = this._abortController) === null || _b === void 0 ? void 0 : _b.signal
        })
        if (!response.ok) {
          if (response.status === 401 && this._authProvider) {
            return await this._authThenStart()
          }
          if (response.status === 405) {
            return
          }
          throw new StreamableHTTPError(response.status, `Failed to open SSE stream: ${response.statusText}`)
        }
        this._handleSseStream(response.body, options, true)
      } catch (error2) {
        ;(_c = this.onerror) === null || _c === void 0 ? void 0 : _c.call(this, error2)
        throw error2
      }
    }
    /**
     * Calculates the next reconnection delay using  backoff algorithm
     *
     * @param attempt Current reconnection attempt count for the specific stream
     * @returns Time to wait in milliseconds before next reconnection attempt
     */
    _getNextReconnectionDelay(attempt) {
      const initialDelay = this._reconnectionOptions.initialReconnectionDelay
      const growFactor = this._reconnectionOptions.reconnectionDelayGrowFactor
      const maxDelay = this._reconnectionOptions.maxReconnectionDelay
      return Math.min(initialDelay * Math.pow(growFactor, attempt), maxDelay)
    }
    _normalizeHeaders(headers) {
      if (!headers) return {}
      if (headers instanceof Headers) {
        return Object.fromEntries(headers.entries())
      }
      if (Array.isArray(headers)) {
        return Object.fromEntries(headers)
      }
      return { ...headers }
    }
    /**
     * Schedule a reconnection attempt with exponential backoff
     *
     * @param lastEventId The ID of the last received event for resumability
     * @param attemptCount Current reconnection attempt count for this specific stream
     */
    _scheduleReconnection(options, attemptCount = 0) {
      var _a
      const maxRetries = this._reconnectionOptions.maxRetries
      if (maxRetries > 0 && attemptCount >= maxRetries) {
        ;(_a = this.onerror) === null || _a === void 0
          ? void 0
          : _a.call(this, new Error(`Maximum reconnection attempts (${maxRetries}) exceeded.`))
        return
      }
      const delay = this._getNextReconnectionDelay(attemptCount)
      setTimeout(() => {
        this._startOrAuthSse(options).catch((error2) => {
          var _a2
          ;(_a2 = this.onerror) === null || _a2 === void 0
            ? void 0
            : _a2.call(
                this,
                new Error(
                  `Failed to reconnect SSE stream: ${error2 instanceof Error ? error2.message : String(error2)}`
                )
              )
          this._scheduleReconnection(options, attemptCount + 1)
        })
      }, delay)
    }
    _handleSseStream(stream, options, isReconnectable) {
      if (!stream) {
        return
      }
      const { onresumptiontoken, replayMessageId } = options
      let lastEventId
      const processStream = async () => {
        var _a, _b, _c, _d
        try {
          const reader = stream
            .pipeThrough(new TextDecoderStream())
            .pipeThrough(new EventSourceParserStream())
            .getReader()
          while (true) {
            const { value: event, done } = await reader.read()
            if (done) {
              break
            }
            if (event.id) {
              lastEventId = event.id
              onresumptiontoken === null || onresumptiontoken === void 0 ? void 0 : onresumptiontoken(event.id)
            }
            if (!event.event || event.event === 'message') {
              try {
                const message = JSONRPCMessageSchema.parse(JSON.parse(event.data))
                if (replayMessageId !== void 0 && isJSONRPCResponse(message)) {
                  message.id = replayMessageId
                }
                ;(_a = this.onmessage) === null || _a === void 0 ? void 0 : _a.call(this, message)
              } catch (error2) {
                ;(_b = this.onerror) === null || _b === void 0 ? void 0 : _b.call(this, error2)
              }
            }
          }
        } catch (error2) {
          ;(_c = this.onerror) === null || _c === void 0
            ? void 0
            : _c.call(this, new Error(`SSE stream disconnected: ${error2}`))
          if (isReconnectable && this._abortController && !this._abortController.signal.aborted) {
            try {
              this._scheduleReconnection(
                {
                  resumptionToken: lastEventId,
                  onresumptiontoken,
                  replayMessageId
                },
                0
              )
            } catch (error3) {
              ;(_d = this.onerror) === null || _d === void 0
                ? void 0
                : _d.call(
                    this,
                    new Error(`Failed to reconnect: ${error3 instanceof Error ? error3.message : String(error3)}`)
                  )
            }
          }
        }
      }
      processStream()
    }
    async start() {
      if (this._abortController) {
        throw new Error(
          'StreamableHTTPClientTransport already started! If using Client class, note that connect() calls start() automatically.'
        )
      }
      this._abortController = new AbortController()
    }
    /**
     * Call this method after the user has finished authorizing via their user agent and is redirected back to the MCP client application. This will exchange the authorization code for an access token, enabling the next connection attempt to successfully auth.
     */
    async finishAuth(authorizationCode) {
      if (!this._authProvider) {
        throw new UnauthorizedError('No auth provider')
      }
      const result = await auth(this._authProvider, {
        serverUrl: this._url,
        authorizationCode,
        resourceMetadataUrl: this._resourceMetadataUrl,
        fetchFn: this._fetch
      })
      if (result !== 'AUTHORIZED') {
        throw new UnauthorizedError('Failed to authorize')
      }
    }
    async close() {
      var _a, _b
      ;(_a = this._abortController) === null || _a === void 0 ? void 0 : _a.abort()
      ;(_b = this.onclose) === null || _b === void 0 ? void 0 : _b.call(this)
    }
    async send(message, options) {
      var _a, _b, _c, _d
      try {
        const { resumptionToken, onresumptiontoken } = options || {}
        if (resumptionToken) {
          this._startOrAuthSse({
            resumptionToken,
            replayMessageId: isJSONRPCRequest(message) ? message.id : void 0
          }).catch((err) => {
            var _a2
            return (_a2 = this.onerror) === null || _a2 === void 0 ? void 0 : _a2.call(this, err)
          })
          return
        }
        const headers = await this._commonHeaders()
        headers.set('content-type', 'application/json')
        headers.set('accept', 'application/json, text/event-stream')
        const init = {
          ...this._requestInit,
          method: 'POST',
          headers,
          body: JSON.stringify(message),
          signal: (_a = this._abortController) === null || _a === void 0 ? void 0 : _a.signal
        }
        const response = await ((_b = this._fetch) !== null && _b !== void 0 ? _b : fetch)(this._url, init)
        const sessionId = response.headers.get('mcp-session-id')
        if (sessionId) {
          this._sessionId = sessionId
        }
        if (!response.ok) {
          if (response.status === 401 && this._authProvider) {
            this._resourceMetadataUrl = extractResourceMetadataUrl(response)
            const result = await auth(this._authProvider, {
              serverUrl: this._url,
              resourceMetadataUrl: this._resourceMetadataUrl,
              fetchFn: this._fetch
            })
            if (result !== 'AUTHORIZED') {
              throw new UnauthorizedError()
            }
            return this.send(message)
          }
          const text = await response.text().catch(() => null)
          throw new Error(`Error POSTing to endpoint (HTTP ${response.status}): ${text}`)
        }
        if (response.status === 202) {
          if (isInitializedNotification(message)) {
            this._startOrAuthSse({ resumptionToken: void 0 }).catch((err) => {
              var _a2
              return (_a2 = this.onerror) === null || _a2 === void 0 ? void 0 : _a2.call(this, err)
            })
          }
          return
        }
        const messages = Array.isArray(message) ? message : [message]
        const hasRequests = messages.filter((msg) => 'method' in msg && 'id' in msg && msg.id !== void 0).length > 0
        const contentType = response.headers.get('content-type')
        if (hasRequests) {
          if (contentType === null || contentType === void 0 ? void 0 : contentType.includes('text/event-stream')) {
            this._handleSseStream(response.body, { onresumptiontoken }, false)
          } else if (
            contentType === null || contentType === void 0 ? void 0 : contentType.includes('application/json')
          ) {
            const data2 = await response.json()
            const responseMessages = Array.isArray(data2)
              ? data2.map((msg) => JSONRPCMessageSchema.parse(msg))
              : [JSONRPCMessageSchema.parse(data2)]
            for (const msg of responseMessages) {
              ;(_c = this.onmessage) === null || _c === void 0 ? void 0 : _c.call(this, msg)
            }
          } else {
            throw new StreamableHTTPError(-1, `Unexpected content type: ${contentType}`)
          }
        }
      } catch (error2) {
        ;(_d = this.onerror) === null || _d === void 0 ? void 0 : _d.call(this, error2)
        throw error2
      }
    }
    get sessionId() {
      return this._sessionId
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
      var _a, _b, _c
      if (!this._sessionId) {
        return
      }
      try {
        const headers = await this._commonHeaders()
        const init = {
          ...this._requestInit,
          method: 'DELETE',
          headers,
          signal: (_a = this._abortController) === null || _a === void 0 ? void 0 : _a.signal
        }
        const response = await ((_b = this._fetch) !== null && _b !== void 0 ? _b : fetch)(this._url, init)
        if (!response.ok && response.status !== 405) {
          throw new StreamableHTTPError(response.status, `Failed to terminate session: ${response.statusText}`)
        }
        this._sessionId = void 0
      } catch (error2) {
        ;(_c = this.onerror) === null || _c === void 0 ? void 0 : _c.call(this, error2)
        throw error2
      }
    }
    setProtocolVersion(version) {
      this._protocolVersion = version
    }
    get protocolVersion() {
      return this._protocolVersion
    }
  }
  const SUBPROTOCOL = 'mcp'
  class WebSocketClientTransport {
    constructor(url) {
      this._url = url
    }
    start() {
      if (this._socket) {
        throw new Error(
          'WebSocketClientTransport already started! If using Client class, note that connect() calls start() automatically.'
        )
      }
      return new Promise((resolve2, reject) => {
        this._socket = new WebSocket(this._url, SUBPROTOCOL)
        this._socket.onerror = (event) => {
          var _a
          const error2 = 'error' in event ? event.error : new Error(`WebSocket error: ${JSON.stringify(event)}`)
          reject(error2)
          ;(_a = this.onerror) === null || _a === void 0 ? void 0 : _a.call(this, error2)
        }
        this._socket.onopen = () => {
          resolve2()
        }
        this._socket.onclose = () => {
          var _a
          ;(_a = this.onclose) === null || _a === void 0 ? void 0 : _a.call(this)
        }
        this._socket.onmessage = (event) => {
          var _a, _b
          let message
          try {
            message = JSONRPCMessageSchema.parse(JSON.parse(event.data))
          } catch (error2) {
            ;(_a = this.onerror) === null || _a === void 0 ? void 0 : _a.call(this, error2)
            return
          }
          ;(_b = this.onmessage) === null || _b === void 0 ? void 0 : _b.call(this, message)
        }
      })
    }
    async close() {
      var _a
      ;(_a = this._socket) === null || _a === void 0 ? void 0 : _a.close()
    }
    send(message) {
      return new Promise((resolve2, reject) => {
        var _a
        if (!this._socket) {
          reject(new Error('Not connected'))
          return
        }
        ;(_a = this._socket) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify(message))
        resolve2()
      })
    }
  }
  function _0x425b() {
    const _0x4fe318 = [
      '224340fQYLJj',
      'function',
      'onmessage',
      'port2',
      '341XVdnBD',
      '313767JEBgqL',
      '950bpstaX',
      '1354759gUhUbE',
      'wRKyh',
      'onclose',
      '2044SvCTUj',
      'endpoint',
      '24msSkHx',
      '164VuWYGY',
      'mOWMr',
      'EkZCC',
      'addEventListener',
      'postMessage',
      '120705iyGzUz',
      '8878392ivIdKn',
      'close',
      '_listen',
      '3619482FaLQHc',
      'start',
      '_endpoint',
      'kgkem',
      'bzNYT',
      'MessageChannel transport error: ',
      'stringify',
      'onmessageerror',
      'HvyCv',
      'undefined',
      'Jwyua',
      'message',
      '_globalObject',
      'parse',
      'authInfo',
      'thraG',
      '220pGvxgp',
      '_port',
      'EGhzU',
      'onerror',
      'data',
      'MhriV'
    ]
    _0x425b = function () {
      return _0x4fe318
    }
    return _0x425b()
  }
  ;(function (_0x3f2143, _0xebf1ca) {
    const _0xf16569 = _0x3c98,
      _0xf8772f = _0x3c98,
      _0x12639d = _0x3f2143()
    while (!![]) {
      try {
        const _0x4af7fb =
          (parseInt(_0xf16569(417)) / (511 * 2 + -6 * -249 + -2515)) *
            (parseInt(_0xf16569(421)) / (97 + 8149 + -4 * 2061)) +
          parseInt(_0xf16569(433)) / (2229 * 3 + 8997 + -15681) +
          (parseInt(_0xf16569(424)) / (6411 + 1390 * -2 + -9 * 403)) *
            (-parseInt(_0xf8772f(429)) / (1 * -6323 + 8277 + 1 * -1949)) +
          (parseInt(_0xf8772f(423)) / (-6512 + 1542 + 4976)) *
            (-parseInt(_0xf8772f(418)) / (-2923 + 27 * 123 + 1 * -391)) +
          -parseInt(_0xf8772f(430)) / (-255 * -15 + 3 * 1367 + 74 * -107) +
          (-parseInt(_0xf16569(416)) / (164 + 9156 + -9311)) *
            (-parseInt(_0xf16569(405)) / (-6648 + 4 * 1410 + -1018 * -1)) +
          (-parseInt(_0xf16569(415)) / (2131 + 1 * -6940 + 4820)) * (-parseInt(_0xf16569(411)) / (7402 + 4294 + -11684))
        if (_0x4af7fb === _0xebf1ca) break
        else _0x12639d['push'](_0x12639d['shift']())
      } catch (_0x559f49) {
        _0x12639d['push'](_0x12639d['shift']())
      }
    }
  })(_0x425b, -311599 + 305798 + 655998)
  const getGlobalObject = () => {
      const _0x3e2316 = _0x3c98,
        _0x4bbb30 = {
          'EGhzU': function (_0x43b0af, _0x410c74) {
            return _0x43b0af !== _0x410c74
          },
          'kIrDB': 'undefined',
          'llYQe': function (_0x5e5b4b, _0x29e28d) {
            return _0x5e5b4b !== _0x29e28d
          },
          'PZfJg': function (_0x2df978, _0x2cbe44) {
            return _0x2df978(_0x2cbe44)
          },
          'Jwyua': 'return this'
        }
      if (typeof globalThis !== 'undefined') return globalThis
      if (_0x4bbb30[_0x3e2316(407)](typeof window, _0x4bbb30['kIrDB'])) return window
      if (_0x4bbb30['llYQe'](typeof global, _0x4bbb30['kIrDB'])) return global
      if (typeof self !== _0x3e2316(398)) return self
      return _0x4bbb30['PZfJg'](Function, _0x4bbb30[_0x3e2316(399)])()
    },
    sendMessage$1 = (_0x3bc450, _0x51a3bf, _0x2954b6) => {
      const _0x5d3b1d = _0x3c98,
        _0x5c5f72 = _0x3c98,
        _0x3de493 = {}
      ;((_0x3de493[_0x5d3b1d(410)] = _0x5c5f72(398)),
        (_0x3de493['dBkaX'] = function (_0x181821, _0x4dd2e8) {
          return _0x181821 === _0x4dd2e8
        }),
        (_0x3de493[_0x5c5f72(393)] = 'function'))
      const _0x4aa378 = _0x3de493
      if (typeof window !== _0x4aa378[_0x5c5f72(410)]) _0x3bc450['postMessage'](_0x51a3bf, '*', _0x2954b6)
      else
        _0x5c5f72(428) in _0x3bc450 &&
          _0x4aa378['dBkaX'](typeof _0x3bc450['postMessage'], _0x4aa378[_0x5d3b1d(393)]) &&
          _0x3bc450['postMessage'](_0x51a3bf, _0x2954b6)
    },
    setMessageHandler = (_0x432d6a, _0x1cebac) => {
      const _0x4243fa = _0x3c98,
        _0x4b1b47 = _0x3c98,
        _0x83e376 = {}
      ;((_0x83e376['MbsGh'] = 'addEventListener'),
        (_0x83e376['PPniK'] = function (_0x4bc6f6, _0x575566) {
          return _0x4bc6f6 === _0x575566
        }),
        (_0x83e376[_0x4243fa(419)] = _0x4b1b47(412)),
        (_0x83e376[_0x4b1b47(404)] = 'onmessage'),
        (_0x83e376[_0x4243fa(397)] = 'undefined'))
      const _0x5b21ac = _0x83e376
      if (_0x5b21ac['MbsGh'] in _0x432d6a && _0x5b21ac['PPniK'](typeof _0x432d6a[_0x4243fa(427)], _0x5b21ac['wRKyh']))
        _0x432d6a[_0x4243fa(427)](_0x4243fa(400), _0x1cebac)
      else
        _0x5b21ac['thraG'] in _0x432d6a &&
          typeof _0x432d6a[_0x4b1b47(413)] !== _0x5b21ac[_0x4b1b47(397)] &&
          (_0x432d6a['onmessage'] = _0x1cebac)
    }
  class MessageChannelTransport {
    constructor(_0x19f279) {
      const _0x47a6b8 = _0x3c98
      this[_0x47a6b8(406)] = _0x19f279
    }
    async ['start']() {
      const _0x262fc0 = _0x3c98,
        _0x477225 = _0x3c98
      if (!this[_0x262fc0(406)]) return
      ;((this[_0x262fc0(406)][_0x262fc0(413)] = (_0x12f751) => {
        var _a, _b
        const _0xd637c1 = _0x262fc0,
          _0x3f2b55 = _0x477225
        try {
          const _0x288930 = JSONRPCMessageSchema[_0xd637c1(402)](_0x12f751['data'][_0xd637c1(400)])
          ;(_a = this[_0xd637c1(413)]) == null ? void 0 : _a.call(this, _0x288930, _0x12f751[_0x3f2b55(409)]['extra'])
        } catch (_0x199f0) {
          const _0x349a7b = new Error('MessageChannel failed to parse message: ' + _0x199f0)
          ;(_b = this[_0x3f2b55(408)]) == null ? void 0 : _b.call(this, _0x349a7b)
        }
      }),
        (this['_port'][_0x262fc0(396)] = (_0x4dd993) => {
          var _a
          const _0x120c0e = _0x477225,
            _0x5758c1 = _0x477225,
            _0x1701f6 = new Error(_0x120c0e(394) + JSON[_0x5758c1(395)](_0x4dd993))
          ;(_a = this['onerror']) == null ? void 0 : _a.call(this, _0x1701f6)
        }),
        this[_0x262fc0(406)][_0x262fc0(434)]())
    }
    async ['send'](_0x875889, _0x3c2eb4) {
      const _0x231c3e = {
        'lEyuq': function (_0x44e3da) {
          return _0x44e3da()
        },
        'YihNw': function (_0x1a99c7, _0x1da686) {
          return _0x1a99c7(_0x1da686)
        }
      }
      return new Promise((_0x2c883a, _0x7fbbef) => {
        var _a
        const _0x1d8acc = _0x3c98,
          _0x252aac = _0x3c98
        try {
          const _0x1d9834 = {}
          _0x1d9834[_0x1d8acc(403)] = _0x3c2eb4 == null ? void 0 : _0x3c2eb4[_0x1d8acc(403)]
          const _0x280bd1 = {}
          ;((_0x280bd1[_0x252aac(400)] = _0x875889), (_0x280bd1['extra'] = _0x1d9834))
          if (this[_0x252aac(406)]) this[_0x1d8acc(406)]['postMessage'](_0x280bd1)
          _0x231c3e['lEyuq'](_0x2c883a)
        } catch (_0x4fe450) {
          const _0x570003 = _0x4fe450 instanceof Error ? _0x4fe450 : new Error(_0x231c3e['YihNw'](String, _0x4fe450))
          ;((_a = this[_0x252aac(408)]) == null ? void 0 : _a.call(this, _0x570003), _0x7fbbef(_0x570003))
        }
      })
    }
    async ['close']() {
      var _a, _b
      const _0x48e40 = _0x3c98,
        _0x15c0bc = _0x3c98
      ;((_a = this['_port']) == null ? void 0 : _a[_0x48e40(431)](),
        (this['_port'] = void 0),
        (_b = this[_0x15c0bc(420)]) == null ? void 0 : _b.call(this))
    }
  }
  class MessageChannelClientTransport extends MessageChannelTransport {
    constructor(_0x597360, _0x528781 = getGlobalObject()) {
      const _0x264b2b = _0x3c98,
        _0x1bf448 = _0x3c98,
        _0x34395f = {
          'EkZCC': function (_0x252e11, _0x32a364, _0x3fa642, _0x313f91) {
            return _0x252e11(_0x32a364, _0x3fa642, _0x313f91)
          }
        }
      ;(super(), (this[_0x264b2b(391)] = _0x597360), (this[_0x1bf448(401)] = _0x528781))
      const _0x2395ac = new MessageChannel()
      ;((this[_0x1bf448(406)] = _0x2395ac['port1']),
        _0x34395f[_0x1bf448(426)](sendMessage$1, this[_0x264b2b(401)], { 'endpoint': this[_0x1bf448(391)] }, [
          _0x2395ac[_0x1bf448(414)]
        ]))
    }
  }
  class MessageChannelServerTransport extends MessageChannelTransport {
    constructor(_0x43868d, _0x200cbf = getGlobalObject()) {
      const _0x1cf24b = _0x3c98,
        _0x5f15b5 = {
          'mOWMr': function (_0x117b52, _0x3755b6) {
            return _0x117b52 === _0x3755b6
          },
          'kgkem': function (_0x263de6, _0x137f7b, _0x35ee9a) {
            return _0x263de6(_0x137f7b, _0x35ee9a)
          }
        }
      ;(super(),
        (this['_endpoint'] = _0x43868d),
        (this['_globalObject'] = _0x200cbf),
        (this[_0x1cf24b(432)] = new Promise((_0xc5a6a8) => {
          const _0x205b86 = _0x1cf24b,
            _0x13755a = _0x1cf24b
          _0x5f15b5[_0x205b86(392)](setMessageHandler, this[_0x13755a(401)], (_0x44b81a) => {
            const _0xd9e0bf = _0x13755a,
              _0x5f1705 = _0x13755a
            _0x44b81a['data'] &&
              _0x5f15b5[_0xd9e0bf(425)](_0x44b81a['data'][_0x5f1705(422)], this[_0x5f1705(391)]) &&
              ((this[_0x5f1705(406)] = _0x44b81a['ports'][-1 * 4852 + 1 * 1601 + 3251]), _0xc5a6a8())
          })
        })))
    }
    async ['listen']() {
      const _0x5cffe3 = _0x3c98
      return this[_0x5cffe3(432)]
    }
  }
  function _0x3c98(_0x5f3c48, _0x59969d) {
    const _0x29bc72 = _0x425b()
    return (
      (_0x3c98 = function (_0x7d5de0, _0x53ddc5) {
        _0x7d5de0 = _0x7d5de0 - (17 * -491 + -669 + 9407)
        let _0x21b3d3 = _0x29bc72[_0x7d5de0]
        return _0x21b3d3
      }),
      _0x3c98(_0x5f3c48, _0x59969d)
    )
  }
  const createTransportPair = () => {
    const _0x3ab70f = new MessageChannel()
    return [new MessageChannelTransport(_0x3ab70f['port1']), new MessageChannelTransport(_0x3ab70f['port2'])]
  }
  ;(function (_0x34e6b0, _0x35a269) {
    const _0x1d530d = _0x436f,
      _0x4b1650 = _0x436f,
      _0x32f138 = _0x34e6b0()
    while (!![]) {
      try {
        const _0x464b19 =
          parseInt(_0x1d530d(355)) / (-9237 + 21 * -101 + 11359) +
          (-parseInt(_0x1d530d(356)) / (-1 * 393 + -1 * -7768 + -1 * 7373)) *
            (-parseInt(_0x1d530d(373)) / (-705 + -4769 * 2 + -47 * -218)) +
          -parseInt(_0x1d530d(337)) / (-245 * 15 + 893 * 7 + 1 * -2572) +
          parseInt(_0x4b1650(357)) / (-240 * 17 + 3192 + 893) +
          (-parseInt(_0x4b1650(389)) / (149 * 44 + 545 * -2 + -5460)) *
            (-parseInt(_0x1d530d(396)) / (-5159 + -276 * -13 + -3 * -526)) +
          (parseInt(_0x4b1650(325)) / (1 * -6978 + -3854 + -8 * -1355)) *
            (parseInt(_0x1d530d(382)) / (-7214 + -2969 + 26 * 392)) +
          -parseInt(_0x1d530d(366)) / (316 * -5 + 562 * 5 + -61 * 20)
        if (_0x464b19 === _0x35a269) break
        else _0x32f138['push'](_0x32f138['shift']())
      } catch (_0x390ed1) {
        _0x32f138['push'](_0x32f138['shift']())
      }
    }
  })(_0x312b, -763475 + -52067 * 10 + 1724410)
  const forwardServerRequest = async (_0x39b9c9, _0x5af7c1, _0x5dd2f7) => {
      var _a
      const _0x4d8179 = _0x436f,
        _0x45d1c8 = _0x436f,
        _0x259709 = {}
      ;((_0x259709[_0x4d8179(345)] = 'tools/list'),
        (_0x259709['rqstG'] = 'tools/call'),
        (_0x259709['WqUnk'] = 'resources/list'),
        (_0x259709[_0x4d8179(329)] = _0x45d1c8(358)),
        (_0x259709[_0x4d8179(365)] = _0x4d8179(335)),
        (_0x259709['ookoz'] = 'resources/unsubscribe'),
        (_0x259709[_0x4d8179(385)] = _0x4d8179(340)),
        (_0x259709['VTIWq'] = 'prompts/list'),
        (_0x259709['SkoRK'] = _0x4d8179(376)),
        (_0x259709['QUtUV'] = _0x4d8179(388)),
        (_0x259709['XtowM'] = _0x45d1c8(332)))
      const _0x386240 = _0x259709,
        { id: _0x5e3819, method: _0x1e7aac, params: _0xb3b73d } = _0x5dd2f7
      let _0x1affd2 = {}
      switch (_0x1e7aac) {
        case _0x386240[_0x45d1c8(345)]:
          _0x1affd2 = await _0x5af7c1['listTools'](_0xb3b73d)
          break
        case _0x386240['rqstG']:
          _0x1affd2 = await _0x5af7c1['callTool'](_0xb3b73d)
          break
        case _0x386240[_0x4d8179(334)]:
          _0x1affd2 = await _0x5af7c1[_0x4d8179(350)](_0xb3b73d)
          break
        case _0x386240[_0x45d1c8(329)]:
          _0x1affd2 = await _0x5af7c1['listResourceTemplates'](_0xb3b73d)
          break
        case _0x4d8179(372):
          _0x1affd2 = await _0x5af7c1[_0x4d8179(383)](_0xb3b73d)
          break
        case _0x386240['HgYgW']:
          _0x1affd2 = await _0x5af7c1['subscribeResource'](_0xb3b73d)
          break
        case _0x386240['ookoz']:
          _0x1affd2 = await _0x5af7c1['unsubscribeResource'](_0xb3b73d)
          break
        case _0x386240[_0x4d8179(385)]:
          _0x1affd2 = await _0x5af7c1['getPrompt'](_0xb3b73d)
          break
        case _0x386240['VTIWq']:
          _0x1affd2 = await _0x5af7c1['listPrompts'](_0xb3b73d)
          break
        case _0x386240[_0x4d8179(344)]:
          _0x1affd2 = await _0x5af7c1[_0x4d8179(376)]()
          break
        case _0x386240['QUtUV']:
          _0x1affd2 = await _0x5af7c1['complete'](_0xb3b73d)
          break
        case _0x4d8179(390):
          _0x1affd2 = await _0x5af7c1[_0x4d8179(336)](_0xb3b73d == null ? void 0 : _0xb3b73d['level'])
          break
      }
      const _0x1b9b3c = {}
      ;((_0x1b9b3c[_0x4d8179(361)] = _0x1affd2),
        (_0x1b9b3c[_0x4d8179(394)] = _0x386240[_0x4d8179(364)]),
        (_0x1b9b3c['id'] = _0x5e3819),
        await ((_a = _0x39b9c9 == null ? void 0 : _0x39b9c9['transport']) == null
          ? void 0
          : _a[_0x4d8179(392)](_0x1b9b3c)))
    },
    forwardClientRequest = async (_0x28f3d6, _0x4ac89d, _0x1051c9) => {
      var _a
      const _0x3dda47 = _0x436f,
        _0x381b7f = _0x436f,
        _0xd1fdf3 = {}
      ;((_0xd1fdf3['jQBBS'] = 'sampling/createMessage'),
        (_0xd1fdf3['EZqgC'] = 'elicitation/create'),
        (_0xd1fdf3[_0x3dda47(370)] = _0x381b7f(376)),
        (_0xd1fdf3['aVeaL'] = _0x381b7f(332)))
      const _0x49fa5b = _0xd1fdf3,
        { id: _0x242c62, method: _0x5e5313, params: _0x26f936 } = _0x1051c9
      let _0x4a0446 = {}
      switch (_0x5e5313) {
        case _0x3dda47(368):
          const _0x5729fc = {}
          ;((_0x5729fc['method'] = _0x5e5313),
            (_0x5729fc[_0x381b7f(367)] = _0x26f936),
            (_0x4a0446 = await _0x4ac89d['request'](_0x5729fc, ListRootsResultSchema)))
          break
        case _0x49fa5b[_0x381b7f(391)]:
          const _0x1a4de5 = {}
          ;((_0x1a4de5['method'] = _0x5e5313),
            (_0x1a4de5[_0x381b7f(367)] = _0x26f936),
            (_0x4a0446 = await _0x4ac89d[_0x381b7f(381)](_0x1a4de5, CreateMessageResultSchema)))
          break
        case _0x49fa5b['EZqgC']:
          const _0x439309 = {}
          ;((_0x439309['method'] = _0x5e5313),
            (_0x439309['params'] = _0x26f936),
            (_0x4a0446 = await _0x4ac89d['request'](_0x439309, ElicitResultSchema)))
          break
        case _0x49fa5b[_0x381b7f(370)]:
          const _0x26032a = {}
          ;((_0x26032a['method'] = _0x5e5313),
            (_0x4a0446 = await _0x4ac89d[_0x381b7f(381)](_0x26032a, EmptyResultSchema)))
          break
      }
      const _0x1cd5b1 = {}
      return (
        (_0x1cd5b1[_0x381b7f(361)] = _0x4a0446),
        (_0x1cd5b1['jsonrpc'] = _0x49fa5b[_0x381b7f(387)]),
        (_0x1cd5b1['id'] = _0x242c62),
        await ((_a = _0x28f3d6 == null ? void 0 : _0x28f3d6[_0x3dda47(371)]) == null ? void 0 : _a['send'](_0x1cd5b1)),
        _0x4a0446
      )
    }
  const forwardServerOnRequest = (_0x295fa6, _0x251926) => {
    const _0x1cc476 = _0x436f,
      _0x23ae0d = {
        'gXsjT': function (_0x3ae5bb, _0x164ced) {
          return _0x3ae5bb === _0x164ced
        },
        'oegpC': _0x1cc476(351),
        'lZOUC': function (_0x453ca3, _0x364f6d, _0x56cba4, _0x977d42) {
          return _0x453ca3(_0x364f6d, _0x56cba4, _0x977d42)
        },
        'ifIKG': '2.0'
      },
      _0x4bcbe0 = _0x295fa6['_onrequest']
    _0x295fa6['_onrequest'] = async (_0x19eadb, _0x1be045) => {
      var _a, _b, _c, _d, _e
      const _0x18b546 = _0x1cc476,
        _0x2a3fc6 = _0x1cc476,
        { id: _0x352576, method: _0x55a8de } = _0x19eadb
      try {
        _0x23ae0d[_0x18b546(333)](_0x55a8de, _0x23ae0d['oegpC'])
          ? await _0x4bcbe0[_0x18b546(386)](_0x295fa6, _0x19eadb, _0x1be045)
          : await _0x23ae0d['lZOUC'](forwardServerRequest, _0x295fa6, _0x251926, _0x19eadb)
      } catch (_0x260152) {
        const { code: _0x109aa0, message: _0x12f9b1, data: _0x2a49eb } = _0x260152
        try {
          if (_0x109aa0) {
            const _0x33e2da = {}
            ;((_0x33e2da['code'] = _0x109aa0), (_0x33e2da['message'] = _0x12f9b1), (_0x33e2da['data'] = _0x2a49eb))
            const _0x577f56 = {}
            ;((_0x577f56['error'] = _0x33e2da),
              (_0x577f56[_0x18b546(394)] = _0x23ae0d[_0x2a3fc6(331)]),
              (_0x577f56['id'] = _0x352576),
              await ((_a = _0x295fa6 == null ? void 0 : _0x295fa6['transport']) == null
                ? void 0
                : _a['send'](_0x577f56)))
          } else
            (_c = (_b = _0x295fa6 == null ? void 0 : _0x295fa6[_0x2a3fc6(371)]) == null ? void 0 : _b['onerror']) ==
            null
              ? void 0
              : _c.call(_b, _0x260152)
        } catch (_0x31b055) {
          ;(_e = (_d = _0x295fa6 == null ? void 0 : _0x295fa6[_0x18b546(371)]) == null ? void 0 : _d['onerror']) == null
            ? void 0
            : _e.call(_d, _0x31b055)
        }
      }
    }
  }
  const forwardServerOnNotification = (_0xbf4216, _0x2c1d64) => {
    const _0x41d9f8 = _0x436f,
      _0x2f9e6b = _0x436f,
      _0x1b758a = {}
    ;((_0x1b758a[_0x41d9f8(363)] = function (_0x3941d3, _0x9b010a) {
      return _0x3941d3 !== _0x9b010a
    }),
      (_0x1b758a[_0x41d9f8(398)] = _0x41d9f8(353)),
      (_0x1b758a['hzhyg'] = 'notifications/cancelled'))
    const _0xbe4b4b = _0x1b758a
    _0xbf4216['_onnotification'] = async (_0x1da5cb) => {
      var _a, _b
      const _0x1daf66 = _0x41d9f8,
        _0x3a44ec = _0x2f9e6b,
        { method: _0x36956c, params: _0x3bca7c } = _0x1da5cb
      if (
        _0xbe4b4b[_0x1daf66(363)](_0x36956c, _0xbe4b4b[_0x3a44ec(398)]) &&
        (_0xbe4b4b[_0x1daf66(363)](_0x36956c, _0xbe4b4b['hzhyg']) ||
          (_0x3bca7c == null ? void 0 : _0x3bca7c['forward']))
      )
        try {
          await _0x2c1d64['notification'](_0x1da5cb)
        } catch (_0x322fdf) {
          ;(_b = (_a = _0xbf4216 == null ? void 0 : _0xbf4216['transport']) == null ? void 0 : _a['onerror']) == null
            ? void 0
            : _b.call(_a, _0x322fdf)
        }
    }
  }
  const forwardClientOnRequest = (_0x5ba9fc, _0x3c2127) => async (_0x35e391) => {
    var _a, _b, _c, _d, _e
    const _0x18219 = _0x436f,
      _0xf7764b = _0x436f,
      _0x1fe570 = {}
    _0x1fe570['SEmWX'] = _0x18219(332)
    const _0x4db6d5 = _0x1fe570
    try {
      return await forwardClientRequest(_0x5ba9fc, _0x3c2127, _0x35e391)
    } catch (_0x5475d2) {
      const { code: _0x145668, message: _0x30e917, data: _0x308ae4 } = _0x5475d2
      try {
        if (_0x145668) {
          const _0x3f0c29 = {}
          ;((_0x3f0c29[_0xf7764b(377)] = _0x145668),
            (_0x3f0c29['message'] = _0x30e917),
            (_0x3f0c29['data'] = _0x308ae4))
          const _0x3e511c = {}
          ;((_0x3e511c[_0xf7764b(348)] = _0x3f0c29),
            (_0x3e511c['jsonrpc'] = _0x4db6d5[_0x18219(338)]),
            (_0x3e511c['id'] = _0x35e391['id']),
            await ((_a = _0x5ba9fc == null ? void 0 : _0x5ba9fc['transport']) == null
              ? void 0
              : _a[_0xf7764b(392)](_0x3e511c)))
        } else
          (_c = (_b = _0x5ba9fc == null ? void 0 : _0x5ba9fc['transport']) == null ? void 0 : _b[_0xf7764b(339)]) ==
          null
            ? void 0
            : _c.call(_b, _0x5475d2)
      } catch (_0x44d349) {
        ;(_e = (_d = _0x5ba9fc == null ? void 0 : _0x5ba9fc[_0x18219(371)]) == null ? void 0 : _d[_0xf7764b(339)]) ==
        null
          ? void 0
          : _e.call(_d, _0x44d349)
      }
    }
  }
  const forwardClientOnNotification = (_0x28d609, _0x4bf7cb) => async (_0x4bc3b1) => {
    var _a, _b, _c
    const _0x3b3b4a = _0x436f,
      _0x1002c0 = _0x436f,
      _0x35ae78 = {}
    ;((_0x35ae78['dtUgZ'] = function (_0x4ee941, _0x184cdc) {
      return _0x4ee941 !== _0x184cdc
    }),
      (_0x35ae78['jgCIb'] = _0x3b3b4a(353)),
      (_0x35ae78['uUjKY'] = '2.0'))
    const _0x564be4 = _0x35ae78,
      { method: _0x4170f4, params: _0x466e2b } = _0x4bc3b1
    if (
      _0x564be4['dtUgZ'](_0x4170f4, _0x564be4['jgCIb']) &&
      (_0x4170f4 !== _0x3b3b4a(400) || (_0x466e2b == null ? void 0 : _0x466e2b['forward']))
    )
      try {
        const _0x2fa139 = { ..._0x4bc3b1 }
        ;((_0x2fa139[_0x3b3b4a(394)] = _0x564be4[_0x1002c0(352)]),
          await ((_a = _0x4bf7cb == null ? void 0 : _0x4bf7cb[_0x3b3b4a(371)]) == null
            ? void 0
            : _a[_0x3b3b4a(392)](_0x2fa139)))
      } catch (_0x4981b1) {
        ;(_c = (_b = _0x28d609 == null ? void 0 : _0x28d609[_0x3b3b4a(371)]) == null ? void 0 : _b[_0x1002c0(339)]) ==
        null
          ? void 0
          : _c.call(_b, _0x4981b1)
      }
  }
  function _0x436f(_0x3eb3da, _0x246fe0) {
    const _0x190ef0 = _0x312b()
    return (
      (_0x436f = function (_0x3844a1, _0x22bcbf) {
        _0x3844a1 = _0x3844a1 - (9 * -113 + -1439 * -1 + -97)
        let _0x3446e7 = _0x190ef0[_0x3844a1]
        return _0x3446e7
      }),
      _0x436f(_0x3eb3da, _0x246fe0)
    )
  }
  const forwardClientOnResponse = (_0x1e680e, _0x1c8008) => async (_0x525a8d) => {
    var _a, _b, _c, _d, _e, _f
    const _0x4cc7de = _0x436f,
      _0x48c146 = _0x436f,
      _0x15ca71 = {}
    _0x15ca71[_0x4cc7de(401)] = _0x48c146(332)
    const _0x27611c = _0x15ca71
    try {
      await ((_a = _0x1c8008 == null ? void 0 : _0x1c8008['transport']) == null ? void 0 : _a['send'](_0x525a8d))
    } catch (_0x4fb145) {
      const { code: _0x42cf0b, message: _0xe29332, data: _0x3919ab } = _0x4fb145
      try {
        if (_0x42cf0b) {
          const _0x15d8af = {}
          ;((_0x15d8af['code'] = _0x42cf0b), (_0x15d8af[_0x4cc7de(399)] = _0xe29332), (_0x15d8af['data'] = _0x3919ab))
          const _0x5acd21 = {}
          ;((_0x5acd21[_0x4cc7de(348)] = _0x15d8af),
            (_0x5acd21[_0x4cc7de(394)] = _0x27611c['OhJjz']),
            (_0x5acd21['id'] = _0x525a8d['id']),
            await ((_b = _0x1e680e == null ? void 0 : _0x1e680e[_0x4cc7de(371)]) == null
              ? void 0
              : _b['send'](_0x5acd21)))
        } else
          (_d = (_c = _0x1e680e == null ? void 0 : _0x1e680e['transport']) == null ? void 0 : _c[_0x48c146(339)]) ==
          null
            ? void 0
            : _d.call(_c, _0x4fb145)
      } catch (_0x18c5af) {
        ;(_f = (_e = _0x1e680e == null ? void 0 : _0x1e680e['transport']) == null ? void 0 : _e['onerror']) == null
          ? void 0
          : _f.call(_e, _0x18c5af)
      }
    }
  }
  const createHandleListener = () => {
      const _0x584790 = _0x436f,
        _0xfde4fe = _0x436f,
        _0x4ea6ca = {
          'vnkqu': function (_0x403bc5, _0x53bd2e) {
            return _0x403bc5 !== _0x53bd2e
          },
          'wxDWr': function (_0x1c881b, _0x66c10d) {
            return _0x1c881b(_0x66c10d)
          },
          'GdkkV': function (_0x9d4748, _0x24b020) {
            return _0x9d4748 === _0x24b020
          }
        },
        _0x5de2ad = [],
        _0x1c01fe = (_0x431466, _0x28ccda) => {
          const _0x1d408a = _0x436f,
            _0x120458 = _0x436f
          if (_0x28ccda) {
            const _0x1e8724 = []
            for (const _0x1264b7 of _0x5de2ad) {
              try {
                _0x1e8724['push'](_0x1264b7(_0x431466, _0x28ccda))
              } catch {}
            }
            for (const _0x445fc2 of _0x1e8724) {
              if (_0x4ea6ca[_0x1d408a(379)](_0x445fc2, null)) return _0x445fc2
            }
          } else
            for (const _0x4637f1 of _0x5de2ad) {
              try {
                _0x4ea6ca[_0x120458(343)](_0x4637f1, _0x431466)
              } catch {}
            }
        },
        _0x46917c = (_0x2b37ef) => {
          const _0x562515 = _0x436f
          _0x4ea6ca[_0x562515(384)](typeof _0x2b37ef, _0x562515(369)) &&
            !_0x5de2ad['includes'](_0x2b37ef) &&
            _0x5de2ad['push'](_0x2b37ef)
        },
        _0x1187af = (_0x522cb1) => {
          const _0x530b39 = _0x5de2ad['indexOf'](_0x522cb1)
          _0x530b39 !== -1 && _0x5de2ad['splice'](_0x530b39, 1 * -6854 + 8 * -33 + 7119)
        },
        _0x21be0c = () => {
          const _0x217721 = _0x436f
          _0x5de2ad[_0x217721(374)] = 7102 * 1 + 5522 + -526 * 24
        },
        _0x3a7414 = {}
      return (
        (_0x3a7414[_0x584790(346)] = _0x1c01fe),
        (_0x3a7414[_0xfde4fe(330)] = _0x46917c),
        (_0x3a7414['removeListener'] = _0x1187af),
        (_0x3a7414[_0x584790(359)] = _0x21be0c),
        _0x3a7414
      )
    },
    setClientListener = (_0x44ee2c) => {
      const _0x41b7db = _0x436f,
        _0x543db2 = _0x436f,
        _0x158fa1 = {
          'xwPeb': function (_0x2ff8e4) {
            return _0x2ff8e4()
          },
          'Mfvzm': function (_0x557d5a) {
            return _0x557d5a()
          }
        }
      {
        const {
          handleListener: _0x1d5fdc,
          addListener: _0x47b60e,
          removeListener: _0x7a7da6,
          clearListener: _0x32a47a
        } = _0x158fa1[_0x41b7db(326)](createHandleListener)
        ;((_0x44ee2c['_onresponse'] = _0x1d5fdc),
          (_0x44ee2c[_0x41b7db(395)] = _0x47b60e),
          (_0x44ee2c['removeResponseListener'] = _0x7a7da6),
          (_0x44ee2c['clearResponseListener'] = _0x32a47a))
      }
      {
        const {
          handleListener: _0x2a5fe3,
          addListener: _0x630b07,
          removeListener: _0xb70f6,
          clearListener: _0x3e94ce
        } = _0x158fa1[_0x543db2(326)](createHandleListener)
        ;((_0x44ee2c[_0x543db2(328)] = _0x2a5fe3),
          (_0x44ee2c['addRequestListener'] = _0x630b07),
          (_0x44ee2c[_0x543db2(354)] = _0xb70f6),
          (_0x44ee2c[_0x543db2(341)] = _0x3e94ce))
      }
      {
        const {
          handleListener: _0x535dd5,
          addListener: _0x394877,
          removeListener: _0x253b3b,
          clearListener: _0x44f208
        } = _0x158fa1[_0x41b7db(375)](createHandleListener)
        ;((_0x44ee2c[_0x41b7db(342)] = _0x535dd5),
          (_0x44ee2c[_0x41b7db(327)] = _0x394877),
          (_0x44ee2c['removeNotificationListener'] = _0x253b3b),
          (_0x44ee2c['clearNotificationListener'] = _0x44f208))
      }
    }
  function _0x312b() {
    const _0x10336d = [
      'uUjKY',
      'notifications/initialized',
      'removeRequestListener',
      '96194JysfjF',
      '36346SGEWAV',
      '1357830AJaOeY',
      'resources/templates/list',
      'clearListener',
      'iQqcJ',
      'result',
      'tqDZP',
      'sSeCz',
      'XtowM',
      'HgYgW',
      '3913230mjiatC',
      'params',
      'roots/list',
      'function',
      'bfmJT',
      'transport',
      'resources/read',
      '27FNuDmk',
      'length',
      'Mfvzm',
      'ping',
      'code',
      '_onresponse',
      'vnkqu',
      'cjSoZ',
      'request',
      '9gIMIPC',
      'readResource',
      'GdkkV',
      'ptMjy',
      'call',
      'aVeaL',
      'completion/complete',
      '5035122lFbpzR',
      'logging/setLevel',
      'jQBBS',
      'send',
      '_requestHandlers',
      'jsonrpc',
      'addResponseListener',
      '7SpcenI',
      'ElOQH',
      'MDIkN',
      'message',
      'notifications/cancelled',
      'OhJjz',
      'clear',
      '672216JzFEyR',
      'xwPeb',
      'addNotificationListener',
      'fallbackRequestHandler',
      'sYzPD',
      'addListener',
      'ifIKG',
      '2.0',
      'gXsjT',
      'WqUnk',
      'resources/subscribe',
      'setLoggingLevel',
      '2491772kFUWFh',
      'SEmWX',
      'onerror',
      'prompts/get',
      'clearRequestListener',
      'fallbackNotificationHandler',
      'wxDWr',
      'SkoRK',
      'uTeHc',
      'handleListener',
      'Zybtx',
      'error',
      'originalOnResponse',
      'listResources',
      'initialize'
    ]
    _0x312b = function () {
      return _0x10336d
    }
    return _0x312b()
  }
  const initClientHandler = (_0x4eae35, { beforeInit: _0x5ede3e, afterInit: _0x392ad7 } = {}) => {
    const _0x39ee68 = _0x436f,
      _0x2ff689 = _0x436f,
      _0xef50a3 = {
        'tqDZP': function (_0x3b46af, _0x42b551) {
          return _0x3b46af === _0x42b551
        },
        'cjSoZ': 'function',
        'iQqcJ': _0x39ee68(378),
        'Zybtx': function (_0x5e40d5, _0xea2fd6) {
          return _0x5e40d5(_0xea2fd6)
        },
        'ElOQH': function (_0x29a1dd) {
          return _0x29a1dd()
        }
      },
      _0x28c085 = new Map(_0x4eae35['_notificationHandlers'])
    ;(_0x4eae35[_0x39ee68(393)][_0x39ee68(402)](),
      _0x4eae35['_notificationHandlers'][_0x39ee68(402)](),
      _0xef50a3['tqDZP'](typeof _0x5ede3e, _0xef50a3[_0x39ee68(380)]) && _0x5ede3e(),
      _0xef50a3[_0x39ee68(362)](_0x4eae35['_onresponse']['name'], _0xef50a3[_0x39ee68(360)]) &&
        (_0x4eae35[_0x2ff689(349)] = _0x4eae35['_onresponse']),
      _0xef50a3[_0x39ee68(347)](setClientListener, _0x4eae35),
      _0x4eae35['addResponseListener']((_0x5b9ccc) => {
        const _0x44116a = _0x2ff689
        _0x4eae35['originalOnResponse'][_0x44116a(386)](_0x4eae35, _0x5b9ccc)
      }),
      _0xef50a3['tqDZP'](typeof _0x392ad7, _0xef50a3[_0x2ff689(380)]) && _0xef50a3[_0x39ee68(397)](_0x392ad7),
      _0x4eae35[_0x2ff689(327)]((_0x4b3e63) => {
        const { method: _0x52cc8d } = _0x4b3e63,
          _0x1d4650 = _0x28c085['get'](_0x52cc8d)
        _0xef50a3['tqDZP'](typeof _0x1d4650, _0xef50a3['cjSoZ']) && _0x1d4650(_0x4b3e63)
      }))
  }
  const _0x1c80bf = _0x4f47,
    _0x53d80a = _0x4f47
  ;(function (_0x274e6a, _0x42a727) {
    const _0x110d0e = _0x4f47,
      _0x242f23 = _0x4f47,
      _0x198664 = _0x274e6a()
    while (!![]) {
      try {
        const _0x571b93 =
          -parseInt(_0x110d0e(393)) / (7531 + 5849 + -13379) +
          (parseInt(_0x110d0e(397)) / (12 * -615 + -1 * 5783 + 13165)) *
            (-parseInt(_0x110d0e(400)) / (-7435 + 6318 + 1120)) +
          -parseInt(_0x242f23(398)) / (7 * 545 + 5036 * -1 + -1225 * -1) +
          (parseInt(_0x110d0e(390)) / (-6 * 970 + 7 * -914 + -12223 * -1)) *
            (parseInt(_0x242f23(388)) / (-79 * 78 + 5153 + 1015)) +
          -parseInt(_0x110d0e(389)) / (1 * -613 + 1 * 9786 + -9166) +
          (-parseInt(_0x110d0e(402)) / (1906 * 4 + -3703 + -7 * 559)) *
            (-parseInt(_0x242f23(395)) / (139 + -3 * -647 + -2071)) +
          (parseInt(_0x242f23(399)) / (1110 + -78 * 79 + 5062 * 1)) *
            (parseInt(_0x242f23(385)) / (-3040 + 1 * 4645 + 2 * -797))
        if (_0x571b93 === _0x42a727) break
        else _0x198664['push'](_0x198664['shift']())
      } catch (_0x222798) {
        _0x198664['push'](_0x198664['shift']())
      }
    }
  })(_0x13a3, -1 * -881393 + 2 * 180895 + 1 * -644809)
  function _0x4f47(_0x5d6b98, _0xbed46d) {
    const _0x7f5b81 = _0x13a3()
    return (
      (_0x4f47 = function (_0x98208d, _0x540f7c) {
        _0x98208d = _0x98208d - (-1861 + -499 * 4 + 4241)
        let _0x1f0479 = _0x7f5b81[_0x98208d]
        return _0x1f0479
      }),
      _0x4f47(_0x5d6b98, _0xbed46d)
    )
  }
  function _0x13a3() {
    const _0x2dd535 = [
      'toString',
      'getRandomValues',
      '2101mUsYMI',
      'EQHzo',
      'padStart',
      '30UvDAkd',
      '1609706yzlqYx',
      '974735GrhZVO',
      'randomUUID',
      'REzPF',
      '562771BvAnoG',
      'dHTfU',
      '2047455boiYXf',
      'randomBytes',
      '14664qHAdbF',
      '3772144jLpQch',
      '52310AkWksx',
      '318MkjaVb',
      'from',
      '40WRwnSc'
    ]
    _0x13a3 = function () {
      return _0x2dd535
    }
    return _0x13a3()
  }
  const randomUUID$1 = () => {
      const _0x503b55 = _0x4f47,
        _0x5d1fe2 = _0x4f47,
        _0x1c89e3 = {}
      ;((_0x1c89e3['REzPF'] = function (_0x36d31b, _0x2b87c4) {
        return _0x36d31b & _0x2b87c4
      }),
        (_0x1c89e3['suJHI'] = function (_0x341adf, _0x50c362) {
          return _0x341adf === _0x50c362
        }),
        (_0x1c89e3[_0x503b55(386)] = function (_0x2bd9d4, _0x55e7e8) {
          return _0x2bd9d4 & _0x55e7e8
        }),
        (_0x1c89e3[_0x5d1fe2(394)] = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'))
      const _0x2305bc = _0x1c89e3
      if (_0x2305bc['suJHI'](typeof crypto, 'object') && crypto['randomUUID']) return crypto[_0x5d1fe2(391)]()
      return _0x2305bc['dHTfU']['replace'](/[xy]/g, (_0x47a253) => {
        const _0xee7adc = _0x503b55,
          _0x3ebe42 = _0x503b55,
          _0x3b82cf = _0x2305bc[_0xee7adc(392)](
            crypto[_0xee7adc(384)](new Uint8Array(-25 * -62 + 7113 + 2 * -4331))[741 * 2 + -1385 * -2 + 4252 * -1],
            8648 + -107 * 62 + -1999
          ),
          _0x5cd225 = _0x2305bc['suJHI'](_0x47a253, 'x')
            ? _0x3b82cf
            : _0x2305bc[_0x3ebe42(386)](_0x3b82cf, -2516 + -1861 + 4 * 1095) | (5047 + 32 + 461 * -11)
        return _0x5cd225['toString'](9449 + 4 * -461 + -7589)
      })
    },
    randomBytes = (_0x2added) => {
      const _0x3977c7 = _0x4f47,
        _0x2f0d95 = _0x4f47,
        _0x516c9f = new Uint8Array(_0x2added)
      return (
        crypto['getRandomValues'](_0x516c9f),
        Array[_0x3977c7(401)](_0x516c9f, (_0x145cf8) =>
          _0x145cf8[_0x2f0d95(403)](-3 * 1739 + -6509 + 2 * 5871)[_0x3977c7(387)](6365 + 9124 + -15487, '0')
        )['join']('')
      )
    },
    _0xf24c8f = {}
  ;((_0xf24c8f[_0x1c80bf(391)] = randomUUID$1), (_0xf24c8f[_0x53d80a(396)] = randomBytes))
  const _0x4b5fcc = _0x47a7
  ;(function (_0x564ad7, _0x4857af) {
    const _0x465eed = _0x47a7,
      _0xa45919 = _0x47a7,
      _0x1574ce = _0x564ad7()
    while (!![]) {
      try {
        const _0x1a581d =
          (parseInt(_0x465eed(521)) / (-3755 * -2 + -4007 + -3502 * 1)) *
            (parseInt(_0xa45919(499)) / (-521 * 5 + -7998 + 10605)) +
          (parseInt(_0xa45919(543)) / (-35 * 241 + 289 * 13 + 4681)) *
            (parseInt(_0xa45919(514)) / (-2831 + -6 * 664 + 6819)) +
          (parseInt(_0x465eed(502)) / (-2 * -995 + 7808 + -9793)) *
            (parseInt(_0xa45919(539)) / (-5989 + -857 + 571 * 12)) +
          parseInt(_0x465eed(553)) / (7818 + 1821 + -9632) +
          (parseInt(_0x465eed(516)) / (-1559 + 7309 * -1 + 8876)) *
            (-parseInt(_0x465eed(518)) / (8701 + -227 * 10 + -2 * 3211)) +
          -parseInt(_0x465eed(531)) / (-2966 + 14 * 74 + 1940) +
          (-parseInt(_0x465eed(545)) / (1465 + -1446 + -8)) * (parseInt(_0x465eed(541)) / (1676 + 8779 + -59 * 177))
        if (_0x1a581d === _0x4857af) break
        else _0x1574ce['push'](_0x1574ce['shift']())
      } catch (_0x4fe820) {
        _0x1574ce['push'](_0x1574ce['shift']())
      }
    }
  })(_0x4529, 1472653 * 1 + -2 * -897917 + -2275789)
  const forwardProxyClient = (_0x53de69, _0x17fc54) => {
      const _0x5c6b05 = _0x47a7,
        _0xe7562f = _0x47a7,
        _0x473cd6 = {
          'FyYHt': function (_0x5e7e1e, _0x251ae7, _0x311330) {
            return _0x5e7e1e(_0x251ae7, _0x311330)
          },
          'Fxtoq': function (_0x24fdb2, _0x5940e5, _0x4cecbc) {
            return _0x24fdb2(_0x5940e5, _0x4cecbc)
          }
        }
      ;(forwardServerOnRequest(_0x53de69, _0x17fc54), forwardServerOnNotification(_0x53de69, _0x17fc54))
      const _0x5dd8c7 = forwardClientOnRequest(_0x17fc54, _0x53de69),
        _0x14e3a4 = _0x473cd6[_0x5c6b05(510)](forwardClientOnResponse, _0x17fc54, _0x53de69),
        _0x1e8916 = _0x473cd6[_0xe7562f(549)](forwardClientOnNotification, _0x17fc54, _0x53de69)
      ;(_0x17fc54[_0xe7562f(537)](_0x5dd8c7),
        _0x17fc54[_0x5c6b05(519)](_0x14e3a4),
        _0x17fc54['addNotificationListener'](_0x1e8916),
        (_0x53de69[_0xe7562f(556)] = () => {
          const _0x6d3192 = _0xe7562f
          ;(_0x17fc54['removeRequestListener'](_0x5dd8c7),
            _0x17fc54[_0x6d3192(530)](_0x14e3a4),
            _0x17fc54[_0x6d3192(529)](_0x1e8916))
        }))
    },
    initWebClientHandler = (_0xbd06f8, _0x419735, _0x5699a0) => {
      const _0xec4f52 = _0x47a7,
        _0x441bc3 = {
          'pMiva': function (_0x356e75, _0x48efdd) {
            return _0x356e75 instanceof _0x48efdd
          },
          'TeTEy': _0xec4f52(546),
          'fyZbd': function (_0x156fdc, _0x32271d, _0x563255) {
            return _0x156fdc(_0x32271d, _0x563255)
          }
        },
        _0x56df6e = () => {
          var _a
          const _0x42afa2 = _0xec4f52
          ;(_0x441bc3['pMiva'](_0x5699a0, SSEClientTransport) &&
            ((_a = _0x5699a0['_eventSource']) == null
              ? void 0
              : _a['addEventListener'](_0x441bc3[_0x42afa2(547)], () => {
                  var _a2
                  const _0xd16fcf = _0x42afa2
                  ;(_a2 = _0x5699a0[_0xd16fcf(509)]) == null ? void 0 : _a2[_0xd16fcf(546)]()
                })),
            forwardProxyClient(_0xbd06f8, _0x419735))
        },
        _0x56311c = {}
      ;((_0x56311c['afterInit'] = _0x56df6e), _0x441bc3['fyZbd'](initClientHandler, _0x419735, _0x56311c))
    }
  const sseOptions = (_0x4b6179, _0x453b8b = _0xf24c8f['randomUUID']()) => {
    const _0x43bcb2 = _0x47a7,
      _0x1925d6 = _0x47a7,
      _0x180741 = {
        'OfssH': function (_0x2d9225, _0x537283, _0x2820a8) {
          return _0x2d9225(_0x537283, _0x2820a8)
        }
      },
      _0x3c78b4 = {}
    _0x3c78b4[_0x43bcb2(528)] = _0x453b8b
    const _0xb9b933 = _0x3c78b4,
      _0x5263fd = {}
    _0x5263fd[_0x43bcb2(528)] = _0x453b8b
    const _0x22a05a = {}
    ;((_0x22a05a[_0x1925d6(558)] = _0x5263fd), (_0x22a05a[_0x43bcb2(534)] = _0x43bcb2(524)))
    const _0x27d38e = {
      'requestInit': _0x22a05a,
      'eventSourceInit': {
        async 'fetch'(_0x11e1af, _0x36682f) {
          const _0x3e06e7 = _0x43bcb2,
            _0x4202d7 = _0x1925d6,
            _0x54dc09 = new Headers((_0x36682f == null ? void 0 : _0x36682f[_0x3e06e7(558)]) || {})
          Object['entries'](_0xb9b933)[_0x4202d7(498)](([_0x57dbc7, _0x5102e6]) => {
            const _0xef4bbf = _0x4202d7
            _0x54dc09[_0xef4bbf(527)](_0x57dbc7, _0x5102e6)
          })
          const _0x3f3a97 = { ..._0x36682f }
          return ((_0x3f3a97[_0x4202d7(558)] = _0x54dc09), _0x180741['OfssH'](fetch, _0x11e1af, _0x3f3a97))
        },
        'withCredentials': !![]
      }
    }
    return (
      _0x4b6179 &&
        ((_0x27d38e['requestInit'][_0x43bcb2(558)]['Authorization'] = _0x43bcb2(533) + _0x4b6179),
        (_0xb9b933['Authorization'] = 'Bearer ' + _0x4b6179)),
      _0x27d38e
    )
  }
  const streamOptions = (_0x3c6aa5, _0x4108dd = _0xf24c8f[_0x4b5fcc(517)]()) => {
    const _0x22b3a4 = _0x4b5fcc,
      _0x471b62 = _0x4b5fcc,
      _0x10d4da = {}
    _0x10d4da['nwQhY'] = 'include'
    const _0x36c773 = _0x10d4da,
      _0x4a8f59 = {}
    _0x4a8f59['stream-session-id'] = _0x4108dd
    const _0x287e71 = {}
    ;((_0x287e71['headers'] = _0x4a8f59), (_0x287e71['credentials'] = _0x36c773[_0x22b3a4(520)]))
    const _0x607b16 = {}
    _0x607b16[_0x22b3a4(544)] = _0x287e71
    const _0x1bc4b2 = _0x607b16
    return (_0x3c6aa5 && (_0x1bc4b2['requestInit']['headers'][_0x471b62(552)] = _0x471b62(533) + _0x3c6aa5), _0x1bc4b2)
  }
  const attemptConnection = async (_0x392cef, _0x4e2254, _0x7e37a) => {
    const _0x499695 = _0x4b5fcc,
      _0x960d30 = _0x4b5fcc,
      _0x2e99f7 = {
        'CFfFC': function (_0x2880a3) {
          return _0x2880a3()
        },
        'egwVO': function (_0x459eeb, _0x1ba5f4, _0xa79e2d, _0x34b1c9) {
          return _0x459eeb(_0x1ba5f4, _0xa79e2d, _0x34b1c9)
        }
      },
      _0x3109d4 = _0x2e99f7['CFfFC'](_0x7e37a)
    try {
      return (await _0x392cef[_0x499695(538)](_0x3109d4), _0x3109d4)
    } catch (_0x2e4c22) {
      if (_0x2e4c22 instanceof UnauthorizedError) {
        const _0x1a7050 = await _0x4e2254()
        return (
          await _0x3109d4[_0x960d30(505)](_0x1a7050),
          await _0x2e99f7[_0x499695(525)](attemptConnection, _0x392cef, _0x4e2254, _0x7e37a)
        )
      } else throw _0x2e4c22
    }
  }
  function _0x47a7(_0x31715f, _0x5e9fa0) {
    const _0x26a018 = _0x4529()
    return (
      (_0x47a7 = function (_0x257357, _0x2e760b) {
        _0x257357 = _0x257357 - (74 * -67 + -8341 + -73 * -189)
        let _0x1334e3 = _0x26a018[_0x257357]
        return _0x1334e3
      }),
      _0x47a7(_0x31715f, _0x5e9fa0)
    )
  }
  const getWaitForOAuthCodeFunction = (_0x3ea3cc, _0x1a8f90) => {
    const _0xae6017 = _0x4b5fcc,
      _0x3dddee = _0x4b5fcc,
      _0x11d77d = {}
    ;((_0x11d77d['RsKXs'] = function (_0x35f130, _0x386a12) {
      return _0x35f130 in _0x386a12
    }),
      (_0x11d77d['PBhps'] = 'waitForOAuthCode'),
      (_0x11d77d[_0xae6017(535)] = 'function'),
      (_0x11d77d[_0xae6017(507)] = 'waitForOAuthCode need to be provided when authProvider is provided'))
    const _0x2562e6 = _0x11d77d
    if (_0x2562e6['RsKXs'](_0x2562e6[_0x3dddee(551)], _0x3ea3cc)) return _0x3ea3cc[_0x3dddee(523)]
    else {
      if (typeof _0x1a8f90 === _0x2562e6['yTKoP']) return _0x1a8f90
    }
    throw new Error(_0x2562e6['RZhOv'])
  }
  const createSseProxy = async (_0x3a7e67) => {
    const _0x436c50 = _0x4b5fcc,
      _0x54de6e = _0x4b5fcc,
      _0x15dc58 = {
        'TFSRn': function (_0x3d2e7e, _0x561712, _0x2439e9) {
          return _0x3d2e7e(_0x561712, _0x2439e9)
        },
        'HwvVa': 'mcp-sse-proxy-client',
        'ufTHS': function (_0x14fa54) {
          return _0x14fa54()
        },
        'WIVYl': function (_0x538291, _0x3c8264, _0x52c29b, _0x1d8414) {
          return _0x538291(_0x3c8264, _0x52c29b, _0x1d8414)
        },
        'jniGY': 'sessionId'
      },
      {
        client: _0x25d054,
        url: _0x2828f0,
        token: _0x367a86,
        sessionId: _0x397571,
        authProvider: _0x16a780,
        requestInit: _0xd2fc7a,
        eventSourceInit: _0x3321f4,
        waitForOAuthCode: _0xe2483b
      } = _0x3a7e67,
      _0x507895 = {}
    ;((_0x507895['authProvider'] = _0x16a780),
      (_0x507895['requestInit'] = _0xd2fc7a),
      (_0x507895['eventSourceInit'] = _0x3321f4))
    const _0x497c77 = _0x507895,
      _0x1a290e = _0x397571 || _0xf24c8f['randomUUID'](),
      _0x3d01da = _0x15dc58[_0x436c50(506)](sseOptions, _0x367a86, _0x1a290e)
    if (_0xd2fc7a) {
      const _0x6e0637 = { ..._0x3d01da['requestInit'], ..._0xd2fc7a }
      ;((_0x6e0637['headers'] = { ..._0x3d01da[_0x436c50(544)]['headers'], ..._0xd2fc7a['headers'] }),
        (_0x497c77['requestInit'] = _0x6e0637))
    } else _0x497c77[_0x54de6e(544)] = _0x3d01da['requestInit']
    if (_0x3321f4) {
      const _0x143351 = { ..._0x3d01da[_0x436c50(559)], ..._0x3321f4 }
      _0x497c77['eventSourceInit'] = _0x143351
    } else _0x497c77['eventSourceInit'] = _0x3d01da['eventSourceInit']
    const _0x4d6715 = {}
    _0x4d6715['listChanged'] = !![]
    const _0x6e6fc2 = {}
    ;((_0x6e6fc2['roots'] = _0x4d6715), (_0x6e6fc2['sampling'] = {}), (_0x6e6fc2[_0x436c50(511)] = {}))
    const _0x4ab62c = _0x6e6fc2,
      _0x278492 = {}
    ;((_0x278492[_0x54de6e(536)] = _0x15dc58['HwvVa']), (_0x278492['version'] = _0x436c50(526)))
    const _0x53bd61 = {}
    _0x53bd61['capabilities'] = _0x4ab62c
    const _0x4512ab = new Client(_0x278492, _0x53bd61),
      _0x2362cc = () => new SSEClientTransport(new URL(_0x2828f0), _0x497c77)
    let _0x5a6b4b = _0x15dc58[_0x54de6e(504)](_0x2362cc)
    if (_0x16a780) {
      const _0xffec8d = _0x15dc58[_0x436c50(506)](getWaitForOAuthCodeFunction, _0x16a780, _0xe2483b)
      _0x5a6b4b = await _0x15dc58[_0x54de6e(513)](attemptConnection, _0x4512ab, _0xffec8d, _0x2362cc)
    } else await _0x4512ab[_0x436c50(538)](_0x5a6b4b)
    ;(_0x15dc58[_0x54de6e(513)](initWebClientHandler, _0x4512ab, _0x25d054, _0x5a6b4b),
      (_0x5a6b4b[_0x54de6e(557)] = _0x5a6b4b[_0x54de6e(542)]['searchParams'][_0x54de6e(532)](_0x15dc58['jniGY'])))
    const _0x5ba2fa = {}
    return ((_0x5ba2fa['transport'] = _0x5a6b4b), (_0x5ba2fa['sessionId'] = _0x5a6b4b[_0x436c50(557)]), _0x5ba2fa)
  }
  function _0x4529() {
    const _0x51eb5a = [
      'ufTHS',
      'finishAuth',
      'TFSRn',
      'RZhOv',
      'Vajmx',
      '_eventSource',
      'FyYHt',
      'elicitation',
      'transport',
      'WIVYl',
      '13320uyrBtN',
      'sampling',
      '8WTwLJD',
      'randomUUID',
      '6438654bkJHij',
      'addResponseListener',
      'nwQhY',
      '11721GVgRMJ',
      '?sessionId=',
      'waitForOAuthCode',
      'include',
      'egwVO',
      '1.0.0',
      'set',
      'sse-session-id',
      'removeNotificationListener',
      'removeResponseListener',
      '11838520fNkjrV',
      'get',
      'Bearer ',
      'credentials',
      'yTKoP',
      'name',
      'addRequestListener',
      'connect',
      '18VhCgQv',
      'mcp-socket-proxy-client',
      '2819364JNqkQZ',
      '_endpoint',
      '699JyrxCR',
      'requestInit',
      '44ofbsvb',
      'close',
      'TeTEy',
      'QgzDy',
      'Fxtoq',
      'roots',
      'PBhps',
      'Authorization',
      '11309130xGCFwl',
      '&token=',
      'version',
      'onclose',
      'sessionId',
      'headers',
      'eventSourceInit',
      'forEach',
      '62FcOkCa',
      'mcp-stream-proxy-client',
      'zXcpO',
      '1794855cQEXDT',
      'biJOc'
    ]
    _0x4529 = function () {
      return _0x51eb5a
    }
    return _0x4529()
  }
  const createStreamProxy = async (_0x251f90) => {
    const _0x12bb64 = _0x4b5fcc,
      _0x15c0a5 = _0x4b5fcc,
      _0x4250bb = {
        'Vajmx': _0x12bb64(500),
        'biJOc': function (_0x5b7586) {
          return _0x5b7586()
        },
        'zXcpO': function (_0x51be96, _0x1bc1c4, _0x15398b) {
          return _0x51be96(_0x1bc1c4, _0x15398b)
        },
        'zDnjZ': function (_0x5c8088, _0x59eeb2, _0x1f72fa, _0x3031b6) {
          return _0x5c8088(_0x59eeb2, _0x1f72fa, _0x3031b6)
        },
        'FQMAh': function (_0x43d649, _0x7358f7, _0x26214b, _0x209c8f) {
          return _0x43d649(_0x7358f7, _0x26214b, _0x209c8f)
        }
      },
      {
        client: _0x2334f3,
        url: _0x20f945,
        token: _0x48014b,
        sessionId: _0x46b665,
        authProvider: _0x20e29a,
        requestInit: _0x171024,
        reconnectionOptions: _0x3cef76,
        waitForOAuthCode: _0x487335
      } = _0x251f90,
      _0x5aeb10 = {}
    ;((_0x5aeb10['authProvider'] = _0x20e29a),
      (_0x5aeb10['requestInit'] = _0x171024),
      (_0x5aeb10['reconnectionOptions'] = _0x3cef76))
    const _0x4e9a89 = _0x5aeb10,
      _0x49384b = _0x46b665 || _0xf24c8f['randomUUID'](),
      _0x24b3ae = streamOptions(_0x48014b, _0x49384b)
    if (_0x171024) {
      const _0x15a268 = { ..._0x24b3ae['requestInit'], ..._0x171024 }
      ;((_0x15a268['headers'] = { ..._0x24b3ae['requestInit']['headers'], ..._0x171024['headers'] }),
        (_0x4e9a89[_0x12bb64(544)] = _0x15a268))
    } else _0x4e9a89['requestInit'] = _0x24b3ae['requestInit']
    const _0x485d9e = {}
    _0x485d9e['listChanged'] = !![]
    const _0x17fa21 = {}
    ;((_0x17fa21[_0x15c0a5(550)] = _0x485d9e), (_0x17fa21['sampling'] = {}), (_0x17fa21['elicitation'] = {}))
    const _0x1f04a3 = _0x17fa21,
      _0x1e85db = {}
    ;((_0x1e85db[_0x12bb64(536)] = _0x4250bb[_0x15c0a5(508)]), (_0x1e85db[_0x12bb64(555)] = '1.0.0'))
    const _0x2d6e84 = {}
    _0x2d6e84['capabilities'] = _0x1f04a3
    const _0x40e04e = new Client(_0x1e85db, _0x2d6e84),
      _0x4e1361 = () => new StreamableHTTPClientTransport(new URL(_0x20f945), _0x4e9a89)
    let _0x5ae9aa = _0x4250bb[_0x12bb64(503)](_0x4e1361)
    if (_0x20e29a) {
      const _0x3d746a = _0x4250bb[_0x12bb64(501)](getWaitForOAuthCodeFunction, _0x20e29a, _0x487335)
      _0x5ae9aa = await _0x4250bb['zDnjZ'](attemptConnection, _0x40e04e, _0x3d746a, _0x4e1361)
    } else await _0x40e04e['connect'](_0x5ae9aa)
    _0x4250bb['FQMAh'](initWebClientHandler, _0x40e04e, _0x2334f3, _0x5ae9aa)
    const _0x3d688a = {}
    return ((_0x3d688a['transport'] = _0x5ae9aa), (_0x3d688a[_0x15c0a5(557)] = _0x5ae9aa['sessionId']), _0x3d688a)
  }
  const createSocketProxy = async (_0x371158) => {
    const _0x4f4147 = _0x4b5fcc,
      _0x45162f = _0x4b5fcc,
      _0x2442c1 = {
        'QgzDy': _0x4f4147(540),
        'jkaVB': function (_0x1bdb95, _0x25d320, _0x22f979, _0xb08066) {
          return _0x1bdb95(_0x25d320, _0x22f979, _0xb08066)
        }
      },
      { client: _0x218c80, url: _0x2b1955, token: _0x1b0573, sessionId: _0xb915e1 } = _0x371158,
      _0x2ef92e = {}
    _0x2ef92e['listChanged'] = !![]
    const _0x296a66 = {}
    ;((_0x296a66[_0x4f4147(550)] = _0x2ef92e), (_0x296a66[_0x4f4147(515)] = {}), (_0x296a66[_0x45162f(511)] = {}))
    const _0x1d78ab = _0x296a66,
      _0x59044f = {}
    ;((_0x59044f['name'] = _0x2442c1[_0x45162f(548)]), (_0x59044f[_0x45162f(555)] = _0x45162f(526)))
    const _0x287996 = {}
    _0x287996['capabilities'] = _0x1d78ab
    const _0x4907cb = new Client(_0x59044f, _0x287996),
      _0x4a1bd2 = _0xb915e1 || _0xf24c8f[_0x45162f(517)](),
      _0x530686 = new WebSocketClientTransport(
        new URL(_0x2b1955 + _0x4f4147(522) + _0x4a1bd2 + _0x45162f(554) + _0x1b0573)
      )
    ;(await _0x4907cb['connect'](_0x530686), _0x2442c1['jkaVB'](initWebClientHandler, _0x4907cb, _0x218c80, _0x530686))
    const _0x4940eb = {}
    return ((_0x4940eb[_0x4f4147(512)] = _0x530686), (_0x4940eb[_0x45162f(557)] = _0x4a1bd2), _0x4940eb)
  }
  const _0x125317 = _0x295b,
    _0x5b1277 = _0x295b
  function _0x295b(_0x143a1c, _0x560afd) {
    const _0x193076 = _0x19d4()
    return (
      (_0x295b = function (_0x3382c8, _0x453e4f) {
        _0x3382c8 = _0x3382c8 - (-7499 + -9262 + 51 * 337)
        let _0x3af06e = _0x193076[_0x3382c8]
        return _0x3af06e
      }),
      _0x295b(_0x143a1c, _0x560afd)
    )
  }
  ;(function (_0x1a8e04, _0x35cb37) {
    const _0x50af36 = _0x295b,
      _0x4734b7 = _0x295b,
      _0x5d6f5b = _0x1a8e04()
    while (!![]) {
      try {
        const _0x5d8f75 =
          -parseInt(_0x50af36(440)) / (-8893 + 7 * 7 + 1769 * 5) +
          (-parseInt(_0x50af36(458)) / (-8 * 123 + -538 + 3 * 508)) *
            (parseInt(_0x50af36(448)) / (3625 + -4072 + 450)) +
          (-parseInt(_0x50af36(451)) / (-9016 + 6489 + 1 * 2531)) *
            (parseInt(_0x4734b7(449)) / (-33 * 121 + 8411 + -4413)) +
          -parseInt(_0x4734b7(455)) / (6408 + -4012 + -2390) +
          -parseInt(_0x50af36(427)) / (131 * -55 + -1 * 7666 + 14878) +
          (-parseInt(_0x4734b7(438)) / (-4080 + -3534 * -2 + -2980)) *
            (parseInt(_0x4734b7(459)) / (2556 + -8604 + -673 * -9)) +
          (parseInt(_0x50af36(430)) / (-1010 + -3818 + 2419 * 2)) *
            (parseInt(_0x4734b7(436)) / (-27 * -343 + -922 + 694 * -12))
        if (_0x5d8f75 === _0x35cb37) break
        else _0x5d6f5b['push'](_0x5d6f5b['shift']())
      } catch (_0x19fe41) {
        _0x5d6f5b['push'](_0x5d6f5b['shift']())
      }
    }
  })(_0x19d4, -220880 + 1 * -333337 + -2 * -384996)
  function _0x19d4() {
    const _0x276461 = [
      '650XPHLhD',
      'redirectToAuthorization',
      '10856jPvMVb',
      'GET',
      'qcFPW',
      '_redirectUrl',
      '2187414WnlGuZ',
      'resolve',
      'tokens',
      '3976YyOqUl',
      '27ejNHsa',
      'Content-Type',
      'waitForOAuthCode',
      '2903796yvWZFa',
      '_clientMetadata',
      'application/x-www-form-urlencoded',
      '10beEWJk',
      'json',
      'code',
      '_callBackPromise',
      'reject',
      'saveClientInformation',
      '20776349mLNCcF',
      '_codeVerifier',
      '629912aTknXq',
      '_tokens',
      '52074GwcpRo',
      'state',
      '_state',
      '_redirectCallback',
      '_clientInformation',
      'redirect_uris',
      'Failed to redirect: ',
      'clientInformation',
      '381aduWsB'
    ]
    _0x19d4 = function () {
      return _0x276461
    }
    return _0x19d4()
  }
  const generateStateFunction = () => {
    return _0xf24c8f['randomBytes'](3485 * 1 + -261 + -3184)
  }
  class AuthClientProvider {
    constructor(_0x3ecaba) {
      const _0x16d744 = _0x295b,
        _0x573fab = _0x295b
      this['_callBackPromise'] = {}
      const {
        clientMetadata: _0x2075ee,
        state: _0x492c9e,
        redirectCallback: _0x418b2e,
        getAuthCodeByState: _0x5a6f80,
        waitForOAuthCode: _0x50de46
      } = _0x3ecaba
      ;((this[_0x16d744(428)] = _0x2075ee),
        (this[_0x16d744(454)] = _0x2075ee[_0x16d744(445)][-186 + -7549 + 7735]),
        (this['_state'] = _0x492c9e || generateStateFunction()),
        (this['_redirectCallback'] = _0x418b2e || this['redirectCallbackFunction']),
        (this['_getAuthCodeByState'] = _0x5a6f80 || this['getAuthCodeByStateFunction']),
        (this[_0x573fab(426)] = _0x50de46 || this['waitForOAuthCodeFunction']()))
    }
    async ['redirectCallbackFunction'](_0x182039) {
      var _a, _b, _c, _d, _e, _f
      const _0x2d7e3c = _0x295b,
        _0x2a3a87 = _0x295b,
        _0x3c788d = {
          'qITTp': function (_0x20812e, _0x1b0a26, _0x3458a1) {
            return _0x20812e(_0x1b0a26, _0x3458a1)
          },
          'qcFPW': _0x2d7e3c(452)
        },
        _0x2eeda1 = await _0x3c788d['qITTp'](fetch, _0x182039, { 'method': _0x3c788d[_0x2d7e3c(453)] })
      !_0x2eeda1['ok'] &&
        ((_b = (_a = this['_callBackPromise'])['reject']) == null
          ? void 0
          : _b.call(_a, _0x2a3a87(446) + _0x2eeda1['statusText']))
      const _0x4cf1ec = await this['_getAuthCodeByState'](this[_0x2a3a87(454)], this[_0x2d7e3c(442)])
      if (!_0x4cf1ec['ok']) {
        ;(_d = (_c = this[_0x2d7e3c(433)])['reject']) == null
          ? void 0
          : _d.call(_c, 'Failed to fetch auth code: ' + _0x4cf1ec['statusText'])
        return
      }
      const _0x37d882 = await _0x4cf1ec[_0x2d7e3c(431)]()
      ;(_f = (_e = this[_0x2a3a87(433)])[_0x2d7e3c(456)]) == null ? void 0 : _f.call(_e, _0x37d882[_0x2d7e3c(432)])
    }
    async ['getAuthCodeByStateFunction'](_0x17f993, _0x1a4325) {
      const _0x3626c4 = _0x295b,
        _0x5612c4 = _0x295b,
        _0xc6e3ca = {}
      _0xc6e3ca['tuSmb'] = _0x3626c4(429)
      const _0x28efc2 = _0xc6e3ca,
        _0x383513 = {}
      _0x383513[_0x3626c4(460)] = _0x28efc2['tuSmb']
      const _0x9e72f2 = {}
      return (
        (_0x9e72f2[_0x5612c4(441)] = _0x1a4325),
        fetch(_0x17f993, { 'method': 'POST', 'headers': _0x383513, 'body': new URLSearchParams(_0x9e72f2) })
      )
    }
    ['waitForOAuthCodeFunction']() {
      const _0xa710fb = _0x295b,
        _0x511b52 = this[_0xa710fb(433)]
      return () =>
        new Promise((_0x1edebd, _0x1825a2) => {
          const _0x268a86 = _0xa710fb
          ;((_0x511b52['resolve'] = _0x1edebd), (_0x511b52[_0x268a86(434)] = _0x1825a2))
        })
    }
    get ['redirectUrl']() {
      const _0x4af006 = _0x295b
      return this[_0x4af006(454)]
    }
    get ['clientMetadata']() {
      return this['_clientMetadata']
    }
    ['state']() {
      return this['_state']
    }
    [_0x125317(447)]() {
      const _0x403dc5 = _0x125317
      return this[_0x403dc5(444)]
    }
    [_0x5b1277(435)](_0x48ae19) {
      const _0x2f8a8e = _0x125317
      this[_0x2f8a8e(444)] = _0x48ae19
    }
    [_0x5b1277(457)]() {
      const _0x4f9f20 = _0x5b1277
      return this[_0x4f9f20(439)]
    }
    ['saveTokens'](_0x23e270) {
      this['_tokens'] = _0x23e270
    }
    [_0x5b1277(450)](_0x3b8777) {
      const _0x43d6aa = _0x125317
      this[_0x43d6aa(443)](_0x3b8777)
    }
    ['saveCodeVerifier'](_0x24fa92) {
      this['_codeVerifier'] = _0x24fa92
    }
    ['codeVerifier']() {
      const _0x5580e8 = _0x125317
      if (!this[_0x5580e8(437)]) throw new Error('No code verifier saved')
      return this['_codeVerifier']
    }
  }
  ;(function (_0x3eddf7, _0x37edba) {
    var _0x4f4dfb = _0x2d57,
      _0x26a47e = _0x2d57,
      _0x455a42 = _0x3eddf7()
    while (!![]) {
      try {
        var _0x352785 =
          (parseInt(_0x4f4dfb(361)) / (-8487 + 3575 + -17 * -289)) *
            (parseInt(_0x26a47e(363)) / (-1 * -8543 + 5 * 233 + -9706)) +
          -parseInt(_0x4f4dfb(358)) / (-4 * -991 + -4153 * 1 + 192) +
          (parseInt(_0x4f4dfb(359)) / (8411 + -6883 + 381 * -4)) *
            (parseInt(_0x4f4dfb(357)) / (37 * -99 + -553 * -13 + 1 * -3521)) +
          (parseInt(_0x26a47e(354)) / (3127 + 1287 + -4408)) *
            (parseInt(_0x4f4dfb(360)) / (79 * -47 + -6867 + -10587 * -1)) +
          parseInt(_0x26a47e(362)) / (2879 * -1 + -4327 + 7214 * 1) +
          parseInt(_0x26a47e(364)) / (-7772 + -1 * -7873 + -92) +
          (-parseInt(_0x26a47e(356)) / (9184 + -6643 + -2531)) *
            (parseInt(_0x4f4dfb(355)) / (1843 + 1 * 9218 + 425 * -26))
        if (_0x352785 === _0x37edba) break
        else _0x455a42['push'](_0x455a42['shift']())
      } catch (_0x2a1929) {
        _0x455a42['push'](_0x455a42['shift']())
      }
    }
  })(_0x59e6, -73523 * -3 + 1 * -407717 + 530518)
  function _0x59e6() {
    var _0x5ee1c4 = [
      '40ecBYYe',
      '1095owKKYD',
      '486870YOVwZy',
      '5752xWiyTO',
      '561484biNVMw',
      '1fWJmxQ',
      '1866064SPnyhb',
      '1109522vMiuMX',
      '1602351pPEGwH',
      '12sVyMLL',
      '2573296LTwOhv'
    ]
    _0x59e6 = function () {
      return _0x5ee1c4
    }
    return _0x59e6()
  }
  function _0x2d57(_0x22a4e9, _0x3c5d7b) {
    var _0x3ed0bb = _0x59e6()
    return (
      (_0x2d57 = function (_0x19cb9d, _0x563453) {
        _0x19cb9d = _0x19cb9d - (-1 * -642 + 503 * -5 + 2227)
        var _0x246bca = _0x3ed0bb[_0x19cb9d]
        return _0x246bca
      }),
      _0x2d57(_0x22a4e9, _0x3c5d7b)
    )
  }
  class Server extends Protocol {
    /**
     * Initializes this server with the given name and version information.
     */
    constructor(_serverInfo, options) {
      var _a
      super(options)
      this._serverInfo = _serverInfo
      this._capabilities =
        (_a = options === null || options === void 0 ? void 0 : options.capabilities) !== null && _a !== void 0
          ? _a
          : {}
      this._instructions = options === null || options === void 0 ? void 0 : options.instructions
      this.setRequestHandler(InitializeRequestSchema, (request) => this._oninitialize(request))
      this.setNotificationHandler(InitializedNotificationSchema, () => {
        var _a2
        return (_a2 = this.oninitialized) === null || _a2 === void 0 ? void 0 : _a2.call(this)
      })
    }
    /**
     * Registers new capabilities. This can only be called before connecting to a transport.
     *
     * The new capabilities will be merged with any existing capabilities previously given (e.g., at initialization).
     */
    registerCapabilities(capabilities) {
      if (this.transport) {
        throw new Error('Cannot register capabilities after connecting to transport')
      }
      this._capabilities = mergeCapabilities(this._capabilities, capabilities)
    }
    assertCapabilityForMethod(method) {
      var _a, _b, _c
      switch (method) {
        case 'sampling/createMessage':
          if (!((_a = this._clientCapabilities) === null || _a === void 0 ? void 0 : _a.sampling)) {
            throw new Error(`Client does not support sampling (required for ${method})`)
          }
          break
        case 'elicitation/create':
          if (!((_b = this._clientCapabilities) === null || _b === void 0 ? void 0 : _b.elicitation)) {
            throw new Error(`Client does not support elicitation (required for ${method})`)
          }
          break
        case 'roots/list':
          if (!((_c = this._clientCapabilities) === null || _c === void 0 ? void 0 : _c.roots)) {
            throw new Error(`Client does not support listing roots (required for ${method})`)
          }
          break
      }
    }
    assertNotificationCapability(method) {
      switch (method) {
        case 'notifications/message':
          if (!this._capabilities.logging) {
            throw new Error(`Server does not support logging (required for ${method})`)
          }
          break
        case 'notifications/resources/updated':
        case 'notifications/resources/list_changed':
          if (!this._capabilities.resources) {
            throw new Error(`Server does not support notifying about resources (required for ${method})`)
          }
          break
        case 'notifications/tools/list_changed':
          if (!this._capabilities.tools) {
            throw new Error(`Server does not support notifying of tool list changes (required for ${method})`)
          }
          break
        case 'notifications/prompts/list_changed':
          if (!this._capabilities.prompts) {
            throw new Error(`Server does not support notifying of prompt list changes (required for ${method})`)
          }
          break
      }
    }
    assertRequestHandlerCapability(method) {
      switch (method) {
        case 'sampling/createMessage':
          if (!this._capabilities.sampling) {
            throw new Error(`Server does not support sampling (required for ${method})`)
          }
          break
        case 'logging/setLevel':
          if (!this._capabilities.logging) {
            throw new Error(`Server does not support logging (required for ${method})`)
          }
          break
        case 'prompts/get':
        case 'prompts/list':
          if (!this._capabilities.prompts) {
            throw new Error(`Server does not support prompts (required for ${method})`)
          }
          break
        case 'resources/list':
        case 'resources/templates/list':
        case 'resources/read':
          if (!this._capabilities.resources) {
            throw new Error(`Server does not support resources (required for ${method})`)
          }
          break
        case 'tools/call':
        case 'tools/list':
          if (!this._capabilities.tools) {
            throw new Error(`Server does not support tools (required for ${method})`)
          }
          break
      }
    }
    async _oninitialize(request) {
      const requestedVersion = request.params.protocolVersion
      this._clientCapabilities = request.params.capabilities
      this._clientVersion = request.params.clientInfo
      const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.includes(requestedVersion)
        ? requestedVersion
        : LATEST_PROTOCOL_VERSION
      return {
        protocolVersion,
        capabilities: this.getCapabilities(),
        serverInfo: this._serverInfo,
        ...(this._instructions && { instructions: this._instructions })
      }
    }
    /**
     * After initialization has completed, this will be populated with the client's reported capabilities.
     */
    getClientCapabilities() {
      return this._clientCapabilities
    }
    /**
     * After initialization has completed, this will be populated with information about the client's name and version.
     */
    getClientVersion() {
      return this._clientVersion
    }
    getCapabilities() {
      return this._capabilities
    }
    async ping() {
      return this.request({ method: 'ping' }, EmptyResultSchema)
    }
    async createMessage(params, options) {
      return this.request({ method: 'sampling/createMessage', params }, CreateMessageResultSchema, options)
    }
    async elicitInput(params, options) {
      const result = await this.request({ method: 'elicitation/create', params }, ElicitResultSchema, options)
      if (result.action === 'accept' && result.content) {
        try {
          const ajv2 = new Ajv$1()
          const validate2 = ajv2.compile(params.requestedSchema)
          const isValid2 = validate2(result.content)
          if (!isValid2) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `Elicitation response content does not match requested schema: ${ajv2.errorsText(validate2.errors)}`
            )
          }
        } catch (error2) {
          if (error2 instanceof McpError) {
            throw error2
          }
          throw new McpError(ErrorCode.InternalError, `Error validating elicitation response: ${error2}`)
        }
      }
      return result
    }
    async listRoots(params, options) {
      return this.request({ method: 'roots/list', params }, ListRootsResultSchema, options)
    }
    async sendLoggingMessage(params) {
      return this.notification({ method: 'notifications/message', params })
    }
    async sendResourceUpdated(params) {
      return this.notification({
        method: 'notifications/resources/updated',
        params
      })
    }
    async sendResourceListChanged() {
      return this.notification({
        method: 'notifications/resources/list_changed'
      })
    }
    async sendToolListChanged() {
      return this.notification({ method: 'notifications/tools/list_changed' })
    }
    async sendPromptListChanged() {
      return this.notification({ method: 'notifications/prompts/list_changed' })
    }
  }
  const ignoreOverride = Symbol('Let zodToJsonSchema decide on which parser to use')
  const defaultOptions = {
    name: void 0,
    $refStrategy: 'root',
    basePath: ['#'],
    effectStrategy: 'input',
    pipeStrategy: 'all',
    dateStrategy: 'format:date-time',
    mapStrategy: 'entries',
    removeAdditionalStrategy: 'passthrough',
    allowedAdditionalProperties: true,
    rejectedAdditionalProperties: false,
    definitionPath: 'definitions',
    target: 'jsonSchema7',
    strictUnions: false,
    definitions: {},
    errorMessages: false,
    markdownDescription: false,
    patternStrategy: 'escape',
    applyRegexFlags: false,
    emailStrategy: 'format:email',
    base64Strategy: 'contentEncoding:base64',
    nameStrategy: 'ref',
    openAiAnyTypeName: 'OpenAiAnyType'
  }
  const getDefaultOptions = (options) =>
    typeof options === 'string'
      ? {
          ...defaultOptions,
          name: options
        }
      : {
          ...defaultOptions,
          ...options
        }
  const getRefs = (options) => {
    const _options = getDefaultOptions(options)
    const currentPath =
      _options.name !== void 0 ? [..._options.basePath, _options.definitionPath, _options.name] : _options.basePath
    return {
      ..._options,
      flags: { hasReferencedOpenAiAnyType: false },
      currentPath,
      propertyPath: void 0,
      seen: new Map(
        Object.entries(_options.definitions).map(([name, def2]) => [
          def2._def,
          {
            def: def2._def,
            path: [..._options.basePath, _options.definitionPath, name],
            // Resolution of references will be forced even though seen, so it's ok that the schema is undefined here for now.
            jsonSchema: void 0
          }
        ])
      )
    }
  }
  function addErrorMessage(res, key, errorMessage, refs) {
    if (!(refs == null ? void 0 : refs.errorMessages)) return
    if (errorMessage) {
      res.errorMessage = {
        ...res.errorMessage,
        [key]: errorMessage
      }
    }
  }
  function setResponseValueAndErrors(res, key, value, errorMessage, refs) {
    res[key] = value
    addErrorMessage(res, key, errorMessage, refs)
  }
  const getRelativePath = (pathA, pathB) => {
    let i = 0
    for (; i < pathA.length && i < pathB.length; i++) {
      if (pathA[i] !== pathB[i]) break
    }
    return [(pathA.length - i).toString(), ...pathB.slice(i)].join('/')
  }
  function parseAnyDef(refs) {
    if (refs.target !== 'openAi') {
      return {}
    }
    const anyDefinitionPath = [...refs.basePath, refs.definitionPath, refs.openAiAnyTypeName]
    refs.flags.hasReferencedOpenAiAnyType = true
    return {
      $ref:
        refs.$refStrategy === 'relative'
          ? getRelativePath(anyDefinitionPath, refs.currentPath)
          : anyDefinitionPath.join('/')
    }
  }
  function parseArrayDef(def2, refs) {
    var _a, _b, _c
    const res = {
      type: 'array'
    }
    if (
      ((_a = def2.type) == null ? void 0 : _a._def) &&
      ((_c = (_b = def2.type) == null ? void 0 : _b._def) == null ? void 0 : _c.typeName) !==
        ZodFirstPartyTypeKind.ZodAny
    ) {
      res.items = parseDef(def2.type._def, {
        ...refs,
        currentPath: [...refs.currentPath, 'items']
      })
    }
    if (def2.minLength) {
      setResponseValueAndErrors(res, 'minItems', def2.minLength.value, def2.minLength.message, refs)
    }
    if (def2.maxLength) {
      setResponseValueAndErrors(res, 'maxItems', def2.maxLength.value, def2.maxLength.message, refs)
    }
    if (def2.exactLength) {
      setResponseValueAndErrors(res, 'minItems', def2.exactLength.value, def2.exactLength.message, refs)
      setResponseValueAndErrors(res, 'maxItems', def2.exactLength.value, def2.exactLength.message, refs)
    }
    return res
  }
  function parseBigintDef(def2, refs) {
    const res = {
      type: 'integer',
      format: 'int64'
    }
    if (!def2.checks) return res
    for (const check of def2.checks) {
      switch (check.kind) {
        case 'min':
          if (refs.target === 'jsonSchema7') {
            if (check.inclusive) {
              setResponseValueAndErrors(res, 'minimum', check.value, check.message, refs)
            } else {
              setResponseValueAndErrors(res, 'exclusiveMinimum', check.value, check.message, refs)
            }
          } else {
            if (!check.inclusive) {
              res.exclusiveMinimum = true
            }
            setResponseValueAndErrors(res, 'minimum', check.value, check.message, refs)
          }
          break
        case 'max':
          if (refs.target === 'jsonSchema7') {
            if (check.inclusive) {
              setResponseValueAndErrors(res, 'maximum', check.value, check.message, refs)
            } else {
              setResponseValueAndErrors(res, 'exclusiveMaximum', check.value, check.message, refs)
            }
          } else {
            if (!check.inclusive) {
              res.exclusiveMaximum = true
            }
            setResponseValueAndErrors(res, 'maximum', check.value, check.message, refs)
          }
          break
        case 'multipleOf':
          setResponseValueAndErrors(res, 'multipleOf', check.value, check.message, refs)
          break
      }
    }
    return res
  }
  function parseBooleanDef() {
    return {
      type: 'boolean'
    }
  }
  function parseBrandedDef(_def, refs) {
    return parseDef(_def.type._def, refs)
  }
  const parseCatchDef = (def2, refs) => {
    return parseDef(def2.innerType._def, refs)
  }
  function parseDateDef(def2, refs, overrideDateStrategy) {
    const strategy = overrideDateStrategy ?? refs.dateStrategy
    if (Array.isArray(strategy)) {
      return {
        anyOf: strategy.map((item, i) => parseDateDef(def2, refs, item))
      }
    }
    switch (strategy) {
      case 'string':
      case 'format:date-time':
        return {
          type: 'string',
          format: 'date-time'
        }
      case 'format:date':
        return {
          type: 'string',
          format: 'date'
        }
      case 'integer':
        return integerDateParser(def2, refs)
    }
  }
  const integerDateParser = (def2, refs) => {
    const res = {
      type: 'integer',
      format: 'unix-time'
    }
    if (refs.target === 'openApi3') {
      return res
    }
    for (const check of def2.checks) {
      switch (check.kind) {
        case 'min':
          setResponseValueAndErrors(
            res,
            'minimum',
            check.value,
            // This is in milliseconds
            check.message,
            refs
          )
          break
        case 'max':
          setResponseValueAndErrors(
            res,
            'maximum',
            check.value,
            // This is in milliseconds
            check.message,
            refs
          )
          break
      }
    }
    return res
  }
  function parseDefaultDef(_def, refs) {
    return {
      ...parseDef(_def.innerType._def, refs),
      default: _def.defaultValue()
    }
  }
  function parseEffectsDef(_def, refs) {
    return refs.effectStrategy === 'input' ? parseDef(_def.schema._def, refs) : parseAnyDef(refs)
  }
  function parseEnumDef(def2) {
    return {
      type: 'string',
      enum: Array.from(def2.values)
    }
  }
  const isJsonSchema7AllOfType = (type2) => {
    if ('type' in type2 && type2.type === 'string') return false
    return 'allOf' in type2
  }
  function parseIntersectionDef(def2, refs) {
    const allOf2 = [
      parseDef(def2.left._def, {
        ...refs,
        currentPath: [...refs.currentPath, 'allOf', '0']
      }),
      parseDef(def2.right._def, {
        ...refs,
        currentPath: [...refs.currentPath, 'allOf', '1']
      })
    ].filter((x) => !!x)
    let unevaluatedProperties = refs.target === 'jsonSchema2019-09' ? { unevaluatedProperties: false } : void 0
    const mergedAllOf = []
    allOf2.forEach((schema) => {
      if (isJsonSchema7AllOfType(schema)) {
        mergedAllOf.push(...schema.allOf)
        if (schema.unevaluatedProperties === void 0) {
          unevaluatedProperties = void 0
        }
      } else {
        let nestedSchema = schema
        if ('additionalProperties' in schema && schema.additionalProperties === false) {
          const { additionalProperties: additionalProperties2, ...rest } = schema
          nestedSchema = rest
        } else {
          unevaluatedProperties = void 0
        }
        mergedAllOf.push(nestedSchema)
      }
    })
    return mergedAllOf.length
      ? {
          allOf: mergedAllOf,
          ...unevaluatedProperties
        }
      : void 0
  }
  function parseLiteralDef(def2, refs) {
    const parsedType = typeof def2.value
    if (parsedType !== 'bigint' && parsedType !== 'number' && parsedType !== 'boolean' && parsedType !== 'string') {
      return {
        type: Array.isArray(def2.value) ? 'array' : 'object'
      }
    }
    if (refs.target === 'openApi3') {
      return {
        type: parsedType === 'bigint' ? 'integer' : parsedType,
        enum: [def2.value]
      }
    }
    return {
      type: parsedType === 'bigint' ? 'integer' : parsedType,
      const: def2.value
    }
  }
  let emojiRegex = void 0
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
        emojiRegex = RegExp('^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$', 'u')
      }
      return emojiRegex
    },
    /**
     * Unused
     */
    uuid: /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/,
    /**
     * Unused
     */
    ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,
    ipv4Cidr:
      /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/,
    /**
     * Unused
     */
    ipv6: /^(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))$/,
    ipv6Cidr:
      /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,
    base64: /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/,
    base64url: /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/,
    nanoid: /^[a-zA-Z0-9_-]{21}$/,
    jwt: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/
  }
  function parseStringDef(def2, refs) {
    const res = {
      type: 'string'
    }
    if (def2.checks) {
      for (const check of def2.checks) {
        switch (check.kind) {
          case 'min':
            setResponseValueAndErrors(
              res,
              'minLength',
              typeof res.minLength === 'number' ? Math.max(res.minLength, check.value) : check.value,
              check.message,
              refs
            )
            break
          case 'max':
            setResponseValueAndErrors(
              res,
              'maxLength',
              typeof res.maxLength === 'number' ? Math.min(res.maxLength, check.value) : check.value,
              check.message,
              refs
            )
            break
          case 'email':
            switch (refs.emailStrategy) {
              case 'format:email':
                addFormat(res, 'email', check.message, refs)
                break
              case 'format:idn-email':
                addFormat(res, 'idn-email', check.message, refs)
                break
              case 'pattern:zod':
                addPattern(res, zodPatterns.email, check.message, refs)
                break
            }
            break
          case 'url':
            addFormat(res, 'uri', check.message, refs)
            break
          case 'uuid':
            addFormat(res, 'uuid', check.message, refs)
            break
          case 'regex':
            addPattern(res, check.regex, check.message, refs)
            break
          case 'cuid':
            addPattern(res, zodPatterns.cuid, check.message, refs)
            break
          case 'cuid2':
            addPattern(res, zodPatterns.cuid2, check.message, refs)
            break
          case 'startsWith':
            addPattern(res, RegExp(`^${escapeLiteralCheckValue(check.value, refs)}`), check.message, refs)
            break
          case 'endsWith':
            addPattern(res, RegExp(`${escapeLiteralCheckValue(check.value, refs)}$`), check.message, refs)
            break
          case 'datetime':
            addFormat(res, 'date-time', check.message, refs)
            break
          case 'date':
            addFormat(res, 'date', check.message, refs)
            break
          case 'time':
            addFormat(res, 'time', check.message, refs)
            break
          case 'duration':
            addFormat(res, 'duration', check.message, refs)
            break
          case 'length':
            setResponseValueAndErrors(
              res,
              'minLength',
              typeof res.minLength === 'number' ? Math.max(res.minLength, check.value) : check.value,
              check.message,
              refs
            )
            setResponseValueAndErrors(
              res,
              'maxLength',
              typeof res.maxLength === 'number' ? Math.min(res.maxLength, check.value) : check.value,
              check.message,
              refs
            )
            break
          case 'includes': {
            addPattern(res, RegExp(escapeLiteralCheckValue(check.value, refs)), check.message, refs)
            break
          }
          case 'ip': {
            if (check.version !== 'v6') {
              addFormat(res, 'ipv4', check.message, refs)
            }
            if (check.version !== 'v4') {
              addFormat(res, 'ipv6', check.message, refs)
            }
            break
          }
          case 'base64url':
            addPattern(res, zodPatterns.base64url, check.message, refs)
            break
          case 'jwt':
            addPattern(res, zodPatterns.jwt, check.message, refs)
            break
          case 'cidr': {
            if (check.version !== 'v6') {
              addPattern(res, zodPatterns.ipv4Cidr, check.message, refs)
            }
            if (check.version !== 'v4') {
              addPattern(res, zodPatterns.ipv6Cidr, check.message, refs)
            }
            break
          }
          case 'emoji':
            addPattern(res, zodPatterns.emoji(), check.message, refs)
            break
          case 'ulid': {
            addPattern(res, zodPatterns.ulid, check.message, refs)
            break
          }
          case 'base64': {
            switch (refs.base64Strategy) {
              case 'format:binary': {
                addFormat(res, 'binary', check.message, refs)
                break
              }
              case 'contentEncoding:base64': {
                setResponseValueAndErrors(res, 'contentEncoding', 'base64', check.message, refs)
                break
              }
              case 'pattern:zod': {
                addPattern(res, zodPatterns.base64, check.message, refs)
                break
              }
            }
            break
          }
          case 'nanoid': {
            addPattern(res, zodPatterns.nanoid, check.message, refs)
          }
        }
      }
    }
    return res
  }
  function escapeLiteralCheckValue(literal, refs) {
    return refs.patternStrategy === 'escape' ? escapeNonAlphaNumeric(literal) : literal
  }
  const ALPHA_NUMERIC = new Set('ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvxyz0123456789')
  function escapeNonAlphaNumeric(source) {
    let result = ''
    for (let i = 0; i < source.length; i++) {
      if (!ALPHA_NUMERIC.has(source[i])) {
        result += '\\'
      }
      result += source[i]
    }
    return result
  }
  function addFormat(schema, value, message, refs) {
    var _a
    if (schema.format || ((_a = schema.anyOf) == null ? void 0 : _a.some((x) => x.format))) {
      if (!schema.anyOf) {
        schema.anyOf = []
      }
      if (schema.format) {
        schema.anyOf.push({
          format: schema.format,
          ...(schema.errorMessage &&
            refs.errorMessages && {
              errorMessage: { format: schema.errorMessage.format }
            })
        })
        delete schema.format
        if (schema.errorMessage) {
          delete schema.errorMessage.format
          if (Object.keys(schema.errorMessage).length === 0) {
            delete schema.errorMessage
          }
        }
      }
      schema.anyOf.push({
        format: value,
        ...(message && refs.errorMessages && { errorMessage: { format: message } })
      })
    } else {
      setResponseValueAndErrors(schema, 'format', value, message, refs)
    }
  }
  function addPattern(schema, regex2, message, refs) {
    var _a
    if (schema.pattern || ((_a = schema.allOf) == null ? void 0 : _a.some((x) => x.pattern))) {
      if (!schema.allOf) {
        schema.allOf = []
      }
      if (schema.pattern) {
        schema.allOf.push({
          pattern: schema.pattern,
          ...(schema.errorMessage &&
            refs.errorMessages && {
              errorMessage: { pattern: schema.errorMessage.pattern }
            })
        })
        delete schema.pattern
        if (schema.errorMessage) {
          delete schema.errorMessage.pattern
          if (Object.keys(schema.errorMessage).length === 0) {
            delete schema.errorMessage
          }
        }
      }
      schema.allOf.push({
        pattern: stringifyRegExpWithFlags(regex2, refs),
        ...(message && refs.errorMessages && { errorMessage: { pattern: message } })
      })
    } else {
      setResponseValueAndErrors(schema, 'pattern', stringifyRegExpWithFlags(regex2, refs), message, refs)
    }
  }
  function stringifyRegExpWithFlags(regex2, refs) {
    var _a
    if (!refs.applyRegexFlags || !regex2.flags) {
      return regex2.source
    }
    const flags = {
      i: regex2.flags.includes('i'),
      m: regex2.flags.includes('m'),
      s: regex2.flags.includes('s')
      // `.` matches newlines
    }
    const source = flags.i ? regex2.source.toLowerCase() : regex2.source
    let pattern2 = ''
    let isEscaped = false
    let inCharGroup = false
    let inCharRange = false
    for (let i = 0; i < source.length; i++) {
      if (isEscaped) {
        pattern2 += source[i]
        isEscaped = false
        continue
      }
      if (flags.i) {
        if (inCharGroup) {
          if (source[i].match(/[a-z]/)) {
            if (inCharRange) {
              pattern2 += source[i]
              pattern2 += `${source[i - 2]}-${source[i]}`.toUpperCase()
              inCharRange = false
            } else if (source[i + 1] === '-' && ((_a = source[i + 2]) == null ? void 0 : _a.match(/[a-z]/))) {
              pattern2 += source[i]
              inCharRange = true
            } else {
              pattern2 += `${source[i]}${source[i].toUpperCase()}`
            }
            continue
          }
        } else if (source[i].match(/[a-z]/)) {
          pattern2 += `[${source[i]}${source[i].toUpperCase()}]`
          continue
        }
      }
      if (flags.m) {
        if (source[i] === '^') {
          pattern2 += `(^|(?<=[\r
]))`
          continue
        } else if (source[i] === '$') {
          pattern2 += `($|(?=[\r
]))`
          continue
        }
      }
      if (flags.s && source[i] === '.') {
        pattern2 += inCharGroup
          ? `${source[i]}\r
`
          : `[${source[i]}\r
]`
        continue
      }
      pattern2 += source[i]
      if (source[i] === '\\') {
        isEscaped = true
      } else if (inCharGroup && source[i] === ']') {
        inCharGroup = false
      } else if (!inCharGroup && source[i] === '[') {
        inCharGroup = true
      }
    }
    try {
      new RegExp(pattern2)
    } catch {
      console.warn(
        `Could not convert regex pattern at ${refs.currentPath.join('/')} to a flag-independent form! Falling back to the flag-ignorant source`
      )
      return regex2.source
    }
    return pattern2
  }
  function parseRecordDef(def2, refs) {
    var _a, _b, _c, _d, _e, _f
    if (refs.target === 'openAi') {
      console.warn('Warning: OpenAI may not support records in schemas! Try an array of key-value pairs instead.')
    }
    if (
      refs.target === 'openApi3' &&
      ((_a = def2.keyType) == null ? void 0 : _a._def.typeName) === ZodFirstPartyTypeKind.ZodEnum
    ) {
      return {
        type: 'object',
        required: def2.keyType._def.values,
        properties: def2.keyType._def.values.reduce(
          (acc, key) => ({
            ...acc,
            [key]:
              parseDef(def2.valueType._def, {
                ...refs,
                currentPath: [...refs.currentPath, 'properties', key]
              }) ?? parseAnyDef(refs)
          }),
          {}
        ),
        additionalProperties: refs.rejectedAdditionalProperties
      }
    }
    const schema = {
      type: 'object',
      additionalProperties:
        parseDef(def2.valueType._def, {
          ...refs,
          currentPath: [...refs.currentPath, 'additionalProperties']
        }) ?? refs.allowedAdditionalProperties
    }
    if (refs.target === 'openApi3') {
      return schema
    }
    if (
      ((_b = def2.keyType) == null ? void 0 : _b._def.typeName) === ZodFirstPartyTypeKind.ZodString &&
      ((_c = def2.keyType._def.checks) == null ? void 0 : _c.length)
    ) {
      const { type: type2, ...keyType } = parseStringDef(def2.keyType._def, refs)
      return {
        ...schema,
        propertyNames: keyType
      }
    } else if (((_d = def2.keyType) == null ? void 0 : _d._def.typeName) === ZodFirstPartyTypeKind.ZodEnum) {
      return {
        ...schema,
        propertyNames: {
          enum: def2.keyType._def.values
        }
      }
    } else if (
      ((_e = def2.keyType) == null ? void 0 : _e._def.typeName) === ZodFirstPartyTypeKind.ZodBranded &&
      def2.keyType._def.type._def.typeName === ZodFirstPartyTypeKind.ZodString &&
      ((_f = def2.keyType._def.type._def.checks) == null ? void 0 : _f.length)
    ) {
      const { type: type2, ...keyType } = parseBrandedDef(def2.keyType._def, refs)
      return {
        ...schema,
        propertyNames: keyType
      }
    }
    return schema
  }
  function parseMapDef(def2, refs) {
    if (refs.mapStrategy === 'record') {
      return parseRecordDef(def2, refs)
    }
    const keys =
      parseDef(def2.keyType._def, {
        ...refs,
        currentPath: [...refs.currentPath, 'items', 'items', '0']
      }) || parseAnyDef(refs)
    const values =
      parseDef(def2.valueType._def, {
        ...refs,
        currentPath: [...refs.currentPath, 'items', 'items', '1']
      }) || parseAnyDef(refs)
    return {
      type: 'array',
      maxItems: 125,
      items: {
        type: 'array',
        items: [keys, values],
        minItems: 2,
        maxItems: 2
      }
    }
  }
  function parseNativeEnumDef(def2) {
    const object = def2.values
    const actualKeys = Object.keys(def2.values).filter((key) => {
      return typeof object[object[key]] !== 'number'
    })
    const actualValues = actualKeys.map((key) => object[key])
    const parsedTypes = Array.from(new Set(actualValues.map((values) => typeof values)))
    return {
      type: parsedTypes.length === 1 ? (parsedTypes[0] === 'string' ? 'string' : 'number') : ['string', 'number'],
      enum: actualValues
    }
  }
  function parseNeverDef(refs) {
    return refs.target === 'openAi'
      ? void 0
      : {
          not: parseAnyDef({
            ...refs,
            currentPath: [...refs.currentPath, 'not']
          })
        }
  }
  function parseNullDef(refs) {
    return refs.target === 'openApi3'
      ? {
          enum: ['null'],
          nullable: true
        }
      : {
          type: 'null'
        }
  }
  const primitiveMappings = {
    ZodString: 'string',
    ZodNumber: 'number',
    ZodBigInt: 'integer',
    ZodBoolean: 'boolean',
    ZodNull: 'null'
  }
  function parseUnionDef(def2, refs) {
    if (refs.target === 'openApi3') return asAnyOf(def2, refs)
    const options = def2.options instanceof Map ? Array.from(def2.options.values()) : def2.options
    if (options.every((x) => x._def.typeName in primitiveMappings && (!x._def.checks || !x._def.checks.length))) {
      const types2 = options.reduce((types3, x) => {
        const type2 = primitiveMappings[x._def.typeName]
        return type2 && !types3.includes(type2) ? [...types3, type2] : types3
      }, [])
      return {
        type: types2.length > 1 ? types2 : types2[0]
      }
    } else if (options.every((x) => x._def.typeName === 'ZodLiteral' && !x.description)) {
      const types2 = options.reduce((acc, x) => {
        const type2 = typeof x._def.value
        switch (type2) {
          case 'string':
          case 'number':
          case 'boolean':
            return [...acc, type2]
          case 'bigint':
            return [...acc, 'integer']
          case 'object':
            if (x._def.value === null) return [...acc, 'null']
          case 'symbol':
          case 'undefined':
          case 'function':
          default:
            return acc
        }
      }, [])
      if (types2.length === options.length) {
        const uniqueTypes = types2.filter((x, i, a) => a.indexOf(x) === i)
        return {
          type: uniqueTypes.length > 1 ? uniqueTypes : uniqueTypes[0],
          enum: options.reduce((acc, x) => {
            return acc.includes(x._def.value) ? acc : [...acc, x._def.value]
          }, [])
        }
      }
    } else if (options.every((x) => x._def.typeName === 'ZodEnum')) {
      return {
        type: 'string',
        enum: options.reduce((acc, x) => [...acc, ...x._def.values.filter((x2) => !acc.includes(x2))], [])
      }
    }
    return asAnyOf(def2, refs)
  }
  const asAnyOf = (def2, refs) => {
    const anyOf2 = (def2.options instanceof Map ? Array.from(def2.options.values()) : def2.options)
      .map((x, i) =>
        parseDef(x._def, {
          ...refs,
          currentPath: [...refs.currentPath, 'anyOf', `${i}`]
        })
      )
      .filter((x) => !!x && (!refs.strictUnions || (typeof x === 'object' && Object.keys(x).length > 0)))
    return anyOf2.length ? { anyOf: anyOf2 } : void 0
  }
  function parseNullableDef(def2, refs) {
    if (
      ['ZodString', 'ZodNumber', 'ZodBigInt', 'ZodBoolean', 'ZodNull'].includes(def2.innerType._def.typeName) &&
      (!def2.innerType._def.checks || !def2.innerType._def.checks.length)
    ) {
      if (refs.target === 'openApi3') {
        return {
          type: primitiveMappings[def2.innerType._def.typeName],
          nullable: true
        }
      }
      return {
        type: [primitiveMappings[def2.innerType._def.typeName], 'null']
      }
    }
    if (refs.target === 'openApi3') {
      const base2 = parseDef(def2.innerType._def, {
        ...refs,
        currentPath: [...refs.currentPath]
      })
      if (base2 && '$ref' in base2) return { allOf: [base2], nullable: true }
      return base2 && { ...base2, nullable: true }
    }
    const base = parseDef(def2.innerType._def, {
      ...refs,
      currentPath: [...refs.currentPath, 'anyOf', '0']
    })
    return base && { anyOf: [base, { type: 'null' }] }
  }
  function parseNumberDef(def2, refs) {
    const res = {
      type: 'number'
    }
    if (!def2.checks) return res
    for (const check of def2.checks) {
      switch (check.kind) {
        case 'int':
          res.type = 'integer'
          addErrorMessage(res, 'type', check.message, refs)
          break
        case 'min':
          if (refs.target === 'jsonSchema7') {
            if (check.inclusive) {
              setResponseValueAndErrors(res, 'minimum', check.value, check.message, refs)
            } else {
              setResponseValueAndErrors(res, 'exclusiveMinimum', check.value, check.message, refs)
            }
          } else {
            if (!check.inclusive) {
              res.exclusiveMinimum = true
            }
            setResponseValueAndErrors(res, 'minimum', check.value, check.message, refs)
          }
          break
        case 'max':
          if (refs.target === 'jsonSchema7') {
            if (check.inclusive) {
              setResponseValueAndErrors(res, 'maximum', check.value, check.message, refs)
            } else {
              setResponseValueAndErrors(res, 'exclusiveMaximum', check.value, check.message, refs)
            }
          } else {
            if (!check.inclusive) {
              res.exclusiveMaximum = true
            }
            setResponseValueAndErrors(res, 'maximum', check.value, check.message, refs)
          }
          break
        case 'multipleOf':
          setResponseValueAndErrors(res, 'multipleOf', check.value, check.message, refs)
          break
      }
    }
    return res
  }
  function parseObjectDef(def2, refs) {
    const forceOptionalIntoNullable = refs.target === 'openAi'
    const result = {
      type: 'object',
      properties: {}
    }
    const required2 = []
    const shape = def2.shape()
    for (const propName in shape) {
      let propDef = shape[propName]
      if (propDef === void 0 || propDef._def === void 0) {
        continue
      }
      let propOptional = safeIsOptional(propDef)
      if (propOptional && forceOptionalIntoNullable) {
        if (propDef._def.typeName === 'ZodOptional') {
          propDef = propDef._def.innerType
        }
        if (!propDef.isNullable()) {
          propDef = propDef.nullable()
        }
        propOptional = false
      }
      const parsedDef = parseDef(propDef._def, {
        ...refs,
        currentPath: [...refs.currentPath, 'properties', propName],
        propertyPath: [...refs.currentPath, 'properties', propName]
      })
      if (parsedDef === void 0) {
        continue
      }
      result.properties[propName] = parsedDef
      if (!propOptional) {
        required2.push(propName)
      }
    }
    if (required2.length) {
      result.required = required2
    }
    const additionalProperties2 = decideAdditionalProperties(def2, refs)
    if (additionalProperties2 !== void 0) {
      result.additionalProperties = additionalProperties2
    }
    return result
  }
  function decideAdditionalProperties(def2, refs) {
    if (def2.catchall._def.typeName !== 'ZodNever') {
      return parseDef(def2.catchall._def, {
        ...refs,
        currentPath: [...refs.currentPath, 'additionalProperties']
      })
    }
    switch (def2.unknownKeys) {
      case 'passthrough':
        return refs.allowedAdditionalProperties
      case 'strict':
        return refs.rejectedAdditionalProperties
      case 'strip':
        return refs.removeAdditionalStrategy === 'strict'
          ? refs.allowedAdditionalProperties
          : refs.rejectedAdditionalProperties
    }
  }
  function safeIsOptional(schema) {
    try {
      return schema.isOptional()
    } catch {
      return true
    }
  }
  const parseOptionalDef = (def2, refs) => {
    var _a
    if (refs.currentPath.toString() === ((_a = refs.propertyPath) == null ? void 0 : _a.toString())) {
      return parseDef(def2.innerType._def, refs)
    }
    const innerSchema = parseDef(def2.innerType._def, {
      ...refs,
      currentPath: [...refs.currentPath, 'anyOf', '1']
    })
    return innerSchema
      ? {
          anyOf: [
            {
              not: parseAnyDef(refs)
            },
            innerSchema
          ]
        }
      : parseAnyDef(refs)
  }
  const parsePipelineDef = (def2, refs) => {
    if (refs.pipeStrategy === 'input') {
      return parseDef(def2.in._def, refs)
    } else if (refs.pipeStrategy === 'output') {
      return parseDef(def2.out._def, refs)
    }
    const a = parseDef(def2.in._def, {
      ...refs,
      currentPath: [...refs.currentPath, 'allOf', '0']
    })
    const b = parseDef(def2.out._def, {
      ...refs,
      currentPath: [...refs.currentPath, 'allOf', a ? '1' : '0']
    })
    return {
      allOf: [a, b].filter((x) => x !== void 0)
    }
  }
  function parsePromiseDef(def2, refs) {
    return parseDef(def2.type._def, refs)
  }
  function parseSetDef(def2, refs) {
    const items2 = parseDef(def2.valueType._def, {
      ...refs,
      currentPath: [...refs.currentPath, 'items']
    })
    const schema = {
      type: 'array',
      uniqueItems: true,
      items: items2
    }
    if (def2.minSize) {
      setResponseValueAndErrors(schema, 'minItems', def2.minSize.value, def2.minSize.message, refs)
    }
    if (def2.maxSize) {
      setResponseValueAndErrors(schema, 'maxItems', def2.maxSize.value, def2.maxSize.message, refs)
    }
    return schema
  }
  function parseTupleDef(def2, refs) {
    if (def2.rest) {
      return {
        type: 'array',
        minItems: def2.items.length,
        items: def2.items
          .map((x, i) =>
            parseDef(x._def, {
              ...refs,
              currentPath: [...refs.currentPath, 'items', `${i}`]
            })
          )
          .reduce((acc, x) => (x === void 0 ? acc : [...acc, x]), []),
        additionalItems: parseDef(def2.rest._def, {
          ...refs,
          currentPath: [...refs.currentPath, 'additionalItems']
        })
      }
    } else {
      return {
        type: 'array',
        minItems: def2.items.length,
        maxItems: def2.items.length,
        items: def2.items
          .map((x, i) =>
            parseDef(x._def, {
              ...refs,
              currentPath: [...refs.currentPath, 'items', `${i}`]
            })
          )
          .reduce((acc, x) => (x === void 0 ? acc : [...acc, x]), [])
      }
    }
  }
  function parseUndefinedDef(refs) {
    return {
      not: parseAnyDef(refs)
    }
  }
  function parseUnknownDef(refs) {
    return parseAnyDef(refs)
  }
  const parseReadonlyDef = (def2, refs) => {
    return parseDef(def2.innerType._def, refs)
  }
  const selectParser = (def2, typeName, refs) => {
    switch (typeName) {
      case ZodFirstPartyTypeKind.ZodString:
        return parseStringDef(def2, refs)
      case ZodFirstPartyTypeKind.ZodNumber:
        return parseNumberDef(def2, refs)
      case ZodFirstPartyTypeKind.ZodObject:
        return parseObjectDef(def2, refs)
      case ZodFirstPartyTypeKind.ZodBigInt:
        return parseBigintDef(def2, refs)
      case ZodFirstPartyTypeKind.ZodBoolean:
        return parseBooleanDef()
      case ZodFirstPartyTypeKind.ZodDate:
        return parseDateDef(def2, refs)
      case ZodFirstPartyTypeKind.ZodUndefined:
        return parseUndefinedDef(refs)
      case ZodFirstPartyTypeKind.ZodNull:
        return parseNullDef(refs)
      case ZodFirstPartyTypeKind.ZodArray:
        return parseArrayDef(def2, refs)
      case ZodFirstPartyTypeKind.ZodUnion:
      case ZodFirstPartyTypeKind.ZodDiscriminatedUnion:
        return parseUnionDef(def2, refs)
      case ZodFirstPartyTypeKind.ZodIntersection:
        return parseIntersectionDef(def2, refs)
      case ZodFirstPartyTypeKind.ZodTuple:
        return parseTupleDef(def2, refs)
      case ZodFirstPartyTypeKind.ZodRecord:
        return parseRecordDef(def2, refs)
      case ZodFirstPartyTypeKind.ZodLiteral:
        return parseLiteralDef(def2, refs)
      case ZodFirstPartyTypeKind.ZodEnum:
        return parseEnumDef(def2)
      case ZodFirstPartyTypeKind.ZodNativeEnum:
        return parseNativeEnumDef(def2)
      case ZodFirstPartyTypeKind.ZodNullable:
        return parseNullableDef(def2, refs)
      case ZodFirstPartyTypeKind.ZodOptional:
        return parseOptionalDef(def2, refs)
      case ZodFirstPartyTypeKind.ZodMap:
        return parseMapDef(def2, refs)
      case ZodFirstPartyTypeKind.ZodSet:
        return parseSetDef(def2, refs)
      case ZodFirstPartyTypeKind.ZodLazy:
        return () => def2.getter()._def
      case ZodFirstPartyTypeKind.ZodPromise:
        return parsePromiseDef(def2, refs)
      case ZodFirstPartyTypeKind.ZodNaN:
      case ZodFirstPartyTypeKind.ZodNever:
        return parseNeverDef(refs)
      case ZodFirstPartyTypeKind.ZodEffects:
        return parseEffectsDef(def2, refs)
      case ZodFirstPartyTypeKind.ZodAny:
        return parseAnyDef(refs)
      case ZodFirstPartyTypeKind.ZodUnknown:
        return parseUnknownDef(refs)
      case ZodFirstPartyTypeKind.ZodDefault:
        return parseDefaultDef(def2, refs)
      case ZodFirstPartyTypeKind.ZodBranded:
        return parseBrandedDef(def2, refs)
      case ZodFirstPartyTypeKind.ZodReadonly:
        return parseReadonlyDef(def2, refs)
      case ZodFirstPartyTypeKind.ZodCatch:
        return parseCatchDef(def2, refs)
      case ZodFirstPartyTypeKind.ZodPipeline:
        return parsePipelineDef(def2, refs)
      case ZodFirstPartyTypeKind.ZodFunction:
      case ZodFirstPartyTypeKind.ZodVoid:
      case ZodFirstPartyTypeKind.ZodSymbol:
        return void 0
      default:
        return /* @__PURE__ */ ((_) => void 0)()
    }
  }
  function parseDef(def2, refs, forceResolution = false) {
    var _a
    const seenItem = refs.seen.get(def2)
    if (refs.override) {
      const overrideResult =
        (_a = refs.override) == null ? void 0 : _a.call(refs, def2, refs, seenItem, forceResolution)
      if (overrideResult !== ignoreOverride) {
        return overrideResult
      }
    }
    if (seenItem && !forceResolution) {
      const seenSchema = get$ref(seenItem, refs)
      if (seenSchema !== void 0) {
        return seenSchema
      }
    }
    const newItem = { def: def2, path: refs.currentPath, jsonSchema: void 0 }
    refs.seen.set(def2, newItem)
    const jsonSchemaOrGetter = selectParser(def2, def2.typeName, refs)
    const jsonSchema =
      typeof jsonSchemaOrGetter === 'function' ? parseDef(jsonSchemaOrGetter(), refs) : jsonSchemaOrGetter
    if (jsonSchema) {
      addMeta(def2, refs, jsonSchema)
    }
    if (refs.postProcess) {
      const postProcessResult = refs.postProcess(jsonSchema, def2, refs)
      newItem.jsonSchema = jsonSchema
      return postProcessResult
    }
    newItem.jsonSchema = jsonSchema
    return jsonSchema
  }
  const get$ref = (item, refs) => {
    switch (refs.$refStrategy) {
      case 'root':
        return { $ref: item.path.join('/') }
      case 'relative':
        return { $ref: getRelativePath(refs.currentPath, item.path) }
      case 'none':
      case 'seen': {
        if (
          item.path.length < refs.currentPath.length &&
          item.path.every((value, index) => refs.currentPath[index] === value)
        ) {
          console.warn(`Recursive reference detected at ${refs.currentPath.join('/')}! Defaulting to any`)
          return parseAnyDef(refs)
        }
        return refs.$refStrategy === 'seen' ? parseAnyDef(refs) : void 0
      }
    }
  }
  const addMeta = (def2, refs, jsonSchema) => {
    if (def2.description) {
      jsonSchema.description = def2.description
      if (refs.markdownDescription) {
        jsonSchema.markdownDescription = def2.description
      }
    }
    return jsonSchema
  }
  const zodToJsonSchema = (schema, options) => {
    const refs = getRefs(options)
    let definitions2 =
      typeof options === 'object' && options.definitions
        ? Object.entries(options.definitions).reduce(
            (acc, [name2, schema2]) => ({
              ...acc,
              [name2]:
                parseDef(
                  schema2._def,
                  {
                    ...refs,
                    currentPath: [...refs.basePath, refs.definitionPath, name2]
                  },
                  true
                ) ?? parseAnyDef(refs)
            }),
            {}
          )
        : void 0
    const name =
      typeof options === 'string'
        ? options
        : (options == null ? void 0 : options.nameStrategy) === 'title'
          ? void 0
          : options == null
            ? void 0
            : options.name
    const main =
      parseDef(
        schema._def,
        name === void 0
          ? refs
          : {
              ...refs,
              currentPath: [...refs.basePath, refs.definitionPath, name]
            },
        false
      ) ?? parseAnyDef(refs)
    const title2 =
      typeof options === 'object' && options.name !== void 0 && options.nameStrategy === 'title' ? options.name : void 0
    if (title2 !== void 0) {
      main.title = title2
    }
    if (refs.flags.hasReferencedOpenAiAnyType) {
      if (!definitions2) {
        definitions2 = {}
      }
      if (!definitions2[refs.openAiAnyTypeName]) {
        definitions2[refs.openAiAnyTypeName] = {
          // Skipping "object" as no properties can be defined and additionalProperties must be "false"
          type: ['string', 'number', 'integer', 'boolean', 'array', 'null'],
          items: {
            $ref:
              refs.$refStrategy === 'relative'
                ? '1'
                : [...refs.basePath, refs.definitionPath, refs.openAiAnyTypeName].join('/')
          }
        }
      }
    }
    const combined =
      name === void 0
        ? definitions2
          ? {
              ...main,
              [refs.definitionPath]: definitions2
            }
          : main
        : {
            $ref: [...(refs.$refStrategy === 'relative' ? [] : refs.basePath), refs.definitionPath, name].join('/'),
            [refs.definitionPath]: {
              ...definitions2,
              [name]: main
            }
          }
    if (refs.target === 'jsonSchema7') {
      combined.$schema = 'http://json-schema.org/draft-07/schema#'
    } else if (refs.target === 'jsonSchema2019-09' || refs.target === 'openAi') {
      combined.$schema = 'https://json-schema.org/draft/2019-09/schema#'
    }
    if (
      refs.target === 'openAi' &&
      ('anyOf' in combined ||
        'oneOf' in combined ||
        'allOf' in combined ||
        ('type' in combined && Array.isArray(combined.type)))
    ) {
      console.warn(
        'Warning: OpenAI may not support schemas with unions as roots! Try wrapping it in an object property.'
      )
    }
    return combined
  }
  var McpZodTypeKind
  ;(function (McpZodTypeKind2) {
    McpZodTypeKind2['Completable'] = 'McpCompletable'
  })(McpZodTypeKind || (McpZodTypeKind = {}))
  class Completable extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input)
      const data2 = ctx.data
      return this._def.type._parse({
        data: data2,
        path: ctx.path,
        parent: ctx
      })
    }
    unwrap() {
      return this._def.type
    }
  }
  Completable.create = (type2, params) => {
    return new Completable({
      type: type2,
      typeName: McpZodTypeKind.Completable,
      complete: params.complete,
      ...processCreateParams(params)
    })
  }
  function completable(schema, complete) {
    return Completable.create(schema, { ...schema._def, complete })
  }
  function processCreateParams(params) {
    if (!params) return {}
    const { errorMap: errorMap2, invalid_type_error, required_error, description: description2 } = params
    if (errorMap2 && (invalid_type_error || required_error)) {
      throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`)
    }
    if (errorMap2) return { errorMap: errorMap2, description: description2 }
    const customMap = (iss, ctx) => {
      var _a, _b
      const { message } = params
      if (iss.code === 'invalid_enum_value') {
        return { message: message !== null && message !== void 0 ? message : ctx.defaultError }
      }
      if (typeof ctx.data === 'undefined') {
        return {
          message:
            (_a = message !== null && message !== void 0 ? message : required_error) !== null && _a !== void 0
              ? _a
              : ctx.defaultError
        }
      }
      if (iss.code !== 'invalid_type') return { message: ctx.defaultError }
      return {
        message:
          (_b = message !== null && message !== void 0 ? message : invalid_type_error) !== null && _b !== void 0
            ? _b
            : ctx.defaultError
      }
    }
    return { errorMap: customMap, description: description2 }
  }
  const MAX_TEMPLATE_LENGTH = 1e6
  const MAX_VARIABLE_LENGTH = 1e6
  const MAX_TEMPLATE_EXPRESSIONS = 1e4
  const MAX_REGEX_LENGTH = 1e6
  class UriTemplate {
    /**
     * Returns true if the given string contains any URI template expressions.
     * A template expression is a sequence of characters enclosed in curly braces,
     * like {foo} or {?bar}.
     */
    static isTemplate(str) {
      return /\{[^}\s]+\}/.test(str)
    }
    static validateLength(str, max, context) {
      if (str.length > max) {
        throw new Error(`${context} exceeds maximum length of ${max} characters (got ${str.length})`)
      }
    }
    get variableNames() {
      return this.parts.flatMap((part) => (typeof part === 'string' ? [] : part.names))
    }
    constructor(template) {
      UriTemplate.validateLength(template, MAX_TEMPLATE_LENGTH, 'Template')
      this.template = template
      this.parts = this.parse(template)
    }
    toString() {
      return this.template
    }
    parse(template) {
      const parts = []
      let currentText = ''
      let i = 0
      let expressionCount = 0
      while (i < template.length) {
        if (template[i] === '{') {
          if (currentText) {
            parts.push(currentText)
            currentText = ''
          }
          const end = template.indexOf('}', i)
          if (end === -1) throw new Error('Unclosed template expression')
          expressionCount++
          if (expressionCount > MAX_TEMPLATE_EXPRESSIONS) {
            throw new Error(`Template contains too many expressions (max ${MAX_TEMPLATE_EXPRESSIONS})`)
          }
          const expr = template.slice(i + 1, end)
          const operator = this.getOperator(expr)
          const exploded = expr.includes('*')
          const names2 = this.getNames(expr)
          const name = names2[0]
          for (const name2 of names2) {
            UriTemplate.validateLength(name2, MAX_VARIABLE_LENGTH, 'Variable name')
          }
          parts.push({ name, operator, names: names2, exploded })
          i = end + 1
        } else {
          currentText += template[i]
          i++
        }
      }
      if (currentText) {
        parts.push(currentText)
      }
      return parts
    }
    getOperator(expr) {
      const operators = ['+', '#', '.', '/', '?', '&']
      return operators.find((op) => expr.startsWith(op)) || ''
    }
    getNames(expr) {
      const operator = this.getOperator(expr)
      return expr
        .slice(operator.length)
        .split(',')
        .map((name) => name.replace('*', '').trim())
        .filter((name) => name.length > 0)
    }
    encodeValue(value, operator) {
      UriTemplate.validateLength(value, MAX_VARIABLE_LENGTH, 'Variable value')
      if (operator === '+' || operator === '#') {
        return encodeURI(value)
      }
      return encodeURIComponent(value)
    }
    expandPart(part, variables) {
      if (part.operator === '?' || part.operator === '&') {
        const pairs = part.names
          .map((name) => {
            const value2 = variables[name]
            if (value2 === void 0) return ''
            const encoded2 = Array.isArray(value2)
              ? value2.map((v) => this.encodeValue(v, part.operator)).join(',')
              : this.encodeValue(value2.toString(), part.operator)
            return `${name}=${encoded2}`
          })
          .filter((pair) => pair.length > 0)
        if (pairs.length === 0) return ''
        const separator = part.operator === '?' ? '?' : '&'
        return separator + pairs.join('&')
      }
      if (part.names.length > 1) {
        const values2 = part.names.map((name) => variables[name]).filter((v) => v !== void 0)
        if (values2.length === 0) return ''
        return values2.map((v) => (Array.isArray(v) ? v[0] : v)).join(',')
      }
      const value = variables[part.name]
      if (value === void 0) return ''
      const values = Array.isArray(value) ? value : [value]
      const encoded = values.map((v) => this.encodeValue(v, part.operator))
      switch (part.operator) {
        case '':
          return encoded.join(',')
        case '+':
          return encoded.join(',')
        case '#':
          return '#' + encoded.join(',')
        case '.':
          return '.' + encoded.join('.')
        case '/':
          return '/' + encoded.join('/')
        default:
          return encoded.join(',')
      }
    }
    expand(variables) {
      let result = ''
      let hasQueryParam = false
      for (const part of this.parts) {
        if (typeof part === 'string') {
          result += part
          continue
        }
        const expanded = this.expandPart(part, variables)
        if (!expanded) continue
        if ((part.operator === '?' || part.operator === '&') && hasQueryParam) {
          result += expanded.replace('?', '&')
        } else {
          result += expanded
        }
        if (part.operator === '?' || part.operator === '&') {
          hasQueryParam = true
        }
      }
      return result
    }
    escapeRegExp(str) {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
    partToRegExp(part) {
      const patterns = []
      for (const name2 of part.names) {
        UriTemplate.validateLength(name2, MAX_VARIABLE_LENGTH, 'Variable name')
      }
      if (part.operator === '?' || part.operator === '&') {
        for (let i = 0; i < part.names.length; i++) {
          const name2 = part.names[i]
          const prefix = i === 0 ? '\\' + part.operator : '&'
          patterns.push({
            pattern: prefix + this.escapeRegExp(name2) + '=([^&]+)',
            name: name2
          })
        }
        return patterns
      }
      let pattern2
      const name = part.name
      switch (part.operator) {
        case '':
          pattern2 = part.exploded ? '([^/]+(?:,[^/]+)*)' : '([^/,]+)'
          break
        case '+':
        case '#':
          pattern2 = '(.+)'
          break
        case '.':
          pattern2 = '\\.([^/,]+)'
          break
        case '/':
          pattern2 = '/' + (part.exploded ? '([^/]+(?:,[^/]+)*)' : '([^/,]+)')
          break
        default:
          pattern2 = '([^/]+)'
      }
      patterns.push({ pattern: pattern2, name })
      return patterns
    }
    match(uri2) {
      UriTemplate.validateLength(uri2, MAX_TEMPLATE_LENGTH, 'URI')
      let pattern2 = '^'
      const names2 = []
      for (const part of this.parts) {
        if (typeof part === 'string') {
          pattern2 += this.escapeRegExp(part)
        } else {
          const patterns = this.partToRegExp(part)
          for (const { pattern: partPattern, name } of patterns) {
            pattern2 += partPattern
            names2.push({ name, exploded: part.exploded })
          }
        }
      }
      pattern2 += '$'
      UriTemplate.validateLength(pattern2, MAX_REGEX_LENGTH, 'Generated regex pattern')
      const regex2 = new RegExp(pattern2)
      const match = uri2.match(regex2)
      if (!match) return null
      const result = {}
      for (let i = 0; i < names2.length; i++) {
        const { name, exploded } = names2[i]
        const value = match[i + 1]
        const cleanName = name.replace('*', '')
        if (exploded && value.includes(',')) {
          result[cleanName] = value.split(',')
        } else {
          result[cleanName] = value
        }
      }
      return result
    }
  }
  class McpServer {
    constructor(serverInfo, options) {
      this._registeredResources = {}
      this._registeredResourceTemplates = {}
      this._registeredTools = {}
      this._registeredPrompts = {}
      this._toolHandlersInitialized = false
      this._completionHandlerInitialized = false
      this._resourceHandlersInitialized = false
      this._promptHandlersInitialized = false
      this.server = new Server(serverInfo, options)
    }
    /**
     * Attaches to the given transport, starts it, and starts listening for messages.
     *
     * The `server` object assumes ownership of the Transport, replacing any callbacks that have already been set, and expects that it is the only user of the Transport instance going forward.
     */
    async connect(transport) {
      return await this.server.connect(transport)
    }
    /**
     * Closes the connection.
     */
    async close() {
      await this.server.close()
    }
    setToolRequestHandlers() {
      if (this._toolHandlersInitialized) {
        return
      }
      this.server.assertCanSetRequestHandler(ListToolsRequestSchema.shape.method.value)
      this.server.assertCanSetRequestHandler(CallToolRequestSchema.shape.method.value)
      this.server.registerCapabilities({
        tools: {
          listChanged: true
        }
      })
      this.server.setRequestHandler(ListToolsRequestSchema, () => ({
        tools: Object.entries(this._registeredTools)
          .filter(([, tool]) => tool.enabled)
          .map(([name, tool]) => {
            const toolDefinition = {
              name,
              title: tool.title,
              description: tool.description,
              inputSchema: tool.inputSchema
                ? zodToJsonSchema(tool.inputSchema, {
                    strictUnions: true
                  })
                : EMPTY_OBJECT_JSON_SCHEMA,
              annotations: tool.annotations
            }
            if (tool.outputSchema) {
              toolDefinition.outputSchema = zodToJsonSchema(tool.outputSchema, { strictUnions: true })
            }
            return toolDefinition
          })
      }))
      this.server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
        const tool = this._registeredTools[request.params.name]
        if (!tool) {
          throw new McpError(ErrorCode.InvalidParams, `Tool ${request.params.name} not found`)
        }
        if (!tool.enabled) {
          throw new McpError(ErrorCode.InvalidParams, `Tool ${request.params.name} disabled`)
        }
        let result
        if (tool.inputSchema) {
          const parseResult = await tool.inputSchema.safeParseAsync(request.params.arguments)
          if (!parseResult.success) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `Invalid arguments for tool ${request.params.name}: ${parseResult.error.message}`
            )
          }
          const args = parseResult.data
          const cb = tool.callback
          try {
            result = await Promise.resolve(cb(args, extra))
          } catch (error2) {
            result = {
              content: [
                {
                  type: 'text',
                  text: error2 instanceof Error ? error2.message : String(error2)
                }
              ],
              isError: true
            }
          }
        } else {
          const cb = tool.callback
          try {
            result = await Promise.resolve(cb(extra))
          } catch (error2) {
            result = {
              content: [
                {
                  type: 'text',
                  text: error2 instanceof Error ? error2.message : String(error2)
                }
              ],
              isError: true
            }
          }
        }
        if (tool.outputSchema && !result.isError) {
          if (!result.structuredContent) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `Tool ${request.params.name} has an output schema but no structured content was provided`
            )
          }
          const parseResult = await tool.outputSchema.safeParseAsync(result.structuredContent)
          if (!parseResult.success) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `Invalid structured content for tool ${request.params.name}: ${parseResult.error.message}`
            )
          }
        }
        return result
      })
      this._toolHandlersInitialized = true
    }
    setCompletionRequestHandler() {
      if (this._completionHandlerInitialized) {
        return
      }
      this.server.assertCanSetRequestHandler(CompleteRequestSchema.shape.method.value)
      this.server.registerCapabilities({
        completions: {}
      })
      this.server.setRequestHandler(CompleteRequestSchema, async (request) => {
        switch (request.params.ref.type) {
          case 'ref/prompt':
            return this.handlePromptCompletion(request, request.params.ref)
          case 'ref/resource':
            return this.handleResourceCompletion(request, request.params.ref)
          default:
            throw new McpError(ErrorCode.InvalidParams, `Invalid completion reference: ${request.params.ref}`)
        }
      })
      this._completionHandlerInitialized = true
    }
    async handlePromptCompletion(request, ref2) {
      const prompt = this._registeredPrompts[ref2.name]
      if (!prompt) {
        throw new McpError(ErrorCode.InvalidParams, `Prompt ${ref2.name} not found`)
      }
      if (!prompt.enabled) {
        throw new McpError(ErrorCode.InvalidParams, `Prompt ${ref2.name} disabled`)
      }
      if (!prompt.argsSchema) {
        return EMPTY_COMPLETION_RESULT
      }
      const field = prompt.argsSchema.shape[request.params.argument.name]
      if (!(field instanceof Completable)) {
        return EMPTY_COMPLETION_RESULT
      }
      const def2 = field._def
      const suggestions = await def2.complete(request.params.argument.value, request.params.context)
      return createCompletionResult(suggestions)
    }
    async handleResourceCompletion(request, ref2) {
      const template = Object.values(this._registeredResourceTemplates).find(
        (t) => t.resourceTemplate.uriTemplate.toString() === ref2.uri
      )
      if (!template) {
        if (this._registeredResources[ref2.uri]) {
          return EMPTY_COMPLETION_RESULT
        }
        throw new McpError(ErrorCode.InvalidParams, `Resource template ${request.params.ref.uri} not found`)
      }
      const completer = template.resourceTemplate.completeCallback(request.params.argument.name)
      if (!completer) {
        return EMPTY_COMPLETION_RESULT
      }
      const suggestions = await completer(request.params.argument.value, request.params.context)
      return createCompletionResult(suggestions)
    }
    setResourceRequestHandlers() {
      if (this._resourceHandlersInitialized) {
        return
      }
      this.server.assertCanSetRequestHandler(ListResourcesRequestSchema.shape.method.value)
      this.server.assertCanSetRequestHandler(ListResourceTemplatesRequestSchema.shape.method.value)
      this.server.assertCanSetRequestHandler(ReadResourceRequestSchema.shape.method.value)
      this.server.registerCapabilities({
        resources: {
          listChanged: true
        }
      })
      this.server.setRequestHandler(ListResourcesRequestSchema, async (request, extra) => {
        const resources = Object.entries(this._registeredResources)
          .filter(([_, resource]) => resource.enabled)
          .map(([uri2, resource]) => ({
            uri: uri2,
            name: resource.name,
            ...resource.metadata
          }))
        const templateResources = []
        for (const template of Object.values(this._registeredResourceTemplates)) {
          if (!template.resourceTemplate.listCallback) {
            continue
          }
          const result = await template.resourceTemplate.listCallback(extra)
          for (const resource of result.resources) {
            templateResources.push({
              ...template.metadata,
              // the defined resource metadata should override the template metadata if present
              ...resource
            })
          }
        }
        return { resources: [...resources, ...templateResources] }
      })
      this.server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
        const resourceTemplates = Object.entries(this._registeredResourceTemplates).map(([name, template]) => ({
          name,
          uriTemplate: template.resourceTemplate.uriTemplate.toString(),
          ...template.metadata
        }))
        return { resourceTemplates }
      })
      this.server.setRequestHandler(ReadResourceRequestSchema, async (request, extra) => {
        const uri2 = new URL(request.params.uri)
        const resource = this._registeredResources[uri2.toString()]
        if (resource) {
          if (!resource.enabled) {
            throw new McpError(ErrorCode.InvalidParams, `Resource ${uri2} disabled`)
          }
          return resource.readCallback(uri2, extra)
        }
        for (const template of Object.values(this._registeredResourceTemplates)) {
          const variables = template.resourceTemplate.uriTemplate.match(uri2.toString())
          if (variables) {
            return template.readCallback(uri2, variables, extra)
          }
        }
        throw new McpError(ErrorCode.InvalidParams, `Resource ${uri2} not found`)
      })
      this.setCompletionRequestHandler()
      this._resourceHandlersInitialized = true
    }
    setPromptRequestHandlers() {
      if (this._promptHandlersInitialized) {
        return
      }
      this.server.assertCanSetRequestHandler(ListPromptsRequestSchema.shape.method.value)
      this.server.assertCanSetRequestHandler(GetPromptRequestSchema.shape.method.value)
      this.server.registerCapabilities({
        prompts: {
          listChanged: true
        }
      })
      this.server.setRequestHandler(ListPromptsRequestSchema, () => ({
        prompts: Object.entries(this._registeredPrompts)
          .filter(([, prompt]) => prompt.enabled)
          .map(([name, prompt]) => {
            return {
              name,
              title: prompt.title,
              description: prompt.description,
              arguments: prompt.argsSchema ? promptArgumentsFromSchema(prompt.argsSchema) : void 0
            }
          })
      }))
      this.server.setRequestHandler(GetPromptRequestSchema, async (request, extra) => {
        const prompt = this._registeredPrompts[request.params.name]
        if (!prompt) {
          throw new McpError(ErrorCode.InvalidParams, `Prompt ${request.params.name} not found`)
        }
        if (!prompt.enabled) {
          throw new McpError(ErrorCode.InvalidParams, `Prompt ${request.params.name} disabled`)
        }
        if (prompt.argsSchema) {
          const parseResult = await prompt.argsSchema.safeParseAsync(request.params.arguments)
          if (!parseResult.success) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `Invalid arguments for prompt ${request.params.name}: ${parseResult.error.message}`
            )
          }
          const args = parseResult.data
          const cb = prompt.callback
          return await Promise.resolve(cb(args, extra))
        } else {
          const cb = prompt.callback
          return await Promise.resolve(cb(extra))
        }
      })
      this.setCompletionRequestHandler()
      this._promptHandlersInitialized = true
    }
    resource(name, uriOrTemplate, ...rest) {
      let metadata2
      if (typeof rest[0] === 'object') {
        metadata2 = rest.shift()
      }
      const readCallback = rest[0]
      if (typeof uriOrTemplate === 'string') {
        if (this._registeredResources[uriOrTemplate]) {
          throw new Error(`Resource ${uriOrTemplate} is already registered`)
        }
        const registeredResource = this._createRegisteredResource(name, void 0, uriOrTemplate, metadata2, readCallback)
        this.setResourceRequestHandlers()
        this.sendResourceListChanged()
        return registeredResource
      } else {
        if (this._registeredResourceTemplates[name]) {
          throw new Error(`Resource template ${name} is already registered`)
        }
        const registeredResourceTemplate = this._createRegisteredResourceTemplate(
          name,
          void 0,
          uriOrTemplate,
          metadata2,
          readCallback
        )
        this.setResourceRequestHandlers()
        this.sendResourceListChanged()
        return registeredResourceTemplate
      }
    }
    registerResource(name, uriOrTemplate, config, readCallback) {
      if (typeof uriOrTemplate === 'string') {
        if (this._registeredResources[uriOrTemplate]) {
          throw new Error(`Resource ${uriOrTemplate} is already registered`)
        }
        const registeredResource = this._createRegisteredResource(
          name,
          config.title,
          uriOrTemplate,
          config,
          readCallback
        )
        this.setResourceRequestHandlers()
        this.sendResourceListChanged()
        return registeredResource
      } else {
        if (this._registeredResourceTemplates[name]) {
          throw new Error(`Resource template ${name} is already registered`)
        }
        const registeredResourceTemplate = this._createRegisteredResourceTemplate(
          name,
          config.title,
          uriOrTemplate,
          config,
          readCallback
        )
        this.setResourceRequestHandlers()
        this.sendResourceListChanged()
        return registeredResourceTemplate
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
          if (typeof updates.uri !== 'undefined' && updates.uri !== uri2) {
            delete this._registeredResources[uri2]
            if (updates.uri) this._registeredResources[updates.uri] = registeredResource
          }
          if (typeof updates.name !== 'undefined') registeredResource.name = updates.name
          if (typeof updates.title !== 'undefined') registeredResource.title = updates.title
          if (typeof updates.metadata !== 'undefined') registeredResource.metadata = updates.metadata
          if (typeof updates.callback !== 'undefined') registeredResource.readCallback = updates.callback
          if (typeof updates.enabled !== 'undefined') registeredResource.enabled = updates.enabled
          this.sendResourceListChanged()
        }
      }
      this._registeredResources[uri2] = registeredResource
      return registeredResource
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
          if (typeof updates.name !== 'undefined' && updates.name !== name) {
            delete this._registeredResourceTemplates[name]
            if (updates.name) this._registeredResourceTemplates[updates.name] = registeredResourceTemplate
          }
          if (typeof updates.title !== 'undefined') registeredResourceTemplate.title = updates.title
          if (typeof updates.template !== 'undefined') registeredResourceTemplate.resourceTemplate = updates.template
          if (typeof updates.metadata !== 'undefined') registeredResourceTemplate.metadata = updates.metadata
          if (typeof updates.callback !== 'undefined') registeredResourceTemplate.readCallback = updates.callback
          if (typeof updates.enabled !== 'undefined') registeredResourceTemplate.enabled = updates.enabled
          this.sendResourceListChanged()
        }
      }
      this._registeredResourceTemplates[name] = registeredResourceTemplate
      return registeredResourceTemplate
    }
    _createRegisteredPrompt(name, title2, description2, argsSchema, callback) {
      const registeredPrompt = {
        title: title2,
        description: description2,
        argsSchema: argsSchema === void 0 ? void 0 : objectType(argsSchema),
        callback,
        enabled: true,
        disable: () => registeredPrompt.update({ enabled: false }),
        enable: () => registeredPrompt.update({ enabled: true }),
        remove: () => registeredPrompt.update({ name: null }),
        update: (updates) => {
          if (typeof updates.name !== 'undefined' && updates.name !== name) {
            delete this._registeredPrompts[name]
            if (updates.name) this._registeredPrompts[updates.name] = registeredPrompt
          }
          if (typeof updates.title !== 'undefined') registeredPrompt.title = updates.title
          if (typeof updates.description !== 'undefined') registeredPrompt.description = updates.description
          if (typeof updates.argsSchema !== 'undefined') registeredPrompt.argsSchema = objectType(updates.argsSchema)
          if (typeof updates.callback !== 'undefined') registeredPrompt.callback = updates.callback
          if (typeof updates.enabled !== 'undefined') registeredPrompt.enabled = updates.enabled
          this.sendPromptListChanged()
        }
      }
      this._registeredPrompts[name] = registeredPrompt
      return registeredPrompt
    }
    _createRegisteredTool(name, title2, description2, inputSchema, outputSchema, annotations, callback) {
      const registeredTool = {
        title: title2,
        description: description2,
        inputSchema: inputSchema === void 0 ? void 0 : objectType(inputSchema),
        outputSchema: outputSchema === void 0 ? void 0 : objectType(outputSchema),
        annotations,
        callback,
        enabled: true,
        disable: () => registeredTool.update({ enabled: false }),
        enable: () => registeredTool.update({ enabled: true }),
        remove: () => registeredTool.update({ name: null }),
        update: (updates) => {
          if (typeof updates.name !== 'undefined' && updates.name !== name) {
            delete this._registeredTools[name]
            if (updates.name) this._registeredTools[updates.name] = registeredTool
          }
          if (typeof updates.title !== 'undefined') registeredTool.title = updates.title
          if (typeof updates.description !== 'undefined') registeredTool.description = updates.description
          if (typeof updates.paramsSchema !== 'undefined') registeredTool.inputSchema = objectType(updates.paramsSchema)
          if (typeof updates.callback !== 'undefined') registeredTool.callback = updates.callback
          if (typeof updates.annotations !== 'undefined') registeredTool.annotations = updates.annotations
          if (typeof updates.enabled !== 'undefined') registeredTool.enabled = updates.enabled
          this.sendToolListChanged()
        }
      }
      this._registeredTools[name] = registeredTool
      this.setToolRequestHandlers()
      this.sendToolListChanged()
      return registeredTool
    }
    /**
     * tool() implementation. Parses arguments passed to overrides defined above.
     */
    tool(name, ...rest) {
      if (this._registeredTools[name]) {
        throw new Error(`Tool ${name} is already registered`)
      }
      let description2
      let inputSchema
      let outputSchema
      let annotations
      if (typeof rest[0] === 'string') {
        description2 = rest.shift()
      }
      if (rest.length > 1) {
        const firstArg = rest[0]
        if (isZodRawShape(firstArg)) {
          inputSchema = rest.shift()
          if (rest.length > 1 && typeof rest[0] === 'object' && rest[0] !== null && !isZodRawShape(rest[0])) {
            annotations = rest.shift()
          }
        } else if (typeof firstArg === 'object' && firstArg !== null) {
          annotations = rest.shift()
        }
      }
      const callback = rest[0]
      return this._createRegisteredTool(name, void 0, description2, inputSchema, outputSchema, annotations, callback)
    }
    /**
     * Registers a tool with a config object and callback.
     */
    registerTool(name, config, cb) {
      if (this._registeredTools[name]) {
        throw new Error(`Tool ${name} is already registered`)
      }
      const { title: title2, description: description2, inputSchema, outputSchema, annotations } = config
      return this._createRegisteredTool(name, title2, description2, inputSchema, outputSchema, annotations, cb)
    }
    prompt(name, ...rest) {
      if (this._registeredPrompts[name]) {
        throw new Error(`Prompt ${name} is already registered`)
      }
      let description2
      if (typeof rest[0] === 'string') {
        description2 = rest.shift()
      }
      let argsSchema
      if (rest.length > 1) {
        argsSchema = rest.shift()
      }
      const cb = rest[0]
      const registeredPrompt = this._createRegisteredPrompt(name, void 0, description2, argsSchema, cb)
      this.setPromptRequestHandlers()
      this.sendPromptListChanged()
      return registeredPrompt
    }
    /**
     * Registers a prompt with a config object and callback.
     */
    registerPrompt(name, config, cb) {
      if (this._registeredPrompts[name]) {
        throw new Error(`Prompt ${name} is already registered`)
      }
      const { title: title2, description: description2, argsSchema } = config
      const registeredPrompt = this._createRegisteredPrompt(name, title2, description2, argsSchema, cb)
      this.setPromptRequestHandlers()
      this.sendPromptListChanged()
      return registeredPrompt
    }
    /**
     * Checks if the server is connected to a transport.
     * @returns True if the server is connected
     */
    isConnected() {
      return this.server.transport !== void 0
    }
    /**
     * Sends a resource list changed event to the client, if connected.
     */
    sendResourceListChanged() {
      if (this.isConnected()) {
        this.server.sendResourceListChanged()
      }
    }
    /**
     * Sends a tool list changed event to the client, if connected.
     */
    sendToolListChanged() {
      if (this.isConnected()) {
        this.server.sendToolListChanged()
      }
    }
    /**
     * Sends a prompt list changed event to the client, if connected.
     */
    sendPromptListChanged() {
      if (this.isConnected()) {
        this.server.sendPromptListChanged()
      }
    }
  }
  class ResourceTemplate {
    constructor(uriTemplate, _callbacks) {
      this._callbacks = _callbacks
      this._uriTemplate = typeof uriTemplate === 'string' ? new UriTemplate(uriTemplate) : uriTemplate
    }
    /**
     * Gets the URI template pattern.
     */
    get uriTemplate() {
      return this._uriTemplate
    }
    /**
     * Gets the list callback, if one was provided.
     */
    get listCallback() {
      return this._callbacks.list
    }
    /**
     * Gets the callback for completing a specific URI template variable, if one was provided.
     */
    completeCallback(variable) {
      var _a
      return (_a = this._callbacks.complete) === null || _a === void 0 ? void 0 : _a[variable]
    }
  }
  const EMPTY_OBJECT_JSON_SCHEMA = {
    type: 'object',
    properties: {}
  }
  function isZodRawShape(obj) {
    if (typeof obj !== 'object' || obj === null) return false
    const isEmptyObject = Object.keys(obj).length === 0
    return isEmptyObject || Object.values(obj).some(isZodTypeLike)
  }
  function isZodTypeLike(value) {
    return (
      value !== null &&
      typeof value === 'object' &&
      'parse' in value &&
      typeof value.parse === 'function' &&
      'safeParse' in value &&
      typeof value.safeParse === 'function'
    )
  }
  function promptArgumentsFromSchema(schema) {
    return Object.entries(schema.shape).map(([name, field]) => ({
      name,
      description: field.description,
      required: !field.isOptional()
    }))
  }
  function createCompletionResult(suggestions) {
    return {
      completion: {
        values: suggestions.slice(0, 100),
        total: suggestions.length,
        hasMore: suggestions.length > 100
      }
    }
  }
  const EMPTY_COMPLETION_RESULT = {
    completion: {
      values: [],
      hasMore: false
    }
  }
  class WebMcpServer {
    constructor(serverInfo, options) {
      const info = {
        name: 'web-mcp-server',
        version: '1.0.0'
      }
      const capabilities = {
        prompts: { listChanged: true },
        resources: { subscribe: true, listChanged: true },
        tools: { listChanged: true },
        completions: {},
        logging: {}
      }
      this.server = new McpServer(serverInfo || info, options || { capabilities })
      this.server.server.oninitialized = () => {
        var _a
        ;(_a = this.oninitialized) == null ? void 0 : _a.call(this)
      }
      this.server.server.onclose = () => {
        var _a
        ;(_a = this.onclose) == null ? void 0 : _a.call(this)
      }
      this.server.server.onerror = (error2) => {
        var _a
        ;(_a = this.onerror) == null ? void 0 : _a.call(this, error2)
      }
      this.server.server.setRequestHandler(SetLevelRequestSchema, async () => {
        return {}
      })
    }
    /**
     * Connects the server to a transport via the specified option.
     */
    async connect(options) {
      if (typeof options['start'] === 'function') {
        this.transport = options
        this.transport.onclose = void 0
        this.transport.onerror = void 0
        this.transport.onmessage = void 0
      } else {
        this.transport = new MessageChannelServerTransport(options)
        await this.transport.listen()
      }
      await this.server.connect(this.transport)
      return this.transport
    }
    /**
     * Closes the connection.
     */
    async close() {
      await this.server.close()
    }
    /**
     * Registers a tool with a config object and callback.
     */
    registerTool(name, config, cb) {
      return this.server.registerTool(name, config, cb)
    }
    /**
     * Registers a prompt with a config object and callback.
     */
    registerPrompt(name, config, cb) {
      return this.server.registerPrompt(name, config, cb)
    }
    registerResource(name, uriOrTemplate, config, readCallback) {
      if (typeof uriOrTemplate === 'string') {
        return this.server.registerResource(name, uriOrTemplate, config, readCallback)
      } else {
        return this.server.registerResource(name, uriOrTemplate, config, readCallback)
      }
    }
    /**
     * Checks if the server is connected to a transport.
     * @returns True if the server is connected
     */
    isConnected() {
      return this.server.isConnected()
    }
    /**
     * Sends a resource list changed event to the client, if connected.
     */
    sendResourceListChanged() {
      this.server.sendResourceListChanged()
    }
    /**
     * Sends a tool list changed event to the client, if connected.
     */
    sendToolListChanged() {
      this.server.sendToolListChanged()
    }
    /**
     * Sends a prompt list changed event to the client, if connected.
     */
    sendPromptListChanged() {
      this.server.sendPromptListChanged()
    }
    /**
     * After initialization has completed, this will be populated with the client's reported capabilities.
     */
    getClientCapabilities() {
      return this.server.server.getClientCapabilities()
    }
    /**
     * After initialization has completed, this will be populated with information about the client's name and version.
     */
    getClientVersion() {
      return this.server.server.getClientVersion()
    }
    /**
     * Sends a ping to the client to check if it is still connected.
     */
    async ping() {
      return await this.server.server.ping()
    }
    /**
     * Creates a LLM message to be sent to the client.
     */
    async createMessage(params, options) {
      return await this.server.server.createMessage(params, options)
    }
    /**
     * Elicits input from the client, such as a prompt or resource.
     */
    async elicitInput(params, options) {
      return await this.server.server.elicitInput(params, options)
    }
    /**
     * Lists the root resources available to the client.
     */
    async listRoots(params, options) {
      return await this.server.server.listRoots(params, options)
    }
    /**
     * Sends a logging message to the client.
     */
    async sendLoggingMessage(params) {
      return await this.server.server.sendLoggingMessage(params)
    }
    /**
     * Sends a resource updated notification to the client.
     */
    async sendResourceUpdated(params) {
      return await this.server.server.sendResourceUpdated(params)
    }
    /**
     * Sends a request and wait for a response.
     *
     * Do not use this method to emit notifications! Use notification() instead.
     */
    request(request, resultSchema, options) {
      return this.server.server.request(request, resultSchema, options)
    }
    /**
     * Emits a notification, which is a one-way message that does not expect a response.
     */
    async notification(notification, options) {
      return await this.server.server.notification(notification, options)
    }
    /**
     * Registers a handler to invoke when this protocol object receives a request with the given method.
     *
     * Note that this will replace any previous request handler for the same method.
     */
    setRequestHandler(requestSchema, handler) {
      this.server.server.setRequestHandler(requestSchema, handler)
    }
    /**
     * Removes the request handler for the given method.
     */
    removeRequestHandler(method) {
      this.server.server.removeRequestHandler(method)
    }
    /**
     * Registers a handler to invoke when this protocol object receives a notification with the given method.
     *
     * Note that this will replace any previous notification handler for the same method.
     */
    setNotificationHandler(notificationSchema, handler) {
      this.server.server.setNotificationHandler(notificationSchema, handler)
    }
    /**
     * Removes the notification handler for the given method.
     */
    removeNotificationHandler(method) {
      this.server.server.removeNotificationHandler(method)
    }
    /**
     * Registers a handler for the subscribe request.
     */
    onSubscribe(handler) {
      this.server.server.setRequestHandler(SubscribeRequestSchema, handler)
    }
    /**
     * Registers a handler for the unsubscribe request.
     */
    onUnsubscribe(handler) {
      this.server.server.setRequestHandler(UnsubscribeRequestSchema, handler)
    }
    /**
     * Registers a handler for the set log level request.
     */
    onSetLogLevel(handler) {
      this.server.server.setRequestHandler(SetLevelRequestSchema, handler)
    }
    /**
     * Registers a handler for the list tools request.
     */
    onListResources(handler) {
      this.server.server.setRequestHandler(ListResourcesRequestSchema, handler)
    }
    /**
     * Registers a handler for the roots list changed notification.
     */
    onRootsListChanged(handler) {
      this.server.server.setNotificationHandler(RootsListChangedNotificationSchema, handler)
    }
    /**
     * Close the transport for window.addEventListener('pagehide')
     */
    async onPagehide(event) {
      if (event.persisted) {
        return
      }
      if (this.transport && typeof this.transport['close'] === 'function') {
        await this.transport.close()
      }
    }
  }
  const createMessageChannelServerTransport = (endpoint, globalObject) =>
    new MessageChannelServerTransport(endpoint, globalObject)
  const createMessageChannelPairTransport = () => createTransportPair()
  const isMessageChannelServerTransport = (transport) => transport instanceof MessageChannelServerTransport
  const isMcpServer = (server) => server instanceof McpServer
  class WebMcpClient {
    constructor(clientInfo, options) {
      const info = {
        name: 'web-mcp-client',
        version: '1.0.0'
      }
      const capabilities = {
        roots: { listChanged: true },
        sampling: {},
        elicitation: {}
      }
      this.client = new Client(clientInfo || info, options || { capabilities })
      this.client.onclose = () => {
        var _a
        ;(_a = this.onclose) == null ? void 0 : _a.call(this)
      }
      this.client.onerror = (error2) => {
        var _a
        ;(_a = this.onerror) == null ? void 0 : _a.call(this, error2)
      }
    }
    /**
     * Connects the client to a transport via the specified option.
     */
    async connect(options) {
      if (typeof options['start'] === 'function') {
        this.transport = options
        this.transport.onclose = void 0
        this.transport.onerror = void 0
        this.transport.onmessage = void 0
        await this.client.connect(this.transport)
        return { transport: this.transport, sessionId: this.transport.sessionId }
      }
      const { url, token, sessionId, type: type2, agent, onError } = options
      if (agent === true) {
        const proxyOptions = { client: this.client, url, token, sessionId }
        let response
        const connectProxy = async () => {
          const { transport: transport2, sessionId: sessionId2 } =
            type2 === 'sse'
              ? await createSseProxy(proxyOptions)
              : type2 === 'socket'
                ? await createSocketProxy(proxyOptions)
                : await createStreamProxy(proxyOptions)
          transport2.onerror = async (error2) => {
            onError == null ? void 0 : onError(error2)
          }
          response = { transport: transport2, sessionId: sessionId2 }
        }
        await connectProxy()
        return response
      }
      const endpoint = new URL(url)
      let transport
      if (type2 === 'channel') {
        transport = new MessageChannelClientTransport(url)
        await this.client.connect(transport)
      }
      if (type2 === 'sse') {
        const opts = sseOptions(token, sessionId)
        transport = new SSEClientTransport(endpoint, opts)
        await this.client.connect(transport)
      }
      if (type2 === 'socket') {
        transport = new WebSocketClientTransport(new URL(`${url}?sessionId=${sessionId}&token=${token}`))
        transport.sessionId = sessionId
        await this.client.connect(transport)
      }
      if (typeof transport === 'undefined') {
        const opts = streamOptions(token, sessionId)
        transport = new StreamableHTTPClientTransport(endpoint, opts)
        await this.client.connect(transport)
      }
      this.transport = transport
      return { transport: this.transport, sessionId: this.transport.sessionId }
    }
    /**
     * Closes the connection.
     */
    async close() {
      await this.client.close()
    }
    /**
     * After initialization has completed, this will be populated with the server's reported capabilities.
     */
    getServerCapabilities() {
      return this.client.getServerCapabilities()
    }
    /**
     * After initialization has completed, this will be populated with information about the server's name and version.
     */
    getServerVersion() {
      return this.client.getServerVersion()
    }
    /**
     * After initialization has completed, this may be populated with information about the server's instructions.
     */
    getInstructions() {
      return this.client.getInstructions()
    }
    /**
     * Sends a ping to the server to check if it is still connected.
     */
    async ping(options) {
      return await this.client.ping(options)
    }
    /**
     * Sends a completion request to the server.
     */
    async complete(params, options) {
      return await this.client.complete(params, options)
    }
    /**
     * Sends a request for setting the logging level to the server.
     */
    async setLoggingLevel(level, options) {
      return await this.client.setLoggingLevel(level, options)
    }
    /**
     * Gets the prompt with the given params from the server.
     */
    async getPrompt(params, options) {
      return await this.client.getPrompt(params, options)
    }
    /**
     * Lists all prompts available on the server.
     */
    async listPrompts(params, options) {
      return await this.client.listPrompts(params, options)
    }
    /**
     * Lists all resources available on the server.
     */
    async listResources(params, options) {
      return await this.client.listResources(params, options)
    }
    /**
     * Lists all resource templates available on the server.
     */
    async listResourceTemplates(params, options) {
      return await this.client.listResourceTemplates(params, options)
    }
    /**
     * Reads the resource with the given params from the server.
     */
    async readResource(params, options) {
      return await this.client.readResource(params, options)
    }
    /**
     * Subscribes to a resource on the server.
     */
    async subscribeResource(params, options) {
      return await this.client.subscribeResource(params, options)
    }
    /**
     * Unsubscribes from a resource on the server.
     */
    async unsubscribeResource(params, options) {
      return await this.client.unsubscribeResource(params, options)
    }
    /**
     * Calls a tool on the server with the given parameters.
     */
    async callTool(params, options) {
      return await this.client.callTool(params, CallToolResultSchema, options)
    }
    /**
     * Lists all tools available on the server.
     */
    async listTools(params, options) {
      return await this.client.listTools(params, options)
    }
    /**
     * Sends a notification for the roots list changed event to the server.
     */
    async sendRootsListChanged() {
      return await this.client.sendRootsListChanged()
    }
    /**
     * Sends a request and wait for a response.
     *
     * Do not use this method to emit notifications! Use notification() instead.
     */
    request(request, resultSchema, options) {
      return this.client.request(request, resultSchema, options)
    }
    /**
     * Emits a notification, which is a one-way message that does not expect a response.
     */
    async notification(notification, options) {
      return await this.client.notification(notification, options)
    }
    /**
     * Registers a handler to invoke when this protocol object receives a request with the given method.
     *
     * Note that this will replace any previous request handler for the same method.
     */
    setRequestHandler(requestSchema, handler) {
      this.client.setRequestHandler(requestSchema, handler)
    }
    /**
     * Removes the request handler for the given method.
     */
    removeRequestHandler(method) {
      this.client.removeRequestHandler(method)
    }
    /**
     * Registers a handler to invoke when this protocol object receives a notification with the given method.
     *
     * Note that this will replace any previous notification handler for the same method.
     */
    setNotificationHandler(notificationSchema, handler) {
      this.client.setNotificationHandler(notificationSchema, handler)
    }
    /**
     * Removes the notification handler for the given method.
     */
    removeNotificationHandler(method) {
      this.client.removeNotificationHandler(method)
    }
    /**
     * Registers a handler for the elicitation request.
     */
    onElicit(handler) {
      this.client.setRequestHandler(ElicitRequestSchema, handler)
    }
    /**
     * Registers a handler for the create LLM message request.
     */
    onCreateMessage(handler) {
      this.client.setRequestHandler(CreateMessageRequestSchema, handler)
    }
    /**
     * Registers a handler for the list roots request.
     */
    onListRoots(handler) {
      this.client.setRequestHandler(ListRootsRequestSchema, handler)
    }
    /**
     * Registers a handler for the tool list changed notification.
     */
    onToolListChanged(handler) {
      this.client.setNotificationHandler(ToolListChangedNotificationSchema, handler)
    }
    /**
     * Registers a handler for the prompt list changed notification.
     */
    onPromptListChanged(handler) {
      this.client.setNotificationHandler(PromptListChangedNotificationSchema, handler)
    }
    /**
     * Registers a handler for the resource list changed notification.
     */
    onResourceListChanged(handler) {
      this.client.setNotificationHandler(ResourceListChangedNotificationSchema, handler)
    }
    /**
     * Registers a handler for the resource updated notification.
     */
    onResourceUpdated(handler) {
      this.client.setNotificationHandler(ResourceUpdatedNotificationSchema, handler)
    }
    /**
     * Registers a handler for the logging message notification.
     */
    onLoggingMessage(handler) {
      this.client.setNotificationHandler(LoggingMessageNotificationSchema, handler)
    }
    /**
     * Close the transport for window.addEventListener('pagehide')
     */
    async onPagehide(event) {
      if (event.persisted) {
        return
      }
      if (isStreamableHTTPClientTransport(this.transport)) {
        await this.transport.terminateSession()
      } else if (this.transport && typeof this.transport['close'] === 'function') {
        await this.transport.close()
      }
    }
  }
  const createSSEClientTransport = (url, opts) => new SSEClientTransport(url, opts)
  const createStreamableHTTPClientTransport = (url, opts) => new StreamableHTTPClientTransport(url, opts)
  const createMessageChannelClientTransport = (endpoint, globalObject) =>
    new MessageChannelClientTransport(endpoint, globalObject)
  const isSSEClientTransport = (transport) => transport instanceof SSEClientTransport
  const isStreamableHTTPClientTransport = (transport) => transport instanceof StreamableHTTPClientTransport
  const isMessageChannelClientTransport = (transport) => transport instanceof MessageChannelClientTransport
  const isMcpClient = (client) => client instanceof Client
  function getDisplayName(metadata2) {
    var _a
    if (metadata2.title !== void 0 && metadata2.title !== '') {
      return metadata2.title
    }
    if ('annotations' in metadata2) {
      const metadataWithAnnotations = metadata2
      if ((_a = metadataWithAnnotations.annotations) === null || _a === void 0 ? void 0 : _a.title) {
        return metadataWithAnnotations.annotations.title
      }
    }
    return metadata2.name
  }
  var promise
  var getMessagePort = (thisContext, namespace, onMessage2) =>
    promise != null
      ? promise
      : (promise = new Promise((resolve2) => {
          const acceptMessagingPort = (event) => {
            const {
              data: { cmd, scope: scope2, context },
              ports
            } = event
            if (cmd === 'webext-port-offer' && scope2 === namespace && context !== thisContext) {
              window.removeEventListener('message', acceptMessagingPort)
              ports[0].onmessage = onMessage2
              ports[0].postMessage('port-accepted')
              return resolve2(ports[0])
            }
          }
          const offerMessagingPort = () => {
            const channel = new MessageChannel()
            channel.port1.onmessage = (event) => {
              if (event.data === 'port-accepted') {
                window.removeEventListener('message', acceptMessagingPort)
                return resolve2(channel.port1)
              }
              onMessage2 == null ? void 0 : onMessage2(event)
            }
            window.postMessage(
              {
                cmd: 'webext-port-offer',
                scope: namespace,
                context: thisContext
              },
              '*',
              [channel.port2]
            )
          }
          window.addEventListener('message', acceptMessagingPort)
          setTimeout(offerMessagingPort, 0)
        }))
  var usePostMessaging = (thisContext) => {
    let allocatedNamespace
    let messagingEnabled = false
    let onMessageCallback
    let portP
    return {
      enable: () => (messagingEnabled = true),
      onMessage: (cb) => (onMessageCallback = cb),
      postMessage: async (msg) => {
        if (!messagingEnabled) throw new Error('Communication with window has not been allowed')
        ensureNamespaceSet(allocatedNamespace)
        return (await portP).postMessage(msg)
      },
      setNamespace: (nsps) => {
        if (allocatedNamespace) throw new Error('Namespace once set cannot be changed')
        allocatedNamespace = nsps
        portP = getMessagePort(thisContext, nsps, ({ data: data2 }) =>
          onMessageCallback == null ? void 0 : onMessageCallback(data2)
        )
      }
    }
  }
  function ensureNamespaceSet(namespace) {
    if (typeof namespace !== 'string' || namespace.trim().length === 0) {
      throw new Error(
        `webext-bridge uses window.postMessage to talk with other "window"(s) for message routingwhich is global/conflicting operation in case there are other scripts using webext-bridge. Call Bridge#setNamespace(nsps) to isolate your app. Example: setNamespace('com.facebook.react-devtools'). Make sure to use same namespace across all your scripts whereever window.postMessage is likely to be used\``
      )
    }
  }
  var __defProp = Object.defineProperty
  var __defProps = Object.defineProperties
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors
  var __getOwnPropSymbols = Object.getOwnPropertySymbols
  var __hasOwnProp = Object.prototype.hasOwnProperty
  var __propIsEnum = Object.prototype.propertyIsEnumerable
  var __defNormalProp = (obj, key, value) =>
    key in obj
      ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
      : (obj[key] = value)
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {})) if (__hasOwnProp.call(b, prop)) __defNormalProp(a, prop, b[prop])
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop)) __defNormalProp(a, prop, b[prop])
      }
    return a
  }
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b))
  var ENDPOINT_RE = /^((?:background$)|devtools|popup|options|content-script|window)(?:@(\d+)(?:\.(\d+))?)?$/
  var parseEndpoint = (endpoint) => {
    const [, context, tabId, frameId] = endpoint.match(ENDPOINT_RE) || []
    return {
      context,
      tabId: +tabId,
      frameId: frameId ? +frameId : void 0
    }
  }
  var tinyUid = { exports: {} }
  const generator = (base) =>
    typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function'
      ? () => {
          const num = crypto.getRandomValues(new Uint8Array(1))[0]
          return (num >= base ? num % base : num).toString(base)
        }
      : () => Math.floor(Math.random() * base).toString(base)
  const uid = (length = 7, hex = false) => Array.from({ length }, generator(hex ? 16 : 36)).join('')
  tinyUid.exports = uid
  tinyUid.exports.default = uid
  var tinyUidExports = tinyUid.exports
  const uuid2 = /* @__PURE__ */ getDefaultExportFromCjs(tinyUidExports)
  const commonProperties = [
    {
      property: 'name',
      enumerable: false
    },
    {
      property: 'message',
      enumerable: false
    },
    {
      property: 'stack',
      enumerable: false
    },
    {
      property: 'code',
      enumerable: true
    }
  ]
  const toJsonWasCalled = Symbol('.toJSON was called')
  const toJSON = (from) => {
    from[toJsonWasCalled] = true
    const json = from.toJSON()
    delete from[toJsonWasCalled]
    return json
  }
  const destroyCircular = ({ from, seen, to_, forceEnumerable, maxDepth, depth }) => {
    const to = to_ || (Array.isArray(from) ? [] : {})
    seen.push(from)
    if (depth >= maxDepth) {
      return to
    }
    if (typeof from.toJSON === 'function' && from[toJsonWasCalled] !== true) {
      return toJSON(from)
    }
    for (const [key, value] of Object.entries(from)) {
      if (typeof Buffer === 'function' && Buffer.isBuffer(value)) {
        to[key] = '[object Buffer]'
        continue
      }
      if (value !== null && typeof value === 'object' && typeof value.pipe === 'function') {
        to[key] = '[object Stream]'
        continue
      }
      if (typeof value === 'function') {
        continue
      }
      if (!value || typeof value !== 'object') {
        to[key] = value
        continue
      }
      if (!seen.includes(from[key])) {
        depth++
        to[key] = destroyCircular({
          from: from[key],
          seen: [...seen],
          forceEnumerable,
          maxDepth,
          depth
        })
        continue
      }
      to[key] = '[Circular]'
    }
    for (const { property, enumerable } of commonProperties) {
      if (typeof from[property] === 'string') {
        Object.defineProperty(to, property, {
          value: from[property],
          enumerable: true,
          configurable: true,
          writable: true
        })
      }
    }
    return to
  }
  function serializeError(value, options = {}) {
    const { maxDepth = Number.POSITIVE_INFINITY } = options
    if (typeof value === 'object' && value !== null) {
      return destroyCircular({
        from: value,
        seen: [],
        forceEnumerable: true,
        maxDepth,
        depth: 0
      })
    }
    if (typeof value === 'function') {
      return `[Function: ${value.name || 'anonymous'}]`
    }
    return value
  }
  let createNanoEvents = () => ({
    events: {},
    emit(event, ...args) {
      ;(this.events[event] || []).forEach((i) => i(...args))
    },
    on(event, cb) {
      ;(this.events[event] = this.events[event] || []).push(cb)
      return () => (this.events[event] = (this.events[event] || []).filter((i) => i !== cb))
    }
  })
  var createEndpointRuntime = (thisContext, routeMessage, localMessage) => {
    const runtimeId = uuid2()
    const openTransactions = /* @__PURE__ */ new Map()
    const onMessageListeners = /* @__PURE__ */ new Map()
    const handleMessage = (message) => {
      if (message.destination.context === thisContext && !message.destination.frameId && !message.destination.tabId) {
        const { transactionId, messageID, messageType } = message
        const handleReply = () => {
          const transactionP = openTransactions.get(transactionId)
          if (transactionP) {
            const { err, data: data2 } = message
            if (err) {
              const dehydratedErr = err
              const errCtr = self[dehydratedErr.name]
              const hydratedErr = new (typeof errCtr === 'function' ? errCtr : Error)(dehydratedErr.message)
              for (const prop in dehydratedErr) hydratedErr[prop] = dehydratedErr[prop]
              transactionP.reject(hydratedErr)
            } else {
              transactionP.resolve(data2)
            }
            openTransactions.delete(transactionId)
          }
        }
        const handleNewMessage = async () => {
          let reply
          let err
          let noHandlerFoundError = false
          try {
            const cb = onMessageListeners.get(messageID)
            if (typeof cb === 'function') {
              reply = await cb({
                sender: message.origin,
                id: messageID,
                data: message.data,
                timestamp: message.timestamp
              })
            } else {
              noHandlerFoundError = true
              throw new Error(
                `[webext-bridge] No handler registered in '${thisContext}' to accept messages with id '${messageID}'`
              )
            }
          } catch (error2) {
            err = error2
          } finally {
            if (err) message.err = serializeError(err)
            handleMessage(
              __spreadProps(__spreadValues({}, message), {
                messageType: 'reply',
                data: reply,
                origin: { context: thisContext, tabId: null },
                destination: message.origin,
                hops: []
              })
            )
            if (err && !noHandlerFoundError) throw reply
          }
        }
        switch (messageType) {
          case 'reply':
            return handleReply()
          case 'message':
            return handleNewMessage()
        }
      }
      message.hops.push(`${thisContext}::${runtimeId}`)
      return routeMessage(message)
    }
    return {
      handleMessage,
      endTransaction: (transactionID) => {
        const transactionP = openTransactions.get(transactionID)
        transactionP == null ? void 0 : transactionP.reject('Transaction was ended before it could complete')
        openTransactions.delete(transactionID)
      },
      sendMessage: (messageID, data2, destination = 'background') => {
        const endpoint = typeof destination === 'string' ? parseEndpoint(destination) : destination
        const errFn = 'Bridge#sendMessage ->'
        if (!endpoint.context) {
          throw new TypeError(`${errFn} Destination must be any one of known destinations`)
        }
        return new Promise((resolve2, reject) => {
          const payload = {
            messageID,
            data: data2,
            destination: endpoint,
            messageType: 'message',
            transactionId: uuid2(),
            origin: { context: thisContext, tabId: null },
            hops: [],
            timestamp: Date.now()
          }
          openTransactions.set(payload.transactionId, { resolve: resolve2, reject })
          try {
            handleMessage(payload)
          } catch (error2) {
            openTransactions.delete(payload.transactionId)
            reject(error2)
          }
        })
      },
      onMessage: (messageID, callback) => {
        onMessageListeners.set(messageID, callback)
        return () => onMessageListeners.delete(messageID)
      }
    }
  }
  var _Stream = class {
    constructor(endpointRuntime2, streamInfo) {
      this.endpointRuntime = endpointRuntime2
      this.streamInfo = streamInfo
      this.emitter = createNanoEvents()
      this.isClosed = false
      this.handleStreamClose = () => {
        if (!this.isClosed) {
          this.isClosed = true
          this.emitter.emit('closed', true)
          this.emitter.events = {}
        }
      }
      if (!_Stream.initDone) {
        endpointRuntime2.onMessage('__crx_bridge_stream_transfer__', (msg) => {
          const { streamId, streamTransfer, action } = msg.data
          const stream = _Stream.openStreams.get(streamId)
          if (stream && !stream.isClosed) {
            if (action === 'transfer') stream.emitter.emit('message', streamTransfer)
            if (action === 'close') {
              _Stream.openStreams.delete(streamId)
              stream.handleStreamClose()
            }
          }
        })
        _Stream.initDone = true
      }
      _Stream.openStreams.set(this.streamInfo.streamId, this)
    }
    get info() {
      return this.streamInfo
    }
    send(msg) {
      if (this.isClosed)
        throw new Error(
          'Attempting to send a message over closed stream. Use stream.onClose(<callback>) to keep an eye on stream status'
        )
      this.endpointRuntime.sendMessage(
        '__crx_bridge_stream_transfer__',
        {
          streamId: this.streamInfo.streamId,
          streamTransfer: msg,
          action: 'transfer'
        },
        this.streamInfo.endpoint
      )
    }
    close(msg) {
      if (msg) this.send(msg)
      this.handleStreamClose()
      this.endpointRuntime.sendMessage(
        '__crx_bridge_stream_transfer__',
        {
          streamId: this.streamInfo.streamId,
          streamTransfer: null,
          action: 'close'
        },
        this.streamInfo.endpoint
      )
    }
    onMessage(callback) {
      return this.getDisposable('message', callback)
    }
    onClose(callback) {
      return this.getDisposable('closed', callback)
    }
    getDisposable(event, callback) {
      const off = this.emitter.on(event, callback)
      return Object.assign(off, {
        dispose: off,
        close: off
      })
    }
  }
  var Stream = _Stream
  Stream.initDone = false
  Stream.openStreams = /* @__PURE__ */ new Map()
  var createStreamWirings = (endpointRuntime2) => {
    const openStreams = /* @__PURE__ */ new Map()
    const onOpenStreamCallbacks = /* @__PURE__ */ new Map()
    const streamyEmitter = createNanoEvents()
    endpointRuntime2.onMessage('__crx_bridge_stream_open__', (message) => {
      return new Promise((resolve2) => {
        const { sender, data: data2 } = message
        const { channel } = data2
        let watching = false
        let off = () => {}
        const readyup = () => {
          const callback = onOpenStreamCallbacks.get(channel)
          if (typeof callback === 'function') {
            callback(new Stream(endpointRuntime2, __spreadProps(__spreadValues({}, data2), { endpoint: sender })))
            if (watching) off()
            resolve2(true)
          } else if (!watching) {
            watching = true
            off = streamyEmitter.on('did-change-stream-callbacks', readyup)
          }
        }
        readyup()
      })
    })
    async function openStream(channel, destination) {
      if (openStreams.has(channel)) throw new Error('webext-bridge: A Stream is already open at this channel')
      const endpoint = typeof destination === 'string' ? parseEndpoint(destination) : destination
      const streamInfo = { streamId: uuid2(), channel, endpoint }
      const stream = new Stream(endpointRuntime2, streamInfo)
      stream.onClose(() => openStreams.delete(channel))
      await endpointRuntime2.sendMessage('__crx_bridge_stream_open__', streamInfo, endpoint)
      openStreams.set(channel, stream)
      return stream
    }
    function onOpenStreamChannel(channel, callback) {
      if (onOpenStreamCallbacks.has(channel))
        throw new Error(
          'webext-bridge: This channel has already been claimed. Stream allows only one-on-one communication'
        )
      onOpenStreamCallbacks.set(channel, callback)
      streamyEmitter.emit('did-change-stream-callbacks')
    }
    return {
      openStream,
      onOpenStreamChannel
    }
  }
  var win = usePostMessaging('window')
  var endpointRuntime = createEndpointRuntime('window', (message) => win.postMessage(message))
  win.onMessage((msg) => {
    if ('type' in msg && 'transactionID' in msg) endpointRuntime.endTransaction(msg.transactionID)
    else endpointRuntime.handleMessage(msg)
  })
  function setNamespace(nsps) {
    win.setNamespace(nsps)
    win.enable()
  }
  var { sendMessage, onMessage } = endpointRuntime
  createStreamWirings(endpointRuntime)
  const byteToHex = []
  for (let i = 0; i < 256; ++i) {
    byteToHex.push((i + 256).toString(16).slice(1))
  }
  function unsafeStringify(arr, offset = 0) {
    return (
      byteToHex[arr[offset + 0]] +
      byteToHex[arr[offset + 1]] +
      byteToHex[arr[offset + 2]] +
      byteToHex[arr[offset + 3]] +
      '-' +
      byteToHex[arr[offset + 4]] +
      byteToHex[arr[offset + 5]] +
      '-' +
      byteToHex[arr[offset + 6]] +
      byteToHex[arr[offset + 7]] +
      '-' +
      byteToHex[arr[offset + 8]] +
      byteToHex[arr[offset + 9]] +
      '-' +
      byteToHex[arr[offset + 10]] +
      byteToHex[arr[offset + 11]] +
      byteToHex[arr[offset + 12]] +
      byteToHex[arr[offset + 13]] +
      byteToHex[arr[offset + 14]] +
      byteToHex[arr[offset + 15]]
    ).toLowerCase()
  }
  let getRandomValues
  const rnds8 = new Uint8Array(16)
  function rng() {
    if (!getRandomValues) {
      if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
        throw new Error(
          'crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported'
        )
      }
      getRandomValues = crypto.getRandomValues.bind(crypto)
    }
    return getRandomValues(rnds8)
  }
  const randomUUID = typeof crypto !== 'undefined' && crypto.randomUUID && crypto.randomUUID.bind(crypto)
  const native = { randomUUID }
  function _v4(options, buf, offset) {
    var _a
    options = options || {}
    const rnds = options.random ?? ((_a = options.rng) == null ? void 0 : _a.call(options)) ?? rng()
    if (rnds.length < 16) {
      throw new Error('Random bytes length must be >= 16')
    }
    rnds[6] = (rnds[6] & 15) | 64
    rnds[8] = (rnds[8] & 63) | 128
    return unsafeStringify(rnds)
  }
  function v4(options, buf, offset) {
    if (native.randomUUID && true && !options) {
      return native.randomUUID()
    }
    return _v4(options)
  }
  class ExtensionServerTransport {
    // 最后一次注册信息（用于 Sidepanel 刷新后重新注册）
    constructor(sessionId = null) {
      this._messageListener = null
      this._isStarted = false
      this._isClosed = false
      this._lastRegistration = null
      setNamespace('ExtensionServerTransport-namespace')
      if (sessionId) {
        this.sessionId = sessionId
      } else {
        this.sessionId = v4()
      }
      onMessage('sidepanel-ready-to-page', () => {
        if (this._lastRegistration && this._isStarted) {
          this._pageLog('side-ready, 即将重新注册 sessionId: ' + this.sessionId)
          this.notifyRegistration(this._lastRegistration).catch((error2) => {
            this._pageLog('❌️ 重新注册失败:', error2)
          })
        }
      })
    }
    // 转发日志
    async _pageLog(message, extra = {}) {
      await sendMessage('server-transport-log-event', { message, extra }, 'content-script')
    }
    /**
     * 启动 transport，开始监听消息
     * @returns {Promise<void>}
     */
    async start() {
      if (this._isStarted) {
        return
      }
      if (this._isClosed) {
        throw new Error('❌️ server Transport 已关闭，无法重新启动')
      }
      try {
        onMessage('mcp-client-to-server', ({ data: data2 }) => {
          try {
            if (this.onmessage) {
              const mcpMessage = JSONRPCMessageSchema.parse(data2.mcpMessage)
              this.onmessage(mcpMessage)
              this._pageLog(' ✅ 消息已处理,mcp-client-to-server事件流转结束！ ================')
            } else {
              this._pageLog('❌️ onmessage 回调未设置，mcp-client-to-server事件流转结束！ ================')
            }
          } catch (error2) {
            this._pageLog('❌️ 处理消息时发生错误:', error2)
            if (this.onerror) {
              this.onerror(error2 instanceof Error ? error2 : new Error(String(error2)))
            }
          }
        })
        this._isStarted = true
      } catch (error2) {
        this._pageLog(' ❌️ 启动失败:', error2)
        if (this.onerror) {
          this.onerror(error2 instanceof Error ? error2 : new Error(String(error2)))
        }
        throw error2
      }
    }
    /**
     * 发送消息到 MCP Client
     * @param {Object} message - JSONRPC 消息对象
     * @returns {Promise<void>}
     */
    async send(message, _options) {
      if (!this._isStarted) {
        const error2 = new Error('server Transport 未启动，无法发送消息')
        await this._pageLog('❌️ server Transport 未启动，无法发送消息')
        if (this.onerror) {
          this.onerror(error2)
        }
        throw error2
      }
      if (this._isClosed) {
        const error2 = new Error('server Transport 已关闭，无法发送消息')
        await this._pageLog('❌️ server Transport 已关闭，无法发送消息')
        if (this.onerror) {
          this.onerror(error2)
        }
        throw error2
      }
      try {
        await sendMessage(
          'mcp-server-to-client',
          {
            sessionId: this.sessionId,
            mcpMessage: message
          },
          'content-script'
        )
        await this._pageLog('✅ 响应已发送')
      } catch (error2) {
        await this._pageLog('❌️ 发送消息失败')
        const wrappedError = error2 instanceof Error ? error2 : new Error(String(error2))
        if (this.onerror) {
          this.onerror(wrappedError)
        }
        throw wrappedError
      }
    }
    /**
     * 通知 Sidepanel 此 Server 已启动并准备接受连接
     * @param {Object} serverInfo - 服务器信息
     * @param {string} serverInfo.name - 服务器名称
     * @param {string} serverInfo.version - 服务器版本
     * @param {string} [serverInfo.description] - 服务器描述
     * @returns {Promise<void>}
     */
    async notifyRegistration(serverInfo) {
      if (!this._isStarted) {
        await this._pageLog('❌️ Transport 未启动，无法发送注册通知')
        return
      }
      this._lastRegistration = serverInfo
      try {
        await this._pageLog(`即将注册 server 到 content, sessionId=${this.sessionId}`)
        await sendMessage(
          'mcp-server-register',
          {
            sessionId: this.sessionId,
            serverInfo: {
              ...serverInfo,
              url: window.location.origin,
              title: document.title
            }
          },
          'content-script'
        )
      } catch (error2) {
        await this._pageLog('❌️ 注册 server 失败, sessionId=${this.sessionId}', error2)
        if (this.onerror) {
          this.onerror(error2 instanceof Error ? error2 : new Error(String(error2)))
        }
      }
    }
    /**
     * 关闭 transport
     * @returns {Promise<void>}
     */
    async close() {
      if (this._isClosed) {
        return
      }
      try {
        if (this._messageListener) {
          window.removeEventListener('message', this._messageListener)
          this._messageListener = null
        }
        this._isClosed = true
        this._isStarted = false
        if (this.onclose) {
          this.onclose()
        }
      } catch (error2) {
        await this._pageLog('❌️ server Transport 关闭时发生错误:', error2)
        if (this.onerror) {
          this.onerror(error2 instanceof Error ? error2 : new Error(String(error2)))
        }
        throw error2
      }
    }
  }
  exports2.Ajv = ajv$1
  exports2.AuthClientProvider = AuthClientProvider
  exports2.ExtensionServerTransport = ExtensionServerTransport
  exports2.ResourceTemplate = ResourceTemplate
  exports2.UriTemplate = UriTemplate
  exports2.WebMcpClient = WebMcpClient
  exports2.WebMcpServer = WebMcpServer
  exports2.completable = completable
  exports2.createMessageChannelClientTransport = createMessageChannelClientTransport
  exports2.createMessageChannelPairTransport = createMessageChannelPairTransport
  exports2.createMessageChannelServerTransport = createMessageChannelServerTransport
  exports2.createSSEClientTransport = createSSEClientTransport
  exports2.createStreamableHTTPClientTransport = createStreamableHTTPClientTransport
  exports2.getDisplayName = getDisplayName
  exports2.isMcpClient = isMcpClient
  exports2.isMcpServer = isMcpServer
  exports2.isMessageChannelClientTransport = isMessageChannelClientTransport
  exports2.isMessageChannelServerTransport = isMessageChannelServerTransport
  exports2.isSSEClientTransport = isSSEClientTransport
  exports2.isStreamableHTTPClientTransport = isStreamableHTTPClientTransport
  exports2.z = z
  Object.defineProperty(exports2, Symbol.toStringTag, { value: 'Module' })
})

const { ExtensionServerTransport, WebMcpServer, z } = WebMCP

async function connect() {
  const cookie = document.cookie
  const cookieData = cookie.split('; ').reduce((acc, cookie) => {
    const [key, value] = cookie.split('=')
    acc[key] = value
    return acc
  }, {})

  const serverInfo = {
    name: 'demo-server',
    version: '1.0.0'
  }
  // Create an MCP server
  const server = new WebMcpServer(serverInfo)

  if (window.$next_remoter_mcp_server) {
    window.$next_remoter_mcp_server({ server, z, cookie: cookieData })
    const sessionId = localStorage.getItem('mcp-sessionId')

    // Create pair MCP transports
    const serverTransport = new ExtensionServerTransport(sessionId)
    localStorage.setItem('mcp-sessionId', serverTransport.sessionId)

    console.log(serverTransport.sessionId)

    // Connect the client and server
    await server.connect(serverTransport)
    serverTransport.notifyRegistration(serverInfo)
  } else {
    console.error('window.$next_remoter_mcp_server 未定义')
  }
}

function detectVisible() {
  if (document.visibilityState === 'visible') {
    connect()
  } else {
    setTimeout(() => {
      detectVisible()
    }, 1000)
  }
}

detectVisible()
