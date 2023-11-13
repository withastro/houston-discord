/** @type {import("@types/eslint").Linter.Config} */
module.exports = {
	extends: [
		'plugin:@typescript-eslint/recommended-type-checked',
		'plugin:@typescript-eslint/stylistic-type-checked',
		'prettier',
	],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: ['./tsconfig.json'],
		tsconfigRootDir: __dirname,
	},
	plugins: ['@typescript-eslint', 'prettier'],
	rules: {
		// These off/configured-differently-by-default rules fit well for us
		'@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
		'@typescript-eslint/no-unused-vars': [
			'warn',
			{
				argsIgnorePattern: '^_',
				varsIgnorePattern: '^_',
				caughtErrorsIgnorePattern: '^_',
				ignoreRestSiblings: true,
			},
		],
		'@typescript-eslint/no-shadow': ['error'],

		// We do want console statements occasionally (for example, used in error handling)
		'no-console': 'off',

		// Todo: do we want these?
		'@typescript-eslint/array-type': 'off',
		'@typescript-eslint/ban-ts-comment': 'off',
		'@typescript-eslint/class-literal-property-style': 'off',
		'@typescript-eslint/consistent-indexed-object-style': 'off',
		'@typescript-eslint/consistent-type-definitions': 'off',
		'@typescript-eslint/dot-notation': 'off',
		'@typescript-eslint/no-base-to-string': 'off',
		'@typescript-eslint/no-empty-function': 'off',
		'@typescript-eslint/no-floating-promises': 'off',
		'@typescript-eslint/no-misused-promises': 'off',
		'@typescript-eslint/no-redundant-type-constituents': 'off',
		'@typescript-eslint/no-this-alias': 'off',
		'@typescript-eslint/no-unsafe-argument': 'off',
		'@typescript-eslint/no-unsafe-assignment': 'off',
		'@typescript-eslint/no-unsafe-call': 'off',
		'@typescript-eslint/no-unsafe-member-access': 'off',
		'@typescript-eslint/no-unsafe-return': 'off',
		'@typescript-eslint/prefer-nullish-coalescing': 'off',
		'@typescript-eslint/prefer-optional-chain': 'off',
		'@typescript-eslint/prefer-string-starts-ends-with': 'off',
		'@typescript-eslint/require-await': 'off',
		'@typescript-eslint/restrict-plus-operands': 'off',
		'@typescript-eslint/restrict-template-expressions': 'off',
		'@typescript-eslint/sort-type-constituents': 'off',
		'@typescript-eslint/unbound-method': 'off',
		'@typescript-eslint/no-explicit-any': 'off',

		// These rules enabled by the preset configs don't work well for us
		'@typescript-eslint/await-thenable': 'off',
		'prefer-const': 'off',
	},
};
