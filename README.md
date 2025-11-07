# @mcbe-toolbox-lc/builder

[![NPM Version](https://img.shields.io/npm/v/%40mcbe-toolbox-lc%2Fbuilder)](https://www.npmjs.com/package/@mcbe-toolbox-lc/builder)
[![GitHub Tag](https://img.shields.io/github/v/tag/mcbe-toolbox-lc/builder)](https://github.com/mcbe-toolbox-lc/builder/tags)

Builder is a build tool that streamlines Minecraft Bedrock add-on development by letting you
organize your pack files in a separate, **isolated project directory** instead of directly within
the restrictive com.mojang folder.

Builder "compiles" your packs and **copies the final output** to the necessary com.mojang
development folders so Minecraft can load them.

This workflow <ins>simplifies development, enables easy third-party tool integration,
and allows for proper version control (with Git)</ins>.

## Prerequisites

- [Node.js](https://nodejs.org/en/download) (v22 or later)

## Usage

Run the following command in your project directory to install builder:

```bash
npm install @mcbe-toolbox-lc/builder --save-dev
```

Builder has no interface other than a public `build()` function that initiates a build operation
based on the configuration object provided as an argument.

You have to create a JavaScript file that imports the function and calls it,
then execute the file using the `node` command.
