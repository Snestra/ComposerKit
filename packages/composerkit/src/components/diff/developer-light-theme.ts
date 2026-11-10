import type { TextMateTheme } from "./syntax-theme";

export const developerLightTheme: TextMateTheme = {
  colors: {
    "activityBar.activeBorder": "#176ac6",
    "activityBar.background": "#f4f6f8",
    "activityBarBadge.background": "#176ac6",
    "button.background": "#176ac6",
    "editor.background": "#fbfcfd",
    "editor.foreground": "#192126",
    "editorCursor.foreground": "#176ac6",
    "editorGroupHeader.tabsBackground": "#f4f6f8",
    focusBorder: "#176ac6",
    foreground: "#192126",
    "gitDecoration.addedResourceForeground": "#168044",
    "gitDecoration.deletedResourceForeground": "#c63f4a",
    "gitDecoration.untrackedResourceForeground": "#168044",
    "panel.background": "#f4f6f8",
    "sideBar.background": "#f4f6f8",
    "sideBar.foreground": "#29343c",
    "sideBarTitle.foreground": "#192126",
    "terminal.ansiBrightGreen": "#45b96b",
    "terminal.ansiBrightMagenta": "#9555df",
    "terminal.ansiBrightRed": "#df5060",
    "terminal.ansiGreen": "#17813c",
    "terminal.ansiMagenta": "#7943bb",
    "terminal.ansiRed": "#c63f4a",
    "textLink.foreground": "#176ac6",
  },
  name: "Developer Light",
  semanticTokenColors: {
    class: "#7943bb",
    comment: "#626d76",
    enumMember: "#0f5cb8",
    function: "#7943bb",
    keyword: "#c63f4a",
    method: "#7943bb",
    namespace: "#99480f",
    number: "#0f5cb8",
    parameter: "#626d76",
    property: "#99480f",
    regexp: "#243dc7",
    string: "#17813c",
    type: "#7943bb",
    variable: "#99480f",
    "variable.constant": "#99480f",
    "variable.defaultLibrary": "#99480f",
  },
  tokenColors: [
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: "comment markup.link",
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: ["string", "constant.other.symbol"],
      settings: {
        foreground: "#17813c",
      },
    },
    {
      scope: [
        "punctuation.definition.string.begin",
        "punctuation.definition.string.end",
      ],
      settings: {
        foreground: "#17813c",
      },
    },
    {
      scope: ["constant.numeric", "constant.language.boolean"],
      settings: {
        foreground: "#0f5cb8",
      },
    },
    {
      scope: "constant",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "punctuation.definition.constant",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "constant.language",
      settings: {
        foreground: "#0f5cb8",
      },
    },
    {
      scope: "variable.other.constant",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "keyword",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "keyword.control",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: ["storage", "storage.type", "storage.modifier"],
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "token.storage",
      settings: {
        foreground: "#c63f4a",
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
        foreground: "#c63f4a",
      },
    },
    {
      scope: "keyword.operator.delete",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: ["variable", "identifier", "meta.definition.variable"],
      settings: {
        foreground: "#99480f",
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
        foreground: "#99480f",
      },
    },
    {
      scope: "variable.language",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "variable.parameter.function",
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: "function.parameter",
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: "variable.parameter",
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: "variable.parameter.function.language.python",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "variable.parameter.function.python",
      settings: {
        foreground: "#99480f",
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
        foreground: "#7943bb",
      },
    },
    {
      scope: "keyword.other.special-method",
      settings: {
        foreground: "#7943bb",
      },
    },
    {
      scope: "entity.name.function",
      settings: {
        foreground: "#7943bb",
      },
    },
    {
      scope: "support.function.console",
      settings: {
        foreground: "#7943bb",
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
        foreground: "#7943bb",
      },
    },
    {
      scope: ["support.class", "entity.name.type.class"],
      settings: {
        foreground: "#7943bb",
      },
    },
    {
      scope: [
        "entity.name.class",
        "variable.other.class.js",
        "variable.other.class.ts",
      ],
      settings: {
        foreground: "#7943bb",
      },
    },
    {
      scope: "entity.name.class.identifier.namespace.type",
      settings: {
        foreground: "#7943bb",
      },
    },
    {
      scope: "entity.name.type.namespace",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "entity.other.inherited-class",
      settings: {
        foreground: "#7943bb",
      },
    },
    {
      scope: "entity.name.namespace",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "keyword.operator",
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: [
        "keyword.operator.logical",
        "keyword.operator.bitwise",
        "keyword.operator.channel",
      ],
      settings: {
        foreground: "#0f5cb8",
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
        foreground: "#0f5cb8",
      },
    },
    {
      scope: "keyword.operator.assignment",
      settings: {
        foreground: "#0f5cb8",
      },
    },
    {
      scope: "keyword.operator.assignment.compound",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: [
        "keyword.operator.assignment.compound.js",
        "keyword.operator.assignment.compound.ts",
      ],
      settings: {
        foreground: "#0f5cb8",
      },
    },
    {
      scope: "keyword.operator.ternary",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "keyword.operator.optional",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "punctuation",
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: "punctuation.separator.delimiter",
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: "punctuation.separator.key-value",
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: "punctuation.terminator",
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: "meta.brace",
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: "meta.brace.square",
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: "meta.brace.round",
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: "function.brace",
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: [
        "punctuation.definition.parameters",
        "punctuation.definition.typeparameters",
      ],
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: ["punctuation.definition.block", "punctuation.definition.tag"],
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: ["meta.tag.tsx", "meta.tag.jsx", "meta.tag.js", "meta.tag.ts"],
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: "keyword.operator.expression.import",
      settings: {
        foreground: "#7943bb",
      },
    },
    {
      scope: "keyword.operator.module",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "support.type.object.console",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: [
        "support.module.node",
        "support.type.object.module",
        "entity.name.type.module",
      ],
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "support.constant.math",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "support.constant.property.math",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "support.constant.json",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "support.type.object.dom",
      settings: {
        foreground: "#0f5cb8",
      },
    },
    {
      scope: ["support.variable.dom", "support.variable.property.dom"],
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "support.variable.property.process",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "meta.property.object",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "variable.parameter.function.js",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: ["keyword.other.template.begin", "keyword.other.template.end"],
      settings: {
        foreground: "#17813c",
      },
    },
    {
      scope: [
        "keyword.other.substitution.begin",
        "keyword.other.substitution.end",
      ],
      settings: {
        foreground: "#17813c",
      },
    },
    {
      scope: [
        "punctuation.definition.template-expression.begin",
        "punctuation.definition.template-expression.end",
      ],
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "meta.template.expression",
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: "punctuation.section.embedded",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "variable.interpolation",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: [
        "punctuation.section.embedded.begin",
        "punctuation.section.embedded.end",
      ],
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "punctuation.quasi.element",
      settings: {
        foreground: "#c63f4a",
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
        foreground: "#7943bb",
      },
    },
    {
      scope: "support.type.type.flowtype",
      settings: {
        foreground: "#7943bb",
      },
    },
    {
      scope: "support.type.primitive",
      settings: {
        foreground: "#7943bb",
      },
    },
    {
      scope: "support.variable.magic.python",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "variable.parameter.function.language.special.self.python",
      settings: {
        foreground: "#99480f",
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
        foreground: "#626d76",
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
        foreground: "#626d76",
      },
    },
    {
      scope: "support.type.python",
      settings: {
        foreground: "#0f5cb8",
      },
    },
    {
      scope: "keyword.operator.logical.python",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "meta.function-call.generic.python",
      settings: {
        foreground: "#7943bb",
      },
    },
    {
      scope: "constant.character.format.placeholder.other.python",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "meta.function.decorator.python",
      settings: {
        foreground: "#7943bb",
      },
    },
    {
      scope: [
        "support.token.decorator.python",
        "meta.function.decorator.identifier.python",
      ],
      settings: {
        foreground: "#0f5cb8",
      },
    },
    {
      scope: "storage.modifier.lifetime.rust",
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: "support.function.std.rust",
      settings: {
        foreground: "#7943bb",
      },
    },
    {
      scope: "entity.name.lifetime.rust",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "variable.language.rust",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "keyword.operator.misc.rust",
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: "keyword.operator.sigil.rust",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "support.constant.core.rust",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: ["meta.function.c", "meta.function.cpp"],
      settings: {
        foreground: "#c63f4a",
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
        foreground: "#626d76",
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
        foreground: "#c63f4a",
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
        foreground: "#c63f4a",
      },
    },
    {
      scope: ["punctuation.separator.c", "punctuation.separator.cpp"],
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: [
        "support.type.posix-reserved.c",
        "support.type.posix-reserved.cpp",
      ],
      settings: {
        foreground: "#0f5cb8",
      },
    },
    {
      scope: ["keyword.operator.sizeof.c", "keyword.operator.sizeof.cpp"],
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "variable.c",
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: ["storage.type.annotation.java", "storage.type.object.array.java"],
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "source.java",
      settings: {
        foreground: "#c63f4a",
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
        foreground: "#626d76",
      },
    },
    {
      scope: "meta.method.java",
      settings: {
        foreground: "#7943bb",
      },
    },
    {
      scope: [
        "storage.modifier.import.java",
        "storage.type.java",
        "storage.type.generic.java",
      ],
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "keyword.operator.instanceof.java",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "meta.definition.variable.name.java",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "token.variable.parameter.java",
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: "import.storage.java",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "token.package.keyword",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "token.package",
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: "token.storage.type.java",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "keyword.operator.assignment.go",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: ["keyword.operator.arithmetic.go", "keyword.operator.address.go"],
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "entity.name.package.go",
      settings: {
        foreground: "#99480f",
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
        foreground: "#99480f",
      },
    },
    {
      scope: "keyword.operator.error-control.php",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "keyword.operator.type.php",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: [
        "punctuation.section.array.begin.php",
        "punctuation.section.array.end.php",
      ],
      settings: {
        foreground: "#626d76",
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
        foreground: "#99480f",
      },
    },
    {
      scope: [
        "meta.function-call.php",
        "meta.function-call.object.php",
        "meta.function-call.static.php",
      ],
      settings: {
        foreground: "#7943bb",
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
        foreground: "#626d76",
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
        foreground: "#99480f",
      },
    },
    {
      scope: ["entity.name.goto-label.php", "support.other.php"],
      settings: {
        foreground: "#7943bb",
      },
    },
    {
      scope: [
        "keyword.operator.logical.php",
        "keyword.operator.bitwise.php",
        "keyword.operator.arithmetic.php",
      ],
      settings: {
        foreground: "#0f5cb8",
      },
    },
    {
      scope: "keyword.operator.regexp.php",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "keyword.operator.comparison.php",
      settings: {
        foreground: "#0f5cb8",
      },
    },
    {
      scope: ["keyword.operator.heredoc.php", "keyword.operator.nowdoc.php"],
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "variable.other.class.php",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "invalid.illegal.non-null-typehinted.php",
      settings: {
        foreground: "#cd3d4c",
      },
    },
    {
      scope: "variable.other.generic-type.haskell",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "storage.type.haskell",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "storage.type.cs",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "entity.name.variable.local.cs",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "entity.name.label.cs",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: [
        "entity.name.scope-resolution.function.call",
        "entity.name.scope-resolution.function.definition",
      ],
      settings: {
        foreground: "#99480f",
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
        foreground: "#c63f4a",
      },
    },
    {
      scope: "support.constant.edge",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "support.type.prelude.elm",
      settings: {
        foreground: "#0f5cb8",
      },
    },
    {
      scope: "support.constant.elm",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "entity.global.clojure",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "meta.symbol.clojure",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "constant.keyword.clojure",
      settings: {
        foreground: "#0f5cb8",
      },
    },
    {
      scope: ["meta.arguments.coffee", "variable.parameter.function.coffee"],
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "storage.modifier.import.groovy",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "meta.method.groovy",
      settings: {
        foreground: "#7943bb",
      },
    },
    {
      scope: "meta.definition.variable.name.groovy",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "meta.definition.class.inherited.classes.groovy",
      settings: {
        foreground: "#17813c",
      },
    },
    {
      scope: "support.variable.semantic.hlsl",
      settings: {
        foreground: "#99480f",
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
        foreground: "#c63f4a",
      },
    },
    {
      scope: ["text.variable", "text.bracketed"],
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: ["support.type.swift", "support.type.vb.asp"],
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "meta.scope.prerequisites.makefile",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "source.makefile",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "source.ini",
      settings: {
        foreground: "#17813c",
      },
    },
    {
      scope: "constant.language.symbol.ruby",
      settings: {
        foreground: "#0f5cb8",
      },
    },
    {
      scope: ["function.parameter.ruby", "function.parameter.cs"],
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: "constant.language.symbol.elixir",
      settings: {
        foreground: "#0f5cb8",
      },
    },
    {
      scope:
        "text.html.laravel-blade source.php.embedded.line.html entity.name.tag.laravel-blade",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope:
        "text.html.laravel-blade source.php.embedded.line.html support.constant.laravel-blade",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "entity.name.function.xi",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "entity.name.class.xi",
      settings: {
        foreground: "#0f5cb8",
      },
    },
    {
      scope: "constant.character.character-class.regexp.xi",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "constant.regexp.xi",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "keyword.control.xi",
      settings: {
        foreground: "#0f5cb8",
      },
    },
    {
      scope: "invalid.xi",
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: "beginning.punctuation.definition.quote.markdown.xi",
      settings: {
        foreground: "#17813c",
      },
    },
    {
      scope: "beginning.punctuation.definition.list.markdown.xi",
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: "constant.character.xi",
      settings: {
        foreground: "#7943bb",
      },
    },
    {
      scope: "accent.xi",
      settings: {
        foreground: "#7943bb",
      },
    },
    {
      scope: "wikiword.xi",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "constant.other.color.rgb-value.xi",
      settings: {
        foreground: "#fbfcfd",
      },
    },
    {
      scope: "punctuation.definition.tag.xi",
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: [
        "support.constant.property-value.scss",
        "support.constant.property-value.css",
      ],
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: [
        "keyword.operator.css",
        "keyword.operator.scss",
        "keyword.operator.less",
      ],
      settings: {
        foreground: "#0f5cb8",
      },
    },
    {
      scope: [
        "support.constant.color.w3c-standard-color-name.css",
        "support.constant.color.w3c-standard-color-name.scss",
      ],
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "punctuation.separator.list.comma.css",
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: "support.type.vendored.property-name.css",
      settings: {
        foreground: "#0f5cb8",
      },
    },
    {
      scope: "support.type.property-name.css",
      settings: {
        foreground: "#0f5cb8",
      },
    },
    {
      scope: "support.type.property-name",
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: "support.constant.property-value",
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: "support.constant.font-name",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "entity.other.attribute-name.class.css",
      settings: {
        fontStyle: "normal",
        foreground: "#0f5cb8",
      },
    },
    {
      scope: "entity.other.attribute-name.id",
      settings: {
        fontStyle: "normal",
        foreground: "#7943bb",
      },
    },
    {
      scope: [
        "entity.other.attribute-name.pseudo-element",
        "entity.other.attribute-name.pseudo-class",
      ],
      settings: {
        foreground: "#0f5cb8",
      },
    },
    {
      scope: "meta.selector",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "selector.sass",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "rgb-value",
      settings: {
        foreground: "#0f5cb8",
      },
    },
    {
      scope: "inline-color-decoration rgb-value",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "less rgb-value",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "control.elements",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "keyword.operator.less",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "entity.name.tag",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "entity.other.attribute-name",
      settings: {
        fontStyle: "normal",
        foreground: "#0f5cb8",
      },
    },
    {
      scope: "constant.character.entity",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "meta.tag",
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: "invalid.illegal.bad-ampersand.html",
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: "markup.heading",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: [
        "markup.heading punctuation.definition.heading",
        "entity.name.section",
      ],
      settings: {
        foreground: "#7943bb",
      },
    },
    {
      scope: "entity.name.section.markdown",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "punctuation.definition.heading.markdown",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "markup.heading.setext",
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: [
        "markup.heading.setext.1.markdown",
        "markup.heading.setext.2.markdown",
      ],
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: ["markup.bold", "todo.bold"],
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "punctuation.definition.bold",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "punctuation.definition.bold.markdown",
      settings: {
        foreground: "#99480f",
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
        foreground: "#c63f4a",
      },
    },
    {
      scope: "emphasis md",
      settings: {
        foreground: "#c63f4a",
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
        foreground: "#c63f4a",
      },
    },
    {
      scope: [
        "string.other.link.title.markdown",
        "string.other.link.description.markdown",
      ],
      settings: {
        foreground: "#7943bb",
      },
    },
    {
      scope: "punctuation.definition.metadata.markdown",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: [
        "markup.inline.raw.markdown",
        "markup.inline.raw.string.markdown",
      ],
      settings: {
        foreground: "#17813c",
      },
    },
    {
      scope: "punctuation.definition.list.begin.markdown",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "punctuation.definition.list.markdown",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "beginning.punctuation.definition.list.markdown",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: [
        "punctuation.definition.string.begin.markdown",
        "punctuation.definition.string.end.markdown",
      ],
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "markup.quote.markdown",
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: "keyword.other.unit",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "markup.changed.diff",
      settings: {
        foreground: "#99480f",
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
        foreground: "#7943bb",
      },
    },
    {
      scope: "markup.inserted.diff",
      settings: {
        foreground: "#17813c",
      },
    },
    {
      scope: "markup.deleted.diff",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "string.regexp",
      settings: {
        foreground: "#243dc7",
      },
    },
    {
      scope: "constant.other.character-class.regexp",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "keyword.operator.quantifier.regexp",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "constant.character.escape",
      settings: {
        foreground: "#0f5cb8",
      },
    },
    {
      scope: "source.json meta.structure.dictionary.json > string.quoted.json",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope:
        "source.json meta.structure.dictionary.json > string.quoted.json > punctuation.string",
      settings: {
        foreground: "#c63f4a",
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
        foreground: "#17813c",
      },
    },
    {
      scope: [
        "source.json meta.structure.dictionary.json > constant.language.json",
        "source.json meta.structure.array.json > constant.language.json",
      ],
      settings: {
        foreground: "#0f5cb8",
      },
    },
    {
      scope: "support.type.property-name.json",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "support.type.property-name.json punctuation",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "punctuation.definition.block.sequence.item.yaml",
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: "block.scope.end",
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: "block.scope.begin",
      settings: {
        foreground: "#626d76",
      },
    },
    {
      scope: "token.info-token",
      settings: {
        foreground: "#7943bb",
      },
    },
    {
      scope: "token.warn-token",
      settings: {
        foreground: "#99480f",
      },
    },
    {
      scope: "token.error-token",
      settings: {
        foreground: "#cd3d4c",
      },
    },
    {
      scope: "token.debug-token",
      settings: {
        foreground: "#c63f4a",
      },
    },
    {
      scope: "invalid.illegal",
      settings: {
        foreground: "#fbfcfd",
      },
    },
    {
      scope: "invalid.broken",
      settings: {
        foreground: "#fbfcfd",
      },
    },
    {
      scope: "invalid.deprecated",
      settings: {
        foreground: "#fbfcfd",
      },
    },
    {
      scope: "invalid.unimplemented",
      settings: {
        foreground: "#fbfcfd",
      },
    },
  ],
  type: "light",
};
