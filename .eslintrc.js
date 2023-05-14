module.exports = {
    root: true,
    env: {
        greasemonkey: true,
        browser: true
    },
    extends: 'standard',
    overrides: [],
    parserOptions: {
        ecmaVersion: 'latest'
    },
    rules: {
        curly: [
            2,
            'multi'
        ],
        'wrap-iife': [
            2,
            'inside'
        ],
        indent: [
            'error',
            4
        ],
        'comma-dangle': [
            2,
            'never'
        ],
        strict: 0,
        noConfusingArrow: 0,
        arrowParens: 0,
        'no-plusplus': [
            2,
            {
                allowForLoopAfterthoughts: true
            }
        ],
        noParamReassign: 0,
        nonblockStatementBodyPosition: 0,
        objectCurlySpacing: 0,
        noTrailingSpaces: 0,
        blockSpacing: 0,
        newlinePerChainedCall: 0,
        noUnderscoreDangle: 0,
        noLoopFunc: 0,
        noAwaitInLoop: 0,
        noShadow: 0,
        implicitArrowLinebreak: 0,
        noReturnAssign: 0,
        noSequences: 0,
        objectCurlyNewline: 0,
        'no-unused-vars': [
            'error',
            {
                vars: 'local',
                args: 'after-used',
                argsIgnorePattern: '^_',
                destructuredArrayIgnorePattern: '^_'
            }
        ]
    }
}
