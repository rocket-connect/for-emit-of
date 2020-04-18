module.exports = {
    parser: "@typescript-eslint/parser", 
    extends: [
      "plugin:@typescript-eslint/recommended", 
      "prettier/@typescript-eslint", 
      "plugin:prettier/recommended" 
    ],
    parserOptions: {
      ecmaVersion: 2018, 
      sourceType: "module" 
    },
    rules: {
      "import/extensions": "off",
      "@typescript-eslint/no-explicit-any": 0,
      "@typescript-eslint/explicit-function-return-type": 0,
      "prettier/prettier": [
        "error", {
          "endOfLine": "auto"
        }
      ]
    },
    settings: {
      "import/resolver": {
        node: {
          extensions: [
            ".ts"
          ]
        }
      }
    }
};