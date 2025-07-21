#!/usr/bin/env node

import { Command } from "commander";
import axios from "axios";
import ora from "ora";
import chalk from "chalk";

const program = new Command();

program
  .name("genius")
  .description("Translates natural language to shell commands using AI.")
  .version("1.0.0")
  .argument("<query>", "The command you want to find")
  .action(async (query) => {
    const spinner = ora(chalk.yellow("Thinking...")).start();

    try {
      const response = await axios.post("http://localhost:3000/api/genius", {
        query,
      });
      const { command, explanation } = response.data;

      spinner.succeed(chalk.green("Here is your command:"));
      console.log(`\n${chalk.cyan.bold(command)}\n`);
      console.log(chalk.white(explanation));
    } catch (error) {
      spinner.fail(chalk.red("An error occurred"));
      const message = error.response
        ? error.response.data.message
        : error.message;
      console.error(chalk.red(`Error: ${message}`));
    }
  });

program.parse(process.argv);
