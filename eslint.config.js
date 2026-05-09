import js from "@eslint/js";

export default [
    js.configs.recommended,
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "script",
            globals: {
                window: "readonly",
                document: "readonly",
                console: "readonly",
                localStorage: "readonly",
                sessionStorage: "readonly",
                navigator: "readonly",
                location: "readonly",
                fetch: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
            },
        },
        rules: {},
    },
];