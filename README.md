# @mcbe-toolbox-lc/builder

Builder is a build tool that streamlines Minecraft Bedrock add-on development by letting you
organize your pack files in a separate, **isolated project directory** instead of directly within
the restrictive com.mojang folder.

Builder "compiles" your packs and **copies the final output** to the necessary com.mojang
development folders so Minecraft can load them.

This workflow <ins>simplifies development, enables easy third-party tool integration,
and allows for proper version control (with Git)</ins>.

## Prerequisites

- [Node.js](https://nodejs.org/en/download) (v22 or later)

## Installation

Run this command in your project directory to install builder:

```bash
npm install @mcbe-toolbox-lc/builder --save-dev
```
