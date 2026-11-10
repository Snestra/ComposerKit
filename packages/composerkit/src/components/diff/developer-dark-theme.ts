import type { TextMateTheme } from "./syntax-theme";

export const developerDarkTheme: TextMateTheme = {
  colors: {
    "activityBar.activeBorder": "#4d99ed",
    "activityBar.background": "#171b1f",
    "activityBarBadge.background": "#4d99ed",
    "button.background": "#4d99ed",
    "editor.background": "#101214",
    "editor.foreground": "#fafafa",
    "editorCursor.foreground": "#4d99ed",
    "editorGroupHeader.tabsBackground": "#171b1f",
    focusBorder: "#4d99ed",
    foreground: "#fafafa",
    "gitDecoration.addedResourceForeground": "#3dad69",
    "gitDecoration.deletedResourceForeground": "#e24b51",
    "gitDecoration.untrackedResourceForeground": "#3dad69",
    "panel.background": "#171b1f",
    "sideBar.background": "#171b1f",
    "sideBar.foreground": "#979da3",
    "sideBarTitle.foreground": "#fafafa",
    "terminal.ansiBrightGreen": "#65ce75",
    "terminal.ansiBrightMagenta": "#9f65ee",
    "terminal.ansiBrightRed": "#f05b67",
    "terminal.ansiGreen": "#91d68a",
    "terminal.ansiMagenta": "#b58af5",
    "terminal.ansiRed": "#f1848c",
    "textLink.foreground": "#4d99ed",
  },
  name: "Developer Dark",
  semanticTokenColors: {
    class: "#b58af5",
    comment: "#9ca3aa",
    enumMember: "#80c7e8",
    function: "#b58af5",
    keyword: "#f1848c",
    method: "#b58af5",
    namespace: "#eba267",
    number: "#80c7e8",
    parameter: "#9ca3aa",
    property: "#eba267",
    regexp: "#579aff",
    string: "#91d68a",
    type: "#b58af5",
    variable: "#eba267",
    "variable.constant": "#eba267",
    "variable.defaultLibrary": "#eba267",
  },
  tokenColors: [
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: "comment markup.link",
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: ["string", "constant.other.symbol"],
      settings: {
        foreground: "#91d68a",
      },
    },
    {
      scope: [
        "punctuation.definition.string.begin",
        "punctuation.definition.string.end",
      ],
      settings: {
        foreground: "#91d68a",
      },
    },
    {
      scope: ["constant.numeric", "constant.language.boolean"],
      settings: {
        foreground: "#80c7e8",
      },
    },
    {
      scope: "constant",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "punctuation.definition.constant",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "constant.language",
      settings: {
        foreground: "#80c7e8",
      },
    },
    {
      scope: "variable.other.constant",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "keyword",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "keyword.control",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: ["storage", "storage.type", "storage.modifier"],
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "token.storage",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: [
        "keyword.operator.new",
        "keyword.operator.expression.instanceof",
        "keyword.operator.expression.typeof",
        "keyword.operator.expression.void",
        "keyword.operator.expression.delete",
        "keyword.operator.expression.in",
        "keyword.operator.expression.of",
        "keyword.operator.expression.keyof",
      ],
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "keyword.operator.delete",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: ["variable", "identifier", "meta.definition.variable"],
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: [
        "variable.other.readwrite",
        "meta.object-literal.key",
        "support.variable.property",
        "support.variable.object.process",
        "support.variable.object.node",
      ],
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "variable.language",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "variable.parameter.function",
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: "function.parameter",
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: "variable.parameter",
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: "variable.parameter.function.language.python",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "variable.parameter.function.python",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: [
        "support.function",
        "entity.name.function",
        "meta.function-call",
        "meta.require",
        "support.function.any-method",
        "variable.function",
      ],
      settings: {
        foreground: "#b58af5",
      },
    },
    {
      scope: "keyword.other.special-method",
      settings: {
        foreground: "#b58af5",
      },
    },
    {
      scope: "entity.name.function",
      settings: {
        foreground: "#b58af5",
      },
    },
    {
      scope: "support.function.console",
      settings: {
        foreground: "#b58af5",
      },
    },
    {
      scope: [
        "support.type",
        "entity.name.type",
        "entity.name.class",
        "storage.type",
      ],
      settings: {
        foreground: "#b58af5",
      },
    },
    {
      scope: ["support.class", "entity.name.type.class"],
      settings: {
        foreground: "#b58af5",
      },
    },
    {
      scope: [
        "entity.name.class",
        "variable.other.class.js",
        "variable.other.class.ts",
      ],
      settings: {
        foreground: "#b58af5",
      },
    },
    {
      scope: "entity.name.class.identifier.namespace.type",
      settings: {
        foreground: "#b58af5",
      },
    },
    {
      scope: "entity.name.type.namespace",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "entity.other.inherited-class",
      settings: {
        foreground: "#b58af5",
      },
    },
    {
      scope: "entity.name.namespace",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "keyword.operator",
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: [
        "keyword.operator.logical",
        "keyword.operator.bitwise",
        "keyword.operator.channel",
      ],
      settings: {
        foreground: "#80c7e8",
      },
    },
    {
      scope: [
        "keyword.operator.arithmetic",
        "keyword.operator.comparison",
        "keyword.operator.relational",
        "keyword.operator.increment",
        "keyword.operator.decrement",
      ],
      settings: {
        foreground: "#80c7e8",
      },
    },
    {
      scope: "keyword.operator.assignment",
      settings: {
        foreground: "#80c7e8",
      },
    },
    {
      scope: "keyword.operator.assignment.compound",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: [
        "keyword.operator.assignment.compound.js",
        "keyword.operator.assignment.compound.ts",
      ],
      settings: {
        foreground: "#80c7e8",
      },
    },
    {
      scope: "keyword.operator.ternary",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "keyword.operator.optional",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "punctuation",
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: "punctuation.separator.delimiter",
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: "punctuation.separator.key-value",
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: "punctuation.terminator",
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: "meta.brace",
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: "meta.brace.square",
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: "meta.brace.round",
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: "function.brace",
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: [
        "punctuation.definition.parameters",
        "punctuation.definition.typeparameters",
      ],
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: ["punctuation.definition.block", "punctuation.definition.tag"],
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: ["meta.tag.tsx", "meta.tag.jsx", "meta.tag.js", "meta.tag.ts"],
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: "keyword.operator.expression.import",
      settings: {
        foreground: "#b58af5",
      },
    },
    {
      scope: "keyword.operator.module",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "support.type.object.console",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: [
        "support.module.node",
        "support.type.object.module",
        "entity.name.type.module",
      ],
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "support.constant.math",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "support.constant.property.math",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "support.constant.json",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "support.type.object.dom",
      settings: {
        foreground: "#80c7e8",
      },
    },
    {
      scope: ["support.variable.dom", "support.variable.property.dom"],
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "support.variable.property.process",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "meta.property.object",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "variable.parameter.function.js",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: ["keyword.other.template.begin", "keyword.other.template.end"],
      settings: {
        foreground: "#91d68a",
      },
    },
    {
      scope: [
        "keyword.other.substitution.begin",
        "keyword.other.substitution.end",
      ],
      settings: {
        foreground: "#91d68a",
      },
    },
    {
      scope: [
        "punctuation.definition.template-expression.begin",
        "punctuation.definition.template-expression.end",
      ],
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "meta.template.expression",
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: "punctuation.section.embedded",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "variable.interpolation",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: [
        "punctuation.section.embedded.begin",
        "punctuation.section.embedded.end",
      ],
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "punctuation.quasi.element",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: [
        "support.type.primitive.ts",
        "support.type.builtin.ts",
        "support.type.primitive.tsx",
        "support.type.builtin.tsx",
      ],
      settings: {
        foreground: "#b58af5",
      },
    },
    {
      scope: "support.type.type.flowtype",
      settings: {
        foreground: "#b58af5",
      },
    },
    {
      scope: "support.type.primitive",
      settings: {
        foreground: "#b58af5",
      },
    },
    {
      scope: "support.variable.magic.python",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "variable.parameter.function.language.special.self.python",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: [
        "punctuation.separator.period.python",
        "punctuation.separator.element.python",
        "punctuation.parenthesis.begin.python",
        "punctuation.parenthesis.end.python",
      ],
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: [
        "punctuation.definition.arguments.begin.python",
        "punctuation.definition.arguments.end.python",
        "punctuation.separator.arguments.python",
        "punctuation.definition.list.begin.python",
        "punctuation.definition.list.end.python",
      ],
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: "support.type.python",
      settings: {
        foreground: "#80c7e8",
      },
    },
    {
      scope: "keyword.operator.logical.python",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "meta.function-call.generic.python",
      settings: {
        foreground: "#b58af5",
      },
    },
    {
      scope: "constant.character.format.placeholder.other.python",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "meta.function.decorator.python",
      settings: {
        foreground: "#b58af5",
      },
    },
    {
      scope: [
        "support.token.decorator.python",
        "meta.function.decorator.identifier.python",
      ],
      settings: {
        foreground: "#80c7e8",
      },
    },
    {
      scope: "storage.modifier.lifetime.rust",
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: "support.function.std.rust",
      settings: {
        foreground: "#b58af5",
      },
    },
    {
      scope: "entity.name.lifetime.rust",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "variable.language.rust",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "keyword.operator.misc.rust",
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: "keyword.operator.sigil.rust",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "support.constant.core.rust",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: ["meta.function.c", "meta.function.cpp"],
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: [
        "punctuation.section.block.begin.bracket.curly.cpp",
        "punctuation.section.block.end.bracket.curly.cpp",
        "punctuation.terminator.statement.c",
        "punctuation.section.block.begin.bracket.curly.c",
        "punctuation.section.block.end.bracket.curly.c",
        "punctuation.section.parens.begin.bracket.round.c",
        "punctuation.section.parens.end.bracket.round.c",
        "punctuation.section.parameters.begin.bracket.round.c",
        "punctuation.section.parameters.end.bracket.round.c",
      ],
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: [
        "keyword.operator.assignment.c",
        "keyword.operator.comparison.c",
        "keyword.operator.c",
        "keyword.operator.increment.c",
        "keyword.operator.decrement.c",
        "keyword.operator.bitwise.shift.c",
      ],
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: [
        "keyword.operator.assignment.cpp",
        "keyword.operator.comparison.cpp",
        "keyword.operator.cpp",
        "keyword.operator.increment.cpp",
        "keyword.operator.decrement.cpp",
        "keyword.operator.bitwise.shift.cpp",
      ],
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: ["punctuation.separator.c", "punctuation.separator.cpp"],
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: [
        "support.type.posix-reserved.c",
        "support.type.posix-reserved.cpp",
      ],
      settings: {
        foreground: "#80c7e8",
      },
    },
    {
      scope: ["keyword.operator.sizeof.c", "keyword.operator.sizeof.cpp"],
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "variable.c",
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: ["storage.type.annotation.java", "storage.type.object.array.java"],
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "source.java",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: [
        "punctuation.section.block.begin.java",
        "punctuation.section.block.end.java",
        "punctuation.definition.method-parameters.begin.java",
        "punctuation.definition.method-parameters.end.java",
        "meta.method.identifier.java",
        "punctuation.section.method.begin.java",
        "punctuation.section.method.end.java",
        "punctuation.terminator.java",
        "punctuation.section.class.begin.java",
        "punctuation.section.class.end.java",
        "punctuation.section.inner-class.begin.java",
        "punctuation.section.inner-class.end.java",
        "meta.method-call.java",
        "punctuation.section.class.begin.bracket.curly.java",
        "punctuation.section.class.end.bracket.curly.java",
        "punctuation.section.method.begin.bracket.curly.java",
        "punctuation.section.method.end.bracket.curly.java",
        "punctuation.separator.period.java",
        "punctuation.bracket.angle.java",
        "punctuation.definition.annotation.java",
        "meta.method.body.java",
      ],
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: "meta.method.java",
      settings: {
        foreground: "#b58af5",
      },
    },
    {
      scope: [
        "storage.modifier.import.java",
        "storage.type.java",
        "storage.type.generic.java",
      ],
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "keyword.operator.instanceof.java",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "meta.definition.variable.name.java",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "token.variable.parameter.java",
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: "import.storage.java",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "token.package.keyword",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "token.package",
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: "token.storage.type.java",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "keyword.operator.assignment.go",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: ["keyword.operator.arithmetic.go", "keyword.operator.address.go"],
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "entity.name.package.go",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: [
        "support.other.namespace.use.php",
        "support.other.namespace.use-as.php",
        "support.other.namespace.php",
        "entity.other.alias.php",
        "meta.interface.php",
      ],
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "keyword.operator.error-control.php",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "keyword.operator.type.php",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: [
        "punctuation.section.array.begin.php",
        "punctuation.section.array.end.php",
      ],
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: [
        "storage.type.php",
        "meta.other.type.phpdoc.php",
        "keyword.other.type.php",
        "keyword.other.array.phpdoc.php",
      ],
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: [
        "meta.function-call.php",
        "meta.function-call.object.php",
        "meta.function-call.static.php",
      ],
      settings: {
        foreground: "#b58af5",
      },
    },
    {
      scope: [
        "punctuation.definition.parameters.begin.bracket.round.php",
        "punctuation.definition.parameters.end.bracket.round.php",
        "punctuation.separator.delimiter.php",
        "punctuation.section.scope.begin.php",
        "punctuation.section.scope.end.php",
        "punctuation.terminator.expression.php",
        "punctuation.definition.arguments.begin.bracket.round.php",
        "punctuation.definition.arguments.end.bracket.round.php",
        "punctuation.definition.storage-type.begin.bracket.round.php",
        "punctuation.definition.storage-type.end.bracket.round.php",
        "punctuation.definition.array.begin.bracket.round.php",
        "punctuation.definition.array.end.bracket.round.php",
        "punctuation.definition.begin.bracket.round.php",
        "punctuation.definition.end.bracket.round.php",
        "punctuation.definition.begin.bracket.curly.php",
        "punctuation.definition.end.bracket.curly.php",
        "punctuation.definition.section.switch-block.end.bracket.curly.php",
        "punctuation.definition.section.switch-block.start.bracket.curly.php",
        "punctuation.definition.section.switch-block.begin.bracket.curly.php",
        "punctuation.definition.section.switch-block.end.bracket.curly.php",
      ],
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: [
        "support.constant.ext.php",
        "support.constant.std.php",
        "support.constant.core.php",
        "support.constant.parser-token.php",
      ],
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: ["entity.name.goto-label.php", "support.other.php"],
      settings: {
        foreground: "#b58af5",
      },
    },
    {
      scope: [
        "keyword.operator.logical.php",
        "keyword.operator.bitwise.php",
        "keyword.operator.arithmetic.php",
      ],
      settings: {
        foreground: "#80c7e8",
      },
    },
    {
      scope: "keyword.operator.regexp.php",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "keyword.operator.comparison.php",
      settings: {
        foreground: "#80c7e8",
      },
    },
    {
      scope: ["keyword.operator.heredoc.php", "keyword.operator.nowdoc.php"],
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "variable.other.class.php",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "invalid.illegal.non-null-typehinted.php",
      settings: {
        foreground: "#ee5964",
      },
    },
    {
      scope: "variable.other.generic-type.haskell",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "storage.type.haskell",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "storage.type.cs",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "entity.name.variable.local.cs",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "entity.name.label.cs",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: [
        "entity.name.scope-resolution.function.call",
        "entity.name.scope-resolution.function.definition",
      ],
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: [
        "punctuation.definition.delayed.unison",
        "punctuation.definition.list.begin.unison",
        "punctuation.definition.list.end.unison",
        "punctuation.definition.ability.begin.unison",
        "punctuation.definition.ability.end.unison",
        "punctuation.operator.assignment.as.unison",
        "punctuation.separator.pipe.unison",
        "punctuation.separator.delimiter.unison",
        "punctuation.definition.hash.unison",
      ],
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "support.constant.edge",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "support.type.prelude.elm",
      settings: {
        foreground: "#80c7e8",
      },
    },
    {
      scope: "support.constant.elm",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "entity.global.clojure",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "meta.symbol.clojure",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "constant.keyword.clojure",
      settings: {
        foreground: "#80c7e8",
      },
    },
    {
      scope: ["meta.arguments.coffee", "variable.parameter.function.coffee"],
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "storage.modifier.import.groovy",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "meta.method.groovy",
      settings: {
        foreground: "#b58af5",
      },
    },
    {
      scope: "meta.definition.variable.name.groovy",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "meta.definition.class.inherited.classes.groovy",
      settings: {
        foreground: "#91d68a",
      },
    },
    {
      scope: "support.variable.semantic.hlsl",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: [
        "support.type.texture.hlsl",
        "support.type.sampler.hlsl",
        "support.type.object.hlsl",
        "support.type.object.rw.hlsl",
        "support.type.fx.hlsl",
        "support.type.object.hlsl",
      ],
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: ["text.variable", "text.bracketed"],
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: ["support.type.swift", "support.type.vb.asp"],
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "meta.scope.prerequisites.makefile",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "source.makefile",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "source.ini",
      settings: {
        foreground: "#91d68a",
      },
    },
    {
      scope: "constant.language.symbol.ruby",
      settings: {
        foreground: "#80c7e8",
      },
    },
    {
      scope: ["function.parameter.ruby", "function.parameter.cs"],
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: "constant.language.symbol.elixir",
      settings: {
        foreground: "#80c7e8",
      },
    },
    {
      scope:
        "text.html.laravel-blade source.php.embedded.line.html entity.name.tag.laravel-blade",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope:
        "text.html.laravel-blade source.php.embedded.line.html support.constant.laravel-blade",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "entity.name.function.xi",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "entity.name.class.xi",
      settings: {
        foreground: "#80c7e8",
      },
    },
    {
      scope: "constant.character.character-class.regexp.xi",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "constant.regexp.xi",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "keyword.control.xi",
      settings: {
        foreground: "#80c7e8",
      },
    },
    {
      scope: "invalid.xi",
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: "beginning.punctuation.definition.quote.markdown.xi",
      settings: {
        foreground: "#91d68a",
      },
    },
    {
      scope: "beginning.punctuation.definition.list.markdown.xi",
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: "constant.character.xi",
      settings: {
        foreground: "#b58af5",
      },
    },
    {
      scope: "accent.xi",
      settings: {
        foreground: "#b58af5",
      },
    },
    {
      scope: "wikiword.xi",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "constant.other.color.rgb-value.xi",
      settings: {
        foreground: "#f4f7fa",
      },
    },
    {
      scope: "punctuation.definition.tag.xi",
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: [
        "support.constant.property-value.scss",
        "support.constant.property-value.css",
      ],
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: [
        "keyword.operator.css",
        "keyword.operator.scss",
        "keyword.operator.less",
      ],
      settings: {
        foreground: "#80c7e8",
      },
    },
    {
      scope: [
        "support.constant.color.w3c-standard-color-name.css",
        "support.constant.color.w3c-standard-color-name.scss",
      ],
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "punctuation.separator.list.comma.css",
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: "support.type.vendored.property-name.css",
      settings: {
        foreground: "#80c7e8",
      },
    },
    {
      scope: "support.type.property-name.css",
      settings: {
        foreground: "#80c7e8",
      },
    },
    {
      scope: "support.type.property-name",
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: "support.constant.property-value",
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: "support.constant.font-name",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "entity.other.attribute-name.class.css",
      settings: {
        fontStyle: "normal",
        foreground: "#80c7e8",
      },
    },
    {
      scope: "entity.other.attribute-name.id",
      settings: {
        fontStyle: "normal",
        foreground: "#b58af5",
      },
    },
    {
      scope: [
        "entity.other.attribute-name.pseudo-element",
        "entity.other.attribute-name.pseudo-class",
      ],
      settings: {
        foreground: "#80c7e8",
      },
    },
    {
      scope: "meta.selector",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "selector.sass",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "rgb-value",
      settings: {
        foreground: "#80c7e8",
      },
    },
    {
      scope: "inline-color-decoration rgb-value",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "less rgb-value",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "control.elements",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "keyword.operator.less",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "entity.name.tag",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "entity.other.attribute-name",
      settings: {
        fontStyle: "normal",
        foreground: "#80c7e8",
      },
    },
    {
      scope: "constant.character.entity",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "meta.tag",
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: "invalid.illegal.bad-ampersand.html",
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: "markup.heading",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: [
        "markup.heading punctuation.definition.heading",
        "entity.name.section",
      ],
      settings: {
        foreground: "#b58af5",
      },
    },
    {
      scope: "entity.name.section.markdown",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "punctuation.definition.heading.markdown",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "markup.heading.setext",
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: [
        "markup.heading.setext.1.markdown",
        "markup.heading.setext.2.markdown",
      ],
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: ["markup.bold", "todo.bold"],
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "punctuation.definition.bold",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "punctuation.definition.bold.markdown",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: [
        "markup.italic",
        "punctuation.definition.italic",
        "todo.emphasis",
      ],
      settings: {
        fontStyle: "italic",
        foreground: "#f1848c",
      },
    },
    {
      scope: "emphasis md",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "markup.italic.markdown",
      settings: {
        fontStyle: "italic",
      },
    },
    {
      scope: [
        "markup.underline.link.markdown",
        "markup.underline.link.image.markdown",
      ],
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: [
        "string.other.link.title.markdown",
        "string.other.link.description.markdown",
      ],
      settings: {
        foreground: "#b58af5",
      },
    },
    {
      scope: "punctuation.definition.metadata.markdown",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: [
        "markup.inline.raw.markdown",
        "markup.inline.raw.string.markdown",
      ],
      settings: {
        foreground: "#91d68a",
      },
    },
    {
      scope: "punctuation.definition.list.begin.markdown",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "punctuation.definition.list.markdown",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "beginning.punctuation.definition.list.markdown",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: [
        "punctuation.definition.string.begin.markdown",
        "punctuation.definition.string.end.markdown",
      ],
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "markup.quote.markdown",
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: "keyword.other.unit",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "markup.changed.diff",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: [
        "meta.diff.header.from-file",
        "meta.diff.header.to-file",
        "punctuation.definition.from-file.diff",
        "punctuation.definition.to-file.diff",
      ],
      settings: {
        foreground: "#b58af5",
      },
    },
    {
      scope: "markup.inserted.diff",
      settings: {
        foreground: "#91d68a",
      },
    },
    {
      scope: "markup.deleted.diff",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "string.regexp",
      settings: {
        foreground: "#579aff",
      },
    },
    {
      scope: "constant.other.character-class.regexp",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "keyword.operator.quantifier.regexp",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "constant.character.escape",
      settings: {
        foreground: "#80c7e8",
      },
    },
    {
      scope: "source.json meta.structure.dictionary.json > string.quoted.json",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope:
        "source.json meta.structure.dictionary.json > string.quoted.json > punctuation.string",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: [
        "source.json meta.structure.dictionary.json > value.json > string.quoted.json",
        "source.json meta.structure.array.json > value.json > string.quoted.json",
        "source.json meta.structure.dictionary.json > value.json > string.quoted.json > punctuation",
        "source.json meta.structure.array.json > value.json > string.quoted.json > punctuation",
      ],
      settings: {
        foreground: "#91d68a",
      },
    },
    {
      scope: [
        "source.json meta.structure.dictionary.json > constant.language.json",
        "source.json meta.structure.array.json > constant.language.json",
      ],
      settings: {
        foreground: "#80c7e8",
      },
    },
    {
      scope: "support.type.property-name.json",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "support.type.property-name.json punctuation",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "punctuation.definition.block.sequence.item.yaml",
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: "block.scope.end",
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: "block.scope.begin",
      settings: {
        foreground: "#9ca3aa",
      },
    },
    {
      scope: "token.info-token",
      settings: {
        foreground: "#b58af5",
      },
    },
    {
      scope: "token.warn-token",
      settings: {
        foreground: "#eba267",
      },
    },
    {
      scope: "token.error-token",
      settings: {
        foreground: "#ee5964",
      },
    },
    {
      scope: "token.debug-token",
      settings: {
        foreground: "#f1848c",
      },
    },
    {
      scope: "invalid.illegal",
      settings: {
        foreground: "#f4f7fa",
      },
    },
    {
      scope: "invalid.broken",
      settings: {
        foreground: "#f4f7fa",
      },
    },
    {
      scope: "invalid.deprecated",
      settings: {
        foreground: "#f4f7fa",
      },
    },
    {
      scope: "invalid.unimplemented",
      settings: {
        foreground: "#f4f7fa",
      },
    },
  ],
  type: "dark",
};
